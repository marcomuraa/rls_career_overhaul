import { ref, computed, watch, toRaw, onUnmounted, provide } from "vue"
import { addPopup, openConfirmation, openProgress } from "@/services/popup"
import EditPopup from "../components/EditPopup.vue"
import logger from "@/services/logger"
import { lua } from "@/bridge"
import { isShipping } from "bng:config"
import { loadLayout, splitLayout, genRevision, genEmptyLayout, normaliseLayoutData } from "./layout.js"
import { createSearchLayout } from "./search.js"
import history from "./editor-history.js"
import * as schema from "./schema"

const devItemIdKey = "__devId"

let userFolderWarningShown = false

/**
 * Editor and saving capabilities are executed only when running under vite (vue dev mode in our terms).
 * This is NOT compiled into the production bundle. But this is the only tool that makes sure that the
 * layout file is up to date with schema before it's baked into the production bundle.
 */
export default function useLayoutEditor(args) {
  const {
    versions,
    settings,
    settingsValues,
    settingsOptions,
    settingsList,
    conditions,
    buildItemId,
  } = args

  const busy = ref(false)
  const watchers = []

  const badRevision = () => openConfirmation(
    "Options Editor",
    "Your options editor is outdated! Saving is disabled to avoid data corruption.<br/>Please update your codebase to the latest version.",
    [{ label: "OK", value: true, extras: { default: true } }]
  )

  const clone = obj => JSON.parse(JSON.stringify(obj))

  const layout = ref(genEmptyLayout())

  const dirty = ref(false)

  function remindUnsavedChanges() {
    if (isShipping() || !dirty.value) return
    dirty.value = false
    openConfirmation(
      "Options Editor",
      "You've edited the options layout.<br/>" +
      "These changes are saved in your <b>BeamNG user folder</b>, not the game source tree.<br/>" +
      "Move (not copy!) <code>ui/ui-vue/src/modules/options/runtime/layout.json</code> + <code>layout.dev.json</code> " +
      "into the game source tree to submit them.",
      [{ label: "Got it", value: true, extras: { default: true } }]
    )
  }

  async function warnIfUserFolderSource() {
    if (isShipping() || userFolderWarningShown) return
    try {
      const files = await lua.extensions.ui_options.getUserFolderLayouts()
      if (!Array.isArray(files) || !files.length) return
      userFolderWarningShown = true
      openConfirmation(
        "Options Editor",
        "The layout shown is loaded from your <b>BeamNG user folder</b>, not the game source tree:<br/>" +
        `<code>${files.join("</code> + <code>")}</code><br/><br/>` +
        "These are local, unsubmitted edits. Move (not copy!) them into the game source tree to submit, " +
        "or delete them from the user folder to fall back to the source version.",
        [{ label: "Got it", value: true, extras: { default: true } }]
      )
    } catch (err) {
      logger.warn("Options editor: failed to check layout source", err)
    }
  }

  const saveLayoutFile = async (data, key = "") => {
    const json = JSON.stringify(toRaw(data), null, 2)
    const success = await lua.extensions.ui_options.saveLayout(key, json)
    if (!success) throw new Error(`Failed to save layout${key ? ` (${key})` : ""}`)
  }

  let wait, waitTmr
  watchers.push(watch(() => busy.value, val => {
    if (val) {
      clearTimeout(waitTmr)
      waitTmr = setTimeout(() => {
        if (!wait) wait = openProgress("Working...", null, { indeterminate: true })
      }, 100)
    } else if (wait) {
      wait.return(null)
      wait = null
    } else {
      clearTimeout(waitTmr)
    }
  }, { immediate: true }))
  onUnmounted(() => {
    clearTimeout(waitTmr)
    if (wait) wait.return(null)
  })

  async function persistLayout() {
    layout.value.revision = genRevision()
    const { layout: main, layoutDev: dev } = splitLayout(layout.value)
    await saveLayoutFile(main) // saves to layout.json
    await saveLayoutFile(dev, "dev") // saves to layout.dev.json
    dirty.value = true
  }

  async function load() {
    busy.value = true
    try {
      const data = await loadLayout(true) || genEmptyLayout()
      if (data.schema > schema.SCHEMA_REV) {
        badRevision()
        layout.value = data
      } else {
        const schemaMatches = data.schema === schema.SCHEMA_REV
        const normalised = normaliseLayoutData(data, schema.SCHEMA_REV)
        layout.value = normalised.layout
        if (normalised.restored) {
          await persistLayout()
          if (schemaMatches) {
            await openConfirmation(
              "Options Editor",
              "Layout schema was invalid and restored automatically.<br/>Please upload updated layout files to the repository.",
              [{ label: "OK", value: true, extras: { default: true } }]
            )
          }
        }
      }
      // create search templates
      layout.value.search = createSearchLayout(data => schema.createItem(data, true))
      // for race condition
      await settings.waitForData()
      // and finally connect with history
      history.connect(layout, selectedItems, clipItems, save)
    } catch (err) {
      logger.error("Options editor data loading error:", err)
    }
    busy.value = false
    warnIfUserFolderSource()
  }
  load()

  async function save() {
    if (layout.value.schema > schema.SCHEMA_REV) return
    busy.value = true
    try {
      await persistLayout()
      busy.value = false
    } catch (err) {
      logger.error(err)
      busy.value = false
      if (await openConfirmation("Save error!", err.message + "\nWould you like to retry?", [{ label: "Retry", value: true, extras: { default: true } }, { label: "Cancel", value: false, extras: { cancel: true, outsideCancel: true, accent: "secondary" } }])) save()
    }
  }

  const editPopupProps = { settingsList, settingsValues, settingsOptions, conditions, versions }
  /** @async */
  const openCategoryEditor = (title, data) => {
    if (layout.value.schema > schema.SCHEMA_REV) badRevision()
    return addPopup(EditPopup, { title, dataType: "category", data, ...editPopupProps }).promise
  }
  /** @async */
  const openItemEditor = (title, data) => {
    if (layout.value.schema > schema.SCHEMA_REV) badRevision()
    if (!data.version) data.version = versions[0]
    return addPopup(EditPopup, { title, dataType: "item", data, ...editPopupProps }).promise
  }

  async function categoryAdd(persistent = false) {
    const tpl = schema.getCategoryTemplate(true)
    tpl.persistent = !!persistent
    const res = await openCategoryEditor("New category", tpl)
    if (!res) return
    layout.value.items.push(schema.createCategory(res))
    fixCategories()
    await save()
    history.record("add category")
  }

  async function categoryEdit(index) {
    const devId = layout.value.items[index]?.[devItemIdKey]
    const res = await openCategoryEditor("Edit category", layout.value.items[index])
    if (!res) return
    layout.value.items[index] = schema.createCategory(res)
    if (devId) layout.value.items[index][devItemIdKey] = devId
    fixCategories()
    await save()
    history.record("edit category")
  }

  async function categoryMove(index, dir) {
    if (dir !== -1 && dir !== 1) return
    if (index === 0 && dir === -1) return
    if (index === layout.value.items.length - 1 && dir === 1) return
    const tmp = layout.value.items[index + dir]
    layout.value.items[index + dir] = layout.value.items[index]
    layout.value.items[index] = tmp
    fixCategories()
    await save()
    history.record("move category", true)
  }

  async function categoryRemove(index) {
    if (!await openConfirmation("Remove category", `This will also remove all the items you have there.\nAre you absolutely sure you want to remove "${layout.value.items[index].label}" category?`)) return
    layout.value.items.splice(index, 1)
    clearSelection()
    await save()
    history.record("remove category")
  }

  function fixCategories() {
    // make sure that "persistent" are always at the bottom
    const regularLast = layout.value.items.findLastIndex(cat => !cat.persistent)
    const persistentFirst = layout.value.items.findIndex(cat => cat.persistent)
    if (regularLast > -1 && persistentFirst > -1 && regularLast > persistentFirst) {
      layout.value.items = [
        ...layout.value.items.filter(cat => !cat.persistent),
        ...layout.value.items.filter(cat => cat.persistent),
      ]
    }
    // make sure categoryIds are unique
    const categoryIds = layout.value.items.map(cat => cat.categoryId)
    for (let i = 0; i < categoryIds.length; i++) {
      if (categoryIds.indexOf(categoryIds[i]) !== i) {
        layout.value.items[i].categoryId += "_" + i
      }
    }
  }

  const clipItems = ref([])
  const selectedItems = ref(new Set()) // Set of "parent:index" strings for selected items
  const itemIdMap = new Map() // maps hierarchical IDs to { parent, index } objects

  function registerItem(itemId, parent, index) {
    itemIdMap.set(itemId, { parent, index })
  }

  function toggleItemSelection(parent, index, itemId) {
    if (!itemId) return
    registerItem(itemId, parent, index)
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }
  }

  function isItemSelected(itemId) {
    if (!itemId) return false
    return selectedItems.value.has(itemId)
  }

  function clearSelection() {
    selectedItems.value.clear()
    itemIdMap.clear()
  }

  /** @param {Array} selectedItemsData Must always be the full current selection data */
  function removeSelected(selectedItemsData) {
    // group by parent and sort indices descending to avoid index shifting
    const byParent = new Map()
    selectedItemsData.forEach(({ parent, index }) => {
      if (!byParent.has(parent)) byParent.set(parent, [])
      byParent.get(parent).push(index)
    })
    // remove items from each parent
    byParent.forEach((indices, parent) => {
      indices.sort((a, b) => b - a).forEach(index => {
        parent.items.splice(index, 1)
      })
    })
    clearSelection()
  }

  function updateSelection(operation, parent, index, count = 1) {
    const rem = []
    const upd = new Map()

    for (const [itemId, location] of itemIdMap.entries()) {
      // check if this selection is in the same parent as the operation
      if (location.parent !== parent) continue
      switch (operation) {
        case "insert":
          // shift indices after insertion point
          if (location.index >= index) {
            upd.set(itemId, { ...location, index: location.index + count })
          }
          break
        case "remove":
          // remove selections within the removal range
          if (location.index >= index && location.index < index + count) {
            rem.push(itemId)
          }
          // shift indices after removal point
          else if (location.index >= index + count) {
            upd.set(itemId, { ...location, index: location.index - count })
          }
          break
        case "move":
          {
            const { oldIndex, newIndex } = count // count is actually an object in case of move
            if (location.index === oldIndex) {
              upd.set(itemId, { ...location, index: newIndex })
            } else if (oldIndex < newIndex) {
              // moved forward, shift items between oldIndex and newIndex backward
              if (location.index > oldIndex && location.index <= newIndex) {
                upd.set(itemId, { ...location, index: location.index - 1 })
              }
            } else {
              // moved backward, shift items between newIndex and oldIndex forward
              if (location.index >= newIndex && location.index < oldIndex) {
                upd.set(itemId, { ...location, index: location.index + 1 })
              }
            }
          }
          break
      }
    }

    // remove invalid selections
    rem.forEach(itemId => {
      selectedItems.value.delete(itemId)
      itemIdMap.delete(itemId)
    })

    // update shifted selections
    upd.forEach((newLocation, itemId) => {
      itemIdMap.set(itemId, newLocation)
    })

    validateSelection()
  }

  function validateSelection() {
    const rem = []
    for (const [itemId, location] of itemIdMap.entries()) {
      // check if the item still exists at the expected location
      if (location.index < 0 || !location.parent?.items || location.index >= location.parent.items.length) {
        rem.push(itemId)
      }
    }
    rem.forEach(itemId => {
      selectedItems.value.delete(itemId)
      itemIdMap.delete(itemId)
    })
  }

  function removeItemFromSelection(parent, index) {
    // find and remove any selection that matches this exact parent+index
    const rem = []
    for (const [itemId, location] of itemIdMap.entries()) {
      if (location.parent === parent && location.index === index) {
        rem.push(itemId)
      }
    }
    rem.forEach(itemId => {
      selectedItems.value.delete(itemId)
      itemIdMap.delete(itemId)
    })
  }

  function getSelectedItemsData() {
    const items = []
    for (const itemId of selectedItems.value) {
      const location = itemIdMap.get(itemId)
      if (location && location.parent && location.parent.items) {
        const item = location.parent.items[location.index]
        if (item) {
          items.push({
            parent: location.parent,
            index: location.index,
            item: JSON.parse(JSON.stringify(item)),
            itemId,
          })
        }
      }
    }
    return items
  }

  async function itemAdd(parent) {
    const res = await openItemEditor("New item", schema.getItemTemplate(null, true))
    if (!res) return
    const insertIndex = parent.items.length
    parent.items.push(schema.createItem(res))
    updateSelection("insert", parent, insertIndex, 1)
    await save()
    history.record("add " + res.itemType)
  }

  async function itemEdit(parent, index) {
    const devId = parent.items[index]?.[devItemIdKey]
    const originalType = parent.items[index].itemType
    const res = await openItemEditor("Edit item", parent.items[index])
    if (!res) return
    parent.items[index] = schema.createItem(res)
    if (devId) parent.items[index][devItemIdKey] = devId
    await save()
    history.record("edit " + originalType)
  }

  async function itemSelect(parent, index, itemId) {
    toggleItemSelection(parent, index, itemId)
  }

  async function itemCut(parent, index) {
    const selectedItemsData = getSelectedItemsData()

    if (selectedItemsData.length > 0) {
      const cutTitle = selectionTitle.value
      clipItems.value = selectedItemsData.map(item => item.item)
      removeSelected(selectedItemsData)
      await save()
      history.record("cut " + cutTitle)
    } else {
      const itemType = parent.items[index].itemType
      clipItems.value = [parent.items[index]]
      parent.items.splice(index, 1)
      await save()
      history.record("cut " + itemType)
    }
  }

  async function itemCopy(parent, index) {
    const selectedItemsData = getSelectedItemsData()
    if (selectedItemsData.length > 0) {
      clipItems.value = selectedItemsData.map(item => item.item)
    } else {
      clipItems.value = [parent.items[index]]
    }
  }

  async function itemPaste(parent, index, target = "below") {
    if (!clipItems.value.length) return
    const pasteTitle = clipTitle.value
    const itemsToPaste = clipItems.value
    let insertParent, insertIndex
    switch (target) {
      case "inside":
        if (!("items" in parent.items[index])) return
        insertParent = parent.items[index]
        insertIndex = insertParent.items.length
        itemsToPaste.forEach(itm => insertParent.items.push(clone(itm)))
        updateSelection("insert", insertParent, insertIndex, itemsToPaste.length)
        break
      case "above":
        insertParent = parent
        insertIndex = index
        itemsToPaste.reverse().forEach(itm => insertParent.items.splice(insertIndex, 0, clone(itm)))
        updateSelection("insert", insertParent, insertIndex, itemsToPaste.length)
        break
      case "below":
      default:
        insertParent = parent
        insertIndex = index === parent.items.length - 1 ? parent.items.length : index + 1
        itemsToPaste.forEach((itm, i) => insertParent.items.splice(insertIndex + i, 0, clone(itm)))
        updateSelection("insert", insertParent, insertIndex, itemsToPaste.length)
        break
    }
    clearSelection()
    await save()
    history.record("paste " + pasteTitle)
  }

  async function itemMove(parent, index, dir) {
    const itemType = parent.items[index].itemType
    const newIndex = index + dir
    if (dir !== -1 && dir !== 1) return
    if (index === 0 && dir === -1) return
    if (index === parent.items.length - 1 && dir === 1) return
    const tmp = parent.items[newIndex]
    parent.items[newIndex] = parent.items[index]
    parent.items[index] = tmp
    updateSelection("move", parent, index, { oldIndex: index, newIndex })
    await save()
    history.record("move " + itemType, true)
  }

  async function itemRemove(parent, index) {
    if (!await openConfirmation("Remove item", `Are you sure you want to remove this ${parent.items[index].itemType}?`)) return
    const itemType = parent.items[index].itemType
    removeItemFromSelection(parent, index) // remove from selection if it was selected
    parent.items.splice(index, 1)
    updateSelection("remove", parent, index, 1)
    await save()
    history.record("remove " + itemType)
  }

  async function itemGroup(parent, index) {
    let selectedItemsData = getSelectedItemsData()
    if (selectedItemsData.length === 0) return
    const groupTitle = selectedItemsData.length > 1 ? `${selectedItemsData.length} items` : selectedItemsData[0].item.itemType
    const version = selectedItemsData.map(item => item.item.version).sort().reverse()[0]
    const groupItem = schema.createItem({
      itemType: "group",
      items: selectedItemsData.map(item => clone(item.item)),
      version,
    }, true)
    parent.items.splice(index, 0, groupItem)
    updateSelection("insert", parent, index, 1)
    selectedItemsData = getSelectedItemsData()
    removeSelected(selectedItemsData)
    await save()
    history.record("group " + groupTitle)
  }

  async function itemUngroup(parent, index) {
    const groupItem = parent.items[index]
    if (groupItem.itemType !== "group" || !groupItem.items) return
    const itemsCount = groupItem.items.length
    removeItemFromSelection(parent, index) // remove group from selection if it was selected
    const itemsToInsert = groupItem.items.map(item => clone(item))
    itemsToInsert.reverse().forEach(item => {
      parent.items.splice(index + 1, 0, item)
    })
    updateSelection("insert", parent, index + 1, itemsCount)
    parent.items.splice(index, 1) // remove the group item
    updateSelection("remove", parent, index, 1)
    await save()
    history.record("ungroup " + (itemsCount === 0 ? "none" : itemsCount === 1 ? "1 item" : `${itemsCount} items`))
  }

  // async function itemFeature(parent, index) {
  //   if (selectedItems.value.size > 0) {
  //     for (let i = 0; i < parent.items.length; i++) {
  //       parent.items[i].featured = true
  //     }
  //   } else {
  //     parent.items[index].featured = !parent.items[index].featured
  //   }
  //   await save()
  //   history.record("feature " + parent.items[index].itemType)
  // }

  function itemSelectAll(parent) {
    if (selectedItems.value.size > 0) {
      clearSelection()
    } else {
      for (let i = 0; i < parent.items.length; i++) {
        toggleItemSelection(parent, i, buildItemId(0, i, ""))
      }
    }
  }

  const clipTitle = computed(() => {
    if (!clipItems.value.length) return "n/a"
    const count = clipItems.value.length
    const name = count > 1 ? `${count} items` : clipItems.value[0].itemType
    return name || "<???>"
  })

  const selectionTitle = computed(() => {
    const selectedItemsData = getSelectedItemsData()
    if (selectedItemsData.length === 0) return ""
    const count = selectedItemsData.length
    return count > 1 ? `${count} items` : selectedItemsData[0].item.itemType
  })

  function dispose() {
    remindUnsavedChanges()
    for (const unwatch of watchers) {
      unwatch()
    }
    watchers.splice(0)
    layout.value = genEmptyLayout()
    selectedItems.value.clear()
    itemIdMap.clear()
  }

  provide("isItemSelected", isItemSelected)

  return {
    busy,
    layout,
    dirty,
    remindUnsavedChanges,
    dispose,
    save,
    history,
    openCategoryEditor,
    openItemEditor,
    categoryAdd,
    categoryEdit,
    categoryMove,
    categoryRemove,
    itemAdd,
    itemEdit,
    itemSelect,
    itemCut,
    itemCopy,
    itemPaste,
    itemMove,
    itemRemove,
    itemGroup,
    itemUngroup,
    // itemFeature,
    itemSelectAll,
    clipItems,
    clipTitle,
    selectedItems,
    selectionTitle,
    isItemSelected,
    clearSelection,
    buildItemId,
    ...schema,
  }
}
