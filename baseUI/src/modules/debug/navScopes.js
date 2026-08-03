import { computed, onMounted, onUnmounted, ref } from "vue"
import { useEvents } from "@/services/events"
import { getScopeCoordinatorInstance } from "@/services/scopedNav"
import { getUINavServiceInstance } from "@/services/uiNav"
import { SCOPED_NAV_PROPERTY_NAME } from "@/services/scopedNav/constants"

const sortLocale = (a, b) => String(a || "").localeCompare(String(b || ""))

function mapScopeNode(node, coordinator) {
  const coordinatorScope = coordinator.getScopeById(node.scopeId)
  const scopeElement = coordinatorScope?.element
  const config = scopeElement?.[SCOPED_NAV_PROPERTY_NAME] || {}
  const state = coordinatorScope?.state || node.state || "inactive"
  const bubbleWhitelistEvents = Array.isArray(config.bubbleWhitelistEvents)
    ? config.bubbleWhitelistEvents
    : []

  const mappedChildren = (node.children || [])
    .map(child => mapScopeNode(child, coordinator))
    .sort((a, b) => sortLocale(a.id, b.id))

  return {
    id: node.scopeId,
    label: node.scopeId,
    type: coordinatorScope?.config?.type || node.type || "normal",
    state,
    trapPolicy: coordinatorScope?.config?.trapPolicy || node.trapPolicy || null,
    handledEvents: [...(node.handledEvents || [])].sort(sortLocale),
    bubbleWhitelistEvents: [...bubbleWhitelistEvents].sort(sortLocale),
    hasCanBubbleEvent: typeof config.canBubbleEvent === "function",
    passthroughEvents: Array.isArray(config.passthroughEvents) ? [...config.passthroughEvents].sort(sortLocale) : [],
    element: scopeElement || null,
    children: mappedChildren,
  }
}

export function useNavScopes() {
  const coordinator = getScopeCoordinatorInstance()
  const uiNavService = getUINavServiceInstance()
  const events = useEvents()
  const refreshTick = ref(0)
  let touchRaf = 0

  const isNavigatorFocusTarget = element => {
    if (!element || typeof element.closest !== "function") return false
    return !!element.closest("#route-navigator")
  }

  const shouldIgnoreFocusEvent = event => {
    if (!event || (event.type !== "focusin" && event.type !== "focusout")) return false
    if (isNavigatorFocusTarget(event.target)) return true
    if (isNavigatorFocusTarget(event.relatedTarget)) return true
    return false
  }

  const touch = event => {
    if (shouldIgnoreFocusEvent(event)) return
    if (touchRaf) return
    touchRaf = requestAnimationFrame(() => {
      touchRaf = 0
      refreshTick.value += 1
    })
  }

  const scopeStack = computed(() => {
    refreshTick.value
    return coordinator.scopeStack.value || []
  })

  const popupScopeStack = computed(() => {
    refreshTick.value
    return coordinator.popupScopeStack.value || []
  })

  const activeScopeId = computed(() => {
    refreshTick.value
    return uiNavService.activeScope || coordinator.getCurrentScope()?.id || null
  })

  const scopeTree = computed(() => {
    refreshTick.value
    const roots = uiNavService.getScopeTree()
      .map(node => mapScopeNode(node, coordinator))
      .sort((a, b) => sortLocale(a.id, b.id))
    return roots
  })

  const scopeTreeFlat = computed(() => {
    refreshTick.value
    const result = []
    const walk = (node, depth = 0) => {
      result.push({ ...node, depth })
      for (const child of node.children || []) {
        walk(child, depth + 1)
      }
    }
    for (const root of scopeTree.value) {
      walk(root, 0)
    }
    return result
  })

  const hasActivePopupScope = computed(() => popupScopeStack.value.length > 0)

  onMounted(() => {
    document.addEventListener("focusin", touch, true)
    document.addEventListener("focusout", touch, true)
  })

  onUnmounted(() => {
    document.removeEventListener("focusin", touch, true)
    document.removeEventListener("focusout", touch, true)
    if (touchRaf) cancelAnimationFrame(touchRaf)
  })

  events.on("uiNav_scopeChanged", touch)

  return {
    refreshTick,
    activeScopeId,
    scopeStack,
    popupScopeStack,
    hasActivePopupScope,
    scopeTree,
    scopeTreeFlat,
    refresh: touch,
  }
}
