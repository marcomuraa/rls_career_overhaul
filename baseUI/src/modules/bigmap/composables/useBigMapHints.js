import { computed, ref, watch, onUnmounted } from "vue"
import { $translate } from "@/services/translation"
import { useScopedNavObserver } from "@/services/scopedNav/api"
import { SCOPED_NAV_OBSERVER_EVENTS } from "@/services/scopedNav/constants"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useInfoBar } from "@/services/infoBar"
import { useEvents } from "@/services/events"

// Shared between the scope declarations in BigMap.vue and the per-scope hint/allow-list policy below
export const BIGMAP_SCOPE_ID = "bigmap-main"
export const BIGMAP_DETAILS_SCOPE_ID = "bigmap-details"
export const BIGMAP_SCOPE_CAMERA_ID = "bigmap-camera"
export const BIGMAP_LAYOUT_SCOPE_ID = "bigmap-layout"

// Manual hints shown only while exploring the map (camera scope)
const MAP_SELECT_HINT_ID = "bigmap-map-select"
const MAP_CLICK_HINT_ID = "bigmap-map-click"
const PAN_HINT_ID = "bigmap-pan"
const ZOOM_HINT_ID = "bigmap-zoom"
const CAMERA_HINT_IDS = [MAP_SELECT_HINT_ID, MAP_CLICK_HINT_ID, PAN_HINT_ID, ZOOM_HINT_ID]

// Per-scope UINav event allow-lists, to prevent generic hints leaking across the bigmap
const NAV_EVENTS = ["focus_u", "focus_d", "focus_l", "focus_r", "focus_ud", "focus_lr"]

// Forces the left-mouse-button icon for the map-exploration hint
const MOUSE_LMB_VIEWER_OBJ = Object.freeze({ special: true, ownIcon: "mouseLMB" })

// Auto-generated InfoBar hint id for the tracked "ok" event (see infoBar.js's AUTOIDS.binding).
// The details card's primary action is already visible/clickable, so its hint is redundant.
const DETAILS_OK_HINT_ID = "__auto_binding_ok"

/**
 * Owns the bigmap InfoBar hints: per-scope UINav allow-lists (so only relevant
 * hints surface for the active scope) and the manual map-exploration hints
 * (select/click, pan, zoom). Returns the scope-specific labels bound by the
 * template's v-bng-ui-nav-label directives.
 *
 * @param {object} opts
 * @param {Ref<boolean>} opts.isTaxiMode Whether the bigmap is in taxi mode
 * @param {Ref<boolean>} opts.taxiDestinationPreviewed Whether a taxi destination is previewed
 * @param {Ref<object>} opts.selectedPoi Currently selected POI
 * @param {Ref<boolean>} opts.isControllerUsed Whether a controller is used
 */
