import PlayView from "@/modules/play/views/Play.vue"

export default [
  {
    path: "/play",
    name: "play",
    component: PlayView,
    meta: {
      clickThrough: true,
      uiNav: false,
      topBar: {
        visible: false,
      },
      infoBar: {
        visible: false,
        showSysInfo: false,
      },
      uiApps: {
        shown: true,
      },
    },
  },
]
