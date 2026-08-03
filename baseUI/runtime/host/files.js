// authoritative set of loadable files
// lua returns { path, mtime } per file; mtime drives the warm cache's staleness check (when enabled)

import { lua } from "./lua.js"
import { info, warn } from "../log.js"
import { CACHE_ENABLED } from "../config.js"

let files = new Set()
let mtimes = new Map()

let resolveSeeded
// resolves once seedFileIndex() has run (success or failure), so nothing
// would read an empty set when the file index hasn't been fetched yet
const seededPromise = new Promise(r => { resolveSeeded = r })
export const whenIndexReady = () => seededPromise

export const indexReady = () => files.size > 0
export const hasFile = p => files.has(p)
export const mtimeOf = p => mtimes.get(p)
export const scssFiles = () => [...files].filter(p => p.endsWith(".scss"))
// on-demand route modules (src/modules/<name>/routes.js, +routes.dev.js); the base build empties
// the router glob, so the loader registers these at boot instead. See runtime/runtimeBundle.js
export const isModuleRouteFile = p => /\/src\/modules\/[^/]+\/routes(\.dev)?\.js$/.test(p || "")
export const moduleRouteFiles = () => [...files].filter(isModuleRouteFile)

// basenames of files sitting DIRECTLY inside dirPath (non-recursive), like fs.readdirSync.
// used by the in-memory auto-export generator (see runtime/app/generated.js)
export const immediateFiles = dirPath => {
  const prefix = dirPath.endsWith("/") ? dirPath : dirPath + "/"
  const out = []
  for (const p of files) {
    if (!p.startsWith(prefix)) continue
    const rest = p.slice(prefix.length)
    if (rest && !rest.includes("/")) out.push(rest)
  }
  return out
}

// full paths of every file UNDER prefix (recursive), like a fs walk
export const filesUnder = prefix => {
  const pfx = prefix.endsWith("/") ? prefix : prefix + "/"
  return [...files].filter(p => p.startsWith(pfx))
}

// register extra resolvable paths (e.g. compiled base bundle modules)
export const addFiles = paths => {
  for (const p of paths) {
    if (p) files.add(p)
  }
}

// forget paths (mod unload)
export const removeFiles = paths => {
  for (const p of paths) {
    files.delete(p); mtimes.delete(p)
  }
}
// drops a whole module subtree by path prefix
export const removeFilesUnder = prefix => {
  const pfx = prefix.endsWith("/") ? prefix : prefix + "/"
  for (const p of [...files]) {
    if (p.startsWith(pfx)) {
      files.delete(p); mtimes.delete(p)
    }
  }
}

export async function seedFileIndex() {
  try {
    // only ask Lua to stat each file when the warm cache will actually use it
    const list = await lua.getUiRuntimeFileList(CACHE_ENABLED)
    if (Array.isArray(list) && list.length > 0) {
      files = new Set()
      mtimes = new Map()
      for (const entry of list) {
        // tolerate both shapes: plain path string, or { path, mtime }
        const path = typeof entry === "string" ? entry : entry?.path
        if (!path) continue
        files.add(path)
        if (entry && typeof entry === "object" && entry.mtime != null) mtimes.set(path, entry.mtime)
      }
      info("[runtime-sfc] file index:", files.size, "files")
    } else {
      warn("[runtime-sfc] file index came back empty")
    }
  } catch (err) {
    warn("[runtime-sfc] could not seed file index", err)
  }
  resolveSeeded?.()
}

// re-query lua and reconcile ONLY the module-route files against disk truth
export async function refreshIndex() {
  let list
  try {
    list = await lua.getUiRuntimeFileList(CACHE_ENABLED)
  } catch (err) {
    warn("[runtime-sfc] could not refresh file index", err)
    return
  }
  if (!Array.isArray(list)) return
  const freshRoutes = new Set()
  for (const entry of list) {
    const path = typeof entry === "string" ? entry : entry?.path
    if (!path || !isModuleRouteFile(path)) continue
    freshRoutes.add(path)
    files.add(path)
    if (typeof entry === "object" && entry.mtime != null) mtimes.set(path, entry.mtime)
  }
  // drop vanished route files; never touch bundled/base entries
  for (const p of moduleRouteFiles()) {
    if (!freshRoutes.has(p)) {
      files.delete(p)
      mtimes.delete(p)
    }
  }
}
