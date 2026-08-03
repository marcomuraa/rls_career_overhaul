import { h } from "vue"

import SettingsList from "./SettingsList.vue"
import NewOptions from "./NewOptions.vue"
import WorkbenchActivate from "./WorkbenchActivate.vue"

import ControlsBindings from "../../controls/views/Bindings.vue"
import ControlsHardware from "../../controls/views/Hardware.vue"
import ControlsFFB from "../../controls/views/FFB.vue"

const subpages = {
  SettingsList,
  NewOptions,
  WorkbenchActivate,
  ControlsBindings,
  ControlsHardware,
  ControlsFFB,
}

export { subpages }

export default {
  props: {
    subpage: String,
  },
  render() {
    if (this.subpage in subpages) {
      return h(subpages[this.subpage], this.$attrs)
    } else {
      return h("div", { class: "error" }, `Component "${this.subpage}" not found`)
    }
  }
}
