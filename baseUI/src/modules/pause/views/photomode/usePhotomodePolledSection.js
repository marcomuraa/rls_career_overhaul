import { onUnmounted, reactive, ref } from "vue"

// Shared polling + edit-tracking machinery for photomode setting sections.
//
// Every section (camera, scene, effects, capture, advanced render) talks to a
// Lua getter on an interval, tracks which fields the user is currently editing
// so a remote refresh doesn't clobber in-progress input, and mirrors a small
// sync status. That mechanics was copy-pasted per section; this composable owns
// it so sections only declare their fields, the request/apply callbacks and the
// enable predicate.
//
// Config:
//   pollMs            interval between refreshes (default 333)
//   editingFields     field names tracked by `editing` / `clearEditingFlags`
//   request           async () => stateObject (the Lua getter)
//   applyState        (state) => void (writes the returned state into controls)
//   isEnabled         () => bool, gate for polling/refresh (session + feature)
//   unavailableReason error reason when the getter returns { ok: false }
//   errorReason       error reason when the getter throws
//   applyOnError      apply the returned state even when { ok: false } (capture)
//   onPoll            optional extra async work run on start + each tick (flash)
export function usePhotomodePolledSection(config = {}) {
  const {
    pollMs = 333,
    editingFields = [],
    request,
    applyState,
    isEnabled = () => true,
    unavailableReason = "state_unavailable",
    errorReason = "state_error",
    applyOnError = false,
    onPoll = null,
  } = config

  const editing = reactive(Object.fromEntries(editingFields.map(field => [field, false])))
  const hasLoadedState = ref(false)
  const syncState = ref("idle")
  const syncErrorReason = ref("")

  let pollInFlight = false
  let pollTimerId = null

  function markFieldEditing(fieldName, active) {
    if (!Object.prototype.hasOwnProperty.call(editing, fieldName)) return
    editing[fieldName] = active === true
  }

  function clearEditingFlags() {
    editingFields.forEach(field => {
      editing[field] = false
    })
  }

  function markReady() {
    syncState.value = "ready"
    syncErrorReason.value = ""
  }

  function markError(reason) {
    syncState.value = "error"
    syncErrorReason.value = reason || errorReason
  }

  async function refresh() {
    if (pollInFlight || typeof request !== "function" || !isEnabled()) return

    pollInFlight = true
    try {
      const state = await request()
      if (!isEnabled()) return

      if (applyOnError && state && typeof state === "object") applyState?.(state)

      if (state?.ok === false) {
        markError(state.reason || unavailableReason)
        return
      }

      if (!applyOnError) applyState?.(state)
      markReady()
    } catch (error) {
      markError(error?.message)
    } finally {
      pollInFlight = false
    }
  }

  function startPolling() {
    stopPolling()
    syncState.value = hasLoadedState.value ? "ready" : "syncing"
    void refresh()
    if (typeof onPoll === "function") void onPoll()
    pollTimerId = setInterval(() => {
      void refresh()
      if (typeof onPoll === "function") void onPoll()
    }, pollMs)
  }

  function stopPolling() {
    if (pollTimerId !== null) {
      clearInterval(pollTimerId)
      pollTimerId = null
    }
  }

  onUnmounted(stopPolling)

  return {
    editing,
    hasLoadedState,
    syncState,
    syncErrorReason,
    markFieldEditing,
    clearEditingFlags,
    markReady,
    markError,
    refresh,
    startPolling,
    stopPolling,
  }
}

export default usePhotomodePolledSection
