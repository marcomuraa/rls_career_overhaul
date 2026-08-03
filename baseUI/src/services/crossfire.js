import { isVisibleFast, isVisible, isOccluded as isNodeOccluded, dispatchKey } from "../utils/DOM.js"
import { perfClearCurrentEvent, perfEnd, perfEndEvent, perfLog, perfMark, perfSetCurrentEvent, perfStart } from "./uiNav/perf.js"
export { isVisibleFast }

export const NAVIGABLE_ELEMENTS_SELECTOR =
  "[is-bng-panel], [bng-nav-item], [ng-click], [href], [bng-all-clicks], [bng-all-clicks-no-nav], " +
  "[ui-sref], input, textarea, button, md-option, md-slider, md-select, md-checkbox"

// this disables navigation on the element itself
// usage: <div bng-no-nav>
export const NO_NAV_ATTR = "bng-no-nav"

// this disables navigation on the element's children, but not on the element itself
// usage: <div bng-no-child-nav="true">
export const NO_CHILD_NAV_ATTR = "bng-no-child-nav"

// this allows to "extend" navigable hot area to its container
// but keep in mind that container must be defined
export const NAV_PRIORITY_CONTAINER_ATTR = "bng-nav-priority-container"
export const NAV_PRIORITY_ATTR = "bng-nav-priority-item" // TODO: unused atm, implement later

const USE_LEGACY_CLASS = false // kind of used on old screens like bus routes. TODO: remove
const MENU_NAVIGATION_CLASS = "menu-navigation"

const OBSERVE_ATTRS = [
  "class",
  "style",
  "hidden",
  "disabled",
  NO_NAV_ATTR,
  NO_CHILD_NAV_ATTR,
  NAV_PRIORITY_CONTAINER_ATTR,
  "bng-nav-scroll",
  "bng-nav-scroll-force",
  "href",
  "ng-click",
  "ui-sref",
  "is-bng-panel",
  "bng-nav-item",
  "bng-all-clicks",
  "bng-all-clicks-no-nav",
]
const IGNORE_CLASSES = new Set([
  "focus-visible",
  "no-focus-visible",
  MENU_NAVIGATION_CLASS,
])

const IGNORE_TAGS = ["HTML", "BODY"]

// use bng-no-nav="true" to disable elements from navigation

/// Gamepad scroll (GE-3992)
// To allow something to scroll, add to that element "bng-nav-scroll" attribute.
// To enforce scroll on a non-parent element, add the "bng-nav-scroll-force" attribute to a target element. Multiple elements with this attribute can co-exist at once, but only the first scrollable will be scrolled.
// They both can be safely defined on a single element.
// To dynamically enable/disable scrolling, use bng-nav-scroll="false" (on both normal and forced).
/// Behaviour notes:
// - When there's nothing to scroll in an element, it does not catch the bindings.
// - If an element can't be scrolled, it tries to search for another one (inc. areas with "bng-nav-scroll-force" attr).
// - When focused inside an element with "bng-nav-scroll" attr and it has something to scroll, it is prioritised over an element with "bng-nav-scroll-force".
export const SCROLL_ATTR = "bng-nav-scroll" // attribute name that allows scrolling with a right thumbstick
export const SCROLL_FORCE_ATTR = "bng-nav-scroll-force" // attribute name that enforces scrolling in that area regardless of what focused but respecting the focused navigableScroll

const DIR = {
  LEFT: "left",
  UP: "up",
  RIGHT: "right",
  DOWN: "down"
}

const DIR_KEYS = {
  [DIR.LEFT]: 37,
  [DIR.UP]: 38,
  [DIR.RIGHT]: 39,
  [DIR.DOWN]: 40,
}

const AXIS_H = "horizontal"
const AXIS_V = "vertical"

export const SCROLL_EVENT_H = "rotate_h_cam"
export const SCROLL_EVENT_V = "rotate_v_cam"

const UI_SCROLL_EVENT_ACTIONS = {
  [SCROLL_EVENT_H]: AXIS_H,
  [SCROLL_EVENT_V]: AXIS_V,
}
const UI_SCROLL_ACTION_EVENTS = {
  [AXIS_H]: SCROLL_EVENT_H,
  [AXIS_V]: SCROLL_EVENT_V,
}

const SCALAR_EVENT_H = "focus_lr"
const SCALAR_EVENT_V = "focus_ud"

const UI_SCALAR_EVENT_ACTIONS = {
  [SCALAR_EVENT_H]: AXIS_H,
  [SCALAR_EVENT_V]: AXIS_V,
}

// D-pad navigation is converted into the same scalar axis model as stick input.
// This is the canonical dpad -> scalar mapping: -1/1 values feed the shared
// trigger, latch, repeat, and direction resolution pipeline below.
const UI_DIRECTION_EVENT_SCALAR_INPUTS = {
  focus_l: { axis: AXIS_H, value: -1 },
  focus_r: { axis: AXIS_H, value: 1 },
  focus_u: { axis: AXIS_V, value: 1 },
  focus_d: { axis: AXIS_V, value: -1 },
}

const UI_NAV_EVENT_ACTIONS = {
  "focus_u": "up",
  "focus_d": "down",
  "focus_l": "left",
  "focus_r": "right",
  "ok": "confirm",
  // "tab_l": "tab_l",
  // "tab_r": "tab_r",
}

export const MONITORED_UI_NAV_EVENTS = [
  ...Object.keys(UI_NAV_EVENT_ACTIONS),
  ...Object.keys(UI_SCALAR_EVENT_ACTIONS),
  // ...Object.keys(UI_SCROLL_EVENT_ACTIONS),
]

const NAV_TRIGGER_THRESHOLD = 0.5
// Scalar hysteresis: once a scalar axis (stick) is engaged above the trigger
// threshold it stays engaged until the magnitude drops below this lower release
// threshold. This prevents jitter around the trigger threshold from tearing
// down and recreating the press, which would otherwise cause repeated moves.
const NAV_RELEASE_THRESHOLD = 0.35
const NAV_REPEAT_THRESHOLD = 0.9
const THUMBSTICK_INITIAL_DELAY = 500
const THUMBSTICK_REPEAT_DELAY = 200

// Session-aware repeat state.
// `sessionKey` is an input-specific identity (e.g. "discrete:focus_d" or
// "scalar:vertical:-1") so discrete dpad and scalar stick presses never share
// the same repeat session. `pressId` is a monotonically increasing generation
// token captured by each scheduled repeat callback, so a stale timer that
// outlives its press (release, session takeover, clear) becomes a no-op.
let pressGeneration = 0

const thumbstickState = {
  timer: null,
  sessionKey: null,
  pressId: 0,
  repeatIntent: null,
  repeatAction: null,
  restrictTo: null,
}

// Optional hook to re-resolve the navigation boundary (`restrictTo`) right
// before each scheduled repeat tick. This lets consumers (e.g. scoped-nav)
// refresh the boundary dynamically as focus moves, instead of reusing the
// stale boundary captured when the repeat session started. A single resolver
// is stored so re-registration during reloads stays idempotent.
let repeatRestrictToResolver = null

// Register (or clear) the repeat boundary resolver. The resolver is called as
// `resolver({ intent, fallbackRestrictTo, activeElement })` and may return a
// boundary element to constrain the next repeat tick; returning a falsy value
// keeps the captured `fallbackRestrictTo`.
export function setRepeatRestrictToResolver(resolver) {
  repeatRestrictToResolver = typeof resolver === "function" ? resolver : null
}

