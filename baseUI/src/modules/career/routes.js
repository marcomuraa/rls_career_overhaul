// Career routes --------------------------------------

import ProgressLanding from "./views/ProgressLanding.vue"
import CargoDeliveryReward from "./views/CargoDeliveryReward.vue"
import CargoOverview from "./views/CargoOverviewMain.vue"
import CargoDropOff from "./views/CargoDropOff.vue"
import Computer from "./views/ComputerMain.vue"
import Insurances from "./views/InsurancesMain.vue"
import DriverAbstract from "./views/DriverAbstract.vue"
import Logbook from "./views/Logbook.vue"
import MyCargo from "./views/MyCargo.vue"
import Painting from "./views/PaintingMain.vue"
import PartInventory from "./views/PartInventoryMain.vue"
import PartShopping from "./views/PartShoppingMain.vue"
import Pause from "./views/Pause.vue"
import PauseBigMiddlePanel from "./views/PauseBigMiddlePanel.vue"
import ProfileSelect from "./profiles/views/ProfileSelect.vue"
import ProfileNew from "./profiles/views/ProfileNew.vue"
import ProfileSaveSelect from "./profiles/views/ProfileSaveSelect.vue"
import Repair from "./views/RepairMain.vue"
import Tuning from "./views/TuningMain.vue"
import VehicleInventory from "./views/VehicleInventoryMain.vue"
import VehiclePurchase from "./views/VehiclePurchaseMain.vue"
import VehicleShopping from "./views/VehicleShoppingMain.vue"
import VehicleShoppingVehicles from "./views/VehicleShoppingVehiclesMain.vue"
import VehiclePerformance from "./views/VehiclePerformanceMain.vue"
import VehiclePerformanceCertificationTest from "./views/VehiclePerformanceCertificationTest.vue"
import ChooseInsurance from "./views/ChooseInsuranceMain.vue"
import Negotiation from "./views/VehicleNegotiationMain.vue"
import Organizations from "./views/Organizations.vue"

// Shared meta for the career.computer route family so the InfoBar is shown
// on the computer screen and all of its child routes.
const computerRouteMeta = {
  infoBar: {
    visible: true,
    showSysInfo: true,
  },
  uiApps: {
    shown: false,
  },
}

