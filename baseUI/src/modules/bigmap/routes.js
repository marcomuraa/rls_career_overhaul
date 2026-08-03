// BigMap routes --------------------------------------
import BigMapView from "./views/BigMapView.vue"

export default [
  {
    path: "/bigmap/:instant?",
    name: "bigmap",
    component: BigMapView,
    props: route => ({
      instant: route.params.instant === true || route.params.instant === "true",
    }),
    meta: {
      handlesOwnReady: true,
      uiApps: {
        shown: false,
      },
      infoBar: {
        visible: true,
        showSysInfo: true,
      },
    },
  },
]