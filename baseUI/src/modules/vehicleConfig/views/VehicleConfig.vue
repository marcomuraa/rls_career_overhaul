<template>
  <LayoutSingle
    v-bng-scoped-nav="{ activateOnMount: true, bubbleWhitelistEvents: ['tab_l', 'tab_r', 'menu'] }"
    v-bng-on-ui-nav:back="onBack"
    v-bng-on-ui-nav:menu="onMenu"
    class="vehcfg"
  >
    <Tabs class="bng-tabs" v-bng-frustum-mover.left="true" @change="syncWithStates">
      <TabList v-bng-blur />
      <PartsPacks :tab-selected="tab === 'partpacks'" :tab-heading="'Parts Packs'" v-bng-blur />
      <Parts :tab-selected="tab === 'parts'" :tab-heading="$t('ui.vehicleconfig.parts')" v-bng-blur />
      <Tuning :tab-selected="tab === 'tuning'" :tab-heading="$t('ui.vehicleconfig.tuning')" v-bng-blur />
      <Paint :tab-selected="tab === 'color'" :tab-heading="$t('ui.vehicleconfig.color')" v-bng-blur />
      <Save :tab-selected="tab === 'save'" :tab-heading="$t('ui.vehicleconfig.save') + ' & ' + $t('ui.vehicleconfig.load')" v-bng-blur />
      <Debug :tab-selected="tab === 'debug'" :tab-heading="$tt('ui.debug.vehicle')" v-bng-blur />
    </Tabs>
  </LayoutSingle>
</template>

<script setup>
import { useRoute } from "vue-router"
import { LayoutSingle } from "@/common/layouts"
import { Tabs, TabList } from "@/common/components/utility"
import { vBngOnUiNav, vBngScopedNav, vBngBlur, vBngFrustumMover } from "@/common/directives"
import { lua } from "@/bridge"

import PartsPacks from "../components/PartsPacks.vue"
import Parts from "../components/Parts.vue"
import Tuning from "../components/Tuning.vue"
import Paint from "../components/Paint.vue"
import Save from "../components/Save.vue"
import Debug from "../components/Debug.vue"


defineProps({
  tab: {
    type: String,
    default: "parts",
    validator: val => !val || ["partpacks", "parts", "tuning", "color", "save", "debug"].includes(val),
  },
})

const route = useRoute()

function onBack() {
  lua.extensions.ui_router.back()
}
function onMenu() {
  window.bngVue.gotoAngularState("menu")
}

function syncWithStates(tab) {
  const tabName = ["partpacks", "parts", "tuning", "color", "save", "debug"][tab.index] || "parts"

  // radial-owned vehicle config must stay in the radial.* route family instead of
  // pulling the user back into the menu.vehicleconfig.* angular flow
  if (typeof route.name === "string" && route.name.startsWith("radial.vehicleconfig")) {
    lua.extensions.ui_router.navigate(`radial.vehicleconfig.${tabName}`)
    return
  }

  if (!window.bngVue) return
  tab = ["partpacks", "parts", "tuning", "color", "save", "debug"][tab.index] || "parts"
  window.bngVue.gotoAngularState(`menu.vehicleconfig.${tab}`)
}
</script>

<style lang="scss" scoped>
.vehcfg {
  pointer-events: none;
  > * {
    pointer-events: all;
  }
}

:deep(.bng-tabs) {
  --tab-bg-active: var(--bng-cool-gray-700);
  --tab-bg-hover: var(--bng-orange-700);
  // --tab-bg: rgba(0,0,0,0.9);
  // --tab-content-bg: rgba(0,0,0,0.9);
  --tab-bg: rgba(var(--bng-cool-gray-900-rgb), 0.95);
  --tab-content-bg: rgba(var(--bng-cool-gray-900-rgb), 0.95);
  width: 35em;
  overflow: hidden;
  border-radius: var(--bng-corners-1);
  .tab-item {
    white-space: nowrap;
    // &:not(.tab-active-tab) {
    flex: 1 auto;
    text-overflow: ellipsis;
    overflow: visible;
    // }
  }
  .tab-list {
    margin: 0;
  }
  .tab-list,
  .tab-content {
    border-radius: 0;
  }
}

.vehconfig-new-ui {
  position: absolute;
  display: inline-block;
  top: 2.9em;
  left: 35.35em;
  width: auto;
  height: auto;
  padding: 0.75em 1em;
  border-radius: var(--bng-corners-1);
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
  color: #fff;
}
.vehconfig-new-ui:hover,
.vehconfig-new-ui:focus {
  background-color: rgba(0, 0, 0, 0.7);
}
</style>
