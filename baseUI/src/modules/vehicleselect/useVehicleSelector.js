import { computed, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import logger from "@/services/logger"

const BACKEND_NAME = "vehicleSelector"
const VEHICLE_DETAILS_EVENT = "vehicleSelectorDetails"
const VEHICLE_DISPLAY_REFRESH_EVENT = "vehicleSelectorDisplayDataSnapshot"
const VEHICLE_DATA_LOADED_EVENT = "VehicleSelectorDataLoaded"
const DEFAULT_DETAILS_MODE = "advanced"
const DEFAULT_SCREEN_HEADER_TITLE = "Vehicle Selector"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function normalizeFocusKey(rawFocusKey) {
  if (rawFocusKey === null || rawFocusKey === undefined || rawFocusKey === "") {
    return null
  }
  return String(rawFocusKey)
}

function normalizeRequestId(rawRequestId) {
  if (typeof rawRequestId === "number" && Number.isFinite(rawRequestId)) {
    return rawRequestId
  }
  if (typeof rawRequestId === "string") {
    const parsedRequestId = Number.parseInt(rawRequestId, 10)
    if (Number.isFinite(parsedRequestId)) {
      return parsedRequestId
    }
  }
  return null
}

function normalizeTile(tile, groupIndex, tileIndex) {
  if (!isPlainObject(tile)) {
    return null
  }

  const normalizedTile = { ...tile }
  if (!normalizedTile.key) {
    normalizedTile.key = `__missing_tile_key_${BACKEND_NAME}_${groupIndex}_${tileIndex}`
  }
  return normalizedTile
}

function normalizeGroups(groups) {
  const sourceGroups = Array.isArray(groups)
    ? groups
    : isPlainObject(groups)
      ? Object.values(groups)
      : []

  const normalizedGroups = []
  for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
    const group = sourceGroups[groupIndex]
    if (!isPlainObject(group)) {
      continue
    }

    const sourceTiles = Array.isArray(group.tiles)
      ? group.tiles
      : isPlainObject(group.tiles)
        ? Object.values(group.tiles)
        : []
    const tiles = []
    for (let tileIndex = 0; tileIndex < sourceTiles.length; tileIndex += 1) {
      const normalizedTile = normalizeTile(sourceTiles[tileIndex], groupIndex, tileIndex)
      if (normalizedTile) {
        tiles.push(normalizedTile)
      }
    }

    normalizedGroups.push({
      ...group,
      isRecentGroup: !!group.isRecentGroup,
      tiles,
    })
  }

  return normalizedGroups
}

function normalizeSearchText(searchValue) {
  if (typeof searchValue === "string") {
    return searchValue
  }
  if (searchValue === null || searchValue === undefined) {
    return ""
  }
  return String(searchValue)
}

function normalizeFilters(filtersPayload) {
  const source = isPlainObject(filtersPayload) ? filtersPayload : {}
  return {
    filterList: Array.isArray(source.filterList) ? source.filterList : [],
    filterByProp: isPlainObject(source.filterByProp) ? source.filterByProp : {},
    commonFilters: Array.isArray(source.commonFilters) ? source.commonFilters : [],
    lockedFiltersByProp: isPlainObject(source.lockedFiltersByProp) ? source.lockedFiltersByProp : {},
    activeFilters: Array.isArray(source.activeFilters) ? source.activeFilters : [],
    onlyCommonFilters: source.onlyCommonFilters !== false,
  }
}

function normalizeDisplayData(displayDataPayload) {
  return Array.isArray(displayDataPayload) ? displayDataPayload : []
}

function normalizeManagementDetails(detailsPayload) {
  return isPlainObject(detailsPayload) ? detailsPayload : {}
}

