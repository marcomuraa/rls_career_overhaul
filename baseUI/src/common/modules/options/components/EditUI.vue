<template>
  <div v-if="options.editable" class="options-editor-buttons">
    <template v-if="editable">
      <BngButton
        v-if="editable"
        :accent="ACCENTS.text"
        :icon="icons.undo"
        :disabled="!options.editor.history.undoAction.value"
        @click="options.editor.history.undo()"
      >Undo {{ options.editor.history.undoAction.value }}</BngButton>
      <BngButton
        v-if="editable"
        :accent="ACCENTS.text"
        :icon="icons.redo"
        :disabled="!options.editor.history.redoAction.value"
        @click="options.editor.history.redo()"
      >Redo {{ options.editor.history.redoAction.value }}</BngButton>
      <BngButton
        v-if="editable"
        :accent="special === 'categories-edit' ? ACCENTS.primary : ACCENTS.outlined"
        :icon="icons.listIndented"
        @click="special = 'categories-edit'"
      >Edit categories</BngButton>
    </template>
    <BngButton
      :accent="editable ? ACCENTS.primary : ACCENTS.outlined"
      :icon="icons.edit"
      @click="toggleEditor"
    >{{ editable ? "Editor enabled" : "Editor" }}</BngButton>
  </div>

  <BngPopoverMenu v-if="editable" :name="editMenu.menuId">
    <div class="popover-contents-wrapper">
      <BngButton :accent="ACCENTS.menu" :icon="icons.edit" v-if="editMenu.showEdit"
        @click="itemEditMenu('edit')"
      >Edit {{ singleItemTitle }}</BngButton>
      <!-- TODO: create item in-place -->
      <BngButton :accent="ACCENTS.menu" :icon="icons.scissors" :disabled="editMenuOtherSelection"
        @click="itemEditMenu('cut')"
      >Cut {{ itemTitle }}</BngButton>
      <BngButton :accent="ACCENTS.menu" :icon="icons.copy" :disabled="editMenuOtherSelection"
        @click="itemEditMenu('copy')"
      >Copy {{ itemTitle }}</BngButton>
      <BngButton :accent="ACCENTS.menu" :icon="icons.addListItem" v-if="editor?.clipItems.value.length === 0" disabled
      >Paste n/a</BngButton>
      <template v-else>
        <BngButton :accent="ACCENTS.menu" :icon="icons.sortAscUp02"
          @click="itemEditMenu('paste', { placement: 'above' })"
        >Paste {{ editor?.clipTitle.value }} above</BngButton>
        <BngButton :accent="ACCENTS.menu" :icon="icons.addListItem" :disabled="!editMenuItemIsGroup"
          @click="itemEditMenu('paste', { placement: 'inside' })"
        >Paste {{ editor?.clipTitle.value }} inside</BngButton>
        <BngButton :accent="ACCENTS.menu" :icon="icons.sortAscDown02"
          @click="itemEditMenu('paste', { placement: 'below' })"
        >Paste {{ editor?.clipTitle.value }} below</BngButton>
      </template>
      <BngButton :accent="ACCENTS.menu" :icon="icons.group" v-if="editMenuCanGroup" :disabled="editMenuOtherSelection"
        @click="itemEditMenu('group')"
      >Group {{ editMenuGroupTitle }}</BngButton>
      <BngButton :accent="ACCENTS.menu" :icon="icons.ungroup" v-if="editMenuCanUngroup"
        @click="itemEditMenu('ungroup')"
      >Ungroup this</BngButton>
      <!-- <BngButton :accent="ACCENTS.menu" :icon="icons.flagNew"
        @click="itemEditMenu('feature')"
      >Feature {{ itemTitle }}</BngButton> -->
      <BngButton :accent="ACCENTS.menu" :icon="icons.trashBin1" :disabled="editMenuOtherSelection"
        @click="itemEditMenu('remove')"
      >Delete {{ singleItemTitle }}</BngButton>
    </div>
  </BngPopoverMenu>
