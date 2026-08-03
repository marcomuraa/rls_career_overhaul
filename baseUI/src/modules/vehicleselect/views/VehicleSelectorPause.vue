<template>
  <GridSelectorLayout
    :screen-header-title="screenHeaderTitle"
    :tabs="auxillaryTabs"
    :can-switch-to-grid="canSwitchToGrid"
    v-model:selected-tab="auxillaryTabIndex"
    @toggle-favorite="onToggleFavoriteShortcut"
    @update:active-panel="onActivePanelChange"
    @breadcrumb-click="onBreadcrumbClick"
  >
    <template v-if="tasklistStore.hasItems && tasklistStore.visibleIn.gridSelector" #side-panel>
      <component :is="tasklist" />
    </template>
    <Grid
      ref="gridRef"
      v-bng-on-ui-nav:back="onBackFromGrid"
      v-bng-on-ui-nav:action_2="onGridActionTwo"
      :groups="groups"
      :loading="isLoadingGroups"
      :display-size="displaySize"
      :auto-focus-key="autoFocusKey"
      :active-item="activeItem"
      :highlight-active-item="shouldHighlightActiveTile"
      :dim-non-active-items="shouldHighlightActiveTile"
      :nav-scroll-enabled="isGridScopeActive"
      sound-class="bng_main_selector"
      class="vehicle-grid"
      @select-item="onGridSelectItem"
      @focus-item="onGridFocusItem"
      @double-click-item="doubleClickItem"
    />

    <template #auxillary-content>
      <template v-if="detailsMode === 'detail'">
        <VehicleDetails
          v-if="hasSelectedItem"
          :activeItem="activeItem"
          :activeItemDetails="activeItemDetails"
          :toggleFavourite="toggleFavourite"
          :exploreFolder="exploreFolder"
          :goToMod="goToMod"
          :showHeaderTitle="true"
          :isAuxillaryScopeActive="isAuxillaryScopeActive"
          class="vehicle-details"
          @execute-button="onDetailsExecuteButton"
          @override-click="onDetailsOverrideClick"
          @execute-default-item-action="onDetailsExecuteDefaultItemAction"
        />
      </template>
      <DetailsPanelAdvanced
        v-else-if="detailsMode === 'advanced'"
        class="details-panel-advanced"
        v-bind="advancedTabProps"
        v-on="advancedTabListeners"
      >
        <template #management-details="{ managementDetails: tabManagementDetails, executeButton: tabExecuteButton }">
          <ManagementDetails
            :managementDetails="tabManagementDetails"
            :executeButton="tabExecuteButton"
          />
        </template>
      </DetailsPanelAdvanced>
      <DetailsPanelDisplayControls
        v-else-if="detailsMode === 'displayControls'"
        class="details-panel-display-controls"
        v-bind="displayTabProps"
        v-on="displayTabListeners"
      />
    </template>

    <template #topbar-right>
      <div class="system-info">
        <Background />
        <PauseButton v-if="!isOpenedFromGarage" inline />
        <div class="system-time">{{ currentTime }}</div>
        <BngServiceProvidersUser
          class="username"
          v-bng-blur
          :service-providers="SysInfo.serviceProviders.value"
          :service-providers-online="SysInfo.serviceProvidersOnline.value"
        />
      </div>
    </template>
  </GridSelectorLayout>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { lua } from "@/bridge"
import { BngServiceProvidersUser, icons } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { vBngBlur, vBngOnUiNav } from "@/common/directives"
import GridSelectorLayout from "@/common/modules/gridSelector/GridSelectorLayout.vue"
import Grid from "@/common/modules/gridSelector/components/Grid.vue"
import DetailsPanelAdvanced from "@/common/modules/gridSelector/components/DetailsPanelAdvanced.vue"
import DetailsPanelDisplayControls from "@/common/modules/gridSelector/components/DetailsPanelDisplayControls.vue"
import PauseButton from "@/common/modules/pause/components/pauseButton.vue"
import { tasklist } from "@/modules/apps"
import { useTasksStore } from "@/services/tasklistStore"
import useControls from "@/services/controls"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope, useScopedNav } from "@/services/scopedNav/api"
import SysInfo from "@/services/sysInfo"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { debounce } from "@/utils/rateLimit"
import { $translate } from "@/services/translation"
import useVehicleSelector from "../useVehicleSelector"
import ManagementDetails from "../components/ManagementDetails.vue"
import VehicleDetails from "../components/VehicleDetails.vue"
import { openVehicleDetailsEditor } from "../components/VehicleDetailsEditor.utils.js"

