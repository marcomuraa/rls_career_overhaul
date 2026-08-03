<template>
  <LayoutMenu
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hideBreadcrumbLastItem="false"
    class="grid-selector-screen"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
    >
    <div v-if="slots['side-panel']" class="side-panel">
      <slot name="side-panel" />
    </div>

    <GridSelectorLayoutCore
      :screen-header-title="screenHeaderTitle"
      :can-deactivate-grid="canDeactivateGrid"
      :tabs="tabs"
      :selected-tab="selectedTab"
      :tabs-icon-only="tabsIconOnly"
      :can-switch-to-grid="canSwitchToGrid"
      :interactions-disabled="interactionsDisabled"
      @update:active-panel="emit('update:activePanel', $event)"
      @toggle-favorite="emit('toggle-favorite')"
      @update:selected-tab="emit('update:selectedTab', $event)"
      @tab-change="(...args) => emit('tab-change', ...args)"
    >
      <slot />
      <template #auxillary-content><slot name="auxillary-content" /></template>
    </GridSelectorLayoutCore>
    <template #topbar-right>
      <slot name="topbar-right" />
    </template>
  </LayoutMenu>
</template>

<script setup>
import { computed, useSlots } from "vue"
import { LayoutMenu } from "@/common/layouts"
import GridSelectorLayoutCore from "./GridSelectorLayoutCore.vue"
import { useRouteDataStore } from "@/services/routeData"
import { lua } from "@/bridge"

defineProps({
  screenHeaderTitle: {
    type: String,
    default: "",
  },
  canDeactivateGrid: {
    type: Function,
    default: () => true,
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  selectedTab: {
    type: Number,
    default: 0,
  },
  tabsIconOnly: {
    type: Boolean,
    default: true,
  },
  canSwitchToGrid: {
    type: Boolean,
    default: true,
  },
  interactionsDisabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  "update:activePanel",
  "toggle-favorite",
  "update:selectedTab",
  "tab-change",
  "breadcrumb-click",
])

const slots = useSlots()

const routeDataStore = useRouteDataStore()
const breadcrumbItems = computed(() => routeDataStore.breadcrumbs)

const onBreadcrumbClick = item => emit("breadcrumb-click", item)
const onBreadBack = async () => await lua.extensions.ui_router.back()
</script>

<style lang="scss" scoped>
.side-panel {
  flex: 0 0 20rem;
  min-height: 0;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
</style>