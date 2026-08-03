import { watch } from "vue"
import { useEvents } from "@/services/events"
import { lua } from "@/bridge"
import { useReplayHudPreference } from "./useReplayHudPreference"

const CATEGORY = "replay.hudStatus"

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const minutes = Math.floor(safeSeconds / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`
}

/**
 * Display replay recording/playback timings in the HUD using the messages system
 *
 * @param {import("vue").Ref<boolean> | import("vue").ComputedRef<boolean>} [suppressed] - hide while true (e.g. already shown explicitly in a menu screen)
 */
export function useReplayHudMessage(suppressed) {
  const events = useEvents()
  const hudPreference = useReplayHudPreference()

  let state = "inactive"
  let positionSeconds = 0
  let totalSeconds = 0
  let lastPushedKey = null

  function clearMessage() {
    if (lastPushedKey === null) return
    lastPushedKey = null
    events.emit("Message", { category: CATEGORY, clear: true })
  }

  function refresh() {
    const isRecording = state === "recording"
    const isPlayback = state === "playback"
    if (suppressed?.value || !hudPreference.showStatus || (!isRecording && !isPlayback)) {
      clearMessage()
      return
    }

    const elapsed = formatClock(positionSeconds)
    const duration = formatClock(totalSeconds)
    const key = isRecording ? `rec:${elapsed}` : `play:${elapsed}/${duration}`
    if (key === lastPushedKey) return
    lastPushedKey = key

    events.emit("Message", {
      category: CATEGORY,
      ttl: -1,
      icon: isRecording ? "bigDot" : "play",
      text: isRecording ? "ui.replay.hudStatus.recording" : "ui.replay.hudStatus.playback",
      context: isRecording ? { time: elapsed } : { position: elapsed, duration },
    })
  }

  events.on("replayStateChanged", payload => {
    state = String(payload?.state || "inactive")
    positionSeconds = Number(payload?.positionSeconds) || 0
    totalSeconds = Number(payload?.totalSeconds) || 0
    refresh()
  })

  watch(() => hudPreference.showStatus, refresh)
  if (suppressed) watch(() => suppressed.value, refresh)

  // request the current replay state
  lua.core_replay.onInit().catch(() => {})
}
