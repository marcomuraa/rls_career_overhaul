import { LayoutEmpty } from "@/common/layouts"
import MainMenu from "./views/MainMenu.vue"
// import ClassicView from "./views/ClassicView.vue"
import MainView from "./views/MainView.vue"
import OthersView from "./views/OthersView.vue"
import DiscoverView from "./views/DiscoverView.vue"
import MenuExtrasHost from "./views/MenuExtrasHost.vue"
import MenuReplayHost from "@/modules/replay/views/MenuReplayHost.vue"
import CreditsSlideshow from "../credits/views/CreditsSlideshow.vue"

export default [
  {
    path: "/menu",
    component: MainMenu,
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
    children: [
      {
        path: "",
        name: "menu",
        component: MainView,
        meta: {
          handlesOwnReady: true,
        },
      },
      {
        path: "others",
        name: "menu.others",
        component: OthersView,
        meta: {
          preloadOn: "boot",
          topBar: {
            visible: false,
          }
        }
      },
    ]
  },
  {
    path: "/menu/extras",
    name: [
      "menu.extras",
      "menu.extras.licenses",
      "menu.extras.help",
      "menu.extras.performance",
      "menu.extras.stats",
    ],
    component: MenuExtrasHost,
    meta: {
      infoBar: {
        preloadOn: "boot",
        visible: true,
        showSysInfo: true,
      },
    },
  },
  {
    path: "/menu/extras/credits",
    name: "menu.extras.credits",
    component: CreditsSlideshow,
  },
  {
    path: "/discover",
    name: "menu.discover",
    component: DiscoverView,
    meta: {
      preloadOn: "boot",
      infoBar: {
        visible: true,
        showSysInfo: true,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: false,
      },
    },
  },
  {
    path: "/menu/replay",
    name: "menu.replay",
    component: MenuReplayHost,
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
  { // this state is used to display top/info-bar in menus
    path: "/menu.:sub(.*)?",
    name: "__legacyAngular",
    component: LayoutEmpty, // just an empty content to make vue-router happy
    meta: {
      clickThrough: true,
      topBar: {
        visible: true
      },
      infoBar: {
        visible: true,
        showSysInfo: true,
      }
    },
  },

]
