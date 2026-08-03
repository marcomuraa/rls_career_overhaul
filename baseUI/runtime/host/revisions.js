// cache-bust revisions
// only files that actually changed get a fresh ?r= and bypass the cache

import { lua } from "./lua.js"
import { addFiles } from "./files.js"
import { warn } from "../log.js"

let revs = {}

export const revisionOf = path => revs[path] || 0

export async function seedRevisions() {
  try {
    const res = await lua.getUiRuntimeRevisions()
    if (res && typeof res === "object") revs = res
  } catch (err) {
    warn("[runtime-sfc] could not seed revisions", err)
  }
}

// manual file reload
export async function bumpRevision(path) {
  if (!path) return 0
  let rev = (revs[path] || 0) + 1
  try {
    const res = await lua.bumpUiRuntimeRevision(path)
    if (typeof res === "number" && res > 0) rev = res
  } catch (err) {
    warn("[runtime-sfc] bumpRevision failed", err)
  }
  revs[path] = rev
  return rev
}

export function fullReload() {
  if (window.bngRuntime?.allowReload === false) {
    window.bngRuntime && (window.bngRuntime.reloadNeeded = true)
    return
  }
  if (window.bngRuntime?.reloadPending) return
  window.bngRuntime && (window.bngRuntime.reloadPending = true)
  setTimeout(() => location.reload(), 150)
}

export function watchChanges(hotReload) {
  const bus = window.vueEventBus
  if (!bus || typeof bus.on !== "function") return
  bus.on("UiRuntimeFileChanged", async (payload = {}) => {
    // on suppressed full reload, stop reacting until F5
    if (window.bngRuntime?.reloadNeeded) return
    const { path, rev, change } = payload
    if (path && rev != null) revs[path] = rev
    if (change === "added" && path) addFiles([path])
    if (hotReload && path) {
      try {
        if (await hotReload(path, change)) return
      } catch (err) {
        warn("[runtime-sfc] hot reload failed, falling back to full reload", err)
      }
    }
    if (change === "added") return // new file nobody references yet - don't reload
    fullReload()
  })
}
