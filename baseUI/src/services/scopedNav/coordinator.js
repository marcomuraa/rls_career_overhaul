import { ref, watch, nextTick } from "vue"
import { ExecQueue } from "@/services/queue"
import { setFocus, ensureFocus } from "@/services/uiNavFocus"
import { usePopover } from "@/services/popover"
import * as utils from "@/services/scopedNav/utils"
import { scopedNavLogger as logger } from "./logger"
import { SCOPED_NAV_STATES, SCOPED_NAV_EVENTS, SCOPED_NAV_OBSERVER_EVENTS, SCOPED_NAV_ATTR, SCOPED_NAV_PROPERTY_NAME } from "./constants"
import { getUINavServiceInstance } from "@/services/uiNav"
import { SCOPE_TYPES } from "./types"
import { lua } from "@/bridge"

class ScopeCoordinator {
  constructor() {
    this.scopes = new Map()
    this.scopeStack = ref([])
    this.popupScopeStack = ref([])  // Separate stack for popup/dialog scopes
    this.enabled = ref(true)

    this.GLOBAL_ACTIVATION_KEY = "global-scope-activation"
    this.transitionQueue = new ExecQueue(0, 1)

    this.GLOBAL_FOCUS_KEY = "global-scope-focus"
    this.focusQueue = new ExecQueue(0, 1)

    this.GLOBAL_FOCUS_EVENT_KEY = "global-uinav-focus"
    this.focusEventQueue = new ExecQueue(0, 1)

    this.SCOPED_NAV_OPERATION_KEY = "scoped-nav-operation"
    this.scopedNavOperationQueue = new ExecQueue(100, 1)

    this.observers = new Set()

    // Focus request management
    this.isControllerActive = false
    this._deviceTrackingInitialized = false
    this._noFocusFrameCleanup = null

    // Pending activation state
    this._pendingActivation = null
    this._pendingActivationOptions = null
    this._pendingActiveIgnoresIncomingOperations = true

    // Per-scope one-shot route-entry focus payloads
    // Map<scopeId, { focusSource, fromRouteName, ... }>
    this._pendingRouteEntryFocus = new Map()

    // Lua active-scope reporting
    this._lastReportedActiveScopeId = null
    this._routeDataStore = null

    // Activation barrier: blocks normal-scope resume while a host (e.g. the
    // shared popup wrapper) is still visually occupying the top layer. Holds
    // active barrier ids plus a single pending normal-scope resume payload.
    this._activationBarriers = new Set()
    this._pendingNormalScopeResume = null
    // A single normal-scope activation deferred because it arrived while a popup
    // owned focus. Flushed after the last popup closes only when no suspended
    // normal scope was resumed.
    this._pendingNormalScopeActivation = null
  }

  setDependencies(deps = {}) {
    this.controls = deps.controls
    this._routeDataStore = deps.routeDataStore || null
  }

  initialize() {
    if (!this._deviceTrackingInitialized) {
      this._setupDeviceTracking()
      this._deviceTrackingInitialized = true
      this._setupFocusEventListeners()
      logger.debug("Coordinator", "Device tracking initialized")
    }
  }

  // ========================================
  // Lua Active-Scope Reporting
  // ========================================
  _getEffectiveActiveScopeId() {
    if (this.popupScopeStack.value.length > 0) {
      const topPopupId = this.popupScopeStack.value[this.popupScopeStack.value.length - 1]
      const topPopup = this.scopes.get(topPopupId)
      if (topPopup && topPopup.state === SCOPED_NAV_STATES.active) return topPopupId
    }

    if (this.scopeStack.value.length > 0) {
      const topId = this.scopeStack.value[this.scopeStack.value.length - 1]
      const topScope = this.scopes.get(topId)
      if (topScope && topScope.state === SCOPED_NAV_STATES.active) return topId
    }

    return null
  }

  _reportActiveScopeIfChanged(affectedScopeId, reason, isPopup) {
    const activeScopeId = this._getEffectiveActiveScopeId()
    if (activeScopeId === this._lastReportedActiveScopeId) return

    const previousActiveScopeId = this._lastReportedActiveScopeId
    this._lastReportedActiveScopeId = activeScopeId

    const routeName = this._routeDataStore?.routeName ?? null
    const namespace = this._routeDataStore?.namespace ?? null

    const payload = {
      activeScopeId,
      previousActiveScopeId,
      affectedScopeId,
      reason,
      isPopup,
      routeName,
      namespace,
    }

    lua.extensions.ui_router.reportActiveScope(payload).catch(err =>
      logger.warn("Coordinator", "reportActiveScope failed", err)
    )
  }

  /**
   * Tell the UINav service which scope is currently active. Honors the
   * `skipUINavSync` option that lifecycle paths use to suppress the sync
   * when caller is mid-transition (e.g. activating a child scope).
   * @param {string | undefined} scopeId
   * @param {{ skipUINavSync?: boolean }} [options]
   */
  _setActiveScopeInUINav(scopeId, options = {}) {
    if (options.skipUINavSync) return
    getUINavServiceInstance().setActiveScope(scopeId)
  }

  // ========================================
  // Pending Activation
  // ========================================
  setPendingActivation(scopeId, options = {}) {
    this._pendingActivation = scopeId
    this._pendingActivationOptions = options

    const scope = this.scopes.get(scopeId)
    if (scope) {
      this._pendingActivation = null
      this._pendingActivationOptions = null
      this.activateScope(scopeId, options)
    }
  }

  clearPendingActivation() {
    this._pendingActivation = null
    this._pendingActivationOptions = null
  }

  _isPendingAndBlocking() {
    return this._pendingActivation !== null && this._pendingActiveIgnoresIncomingOperations
  }

  // ========================================
  // Activation Barrier
  // ========================================
  /**
   * Register an activation barrier. While any barrier is active, normal-scope
   * resume after popup deactivation is deferred so scoped-nav focus selection
   * does not run while the popup host still occludes candidate elements.
   * @param {string} id stable barrier id (e.g. "default-popup-wrapper")
   */
  beginActivationBarrier(id) {
    if (!id) {
      logger.warn("Coordinator", "beginActivationBarrier: id is required")
      return
    }
    this._activationBarriers.add(id)
    logger.debug("Coordinator", `Activation barrier added: ${id}`)
  }

