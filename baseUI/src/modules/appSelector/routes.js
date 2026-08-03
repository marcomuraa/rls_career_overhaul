import AppSelector from "./views/AppSelector.vue"

export default [
  {
    name: "pause.hudApps.selector",
    path: "/pause/hud-apps/selector",
    component: AppSelector,
    meta: {
      handlesOwnReady: true,
      infoBar: { visible: true, showSysInfo: false },
      uiApps: { shown: false },
      topBar: { visible: true },
    },
  },
]
