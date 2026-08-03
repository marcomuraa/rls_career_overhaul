import { uniqueId } from "@/services/uniqueId"
import { getUINavServiceInstance } from "@/services/uiNav"
import {
  NAVIGABLE_ELEMENTS_SELECTOR,
  NO_NAV_ATTR,
  SCROLL_EVENT_H,
  SCROLL_EVENT_V,
  handleUINavEvent as sendToCrossfire,
  getUINavNavigationIntent,
  wouldNavigateOutside,
  focusWrapEdge,
} from "@/services/crossfire"
import {
  SCOPED_NAV_ATTR,
  SCOPED_NAV_PROPERTY_NAME,
  SCOPED_NAV_TYPES,
  SCOPED_NAV_EVENTS,
  SCOPED_NAV_STATES,
  SCOPED_NAV_DOM_EVENTS,
  ACTIONS_ON_SUSPEND,
  ACTIVATE_BEHAVIORS,
} from "@/services/scopedNav"
import { UI_SCOPE_ATTR, UI_EVENTS, UI_EVENT_GROUPS } from "@/services/uiNav"
import { getScopeCoordinatorInstance, getRouteScopeValidatorInstance } from "@/services/scopedNav"
import * as utils from "@/services/scopedNav/utils"
import {
  setScopeNavigation,
  setContainerOpen,
  setContainerInnerNavigation,
} from "@/services/scopedNav/domNavigationState"
import {
  isRouteEntryFocus,
  isRouteManagedScope,
  resolveRouteEntryDetail,
} from "@/services/scopedNav/routeIntegration"
import { selectScopedNavFocusTarget } from "@/services/scopedNav/focusSelection"
import { vBngOnUiNav } from "@/common/directives"
import { scopedNavLogger as logger } from "@/services/scopedNav/logger"
import { SCOPE_TRAP_POLICIES, WRAP_NAVIGATION } from "@/services/scopedNav/types"
import { luaRouterScopedNavBack } from "@/services/scopedNav/api"
import { useRouteDataStore } from "@/services/routeData"

export { ACTIONS_ON_SUSPEND } from "@/services/scopedNav/constants"

const SCOPE_ID_PREFIX = "scoped-nav"

const CROSSFIRE_DIR_TO_SCOPE_DIR = {
  left: "left",
  right: "right",
  up: "top",
  down: "bottom",
}
const ALWAYS_BUBBLE_EVENTS = Object.freeze([SCROLL_EVENT_H, SCROLL_EVENT_V])

/**
 * Normalizes the `wrapNavigation` option into a Set for fast lookups.
 * @param {WRAP_NAVIGATION} value
 * @returns {Set<WRAP_NAVIGATION>|null}
 */
function _normalizeWrapNavigation(value) {
  if (value === WRAP_NAVIGATION.BOTH) return new Set([WRAP_NAVIGATION.VERTICAL, WRAP_NAVIGATION.HORIZONTAL])
  if (value === WRAP_NAVIGATION.VERTICAL || value === WRAP_NAVIGATION.HORIZONTAL) return new Set([value])
  return null
}

/**
 * @typedef {Object} BngScopedNavBinding
 * @property {string} [scopeId] - (optional) Unique identifier for the scoped navigation
 * @property {'normal'|'container'|'nonav'} [type='normal'] - Type of scoped navigation:
 *  - `normal`: Traps focus within scope, requires activation with ok/confirm
 * - `container`: Items are navigable without activation, scope activates when child is focused
 * - `nonav`: Disallows navigation but allows other UINav events
 * @property {'always'|'controller-only'} [trapPolicy='always'] - Policy for trapping events based on the input mode type
 * @property {Array<string>} [bubbleWhitelistEvents=[]] - List of UINav event names that are allowed to bubble up to the parent scope or to the global handler
 * @property {Array<string>} [actionsOnSuspend=[]] - (deprecated) List of actions to perform when the scope is suspended
 * @property {'always'|'controller-only'} [trapPolicy='always'] - Policy for trapping events when the scope is active
 * @property {boolean} [activated=false] - (optional) Dynamically control scope activation with a reactive flag. When true, activates/resumes the scope, otherwise, deactivates the scope.
 * @property {boolean} [activateOnMount=false] - Whether to immediately activate the scope when the component is mounted
 * @property {boolean} [preferAutoFocus=false] - Whether to prefer auto-focusing the first navigable item when the scope is activated
 * @property {boolean} [handlesOwnFocus=false] - Scope owns its focus (or needs none); uiHealth will not try to repair DOM focus for it
 * @property {boolean} [open=true] - Whether the container type is open. When a container is 'open', the child elements will be navigable, otherwise, it will prevent navigation to any of its child elements)
 * @property {Function} [canActivate] - Guard function to allow or deny activation with controller via ok/confirm uinav event. Return false to prevent activation
 * @property {Function} [canDeactivate] - Guard function to allow or deny deactivation with controller via back uinav event. Return false to prevent deactivation
 * @property {(event: CustomEvent) => boolean} [canBubbleEvent] - Guard function to allow or deny event bubbling up to the parent scope or to the global handler. Return false to prevent bubbling
 * @property {(event: CustomEvent) => boolean} [canIgnoreEvent] - Guard function to determine whether to ignore the event or not. Return true to ignore the event.
 * @property {Array<'top'|'bottom'|'left'|'right'>} [preventNavigationEscape=[]] - (container only) Directions in which focus is prevented from leaving the container. Navigation within the container works normally; trapping only activates when focus would escape the container boundary in the specified direction(s).
 * @property {(direction: 'top'|'bottom'|'left'|'right', event: CustomEvent) => boolean} [canPreventNavigationEscape] - Guard function to dynamically prevent navigation escape. Return true to prevent escape. Takes priority over the direction-based preventNavigationEscape array.
 * @property {(payload: {scopeId: string, direction: ('top'|'bottom'|'left'|'right'|null), event: CustomEvent, intent: object|null, boundary: object|null, element: HTMLElement}) => void} [onPreventedNavigationEscape] - Callback invoked when escape navigation is prevented. Use this for side effects, not for deciding policy.
 * @property {'vertical'|'horizontal'|'both'} [wrapNavigation] - (container only) Strictly opt-in focus wrap-around. When navigation would leave the container on an enabled axis, focus loops to the opposite-edge item instead of bubbling out. Use a `WRAP_NAVIGATION` value (`VERTICAL` / `HORIZONTAL` / `BOTH`). Disabled by default (no cost when unset).
 * @property {'always'|'containsNavigable'} [activateBehavior='always'] - Gates `ok`-driven activation of an inactive scope:
 *  - `always`: activates whenever `canActivate` allows (current behavior)
 *  - `containsNavigable`: additionally requires at least one navigable direct child (per `utils.getNavItems(el)`), so empty scopes do not steal focus on `ok`. Only affects the `ok`/confirm activation path; `activateOnMount`, reactive `activated`, and coordinator-driven activation are unchanged.
 */