function resolveRepeatRestrictTo(intent, fallbackRestrictTo) {
  if (!repeatRestrictToResolver) return fallbackRestrictTo
  try {
    const resolved = repeatRestrictToResolver({
      intent,
      fallbackRestrictTo,
      activeElement: typeof document !== "undefined" ? document.activeElement : null,
    })
    return resolved || fallbackRestrictTo
  } catch (err) {
    // DEV_ONLY >>
    console.warn("[crossfire] repeatRestrictToResolver threw", err)
    // << DEV_ONLY
    return fallbackRestrictTo
  }
}

const lastScalarValue = {
  horizontal: 0,
  vertical: 0
}

// Per-axis input ownership. While an axis is held by one input kind
// ("scalar" stick or "discrete" dpad), events from the other kind on the same
// axis are consumed but never navigate, reset latch state, or retrigger repeat.
// Ownership is claimed on the first active press and released when the owning
// kind sends its release (value 0 / below trigger threshold).
const axisOwner = {
  horizontal: null,
  vertical: null
}

function getInputKind(intent) {
  return intent?.scalar ? "scalar" : "discrete"
}

// DEV_ONLY >>
// Short-lived diagnostic tracing for the focus-nav repeat/latch pipeline (GE: UI nav repeat).
// Disabled by default. Toggle/inspect from the console:
//   window.uiNav.trace.enable()   // start capturing
//   window.uiNav.trace.dump()     // print captured entries as a table
//   window.uiNav.trace.log        // raw ring buffer
//   window.uiNav.trace.reset()    // clear buffer
//   window.uiNav.trace.disable()  // stop capturing
const navTrace = {
  enabled: false,
  echo: true, // also console.debug each entry while enabled
  log: [],
  max: 300,
}
// << DEV_ONLY

const TRACKER_ID = "crossfire" // for UiNavTracker

// Layout cache
let layoutGeneration = 0
let rectCache = null
let layoutMutationObserver = null
let layoutResizeObserver = null
let observedLayoutRoot = null
let layoutWindowListenersBound = false

function invalidateRectCache() {
  layoutGeneration += 1
  rectCache = null
}

function getObservedClassTokens(value = "") {
  const tokens = value.split(/\s+/).filter(Boolean)
  return tokens.filter(token => !IGNORE_CLASSES.has(token)).sort().join(" ")
}

function isIgnoredClassMutation(mutation) {
  if (mutation.type !== "attributes" || mutation.attributeName !== "class") return false
  const oldClass = getObservedClassTokens(mutation.oldValue || "")
  const newClass = getObservedClassTokens(mutation.target.getAttribute("class") || "")
  return oldClass === newClass
}

function shouldInvalidateRectCache(mutation) {
  return mutation.type === "childList" || !isIgnoredClassMutation(mutation)
}

function invalidateRectCacheForMutations(mutations) {
  if (mutations.some(shouldInvalidateRectCache)) invalidateRectCache()
}

function flushLayoutMutationRecords() {
  if (!layoutMutationObserver) return
  const mutations = layoutMutationObserver.takeRecords()
  if (mutations.length > 0) invalidateRectCacheForMutations(mutations)
}

function ensureLayoutObservers(root = document.body) {
  if (!root || observedLayoutRoot === root) return

  observedLayoutRoot?.removeEventListener("scroll", invalidateRectCache, true)
  layoutMutationObserver?.disconnect()
  layoutResizeObserver?.disconnect()
  observedLayoutRoot = root

  if (typeof MutationObserver === "function") {
    layoutMutationObserver = new MutationObserver(invalidateRectCacheForMutations)
    layoutMutationObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: OBSERVE_ATTRS,
    })
  }

  if (typeof ResizeObserver === "function") {
    layoutResizeObserver = new ResizeObserver(invalidateRectCache)
    layoutResizeObserver.observe(root)
  }

  root.addEventListener("scroll", invalidateRectCache, true)

  if (!layoutWindowListenersBound) {
    window.addEventListener("resize", invalidateRectCache)
    window.visualViewport?.addEventListener("resize", invalidateRectCache)
    layoutWindowListenersBound = true
  }

  invalidateRectCache()
}

function getActivePriorityContainer() {
  return document.activeElement?.closest?.(`[${NAV_PRIORITY_CONTAINER_ATTR}]`) || null
}

function getCachedRectLinks(root, forceAll, activePriorityContainer) {
  if (
    rectCache &&
    rectCache.root === root &&
    rectCache.forceAll === forceAll &&
    rectCache.activePriorityContainer === activePriorityContainer &&
    rectCache.generation === layoutGeneration
  ) {
    return rectCache.links
  }
  return null
}

function setCachedRectLinks(root, forceAll, activePriorityContainer, links) {
  rectCache = {
    root,
    forceAll,
    activePriorityContainer,
    generation: layoutGeneration,
    links,
  }
}

function getDirectionFromAxisValue(axis, value) {
  if (!axis || value === 0) return null

  const adjustedValue = axis === AXIS_V ? -value : value
  if (axis === AXIS_H) return adjustedValue > 0 ? DIR.RIGHT : DIR.LEFT
  return adjustedValue > 0 ? DIR.DOWN : DIR.UP
}

function getAxisStepValue(axis, value) {
  if (!axis || value === 0) return 0
  return (axis === AXIS_V ? -value : value) > 0 ? 1 : -1
}

export function getUINavNavigationIntent(detail, options = {}) {
  if (!detail || typeof detail.name !== "string") return null

  const triggerThreshold = options.triggerThreshold ?? NAV_TRIGGER_THRESHOLD
  const releaseThreshold = options.releaseThreshold ?? NAV_RELEASE_THRESHOLD
  const repeatThreshold = options.repeatThreshold ?? NAV_REPEAT_THRESHOLD
  const scalarAxis = UI_SCALAR_EVENT_ACTIONS[detail.name]
  if (scalarAxis) {
    const value = Number(detail.value) || 0
    const magnitude = Math.abs(value)
    // Hysteresis: while this scalar axis is already engaged, hold it active down
    // to the lower release threshold. Otherwise require the full trigger
    // threshold to engage. This stops threshold jitter from re-triggering.
    const activeThreshold = options.scalarEngaged === true ? releaseThreshold : triggerThreshold
    const active = value !== 0 && (activeThreshold <= 0 || magnitude > activeThreshold)
    return {
      eventName: detail.name,
      perfId: detail.perfId,
      axis: scalarAxis,
      value,
      magnitude,
      axisStepValue: active ? getAxisStepValue(scalarAxis, value) : 0,
      direction: active ? getDirectionFromAxisValue(scalarAxis, value) : null,
      active,
      repeatEligible: active && magnitude >= repeatThreshold,
      scalar: true,
    }
  }

  const directionInput = UI_DIRECTION_EVENT_SCALAR_INPUTS[detail.name]
  if (!directionInput) return null

  const active = detail.value === 1
  return {
    eventName: detail.name,
    perfId: detail.perfId,
    axis: directionInput.axis,
    value: active ? directionInput.value : 0,
    magnitude: active ? 1 : 0,
    axisStepValue: active ? getAxisStepValue(directionInput.axis, directionInput.value) : 0,
    direction: active ? getDirectionFromAxisValue(directionInput.axis, directionInput.value) : null,
    active,
    repeatEligible: active,
    scalar: false,
  }
}

