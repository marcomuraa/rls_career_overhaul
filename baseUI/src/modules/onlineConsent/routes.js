import OnlineConsentView from "./views/OnlineConsentView.vue"

export default [
  {
    path: "/legal/online-features",
    name: "legal.onlineFeatures",
    component: OnlineConsentView,
    props: { step: "onlineFeatures" },
    meta: {
      infoBar: {
        visible: true,
        showSysInfo: true,
      },
      uiApps: {
        shown: false,
      },
    },
  },
  {
    path: "/legal/telemetry",
    name: "legal.telemetry",
    component: OnlineConsentView,
    props: { step: "telemetry" },
  },
  {
    path: "/legal/confirmation",
    name: "legal.confirmation",
    component: OnlineConsentView,
    props: { step: "confirmation" },
  }
]
