// Mission related routes
import MissionControl from "./views/MissionControl.vue"
import MissionsGrid from "./views/MissionsGrid.vue"
import MissionDragHistory from "./views/MissionDragHistory.vue"
import MissionDragRules from "./views/MissionDragRules.vue"
import MissionDetailsNew from "./views/MissionDetailsNew.vue"
import AiCompetitorsLeaderboardTable from "./components/AiCompetitorsLeaderboardTable.vue"
import { CROSSFIRE_HINTS_ALL } from "@/services/infoBar.js"
export default [
  {
    path: "/mission",
    children: [
      // Details
      {
        path: "details",
        name: "mission.details",
        component: MissionDetailsNew,
        // component: views.MissionDetails,
        meta: {
          infoBar: {
            visible: true,
            showSysInfo: false,
            hints: CROSSFIRE_HINTS_ALL,
          },
          uiApps: {
            shown: false,
          },
        },
      },
      //

      {
        path: "mission-control/:mode(\\*?.*?)?",
        name: "mission.control",
        component: MissionControl,
        meta: {
          uiApps: {
            shown: false,
          },
        },
        infoBar: {
          visible: true,
          showSysInfo: false,
          hints: CROSSFIRE_HINTS_ALL,
        },
        props: true,
      },

      // WIP: grid viewer
      {
        path: "grid",
        name: "mission.grid",
        component: MissionsGrid,
        meta: {
          uiApps: {
            shown: false,
          },
        },
      },
      {
        path: "dragHistory/:id(\\*?.*?)?:name?/:level?/",
        name: "mission.dragHistory",
        component: MissionDragHistory,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: false,
            hints: CROSSFIRE_HINTS_ALL,
          },
        },
        props: true,
      },
      {
        path: "dragRules/:id/:level",
        name: "mission.dragRules",
        component: MissionDragRules,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: false,
            hints: CROSSFIRE_HINTS_ALL,
          },
        },
        props: true,
      },
      {
        path: "AiCompetitorsLeaderboardTable",
        name: "mission.AiCompetitorsLeaderboardTable",
        component: AiCompetitorsLeaderboardTable,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: false,
            hints: CROSSFIRE_HINTS_ALL,
          },
        },
      },
    ],
  },
]
