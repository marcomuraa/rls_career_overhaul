import FreeroamSelector from "./views/FreeroamSelector.vue"
import FreeroamWizard from "./views/FreeroamWizard.vue"

const freeroamLevelsMeta = {
  preloadOn: "boot",
  clickThrough: true,
  infoBar: {
    visible: true,
    showSysInfo: false,
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
    name: "menu.freeroamselector",
    path: "/freeroam-selector",
    component: FreeroamSelector,
    meta: {
      handlesOwnReady: true,
      clickThrough: true,
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: true,
      }
    },
  },
  {
    name: "freeroamLevels",
    path: "/freeroam-wizard/locations",
    component: FreeroamWizard,
    props: { component: "level" },
    meta: freeroamLevelsMeta,
  },
  {
    name: "freeroamLevels.level",
    path: "/freeroam-wizard/locations/location",
    component: FreeroamWizard,
    props: { component: "level" },
    meta: freeroamLevelsMeta,
  },
  {
    name: "freeroamLevels.vehicles",
    path: "/freeroam-wizard/vehicles",
    component: FreeroamWizard,
    props: { component: "vehicle" },
    meta: freeroamLevelsMeta,
  },
  {
    name: "freeroamLevels.vehicles.vehicle",
    path: "/freeroam-wizard/vehicles/vehicle",
    component: FreeroamWizard,
    props: { component: "vehicle" },
    meta: freeroamLevelsMeta,
  },
  {
    name: "freeroamLevels.vehicles.options",
    path: "/freeroam-wizard/options",
    component: FreeroamWizard,
    props: { component: "options" },
    meta: freeroamLevelsMeta,
  },
  {
    name: "freeroamLevels.vehicles.options.multiplayer",
    path: "/freeroam-wizard/multiplayer",
    component: FreeroamWizard,
    props: { component: "multiplayer" },
    meta: freeroamLevelsMeta,
  },
]
