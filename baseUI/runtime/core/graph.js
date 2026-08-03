// Cycle-tolerant module runtime
// JS and SFC modules share one registry (host pre-seeds vendors).
// Live exports register before deps load, so a cyclic import-back gets the same partial object.

import { transformModule } from "./transform.js"
import { compileSfc } from "./sfc.js"
import { recordExec, recordCjsThrow, recordHit, recordBuild, recordPhase } from "../host/diagnostics.js"
import { SFC_SCOPE_PREFIX, CACHE_CHAIN } from "../config.js"

const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())

class Loading {
  constructor(promise) { this.promise = promise }
}

const interopDefault = obj => (obj && obj.__esModule ? obj : { default: obj })

const asArr = v => (Array.isArray(v) ? v : [])

function normalizeCached(hit) {
  if (!hit) return hit
  hit.scssDeps = asArr(hit.scssDeps)
  const d = hit.data
  if (d && typeof d === "object") {
    if (d.kind === "js") {
      d.deps = asArr(d.deps)
    } else if (d.kind === "vue") {
      if (d.script) d.script.deps = asArr(d.script.deps)
      if (d.template) { d.template.deps = asArr(d.template.deps); d.template.errors = asArr(d.template.errors) }
      d.styles = asArr(d.styles)
      for (const s of d.styles) if (s) s.errors = asArr(s.errors)
    }
  }
  return hit
}