/**
 * Scoped Navigation Directive - Manages scoped navigation for gamepad/keyboard control
 *
 * @description
 * Binding value accepts an object with the following properties:
 *
 * - **scopeId** `{string}` - Unique identifier for the scoped navigation
 * - **type** `{'normal'|'container'|'nonav'}` - Type of scoped navigation (default: 'normal')
 *   - `normal`: Traps focus within scope, requires activation with ok/confirm
 *   - `container`: Items are navigable without activation, scope activates when child is focused
 *   - `nonav`: Disallows navigation but allows other UINav events
 * - **trapPolicy** `{'always'|'controller-only'}` - Policy for trapping events when the scope is active (default: 'always')
 * - **bubbleWhitelistEvents** `{string[]}` - UINav event names allowed to bubble up to parent scope (default: [])
 * - **actionsOnSuspend** `{Array<string>}` - (deprecated) List of actions to perform when the scope is suspended (default: [])
 * - **activated** `{boolean}` - (optional) Dynamically control scope activation with a reactive flag. When true, activates/resumes the scope, otherwise, deactivates the scope. (default: false)
 * - **activateOnMount** `{boolean}` - Activate scope immediately when mounted (default: false)
 * - **preferAutoFocus** `{boolean}` - Whether to prefer auto-focusing the first navigable item when the scope is activated (default: false)
 * - **open** `{boolean}` - Whether the container type is open. When a container is 'open', the child elements will be navigable, otherwise, it will prevent navigation to any of its child elements (default: true)
 * - **canActivate** `{Function}` - Guard function for activation (return false to prevent)
 * - **canDeactivate** `{Function}` - Guard function for deactivation (return false to prevent)
 * - **canBubbleEvent** `{Function}` - Guard function for event bubbling (return false to prevent)
 * - **canIgnoreEvent** `{Function}` - Guard function to ignore events (return true to ignore)
 * - **preventNavigationEscape** `{Array<'top'|'bottom'|'left'|'right'>}` - (container only) Directions in which focus is prevented from leaving the container (default: [])
 * - **canPreventNavigationEscape** `{Function}` - Dynamic guard for container escape prevention; receives `(direction, event)` and should return boolean only
 * - **onPreventedNavigationEscape** `{Function}` - Optional side-effect callback called when a container escape attempt is blocked
 * - **wrapNavigation** `{'vertical'|'horizontal'|'both'}` - (container only) Strictly opt-in focus wrap-around at the container boundary. Use a `WRAP_NAVIGATION` value (`VERTICAL` / `HORIZONTAL` / `BOTH`). Disabled by default.
 * - **activateBehavior** `{'always'|'containsNavigable'}` - Gates `ok`-driven activation of an inactive scope. With `containsNavigable`, the scope only activates on `ok` when it has at least one navigable direct child; otherwise the press is ignored. Other activation paths (mount, reactive `activated`, coordinator) are unaffected. (default: 'always')
 *
 * @example
 * // Normal scope (default)
 * <div v-bng-scoped-nav="{ type: 'normal' }">
 *
 * @example
 * // Container scope
 * <div v-bng-scoped-nav="{ type: 'container' }">
 *
 * @example
 * // Container scope that prevents focus from escaping left
 * <div v-bng-scoped-nav="{ type: 'container', preventNavigationEscape: ['left'] }">
 *
 * @example
 * // With bubble whitelist
 * <div v-bng-scoped-nav="{ bubbleWhitelistEvents: ['rotate_h_cam', 'rotate_v_cam'] }">
 */
export default {
  beforeMount,
  mounted,
  updated,
  beforeUnmount,
  unmounted,
}

// ========================================
// Vue lifecycle hooks
// ========================================
/**
 *
 * @param {HTMLElement} el
 * @param {{value: BngScopedNavBinding}} binding
 * @param {VNode} vnode
 */
function beforeMount(el, binding, vnode) {
  if (_isDisabled(binding)) {
    el[SCOPED_NAV_PROPERTY_NAME] = { disabled: true }
    return
  }

  const settings = _getSettings(binding)

  if (settings.scopeId === null || settings.scopeId === undefined) {
    settings.scopeId = uniqueId(SCOPE_ID_PREFIX)
  }

  settings._hadAuthorNoNav = el.hasAttribute(NO_NAV_ATTR)
  settings._authorNoNav = settings._hadAuthorNoNav ? el.getAttribute(NO_NAV_ATTR) : undefined

  el[SCOPED_NAV_PROPERTY_NAME] = settings
  el[SCOPED_NAV_PROPERTY_NAME].shouldBubbleEvent = e => _shouldBubbleEvent(el, e)

  // initialize scope nav element's attributes
  const attributes = {}
  switch (settings.type) {
    case SCOPED_NAV_TYPES.normal:
      attributes["bng-nav-item"] = ""
      attributes["bng-no-child-nav"] = "true"
      break
    case SCOPED_NAV_TYPES.container:
      if (!settings.open) attributes["bng-no-child-nav"] = "true"
      break
    case SCOPED_NAV_TYPES.nonav:
      attributes["bng-no-nav"] = "true"
      attributes["bng-no-child-nav"] = "true"
      break
    case SCOPED_NAV_TYPES.popover:
      break
    default:
      throw new Error(`Invalid scoped nav type: ${settings.type}`)
  }
  Object.keys(attributes).forEach(attr => el.setAttribute(attr, attributes[attr]))

  el.setAttribute(SCOPED_NAV_ATTR, settings.scopeId)
  el.setAttribute(UI_SCOPE_ATTR, settings.scopeId)

  _updateElementStyles(el, SCOPED_NAV_STATES.inactive)
}

