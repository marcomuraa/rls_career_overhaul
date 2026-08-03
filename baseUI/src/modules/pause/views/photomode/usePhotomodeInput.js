import { ref, watch, computed, onUnmounted, nextTick, unref } from "vue"
import { useRoute } from "vue-router"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { getUINavServiceInstance } from "@/services/uiNav"
import { useScopedNav } from "@/services/scopedNav/api"
import { SCROLL_EVENT_H, SCROLL_EVENT_V } from "@/services/crossfire"

// Hidden surface keeps only route/UI shell actions; camera-owned movement stays released to gameplay.
export const PHOTOMODE_HIDDEN_UI_NAV = Object.freeze(["back", "menu", "context", "action_2", "action_3", "action_4"])
export const PHOTOMODE_HIDDEN_SCOPE_ID = "photomode-hidden"
export const PHOTOMODE_PANEL_SCOPE_ID = "photomode-panel"
export const PHOTOMODE_GALLERY_SCOPE_ID = "photomode-gallery"
const PHOTOMODE_PANEL_UI_NAV = Object.freeze([
  "ok",
  "back",
  "menu",
  "context",
  "tab_l",
  "tab_r",
  "focus_u",
  "focus_d",
  "focus_l",
  "focus_r",
  "focus_lr",
  "focus_ud",
  "action_2",
  "action_3",
  SCROLL_EVENT_H,
  SCROLL_EVENT_V,
])
export const PHOTOMODE_SURFACE_MODES = Object.freeze({
  hidden: "hidden",
  settings: "settings",
  gallery: "gallery",
  preview: "preview",
})
// Future tool surfaces are named here only to keep extension points explicit.
// They are not active runtime modes until dedicated replay/path/video packets define ownership.
export const PHOTOMODE_RESERVED_SURFACE_MODES = Object.freeze({
  replay: "replay",
  cameraPath: "cameraPath",
  videoExport: "videoExport",
})

