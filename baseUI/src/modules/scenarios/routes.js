import ScenarioStart from "./views/ScenarioStart.vue"
import ScenarioEnd from "./views/ScenarioEnd.vue"
import QuickraceEnd from "./views/QuickraceEnd.vue"

const scenarioStartMeta = {
  handlesOwnReady: true,
  clickThrough: true,
  infoBar: {
    visible: false,
    showSysInfo: false,
  },
  uiApps: {
    shown: true,
  },
  topBar: {
    visible: false,
  },
}

const scenarioEndMeta = {
  handlesOwnReady: true,
  clickThrough: true,
  infoBar: {
    visible: false,
    showSysInfo: false,
  },
  uiApps: {
    shown: true,
  },
  topBar: {
    visible: false,
  },
}

export default [
  {
    name: "scenario.start",
    path: "/scenario/start",
    component: ScenarioStart,
    meta: scenarioStartMeta,
  },
  {
    name: "scenario.end",
    path: "/scenario/end",
    component: ScenarioEnd,
    meta: scenarioEndMeta,
  },
  {
    name: "scenario.chapter.end",
    path: "/scenario/chapter/end",
    component: ScenarioEnd,
    meta: scenarioEndMeta,
  },
  {
    name: "scenario.quickrace.end",
    path: "/scenario/quickrace/end",
    component: QuickraceEnd,
    meta: scenarioEndMeta,
  },
]
