import { computed, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { getBasename, PATH_SEPARATOR_REGEX } from "./getBasename"

/**
 * @typedef {Object} ReplayRecordingSource
 * @property {string} [key]
 * @property {string} [path]
 * @property {string} [filename]
 * @property {string} [basename]
 * @property {string} [displayName]
 * @property {string} [label]
 * @property {number | null} [size]
 * @property {string} [map]
 * @property {string} [mapName]
 * @property {string} [levelName]
 * @property {string} [vehicle]
 * @property {string} [vehicleName]
 * @property {string} [date]
 * @property {string} [dateLabel]
 * @property {string} [recordedAt]
 * @property {boolean} [metadataAvailable]
 * @property {string[]} [missingMetadataFields]
 * @property {ReplayRecordingSource} [recording]
 */

/**
 * @typedef {Object} ReplayRecording
 * @property {string} key
 * @property {string} path
 * @property {string} filename
 * @property {string} basename
 * @property {string} displayName
 * @property {string} label
 * @property {number | null} size
 * @property {string} [map]
 * @property {string} [vehicle]
 * @property {string} [date]
 * @property {boolean} metadataAvailable
 * @property {string[]} missingMetadataFields
 */

export const REPLAY_RECORDINGS_UPDATED_EVENT = "replayRecordingsUpdated"
const REPLAY_STATE_CHANGED_EVENT = "replayStateChanged"

// Future-facing: the backend does not surface replay metadata yet, but the UI
// keeps map/vehicle/date scaffolding so it can be populated once a metadata
// reader exists. This is an intentional plan, not dead code.
const UNKNOWN_METADATA_FIELDS = Object.freeze(["map", "vehicle", "date"])
const recordings = ref([])
const loading = ref(false)
const error = ref(null)
const selectedKey = ref(null)
const loadedReplayKey = ref(null)
let refreshGeneration = 0
// `replayStateChanged` fires every frame during playback, but the catalog only
// cares when the loaded file actually changes. Track the last seen value to
// skip the per-frame normalize + recordings scan.
let lastLoadedFileSeen = null

function asArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.recordings)) return value.recordings
  return []
}

function firstString(...values) {
  return values.find(value => typeof value === "string" && value.trim() !== "") || ""
}

function getRecordingPath(recording) {
  const source = recording?.recording || recording || {}
  return typeof source.path === "string" ? source.path : ""
}

function stripReplayExtension(filename) {
  return filename.toLowerCase().endsWith(".rpl") ? filename.slice(0, -4) : filename
}

