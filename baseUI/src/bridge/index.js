// Take care with import paths here as this file is also going to be imported outside of a bundler (by the original code)
// !!! ALWAYS test new imports with vehicle dashboards !!!

import { BeamNGAPI, StreamManager, UIUnits, StreamHooks, Lua } from "./libs/index.js"
import { setBridgeProvider } from "./libs/Lua.js"

// Dependencies - need to pass in from outside
let dependencies

// Provide a bridge to the game engine
let bridge

export { Lua as lua }

export const useBridge = () => {
  if (bridge) return bridge

  if (window.bridge) {
    bridge = window.bridge
    installStreamResubmitListeners(bridge)
    return bridge
  }

  const events = new dependencies.Emitter() //|| new EventBus(emitter)

  const streamHooks = new StreamHooks({ events })

  streamHooks.install()

  const api = dependencies.overrideAPI || new BeamNGAPI(events, dependencies.beamng)

  bridge = {
    api,
    lua: Lua,
    events,
    streams: new StreamManager(api),
    streamHooks,
    units: new UIUnits(events, api),
    beamNG: dependencies.beamng,
    // uiNavService is added in main.js
  }

  installStreamResubmitListeners(bridge)

  return bridge
}

// this helps with stalled stream subs on vehicle change
function installStreamResubmitListeners(bridge) {
  if (bridge.streamResubmitListenersInstalled) return
  bridge.streamResubmitListenersInstalled = true
  bridge.events.on("VehicleChange", () => bridge.streams.resubmit())
  bridge.events.on("VehicleFocusChanged", data => {
    if (data?.mode === true || data?.mode === 1) bridge.streams.resubmit()
  })
}

export const setBridgeDependencies = deps => (dependencies = deps)

setBridgeProvider(useBridge)
