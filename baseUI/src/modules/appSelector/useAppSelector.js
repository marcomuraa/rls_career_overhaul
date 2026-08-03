import { computed, ref, watch } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import logger from "@/services/logger"
import { $translate } from "@/services/translation"

const BACKEND_NAME = "appSelector"
const APP_SELECTOR_DETAILS_EVENT = "appSelectorDetails"
const APP_SELECTOR_DISPLAY_REFRESH_EVENT = "appSelectorDisplayDataSnapshot"
const ALL_APPS_PATH = Object.freeze({ keys: ["allApps"] })
const DEFAULT_DETAILS_MODE = "detail"
const DEFAULT_SCREEN_HEADER_TITLE_KEY = "ui.dashboard.appedit"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
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

function normalizePath(pathPayload) {
  const pathKeys = pathPayload?.keys
  if (!Array.isArray(pathKeys) || pathKeys.length === 0) {
    return { keys: [...ALL_APPS_PATH.keys] }
  }
  return { keys: [...pathKeys] }
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

export default function useAppSelector() {
  const events = useEvents()

  const path = ref({ keys: [...ALL_APPS_PATH.keys] })
  const groups = ref([])
  const isLoadingGroups = ref(true)
  const detailsMode = ref(DEFAULT_DETAILS_MODE)
  const isAdvancedFiltersExpanded = ref(false)

  const activeItem = ref(null)
  const activeItemDetails = ref(null)
  const pendingDetailsItem = ref(null)

  const searchText = ref("")
  const filterList = ref([])
  const filterByProp = ref({})
  const commonFilters = ref([])
  const lockedFiltersByProp = ref({})
  const activeFilters = ref([])
  const onlyCommonFilters = ref(true)
  const displayData = ref([])
  const managementDetails = ref({})
  const screenHeaderTitle = ref($translate.instant(DEFAULT_SCREEN_HEADER_TITLE_KEY))

  const requestCounter = ref({
    groups: 0,
    details: 0,
  })

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
    screenHeaderTitle.value = $translate.instant(DEFAULT_SCREEN_HEADER_TITLE_KEY)
  }

  function applySnapshot(snapshotPayload) {
    if (!isPlainObject(snapshotPayload)) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(snapshotPayload, "path")) {
      path.value = normalizePath(snapshotPayload.path)
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
    clearActiveItem()
    isLoadingGroups.value = false
    return true
  }

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

  function resolveDetailsRequestPayload(item) {
    if (isPlainObject(item?.showDetails)) {
      return item.showDetails
    }
    if (isPlainObject(item)) {
      return item
    }
    return null
  }

  async function requestDetails(item) {
    const detailsPayload = resolveDetailsRequestPayload(item)
    if (!detailsPayload) {
      return false
    }

    const requestId = nextRequestId("details")
    pendingDetailsItem.value = item

    try {
      await lua.ui_appSelector_general.requestDetails(detailsPayload, requestId)
      return true
    } catch (error) {
      logger.error("App selector details request failed:", error)
      if (isCurrentRequest("details", requestId)) {
        pendingDetailsItem.value = null
      }
      return false
    }
  }

  function handleDetailsPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      logger.debug("Ignoring app selector details payload with invalid request id", payload?.requestId)
      return
    }

    if (!isCurrentRequest("details", payloadRequestId)) {
      logger.debug("Ignoring stale app selector details payload", payloadRequestId)
      return
    }

    const resolvedItem = isPlainObject(payload.item) ? payload.item : pendingDetailsItem.value
    activeItem.value = resolvedItem
    activeItemDetails.value = isPlainObject(payload.details) ? payload.details : null
    pendingDetailsItem.value = null
    detailsMode.value = DEFAULT_DETAILS_MODE
  }

  function handleDisplayRefreshPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }

    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      logger.debug("Ignoring app selector display refresh payload with invalid request id", payload?.requestId)
      return
    }

    applyDisplayRefreshSnapshot(payload.snapshot, payloadRequestId)
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
      logger.error("App selector set search text failed:", error)
      return false
    }
  }

  async function toggleFilter(propName, option) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.toggleFilter(BACKEND_NAME, propName, option, requestId)
      return true
    } catch (error) {
      logger.error("App selector toggle filter failed:", error)
      return false
    }
  }

  async function updateRangeFilter(propName, min, max) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.updateRangeFilter(BACKEND_NAME, propName, min, max, requestId)
      return true
    } catch (error) {
      logger.error("App selector update range filter failed:", error)
      return false
    }
  }

  async function resetRangeFilter(propName) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_gridSelector.resetRangeFilter(BACKEND_NAME, propName, requestId)
      return true
    } catch (error) {
      logger.error("App selector reset range filter failed:", error)
      return false
    }
  }

  async function updateDisplayData(key, value) {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_appSelector_general.setDisplayDataOption(key, value, requestId)
      return true
    } catch (error) {
      logger.error("App selector update display data failed:", error)
      return false
    }
  }

  async function resetDisplayDataToDefaults() {
    const requestId = nextRequestId("groups")
    try {
      await lua.ui_appSelector_general.resetDisplayDataToDefaults(requestId)
      return true
    } catch (error) {
      logger.error("App selector reset display data failed:", error)
      return false
    }
  }

  function clearActiveItem() {
    nextRequestId("details")
    activeItem.value = null
    activeItemDetails.value = null
    pendingDetailsItem.value = null
  }

  async function toggleFavourite(item = activeItem.value) {
    const itemDetails = resolveDetailsRequestPayload(item)
    if (!itemDetails || !itemDetails.appName) {
      return false
    }

    try {
      await lua.ui_gridSelector.toggleFavourite(BACKEND_NAME, itemDetails)
      return true
    } catch (error) {
      logger.error("App selector toggle favorite failed:", error)
      return false
    }
  }

  async function selectItem(item) {
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
      logger.error("App selector execute double click failed:", error)
      return false
    }
  }

  async function focusItem(item) {
    return await requestDetails(item)
  }

  function findDefaultDetailsItem() {
    const currentGroups = groups.value
    if (!Array.isArray(currentGroups) || currentGroups.length === 0) {
      return null
    }

    for (const group of currentGroups) {
      const tiles = Array.isArray(group?.tiles) ? group.tiles : []
      for (const tile of tiles) {
        if (tile?.showDetails) {
          return tile
        }
      }
    }
    return null
  }

  async function requestInitialDetails() {
    const item = findDefaultDetailsItem()
    if (!item) {
      return false
    }
    return await requestDetails(item)
  }

  async function executeButton(buttonId, additionalData) {
    if (buttonId === null || buttonId === undefined) {
      return false
    }
    try {
      await lua.ui_gridSelector.executeButton(BACKEND_NAME, buttonId, additionalData)
      return true
    } catch (error) {
      logger.error("App selector execute button failed:", error)
      return false
    }
  }

  async function awaitDetailsForRequest(requestId, timeoutMs = 1500) {
    if (!isCurrentRequest("details", requestId)) {
      return false
    }
    if (activeItemDetails.value) {
      return true
    }

    return await new Promise(resolve => {
      let resolved = false

      function finish(result) {
        if (resolved) {
          return
        }
        resolved = true
        stopWatch()
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
        resolve(result)
      }

      function stopWatch() {
        if (typeof unwatch === "function") {
          unwatch()
        }
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

  async function executeDefaultItemAction(item) {
    if (!item?.showDetails) {
      return false
    }

    const isSameItem = activeItem.value && activeItem.value.key === item.key
    if (!isSameItem || !activeItemDetails.value) {
      const requestId = nextRequestId("details")
      pendingDetailsItem.value = item
      try {
        await lua.ui_appSelector_general.requestDetails(item.showDetails, requestId)
      } catch (error) {
        logger.error("App selector default action details request failed:", error)
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

  events.on(APP_SELECTOR_DETAILS_EVENT, handleDetailsPayload)
  events.on(APP_SELECTOR_DISPLAY_REFRESH_EVENT, handleDisplayRefreshPayload)

  return {
    path,
    groups,
    isLoadingGroups,
    detailsMode,
    isAdvancedFiltersExpanded,
    hasSelectedItem,
    activeItem,
    activeItemDetails,
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
    setAdvancedFiltersExpanded,
    showAdvancedFilters,
    resetAdvancedFiltersView,
    isFilterLocked,
    isFilterOptionLocked,
    isRangeFilterLocked,
    clearActiveItem,
    selectItem,
    doubleClickItem,
    focusItem,
    requestDetails,
    requestInitialDetails,
    executeButton,
    executeDefaultItemAction,
    toggleFavourite,
  }
}
