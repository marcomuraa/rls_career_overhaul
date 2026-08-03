// Embedded-UI bridge: a drop-in `window.beamng` that relays the in-game bridge's
// native calls to a host window (the workbench panel) over postMessage, and feeds
// the host's stream/hook frames back into ui-vue's inbound globals (see StreamHooks.js).
//
// This lets the unmodified in-game bridge (BeamNGAPI + StreamManager + UIUnits)
// run inside the workbench instead of CEF: the host executes the lua/streams
// against the real game over its websocket and posts the results back, so
// engineLua callbacks, streams, hooks and unit settings all work as in-game.

const listeners = {}

export function postToHost(t, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ src: "embed", t, ...data }, "*")
  }
}

export function onHostMessage(t, fn) {
  (listeners[t] || (listeners[t] = [])).push(fn)
}

function onMessage(ev) {
  const m = ev.data
  if (!m || m.src !== "host") return
  // stream + hook frames go straight into ui-vue's inbound entry points
  if (m.t === "streams") window.streamUpdate && window.streamUpdate(m.frame)
  else if (m.t === "hook") window.HookManager && window.HookManager.trigger(m.name, m.args)
  for (const fn of listeners[m.t] || []) fn(m)
}

// Collect the player-vehicle stream names out of a StreamManager subscription.
function parseStreams(data) {
  try {
    const o = typeof data === "string" ? JSON.parse(data) : data || {}
    const set = new Set()
    for (const v of o.vehicles || []) for (const s of v.streams || []) set.add(s)
    return [...set]
  } catch {
    return []
  }
}

export function installEmbedBridge() {
  window.addEventListener("message", onMessage)
  const beamng = {
    isEmbed: true,
    sendEngineLua: cmd => postToHost("el", { cmd }),
    sendActiveObjectLua: cmd => postToHost("ao", { cmd }),
    queueAllObjectLua: cmd => postToHost("all", { cmd }),
    sendGameEngine: () => {}, // TorqueScript: unused by UI apps
    subscribeToEvents: data => postToHost("sub", { streams: parseStreams(data) }),
  }
  window.beamng = beamng
  return beamng
}
