// Stream + hook inbound handling for the bridge.
// Two pipelines:
// 1. streams  -> coordinator handshake -> broadcast to Vue/Angular -> uiFrameCallback ack
// 2. guihooks -> forwarded to the Vue event bus + Angular rootScope

import { now } from "../utils.js"
import * as coord from "./StreamCoordinator.js"

export default class StreamHooks {
  constructor({ events } = {}) {
    this.events = events || null

    // plain state owned by this single instance - nothing else to orphan
    this.coordinator = coord.createCoordinatorState()

    this.handlers = { stream: {}, hook: {} }

    // raw frame accounting, independent of the coordinator - lets uiHealth spot
    // "frames flowing but coordinator never driven" (the orphan symptom)
    this.streamFramesReceived = 0
    this.lastStreamFrameAt = 0

    this.skippedStreamUpdate = null
    this.skippedStreamUpdateAt = 0

    this._warnedNoCoordinator = false

    this.hookAdd("streamMain", this._streamHandler, "stream")
    this.hookAdd("hooksMain", this._hookHandler, "hook")
  }

  // bound (arrow fields) so bridge/index.js can assign them to the window.* globals
  streamUpdate = data => this._runHandlers("stream", data)

  multihookUpdate = hooksData => {
    for (const hook of hooksData) {
      this.hookTrigger(hook[0], hook[1])
    }
  }

  hookTrigger = (hookName, args) => this._runHandlers("hook", hookName, args)

  install(quiet = false) {
    if (!quiet && window.__bngStreamHooksOwner && window.__bngStreamHooksOwner !== this) {
      console.warn("StreamHooks: a new instance is reclaiming the inbound window globals from a previous instance")
    }
    window.streamUpdate = this.streamUpdate
    window.multihookUpdate = this.multihookUpdate
    window.HookManager = { trigger: this.hookTrigger }
    window.__bngStreamHooksOwner = this
    return this
  }

  isInstalled() {
    return window.streamUpdate === this.streamUpdate
  }

  // type "hook" (default) receives (hookName, args); "stream" receives (data)
  hookAdd(id, func, type = "hook") {
    if (!this.handlers[type]) this.handlers[type] = {}
    this.handlers[type][id] = func
  }

  hookRemove(id, type = "hook") {
    if (this.handlers[type]) delete this.handlers[type][id]
  }

  _runHandlers(type, ...data) {
    const bucket = this.handlers[type]
    if (!bucket) return
    const toRun = Object.values(bucket)
    toRun.length && toRun.forEach(f => f(...data))
  }

  setAngularRootScope = rootScope => coord.setAngularRootScope(this.coordinator, rootScope)

  _streamHandler = data => {
    const state = this.coordinator

    this.streamFramesReceived++
    this.lastStreamFrameAt = now()

    // single-owner design makes this impossible, but if state ever goes missing,
    // fail loud instead of silently degrading FPS
    if (!state) {
      if (!this._warnedNoCoordinator) {
        this._warnedNoCoordinator = true
        console.error("StreamHooks: stream frame received with no coordinator state - frame-ack signalling is dead")
      }
      this._broadcastStreams(data)
      return
    }

    if (state.processing) {
      // console.log("ERROR: streamUpdate cycle is already active, skipping this update of streams")
      this.skippedStreamUpdate = data
      this.skippedStreamUpdateAt = now()
      this.events?.emit?.("BridgeStreamSkipped")
      return
    }
    this.skippedStreamUpdate = null
    this.skippedStreamUpdateAt = 0

    coord.beginCycle(state)

    this._broadcastStreams(data)

    // tail job: re-run a skipped update once this cycle finishes. clears itself and
    // defers via microtask - behaves better during locked-up threads
    const callback = () => {
      if (!state.processing && this.skippedStreamUpdate) {
        this._streamHandler(this.skippedStreamUpdate)
      }
    }
    state.finishCallback = () => {
      state.finishCallback = undefined
      Promise.resolve().then(callback)
    }

    if (!state.processing) {
      state.finishCallback?.()
      return
    }

    coord.runDeferredWork(state, () => coord.completeCycle(state))
  }

  _broadcastStreams = data => {
    // TODO: use new format; for now merge them all into the old flat format
    let oldFormat = {}
    if (data.globalStreams) {
      for (let sn in data.globalStreams) {
        oldFormat[sn] = data.globalStreams[sn]
      }
    }
    if (data.vehicleStreams && data.vehicleStreams["player_0"]) {
      for (let sn in data.vehicleStreams["player_0"]) {
        oldFormat[sn] = data.vehicleStreams["player_0"][sn]
      }
    }
    // per-player namespaces for split-screen HUDs (player 0 still also lives at the flat root above)
    if (data.vehicleStreams) {
      oldFormat.players = {}
      for (let pk in data.vehicleStreams) {
        const idx = Number(pk.replace("player_", ""))
        if (!Number.isNaN(idx)) oldFormat.players[idx] = data.vehicleStreams[pk]
      }
    }

    window.globalAngularRootScope?.$broadcast("streamsUpdate", oldFormat)
    window.vueEventBus?.emit("onStreamsUpdate", oldFormat)
    if (window.vueGlobalStore) window.vueGlobalStore["streams"] = oldFormat
  }

  _hookHandler = (hookName, args) => {
    if (args && !Array.isArray(args)) {
      console.error(
        "StreamHooks.hookTrigger unsupported arguments (needs to be a list): " +
        JSON.stringify(hookName) + " - " + JSON.stringify(args).substring(0, 30) + " ... "
      )
    }
    window.vueEventBus?.emit(hookName, ...args)
    window.globalAngularRootScope?.$broadcast(hookName, ...args)
  }

  getStreamHealth = () => {
    const t = now()
    return {
      coordinator: coord.healthSnapshot(this.coordinator),
      hasSkippedStreamUpdate: !!this.skippedStreamUpdate,
      skippedFor: this.skippedStreamUpdateAt ? t - this.skippedStreamUpdateAt : 0,
      streamFramesReceived: this.streamFramesReceived,
      lastStreamFrameAt: this.lastStreamFrameAt,
      streamFramesFor: this.lastStreamFrameAt ? t - this.lastStreamFrameAt : 0,
    }
  }

  resetStreamState = (reason = "uiHealth") => {
    this.skippedStreamUpdate = null
    this.skippedStreamUpdateAt = 0
    return coord.resetTransientState(this.coordinator, reason)
  }
}
