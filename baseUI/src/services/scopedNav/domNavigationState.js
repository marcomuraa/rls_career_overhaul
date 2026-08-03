// Shared DOM navigation-state helpers
//
// Owns the `bng-no-nav` and `bng-no-child-nav` mutation logic that the
// scoped-nav directive uses on activation/deactivation/suspend/resume.
// Each helper preserves the exact behavior of the original directive
// helpers it replaces.

import { NO_NAV_ATTR, NO_CHILD_NAV_ATTR } from "@/services/crossfire"
import { SCOPED_NAV_ATTR, SCOPED_NAV_PROPERTY_NAME, SCOPED_NAV_TYPES } from "./constants"
import * as utils from "./utils"
import { scopedNavLogger as logger } from "./logger"

/**
 * Toggle navigation for a scope element. Mirrors the original
 * `_enableNavigation` directive helper:
 *  - 'nonav' scopes are a no-op (logged at warn).
 *  - by default flips the scope element's container attributes.
 *  - with `applyToChildItems: true`, every direct nav item under the scope
 *    is toggled, optionally excluding items in `filterElements`.
 *
 * @param {HTMLElement} el
 * @param {boolean} [enabled=true]
 * @param {{ applyToChildItems?: boolean, filterElements?: HTMLElement[] }} [options]
 */
export function setScopeNavigation(el, enabled = true, options = {}) {
  const { applyToChildItems = false, filterElements = [] } = options
  const settings = el[SCOPED_NAV_PROPERTY_NAME]

  if (settings && settings.type === SCOPED_NAV_TYPES.nonav) {
    logger.warn("Directive", `Cannot toggle navigation for ${settings.scopeId} with a nonav type`)
    return
  }

  if (applyToChildItems) {
    setChildItemsNavigation(el, enabled, filterElements)
    return
  }

  setScopeElementNavigation(el, enabled, settings?.type)
}

/**
 * Toggle navigation on each direct nav item under a scope, while remembering
 * each item's original `bng-no-nav` value so it can be restored later.
 * Items that are themselves a scoped-nav element or in `filterElements` are
 * skipped.
 *
 * @param {HTMLElement} el
 * @param {boolean} enabled
 * @param {HTMLElement[]} [filterElements=[]]
 */
export function setChildItemsNavigation(el, enabled, filterElements = []) {
  const navItems = utils.getNavItems(el, false)

  navItems.forEach(item => {
    if (filterElements && filterElements.includes(item)) return
    if (item.hasAttribute(SCOPED_NAV_ATTR)) return

    const state = ensureManagedItemState(item)

    if (enabled) {
      if (!state.hadOriginalNoNav) item.removeAttribute(NO_NAV_ATTR)
      else item.setAttribute(NO_NAV_ATTR, state.originalNoNav)
      state.noNavSetByDirective = false
      return
    }

    if (!state.hadOriginalNoNav || state.originalNoNav !== "true") {
      item.setAttribute(NO_NAV_ATTR, "true")
      state.noNavSetByDirective = true
    }
  })
}

/**
 * Toggle navigation on the scope element itself by flipping
 * `bng-no-child-nav` and (for normal-type scopes) the scope's own
 * `bng-no-nav` attribute, restoring any author-supplied original.
 *
 * @param {HTMLElement} el
 * @param {boolean} enabled
 * @param {string|undefined} type
 */
export function setScopeElementNavigation(el, enabled, type) {
  if (enabled) {
    el.removeAttribute(NO_CHILD_NAV_ATTR)
    if (type === SCOPED_NAV_TYPES.normal) el.setAttribute(NO_NAV_ATTR, "true")
    return
  }

  el.setAttribute(NO_CHILD_NAV_ATTR, "true")

  if (type !== SCOPED_NAV_TYPES.normal) return

  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  if (settings && settings._hadAuthorNoNav) {
    el.setAttribute(NO_NAV_ATTR, settings._authorNoNav)
  } else {
    el.removeAttribute(NO_NAV_ATTR)
  }
}

/**
 * Toggle the `bng-no-child-nav` attribute on a container scope.
 *
 * @param {HTMLElement} el
 * @param {boolean} open
 */
export function setContainerOpen(el, open) {
  if (open) {
    el.removeAttribute(NO_CHILD_NAV_ATTR)
  } else {
    el.setAttribute(NO_CHILD_NAV_ATTR, "true")
  }
}

/**
 * Configure inner navigation for a container scope. When `activated` is
 * false and a navigable autofocus item exists as a direct child, only that
 * item is left navigable; all other direct nav items are disabled and
 * remembered so they can be restored on activation. When `activated` is
 * true and an earlier configuration was applied, restore the previous
 * navigability of each direct nav item.
 *
 * The autofocus selection is left to the caller so this module does not
 * have to know about the directive's autofocus selector.
 *
 * @param {HTMLElement} el
 * @param {boolean} activated
 * @param {HTMLElement | null | undefined} autoFocusItem
 */
export function setContainerInnerNavigation(el, activated, autoFocusItem) {
  const settings = el[SCOPED_NAV_PROPERTY_NAME]
  const navItems = utils.getNavItems(el, false)

  if (!activated && autoFocusItem && utils.isDirectChild(el, autoFocusItem)) {
    navItems.forEach(item => {
      if (item === autoFocusItem) return
      if (!item[SCOPED_NAV_PROPERTY_NAME]) {
        item[SCOPED_NAV_PROPERTY_NAME] = {}
      }
      const itemState = item[SCOPED_NAV_PROPERTY_NAME]
      // Capture the author's original state only once, before the directive
      // mutates the attribute, so repeated inactive calls stay idempotent.
      if (!itemState.noNavSetByDirective) {
        const currentValue = item.hasAttribute(NO_NAV_ATTR) ? item.getAttribute(NO_NAV_ATTR) : undefined
        itemState.originalNoNav = currentValue
        itemState.hadOriginalNoNav = currentValue !== undefined
      }
      itemState.noNavSetByDirective = true
      item.setAttribute(NO_NAV_ATTR, "true")
    })
    if (settings) settings.isNavigationConfigured = true
    return
  }

  if (activated && settings?.isNavigationConfigured) {
    navItems.forEach(item => {
      const itemState = item[SCOPED_NAV_PROPERTY_NAME]
      // Only restore items the directive actually disabled; leave any
      // author-managed siblings untouched.
      if (!itemState || !itemState.noNavSetByDirective) return

      if (itemState.hadOriginalNoNav) {
        item.setAttribute(NO_NAV_ATTR, itemState.originalNoNav)
      } else {
        item.removeAttribute(NO_NAV_ATTR)
      }

      // Clear the per-item directive flags so future inactive/active cycles
      // re-capture the author's state cleanly.
      itemState.noNavSetByDirective = false
      itemState.hadOriginalNoNav = false
      itemState.originalNoNav = undefined
    })
    settings.isNavigationConfigured = false
  }
}

function ensureManagedItemState(item) {
  if (!item[SCOPED_NAV_PROPERTY_NAME]) {
    const currentValue = item.hasAttribute(NO_NAV_ATTR) ? item.getAttribute(NO_NAV_ATTR) : undefined
    item[SCOPED_NAV_PROPERTY_NAME] = {
      originalNoNav: currentValue,
      hadOriginalNoNav: currentValue !== undefined,
    }
  }
  return item[SCOPED_NAV_PROPERTY_NAME]
}
