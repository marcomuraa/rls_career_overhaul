import * as Vue from "vue/dist/vue.esm-bundler.js"
import * as pinia from "pinia"
import * as vueRouter from "vue-router"
import * as i18n from "petite-vue-i18n"
import Emitter from "eventemitter3"
import * as floatingVue from "@floating-ui/vue"
import * as popperCore from "@popperjs/core"
import JSON5 from "json5"
import * as yaml from "yaml"
import * as meriyah from "meriyah"
import * as compilerDom from "@vue/compiler-dom"
import * as sass from "sass"
import * as bngConfig from "bng:config"

import { createRuntime } from "./app/pipeline.js"
import { RT_DEV, HMR_ENABLED, CACHE_ENABLED } from "./config.js"
import { lua, whenLuaReady } from "./host/lua.js"
import { seedRevisions, watchChanges, bumpRevision, fullReload } from "./host/revisions.js"
import { seedFileIndex, refreshIndex, addFiles, removeFilesUnder, moduleRouteFiles, isModuleRouteFile } from "./host/files.js"
import { setDone, setBootError, tapConsoleErrors } from "./host/diagnostics.js"
import { BUNDLE_INCLUDE, BUNDLE_EXCLUDE } from "./config.js"

const modules = {
  "vue": Vue,
  "vue/dist/vue.esm-bundler.js": Vue,
  "pinia": pinia,
  "vue-router": vueRouter,
  "petite-vue-i18n": i18n,
  "eventemitter3": { default: Emitter, __esModule: true },
  "@floating-ui/vue": floatingVue,
  "@popperjs/core": popperCore,
  "json5": { default: JSON5, __esModule: true },
  "yaml": yaml,
  "meriyah": meriyah,
  "@vue/compiler-dom": compilerDom,
  "sass": sass,
  "bng:config": bngConfig,
}

// base bundle is an IIFE that reads its shared vendors from here
window.__rtModules = modules

// base bundle defines `window.bngVue` and `window.__bngBase` at its top level
function whenBase(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (window.__bngBase) return resolve(window.__bngBase)
    const t0 = Date.now()
    const timer = setInterval(() => {
      if (window.__bngBase) { clearInterval(timer); resolve(window.__bngBase) }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(timer); reject(new Error("base did not load (window.__bngBase missing)")) }
    }, 20)
  })
}

const MARKS = ["rt:luaReady", "rt:seeded", "rt:mainLoaded", "rt:inited", "rt:started", "rt:firstRoute"]

function report() {
  try {
    const at = name => performance.getEntriesByName(name)[0]?.startTime
    const t0 = at("rt:boot")
    if (t0 == null) return
    console.table(MARKS.map(n => ({ mark: n, ms: at(n) != null ? +(at(n) - t0).toFixed(1) : null })))
  } catch { }
}