export function focusOnElement(elem) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.focusOnElement", {
    tagName: elem?.tagName,
    className: elem?.className,
  })
  // << DEV_ONLY

  // note: contentEditable can have many values, so to definitely enable focus-visible we're going to force-change it in any case
  // TODO: check and update to use setAttribute instead of directly accessing the property
  const contentEditable = elem.contentEditable
  const tabIndex = elem.tabIndex
  if (!contentEditable) elem.contentEditable = true
  if (tabIndex !== 0) elem.tabIndex = 0
  // DEV_ONLY >>
  perfMark(null, "crossfire.focusOnElement.focus")
  // << DEV_ONLY
  elem.focus({ preventScroll: true })
  // DEV_ONLY >>
  perfMark(null, "crossfire.focusOnElement.restore")
  // << DEV_ONLY
  if (tabIndex > -1) elem.tabIndex = tabIndex
  if (contentEditable !== true) elem.contentEditable = contentEditable
  // DEV_ONLY >>
  perfEnd(perfToken, {
    activeTagName: document.activeElement?.tagName,
    focused: document.activeElement === elem,
  })
  // << DEV_ONLY
}

export function getNavigableElements(root = null, forceAll = false) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.getNavigableElements", {
    hasRoot: !!root,
    forceAll,
  })
  // << DEV_ONLY

  let res = [...(root || document.body).querySelectorAll(NAVIGABLE_ELEMENTS_SELECTOR)]
  if (!forceAll) {
    res = res.filter(elem => {
      const dontNavInside = elem.parentNode.closest(`[${NO_CHILD_NAV_ATTR}="1"], [${NO_CHILD_NAV_ATTR}="true"]`)
      if (dontNavInside) return false
      let noNav = elem.attributes.getNamedItem(NO_NAV_ATTR)
      return !noNav || noNav.value !== "true"
    })
  }
  //console.log('getNavigateableElements', res)
  // DEV_ONLY >>
  perfEnd(perfToken, {
    count: res.length,
  })
  // << DEV_ONLY
  return res
}


export function isNavigable(elem, forceAll = false) {
  if (!elem) return false
  if (IGNORE_TAGS.includes(elem.nodeName || elem.tagName)) return false
  if (USE_LEGACY_CLASS && elem.classList.contains(MENU_NAVIGATION_CLASS)) return true
  const parent = elem.parentNode
  if (!parent) return false
  const children = getNavigableElements(parent, forceAll)
  for (let child of children) if (child === elem) return true
  return false
}
export { isNavigable as isNavigatable }


export function uncollectRects() {
  if (!USE_LEGACY_CLASS) return
  const ns = getNavigableElements()
  for (let node of ns) {
    node.classList.remove(MENU_NAVIGATION_CLASS)
  }
}

let warnPrioNesting = window.beamng && !window.beamng.shipping

export function collectRects(direction, parent, forceAll = false) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.collectRects", {
    direction,
    hasParent: !!parent,
    forceAll,
  })
  // << DEV_ONLY

  const root = parent || document.body
  ensureLayoutObservers(document.body)
  flushLayoutMutationRecords()

  const activePriorityContainer = getActivePriorityContainer()
  const cachedLinks = getCachedRectLinks(root, forceAll, activePriorityContainer)
  if (cachedLinks) {
    // DEV_ONLY >>
    perfMark(null, "crossfire.collectRects.cacheHit", {
      direction,
      generation: layoutGeneration,
    })
    perfEnd(perfToken, {
      direction,
      cacheHit: true,
      up: cachedLinks.up.length,
      down: cachedLinks.down.length,
      left: cachedLinks.left.length,
      right: cachedLinks.right.length,
    })
    // << DEV_ONLY
    return cachedLinks
  }

  const links = {
    up: [],
    down: [],
    left: [],
    right: [],
  }
  const prioNodes = new WeakSet()
  const ns = getNavigableElements(root, forceAll)
  let availableCount = 0
  // DEV_ONLY >>
  perfMark(null, "crossfire.collectRects.measureCandidates", {
    candidates: ns.length,
    direction,
  })
  // << DEV_ONLY
  for (let node of ns) {
    // prevent invisible navigation
    if (!isAvailable(node)) {
      if (USE_LEGACY_CLASS) node.classList.remove(MENU_NAVIGATION_CLASS)
      continue
    }
    availableCount += 1
    let rectNode = node
    // check priorities
    const prioNode = node.closest(`[${NAV_PRIORITY_CONTAINER_ATTR}]`)
    if (prioNode && prioNode !== node && !prioNodes.has(prioNode)) {
      // prevent multiple priority items per container
      prioNodes.add(prioNode)
      // warn about nesting
      if (!warnPrioNesting) {
        const parent = prioNode.parentNode.closest(`[${NAV_PRIORITY_CONTAINER_ATTR}]`)
        if (parent) {
          console.warn("Priority container nesting is not supported. Please remove the nested priority container.\nParent:", parent, "\nChild:", prioNode)
          warnPrioNesting = true
        }
      }
      // prevent rect override if we're already inside of a priority container
      if (prioNode !== activePriorityContainer) {
        // TODO: check if container has priority item defined and remove from prioNodes if `node` is not the one
        rectNode = prioNode
      }
      // console.log("priority", node, prioNode)
    }
    // calculate
    const rect = rectNode.getBoundingClientRect() // TODO: cache these (read=all of these DOM calls, as they force a reflow=expensive), as they are super expensive
    // prevent offscreen navigation
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.screen.width || rect.top > window.screen.height) {
      if (USE_LEGACY_CLASS) node.classList.remove(MENU_NAVIGATION_CLASS)
      continue
    }
    if (USE_LEGACY_CLASS && !node.classList.contains(MENU_NAVIGATION_CLASS)) node.classList.add(MENU_NAVIGATION_CLASS)
    if (node.tabIndex !== 0) node.tabIndex = 0 // make element focusable
    const lnk = { dom: node, rect }
    links.up.push(lnk)
    links.down.push(lnk)
    links.left.push(lnk)
    links.right.push(lnk)
  }
  // DEV_ONLY >>
  perfMark(null, "crossfire.collectRects.sort", {
    available: availableCount,
    direction,
  })
  // << DEV_ONLY
  if (links.up) links.up.sort((a, b) => a.rect.top - b.rect.top)
  if (links.down) links.down.sort((a, b) => a.rect.bottom - b.rect.bottom)
  if (links.left) links.left.sort((a, b) => a.rect.left - b.rect.left)
  if (links.right) links.right.sort((a, b) => a.rect.right - b.rect.right)
  setCachedRectLinks(root, forceAll, activePriorityContainer, links)
  // console.log(direction ? links[direction] : links)
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction,
    candidates: ns.length,
    available: availableCount,
    up: links.up?.length,
    down: links.down?.length,
    left: links.left?.length,
    right: links.right?.length,
  })
  // << DEV_ONLY
  return links
}


export function isAvailable(node) {
  if (!isVisibleFast(node)) return false
  const style = document.defaultView.getComputedStyle(node, null)
  if (style["pointer-events"] === "none") return false
  if (!isVisible(node, style)) return false
  if (!isOccluded(node)) return true
  return false
}