/**
 *
 * @param {HTMLElement} el
 * @param {{value: BngScopedNavBinding}} binding
 * @param {VNode} vnode
 */
function mounted(el, binding, vnode) {
  if (el[SCOPED_NAV_PROPERTY_NAME].disabled) return

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const coordinator = getScopeCoordinatorInstance()

  addUINavEventListeners(el, vnode)
  addScopedNavEventListeners(el)
  _setupPassthrough(el, binding)

  // Detect if this scope is inside a dialog (popup/modal)
  const isPopup = el.closest('dialog') !== null

  const registration = coordinator.registerScope(settings.scopeId, el, settings, { isPopup })

  const validator = getRouteScopeValidatorInstance()
  if (validator) validator.onScopeRegistered(settings.scopeId)

  registration
    .then(() => {
      if (!_isCurrentRegisteredScopeElement(coordinator, settings.scopeId, el)) return

      // If container type, configure the container if autofocus item is specified
      if (settings.type === SCOPED_NAV_TYPES.container) {
        // const autoFocusItem = _getAutoFocusItem(el)
        // if (autoFocusItem) _setChildItemsNavigation(el, false, [autoFocusItem])
        coordinator.runScopedNavDomOperation(settings.scopeId, () => {
          if (!_isCurrentRegisteredScopeElement(coordinator, settings.scopeId, el)) return

          // The scope may already be active by the time this queued DOM
          // operation runs (e.g. coordinator activated it during registration).
          // Configuring it as inactive in that case would disable sibling nav
          // items, so mirror the live activation state instead.
          // _enableNavigation(el, false)
          _configureContainerInnerNavigation(el, coordinator.isActiveScope(settings.scopeId))
        })
      }

      // if activateOnMount is true, request activation from coordinator
      if (settings.activateOnMount && _isCurrentRegisteredScopeElement(coordinator, settings.scopeId, el)) {
        coordinator.activateScope(settings.scopeId)
      }
    })
    .catch(error => {
      logger.error("Directive", `Failed scoped-nav post-registration flow for ${settings.scopeId}.`, error)
    })
}

/**
 *
 * @param {HTMLElement} el
 * @param {{value: BngScopedNavBinding}} binding
 * @param {VNode} vnode
 */
function updated(el, binding, vnode) {
  if (el[SCOPED_NAV_PROPERTY_NAME].disabled) return

  const settings = _getSettings(binding)
  const coordinator = getScopeCoordinatorInstance()
  const currentSettings = el[SCOPED_NAV_PROPERTY_NAME]
  const scopeId = currentSettings.scopeId
  const isCurrentlyActive = coordinator.isActiveScope(scopeId)

  // Handle dynamic activation control via 'activated' prop
  if (settings.activated !== undefined) {
    const scopeData = coordinator.getScopeById(scopeId)

    if (settings.activated === true && !isCurrentlyActive) {
      if (scopeData && scopeData.state === SCOPED_NAV_STATES.suspended) {
        coordinator.resumeScope(scopeId)
      } else {
        coordinator.activateScope(scopeId)
      }
    } else if (settings.activated === false && isCurrentlyActive) {
      coordinator.deactivateScope(scopeId)
    }
  }

  if (settings.open !== currentSettings.open && settings.type === SCOPED_NAV_TYPES.container) {
    setContainerOpen(el, settings.open)
  }

  if (settings.type !== SCOPED_NAV_TYPES.nonav) {
    setTimeout(() => {
      if (isCurrentlyActive) {
        // Verify scope is still active after nextTick (it may have changed)
        if (!coordinator.isActiveScope(scopeId)) return

        const activeElement = document.activeElement
        const hasFocusedChild = activeElement && document.contains(activeElement) && activeElement !== el && utils.isDirectChild(el, activeElement)
        if (hasFocusedChild) {
          _requestFocus(el, activeElement)
        } else {
          const detail = _resolveRouteEntryDetail(scopeId, null)
          _focusNavItem(el, { detail })
        }
      }
    }, 200)
  }

  el[SCOPED_NAV_PROPERTY_NAME] = { ...currentSettings, ...settings, scopeId: currentSettings.scopeId }

  // Re-setup passthrough if type changed
  if (settings.type !== currentSettings.type) {
    _setupPassthrough(el, binding)
  }
}

/**
 *
 * @param {HTMLElement} el
 * @param {{value: BngScopedNavBinding}} binding
 * @param {VNode} vnode
 */
function beforeUnmount(el, binding, vnode) {
  if (el[SCOPED_NAV_PROPERTY_NAME].disabled) return

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const coordinator = getScopeCoordinatorInstance()
  coordinator.unregisterScope(settings.scopeId)

  const validator = getRouteScopeValidatorInstance()
  if (validator) validator.onScopeUnregistered(settings.scopeId)

  removeScopedNavEventListeners(el)
}

/**
 *
 * @param {HTMLElement} el
 * @param {{value: BngScopedNavBinding}} binding
 * @param {VNode} vnode
 */
function unmounted(el, binding, vnode) { }
// ========================================

