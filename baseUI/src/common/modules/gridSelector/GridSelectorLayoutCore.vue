<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'grid', bubbleWhitelistEvents: ['menu', 'action_2'], canDeactivate: canDeactivateGrid }"
    v-bng-on-ui-nav:context="toggleAuxillary"
    v-bng-ui-nav-label:context="$t('ui.menu.gridSelector.filtersAndMore')"
    v-bng-on-ui-nav:action_4="onFavoriteShortcut"
    v-bng-ui-nav-label:action_4="$t('ui.menu.gridSelector.toggleFavorite')"
    class="grid-wrapper"
    :class="{ active: isGridActive }"
    @activate="onGridActivate"
  >
    <BlurBackground />
    <div class="header-row" :class="{ active: isGridActive }">
      <BngScreenHeadingV2 type="2" class="header-title-v2">
        {{ screenHeaderTitle }}
        <BngBinding
          v-show="isAuxillaryActive && canSwitchToGrid"
          class="header-context-binding"
          ui-event="context"
          controller
          track-ignore
        />
      </BngScreenHeadingV2>
    </div>
    <slot />
  </div>

  <div
    v-bng-scoped-nav="{ scopeId: 'auxillary', bubbleWhitelistEvents: ['menu', 'action_2'], canDeactivate: canDeactivateAuxillary }"
    v-bng-on-ui-nav:context="toggleGrid"
    v-bng-ui-nav-label:context="$t('ui.menu.gridSelector.filtersAndMore')"
    v-bng-on-ui-nav:action_4="onFavoriteShortcut"
    v-bng-on-ui-nav:tab_l="onTabLeft"
    v-bng-on-ui-nav:tab_r="onTabRight"
    v-bng-ui-nav-label:action_4="$t('ui.menu.gridSelector.toggleFavorite')"
    class="auxillary-wrapper"
    @activate="onAuxillaryActivate"
  >
    <BlurBackground />
    <div v-if="display.tabs" class="auxillary-tabs" :class="{ active: isAuxillaryActive }" bng-no-child-nav="true">
      <div class="auxillary-tabs-side auxillary-tabs-side-start">
        <span class="context-binding-slot">
          <BngBinding
            v-show="isGridActive"
            class="auxillary-context-binding"
            ui-event="context"
            controller
            track-ignore
          />
        </span>
        <BngButton
          class="auxillary-tabs-arrow"
          :accent="ACCENTS.ghost"
          :disabled="interactionsDisabled"
          bng-no-nav
          tabindex="-1"
          @click="goPrevTab"
        >
          <BngIcon :type="icons.arrowLargeLeft" />
          <span class="auxillary-tabs-binding-slot">
            <BngBinding
              v-show="isAuxillaryActive"
              class="auxillary-tabs-binding"
              ui-event="tab_l"
              controller
              track-ignore
            />
          </span>
        </BngButton>
      </div>
      <Tabs
        ref="tabsRef"
        class="bng-tabs auxillary-tabs-control"
        :selectedIndex="selectedTab"
        bng-no-nav
        @change="onTabChange"
      >
        <TabList :icon-only="tabsIconOnly" :show-tooltips="tabsIconOnly" :disabled="interactionsDisabled" />
        <div
          v-for="(tab, index) in tabsList"
          :key="index"
          :tab-heading="tab.heading || tab.label"
          :tab-icon="tab.icon"
          :tab-tooltip="tab.tooltip"
          class="auxillary-tab-panel"
        />
      </Tabs>
      <div class="auxillary-tabs-side auxillary-tabs-side-end">
        <BngButton
          class="auxillary-tabs-arrow"
          :accent="ACCENTS.ghost"
          :disabled="interactionsDisabled"
          bng-no-nav
          tabindex="-1"
          @click="goNextTab"
        >
          <span class="auxillary-tabs-binding-slot">
            <BngBinding
              v-show="isAuxillaryActive"
              class="auxillary-tabs-binding"
              ui-event="tab_r"
              controller
              track-ignore
            />
          </span>
          <BngIcon :type="icons.arrowLargeRight" />
        </BngButton>
      </div>
    </div>
    <div class="auxillary-content">
      <slot name="auxillary-content" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { BngBinding, BngButton, BngIcon, BngScreenHeadingV2, ACCENTS, icons } from "@/common/components/base"