// Some management buttons (e.g. vehicle "Select Random") resolve to a
// drilldown navigation instead of a side effect. Their Lua callback returns
// `{ gotoPath = ... }`, where the path may arrive either as a plain array of
// route keys or wrapped in a `{ keys = { ... } }` object (the vehicle
// operations backend uses the wrapped form). Normalize both shapes into a
// plain `gotoPath` array the view can hand straight to `navigateToVehicle`,
// returning null for non-navigation button results.
function normalizeButtonNavigationResult(buttonResult) {
  if (!isPlainObject(buttonResult)) {
    return null
  }
  const rawGotoPath = buttonResult.gotoPath
  const pathKeys = Array.isArray(rawGotoPath)
    ? rawGotoPath
    : isPlainObject(rawGotoPath) && Array.isArray(rawGotoPath.keys)
      ? rawGotoPath.keys
      : null
  if (!Array.isArray(pathKeys) || pathKeys.length === 0) {
    return null
  }
  return { gotoPath: pathKeys }
}

function findDefaultDetailsItem(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return null
  }

  let firstDetailsItem = null
  for (const group of groups) {
    const tiles = Array.isArray(group?.tiles) ? group.tiles : []
    for (const tile of tiles) {
      if (!tile?.showDetails) {
        continue
      }
      if (tile.isDefaultSelected) {
        return tile
      }
      if (!firstDetailsItem) {
        firstDetailsItem = tile
      }
    }
  }

  return firstDetailsItem
}

function pickDefaultButton(buttonInfo) {
  if (!Array.isArray(buttonInfo) || buttonInfo.length === 0) {
    return null
  }

  const enabledButtons = buttonInfo.filter(button => isPlainObject(button))
  if (enabledButtons.length === 0) {
    return null
  }

  const primaryButton = enabledButtons.find(button => button.primary)
  if (primaryButton) {
    return primaryButton
  }

  const doubleClickButton = enabledButtons.find(button => button.isDoubleClickAction)
  if (doubleClickButton) {
    return doubleClickButton
  }

  if (enabledButtons.length === 1) {
    return enabledButtons[0]
  }

  return null
}

function buildDefaultPaintAdditionalData(itemDetails) {
  const multiPaintSetups = itemDetails?.paints?.multiPaintSetups
  if (!Array.isArray(multiPaintSetups) || multiPaintSetups.length === 0) {
    return {}
  }

  const defaultSetup = multiPaintSetups.find(setup => setup?.isDefault)
  if (!defaultSetup) {
    return {}
  }

  const additionalData = {}
  if (defaultSetup.paintName1) additionalData.paint = defaultSetup.paintName1
  if (defaultSetup.paintName2) additionalData.paint2 = defaultSetup.paintName2
  if (defaultSetup.paintName3) additionalData.paint3 = defaultSetup.paintName3
  return additionalData
}

function resolveDetailsRequestPayload(item) {
  if (isPlainObject(item?.showDetails)) {
    return item.showDetails
  }
  if (isPlainObject(item)) {
    return item
  }
  return null
}

// Derive the tile/favourite key from any combination of item + details
// payloads we see in the vehicle selector flow:
//  - normalized tiles carry `key` directly (e.g. `model/config`);
//  - details payloads carry `{ model, config }` (matches Lua tile key
//    `model_key .. "/" .. config_key`);
//  - generic selector payloads may surface `key` on the details object.
function resolveFavouriteItemKey(item, itemDetails) {
  if (item?.key) {
    return String(item.key)
  }
  if (itemDetails?.model && itemDetails?.config) {
    return `${itemDetails.model}/${itemDetails.config}`
  }
  if (itemDetails?.key) {
    return String(itemDetails.key)
  }
  return null
}

