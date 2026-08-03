import OneshotRaceWizard from "./views/OneshotRaceWizard.vue"
import { MODES } from "./modeConfig"

const wizardMeta = {
  preloadOn: "boot",
  clickThrough: true,
  infoBar: {
    visible: false,
    showSysInfo: false,
  },
  uiApps: {
    shown: false,
  },
  topBar: {
    visible: false,
  },
}

// One route family per mode (quickrace/lightRunner/busRoute), all backed by
// the same OneshotRaceWizard component: overview (root) + level + level.middle
// (track/route) + vehicle. see oneshotRaceCore.lua.
export default Object.values(MODES).flatMap(mode => [
  {
    name: mode.routeName,
    path: `/${mode.routeName}/options`,
    component: OneshotRaceWizard,
    props: { mode: mode.id, component: "overview" },
    meta: wizardMeta,
  },
  {
    name: `${mode.routeName}.level`,
    path: `/${mode.routeName}/level`,
    component: OneshotRaceWizard,
    props: { mode: mode.id, component: "level" },
    meta: wizardMeta,
  },
  {
    name: `${mode.routeName}.level.middle`,
    path: `/${mode.routeName}/level/middle`,
    component: OneshotRaceWizard,
    props: { mode: mode.id, component: "middle" },
    meta: wizardMeta,
  },
  {
    name: `${mode.routeName}.vehicle`,
    path: `/${mode.routeName}/vehicle`,
    component: OneshotRaceWizard,
    props: { mode: mode.id, component: "vehicle" },
    meta: wizardMeta,
  },
])
