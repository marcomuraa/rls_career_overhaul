<template>
  <div class="freeroam-vehicle-selector">
    <div v-if="showTasklistPanel" class="grid-selector-side-panel">
      <component :is="tasklistComponent" />
    </div>

    <GridSelectorLayoutCore
      :screen-header-title="screenHeaderTitle"
      :tabs="auxillaryTabs"
      v-model:selected-tab="auxillaryTabIndex"
      :interactions-disabled="isLoading"
      @toggle-favorite="onToggleFavoriteShortcut"
      @update:active-panel="onActivePanelChange"
    >
      <Grid
        ref="gridRef"
        v-bng-on-ui-nav:back="onBackFromGrid"
        :groups="groups"
        :loading="isLoading"
        :display-size="displaySize"
        :auto-focus-key="autoFocusKey"
        :active-item="activeItem"
        :highlight-active-item="shouldHighlightActiveTile"
        :dim-non-active-items="shouldHighlightActiveTile"
        :nav-scroll-enabled="isGridScopeActive"
        class="freeroam-vehicle-grid"
        @select-item="onGridSelectItem"
        @focus-item="onGridFocusItem"
        @double-click-item="onItemDoubleClick"
      />

      <template #auxillary-content>
        <FreeroamVehicleDetails
          v-if="detailsMode === 'detail' && hasActiveVehicleDetails"
          :activeItem="activeItem"
          :activeItemDetails="activeItemDetails"
          :toggleFavourite="toggleFavourite"
          :exploreFolder="exploreFolder"
          :goToMod="goToMod"
          :buttonOverride="vehicleButtonOverride"
          :showHeaderTitle="true"
          :hideButtonsSection="shouldHideButtonsSection"
          :executePaintTileSelection="shouldHideButtonsSection"
          class="freeroam-vehicle-details"
          @execute-button="onDetailsExecuteButton"
          @override-click="onDetailsOverrideClick"
          @execute-default-item-action="onDetailsExecuteDefaultItemAction"
        />
        <DetailsPanelAdvanced
          v-else-if="detailsMode === 'advanced'"
          v-bind="advancedTabProps"
          v-on="advancedTabListeners"
          class="details-panel-advanced"
        />
        <DetailsPanelDisplayControls
          v-else-if="detailsMode === 'displayControls'"
          v-bind="displayTabProps"
          v-on="displayTabListeners"
          class="details-panel-display-controls"
        />
      </template>
    </GridSelectorLayoutCore>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, toRef, watch } from "vue"
import { storeToRefs } from "pinia"
import { icons } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"
import GridSelectorLayoutCore from "@/common/modules/gridSelector/GridSelectorLayoutCore.vue"
import Grid from "@/common/modules/gridSelector/components/Grid.vue"
import DetailsPanelAdvanced from "@/common/modules/gridSelector/components/DetailsPanelAdvanced.vue"
import DetailsPanelDisplayControls from "@/common/modules/gridSelector/components/DetailsPanelDisplayControls.vue"
import FreeroamVehicleDetails from "./FreeroamVehicleDetails.vue"
import useControls from "@/services/controls"
import { useScopedNav } from "@/services/scopedNav/api"
import { $translate } from "@/services/translation"
import { useUINavBlocker } from "@/services/uiNavTracker"
import useFreeroamVehicleGridSelector from "../composables/useFreeroamVehicleGridSelector"

const GRID_SCOPE_ID = "grid"

const DETAILS_TAB_ITEMS = Object.freeze([
  { mode: "detail", headingKey: "ui.menu.gridSelector.details", icon: icons.info },
  { mode: "advanced", headingKey: "ui.menu.gridSelector.advanced", icon: icons.laneProperties },
  { mode: "displayControls", headingKey: "ui.menu.gridSelector.display", icon: icons.adjust },
])

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  showTasklistPanel: {
    type: Boolean,
    default: false,
  },
  tasklistComponent: {
    type: [Object, Function],
    default: null,
  },
  // Step snapshot published by the wizard route lifecycle. The composable
  // hydrates initial groups/filters/displayData/searchText from it at mount
  // time and reapplies whenever a new snapshot arrives (route re-entry).
  initialSnapshot: {
    type: Object,
    default: null,
  },
  onOverrideSelectItem: {
    type: Function,
    default: () => {},
  },
  onPreviewSelectItem: {
    type: Function,
    default: () => {},
  },
  requestNavigation: {
    type: Function,
    default: null,
  },
  requestBackFromGrid: {
    type: Function,
    default: null,
  },
  requestItemDoubleClick: {
    type: Function,
    default: null,
  },
  // True when the grid is showing concrete vehicle configs (route
  // menu.freeroamLevels.vehicles.vehicle). In that mode focusing a tile
  // preselects VehicleDetails, mirroring VehicleSelectorPause.
  isDisplayingVehicleConfig: {
    type: Boolean,
    default: false,
  },
})