const DETAILS_TAB_ITEMS = Object.freeze([
  { mode: "detail", headingKey: "ui.menu.gridSelector.details", icon: icons.info },
  { mode: "advanced", headingKey: "ui.menu.gridSelector.advanced", icon: icons.laneProperties },
  { mode: "displayControls", headingKey: "ui.menu.gridSelector.display", icon: icons.adjust },
])

const FOCUS_DETAILS_DEBOUNCE_MS = 200

const route = useRoute()
const routeDataStore = useRouteDataStore()
const tasklistStore = useTasksStore()
const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)
const currentTime = ref("")

// The garage reuses this selector but is not the pause menu, so the inline
// pause button must be hidden when the selector was opened from the garage.
const isOpenedFromGarage = ref(false)

const {
  groups,
  isLoadingGroups,
  dataLoadedSignal,
  hydrateFromSnapshot,
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
  preserveDetailsModeForNextDetails,
  isAdvancedFiltersExpanded,
  setAdvancedFiltersExpanded,
  resetAdvancedFiltersView,
  isFilterLocked,
  isFilterOptionLocked,
  isRangeFilterLocked,
  clearActiveItem,
  setAutoFocusKey,
  rememberReturnFocusItem,
  consumeReturnFocusDescriptor,
  resolveModelKeyFromItem,
  selectItem,
  doubleClickItem,
  focusItem,
  requestInitialDetails,
  executeButton,
  executeDefaultItemAction,
  executeActionTwoButton,
  toggleFavourite,
  exploreFolder,
  goToMod,
} = useVehicleSelector({
  shouldAutoSelectInitialItem: () => isControllerUsed.value,
})

const { requestScopeFocus } = useScopedNav()
const GRID_SCOPE_ID = "grid"
// The grid scope uses the default focus precedence
// (routeTarget -> lastActive -> autofocus -> first), so a stale last-focused
// tile would otherwise win over the current autoFocusKey when re-entering the
// grid (e.g. after Select Random changes the active item without the tile ever
// being focused). Requesting the autofocus tile explicitly makes the `requested`
// candidate win, so autoFocusKey reliably wins when entering grid scope.
const AUTO_FOCUS_TILE_SELECTOR = "[bng-scoped-nav-autofocus='true']"
const gridRef = ref(null)

// One-shot guard: when a random Advanced action (e.g. Select Random) drills
// into the child vehicle route, the snapshot still hydrates and autoFocusKey is
// still set, but focus must stay on the Advanced panel / Select Random button
// instead of scrolling+focusing the freshly hydrated config tile. Armed right
// before random navigation and consumed by the child route hydration.
const suppressNextHydrationGridFocus = ref(false)

// Focus the grid scope's current autofocus tile. Guarded callers only invoke
// this when autoFocusKey is set, so the selector resolves to the matching tile;
// if it does not resolve, the scope falls back to its default focus selection.
function focusGridAutoFocusTile(reason) {
  requestScopeFocus(GRID_SCOPE_ID, AUTO_FOCUS_TILE_SELECTOR, { reason })
}

// Decide whether the current hydration pass should skip the grid scroll/focus.
// Only the random drilldown into the child vehicle route is suppressed: either
// the one-shot flag is armed, or the route was opened targeting the auxillary
// scope. The parent selector route must keep its normal autofocus behavior, so
// this never suppresses there. The one-shot flag is consumed on the child route
// so it can only affect a single hydration.
function shouldSuppressHydrationGridFocus() {
  if (!isVehicleSelectorRoute()) return false
  const wasArmed = suppressNextHydrationGridFocus.value
  suppressNextHydrationGridFocus.value = false
  return wasArmed || routeDataStore.targetScope === "auxillary"
}

const uiNavBlocker = useUINavBlocker()

// Separate UINav blocker used only while the async vehicle data is loading.
// Mirrors the gameplay selector behavior so navigation/select events can't
// fire against an empty grid before Lua emits VehicleSelectorDataLoaded.
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

const shouldExecuteTileSelection = computed(() => isControllerUsed.value)

