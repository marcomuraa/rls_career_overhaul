import OptionsView from "@/common/modules/options/views/OptionsView.vue"

const optionsMeta = {
  infoBar: {
    visible: true,
    showSysInfo: true,
  },
  uiApps: {
    shown: false,
  },
}

export default [
  {
    path: "/options/:category?",
    name: ["options", "menu.options"],
    component: OptionsView,
    props: true,
    meta: optionsMeta,
  },
]