const gridRef = ref(null)

function getGridContentElement() {
  return gridRef.value?.$el ?? null
}

const gridScrollableContentElement = computed(() => getGridContentElement())
const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)

const vehicleGridSelector = useFreeroamVehicleGridSelector({
  enabled: toRef(props, "enabled"),
  gridScrollableContentElement,
  initialSnapshot: toRef(props, "initialSnapshot"),
  shouldAutoSelectInitialItem: () => isControllerUsed.value,
  requestNavigation: (...args) => props.requestNavigation?.(...args),
  requestBackFromGrid: (...args) => props.requestBackFromGrid?.(...args),
  requestItemDoubleClick: (...args) => props.requestItemDoubleClick?.(...args),
})

const {
  groups,
  isLoading,
  dataLoadedSignal,
  displaySize,
  screenHeaderTitle,
  activeItem,
  activeItemDetails,
  autoFocusKey,
  detailsMode,
  searchText,
  filterList,
  filterByProp,
  commonFilters,
  onlyCommonFilters,
  displayData,
  managementDetails,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
  toggleFavourite,
  exploreFolder,
  goToMod,
  toggleDetailsMode,
  executeButton,
  setSearchText,
  toggleFilter,
  updateRangeFilter,
  resetRangeFilter,
  updateDisplayData,
  resetDisplayDataToDefaults,
  markCurrentSelection,
  onItemSelect,
  onItemFocus,
  onItemDoubleClick,
  onBackFromGrid,
  clearSearchAndFilters,
  setAutoFocusKey,
} = vehicleGridSelector

const { requestScopeFocus } = useScopedNav()

const isAdvancedFiltersExpanded = ref(false)

function setAdvancedFiltersExpanded(expanded) {
  isAdvancedFiltersExpanded.value = expanded !== false
}

// VehicleDetails (and the matching Details tab) should only appear when the
// current selection actually has a resolved details payload. This prevents
// stale config details from sticking around after navigating from
// menu.freeroamLevels.vehicles.vehicle back to menu.freeroamLevels.vehicles,
// and also hides the Details tab for drilldown/cluster tiles that carry only
// gotoPath without a usable details payload.
const hasActiveVehicleDetails = computed(() => {
  return !!(activeItem.value?.showDetails && activeItemDetails.value)
})

const availableDetailTabs = computed(() => {
  if (!hasActiveVehicleDetails.value) {
    return DETAILS_TAB_ITEMS.filter(tab => tab.mode !== "detail")
  }
  return DETAILS_TAB_ITEMS
})

const auxillaryTabs = computed(() =>
  availableDetailTabs.value.map(({ headingKey, icon }) => ({
    heading: $translate.instant(headingKey),
    icon,
  }))
)

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
    toggleDetailsMode(nextMode)
  },
})

watch(hasActiveVehicleDetails, (hasDetails) => {
  if (!hasDetails && detailsMode.value === "detail") {
    toggleDetailsMode("advanced")
  }
}, { immediate: true })

const uiNavBlocker = useUINavBlocker()

// Conditionally block the `action_4` favourite shortcut while no active
// details are loaded. When details become available, clear the block so the
// shortcut handler is executable again. Mirrors VehicleSelectorPause.
watch(activeItemDetails, details => {
  if (details) {
    uiNavBlocker.clear()
  } else {
    uiNavBlocker.blockOnly(["action_4"])
  }
}, { immediate: true })

// Separate blocker for async loading. Disables the same UINav events as
// GameplaySelector.vue / FreeroamLevelGridSelector.vue while the vehicle grid
// waits for async bulk loader data so the user cannot focus, switch tabs, or
// trigger camera/context actions against an empty grid. Cleared when
// isLoading flips to false.
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