// ========================================
// Bubbling and Passthrough
// ========================================
function _setupPassthrough(el) {
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  if (settings.type !== SCOPED_NAV_TYPES.normal) return
  const passthroughEvents = utils.getPassthroughEvents(el)
  el[SCOPED_NAV_PROPERTY_NAME].passthroughEnabled = passthroughEvents.length > 0
  el[SCOPED_NAV_PROPERTY_NAME].passthroughEvents = passthroughEvents
}

function _shouldBubbleEvent(el, event) {
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const bubbleWhitelistEvents = settings.bubbleWhitelistEvents
  const canBubbleEventFn = settings.canBubbleEvent
  const eventName = event?.detail?.name

  // crossfire scroll events should never be trapped by scoped-nav
  if (ALWAYS_BUBBLE_EVENTS.includes(eventName)) return true

  if (settings.type === SCOPED_NAV_TYPES.container && UI_EVENT_GROUPS.navigation.includes(eventName)) {
    const boundary = _getContainerNavigationBoundary(el, event)
    return _resolveContainerNavigationPolicy(settings, boundary, event).shouldBubble
  }

  return (
    (bubbleWhitelistEvents && Array.isArray(bubbleWhitelistEvents) && bubbleWhitelistEvents.includes(eventName)) ||
    (canBubbleEventFn && typeof canBubbleEventFn === "function" && canBubbleEventFn(event))
  )
}

function _hasContainerBoundaryPolicy(settings) {
  return typeof settings.canPreventNavigationEscape === "function" || (Array.isArray(settings.preventNavigationEscape) && settings.preventNavigationEscape.length > 0)
}

/**
 * Determines if navigation should wrap around the container boundary.
 * @param {ScopedNavSettings} settings
 * @param {ContainerNavigationBoundary} boundary
 * @returns {boolean}
 */
function _shouldWrapNavigation(settings, boundary) {
  if (!settings.wrapNavigation) return false
  const axis = boundary?.intent?.axis
  return !!axis && settings.wrapNavigation.has(axis)
}

function _getContainerNavigationBoundary(el, event) {
  const intent = getUINavNavigationIntent(event.detail)
  if (!intent?.direction) return null
  const scopeDirection = CROSSFIRE_DIR_TO_SCOPE_DIR[intent.direction]
  if (!scopeDirection) return null

  return {
    intent,
    scopeDirection,
    wouldLeaveContainer: wouldNavigateOutside(el, intent.direction),
  }
}

function _resolveContainerNavigationPolicy(settings, boundary, event) {
  if (!boundary || !_hasContainerBoundaryPolicy(settings)) {
    return {
      shouldBubble: true,
      shouldHandleInside: false,
      isPreventedEscape: false,
    }
  }

  if (_isNavigationEscapePrevented(settings, boundary, event)) {
    return {
      shouldBubble: false,
      shouldHandleInside: false,
      isPreventedEscape: true,
    }
  }

  if (!boundary.wouldLeaveContainer) {
    return {
      shouldBubble: false,
      shouldHandleInside: true,
      isPreventedEscape: false,
    }
  }

  return {
    shouldBubble: true,
    shouldHandleInside: false,
    isPreventedEscape: false,
  }
}

function _isNavigationEscapePrevented(settings, boundary, event) {
  if (!boundary?.wouldLeaveContainer) return false

  const guardFn = settings.canPreventNavigationEscape
  if (typeof guardFn === "function") {
    return !!guardFn(boundary.scopeDirection, event)
  }

  const preventDirs = settings.preventNavigationEscape
  if (!preventDirs || preventDirs.length === 0) return false

  return preventDirs.includes(boundary.scopeDirection)
}

function _runPreventedNavigationEscapeHandler(el, settings, boundary, event) {
  const handler = settings.onPreventedNavigationEscape
  if (typeof handler !== "function") return

  try {
    handler({
      scopeId: settings.scopeId,
      direction: boundary?.scopeDirection || null,
      event,
      intent: boundary?.intent || null,
      boundary: boundary || null,
      element: el,
    })
  } catch (error) {
    logger.error("Directive", `onPreventedNavigationEscape callback failed for ${settings.scopeId}.`, error)
  }
}

// ========================================

// ========================================
// Helper functions
// ========================================

/**
 * @typedef {Object} ScopedNavSettings
 * @property {string} [scopeId] - Unique identifier for the scoped navigation
 * @property {string} [type='normal'] - Type of scoped navigation: 'normal', 'container', 'nonav'
 * @property {Array<string>} [bubbleWhitelistEvents=[]] - List of events that are allowed to bubble up from this scope
 * @property {boolean} [activateOnMount=false] - Whether to immediately activate the scope when mounted
 * @property {'always'|'containsNavigable'} [activateBehavior='always'] - Gates `ok`-driven activation of an inactive scope. With `containsNavigable`, requires at least one navigable direct child to activate.
 * @property {Function} [canActivate] - Callback function that determines if the scope can be activated with `ok` uinav event binding
 * @property {Function} [canDeactivate] - Callback function that determines if the scope can be deactivated with `back` uinav event binding
 * @property {Function} [canBubbleEvent] - Callback function that determines if the event should be allowed to bubble up
 * @property {Function} [canIgnoreEvent] - Callback function that determines if the event should be ignored. Ignored events are not handled and do not bubble up
 */

/**
 * @typedef {Object} ScopedNavValue
 * @property {string} [scopeId] - Unique identifier for the scoped navigation
 * @property {string} [type] - Type of scoped navigation ('normal', 'container', 'nonav')
 * @property {Array<string>} [bubbleWhitelistEvents] - List of events that are allowed to bubble up from this scope
 * @property {boolean} [activateOnMount] - Whether to immediately activate the scope when mounted
 * @property {'always'|'containsNavigable'} [activateBehavior] - Gates `ok`-driven activation of an inactive scope. With `containsNavigable`, requires at least one navigable direct child to activate.
 * @property {(scope: ScopedNavSettings) => boolean} [canActivate] - Activation guard function
 * @property {(scope: ScopedNavSettings) => boolean} [canDeactivate] - Deactivation guard function
 * @property {(scope: ScopedNavSettings) => boolean} [canBubbleEvent] - Event bubble guard function
 * @property {(scope: ScopedNavSettings) => boolean} [canIgnoreEvent] - Event ignore guard function
 */