export default function useVehicleSelector(options = {}) {
  const events = useEvents()

  const groups = ref([])
  const isLoadingGroups = ref(true)
  const detailsMode = ref(DEFAULT_DETAILS_MODE)
  const isAdvancedFiltersExpanded = ref(false)

  // One-shot guard: when set, the next applied details payload does NOT force
  // `detailsMode` to "detail". The random-selection flow uses this so the
  // randomly selected config's details hydrate into `activeItem` /
  // `activeItemDetails` while the user stays in the Advanced auxiliary panel.
  // It is consumed (reset) the moment a details payload is applied so normal
  // grid focus/click behavior still opens the Details view as it does today.
  const preserveDetailsModeOnce = ref(false)

  const activeItem = ref(null)
  const activeItemDetails = ref(null)

  // Tile key the grid should auto-focus when it next renders. Mirrors the
  // shared grid selector contract: snapshots advertise a `defaultFocusKey`
  // and `<Grid :auto-focus-key="..." />` forwards it to the matching tile.
  // We also keep this in sync with the active details item so switching
  // auxiliary tabs and returning to the grid lands on the selected tile.
  const autoFocusKey = ref(null)
  // One-shot return-focus descriptor remembered before drilling into a child
  // route. Lets the parent pause selector restore focus on the tile that
  // triggered the drilldown when the user navigates back, since the parent
  // snapshot has no Lua-provided default for that case.
  //
  // We store more than just the tile key because cluster tile keys are
  // generated values (`groupKey_model[subModel]_previewConfig`) that change
  // whenever the parent grid is rebuilt (sort/filter/recent-set change,
  // different cluster mode, etc.). Capturing the owning vehicle identity
  // (`modelKey` + `gotoPath`) lets the parent route resolve back to whichever
  // tile in the regenerated groups currently represents that vehicle.
  const returnFocusDescriptor = ref(null)

  const searchText = ref("")
  const filterList = ref([])
  const filterByProp = ref({})
  const commonFilters = ref([])
  const lockedFiltersByProp = ref({})
  const activeFilters = ref([])
  const onlyCommonFilters = ref(true)
  const displayData = ref([])
  const managementDetails = ref({})
  const screenHeaderTitle = ref(DEFAULT_SCREEN_HEADER_TITLE)

  const requestCounter = ref({
    groups: 0,
    details: 0,
  })

  // Bumped every time Lua emits `VehicleSelectorDataLoaded` and we successfully
  // hydrate the snapshot. The pause view watches this counter to run
  // post-hydration work (initial details request, autofocus, scope focus)
  // without duplicating the hydration logic in the component. Mirrors the
  // gameplay/freeroam selector composables.
  const dataLoadedSignal = ref(0)
  const lastLoadedRouteName = ref(null)

  // Tracks whether the most recent hydration phase has finished applying its
  // snapshot. False between component construction (or the start of a new
  // route mount) and the end of `hydrateFromSnapshot()`. Used by
  // `handleDetailsPayload()` to decide between queueing (not hydrated yet)
  // and applying immediately (event arrived late).
  const isSnapshotHydrated = ref(false)
  // Pending payload captured from `vehicleSelectorDetails` while the matching
  // snapshot has not been hydrated yet. Applied at the end of
  // `hydrateFromSnapshot()` so the initial Lua-pushed details survive the
  // snapshot's clear-selection step.
  const pendingDetailsPayload = ref(null)

  const hasSelectedItem = computed(() => !!activeItem.value)
  const displaySize = computed(() => {
    const option = displayData.value.find(displayOption => displayOption?.key === "displaySize")
    return option?.value || "medium"
  })

  function nextRequestId(requestKey) {
    requestCounter.value[requestKey] = (requestCounter.value[requestKey] || 0) + 1
    return requestCounter.value[requestKey]
  }

  function isCurrentRequest(requestKey, requestId) {
    return requestCounter.value[requestKey] === requestId
  }

  function shouldAutoSelectInitialItem() {
    return typeof options.shouldAutoSelectInitialItem === "function"
      ? options.shouldAutoSelectInitialItem() !== false
      : options.shouldAutoSelectInitialItem !== false
  }

  function applyFiltersState(filtersPayload) {
    const normalizedFilters = normalizeFilters(filtersPayload)
    filterList.value = normalizedFilters.filterList
    filterByProp.value = normalizedFilters.filterByProp
    commonFilters.value = normalizedFilters.commonFilters
    lockedFiltersByProp.value = normalizedFilters.lockedFiltersByProp
    activeFilters.value = normalizedFilters.activeFilters
    onlyCommonFilters.value = normalizedFilters.onlyCommonFilters
  }

  function applyDisplayDataState(displayDataPayload) {
    const normalizedDisplayData = normalizeDisplayData(displayDataPayload)
    displayData.value = normalizedDisplayData

    const searchOption = normalizedDisplayData.find(displayOption => displayOption?.key === "searchText")
    if (searchOption) {
      searchText.value = normalizeSearchText(searchOption.value)
    }
  }

  function applyManagementDetailsState(managementDetailsPayload) {
    managementDetails.value = normalizeManagementDetails(managementDetailsPayload)
  }

  function applyHeaderState(headerPayload) {
    if (isPlainObject(headerPayload) && typeof headerPayload.title === "string" && headerPayload.title.length > 0) {
      screenHeaderTitle.value = headerPayload.title
      return
    }
    screenHeaderTitle.value = DEFAULT_SCREEN_HEADER_TITLE
  }

  function applySnapshot(snapshotPayload) {
    if (!isPlainObject(snapshotPayload)) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "groups")) {
      groups.value = normalizeGroups(snapshotPayload.groups)
      if (Object.prototype.hasOwnProperty.call(snapshotPayload, "defaultFocusKey")) {
        autoFocusKey.value = normalizeFocusKey(snapshotPayload.defaultFocusKey)
      }
    }
    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "filters")) {
      applyFiltersState(snapshotPayload.filters)
    }
    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "displayData")) {
      applyDisplayDataState(snapshotPayload.displayData)
    }
    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "searchText")) {
      searchText.value = normalizeSearchText(snapshotPayload.searchText)
    }
    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "managementDetails")) {
      applyManagementDetailsState(snapshotPayload.managementDetails)
    }
    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "header")) {
      applyHeaderState(snapshotPayload.header)
    }
  }

  function clearActiveItem(options = {}) {
    const { clearAutoFocus = true } = options
    nextRequestId("details")
    activeItem.value = null
    activeItemDetails.value = null
    pendingDetailsPayload.value = null
    if (clearAutoFocus) {
      autoFocusKey.value = null
    }
  }

  function setAutoFocusKey(focusKey) {
    autoFocusKey.value = normalizeFocusKey(focusKey)
  }

  function setAutoFocusItem(item) {
    autoFocusKey.value = normalizeFocusKey(item?.key)
  }

  // Resolve the model identifier from any tile shape we see: cluster tiles
  // expose a `gotoPath` of the form
  // `{"configsForBrandSubModelOrModel", model, ...}`; unclustered config
  // tiles carry `model_key` and `doubleClickDetails.model` / `showDetails.model`.
  function resolveModelKeyFromItem(item) {
    if (!isPlainObject(item)) return null
    if (typeof item.model_key === "string" && item.model_key) return item.model_key
    const showDetails = item.showDetails
    if (isPlainObject(showDetails) && typeof showDetails.model === "string" && showDetails.model) {
      return showDetails.model
    }
    const doubleClickDetails = item.doubleClickDetails
    if (isPlainObject(doubleClickDetails) && typeof doubleClickDetails.model === "string" && doubleClickDetails.model) {
      return doubleClickDetails.model
    }
    if (Array.isArray(item.gotoPath)
      && (item.gotoPath[0] === "configsForBrandSubModelOrModel" || item.gotoPath[0] === "configsForModel")
      && typeof item.gotoPath[1] === "string"
      && item.gotoPath[1]) {
      return item.gotoPath[1]
    }
    return null
  }

  // Remember the tile that initiated a drilldown so that returning to the
  // parent route can restore focus on it. The snapshot reaching the parent
  // selector does not carry a Lua-provided `defaultFocusKey` for this case,
  // so the Vue side owns the round-trip. Capture enough identity to survive
  // a regenerated cluster tile key (see `returnFocusDescriptor` comment).
  function rememberReturnFocusItem(item) {
    if (!isPlainObject(item)) {
      returnFocusDescriptor.value = null
      return
    }
    returnFocusDescriptor.value = {
      key: normalizeFocusKey(item.key),
      modelKey: resolveModelKeyFromItem(item),
      gotoPath: Array.isArray(item.gotoPath) ? item.gotoPath.slice() : null,
    }
  }

  // One-shot accessor: returns the previously remembered descriptor and
  // clears it so a subsequent grid hydration without a stored descriptor
  // does not accidentally re-focus a stale tile.
  function consumeReturnFocusDescriptor() {
    const descriptor = returnFocusDescriptor.value
    returnFocusDescriptor.value = null
    return descriptor
  }

  function setDetailsMode(mode) {
    detailsMode.value = mode
  }

  // Arm the one-shot guard so the next applied details payload keeps the
  // current `detailsMode` (Advanced) instead of forcing "detail". The
  // random-selection flow calls this right before triggering the navigation
  // that hydrates the randomly selected config's details.
  function preserveDetailsModeForNextDetails() {
    preserveDetailsModeOnce.value = true
  }

  function setAdvancedFiltersExpanded(isExpanded) {
    isAdvancedFiltersExpanded.value = !!isExpanded
  }

  function showAdvancedFilters() {
    setAdvancedFiltersExpanded(true)
  }

  function resetAdvancedFiltersView() {
    setAdvancedFiltersExpanded(false)
  }

  function applyDetailsPayload(payload) {
    const resolvedItem = isPlainObject(payload?.item) ? payload.item : null
    if (!resolvedItem) {
      return false
    }
    activeItem.value = resolvedItem
    activeItemDetails.value = isPlainObject(payload.details) ? payload.details : null
    // Random-selection hydration keeps the current auxiliary panel (Advanced)
    // active instead of switching to the Details view. The guard is one-shot:
    // consume it here so subsequent normal details payloads open Details.
    if (preserveDetailsModeOnce.value) {
      preserveDetailsModeOnce.value = false
    } else {
      detailsMode.value = "detail"
    }
    // Note: do not mutate `autoFocusKey` here. Async details replies arriving
    // after the user has moved focus would otherwise change tile props and
    // trigger BngList virtual-list rebuilds (visible as a `Loading...` blink
    // in Ultralight). Autofocus is owned by explicit restore paths only.
    return true
  }

  // Vehicle selector emits `vehicleSelectorDetails` for two cases:
  //  1. An explicit Vue request that carries a numeric `requestId` (we match
  //     it against `requestCounter.details`).
  //  2. The initial Lua-triggered details push that the backend emits right
  //     after attaching the route snapshot. That payload has no requestId, so
  //     we accept it only during/after a matching snapshot hydration. While
  //     the snapshot has not yet been hydrated, we queue the payload and let
  //     `hydrateFromSnapshot()` apply it after its own clear-selection step.
  function handleDetailsPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId !== null) {
      if (!isCurrentRequest("details", payloadRequestId)) {
        logger.debug("Ignoring stale vehicle details payload", payloadRequestId)
        return
      }
      applyDetailsPayload(payload)
      pendingDetailsPayload.value = null
      return
    }

    if (!shouldAutoSelectInitialItem()) {
      pendingDetailsPayload.value = null
      return
    }

    if (isSnapshotHydrated.value) {
      pendingDetailsPayload.value = null
      applyDetailsPayload(payload)
      return
    }

    pendingDetailsPayload.value = payload
  }

  function handleDataLoadedPayload(payload) {
    console.log("[useVehicleSelector] VehicleSelectorDataLoaded received", payload)
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }
    if (!isPlainObject(payload.snapshot)) {
      logger.debug("Ignoring vehicle data loaded payload with missing snapshot", payload)
      return
    }
    if (!hydrateFromSnapshot(payload.snapshot)) {
      return
    }
    if (typeof payload.routeName === "string" && payload.routeName !== "") {
      lastLoadedRouteName.value = payload.routeName
    }
    dataLoadedSignal.value += 1
  }

  function handleDisplayRefreshPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      logger.debug("Ignoring vehicle display refresh payload with invalid request id", payload?.requestId)
      return
    }

    if (!isCurrentRequest("groups", payloadRequestId)) {
      return
    }

    applySnapshot(payload.snapshot)
  }

  function hydrateFromSnapshot(snapshotPayload) {
    if (!isPlainObject(snapshotPayload)) {
      return false
    }

    nextRequestId("groups")
    applySnapshot(snapshotPayload)
    // Keep snapshot-provided defaultFocusKey so scoped-nav autofocus lands on
    // the backend-selected default tile after hydration.
    clearActiveItem({ clearAutoFocus: false })
    setDetailsMode(DEFAULT_DETAILS_MODE)
    resetAdvancedFiltersView()
    isLoadingGroups.value = false
    isSnapshotHydrated.value = true

    const queuedPayload = pendingDetailsPayload.value
    if (queuedPayload) {
      pendingDetailsPayload.value = null
      applyDetailsPayload(queuedPayload)
    }
    return true
  }

  function isFilterLocked(propName, option = null) {
    const filterLocks = lockedFiltersByProp.value?.[propName]
    if (!filterLocks) {
      return false
    }
    if (option !== null && option !== undefined) {
      return Object.prototype.hasOwnProperty.call(filterLocks, option)
    }
    return Object.keys(filterLocks).length > 0
  }

  function isFilterOptionLocked(propName, option) {
    return isFilterLocked(propName, option)
  }

  function isRangeFilterLocked(propName) {
    return isFilterLocked(propName)
  }

  async function setSearchText(value) {
    try {
      const nextSearchText = normalizeSearchText(value)
      if (nextSearchText === searchText.value) {
        return false
      }
      searchText.value = nextSearchText
      if (isLoadingGroups.value) {
        return false
      }
      const requestId = nextRequestId("groups")
      await lua.ui_gridSelector.setSearchText(BACKEND_NAME, nextSearchText, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector set search text failed:", error)
      return false
    }
  }

  async function toggleFilter(propName, option) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.toggleFilter(BACKEND_NAME, propName, option, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector toggle filter failed:", error)
      return false
    }
  }

  async function updateRangeFilter(propName, min, max) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.updateRangeFilter(BACKEND_NAME, propName, min, max, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector update range filter failed:", error)
      return false
    }
  }

  async function resetRangeFilter(propName) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.resetRangeFilter(BACKEND_NAME, propName, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector reset range filter failed:", error)
      return false
    }
  }

  async function updateDisplayData(key, value) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_vehicleSelector_general.setDisplayDataOption(key, value, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector update display data failed:", error)
      return false
    }
  }

  async function resetDisplayDataToDefaults() {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_vehicleSelector_general.resetDisplayDataToDefaults(requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector reset display data failed:", error)
      return false
    }
  }

  async function requestDetails(item) {
    const detailsPayload = resolveDetailsRequestPayload(item)
    if (!detailsPayload) {
      return false
    }

    // Prefer the full tile when available so the Lua `vehicleSelectorDetails`
    // reply carries the original tile back via `payload.item`, preserving
    // `activeItem.key` for the Grid highlight match. The Lua vehicle selector
    // unwraps `item.showDetails` internally for the actual details lookup.
    // Falls back to the raw `{ model, config }` shape for callers that pass
    // a details payload directly (e.g. existing favourite refresh paths).
    const detailsRequestArg = isPlainObject(item?.showDetails) ? item : detailsPayload

    const requestId = nextRequestId("details")
    // Note: do not mutate `autoFocusKey` here. Updating it on every focus
    // change would alter each tile's `isAutoFocused` prop, which in turn
    // changes the slot VNodes BngList watches and forces the virtual list
    // to rebuild (briefly showing `Loading...` in Ultralight). Autofocus is
    // owned by explicit restore paths: snapshot hydration, parent-route
    // return focus, and grid panel reactivation in VehicleSelectorPause.
    try {
      await lua.ui_gridSelector.requestDetails(BACKEND_NAME, detailsRequestArg, requestId)
      return true
    } catch (error) {
      logger.error("Vehicle selector details request failed:", error)
      return false
    }
  }

  async function selectItem(item) {
    if (!item?.showDetails) {
      return false
    }
    return await requestDetails(item)
  }

  async function focusItem(item) {
    if (!item?.showDetails) {
      return false
    }
    return await requestDetails(item)
  }

  async function doubleClickItem(item) {
    if (!item?.doubleClickDetails) {
      return false
    }
    try {
      await lua.ui_gridSelector.executeDoubleClick(BACKEND_NAME, item.doubleClickDetails)
      return true
    } catch (error) {
      logger.error("Vehicle selector execute double click failed:", error)
      return false
    }
  }

  async function requestInitialDetails() {
    if (!shouldAutoSelectInitialItem()) {
      return false
    }
    // Skip the fallback round-trip if the backend already pushed details for
    // this hydration via `vehicleSelectorDetails` (handled by the pending
    // payload mechanism in `hydrateFromSnapshot`).
    if (activeItem.value) {
      return true
    }
    const item = findDefaultDetailsItem(groups.value)
    if (!item) {
      return false
    }
    // Seed autofocus once for the initial details fallback so the first
    // tile is highlighted and the grid panel can scroll/focus to it. We
    // intentionally only set this when no autofocus is already in place
    // (e.g. snapshot `defaultFocusKey` or parent-route return focus),
    // since `requestDetails` no longer mutates `autoFocusKey` itself.
    if (!autoFocusKey.value) {
      setAutoFocusItem(item)
    }
    return await focusItem(item)
  }

  // Returns:
  //  - `false` when the button id is invalid or the Lua call throws;
  //  - a normalized `{ gotoPath: [...] }` navigation result when the button's
  //    Lua callback asked the UI to drill into a vehicle (e.g. Select Random);
  //  - `true` for ordinary side-effecting buttons (spawn/remove/reset/etc.).
  // Callers that don't care about navigation can keep treating the result as a
  // boolean since both success cases are truthy.
  async function executeButton(buttonId, additionalData) {
    if (buttonId === null || buttonId === undefined) {
      return false
    }
    try {
      const buttonResult = await lua.ui_gridSelector.executeButton(BACKEND_NAME, buttonId, additionalData)
      const navigationResult = normalizeButtonNavigationResult(buttonResult)
      if (navigationResult) {
        return navigationResult
      }
      return true
    } catch (error) {
      logger.error("Vehicle selector execute button failed:", error)
      return false
    }
  }

  async function executeDefaultItemAction(item, additionalDataOverride) {
    const detailsRequest = resolveDetailsRequestPayload(item)
    if (!detailsRequest) {
      return false
    }

    const itemKey = item?.key ?? null
    const isSameItem = !!(activeItem.value && itemKey && activeItem.value.key === itemKey)
    if (!isSameItem || !activeItemDetails.value) {
      await requestDetails(item)
    }

    const details = activeItemDetails.value
    const defaultButton = pickDefaultButton(details?.buttonInfo)
    if (!defaultButton || defaultButton.disabled) {
      return false
    }

    const additionalData = isPlainObject(additionalDataOverride)
      ? additionalDataOverride
      : buildDefaultPaintAdditionalData(details)
    return await executeButton(defaultButton.buttonId, additionalData)
  }

  // Execute the details button bound to the `action_2` UI event for the given
  // item. Mirrors the vehicle Lua backend's Spawn New button (see
  // `lua/ge/extensions/ui/vehicleSelector/vehicleOperations.lua`), without
  // relying on label matching. Returns false when no enabled action_2 button
  // is available for the resolved details payload.
  async function executeActionTwoButton(item, additionalDataOverride) {
    const detailsRequest = resolveDetailsRequestPayload(item)
    if (!detailsRequest) {
      return false
    }

    const itemKey = item?.key ?? null
    const isSameItem = !!(activeItem.value && itemKey && activeItem.value.key === itemKey)
    if (!isSameItem || !activeItemDetails.value) {
      await requestDetails(item)
    }

    const details = activeItemDetails.value
    const buttonInfo = Array.isArray(details?.buttonInfo) ? details.buttonInfo : []
    const actionButton = buttonInfo.find(
      button => isPlainObject(button) && !button.disabled && button.uiEvent === "action_2"
    )
    if (!actionButton) {
      return false
    }

    const additionalData = isPlainObject(additionalDataOverride)
      ? additionalDataOverride
      : buildDefaultPaintAdditionalData(details)
    return await executeButton(actionButton.buttonId, additionalData)
  }

  function patchTileFavouriteState(itemKey, isFavourite) {
    if (!itemKey) {
      return
    }

    const currentGroups = groups.value
    if (!Array.isArray(currentGroups) || currentGroups.length === 0) {
      return
    }

    const favouritePercent = isFavourite ? 1 : 0
    const nextGroups = currentGroups.map(group => {
      const tiles = Array.isArray(group?.tiles) ? group.tiles : []
      let didPatch = false
      const nextTiles = tiles.map(tile => {
        if (tile?.key !== itemKey) {
          return tile
        }
        didPatch = true
        return { ...tile, showFavouriteIconPercent: favouritePercent }
      })
      if (!didPatch) {
        return group
      }
      return { ...group, tiles: nextTiles }
    })

    groups.value = nextGroups
  }

  async function toggleFavourite(item = activeItem.value) {
    const itemDetails = resolveDetailsRequestPayload(item)
    if (!itemDetails) {
      return false
    }

    let isFavourite = false
    try {
      isFavourite = !!(await lua.ui_gridSelector.toggleFavourite(BACKEND_NAME, itemDetails))
    } catch (error) {
      logger.error("Vehicle selector toggle favorite failed:", error)
      return false
    }

    const itemKey = resolveFavouriteItemKey(item, itemDetails)
    patchTileFavouriteState(itemKey, isFavourite)

    // Optimistically patch the active item + details so `VehicleDetails`
    // reflects the new favourite state immediately, before the refreshed
    // `vehicleSelectorDetails` payload arrives.
    const activeKey = resolveFavouriteItemKey(activeItem.value, resolveDetailsRequestPayload(activeItem.value))
    const isActiveItem = !!(itemKey && activeKey && activeKey === itemKey)
    if (isActiveItem) {
      activeItem.value = {
        ...activeItem.value,
        showFavouriteIconPercent: isFavourite ? 1 : 0,
      }
      if (activeItemDetails.value) {
        activeItemDetails.value = { ...activeItemDetails.value, isFavourite }
      }
    }

    // Refresh details so the favorite icon/state in the details pane stays
    // in sync. The matching `vehicleSelectorDetails` reply will update
    // `activeItem`/`activeItemDetails` via the request-id flow.
    if (isActiveItem) {
      await requestDetails(item)
    }
    return true
  }

  function exploreFolder(path) {
    lua.ui_gridSelector.exploreFolder(BACKEND_NAME, path)
  }

  function goToMod(modId) {
    lua.ui_gridSelector.goToMod(BACKEND_NAME, modId)
  }

  events.on(VEHICLE_DETAILS_EVENT, handleDetailsPayload)
  events.on(VEHICLE_DISPLAY_REFRESH_EVENT, handleDisplayRefreshPayload)
  events.on(VEHICLE_DATA_LOADED_EVENT, handleDataLoadedPayload)

  return {
    groups,
    isLoadingGroups,
    detailsMode,
    isAdvancedFiltersExpanded,
    hasSelectedItem,
    activeItem,
    activeItemDetails,
    autoFocusKey,
    dataLoadedSignal,
    lastLoadedRouteName,
    searchText,
    filterList,
    filterByProp,
    commonFilters,
    lockedFiltersByProp,
    activeFilters,
    onlyCommonFilters,
    displayData,
    displaySize,
    managementDetails,
    screenHeaderTitle,
    hydrateFromSnapshot,
    setSearchText,
    toggleFilter,
    updateRangeFilter,
    resetRangeFilter,
    updateDisplayData,
    resetDisplayDataToDefaults,
    setDetailsMode,
    preserveDetailsModeForNextDetails,
    setAdvancedFiltersExpanded,
    showAdvancedFilters,
    resetAdvancedFiltersView,
    isFilterLocked,
    isFilterOptionLocked,
    isRangeFilterLocked,
    clearActiveItem,
    setAutoFocusKey,
    setAutoFocusItem,
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
  }
}
