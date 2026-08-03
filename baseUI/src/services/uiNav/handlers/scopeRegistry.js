/**
 * ScopeRegistry - Manages scope-based UI navigation handlers
 * Handles registration, initialization, and cleanup of handlers within UI scopes
 */

import { DOM_UI_NAVIGATION_EVENT, UI_SCOPE_ATTR } from "../constants.js"
import { eventMatchesDescriptor } from "../utils.js"
import { getUINavServiceInstance } from "../serviceInstance.js"
import { SCOPED_NAV_PROPERTY_NAME, SCOPED_NAV_ATTR } from "@/services/scopedNav/constants"
import useControls from "@/services/controls"
import { UINAVHANDLER_HOOK_RESULT } from "../constants.js"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"

export class ScopeRegistry {
  constructor() {
    this.scopeRegistries = new WeakMap()
    this.depthCache = new WeakMap()
    this.cleanupTimers = new Map()
    this.scopeIdElements = new Map()

    // Scope-level hooks
    this.hooks = {
      beforeExecute: [],
      afterExecute: [],
    }

    // Handler-level filters
    this.handlerHooks = {
      beforeExecute: [],
      afterExecute: [],
    }
  }

  /**
   * Register hooks for external systems (like ScopedNav)
   */
  registerScopeHook(stage, hook, priority = 100) {
    if (!this.hooks[stage]) {
      throw new Error(`ScopeRegistry: invalid stage ${stage}`)
    }

    this.hooks[stage].push({ hook, priority })
    this.hooks[stage].sort((a, b) => a.priority - b.priority)
  }

  registerHandlerHook(stage, hook, priority = 100) {
    if (!this.handlerHooks[stage]) {
      throw new Error(`ScopeRegistry: invalid hook stage ${stage}`)
    }

    this.handlerHooks[stage].push({ hook, priority })
    this.handlerHooks[stage].sort((a, b) => a.priority - b.priority)
  }

  /**
   * Run scope-level hooks as middleware pipeline
   * @private
   * @returns {Object} - { continue: boolean, stop: boolean, block: boolean, context: object }
   */
  _runHooks(stage, scopeElement, event, handlerResult) {
    const hooks = this.hooks[stage]
    if (!hooks || hooks.length === 0) return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: handlerResult.context }

    // Run hooks in sequence, passing context through
    let hookResult = handlerResult
    for (const { hook } of hooks) {
      try {
        hookResult = hook(scopeElement, event, hookResult)
        const normalizedResult = this._normalizeHookResult(hookResult)

        if (normalizedResult.context) {
          handlerResult.context = { ...handlerResult.context, ...normalizedResult.context }
        }

        if (!normalizedResult.continue) {
          return { ...normalizedResult, context: handlerResult.context }
        }
      } catch (error) {
        console.error(`UINav: Error in scope hook (${stage}):`, error)
      }
    }