function _isDisabled(binding) {
  if (binding.value === null || binding.value === undefined) return true
  if (typeof binding.value === "object" && binding.value.disabled) return true
  return false
}

/**
 * Extracts and normalizes the scoped navigation settings from Vue directive binding
 * @param {Object} binding - Vue directive binding object
 * @param {ScopedNavValue} binding.value - Directive value object
 * @returns {ScopedNavSettings} Normalized settings object with defaults applied
 */
function _getSettings(binding) {
  const settings = { ...binding.value }

  return {
    scopeId: settings.scopeId,
    type: settings.type || SCOPED_NAV_TYPES.normal,
    bubbleWhitelistEvents: settings.bubbleWhitelistEvents || [],
    actionsOnSuspend: settings.actionsOnSuspend || [ACTIONS_ON_SUSPEND.allowNavigationLastNavItem],
    activateOnMount: !!settings.activateOnMount,
    activated: settings.activated,
    activateBehavior: settings.activateBehavior === ACTIVATE_BEHAVIORS.containsNavigable ? ACTIVATE_BEHAVIORS.containsNavigable : ACTIVATE_BEHAVIORS.always,
    preferAutoFocus: !!settings.preferAutoFocus,
    handlesOwnFocus: !!settings.handlesOwnFocus,
    trapPolicy: settings.trapPolicy || SCOPE_TRAP_POLICIES.CONTROLLER_ONLY,
    open: settings.open !== undefined ? settings.open : true,
    canActivate: settings.canActivate,
    canDeactivate: settings.canDeactivate,
    canBubbleEvent: settings.canBubbleEvent,
    canIgnoreEvent: settings.canIgnoreEvent,
    preventNavigationEscape: settings.preventNavigationEscape || [],
    canPreventNavigationEscape: settings.canPreventNavigationEscape,
    onPreventedNavigationEscape: settings.onPreventedNavigationEscape,
    wrapNavigation: _normalizeWrapNavigation(settings.wrapNavigation),
  }
}

/**
 *
 * @param {HTMLElement} el
 * @param {ScopedNavSettings} settings
 * @returns
 */
function _applySettings(el, settings) {
  if (!el[SCOPED_NAV_PROPERTY_NAME]) {
    throw new Error("Scoped nav property for element is not set.")
  }

  if (el[SCOPED_NAV_PROPERTY_NAME].scopeId !== settings.scopeId) {
    console.warn("Cannot change scope id of element after it has been set. Ignoring new settings.")
    return
  }

  el[SCOPED_NAV_PROPERTY_NAME] = settings
}

function _updateElementStyles(el, activationType) {
  if (activationType) {
    el.setAttribute("data-bng-scoped-nav-state", activationType)
  } else {
    el.removeAttribute("data-bng-scoped-nav-state")
  }
}

function _isCurrentRegisteredScopeElement(coordinator, scopeId, el) {
  if (!el || !document.contains(el)) return false
  const scope = coordinator.getScopeById(scopeId)
  return !!scope && scope.element === el
}

function _configureContainerInnerNavigation(el, activated) {
  setContainerInnerNavigation(el, activated, _getAutoFocusItem(el))
}

// ========================================

// ========================================
// UINav Event handlers
// ========================================
const EVENTS_UINAV_MAP = {
  activate: [UI_EVENTS.ok],
  deactivate: [UI_EVENTS.back],
  navigation: [...UI_EVENT_GROUPS.focusMove, ...UI_EVENT_GROUPS.focusMoveScalar],
}

// True only for an explicit press-down event that has not already bubbled
// up from a child scope. Non-press or already-bubbled events should be
// passed through using the scope's normal bubble policy.
function _isFreshPressEvent(event) {
  return event.detail.value === 1 && !event.detail.bubbled
}

// Mark the event as bubbled if the scope's bubble policy allows it. Returns
// the directive handler's return value (true to bubble, false to swallow).
function _bubbleIfAllowed(el, event) {
  if (!_shouldBubbleEvent(el, event)) return false
  event.detail.bubbled = true
  return true
}

function okHandler(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} okHandler`, { el, event })

  // Pass-through for non-press / already-bubbled events using the scope's bubble policy.
  // We must not activate a parent scope on a bubbled `ok`; activation must be explicit
  // when the normal-type scope is focused.
  if (!_isFreshPressEvent(event)) return _shouldBubbleEvent(el, event)

  const coordinator = getScopeCoordinatorInstance()
  const settings = el[SCOPED_NAV_PROPERTY_NAME]

  if (!coordinator.isActiveScope(settings.scopeId)) {
    if (!settings.canActivate || settings.canActivate()) {
      if (settings.activateBehavior !== ACTIVATE_BEHAVIORS.containsNavigable || utils.getNavItems(el, true, { ignoreOwnNoChildNav: true }).length > 0) {
        coordinator.activateScope(settings.scopeId)
      }
    }
    return false
  }

  if (
    document.activeElement &&
    utils.isDirectChild(el, document.activeElement) &&
    !utils.isUINavEventBoundToElement(document.activeElement, event.detail.name)
  ) {
    sendToCrossfire(event, document.activeElement)
  }

  return _bubbleIfAllowed(el, event)
}

function backHandler(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} backHandler`, { el, event })

  if (!_isFreshPressEvent(event)) return _shouldBubbleEvent(el, event)

  const coordinator = getScopeCoordinatorInstance()
  const settings = el[SCOPED_NAV_PROPERTY_NAME]

  if (!coordinator.isActiveScope(settings.scopeId)) {
    return true
  }

  if (settings.canDeactivate && !settings.canDeactivate()) {
    return false
  }

  if (isRouteManagedScope(useRouteDataStore(), settings.scopeId)) {
    luaRouterScopedNavBack(settings.scopeId)
    return false
  }

  coordinator.deactivateScope(settings.scopeId)

  if (!coordinator.getCurrentScope()) {
    luaRouterScopedNavBack(settings.scopeId)
    return false
  }

  return _bubbleIfAllowed(el, event)
}

