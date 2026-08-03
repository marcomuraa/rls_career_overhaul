import TaxiView from "./views/TaxiView.vue"

export default [
  {
    path: "/taxi",
    name: "taxi",
    component: TaxiView,
    meta: {
      clickThrough: true,
      infoBar: { visible: false },
      topBar: { visible: false },
      uiApps: { shown: false },
    },
  },
]
