import { getUINavScopeRegistry } from "@/services/uiNav"
import { UINAVHANDLER_HOOK_RESULT } from "@/services/uiNav/constants"
import { SCOPED_NAV_ATTR, SCOPED_NAV_PROPERTY_NAME, SCOPED_NAV_STATES } from "./constants"
import { MONITORED_UI_NAV_EVENTS, setRepeatRestrictToResolver } from "@/services/crossfire.js"
import { SCOPE_TRAP_POLICIES, SCOPE_TYPES } from "./types"
import { UI_EVENT_GROUPS } from "@/services/uiNav/constants"
import { scopedNavLogger } from "./logger"

// TODO: Confirm the purpose of this change
function canBubbleFromScopedNav(scopedNavProps, event) {
  const eventName = event?.detail?.name
  const bubbleWhitelistEvents = scopedNavProps?.bubbleWhitelistEvents
  if (Array.isArray(bubbleWhitelistEvents) && bubbleWhitelistEvents.includes(eventName)) {
    return true
  }

  const bubbleGuard = scopedNavProps?.canBubbleEvent || scopedNavProps?.shouldBubbleEvent
  return typeof bubbleGuard === "function" && !!bubbleGuard(event)
}

const SCOPED_NAV_STATE_ATTR = "data-bng-scoped-nav-state"

function isActiveScopedNav(scopeElement) {
  return scopeElement.getAttribute(SCOPED_NAV_STATE_ATTR) === SCOPED_NAV_STATES.active
}

function isRepeatBoundaryCandidate(scopeElement, activeElement) {
  const scopedNavData = scopeElement[SCOPED_NAV_PROPERTY_NAME]

  if (!scopedNavData || scopedNavData.disabled || scopedNavData.type !== SCOPE_TYPES.NORMAL) {
    return false
  }

  // An inactive normal scope root is just a focusable item; defer to its
  // parent scope so repeat can keep moving across sibling scopes.
  if (scopeElement === activeElement && !isActiveScopedNav(scopeElement)) {
    return false
  }

  return true
}

function resolveScopedNavRepeatRestrictTo({ activeElement, fallbackRestrictTo }) {
  let scopeElement = activeElement?.closest?.(`[${SCOPED_NAV_ATTR}]`)

  while (scopeElement) {
    if (isRepeatBoundaryCandidate(scopeElement, activeElement)) {
      return scopeElement
    }

    scopeElement = scopeElement.parentElement?.closest?.(`[${SCOPED_NAV_ATTR}]`)
  }

  return fallbackRestrictTo
}