export function isOccluded(node, dontIgnoreOffscreen = false) {
  const rects = node.getClientRects()
  for (let rect of rects) {
    if (!isNodeOccluded(node, rect, dontIgnoreOffscreen)) return false
  }
  return true
}


function getDistanceFast(curr, goal, direction, usePerpendicular = false) {
  let dx = Math.min(goal.right, curr.right) - Math.max(goal.left, curr.left)
  let dy = Math.min(goal.bottom, curr.bottom) - Math.max(goal.top, curr.top)

  if (dx === goal.right - goal.left) dx = curr.right - goal.left
  if (dy === goal.bottom - goal.top) dy = curr.bottom - goal.top

  let res = Infinity

  if (direction === DIR.DOWN && goal.bottom > curr.bottom) res = Math.max(0, goal.bottom - curr.top) - dx
  else if (direction === DIR.UP && goal.top < curr.top) res = Math.max(0, curr.top - goal.bottom) - dx
  else if (direction === DIR.RIGHT && goal.right > curr.right) res = Math.max(0, goal.left - curr.right) - dy
  else if (direction === DIR.LEFT && goal.left < curr.left) res = Math.max(0, curr.left - goal.right) - dy

  // perpendicular distance and modifier
  if (usePerpendicular && isFinite(res)) {
    const mod = 1.5
    if (direction === DIR.LEFT || direction === DIR.RIGHT) {
      // this helps on far passes, when something is obscured by another element on 1D marching
      res += Math.abs((curr.top + curr.bottom) / 2 - (goal.top + goal.bottom) / 2) * mod
    // } else {
    //   // vertical addition should be used only when necessary (there's no need for that atm)
    //   res += Math.abs((curr.left + curr.right) / 2 - (goal.left + goal.right) / 2) * mod
    }
  }

  return res
}


export function navigate(links, direction, activeOverride) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.navigate", {
    direction,
    linkCount: links[direction]?.length || 0,
    hasActiveOverride: !!activeOverride,
  })
  // << DEV_ONLY

  const result = links[direction] ? navigateNext(links[direction], direction, activeOverride) : false
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction,
    result: !!result,
  })
  // << DEV_ONLY
  return result
}

export function getNextNavigableInDirection(direction, restrictTo = undefined, activeOverride = null) {
  if (!direction) return null
  const links = collectRects(direction, restrictTo)
  return findNext(links[direction] || [], direction, activeOverride).nearestLink || null
}

export function wouldNavigateOutside(restrictTo, direction, activeOverride = null) {
  if (!restrictTo || !direction) return true
  const nearestLink = getNextNavigableInDirection(direction, restrictTo, activeOverride)
  return !nearestLink || !restrictTo.contains(nearestLink.dom)
}

/**
 * Wrap-around helper. Focuses the navigable item on the opposite edge of `container` for the given direction.
 * @param {HTMLElement} container
 * @param {DIR} direction
 * @returns {HTMLElement|false}
 */
export function focusWrapEdge(container, direction) {
  if (!container || !direction) return false
  const links = collectRects(direction, container)
  const list = links[direction]
  if (!list || list.length === 0) return false
  // links[direction] is sorted along that direction's axis (see collectRects).
  // The opposite edge is the far end for up/left, and the near end for down/right.
  const target = direction === DIR.UP || direction === DIR.LEFT ? list[list.length - 1] : list[0]
  if (!target || !container.contains(target.dom) || target.dom === document.activeElement) return false
  focusOnElement(target.dom)
  scrollFix(target, direction)
  return target.dom
}


function navigateNext(links, direction, activeOverride = null) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.navigateNext", {
    direction,
    linkCount: links.length,
    hasActiveOverride: !!activeOverride,
  })
  // << DEV_ONLY

  const active = activeOverride || document.activeElement

  if (active.nodeName === "BODY" || active.nodeName === "DIALOG") {
    window.requestAnimationFrame(() => {
      //locate first button (closest to topleft corner), and set its focus
      let firstLink = null
      let firstElementDistance = Number.MAX_SAFE_INTEGER
      for (let link of links) {
        const distance = link.rect.top * link.rect.top + link.rect.left * link.rect.left
        if (distance > firstElementDistance) continue
        firstElementDistance = distance
        firstLink = link
      }
      if (!firstLink) {
        console.log("Couldn't locate any button anywhere. Menu navigation won't work")
        return
      }
      // console.log("Focusing on a first button:", firstLink)
      focusOnElement(firstLink.dom)
      scrollFix(firstLink, direction)
    })
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      bodyFallback: true,
      result: true,
    })
    // << DEV_ONLY
    return true
  }

  /// If a list item has arrow elements navigate to those with left and right
  // if (active.nodeName === "MD-LIST-ITEM" && (direction === DIR_LEFT || direction === DIR_RIGHT)) {
  //   for (let i = 0; i < links.length; i += 1) {
  //     if (active.contains(links[i].dom )) {
  //       if (direction === DIR_LEFT && links[i].dom.classList.contains(DIR_LEFT)) {
  //         focusOnElement(links[i].dom)
  //         scrollFix(links[i], direction)
  //         return
  //       } else if (direction === DIR_RIGHT && links[i].dom.classList.contains(DIR_RIGHT)) {
  //         focusOnElement(links[i].dom)
  //         scrollFix(links[i], direction)
  //         return
  //       }
  //     }
  //   }
  // }

  if (
    (active.nodeName === "MD-SLIDER" && (direction === DIR.LEFT || direction === DIR.RIGHT)) ||
    (active.nodeName === "MD-OPTION" && (direction === DIR.UP || direction === DIR.DOWN)) ||
    (active.nodeName === "INPUT" && active.type === "range" && (direction === DIR.LEFT || direction === DIR.RIGHT))
  ) {
    fireKey(active, direction)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      firedKey: true,
      result: true,
    })
    // << DEV_ONLY
    return true
  }

  const { nearestLink, fixScroll } = findNext(links, direction, active)

  if (nearestLink) {
    // console.log("Focussing on a button:", nearestLink)
    focusOnElement(nearestLink.dom)
    fixScroll?.()
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      nearestTagName: nearestLink.dom?.tagName,
      result: true,
    })
    // << DEV_ONLY
    return nearestLink.dom
  } else {
    // patch for stuck md elements
    // repro: use controller, open any angular dropdown, press Back on controller, try to navigate anywhere
    if (links.length === 0) { // note: this condition won't work if debug is open
      const mdBackdrops = [...document.querySelectorAll("md-backdrop, .md-scroll-mask")]
      if (mdBackdrops.length > 0) {
        for (const el of mdBackdrops) {
          try {
            el.parentNode.removeChild(el)
          } catch (err) { }
        }
        const result = navigateNext(links, direction, activeOverride)
        // DEV_ONLY >>
        perfEnd(perfToken, {
          direction,
          clearedBackdrops: mdBackdrops.length,
          result: !!result,
        })
        // << DEV_ONLY
        return result
      }
    }
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      result: false,
    })
    // << DEV_ONLY
    return false
  }
}


