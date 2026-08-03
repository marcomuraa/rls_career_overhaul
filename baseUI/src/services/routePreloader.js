// declarative route preloader (for runtime SFC loader)
// to use, write in route:
// meta: {
//   preloadOn: "boot" | "loadingScreen" | "career" | "garage",
//   preloadDeep?: boolean, // warm descendant child-route views
// }

import { lua } from "@/bridge"

const done = new Set()
const pending = new Set()

let routerRef = null

// boot.js (ui-boot) polls this to hold the loading screen: `requested` flips true once the in-game
// warmup has been dispatched, `pending` is how many of those preloads are still loading.
const preloadState = { requested: false, get pending() { return pending.size } }
window.bngRuntimePreloadState = preloadState

const MODE_TRIGGERS = [
  { trigger: "career", isActive: () => lua.career_career.isActive() },
  { trigger: "garage", isActive: () => lua.gameplay_garageMode.isActive() },
]

function addRecord(rec, paths) {
  const comps = rec.components
  if (!comps) return
  for (const c of Object.values(comps)) {
    if (typeof c === "function" && c.preloadPath) paths.push(c.preloadPath)
  }
}

function collectPaths(router, trigger) {
  const records = router.getRoutes()
  const paths = []
  for (const rec of records) {
    if (rec.meta?.preloadOn !== trigger) continue
    addRecord(rec, paths)
    if (rec.meta?.preloadDeep) {
      const prefix = rec.path.endsWith("/") ? rec.path : rec.path + "/"
      for (const other of records) {
        if (other !== rec && other.path.startsWith(prefix)) addRecord(other, paths)
      }
    }
  }
  return paths
}

// start preloading a single path, tracking its promise in `pending` so the boot gate can wait on it
function preload(path) {
  const p = window.bngRuntime?.preload(path)
  if (!p) return // no path, runtime not ready, or already preloading (deduped by the runtime)
  pending.add(p)
  p.finally(() => pending.delete(p))
}

// kick off preloads for a trigger
function run(router, trigger) {
  if (done.has(trigger)) return
  done.add(trigger)
  for (const path of collectPaths(router, trigger)) preload(path)
}

// preload whichever modes are currently active
async function runActiveModes(router) {
  for (const { trigger, isActive } of MODE_TRIGGERS) {
    try {
      if (!done.has(trigger) && await isActive()) run(router, trigger)
    } catch { }
  }
}

export function initRoutePreloader(router) {
  // preloading only exists in the runtime SFC loader; the SPA/dev builds bundle everything eagerly
  if (!window.bngUiMode?.runtime) return

  routerRef = router
  run(router, "boot")
}

export async function runInGamePreloads() {
  if (!routerRef) return // not the runtime loader, or not initialised yet
  run(routerRef, "loadingScreen")
  await runActiveModes(routerRef)
}

// flips the boot gate flag once the initial in-game warmup decision has been made (see preloadState).
export function markPreloadRequested() {
  preloadState.requested = true
}
