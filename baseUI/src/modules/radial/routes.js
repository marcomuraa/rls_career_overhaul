// ActivityStart routes --------------------------------------
import Radial from "@/modules/radial/views/Radial.vue"
import VehicleSelector from "@/modules/vehicleselect/views/VehicleSelector.vue"
import Mirrors from "@/modules/vehicleConfig/views/Mirrors.vue"
import VehicleConfig from "@/modules/vehicleConfig/views/VehicleConfig.vue"

export default [
  {
    path: "/radial",
    name: "radial",
    component: Radial,
    meta: {
      infoBar: {
        visible: true,
        showSysInfo: false,
        hints: [],
      },
      uiApps: {
        shown: false,
      },
    },
  },
  {
    path: "/radial/vehicles",
    name: "radial.vehicles",
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
      },
    },
  },
  {
    path: "/radial/vehicle-config",
    name: "radial.vehicleconfig",
    component: VehicleConfig,
    props: { tab: "parts" },
    meta: {
      clickThrough: true,
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: true,
      },
      topBar: {
        visible: true,
      },
    },
  },
  {
    path: "/radial/mirrors",
    name: "radial.mirrors",
    component: Mirrors,
  },
]
