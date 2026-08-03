<template>
  <GridSelectorLayout
    :screen-header-title="screenHeaderTitle"
    :can-deactivate-grid="canDeactivateGrid"
    :tabs="auxillaryTabs"
    v-model:selected-tab="auxillaryTabIndex"
    :interactions-disabled="isLoadingGroups"
    :class="{ 'is-executing-button': isExecutingButton }"
    @toggle-favorite="onToggleFavoriteShortcut"
    @update:active-panel="onActivePanelChange"
  >
    <template v-if="tasklistStore.hasItems && tasklistStore.visibleIn.gridSelector" #side-panel>
      <div class="grid-selector-side-panel">
        <component :is="tasklist" />
      </div>
    </template>

    <Grid
      ref="gridRef"
      v-bng-on-ui-nav:back="onBackFromGrid"
      :groups="groups"
      :loading="isLoadingGroups"
      :display-size="displaySize"
      :auto-focus-key="autoFocusKey"
      :active-item="activeItem"
      :highlight-active-item="shouldHighlightActiveTile"
      :dim-non-active-items="shouldHighlightActiveTile"
      :nav-scroll-enabled="isGridScopeActive"
      class="gameplay-grid"
      @select-item="onGridSelectItem"
      @focus-item="onGridFocusItem"
      @deselect-item="onGridDeselectItem"
      @double-click-item="doubleClickItem"
    />

    <template #auxillary-content>
      <template v-if="detailsMode === 'detail'">
        <GameplayDetails
          v-if="hasSelectedItem"
          :activeItem="activeItem"
          :activeItemDetails="activeItemDetails"
          :toggleFavourite="toggleFavourite"
          :exploreFolder="exploreFolder"
          :goToMod="goToMod"
          :showHeaderTitle="true"
          :hideBottomSection="shouldHideDetailsBottomSection"
          :disabled="isExecutingButton"
          :isAuxillaryScopeActive="isAuxillaryScopeActive"
          bng-nav-item
          class="gameplay-details"
          @execute-button="onDetailsExecuteButton"
          @override-click="onDetailsOverrideClick"
        />
      </template>
      <DetailsPanelAdvanced
        v-else-if="detailsMode === 'advanced'"
        v-bind="advancedTab.props.value"
        v-on="advancedTab.listeners"
      />
      <DetailsPanelDisplayControls
        v-else-if="detailsMode === 'displayControls'"
        v-bind="displayTab.props.value"
        v-on="displayTab.listeners"
      />
    </template>
  </GridSelectorLayout>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { tasklist } from "@/modules/apps"
import { lua } from "@/bridge"
import { useTasksStore } from "@/services/tasklistStore"
import useControls from "@/services/controls"
import { icons } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"
import { activateRouteTargetScope, useScopedNav } from "@/services/scopedNav/api"
import { useUINavBlocker } from "@/services/uiNavTracker"
import useGameplaySelector from "../useGameplaySelector"
import { useGameplayAdvancedAuxillaryTab } from "../composables/useGameplayAdvancedAuxillaryTab"
import { useGameplayDisplayAuxillaryTab } from "../composables/useGameplayDisplayAuxillaryTab"

import GridSelectorLayout from "@/common/modules/gridSelector/GridSelectorLayout.vue"
import Grid from "@/common/modules/gridSelector/components/Grid.vue"
import DetailsPanelAdvanced from "@/common/modules/gridSelector/components/DetailsPanelAdvanced.vue"
import DetailsPanelDisplayControls from "@/common/modules/gridSelector/components/DetailsPanelDisplayControls.vue"
import GameplayDetails from "../components/GameplayDetails.vue"

const DETAILS_TAB_ITEMS = Object.freeze([
  { mode: "detail", heading: "Details", icon: icons.info },
  { mode: "advanced", heading: "Advanced", icon: icons.laneProperties },
  { mode: "displayControls", heading: "Display", icon: icons.adjust },
])

const route = useRoute()

const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)