async function boot() {
  performance.mark("rt:boot")
  // arm the router's boot-navigation gate before core can mount
  // so the first lua-router navigation waits for the on-demand routes instead of hitting NotFound
  window.__bngRoutesReady = new Promise(res => { window.__bngResolveRoutes = res })
  tapConsoleErrors()
  // define this for safety
  globalThis["__BNG" + "_DEV__"] = RT_DEV
  // start() touches this lua-router global; that is not part of this bundle, so provide a no-op
  window.setupUIRouter = window.setupUIRouter || (() => {})
  window.Vue = Vue

  // this must be available early
  const runtime = createRuntime({ moduleCache: modules, sass })
  window.__bngRuntime = runtime

  await whenLuaReady()
  performance.mark("rt:luaReady")

  // tell lua which path prefixes are bundled
  await lua.setUiRuntimeBundled(BUNDLE_INCLUDE, RT_DEV ? BUNDLE_INCLUDE : BUNDLE_EXCLUDE)

  // file index resolves imports without network probing; revisions cache-bust changed files
  await Promise.all([seedFileIndex(), seedRevisions()])
  performance.mark("rt:seeded")

  // dynamic module routes
  // prefix - mod's path-ownership boundary
  // routes - route module paths
  // files - optionally pre-seeds the resolver's file index
  const loadedMods = new Map() // prefix -> { routes: [route module paths] }
  const registeredRouteFiles = new Set() // route module paths currently registered on the vue router

  async function registerModuleRoutes(paths) {
    const routeApi = window.bngRoutes
    if (!routeApi || typeof routeApi.add !== "function") return []
    const list = paths.filter(p => RT_DEV || !p.endsWith(".dev.js"))
    const entries = (await Promise.all(list.map(async path => {
      try { return { path, routes: (await runtime.loadModule(path)).default } }
      catch (err) { console.warn("[runtime-sfc] route module failed", path, err); return null }
    }))).filter(Boolean)
    if (entries.length) routeApi.add(entries)
    const registered = entries.map(e => e.path)
    for (const p of registered) registeredRouteFiles.add(p)
    return registered
  }

  async function addMod({ prefix, files, routes } = {}) {
    if (Array.isArray(files)) addFiles(files)
    const routeFiles = Array.isArray(routes) && routes.length
      ? routes
      : moduleRouteFiles().filter(p => !prefix || p.startsWith(prefix))
    const registered = await registerModuleRoutes(routeFiles)
    if (prefix) loadedMods.set(prefix, { routes: registered })
  }

  function removeMod({ prefix } = {}) {
    if (!prefix) return
    const mod = loadedMods.get(prefix)
    const routeApi = window.bngRoutes
    if (routeApi && typeof routeApi.remove === "function") {
      routeApi.remove(mod?.routes || [])
    } else {
      console.warn("[runtime-sfc] window.bngRoutes.remove missing - routes not removed for", prefix)
    }
    for (const p of (mod?.routes || [])) registeredRouteFiles.delete(p)
    runtime.unload?.(prefix)
    removeFilesUnder(prefix)
    loadedMods.delete(prefix)
  }

  // file-watcher path to (un)register routes.js live instead of full-reloading the UI
  async function reloadRouteModule(path) {
    // re-query lua so the index matches disk
    await refreshIndex()
    // recompile the touched file fresh on its next load
    runtime.invalidate(runtime.resolve(undefined, path))
    // disk route files + any active mod's routes
    const diskRoutes = moduleRouteFiles().filter(p => RT_DEV || !p.endsWith(".dev.js"))
    const modRoutes = [...loadedMods.values()].flatMap(m => m.routes || [])
    const want = new Set([...diskRoutes, ...modRoutes])
    // drop vanished routes
    const gone = [...registeredRouteFiles].filter(p => !want.has(p))
    if (gone.length && typeof window.bngRoutes?.remove === "function") {
      window.bngRoutes.remove(gone)
      for (const p of gone) registeredRouteFiles.delete(p)
    }
    // (re)register every present route file; add() reloads + reconciles each in place
    await registerModuleRoutes([...want])
    return true
  }

  if (RT_DEV) {
    const [hljs, hljsCss] = await Promise.all([
      import("highlight.js"),
      import("highlight.js/styles/obsidian.css?inline"),
    ])
    modules["highlight.js"] = { default: hljs.default, __esModule: true }
    modules["highlight.js/styles/obsidian.css"] = { __esModule: true }
    const hljsStyle = document.createElement("style")
    hljsStyle.dataset.bngHljs = ""
    hljsStyle.textContent = hljsCss.default
    document.head.appendChild(hljsStyle)
    await runtime.loadModule("/ui/ui-vue/src/main.js")
  } else {
    const base = await whenBase()
    Object.assign(modules, base)
    addFiles(Object.keys(base))
  }

  await registerModuleRoutes(moduleRouteFiles())
  window.__bngResolveRoutes?.()
  performance.mark("rt:mainLoaded")
  setDone()

  if (!window.bngVue || typeof window.bngVue.init !== "function") {
    throw new Error("the app entry (dist/base.js in prod, src/main.js in dev) did not expose window.bngVue.init/start")
  }

  // start in case of running stand-alone (no ui-boot)
  if (!window.bngUiBootstrap) {
    window.bngVue.init()
    performance.mark("rt:inited")
    window.vueEventBus = window.vueEventBus || window.bridge?.events
    window.bngVue.start()
    performance.mark("rt:started")
  }

  window.vueRouter?.isReady?.().then(() => {
    performance.mark("rt:firstRoute")
    report()
  }).catch(() => {})

  if (HMR_ENABLED) watchChanges(async (path, change) => {
    // route modules register/unregister live
    if (isModuleRouteFile(path)) {
      try {
        return await reloadRouteModule(path)
      } catch (err) {
        console.warn("[runtime-sfc] route module reload failed", path, err)
        return false
      }
    }
    if (change === "deleted") {
      const wasLoaded = runtime.isLoaded(path)
      try { runtime.invalidate(runtime.resolve(undefined, path)) } catch { }
      return !wasLoaded // never loaded? handled, skip reload. loaded? fall through to full reload.
    }
    const reloaded = await runtime.hotReloadModule(path)
    if (reloaded) {
      console.log("[runtime-sfc] hot reloaded", path)
      return true
    }
    return !runtime.isLoaded(path)
  })

  window.vueEventBus?.on?.("UiRuntimeRoutesChanged", async payload => {
    try {
      if (payload?.op === "add") await addMod(payload)
      else if (payload?.op === "remove") removeMod(payload)
    } catch (err) {
      console.error("[runtime-sfc] route change failed", payload, err)
    }
  })

  let allowReload = true
  let reloadNeeded = false
  let reloadPending = false
  try {
    allowReload = sessionStorage.getItem("bngRtAllowReload") !== "0"
  } catch {
    allowReload = true
  }

  const preloading = new Set()
  const idleYield = () => new Promise(
    r => window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 200 }) : setTimeout(r, 16)
  )

  window.bngRuntime = {
    get hmr() { return HMR_ENABLED },
    get dev() { return RT_DEV },
    get allowReload() { return allowReload },
    set allowReload(value) {
      allowReload = value
      try { sessionStorage.setItem("bngRtAllowReload", value ? "1" : "0") } catch { }
    },
    get cacheEnabled() { return CACHE_ENABLED },
    dropCache: () => runtime.dropCache?.(),
    cacheSize: () => runtime.cacheSize?.() || 0,
    // programmatic mirror of the UiRuntimeRoutesChanged event, for manual/testing use
    loadMod: manifest => addMod(manifest || {}),
    unloadMod: prefix => removeMod(typeof prefix === "string" ? { prefix } : prefix),
    preload: path => {
      if (!path || preloading.has(path)) return
      preloading.add(path)
      return runtime.precompile(path, idleYield)
    },
    reload: async path => {
      if (!path) return
      await bumpRevision(path)
      if (HMR_ENABLED) {
        try {
          if (await runtime.hotReloadModule(path)) return
        } catch (err) {
          console.warn("[runtime-sfc] manual hot reload failed, falling back to full reload", err)
        }
      }
      fullReload()
    },
    get reloadNeeded() { return reloadNeeded },
    set reloadNeeded(value) {
      reloadNeeded = value
      window.vueEventBus?.emit?.("UiRuntimeReloadNeeded")
    },
    get reloadPending() { return reloadPending },
    set reloadPending(value) {
      reloadPending = value
    },
  }

  if (RT_DEV) report()
}

boot().catch(err => {
  setBootError(err)
  console.error("[runtime-sfc] boot failed", err)
})
