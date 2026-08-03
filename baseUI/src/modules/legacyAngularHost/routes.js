import LegacyAngularHost from "@/modules/legacyAngularHost/views/LegacyAngularHost.vue"

export default [
  {
    path: "/__legacy/angular",
    name: "__legacyAngular",
    component: LegacyAngularHost,
    meta: {
      ignoreRouteSync: true,
      clickThrough: true,
      infoBar: {
        // Keep defaults permissive; Lua meta should decide visibility.
        visible: true,
        showSysInfo: true,
      },
      topBar: {
        visible: true,
      },
      uiApps: {
        shown: false,
      },
    },
  },
]