export default [
  // Career Pause
  {
    path: "/menu.careerPause",
    name: "menu.careerPause",
    component: Pause,
    props: true,
    meta: {
      preloadOn: "career",
      clickThrough: true,
      infoBar: {
        visible: true,
        showSysInfo: true,
      },
      uiApps: {
        shown: false,
      },
      topBar: {
        visible: true
      }
    },
  },
  {
    name: "career",
    path: "/career",
    meta: { preloadOn: "career", preloadDeep: true },
    children: [
      // Choose Insurance
      {
        path: "chooseInsurance",
        name: "career.chooseInsurance",
        component: ChooseInsurance,
      },

      // Career Pause (WIP with middle panel)
      {
        path: "pauseBigMiddlePanel",
        name: "career.pauseBigMiddlePanel",
        component: PauseBigMiddlePanel,
        props: true,
      },

      // Logbook
      {
        path: "logbook/:id(\\*?.*?)?",
        name: "career.logbook",
        component: Logbook,
        meta: {
          uiApps: {
            shown: false,
          },
        },
        props: true,
      },

      // Computer
      {
        path: "computer",
        name: "career.computer",
        component: Computer,
        props: true,
        meta: {
          ...computerRouteMeta,
        },
      },

      // Vehicle Inventory
      {
        path: "computer/vehicleInventory",
        name: "career.computer.vehicleInventory",
        component: VehicleInventory,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Vehicle Certification - in-progress test screen
      {
        path: "computer/vehiclePerformance/certificationTest",
        name: "career.computer.vehiclePerformance.certificationTest",
        component: VehiclePerformanceCertificationTest,
      },

      // Vehicle Certification
      {
        path: "computer/vehiclePerformance",
        name: "career.computer.vehiclePerformance",
        component: VehiclePerformance,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Tuning
      {
        path: "computer/tuning",
        name: "career.computer.tuning",
        component: Tuning,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Painting
      {
        path: "computer/painting",
        name: "career.computer.painting",
        component: Painting,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Repair
      {
        path: "computer/repair/:header?",
        name: "career.computer.repair",
        component: Repair,
        props: true,
        meta: {
          ...computerRouteMeta,
        },
      },

      // Part Shopping
      {
        path: "computer/partShopping",
        name: "career.computer.partShopping",
        component: PartShopping,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },
      {
        path: "computer/partShopping/:category",
        name: "career.computer.partShopping.category",
        component: PartShopping,
        props: true,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },
      {
        path: "computer/partShopping/:category/slot/:slotPath(.*)*",
        name: "career.computer.partShopping.category.slot",
        component: PartShopping,
        props: true,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Part Inventory
      {
        path: "computer/partInventory",
        name: "career.computer.partInventory",
        component: PartInventory,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Negotiation
      {
        path: "negotiation",
        name: "career.negotiation",
        component: Negotiation,
      },

      // Vehicle Shopping
      // NOTE: the literal `vehicles` child must come before the optional-param
      // grid route, otherwise path matching treats `vehicles` as `screenTag`.
      {
        path: "computer/vehicleShopping/vehicles",
        name: "career.computer.vehicleShopping.vehicles",
        component: VehicleShoppingVehicles,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },
      {
        path: "computer/vehicleShopping/vehicles/vehiclePurchase/:vehicleInfo?/:playerMoney?/:inventoryHasFreeSlot?/:lastVehicleInfo?",
        name: "career.computer.vehicleShopping.vehicles.vehiclePurchase",
        component: VehiclePurchase,
        props: true,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },
      {
        path: "computer/vehicleShopping/:screenTag?/:buyingAvailable?/:marketplaceAvailable?/:selectedSellerId?",
        name: "career.computer.vehicleShopping",
        component: VehicleShopping,
        props: true,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Insurance policies List
      {
        path: "computer/insurances",
        name: "career.computer.insurances",
        component: Insurances,
        meta: {
          ...computerRouteMeta,
        },
      },

      // Driver's Abstract
      {
        path: "computer/playerAbstract",
        name: "career.computer.playerAbstract",
        component: DriverAbstract,
        meta: {
          ...computerRouteMeta,
          handlesOwnReady: true,
        },
      },

      // Delivery Reward
      {
        path: "cargoDeliveryReward",
        name: "career.cargoDeliveryReward",
        component: CargoDeliveryReward,
        props: true,
      },

      // delivery dropoff
      {
        path: "cargoDropOff/:facilityId?/:parkingSpotPath(\\*?.*?)?",
        name: "career.cargoDropOff",
        component: CargoDropOff,
        props: true,
      },

      // Cargo Overview
      {
        path: "cargoOverview/:facilityId?/:parkingSpotPath(\\*?.*?)?",
        name: "career.cargoOverview",
        component: CargoOverview,
        props: true,
        meta: {
          uiApps: {
            shown: false,
          },
        },
      },
      {
        path: "myCargo",
        name: "career.myCargo",
        component: MyCargo,
        props: true,
        meta: {
          uiApps: {
            shown: false,
          },
        },
      },

      // Branch Landing Page
      {
        path: "progressLanding/:pathId?",
        name: "career.progressLanding",
        component: ProgressLanding,
        props: route => ({
          pathId: route.params.pathId,
        }),
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
          },
        },
      },

      // Domain Landing Page
      {
        path: "domainSelection",
        name: "career.domainSelection",
        component: ProgressLanding,
        props: true,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
          },
        },
      },

      // Organizations / reputation
      {
        path: "organizations/:orgId?",
        name: "career.organizations",
        component: Organizations,
        props: route => ({
          orgId: route.params.orgId,
        }),
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
          },
        },
      },

      // Profiles
      {
        path: "profiles",
        name: "career.profiles",
        component: ProfileSelect,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: true,
          },
        }
      },
      {
        path: "profiles/new",
        name: "career.profiles.new",
        component: ProfileNew,
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: true,
          },
        }
      },
      {
        path: "profiles/saves/:profileId?",
        name: "career.profiles.saves",
        component: ProfileSaveSelect,
        props: route => ({
          profileId: route.params.profileId,
          mode: "load",
        }),
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: true,
          },
        }
      },
      {
        path: "profiles/saveAs",
        name: "career.profiles.saveAs",
        component: ProfileSaveSelect,
        props: () => ({
          mode: "save",
        }),
        meta: {
          uiApps: {
            shown: false,
          },
          infoBar: {
            visible: true,
            showSysInfo: true,
          },
        }
      },
    ],
  },
]
