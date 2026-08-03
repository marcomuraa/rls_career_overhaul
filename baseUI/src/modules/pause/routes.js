import Pause from "./views/PauseShell.vue"
import OptionsView from "@/common/modules/options/views/OptionsView.vue"
import Milestones from "@/modules/career/views/Milestones.vue"
import Logbook from "@/modules/career/views/Logbook.vue"
import ProgressLanding from "@/modules/career/views/ProgressLanding.vue"
import MissionDetailsNew from "@/modules/missions/views/MissionDetailsNew.vue"
import BigMapView from "@/modules/bigmap/views/BigMapView.vue"
import PausePhotomodeShell from "./views/photomode/PausePhotomodeShell.vue"
import PauseVehicleConfigurationShell from "./views/PauseVehicleConfigurationShell.vue"
import PauseHudAppsShell from "./views/PauseHudAppsShell.vue"
import PauseCareerLogbook from "./views/PauseCareerLogbook.vue"
import Mirrors from "@/modules/vehicleConfig/views/Mirrors.vue"

const pauseRouteMeta = {
  preloadOn: "loadingScreen",
  handlesOwnReady: true,
  infoBar: {
    visible: true,
    showSysInfo: true,
    hideServiceProvidersUser: true,
  },
  uiApps: {
    shown: false,
  },
  topBar: {
    visible: false,
  },
}

