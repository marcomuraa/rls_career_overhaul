import { computed, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { getBasename } from "./getBasename"
import { clampNumber } from "@/utils/maths"

const REPLAY_STATE_CHANGED_EVENT = "replayStateChanged"
const REPLAY_FILE_EXTENSION = ".rpl"
const SEEK_STATE_GRACE_MS = 500
const DEFAULT_JUMP_SECONDS = 5
const SPEED_STEP = 1
const SPEED_FRACTIONS = Object.freeze(
  [
    { numerator: 1, denominator: 1000 },
    { numerator: 1, denominator: 500 },
    { numerator: 1, denominator: 200 },
    { numerator: 1, denominator: 100 },
    { numerator: 1, denominator: 50 },
    { numerator: 1, denominator: 32 },
    { numerator: 1, denominator: 16 },
    { numerator: 1, denominator: 8 },
    { numerator: 1, denominator: 4 },
    { numerator: 1, denominator: 2 },
    { numerator: 3, denominator: 4 },
  ].map(fraction => ({
    ...fraction,
    value: Number((fraction.numerator / fraction.denominator).toFixed(3)),
  }))
)
const SPEED_VALUES = Object.freeze([...SPEED_FRACTIONS.map(({ value }) => value), 1, 1.5, 2, 4, 8])

const initialState = Object.freeze({
  loadedFile: "",
  totalSeconds: 0,
  speed: 1,
  paused: true,
  state: "inactive",
})

function asNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function clampPercent(value) {
  return clampNumber(value, 0, 1)
}

function stripReplayExtension(filename) {
  return filename.toLowerCase().endsWith(REPLAY_FILE_EXTENSION) ? filename.slice(0, -REPLAY_FILE_EXTENSION.length) : filename
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, asNumber(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.floor((safeSeconds % 1) * 1000)
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
}

function formatSpeed(speed) {
  const value = asNumber(speed, 1)
  const roundedSpeed = Number(value.toFixed(3))
  if (roundedSpeed > 0 && roundedSpeed < 1) {
    const fraction = SPEED_FRACTIONS.find(({ value }) => Math.abs(value - roundedSpeed) < Number.EPSILON)
    if (fraction) return `${fraction.numerator}/${fraction.denominator}`
  }
  return String(Number(roundedSpeed.toFixed(3)))
}

function getSpeedIndex(speed) {
  const roundedSpeed = Number(asNumber(speed, 1).toFixed(3))
  return SPEED_VALUES.findIndex(value => Math.abs(value - roundedSpeed) < Number.EPSILON)
}

function resultSucceeded(result) {
  if (result === false) return false
  if (result && typeof result === "object" && "success" in result) return !!result.success
  return true
}

function logReplayUiAction(scope, data = {}) {
  lua.core_replay.logUiAction(scope, data).catch(() => false)
}

export function useReplayPlayer() {
  const events = useEvents()
  const replayState = ref({ ...initialState })
  const positionSeconds = ref(0)
  const positionPercent = ref(0)
  const error = ref(null)
  let lastSeekAt = 0

  const loadedFile = computed(() => replayState.value.loadedFile || "")
  const hasLoadedReplay = computed(() => loadedFile.value.trim() !== "")
  const isRecording = computed(() => replayState.value.state === "recording")
  const isPlayback = computed(() => replayState.value.state === "playback")
  const isPlaying = computed(() => isPlayback.value && !replayState.value.paused)
  const isPaused = computed(() => isPlayback.value && replayState.value.paused)
  const canControlPlayback = computed(() => hasLoadedReplay.value && isPlayback.value)
  const canPlayPause = computed(() => hasLoadedReplay.value && (replayState.value.state === "inactive" || isPlayback.value))
  const canStopUnload = computed(() => hasLoadedReplay.value && !isRecording.value)
  const canRecord = computed(() => replayState.value.state === "inactive")
  const canStopRecording = computed(() => isRecording.value)
  const canSeek = canControlPlayback
  const canJump = canControlPlayback
  const canChangeSpeed = canControlPlayback
  const speedIndex = computed(() => getSpeedIndex(replayState.value.speed))
  const canDecreaseSpeed = computed(() => canChangeSpeed.value && speedIndex.value > 0)
  const canIncreaseSpeed = computed(() => canChangeSpeed.value && speedIndex.value >= 0 && speedIndex.value < SPEED_VALUES.length - 1)
  const loadedFileShort = computed(() => getBasename(loadedFile.value))
  const displayName = computed(() => stripReplayExtension(loadedFileShort.value) || "No replay loaded")
  const displayPath = computed(() => loadedFile.value || "Select a replay from All Replays.")
  const positionLabel = computed(() => formatTime(positionSeconds.value))
  const durationLabel = computed(() => formatTime(replayState.value.totalSeconds))
  const speedLabel = computed(() => formatSpeed(replayState.value.speed))

  function applyReplayState(payload = {}) {
    const nextPositionSeconds = asNumber(payload.positionSeconds)
    Object.assign(replayState.value, {
      loadedFile: String(payload.loadedFile || ""),
      totalSeconds: asNumber(payload.totalSeconds),
      speed: asNumber(payload.speed, 1),
      paused: payload.paused !== false,
      state: String(payload.state || "inactive"),
    })

    // throttle the scrubber
    // note: the srubber's UI isn't throttled intentionally
    if (Date.now() - lastSeekAt > SEEK_STATE_GRACE_MS) {
      positionSeconds.value = nextPositionSeconds
      positionPercent.value =
        replayState.value.totalSeconds > 0 ? clampPercent(nextPositionSeconds / replayState.value.totalSeconds) : 0
    }
  }

  async function requestInitialState() {
    try {
      await lua.core_replay.onInit()
    } catch (err) {
      error.value = err?.message || String(err || "Failed to request replay state")
    }
  }

  async function runControl(scope, action, canRun = canControlPlayback.value, blockedMessage = "Replay control is not available") {
    if (!canRun) {
      error.value = blockedMessage
      logReplayUiAction(`${scope}.blocked`, {
        loadedFile: loadedFile.value,
        state: replayState.value.state,
        paused: replayState.value.paused,
        message: blockedMessage,
      })
      return false
    }
    error.value = null
    logReplayUiAction(scope, {
      loadedFile: loadedFile.value,
      state: replayState.value.state,
      paused: replayState.value.paused,
    })

    try {
      const result = await action()
      if (!resultSucceeded(result)) throw new Error(result?.message || "Replay control failed")
      return result && typeof result === "object" ? result : true
    } catch (err) {
      error.value = err?.message || String(err || "Replay control failed")
      logReplayUiAction(`${scope}.error`, { loadedFile: loadedFile.value, message: error.value })
      return false
    }
  }

  async function togglePlay() {
    return runControl("player.togglePlay", () => lua.core_replay.togglePlay(), canPlayPause.value, "Load a replay before using playback controls")
  }

  async function stopUnload() {
    const blockedMessage = isRecording.value ? "Cannot unload replay while recording is active" : "No replay loaded to unload"
    return runControl("player.stopUnload", () => lua.core_replay.stopAndUnload(), canStopUnload.value, blockedMessage)
  }

  async function startRecording() {
    const blockedMessage = isRecording.value ? "Replay recording is already active" : "Cannot start replay recording during playback"
    return runControl("player.startRecording", () => lua.core_replay.startRecording(), canRecord.value, blockedMessage)
  }

  async function stopRecording(options) {
    return runControl("player.stopRecording", () => lua.core_replay.stopRecording(options), canStopRecording.value, "Replay recording is not active")
  }

  async function cancelRecording() {
    return runControl("player.cancelRecording", () => lua.core_replay.cancelRecording(), canStopRecording.value, "Replay recording is not active")
  }

  async function toggleRecord(options) {
    return isRecording.value ? stopRecording(options) : startRecording()
  }

  async function jumpBackward(seconds = DEFAULT_JUMP_SECONDS) {
    return runControl("player.jumpTime", () => lua.core_replay.jumpTime(-Math.abs(seconds)), canJump.value)
  }

  async function jumpForward(seconds = DEFAULT_JUMP_SECONDS) {
    return runControl("player.jumpTime", () => lua.core_replay.jumpTime(Math.abs(seconds)), canJump.value)
  }

  async function speedDown(step = SPEED_STEP) {
    return runControl("player.toggleSpeed", () => lua.core_replay.toggleSpeed(-Math.abs(step)), canDecreaseSpeed.value)
  }

  async function speedUp(step = SPEED_STEP) {
    return runControl("player.toggleSpeed", () => lua.core_replay.toggleSpeed(Math.abs(step)), canIncreaseSpeed.value)
  }

  async function seekWithResumeIntent(value) {
    if (!canSeek.value) {
      error.value = "Replay seek is not available"
      logReplayUiAction("player.seek.blocked", {
        loadedFile: loadedFile.value,
        state: replayState.value.state,
        paused: replayState.value.paused,
        message: error.value,
      })
      return false
    }
    const nextPercent = clampPercent(value)
    const shouldResume = isPlaying.value
    lastSeekAt = Date.now()
    positionPercent.value = nextPercent
    // needed for throttling the scrubber
    positionSeconds.value = nextPercent * replayState.value.totalSeconds
    error.value = null
    logReplayUiAction("player.seek", {
      loadedFile: loadedFile.value,
      state: replayState.value.state,
      paused: replayState.value.paused,
      percent: nextPercent,
      resume: shouldResume,
    })

    try {
      const pauseResult = await lua.core_replay.pause(true)
      if (!resultSucceeded(pauseResult)) throw new Error(pauseResult?.message || "Replay pause failed")
      const seekResult = await lua.core_replay.seek(nextPercent)
      if (!resultSucceeded(seekResult)) throw new Error(seekResult?.message || "Replay seek failed")
      if (shouldResume) {
        const resumeResult = await lua.core_replay.pause(false)
        if (!resultSucceeded(resumeResult)) throw new Error(resumeResult?.message || "Replay resume failed")
      }
      return true
    } catch (err) {
      error.value = err?.message || String(err || "Replay seek failed")
      logReplayUiAction("player.seek.error", { loadedFile: loadedFile.value, message: error.value })
      return false
    }
  }

  events.on(REPLAY_STATE_CHANGED_EVENT, applyReplayState)
  requestInitialState()

  return {
    positionPercent,
    error,
    loadedFileShort,
    hasLoadedReplay,
    isRecording,
    isPlayback,
    isPlaying,
    isPaused,
    canPlayPause,
    canStopUnload,
    canRecord,
    canStopRecording,
    canSeek,
    canJump,
    canChangeSpeed,
    canDecreaseSpeed,
    canIncreaseSpeed,
    displayName,
    displayPath,
    positionLabel,
    durationLabel,
    speedLabel,
    defaultJumpSeconds: DEFAULT_JUMP_SECONDS,
    togglePlay,
    stopUnload,
    toggleRecord,
    cancelRecording,
    jumpBackward,
    jumpForward,
    speedDown,
    speedUp,
    seekWithResumeIntent,
  }
}