export function initializeScopedNavHooks() {
  const scopeRegistry = getUINavScopeRegistry()

  setRepeatRestrictToResolver(resolveScopedNavRepeatRestrictTo)

  scopeRegistry.registerScopeHook(
    "beforeExecute",
    (scopeElement, event, previousResult) => {
      const context = previousResult.context
      // we whitelist the focus navigation events to allow navigation within the active scope regardless if the controller is connected or not
      const whitelistedEvents = [...UI_EVENT_GROUPS.navigation]
      if (context.lastDevice === null && context.trapPolicy === SCOPE_TRAP_POLICIES.CONTROLLER_ONLY && !whitelistedEvents.includes(event.detail.name)) {
        scopedNavLogger.debug("Integration", `[beforeExecute] trapPolicy: CONTROLLER_ONLY - stopping event: ${event.detail.name}`, { scopeElement, event, previousResult })
        return { ...UINAVHANDLER_HOOK_RESULT.STOP, context }
      }

      scopedNavLogger.debug("Integration", `[beforeExecute] trapPolicy: CONTROLLER_ONLY - continuing event: ${event.detail.name}`, { scopeElement, event, previousResult })
      return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
    },
    10
  )

  scopeRegistry.registerScopeHook(
    "beforeExecute",
    (scopeElement, event, previousResult) => {
      const scopedNavData = scopeElement[SCOPED_NAV_PROPERTY_NAME]
      const context = previousResult.context
      const isActiveScope = context.activeScope === context.scopeId
      const isEventTargetScope = event.detail.targetScope === context.scopeId

      // only ignore events if the target scope is the active scope or the event is from an inner scoped nav that has been bubbled up
      if ((isActiveScope || !isEventTargetScope) && scopedNavData && scopedNavData.canIgnoreEvent?.(event)) {
        scopedNavLogger.debug("Integration", `Stopping and blocking event: ${event.detail.name}`, { scopeElement, event, previousResult })
        return UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK
      }
      return UINAVHANDLER_HOOK_RESULT.CONTINUE
    },
    11
  )

  scopeRegistry.registerHandlerHook(
    "beforeExecute",
    (scopeElement, event, handlerDescriptor, previousResult) => {
      const context = previousResult.context
      if (context.scopeId === context.activeScope) {
        return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
      }

      if (context.scopeId === context.targetScope && (!context.activeScope || context.activeScope !== context.scopeId)) {
        // check if crossfire monitored event, passthrough is allowed, or the handler's element is the scope element
        const isPassthroughEvent =
          scopeElement[SCOPED_NAV_PROPERTY_NAME]?.passthroughEnabled && scopeElement[SCOPED_NAV_PROPERTY_NAME]?.passthroughEvents.includes(event.detail.name)
        if (MONITORED_UI_NAV_EVENTS.includes(event.detail.name) || scopeElement === handlerDescriptor.element || isPassthroughEvent) {
          context.isPassthroughHandler = isPassthroughEvent
          return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
        }

        return { ...UINAVHANDLER_HOOK_RESULT.STOP, context }
      }

      return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
    },
    20
  )

  scopeRegistry.registerHandlerHook(
    "afterExecute",
    (scopeElement, event, handlerDescriptor, previousResult) => {
      const context = previousResult.context
      if (context.isPassthroughHandler) {
        scopedNavLogger.debug("Integration", `[afterExecute] isPassthroughHandler - stopping and blocking event: ${event.detail.name}`, { scopeElement, event, previousResult })
        return { ...UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK, context }
      }

      return previousResult
    },
    100
  )

  /**
   * Scope hook 3: Check bubbling rules (afterExecute)
   * Priority: 10
   */
  scopeRegistry.registerScopeHook(
    "afterExecute",
    (scopeElement, event, previousResult) => {
      const scopedNavProps = scopeElement[SCOPED_NAV_PROPERTY_NAME]
      if (!scopedNavProps) {
        // If not a scoped nav element, allow bubbling by default
        return previousResult
      }

      const isActiveScope = previousResult.context.activeScope && previousResult.context.activeScope === previousResult.context.scopeId

      // Check if bubbling is allowed by the scoped-nav bubble policy.
      if (isActiveScope) {
        if (canBubbleFromScopedNav(scopedNavProps, event)) {
          return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: previousResult.context }
        }

        return { ...UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK, context: previousResult.context }
      }

      // If no handlers were found, check if bubbling should be allowed
      if (previousResult.context?.noHandlersFound) {
        return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: previousResult.context }
      }

      // always block if the final result after all handlers have run is false
      if (!previousResult.continue) {
        return { ...UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK, context: previousResult.context }
      }

      return previousResult
    },
    10
  )

  // ========================================
  // DEBUG HOOKS
  // ========================================
  scopeRegistry.registerScopeHook(
    "beforeExecute",
    (scopeElement, event, previousResult) => {
      const context = previousResult.context
      scopedNavLogger.debug("Integration", `beforeExecute: scope(${context.scopeId}) for event ${event.detail.name}(${event.detail.value})`)
      return previousResult
    },
    0
  )
  scopeRegistry.registerScopeHook(
    "afterExecute",
    (scopeElement, event, previousResult) => {
      const context = previousResult.context
      scopedNavLogger.debug("Integration", `afterExecute: scope(${context.scopeId}) for event ${event.detail.name}(${event.detail.value})`)
      return previousResult
    },
    0
  )
}
