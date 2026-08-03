import { ref, defineAsyncComponent } from "vue"
import { useBridge } from "@/bridge"
import { openScreenOverlayRight } from "@/services/popup"
import router from "@/router"

// async to avoid a circular dependency with the view (which imports this service)
const ReadyUpScreen = defineAsyncComponent(() => import("@/modules/multiplayer/views/ReadyUpScreen.vue"))

export const gamemodeInfo = ref(null)
export const requirements = ref([])
export const localStatus = ref("notReady")
export const readyPlayerCount = ref(0)
export const totalPlayerCount = ref(0)

let screenOverlay = null
let currentRouteName = null

function isInPlayRoute() {
  if (currentRouteName === "play") return true
  if (currentRouteName != null) return false
  return router?.currentRoute?.value?.name === "play"
}

function openPopup() {
  if (screenOverlay) return
  const overlay = openScreenOverlayRight(ReadyUpScreen)
  screenOverlay = overlay
  overlay.then(() => {
    if (screenOverlay === overlay) screenOverlay = null
  }).catch(() => {
    if (screenOverlay === overlay) screenOverlay = null
  })
}

function dismissPopup() {
  if (!screenOverlay) return
  try { screenOverlay.close(true) } catch (_) { /* popup may already be gone */ }
  screenOverlay = null
}

export function closeScreen() {
  dismissPopup()
  gamemodeInfo.value = null
  requirements.value = []
  localStatus.value = "notReady"
  readyPlayerCount.value = 0
  totalPlayerCount.value = 0
}

function onReadyUpScreen(data) {
  if (!data || !data.open) {
    closeScreen()
    return
  }

  gamemodeInfo.value = data.gamemodeInfo || null
  requirements.value = Array.isArray(data.requirements) ? data.requirements : []
  localStatus.value = data.localStatus || "notReady"
  readyPlayerCount.value = data.readyPlayerCount || 0
  totalPlayerCount.value = data.totalPlayerCount || 0

  if (!isInPlayRoute()) return
  if (screenOverlay) return
  openPopup()
}

function onRouteChanged(data) {
  const routeName = data && data.request && data.request.name
  currentRouteName = routeName
  if (routeName === "play") {
    if (!screenOverlay && gamemodeInfo.value) {
      openPopup()
    }
  } else {
    dismissPopup()
  }
}

let inited = false

export function init() {
  if (inited) return
  const { events } = useBridge()
  events.on("OnMultiplayerReadyUpScreen", onReadyUpScreen)
  events.on("ui_router_afterRouteChange", onRouteChanged)
  inited = true
}
