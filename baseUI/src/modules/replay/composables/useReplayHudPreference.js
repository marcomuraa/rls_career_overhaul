import Storage from "@/services/storage"

// Display replay recording/playback timings in the HUD
// See useReplayHudMessage.js
const storage = new Storage("replayHud", { showStatus: false }).values

export function useReplayHudPreference() {
  return storage
}