export function findNext(links, direction, activeOverride = null) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.findNext", {
    direction,
    linkCount: links.length,
    hasActiveOverride: !!activeOverride,
  })
  // << DEV_ONLY

  const active = activeOverride || document.activeElement
  let activeRect = active.getBoundingClientRect()
  let fixScroll = true

  if (isScrolling(direction) && isOccluded(active, activeRect, true)) {
    // changes nav behaviour for occluded elements if we're scrolling with gamepad
    let axis, boundsame, boundchange
    switch (direction) {
      case DIR.UP:
      case DIR.DOWN:
        axis = "vertical"
        boundsame = ["left", "right"]
        boundchange = ["top", "bottom"]
        break
      case DIR.LEFT:
      case DIR.RIGHT:
        axis = "horizontal"
        boundsame = ["top", "bottom"]
        boundchange = ["left", "right"]
        break
    }
    // sometimes it fails (test case: career profiles with tooltip on a side)
    if (navScrolling[axis].area) {
      const bounds = navScrolling[axis].area.bounds
      const axisBound = activeRect[boundchange[1]] < bounds[0] ? 0 : 1
      activeRect = {
        [boundsame[0]]: activeRect[boundsame[0]],
        [boundsame[1]]: activeRect[boundsame[1]],
        [boundchange[0]]: bounds[axisBound],
        [boundchange[1]]: bounds[axisBound],
      }
      fixScroll = false
    }
  }

  const dir = direction === DIR.RIGHT || direction === DIR.DOWN ? 1 : -1
  const len = links.length
  const start = dir === 1 ? 0 : len - 1
  let minDistance = Infinity
  let nearestLink = null
  // DEV_ONLY >>
  perfMark(null, "crossfire.findNext.scan", {
    direction,
    linkCount: len,
  })
  // << DEV_ONLY
  for (let i = start; 0 <= i && i < len; i += dir) {
    // don't navigate to current element again
    if (links[i].dom === active) continue
    const distance = getDistanceFast(activeRect, links[i].rect, direction, true)
    if (distance < minDistance) {
      minDistance = distance
      nearestLink = links[i]
    }
  }

  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction,
    linkCount: len,
    hasNearest: !!nearestLink,
    minDistance: isFinite(minDistance) ? minDistance : null,
  })
  // << DEV_ONLY

  return {
    nearestLink,
    fixScroll: fixScroll ? () => scrollFix(nearestLink, direction) : null,
  }
}

const navScrolling = {
  // runtime variables, compatible with crossfire's "link" object
  running: false,
  listening: { vertical: false, horizontal: false },
  dom: null,
  rect: null,
  vertical: { active: false, amount: 0, area: null },
  horizontal: { active: false, amount: 0, area: null },
  hint: { show: false },
}


function drawScrollHint() {
  const show = isScrolling()
  if (navScrolling.hint.show === show) return
  navScrolling.hint.show = show
  let elem = document.getElementById("xf_scroll") // not caching just in case
  if (elem) elem.style.display = show ? "" : "none"
}


// this function is called on thumbstick event
export function navigateScroll(axis, amount) {
  // navScrolling[axis].active = Math.abs(amount) > 0.2
  // if (!navScrolling[axis].active) {
  //   navScrolling[axis].area = null
  //   return
  // }
  if (axis === AXIS_V) amount = -amount
  navScrolling[axis].amount = amount * 15
  if (Math.abs(navScrolling[axis].amount) < 1) {
    navScrolling[axis].active = false
    return
  }
  navScrolling[axis].active = true
  const dom = document.activeElement
  if (navScrolling.dom !== dom) {
    navScrolling.dom = dom
    navScrolling.rect = dom.getBoundingClientRect()
    navScrolling[axis === AXIS_H ? AXIS_V : AXIS_H].active = false
  }
  const area = findScrollable(navScrolling, axis, true)
  navScrolling[axis].area = area
  if (!area) {
    navScrolling[axis].active = false
    return
  }
  if (navScrolling.running) return true
  window.requestAnimationFrame(function scrl() {
    let set = {}
    for (let axis of [AXIS_V, AXIS_H]) {
      const cur = navScrolling[axis]
      if (!cur.active || !cur.area) continue
      let pos = cur.area.parent[cur.area.readby] + navScrolling[axis].amount
      if (pos > cur.area.fullsize) cur.active = false
      else set[cur.area.moveby] = pos
    }
    navScrolling.running = Object.keys(set).length > 0
    if (navScrolling.running) {
      area.parent.scrollTo({ ...set, behavior: "instant" })
      invalidateRectCache()
      document.dispatchEvent(new CustomEvent("mdtooltiphide")) // to hide opened tooltips (see angular-material.js)
      window.requestAnimationFrame(scrl)
    }
  })
  return true // we initiated some scrolling
}


function scrollCatch(axis, enable) {
  if (navScrolling.listening[axis] === enable) return
  // console.log(`want to ${enable ? "enable" : "disable"} ${axis} scroll catch...`)
  const cur = isScrolling()
  navScrolling.listening[axis] = enable
  if (cur === isScrolling()) return
  // this will hook the events to UI only, preventing the camera from moving
  bngApi.engineLua(`local o = scenetree.findObject("MenuScrollActionMap"); if o then o:${enable ? "push" : "pop"}() end`)
  if (window.bngVue.uiNavTracker) {
    // TODO: test
    if (enable) window.bngVue.uiNavTracker.addEvent(UI_SCROLL_ACTION_EVENTS[axis], TRACKER_ID)
    else window.bngVue.uiNavTracker.removeEvent(UI_SCROLL_ACTION_EVENTS[axis], TRACKER_ID)
  }
  // console.log(`scroll catch ${enable ? "enabled" : "disabled"} (called by ${axis} scroll event)`)
}


function isScrolling(direction = undefined) {
  let scrolling = false
  if (!direction) scrolling = navScrolling.listening.horizontal || navScrolling.listening.vertical
  else if (direction === DIR.UP || direction === DIR.DOWN) scrolling = navScrolling.listening.vertical
  else if (direction === DIR.LEFT || direction === DIR.RIGHT) scrolling = navScrolling.listening.horizontal
  return scrolling
}
function isScrollListening(axis = undefined) {
  let listening = false
  if (!axis) listening = navScrolling.listening.horizontal || navScrolling.listening.vertical
  else listening = navScrolling.listening[axis]
  return listening
}