</template>

<script setup>
import { ref, computed } from "vue"
import { BngButton, BngPopoverMenu, ACCENTS, icons } from "@/common/components/base"
import { openConfirmation } from "@/services/popup"
import { usePopoverHelper } from "@/services/popover"
import { isShipping } from "bng:config"
import logger from "@/services/logger"

const popover = usePopoverHelper()

const props = defineProps({
  options: Object,
  categories: Array,
})

const categoryIndex = defineModel("categoryIndex")
const special = defineModel("special")
const editable = defineModel("editable")
const editor = props.options?.editor

let editorMessageShown = false
async function toggleEditor() {
  if (!editorMessageShown) {
    let message = "This feature has live editing, writing the layout files on every change."
    if (!isShipping()) {
      message += "<br/><br/>" +
        "<b>IMPORTANT:</b> changes are saved to your BeamNG <b>user folder</b> (the Lua file system is sandboxed), <b>not</b> the game source tree.<br/>" +
        "After editing, move (not copy!) <code>ui/ui-vue/src/modules/options/runtime/layout.json</code> + <code>layout.dev.json</code> from your user folder into the game source tree to submit them."
    }
    if (!await openConfirmation("Options Editor", message)) return
    editorMessageShown = true
  }
  editable.value = !editable.value
}

const editMenu = {
  menuId: "options-edit-menu",
  parent: null,
  index: null,
  itemId: null,
  showEdit: false,
}
const editMenuOtherSelection = ref(false) // if menu raised on non-selected items
const editMenuItemIsGroup = ref(false) // if menu raised on a group
const editMenuCanGroup = computed(() => editor?.selectedItems.value.size > 0)
const editMenuCanUngroup = computed(() =>
  editMenu.parent && editMenu.index !== null &&
  editMenu.parent.items?.[editMenu.index]?.itemType === "group"
)
const editMenuGroupTitle = computed(() => {
  if (!editMenuCanGroup.value) return ""
  const count = editor?.selectedItems.value.size
  return count === 1 ? "1 item" : `${count} items`
})

async function itemEditMenu(cmd, { parent, index, itemId, placement, element, showEdit = false } = {}) {
  if (!editor) return
  if (cmd !== "open") popover.hide(editMenu.menuId)
  switch (cmd) {
    case "open":
      editMenu.parent = parent
      editMenu.index = index
      editMenu.itemId = itemId
      editMenu.showEdit = showEdit
      if (editor?.selectedItems.value.size > 0 && editMenu.itemId) {
        editMenuOtherSelection.value = !editor?.isItemSelected(editMenu.itemId)
      } else {
        editMenuOtherSelection.value = false
      }
      editMenuItemIsGroup.value = editMenu.parent?.items?.[editMenu.index]?.itemType === "group"
      popover.show(editMenu.menuId, element)
      return
    case "close":
      break
    case "edit":
      await editor?.itemEdit(editMenu.parent, editMenu.index)
      break
    case "cut":
      await editor?.itemCut(editMenu.parent, editMenu.index)
      break
    case "copy":
      await editor?.itemCopy(editMenu.parent, editMenu.index)
      break
    case "paste":
      await editor?.itemPaste(editMenu.parent, editMenu.index, placement)
      break
    case "remove":
      await editor?.itemRemove(editMenu.parent, editMenu.index)
      break
    case "group":
      await editor?.itemGroup(editMenu.parent, editMenu.index)
      break
    case "ungroup":
      await editor?.itemUngroup(editMenu.parent, editMenu.index)
      break
    // case "feature":
    //   await editor?.itemFeature(editMenu.parent, editMenu.index)
    //   break
    default:
      logger.error(`Unknown item edit menu command "${cmd}"!`)
      return
  }
  editMenu.parent = null
  editMenu.index = null
  editMenu.itemId = null
}

const singleItemTitle = computed(() => {
  if (editMenu.parent && editMenu.index !== null && editMenu.parent.items?.[editMenu.index]) {
    return editMenu.parent.items[editMenu.index].itemType
  }
  return "item"
})

