const luaApi = () => window.bngApi || window.beamng

// in ultralight, something odd happens with back-to-back engineLua calls in the same microtask chain
// so, serialise every callLua through this queue with a gap between each for a good measure
let callQueue = Promise.resolve()
const macrotaskGap = () => new Promise(r => setTimeout(r, 0))

export function callLua(code) {
  const run = () => new Promise(resolve => {
    const api = luaApi()
    if (api && api.engineLua) api.engineLua(code, resolve)
    else resolve(null)
  })
  const result = callQueue.then(macrotaskGap).then(run)
  // a slow/failed call must not stall every call queued behind it
  callQueue = result.catch(() => {})
  return result
}

export function whenLuaReady(intervalMs = 300, maxWaitMs = 30000) {
  return new Promise(resolve => {
    let done = false
    const start = performance.now()
    const finish = () => { if (done) return; done = true; clearInterval(timer); resolve() }
    const ping = () => {
      const api = luaApi()
      // serializeToLua might lag a tick behind engineLua on ultralight (what)
      const ready = api && typeof api.engineLua === "function" && typeof api.serializeToLua === "function"
      if (ready) return api.engineLua("isLuaReady()", res => res && finish())
      // bail only after maxWaitMs
      if (performance.now() - start > maxWaitMs) finish()
    }
    const timer = setInterval(ping, intervalMs)
    ping()
  })
}

const wrapLuaCall = (func, args = "", def = "0") => callLua(`extensions.ui_uiMods and extensions.ui_uiMods.${func}(${args}) or ${def}`)
const wrapDatastore = (func, args = "", def = "nil") => callLua(`extensions.util_datastore and extensions.util_datastore.${func}(${args}) or ${def}`)

const luaList = arr => "{" + arr.map(s => JSON.stringify(s)).join(",") + "}"

const serializeToLua = value => {
  const api = luaApi()
  return api && typeof api.serializeToLua === "function" ? api.serializeToLua(value) : "nil"
}

const dsArgs = (...vals) => vals.map(serializeToLua).join(", ")

export const lua = {
  setUiRuntimeBundled: (includes, excludes) => wrapLuaCall("setUiRuntimeBundled", `{includes=${luaList(includes)}, excludes=${luaList(excludes)}}`, "false"),
  getUiRuntimeFileList: (cacheEnabled) => wrapLuaCall("getUiRuntimeFileList", JSON.stringify(cacheEnabled), "{}"),
  getUiRuntimeRevisions: () => wrapLuaCall("getUiRuntimeRevisions", "", "{}"),
  bumpUiRuntimeRevision: (path) => wrapLuaCall("bumpUiRuntimeRevision", JSON.stringify(path), "0"),
  // cache:
  registerCache: (storeName, primaryField, opts) => wrapDatastore("register", dsArgs(storeName, primaryField, opts || {}), "false"),
  getCacheEntry: (storeName, field, value) => wrapDatastore("getEntry", dsArgs(storeName, field, value), "nil"),
  getCacheEntries: (storeName, field, values) => wrapDatastore("getEntries", dsArgs(storeName, field, values), "{}"),
  getCacheIndex: (storeName, field, primaryKey) => wrapDatastore("getIndex", dsArgs(storeName, field, !!primaryKey), "{}"),
  getCacheChain: (storeName, field, value) => wrapDatastore("getChain", dsArgs(storeName, field, value), "{}"),
  getAllCacheEntries: (storeName) => wrapDatastore("getAll", dsArgs(storeName), "{}"),
  hasCacheEntry: (storeName, field, value) => wrapDatastore("hasEntry", dsArgs(storeName, field, value), "false"),
  putCacheEntries: (storeName, entries) => wrapDatastore("putEntries", dsArgs(storeName, entries), "false"),
  removeCacheEntries: (storeName, field, values) => wrapDatastore("removeEntries", dsArgs(storeName, field, values), "false"),
  clearCache: (storeName) => wrapDatastore("clear", dsArgs(storeName), "false"),
  setCacheChain: (storeName, chainField, field) => wrapDatastore("setChain", dsArgs(storeName, chainField, field), "false"),
}