  /**
   * Release an activation barrier. When the last barrier is released, any
   * pending normal-scope resume is flushed.
   * @param {string} id
   */
  endActivationBarrier(id) {
    if (!id) {
      logger.warn("Coordinator", "endActivationBarrier: id is required")
      return
    }
    if (!this._activationBarriers.delete(id)) return
    logger.debug("Coordinator", `Activation barrier released: ${id}`)

    if (!this.hasActivationBarrier()) {
      const didResume = this._flushPendingNormalScopeResume()
      if (!didResume) this._flushPendingNormalScopeActivation()
    }
  }

  hasActivationBarrier() {
    return this._activationBarriers.size > 0
  }

  /**
   * Resume the deferred normal-scope after all barriers are released.
   * Validates that the pending scope is still resumable; clears stale state
   * otherwise.
   * @private
   */
  _flushPendingNormalScopeResume() {
    const pending = this._pendingNormalScopeResume
    this._pendingNormalScopeResume = null

    if (!pending) return false

    const { scopeId, options } = pending

    if (!this.enabled.value) {
      logger.debug("Coordinator", `Pending normal-scope resume dropped: coordinator disabled (${scopeId})`)
      return false
    }

    if (this.popupScopeStack.value.length > 0) {
      logger.debug("Coordinator", `Pending normal-scope resume dropped: popup scope still active (${scopeId})`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope || scope.state !== SCOPED_NAV_STATES.suspended) {
      logger.debug("Coordinator", `Pending normal-scope resume dropped: scope no longer suspended (${scopeId})`)
      return false
    }

    logger.debug("Coordinator", `Flushing pending normal-scope resume: ${scopeId}`)
    // The resume path won, so the deferred activation is stale.
    this._pendingNormalScopeActivation = null
    this._performResume(scopeId, options)
    return true
  }

  /**
   * Activate a normal scope that was deferred while a popup owned focus. Only
   * used when no suspended normal scope was resumed on popup close. Validates
   * that no popup or activation barrier remains and that the target scope is
   * still a valid, non-popup scope.
   * @private
   * @returns {boolean} true when the activation was performed.
   */
  _flushPendingNormalScopeActivation() {
    const pending = this._pendingNormalScopeActivation
    this._pendingNormalScopeActivation = null

    if (!pending) return false

    const { scopeId, options } = pending

    if (!this.enabled.value) {
      logger.debug("Coordinator", `Pending normal-scope activation dropped: coordinator disabled (${scopeId})`)
      return false
    }

    if (this.popupScopeStack.value.length > 0 || this.hasActivationBarrier()) {
      logger.debug("Coordinator", `Pending normal-scope activation dropped: popup/barrier still active (${scopeId})`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope || scope.isPopup) {
      logger.debug("Coordinator", `Pending normal-scope activation dropped: invalid scope (${scopeId})`)
      return false
    }

    if (scope.state === SCOPED_NAV_STATES.active) return true

    logger.debug("Coordinator", `Flushing pending normal-scope activation: ${scopeId}`)
    return this._performActivation(scopeId, { ...options, reason: "popup-closed" })
  }

  // ========================================
  // Route-Entry Focus
  // ========================================
  /**
   * Store a one-shot route-entry focus payload for a scope. The payload is
   * preserved until consumed by the directive's focus selection so the
   * route-entry intent survives even if the scope is already active and only
   * re-renders, or is resumed instead of freshly activated.
   *
   * Passing a falsy payload clears any existing entry for the scope.
   * @param {string} scopeId
   * @param {{focusSource?: string, fromRouteName?: string|null}|null|undefined} payload
   */
  setRouteEntryFocus(scopeId, payload) {
    if (!scopeId) {
      logger.warn("Coordinator", "setRouteEntryFocus: scopeId is required")
      return
    }
    if (!payload) {
      this._pendingRouteEntryFocus.delete(scopeId)
      return
    }
    this._pendingRouteEntryFocus.set(scopeId, payload)
  }

  /**
   * Return the pending route-entry focus payload for a scope without removing
   * it. Use this when building the effective focus detail; the caller is
   * responsible for consuming the payload once the focus target is actually
   * resolved against it.
   * @param {string} scopeId
   * @returns {{focusSource?: string, fromRouteName?: string|null}|null}
   */
  peekRouteEntryFocus(scopeId) {
    if (!scopeId) return null
    return this._pendingRouteEntryFocus.get(scopeId) || null
  }

  /**
   * Return and remove the pending route-entry focus payload for a scope.
   * One-shot consumption prevents unrelated re-renders from snapping focus
   * back to a stale route target.
   * @param {string} scopeId
   * @returns {{focusSource?: string, fromRouteName?: string|null}|null}
   */
  consumeRouteEntryFocus(scopeId) {
    if (!scopeId) return null
    const payload = this._pendingRouteEntryFocus.get(scopeId)
    if (!payload) return null
    this._pendingRouteEntryFocus.delete(scopeId)
    return payload
  }

  /**
   * Explicitly clear any pending route-entry focus payload for a scope.
   * @param {string} scopeId
   */
  clearRouteEntryFocus(scopeId) {
    if (!scopeId) return
    this._pendingRouteEntryFocus.delete(scopeId)
  }

  // ========================================
  // Focus Management
  // ========================================
  _setupDeviceTracking() {
    logger.debug("Coordinator", "Setting up device tracking")
    const controls = this.controls

    watch(
      () => controls.lastDevice,
      (lastDevice, previousDevice) => {
        logger.info("Coordinator", `Switched input from ${previousDevice} to ${lastDevice}`)
        this.isControllerActive = lastDevice

        // Enqueue a no-op that will replace all pending focus operations
        // via GLOBAL_FOCUS_KEY conflict resolution
        this.focusQueue.enqueue(
          this.GLOBAL_FOCUS_KEY,
          () => {
            // return false
            this._handleInputChange(lastDevice)
            return true
          },
          [],
          this._getFocusConflicts("__cancel__")
        )
      },
      { immediate: true }
    )
  }

  _handleInputChange(lastDevice) {
    if (lastDevice === null) {
      const activeElement = document.activeElement
      if (activeElement && document.contains(activeElement) && activeElement !== document.body) {
        const onBlur = () => {
          activeElement.classList.remove("no-focus-frame")
          this._noFocusFrameCleanup = null
        }
        this._noFocusFrameCleanup = { element: activeElement, handler: onBlur }
        nextTick(() => {
          activeElement.classList.add("no-focus-frame")
          activeElement.addEventListener("blur", onBlur, { once: true })
        })
      }
    } else {
      if (this._noFocusFrameCleanup) {
        const { element, handler } = this._noFocusFrameCleanup
        element.removeEventListener("blur", handler)
        this._noFocusFrameCleanup = null
      }
      const noFocusFrames = document.querySelectorAll(".no-focus-frame")
      if (noFocusFrames.length > 0) {
        nextTick(() => {
          noFocusFrames.forEach(el => el.classList.remove("no-focus-frame"))
        })
      }
    }
  }

  _getFocusEventConflicts() {
    return {
      [this.GLOBAL_FOCUS_EVENT_KEY]: this.focusEventQueue.resolution.replaceWithResolve,
    }
  }

  _setupFocusEventListeners() {
    document.addEventListener("uinav-focus", event => {
      const { target, relatedTarget } = event.detail

      this._trackLastActiveElement(target)

      // TODO: Check if this is still needed
      // if within a popup dialog, do nothing
      if (target.closest("dialog")) return

      // this._trackLastActiveElement(target)

      return this.focusEventQueue.enqueue(this.GLOBAL_FOCUS_EVENT_KEY, () => this._handleUINavFocusEvent(event), [], this._getFocusEventConflicts())
    })

    document.addEventListener("uinav-blur", event => {
      const { target } = event.detail

      // check if leaving a container type scoped nav, if so, deactivate it
      if (target.hasAttribute("data-bng-scoped-nav-passthrough")) {
        target.removeAttribute("data-bng-scoped-nav-passthrough")
        return
      }
    })
  }

  _trackLastActiveElement(target) {
    const parentScope = utils.findParentScope(target, true)

    if (!parentScope || !parentScope.isScopedNav) return

    const scopeElement = parentScope.element
    const scopeData = this.scopes.get(parentScope.scopeId)

    if (!scopeData) return

    // Store the last active element in both the element's property and scope data
    if (scopeElement[SCOPED_NAV_PROPERTY_NAME]) {
      scopeElement[SCOPED_NAV_PROPERTY_NAME].lastActiveElement = target
    }

    scopeData.lastActiveElement = target
  }

  _handleUINavFocusEvent(event) {
    if (this._isPendingAndBlocking()) {
      logger.debug("Coordinator", "UINav focus event blocked: pending activation active")
      return
    }

    const { target, relatedTarget } = event.detail

    if (!document.contains(target)) {
      logger.debug("Coordinator", "Target is not in the DOM, skipping focus event")
      return
    }

    // check if target is within an active scoped nav, if so, do nothing
    const currentScope = this.getCurrentScope()
    if (currentScope && utils.isDirectChild(currentScope.element, target)) {
      logger.debug("Coordinator", "Target is within an active scoped nav, skipping focus event")
      return
    }

    // Check if the focused element is a scoped nav and that it is a normal type and passthrough is enabled, if so,
    // attach a data attribute to target scoped nav
    const targetScopeId = utils.getScopedNavId(target)
    const currScope = this.getScopeById(targetScopeId)
    if (currScope && currScope.config.type === SCOPE_TYPES.NORMAL && currScope.config.passthroughEnabled) {
      logger.debug("Coordinator", "Attaching passthrough data attribute to target scoped nav", targetScopeId)
      target.setAttribute("data-bng-scoped-nav-passthrough", "true")
    }

    // find the target's scoped nav
    const targetScope = utils.findParentScope(target, true)
    if (!targetScope) {
      // check if relatedTarget was within a container type scoped nav, if so, deactivate it
      if (relatedTarget) {
        const relatedTargetScope = utils.findParentScope(relatedTarget, true)
        const relatedScopeData = this.getScopeById(relatedTargetScope.scopeId)
        if (this.isActiveScope(relatedTargetScope.scopeId) && relatedScopeData.config.type === SCOPE_TYPES.CONTAINER) {
          this.deactivateScope(relatedTargetScope.scopeId, { reason: "uinav-blur", resumePrevious: true })
        }
      } else {
        const rootScopeId = this.scopeStack.value && this.scopeStack.value.length > 0 ? this.scopeStack.value[0] : null
        if (rootScopeId) {
          this.deactivateScope(rootScopeId, { reason: "uinav-blur", force: true })
        }
      }

      return
    }

    // check if the target scoped nav is already active, if so, do nothing
    if (this.isActiveScope(targetScope.scopeId)) {
      logger.debug("Coordinator", "Target scoped nav is already active, skipping focus event")
      return
    }

    // if target scoped nav is already in the stack and is suspended, resume it
    if (this.getScopeById(targetScope.scopeId) && this.getScopeById(targetScope.scopeId).state === SCOPED_NAV_STATES.suspended) {
      if (this.popupScopeStack.value.length > 0) {
        logger.debug("Coordinator", "Target scoped nav is suspended, but popup is active, skipping resume")
        return
      }

      logger.debug("Coordinator", "Target scoped nav is suspended, resuming it")
      // TODO: Need to check if the related target was inside a popover type scoped navigation
      this.resumeScope(targetScope.scopeId)
      return
    }

    // TODO: Check if the target scoped nav can be activated, if not, do nothing
    logger.info("Coordinator", `Activating target scoped nav: ${targetScope.scopeId}`)
    this.activateScope(targetScope.scopeId, { reason: "uinav-focus", force: true })
  }

  _getFocusConflicts(scopeId) {
    return {
      [`focus:${scopeId}`]: this.focusQueue.resolution.replaceWithResolve,
      [this.GLOBAL_FOCUS_KEY]: this.focusQueue.resolution.replaceWithResolve,
    }
  }

  _isHTMLElement(value) {
    return !!value && typeof value === "object" && value.nodeType === 1
  }

  _normalizeScopeFocusRequest(targetOrOptions, options = {}) {
    const isTarget = typeof targetOrOptions === "string" || this._isHTMLElement(targetOrOptions)
    if (!isTarget && targetOrOptions && typeof targetOrOptions === "object") {
      return {
        target: null,
        options: { ...targetOrOptions },
      }
    }

    return {
      target: isTarget ? targetOrOptions : null,
      options: { ...(options || {}) },
    }
  }

  /**
   * Request focus selection for an already-registered scope.
   *
   * Supported signatures:
   * - requestScopeFocus(scopeId, options?)
   * - requestScopeFocus(scopeId, elementOrSelector, options?)
   */
  requestScopeFocus(scopeId, targetOrOptions, options) {
    if (this._isPendingAndBlocking()) {
      logger.debug("Coordinator", `requestScopeFocus blocked for ${scopeId}: pending activation active`)
      return false
    }

    if (!this.enabled.value) {
      logger.warn("Coordinator", `requestScopeFocus ignored for ${scopeId}: coordinator disabled`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      logger.warn("Coordinator", `requestScopeFocus ignored for ${scopeId}: scope not found`)
      return false
    }

    const normalized = this._normalizeScopeFocusRequest(targetOrOptions, options)
    const requestOptions = normalized.options || {}
    const activeOnly = requestOptions.activeOnly !== false

    if (activeOnly && !this.isActiveScope(scopeId)) {
      logger.debug("Coordinator", `requestScopeFocus ignored for ${scopeId}: scope is not active`)
      return false
    }

    scope.element.dispatchEvent(
      new CustomEvent(SCOPED_NAV_EVENTS.focus, {
        detail: {
          scopeId,
          reason: requestOptions.reason || "api-request",
          activeOnly,
          force: !!requestOptions.force,
          focusDetail: requestOptions.detail || null,
          requestedTarget: normalized.target,
        },
      })
    )

    return true
  }

  requestFocus(element, scopeId, options = {}) {
    if (this._isPendingAndBlocking()) {
      logger.debug("Coordinator", "requestFocus blocked: pending activation active")
      return
    }

    if (!this.enabled.value) {
      logger.warn("Coordinator", "requestFocus: Coordinator disabled")
      return
    }

    if (!element) {
      logger.warn("Coordinator", "requestFocus: element is required")
      return
    }

    if (!this.isControllerActive && !options.force) {
      logger.warn("Coordinator", "requestFocus: Controller not active, ignoring request...")
      return
    }

    return this.focusQueue.enqueue(`focus:${scopeId}`, () => this._performFocus(element, scopeId, options), [], this._getFocusConflicts(scopeId))
  }

  _performFocus(element, scopeId, options = {}) {
    if (!this.isControllerActive && !options.force) {
      logger.debug("Coordinator", "requestFocus: Focus cancelled - mouse/keyboard is active")
      return false
    }

    // Check scope is still active
    // const currentScope = this.getCurrentScope()
    // if (!currentScope || currentScope.id !== scopeId) {
    //   logger.debug("[ScopeCoordinator] requestFocus: Focus cancelled, scope ${scopeId} is no longer active")
    //   return false
    // }

    if (!document.contains(element)) {
      logger.debug("Coordinator", "requestFocus: Focus cancelled, element is no longer in the DOM")
      return false
    }

    try {
      if (element === document.activeElement) {
        ensureFocus(element)
      } else {
        nextTick(() => setFocus(element))
      }
      return true
    } catch (error) {
      logger.error("[ScopeCoordinator] requestFocus: Error setting focus: ", error)
      return false
    }
  }

  requestBlur(element, scopeId, options = {}) {
    if (this._isPendingAndBlocking()) {
      logger.debug("Coordinator", "requestBlur blocked: pending activation active")
      return
    }

    if (!this.enabled.value) {
      logger.warn("Coordinator", "requestBlur: Coordinator disabled")
      return
    }

    if (!element) {
      logger.warn("Coordinator", "requestBlur: element is required")
      return
    }

    return this.focusQueue.enqueue(this.GLOBAL_FOCUS_KEY, () => this._performBlur(element, scopeId, options), [], this._getFocusConflicts(scopeId))
  }

  _performBlur(scopeId, options = {}) {
    if (!this.isControllerActive && !options.force) {
      logger.debug("Coordinator", "requestBlur: Blur cancelled - mouse/keyboard is active")
      return false
    }

    try {
      const activeElement = document.activeElement

      if (activeElement && document.contains(activeElement) && activeElement !== document.body) {
        nextTick(() => {
          activeElement.blur()
        })
        return true
      }
    } catch (error) {
      logger.error("[ScopeCoordinator] requestBlur: Error setting focus: ", error)
      return false
    }
  }


  // ========================================
  // Scoped Nav Operations
  // ========================================
  _getScopedNavDomOperationConflicts(scopeId, options = {}) {
    const conflictMode = options.conflictMode || "replace"
    if (conflictMode === "serial") {
      return {}
    }

    return {
      [`scoped-nav-operation:${scopeId}`]: this.scopedNavOperationQueue.resolution.replaceWithResolve,
    }
  }
  /**
   * Queue a scoped-nav DOM operation for a scope.
   * By default, pending operations for the same scope are replaced.
   * Use `{ conflictMode: "serial" }` to run behind existing queued work.
   *
   * @param {string} scopeId
   * @param {Function} func
   * @param {{ conflictMode?: "replace" | "serial" }} [options]
   * @public
   */
  runScopedNavDomOperation(scopeId, func, options = {}) {
    const scope = this.scopes.get(scopeId)

    if (!scope) {
      logger.warn("Coordinator", `Cannot configure container ${scopeId}: not found`)
      return false
    }

    return this.scopedNavOperationQueue.enqueue(
      `scoped-nav-operation:${scopeId}`,
      async () => {
        const result = await func()
        const currentScope = this.scopes.get(scopeId)
        if (currentScope) {
          this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeNavigationStateApplied, {
            scope: currentScope,
            scopeId,
            options,
          })
        }
        return result
      },
      [],
      this._getScopedNavDomOperationConflicts(scopeId, options),
      result => {
        // console.log("runScopedNavDomOperation resolved", result)
      },
      error => {
        logger.error("Coordinator", "runScopedNavDomOperation rejected", error)
      }
    )
  }

  // ========================================
  // Scope Registration
  // ========================================
  registerScope(scopeId, element, config, extraProps = {}) {
    logger.debug("Coordinator", `Attempting to register scope: ${scopeId}`)
    return this.transitionQueue.promise(
      `register:${scopeId}`,
      () => this._performRegister(scopeId, element, config, extraProps),
      [],
      {}
    )
      .catch(error => {
        logger.error("Coordinator", `Scope ${scopeId} registration failed.`, error)
        throw error
      })
  }

  _performRegister(scopeId, element, config, extraProps = {}) {
    if (this.scopes.has(scopeId)) {
      // Scope already exists - update with new element and config
      // This can happen when component remounts with the same scope ID
      // This breaks freeroam selector due to GridSelector using dynamic id to re-render the contents
      // TODO: Freeroam selector needs to be updated to remove unnecessary code below
      const existingScope = this.scopes.get(scopeId)
      existingScope.element = element
      existingScope.config = config
      existingScope.state = SCOPED_NAV_STATES.inactive
      existingScope.lastActiveElement = null
      existingScope.isPopup = extraProps.isPopup || false
      // Remove from stack if it was there (stale reference)
      const stackIndex = this.scopeStack.value.indexOf(scopeId)
      if (stackIndex !== -1) {
        this.scopeStack.value.splice(stackIndex, 1)
      }
      // Also remove from popup stack if it was there
      const popupStackIndex = this.popupScopeStack.value.indexOf(scopeId)
      if (popupStackIndex !== -1) {
        this.popupScopeStack.value.splice(popupStackIndex, 1)
      }
      logger.debug("Coordinator", `Scope ${scopeId} already registered. Updated with new element.`)

      if (this._pendingActivation === scopeId) {
        const pendingOptions = this._pendingActivationOptions || {}
        this._pendingActivation = null
        this._pendingActivationOptions = null
        nextTick(() => this.activateScope(scopeId, pendingOptions))
      }

      return scopeId
    }

    const scope = {
      id: scopeId,
      element,
      config,
      state: SCOPED_NAV_STATES.inactive,
      lastActiveElement: null,
      createdAt: Date.now(),
      isPopup: extraProps.isPopup || false,
    }

    this.scopes.set(scopeId, scope)
    logger.debug("Coordinator", `Scope ${scopeId} registered.`, scope)

    if (this._pendingActivation === scopeId) {
      const pendingOptions = this._pendingActivationOptions || {}
      this._pendingActivation = null
      this._pendingActivationOptions = null
      nextTick(() => this.activateScope(scopeId, pendingOptions))
    }

    return scopeId
  }

  unregisterScope(scopeId) {
    logger.debug("Coordinator", `Attempting to unregister scope: ${scopeId}`)
    return this.transitionQueue.enqueue(
      `unregister:${scopeId}`,
      () => this._performUnregister(scopeId),
      [],
      {},
      result => { },
      error => logger.error("Coordinator", `Scope ${scopeId} unregistration failed.`, error)
    )
  }

  _performUnregister(scopeId) {
    if (!this.scopes.has(scopeId)) {
      logger.warn("Coordinator", `Unable to register non-existent scope ${scopeId}. Skipping...`)
      return
    }

    if (this.scopes.get(scopeId).state === SCOPED_NAV_STATES.inactive) {
      this.scopes.delete(scopeId)
      this._pendingRouteEntryFocus.delete(scopeId)
      logger.debug("Coordinator", `Scope ${scopeId} already inactive, unregistered from registry.`)
      return
    } else {
      this.deactivateScope(scopeId, { resumePrevious: true, force: true, unregister: true })
      this._pendingRouteEntryFocus.delete(scopeId)
      logger.debug("Coordinator", `Scope ${scopeId} deactivated, unregistered from registry.`)
    }

    logger.debug("Coordinator", `Scope ${scopeId} unregistered.`)
    return scopeId
  }

  // ========================================
  // Scope Management
  // ========================================
  _getConflicts(scopeId) {
    return {
      [this.GLOBAL_ACTIVATION_KEY]: this.transitionQueue.resolution.replaceWithResolve,
      [`activate:${scopeId}`]: this.transitionQueue.resolution.replaceWithResolve,
      [`deactivate:${scopeId}`]: this.transitionQueue.resolution.replaceWithResolve,
      [`suspend:${scopeId}`]: this.transitionQueue.resolution.replaceWithResolve,
      [`resume:${scopeId}`]: this.transitionQueue.resolution.replaceWithResolve,
    }
  }

  activateScope(scopeId, options = {}) {
    logger.debug("Coordinator", `Attempting to activate scope: ${scopeId}`)
    return this.transitionQueue.enqueue(
      `activate:${scopeId}`,
      () => this._performActivation(scopeId, options),
      [],
      this._getConflicts(scopeId),
      result => { },
      error => {
        logger.error("Coordinator", "activateScope rejected", error)
      }
    )
  }

  _performActivation(scopeId, options = {}) {
    if (!this.enabled.value && !options.force) {
      logger.warn("Coordinator", "Coordinator disabled, ignoring activation request:", scopeId)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      logger.warn("Coordinator", "Unable to activate non-existent scope: ", scopeId)
      return false
    }

    const currentScope = this.getCurrentScope()

    if (currentScope?.id === scopeId) {
      logger.info("Coordinator", `Scope ${scopeId} already active`)
      return true
    }

    if (scope.state === SCOPED_NAV_STATES.suspended) {
      logger.info("Coordinator", `Scope ${scopeId} is already in stack and suspended. Resuming...`)
      // this._performResume(scopeId)
      this.resumeScope(scopeId, options)
      return
    }

    // Handle popup scope activation separately
    if (scope.isPopup) {
      logger.debug("Coordinator", `Activating popup scope: ${scopeId}`)

      // Suspend all scopes in the normal stack
      for (const stackScopeId of [...this.scopeStack.value].reverse()) {
        const stackScope = this.scopes.get(stackScopeId)
        if (stackScope && stackScope.state !== SCOPED_NAV_STATES.suspended) {
          this._performSuspend(stackScopeId, {
            reason: "popup-activation",
            childScopeId: scopeId,
            skipUINavSync: true,
          })
        }
      }

      // Suspend the current top popup scope
      const currentPopupId = this.popupScopeStack.value.length > 0
        ? this.popupScopeStack.value[this.popupScopeStack.value.length - 1]
        : null
      if (currentPopupId) {
        const currentPopupScope = this.scopes.get(currentPopupId)
        if (currentPopupScope && currentPopupScope.state !== SCOPED_NAV_STATES.suspended) {
          this._performSuspend(currentPopupId, {
            reason: "popup-activation",
            childScopeId: scopeId,
            skipUINavSync: true,
          })
        }
      }

      // Push to popup stack instead of normal stack
      this.popupScopeStack.value.push(scopeId)
      scope.state = SCOPED_NAV_STATES.active

      this._setActiveScopeInUINav(scopeId, options)

      scope.element.dispatchEvent(
        new CustomEvent(SCOPED_NAV_EVENTS.activate, {
          detail: {
            scopeId,
            activationType: scope.state,
            isPopup: true,
            ...options,
          },
        })
      )

      this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeActivated, { scope, options })

      this._reportActiveScopeIfChanged(scopeId, "activated", true)

      logger.debug("Coordinator", `Popup scope ${scopeId} activated`)
      return true
    }

    // Defer a normal-scope activation that arrives while a popup owns focus,
    // so the popup does not lose its focused element.
    if (!scope.isPopup && this.popupScopeStack.value.length > 0) {
      logger.debug("Coordinator", `Deferring normal scope activation while popup is active: ${scopeId}`)
      this._pendingNormalScopeActivation = { scopeId, options }
      return false
    }

    logger.debug("Coordinator", `Activating scope: ${scopeId}`)

    let referenceElement = scope.element
    const scopeConfig = scope.config || scope.element[SCOPED_NAV_PROPERTY_NAME]

    // For popover types, use the popover's target element instead of the teleported popover element
    if (scopeConfig && scopeConfig.type === SCOPE_TYPES.POPOVER) {
      const popover = usePopover()
      const popoverName = scope.element.getAttribute("data-bng-popover-name")
      const pop = popover.getPopover(popoverName)

      if (pop && pop.target) {
        referenceElement = pop.target
      } else {
        logger.warn("Coordinator", `Unable to find popover's target element for ${popoverName}. Using popover element as fallback.`)
      }
    }

    const parentScopedNavs = utils.getParentScopedNavs(referenceElement)
    const parentsFromRootToTarget = parentScopedNavs.reverse()
    const parentScopeIds = new Set(parentsFromRootToTarget.map(el => el.getAttribute(SCOPED_NAV_ATTR)))

    // Analyze each scope in the stack
    for (const stackScopeId of [...this.scopeStack.value].reverse()) {
      if (!parentScopeIds.has(stackScopeId)) {
        const stackScope = this.scopes.get(stackScopeId)

        // Special handling for popover types: suspend parent scopes that contain the reference element
        if (scopeConfig && scopeConfig.type === SCOPE_TYPES.POPOVER && stackScope) {
          if (stackScope.element.contains(referenceElement)) {
            // Parent scope contains the popover's trigger - suspend it instead of deactivating
            logger.debug("Coordinator", `Suspending parent scope ${stackScopeId} (contains popover target)`)
            this._performSuspend(stackScopeId, {
              reason: "popover-child-activation",
              childScopeId: scopeId,
              skipUINavSync: true,
            })
            continue
          }
        }

        // Default behavior: deactivate scopes not in parent chain
        this._performDeactivation(stackScopeId, {
          reason: "descendant-scope-activation",
          descendantScopeId: scopeId,
          skipUINavSync: true,
          skipFocus: true, // Always skip focus when descendant activates
          resumePrevious: false,
        })
      }
    }

    // merge the scopeStack with the parentScopedNavs
    const existingStackSet = new Set(this.scopeStack.value)
    const mergedStack = [...this.scopeStack.value]

    // Add parent scopes in order from root to target
    for (const parentElement of parentsFromRootToTarget) {
      const parentScopeId = parentElement.getAttribute(SCOPED_NAV_ATTR)

      if (!this.scopes.has(parentScopeId)) {
        logger.warn(`[ScopeCoordinator] Parent scope ${parentScopeId} not found. Skipping...`)
        continue
      }

      if (mergedStack.includes(parentScopeId)) {
        logger.debug("Coordinator", `Parent scope ${parentScopeId} already in stack. Skipping...`)
        continue
      }

      // Find the correct position to insert this parent scope
      let insertIndex = mergedStack.length // Default to end

      for (let i = 0; i < mergedStack.length; i++) {
        const existingScopeId = mergedStack[i]
        const existingScope = this.scopes.get(existingScopeId)

        if (!existingScope) continue

        // If the existing scope is a descendant of this parent, insert before it
        if (this._isScopeNested(parentElement, existingScope.element)) {
          insertIndex = i + 1
        } else if (this._isScopeNested(existingScope.element, parentElement)) {
          break
        }
      }

      logger.debug("Coordinator", `Inserting parent scope ${parentScopeId} at index ${insertIndex}`)
      mergedStack.splice(insertIndex, 0, parentScopeId)
    }

    this.scopeStack.value = mergedStack

    // TODO: Need to check if this should be done upwards from target scoped nav to root scoped nav
    // Suspend all parent scopes
    for (const parentScopeId of parentScopeIds) {
      if (!this.scopeStack.value.includes(parentScopeId)) continue

      const parentScope = this.scopes.get(parentScopeId)
      if (!parentScope) continue

      if (existingStackSet.has(parentScopeId)) {
        if (parentScope.state !== SCOPED_NAV_STATES.suspended) {
          logger.debug("Coordinator", `Suspending parent scope ${parentScopeId}`)
          this._performSuspend(parentScopeId, {
            reason: "child-activation",
            childScopeId: scopeId,
            skipUINavSync: true,
          })
        }
      } else {
        // This scope is new to the stack - silently suspend it
        logger.debug("Coordinator", `Suspending new parent scope ${parentScopeId}`)
        parentScope.state = SCOPED_NAV_STATES.suspended
        const event = new CustomEvent(SCOPED_NAV_EVENTS.suspend, {
          detail: {
            scopeId: parentScopeId,
            reason: "child-activation",
            activationType: SCOPED_NAV_STATES.suspended,
            childScopeId: scopeId,
            silent: true,
          },
        })
        parentScope.element.dispatchEvent(event)
      }
    }

    logger.debug("Coordinator", `Activating scope: ${scopeId}`)

    this.scopeStack.value.push(scopeId)
    scope.state = SCOPED_NAV_STATES.active

    this._setActiveScopeInUINav(scopeId, options)

    scope.element.dispatchEvent(
      new CustomEvent(SCOPED_NAV_EVENTS.activate, {
        detail: {
          scopeId,
          activationType: scope.state,
          ...options,
        },
      })
    )

    this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeActivated, { scope, options })

    this._reportActiveScopeIfChanged(scopeId, "activated", false)

    logger.debug("Coordinator", `Scope ${scopeId} activated`)
    return true
  }

