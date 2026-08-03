import { computed, ref, watch } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { startLoading } from "@/services"
import { waitForLoadingScreenFadeIn } from "@/services/screenCover"
import { $translate } from "@/services/translation"
import logger from "@/services/logger"

const BACKEND_NAME = "gameplaySelector"
const GAMEPLAY_DETAILS_EVENT = "gameplaySelectorDetails"
const GAMEPLAY_DISPLAY_REFRESH_EVENT = "gameplaySelectorDisplayDataSnapshot"
const GAMEPLAY_DATA_LOADED_EVENT = "GameplaySelectorDataLoaded"
const ALL_GAMEPLAY_PATH = Object.freeze({ keys: ["allGameplay"] })
const DEFAULT_DETAILS_MODE = "detail"
const DEFAULT_SCREEN_HEADER_TITLE = "ui.menu.gameplaySelector.title"

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

function resolveClusterRequestPath(itemOrPath) {
  if (Array.isArray(itemOrPath)) {
    return itemOrPath
  }

  if (isPlainObject(itemOrPath)) {
    if (Array.isArray(itemOrPath.gotoPath)) {
      return itemOrPath.gotoPath
    }
    if (Array.isArray(itemOrPath.keys)) {
      return itemOrPath.keys
    }
  }

  return null
}

// Build the payload sent to Lua's navigateToCluster.
// Lua resolves cluster keys + title from this payload, so we pass the full
// tile when available (name/label/title give Lua a display title) and fall
// back to a normalized { keys } shape for raw array/keys inputs.
function buildClusterLuaPayload(itemOrPath) {
  const keys = resolveClusterRequestPath(itemOrPath)
  if (!keys || keys.length === 0) {
    return null
  }

  if (isPlainObject(itemOrPath)) {
    return { ...itemOrPath, keys: [...keys] }
  }

  return { keys: [...keys] }
}