export function usePhotomodeInput(options = {}) {
  const route = useRoute()
  const surfaceMode = ref(PHOTOMODE_SURFACE_MODES.hidden)
  const blocker = useUINavBlocker()
  const uiNavService = getUINavServiceInstance()
  const scopedNav = useScopedNav()
  let scopeActivationRequestId = 0

  const isHiddenSurface = computed(() => surfaceMode.value === PHOTOMODE_SURFACE_MODES.hidden)
  const isSettingsSurface = computed(() => surfaceMode.value === PHOTOMODE_SURFACE_MODES.settings)
  const isGallerySurface = computed(() => surfaceMode.value === PHOTOMODE_SURFACE_MODES.gallery)
  const isPreviewSurface = computed(() => surfaceMode.value === PHOTOMODE_SURFACE_MODES.preview)
  const isGameplayOwnedSurface = computed(() => isHiddenSurface.value)
  const panelOpen = computed(() => isSettingsSurface.value || isGallerySurface.value || isPreviewSurface.value)
  const panelActivationScopeId = computed(() =>
    resolveScopeId(options.panelActivationScopeId)
    || (isGallerySurface.value ? PHOTOMODE_GALLERY_SCOPE_ID : PHOTOMODE_PANEL_SCOPE_ID)
  )
  const panelScopeOpen = computed(() => isSettingsSurface.value || isPreviewSurface.value)
  const hiddenActivationScopeId = computed(() => resolveScopeId(options.hiddenActivationScopeId) || PHOTOMODE_HIDDEN_SCOPE_ID)

  const hiddenScopeBinding = computed(() => ({
    scopeId: PHOTOMODE_HIDDEN_SCOPE_ID,
    type: "nonav",
    activated: isHiddenSurface.value,
    activateOnMount: true,
    canDeactivate: () => false,
    bubbleWhitelistEvents: ["menu"],
  }))

  const panelScopeBinding = computed(() => ({
    scopeId: PHOTOMODE_PANEL_SCOPE_ID,
    type: "container",
    activated: panelScopeOpen.value,
    canDeactivate: () => false,
    preferAutoFocus: true,
    bubbleWhitelistEvents: ["menu", "action_2", "action_3"],
    open: panelScopeOpen.value,
  }))

  function applyHiddenNavBlocks() {
    blocker.allowOnly([...PHOTOMODE_HIDDEN_UI_NAV])
    blocker.ensureNoBlock([...PHOTOMODE_HIDDEN_UI_NAV])
    // `allowOnly` blocks DOM/UI handlers, but hidden mode must also release menu movement actions back to gameplay camera.
    uiNavService.setFilteredEventsAllExcept(...PHOTOMODE_HIDDEN_UI_NAV)
  }

  function applyPanelNavBlocks() {
    blocker.allowOnly(PHOTOMODE_PANEL_UI_NAV)
    blocker.ensureNoBlock(["action_2", "action_3", SCROLL_EVENT_H, SCROLL_EVENT_V])
    uiNavService.clearFilteredEvents()
  }

  function resolveScopeId(scopeIdLike) {
    const scopeId = unref(scopeIdLike)
    return typeof scopeId === "string" && scopeId.length > 0 ? scopeId : null
  }

  function scheduleScopeActivation(scopeIdLike, isStillValid, reason) {
    const requestId = ++scopeActivationRequestId
    void nextTick(() => {
      if (requestId !== scopeActivationRequestId || !isStillValid()) {
        return
      }
      const scopeId = resolveScopeId(scopeIdLike)
      if (!scopeId) {
        return
      }
      void Promise.resolve(scopedNav.activateScope(scopeId, { force: true, reason }))
    })
  }

  function setSurfaceMode(nextMode, reason = "unknown") {
    if (!Object.values(PHOTOMODE_SURFACE_MODES).includes(nextMode)) return false
    if (surfaceMode.value === nextMode) {
      return true
    }
    surfaceMode.value = nextMode
    return true
  }

  watch(surfaceMode, mode => {
    if (mode === PHOTOMODE_SURFACE_MODES.hidden) {
      applyHiddenNavBlocks()
      clearPanelFocus()
      void nextTick(clearPanelFocus)
      activateHiddenScope("photomode-hidden-open")
      return
    }
    applyPanelNavBlocks()
    scheduleScopeActivation(panelActivationScopeId, () => surfaceMode.value === mode, `photomode-${mode}-open`)
  }, { immediate: true })

  watch(panelActivationScopeId, scopeId => {
    if (!panelOpen.value) return

    scheduleScopeActivation(
      scopeId,
      () => panelOpen.value && panelActivationScopeId.value === scopeId,
      "photomode-panel-target-change"
    )
  })

  // When the hidden surface's focus target flips (e.g. capture capability resolves after mount), re-focus it.
  watch(hiddenActivationScopeId, scopeId => {
    if (!isHiddenSurface.value) return

    scheduleScopeActivation(
      scopeId,
      () => surfaceMode.value === PHOTOMODE_SURFACE_MODES.hidden && hiddenActivationScopeId.value === scopeId,
      "photomode-hidden-target-change"
    )
  })

  watch(() => route.fullPath, () => {
    scopeActivationRequestId++
    setSurfaceMode(PHOTOMODE_SURFACE_MODES.hidden, "route-reset")
    applyHiddenNavBlocks()
    scheduleScopeActivation(hiddenActivationScopeId, () => surfaceMode.value === PHOTOMODE_SURFACE_MODES.hidden, "photomode-route-reset")
  })

  onUnmounted(() => {
    scopeActivationRequestId++
    blocker.ensureNoBlock([])
    uiNavService.clearFilteredEvents()
  })

  function openSettings(reason = "context") {
    setSurfaceMode(PHOTOMODE_SURFACE_MODES.settings, reason)
  }

  function closeSettings(reason = "back") {
    setSurfaceMode(PHOTOMODE_SURFACE_MODES.hidden, reason)
  }

  function openGallery(reason = "gallery") {
    setSurfaceMode(PHOTOMODE_SURFACE_MODES.gallery, reason)
  }

  function closeGallery(reason = "gallery-close", returnMode = PHOTOMODE_SURFACE_MODES.settings) {
    const nextMode = Object.values(PHOTOMODE_SURFACE_MODES).includes(returnMode)
      ? returnMode
      : PHOTOMODE_SURFACE_MODES.settings
    setSurfaceMode(nextMode, reason)
  }

  function openPreview(reason = "preview") {
    setSurfaceMode(PHOTOMODE_SURFACE_MODES.preview, reason)
  }

  function closePreview(reason = "preview-close", returnMode = PHOTOMODE_SURFACE_MODES.settings) {
    const nextMode = Object.values(PHOTOMODE_SURFACE_MODES).includes(returnMode)
      ? returnMode
      : PHOTOMODE_SURFACE_MODES.settings
    setSurfaceMode(nextMode, reason)
  }

  function openPanel(reason = "context") {
    openSettings(reason)
  }

  function closePanel(reason = "back") {
    closeSettings(reason)
  }

  function openPanelFromNav() {
    openSettings("context")
    return false
  }

  function closePanelFromNav() {
    closeSettings("back")
    return false
  }

  function activateHiddenScope(reason = "photomode-hidden-activate") {
    scheduleScopeActivation(
      hiddenActivationScopeId,
      () => surfaceMode.value === PHOTOMODE_SURFACE_MODES.hidden,
      reason
    )
  }

  function clearPanelFocus() {
    if (typeof document === "undefined") return
    const activeElement = document.activeElement
    if (!activeElement || activeElement === document.body || typeof activeElement.blur !== "function") {
      return
    }

    const activePanel = activeElement.closest?.(`[bng-scoped-nav="${PHOTOMODE_PANEL_SCOPE_ID}"]`)
    if (activePanel) {
      activeElement.blur()
    }
  }

  return {
    surfaceMode,
    isHiddenSurface,
    isSettingsSurface,
    isGallerySurface,
    isPreviewSurface,
    isGameplayOwnedSurface,
    panelOpen,
    hiddenScopeBinding,
    panelScopeBinding,
    openSettings,
    closeSettings,
    openGallery,
    closeGallery,
    openPreview,
    closePreview,
    openPanel,
    closePanel,
    openPanelFromNav,
    closePanelFromNav,
    activateHiddenScope,
  }
}