    return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: handlerResult.context }
  }

  _normalizeHookResult(result) {
    if (typeof result === "object" && result !== null && "continue" in result) {
      return {
        continue: result.continue,
        block: result.block,
        context: result.context || {},
      }
    }

    if (typeof result === "boolean") {
      return result ? UINAVHANDLER_HOOK_RESULT.CONTINUE : UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK
    }

    return UINAVHANDLER_HOOK_RESULT.CONTINUE
  }

  _runHandlerHooks(stage, element, event, handlerDescriptor, previousResult) {
    let context = previousResult.context || {}
    const hooks = this.handlerHooks[stage]
    if (!hooks || hooks.length === 0) return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }

    let hookResult = previousResult
    for (const { hook } of hooks) {
      try {
        hookResult = hook(element, event, handlerDescriptor, hookResult)
        const normalizedResult = this._normalizeHandlerHookResult(hookResult)

        if (normalizedResult.context) {
          previousResult.context = { ...previousResult.context, ...normalizedResult.context }
        }

        if (!normalizedResult.continue) {
          return { ...normalizedResult, context: previousResult.context }
        }
      } catch (error) {
        console.error(`UINav: Error in handler hook (${stage}):`, error)
      }
    }

    return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
  }

  _normalizeHandlerHookResult(result) {
    if (typeof result === "object" && result !== null && "continue" in result) {
      return {
        continue: result.continue,
        block: result.block,
        context: result.context || {},
      }
    }

    if (typeof result === "boolean") {
      return { continue: result, context: {} }
    }

    return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: {} }
  }

  /**
   * Clear depth cache for a scope (call when DOM structure changes)
   */
  clearDepthCache(scopeElement) {
    this.depthCache.delete(scopeElement)
  }

  /**
   *  Get cached depth or calculate and cache it
   */
  getCachedDepth(element, scopeElement) {
    let scopeDepthCache = this.depthCache.get(scopeElement)

    if (!scopeDepthCache) {
      scopeDepthCache = new Map()
      this.depthCache.set(scopeElement, scopeDepthCache)
    }

    if (!scopeDepthCache.has(element)) {
      const depth = this._getElementDepth(element, scopeElement)
      scopeDepthCache.set(element, depth)
    }

    return scopeDepthCache.get(element)
  }

  /**
   * Register a handler with a UI scope
   */
  register(scopeElement, handlerDescriptor) {
    let scopeRegistry = this.scopeRegistries.get(scopeElement)
    if (!scopeRegistry) {
      scopeRegistry = {
        handlers: [],
        scopeHandler: null,
        initialized: false,
      }
      this.scopeRegistries.set(scopeElement, scopeRegistry)

      const scopeId = scopeElement.getAttribute(UI_SCOPE_ATTR)
      if (scopeId) {
        this.scopeIdElements.set(scopeId, scopeElement)
      }
    }

    const existingIndex = scopeRegistry.handlers.findIndex(
      h => h.element === handlerDescriptor.element && this.descriptorsMatch(h.eventDescriptor, handlerDescriptor.eventDescriptor)
    )
    if (existingIndex !== -1) {
      scopeRegistry.handlers[existingIndex] = handlerDescriptor
    } else {
      scopeRegistry.handlers.push(handlerDescriptor)
    }

    if (!scopeRegistry.initialized) {
      this.initializeScopeHandler(scopeElement, scopeRegistry)
    }

    this.clearDepthCache(scopeElement)
    return handlerDescriptor.handler
  }

  descriptorsMatch(desc1, desc2) {
    return desc1.name === desc2.name && desc1.modified === desc2.modified && desc1.focusRequired === desc2.focusRequired
  }

  /**
   * Unregister a handler from a scope
   */
  unregister(element, handlerController) {
    const scopeElement = element.closest(`[${UI_SCOPE_ATTR}]`)
    if (!scopeElement) return

    const scopeRegistry = this.scopeRegistries.get(scopeElement)
    if (!scopeRegistry) return

    // Find and remove the handler
    const handlerIndex = scopeRegistry.handlers.findIndex(h => h.element === element && h.handler === handlerController)

    if (handlerIndex !== -1) {
      scopeRegistry.handlers.splice(handlerIndex, 1)

      this.clearDepthCache(scopeElement)
    }

    this.scheduleCleanup(scopeElement, scopeRegistry)
  }

  /**
   *  Schedule cleanup with debouncing to avoid repeated cleanup operations
   */
  scheduleCleanup(scopeElement, scopeRegistry) {
    if (this.cleanupTimers.has(scopeElement)) {
      clearTimeout(this.cleanupTimers.get(scopeElement))
    }

    // Schedule a new cleanup
    const timerId = setTimeout(() => {
      this.performCleanup(scopeElement, scopeRegistry)
      this.cleanupTimers.delete(scopeElement)
    }, 100)

    this.cleanupTimers.set(scopeElement, timerId)
  }

  performCleanup(scopeElement, scopeRegistry) {
    if (scopeRegistry.handlers.length === 0) {
      scopeElement.removeEventListener(DOM_UI_NAVIGATION_EVENT, scopeRegistry.scopeHandler)
      this.scopeRegistries.delete(scopeElement)
      this.clearDepthCache(scopeElement)

      const scopeId = scopeElement.getAttribute(UI_SCOPE_ATTR)
      if (scopeId) this.scopeIdElements.delete(scopeId)
    }
  }

  /**
   * Get deduplicated array of event names handled within a scope
   * @param {string} scopeId - The scope ID to query
   * @returns {string[]} Array of event name strings
   */
  getHandledEventsForScope(scopeId) {
    const scopeElement = this.scopeIdElements.get(scopeId)
    if (!scopeElement) return []
    const registry = this.scopeRegistries.get(scopeElement)
    if (!registry) return []
    const events = new Set()
    for (const handler of registry.handlers) {
      if (handler.eventNames) {
        handler.eventNames.forEach(name => events.add(name))
      }
    }
    return [...events]
  }

  /**
   * Get detailed handler report for a scope
   * @param {string} scopeId - The scope ID to query
   * @returns {Array|null} Array of handler info objects, or null if scope not found
   */
  getScopeHandlerReport(scopeId) {
    const scopeElement = this.scopeIdElements.get(scopeId)
    if (!scopeElement) return null
    const registry = this.scopeRegistries.get(scopeElement)
    if (!registry) return null
    return registry.handlers.map(h => ({
      eventNames: h.eventNames || [],
      element: h.element,
      disabled: h.disabled,
    }))
  }

  /**
   * Get all registered scope IDs and the events they handle
   * @returns {Object} Map of scopeId to deduplicated event name arrays
   */
  getAllScopeHandledEvents() {
    const result = {}
    for (const [scopeId] of this.scopeIdElements) {
      result[scopeId] = this.getHandledEventsForScope(scopeId)
    }
    return result
  }

  /**
   * Resolve which element would receive the given UINav event first.
   * Currently used to align contextual InfoBar labels.
   * @param {string} eventName Event name
   * @param {{ activeScope?: string }} [options] Options
   * @returns {HTMLElement|null} First handler element, or null if none
   */
  getFirstReceiverElement(eventName, options = {}) {
    if (!eventName) return null

    const uiNavService = getUINavServiceInstance()
    const activeScopeId = options.activeScope ?? uiNavService?.activeScope
    if (!activeScopeId) return null

    const scopeElement = this.scopeIdElements.get(activeScopeId)
    if (!scopeElement) return null

    const scopeRegistry = this.scopeRegistries.get(scopeElement)
    if (!scopeRegistry || !scopeRegistry.handlers?.length) return null

    // synthetic event detail mirroring what UINavService dispatches
    // focusRequired matching against document.activeElement is enforced by the matcher
    const eventDetail = {
      name: eventName,
      value: 1, // to satisfy on/off descriptors
      modified: uiNavService?.eventProcessor?.isModified || false,
      targetScope: this._getTargetScopeId(document.activeElement),
    }

    const matchingHandlers = scopeRegistry.handlers.filter(
      h => !h.disabled && eventMatchesDescriptor(eventDetail, h.eventDescriptor)
    )
    if (matchingHandlers.length === 0) return null

    const activeElement = document.activeElement
    let startElement = null
    if (activeElement && scopeElement.contains(activeElement)) {
      startElement = activeElement
    } else {
      startElement = this._findDeepestHandlerElement(scopeElement, matchingHandlers)
    }
    if (!startElement || !scopeElement.contains(startElement)) return null

    const bubblingPath = this._buildBubblingPath(startElement, scopeElement, matchingHandlers)
    if (bubblingPath.length === 0) return null

    return bubblingPath[0]?.element || null
  }

  _getTargetScopeId(element) {
    if (!element || element === document.body) return null
    const scopeElement = element.closest(`[${UI_SCOPE_ATTR}]`)
    return scopeElement?.getAttribute(UI_SCOPE_ATTR) || null
  }

  /**
   * Clean up all timers (call on service destruction)
   */
  destroy() {
    this.cleanupTimers.forEach(timer => clearTimeout(timer))
    this.cleanupTimers.clear()
    this.depthCache = new WeakMap()
    this.scopeIdElements.clear()
  }

  /**
   * Initialize the centralized event handler for a UI scope
   */
  initializeScopeHandler(scopeElement, scopeRegistry) {
    const scopeHandler = event => {
      const scopeId = scopeElement.getAttribute(UI_SCOPE_ATTR)
      const uiNavService = getUINavServiceInstance()
      const controls = useControls()
      const targetScope = event.detail?.targetScope || uiNavService.activeScope

      if (targetScope && targetScope !== scopeId && !this._isTargetScopeNested(targetScope, scopeElement)) {
        console.warn(`UINav: Event target scope is not the intended scope. Ignoring event for this scope(${scopeId})`, { targetScope, scopeId })
        return
      }

      const context = {
        scopeId: scopeId,
        targetScope: targetScope,
        activeScope: getUINavServiceInstance().activeScope,
        lastDevice: controls.lastDevice,
        trapPolicy: scopeElement[SCOPED_NAV_PROPERTY_NAME]?.trapPolicy || SCOPE_TRAP_POLICIES.CONTROLLER_ONLY,
      }

      let result = this._runHooks("beforeExecute", scopeElement, event, { context })
      if (!result.continue) {
        if (result.block) {
          event.stopPropagation()
        }
        return
      }

      const matchingHandlers =
        scopeRegistry.handlers && scopeRegistry.handlers.length > 0
          ? scopeRegistry.handlers.filter(h => !h.disabled && eventMatchesDescriptor(event.detail, h.eventDescriptor))
          : []
      if (matchingHandlers.length === 0) {
        result = { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: { ...result.context, noHandlersFound: true } }
      } else {
        result = this._executeScopedBubbling(scopeElement, event, matchingHandlers, result)
      }

      result = this._runHooks("afterExecute", scopeElement, event, result)
      if (!result.continue && result.block) {
        // console.warn("UINav: Event blocked by scope handler.", { scopeElement, event, result })
        event.stopPropagation()
      }
    }

    // Add single event listener to scope
    scopeElement.addEventListener(DOM_UI_NAVIGATION_EVENT, scopeHandler)
    scopeRegistry.scopeHandler = scopeHandler
    scopeRegistry.initialized = true
  }

  _isTargetScopeNested(targetScopeId, currentScopeElement) {
    const targetScopeElement = document.querySelector(`[${UI_SCOPE_ATTR}="${targetScopeId}"]`)
    if (!targetScopeElement) return false

    return currentScopeElement.contains(targetScopeElement) && targetScopeElement !== currentScopeElement
  }

  /**
   * Execute custom bubbling within a UI scope
   */
  _executeScopedBubbling(scopeElement, event, matchingHandlers, handlerResult) {
    const activeElement = document.activeElement
    let startElement = event.target

    if (activeElement && scopeElement.contains(activeElement) && matchingHandlers.some(h => h.element === activeElement)) {
      startElement = activeElement
    } else {
      startElement = this._findDeepestHandlerElement(scopeElement, matchingHandlers)
    }

    const bubblingPath = this._buildBubblingPath(startElement, scopeElement, matchingHandlers)
    if (bubblingPath.length === 0) {
      console.warn("UINav: No bubbling path found.", { scopeElement, event, matchingHandlers })
      return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context: handlerResult.context }
    }

    return this._executeHandlersAlongPath(bubblingPath, scopeElement, event, handlerResult)
  }

  /**
   * Find the deepest element that has matching handlers
   */
  _findDeepestHandlerElement(scopeElement, handlers) {
    const uniqueElements = [...new Set(handlers.map(h => h.element))]
    const validElements = uniqueElements.filter(el => {
      const depth = this.getCachedDepth(el, scopeElement)
      if (depth < 0) return false
      return !this._isElementInNestedScope(el, scopeElement)
    })

    return (
      validElements.sort((a, b) => {
        const depthA = this.getCachedDepth(a, scopeElement)
        const depthB = this.getCachedDepth(b, scopeElement)
        return depthB - depthA
      })[0] || null
    )
  }

  _isElementInNestedScope(element, currentScopeElement) {
    let current = element

    while (current && current !== currentScopeElement) {
      if (current.hasAttribute(UI_SCOPE_ATTR) && current !== currentScopeElement) return true
      current = current.parentElement
    }

    return false
  }

  /**
   * Build the bubbling path from start element to scope
   */
  _buildBubblingPath(startElement, scopeElement, handlers) {
    if (!scopeElement.contains(startElement)) {
      console.warn("UINav: Start element is outside scope boundary", startElement, scopeElement)
      return []
    }

    const path = []
    let current = startElement

    // Build path from start element up to scope element
    while (current && scopeElement.contains(current)) {
      const elementHandlers = handlers.filter(h => h.element === current)

      if (elementHandlers.length > 0) {
        path.push({
          element: current,
          handlers: elementHandlers,
        })
      }

      if (current === scopeElement) break
      current = current.parentElement
    }

    return path
  }

  /**
   * Execute handlers along the bubbling path
   */
  _executeHandlersAlongPath(bubblingPath, scopeElement, event, handlerResult) {
    let context = handlerResult.context
    let shouldBlock = false

    for (const pathItem of bubblingPath) {
      const results = []

      for (const handlerDescriptor of pathItem.handlers) {
        const beforeResult = this._runHandlerHooks("beforeExecute", scopeElement, event, handlerDescriptor, handlerResult)
        context = beforeResult.context || context

        if (!beforeResult.continue) {
          results.push(false)

          if (beforeResult.block) {
            shouldBlock = true
          }
          continue
        }

        try {
          let afterResult = beforeResult
          let result = handlerDescriptor.handler(event)

          afterResult.continue = !!result
          afterResult.block = !afterResult.continue
          // results.push(result)

          afterResult = this._runHandlerHooks("afterExecute", scopeElement, event, handlerDescriptor, afterResult)
          context = afterResult.context || context

          if (afterResult.block) {
            shouldBlock = true
          }

          results.push(afterResult.continue)
        } catch (error) {
          console.error("Error in UINav scope handler:", error, {
            element: pathItem.element,
            event: event.detail.name,
          })
          results.push(false)
        }
      }

      const shouldContinueBubbling = results.some(result => result === true)
      if (!shouldContinueBubbling) {
        return shouldBlock ? { ...UINAVHANDLER_HOOK_RESULT.STOP_AND_BLOCK, context } : { ...UINAVHANDLER_HOOK_RESULT.STOP, context }
      }
    }

    return { ...UINAVHANDLER_HOOK_RESULT.CONTINUE, context }
  }

  /**
   * Check if a UI scope allows an event to bubble up
   */
  _checkScopeBubbling(scopeElement, event) {
    const scopedNavProps = scopeElement._bngScopedNav
    if (!scopedNavProps) {
      // Not a scoped nav element, allow bubbling by default
      return true
    }

    if (scopedNavProps.shouldBubbleEvent && typeof scopedNavProps.shouldBubbleEvent === "function") {
      return scopedNavProps.shouldBubbleEvent(event)
    }

    return false
  }

  /**
   * Get the depth of an element relative to a parent
   */
  _getElementDepth(element, parent) {
    let depth = 0
    let current = element

    while (current && current !== parent) {
      depth++
      current = current.parentElement
    }

    return current === parent ? depth : -1
  }

  _allowsPassthrough(scopeElement, eventData) {
    const domScopedNavProps = scopeElement.hasAttribute(SCOPED_NAV_ATTR) ? scopeElement[SCOPED_NAV_PROPERTY_NAME] : {}
    return domScopedNavProps.passthroughActive && domScopedNavProps.passthroughEnabled && domScopedNavProps.passthroughEvents.includes(eventData.name)
  }

}
