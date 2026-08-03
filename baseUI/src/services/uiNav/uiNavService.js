import { GAME_UI_NAVIGATION_EVENT, GAME_UI_NAV_MAP_ENABLED_EVENT, DOM_UI_NAVIGATION_EVENT, UI_NAV_ACTION_GROUP, ACTIONS_BY_UI_EVENT, UI_SCOPE_ATTR } from "./constants.js"
import { UINavEventProcessor } from "./eventProcessor.js"
import { UINavActionHandlers } from "./actionHandlers.js"
import { ScopeRegistry } from "./handlers/scopeRegistry.js"
import { UINavHandlers } from "./handlers/index.js"
import { perfEnd, perfEndEvent, perfLog, perfMark, perfStart } from "./perf.js"
import { lua } from "@/bridge"
import logger from "@/services/logger"

class UINavService {
  constructor(eventBus) {
    this._eventBus = eventBus
    this._eventsActive = false
    this._globalEventsHooked = false
    this._activeScope = undefined
    this._blockedEvents = []

    this.scopeRegistry = new ScopeRegistry()
    this.eventProcessor = new UINavEventProcessor()
    this.actionHandlers = new UINavActionHandlers(eventBus)
    this.handlers = new UINavHandlers(this.scopeRegistry)

    this.useCrossfire = true
  }

  initialize() {
    // this._eventBus = eventBus
    // this.actionHandlers.setEventBus(eventBus)
    this.attachEventListeners()
    this.hookGlobalEvents()
  }

