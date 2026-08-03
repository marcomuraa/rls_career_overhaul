// Garage routes --------------------------------------
import Garage from "@/modules/garage/views/Garage.vue"
import GaragePhotomodeShell from "@/modules/garage/views/GaragePhotomodeShell.vue"
import Mirrors from "@/modules/vehicleConfig/views/Mirrors.vue"

const garageRouteMeta = {
  preloadOn: "garage",
  handlesOwnReady: true,
}

export default [
  // {
  //   path: "/garagemode/:component?",
  //   name: "garagemode",
  //   component: Garage,
  //   props: true,
  //   meta: {
  //     menu: {
  //       type: "root",
  //       label: "ui.mainmenu.garage",
  //     },
  //     topBar: {
  //       visible: false,
  //     },
  //     infoBar: {
  //       visible: true,
  //       showSysInfo: false,
  //     },
  //     uiApps: {
  //       shown: true,
  //     },
  //   },
  // },
  {
    path: "/garage/:component?",
    name: "garage",
    component: Garage,
    props: true,
    meta: garageRouteMeta,
  },
  {
    path: "/garage/paint",
    name: "garage.vehicle.paint",
    component: Garage,
    props: { component: "paint" },
    meta: garageRouteMeta,
  },
  {
    path: "/garage/parts",
    name: "garage.vehicle.parts",
    component: Garage,
    props: { component: "parts" },
    meta: garageRouteMeta,
  },
  {
    path: "/garage/save",
    name: "garage.vehicle.save",
    component: Garage,
    props: { component: "save" },
    meta: garageRouteMeta,
  },
  {
    path: "/garage/tuning",
    name: "garage.vehicle.tuning",
    component: Garage,
    props: { component: "tuning" },
    meta: {
      ...garageRouteMeta,
      menu: {
        type: "leaf",
        label: "ui.garage.tabs.tune",
        parent: "garage",
        breadcrumb: true,
      },
      topBar: {
        visible: false,
      },
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: true,
      },
    },
  },
  {
    path: "/garage/tuning/mirrors",
    name: "garage.vehicle.tuning.mirrors",
    component: Mirrors,
    meta: {
      ...garageRouteMeta,
      handlesOwnReady: false,
    },
  },
  {
    path: "/garage/photomode",
    name: "garage.photomode",
    component: GaragePhotomodeShell,
    meta: {
      ...garageRouteMeta,
      menu: {
        type: "leaf",
        label: "ui.garage.tabs.photo",
        parent: "garage",
        breadcrumb: true,
      },
      topBar: {
        visible: false,
      },
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: false,
      },
    },
  },
]
