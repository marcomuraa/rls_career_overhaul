import { NO_NAV_ATTR, NO_CHILD_NAV_ATTR, NAVIGABLE_ELEMENTS_SELECTOR, isAvailable as crossfireIsAvailable } from "@/services/crossfire"
import { ATTR_NAME, BNG_ON_UI_NAV_ATTR, PASSTHROUGH_EXCLUDED_EVENTS, SCOPED_NAV_ATTR, UI_SCOPE_ATTR } from "./constants"

export const getScopeProperties = el => {
  if (!el || !el.hasAttribute(UI_SCOPE_ATTR)) return undefined

  return {
    scopeId: el.getAttribute(UI_SCOPE_ATTR),
    isScopedNav: el.hasAttribute(SCOPED_NAV_ATTR),
  }
}

export const findParentScope = (el, scopedNavOnly = false) => {
  let parent = el.parentElement

  while (parent) {
    // Check for bng-scoped-nav first (full-featured)
    const scopedNavId = parent.getAttribute(SCOPED_NAV_ATTR)
    if (scopedNavId) {
      return {
        scopeId: scopedNavId,
        element: parent,
        isScopedNav: true,
      }
    }

    // Then check for bng-ui-scope (basic boundary)
    if (!scopedNavOnly) {
      const uiScopeId = parent.getAttribute(UI_SCOPE_ATTR)
      if (uiScopeId) {
        return {
          scopeId: uiScopeId,
          element: parent,
          isScopedNav: false,
        }
      }
    }

    parent = parent.parentElement
  }

  return null
}

export const getParentScopedNavs = el => {
  let parent = el.parentElement
  let parentScopedNavs = []
  while (parent) {
    const scopedNavId = parent.getAttribute(SCOPED_NAV_ATTR)
    if (scopedNavId) {
      parentScopedNavs.push(parent)
    }
    parent = parent.parentElement
  }
  return parentScopedNavs
}

export const isNavigable = el =>
  (!el.hasAttribute(NO_NAV_ATTR) || el.getAttribute(NO_NAV_ATTR) === "false") && (!el.hasAttribute("disabled") || el.getAttribute("disabled") === "false")

export const isDirectChild = (el, child) => {
  // const parentScope = child.closest(`[${ATTR_NAME}]`)
  // // if child's closest bng-scoped-nav is itself, get its parent's closest bng-scoped-nav
  // if (parentScope === child) return child.parentElement.closest(`[${ATTR_NAME}]`) === el
  // return parentScope === el
  return child.parentElement.closest(`[${ATTR_NAME}]`) === el
}

export const getNavItems = (el, navigableOnly = true, options = {}) => {
  const { ignoreOwnNoChildNav = false, availableOnly = false } = options
  const matches = el.querySelectorAll(NAVIGABLE_ELEMENTS_SELECTOR)
  return Array.from(matches).filter(child => {
    if (!isNavigable(child) && navigableOnly) return false
    // exclude children inside a bng-no-child-nav container within this scope
    const noChildNavAncestor = child.parentNode.closest(`[${NO_CHILD_NAV_ATTR}="1"], [${NO_CHILD_NAV_ATTR}="true"]`)
    if (noChildNavAncestor && el.contains(noChildNavAncestor)) {
      // When opted in, only the scope root's own bng-no-child-nav is ignored;
      // any nested bng-no-child-nav container still excludes its descendants.
      if (!ignoreOwnNoChildNav || noChildNavAncestor !== el) return false
    }
    // check that a child element is not a child of another nested bng-scoped-nav
    // otherwise, if closest [bng-scoped-nav] element of a child element is itself,
    // then the child element is still a child of the current [bng-scoped-nav] or container
    if (!isDirectChild(el, child)) return false
    // optionally require the item to be visible/available for focus (handles
    // virtualized/keep-alive lists that retain hidden nodes in the DOM).
    if (availableOnly && !isAvailableNavItem(el, child)) return false
    return true
  })
}

/**
 * Returns true when an element is a usable focus candidate inside a scope:
 * it is still in the DOM, contained in the scope, navigable, and considered
 * available by Crossfire (rejects display:none, visibility hidden,
 * pointer-events:none, offscreen/occluded nodes, etc).
 *
 * Use this to filter scoped-nav focus fallbacks (lastActiveElement,
 * autofocus, first navigable) so virtualized or overflow-hidden keep-alive
 * items are not restored as focus targets.
 *
 * @param {HTMLElement} scopeEl
 * @param {HTMLElement | null | undefined} item
 * @returns {boolean}
 */
export const isAvailableNavItem = (scopeEl, item) => {
  if (!item || !scopeEl) return false
  if (!document.contains(item)) return false
  if (!scopeEl.contains(item)) return false
  if (!isNavigable(item)) return false
  try {
    return crossfireIsAvailable(item)
  } catch (err) {
    return false
  }
}