export default [
  {
    path: "/pause",
    component: Pause,
    meta: pauseRouteMeta,
    children: [
      {
        path: "system",
        name: "pause.system",
        component: Pause,
        meta: {
          menu: {
            label: "ui.pause.system",
            digestHeading: "ui.pause.system",
            type: "root",
            order: 5,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "",
        name: "pause",
        component: Pause,
        meta: {
          menu: {
            label: "Home",
            digestHeading: "Activities",
            type: "root",
            order: 10,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "career",
        name: "pause.career",
        component: Pause,
        meta: {
          menu: {
            label: "ui.career.landingPage.name",
            digestHeading: "ui.career.landingPage.name",
            type: "root",
            order: 20,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle",
        name: "pause.vehicle",
        component: Pause,
        meta: {
          menu: {
            label: "ui.pause.vehicle",
            type: "root",
            order: 20,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "environment",
        name: "pause.environment",
        component: Pause,
        meta: {
          menu: {
            label: "Environment",
            type: "root",
            order: 30,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "environment/weather",
        name: "pause.environment.weather",
        component: Pause,
        meta: {
          menu: {
            label: "ui.pause.environment.timeWeather",
            type: "sub",
            parent: "pause.environment",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "environment/simulation",
        name: "pause.environment.simulation",
        component: Pause,
        meta: {
          menu: {
            label: "ui.pause.environment.simulation",
            type: "sub",
            parent: "pause.environment",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "environment/traffic",
        name: "pause.environment.traffic",
        component: Pause,
        meta: {
          menu: {
            label: "Traffic",
            type: "sub",
            parent: "pause.environment",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "multiplayer",
        name: "pause.multiplayer",
        component: Pause,
        meta: {
          menu: {
            label: "Multiplayer",
            type: "root",
            order: 40,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "replay",
        name: "pause.replay",
        component: Pause,
        meta: {
          menu: {
            label: "Replay",
            type: "sub",
            parent: "pause",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "replay/all",
        name: "pause.replay.all",
        component: Pause,
        meta: {
          menu: {
            label: "All Replays",
            type: "sub",
            parent: "pause.replay",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/packs",
        name: "pause.vehicle.packs",
        component: Pause,
        meta: {
          menu: {
            label: "Parts Packs",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/parts",
        name: "pause.vehicle.parts",
        component: Pause,
        meta: {
          menu: {
            label: "Parts Management",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/tuning",
        name: "pause.vehicle.tuning",
        component: Pause,
        meta: {
          menu: {
            label: "Tuning",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/paint",
        name: "pause.vehicle.paint",
        component: Pause,
        meta: {
          menu: {
            label: "Color / Skin",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/save",
        name: "pause.vehicle.save",
        component: Pause,
        meta: {
          menu: {
            label: "Save Config",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/vehicle-details",
        name: "pause.vehicle.vehicleDetails",
        component: Pause,
        meta: {
          menu: {
            label: "Vehicle Details",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/details",
        name: "pause.vehicleDetails",
        component: Pause,
        meta: {
          menu: {
            label: "Vehicle Details",
            type: "sub",
            parent: "pause",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "manage-vehicles",
        name: "pause.manageVehicles",
        component: Pause,
        meta: {
          menu: {
            label: "Manage vehicles",
            type: "sub",
            parent: "pause",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "manage-vehicles/vehicle-details",
        name: "pause.manageVehicles.vehicleDetails",
        component: Pause,
        meta: {
          menu: {
            label: "Vehicle Details",
            type: "sub",
            parent: "pause.manageVehicles",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/packs/:pathMatch(.*)*",
        name: "pause.vehicle.packs.path",
        component: Pause,
        meta: {
          menu: {
            label: "Parts Packs",
            type: "sub",
            parent: "pause.vehicle.packs",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      // TODO: Update multiplayer route paths to be complete
      {
        path: "multiplayer/settings",
        name: "pause.multiplayer.settings",
        component: Pause,
        meta: {
          menu: {
            label: "Session Settings",
            type: "sub",
            parent: "pause.multiplayer",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "multiplayer/gamemode",
        name: "pause.multiplayer.gamemode",
        component: Pause,
        meta: {
          menu: {
            label: "Gamemode",
            type: "sub",
            parent: "pause.multiplayer",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "multiplayer/playerList",
        name: "pause.multiplayer.playerList",
        component: Pause,
        meta: {
          menu: {
            label: "Player List",
            type: "sub",
            parent: "pause.multiplayer",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
      {
        path: "vehicle/debug",
        name: "pause.vehicle.debug",
        component: Pause,
        meta: {
          menu: {
            label: "ui.debug.vehicle",
            type: "sub",
            parent: "pause.vehicle",
            breadcrumb: true,
            hasMainPanel: true,
          },
        },
      },
    ],
  },
  {
    path: "/pause/milestones/:id(\\*?.*?)?",
    name: "pause.milestones",
    component: Milestones,
    props: true,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/branch/:pathId?",
    name: "pause.career.branch",
    component: ProgressLanding,
    props: route => ({
      pathId: route.params.pathId,
    }),
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/branch/:pathId?/mission/details",
    name: "pause.career.branch.missionDetails",
    component: MissionDetailsNew,
    meta: {
      ...pauseRouteMeta,
      handlesOwnReady: false,
    },
  },
  {
    path: "/pause/career/branch/:pathId?/bigmap/:instant?",
    name: "pause.career.branch.bigmap",
    component: BigMapView,
    props: route => ({
      instant: route.params.instant === true || route.params.instant === "true",
    }),
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/mission/details/:pathId?",
    name: "pause.career.missionDetails",
    component: MissionDetailsNew,
    meta: {
      ...pauseRouteMeta,
      handlesOwnReady: false,
    },
  },
  {
    path: "/pause/career/history",
    name: "pause.career.history",
    component: Pause,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/history/financial",
    name: "pause.career.history.financial",
    component: Pause,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/history/gameplay",
    name: "pause.career.history.gameplay",
    component: Pause,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/history/logbook/:id(\\*?.*?)?",
    name: "pause.career.history.logbook",
    component: PauseCareerLogbook,
    props: true,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/milestones/:id(\\*?.*?)?",
    name: "pause.career.milestones",
    component: Milestones,
    props: true,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/career/logbook/:id(\\*?.*?)?",
    name: "pause.career.logbook",
    component: Logbook,
    props: true,
    meta: pauseRouteMeta,
  },
  {
    path: "/pause/vehicle/configurationcombined",
    name: "pause.vehicle.configurationcombined",
    component: PauseVehicleConfigurationShell,
    meta: {
      ...pauseRouteMeta,
      menu: {
        label: "ui.dashboard.vehicleconfig",
        type: "sub",
        parent: "pause.vehicle",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/vehicle/configurationcombined/save",
    name: "pause.vehicle.configurationcombined.save",
    component: Pause,
    meta: {
      ...pauseRouteMeta,
      menu: {
        label: "Save Config",
        type: "sub",
        parent: "pause.vehicle.configurationcombined",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/vehicle/configurationcombined/configlistmanage",
    name: "pause.vehicle.configurationcombined.configlistmanage",
    component: Pause,
    meta: {
      ...pauseRouteMeta,
      menu: {
        label: "Manage Configs",
        type: "sub",
        parent: "pause.vehicle.configurationcombined",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/vehicle/configurationcombined/mirrors",
    name: "pause.vehicle.configurationcombined.mirrors",
    component: Mirrors,
    props: { exitRoute: "pause.vehicle.configurationcombined" },
    meta: {
      ...pauseRouteMeta,
      handlesOwnReady: false,
      menu: {
        label: "ui.mirrors.name",
        type: "sub",
        parent: "pause.vehicle.configurationcombined",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/options/:category?",
    name: ["pause.options", "pause.options.category"],
    component: OptionsView,
    props: route => ({
      category: route.params?.category,
      managePauseRequest: false,
      syncRoute: false,
    }),
    meta: {
      infoBar: {
        visible: true,
        showSysInfo: true,
        hideServiceProvidersUser: true,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: false,
      },
      menu: {
        label: "Options",
        type: "sub",
        parent: "pause",
        breadcrumb: true,
      },
    },
  },
  {
    path: "/pause/photomode",
    name: "pause.photomode",
    component: PausePhotomodeShell,
    meta: {
      ...pauseRouteMeta,
      menu: {
        label: "Photomode",
        type: "sub",
        parent: "pause",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/hud-apps",
    name: "pause.hudApps",
    component: PauseHudAppsShell,
    meta: {
      ...pauseRouteMeta,
      uiApps: {
        shown: true,
      },
      menu: {
        label: "ui.hudApps.layouts",
        type: "sub",
        parent: "pause",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/hud-apps/edit-layout",
    name: "pause.hudApps.editlayout",
    component: PauseHudAppsShell,
    meta: {
      ...pauseRouteMeta,
      infoBar: {
        ...pauseRouteMeta.infoBar,
        showSysInfo: false,
      },
      uiApps: {
        shown: true,
      },
      menu: {
        label: "ui.hudApps.editLayout",
        type: "sub",
        parent: "pause.hudApps",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
  {
    path: "/pause/hud-apps/edit-layout/transform",
    name: "pause.hudApps.editlayout.transform",
    component: PauseHudAppsShell,
    meta: {
      ...pauseRouteMeta,
      infoBar: {
        ...pauseRouteMeta.infoBar,
        showSysInfo: false,
      },
      uiApps: {
        shown: true,
      },
      menu: {
        label: "ui.hudApps.adjustApp",
        type: "sub",
        parent: "pause.hudApps.editlayout",
        breadcrumb: true,
        hasMainPanel: true,
      },
    },
  },
]