  deactivateScope(scopeId, options = { resumePrevious: true }) {
    logger.debug("Coordinator", "Attempting to deactivate scope", scopeId, options)
    return this.transitionQueue.enqueue(
      `deactivate:${scopeId}`,
      () => this._performDeactivation(scopeId, options),
      [],
      this._getConflicts(scopeId),
      result => { },
      error => {
        logger.error("Coordinator", "deactivateScope rejected", error)
      }
    )
  }

  _performDeactivation(scopeId, options) {
    if (!this.enabled.value && !options.force) {
      logger.warn("Coordinator", `Coordinator disabled, ignoring deactivation request: ${scopeId}`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      logger.warn("Coordinator", `Unable to deactivate non-existent scope: ${scopeId}`)
      return false
    }

    if (scope.state === SCOPED_NAV_STATES.inactive) {
      logger.info("Coordinator", `Scope ${scopeId} already inactive`)
      // if (options.unregister) {
      //   this.scopes.delete(scopeId)
      //   logger.debug(`[ScopeCoordinator] Scope ${scopeId} unregister from registry.`)
      // }
      return true
    }

    // Handle popup scope deactivation separately
    if (scope.isPopup) {
      logger.debug("Coordinator", `Deactivating popup scope: ${scopeId}`)

      const popupIndex = this.popupScopeStack.value.indexOf(scopeId)
      if (popupIndex !== -1) {
        this.popupScopeStack.value.splice(popupIndex, 1)
      }

      scope.state = SCOPED_NAV_STATES.inactive

      this._setActiveScopeInUINav(undefined, options)

      // Dispatch deactivation event
      scope.element.dispatchEvent(
        new CustomEvent(SCOPED_NAV_EVENTS.deactivate, {
          detail: {
            scopeId,
            activationType: SCOPED_NAV_STATES.inactive,
            isPopup: true,
            ...options,
          },
        })
      )

      // Notify observers
      this.notifyObservers("scopeDeactivated", { scope, options })

      if (options.unregister) {
        this.scopes.delete(scopeId)
        logger.debug("Coordinator", `Popup scope ${scopeId} unregistered from registry.`)
      }

      // Determine what to resume next
      if (this.popupScopeStack.value.length > 0) {
        const lastPopupId = this.popupScopeStack.value[this.popupScopeStack.value.length - 1]
        const lastPopupScope = this.scopes.get(lastPopupId)
        if (lastPopupScope && lastPopupScope.state === SCOPED_NAV_STATES.suspended) {
          logger.debug("Coordinator", `Resuming previous popup scope: ${lastPopupId}`)

          const previousState = lastPopupScope.state
          lastPopupScope.state = SCOPED_NAV_STATES.active

          this._setActiveScopeInUINav(lastPopupId)

          lastPopupScope.element.dispatchEvent(
            new CustomEvent(SCOPED_NAV_EVENTS.resume, {
              detail: {
                scopeId: lastPopupId,
                previousState,
                activationType: SCOPED_NAV_STATES.active,
                reason: "popup-closed",
              },
            })
          )

          this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeResumed, {
            scope: lastPopupScope,
            options: { reason: "popup-closed" },
          })
        }
      } else {
        // Resume the last scope in normal stack
        const lastNormalScopeId = this.scopeStack.value[this.scopeStack.value.length - 1]
        if (lastNormalScopeId) {
          // A suspended normal scope takes priority; any deferred activation is stale.
          this._pendingNormalScopeActivation = null
          if (this.hasActivationBarrier()) {
            // Defer until the popup host removes its wrapper, otherwise scoped
            // nav focus selection runs while the dialog still occludes targets.
            logger.debug("Coordinator", `Deferring normal-scope resume behind activation barrier: ${lastNormalScopeId}`)
            this._pendingNormalScopeResume = { scopeId: lastNormalScopeId, options: { reason: "popup-closed" } }
          } else {
            logger.debug("Coordinator", `Resuming last scope in normal stack: ${lastNormalScopeId}`)
            this._performResume(lastNormalScopeId, { reason: "popup-closed" })
          }
        } else if (!this.hasActivationBarrier()) {
          // No normal scope to resume (e.g. route-target activation arrived after
          // the popup opened). Activate the deferred scope now. If a barrier is
          // still active, endActivationBarrier flushes it once the wrapper is gone.
          this._flushPendingNormalScopeActivation()
        }
      }

      this._reportActiveScopeIfChanged(scopeId, "deactivated", true)

      logger.info("Coordinator", `Popup scope ${scopeId} deactivated`)
      return true
    }

    let scopeIndex = this.scopeStack.value.indexOf(scopeId)
    if (scopeIndex === -1) {
      logger.warn("Coordinator", `Scope ${scopeId} is not in stack, cannot deactivate`)
      return false
    }

    logger.debug("Coordinator", `Deactivating scope: ${scopeId}`)

    const trailing = this.scopeStack.value.slice(scopeIndex + 1).toReversed()
    for (const trailingScopeId of trailing) {
      const trailingScopeIndex = this.scopeStack.value.indexOf(trailingScopeId)
      if (trailingScopeIndex === -1) {
        logger.warn(`[ScopeCoordinator] Trailing scope ${trailingScopeId} not found. Skipping...`)
        continue
      }
      this.scopeStack.value.splice(trailingScopeIndex, 1)
      const trailingScope = this.scopes.get(trailingScopeId)
      if (!trailingScope) {
        logger.warn(`[ScopeCoordinator] Trailing scope ${trailingScopeId} not found. Skipping...`)
        continue
      }
      trailingScope.state = SCOPED_NAV_STATES.inactive
      trailingScope.element.dispatchEvent(
        new CustomEvent(SCOPED_NAV_EVENTS.deactivate, {
          detail: {
            scopeId: trailingScopeId,
            reason: "parent-scope-deactivation",
            force: true,
            ...options,
          },
        })
      )
    }

    // Deactivate the target scope
    scope.state = SCOPED_NAV_STATES.inactive
    this.scopeStack.value.splice(scopeIndex, 1)

    this._setActiveScopeInUINav(undefined, options)

    // Dispatch deactivation event to the element
    scope.element.dispatchEvent(
      new CustomEvent(SCOPED_NAV_EVENTS.deactivate, {
        detail: {
          scopeId,
          activationType: SCOPED_NAV_STATES.inactive,
          ...options,
        },
      })
    )

    // Notify observers
    this.notifyObservers("scopeDeactivated", { scope, options })

    // TODO: Move this to the unregister scope method
    if (options.unregister) {
      this.scopes.delete(scopeId)
      logger.debug("Coordinator", `Scope ${scopeId} unregistered from registry.`)
    }

    if (options.resumePrevious) {
      const previousScopeId = this.scopeStack.value[scopeIndex - 1]
      if (previousScopeId) {
        this._performResume(previousScopeId, {
          reason: "parent-scope-deactivation",
          parentScopeId: scopeId,
        })
      }
    }

    this._reportActiveScopeIfChanged(scopeId, "deactivated", false)

    logger.info("Coordinator", `Deactivated scope: ${scopeId}`)
    return true
  }

