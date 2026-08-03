import UiSoundsDemo from "./views/UiSoundsDemo.vue"

export default [
  {
    name: "menu.uiSounds",
    path: "/ui-sounds",
    component: UiSoundsDemo,
    meta: {
      infoBar: {
        visible: true,
        showSysInfo: true,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: true,
      },
    },
  },
]