function findScrollable(link, axis, thumbstick) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.findScrollable", {
    axis,
    thumbstick: !!thumbstick,
    tagName: link?.dom?.tagName,
  })
  // << DEV_ONLY

  // default axis is vertical
  if (axis !== AXIS_V && axis !== AXIS_H) axis = AXIS_V
  const opts = axis === AXIS_H
    ? { moveby: "left", readby: "scrollLeft", size: "width", scroll: "scrollWidth", client: "clientWidth", overflow: "overflow-x" }
    : { moveby: "top", readby: "scrollTop", size: "height", scroll: "scrollHeight", client: "clientHeight", overflow: "overflow-y" }
  let forced = false
  // find scrollable parent
  let parent, fullsize, size
  let node = link.dom?.parentNode
  function setParent(node) {
    if (!node) return
    if (thumbstick) {
      let noNav = node.attributes.getNamedItem(SCROLL_ATTR)
      if (noNav && noNav.value === "false") return
    }
    const styles = document.defaultView.getComputedStyle(node, null)
    // console.log(styles.position, node, node.getBoundingClientRect())
    if (styles[opts.overflow] === "auto" || styles[opts.overflow] === "scroll") {
      fullsize = node[opts.scroll]
      size = node[opts.client]
      // console.log(fullsize, size, node)
      if (fullsize > size) parent = node
    }
  }
  while (node && node.isConnected && node.nodeType === Node.ELEMENT_NODE) {
    // with thumbstick, only look for elements with the scroll attribute
    // without thumbstick, check all parents for scrollability
    // and on top of that, check if elements has anything to scroll to dive further when we're at the end of scroll
    if (!thumbstick || node.attributes.getNamedItem(SCROLL_ATTR)) {
      setParent(node)
      if (parent) break
    }
    node = node.parentNode
  }
  if (!parent) {
    const elems = document.querySelectorAll(`[${SCROLL_FORCE_ATTR}]`)
    for (let elem of elems) {
      setParent(elem)
      if (parent) {
        forced = true
        break
      }
    }
  }
  scrollCatch(axis, !!parent)
  drawScrollHint()
  if (!parent) {
    // DEV_ONLY >>
    perfEnd(perfToken, {
      axis,
      result: false,
    })
    // << DEV_ONLY
    return null
  }
  let start = 0
  const styles = document.defaultView.getComputedStyle(parent, null)
  // autoscrolling misbehaves? check if position style is defined here
  if (["relative", "absolute", "static", "fixed"].includes(styles.position)) start += parent.getBoundingClientRect()[opts.moveby]
  // calculate the size of view bounds to ensure items visibility
  const pad = link.rect ? Math.max(size / 4, link.rect[opts.size]) : (size / 4)
  const bounds = [start + pad, start + size - pad]
  /// DEBUG
  // const id = `xfline_dbg`
  // let elem = document.getElementById(id)
  // if (!elem) {
  //   elem = document.createElement("div")
  //   elem.setAttribute("id", id)
  //   elem.style.position = "absolute"
  //   elem.style.pointerEvents = "none"
  //   elem.style.zIndex = 1000000
  //   document.body.appendChild(elem)
  // }
  // if (axis === AXIS_H) {
  //   elem.style.top = elem.style.bottom = 0
  //   elem.style.left = `${parent.style.left + bounds[0]}px`
  //   elem.style.width = `${bounds[1] - bounds[0]}px`
  // } else {
  //   elem.style.left = elem.style.right = 0
  //   elem.style.top = `${parent.style.top + bounds[0]}px`
  //   elem.style.height = `${bounds[1] - bounds[0]}px`
  // }
  // elem.style[axis === AXIS_H ? "borderLeft" : "borderTop"] =
  //   elem.style[axis === AXIS_H ? "borderRight" : "borderBottom"] =
  //   "2px dashed magenta"
  /// /DEBUG
  const result = {
    parent,
    moveby: opts.moveby,
    readby: opts.readby,
    bounds,
    fullsize,
    start: 0,
    finish: fullsize - size,
    forced,
  }
  // DEV_ONLY >>
  perfEnd(perfToken, {
    axis,
    result: true,
    forced,
    fullsize,
    size,
  })
  // << DEV_ONLY
  return result
}


// scrolls the items into a narrower view
export function scrollFix(link, direction) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(null, "crossfire.scrollFix", {
    direction,
    tagName: link?.dom?.tagName,
  })
  // << DEV_ONLY

  const area = findScrollable(link, direction === DIR.UP || direction === DIR.DOWN ? AXIS_V : AXIS_H)
  if (!area) {
    // find if there are something else for thumbstick scroll
    if (document.querySelector(`[${SCROLL_ATTR}], [${SCROLL_FORCE_ATTR}]`))
      findScrollable(link, direction === DIR.LEFT || direction === DIR.RIGHT ? AXIS_V : AXIS_H)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      result: false,
    })
    // << DEV_ONLY
    return
  }
  if (area.forced) {
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction,
      forced: true,
      result: false,
    })
    // << DEV_ONLY
    return // prevent scrolling forced area with focus on a different element
  }
  let mov = -1
  if (direction === DIR.UP || direction === DIR.DOWN) {
    if (link.rect.top < area.bounds[0]) mov = Math.max(area.parent.scrollTop - area.bounds[0] + link.rect.top, area.start)
    else if (link.rect.bottom > area.bounds[1]) mov = Math.min(area.parent.scrollTop - area.bounds[1] + link.rect.bottom, area.finish)
  } else {
    if (link.rect.left < area.bounds[0]) mov = Math.max(area.parent.scrollLeft - area.bounds[0] + link.rect.left, area.start)
    else if (link.rect.right > area.bounds[1]) mov = Math.min(area.parent.scrollLeft - area.bounds[1] + link.rect.right, area.finish)
  }
  // console.log(JSON.stringify({direction, /*fullheight, height, top, pad,*/ scrolled: area.parent.scrollTop, area.bounds, l_top: link.rect.top, l_bottom: link.rect.bottom, movy}, null, 2))
  if (mov > -1) {
    area.parent.scrollTo({ [area.moveby]: mov, behavior: "instant" }) // smooth|instant
    invalidateRectCache()
  }
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction,
    moved: mov > -1,
    moveTo: mov > -1 ? mov : null,
  })
  // << DEV_ONLY
}


function fireKey(element, direction) {
  let key = DIR_KEYS[direction]
  key && dispatchKey(key, element)
}

// Helper function to clear the timer
function clearThumbstickTimer(axis = null) {
  if (axis && thumbstickState.repeatIntent?.axis !== axis) return
  if (thumbstickState.timer) {
    clearTimeout(thumbstickState.timer)
    thumbstickState.timer = null
  }
  // Invalidate any in-flight repeat callback that captured the previous pressId.
  thumbstickState.pressId = ++pressGeneration
  thumbstickState.sessionKey = null
  thumbstickState.repeatIntent = null
  thumbstickState.repeatAction = null
  thumbstickState.restrictTo = null
}

// TODO: finalize event repeater
function processThumbstickMovement(axis, value, restrictTo) {
  // Invert Y axis values
  if (axis === AXIS_V) {
    value = -value
  }

  const direction = axis === AXIS_H ? (value > 0 ? DIR.RIGHT : DIR.LEFT) : (value > 0 ? DIR.DOWN : DIR.UP)
  const currentDirection = `${axis}:${direction}`

  // If direction changed, reset the timer
  if (currentDirection !== thumbstickState.lastDirection) {
    clearThumbstickTimer()
    thumbstickState.lastDirection = currentDirection
    thumbstickState.isInitial = true
  }

  // Process the movement
  const RESULT = navigate(collectRects(direction, restrictTo), direction)
  if (!RESULT) {
    console.log("Navigation failed")
  }

  // Set up the next movement timer
  // const delay = thumbstickState.isInitial ? THUMBSTICK_INITIAL_DELAY : THUMBSTICK_REPEAT_DELAY
  // thumbstickState.isInitial = false

  // thumbstickState.timer = setTimeout(() => {
  //   if (Math.abs(value) > THUMBSTICK_DEADZONE) {
  //     processThumbstickMovement(axis, value, restrictTo)
  //   }
  // }, delay)
}

let lastTime = 0, lastStack = ""