watch(isLoading, (loading) => {
  if (loading) {
    loadingUiNavBlocker.blockOnly(LOADING_BLOCKED_UI_NAV_EVENTS)
  } else {
    loadingUiNavBlocker.clear()
  }
}, { immediate: true })

const vehicleButtonOverride = computed(() => ({
  icon: "fastTravel",
  label: $translate.instant("ui.menu.freeroamSelector.grid.nextStep"),
}))

const shouldHideButtonsSection = computed(() => isControllerUsed.value)

const activePanel = ref("grid")
const shouldHighlightActiveTile = computed(() => isControllerUsed.value && activePanel.value === "auxillary")
const isGridScopeActive = computed(() => activePanel.value === "grid")

// Fast-commit path: when a tile resolves to a concrete vehicle config
// (no drill-down `gotoPath`, and either an explicit leaf marker
// `subElementCount === 0` or leaf details with both `model` and `config`),
// commit the selection immediately via the wizard's override handler. Mirrors
// the VehicleSelectorPause `canDrillDownIntoItem` semantics so leaf tiles in
// Recent/Favourites groups and default-selected config tiles fast-commit on
// both the parent menu.freeroamLevels.vehicles route and the concrete
// menu.freeroamLevels.vehicles.vehicle route for controller input. KBM/mouse
// gets the same fast-commit only on the parent vehicles route so a single
// click/Enter advances the wizard instead of just opening VehicleDetails.
const isLeafVehicleConfigTile = (item) => {
  if (!item || typeof item !== "object") return false
  if (Array.isArray(item.gotoPath) && item.gotoPath.length > 0) return false
  if (item.subElementCount === 0) return true
  const details = (item.showDetails && typeof item.showDetails === "object" && item.showDetails)
    || (item.doubleClickDetails && typeof item.doubleClickDetails === "object" && item.doubleClickDetails)
    || null
  return !!(details && details.model && details.config)
}

// On the parent vehicles route the wizard owns commit-on-select for KBM/mouse.
// The concrete vehicle-config route (`*.freeroamLevels.vehicles.vehicle`)
// keeps the focus-to-details behavior so paint selection / inspection in
// VehicleDetails still works before committing via "Next Step".
const shouldFastCommitLeafForMouse = computed(() => !props.isDisplayingVehicleConfig)

const onGridSelectItem = (item) => {
  if (isLeafVehicleConfigTile(item) && (isControllerUsed.value || shouldFastCommitLeafForMouse.value)) {
    props.onOverrideSelectItem?.(item)
    return
  }
  if (isLeafVehicleConfigTile(item)) {
    props.onPreviewSelectItem?.(item)
  }
  onItemSelect(item)
}

// Delegate focus handling to the composable, which mirrors the
// VehicleSelectorPause focus-to-details pattern: leaf config tiles preview
// VehicleDetails, drilldown/cluster tiles clear stale details so the
// previously focused config does not stay visible.
const onGridFocusItem = (item) => {
  onItemFocus(item)
}

const onDetailsExecuteButton = ({ buttonId, additionalData }) => {
  executeButton(buttonId, additionalData)
}

const onDetailsOverrideClick = ({ activeItem: overrideActiveItem, selectedPaint, selectedMultiPaint }) => {
  props.onOverrideSelectItem?.(overrideActiveItem, selectedPaint, selectedMultiPaint)
}

const onDetailsExecuteDefaultItemAction = ({ activeItem: overrideActiveItem, additionalData }) => {
  props.onOverrideSelectItem?.(overrideActiveItem, additionalData)
}

const advancedTabProps = computed(() => ({
  searchText: searchText.value,
  filterList: filterList.value,
  filterByProp: filterByProp.value,
  commonFilters: commonFilters.value,
  onlyCommonFilters: onlyCommonFilters.value,
  displayData: displayData.value,
  managementDetails: managementDetails.value,
  detailsMode: detailsMode.value,
  showDetailedFilters: isAdvancedFiltersExpanded.value,
  inlineDetailedFilters: true,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
}))

const onUpdateShowDetailedFilters = (isExpanded = true) => {
  setAdvancedFiltersExpanded(isExpanded !== false)
}

