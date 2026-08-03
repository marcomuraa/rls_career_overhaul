// Stats routes (dev-only) ----------------------------
import Stats from "./views/Stats.vue"

export default [
  {
    path: "/dev/stats",
    name: "dev.stats",
    component: Stats,
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

