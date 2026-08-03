import { ref, reactive, computed, watch, markRaw, onBeforeMount, onMounted, onUnmounted, provide, nextTick } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useScopedNav } from "@/services/scopedNav/api"
import logger from "@/services/logger"
import { useBridge } from "@/bridge"
import useOptions from "./options"
import { useDisplayApplyConfirm } from "./useDisplayApplyConfirm"
import { useInfoView } from "./useInfoView"
import { hasNotShippingMarker, isItemVisible, isGraphicsItem } from "./render/itemState"
import { lua } from "@/bridge"

export function useOptionsView(props, emit) {
  const scopedNav = useScopedNav()
  const router = useRouter()
  const route = useRoute()
  const { api } = useBridge()
  const options = useOptions()

  const loaded = ref(false)
  const itemsContainer = ref(null)

  provide("version", options.version)

  const EditUI = ref(null)
  const itemEdit = (...args) => EditUI.value?.functions.itemEdit?.(...args)
  const categoryEdit = (...args) => EditUI.value?.functions.categoryEdit?.(...args)
  const catItemsPaste = (...args) => EditUI.value?.functions.catItemsPaste?.(...args)
  provide("EditUI", EditUI)

  const editable = ref(false)
  provide("editable", editable)

  // leaving editing mode (toggle off or back) - remind about unsubmitted user-folder layout changes
  watch(editable, (val, prev) => {
    if (prev && !val) options.editor?.remindUnsavedChanges?.()
  })

  const categories = computed(() => options.layout.value.items || [])
  const categoryIds = computed(() => categories.value.map(cat => cat.categoryId))
  const categoryIndex = ref(-1)

  provide("categoryIndex", categoryIndex)

  const allCategories = computed(() => {
    const cats = [...categories.value].map(cat => ({ ...cat }))
    let startIndex = 0

    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i]
      cat.categoryIndex = i
      if (cat.subcategory) {
        cats[startIndex].hasSubcategories = true
        cat.indexRange = [startIndex, i]
        let hadSpacer = false
        for (let ri = startIndex; ri <= i; ri++) {
          cats[ri].indexRange = cat.indexRange
          if (cat.persistent) cats[ri].persistent = true
          if (cats[ri].spacer) {
            hadSpacer = true
            continue
          }
          if (ri > startIndex) {
            cats[ri].subcategoryMode =
              hadSpacer ? "none" :
              ri === i ? "last" :
              ri === startIndex + 1 ? "first" :
              "middle"
          }
        }
      } else {
        startIndex = i
        cat.indexRange = [i, i]
      }
    }

    const hidden = []
    for (const cat of cats) {
      const visible = isItemVisible(cat, {
        conditions: options.conditions,
        values: options.settingsValues.value,
      })
      if (visible) continue
      if (cat.subcategory) {
        hidden.push(cat.categoryIndex)
      } else {
        for (let i = cat.indexRange[0]; i <= cat.indexRange[1]; i++) {
          hidden.push(i)
        }
      }
    }

    if (options.editable) {
      return cats.map(cat => {
        cat.hiddenByCondition = hidden.includes(cat.categoryIndex)
        cat.debugSettings = hasNotShippingMarker(cat)
        return cat
      })
    } else if (hidden.length > 0) {
      return cats.filter(cat => !hidden.includes(cat.categoryIndex))
    } else {
      return cats
    }
  })

  const categoriesView = computed(() => allCategories.value
    .filter(cat => !cat.subcategory && !cat.persistent && !cat.spacer)
  )

  const categoryRange = computed(() =>
    categoriesView.value.find(cat => categoryIndex.value >= cat.indexRange[0] && categoryIndex.value <= cat.indexRange[1])?.indexRange
    || [categoryIndex.value, categoryIndex.value]
  )

  function hasVisibleContent(parent) {
    return (parent.items || []).some(item => {
      if (!isItemVisible(item, {
        conditions: options.conditions,
        values: options.settingsValues.value,
      })) {
        return false
      }

      if (item.__dev || item.itemType === "divider") {
        return false
      }

      if (item.items) {
        return hasVisibleContent(item)
      }

      return true
    })
  }

  const subcategoriesView = computed(() => {
    let result = categoryIndex.value === -1 ? [] : allCategories.value
      .filter(cat =>
        !cat.persistent &&
        cat.categoryIndex >= categoryRange.value[0] &&
        cat.categoryIndex <= categoryRange.value[1]
      )
    if (result.length > 0) {
      const parent = result[0]
      if (parent.hasSubcategories && !hasVisibleContent(parent)) {
        result = result.slice(1)
      } else {
        result[0] = { ...parent, label: "ui.options.general" }
      }
    }
    return result
  })

  watch(subcategoriesView, tabs => {
    if (categoryIndex.value === -1) return
    if (tabs.length === 0) return

    const currentStillVisible = tabs.some(cat => cat.categoryIndex === categoryIndex.value)

    if (!currentStillVisible) {
      categoryIndex.value = tabs[0].categoryIndex
    }
  })

  const persistentView = computed(() => allCategories.value.filter(cat => cat.persistent))

  const itemsNew = ref([])
  const itemsNewShow = ref(false)
  const itemsNewView = computed(() => itemsNewShow.value ? itemsNew.value : [])
  if (options.editor) watch(options.layout, () => itemsNew.value.splice(0))
  function renderNewOptions(doRender = true) {
    itemsNewShow.value = doRender
    if (!doRender || itemsNew.value.length > 0) return

    function dive(parent) {
      if (parent.version === options.version) return
      for (let i = parent.items.length - 1; i >= 0; i--) {
        const item = parent.items[i]
        if (item.items) {
          if (item.items.length > 0) dive(item)
          if (item.items.length > 0) continue
        }
        if (item.version !== options.version) parent.items.splice(i, 1)
      }
    }
    const layout = JSON.parse(JSON.stringify(options.layout.value.items))
    for (let i = layout.length - 1; i >= 0; i--) {
      const cat = layout[i]
      dive(cat)
      if (cat.items.length > 0) {
        itemsNew.value.push(options.searchTemplates.group(cat.label, cat.icon, cat.items))
      }
    }
  }
  provide("renderNewOptions", renderNewOptions)

  const itemsView = computed(() => [
    ...(categoryIndex.value > -1 && categoryIndex.value < categories.value.length
      ? categories.value[categoryIndex.value].items : []),
    ...(editable.value ? [] : itemsNewView.value),
  ])

  const special = ref(null)
  watch(categoryIndex, () => {
    renderNewOptions(false)
    if (categoryIndex.value > -1) {
      special.value = null
      searchActive.value = false
      options.searchText.value = ""
    }
    if (itemsContainer.value) itemsContainer.value.scrollTo({ top: 0, behavior: "instant" })
  })
  watch(special, () => {
    if (special.value) {
      categoryIndex.value = -1
      searchActive.value = false
      options.searchText.value = ""
    }
  })

  const searchActive = ref(false)
  const searchFocused = ref(false)
  watch(searchFocused, focused => {
    if (focused) {
      searchActive.value = true
      categoryIndex.value = -1
      special.value = null
    } else if (options.searchText.value.length === 0) {
      searchActive.value = false
      categoryIndex.value = 0
    }
  })

  const SEARCH_SCOPE_ID = "options-search"

  const elCategories = ref(null)
  const elSearch = ref(null)
  let scopeBeforeSearch = "options-content-wrapper"

  watch(() => elSearch.value?.scopeActivated, (active, prevActive) => {
    if (active) {
      scopeBeforeSearch = "options-content-wrapper"
      return
    }
    if (prevActive && !active) {
      scopedNav.switchScope(scopeBeforeSearch)
    }
  })

  function activateSearchTab() {
    if (!searchActive.value) {
      searchActive.value = true
      categoryIndex.value = -1
      special.value = null
    }
    nextTick(() => {
      scopeBeforeSearch = scopedNav.currentScope()?.id || "options-subcategories"
    })
  }

  function toSearchAndBack() {
    if (!searchActive.value || !elSearch.value) {
      activateSearchTab()
      return
    }
    if (elSearch.value.scopeActivated) {
      scopedNav.deactivateScope(SEARCH_SCOPE_ID)
    } else {
      scopedNav.switchScope("options-content-wrapper")
    }
  }

  function fromContent() {
    scopedNav.switchScope("options-subcategories")
  }

  function mainCatNav(evt) {
    if (!elCategories.value || !evt.detail) return
    options.searchText.value = ""
    scopedNav.deactivateScope(SEARCH_SCOPE_ID)
    searchActive.value = false
    scopedNav.switchScope("options-subcategories")
    if (evt.detail.name === "tab_l") {
      elCategories.value.activatePrev()
    } else if (evt.detail.name === "tab_r") {
      elCategories.value.activateNext()
    }
    evt.stopPropagation()
  }

  function catNavigate(cat, navigateReroute = true) {
    if (cat.reroute) {
      if (navigateReroute) {
        lua.extensions.ui_router.navigate(cat.reroute)
      }
    } else if (categoryIndex.value !== cat.categoryIndex) {
      categoryIndex.value = cat.categoryIndex
    }
  }

  const goToSetting = (catIndex, itemId) => {
    categoryIndex.value = catIndex
    nextTick(() => {
      const elm = document.getElementById(itemId)
      if (elm) {
        elm.scrollIntoView({ behavior: "smooth", block: "center" })
        elm.classList.add("options-setting-highlight")
        setTimeout(() => elm?.classList.remove("options-setting-highlight"), 5000)
      } else {
        logger.warn(`Setting item not found: ${itemId}`)
      }
    })
  }
  provide("goToSetting", goToSetting)

  // Applying some graphics settings freezes the engine (and CEF). Show a timer icon in Item.vue while waiting.
  // Keyed by setting name, read via inject("itemBusy").
  const itemBusy = reactive({})
  provide("itemBusy", itemBusy)

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

  function resolveChangeLua(data, value) {
    if (data.itemType === "checkbox") {
      if (value === true || value === "enable") return data.lua
      if (value === false || value === "disable") return data.luaOff
      return undefined
    }
    return data.lua
  }

  async function onChange(data, value) {
    const lua = resolveChangeLua(data, value)

    if (!isGraphicsItem(data)) {
      options.applySetting(data.setting, value)
      if (lua) runLua(lua, value)
      return
    }

    // Show the timer icon, then wait a couple of frames so the engine renders it before we trigger the synchronous freeze.
    // The setState/runLua promises resolve once the engine has finished, so we hide the icon after them.
    const key = data.setting || data.lua
    itemBusy[key] = true
    try {
      await nextTick()
      await nextFrame()
      await nextFrame()
      await options.applySetting(data.setting, value)
      if (lua) await runLua(lua, value, true)
    } finally {
      itemBusy[key] = false
    }
  }

  const displayApply = useDisplayApplyConfirm(options, runLua)

  function onClick(data) {
    if (data.lua && data.lua.includes("applyGraphicsState")) {
      displayApply.applyWithConfirmation()
      return
    }
    if (data.lua) runLua(data.lua)
  }

  function runLua(code, value = undefined, awaitDone = false) {
    if (code.toLowerCase().includes("%value%") && typeof value !== "undefined") {
      code = code.replace(/%value%/gi, api.serializeToLua(value))
    }
    if (code.toLowerCase().includes("%values%")) {
      code = code.replace(/%values%/gi, api.serializeToLua(options.settings.values))
    }
    const isLua = !code.startsWith("$")
    logger.log(`Running ${isLua ? "lua" : "script"}: ${code}`)
    if (isLua) {
      if (awaitDone) return new Promise(resolve => api.engineLua(code, resolve))
      api.engineLua(code)
    } else {
      api.engineScript(code)
    }
  }

  function updateRoute() {
    if (!props.syncRoute) return
    if (!loaded.value) return
    if (route.path !== "/options" && !route.path.startsWith("/options/")) return
    const newRoute = { name: "options" }
    if (categoryIndex.value > -1 && categoryIndex.value < categoryIds.value.length) {
      newRoute.params = { category: categoryIds.value[categoryIndex.value] }
    } else if (special.value) {
      newRoute.params = { category: special.value }
    }
    router.push(newRoute)
  }

  function emitCategoryUpdate() {
    if (searchActive.value) return
    if (categoryIndex.value > -1 && categoryIndex.value < categoryIds.value.length) {
      emit("update:category", categoryIds.value[categoryIndex.value])
    } else if (special.value) {
      emit("update:category", special.value)
    } else {
      emit("update:category", undefined)
    }
  }

  watch(() => categoryIndex.value, (index, oldIndex) => {
    if (index > -1) {
      special.value = null
      updateRoute()
      emitCategoryUpdate()
      options.editor?.clearSelection()
      showCategoryInfo(index, categories.value[index]?.categoryInfo)
      showCategoryInfo(oldIndex)
    } else {
      showCategoryInfo(oldIndex)
    }
  })

  watch(() => special.value, val => {
    if (val) {
      categoryIndex.value = -1
      updateRoute()
      emitCategoryUpdate()
    } else {
      emitCategoryUpdate()
    }
  })

  watch(
    () => props.category,
    category => {
      if (!loaded.value) return
      if (!category) {
        if (special.value) special.value = null
        if (categoryIndex.value === -1) categoryIndex.value = 0
        return
      }
      const index = categoryIds.value.indexOf(category)
      if (index > -1) {
        if (special.value) special.value = null
        if (categoryIndex.value !== index) categoryIndex.value = index
        return
      }
      if (categoryIndex.value !== -1) categoryIndex.value = -1
      if (special.value !== category) special.value = category
    }
  )

  function selectDefaultCategory() {
    if (categories.value.length === 0) return false
    if (props.category) {
      const catIndex = categoryIds.value.indexOf(props.category)
      if (catIndex > -1) {
        categoryIndex.value = catIndex
      } else {
        special.value = props.category
      }
    } else {
      categoryIndex.value = 0
    }
    return true
  }

  const infoHidden = ref(!!props.infoHidden)
  const { infoView, showInfo } = useInfoView((a, b) => a[0] - b[0])
  watch(
    () => props.infoHidden,
    hidden => {
      infoHidden.value = !!hidden
    },
    { immediate: true }
  )
  provide("showInfo", showInfo)
  provide("infoHidden", infoHidden)

  const fps = ref("?")
  const frameTimeMs = ref("?")
  const cpuTimeMs = ref("?")
  const gpuTimeMs = ref("?")
  const waitForGpuMs = ref("?")
  const systemMemoryUsedMb = ref("?")
  const systemMemoryOtherAppsMb = ref("?")
  const systemMemoryTotalMb = ref("?")
  const gpuMemoryUsedMb = ref("?")
  const gpuMemoryOtherAppsMb = ref("?")
  const gpuMemoryTotalMb = ref("?")
  const fpsShown = ref(false)
  let fpsTimer

  function asFiniteNumber(value) {
    const num = Number(value)
    return Number.isFinite(num) ? num : undefined
  }

  function bytesToMb(bytes) {
    const num = asFiniteNumber(bytes)
    return num === undefined ? "?" : Math.round(num / (1024 * 1024)).toLocaleString()
  }

  function getGpuMemoryTotalBytes(mem) {
    const dedicated = asFiniteNumber(mem?.dedicatedBytes)
    const shared = asFiniteNumber(mem?.sharedBytes)
    const budget = asFiniteNumber(mem?.budgetBytes)

    if (mem?.isDedicatedMemory && dedicated && dedicated > 0) return dedicated
    if (shared && shared > 0) return shared
    if (dedicated && dedicated > 0) return dedicated
    return budget
  }

  function resetFpsStats() {
    fps.value = "?"
    frameTimeMs.value = "?"
    cpuTimeMs.value = "?"
    gpuTimeMs.value = "?"
    waitForGpuMs.value = "?"
    systemMemoryUsedMb.value = "?"
    systemMemoryOtherAppsMb.value = "?"
    systemMemoryTotalMb.value = "?"
    gpuMemoryUsedMb.value = "?"
    gpuMemoryOtherAppsMb.value = "?"
    gpuMemoryTotalMb.value = "?"
  }

  function showFps(show = true) {
    fpsShown.value = show
    api.engineLua(`Engine.Debug.setGpuTimingOverlayVisible(${show})`)

    if (!fpsTimer) {
      if (show) {
        const fpsUpdate = () => {
          if (infoHidden.value) return

          api.engineLua(`VariableRegistry.get("$fps::avg", 0)`, val => {
            const avg = asFiniteNumber(val)

            if (avg && avg > 0) {
              fps.value = avg.toFixed(1)
              frameTimeMs.value = (1000 / avg).toFixed(2)
            } else {
              fps.value = "?"
              frameTimeMs.value = "?"
            }
          })

          api.engineLua(`VariableRegistry.get("$fps::waitForGPU", 0)`, val => {
            const wait = asFiniteNumber(val)
            waitForGpuMs.value = wait === undefined ? "?" : wait.toFixed(2)
          })

          api.engineLua(`{ cpu = VariableRegistry.get("$fps::cpuTime", -1), gpu = VariableRegistry.get("$fps::gpuTime", -1) }`, times => {
            const cpu = asFiniteNumber(times?.cpu)
            const gpu = asFiniteNumber(times?.gpu)
            cpuTimeMs.value = cpu === undefined || cpu < 0 ? "N/A" : cpu.toFixed(2)
            gpuTimeMs.value = gpu === undefined || gpu < 0 ? "N/A" : gpu.toFixed(2)
          })

          api.engineLua(`Engine.Platform.getMemoryInfo()`, mem => {
            const processUsed = asFiniteNumber(mem?.processPhysUsed)
            const osUsed = asFiniteNumber(mem?.osPhysUsed)
            const total = asFiniteNumber(mem?.osPhysAvailable)

            if (processUsed === undefined || osUsed === undefined || total === undefined) {
              systemMemoryUsedMb.value = "?"
              systemMemoryOtherAppsMb.value = "?"
              systemMemoryTotalMb.value = "?"
              return
            }

            systemMemoryUsedMb.value = bytesToMb(osUsed)
            systemMemoryOtherAppsMb.value = bytesToMb(Math.max(0, osUsed - processUsed))
            systemMemoryTotalMb.value = bytesToMb(total)
          })

          api.engineLua(`Engine.Render.getMemoryInfo()`, mem => {
            const processUsed = asFiniteNumber(mem?.usageBytes)
            const available = asFiniteNumber(mem?.availableBytes)
            const total = getGpuMemoryTotalBytes(mem)

            if (!mem?.valid || processUsed === undefined || available === undefined || total === undefined) {
              gpuMemoryUsedMb.value = "?"
              gpuMemoryOtherAppsMb.value = "?"
              gpuMemoryTotalMb.value = "?"
              return
            }

            gpuMemoryUsedMb.value = bytesToMb(Math.max(0, total - available))
            gpuMemoryOtherAppsMb.value = bytesToMb(Math.max(0, total - available - processUsed))
            gpuMemoryTotalMb.value = bytesToMb(total)
          })
        }

        fpsTimer = setInterval(fpsUpdate, 500)
        fpsUpdate()
      }
    } else if (!show) {
      clearInterval(fpsTimer)
      fpsTimer = null
      resetFpsStats()
    }
  }

  const catInfoFuncs = {
    fps: showFps,
  }
  const catInfoStack = new Map()
  function showCategoryInfo(id, info = undefined) {
    if (!id) return
    if (catInfoStack.has(id) && !info) {
      catInfoStack.delete(id)
    } else if (info) {
      catInfoStack.set(id, info)
    }
    const infos = Array.from(catInfoStack.values())
      .reduce((res, name) => res.includes(name) ? res : [...res, name], [])
    for (const [name, func] of Object.entries(catInfoFuncs)) {
      const enabled = infos.includes(name)
      func(enabled)
    }
  }
  function disposeCategoryInfo() {
    for (const func of Object.values(catInfoFuncs)) {
      func(false)
    }
  }

  function back() {
    if (editable.value) {
      editable.value = false
    } else {
      emit("back")
      if (props.syncRoute) lua.extensions.ui_router.back() // window.bngVue.gotoAngularState("menu")
    }
  }

  onBeforeMount(async () => {
    if (props.managePauseRequest) {
      api.engineLua("if getCurrentLevelIdentifier() then simTimeAuthority.pushPauseRequest('options') end")
    }

    if (import.meta.hot) {
      EditUI.value = markRaw(await import("./components/EditUI.vue"))
    }
  })

  onMounted(() => {
    options.init().then(() => {
      loaded.value = true
      displayApply.captureBaseline() // so it can be reverted if needed
      nextTick(() => scopedNav.switchScope("options-subcategories"))
    })

    if (!selectDefaultCategory()) {
      const unwatchCats = watch(categories, () => selectDefaultCategory() && unwatchCats())
    }

  })

  onUnmounted(() => {
    options.searchText.value = ""
    disposeCategoryInfo()
    options.dispose()
    if (props.managePauseRequest) {
      api.engineLua("if getCurrentLevelIdentifier() then simTimeAuthority.popPauseRequest('options') end")
    }
  })

  function focusEntry() {
    scopedNav.switchScope("options-subcategories")
    return true
  }

  return {
    scopedNav,
    options,
    loaded,
    categories,
    categoryIndex,
    categoriesView,
    categoryRange,
    subcategoriesView,
    persistentView,
    allCategories,
    itemsView,
    special,
    searchActive,
    searchFocused,
    editable,
    EditUI,
    infoView,
    infoHidden,
    fps,
    fpsShown,
    frameTimeMs,
    cpuTimeMs,
    gpuTimeMs,
    waitForGpuMs,
    systemMemoryUsedMb,
    systemMemoryOtherAppsMb,
    systemMemoryTotalMb,
    gpuMemoryUsedMb,
    gpuMemoryOtherAppsMb,
    gpuMemoryTotalMb,
    SEARCH_SCOPE_ID,
    elCategories,
    elSearch,
    itemsContainer,
    activateSearchTab,
    toSearchAndBack,
    fromContent,
    mainCatNav,
    catNavigate,
    goToSetting,
    onChange,
    onClick,
    renderNewOptions,
    itemEdit,
    categoryEdit,
    catItemsPaste,
    back,
    focusEntry,
  }
}
