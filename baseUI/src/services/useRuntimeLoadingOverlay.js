import { ref, watch, onMounted, onUnmounted } from "vue"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useBridge } from "@/bridge"

const SHOW_DELAY = 150
// bridge short gaps between consecutive file loads in one navigation so the overlay doesn't flicker
const HIDE_GAP = 120

export function useRuntimeLoadingOverlay() {
  const visible = ref(false)

  if (!__BNG_RT__) return { visible, onOverlayMouseDown() {}, onOverlayClick() {} }

  const navBlocker = useUINavBlocker()
  const { events } = useBridge()

  let showTimer = null
  let hideTimer = null
  let focusReturnTarget = null

  const show = () => { showTimer = null; visible.value = true }
  const endSession = () => {
    hideTimer = null
    if (showTimer) { clearTimeout(showTimer); showTimer = null }
    visible.value = false
  }

  // driven by the loader's inflight 0<->n transitions (UiRuntimeInflight event). a short one-shot
  // timer delays the show; another bridges idle gaps before hiding. no ever-running poll.
  function onInflight(active) {
    if (active) {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; return } // resumed within the gap
      if (!visible.value && !showTimer) showTimer = setTimeout(show, SHOW_DELAY)
    } else if (!hideTimer) {
      hideTimer = setTimeout(endSession, HIDE_GAP)
    }
  }

  watch(visible, on => {
    if (on) navBlocker.allowOnly([]) // block every uinav event while loading
    else navBlocker.clear()
  })

  function onOverlayMouseDown() {
    const el = document.activeElement
    if (!el || el === document.body || typeof el.focus !== "function") return
    focusReturnTarget = el
  }

  function onOverlayClick() {
    if (focusReturnTarget && focusReturnTarget.isConnected) {
      try {
        focusReturnTarget.focus({ preventScroll: true })
      } catch {
        focusReturnTarget.focus()
      }
    }
    focusReturnTarget = null
  }

  onMounted(() => {
    events.on("UiRuntimeInflight", onInflight)
    if (window.bngRuntimeStats?.inflight?.length) onInflight(true) // already loading at mount
  })
  onUnmounted(() => {
    events.off("UiRuntimeInflight", onInflight)
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    showTimer = hideTimer = null
    navBlocker.clear()
  })

  return { visible, onOverlayMouseDown, onOverlayClick }
}

export default useRuntimeLoadingOverlay