export default function useGameplaySelector() {
  const events = useEvents()
  const groups = ref([])
  const isLoadingGroups = ref(true)
  const detailsMode = ref(DEFAULT_DETAILS_MODE)
  const isAdvancedFiltersExpanded = ref(false)
  const activeCluster = ref(null)

  const activeItem = ref(null)
  const activeItemDetails = ref(null)

  // Bumped every time Lua emits `GameplaySelectorDataLoaded` and we successfully
  // hydrate the snapshot. The view watches this counter to run post-hydration
  // work (initial details request, autofocus, scope focus) without duplicating
  // the hydration logic in the component.
  const dataLoadedSignal = ref(0)
  const lastLoadedRouteName = ref(null)

  // Tile key the grid should auto-focus when it next renders. Mirrors the
  // shared grid selector contract used by the vehicle pause selector:
  // `<Grid :auto-focus-key="..." />` forwards it to the matching tile so
  // returning to the grid panel scrolls back to the selected tile.
  const autoFocusKey = ref(null)

  const searchText = ref("")
  const filterList = ref([])
  const filterByProp = ref({})
  const commonFilters = ref([])
  const lockedFiltersByProp = ref({})
  const activeFilters = ref([])
  const onlyCommonFilters = ref(true)
  const displayData = ref([])
  const managementDetails = ref({})
  const screenHeaderTitle = ref($translate.instant(DEFAULT_SCREEN_HEADER_TITLE))

  const requestCounter = ref({
    groups: 0,
    details: 0,
  })

  // First-click-wins guard for executeButton. Once acquired it stays latched
  // until reset by failure, hydration, navigation, or active-item clear.
  // Heavy backend transitions (e.g. start scenario / start mission) can keep
  // running after the Lua call resolves, so we never reset it in a finally
  // block after a successful launch.
  const isExecutingButton = ref(false)
  const executingButtonKey = ref(null)

  function getButtonExecutionKey(buttonId, additionalData) {
    const itemKey = activeItem.value?.showDetails?.key
      ?? activeItem.value?.key
      ?? additionalData?.key
      ?? "unknown"
    return `${itemKey}:${buttonId}`
  }

  function beginButtonExecution(executionKey) {
    if (isExecutingButton.value) {
      // console.log("[gameplaySelector] executeButton blocked, in-progress", executionKey)
      return false
    }
    if (executingButtonKey.value === executionKey) {
      // console.log("[gameplaySelector] executeButton blocked, already executed", executionKey)
      return false
    }
    isExecutingButton.value = true
    executingButtonKey.value = executionKey
    return true
  }

  function resetButtonExecutionGuard() {
    if (isExecutingButton.value || executingButtonKey.value !== null) {
      // console.log("[gameplaySelector] executeButton guard reset")
    }
    isExecutingButton.value = false
    executingButtonKey.value = null
  }

  const hasSelectedItem = computed(() => !!activeItem.value)
  const isClusterDisplayed = computed(() => activeCluster.value !== null)
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
    } else {
      screenHeaderTitle.value = $translate.instant(DEFAULT_SCREEN_HEADER_TITLE)
    }
  }

  // The Lua snapshot's `path.keys` is the single source of truth for cluster
  // identity: root snapshots resolve to ["allGameplay"], cluster snapshots use
  // the selected cluster's gotoPath. Anything else is treated as root.
  function applyClusterFromSnapshot(snapshotPayload) {
    const pathKeys = snapshotPayload?.path?.keys
    if (!Array.isArray(pathKeys) || pathKeys.length === 0) {
      activeCluster.value = null
      return
    }

    const isRootPath = pathKeys.length === 1 && pathKeys[0] === ALL_GAMEPLAY_PATH.keys[0]
    activeCluster.value = isRootPath ? null : [...pathKeys]
  }

  function applySnapshot(snapshotPayload) {
    if (!isPlainObject(snapshotPayload)) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "groups")) {
      groups.value = normalizeGroups(snapshotPayload.groups)
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

  function hydrateFromSnapshot(snapshotPayload) {
    if (!isPlainObject(snapshotPayload)) {
      return false
    }

    nextRequestId("groups")
    applySnapshot(snapshotPayload)
    applyClusterFromSnapshot(snapshotPayload)
    clearActiveItem()
    resetButtonExecutionGuard()
    isLoadingGroups.value = false
    return true
  }

  // Apply a snapshot returned by an in-place Lua refresh (e.g. display option
  // change). Unlike hydrateFromSnapshot, this keeps the current selection and
  // cluster state because the user did not navigate; only the display options
  // changed. Request sequencing keeps rapid control changes from applying
  // out-of-order payloads.
  function applyDisplayRefreshSnapshot(snapshotPayload, requestId) {
    if (!isPlainObject(snapshotPayload)) {
      return false
    }
    if (!isCurrentRequest("groups", requestId)) {
      return false
    }
    applySnapshot(snapshotPayload)
    return true
  }

  function handleDetailsPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      logger.debug("Ignoring gameplay details payload with invalid request id", payload?.requestId)
      return
    }

    if (!isCurrentRequest("details", payloadRequestId)) {
      logger.debug("Ignoring stale gameplay details payload", payloadRequestId)
      return
    }

    if (!isPlainObject(payload.item)) {
      return
    }

    activeItem.value = payload.item
    activeItemDetails.value = isPlainObject(payload.details) ? payload.details : null
    detailsMode.value = DEFAULT_DETAILS_MODE
  }

  function handleDisplayRefreshPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      logger.debug("Ignoring gameplay display refresh payload with invalid request id", payload?.requestId)
      return
    }

    applyDisplayRefreshSnapshot(payload.snapshot, payloadRequestId)
  }

  // Initial async load completion from Lua (asyncBulkLoader.loadGameplaySelector
  // finished and ui_gameplaySelector_general built a fresh route snapshot).
  // This replaces the synchronous routeData snapshot path used during mount;
  // the view reacts to `dataLoadedSignal` to run post-hydration work.
  function handleDataLoadedPayload(payload) {
    console.log("[useGameplaySelector] GameplaySelectorDataLoaded received", payload)
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }
    if (!isPlainObject(payload.snapshot)) {
      logger.debug("Ignoring gameplay data loaded payload with missing snapshot", payload)
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

  async function navigateToCluster(itemOrPath) {
    const luaPayload = buildClusterLuaPayload(itemOrPath)
    if (!luaPayload) {
      return false
    }

    nextRequestId("groups")
    isLoadingGroups.value = true
    clearActiveItem()
    resetButtonExecutionGuard()

    try {
      await lua.ui_gameplaySelector_general.navigateToCluster(luaPayload)
      return true
    } catch (error) {
      isLoadingGroups.value = false
      logger.error("Gameplay selector cluster navigation failed:", error)
      return false
    }
  }

  function setDetailsMode(mode) {
    detailsMode.value = mode
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
      logger.error("Gameplay selector set search text failed:", error)
      return false
    }
  }

  async function toggleFilter(propName, option) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.toggleFilter(BACKEND_NAME, propName, option, requestId)
      return true
    } catch (error) {
      logger.error("Gameplay selector toggle filter failed:", error)
      return false
    }
  }

  async function updateRangeFilter(propName, min, max) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.updateRangeFilter(BACKEND_NAME, propName, min, max, requestId)
      return true
    } catch (error) {
      logger.error("Gameplay selector update range filter failed:", error)
      return false
    }
  }

  async function resetRangeFilter(propName) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.resetRangeFilter(BACKEND_NAME, propName, requestId)
      return true
    } catch (error) {
      logger.error("Gameplay selector reset range filter failed:", error)
      return false
    }
  }

  async function updateDisplayData(key, value) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gameplaySelector_general.setDisplayDataOption(key, value, requestId)
      return true
    } catch (error) {
      logger.error("Gameplay selector update display data failed:", error)
      return false
    }
  }

  async function resetDisplayDataToDefaults() {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gameplaySelector_general.resetDisplayDataToDefaults(requestId)
      return true
    } catch (error) {
      logger.error("Gameplay selector reset display data failed:", error)
      return false
    }
  }

  function clearActiveItem() {
    nextRequestId("details")
    activeItem.value = null
    activeItemDetails.value = null
    autoFocusKey.value = null
  }

  function setAutoFocusKey(focusKey) {
    autoFocusKey.value = normalizeFocusKey(focusKey)
  }

  function setAutoFocusItem(item) {
    autoFocusKey.value = normalizeFocusKey(item?.key)
  }

  // Accepts either a grid tile (`{ showDetails: { key, ... } }`) or an active
  // details payload (`{ key, ... }`) and returns the inner details payload
  // expected by Lua's `toggleFavourite` / `requestDetails`.
  function resolveFavouriteDetails(item) {
    return item?.showDetails || item
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
    const itemDetails = resolveFavouriteDetails(item)
    if (!isPlainObject(itemDetails) || !itemDetails.key) {
      return
    }

    let isFavourite = false
    try {
      isFavourite = !!(await lua.ui_gridSelector.toggleFavourite(BACKEND_NAME, itemDetails))
    } catch (error) {
      logger.error("Gameplay selector toggle favorite failed:", error)
      return
    }

    patchTileFavouriteState(itemDetails.key, isFavourite)

    const activeDetailsKey = activeItem.value?.showDetails?.key ?? activeItem.value?.key
    if (activeItemDetails.value && activeDetailsKey === itemDetails.key) {
      activeItemDetails.value = { ...activeItemDetails.value, isFavourite }
    }

    const detailsRequestId = nextRequestId("details")
    try {
      await lua.ui_gridSelector.requestDetails(BACKEND_NAME, itemDetails, detailsRequestId)
    } catch (error) {
      logger.error("Gameplay selector toggle favorite details refresh failed:", error)
    }
  }

  function exploreFolder(path) {
    lua.ui_gridSelector.exploreFolder(BACKEND_NAME, path)
  }

  function goToMod(modId) {
    lua.ui_gridSelector.goToMod(BACKEND_NAME, modId)
  }

  function selectItem(item) {
    if (item?.gotoPath) {
      navigateToCluster(item)
    }
  }

  async function doubleClickItem(item) {
    if (!item?.doubleClickDetails) {
      return
    }
    const itemKey = item.showDetails?.key ?? item.key ?? "unknown"
    const executionKey = `${itemKey}:doubleClick`
    if (!beginButtonExecution(executionKey)) {
      return
    }
    try {
      await lua.ui_gridSelector.executeDoubleClick(BACKEND_NAME, item.doubleClickDetails)
    } catch (error) {
      resetButtonExecutionGuard()
      logger.error("Gameplay selector double click failed:", error)
    }
  }

  async function focusItem(item) {
    if (!item?.showDetails) return

    const requestId = nextRequestId("details")
    await lua.ui_gridSelector.requestDetails(BACKEND_NAME, item.showDetails, requestId)
  }

  // Scan hydrated groups for a details-capable tile, preferring tiles marked
  // by Lua as the default selection (tiles.lua sets isDefaultSelected on
  // cluster detail paths). Falls back to the first tile with showDetails.
  function findDefaultDetailsItem() {
    const currentGroups = groups.value
    if (!Array.isArray(currentGroups) || currentGroups.length === 0) {
      return null
    }

    let firstDetailsItem = null
    for (const group of currentGroups) {
      const tiles = Array.isArray(group?.tiles) ? group.tiles : []
      for (const tile of tiles) {
        if (!tile?.showDetails) continue
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

  async function requestInitialDetails() {
    const item = findDefaultDetailsItem()
    if (!item) {
      return false
    }
    // Seed autofocus once so the grid panel can scroll/focus to the default
    // tile on initial hydration. Only set when no autofocus is already in
    // place (e.g. seeded by a future snapshot `defaultFocusKey`), and never
    // mutate it from routine focus events to avoid BngList rebuilds.
    if (!autoFocusKey.value) {
      setAutoFocusItem(item)
    }
    await focusItem(item)
    return true
  }

  async function executeButton(buttonId, additionalData) {
    if (buttonId === null || buttonId === undefined) {
      return false
    }
    const executionKey = getButtonExecutionKey(buttonId, additionalData)
    if (!beginButtonExecution(executionKey)) {
      return false
    }
    try {
      //events.emit("LoadingScreen", { active: true })
      await startLoading(async () => {
        await waitForLoadingScreenFadeIn()
        await lua.ui_gridSelector.executeButton(BACKEND_NAME, buttonId, additionalData)
      })
      return true
    } catch (error) {
      resetButtonExecutionGuard()
      logger.error("Gameplay selector execute button failed:", error)
      return false
    }
  }

  // Wait for activeItem/activeItemDetails to reflect the requested item.
  // Resolves as soon as either the snapshot matches the request id or
  // a different request supersedes ours.
  async function awaitDetailsForRequest(requestId, timeoutMs = 1500) {
    if (!isCurrentRequest("details", requestId)) {
      return false
    }
    if (activeItemDetails.value) {
      return true
    }

    return await new Promise(resolve => {
      let resolved = false
      const finish = result => {
        if (resolved) return
        resolved = true
        stopWatch()
        if (timeoutHandle) clearTimeout(timeoutHandle)
        resolve(result)
      }

      const stopWatch = () => {
        if (typeof unwatch === "function") unwatch()
      }

      let unwatch = null
      let timeoutHandle = null

      timeoutHandle = setTimeout(() => finish(false), timeoutMs)

      unwatch = watch(
        [activeItemDetails, () => requestCounter.value.details],
        ([details, currentRequestId]) => {
          if (currentRequestId !== requestId) {
            finish(false)
            return
          }
          if (details) {
            finish(true)
          }
        },
        { flush: "post" }
      )
    })
  }

  function pickDefaultButton(buttonInfo) {
    if (!Array.isArray(buttonInfo) || buttonInfo.length === 0) {
      return null
    }

    const enabledButtons = buttonInfo.filter(button => isPlainObject(button) && !button.disabled)
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

  async function executeDefaultItemAction(item) {
    if (!item?.showDetails) {
      return false
    }
    if (isExecutingButton.value) {
      // console.log("[gameplaySelector] executeDefaultItemAction blocked, button in-progress")
      return false
    }

    const isSameItem = activeItem.value && activeItem.value.key === item.key
    if (!isSameItem || !activeItemDetails.value) {
      const requestId = nextRequestId("details")
      try {
        await lua.ui_gridSelector.requestDetails(BACKEND_NAME, item.showDetails, requestId)
      } catch (error) {
        logger.error("Gameplay selector default action details request failed:", error)
        return false
      }
      const ready = await awaitDetailsForRequest(requestId)
      if (!ready) {
        return false
      }
    }

    const defaultButton = pickDefaultButton(activeItemDetails.value?.buttonInfo)
    if (!defaultButton) {
      return false
    }

    return await executeButton(defaultButton.buttonId, defaultButton)
  }

  events.on(GAMEPLAY_DETAILS_EVENT, handleDetailsPayload)
  events.on(GAMEPLAY_DISPLAY_REFRESH_EVENT, handleDisplayRefreshPayload)
  events.on(GAMEPLAY_DATA_LOADED_EVENT, handleDataLoadedPayload)

  return {
    groups,
    isLoadingGroups,
    detailsMode,
    isAdvancedFiltersExpanded,
    activeCluster,
    isClusterDisplayed,
    hasSelectedItem,
    activeItem,
    activeItemDetails,
    autoFocusKey,
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
    dataLoadedSignal,
    lastLoadedRouteName,
    hydrateFromSnapshot,
    navigateToCluster,
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
    clearActiveItem,
    setAutoFocusKey,
    setAutoFocusItem,
    selectItem,
    doubleClickItem,
    focusItem,
    requestInitialDetails,
    executeButton,
    executeDefaultItemAction,
    isExecutingButton,
    toggleFavourite,
    exploreFolder,
    goToMod,
  }
}