export function createModuleGraph(cfg) {
  const { moduleCache, resolve, getFile, isProd, addStyle, onComponent, log, cache, debarrel } = cfg
  const mtimeOf = cfg.mtimeOf || (() => undefined)
  const recordCache = new Map()
  const fileCache = new Map()
  // styles injected per module id, so invalidate/unload can detach them
  const ownedStyles = new Map()
  function addOwnedStyle(id, css) {
    const node = addStyle(css)
    if (!node) return
    let arr = ownedStyles.get(id)
    if (!arr) ownedStyles.set(id, arr = [])
    arr.push(node)
  }
  function removeOwnedStyles(id) {
    const arr = ownedStyles.get(id)
    if (!arr) return
    for (const node of arr) node.remove?.()
    ownedStyles.delete(id)
  }
  // scss graph: partial path -> dependent module ids, so a changed partial invalidates them (warm cache + HMR)
  const scssDependents = new Map()
  const registerScssDeps = (id, deps) => {
    if (!deps) return
    for (const p of deps) { let s = scssDependents.get(p); if (!s) scssDependents.set(p, s = new Set()); s.add(id) }
  }
  const withMtimes = deps => (deps || []).map(p => ({ path: p, mtime: mtimeOf(p) }))
  const scssDepsFresh = deps => !deps || deps.every(d => mtimeOf(d.path) === d.mtime)
  const scssDependentsOf = p => [...(scssDependents.get(p) || [])]

  // memoised fetch (+scss precompile), kept separate from compile so prefetch can warm it in parallel
  function warmFile(id) {
    let p = fileCache.get(id)
    if (!p) { p = getFile(id); fileCache.set(id, p) }
    return p
  }

  // ESM->CJS compile (de-barrel first, to break init cycles). Returns [deps, code].
  async function toCjs(source, id) {
    const t0 = now()
    const src = debarrel ? await debarrel(source, id) : source
    const out = transformModule(src, id)
    recordPhase("cjs", now() - t0)
    return out
  }

  async function packCjs(source, id) {
    const [deps, code] = await toCjs(source, id)
    return { deps, code }
  }

  // fetch + compile into a serialisable record (pure fn of source, no deps/graph touched).
  // SFCs reuse prevId for a stable scope id across recompiles, else allocate a fresh one.
  async function buildRecord(id, prevId) {
    const { type, getContentData, scssDeps } = await warmFile(id)
    switch (type) {
      case ".vue": {
        const sid = prevId != null ? prevId : await cache.allocId()
        const scopeId = SFC_SCOPE_PREFIX + sid.toString(36)
        const c0 = now()
        const sfc = await compileSfc(await getContentData(), { id, isProd, scopeId })
        recordPhase("sfc", now() - c0)
        const script = sfc.scriptCode ? await packCjs(sfc.scriptCode, id) : null
        const template = sfc.templateCode
          ? { ...(await packCjs(sfc.templateCode, id)), errors: sfc.templateErrors }
          : null
        const styles = sfc.styles.map(s => ({ code: s.code, scoped: s.scoped, errors: s.errors }))
        return { id: sid, scssDeps, record: { kind: "vue", scopeId, hasScoped: sfc.hasScoped, script, template, styles } }
      }
      case ".js":
      case ".mjs":
      case "": {
        const [deps, code] = await toCjs(await getContentData(), id)
        return { id: null, record: { kind: "js", deps, code } }
      }
      case ".json": return { id: null, record: { kind: "json", text: await getContentData() } }
      case ".css": return { id: null, scssDeps, record: { kind: "css", css: await getContentData() } }
      case ".asset": return { id: null, record: { kind: "asset", url: await getContentData() } }
    }
    return { id: null, record: null }
  }

  // hard deps for chain indexing on lua side
  function chainOf(id, record) {
    if (!CACHE_CHAIN) return undefined
    let specs
    if (record.kind === "js") specs = record.deps
    else if (record.kind === "vue") specs = [...(record.script?.deps || []), ...(record.template?.deps || [])]
    else return undefined
    if (!specs || !specs.length) return undefined
    const seen = new Set()
    const out = []
    for (const spec of specs) {
      const dep = resolve(id, spec)
      if (dep && dep[0] === "/" && !seen.has(dep)) { seen.add(dep); out.push(dep) }
    }
    return out.length ? out : undefined
  }

  // modtime staleness gate (full id, so "foo?raw" != "foo"); no modtime (virtual/off-index) => always rebuilt
  async function compileRecord(id) {
    const mtime = mtimeOf(id)
    if (mtime == null) {
      const t0 = now()
      const { record, scssDeps } = await buildRecord(id, null)
      recordBuild(now() - t0)
      registerScssDeps(id, scssDeps)
      return record
    }
    const hit = normalizeCached(await cache.getData(id))
    if (hit && hit.mtime === mtime && scssDepsFresh(hit.scssDeps)) {
      recordHit()
      registerScssDeps(id, (hit.scssDeps || []).map(d => d.path))
      return hit.data
    }
    const t0 = now()
    const { id: sid, record, scssDeps } = await buildRecord(id, hit ? hit.id : null)
    recordBuild(now() - t0)
    registerScssDeps(id, scssDeps)
    if (record) cache.putData(id, { id: sid, mtime, scssDeps: withMtimes(scssDeps), data: record, chain: chainOf(id, record) })
    return record
  }

  function getRecord(id) {
    let p = recordCache.get(id)
    if (!p) { p = compileRecord(id); recordCache.set(id, p) }
    return p
  }

  // warm a dep's source only (not its compile): warm hit primes the record cache, miss warms the fetch.
  // compile stays on loadModuleInternal's sequential walk so it never stalls the fetch wave.
  async function prefetch(importer, spec) {
    const id = resolve(importer, spec)
    if (id in moduleCache) return
    const mtime = mtimeOf(id)
    if (mtime != null) {
      const hit = await cache.getData(id).catch(() => null)
      if (hit && hit.mtime === mtime) { getRecord(id); return }
    }
    await warmFile(id).catch(() => {})
  }

  function evalCjs(filename, code, preModule) {
    const module = preModule || { exports: {} }
    const requireFn = relPath => {
      const id = resolve(filename, relPath)
      let m = id in moduleCache ? moduleCache[id] : moduleCache[id.split("?")[0]]
      // a still-Loading dep is one we're in a cycle with: hand back its partial live exports
      if (m instanceof Loading) m = m.partial
      if (m !== undefined) return m
      throw new Error(`require("${relPath}") -> "${id}" missing in moduleCache (from ${filename})`)
    }
    const importFn = relPath => loadModuleInternal(filename, relPath)
    const dirname = filename.replace(/\/[^/]*$/, "")
    recordExec(filename)
    try {
      Function("exports", "require", "module", "__filename", "__dirname", "__rtImport", code)
        .call(module.exports, module.exports, requireFn, module, filename, dirname, importFn)
    } catch (err) {
      recordCjsThrow(filename, err)
      throw err
    }
    return module
  }

  // sequential DFS, not Promise.all: concurrent siblings in a cycle would deadlock on each other's init.
  // sources are still prefetched in parallel first; only the compile walk stays depth-first.
  async function loadDeps(refPath, deps, ancestry) {
    await Promise.all(deps.map(spec => prefetch(refPath, spec)))
    for (const spec of deps) await loadModuleInternal(refPath, spec, ancestry)
  }

  async function instantiateJs(record, id, ancestry) {
    const { deps, code } = record
    // live exports exposed before deps load, so a cyclic import-back gets the same partial.
    // __esModule set now (like babel) so a cyclic consumer's interop doesn't double-wrap it.
    const module = { exports: {} }
    Object.defineProperty(module.exports, "__esModule", { value: true })
    const entry = moduleCache[id]
    if (entry instanceof Loading) entry.partial = module.exports
    const child = new Set(ancestry); child.add(id)
    await loadDeps(id, deps, child)
    evalCjs(id, code, module)
    return module.exports
  }

  async function instantiateSfc(record, id, ancestry) {
    const { scopeId, hasScoped, script, template, styles } = record
    const component = {}
    if (hasScoped) component.__scopeId = scopeId
    // ES-namespace registered before compile/load; named exports attach to both once the script runs
    const ns = { __esModule: true, default: component }
    const entry = moduleCache[id]
    if (entry instanceof Loading) entry.partial = ns
    else moduleCache[id] = ns
    const child = new Set(ancestry); child.add(id)

    if (script) {
      await loadDeps(id, script.deps, child)
      const ex = evalCjs(id, script.code).exports
      Object.assign(component, interopDefault(ex).default)
      for (const key of Object.keys(ex)) {
        if (key !== "default" && !(key in component)) { ns[key] = ex[key]; component[key] = ex[key] }
      }
    }

    if (template) {
      if (template.errors) for (const err of template.errors) log?.("error", "SFC template", id, err)
      await loadDeps(id, template.deps, child)
      Object.assign(component, evalCjs(id, template.code).exports)
    }

    for (const s of styles) {
      if (s.errors) for (const err of s.errors) log?.("error", "SFC style", id, err.message || err)
      addOwnedStyle(id, s.code)
    }

    onComponent?.(component, id)
    return ns
  }

  async function handle(record, id, ancestry) {
    switch (record.kind) {
      case "vue": return instantiateSfc(record, id, ancestry)
      case "js": return instantiateJs(record, id, ancestry)
      case "json": return JSON.parse(record.text)
      case "css": { addOwnedStyle(id, record.css); return {} }
      case "asset": return { __esModule: true, default: record.url }
    }
    return undefined
  }

  async function loadModuleInternal(importer, spec, ancestry = new Set()) {
    const id = resolve(importer, spec)
    if (id in moduleCache) {
      const cached = moduleCache[id]
      // still-Loading on our own path = cycle -> take the partial now; otherwise await full init
      if (cached instanceof Loading) return ancestry.has(id) ? cached.partial : await cached.promise
      return cached
    }
    moduleCache[id] = new Loading((async () => {
      const record = await getRecord(id)
      if (!record) throw new TypeError(`Unable to compile (${id})`)
      const module = await handle(record, id, ancestry)
      if (module === undefined) throw new TypeError(`Unable to handle ${record.kind} (${id})`)
      return moduleCache[id] = module
    })())
    return await moduleCache[id].promise
  }

  function loadModule(entryId) {
    if (moduleCache instanceof Object) Object.setPrototypeOf(moduleCache, null)
    return loadModuleInternal(undefined, entryId)
  }

  // warm the whole import graph of entryId without instantiating
  async function precompile(entryId, onStep) {
    const seen = new Set()
    const queue = [resolve(undefined, entryId)]
    while (queue.length) {
      const id = queue.shift()
      if (seen.has(id) || id in moduleCache) continue
      seen.add(id)
      let record
      try { record = await getRecord(id) } catch { continue }
      if (!record) continue
      const push = spec => { try { queue.push(resolve(id, spec)) } catch { /* unresolvable dep */ } }
      if (record.kind === "js") for (const spec of record.deps || []) push(spec)
      else if (record.kind === "vue") {
        for (const spec of record.script?.deps || []) push(spec)
        for (const spec of record.template?.deps || []) push(spec)
      }
      if (onStep) await onStep()
    }
  }

  // drop a module + its record so the next load re-fetches/recompiles (HMR/manual reload path)
  function invalidate(id) {
    recordCache.delete(id)
    fileCache.delete(id)
    delete moduleCache[id]
    cache.deleteData(id)
    removeOwnedStyles(id)
    for (const s of scssDependents.values()) s.delete(id)
  }

  // drop every loaded module whose id sits under a path prefix, plus its caches and injected styles
  function unloadUnder(prefix) {
    for (const id of Object.keys(moduleCache)) {
      if (id.startsWith(prefix)) invalidate(id)
    }
  }

  return { loadModule, loadModuleInternal, precompile, invalidate, unloadUnder, resolve, scssDependentsOf }
}
