// Composition root for the on-demand app runtime. Wires the core primitives (resolve, fetch,
// transform, sfc, scss, module graph) plus the warm cache and app transforms into a single
// runtime that loads src/* starting from main.js.

import { createResolver, splitQuery, extOf } from "../core/resolve.js"
import { fetchFirst } from "../core/source.js"
import { createScss } from "../core/scss.js"
import { createModuleGraph } from "../core/graph.js"
import { createDebarrel } from "../core/debarrel.js"
import { createPersistentCache } from "../core/cache.js"
import { hasFile, indexReady, mtimeOf, scssFiles, whenIndexReady } from "../host/files.js"
import { startFile, endFile, setStage, recordPhase } from "../host/diagnostics.js"
import { SFC_IS_PROD, HMR_ENABLED, GENERATED_PATH } from "../config.js"
import { transformSource, rawModule } from "./appTransforms.js"
import { virtualSource } from "./virtual.js"
import { generatedSource } from "./generated.js"
import { registerComponent, hmrRecords } from "./hmr.js"

const pnow = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())

const STYLE_RE = /^<style\b([^>]*?)(?:\/>|>([\s\S]*?)<\/style>)/gim
const SCSS_LANG = /\blang\s*=\s*["']?scss["']?/i
const STYLE_SRC = /\bsrc\s*=\s*["']([^"']+)["']/i

// this is to detect assets
const SOURCE_EXTENSIONS = new Set(["", ".js", ".mjs", ".vue", ".json", ".css", ".scss"])

export function createRuntime({ moduleCache, sass }) {
  const { resolve, fetchCandidates, scssCandidates, noteResolved } = createResolver({ hasFile, indexReady })

  // prefetch scss all partials so the dart-sass importer can resolve them synchronously
  // each component then compiles with the fast sync API instead of the contention-heavy async one
  const scssMem = new Map()
  const resolveScss = abs => {
    for (const c of scssCandidates(abs)) { const t = scssMem.get(c); if (t != null) return { path: c, text: t } }
    return null
  }
  // wait for the file index before listing scss partials
  const scssReady = sass
    ? whenIndexReady().then(() => Promise.all(scssFiles().map(async p => {
        try { scssMem.set(p, (await fetchFirst([p])).text) } catch { /* unreadable partial */ }
      })))
    : Promise.resolve()
  const { compileScss } = createScss({ sass, resolveScss, ready: scssReady })

  const addStyle = css => document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }))

  // resolve <style src> to plain css here (keeping scoped/module attrs) so the SFC compiler only sees css
  async function styleToCss(attrs, body, path) {
    const isScss = SCSS_LANG.test(attrs)
    const src = STYLE_SRC.exec(attrs)
    if (src) {
      const abs = splitQuery(resolve(path, src[1]))[0]
      const { url, text } = await fetchFirst(isScss ? scssCandidates(abs) : fetchCandidates(abs))
      const file = splitQuery(url)[0]
      if (!isScss) return { css: text, deps: [file] }
      const { css, deps } = await compileScss(text, abs)
      return { css, deps: [file, ...deps] }
    }
    return isScss ? await compileScss(body || "", path) : { css: null, deps: [] }
  }

  async function precompileVueStyles(code, path) {
    if (!sass) return { code, deps: [] }
    let out = "", last = 0
    const allDeps = []
    for (const m of code.matchAll(STYLE_RE)) {
      const [full, attrs, body] = m
      const { css, deps } = await styleToCss(attrs, body, path)
      if (deps) allDeps.push(...deps)
      if (css == null) continue
      const keptAttrs = attrs.replace(SCSS_LANG, "").replace(STYLE_SRC, "").replace(/\s+/g, " ").trim()
      out += code.slice(last, m.index) + `<style${keptAttrs ? " " + keptAttrs : ""}>\n${css}\n</style>`
      last = m.index + full.length
    }
    return { code: out + code.slice(last), deps: [...new Set(allDeps)] }
  }

  // fetch + app-transform a single resolved id into { type, getContentData } for the graph;
  // scss is compiled to css here so the graph only ever instantiates css/js/vue/json
  async function getFile(id) {
    const [clean, query] = splitQuery(id)
    const startedAt = startFile(clean)
    let ok = true
    try {
      if (clean.startsWith("bng:")) {
        const src = virtualSource(clean)
        if (src != null) {
          setStage("transforming", clean)
          const content = transformSource(src, clean)
          return { type: ".mjs", getContentData: () => content }
        }
      }
      // /generated/* is synthesised in memory from the lua file index
      if (clean.startsWith(GENERATED_PATH)) {
        const src = generatedSource(clean)
        if (src != null) {
          setStage("transforming", clean)
          const content = transformSource(src, clean)
          return { type: ".mjs", getContentData: () => content }
        }
      }
      if (query.includes("raw")) {
        const { url, text } = await fetchFirst([clean])
        noteResolved(clean, splitQuery(url)[0])
        return { type: ".mjs", getContentData: () => rawModule(text) }
      }
      if (!SOURCE_EXTENSIONS.has(extOf(clean))) {
        noteResolved(clean, clean)
        return { type: ".asset", getContentData: () => clean }
      }
      setStage("fetching", clean)
      const f0 = pnow()
      const { url, text } = await fetchFirst(fetchCandidates(clean))
      recordPhase("fetch", pnow() - f0)
      noteResolved(clean, splitQuery(url)[0])
      const ext = extOf(url)
      if (ext === ".scss") {
        setStage("compiling style", clean)
        const s0 = pnow()
        const { css, deps } = await compileScss(text, clean)
        recordPhase("scss", pnow() - s0)
        return { type: ".css", getContentData: () => css, scssDeps: deps }
      }
      if (ext === ".css") return { type: ".css", getContentData: () => text }
      if (ext === ".json") return { type: ".json", getContentData: () => text }
      setStage("transforming", clean)
      let content = transformSource(text, clean)
      let scssDeps
      if (ext === ".vue") {
        setStage("compiling style", clean)
        const s0 = pnow()
        const r = await precompileVueStyles(content, clean)
        content = r.code
        scssDeps = r.deps
        recordPhase("scss", pnow() - s0)
      }
      // .vue stays .vue (SFC path); bare/.js become .mjs; .mjs/.json keep their ext
      const type = (ext === ".js" || ext === "") ? ".mjs" : ext
      return { type, getContentData: () => content, scssDeps }
    } catch (e) {
      ok = false
      throw e
    } finally {
      endFile(clean, startedAt, ok)
    }
  }

  const cache = createPersistentCache()

  const recordMtime = id => mtimeOf(splitQuery(id)[0])

  // de-barrel raw barrel sources to map exported names back to their concrete files.
  // /generated/* barrels are virtual, so serve their synthesised source instead of fetching disk
  const readSource = async abs => {
    if (abs.startsWith(GENERATED_PATH)) {
      const src = generatedSource(abs)
      if (src != null) return src
    }
    return (await fetchFirst(fetchCandidates(abs))).text
  }
  const { debarrel } = createDebarrel({ resolve, readSource, splitQuery })

  const graph = createModuleGraph({
    moduleCache,
    resolve,
    getFile,
    isProd: SFC_IS_PROD,
    addStyle,
    onComponent: registerComponent,
    cache,
    mtimeOf: recordMtime,
    debarrel,
    log: (level, ...args) => (console[level] || console.log)("[runtime-sfc]", ...args),
  })

  // dev (HMR) in-place reload of a single changed .vue. Drops its cached source + module so it
  // re-fetches fresh (its bumped revision busts the CEF cache), recompiles, and the graph's
  // onComponent hook calls __VUE_HMR_RUNTIME__.reload to re-render live instances. Non-.vue or
  // never-rendered files return false so the caller full-reloads.
  async function hotReloadModule(rawPath) {
    if (!HMR_ENABLED || !window.__VUE_HMR_RUNTIME__) return false
    const clean = splitQuery(rawPath)[0]
    if (clean.endsWith(".scss")) return reloadScssDependents(clean)
    const id = graph.resolve(undefined, rawPath)
    if (!id.endsWith(".vue") || !hmrRecords.has(id)) return false
    graph.invalidate(id)
    await graph.loadModule(id)
    return true
  }

  // A changed scss partial isn't a module of its own - it's compiled into every component that
  // @use'd it. Refresh its in-memory source and recompile those dependents in place (Vue HMR
  // re-renders them). If a non-.vue module also depends on it, bail so the caller full-reloads.
  async function reloadScssDependents(scssPath) {
    const dependents = graph.scssDependentsOf(scssPath)
    if (!dependents.length || !dependents.every(id => hmrRecords.has(id))) return false
    try { scssMem.set(scssPath, (await fetchFirst([scssPath])).text) } catch { return false }
    for (const id of dependents) {
      graph.invalidate(id)
      try { await graph.loadModule(id) }
      catch (err) { console.warn("[runtime-sfc] scss dependent reload failed", id, err) }
    }
    return true
  }

  return {
    loadModule: id => graph.loadModule(id),
    hotReloadModule,
    isLoaded: rawPath => graph.resolve(undefined, rawPath) in moduleCache,
    invalidate: graph.invalidate,
    unload: prefix => graph.unloadUnder(prefix), // unload every module under a path prefix
    resolve: graph.resolve,
    scssDependentsOf: graph.scssDependentsOf,
    dropCache: () => cache.clear(),
    cacheSize: () => cache.size,
    precompile: (id, onStep) => graph.precompile(id, onStep),
    // lazy route view that also exposes its resolved path so the preloader can warm it
    lazyView: (importer, spec) => {
      const path = graph.resolve(importer, spec)
      const fn = () => graph.loadModule(path)
      fn.preloadPath = path
      return fn
    },
    addStyle,
  }
}