const tasklistStore = useTasksStore()
const {
  groups,
  isLoadingGroups,
  dataLoadedSignal,
  detailsMode,
  hasSelectedItem,
  activeItem,
  activeItemDetails,
  autoFocusKey,
  searchText,
  filterList,
  filterByProp,
  commonFilters,
  onlyCommonFilters,
  displayData,
  displaySize,
  managementDetails,
  screenHeaderTitle,
  setSearchText,
  toggleFilter,
  updateRangeFilter,
  resetRangeFilter,
  updateDisplayData,
  resetDisplayDataToDefaults,
  setDetailsMode,
  isAdvancedFiltersExpanded,
  setAdvancedFiltersExpanded,
  showAdvancedFilters,
  resetAdvancedFiltersView,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
  executeButton,
  executeDefaultItemAction,
  isExecutingButton,
  toggleFavourite,
  exploreFolder,
  goToMod,
  isClusterDisplayed,
  clearActiveItem,
  setAutoFocusKey,
  selectItem,
  doubleClickItem,
  focusItem,
  requestInitialDetails,
} = useGameplaySelector()

const { requestScopeFocus } = useScopedNav()
const GRID_SCOPE_ID = "grid"
const gridRef = ref(null)

const loadingUiNavBlocker = useUINavBlocker()
const LOADING_BLOCKED_UI_NAV_EVENTS = Object.freeze([
  "context",
  "action_2",
  "focus_ud",
  "focus_lr",
  "focus_u",
  "focus_d",
  "focus_l",
  "focus_r",
  "tab_l",
  "tab_r",
  "rotate_v_cam",
  "rotate_h_cam",
])

watch(isLoadingGroups, (loading) => {
  if (loading) {
    loadingUiNavBlocker.blockOnly(LOADING_BLOCKED_UI_NAV_EVENTS)
  } else {
    loadingUiNavBlocker.clear()
  }
}, { immediate: true })

const activePanel = ref("grid")
const shouldHighlightActiveTile = computed(() => isControllerUsed.value && activePanel.value === "auxillary")
const isAuxillaryScopeActive = computed(() => activePanel.value === "auxillary")
const isGridScopeActive = computed(() => activePanel.value === "grid")

const availableDetailTabs = computed(() => {
  if (!hasSelectedItem.value) {
    return DETAILS_TAB_ITEMS.filter(tab => tab.mode !== "detail")
  }
  return DETAILS_TAB_ITEMS
})

const auxillaryTabs = computed(() =>
  availableDetailTabs.value.map(({ heading, icon }) => ({ heading, icon }))
)

function canDrillDownIntoItem(item) {
  return Array.isArray(item?.gotoPath) && item.gotoPath.length > 0
}

function canExecuteLeafItem(item) {
  return !canDrillDownIntoItem(item) && !!item?.showDetails
}

const activeGridItem = ref(null)

const shouldHideDetailsBottomSection = computed(
  () => isControllerUsed.value && canExecuteLeafItem(activeGridItem.value),
)

const onGridSelectItem = (item) => {
  activeGridItem.value = item
  if (canDrillDownIntoItem(item)) {
    selectItem(item)
    return
  }
  if (isControllerUsed.value && canExecuteLeafItem(item)) {
    executeDefaultItemAction(item)
    return
  }
  focusItem(item)
}

const onGridFocusItem = (item) => {
  activeGridItem.value = item
  focusItem(item)
}

const onGridDeselectItem = () => {
  activeGridItem.value = null
  clearActiveItem()
}

const onToggleFavoriteShortcut = () => {
  toggleFavourite()
}

const auxillaryTabIndex = computed({
  get: () => {
    const detailsModeIndex = availableDetailTabs.value.findIndex(tab => tab.mode === detailsMode.value)
    return detailsModeIndex >= 0 ? detailsModeIndex : 0
  },
  set: (nextIndex) => {
    const nextMode = availableDetailTabs.value[nextIndex]?.mode
    if (!nextMode || nextMode === detailsMode.value) {
      return
    }
    setDetailsMode(nextMode)
  },
})