const advancedTabListeners = {
  "search-text-change": setSearchText,
  "filter-toggle": toggleFilter,
  "range-filter-update": updateRangeFilter,
  "range-filter-reset": resetRangeFilter,
  "display-data-update": updateDisplayData,
  "display-data-reset": resetDisplayDataToDefaults,
  "toggle-details-mode": toggleDetailsMode,
  "update:show-detailed-filters": onUpdateShowDetailedFilters,
  "show-detailed-filters": onUpdateShowDetailedFilters,
  "execute-button": executeButton,
}

const displayTabProps = computed(() => ({
  displayData: displayData.value,
  detailsMode: detailsMode.value,
}))

const displayTabListeners = {
  "display-data-update": updateDisplayData,
  "display-data-reset": resetDisplayDataToDefaults,
  "toggle-details-mode": toggleDetailsMode,
}

const onToggleFavoriteShortcut = () => {
  toggleFavourite()
}

function waitForAnimationFrame() {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return Promise.resolve()
  }
  return new Promise(resolve => window.requestAnimationFrame(resolve))
}

const focusAutoFocusTile = async reason => {
  // Only the controller flow should auto-scroll/focus the default tile.
  // Mouse/keyboard users keep their current scroll position.
  if (!isControllerUsed.value) return
  await nextTick()
  const target = await gridRef.value?.scrollToAutoFocusTile?.()
  await waitForAnimationFrame()

  if (target) {
    requestScopeFocus(GRID_SCOPE_ID, target, { reason })
    return
  }

  requestScopeFocus(GRID_SCOPE_ID, "[bng-scoped-nav-autofocus]", { reason })
}

// Mirror VehicleSelectorPause: when returning to the grid panel (from the
// auxillary/details panel) restore autofocus on the currently active tile,
// scroll it into view, then request grid scope focus. This keeps controller
// navigation pointed at the right tile after the user backs out of details.
const onActivePanelChange = async (panel) => {
  activePanel.value = panel
  if (panel !== "grid") return
  setAdvancedFiltersExpanded(false)
  if (activeItem.value?.key) {
    setAutoFocusKey(activeItem.value.key)
  }
  if (isControllerUsed.value && autoFocusKey.value) {
    await focusAutoFocusTile("freeroam-vehicle-grid-panel-activate")
  }
}

watch(detailsMode, (nextMode) => {
  if (nextMode !== "advanced") {
    setAdvancedFiltersExpanded(false)
  }
})

// Forward the inner Grid's scroll helper so the wizard view can re-run the
// pause-selector flow after route hydration: scroll the autoFocus tile into
// view and request grid scope focus. `autoFocusKey` is also surfaced so the
// caller can skip the work when there is nothing to focus.
const scrollToAutoFocusTile = async () => {
  if (!isControllerUsed.value) return null
  return await gridRef.value?.scrollToAutoFocusTile?.()
}

// Reset the grid scroll to the top without changing focus. Used by the wizard
// for mouse/keyboard drilldown hydration, where we intentionally skip the
// controller-only autofocus scroll.
const scrollToTop = () => {
  gridRef.value?.scrollToTop?.()
}

// Run post-async-hydration work whenever Lua emits FreeroamSelectorDataLoaded
// for the vehicle backend and the composable updates the snapshot. Mirrors the
// gameplay / freeroam level grid flow: wait one tick so the new groups render,
// then scroll the autofocus tile into view and request grid scope focus.
watch(dataLoadedSignal, async (nextSignal) => {
  if (!nextSignal) return
  if (isControllerUsed.value && autoFocusKey.value) {
    await focusAutoFocusTile("freeroam-vehicle-grid-route-hydrated")
  }
})

defineExpose({
  getGridContentElement,
  clearSearchAndFilters,
  scrollToAutoFocusTile,
  scrollToTop,
  markCurrentSelection,
  autoFocusKey,
})
</script>

<style lang="scss" scoped>
.freeroam-vehicle-selector {
  display: flex;
  flex: 1 1 auto;
  flex-direction: row;
  gap: 0.5em;
  min-width: 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.grid-selector-side-panel {
  flex: 0 0 20rem;
  min-height: 0;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.freeroam-vehicle-grid {
  flex: 1 1 auto;
  min-height: 0;
}

.freeroam-vehicle-details {
  &::before {
    display: none !important;
  }
}

.freeroam-vehicle-details,
.details-panel-advanced,
.details-panel-display-controls {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