  suspendScope(scopeId) {
    if (this._isPendingAndBlocking()) {
      logger.debug("Coordinator", `suspendScope blocked for ${scopeId}: pending activation active`)
      return
    }

    logger.debug("Coordinator", `Attempting to suspend scope: ${scopeId}`)
    return this.transitionQueue.enqueue(
      `suspend:${scopeId}`,
      () => this._performSuspend(scopeId),
      [],
      this._getConflicts(scopeId),
      result => { },
      error => {
        logger.error("Coordinator", `Suspend scope ${scopeId} rejected`, error)
      }
    )
  }

  _performSuspend(scopeId, options = {}) {
    if (!this.enabled.value && !options.force) {
      logger.warn("Coordinator", `Coordinator disabled, ignoring suspend request: ${scopeId}`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      logger.warn("Coordinator", `Unable to suspend non-existent scope: ${scopeId}`)
      return false
    }

    if (scope.state !== SCOPED_NAV_STATES.active) {
      logger.warn("Coordinator", `Scope ${scopeId} is not active, cannot suspend`)
      return true
    }

    logger.debug("Coordinator", `Suspending scope: ${scopeId}`)
    this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onBeforeScopeSuspended, { scope, options })

    scope.state = SCOPED_NAV_STATES.suspended

    this._setActiveScopeInUINav(undefined, options)

    scope.element.dispatchEvent(
      new CustomEvent(SCOPED_NAV_EVENTS.suspend, {
        detail: {
          scopeId,
          activationType: scope.state,
          ...options,
        },
      })
    )

    this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeSuspended, { scope, options })
    return true
  }

  resumeScope(scopeId, options = {}) {
    logger.debug("Coordinator", `Attempting to resume scope: ${scopeId}`)
    return this.transitionQueue.enqueue(
      `resume:${scopeId}`,
      () => this._performResume(scopeId, options),
      [],
      this._getConflicts(scopeId),
      result => { },
      error => {
        logger.error("Coordinator", `Resume scope ${scopeId} rejected`, error)
      }
    )
  }

  _performResume(scopeId, options = {}) {
    if (!this.enabled.value && !options.force) {
      logger.warn("Coordinator", `Coordinator disabled, ignoring resume request: ${scopeId}`)
      return false
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      logger.warn("Coordinator", `Unable to resume non-existent scope: ${scopeId}`)
      return false
    }

    if (scope.state !== SCOPED_NAV_STATES.suspended) {
      logger.warn("Coordinator", `Scope ${scopeId} is not suspended, cannot resume`)
      return false
    }

    if (!this.scopeStack.value.includes(scopeId)) {
      logger.warn(`[ScopeCoordinator] Scope is not in stack, cannot resume: `, { scopeId, stack: this.scopeStack.value })
      return false
    }

    logger.debug("Coordinator", `Resuming scope: ${scopeId}`)

    this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onBeforeScopeResumed, { scope, options })

    const scopeIndex = this.scopeStack.value.indexOf(scopeId)
    if (scopeIndex === -1) {
      logger.warn("Coordinator", `Scope ${scopeId} is not in stack, cannot resume`)
      return false
    }

    // Deactivate all trailing scopes
    const trailingScopes = this.scopeStack.value.slice(scopeIndex + 1).toReversed()
    for (const trailingScopeId of trailingScopes) {
      this._performDeactivation(trailingScopeId, {
        reason: "parent-scope-resumed",
        parentScopeId: scopeId,
        skipUINavSync: true,
        force: true,
      })
    }
    // suspend the parent scope
    const parentScopeId = scopeIndex > 0 ? this.scopeStack.value[scopeIndex - 1] : undefined
    const parentScope = parentScopeId ? this.scopes.get(parentScopeId) : undefined

    if (parentScope && parentScope.state !== SCOPED_NAV_STATES.suspended) {
      this._performSuspend(parentScopeId, {
        reason: "parent-scope-resumed",
        parentScopeId: scopeId,
        skipUINavSync: true,
      })
    }

    // Change state from suspended to active
    const previousState = scope.state
    scope.state = SCOPED_NAV_STATES.active

    this._setActiveScopeInUINav(scopeId, options)

    // Restore lastActiveElement to directive property from coordinator storage
    if (scope.lastActiveElement && scope.element[SCOPED_NAV_PROPERTY_NAME]) {
      scope.element[SCOPED_NAV_PROPERTY_NAME].lastActiveElement = scope.lastActiveElement
    }

    scope.element.dispatchEvent(
      new CustomEvent(SCOPED_NAV_EVENTS.resume, {
        detail: {
          scopeId,
          previousState,
          activationType: scope.state,
          ...options,
        },
      })
    )

    this.notifyObservers(SCOPED_NAV_OBSERVER_EVENTS.onScopeResumed, { scope, options })

    this._reportActiveScopeIfChanged(scopeId, "resumed", false)

    logger.info("Coordinator", `Resumed scope: ${scopeId}`)
    return true
  }

  // ========================================

  notifyObservers(eventName, payload) {
    this.observers.forEach(observer => {
      observer(eventName, payload)
    })
  }

  addObserver(observer) {
    this.observers.add(observer)
  }

  removeObserver(observer) {
    this.observers.delete(observer)
  }

  isActiveScope(scopeId) {
    const scope = this.scopes.get(scopeId)
    return scope && scope.state === SCOPED_NAV_STATES.active
  }

  getCurrentScope() {
    // Popup stack takes priority over normal stack
    if (this.popupScopeStack.value.length > 0) {
      const currentPopupId = this.popupScopeStack.value[this.popupScopeStack.value.length - 1]
      return this.scopes.get(currentPopupId)
    }

    // Fall back to normal stack
    if (this.scopeStack.value.length === 0) return null
    const currentScopeId = this.scopeStack.value[this.scopeStack.value.length - 1]
    return this.scopes.get(currentScopeId)
  }

  getScopeById(scopeId) {
    return this.scopes.get(scopeId)
  }

  getRegisteredScopes() {
    return this.scopes
  }

  _isScopeNested(childElement, parentElement) {
    if (!childElement || !parentElement) return false
    return parentElement.contains(childElement) && childElement !== parentElement
  }
}

const SCOPE_COORDINATOR_INSTANCE_KEY = "__bngScopeCoordinatorInstance"
const getStoredScopeCoordinatorInstance = () => window[SCOPE_COORDINATOR_INSTANCE_KEY]

export const setScopeCoordinatorInstance = coordinatorInstance => {
  if (coordinatorInstance === null || coordinatorInstance === undefined) {
    delete window[SCOPE_COORDINATOR_INSTANCE_KEY]
    return
  }
  window[SCOPE_COORDINATOR_INSTANCE_KEY] = coordinatorInstance
}

export const getScopeCoordinatorInstance = () => {
  const instance = getStoredScopeCoordinatorInstance()
  if (!instance) {
    throw new Error("ScopeCoordinator not initialized.")
  }
  return instance
}

export { ScopeCoordinator }
export default getScopeCoordinatorInstance
