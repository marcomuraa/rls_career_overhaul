// Warm-boot cache for compiled modules.
// record = { name, id, mtime, data, chain }:
//   name  - file path (key)
//   id    - persistent SFC scope id (null for non-SFC), from a monotonic counter that is itself
//           persisted, so a fresh compile never reuses an id baked into a cached record.
//   mtime - file modtime; the staleness gate (a real edit moves it -> rebuild).
//   data  - compiled record (CJS code + deps, or SFC script/template/styles).
//   chain - hard deps for Lua's getChain walk (when enabled)
//
// Thin wrapper over a selectable backend (CACHE_MODE):
//   "disabled"  - no persistence (every boot recompiles)
//   "indexeddb" - browser IndexedDB (fastest and least code overhead)
//   "lua" / "lua-all" / "lua-chain" - util_datastore Lua module
//       "lua"       - one getEntry round-trip per module, on demand (slowest due to the amount of round-trips)
//       "lua-all"   - one getAll bulk read, primed on first access (fast, but biggest response size at startup)
//       "lua-chain" - a module's whole required-dep closure in one getChain, on demand (fast, but biggest payload per record)

import { recordPhase } from "../host/diagnostics.js"
import { CACHE_MODE, CACHE_ALL, CACHE_CHAIN, RT_DEV } from "../config.js"
import { lua, whenLuaReady } from "../host/lua.js"

const STORE_PREFIX = "ui-cache"
const JSON_DELAY = 500
// this distinction prevents cross-contamination of the cache between the dev and prod runtime bundles
const DB_NAME = RT_DEV ? "rt-sfc-dev" : "rt-sfc"
const STORE = "modules"
const SEQ_KEY = "\u0001seq" // must stay NUL-free, since a NUL byte corrupts the batch with <eol>
const pnow = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())

function disabledBackend() {
  return { get: async () => undefined, put: () => {}, delete: () => {}, clear: async () => {} }
}

function indexedDbBackend() {
  let dbPromise = null
  let dead = false

  function openDb() {
    if (dead) return Promise.resolve(null)
    if (dbPromise) return dbPromise
    dbPromise = new Promise(resolve => {
      let settled = false
      const give = (db, off) => {
        if (settled) return
        settled = true
        if (off) dead = true
        resolve(db)
      }
      try {
        if (typeof window === "undefined" || !window.indexedDB) return give(null, true)
        const req = window.indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "name" })
        }
        req.onsuccess = () => give(req.result)
        req.onerror = () => give(null, true)
        req.onblocked = () => give(null, true)
        // safety: if browser build never fires open callbacks, fall back so a lookup can't hang boot
        setTimeout(() => give(null, true), 2000)
      } catch {
        give(null, true)
      }
    })
    return dbPromise
  }

  async function get(name) {
    const db = await openDb()
    if (!db) return undefined
    return new Promise(resolve => {
      try {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(undefined)
      } catch { resolve(undefined) }
    })
  }

  function put(record) {
    openDb().then(db => {
      if (!db) return
      const t0 = pnow()
      try {
        db.transaction(STORE, "readwrite").objectStore(STORE).put(record)
      } catch { }
      recordPhase("idb", pnow() - t0)
    })
  }

  function del(name) {
    openDb().then(db => {
      if (!db) return
      try {
        db.transaction(STORE, "readwrite").objectStore(STORE).delete(name)
      } catch { }
    })
  }

  async function clear() {
    const db = await openDb()
    if (!db) return
    try {
      db.transaction(STORE, "readwrite").objectStore(STORE).clear()
    } catch { }
  }

  return { get, put, delete: del, clear }
}

function luaBackend() {
  // records already pulled from Lua (a getAll prime, or a getChain closure)
  const local = new Map()
  const absorb = list => {
    if (Array.isArray(list))
      for (const r of list)
        if (r && r.name != null)
          local.set(r.name, r)
  }

  // true once the "lua-all" bulk data has been fetched at least once (reset by clear())
  let primed = false

  const registered = whenLuaReady().then(async () => {
    await lua.registerCache(DB_NAME, "name", { prefix: STORE_PREFIX, path: "/temp" })
    if (CACHE_CHAIN) await lua.setCacheChain(DB_NAME, "chain", "name")
  })

  let primeAll = null
  let pendingPut = new Map()
  let pendingDelete = new Set()
  let flushTimer = null

  async function flush() {
    flushTimer = null
    await registered
    if (!pendingPut.size && !pendingDelete.size) return
    if (pendingPut.size) {
      const entries = [...pendingPut.values()]
      pendingPut = new Map()
      lua.putCacheEntries(DB_NAME, entries)
    }
    if (pendingDelete.size) {
      const names = [...pendingDelete]
      pendingDelete = new Set()
      lua.removeCacheEntries(DB_NAME, "name", names)
    }
  }

  function scheduleFlush() {
    if (flushTimer == null) flushTimer = setTimeout(flush, JSON_DELAY)
  }

  // lua-all - one bulk read, re-fetched after clear()
  function ensureAll() {
    if (!primeAll) {
      primeAll = registered.then(() => {
        if (primed) return
        primed = true
        return lua.getAllCacheEntries(DB_NAME).then(absorb)
      })
    }
    return primeAll
  }

  async function get(name) {
    await registered
    if (CACHE_ALL) { await ensureAll(); return local.get(name) }
    if (local.has(name)) return local.get(name)
    // lua-chain - first touch of a module pulls its whole required-dep closure in one call,
    //             priming the deps so their own lookups are local hits
    if (CACHE_CHAIN) {
      absorb(await lua.getCacheChain(DB_NAME, "name", name))
      if (local.has(name)) return local.get(name)
    }
    return lua.getCacheEntry(DB_NAME, "name", name)
  }

  return {
    get,
    put(record) {
      local.set(record.name, record)
      pendingDelete.delete(record.name)
      pendingPut.set(record.name, record)
      scheduleFlush()
    },
    delete(name) {
      local.delete(name)
      pendingPut.delete(name)
      pendingDelete.add(name)
      scheduleFlush()
    },
    async clear() {
      local.clear()
      primeAll = null
      primed = false
      pendingPut.clear()
      pendingDelete.clear()
      if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null }
      await registered
      lua.clearCache(DB_NAME)
    },
  }
}

function selectBackend() {
  switch (CACHE_MODE) {
    case "indexeddb":
      return indexedDbBackend()
    case "lua":
    case "lua-all":
    case "lua-chain":
      return luaBackend()
    default:
      return disabledBackend()
  }
}

export function createPersistentCache() {
  const backend = selectBackend()
  const mem = new Map()
  let seq = null
  let seqReady = null

  async function ensureSeq() {
    if (seq != null) return
    if (!seqReady) seqReady = backend.get(SEQ_KEY).then(r => { seq = (r && r.id) || 1e9 })
    await seqReady
  }

  return {
    get size() { return mem.size },
    async getData(name) {
      if (mem.has(name)) return mem.get(name)
      const rec = await backend.get(name)
      if (rec) mem.set(name, rec)
      return rec
    },
    putData(name, fields) {
      const record = { name, ...fields }
      mem.set(name, record)
      backend.put(record)
    },
    deleteData(name) {
      mem.delete(name)
      backend.delete(name)
    },
    async allocId() {
      await ensureSeq()
      const id = seq++
      backend.put({ name: SEQ_KEY, id: seq })
      return id
    },
    async clear() {
      mem.clear()
      seq = null
      seqReady = null
      await backend.clear?.()
    },
  }
}
