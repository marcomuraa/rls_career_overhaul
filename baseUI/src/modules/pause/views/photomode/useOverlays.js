import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useBridge } from "@/bridge"
import { $translate } from "@/services/translation"

// Photomode overlays composable.
// Wraps the ui_photomode_overlays Lua endpoints and keeps the overlay list
// in sync with the VFS by listening to the PhotomodeOverlaysChanged event.
//
// State is shared across call sites so the picker and the renderer agree
// on which overlay is active without any extra plumbing. The VFS event
// subscription is reference-counted: it wires up when the first consumer
// mounts and tears down when the last one unmounts.

const OVERLAYS_CHANGED_EVENT = "PhotomodeOverlaysChanged"

// Appends Lua's per-discovery cache stamp to any overlay-scoped URL so the
// browser never serves a stale asset after a save/rename/clone. The stamp
// stays identical across every asset inside the same discovery broadcast,
// meaning one `?ts=…` value per overlay snapshot — and it advances in lock-
// step with the data the UI receives, exactly as requested.
export function withOverlayTs(url, ts) {
  if (typeof url !== "string" || url === "") return url
  if (ts == null || ts === "") return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}ts=${ts}`
}

// Lua enforces [%w%-_]+ on overlay folder ids. We accept a free-form human
// name and slug it so authors don't have to care about the distinction — the
// entered string stays the display `name`, the slug becomes the folder id.
// Built-in overlay.json files store locale keys in `name`; user overlays keep
// literal display names. Resolve at read time so persisted data stays stable.
export function resolveOverlayName(name, id) {
  const raw = typeof name === "string" && name !== "" ? name : id || ""
  return raw ? $translate.contextTranslate(raw) : ""
}

export function slugifyId(input) {
  if (typeof input !== "string") return ""
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  return cleaned
}

const overlays = ref([])
const activeId = ref(null)
const pending = ref(false)
// UI apps catalogue cache. Populated on first call to fetchUiApps() and
// reused afterwards — the list barely changes during a session, so a single
// fetch is enough for the add-layer / edit-layer dropdowns. Shared across
// composable call sites so every popup sees the same snapshot.
const uiApps = ref([])
let uiAppsFetched = false
let uiAppsInFlight = null
// Livery decal graphics catalogue cache. Same lifecycle as the UI apps cache:
// fetched once on demand for the add/edit pickers and shared across call sites.
const liveryTextures = ref([])
let liveryTexturesFetched = false
let liveryTexturesInFlight = null
// Ephemeral editing toggle — lives in UI state only, not persisted. The
// photomode panel owns the button; the overlay renderer reads this to
// decide whether to expose drag/resize handles.
// Exported directly so consumers that only need read-only access (e.g.
// App.vue toggling the solo-edit body class) don't have to mount the full
// composable and inflate the consumer refcount.
export const photomodeEditing = ref(false)
const editing = photomodeEditing
let refreshInFlight = null
let activeConsumers = 0
let boundEventHandler = null

const activeOverlay = computed(() => {
  if (!activeId.value) return null
  return overlays.value.find(entry => entry.id === activeId.value) || null
})

const editable = computed(() => activeOverlay.value?.editable === true)
// Leaving the overlay context or switching to a non-editable overlay
// automatically drops editing back to false so we never leave ghost
// handles behind when the selection changes.

export function useOverlays() {
  const { lua, events } = useBridge()

  async function refresh() {
    if (refreshInFlight) return refreshInFlight
    pending.value = true
    refreshInFlight = (async () => {
      try {
        const result = await lua.extensions.ui_photomode_overlays.getOverlays()
        overlays.value = Array.isArray(result) ? result : []
        // Drop the current selection if its overlay vanished from the VFS.
        if (activeId.value && !overlays.value.some(entry => entry.id === activeId.value)) {
          activeId.value = null
        }
      } catch (error) {
        console.warn("[photomode-overlays] getOverlays failed:", error)
        overlays.value = []
      } finally {
        pending.value = false
        refreshInFlight = null
      }
    })()
    return refreshInFlight
  }

  function selectOverlay(id) {
    if (id == null) {
      activeId.value = null
      editing.value = false
      return
    }
    if (overlays.value.some(entry => entry.id === id)) {
      activeId.value = id
      // A fresh selection shouldn't inherit edit mode from the previous
      // overlay — especially risky if the previous one was editable and
      // the new one isn't.
      editing.value = false
    }
  }

  function setEditing(next) {
    if (next && !editable.value) {
      editing.value = false
      return
    }
    editing.value = next === true
  }

  function toggleEditing() {
    setEditing(!editing.value)
  }

  async function saveLayers(layers) {
    const overlay = activeOverlay.value
    if (!overlay || overlay.editable !== true) return { ok: false, reason: "not_editable" }

    const payload = {
      version: overlay.version,
      name: overlay.name,
      author: overlay.author,
      layers: Array.isArray(layers) ? layers : (overlay.layers || []),
    }
    const result = await lua.extensions.ui_photomode_overlays.saveOverlay(overlay.id, payload)
    return result || { ok: false, reason: "no_response" }
  }

  async function cloneActive({ name, id } = {}) {
    const overlay = activeOverlay.value
    if (!overlay) return { ok: false, reason: "no_active" }
    const trimmedName = typeof name === "string" ? name.trim() : ""
    const destId = slugifyId(typeof id === "string" && id ? id : trimmedName)
    if (!destId) return { ok: false, reason: "invalid_dest_id" }
    const result = await lua.extensions.ui_photomode_overlays.cloneOverlay(overlay.id, destId)
    if (result?.ok && result.id) {
      // Optimistically select the freshly-cloned overlay; the hot-reload
      // will refill `overlays` with the new entry shortly.
      activeId.value = result.id
      // Fire a display-name update as a follow-up save so the clone keeps
      // its own identity rather than inheriting the source's label.
      if (trimmedName && trimmedName !== overlay.name) {
        await lua.extensions.ui_photomode_overlays.renameOverlay(result.id, result.id, trimmedName)
      }
    }
    return result || { ok: false, reason: "no_response" }
  }

  async function createBlank({ name, id } = {}) {
    const trimmedName = typeof name === "string" ? name.trim() : ""
    const destId = slugifyId(typeof id === "string" && id ? id : trimmedName)
    if (!destId) return { ok: false, reason: "invalid_dest_id" }
    const payload = {
      version: 1,
      name: trimmedName || destId,
      author: "",
      layers: [],
    }
    const result = await lua.extensions.ui_photomode_overlays.createOverlay(destId, payload)
    if (result?.ok && result.id) {
      activeId.value = result.id
    }
    return result || { ok: false, reason: "no_response" }
  }

  async function renameActive({ name, id } = {}) {
    const overlay = activeOverlay.value
    if (!overlay) return { ok: false, reason: "no_active" }
    if (overlay.editable !== true) return { ok: false, reason: "not_editable" }
    const trimmedName = typeof name === "string" ? name.trim() : ""
    const destId = slugifyId(typeof id === "string" && id ? id : overlay.id)
    if (!destId) return { ok: false, reason: "invalid_dest_id" }
    const effectiveName = trimmedName || overlay.name || overlay.id
    const result = await lua.extensions.ui_photomode_overlays.renameOverlay(overlay.id, destId, effectiveName)
    if (result?.ok && result.id) {
      activeId.value = result.id
    }
    return result || { ok: false, reason: "no_response" }
  }

  async function fetchUiApps(force = false) {
    if (uiAppsInFlight) return uiAppsInFlight
    if (uiAppsFetched && !force) return uiApps.value
    uiAppsInFlight = (async () => {
      try {
        const result = await lua.extensions.ui_photomode_overlays.listUiApps()
        uiApps.value = Array.isArray(result) ? result : []
        uiAppsFetched = true
      } catch (error) {
        console.warn("[photomode-overlays] listUiApps failed:", error)
        uiApps.value = []
      } finally {
        uiAppsInFlight = null
      }
      return uiApps.value
    })()
    return uiAppsInFlight
  }

  async function fetchLiveryTextures(force = false) {
    if (liveryTexturesInFlight) return liveryTexturesInFlight
    if (liveryTexturesFetched && !force) return liveryTextures.value
    liveryTexturesInFlight = (async () => {
      try {
        const result = await lua.extensions.ui_photomode_overlays.listLiveryGraphics()
        liveryTextures.value = Array.isArray(result) ? result : []
        liveryTexturesFetched = true
      } catch (error) {
        console.warn("[photomode-overlays] listLiveryGraphics failed:", error)
        liveryTextures.value = []
      } finally {
        liveryTexturesInFlight = null
      }
      return liveryTextures.value
    })()
    return liveryTexturesInFlight
  }

  async function removeOverlay(id) {
    const targetId = id ?? activeId.value
    if (!targetId) return { ok: false, reason: "no_target" }
    const result = await lua.extensions.ui_photomode_overlays.deleteOverlay(targetId)
    if (result?.ok && activeId.value === targetId) {
      activeId.value = null
    }
    return result || { ok: false, reason: "no_response" }
  }

  onMounted(() => {
    activeConsumers += 1
    if (!boundEventHandler) {
      boundEventHandler = () => refresh()
      events.on(OVERLAYS_CHANGED_EVENT, boundEventHandler)
    }
    refresh()
  })

  onBeforeUnmount(() => {
    activeConsumers = Math.max(0, activeConsumers - 1)
    if (activeConsumers === 0 && boundEventHandler) {
      events.off(OVERLAYS_CHANGED_EVENT, boundEventHandler)
      boundEventHandler = null
    }
  })

  return {
    overlays,
    activeId,
    activeOverlay,
    editable,
    editing,
    pending,
    uiApps,
    liveryTextures,
    selectOverlay,
    setEditing,
    toggleEditing,
    saveLayers,
    createBlank,
    cloneActive,
    renameActive,
    removeOverlay,
    refresh,
    fetchUiApps,
    fetchLiveryTextures,
  }
}

export default useOverlays
