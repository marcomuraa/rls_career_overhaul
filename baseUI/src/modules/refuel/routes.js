// Refuelling routes --------------------------------------

import RefuellingInterface from "@/modules/refuel/views/RefuelMain.vue"

export default [
  {
    path: "/refueling",
    name: "refueling",
    component: RefuellingInterface,
    meta: {
      infoBar: {
        visible: true,
        showSysInfo: false,
      },
      uiApps: {
        shown: false,
        //layout: "tasklist",
      },
    },
  },
]
