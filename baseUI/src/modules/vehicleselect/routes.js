import VehicleSelector from "./views/VehicleSelector.vue"
import VehicleSelectorPause from "./views/VehicleSelectorPause.vue"

export default [
  {
    name: "menu.vehiclesnew",
    path: "/vehicle-selector",
    component: VehicleSelector,
    meta: {
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
    name: "mission.control.vehicleSelector",
    path: "/mission-vehicle-selector",
    component: VehicleSelector,
    meta: {
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
    name: "pause.vehicleSelector",
    path: "/vehicle-selector-pause",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
  {
    name: "pause.vehicleSelector.vehicle",
    path: "/vehicle-selector-pause/vehicle",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
  {
    name: "pause.vehicle.vehicleSelector",
    path: "/vehicle-selector-pause/vehicle-tab",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
  {
    name: "pause.vehicle.vehicleSelector.vehicle",
    path: "/vehicle-selector-pause/vehicle-tab/vehicle",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },

  {
    name: "garage.vehicles",
    path: "/garage/vehicles",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
  {
    name: "garage.vehicles.vehicle",
    path: "/garage/vehicles/vehicle",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
  {
    name: "garage.mycars.vehicle",
    path: "/garage/my-cars/vehicle",
    component: VehicleSelectorPause,
    meta: {
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
    },
  },
]