export const getPassthroughEvents = el => {
  const navItems = getNavItems(el, false)
  if (navItems.length === 0) return false

  // check that all bng-nav-item elements are bound to UINav event
  let boundEvents = []

  for (const elem of navItems) {
    // all nav items must be bound to a UINav event to allow event passthrough
    const uiNavEvents = elem[BNG_ON_UI_NAV_ATTR]
      ? Object.values(elem[BNG_ON_UI_NAV_ATTR])
          .map(x => x.eventNames)
          .flat()
          .filter(name => !PASSTHROUGH_EXCLUDED_EVENTS.includes(name))
      : []

    const isDuplicate = uiNavEvents.some(event => boundEvents.includes(event))

    // no duplicate UINav events between nav items to allow event passthrough
    if (uiNavEvents.length === 0 || uiNavEvents.length > 1 || isDuplicate) {
      boundEvents = []
      break
    }

    // Add unique events to boundEvents array. for scenarios where multiple events are bound to the same element
    uiNavEvents.forEach(event => {
      if (!boundEvents.includes(event)) boundEvents.push(event)
    })
  }

  return boundEvents
}

export const getUINavEventsBoundToElement = el => {
  const uiNavEvents = el[BNG_ON_UI_NAV_ATTR]
    ? Object.values(el[BNG_ON_UI_NAV_ATTR])
        .map(x => x.eventNames)
        .flat()
    : []
  const boundEvents = []
  uiNavEvents.forEach(ev => {
    if (!boundEvents.includes(ev)) boundEvents.push(ev)
  })
  return boundEvents
}

export const isUINavEventBoundToElement = (el, eventName) => {
  const boundEvents = getUINavEventsBoundToElement(el)
  return boundEvents && boundEvents.length > 0 && boundEvents.includes(eventName)
}

/**
 * Extract a scope ID from a DOM element. Checks `bng-scoped-nav` first,
 * then falls back to `bng-ui-scope`.
 * @param {HTMLElement | null | undefined} el
 * @returns {string | null}
 */
export function getScopeIdFromElement(el) {
  if (!el) return null
  return el.getAttribute(SCOPED_NAV_ATTR) || el.getAttribute(UI_SCOPE_ATTR) || null
}

/**
 * Returns the `bng-scoped-nav` id from an element (ignores `bng-ui-scope`).
 * @param {HTMLElement | null | undefined} el
 * @returns {string | null}
 */
export function getScopedNavId(el) {
  if (!el) return null
  return el.getAttribute(SCOPED_NAV_ATTR) || null
}

/**
 * Returns the closest `bng-scoped-nav` ancestor element (including self), or null.
 * @param {HTMLElement | null | undefined} el
 * @returns {HTMLElement | null}
 */
export function getClosestScopedNavElement(el) {
  if (!el) return null
  return el.closest(`[${SCOPED_NAV_ATTR}]`)
}

/**
 * Returns true when the element has any `bng-scoped-nav` ancestor (including self).
 * @param {HTMLElement | null | undefined} el
 * @returns {boolean}
 */
export function hasScopedNavAncestor(el) {
  return !!getClosestScopedNavElement(el)
}

/**
 * Returns the full chain of parent `bng-scoped-nav` ids for an element,
 * ordered from nearest parent to root.
 * @param {HTMLElement | null | undefined} el
 * @returns {string[]}
 */
export function getParentScopedNavIds(el) {
  return getParentScopedNavs(el)
    .map(parent => parent.getAttribute(SCOPED_NAV_ATTR))
    .filter(Boolean)
}

/**
 * Returns the immediate scope that an element belongs to.
 * Unlike findParentScope, this also checks the element itself (not just parents).
 * Considers both bng-scoped-nav and bng-ui-scope attributes.
 *
 * @param {HTMLElement} el
 * @returns {{ scopeId: string, element: HTMLElement, isScopedNav: boolean } | null}
 */
export function getScopeForElement(el) {
  if (!el) return null

  const selfId = getScopeIdFromElement(el)
  if (selfId) {
    return {
      scopeId: selfId,
      element: el,
      isScopedNav: el.hasAttribute(SCOPED_NAV_ATTR),
    }
  }

  return findParentScope(el, false)
}

/**
 * Returns the full scope hierarchy for an element as a flat array of scope ID strings.
 * The first entry is the element's immediate (closest) scope; the last entry is the root scope.
 * Considers both bng-scoped-nav and bng-ui-scope attributes.
 *
 * @param {HTMLElement} el
 * @param {boolean} [excludeSelf=false] - If true, skip the element itself and only walk parents
 * @returns {string[]}
 */
export function getScopeHierarchy(el, excludeSelf = false) {
  if (!el) return []

  const hierarchy = []

  if (!excludeSelf) {
    const selfId = getScopeIdFromElement(el)
    if (selfId) hierarchy.push(selfId)
  }

  let current = el.parentElement
  while (current) {
    const scopeId = getScopeIdFromElement(current)
    if (scopeId) hierarchy.push(scopeId)
    current = current.parentElement
  }

  return hierarchy
}