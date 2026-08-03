import { ref, computed, watch } from "vue"
import { defineStore } from "pinia"
import { lua, useBridge } from "@/bridge"
import Logger from "@/services/logger"
import { useModManager } from "@/services/modManager/manager"
import { initialPlacementFromCss, rectPxToPlacement, placementToRectPx } from "./placementResolve"

export const useAppLayoutsStore = defineStore("appLayouts", () => {
  const { events } = useBridge()
  const modManager = useModManager()

  // state mirrored from Lua
  const layouts = ref([])
  const currentLayout = ref(null)
  const currentType = ref("")
  const usedLayoutKey = ref("")
  const dataAvailable = ref(false)

  // editor state
  const editing = ref(false)
  const dirty = ref(false)
  const selectedAppId = ref(null)
  const hoveredAppId = ref(null)
  const overlayEditingEnabled = ref(true)
  const dimUnselectedApps = ref(false)
  const previewPeeking = ref(false)
  const editSnapshot = ref(null)
  const cameraMode = ref("")
  const loading = ref(false)
  const error = ref(null)

  // runtime visibility state
  const visible = computed(() => showApps.value && visibility.value)
  const showApps = ref(true)
  const visibility = ref(true)
  const uiAppList = computed(() => modManager.uiAppList || {})


  const appItemCache = new Map()
  const apps = computed(() => {
    const layout = currentLayout.value
    if (!layout || !Array.isArray(layout.apps)) return []
    const out = []
    const seen = new Set()
    const showCockpitHiddenApps = editing.value || cameraMode.value !== "driver"
    for (let i = 0; i < layout.apps.length; i++) {
      const entry = layout.apps[i]
      if (!entry || !entry.appName) continue
      if (!showCockpitHiddenApps && entry.settings?.noCockpit) continue
      const id = instanceIdFor(entry, i)
      const app = getCatalogueApp(entry.appName)
      const placement = entry.placement || app?.css || {}
      const settings = entry.settings || null
      const cached = appItemCache.get(id)
      const unchanged = cached
        && cached.index === i
        && cached.appName === entry.appName
        && cached.placement === placement
        && cached.settings === settings
        && cached.app === app
      const item = unchanged ? cached : { id, index: i, appName: entry.appName, placement, settings, app }
      appItemCache.set(id, item)
      seen.add(id)
      out.push(item)
    }
    for (const id of [...appItemCache.keys()]) {
      if (!seen.has(id)) appItemCache.delete(id)
    }
    return out
  })

  const instanceIdFor = (entry, index) => `${entry.appName}-${index}`
  const normaliseAppId = (value) => String(value || "").toLowerCase()
  const cloneLayout = (layout) => layout ? JSON.parse(JSON.stringify(layout)) : null
  const isDraftSession = () => editSnapshot.value != null

  function captureEditSnapshot() {
    const layout = currentLayout.value
    editSnapshot.value = layout
      ? {
          layout: cloneLayout(layout),
          filename: typeof layout.filename === "string" ? layout.filename : "",
          type: typeof layout.type === "string" ? layout.type : "",
          userFileExists: layout.userFileExists === true,
        }
      : null
  }

  function getCatalogueApp(appNameOrAlias) {
    const cat = modManager.uiAppList || {}
    if (!appNameOrAlias) return null
    if (cat[appNameOrAlias]) return cat[appNameOrAlias]

    const requested = normaliseAppId(appNameOrAlias)
    for (const app of Object.values(cat)) {
      if (!app || typeof app !== "object") continue
      if (normaliseAppId(app.appName) === requested) return app
      if (normaliseAppId(app.directive) === requested) return app
      if (normaliseAppId(app.folder) === requested) return app
    }
    return null
  }

  async function loadInitialData() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      await modManager.loadUiApps()
      await refreshLayouts()
      if (!usedLayoutKey.value && currentLayout.value) {
        usedLayoutKey.value = currentLayout.value.filename || currentType.value || ""
      }
      dataAvailable.value = true
      // update states just in case
      lua.core_gamestate.requestGameState().catch(() => {})
      lua.core_camera.notifyUI().catch(() => {})
    } catch (err) {
      error.value = err
      Logger.error("[appLayoutsStore] loadInitialData failed", err)
    } finally {
      loading.value = false
    }
  }

  async function refreshLayouts() {
    if (!lua.extensions.ui_appLayouts?.getAvailableLayouts) return
    const list = await lua.extensions.ui_appLayouts.getAvailableLayouts()
    if (!Array.isArray(list)) return
    layouts.value = list
    await syncCurrentLayoutFromLua()
    syncCurrentLayoutFromList()
    syncShim()
  }

  async function syncCurrentLayoutFromLua() {
    const api = lua.extensions.ui_appLayouts
    if (!api?.getCurrentLayout) return
    const luaCurrent = await api.getCurrentLayout().catch(() => null)
    if (!luaCurrent || typeof luaCurrent !== "object") return

    const filename = typeof luaCurrent.filename === "string" ? luaCurrent.filename : ""
    const type = typeof luaCurrent.type === "string" ? luaCurrent.type : ""
    const fresh = (filename && layouts.value.find(layout => layout.filename === filename))
      || (type && layouts.value.find(layout => layout.type === type))
      || null
    if (!fresh) return
    if (currentLayout.value?.filename === fresh.filename) return

    currentLayout.value = fresh
    currentType.value = typeof fresh.type === "string" ? fresh.type : ""
    selectedAppId.value = null
    hoveredAppId.value = null
  }

  function syncCurrentLayoutFromList() {
    const cur = currentLayout.value
    if (!cur || !cur.filename) return
    const fresh = layouts.value.find(l => l.filename === cur.filename)
    if (fresh) {
      currentLayout.value = fresh
      return
    }
    // fallback in case of layout being deleted
    if (layouts.value.length > 0) {
      currentLayout.value = layouts.value[0]
      currentType.value = typeof layouts.value[0].type === "string" ? layouts.value[0].type : ""
    } else {
      currentLayout.value = null
      currentType.value = ""
    }
    selectedAppId.value = null
    hoveredAppId.value = null
  }

  async function setCurrentLayout(layoutOrFilenameOrType) {
    let target = null
    if (typeof layoutOrFilenameOrType === "string") {
      const id = layoutOrFilenameOrType
      target = layouts.value.find(l => l.filename === id)
        || layouts.value.find(l => l.type === id)
        || null
    } else if (layoutOrFilenameOrType && typeof layoutOrFilenameOrType === "object") {
      target = layoutOrFilenameOrType
    }
    if (!target) {
      Logger.warn("[appLayoutsStore] setCurrentLayout: layout not found", layoutOrFilenameOrType)
      return null
    }
    if (target.filename && currentLayout.value?.filename === target.filename) {
      return currentLayout.value
    }
    if (editing.value && dirty.value) {
      Logger.warn("[appLayoutsStore] setCurrentLayout: discarding unsaved edits")
      dirty.value = false
    }
    currentLayout.value = target
    currentType.value = typeof target.type === "string" ? target.type : ""
    selectedAppId.value = null
    hoveredAppId.value = null
    syncShim()
    await lua.extensions.ui_appLayouts.setCurrentLayout(target.filename)
    return target
  }

  function layoutStem(filename) {
    return typeof filename === "string" ? (filename.match(/([^/]+)\.uilayout\.json$/)?.[1] ?? null) : null
  }

  function defaultLayoutForType(type) {
    return layouts.value.find(l => l.type === type && layoutStem(l.filename) === type)
      || layouts.value.find(l => l.type === type && l.default)
      || layouts.value.find(l => l.type === type)
      || null
  }

  function setLayoutByType(type) {
    const chosen = defaultLayoutForType(type)
    if (chosen) return setCurrentLayout(chosen)
    return null
  }

  function resolveLayoutTarget(idOrType) {
    if (idOrType && typeof idOrType === "object") return idOrType
    if (typeof idOrType !== "string" || idOrType === "") return null
    return layouts.value.find(l => l.filename === idOrType)
      || defaultLayoutForType(idOrType)
      || null
  }

  function previewLayout(idOrType) {
    return setCurrentLayout(idOrType)
  }

  async function useLayout(idOrType) {
    const target = resolveLayoutTarget(idOrType)
    const luaId = target?.filename || (typeof idOrType === "string" ? idOrType : null)
    if (!luaId) {
      Logger.warn("[appLayoutsStore] useLayout: unresolved layout", idOrType)
      return null
    }
    await lua.extensions.ui_appLayouts.setUsedLayout(luaId)
    usedLayoutKey.value = target?.filename || luaId
    if (target) {
      currentLayout.value = target
      currentType.value = typeof target.type === "string" ? target.type : ""
      selectedAppId.value = null
      hoveredAppId.value = null
      syncShim()
    }
    return target
  }

  async function resetUsedLayout() {
    previewPeeking.value = false
    try {
      await lua.extensions.ui_appLayouts.resetUsedLayout()
    } catch (err) {
      Logger.warn("[appLayoutsStore] resetUsedLayout failed", err)
    }
    await refreshLayouts()
  }

  async function recoverToGamestateDefault() {
    let target = null
    try {
      const gs = await lua.core_gamestate.getGameState().catch(() => null)
      const candidate = gs && (gs.appLayout || gs.state)
      if (typeof candidate === "string" && candidate !== "") target = candidate
    } catch (err) {
      Logger.warn("[appLayoutsStore] recoverToGamestateDefault: getGameState failed", err)
    }
    if (!target) return null
    return useLayout(target)
  }

  function setPreviewPeeking(on) {
    previewPeeking.value = !!on
  }

  function clearCurrentLayout() {
    if (editing.value && dirty.value) {
      Logger.warn("[appLayoutsStore] clearCurrentLayout: discarding unsaved edits")
      dirty.value = false
    }
    currentLayout.value = { apps: [] }
    currentType.value = ""
    selectedAppId.value = null
    syncShim()
  }

  function applyPxFromOverlay(itemId, rectPx, frame) {
    const layout = currentLayout.value
    if (!layout || !Array.isArray(layout.apps)) return
    const item = apps.value.find(a => a.id === itemId)
    if (!item) return
    const idx = item.index
    const entry = layout.apps[idx]
    if (!entry) return
    const nextPlacement = rectPxToPlacement(rectPx, entry.placement || item.app?.css || {}, frame)
    entry.placement = nextPlacement
    dirty.value = true
    if (layout.filename && !isDraftSession()) {
      lua.extensions.ui_appLayouts.applyPlacementPatch(layout.filename, idx, nextPlacement)
    }
  }

  function selectApp(itemId) {
    selectedAppId.value = itemId
  }

  function hoverApp(itemId) {
    hoveredAppId.value = itemId == null ? null : String(itemId)
  }

  function setDimUnselectedApps(enabled) {
    dimUnselectedApps.value = !!enabled
  }

  function setOverlayEditingEnabled(enabled) {
    overlayEditingEnabled.value = !!enabled
  }

  async function addApp(appName, options = {}) {
    const layout = currentLayout.value
    if (!layout) return null
    const catEntry = getCatalogueApp(appName)
    if (!catEntry) {
      Logger.warn("[appLayoutsStore] addApp: unknown app", appName)
      return null
    }
    if (!Array.isArray(layout.apps)) layout.apps = []
    const defaultCss = catEntry.css || { left: "10px", top: "10px", width: "200px", height: "150px" }
    const placement = options.placement || initialPlacementFromCss(defaultCss)
    const entry = { appName, placement, settings: options.settings || {} }
    layout.apps.push(entry)
    selectedAppId.value = instanceIdFor(entry, layout.apps.length - 1)
    dirty.value = true
    if (layout.filename && !isDraftSession()) {
      await lua.extensions.ui_appLayouts.addApp(layout.filename, appName, placement)
    }
    return appName
  }

  async function removeApp(itemId) {
    const layout = currentLayout.value
    if (!layout || !Array.isArray(layout.apps)) return false
    const item = apps.value.find(a => a.id === itemId)
    if (!item) return false
    const idx = item.index
    layout.apps.splice(idx, 1)
    if (selectedAppId.value === itemId) selectedAppId.value = null
    dirty.value = true
    if (layout.filename && !isDraftSession()) {
      await lua.extensions.ui_appLayouts.removeApp(layout.filename, idx)
    }
    return true
  }

  async function setAppSettings(itemId, partial) {
    const layout = currentLayout.value
    if (!layout || !Array.isArray(layout.apps)) return
    const item = apps.value.find(a => a.id === itemId)
    if (!item) return
    const entry = layout.apps[item.index]
    if (!entry) return
    entry.settings = { ...(entry.settings || {}), ...partial }
    dirty.value = true
    if (layout.filename && !isDraftSession()) {
      lua.extensions.ui_appLayouts.applySettingsPatch(layout.filename, item.index, entry.settings)
    }
  }

  async function save() {
    const layout = currentLayout.value
    if (!layout) return false
    await lua.extensions.ui_appLayouts.saveLayout(JSON.parse(JSON.stringify(layout)))
    dirty.value = false
    editSnapshot.value = null
    return true
  }

  async function discard() {
    dirty.value = false
    selectedAppId.value = null
    hoveredAppId.value = null
    editSnapshot.value = null
    await refreshLayouts()
  }

  async function discardDraft() {
    const snapshot = editSnapshot.value
    if (!snapshot?.layout) {
      await discard()
      return true
    }

    try {
      currentLayout.value = cloneLayout(snapshot.layout)
      dirty.value = false
      selectedAppId.value = null
      hoveredAppId.value = null
      syncShim()

      if (snapshot.userFileExists) {
        await lua.extensions.ui_appLayouts.saveLayout(cloneLayout(snapshot.layout))
      } else {
        const resetTarget = await lua.extensions.ui_appLayouts.resetLayout(snapshot.filename, snapshot.type)
        if (!resetTarget) return false
      }

      await refreshLayouts()
      await lua.extensions.ui_appLayouts.setCurrentLayout(cloneLayout(snapshot.layout))

      editSnapshot.value = null
      return true
    } catch (err) {
      Logger.warn("[appLayoutsStore] discardDraft failed", err)
      return false
    }
  }

  async function reset() {
    await modManager.refreshUiApps()
    await refreshLayouts()
    dirty.value = false
    editSnapshot.value = null
  }

  async function createLayout(payload) {
    try {
      const filename = await lua.extensions.ui_appLayouts.createLayout(payload || {})
      await refreshLayouts()
      if (filename) await setCurrentLayout(filename)
      return filename
    } catch (err) {
      Logger.warn("[appLayoutsStore] createLayout failed", err)
      return null
    }
  }

  async function renameLayout(filename, title) {
    try {
      await lua.extensions.ui_appLayouts.renameLayout(filename, title)
      await refreshLayouts()
      return true
    } catch (err) {
      Logger.warn("[appLayoutsStore] renameLayout failed", err)
      return false
    }
  }

  async function duplicateLayout(filename, newTitle) {
    try {
      const newFilename = await lua.extensions.ui_appLayouts.duplicateLayout(filename, newTitle)
      await refreshLayouts()
      if (newFilename) await setCurrentLayout(newFilename)
      return newFilename
    } catch (err) {
      Logger.warn("[appLayoutsStore] duplicateLayout failed", err)
      return null
    }
  }

  async function deleteLayout(filename) {
    try {
      await lua.extensions.ui_appLayouts.deleteLayout(filename)
      const wasCurrent = currentLayout.value?.filename === filename
      await refreshLayouts()
      if (wasCurrent) {
        const recovered = await recoverToGamestateDefault()
        if (!recovered && layouts.value.length > 0) {
          await setCurrentLayout(layouts.value[0])
        }
      }
      return true
    } catch (err) {
      Logger.warn("[appLayoutsStore] deleteLayout failed", err)
      return false
    }
  }

  async function resetLayout(filename, layoutTypeOverride = "") {
    try {
      const layout = currentLayout.value
      const target = filename || layout?.filename || ""
      const layoutType = layoutTypeOverride || (typeof layout?.type === "string" ? layout.type : "")
      if (!target && !layoutType) return false
      const resetTarget = lua.extensions.ui_appLayouts.resetLayout
        ? await lua.extensions.ui_appLayouts.resetLayout(target, layoutType)
        : null
      const ok = resetTarget || (target && await lua.extensions.ui_appLayouts.deleteLayout(target))
      if (!ok) return false
      await refreshLayouts()
      await setCurrentLayout(typeof resetTarget === "string" ? resetTarget : target)
        || (layoutType && await setLayoutByType(layoutType))
        || await recoverToGamestateDefault()
      selectedAppId.value = null
      dirty.value = false
      editSnapshot.value = null
      return true
    } catch (err) {
      Logger.warn("[appLayoutsStore] resetLayout failed", err)
      return false
    }
  }

  async function setEditing(enabled, options = {}) {
    const next = !!enabled
    if (editing.value === next) return
    editing.value = next
    await lua.extensions.ui_appLayouts.setEditing(next)
    if (next && !editSnapshot.value) {
      captureEditSnapshot()
    }
    if (!next) {
      setOverlayEditingEnabled(true)
      setDimUnselectedApps(false)
      if (!dirty.value && options.preserveSnapshot !== true) editSnapshot.value = null
    }
  }

  function setVisible(enabled) {
    visibility.value = !!enabled
  }

  function setCameraMode(modeName) {
    cameraMode.value = String(modeName || "")
  }

  // shim for legacy angular consumers
  function syncShim() {
    const shim = window.UIAppStorage
    if (!shim) return
    shim.availableLayouts = layouts.value
    const cat = modManager.uiAppList || {}
    shim.availableApps = { ...cat }
    shim.current = currentLayout.value || { apps: [] }
    shim.dataAvailable = dataAvailable.value
    shim.layoutDirty = dirty.value
  }

  watch([layouts, currentLayout, dirty], () => syncShim(), { deep: false })
  watch(() => modManager.uiAppList, () => syncShim(), { deep: false })

  events.on("UiAppLayoutsChanged", () => {
    refreshLayouts().catch(err => console.warn("[appLayoutsStore] refreshLayouts failed", err))
  })

  // legacy "add to layout" entry point used by the lua app selector
  events.on("appContainer:spawn", payload => {
    if (!payload || typeof payload !== "object" || !payload.appName) return
    addApp(payload.appName).catch(err => {
      console.warn("[appLayoutsStore] appContainer:spawn -> addApp failed", err)
    })
  })

  // legacy layout-switch hooks
  events.on("appContainer:loadLayoutByType", payload => {
    if (editing.value) return
    const type = typeof payload === "string" ? payload : payload?.type
    if (typeof type !== "string" || type === "") return
    useLayout(type)
  })
  events.on("appContainer:loadLayoutByObject", payload => {
    if (editing.value) return
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.apps)) return
    // unnamed layouts cannot become the used layout
    setCurrentLayout(payload)
  })
  events.on("appContainer:loadLayoutByReqData", payload => {
    if (editing.value) return
    if (!payload || typeof payload !== "object") return
    if (typeof payload.filename === "string" && payload.filename !== "") {
      useLayout(payload.filename)
    } else if (typeof payload.type === "string" && payload.type !== "") {
      useLayout(payload.type)
    } else if (payload.object && typeof payload.object === "object" && Array.isArray(payload.object.apps)) {
      setCurrentLayout(payload.object)
    }
  })
  events.on("appContainer:clear", () => {
    if (editing.value) return
    clearCurrentLayout()
  })

  // gamestate-driven layout switches
  events.on("GameStateUpdate", payload => {
    if (!payload) return
    if (editing.value) return
    const target = payload.appLayout
    if (typeof target === "string") {
      useLayout(target)
    } else if (target && typeof target === "object" && Array.isArray(target.apps)) {
      setCurrentLayout(target)
    } else if (typeof payload.state === "string") {
      useLayout(payload.state)
    }
  })

  events.on("ShowApps", shown => showApps.value = !!shown)
  events.on("onCameraNameChanged", data => setCameraMode(data?.name))

  events.on("UiAppsRouteUpdate", payload => {
    if (!payload || typeof payload !== "object") return
    if (typeof payload.shown === "boolean") {
      visibility.value = payload.shown
    }
    if (!editing.value && typeof payload.layout === "string" && payload.layout !== "") {
      useLayout(payload.layout)
    }
  })

  return {
    // lua state
    layouts,
    currentLayout,
    currentType,
    usedLayoutKey,
    apps,
    uiAppList,
    dataAvailable,

    // ui state
    editing,
    dirty,
    selectedAppId,
    overlayEditingEnabled,
    hoveredAppId,
    dimUnselectedApps,
    previewPeeking,
    visible,
    cameraMode,
    loading,
    error,

    loadInitialData,
    refreshLayouts,
    setCurrentLayout,
    setLayoutByType,
    previewLayout,
    useLayout,
    resetUsedLayout,
    recoverToGamestateDefault,
    setPreviewPeeking,
    clearCurrentLayout,
    applyPxFromOverlay,
    selectApp,
    hoverApp,
    setOverlayEditingEnabled,
    setDimUnselectedApps,
    addApp,
    removeApp,
    setAppSettings,
    save,
    discard,
    discardDraft,
    reset,
    createLayout,
    renameLayout,
    duplicateLayout,
    deleteLayout,
    resetLayout,
    setEditing,
    setVisible,
    setCameraMode,
  }
})

export { rectPxToPlacement, placementToRectPx }