function formatBytes(size) {
  if (!Number.isFinite(size) || size < 0) return ""
  if (size < 1024) return `${size} B`

  const units = ["KB", "MB", "GB"]
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function getErrorMessage(err) {
  return err?.message || String(err || "Replay operation failed")
}

function resultSucceeded(result) {
  if (result === false) return false
  if (result && typeof result === "object" && "success" in result) return !!result.success
  return true
}

function logReplayUiAction(scope, data = {}) {
  lua.core_replay.logUiAction(scope, data).catch(() => false)
}

function selectLoadedReplay(recordingList = recordings.value) {
  selectedKey.value = loadedReplayKey.value && recordingList.some(recording => recording.key === loadedReplayKey.value) ? loadedReplayKey.value : null
}

function applyRecordings(payload) {
  const nextRecordings = asArray(payload).map(normalizeReplayRecording).filter(recording => recording.key && recording.path)
  recordings.value = nextRecordings
  selectLoadedReplay(nextRecordings)
}

function applyReplayState(payload = {}) {
  const loadedFile = firstString(payload.loadedFile)
  if (loadedFile === lastLoadedFileSeen) return
  lastLoadedFileSeen = loadedFile
  loadedReplayKey.value = loadedFile ? normalizeReplayRecording({ path: loadedFile }).key : null
  selectLoadedReplay()
}

function validateNewBasename(newBasename) {
  const basename = firstString(newBasename).trim()
  if (!basename) throw new Error("Replay name cannot be empty")
  if (PATH_SEPARATOR_REGEX.test(basename)) throw new Error("Replay name must not contain folders")
  return basename
}

/**
 * @param {ReplayRecordingSource} recording
 * @returns {ReplayRecording}
 */
export function normalizeReplayRecording(recording) {
  const source = recording || {}
  const path = getRecordingPath(source)
  const basename = firstString(source.basename, getBasename(path))
  const displayName = firstString(source.displayName, stripReplayExtension(basename), path)
  const map = firstString(source.map, source.mapName, source.levelName)
  const vehicle = firstString(source.vehicle, source.vehicleName)
  const date = firstString(source.date, source.dateLabel, source.recordedAt)
  const providedMetadata = { map, vehicle, date }
  const missingMetadataFields = Array.isArray(source.missingMetadataFields)
    ? source.missingMetadataFields
    : UNKNOWN_METADATA_FIELDS.filter(field => !providedMetadata[field])

  return {
    ...source,
    key: firstString(source.key, path),
    path,
    filename: firstString(source.filename, path),
    basename,
    displayName,
    label: displayName,
    size: Number.isFinite(source.size) ? source.size : null,
    map: map || undefined,
    vehicle: vehicle || undefined,
    date: date || undefined,
    metadataAvailable: source.metadataAvailable === true || !!(map || vehicle || date),
    missingMetadataFields,
  }
}

export function toFlatFileBrowserItem(recording) {
  const normalized = normalizeReplayRecording(recording)
  const details = [
    normalized.map,
    normalized.vehicle,
    normalized.date,
    formatBytes(normalized.size),
  ].filter(Boolean)

  return {
    key: normalized.key,
    label: normalized.displayName,
    subtitle: details.join(" - "),
    defaultAction: { key: "play", label: "ui.replay.play" },
    actions: [
      { key: "rename", label: "ui.replay.rename.button", uiEvent: "context" },
      { key: "delete", label: "ui.common.delete", uiEvent: "action_4", danger: true },
    ],
    recording: normalized,
  }
}

export function useReplayCatalog(options = {}) {
  const events = useEvents()
  const autoRefresh = options.autoRefresh !== false
  const items = computed(() => recordings.value.map(toFlatFileBrowserItem))
  let playRequestPending = false

  events.on(REPLAY_RECORDINGS_UPDATED_EVENT, applyRecordings)
  events.on(REPLAY_STATE_CHANGED_EVENT, applyReplayState)

  async function refreshRecordings() {
    const generation = ++refreshGeneration
    loading.value = true
    error.value = null

    try {
      const data = await lua.core_replay.getRecordings()
      if (generation === refreshGeneration) applyRecordings(data)
      return recordings.value
    } catch (err) {
      if (generation === refreshGeneration) {
        recordings.value = []
        selectedKey.value = null
        error.value = getErrorMessage(err)
      }
      return []
    } finally {
      if (generation === refreshGeneration) loading.value = false
    }
  }

  /**
   *
   * @param {ReplayRecordingSource} recording
   * @param {Object} [options={}]
   * @param {boolean} [options.autoplay = false]
   * @param {boolean} [options.pauseWhenReady = false]
   * @param {(levelKnown: boolean) => Promise<boolean>} [options.confirmLevelChange]
   * @returns {Promise<boolean | undefined>}
   */
  async function playRecording(recording, options = {}) {
    if (playRequestPending) return false
    playRequestPending = true

    const path = getRecordingPath(recording)

    try {
      if (!path) throw new Error("Replay file is missing")
      const autoplay = options.autoplay === true
      const pauseWhenReady = options.pauseWhenReady === true
      const loadArgs = pauseWhenReady ? [path, autoplay, { pauseWhenReady }] : [path, autoplay]

      error.value = null
      const playbackContext = await lua.core_replay.getPlaybackContext(path)
      if (!resultSucceeded(playbackContext)) {
        throw new Error(firstString(playbackContext?.message, "Failed to inspect replay"))
      }
      if (playbackContext?.requiresLevelLoad) {
        const confirmed = typeof options.confirmLevelChange === "function"
          && await options.confirmLevelChange(playbackContext.levelKnown)
        if (!confirmed) {
          logReplayUiAction("playRecording.levelLoadCancelled", {
            path,
            currentLevel: playbackContext.currentLevel,
            recordedLevel: playbackContext.recordedLevel,
          })
          return false
        }
      }

      logReplayUiAction("playRecording.begin", { path, autoplay, pauseWhenReady })
      logReplayUiAction("playRecording.loadFile", { path, autoplay, pauseWhenReady })
      const result = await lua.core_replay.loadFile(...loadArgs)
      logReplayUiAction("playRecording.loadFileResult", { path, result })
      if (!resultSucceeded(result)) throw new Error(firstString(result?.message, "Failed to play replay"))
      selectedKey.value = normalizeReplayRecording(recording).key
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      logReplayUiAction("playRecording.error", { path, message: error.value })
      throw err
    } finally {
      playRequestPending = false
    }
  }

  async function renameRecording(recording, newBasename) {
    const path = getRecordingPath(recording)
    if (!path) throw new Error("Replay file is missing")

    try {
      error.value = null
      const result = await lua.core_replay.acceptRename(path, validateNewBasename(newBasename))
      if (!resultSucceeded(result)) throw new Error(firstString(result?.message, "Failed to rename replay"))
      await refreshRecordings()
      return result
    } catch (err) {
      error.value = getErrorMessage(err)
      throw err
    }
  }

  async function deleteRecording(recording) {
    const path = getRecordingPath(recording)
    if (!path) throw new Error("Replay file is missing")

    try {
      error.value = null
      const result = await lua.core_replay.removeRecording(path)
      if (!resultSucceeded(result)) throw new Error(firstString(result?.message, "Failed to delete replay"))
      if (selectedKey.value === normalizeReplayRecording(recording).key) selectedKey.value = null
      await refreshRecordings()
      return result
    } catch (err) {
      error.value = getErrorMessage(err)
      throw err
    }
  }

  if (autoRefresh) refreshRecordings()

  return {
    items,
    loading,
    error,
    selectedKey,
    playRecording,
    renameRecording,
    deleteRecording,
  }
}