  handleGameEvent = (name, value, ...extras) => {
    // logger.debug("UINavService: handleGameEvent", { name, value, extras })
    let perfId = null
    let perfToken = null
    // DEV_ONLY >>
    perfId = perfLog(name, "eventBus:UINavigation", {
      value,
      extrasCount: extras.length,
      activeScope: this.activeScope,
    })
    perfToken = perfStart(perfId, "eventProcessor.processEvent")
    // << DEV_ONLY

    const context = {
      activeScope: this.activeScope,
      isEventBlocked: eventName => this.isEventBlocked(eventName),
    }
    // DEV_ONLY >>
    context.perfId = perfId
    // << DEV_ONLY

    const eventData = this.eventProcessor.processEvent(name, value, extras, context)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      hasEventData: !!eventData,
      blocked: this.isEventBlocked(name),
    })
    // << DEV_ONLY

    if (eventData) {
      this.dispatchDOMEvent(eventData)
    } else {
      // DEV_ONLY >>
      perfEndEvent(perfId, { result: "ignored" })
      // << DEV_ONLY
    }
  }

  /**
   * Add events to the internal blocklist
   * @param  {...string} events - Event names to block
   */
  blockEvents(...events) {
    const eventsToAdd = events.flat().filter(event => !this._blockedEvents.includes(event))
    this._blockedEvents.push(...eventsToAdd)
  }

  /**
   * Remove events from the internal blocklist
   * @param {...string} events - Event names to unblock
   */
  unblockEvents(...events) {
    const eventsToRemove = events.flat()
    this._blockedEvents = this._blockedEvents.filter(event => !eventsToRemove.includes(event))
  }

  /**
   * Set the entire blocklist (replaces existing)
   * @param {string[]} events - Array of event names to block
   */
  setBlockedEvents(events = []) {
    this._blockedEvents = [...events]
  }

  /**
   * Clear all blocked events
   */
  clearBlockedEvents() {
    this._blockedEvents = []
  }

  /**
   * Check if an event is blocked
   * @param {string} eventName - Event name to check
   * @returns {boolean} - True if blocked
   */
  isEventBlocked(eventName) {
    return this._blockedEvents.includes(eventName)
  }

  /**
   * @returns {string[]} Get current blocked events list (read-only copy)
   */
  getBlockedEvents() {
    return [...this._blockedEvents]
  }

  /**
   * Get deduplicated array of event names handled within a scope
   * @param {string} scopeId - The scope ID to query
   * @returns {string[]} Array of event name strings
   */
  getHandledEventsForScope(scopeId) {
    return this.scopeRegistry.getHandledEventsForScope(scopeId)
  }

  /**
   * Get detailed handler report for a scope
   * @param {string} scopeId - The scope ID to query
   * @returns {Array|null} Array of handler info objects, or null if scope not found
   */
  getScopeHandlerReport(scopeId) {
    return this.scopeRegistry.getScopeHandlerReport(scopeId)
  }

  handleEnabledChange = state => {
    this.eventsActive = state
  }

  dispatchDOMEvent = eventData => {
    // DEV_ONLY >>
    perfMark(eventData.perfId, "dispatchDOMEvent:start", {
      targetScope: eventData.targetScope,
    })
    // << DEV_ONLY

    const event = new CustomEvent(DOM_UI_NAVIGATION_EVENT, {
      detail: eventData,
      cancelable: true,
      bubbles: true,
    })

    // console.log("dispatchDOMEvent", eventData)
    let perfToken = null
    // DEV_ONLY >>
    perfToken = perfStart(eventData.perfId, "eventProcessor.getEventBroadcastElement")
    // << DEV_ONLY
    const targetElement = this.eventProcessor.getEventBroadcastElement(this.activeScope)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      tagName: targetElement?.tagName,
      activeScope: this.activeScope,
    })
    perfToken = perfStart(eventData.perfId, "DOM dispatchEvent")
    // << DEV_ONLY
    // console.log("targetElement", targetElement)
    targetElement.dispatchEvent(event)
    // DEV_ONLY >>
    perfEnd(perfToken, {
      defaultPrevented: event.defaultPrevented,
    })
    perfEndEvent(eventData.perfId, {
      defaultPrevented: event.defaultPrevented,
    })
    // << DEV_ONLY
  }

  /**
   * Fire an UI event
   *
   * @param      {string}  uiEvent  UI event name
   * @return     {Function}  A function that fires the UI event
   */
  fireEvent(uiEvent, value) {
    if (!this._eventBus) return

    if (value instanceof PointerEvent) {
      // specific for being on @click (used in the uiNavTracker)
      this._eventBus.emit(GAME_UI_NAVIGATION_EVENT, uiEvent, 1)
      this._eventBus.emit(GAME_UI_NAVIGATION_EVENT, uiEvent, 0)
    } else {
      this._eventBus.emit(GAME_UI_NAVIGATION_EVENT, uiEvent, typeof value === "number" ? value : value ? 1 : 0)
    }
  }

  setActiveScope(scopeId) {
    const previousScope = this._activeScope
    this._activeScope = scopeId
    if (previousScope !== scopeId && this._eventBus) {
      this._eventBus.emit("uiNav_scopeChanged", { scopeId, previousScope })
    }
  }

  /**
   * Get the active UI scope
   */
  get activeScope() {
    return this._activeScope
  }

  /**
   * Activate/Deactivate the UINavEvent system
   */
  activate(state = true) {
    this.attachEventListeners(state)
    this.eventsActive = state
  }

  /**
   * Hook/unhook global DOM event handlers
   */
  hookGlobalEvents(state = true) {
    // Always remove first so repeated initialization can't attach duplicate body listeners.
    // handleGlobalEvent is a stable arrow-function reference, so remove-before-add is reliable.
    document.body.removeEventListener(DOM_UI_NAVIGATION_EVENT, this.actionHandlers.handleGlobalEvent)
    if (state) {
      document.body.addEventListener(DOM_UI_NAVIGATION_EVENT, this.actionHandlers.handleGlobalEvent)
    }
    this.globalEventsHooked = state
  }

  /**
   * Attach/detach event bus listeners
   */
  attachEventListeners(state = true) {
    if (!this._eventBus) return

    this._eventBus.off(GAME_UI_NAVIGATION_EVENT, this.handleGameEvent)
    this._eventBus.off(GAME_UI_NAV_MAP_ENABLED_EVENT, this.handleEnabledChange)

    if (state) {
      this._eventBus.on(GAME_UI_NAVIGATION_EVENT, this.handleGameEvent)
      this._eventBus.on(GAME_UI_NAV_MAP_ENABLED_EVENT, this.handleEnabledChange)
    }
  }

  // Event filtering methods
  setFilteredEvents(...events) {
    this.clearFilteredEvents()
    const actionsToFilter = [...new Set(events.flat(Infinity))].map(event => ACTIONS_BY_UI_EVENT[event])
    lua.extensions.core_input_actionFilter.setGroup(UI_NAV_ACTION_GROUP, actionsToFilter)
    lua.extensions.core_input_actionFilter.addAction(0, UI_NAV_ACTION_GROUP, true)
  }

  setFilteredEventsAllExcept(...events) {
    const eventsToNotFilter = [...new Set(events.flat(Infinity))]
    const allEvents = Object.keys(ACTIONS_BY_UI_EVENT)
    const eventsToFilter = allEvents.filter(ev => !eventsToNotFilter.includes(ev))
    this.setFilteredEvents(eventsToFilter)
  }

  clearFilteredEvents() {
    lua.extensions.core_input_actionFilter.addAction(0, UI_NAV_ACTION_GROUP, false)
    lua.extensions.core_input_actionFilter.setGroup(UI_NAV_ACTION_GROUP, [])
  }

  /**
   * Get the scope hierarchy tree for all UI scopes within a root element.
   * Useful for debugging which scopes exist, their nesting, and what events they handle.
   *
   * @param {HTMLElement} [rootElement=document.body] - Root element to search within
   * @returns {Array<Object>} Array of root scope nodes, each with nested children
   */
  getScopeTree(rootElement = document.body) {
    const scopeElements = rootElement.querySelectorAll(`[${UI_SCOPE_ATTR}]`)
    const scopeMap = new Map()

    for (const el of scopeElements) {
      const scopeId = el.getAttribute(UI_SCOPE_ATTR)
      const scopedNavProps = el._bngScopedNav || {}

      scopeMap.set(scopeId, {
        scopeId,
        type: scopedNavProps.type || null,
        state: el.getAttribute("data-bng-scoped-nav-state") || null,
        trapPolicy: scopedNavProps.trapPolicy || null,
        handledEvents: this.scopeRegistry.getHandledEventsForScope(scopeId),
        handlers: this.scopeRegistry.getScopeHandlerReport(scopeId),
        parentScopeId: null,
        children: [],
      })
    }

    for (const [scopeId, scopeData] of scopeMap) {
      const el = [...scopeElements].find(e => e.getAttribute(UI_SCOPE_ATTR) === scopeId)
      const parentScopeEl = el?.parentElement?.closest(`[${UI_SCOPE_ATTR}]`)

      if (parentScopeEl) {
        const parentScopeId = parentScopeEl.getAttribute(UI_SCOPE_ATTR)
        if (scopeMap.has(parentScopeId)) {
          scopeData.parentScopeId = parentScopeId
          scopeMap.get(parentScopeId).children.push(scopeData)
        }
      }
    }

    return [...scopeMap.values()].filter(s => s.parentScopeId === null)
  }

  // Getters for system state
  set eventsActive(value) {
    this._eventsActive = value
  }

  get eventsActive() {
    return this._eventsActive
  }

  set globalEventsHooked(value) {
    this._globalEventsHooked = value
  }

  get globalEventsHooked() {
    return this._globalEventsHooked
  }

  get useCrossfire() {
    return this.actionHandlers.useCrossfire
  }

  set useCrossfire(value) {
    this.actionHandlers.setUseCrossfire(value)
  }

  get eventBus() {
    return this._eventBus
  }
}

import { getUINavServiceInstance } from "./serviceInstance.js"
export { getUINavServiceInstance, setUINavServiceInstance } from "./serviceInstance.js"

export { UINavService }
export default getUINavServiceInstance