// Mirror the freeroam vehicle selector: when controller input is used and the
// auxillary panel is active (focus has moved out of the grid), highlight the
// active tile and dim non-active tiles so the user can still see which
// vehicle the details pane refers to.
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
  set: nextIndex => {
    const nextMode = availableDetailTabs.value[nextIndex]?.mode
    if (!nextMode || nextMode === detailsMode.value) return
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

function onUpdateShowDetailedFilters(isExpanded = true) {
  setAdvancedFiltersExpanded(isExpanded !== false)
}

// Advanced/management buttons can either perform an in-place side effect or
// ask the UI to drill into a vehicle (e.g. Select Random). Execute the button
// through the composable, then route any navigation result into the same Lua
// drilldown path used by grid tile clicks. Request the auxiliary scope so the
// child route keeps the Advanced panel active instead of jumping focus back to
// the grid.
async function onAdvancedExecuteButton(buttonId, additionalData) {
  const result = await executeButton(buttonId, additionalData)
  if (!isButtonNavigationResult(result)) return
  preserveDetailsModeForNextDetails()
  suppressNextHydrationGridFocus.value = true
  rememberReturnFocusItem({ gotoPath: result.gotoPath })
  clearActiveItem()
  navigateToVehicleViaLua({ gotoPath: result.gotoPath }, { preferredScope: "auxillary" })
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
  "execute-button": onAdvancedExecuteButton,
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

const onToggleFavoriteShortcut = () => {
  toggleFavourite()
}

const onBackFromGrid = () => {
  if (isVehicleSelectorRoute()) {
    lua.extensions.ui_router.back({ preferredScope: GRID_SCOPE_ID })
    return false
  }
  lua.extensions.ui_router.back()
}

const onActivePanelChange = async panel => {
  activePanel.value = panel
  if (panel !== "grid") return
  resetAdvancedFiltersView()
  if (activeItem.value?.key) {
    setAutoFocusKey(activeItem.value.key)
  }
  await nextTick()
  if (isControllerUsed.value && autoFocusKey.value) {
    await gridRef.value?.scrollToAutoFocusTile?.()
    focusGridAutoFocusTile("vehicle-grid-panel-activate")
  }
}

watch(detailsMode, nextMode => {
  if (nextMode !== "advanced") {
    resetAdvancedFiltersView()
  }
})

watch(hasSelectedItem, isSelected => {
  if (!isSelected && detailsMode.value === "detail") {
    setDetailsMode("advanced")
  }
}, { immediate: true })

// Conditionally block the `action_4` favourite shortcut while no active
// details are loaded. When details become available, clear the block so the
// shortcut handler is executable again.
watch(activeItemDetails, details => {
  if (details) {
    uiNavBlocker.clear()
  } else {
    uiNavBlocker.blockOnly(["action_4"])
  }
}, { immediate: true })

// Parent (grid root) and child (drilldown) route names this component serves.
// The pause menu and the garage both reuse VehicleSelectorPause, so each
// context contributes its own canonical Lua route names here.
const PARENT_SELECTOR_ROUTE_NAMES = Object.freeze([
  "pause.vehicleSelector",
  "pause.vehicle.vehicleSelector",
  "garage.vehicles",
  "garage.mycars",
])
const VEHICLE_SELECTOR_ROUTE_NAMES = Object.freeze([
  "pause.vehicleSelector.vehicle",
  "pause.vehicle.vehicleSelector.vehicle",
  "garage.vehicles.vehicle",
  "garage.mycars.vehicle",
])

function getCanonicalRouteName() {
  const canonicalRoute = routeDataStore.routeName
  if (typeof canonicalRoute === "string" && canonicalRoute) {
    return canonicalRoute
  }
  return route.name || ""
}

function isParentSelectorRoute() {
  return PARENT_SELECTOR_ROUTE_NAMES.includes(getCanonicalRouteName())
}

function isVehicleSelectorRoute() {
  return VEHICLE_SELECTOR_ROUTE_NAMES.includes(getCanonicalRouteName())
}

function hasAnyGroupTiles(groupList) {
  if (!Array.isArray(groupList) || groupList.length === 0) return false
  for (const group of groupList) {
    const tiles = group?.tiles
    if (Array.isArray(tiles) && tiles.length > 0) return true
  }
  return false
}

function findTileInGroups(groupList, predicate) {
  if (!Array.isArray(groupList) || groupList.length === 0) return null
  for (const group of groupList) {
    const tiles = group?.tiles
    if (!Array.isArray(tiles)) continue
    for (const tile of tiles) {
      if (tile && predicate(tile)) return tile
    }
  }
  return null
}

// Resolve the remembered drilldown tile back to a current tile key in the
// regenerated parent groups. Cluster tile keys are generated values that
// change whenever the parent grid rebuilds, so we fall back to matching the
// owning vehicle (model key) when the exact key has gone away.
function resolveReturnFocusTileKey(groupList, descriptor) {
  if (!descriptor || typeof descriptor !== "object") return null

  if (descriptor.key) {
    const exact = findTileInGroups(groupList, tile => tile.key === descriptor.key)
    if (exact) return exact.key
  }

  if (descriptor.modelKey) {
    const byModel = findTileInGroups(groupList, tile => resolveModelKeyFromItem(tile) === descriptor.modelKey)
    if (byModel) return byModel.key
  }

  return null
}

const canSwitchToGrid = computed(() => hasAnyGroupTiles(groups.value))

watch(
  () => [routeDataStore.routeName, route.name, isLoadingGroups.value, groups.value],
  () => {
    if (!isVehicleSelectorRoute()) return
    if (isLoadingGroups.value) return
    if (hasAnyGroupTiles(groups.value)) return
    if (!activeItem.value && !activeItemDetails.value) return
    clearActiveItem()
  },
  { immediate: true }
)

function canDrillDownIntoItem(item) {
  if (!item || typeof item !== "object") return false
  if (Array.isArray(item.gotoPath) && item.gotoPath.length > 0) return true
  if (item.subElementCount === 0) return false
  if (item.showDetails || item.doubleClickDetails) return true
  return false
}

function navigateToVehicleViaLua(item, options) {
  void lua.ui_vehicleSelector_general.navigateToVehicle(item, options)
}

// A truthy `executeButton` result that carries a `gotoPath` array means the
// button (e.g. Advanced > Select Random) asked the UI to drill into a vehicle
// rather than perform an in-place side effect.
function isButtonNavigationResult(result) {
  return !!result && typeof result === "object" && Array.isArray(result.gotoPath) && result.gotoPath.length > 0
}

const onGridSelectItem = item => {
  if (isParentSelectorRoute() && canDrillDownIntoItem(item)) {
    rememberReturnFocusItem(item)
    clearActiveItem()
    navigateToVehicleViaLua(item)
    return
  }
  if (shouldExecuteTileSelection.value) {
    executeDefaultItemAction(item)
    return
  }
  selectItem(item)
}

const debouncedFocusItem = debounce(item => {
  focusItem(item)
}, FOCUS_DETAILS_DEBOUNCE_MS)

const onGridFocusItem = item => {
  if (!item?.showDetails) {
    debouncedFocusItem.cancel()
    clearActiveItem()
    return false
  }
  debouncedFocusItem(item)
  return true
}

// Grid-scope action_2 shortcut: only fires when a tile already has active
// details loaded. Maps to the vehicle "Spawn New" details button (uiEvent
// `action_2`) instead of the default Replace Current action.
const onGridActionTwo = () => {
  const item = activeItem.value
  if (!item) return
  void executeActionTwoButton(item)
}

const onDetailsExecuteButton = ({ button, buttonId, additionalData }) => {
  if (button?.openVehicleEditorPopup) {
    openVehicleDetailsEditor(button.data)
    return
  }
  executeButton(buttonId, additionalData)
}

const onDetailsOverrideClick = ({ activeItem: overrideActiveItem, buttonOverride, additionalData }) => {
  if (typeof buttonOverride?.click === "function") {
    buttonOverride.click(overrideActiveItem, additionalData)
  }
}

const onDetailsExecuteDefaultItemAction = ({ activeItem: targetItem, additionalData }) => {
  if (!targetItem) return
  executeDefaultItemAction(targetItem, additionalData)
}

const onBreadcrumbClick = async item => {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const lastMountedAckRouteName = ref("")
const lastLoadedRouteDataKey = ref("")
let mountedAckRequestId = 0
let currentTimeIntervalId

function isRouteDataForCurrentScreen(routeName) {
  if (!routeName) return false
  if (routeName === route.name) return true
  return routeDataStore.route?.screenId === route.name
}

function getPreferredSnapshot() {
  const data = routeDataStore.data
  return data?.vehicleSelector?.snapshot ?? data?.gridSelector?.snapshot ?? null
}

function buildRouteDataCacheKey() {
  const canonicalRoute = routeDataStore.routeName || ""
  const snapshotPath = getPreferredSnapshot()?.path
  return `${canonicalRoute}|${JSON.stringify(snapshotPath ?? null)}`
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

async function refreshOpenedFromGarage() {
  isOpenedFromGarage.value = !!(await lua.ui_vehicleSelector_general.isOpenedFromGarage())
}

onMounted(async () => {
  updateCurrentTime()
  currentTimeIntervalId = window.setInterval(updateCurrentTime, 1000)
  void refreshOpenedFromGarage()
  // No initial-mount sleep needed any more: the async vehicle data flow
  // (util_asyncBulkLoader -> VehicleSelectorDataLoaded) replaces the
  // previously synchronous getModelsData call that blocked the first mount.
  await notifyRouteMounted()
})

watch(
  () => route.fullPath,
  async () => {
    void refreshOpenedFromGarage()
    await notifyRouteMounted()
  },
)

watch(
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "mounted-ready") return
    if (!isRouteDataForCurrentScreen(routeName)) return

    const cacheKey = buildRouteDataCacheKey()
    if (lastLoadedRouteDataKey.value === cacheKey) return

    lastLoadedRouteDataKey.value = cacheKey
    await nextTick()

    const snapshot = getPreferredSnapshot()
    if (await hydrateFromSnapshot(snapshot)) {
      // Parent-route returns (drilldown back) don't carry a Lua-provided
      // `defaultFocusKey`. Consume the previously remembered descriptor so
      // focus lands back on the parent tile that owns the vehicle the user
      // drilled into. Only honor this on the parent selector route; the
      // child route gets its focus from the Lua snapshot's
      // `defaultFocusKey` / `forceAutoFocus` flow.
      const returnFocusDescriptor = isParentSelectorRoute() ? consumeReturnFocusDescriptor() : null
      const resolvedReturnFocusKey = resolveReturnFocusTileKey(groups.value, returnFocusDescriptor)
      if (resolvedReturnFocusKey) {
        setAutoFocusKey(resolvedReturnFocusKey)
      } else {
        await requestInitialDetails()
      }
      // Keep autoFocusKey for later grid entry, but skip the scroll+focus when a
      // random drilldown wants focus to stay on the Advanced panel.
      // Always consume the one-shot suppression flag so it only affects a
      // single hydration, regardless of input mode.
      const suppressGridFocus = shouldSuppressHydrationGridFocus()
      if (isControllerUsed.value && autoFocusKey.value && !suppressGridFocus) {
        await nextTick()
        await gridRef.value?.scrollToAutoFocusTile?.()
        focusGridAutoFocusTile("vehicle-grid-route-hydrated")
      } else if (!isControllerUsed.value && isVehicleSelectorRoute()) {
        // Mouse/keyboard drilldown: reset the freshly hydrated child grid to
        // the top instead of inheriting the parent scroll or autofocus tile.
        await nextTick()
        gridRef.value?.scrollToTop?.()
      }
    }
  }
)

// Post-hydration work after Lua emits VehicleSelectorDataLoaded.
watch(
  dataLoadedSignal,
  async (nextSignal) => {
    if (!nextSignal) return
    await nextTick()
    const returnFocusDescriptor = isParentSelectorRoute() ? consumeReturnFocusDescriptor() : null
    const resolvedReturnFocusKey = resolveReturnFocusTileKey(groups.value, returnFocusDescriptor)
    if (resolvedReturnFocusKey) {
      setAutoFocusKey(resolvedReturnFocusKey)
    } else {
      await requestInitialDetails()
    }
    // Keep autoFocusKey for later grid entry, but skip the scroll+focus when a
    // random drilldown wants focus to stay on the Advanced panel.
    // Always consume the one-shot suppression flag so it only affects a
    // single hydration, regardless of input mode.
    const suppressGridFocus = shouldSuppressHydrationGridFocus()
    if (isControllerUsed.value && autoFocusKey.value && !suppressGridFocus) {
      await nextTick()
      await gridRef.value?.scrollToAutoFocusTile?.()
      focusGridAutoFocusTile("vehicle-grid-data-loaded")
    } else if (!isControllerUsed.value && isVehicleSelectorRoute()) {
      // Mouse/keyboard drilldown: reset the freshly hydrated child grid to the
      // top instead of inheriting the parent scroll or autofocus tile.
      await nextTick()
      gridRef.value?.scrollToTop?.()
    }
  }
)

onUnmounted(() => {
  debouncedFocusItem.cancel()
  if (currentTimeIntervalId) {
    window.clearInterval(currentTimeIntervalId)
  }
})
</script>

<style lang="scss">
.vehicle-grid {
  flex: 1 1 auto;
  min-height: 0;
}

.vehicle-details,
.details-panel-advanced,
.details-panel-display-controls {
  flex: 1 1 auto;
  min-height: 0;
}

.system-info {
  --bng-bg-enabled: var(--bng-off-black);
  --bng-bg-enabled-opacity: 0.6;
  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-border-width: 0;

  display: inline-flex;
  align-items: center;
  gap: 1em;
  color: var(--bng-off-white);
  pointer-events: auto;
  user-select: none;
  align-self: flex-start;
  font-size: 1em;
  height: 2.5em;
  padding: 0 1em 0 0;
  position: relative;
  isolation: isolate;
  z-index: 2;

  .system-time {
    font-family: var(--fnt-mono);
    font-size: 1.25em;
    font-weight: 200;
    padding-top: 0.2em;
  }

  .username {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
  }
}
</style>