const advancedTab = useGameplayAdvancedAuxillaryTab({
  searchText,
  filterList,
  filterByProp,
  commonFilters,
  onlyCommonFilters,
  displayData,
  managementDetails,
  detailsMode,
  isAdvancedFiltersExpanded,
  inlineDetailedFilters: true,
  setSearchText,
  toggleFilter,
  updateRangeFilter,
  resetRangeFilter,
  updateDisplayData,
  resetDisplayDataToDefaults,
  setDetailsMode,
  setAdvancedFiltersExpanded,
  showAdvancedFilters,
  resetAdvancedFiltersView,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
  executeButton,
})

const displayTab = useGameplayDisplayAuxillaryTab({
  displayData,
  detailsMode,
  updateDisplayData,
  resetDisplayDataToDefaults,
  setDetailsMode,
})

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

const canDeactivateGrid = () => !isClusterDisplayed.value

const onBackFromGrid = async () => await lua.extensions.ui_router.back()

const onActivePanelChange = async (panel) => {
  activePanel.value = panel
  if (panel !== "grid") return
  resetAdvancedFiltersView()
  if (activeItem.value?.key) {
    setAutoFocusKey(activeItem.value.key)
  }
  await nextTick()
  if (autoFocusKey.value) {
    await gridRef.value?.scrollToAutoFocusTile?.()
    requestScopeFocus(GRID_SCOPE_ID, { reason: "gameplay-grid-panel-activate" })
  }
}

watch(detailsMode, (nextMode) => {
  if (nextMode !== "advanced") {
    resetAdvancedFiltersView()
  }
})

watch(hasSelectedItem, (isSelected) => {
  if (!isSelected && detailsMode.value === "detail") {
    setDetailsMode("advanced")
  }
}, { immediate: true })

const onDetailsExecuteButton = (buttonId, additionalData) => {
  executeButton(buttonId, additionalData)
}

const onDetailsOverrideClick = ({ activeItem: overrideActiveItem, buttonOverride }) => {
  if (typeof buttonOverride?.click === "function") {
    buttonOverride.click(overrideActiveItem)
  }
}

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  const routeFullPath = route.fullPath
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return false

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (requestId !== mountedAckRequestId) return false
  if (route.fullPath !== routeFullPath) return false

  const luaRouter = window.__luaRouter__
  const canonicalRoute = luaRouter?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return true

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  if (requestId !== mountedAckRequestId) return false
  if (route.fullPath !== routeFullPath) return false
  if (!result?.success) return false

  lastMountedAckRouteName.value = canonicalRoute
  if (luaRouter && luaRouter._pendingCanonicalRoute === canonicalRoute) {
    luaRouter._pendingCanonicalRoute = null
  }

  return true
}

const notifyRouteMounted = async () => {
  lastMountedAckRouteName.value = ""
  mountedAckRequestId += 1
  await notifyRouteMountedWhenReady()
  activateRouteTargetScope()
}

onMounted(async () => {
  await notifyRouteMounted()
})

watch(
  () => route.fullPath,
  async () => {
    await notifyRouteMounted()
  },
)

watch(
  dataLoadedSignal,
  async (nextSignal) => {
    if (!nextSignal) return
    await nextTick()
    if (isControllerUsed.value) {
      await requestInitialDetails()
    }
    if (autoFocusKey.value) {
      await nextTick()
      await gridRef.value?.scrollToAutoFocusTile?.()
      requestScopeFocus(GRID_SCOPE_ID, { reason: "gameplay-grid-route-hydrated" })
    }
  }
)
</script>

<style lang="scss">
.grid-selector-screen {
  // While a launch is in progress, lock the entire layout against further
  // pointer interaction so button mashing cannot queue additional clicks.
  &.is-executing-button {
    pointer-events: none;
  }
}

.grid-selector-screen-content {
  height: 100%;
}

.grid-wrapper {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.gameplay-grid {
  flex: 1 1 auto;
  min-height: 0;
}

// The whole gameplay details is a navigable item with focus frame hidden
// so that the auxillary scope can still be activated even if no button is rendered.
.gameplay-details {
  &::before {
    display: none !important;
  }
}

.gameplay-details,
.details-panel-advanced,
.details-panel-display-controls {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
