<template>
  <GridSelectorLayout
    :screen-header-title="screenHeaderTitle"
    :can-deactivate-grid="canDeactivateGrid"
    :tabs="auxillaryTabs"
    v-model:selected-tab="auxillaryTabIndex"
    @breadcrumb-click="onBreadcrumbClick"
    @toggle-favorite="onToggleFavoriteShortcut"
    @update:active-panel="onActivePanelChange"
  >
    <p class="app-selector__help">{{ $t("ui.hudApps.help.apps") }}</p>

    <Grid
      v-bng-on-ui-nav:back="onBackFromGrid"
      :groups="groups"
      :loading="isLoadingGroups"
      :display-size="displaySize"
      :highlight-active-item="shouldHighlightActiveTile"
      :dim-non-active-items="shouldHighlightActiveTile"
      :nav-scroll-enabled="isGridScopeActive"
      class="app-selector-grid"
      @select-item="onGridSelectItem"
      @focus-item="focusItem"
      @double-click-item="doubleClickItem"
    />

    <template #auxillary-content>
      <AppDetails
        v-if="detailsMode === 'detail' && hasSelectedItem"
        :activeItem="activeItem"
        :activeItemDetails="activeItemDetails"
        :hideButtonsSection="shouldExecuteTileSelection"
        :toggleFavourite="toggleFavourite"
        :isAuxillaryScopeActive="isAuxillaryScopeActive"
        bng-nav-item
        class="app-details"
        @execute-button="onDetailsExecuteButton"
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
  </GridSelectorLayout>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { lua } from "@/bridge"
import { icons } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"
import GridSelectorLayout from "@/common/modules/gridSelector/GridSelectorLayout.vue"
import Grid from "@/common/modules/gridSelector/components/Grid.vue"
import DetailsPanelAdvanced from "@/common/modules/gridSelector/components/DetailsPanelAdvanced.vue"
import DetailsPanelDisplayControls from "@/common/modules/gridSelector/components/DetailsPanelDisplayControls.vue"
import useControls from "@/services/controls"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { $translate } from "@/services/translation"
import useAppSelector from "../useAppSelector"
import AppDetails from "../components/AppDetails.vue"

const DETAILS_TAB_ITEMS = Object.freeze([
  { mode: "detail", headingKey: "ui.menu.gridSelector.details", icon: icons.info },
  { mode: "advanced", headingKey: "ui.menu.gridSelector.advanced", icon: icons.laneProperties },
  { mode: "displayControls", headingKey: "ui.menu.gridSelector.display", icon: icons.adjust },
])

const route = useRoute()
const routeDataStore = useRouteDataStore()
const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)

const {
  groups,
  isLoadingGroups,
  hydrateFromSnapshot,
  detailsMode,
  isAdvancedFiltersExpanded,
  hasSelectedItem,
  activeItem,
  activeItemDetails,
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
  setAdvancedFiltersExpanded,
  showAdvancedFilters,
  resetAdvancedFiltersView,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
  executeButton,
  executeDefaultItemAction,
  toggleFavourite,
  selectItem,
  doubleClickItem,
  focusItem,
  requestInitialDetails,
} = useAppSelector()

const shouldExecuteTileSelection = computed(() => isControllerUsed.value)

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
    setDetailsMode(nextMode)
  },
})

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
  const shouldExpand = isExpanded !== false
  setAdvancedFiltersExpanded(shouldExpand)
  if (shouldExpand) {
    showAdvancedFilters()
    return
  }
  resetAdvancedFiltersView()
}

const advancedTabListeners = {
  "search-text-change": setSearchText,
  "filter-toggle": toggleFilter,
  "range-filter-update": updateRangeFilter,
  "range-filter-reset": resetRangeFilter,
  "display-data-update": updateDisplayData,
  "display-data-reset": resetDisplayDataToDefaults,
  "toggle-details-mode": setDetailsMode,
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
  "toggle-details-mode": setDetailsMode,
}

const onGridSelectItem = (item) => {
  if (shouldExecuteTileSelection.value) {
    executeDefaultItemAction(item)
    return
  }
  selectItem(item)
}

const onDetailsExecuteButton = (buttonId, button) => {
  executeButton(buttonId, button)
}

const onBreadcrumbClick = async item => {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

const onToggleFavoriteShortcut = () => {
  toggleFavourite()
}

const canDeactivateGrid = () => true

const onBackFromGrid = async () => await lua.extensions.ui_router.back()

const onActivePanelChange = (panel) => {
  activePanel.value = panel
  if (panel === "grid") {
    resetAdvancedFiltersView()
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

const lastMountedAckRouteName = ref("")
const lastLoadedRouteFullPath = ref("")
let mountedAckRequestId = 0

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
  // small delay to avoid initial Lua sync call locking up the UI on first mount
  await new Promise(resolve => setTimeout(resolve, 500))
  await notifyRouteMounted()
})

watch(
  () => route.fullPath,
  async () => {
    await notifyRouteMounted()
  },
)

function isRouteDataForCurrentScreen(routeName) {
  if (!routeName) return false
  if (routeName === route.name) return true
  return routeDataStore.route?.screenId === route.name
}

watch(
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "mounted-ready") return
    if (!isRouteDataForCurrentScreen(routeName)) return
    if (lastLoadedRouteFullPath.value === route.fullPath) return

    lastLoadedRouteFullPath.value = route.fullPath
    await nextTick()

    const snapshot = routeDataStore.data?.appSelector?.snapshot
    if (hydrateFromSnapshot(snapshot) && isControllerUsed.value) {
      await requestInitialDetails()
    }
  }
)
</script>

<style lang="scss">
.app-selector__help {
  flex: 0 0 auto;
  margin: 0 0 0.4em;
  color: var(--bng-cool-gray-200);
  font-size: 0.82em;
  line-height: 1.35;
}

.app-selector-grid {
  flex: 1 1 auto;
  min-height: 0;
}

// Keep AppDetails as a navigable item while hiding its focus frame.
.app-details {
  &::before {
    display: none !important;
  }
}

.app-details,
.details-panel-advanced,
.details-panel-display-controls {
  flex: 1 1 auto;
  min-height: 0;
}
</style>