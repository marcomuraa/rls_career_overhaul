import AppsTest from "./views/AppsTest.vue"

export default [
  {
    path: "/debug/ui-apps-test",
    name: "debug.ui-apps-test",
    component: AppsTest,
    meta: {
      uiApps: { shown: false },
      topBar: { visible: false },
    },
  },
]
