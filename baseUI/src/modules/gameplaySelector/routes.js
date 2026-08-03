import GameplaySelector from "./views/GameplaySelector.vue"

const gameplaySelectorMeta = {
  clickThrough: true,
  handlesOwnReady: true,
  infoBar: {
    visible: true,
    showSysInfo: false,
  },
  uiApps: {
    shown: false,
  },
  topBar: {
    visible: true,
  },
}

function buildGameplaySelectorRoute(name, path) {
  return {
    name,
    path,
    component: GameplaySelector,
    meta: gameplaySelectorMeta,
  }
}

export default [
  buildGameplaySelectorRoute("menu.gameplay", "/gameplay-selector"),
  buildGameplaySelectorRoute("menu.rallySelector", "/gameplay-selector/rally"),
  buildGameplaySelectorRoute("menu.gameplay.type", "/gameplay-selector/type"),
]
