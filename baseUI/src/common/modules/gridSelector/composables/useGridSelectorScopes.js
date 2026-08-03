import { computed, ref, watch } from "vue"
import logger from "@/services/logger"
import { DETAILS_SCOPE_ID, GRID_SCOPE_ID } from "./gridSelectorHelpers"

function readMaybeRef(value, fallback) {
  if (value && typeof value === "object" && "value" in value) {
    return value.value
  }
  return value ?? fallback
}

export default function useGridSelectorScopes({
  detailsMode,
  screenHeaderPath,
  hiddenTabs,
  bubbleEvents,
  setDetailsMode,
  activateScope,
}) {
  const activeSectionScope = ref("grid")
  const canUseTopbar = ref(true)
  const canSeeDetails = ref(true)

  const switchSeq = computed(() => {
    const allTabs = ["detail", "advanced", "displayControls"]
    const hidden = readMaybeRef(hiddenTabs, [])
    return allTabs.filter(tab => !hidden.includes(tab))
  })

  const canSwitchDetails = computed(() => activeSectionScope.value !== "default" || detailsMode.value === "advanced")

  watch(activeSectionScope, scopeName => {
    const isDetailsActive = scopeName === "details"
    canUseTopbar.value = !isDetailsActive
  })

  function getNextSwitchSeq(mode) {
    let targetMode = mode || detailsMode.value
    if (targetMode === "filter") targetMode = "advanced"
    const sequence = switchSeq.value
    if (sequence.length === 0) return "detail"
    const currentIndex = sequence.indexOf(targetMode)
    if (currentIndex === -1) return sequence[0]
    return sequence[(currentIndex + 1) % sequence.length]
  }

  function switchScope(name) {
    const targetScope = name || (activeSectionScope.value === "grid" ? "details" : "grid")
    activeSectionScope.value = targetScope

    if (targetScope === "details") {
      activateScope(DETAILS_SCOPE_ID)
      return
    }
    activateScope(GRID_SCOPE_ID)
  }

  function switchDetailsMode(mode) {
    logger.debug("GridSelector.switchDetailsMode", mode)
    let resolvedMode = mode
    if (typeof resolvedMode !== "string") {
      resolvedMode = getNextSwitchSeq(resolvedMode)
    }
    if (resolvedMode === "detail" && !canSeeDetails.value) {
      resolvedMode = getNextSwitchSeq(resolvedMode)
    }
    logger.debug("GridSelector.switchDetailsModeResolved", resolvedMode)
    setDetailsMode(resolvedMode)
    switchScope("details")
  }

  function toggleDetailsMode(mode) {
    setDetailsMode(mode)
  }

  function onToggleSectionScope() {
    switchScope()
  }

  function onGridActivate() {
    activeSectionScope.value = "grid"
  }

  function onDetailsActivate() {
    activeSectionScope.value = "details"
  }

  function setDetailsScope() {
    switchScope("details")
  }

  function canBubbleGridEvent(event) {
    const eventName = event?.detail?.name
    if (eventName === "rotate_v_cam" || eventName === "menu") return true
    if (canUseTopbar.value && (eventName === "tab_l" || eventName === "tab_r")) return true
    if (readMaybeRef(bubbleEvents, []).includes(eventName)) return true
    return false
  }

  function canBubbleDetailsEvent(event) {
    const eventName = event?.detail?.name
    if (eventName === "rotate_v_cam" || eventName === "menu") return true
    if (readMaybeRef(bubbleEvents, []).includes(eventName)) return true
    return false
  }

  function canDeactivateGrid() {
    return screenHeaderPath.value.length <= 1
  }

  function onBackFromDetails() {
    if (detailsMode.value === "displayControls" || detailsMode.value === "filter") {
      toggleDetailsMode("advanced")
      return false
    }
    switchScope("grid")
    return false
  }

  return {
    activeSectionScope,
    canSwitchDetails,
    switchDetailsMode,
    toggleDetailsMode,
    switchScope,
    onToggleSectionScope,
    onGridActivate,
    onDetailsActivate,
    setDetailsScope,
    canBubbleGridEvent,
    canBubbleDetailsEvent,
    canDeactivateGrid,
    onBackFromDetails,
  }
}