// Stable, input-specific identity for a repeat session. Discrete dpad events
// and scalar stick events are kept in separate sessions so they cannot
// hijack each other's repeat timer on the same axis/direction.
function getNavigationRepeatKey(intent) {
  if (!intent || !intent.axis || !intent.axisStepValue) return null
  return intent.scalar
    ? `scalar:${intent.axis}:${intent.axisStepValue}`
    : `discrete:${intent.eventName}`
}

// DEV_ONLY >>
// Records one decision in the repeat/latch pipeline.
// `type` is one of: "received" | "immediate" | "latched" | "release" | "repeat" | "conflict".
// "conflict" means the event was consumed because another input kind (scalar
// stick vs discrete dpad) currently owns the same axis.
function traceNav(type, intent, detail = null, extra = {}) {
  if (!navTrace.enabled) return
  const axis = intent?.axis ?? null
  const entry = {
    t: Math.round((performance?.now ? performance.now() : Date.now()) * 100) / 100,
    type,
    name: detail?.name ?? intent?.eventName ?? null,
    value: detail?.value ?? intent?.value ?? null,
    axis,
    axisStepValue: intent?.axisStepValue ?? null,
    scalar: intent?.scalar ?? null,
    repeatEligible: intent?.repeatEligible ?? null,
    direction: intent?.direction ?? null,
    repeatKey: getNavigationRepeatKey(intent),
    activeRepeatKey: thumbstickState.sessionKey,
    pressId: thumbstickState.pressId ?? null,
    lastScalarValue: axis ? lastScalarValue[axis] : null,
    hasTimer: !!thumbstickState.timer,
    perfId: intent?.perfId ?? detail?.perfId ?? null,
    ...extra,
  }
  navTrace.log.push(entry)
  if (navTrace.log.length > navTrace.max) navTrace.log.shift()
  if (navTrace.echo) console.debug(`[UINavTrace] ${type}`, entry)
}
// << DEV_ONLY

function performNavigationIntent(intent, restrictTo) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(intent?.perfId, "crossfire.performNavigationIntent", {
    direction: intent?.direction,
    restrictTo: !!restrictTo,
    scalar: !!intent?.scalar,
  })
  // << DEV_ONLY

  if (!intent?.direction) {
    // DEV_ONLY >>
    perfEnd(perfToken, { result: false })
    // << DEV_ONLY
    return false
  }
  const links = collectRects(intent.direction, restrictTo)
  const result = navigate(links, intent.direction)
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction: intent.direction,
    result: !!result,
  })
  // << DEV_ONLY
  return true
}

function scheduleNavigationRepeat(intent, restrictTo, isFirstRepeat = false, repeatAction = performNavigationIntent) {
  const sessionKey = getNavigationRepeatKey(intent)
  if (!sessionKey || !intent.repeatEligible) {
    clearThumbstickTimer(intent?.axis)
    return
  }

  if (thumbstickState.sessionKey !== sessionKey) {
    // A different input takes over: drop the previous session (which also
    // invalidates its pending pressId) and restart from the initial delay.
    clearThumbstickTimer()
    isFirstRepeat = true
  } else if (thumbstickState.timer) {
    // Same session is already counting down: refresh the captured intent but
    // do not restart the delay or mint a new press token.
    thumbstickState.repeatIntent = intent
    thumbstickState.repeatAction = repeatAction
    thumbstickState.restrictTo = restrictTo
    return
  }

  const pressId = ++pressGeneration
  thumbstickState.sessionKey = sessionKey
  thumbstickState.pressId = pressId
  thumbstickState.repeatIntent = intent
  thumbstickState.repeatAction = repeatAction
  thumbstickState.restrictTo = restrictTo
  thumbstickState.timer = setTimeout(() => {
    // Token-safe: only fire if this press session is still the active one.
    if (thumbstickState.pressId !== pressId || thumbstickState.sessionKey !== sessionKey) return

    const repeatIntent = thumbstickState.repeatIntent
    const repeatAction = thumbstickState.repeatAction
    const repeatRestrictTo = resolveRepeatRestrictTo(repeatIntent, thumbstickState.restrictTo)
    thumbstickState.timer = null

    if (!repeatIntent?.repeatEligible) {
      clearThumbstickTimer()
      return
    }

    if (typeof repeatAction === "function") {
      // DEV_ONLY >>
      traceNav("repeat", repeatIntent, null, { restrictTo: !!repeatRestrictTo })
      // << DEV_ONLY
      repeatAction(repeatIntent, repeatRestrictTo)
      scheduleNavigationRepeat(repeatIntent, repeatRestrictTo, false, repeatAction)
    } else {
      axisOwner[repeatIntent.axis] = null
      lastScalarValue[repeatIntent.axis] = 0
      clearThumbstickTimer(repeatIntent.axis)
    }
  }, isFirstRepeat ? THUMBSTICK_INITIAL_DELAY : THUMBSTICK_REPEAT_DELAY)
}

export function consumeUINavNavigationIntent(detail, options = {}) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(detail?.perfId, "crossfire.consumeUINavNavigationIntent", {
    name: detail?.name,
    value: detail?.value,
    restrictTo: !!options.restrictTo,
  })
  // << DEV_ONLY

  // This mutates latch/repeat state. Use getUINavNavigationIntent() for read-only
  // guards such as scoped-nav boundary checks or escape policies.
  // Apply scalar hysteresis: if this axis is currently held by a scalar (stick)
  // session, evaluate the intent against the lower release threshold so jitter
  // around the trigger threshold doesn't release and re-press the axis.
  const hysteresisAxis = UI_SCALAR_EVENT_ACTIONS[detail.name]
  const scalarEngaged =
    !!hysteresisAxis && axisOwner[hysteresisAxis] === "scalar" && lastScalarValue[hysteresisAxis] !== 0
  const intent = getUINavNavigationIntent(detail, { ...options, scalarEngaged })
  if (!intent) {
    // DEV_ONLY >>
    perfEnd(perfToken, { result: "no-intent" })
    // << DEV_ONLY
    return null
  }

  const kind = getInputKind(intent)

  if (!intent.active) {
    // A release from a non-owning input kind must not tear down the owner's
    // latch/repeat session on this axis. Ignore it as a pure consume.
    if (axisOwner[intent.axis] && axisOwner[intent.axis] !== kind) {
      // DEV_ONLY >>
      traceNav("conflict", intent, detail, { phase: "release", owner: axisOwner[intent.axis] })
      // << DEV_ONLY
      // DEV_ONLY >>
      perfEnd(perfToken, {
        direction: intent.direction,
        active: false,
        consumeOnly: true,
        conflict: true,
      })
      // << DEV_ONLY
      return { ...intent, consumeOnly: true }
    }
    // DEV_ONLY >>
    traceNav("release", intent, detail)
    // << DEV_ONLY
    axisOwner[intent.axis] = null
    lastScalarValue[intent.axis] = 0
    clearThumbstickTimer(intent.axis)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction: intent.direction,
      active: false,
      consumeOnly: true,
    })
    // << DEV_ONLY
    return { ...intent, consumeOnly: true }
  }

  // Another input kind currently owns this axis: consume without navigating,
  // resetting latch state, or retriggering repeat until that owner releases.
  if (axisOwner[intent.axis] && axisOwner[intent.axis] !== kind) {
    // DEV_ONLY >>
    traceNav("conflict", intent, detail, { phase: "active", owner: axisOwner[intent.axis] })
    // << DEV_ONLY
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction: intent.direction,
      active: true,
      consumeOnly: true,
      conflict: true,
    })
    // << DEV_ONLY
    return { ...intent, consumeOnly: true }
  }

  axisOwner[intent.axis] = kind

  if (lastScalarValue[intent.axis] === intent.axisStepValue) {
    // DEV_ONLY >>
    traceNav("latched", intent, detail)
    // << DEV_ONLY
    scheduleNavigationRepeat(intent, options.restrictTo, false, options.repeatAction || null)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      direction: intent.direction,
      active: true,
      latched: true,
      consumeOnly: true,
    })
    // << DEV_ONLY
    return { ...intent, consumeOnly: true, latched: true }
  }

  // DEV_ONLY >>
  traceNav("immediate", intent, detail)
  // << DEV_ONLY
  lastScalarValue[intent.axis] = intent.axisStepValue
  scheduleNavigationRepeat(intent, options.restrictTo, true, options.repeatAction || null)
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction: intent.direction,
    active: true,
    scalar: intent.scalar,
    repeatEligible: intent.repeatEligible,
  })
  // << DEV_ONLY
  return intent
}