import { Tabs, TabList } from "@/common/components/utility"
import { vBngScopedNav, vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import { useScopedNav } from "@/services/scopedNav/api"

const props = defineProps({
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
])

const activePanel = ref("grid")
const isGridActive = computed(() => activePanel.value === "grid")
const isAuxillaryActive = computed(() => activePanel.value === "auxillary")

const tabsRef = ref(null)
const tabsList = computed(() => Array.isArray(props.tabs) ? props.tabs : [])
const display = computed(() => ({
  tabs: tabsList.value.length > 0,
}))

function setActivePanel(panel) {
  if (activePanel.value === panel) return
  activePanel.value = panel
  emit("update:activePanel", panel)
}

const onGridActivate = () => setActivePanel("grid")
const onAuxillaryActivate = () => setActivePanel("auxillary")

const onFavoriteShortcut = () => emit("toggle-favorite")

const goPrevTab = () => {
  if (props.interactionsDisabled) return
  tabsRef.value?.goPrev?.()
}
const goNextTab = () => {
  if (props.interactionsDisabled) return
  tabsRef.value?.goNext?.()
}

const onTabLeft = () => {
  if (props.interactionsDisabled) return
  display.value.tabs && goPrevTab()
}
const onTabRight = () => {
  if (props.interactionsDisabled) return
  display.value.tabs && goNextTab()
}

function onTabChange(tab, prevTab, meta) {
  const nextIndex = tab?.index ?? 0
  if (nextIndex !== props.selectedTab) {
    emit("update:selectedTab", nextIndex)
  }
  emit("tab-change", tab, prevTab, meta)
}

const scopedNav = useScopedNav()
const toggleAuxillary = () => {
  if (props.interactionsDisabled) return
  scopedNav.switchScope("auxillary")
}

const toggleGrid = () => {
  if (props.interactionsDisabled) return
  if (!props.canSwitchToGrid) return
  scopedNav.switchScope("grid")
}

function canDeactivateAuxillary() {
  return props.canSwitchToGrid
}
</script>

<style lang="scss" scoped>
.grid-wrapper,
.auxillary-wrapper {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0.5rem;
}

.grid-wrapper {
  flex: 1 1 75%;
  min-width: 0;
}

.auxillary-wrapper {
  flex: 0 1 25rem;
  min-width: 18rem;
}

.header-row {
  display: flex;
  flex: 0 0 auto;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 3.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.25);
  --bng-heading-background-opacity: 0;

  &.active {
    background-color: rgba(0, 0, 0, 0.75);
  }
}

.header-title-v2 {
  flex: 1 1 auto;
  min-width: 0;

  :deep(.header > h1) {
    font-weight: 1000 !important;
  }
}

.header-context-binding {
  flex: 0 0 auto;
  align-self: center;
  padding-right: 0.5rem;
  padding-left: 0.5rem;
  text-shadow: 0 0 0.25rem #0008;
  --bng-icon-size: 1.5rem;
}

.auxillary-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.auxillary-tabs {
  display: flex;
  align-items: center;
  flex: 0 0 3.6rem;
  min-height: 3.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.25);
  gap: 0.25rem;
  padding-left: 0.25rem;
  padding-right: 0.25rem;

  &.active {
    background-color: rgba(0, 0, 0, 0.75);
  }
}

.auxillary-tabs-side {
  display: flex;
  align-items: center;
  flex: 0 0 6rem;
  min-width: 0;
  gap: 0.25rem;
}

.auxillary-tabs-side-start {
  justify-content: flex-end;
}

.auxillary-tabs-side-end {
  justify-content: flex-start;
}

.context-binding-slot {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auxillary-context-binding {
  text-shadow: 0 0 0.25rem #0008;
  --bng-icon-size: 1.5rem;
}

.auxillary-tabs-arrow {
  --bng-button-margin: 0;
  --bng-button-min-width: 2.5rem;
  --bng-button-padding: 0.35rem;
  --bng-icon-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.auxillary-tabs-binding-slot {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auxillary-tabs-binding {
  pointer-events: none;
}

.auxillary-tabs-control {
  flex: 1 1 auto;
  min-width: 0;
  --tab-list-padding: 0;
  --tab-list-bottom-border: 0;
  --tab-list-justify: space-around;
  --bng-button-min-width: 0;
  --bng-button-padding: 0.25em 0.5em;
}

.auxillary-tabs-control :deep(.tab-list) {
  align-items: center;
  margin-bottom: 0;
}

.auxillary-tabs-control :deep(.tab-content) {
  display: none;
}
</style>