function generalHandler(el, e) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} generalHandler`, { el, event: e })
  if (UI_EVENT_GROUPS.navigation.includes(e.detail.name)) {
    return _handleNavigationEvent(el, e)
  }

  return false
}

function _handleNavigationEvent(el, event) {
  const coordinator = getScopeCoordinatorInstance()
  const uinavService = getUINavServiceInstance()

  if (!uinavService.useCrossfire) {
    return false
  }

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  if (settings.type === SCOPED_NAV_TYPES.nonav) {
    return false
  }

  if (settings.type === SCOPED_NAV_TYPES.container) {
    const boundary = _getContainerNavigationBoundary(el, event)
    const policy = _resolveContainerNavigationPolicy(settings, boundary, event)

    if (policy.shouldHandleInside) {
      logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - sending to crossfire (container)`, { el, event })
      sendToCrossfire(event, el)
      return false
    }

    // Wrap-around: at the boundary, loop focus to the opposite edge
    if (boundary?.wouldLeaveContainer && _shouldWrapNavigation(settings, boundary)) {
      logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - wrapping to opposite edge (container)`, { el, event })
      focusWrapEdge(el, boundary.intent.direction)
      return false
    }

    if (policy.isPreventedEscape) {
      _runPreventedNavigationEscapeHandler(el, settings, boundary, event)
      logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - prevented container escape`, { el, event })
      return false
    }

    logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - container bubbling`, { el, event })
    return policy.shouldBubble
  }

  if (settings.type !== SCOPED_NAV_TYPES.container && coordinator.isActiveScope(settings.scopeId)) {
    if (!document.activeElement || !document.contains(document.activeElement) || !utils.isDirectChild(el, document.activeElement) || el === document.activeElement) {
      logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - focusing nav item`, { el, event })
      _focusNavItem(el, { force: true })
    } else {
      logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - sending to crossfire`, { el, event })
      sendToCrossfire(event, el)
    }
    logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - return false`, { el, event })
    return false
  }

  logger.debug("Directive", `_handleNavigationEvent ${event.detail.name} - return true`, { el, event })
  return true
}

function addUINavEventListeners(el, vnode) {
  const genericHandlers = [...EVENTS_UINAV_MAP.activate, ...EVENTS_UINAV_MAP.deactivate, ...EVENTS_UINAV_MAP.navigation]
  const generalUINavBinding = {
    arg: genericHandlers.join(","),
    value: e => _uiNavEventsHandler(el, e),
  }
  vBngOnUiNav.mounted(el, generalUINavBinding, vnode)
}

function _uiNavEventsHandler(el, e) {
  logger.debug("Directive", `Handling UINav event ${e.detail.name} for ${el[SCOPED_NAV_PROPERTY_NAME].scopeId}`, { el, event: e })
  const uiNavEvent = e.detail.name
  if (EVENTS_UINAV_MAP.activate.includes(uiNavEvent)) return okHandler(el, e)
  else if (EVENTS_UINAV_MAP.deactivate.includes(uiNavEvent)) return backHandler(el, e)
  else return generalHandler(el, e)
}
// ========================================

