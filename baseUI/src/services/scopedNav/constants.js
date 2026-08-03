// import { UI_EVENT_GROUPS, UI_EVENTS } from "@/bridge/libs/UINavEvents"
import { UI_EVENT_GROUPS, UI_EVENTS } from "@/services/uiNav/constants"

export const SCOPED_NAV_ATTR = "bng-scoped-nav"
export const SCOPED_NAV_PROPERTY_NAME = "_bngScopedNav"
export const UI_SCOPE_ATTR = "bng-ui-scope"
export const BNG_ON_UI_NAV_ATTR = "__BngOnUiNav"
export const ATTR_NAME = "bng-scoped-nav"
export const PASSTHROUGH_EXCLUDED_EVENTS = [UI_EVENTS.ok, UI_EVENTS.back, UI_EVENT_GROUPS.focusMove, UI_EVENT_GROUPS.focusMoveScalar]

export const SCOPED_NAV_STATES = {
  active: "active",
  suspended: "suspended",
  inactive: "inactive",
}

export const SCOPED_NAV_EVENTS = {
  activate: "scopednav:activate",
  deactivate: "scopednav:deactivate",
  suspend: "scopednav:suspend",
  resume: "scopednav:resume",
  focus: "scopednav:focus",
}

export const SCOPED_NAV_OBSERVER_EVENTS = {
  onBeforeScopeActivated: "onBeforeScopeActivated",
  onScopeActivated: "onScopeActivated",
  onBeforeScopeDeactivated: "onBeforeScopeDeactivated",
  onScopeDeactivated: "onScopeDeactivated",
  onBeforeScopeSuspended: "onBeforeScopeSuspended",
  onScopeSuspended: "onScopeSuspended",
  onBeforeScopeResumed: "onBeforeScopeResumed",
  onScopeResumed: "onScopeResumed",
  onScopeNavigationStateApplied: "onScopeNavigationStateApplied",
}

export const SCOPED_NAV_TYPES = {
  /**
   * allows navigation between child elements and trigger their handlers when activated only. This is the default type
   */
  normal: "normal",
  /**
   * allows navigation towards its elements regardles if the scope is activated or not. When any of its elements are focused, the scope will be activated, and when the focus is removed from any of its elements, the scope will be deactivated
   */
  container: "container",
  /**
   * applies all functionality of normal but does not allow navigation between child elements. For example, a component that will only interactable with controller or mouse clicks
   */
  nonav: "nonav",

  /**
   * NOTE: is special type for popovers and should not be manually used. This will be automatically applied to popover components
   */
  popover: "popover",
}

export const ACTIONS_ON_SUSPEND = {
  allowNavigationLastNavItem: "allowNavigationLastNavItem",
  allowNavigationByAttribute: "allowNavigationByAttribute",
  disableNavigation: "disableNavigation",
}

export const ACTIVATE_BEHAVIORS = {
  always: "always",
  containsNavigable: "containsNavigable",
}