export default function useBigMapHints({ isTaxiMode, taxiDestinationPreviewed, selectedPoi, isControllerUsed }) {
  const blocker = useUINavBlocker()
  const infoBar = useInfoBar()
  const events = useEvents()

  // Details widget labels. Shared with the details action handlers via findPoiAction.
  function findPoiAction(id) {
    return selectedPoi.value?.actions?.find(action => action.id === id) || null
  }

  const detailsPrimaryLabel = computed(() =>
    (isTaxiMode.value && taxiDestinationPreviewed.value)
      ? $translate.instant("ui.taxi.bigmap.confirmDestination")
      : $translate.instant("bigMap.action.setRoute"))

  const detailsSecondaryLabel = computed(() => {
    if (isTaxiMode.value)
      return taxiDestinationPreviewed.value ? $translate.instant("ui.taxi.bigmap.confirmDestination") : null
    return findPoiAction("quickTravel") ? $translate.instant("bigMap.action.quickTravel") : null
  })

  const hoveredPoiId = ref(null)
  events.on("BigmapHoveredPoiChanged", (id) => {
    hoveredPoiId.value = id ?? null
  })

  const mapSelectLabel = computed(() => $translate.instant(hoveredPoiId.value ? "bigMap.poiList.selectPoi" : "bigMap.action.setRoute"))

  function makeMapSelectHint() {
    return {
      id: MAP_SELECT_HINT_ID,
      content: { type: "binding", props: { action: "bigMapControllerSelect" }, label: mapSelectLabel.value },
    }
  }

  function makeMapClickHint() {
    return {
      id: MAP_CLICK_HINT_ID,
      content: { type: "binding", props: { viewerObj: MOUSE_LMB_VIEWER_OBJ }, label: mapSelectLabel.value },
    }
  }

  function makePanHint() {
    return ({
      id: PAN_HINT_ID,
      content: {
        type: "binding",
        props: { action: "bigMapMoveForwardBackward", controller: true },
        label: $translate.instant("bigMap.infobar.panMap")
      },
    })
  }

  function makeZoomHint() {
    return ({
      id: ZOOM_HINT_ID,
      content: [
        { type: "binding", props: { action: "bigMapZoomOut", controller: true } },
        { type: "binding", props: { action: "bigMapZoomIn", controller: true } },
        $translate.instant("bigMap.infobar.zoom"),
      ],
    })
  }

  let cameraHintsShown = false

  /**
   * @param {boolean} show Whether to show the camera hints
   */
  function updateCameraHints(show) {
    infoBar.removeHints(...CAMERA_HINT_IDS)
    cameraHintsShown = !!show
    if (!cameraHintsShown) return
    if (isControllerUsed.value) {
      infoBar.addHints(makeMapSelectHint())
      infoBar.addHints(makePanHint())
      infoBar.addHints(makeZoomHint())
    } else {
      infoBar.addHints(makeMapClickHint())
    }
  }

  /**
   * Returns the allow-list for the scope or null if the scope is not found
   * @param {BIGMAP_SCOPE_CAMERA_ID|BIGMAP_LAYOUT_SCOPE_ID|BIGMAP_SCOPE_ID|BIGMAP_DETAILS_SCOPE_ID} scopeId The scope ID
   * @returns {string[]|null} The allow-list for the scope or null
   */
  function scopeAllowList(scopeId) {
    const isTaxi = isTaxiMode.value

    // action_2 (confirm taxi destination) is only shown for a controller
    const taxiConfirm = isTaxi && isControllerUsed.value ? ["action_2"] : []

    if (scopeId === BIGMAP_SCOPE_CAMERA_ID || scopeId === BIGMAP_LAYOUT_SCOPE_ID) {
      return ["back", "menu", ...NAV_EVENTS, "tab_l", "tab_r", "action_3", ...taxiConfirm]
    }

    if (scopeId === BIGMAP_SCOPE_ID) {
      return ["back", "menu", "ok", ...NAV_EVENTS, "tab_l", "tab_r", "action_3", ...taxiConfirm]
    }

    if (scopeId === BIGMAP_DETAILS_SCOPE_ID) {
      // Cycle POI (tab_l/tab_r) and quick travel (action_2) are controller-only bindings from PoiDetails.vue
      return ["back", "menu", "ok", ...(isControllerUsed.value ? ["tab_l", "tab_r", "action_2"] : [])]
    }

    return null
  }

  let currentScopeId = null
  let isDetailsScopeActive = false

  function isExplorationScope(scopeId) {
    return scopeId === BIGMAP_SCOPE_CAMERA_ID || scopeId === BIGMAP_LAYOUT_SCOPE_ID
  }

  // POI details card doesn't need the "ok" hint
  function suppressDetailsOkHint() {
    if (isDetailsScopeActive) infoBar.removeHints(DETAILS_OK_HINT_ID)
  }

  // Release BigMap's UINav allow-list and hints so other scopes (e.g. a tutorial
  // popup that owns navigation) aren't left blocked by BigMap's policy.
  function releaseBigMapPolicy() {
    currentScopeId = null
    isDetailsScopeActive = false
    blocker.clear()
    updateCameraHints(false)
  }

  function applyScopePolicy(scopeId) {
    const allow = scopeAllowList(scopeId)
    if (!allow) {
      // A non-BigMap scope (e.g. tutorialPopupDialog__*) is now active; stop
      // enforcing BigMap's allow-list so it can drive its own navigation.
      releaseBigMapPolicy()
      return
    }
    currentScopeId = scopeId
    isDetailsScopeActive = scopeId === BIGMAP_DETAILS_SCOPE_ID
    blocker.allowOnly(allow)
    updateCameraHints(isExplorationScope(scopeId))
    suppressDetailsOkHint()
  }

  useScopedNavObserver((eventName, payload) => {
    if (
      eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeActivated ||
      eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeResumed
    ) {
      applyScopePolicy(payload?.scope?.id)
    }
  })

  watch([hoveredPoiId, isTaxiMode], () => {
    if (!cameraHintsShown) return
    if (isControllerUsed.value) infoBar.updateHint(MAP_SELECT_HINT_ID, makeMapSelectHint())
    else infoBar.updateHint(MAP_CLICK_HINT_ID, makeMapClickHint())
  })

  // Re-apply the active scope's event allow-list + hints when switching between controller and KBM
  watch(isControllerUsed, () => {
    if (currentScopeId) applyScopePolicy(currentScopeId)
  })

  // supress the "ok" hint whenever it regenerates
  watch(
    () => infoBar.hintsList.map(hint => hint?.id).join("|"),
    suppressDetailsOkHint,
    { flush: "post" }
  )

  onUnmounted(() => {
    infoBar.removeHints(...CAMERA_HINT_IDS)
  })

  const switchViewLabel = computed(() => $translate.instant("bigMap.infobar.switchView"))
  const switchTypeLabel = computed(() => $translate.instant("bigMap.infobar.switchType"))
  const cyclePoiLabel = computed(() => $translate.instant("bigMap.infobar.cyclePoi"))

  return {
    switchViewLabel,
    switchTypeLabel,
    cyclePoiLabel,
    detailsPrimaryLabel,
    detailsSecondaryLabel,
    findPoiAction,
  }
}