// ========================================
// Scoped Nav Event handlers
// ========================================
function onActivate(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} onActivate`, { el, event })
  const coordinator = getScopeCoordinatorInstance()
  const settings = el[SCOPED_NAV_PROPERTY_NAME]

  coordinator.runScopedNavDomOperation(settings.scopeId, () => {
    if (settings.type === SCOPED_NAV_TYPES.container) {
      _configureContainerInnerNavigation(el, true)
    } else if (settings.type !== SCOPED_NAV_TYPES.nonav) {
      setScopeNavigation(el, true)
    }
    _updateElementStyles(el, SCOPED_NAV_STATES.active)

    if (settings.type !== SCOPED_NAV_TYPES.nonav) {
      const detail = _resolveRouteEntryDetail(settings.scopeId, event.detail)
      _focusNavItem(el, {
        force: settings.type === SCOPED_NAV_TYPES.popover,
        detail,
      })
    }
    // if the scope is nonav, we need to set the focus on the element itself even if it is non-navigable
    // to prevent inconsistencies when navigating to nonav scope from other scope type that is navigable
    // from consuming the UINav events because scopes with active elements will take priority over the active scope
    else if (settings.type === SCOPED_NAV_TYPES.nonav) {
      // _requestFocus(el, el)
      _requestBlur(el, { force: true })
    }
  })

  const detail = event.detail
  if (!detail.silent) {
    el.dispatchEvent(new CustomEvent(SCOPED_NAV_DOM_EVENTS.activate, { detail }))
  }
}

function onDeactivate(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} onDeactivate`, { el, event })
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const coordinator = getScopeCoordinatorInstance()

  const detail = event.detail

  coordinator.runScopedNavDomOperation(settings.scopeId, () => {
    if (settings.type === SCOPED_NAV_TYPES.container) {
      _configureContainerInnerNavigation(el, false)
    } else {
      setScopeNavigation(el, false)
    }
    _updateElementStyles(el, SCOPED_NAV_STATES.inactive)

    if (settings.type === SCOPED_NAV_TYPES.normal && !detail.skipFocus) {
      // nextTick(() => setFocus(el))
      _requestFocus(el, el)
    }
  })

  // const detail = event.detail
  // if (settings.type === SCOPED_NAV_TYPES.normal && !detail.skipFocus) {
  //   // nextTick(() => setFocus(el))
  //   _requestFocus(el, el)
  // }
  if (!detail.silent) {
    el.dispatchEvent(new CustomEvent(SCOPED_NAV_DOM_EVENTS.deactivate, { detail }))
  }
}
function onSuspend(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} onSuspend`, { el, event })

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  // const { actionsOnSuspend } = settings

  // Determine which elements should remain navigable during suspension
  // let filterElements = []

  // if (actionsOnSuspend.includes(ACTIONS_ON_SUSPEND.allowNavigationLastNavItem)) {
  //   // Keep last active element navigable
  //   const lastActiveElement = settings.lastActiveElement
  //   if (lastActiveElement && document.contains(lastActiveElement)) {
  //     filterElements.push(lastActiveElement)
  //     // logger.debug("[BngScopedNav] Keeping last active element navigable during suspend:", lastActiveElement)
  //   }
  // }

  // if (actionsOnSuspend.includes(ACTIONS_ON_SUSPEND.allowNavigationByAttribute)) {
  //   // TODO: Future implementation - find elements with specific attribute
  //   // const attributeElements = el.querySelectorAll('[bng-keep-nav-on-suspend]')
  //   // filterElements.push(...attributeElements)
  //   // logger.debug("[BngScopedNavNew] allowNavigationByAttribute not yet implemented")
  // }

  const coordinator = getScopeCoordinatorInstance()
  coordinator.runScopedNavDomOperation(settings.scopeId, () => {
    _updateElementStyles(el, SCOPED_NAV_STATES.suspended)

    // Enable navigation but skip child scoped nav elements -- they manage their own state
    setScopeNavigation(el, true)

    // Re-disable navigation on child scoped nav elements so they aren't erroneously made navigable
    const childScopedNavEls = el.querySelectorAll(`[${SCOPED_NAV_ATTR}]`)
    childScopedNavEls.forEach(childEl => {
      if (childEl === el) return
      const childSettings = childEl[SCOPED_NAV_PROPERTY_NAME]
      if (!childSettings || childSettings.disabled) return
      if (childSettings.type === SCOPED_NAV_TYPES.normal) {
        childEl.setAttribute("bng-no-child-nav", "true")
      }
    })
  })

  const detail = event.detail
  if (!detail.silent) {
    el.dispatchEvent(new CustomEvent(SCOPED_NAV_DOM_EVENTS.suspend, { detail }))
  }
}
function onResume(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} onResume`, { el, event })

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const { actionsOnSuspend } = settings

  // Use same filter logic as suspend
  let filterElements = []

  if (actionsOnSuspend.includes(ACTIONS_ON_SUSPEND.allowNavigationLastNavItem)) {
    const lastActiveElement = settings.lastActiveElement
    if (lastActiveElement && document.contains(lastActiveElement) && utils.isNavigable(lastActiveElement)) {
      filterElements.push(lastActiveElement)
      logger.debug("Directive", "Keeping last active element navigable during resume", lastActiveElement)
    }
  }

  const coordinator = getScopeCoordinatorInstance()
  coordinator.runScopedNavDomOperation(settings.scopeId, () => {
    setScopeNavigation(el, true, { applyToChildItems: true, filterElements })
    _updateElementStyles(el, SCOPED_NAV_STATES.active)

    // If focus has already moved into this scope (e.g. focus_l returning from a child
    // scope back into root), don't re-run fallback selection, which could jump focus
    // away from where the user just landed.
    const activeElement = document.activeElement
    const hasFocusedElementInsideScope =
      activeElement &&
      document.contains(activeElement) &&
      activeElement !== el &&
      el.contains(activeElement) &&
      utils.isAvailableNavItem(el, activeElement)

    if (hasFocusedElementInsideScope) {
      logger.debug("Directive", "Resume skipping fallback focus; focus already inside scope", activeElement)
      return
    }

    const detail = _resolveRouteEntryDetail(settings.scopeId, event.detail)
    _focusNavItem(el, { detail })
  })

  // _focusNavItem(el)

  const detail = event.detail
  if (!detail.silent) {
    el.dispatchEvent(new CustomEvent(SCOPED_NAV_DOM_EVENTS.activate, { detail: {...detail, resume: true} }))
  }
}

function onFocusRequest(el, event) {
  logger.info("Directive", `Scope ${el[SCOPED_NAV_PROPERTY_NAME].scopeId} onFocusRequest`, { el, event })
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  if (settings.type === SCOPED_NAV_TYPES.nonav) return

  const coordinator = getScopeCoordinatorInstance()
  const requestDetail = event?.detail || {}
  coordinator.runScopedNavDomOperation(settings.scopeId, () => {
    if (requestDetail.activeOnly !== false && !coordinator.isActiveScope(settings.scopeId)) return false

    const detail = _resolveRouteEntryDetail(settings.scopeId, requestDetail.focusDetail)
    _focusNavItem(el, {
      force: !!requestDetail.force,
      detail,
      requestedElement: _resolveFocusRequestTarget(el, requestDetail.requestedTarget),
    })
    return true
  }, { conflictMode: "serial" })
}

function _resolveFocusRequestTarget(scopeElement, target) {
  if (!scopeElement || !target) return null

  if (typeof target === "string") {
    const selector = target.trim()
    if (!selector) return null
    try {
      const element = scopeElement.querySelector(selector)
      return _isElementNode(element) ? element : null
    } catch (error) {
      logger.warn("Directive", `Ignoring invalid scoped-nav focus selector "${selector}"`, error)
      return null
    }
  }

  if (_isElementNode(target) && scopeElement.contains(target)) {
    return target
  }

  return null
}

function _isElementNode(value) {
  return !!value && typeof value === "object" && value.nodeType === 1
}

function addScopedNavEventListeners(el) {
  const eventHandlers = {
    [SCOPED_NAV_EVENTS.activate]: event => onActivate(el, event),
    [SCOPED_NAV_EVENTS.deactivate]: event => onDeactivate(el, event),
    [SCOPED_NAV_EVENTS.suspend]: event => onSuspend(el, event),
    [SCOPED_NAV_EVENTS.resume]: event => onResume(el, event),
    [SCOPED_NAV_EVENTS.focus]: event => onFocusRequest(el, event),
  }

  Object.keys(eventHandlers).forEach(eventName => {
    if (!el._scopedNavListeners) el._scopedNavListeners = {}
    el.addEventListener(eventName, eventHandlers[eventName])
    el._scopedNavListeners[eventName] = eventHandlers[eventName]
  })
}

