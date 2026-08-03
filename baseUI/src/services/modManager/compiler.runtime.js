import { markRaw } from "vue"
import { stableId } from "@/services/uniqueId"
import Logger from "@/services/logger"
import { procMeta } from "./meta"
import { getSource } from "./source"

// mod files loaded through the graph, so resets only touch mod-owned modules
const loadedFiles = new Set()

function graph() {
  const rt = window.__bngRuntime
  if (!rt || typeof rt.loadModule !== "function") {
    throw new Error("[MOD] Runtime graph (window.__bngRuntime) is unavailable")
  }
  return rt
}

const dirOf = fileUrl => fileUrl.substring(0, fileUrl.lastIndexOf("/"))

function resolveId(fileUrl) {
  try { return window.__bngRuntime?.resolve(undefined, fileUrl) ?? fileUrl }
  catch { return fileUrl }
}

// only the non-setup <script> block carries modInfo
function extractScriptBlock(source) {
  if (!source) return ""
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi
  let m
  while ((m = re.exec(source)) !== null) {
    if (/\bsetup\b/.test(m[1] || "")) continue
    return m[2] || ""
  }
  return ""
}

async function buildMeta(fileUrl, dataid) {
  try {
    const source = await getSource(fileUrl, true)
    return procMeta(extractScriptBlock(source), dataid)
  } catch (err) {
    Logger.warn("[MOD] Failed to read mod metadata", fileUrl, err)
    return { dataid }
  }
}

/**
 * Get a compiled mod component via the runtime graph.
 * @param {String} fileUrl Full file URL to load the component from.
 * @param {Boolean} [refresh] If true, drops the mod from the graph before loading.
 * @param {Boolean} [returnCompiled] If true, loads now; otherwise returns a deferred `compile()`.
 * @returns {Promise<Object>} UiMod-shaped object.
 */
export async function getComponent(fileUrl, refresh = false, returnCompiled = true) {
  if (refresh) resetComponentCache(fileUrl)

  const dataid = stableId(fileUrl, "data-bngmod-")
  const meta = await buildMeta(fileUrl, dataid)

  // graph owns <head> style injection, so styles/substyles stay empty here
  const base = () => ({ meta, styles: "", substyles: [], files: [fileUrl] })

  const compile = async () => {
    try {
      const ns = await graph().loadModule(fileUrl)
      const component = ns?.default
      if (!component) throw new Error("Mod module has no default component export")
      loadedFiles.add(fileUrl)
      return { ...base(), component: markRaw(component), compiled: true }
    } catch (err) {
      Logger.error("[MOD] Runtime compile error in", fileUrl, err)
      return { meta, error: err?.message || "Compile error", errorObj: err }
    }
  }

  return returnCompiled ? await compile() : { ...base(), compiled: false, compile }
}

// for parity with standalone impl (effectively unused externally)
export async function buildComponent(fileUrl, returnCompiled = true) {
  return getComponent(fileUrl, false, returnCompiled)
}

/**
 * Loads a plain (non-SFC) local module
 * @param {String} fileUrl Full file URL to the module.
 * @param {Boolean} [refresh] If true, drops the module from the graph before loading.
 * @returns {Promise<Object>} The module's namespace exports.
 */
export async function loadModule(fileUrl, refresh = false) {
  if (refresh) resetComponentCache(fileUrl)
  return await graph().loadModule(fileUrl)
}

// a mod's own files resolve under its path prefix while @/... resolves under /ui/ui-vue/src/,
// so invalidating the entry and unloading the mod dir refreshes the mod (and its private deps) safely
function resetOne(fileUrl) {
  const rt = window.__bngRuntime
  if (rt) {
    try { rt.invalidate?.(resolveId(fileUrl)) } catch (err) { Logger.warn("[MOD] invalidate failed", fileUrl, err) }
    const dir = dirOf(fileUrl)
    if (dir) { try { rt.unload?.(dir) } catch (err) { Logger.warn("[MOD] unload failed", dir, err) } }
  }
  loadedFiles.delete(fileUrl)
}

/**
 * Resets a single mod (or all) in the runtime graph.
 * @param {String} [fileUrl] Full file URL to reset. If undefined, resets all tracked mods.
 */
export function resetComponentCache(fileUrl = undefined) {
  if (fileUrl) { resetOne(fileUrl); return }
  for (const file of [...loadedFiles]) resetOne(file)
}

export function resetAllCaches() {
  for (const file of [...loadedFiles]) resetOne(file)
}

/**
 * Recompiles several mod components while resetting each mod directory at most once.
 * Runtime unload is directory-scoped, so per-file refresh would strip styles from other mounted cards in the same mod.
 * @param {String[]} filepaths
 * @param {Boolean} [returnCompiled]
 * @returns {Promise<Map<String, Object>>}
 */
export async function refreshComponents(filepaths, returnCompiled = true) {
  const unique = [...new Set((filepaths || []).filter(Boolean))]
  const byDir = new Map()
  for (const filepath of unique) {
    const dir = dirOf(filepath)
    if (!byDir.has(dir)) byDir.set(dir, [])
    byDir.get(dir).push(filepath)
  }
  const compiled = new Map()
  for (const dirPaths of byDir.values()) {
    resetOne(dirPaths[0])
    for (const filepath of dirPaths) {
      compiled.set(filepath, await getComponent(filepath, false, returnCompiled))
    }
  }
  return compiled
}
