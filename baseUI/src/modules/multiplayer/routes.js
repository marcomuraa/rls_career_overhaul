// Multiplayer routes --------------------------------------
import MultiplayerSessions from "./views/MultiplayerSessions.vue"
import HostOptions from "./components/HostOptions.vue"
import SpectatorView from "./views/SpectatorView.vue"

export default [
  {
    path: "/multiplayer",
    name: "menu.multiplayerSessions",
    component: MultiplayerSessions,
    meta: {
      clickThrough: true,
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: true,
      }
    },
  },
  {
    path: "/multiplayer/host-options",
    name: "multiplayer.host-options",
    component: HostOptions,
  },
  {
    path: "/multiplayer/spectator",
    name: "multiplayer.spectator",
    component: SpectatorView,
    meta: {
      clickThrough: true,
      infoBar: { visible: false },
      topBar: { visible: false },
      uiApps: { shown: true },
    },
  },
]
