// In-game agent for the workbench "Vue Inspector" panel.
//
// Bridges the external workbench tool to this Vue app's live state. The
// workbench has no access to our JS context, so it reaches us through GE Lua:
//   GE relay --guihooks.trigger('workbenchInspectorReq')--> here
//   here --engineLua: extensions[ext].onInspectorReply(reqId, json)--> GE relay
//
// We enumerate Pinia stores, the persisted (saved) state (localStorage +
// engine settings), runtime stats and a rolling store action/mutation log, and
// apply edits back. Idle until the first request arrives (only an event
// listener is registered at startup).

import { isRef, toRaw } from "vue"
import { getActivePinia } from "pinia"
import { useBridge } from "@/bridge"
import { useSettings } from "@/services/settings"

const MAX_DEPTH = 6
const MAX_STR = 300
const MAX_ARR = 200
const MAX_KEYS = 200
const MAX_LOG = 200

let inited = false
let bridge = null
const actionCounts = {} // storeId -> number
const log = [] // { t, id, kind, name }

function pushLog(id, kind, name) {
  log.unshift({ t: Date.now(), id, kind, name })
  if (log.length > MAX_LOG) log.length = MAX_LOG
}

function stores() {
  const pinia = getActivePinia()
  return pinia ? [...pinia._s.values()] : []
}

// Attach action/mutation listeners once per store so the log + counts fill in.
// Stores are created lazily, so we re-scan on every request.
function hookStores() {
  for (const s of stores()) {
    if (s.__wbHooked) continue
    s.__wbHooked = true
    if (actionCounts[s.$id] == null) actionCounts[s.$id] = 0
    s.$onAction(({ name }) => { actionCounts[s.$id]++; pushLog(s.$id, "action", name) })
    s.$subscribe((m) => pushLog(s.$id, "patch", m.type === "direct" ? "$patch" : m.type), { detached: true })
  }
}

// Depth/size-capped, cycle-safe plain-data clone. Strips functions and reactive
// proxies so the result serializes cleanly and never explodes on big/cyclic state.
function safeClone(value, seen, depth) {
  if (depth > MAX_DEPTH) return "[…]"
  if (value == null) return value
  const t = typeof value
  if (t === "number" || t === "boolean") return value
  if (t === "string") return value.length > MAX_STR ? value.slice(0, MAX_STR) + "…" : value
  if (t === "function") return "[fn]"
  if (t === "bigint") return String(value)
  if (t !== "object") return String(value)
  // Pinia setup stores keep each state entry as a ref; unwrap to its value.
  if (isRef(value)) return safeClone(value.value, seen, depth)
  value = toRaw(value)
  if (seen.has(value)) return "[circular]"
  seen.add(value)
  let out
  if (Array.isArray(value)) {
    out = []
    const n = Math.min(value.length, MAX_ARR)
    for (let i = 0; i < n; i++) out.push(safeClone(value[i], seen, depth + 1))
    if (value.length > n) out.push(`…(+${value.length - n})`)
  } else if (value instanceof Map) {
    out = {}
    let i = 0
    for (const [k, v] of value) {
      if (i++ >= MAX_KEYS) { out["…"] = `(+${value.size - MAX_KEYS})`; break }
      out[String(k)] = safeClone(v, seen, depth + 1)
    }
  } else if (value instanceof Set) {
    out = []
    let i = 0
    for (const v of value) { if (i++ >= MAX_ARR) break; out.push(safeClone(v, seen, depth + 1)) }
  } else {
    out = {}
    const keys = Object.keys(value)
    const n = Math.min(keys.length, MAX_KEYS)
    for (let i = 0; i < n; i++) {
      const k = keys[i]
      try { out[k] = safeClone(value[k], seen, depth + 1) } catch { out[k] = "[err]" }
    }
    if (keys.length > n) out["…"] = `(+${keys.length - n})`
  }
  seen.delete(value)
  return out
}
const clone = (v) => safeClone(v, new WeakSet(), 0)

function approxSize(state) {
  try { return JSON.stringify(state).length } catch { return 0 }
}

function storeSummaries() {
  return stores().map((s) => {
    const st = toRaw(s.$state)
    return {
      id: s.$id,
      keys: Object.keys(st || {}),
      actions: actionCounts[s.$id] || 0,
      size: approxSize(clone(st)),
    }
  }).sort((a, b) => a.id.localeCompare(b.id))
}

function storeState(id) {
  const s = stores().find((x) => x.$id === id)
  if (!s) return null
  return clone(toRaw(s.$state))
}

// Persisted UI state lives in localStorage (namespaced "name:key"); engine
// game settings are the other "saved" surface, exposed via the settings service.
function savedState() {
  const ls = {}
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      const raw = window.localStorage.getItem(k)
      try { ls[k] = JSON.parse(raw) } catch { ls[k] = raw }
    }
  } catch {}
  let settings = {}
  try { settings = clone(toRaw(useSettings().values)) } catch {}
  return { localStorage: ls, settings }
}

function stats() {
  const sums = storeSummaries()
  return {
    storeCount: sums.length,
    totalSize: sums.reduce((a, s) => a + s.size, 0),
    totalActions: Object.values(actionCounts).reduce((a, n) => a + n, 0),
    logCount: log.length,
  }
}

function setByPath(obj, path, value) {
  let o = obj
  for (let i = 0; i < path.length - 1; i++) o = o?.[path[i]]
  if (o && typeof o === "object") o[path[path.length - 1]] = value
}

function applySet({ target, id, path = [], value }) {
  if (target === "store") {
    const s = stores().find((x) => x.$id === id)
    if (!s) throw new Error("no store: " + id)
    s.$patch((st) => setByPath(st, path, value))
  } else if (target === "settings") {
    useSettings().apply({ [path[0]]: value })
  } else if (target === "storage") {
    const key = path[0]
    if (path.length > 1) {
      let cur
      try { cur = JSON.parse(window.localStorage.getItem(key)) } catch { cur = {} }
      setByPath(cur, path.slice(1), value)
      window.localStorage.setItem(key, JSON.stringify(cur))
    } else {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  } else {
    throw new Error("unknown target: " + target)
  }
  return true
}

function callAction({ id, name, args = [] }) {
  const s = stores().find((x) => x.$id === id)
  if (!s || typeof s[name] !== "function") throw new Error("no action: " + id + "." + name)
  return clone(s[name](...args))
}

function handle(op, args) {
  hookStores()
  switch (op) {
    case "snapshot": return { stores: storeSummaries(), saved: savedState(), stats: stats(), log: log.slice(0, MAX_LOG) }
    case "store": return storeState(args.id)
    case "set": return applySet(args)
    case "action": return callAction(args)
    case "clearLog": log.length = 0; return true
    default: throw new Error("unknown op: " + op)
  }
}

function reply(ext, reqId, res) {
  try {
    const json = JSON.stringify(res)
    // Spaces inside the index brackets avoid Lua's `[[` long-string adjacency.
    bridge.api.engineLua(`extensions[ ${bridge.api.serializeToLua(ext)} ].onInspectorReply(${reqId}, ${bridge.api.serializeToLua(json)})`)
  } catch (e) {
    console.error("[workbenchInspector] reply failed", e)
  }
}

export function initWorkbenchInspector() {
  if (inited) return
  inited = true
  bridge = useBridge()
  bridge.events.on("workbenchInspectorReq", ({ reqId, op, args, ext }) => {
    let res
    try { res = { ok: true, data: handle(op, args || {}) } }
    catch (e) { res = { ok: false, error: String(e?.message || e) } }
    reply(ext, reqId, res)
  })
}
