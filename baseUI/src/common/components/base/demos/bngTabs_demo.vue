<template>
  <div class="bng-tabs-demo">
    <BngTabs v-model="activeA" class="demo-tabs" show-tooltips>
      <div tab-heading="Overview" :tab-icon="icons.info">
        Overview panel
      </div>
      <div tab-heading="Settings" :tab-icon="icons.adjust">
        Settings panel
      </div>
      <div tab-heading="Logs" :tab-icon="icons.clipboardList">
        Logs panel
      </div>
    </BngTabs>

    <BngTabs v-model="activeB" class="demo-tabs" icon-only :background="true">
      <div tab-heading="Vehicle" :tab-icon="icons.car">
        Vehicle
      </div>
      <div tab-heading="Paint" :tab-icon="icons.sprayCan">
        Paint
      </div>
      <div tab-heading="Parts" :tab-icon="icons.listIndented">
        Parts
      </div>
    </BngTabs>

    <BngTabs v-model="activeC" class="demo-tabs" :use-bindings="true" :show-bindings="true">
      <div tab-heading="Left" :tab-icon="icons.arrowLargeLeft">
        Use tab_l/tab_r to switch
      </div>
      <div tab-heading="Right" :tab-icon="icons.arrowLargeRight">
        Bindings enabled
      </div>
    </BngTabs>

    <BngTabs v-model="activeD" class="demo-tabs" disabled :use-bindings="true">
      <div tab-heading="One" :tab-icon="icons.info">
        Disabled: clicks, arrows, and tab_l/tab_r are ignored
      </div>
      <div tab-heading="Two" :tab-icon="icons.adjust">
        Second panel (unreachable while disabled)
      </div>
      <div tab-heading="Three" :tab-icon="icons.clipboardList">
        Third panel (unreachable while disabled)
      </div>
    </BngTabs>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngTabs, icons } from "@/common/components/base"

const activeA = ref(0)
const activeB = ref(0)
const activeC = ref(0)
const activeD = ref(0)
</script>

<style scoped lang="scss">
.bng-tabs-demo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.demo-tabs {
  max-width: 32rem;
  height: 8rem;
}
</style>

<script>
// Demo Metadata
// -------------------------------------------------------
import source from "./bngTabs_demo.vue?raw"
export default {
  source,
  title: "Tabs",
  description: "Simple tab container with optional tab_l/tab_r bindings.",
  propInfo: [
    { name: "modelValue", type: "Number", desc: "Active tab index." },
    { name: "background", type: "Boolean", desc: "Enables layered background on the component." },
    { name: "iconOnly", type: "Boolean", desc: "Renders only tab icons in the header list." },
    { name: "showArrows", type: "Boolean", desc: "Show left/right arrow buttons." },
    { name: "useBindings", type: "Boolean or Array", desc: "Enable UI nav events (default tab_l/tab_r, or custom pair)." },
    { name: "showBindings", type: "Boolean", desc: "Show binding hints near arrows." },
    { name: "disabled", type: "Boolean", desc: "Disables tab selection and arrow/binding navigation." },
  ],
  attrInfo: [
    { name: "@update:modelValue", type: "Event", desc: "Emits selected tab index." },
    { name: "@change", type: "Event", desc: "Emits selected tab and previous tab metadata." },
  ],
}
</script>