function handleNavigationIntent(intent, restrictTo) {
  let perfToken = null
  // DEV_ONLY >>
  perfToken = perfStart(intent?.perfId, "crossfire.handleNavigationIntent", {
    direction: intent?.direction,
    consumeOnly: !!intent?.consumeOnly,
    restrictTo: !!restrictTo,
  })
  // << DEV_ONLY

  if (!intent) {
    // DEV_ONLY >>
    perfEnd(perfToken, { result: false })
    // << DEV_ONLY
    return false
  }
  if (intent.consumeOnly) {
    // DEV_ONLY >>
    perfEnd(perfToken, {
      result: true,
      consumeOnly: true,
    })
    // << DEV_ONLY
    return true
  }

  performNavigationIntent(intent, restrictTo)
  // DEV_ONLY >>
  perfEnd(perfToken, {
    direction: intent.direction,
    result: true,
  })
  // << DEV_ONLY
  return true
}

export function handleUINavEvent(e, restrictTo = undefined) {
  const d = e.detail
  // DEV_ONLY >>
  traceNav("received", null, d, { restrictTo: !!restrictTo })
  // << DEV_ONLY
  // const globalAngularRootScope = window.globalAngularRootScope
  let handled = false
  let perfId = d.perfId
  let ownsPerfEvent = false
  // DEV_ONLY >>
  if (!perfId) {
    perfId = perfLog(d.name, "crossfire:direct-entry", {
      value: d.value,
      restrictTo: !!restrictTo,
    })
    if (perfId) {
      d.perfId = perfId
      ownsPerfEvent = true
    }
  }
  perfSetCurrentEvent(perfId)
  perfMark(perfId, "crossfire.handleUINavEvent:start", {
    restrictTo: !!restrictTo,
    value: d.value,
  })
  // << DEV_ONLY

  // Default navigation path: both analog stick scalar events and dpad focus
  // events go through the shared scalar-normalized pipeline.
  const navigationIntent = consumeUINavNavigationIntent(d, { restrictTo, repeatAction: performNavigationIntent })
  if (navigationIntent) {
    handled = handleNavigationIntent(navigationIntent, restrictTo)
  }

  if (handled && UI_DIRECTION_EVENT_SCALAR_INPUTS[d.name]) {
    // DEV_ONLY >>
    perfMark(perfId, "crossfire.handleUINavEvent:end", {
      handled,
      defaultPrevented: e.defaultPrevented,
      dpad: true,
    })
    if (ownsPerfEvent) perfEndEvent(perfId, { handled, direct: true })
    perfClearCurrentEvent(perfId)
    // << DEV_ONLY
    return handled
  }

  if (handled && d.name in UI_SCALAR_EVENT_ACTIONS) {
    handled = true
  }

  // simple navigation, clicks, tabs
  if (d.name in UI_NAV_EVENT_ACTIONS) {
    const action = UI_NAV_EVENT_ACTIONS[d.name]

    switch (action) {

      // Navigate
      case "up":
      case "down":
      case "left":
      case "right":
        // Already handled by the normalized navigation path above.
        break

      // Click
      case "confirm":
        if (d.value == 1) {
          const activeEl = document.activeElement
          if (isNavigable(activeEl)) {
            if (typeof activeEl.click === "function") {
              activeEl.click()
            } else {
              activeEl.dispatchEvent(new CustomEvent("click"))
            }
          }
          handled = true
        }
        break

      // Tab left and right (TODO - move away from Angular broadcast here, eventually)
      // case "tab_l":
      //   if (d.value == 1) {
      //     globalAngularRootScope && globalAngularRootScope.$broadcast("$tabLeft")
      //     handled = true
      //   }
      //   break
      // case "tab_r":
      //   if (d.value == 1) {
      //     globalAngularRootScope && globalAngularRootScope.$broadcast("$tabRight")
      //     handled = true
      //   }
      //   break

    }

  // scroll scrollable areas
  } else if (d.name in UI_SCROLL_EVENT_ACTIONS) {
    const axis = UI_SCROLL_EVENT_ACTIONS[d.name]
    navigateScroll(axis, d.value)
    // wth? it's very expensive to do on every tick
    // handled = !!findScrollable(navScrolling, UI_SCROLL_EVENT_ACTIONS[SCROLL_EVENT_H], true) ||
    //           !!findScrollable(navScrolling, UI_SCROLL_EVENT_ACTIONS[SCROLL_EVENT_V], true) ||
    //           navScrolling.horizontal.active || navScrolling.vertical.active
    // proper way to check
    // handled = isScrolling()
    // even better in case of uinav
    handled = isScrollListening(axis)
  }

  if (handled) {
    e.preventDefault()
  }

  // DEV_ONLY >>
  perfMark(perfId, "crossfire.handleUINavEvent:end", {
    handled,
    defaultPrevented: e.defaultPrevented,
  })
  if (ownsPerfEvent) perfEndEvent(perfId, { handled, direct: true })
  perfClearCurrentEvent(perfId)
  // << DEV_ONLY
}

// DEV_ONLY >>
function dumpNavTrace(limit = navTrace.max) {
  const rows = navTrace.log.slice(-limit)
  console.table(rows.map(({ t, type, name, value, axis, axisStepValue, scalar, repeatEligible, repeatKey, activeRepeatKey, pressId, lastScalarValue, hasTimer }) => ({
    t,
    type,
    name,
    value,
    axis,
    axisStepValue,
    scalar,
    repeatEligible,
    repeatKey,
    activeRepeatKey,
    pressId,
    lastScalarValue,
    hasTimer,
  })))
  return rows
}

window.uiNav = window.uiNav || {}
window.uiNav.trace = {
  get log() { return navTrace.log },
  get enabled() { return navTrace.enabled },
  enable(echo = true) {
    navTrace.enabled = true
    navTrace.echo = !!echo
    console.debug(`[UINavTrace] enabled (echo=${navTrace.echo})`)
  },
  disable() {
    navTrace.enabled = false
    console.debug("[UINavTrace] disabled")
  },
  reset() {
    navTrace.log.length = 0
  },
  dump: dumpNavTrace,
}
// << DEV_ONLY