function removeScopedNavEventListeners(el) {
  if (!el || !el._scopedNavListeners) return

  Object.keys(el._scopedNavListeners).forEach(eventName => {
    el.removeEventListener(eventName, el._scopedNavListeners[eventName])
    delete el._scopedNavListeners[eventName]
  })
}

/**
 * Build the effective focus detail for a scope by combining an incoming event
 * detail with any pending route-entry payload stored on the coordinator.
 *
 * Delegates the merge logic to the shared route-integration helper; this
 * thin wrapper supplies the coordinator's `peekRouteEntryFocus` so the
 * helper stays decoupled from the coordinator singleton.
 *
 * @param {string|null|undefined} scopeId
 * @param {{focusSource?: string, fromRouteName?: string|null}|null|undefined} eventDetail
 * @returns {{focusSource?: string, fromRouteName?: string|null}|null}
 */
function _resolveRouteEntryDetail(scopeId, eventDetail) {
  const coordinator = getScopeCoordinatorInstance()
  return resolveRouteEntryDetail(scopeId, eventDetail, id => coordinator.peekRouteEntryFocus(id))
}

/**
 * Determines which element to focus within a scope using a priority sequence.
 *
 * Standard priority order:
 *   default:         routeTargetMatch -> lastActive -> autofocus -> firstNavigable
 *   preferAutoFocus: autofocus -> routeTargetMatch -> lastActive -> firstNavigable
 *
 * Route-entry payloads without a usable route-target match fall back to the
 * scope's default focus target instead of restoring the previous in-scope
 * item. Autofocus is always preferred over the first navigable here so
 * scopes can opt into a specific entry target without flipping
 * `preferAutoFocus` for the rest of their focus behavior:
 *   default:         autofocus -> firstNavigable
 *   preferAutoFocus: autofocus -> firstNavigable
 *
 * The `routeTargetMatch` candidate only applies on route-entry activation/resume
 * (`detail.focusSource === "route-entry"`) and matches a navigable direct child
 * whose `bng-route-target` attribute equals `detail.fromRouteName`.
 *
 * @param {HTMLElement} el
 * @param {{focusSource?: string, fromRouteName?: string|null}|null} [detail] - Optional event.detail from the scoped-nav activate/resume event
 * @returns {{focusItem: HTMLElement|null, isAutoFocusItem: boolean, isRouteTargetMatch: boolean}}
 */
function _getFirstOrDefaultNavItem(el, detail = null, requestedElement = null) {
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  // Only consider items that are actually focusable right now. Virtualized
  // or overflow-hidden keep-alive items remain in the DOM but must not win
  // focus restoration, otherwise focus sticks to a tile the user cannot see.
  const navItems = utils.getNavItems(el, true, { availableOnly: true })

  const getLastActive = () => {
    const elm = settings.lastActiveElement
    if (!elm) return null
    // Drop stale references when the element is gone or no longer usable
    // (hidden by virtualization, display:none, occluded, etc).
    if (!utils.isAvailableNavItem(el, elm)) {
      settings.lastActiveElement = null
      return null
    }
    return navItems.includes(elm) ? elm : null
  }

  const autoFocusItem = _getAutoFocusItem(el)

  return selectScopedNavFocusTarget({
    navItems,
    requestedElement: navItems.includes(requestedElement) ? requestedElement : null,
    lastActiveElement: getLastActive(),
    autoFocusItem: navItems.includes(autoFocusItem) ? autoFocusItem : null,
    detail,
    preferAutoFocus: settings.preferAutoFocus,
  })
}

function _focusNavItem(el, options = {}) {
  const { focusItem, isAutoFocusItem } = _getFirstOrDefaultNavItem(el, options.detail, options.requestedElement)

  if (!focusItem) {
    logger.debug("Directive", "No focusable item found in scope", el)
    return
  }

  if (isRouteEntryFocus(options.detail)) {
    const settings = el[SCOPED_NAV_PROPERTY_NAME]
    const scopeId = settings && settings.scopeId
    if (scopeId) {
      const coordinator = getScopeCoordinatorInstance()
      coordinator.clearRouteEntryFocus(scopeId)
    }
  }

  logger.debug("Directive", "Focusing first or default nav item", { focusItem, isAutoFocusItem })
  _requestFocus(el, focusItem, options)
}

function _requestFocus(scopeElement, targetElement, options = {}) {
  const settings = scopeElement[SCOPED_NAV_PROPERTY_NAME]
  const coordinator = getScopeCoordinatorInstance()
  coordinator.requestFocus(targetElement, settings.scopeId, options)
}

function _requestBlur(scopeElement, options = {}) {
  const settings = scopeElement[SCOPED_NAV_PROPERTY_NAME]
  const coordinator = getScopeCoordinatorInstance()
  coordinator.requestBlur(scopeElement, settings.scopeId, options)
}

function _getAutoFocusItem(el) {
  const autoFocusItem = Array.from(
    el.querySelectorAll(`${NAVIGABLE_ELEMENTS_SELECTOR}[bng-scoped-nav-autofocus],${NAVIGABLE_ELEMENTS_SELECTOR}[bng-scoped-nav-autofocus="true"]`)
  ).filter(
    elem =>
      utils.isDirectChild(el, elem) &&
      elem.hasAttribute("bng-scoped-nav-autofocus") &&
      (elem.getAttribute("bng-scoped-nav-autofocus") === "" || elem.getAttribute("bng-scoped-nav-autofocus") === "true")
  )

  return autoFocusItem.length > 0 ? autoFocusItem[0] : null
}

// ========================================