const itemTitle = computed(() => {
  if (editor?.selectionTitle.value) {
    return editor?.selectionTitle.value
  }
  return singleItemTitle.value
})

const itemEditCmds = {
  move: editor?.itemMove,
  edit: editor?.itemEdit,
  select: editor?.itemSelect,
  remove: editor?.itemRemove,
  add: editor?.itemAdd,
  group: editor?.itemGroup,
  ungroup: editor?.itemUngroup,
}
async function itemEdit(cmd, ...args) {
  if (!editor) return
  const op = itemEditCmds[cmd]
  if (!op) {
    logger.error(`Unknown item edit command "${cmd}"!\nArguments:`, ...args)
    return
  }
  await op(...args)
}

async function categoryEdit(cmd, ...args) {
  if (!editor) return
  switch (cmd) {
    case "move":
      await editor.categoryMove(...args)
      {
        const destIdx = args[0] + args[1]
        if (categoryIndex.value === destIdx) {
          categoryIndex.value -= args[1]
        } else if (categoryIndex.value === args[0] && destIdx > -1 && destIdx < props.categories.length) {
          categoryIndex.value = destIdx
        }
      }
      break
    case "edit":
      await editor.categoryEdit(...args)
      break
    case "remove":
      {
        const len = props.categories.length
        await editor.categoryRemove(...args)
        if (props.categories.length < len && categoryIndex.value >= args[0]) {
          categoryIndex.value--
        }
      }
      break
    case "add":
      {
        const persistent = !!args[0]
        await editor.categoryAdd(persistent)
      }
      break
    default:
      logger.error(`Unknown category edit command "${cmd}"!\nArguments:`, ...args)
      break
  }
}

async function catItemsPaste() {
  if (!editor) return
  await editor?.itemPaste(props.options.layout.value, categoryIndex.value, "inside")
}

exposed.categoryEdit = categoryEdit
exposed.catItemsPaste = catItemsPaste
exposed.itemEdit = itemEdit
exposed.itemEditMenu = opts => itemEditMenu(opts ? "open" : "close", opts)
</script>

<script>
import EditFloater from "./EditFloater.vue"
export { EditFloater }

export const exposed = {}
export const functions = {
  get categoryEdit() {
    return exposed.categoryEdit
  },
  get catItemsPaste() {
    return exposed.catItemsPaste
  },
  get itemEdit() {
    return exposed.itemEdit
  },
  get itemEditMenu() {
    return exposed.itemEditMenu
  },
}
</script>

<style lang="scss">
// NOTE: styles are global to exclude them from build

@use "@/styles/modules/mixins" as *;

.popover-contents-wrapper {
  width: max-content;
  max-width: calc-ui-rem(32);
  display: flex;
  flex-direction: column;
}


.options-editor-buttons {
  //
}

.options-item-editable-hidden {
  opacity: 0.6;
  background-color: #0008;
  &::after {
    content: "[hidden]";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: inline-block;
    padding: 0 1em;
    font-size: 1.2rem;
    font-weight: bold;
    color: #f0f;
    background-color: #0008;
    opacity: 0.8;
    pointer-events: none;
    z-index: 5;
  }
}

.options-item-editable:hover {
  opacity: 0.8;
  // highlight the item
  background-color: #fff2;
  // setup individual highlight border
  &::before {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px dotted #f60;
    pointer-events: none;
  }
  // always show highlight border for groups
  &.options-item-group::before {
    content: "";
  }
  // exclude hover on parent item
  &:not(:has(.options-item-editable:hover)) {
    // swap colours on hidden-by-condition notice
    &::after {
      color: #000;
      background-color: #f0fb;
      opacity: 0.4;
    }
    // show highlight border
    &::before {
      content: "";
    }
    // make edit floater active
    > .options-edit {
      opacity: 1.0;
      z-index: 100;
      pointer-events: auto;
    }
  }
}
</style>