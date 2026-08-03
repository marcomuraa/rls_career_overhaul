/**
 * UINavActionHandlers - Handles default actions for UI navigation events
 * Processes DOM ui_nav events and executes corresponding game actions
 */
import { default as lua, runRaw as runRawLua } from "@/bridge/libs/Lua"
import logger from "@/services/logger"
import * as Crossfire from "@/services/crossfire"
import { NAV_ACTIONS } from "./constants.js"
import { perfEnd, perfMark, perfStart } from "./perf.js"

export class UINavActionHandlers {
  constructor(eventBus = null) {
    this._useCrossfire = true
    this.eventBus = eventBus
  }

  /**
   * Set whether to use Crossfire for event handling
   */
  setUseCrossfire(enabled) {
    this._useCrossfire = enabled
  }

  get useCrossfire() {
    return this._useCrossfire
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
  }

  /**
   * Handle global UI navigation events with default behaviors
   * This is the main entry point for DOM ui_nav events
   *
   * @param {CustomEvent} event - The UI navigation DOM event
   */
  handleGlobalEvent = event => {
    // logger.debug("UINavActionHandlers: handleGlobalEvent", { event })
    const eventData = event.detail
    // DEV_ONLY >>
    perfMark(eventData.perfId, "globalHandler:start", {
      defaultPrevented: event.defaultPrevented,
      value: eventData.value,
    })
    // << DEV_ONLY

    // Handle button down events (value === 1)
    if (eventData.value === 1) {
      let perfToken = null
      // DEV_ONLY >>
      perfToken = perfStart(eventData.perfId, "globalHandler.handleMenuActions")
      // << DEV_ONLY
      if (this.handleMenuActions(eventData)) {
        // DEV_ONLY >>
        perfEnd(perfToken, { handled: true })
        // << DEV_ONLY
        return
      }
      // DEV_ONLY >>
      perfEnd(perfToken, { handled: false })
      perfToken = perfStart(eventData.perfId, "globalHandler.handleNavigationActions")
      // << DEV_ONLY
      if (this.handleNavigationActions(eventData)) {
        // DEV_ONLY >>
        perfEnd(perfToken, { handled: true })
        // << DEV_ONLY
        return
      }
      // DEV_ONLY >>
      perfEnd(perfToken, { handled: false })
      perfToken = perfStart(eventData.perfId, "globalHandler.handleGameActions")
      // << DEV_ONLY
      if (this.handleGameActions(eventData)) {
        // DEV_ONLY >>
        perfEnd(perfToken, { handled: true })
        // << DEV_ONLY
        return
      }
      // DEV_ONLY >>
      perfEnd(perfToken, { handled: false })
      // << DEV_ONLY
    }

    // Send to Crossfire
    if (this.useCrossfire && eventData.sendToCrossfire) {
      // logger.debug("UINavActionHandlers: handleGlobalEvent - sending to crossfire", { event })
      let perfToken = null
      // DEV_ONLY >>
      perfToken = perfStart(eventData.perfId, "crossfire.handleUINavEvent")
      // << DEV_ONLY
      Crossfire.handleUINavEvent(event)
      // DEV_ONLY >>
      perfEnd(perfToken, {
        defaultPrevented: event.defaultPrevented,
      })
      // << DEV_ONLY
    }

    // This should not be needed anymore due to the new changes in bindings where if UI no handler is found, actionmap for the action will not be enabled
    // Handle remaining actions if not prevented by Crossfire
    // if (!event.defaultPrevented) {
    //   let perfToken = null
    //   // DEV_ONLY >>
    //   perfToken = perfStart(eventData.perfId, "globalHandler.handleCameraRotation")
    //   // << DEV_ONLY
    //   this.handleCameraRotation(eventData)
    //   // DEV_ONLY >>
    //   perfEnd(perfToken)
    //   // << DEV_ONLY
    // }
  }

  /**
   * Handle menu-related actions (menu, back)
   * @param {object} eventData - Event detail data
   * @returns {boolean} - True if event was handled, otherwise false
   */
  handleMenuActions = eventData => {
    if (eventData.name === "menu") {
      // Tell Angular to toggle menu
      // Note: This is backward compatibility with Angular screens
      const globalAngularRootScope = window.globalAngularRootScope
      if (globalAngularRootScope) {
        globalAngularRootScope.$broadcast("MenuToggle")
        return false
      }
      return true
    }

    if (eventData.name === "back") {
      // Global fallback: route back through the Lua router.
      // Reaches here only if no component consumed (and stopped propagation of) the event.
      lua.extensions.ui_router.back()
      return true
    }

    return false
  }

  /**
   * Handle navigation actions (focus movements)
   * @param {object} eventData - Event detail data
   * @returns {boolean} - True if event was handled, otherwise false
   */
  handleNavigationActions(eventData) {
    if (NAV_ACTIONS.includes(eventData.name)) {
      // Tell Lua we're in MenuItemNavigation
      lua.extensions.hook("onMenuItemNavigation")
      return
    }
    return false
  }

  /**
   * Handle game-specific actions (pause, camera center)
   * @param {object} eventData - Event detail data
   * @returns {boolean} - True if event was handled, otherwise false
   */
  handleGameActions(eventData) {
    switch (eventData.name) {
      case "pause":
        // Toggle pause state
        lua.simTimeAuthority.togglePause()
        return true

      case "center_cam":
        // Center camera - uses player ID from extras if available
        runRawLua(`if core_camera then core_camera.resetCamera(${eventData.extras.player}) end`, false)
        return true

      default:
        return false
    }
  }

  /**
   * Handle camera rotation (rotate_h_cam, rotate_v_cam)
   * @param {object} eventData - Event detail data
   */
  handleCameraRotation(eventData) {
    // TODO: Maybe this should be handled in lua via gameplay or action map?
    if (eventData.name === "rotate_h_cam" || eventData.name === "rotate_v_cam") {
      const camDir = eventData.name === "rotate_v_cam" ? "pitch" : "yaw"
      const [filterType] = eventData.extras || [0]
      runRawLua(`if core_camera then core_camera.rotate_${camDir}(${eventData.value}, ${filterType}) end`, false)
    }
  }

  isBigMapContext() {
    // TODO: Why not check from lua state/context if currently in bigmap or not
    const validHashes = ["#/bigmap", "#/menu.bigmap", "#/play", "#/menu/bigmap"]
    return validHashes.includes(window.location.hash)
  }
}
