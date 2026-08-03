// Public API - Clean interface for components

import { computed, onMounted, onUnmounted } from "vue"
import { getScopeCoordinatorInstance } from "./coordinator"
import { getRouteScopeValidatorInstance } from "./routeScopeValidator"
import { getScopeForElement, getScopeHierarchy } from "./utils"
import {
  buildRouteEntryFocus,
  getFromRouteName,
  getRouteScopeMeta,
  getScreenRootScopeId,
  getTargetScopeId,
} from "./routeIntegration"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"

/**
 * Main composable for scoped navigation
 */
export function useScopedNav() {
  const coordinator = getScopeCoordinatorInstance()

  return {
    // Scope operations
    activateScope: (id, opts) => coordinator.activateScope(id, opts),
    deactivateScope: (id, opts) => coordinator.deactivateScope(id, opts),
    suspendScope: id => coordinator.suspendScope(id),
    resumeScope: id => coordinator.resumeScope(id),
    // TODO: Proxy to activateScope for now, when requirements become more complex, add a dedicated switchScope method
    switchScope: (id, opts) => coordinator.activateScope(id, opts),
    requestScopeFocus: (id, targetOrOptions, options) => requestScopeFocus(coordinator, id, targetOrOptions, options),
    requestCurrentScopeFocus: (targetOrOptions, options) => requestCurrentScopeFocus(coordinator, targetOrOptions, options),

    // Pending activation
    setPendingActivation: (id, options) => coordinator.setPendingActivation(id, options),
    clearPendingActivation: () => coordinator.clearPendingActivation(),

    // Activation barrier (defer normal-scope resume while a host stays top-layer active)
    beginActivationBarrier: id => coordinator.beginActivationBarrier(id),
    endActivationBarrier: id => coordinator.endActivationBarrier(id),

    // Queries
    currentScope: () => coordinator.getCurrentScope(),
    isActiveScope: id => coordinator.isActiveScope(id),
    getScopeById: id => coordinator.getScopeById(id),
    getParentScope: id => coordinator.getParentScope(id),

    // Element scope queries (stateless DOM lookups)
    getScopeForElement: el => getScopeForElement(el),
    getScopeHierarchy: el => getScopeHierarchy(el),

    // Reactive state (computed refs)
    current: computed(() => coordinator.getCurrentScope()),
    stack: computed(() => coordinator.scopeStack),
    popupStack: computed(() => coordinator.popupScopeStack),
  }
}

function requestCurrentScopeFocus(coordinator, targetOrOptions, options) {
  const scope = coordinator.getCurrentScope()
  if (!scope) return false
  return requestScopeFocus(coordinator, scope.id, targetOrOptions, options)
}

function requestScopeFocus(coordinator, id, targetOrOptions, options) {
  if (isFocusTarget(targetOrOptions)) {
    return coordinator.requestScopeFocus(id, targetOrOptions, withDefaultFocusReason(options))
  }

  return coordinator.requestScopeFocus(id, withDefaultFocusReason(targetOrOptions))
}

function withDefaultFocusReason(options) {
  return {
    ...(options || {}),
    reason: options?.reason || "api-request",
  }
}

function isFocusTarget(value) {
  return typeof value === "string" || (!!value && typeof value === "object" && value.nodeType === 1)
}

/**
 * Register a scope observer
 */
export function useScopedNavObserver(observer) {
  const coordinator = getScopeCoordinatorInstance()

  onMounted(() => coordinator.addObserver(observer))
  onUnmounted(() => coordinator.removeObserver(observer))
}

/**
 * Resolve back navigation for a scope using route-defined metadata.
 * Reads scopeParentMap from the route data store to decide whether
 * to activate a sibling/parent scope or fall back to Lua router back.
 */
export function luaRouterScopedNavBack(scopeId) {
  const store = useRouteDataStore()
  const scopeMeta = getRouteScopeMeta(store, scopeId)

  if (!scopeMeta) {
    lua.extensions.ui_router.back()
    return
  }

  const coordinator = getScopeCoordinatorInstance()
  const validator = getRouteScopeValidatorInstance()

  if (scopeMeta.backTargetType === "route") {
    if (scopeMeta.backTarget) {
      lua.extensions.ui_router.navigate(scopeMeta.backTarget, null, { restoreLastScope: true })
    } else {
      lua.extensions.ui_router.back()
    }
    return
  }

  if (scopeMeta.backTarget) {
    if (scopeMeta.backTargetType === "scope") {
      validator?.validateScopeTarget(scopeMeta.backTarget, { trigger: "back", fromScopeId: scopeId })
      coordinator.activateScope(scopeMeta.backTarget)
      return
    }
  }

  if (scopeMeta.parentScopeId !== false) {
    validator?.validateScopeTarget(scopeMeta.parentScopeId, { trigger: "back", fromScopeId: scopeId })
    coordinator.activateScope(scopeMeta.parentScopeId)
    return
  }

  lua.extensions.ui_router.back()
}

/**
 * Activate the screen root scope for the current route.
 * Reads the route scopes from the global router state and activates
 * the screen root scope if one is defined.
 */
export function activateScreenRootScope() {
  const rootScope = getScreenRootScopeId(useRouteDataStore())
  if (!rootScope) return false
  getScopeCoordinatorInstance().activateScope(rootScope)
  return true
}

/**
 * Read targetScope from the route data store and set it as the
 * pending activation on the scope coordinator. Called after
 * routeMounted completes so activation happens post-mount.
 *
 * Also registers a one-shot route-entry focus payload with the
 * coordinator so the route-target focus intent survives even when
 * the target scope is already mounted/active and only re-renders,
 * or is resumed instead of freshly activated. The directive's
 * focus selection consumes the payload exactly once.
 */
export function activateRouteTargetScope() {
  const store = useRouteDataStore()
  const targetScope = getTargetScopeId(store)
  if (!targetScope) return false

  getRouteScopeValidatorInstance()?.validateScopeTarget(targetScope, { trigger: "activateRouteTargetScope" })

  const coordinator = getScopeCoordinatorInstance()
  const routeEntryFocus = buildRouteEntryFocus(getFromRouteName(store))
  coordinator.setRouteEntryFocus(targetScope, routeEntryFocus)
  coordinator.setPendingActivation(targetScope, routeEntryFocus)
  return true
}

/**
 * Install the global router hook for clearing pending activation
 * on route cancellation. Call once during app initialization.
 */
export function installGlobalRouterHook() {
  window.__luaRouter__._clearPendingActivation = () => {
    try {
      const { clearPendingActivation } = useScopedNav()
      clearPendingActivation()
    } catch (e) {}
  }
}
