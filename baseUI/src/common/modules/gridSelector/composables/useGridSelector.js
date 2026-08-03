import { ref, watch, onUnmounted, computed } from "vue"
import { lua, useBridge } from "@/bridge"
import { startLoading, waitForLoadingScreenFadeIn } from "@/services/screenCover"
import logger from "@/services/logger"

const DEFAULT_SCREEN_HEADER_TITLE = "Grid Selector"
const DEFAULT_SCREEN_HEADER_PATH = Object.freeze([{ label: "ui.common.menu", gotoAngularState: "menu" }])
const REFRESH_SLICE_KEYS = Object.freeze(["filters", "tiles", "displayData", "searchText", "managementDetails", "header"])

function warnContract(backendName, context, message, payload = undefined) {
  if (payload === undefined) {
    logger.warn(`[gridSelector:${backendName}] ${context} - ${message}`)
    return
  }
  logger.warn(`[gridSelector:${backendName}] ${context} - ${message}`, payload)
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function createDefaultHeaderPath() {
  return DEFAULT_SCREEN_HEADER_PATH.map(segment => ({ ...segment }))
}

function normalizePath(path, { backendName = "gridSelector", context = "path" } = {}) {
  const sourceKeys = Array.isArray(path)
    ? path
    : isPlainObject(path) && Array.isArray(path.keys)
      ? path.keys
      : null

  if (!sourceKeys) {
    if (path !== null && path !== undefined) {
      warnContract(backendName, context, "Expected path to be an array or { keys: [] }, using empty path.", path)
    }
    return { keys: [] }
  }

  const normalizedKeys = []
  for (let index = 0; index < sourceKeys.length; index += 1) {
    const segment = sourceKeys[index]
    if (segment === null || segment === undefined) {
      warnContract(backendName, context, `Ignoring empty path segment at index ${index}.`)
      continue
    }

    const segmentType = typeof segment
    if (segmentType === "string" || segmentType === "number" || segmentType === "boolean") {
      normalizedKeys.push(String(segment))
      continue
    }

    warnContract(backendName, context, `Ignoring invalid path segment type '${segmentType}' at index ${index}.`, segment)
  }

  return { keys: normalizedKeys }
}

function getPathKey(path, backendName) {
  return normalizePath(path, { backendName, context: "getPathKey" }).keys.join("/")
}

function normalizeSearchTextPayload(searchText, backendName, context = "searchText") {
  if (typeof searchText === "string") {
    return searchText
  }
  if (searchText === null || searchText === undefined) {
    return ""
  }
  warnContract(backendName, context, "Search text payload was not a string, coercing to string.", searchText)
  return String(searchText)
}

function normalizeTilePayload(tile, backendName, context, groupIndex, tileIndex) {
  if (!isPlainObject(tile)) {
    warnContract(backendName, context, `Skipping malformed tile at group ${groupIndex}, index ${tileIndex}.`, tile)
    return null
  }

  const normalizedTile = { ...tile }
  if (!normalizedTile.key) {
    normalizedTile.key = `__missing_tile_key_${backendName}_${groupIndex}_${tileIndex}`
    warnContract(
      backendName,
      context,
      `Tile at group ${groupIndex}, index ${tileIndex} is missing key. Generated '${normalizedTile.key}'.`,
      tile
    )
  }
  return normalizedTile
}

function normalizeGroupsPayload(groups, backendName, context = "groups") {
  if (!Array.isArray(groups)) {
    if (groups !== null && groups !== undefined) {
      warnContract(backendName, context, "Expected groups payload to be an array, using [].", groups)
    }
    return []
  }

  const normalizedGroups = []
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]
    if (!isPlainObject(group)) {
      warnContract(backendName, context, `Skipping malformed group at index ${groupIndex}.`, group)
      continue
    }

    const sourceTiles = Array.isArray(group.tiles) ? group.tiles : []
    if (!Array.isArray(group.tiles)) {
      warnContract(backendName, context, `Group at index ${groupIndex} had non-array tiles, using [].`, group.tiles)
    }

    const normalizedTiles = []
    for (let tileIndex = 0; tileIndex < sourceTiles.length; tileIndex += 1) {
      const normalizedTile = normalizeTilePayload(sourceTiles[tileIndex], backendName, context, groupIndex, tileIndex)
      if (normalizedTile) {
        normalizedTiles.push(normalizedTile)
      }
    }

    normalizedGroups.push({
      ...group,
      isRecentGroup: !!group.isRecentGroup,
      tiles: normalizedTiles,
    })
  }

  return normalizedGroups
}

function normalizeFiltersPayload(data, backendName, context = "filters") {
  const source = isPlainObject(data) ? data : {}
  if (!isPlainObject(data) && data !== null && data !== undefined) {
    warnContract(backendName, context, "Expected filters payload object, using defaults.", data)
  }

  if (source.filterByProp !== undefined && !isPlainObject(source.filterByProp)) {
    warnContract(backendName, context, "filterByProp was not an object, using {}.", source.filterByProp)
  }
  if (source.lockedFiltersByProp !== undefined && !isPlainObject(source.lockedFiltersByProp)) {
    warnContract(backendName, context, "lockedFiltersByProp was not an object, using {}.", source.lockedFiltersByProp)
  }

  return {
    filterList: Array.isArray(source.filterList) ? source.filterList : [],
    filterByProp: isPlainObject(source.filterByProp) ? source.filterByProp : {},
    commonFilters: Array.isArray(source.commonFilters) ? source.commonFilters : [],
    lockedFiltersByProp: isPlainObject(source.lockedFiltersByProp) ? source.lockedFiltersByProp : {},
    activeFilters: Array.isArray(source.activeFilters) ? source.activeFilters : [],
    onlyCommonFilters: source.onlyCommonFilters !== false,
  }
}

function normalizeDisplayDataPayload(data, backendName, context = "displayData") {
  if (Array.isArray(data)) {
    return data
  }
  if (data !== null && data !== undefined) {
    warnContract(backendName, context, "Expected displayData payload to be an array, using [].", data)
  }
  return []
}

function normalizeHeaderPayload(headerData, backendName, context = "header") {
  const source = isPlainObject(headerData) ? headerData : {}
  if (!isPlainObject(headerData) && headerData !== null && headerData !== undefined) {
    warnContract(backendName, context, "Expected header payload object, using defaults.", headerData)
  }

  let pathSegments = createDefaultHeaderPath()
  if (Array.isArray(source.pathSegments)) {
    const normalizedSegments = source.pathSegments.filter(segment => {
      if (isPlainObject(segment)) {
        return true
      }
      warnContract(backendName, context, "Ignoring malformed header path segment.", segment)
      return false
    })
    if (normalizedSegments.length > 0) {
      pathSegments = normalizedSegments.map(segment => ({ ...segment }))
    }
  } else if (source.pathSegments !== undefined) {
    warnContract(backendName, context, "pathSegments was not an array, using default breadcrumb.", source.pathSegments)
  }

  return {
    title: typeof source.title === "string" && source.title !== "" ? source.title : DEFAULT_SCREEN_HEADER_TITLE,
    pathSegments,
  }
}

function normalizeManagementDetailsPayload(data, backendName, context = "managementDetails") {
  if (isPlainObject(data)) {
    return { ...data }
  }
  if (data !== null && data !== undefined) {
    warnContract(backendName, context, "Expected managementDetails payload object, using {}.", data)
  }
  return {}
}

function normalizeSelectorSnapshot(snapshot, backendName, context = "selectorSnapshot") {
  const source = isPlainObject(snapshot) ? snapshot : {}
  if (!isPlainObject(snapshot) && snapshot !== null && snapshot !== undefined) {
    warnContract(backendName, context, "Expected snapshot object, using defaults.", snapshot)
  }

  const snapshotBackendName =
    typeof source.backendName === "string" && source.backendName.length > 0
      ? source.backendName
      : backendName

  return {
    backendName: snapshotBackendName,
    path: normalizePath(source.path, { backendName: snapshotBackendName, context: `${context}.path` }),
    groups: normalizeGroupsPayload(source.groups, snapshotBackendName, `${context}.groups`),
    filters: normalizeFiltersPayload(source.filters, snapshotBackendName, `${context}.filters`),
    displayData: normalizeDisplayDataPayload(source.displayData, snapshotBackendName, `${context}.displayData`),
    searchText: normalizeSearchTextPayload(source.searchText, snapshotBackendName, `${context}.searchText`),
    managementDetails: normalizeManagementDetailsPayload(source.managementDetails, snapshotBackendName, `${context}.managementDetails`),
    header: normalizeHeaderPayload(source.header, snapshotBackendName, `${context}.header`),
    defaultFocusKey:
      source.defaultFocusKey === null || source.defaultFocusKey === undefined || source.defaultFocusKey === ""
        ? null
        : String(source.defaultFocusKey),
  }
}

function normalizeRefreshSliceRequest(request = {}) {
  const source = isPlainObject(request) ? request : {}
  const normalizedRequest = {}

  for (const key of REFRESH_SLICE_KEYS) {
    normalizedRequest[key] = source[key] === true
  }

  return normalizedRequest
}

function hasRequestedSlices(request) {
  for (const key of REFRESH_SLICE_KEYS) {
    if (request[key]) {
      return true
    }
  }
  return false
}

function normalizeDetailsCacheKey(showDetails, backendName, context = "detailsCacheKey") {
  if (showDetails === null || showDetails === undefined) {
    return null
  }

  if (isPlainObject(showDetails)) {
    if (typeof showDetails.key === "string" && showDetails.key !== "") {
      return showDetails.key
    }
    try {
      return JSON.stringify(showDetails)
    } catch (error) {
      warnContract(backendName, context, "Failed to serialize showDetails payload for details cache key.", showDetails)
      return null
    }
  }

  if (typeof showDetails === "string" || typeof showDetails === "number" || typeof showDetails === "boolean") {
    return String(showDetails)
  }

  warnContract(backendName, context, "Unsupported showDetails payload for details cache key.", showDetails)
  return null
}

function cloneDetailsPayload(detailsPayload) {
  if (detailsPayload === null || detailsPayload === undefined) {
    return detailsPayload
  }
  if (typeof globalThis.structuredClone === "function") {
    try {
      return globalThis.structuredClone(detailsPayload)
    } catch (error) {
      return detailsPayload
    }
  }
  return detailsPayload
}

export default function useGridSelector(backendName = "vehicleSelector", defaultPath = { keys: ["missions"] }, defaultDetailsMode = "detail", shouldUseDefaultSelection = true) {

  // State
  const currentPath = ref(normalizePath(defaultPath, { backendName, context: "defaultPath" }))
  const previousPathKey = ref(null)

  const groups = ref([])
  const filterList = ref([])
  const filterByProp = ref({})
  const commonFilters = ref([])
  const lockedFiltersByProp = ref({})
  const activeFilters = ref([])
  const onlyCommonFilters = ref(true)
  const detailsMode = ref(defaultDetailsMode) // "advanced", "filter", "detail"
  const selectedItem = ref(null)
  const selectedItemDetails = ref(null)
  const prevSelectedItem = ref(null)
  // Hovered or focusframe preview item that is not yet selected
  const previewItem = ref(null)
  const previewItemDetails = ref(null)
  const managementDetails = ref({})
  const displayData = ref([])
  const searchText = ref("")
  const autoFocusKey = ref(null)
  // Screen header state
  const screenHeaderTitle = ref(DEFAULT_SCREEN_HEADER_TITLE)
  const screenHeaderPath = ref(createDefaultHeaderPath())
  const { events } = useBridge()

  const requestCounters = {
    tiles: 0,
    selectedDetails: 0,
    previewDetails: 0,
    screenHeader: 0,
    managementDetails: 0,
    refresh: 0,
  }
  const runtimeMetrics = {
    refreshCalls: 0,
    loadTilesCalls: 0,
    refreshBySource: {},
  }

  function recordRuntimeMetric(metricName, source = "unknown") {
    if (metricName === "refresh") {
      runtimeMetrics.refreshCalls += 1
      runtimeMetrics.refreshBySource[source] = (runtimeMetrics.refreshBySource[source] || 0) + 1
      logger.debug("GridSelector.metrics.refresh", {
        backendName,
        source,
        refreshCalls: runtimeMetrics.refreshCalls,
        loadTilesCalls: runtimeMetrics.loadTilesCalls,
        refreshBySource: runtimeMetrics.refreshBySource,
      })
      return
    }

    if (metricName === "loadTiles") {
      runtimeMetrics.loadTilesCalls += 1
      logger.debug("GridSelector.metrics.loadTiles", {
        backendName,
        source,
        refreshCalls: runtimeMetrics.refreshCalls,
        loadTilesCalls: runtimeMetrics.loadTilesCalls,
      })
    }
  }

  function canUseDefaultSelection() {
    return typeof shouldUseDefaultSelection === "function"
      ? shouldUseDefaultSelection() !== false
      : shouldUseDefaultSelection !== false
  }

  const nextRequestCounter = key => {
    requestCounters[key] = (requestCounters[key] || 0) + 1
    return requestCounters[key]
  }

  const isCurrentRequest = (key, requestId) => requestCounters[key] === requestId

  // Force select tile callback
  let backFromDetailsCallback = null
  const detailsCache = new Map()

  function getDetailsCacheKey(showDetails, context = "detailsCacheKey") {
    return normalizeDetailsCacheKey(showDetails, backendName, context)
  }

  function invalidateDetailsCache() {
    detailsCache.clear()
  }

  function invalidateDetailsCacheForShowDetails(showDetails, context = "invalidateDetailsCacheForShowDetails") {
    const cacheKey = getDetailsCacheKey(showDetails, context)
    if (!cacheKey) {
      return
    }
    detailsCache.delete(cacheKey)
  }

  function applyFiltersSlice(payload, context = "applyFiltersSlice") {
    const normalizedFilters = normalizeFiltersPayload(payload, backendName, context)
    filterList.value = normalizedFilters.filterList
    filterByProp.value = normalizedFilters.filterByProp
    commonFilters.value = normalizedFilters.commonFilters
    lockedFiltersByProp.value = normalizedFilters.lockedFiltersByProp
    activeFilters.value = normalizedFilters.activeFilters
    onlyCommonFilters.value = normalizedFilters.onlyCommonFilters
  }

  function applyDisplayDataSlice(payload, context = "applyDisplayDataSlice") {
    displayData.value = normalizeDisplayDataPayload(payload, backendName, context)
    const searchOption = displayData.value.find(option => option.key === "searchText")
    if (searchOption) {
      searchText.value = normalizeSearchTextPayload(searchOption.value, backendName, `${context}.searchOption`)
    }
  }

  function applyManagementDetailsSlice(payload, context = "applyManagementDetailsSlice") {
    managementDetails.value = normalizeManagementDetailsPayload(payload, backendName, context)
  }

  function applyHeaderSlice(payload, context = "applyHeaderSlice") {
    const normalizedHeaderData = normalizeHeaderPayload(payload, backendName, context)
    screenHeaderTitle.value = normalizedHeaderData.title
    screenHeaderPath.value = normalizedHeaderData.pathSegments
  }

  function applyTilesSlice(payload, path, context = "applyTilesSlice") {
    groups.value = normalizeGroupsPayload(payload, backendName, context)
    const normalizedPath = normalizePath(path, { backendName, context: `${context}.path` })
    previousPathKey.value = getPathKey(normalizedPath, backendName)
  }

  function applySelectorSlices(payload, requestedSlices) {
    const pendingSlices = { ...requestedSlices }
    if (!isPlainObject(payload)) {
      return pendingSlices
    }

    const payloadPath = Object.prototype.hasOwnProperty.call(payload, "path")
      ? payload.path
      : currentPath.value

    if (requestedSlices.filters && Object.prototype.hasOwnProperty.call(payload, "filters")) {
      applyFiltersSlice(payload.filters, "applySelectorSlices.filters")
      pendingSlices.filters = false
    }

    if (requestedSlices.displayData && Object.prototype.hasOwnProperty.call(payload, "displayData")) {
      applyDisplayDataSlice(payload.displayData, "applySelectorSlices.displayData")
      pendingSlices.displayData = false
    }

    if (requestedSlices.searchText && Object.prototype.hasOwnProperty.call(payload, "searchText")) {
      searchText.value = normalizeSearchTextPayload(payload.searchText, backendName, "applySelectorSlices.searchText")
      pendingSlices.searchText = false
    }

    if (requestedSlices.tiles && Object.prototype.hasOwnProperty.call(payload, "groups")) {
      applyTilesSlice(payload.groups, payloadPath, "applySelectorSlices.groups")
      if (Object.prototype.hasOwnProperty.call(payload, "defaultFocusKey")) {
        autoFocusKey.value = payload.defaultFocusKey === null || payload.defaultFocusKey === undefined || payload.defaultFocusKey === ""
          ? null
          : String(payload.defaultFocusKey)
        console.log("autoFocusKey", autoFocusKey.value)
      }
      pendingSlices.tiles = false
    }

    if (requestedSlices.managementDetails && Object.prototype.hasOwnProperty.call(payload, "managementDetails")) {
      applyManagementDetailsSlice(payload.managementDetails, "applySelectorSlices.managementDetails")
      pendingSlices.managementDetails = false
    }

    if (requestedSlices.header && Object.prototype.hasOwnProperty.call(payload, "header")) {
      applyHeaderSlice(payload.header, "applySelectorSlices.header")
      pendingSlices.header = false
    }

    return pendingSlices
  }

  async function refreshSelectorData(request = {}) {
    const refreshSource = typeof request?.source === "string" && request.source.length > 0
      ? request.source
      : "unspecified"
    recordRuntimeMetric("refresh", refreshSource)
    const requestedSlices = normalizeRefreshSliceRequest(request)
    if (!hasRequestedSlices(requestedSlices)) {
      return
    }

    if (requestedSlices.tiles) {
      invalidateDetailsCache()
    }

    const requestId = nextRequestCounter("refresh")
    const pathToLoad = normalizePath(currentPath.value, { backendName, context: "refreshSelectorData.currentPath" })
    let pendingSlices = { ...requestedSlices }

    const sliceMethodName =
      typeof lua.ui_gridSelector.getSelectorSnapshotSlices === "function"
        ? "getSelectorSnapshotSlices"
        : typeof lua.ui_gridSelector.getSelectorRefresh === "function"
          ? "getSelectorRefresh"
          : null

    if (sliceMethodName) {
      try {
        const payload = await lua.ui_gridSelector[sliceMethodName](backendName, pathToLoad, requestedSlices)
        if (!isCurrentRequest("refresh", requestId)) {
          return
        }
        pendingSlices = applySelectorSlices(payload, requestedSlices)
      } catch (error) {
        if (!isCurrentRequest("refresh", requestId)) {
          return
        }
        logger.debug("GridSelector targeted refresh failed, falling back to individual calls.", error)
      }
    }

    if (!isCurrentRequest("refresh", requestId)) {
      return
    }

    if (pendingSlices.filters) {
      await loadFilters()
      if (!isCurrentRequest("refresh", requestId)) return
    }

    if (pendingSlices.displayData) {
      await loadDisplayData()
      if (!isCurrentRequest("refresh", requestId)) return
    }

    if (pendingSlices.searchText) {
      await getSearchText()
      if (!isCurrentRequest("refresh", requestId)) return
    }

    if (pendingSlices.tiles) {
      await loadTiles()
      if (!isCurrentRequest("refresh", requestId)) return
    }

    if (pendingSlices.managementDetails) {
      await loadManagementDetails()
      if (!isCurrentRequest("refresh", requestId)) return
    }

    if (pendingSlices.header) {
      await updateScreenHeaderData()
    }
  }

  // Store the event handler reference for cleanup
  const refreshAllHandler = async targetBackendName => {
    if (targetBackendName !== backendName) return
    // Legacy compatibility path: route-owned opens should hydrate from route snapshot/reload.
    logger.debug("gridSelectorRefreshAll")
    await refreshSelectorData({
      filters: true,
      tiles: true,
      displayData: true,
      searchText: true,
      managementDetails: true,
      header: true,
    })
  }
  const refreshCurrentItemDetailsHandler = async targetBackendName => {
    if (targetBackendName !== backendName) return
    logger.debug("gridSelectorRefreshCurrentItemDetails")
    invalidateDetailsCacheForShowDetails(selectedItem.value?.showDetails, "refreshCurrentItemDetailsHandler")
    await setSelectedItem(selectedItem.value, { forceRefresh: true })
  }

  events.on("gridSelectorRefreshAll", refreshAllHandler)
  events.on("gridSelectorRefreshCurrentItemDetails", refreshCurrentItemDetailsHandler)

  const log = () => {
    //logger.debug("gridSelectorStore", ...args)
  }

  async function getSearchText() {
    try {
      const data = await lua.ui_gridSelector.getSearchText(backendName)
      const normalizedSearchText = normalizeSearchTextPayload(data, backendName, "getSearchText.response")
      searchText.value = normalizedSearchText
      return normalizedSearchText
    } catch (error) {
      logger.error("Failed to get search text:", error)
      return ""
    }
  }

  async function setSearchText(value) {
    return setSearchTextInternal(value, { refresh: true })
  }

  async function setSearchTextInternal(value, { refresh = true } = {}) {
    try {
      const normalizedSearchText = normalizeSearchTextPayload(value, backendName, "setSearchText.input")
      if (searchText.value === normalizedSearchText) {
        return false
      }
      await lua.ui_gridSelector.setSearchText(backendName, normalizedSearchText)
      searchText.value = normalizedSearchText
      if (refresh) {
        await refreshSelectorData({ filters: true, tiles: true, header: true })
      }
      return true
    } catch (error) {
      logger.error("Failed to set search text:", error)
      return false
    }
  }

  function setSearchTextSilently(value) {
    const normalizedSearchText = normalizeSearchTextPayload(value, backendName, "setSearchTextSilently.input")
    searchText.value = normalizedSearchText
  }

  // Loading state
  const isInitializing = ref(false)

  // transforms an object into an array, if the object is empty
  const safeArray = arr => Array.isArray(arr) ? arr : []

  async function setCurrentPath(path) {
    return setCurrentPathInternal(path, { refresh: true })
  }

  async function setCurrentPathInternal(path, { refresh = true } = {}) {
    const normalizedPath = normalizePath(path, { backendName, context: "setCurrentPath" })
    log("Setting current path:", normalizedPath)
    currentPath.value = normalizedPath
    if (refresh) {
      await refreshSelectorData({ tiles: true })
    }
    return true
  }

  function setCurrentPathSilently(path) {
    const normalizedPath = normalizePath(path, { backendName, context: "setCurrentPathSilently" })
    currentPath.value = normalizedPath
  }

  // Actions
  async function loadTiles() {
    recordRuntimeMetric("loadTiles", "loadTiles")
    log("Loading tiles...", currentPath.value)
    const requestId = nextRequestCounter("tiles")
    const pathToLoad = normalizePath(currentPath.value, { backendName, context: "loadTiles.currentPath" })
    const pathKey = getPathKey(pathToLoad, backendName)
    const didPathChange = previousPathKey.value !== pathKey
    try {
      const data = await lua.ui_gridSelector.getTiles(backendName, pathToLoad, didPathChange)
      if (!isCurrentRequest("tiles", requestId)) {
        return
      }
      lua.ui_gridSelector.profilerFinish(backendName, "received lua data on UI")
      log("Received tiles:", data)
      groups.value = normalizeGroupsPayload(data, backendName, "loadTiles.response")
      log("groups", groups.value)
      // figure out the default selected tile only if path changed
      if (canUseDefaultSelection() && !selectedItem.value && (detailsMode.value === "advanced" || detailsMode.value === "detail") && didPathChange) {
        for (const group of groups.value) {
          for (const tile of group.tiles) {
            if (tile.isDefaultSelected) {
              //setSelectedItem(tile)
              autoFocusKey.value = tile.key
              console.log("autoFocusKey set", autoFocusKey.value)
              log("Default selected tile:", tile.name, tile)
              if (tile.forceAutoFocus) {
                backFromDetailsCallback?.()
              }
            }
          }
        }
      }
      previousPathKey.value = pathKey
      lua.ui_gridSelector.profilerFinish(backendName, "loaded tiles into reactive state")
    } catch (error) {
      logger.error("Failed to load tiles:", error)
    }
  }

  async function loadFilters() {
    log("Loading filters...")
    try {
      const data = await lua.ui_gridSelector.getFilters(backendName)
      const normalizedFilters = normalizeFiltersPayload(data, backendName, "loadFilters.response")
      filterList.value = normalizedFilters.filterList
      filterByProp.value = normalizedFilters.filterByProp
      commonFilters.value = normalizedFilters.commonFilters
      lockedFiltersByProp.value = normalizedFilters.lockedFiltersByProp
      activeFilters.value = normalizedFilters.activeFilters
      onlyCommonFilters.value = normalizedFilters.onlyCommonFilters
      log("Received filters:", filterList.value, filterByProp.value, activeFilters.value, onlyCommonFilters.value)
    } catch (error) {
      logger.error("Failed to load filters:", error)
    }
  }

  async function loadManagementDetails() {
    log("Loading management details...")
    const requestId = nextRequestCounter("managementDetails")
    try {
      const data = await lua.ui_gridSelector.getManagementDetails(backendName)
      if (!isCurrentRequest("managementDetails", requestId)) {
        return
      }
      managementDetails.value = normalizeManagementDetailsPayload(data, backendName, "loadManagementDetails.response")
      log("Received management details:", managementDetails.value)
    } catch (error) {
      logger.error("Failed to load management details:", error)
    }
  }

  const refreshFilterAndTileSlices = async () => {
    await refreshSelectorData({ filters: true, tiles: true, header: true })
  }

  async function toggleFilter(propName, option) {
    return toggleFilterInternal(propName, option, { refresh: true })
  }

  async function toggleFilterInternal(propName, option, { refresh = true } = {}) {
    log("Toggling filter:", propName, option)
    try {
      // Call Lua to toggle the filter and get updated filterByProp and activeFilters
      await lua.ui_gridSelector.toggleFilter(backendName, propName, option)
      if (refresh) {
        await refreshFilterAndTileSlices()
      }
      return true
    } catch (error) {
      logger.error("Failed to toggle filter:", error)
      return false
    }
  }

  async function updateRangeFilter(propName, min, max) {
    return updateRangeFilterInternal(propName, min, max, { refresh: true })
  }

  async function updateRangeFilterInternal(propName, min, max, { refresh = true } = {}) {
    log("Updating range filter:", propName, min, max)
    try {
      const currentFilterState = filterByProp.value?.[propName]
      if (
        currentFilterState
        && typeof currentFilterState.min === "number"
        && typeof currentFilterState.max === "number"
        && currentFilterState.min === min
        && currentFilterState.max === max
      ) {
        return false
      }
      // Call Lua to update the range filter and get updated filterByProp and activeFilters
      await lua.ui_gridSelector.updateRangeFilter(backendName, propName, min, max)
      if (refresh) {
        await refreshFilterAndTileSlices()
      }
      return true
    } catch (error) {
      logger.error("Failed to update range filter:", error)
      return false
    }
  }

  async function resetRangeFilter(propName) {
    return resetRangeFilterInternal(propName, { refresh: true })
  }

  async function resetRangeFilterInternal(propName, { refresh = true } = {}) {
    logger.debug("Resetting range filter:", propName)
    try {
      const currentFilterState = filterByProp.value?.[propName]
      const rangeFilterDefinition = filterList.value?.find(
        filterDefinition => filterDefinition?.propName === propName && filterDefinition?.type === "range"
      )
      const isAlreadyAtDefaultRange = !!currentFilterState
        && !!rangeFilterDefinition
        && typeof currentFilterState.min === "number"
        && typeof currentFilterState.max === "number"
        && typeof rangeFilterDefinition.min === "number"
        && typeof rangeFilterDefinition.max === "number"
        && currentFilterState.min === rangeFilterDefinition.min
        && currentFilterState.max === rangeFilterDefinition.max
      if (isAlreadyAtDefaultRange) {
        return false
      }
      // Call Lua to reset the range filter and get updated filterByProp and activeFilters
      await lua.ui_gridSelector.resetRangeFilter(backendName, propName)
      if (refresh) {
        await refreshFilterAndTileSlices()
      }
      return true
    } catch (error) {
      logger.error("Failed to reset range filter:", error)
      return false
    }
  }

  async function resetSetFilter(propName) {
    return resetSetFilterInternal(propName, { refresh: true })
  }

  async function resetSetFilterInternal(propName, { refresh = true } = {}) {
    log("Resetting set filter:", propName)
    try {
      const currentFilterState = filterByProp.value?.[propName]
      const isAlreadyReset = !!currentFilterState
        && Object.entries(currentFilterState)
          .filter(([key]) => key !== "min" && key !== "max")
          .every(([, state]) => state === true)
      if (isAlreadyReset) {
        return false
      }
      // Call Lua to reset the set filter and get updated filterByProp and activeFilters
      await lua.ui_gridSelector.resetSetFilter(backendName, propName)
      if (refresh) {
        await refreshFilterAndTileSlices()
      }
      return true
    } catch (error) {
      logger.error("Failed to reset set filter:", error)
      return false
    }
  }

  async function applyFiltersBatch(operations = [], { refresh = true } = {}) {
    const normalizedOperations = Array.isArray(operations) ? operations : []
    let hasAppliedOperation = false

    for (const operation of normalizedOperations) {
      if (!operation || typeof operation !== "object") {
        continue
      }

      let didApply = false
      if (operation.type === "toggle-set") {
        didApply = await toggleFilterInternal(operation.propName, operation.option, { refresh: false })
      } else if (operation.type === "update-range") {
        didApply = await updateRangeFilterInternal(operation.propName, operation.min, operation.max, { refresh: false })
      } else if (operation.type === "reset-range") {
        didApply = await resetRangeFilterInternal(operation.propName, { refresh: false })
      } else if (operation.type === "reset-set") {
        didApply = await resetSetFilterInternal(operation.propName, { refresh: false })
      }

      hasAppliedOperation = hasAppliedOperation || didApply
    }

    if (refresh && hasAppliedOperation) {
      await refreshFilterAndTileSlices()
    }

    return hasAppliedOperation
  }

  async function clearAllFilters() {
    try {
      const hasSearch = typeof searchText.value === "string" && searchText.value.length > 0
      const hasFilters = Array.isArray(activeFilters.value) && activeFilters.value.length > 0
      if (!hasSearch && !hasFilters) {
        return
      }
      await lua.ui_gridSelector.clearAllFilters(backendName)
      await refreshSelectorData({ filters: true, tiles: true, searchText: true, header: true })
    } catch (error) {
      logger.error("Failed to clear all filters:", error)
    }
  }

  async function loadDisplayData() {
    try {
      const data = await lua.ui_gridSelector.getDisplayDataOptions(backendName)
      applyDisplayDataSlice(data, "loadDisplayData.response")
      log("Loaded display data:", displayData.value)
    } catch (error) {
      logger.error("Failed to load display data:", error)
    }
  }

  async function updateDisplayData(key, value) {
    try {
      const currentDisplayOption = displayData.value.find(option => option?.key === key)
      if (currentDisplayOption && currentDisplayOption.value === value) {
        return
      }
      await lua.ui_gridSelector.setDisplayDataOption(backendName, key, value)
      await refreshSelectorData({ displayData: true, tiles: true, header: true })
    } catch (error) {
      logger.error("Failed to update display data:", error)
    }
  }

  async function resetDisplayDataToDefaults() {
    try {
      await lua.ui_gridSelector.resetDisplayDataToDefaults(backendName)
      await refreshSelectorData({ displayData: true, tiles: true, header: true })
    } catch (error) {
      logger.error("Failed to reset display data to defaults:", error)
    }
  }

  // Set details mode
  function setDetailsMode(mode) {
    log("Setting details mode:", mode)
    detailsMode.value = mode
  }

  function normalizeDetailsPayloadForUI(details) {
    const normalizedDetails = cloneDetailsPayload(details)
    if (normalizedDetails?.paintData && isPlainObject(normalizedDetails?.paints)) {
      normalizedDetails.paints.multiPaintSetups = safeArray(normalizedDetails.paints.multiPaintSetups)
      normalizedDetails.paints.factoryPaints = safeArray(normalizedDetails.paints.factoryPaints)
    }
    return normalizedDetails
  }

  async function getDetailsWithCache(showDetails, { forceRefresh = false, context = "getDetailsWithCache" } = {}) {
    const cacheKey = getDetailsCacheKey(showDetails, `${context}.cacheKey`)
    if (!forceRefresh && cacheKey && detailsCache.has(cacheKey)) {
      return normalizeDetailsPayloadForUI(detailsCache.get(cacheKey))
    }

    const details = await lua.ui_gridSelector.getDetails(backendName, showDetails)
    if (cacheKey) {
      detailsCache.set(cacheKey, cloneDetailsPayload(details))
    }
    return normalizeDetailsPayloadForUI(details)
  }

  // Set selected item and get details from Lua
  async function setSelectedItem(item, { forceRefresh = false, details = undefined } = {}) {
    log('Setting selected item:', item)
    if (!item || !item.showDetails) {
      nextRequestCounter("selectedDetails")
      autoFocusKey.value = null
      selectedItem.value = null
      selectedItemDetails.value = null
      // If there is no preview item either, return to advanced mode
      //if (detailsMode.value === 'detail' && !previewItem.value) setDetailsMode('advanced')
      // Load management details when no item is selected
      await loadManagementDetails()
      return
    }
    const requestId = nextRequestCounter("selectedDetails")

    // Fast path: apply already-fetched details without a second Lua call.
    if (details !== undefined) {
      const cacheKey = getDetailsCacheKey(item.showDetails, "setSelectedItem.preloaded")
      if (cacheKey) {
        detailsCache.set(cacheKey, cloneDetailsPayload(details))
      }
      const normalizedDetails = normalizeDetailsPayloadForUI(details)
      if (!isCurrentRequest("selectedDetails", requestId)) {
        return
      }
      log("Applied preloaded item details:", normalizedDetails)
      autoFocusKey.value = item.key
      selectedItem.value = item
      selectedItemDetails.value = normalizedDetails
      setDetailsMode("detail")
      return
    }

    try {
      log("Getting item details (set selected item):", item.showDetails)
      const fetchedDetails = await getDetailsWithCache(item.showDetails, {
        forceRefresh,
        context: "setSelectedItem",
      })
      if (!isCurrentRequest("selectedDetails", requestId)) {
        return
      }
      log("Received item details:", fetchedDetails)
      autoFocusKey.value = item.key
      selectedItem.value = item
      selectedItemDetails.value = fetchedDetails
      setDetailsMode("detail")
    } catch (error) {
      if (!isCurrentRequest("selectedDetails", requestId)) {
        return
      }
      logger.error("Failed to get item details:", error)
      autoFocusKey.value = null
      selectedItem.value = item
      selectedItemDetails.value = null
    }
  }

  // Clear selected item
  async function clearSelectedItem() {
    nextRequestCounter("selectedDetails")
    selectedItem.value = null
    selectedItemDetails.value = null
    // If there is no preview item active, revert to advanced mode
    //if (detailsMode.value === 'detail' && !previewItem.value) setDetailsMode('advanced')
    // Load management details when selection is cleared
    await loadManagementDetails()
  }

  // Set preview (hover/focus) item and get details without selecting
  async function setPreviewItem(item, { forceRefresh = false } = {}) {
    log('Setting preview item:', item)
    if (!item || !item.showDetails) {
      nextRequestCounter("previewDetails")
      previewItem.value = null
      previewItemDetails.value = null
      //if (detailsMode.value === 'detail' && !selectedItem.value) setDetailsMode('advanced')
      return
    }
    const requestId = nextRequestCounter("previewDetails")
    try {
      const details = await getDetailsWithCache(item.showDetails, {
        forceRefresh,
        context: "setPreviewItem",
      })
      if (!isCurrentRequest("previewDetails", requestId)) {
        return
      }
      log('Received preview details:', details)
      previewItem.value = item
      previewItemDetails.value = details
      setDetailsMode('detail')
    } catch (error) {
      if (!isCurrentRequest("previewDetails", requestId)) {
        return
      }
      previewItem.value = item
      previewItemDetails.value = null
    }
  }

  function clearPreviewItem() {
    log('clearPreviewItem')
    nextRequestCounter("previewDetails")
    previewItem.value = null
    previewItemDetails.value = null
    //if (detailsMode.value === 'detail' && !selectedItem.value) setDetailsMode('advanced')
  }

  // Active item is selected when present, otherwise preview
  const activeItem = computed(() => selectedItem.value || previewItem.value)
  const activeItemDetails = computed(() => selectedItem.value ? selectedItemDetails.value : previewItemDetails.value)

  async function handleExecuteButtonResult(data, context) {
    if (!isPlainObject(data)) {
      return
    }

    if (data.gotoPath) {
      await setCurrentPath(normalizePath(data.gotoPath, { backendName, context: `${context}.gotoPath` }))
    }

    if (isPlainObject(data.refreshSlices)) {
      await refreshSelectorData(data.refreshSlices)
    }
  }

  // Execute button callback by ID
  async function executeButton(buttonId, additionalData) {
    log("Executing button:", buttonId)
    try {
      if (additionalData?.waitForLoadingScreen) {
        window.vueEventBus?.emit("LoadingScreen", { active: true })
        await startLoading(async () => {
          await waitForLoadingScreenFadeIn()
          const data = await lua.ui_gridSelector.executeButton(backendName, buttonId, additionalData)
          await handleExecuteButtonResult(data, "executeButton.loading")
        })
      } else {
        const data = await lua.ui_gridSelector.executeButton(backendName, buttonId, additionalData)
        await handleExecuteButtonResult(data, "executeButton")
      }
    } catch (error) {
      logger.error("Failed to execute button:", error)
    }
  }

  const executeButtonHandler = (targetBackendName, buttonId, additionalData) => {
    if (targetBackendName !== backendName) return
    executeButton(buttonId, additionalData)
  }
  events.on("gridSelectorExecuteButton", executeButtonHandler)

  async function toggleFavourite(item) {
    log("Toggling favourite:", item)
    if (!item?.showDetails) {
      return
    }
    const requestId = nextRequestCounter("selectedDetails")
    try {
      await lua.ui_gridSelector.toggleFavourite(backendName, item.showDetails)
      invalidateDetailsCacheForShowDetails(item.showDetails, "toggleFavourite")
      const details = await getDetailsWithCache(item.showDetails, {
        forceRefresh: true,
        context: "toggleFavourite",
      })
      if (!isCurrentRequest("selectedDetails", requestId)) {
        return
      }
      log("Received item details:", details)
      selectedItem.value = item
      selectedItemDetails.value = details
      setDetailsMode("detail")
      await refreshSelectorData({ tiles: true, header: true })
    } catch (error) {
      if (!isCurrentRequest("selectedDetails", requestId)) {
        return
      }
      logger.error("Failed to toggle favourite:", error)
    }
  }

  // Search functionality
  function clearSearch() {
    setSearchText("")
  }

  function updateSearch(newSearchText) {
    setSearchText(newSearchText || "")
  }

  function commitSearch() {
    setSearchText(searchText.value || "")
  }

  // Helper functions to check if filters are locked
  function isFilterLocked(propName, option = null) {
    if (!lockedFiltersByProp.value[propName]) {
      return false
    }

    if (option) {
      // Check if specific option is locked
      return lockedFiltersByProp.value[propName][option] !== undefined
    } else {
      // Check if any option for this property is locked
      return Object.keys(lockedFiltersByProp.value[propName]).length > 0
    }
  }

  // Update screen header title
  async function updateScreenHeaderData() {
    const requestId = nextRequestCounter("screenHeader")
    try {
      const headerData = await lua.ui_gridSelector.getScreenHeaderTitleAndPath(
        backendName,
        normalizePath(currentPath.value, { backendName, context: "updateScreenHeaderData.currentPath" })
      )
      if (!isCurrentRequest("screenHeader", requestId)) {
        return
      }
      const normalizedHeaderData = normalizeHeaderPayload(headerData, backendName, "updateScreenHeaderData.response")
      screenHeaderTitle.value = normalizedHeaderData.title
      screenHeaderPath.value = normalizedHeaderData.pathSegments
    } catch (error) {
      if (!isCurrentRequest("screenHeader", requestId)) {
        return
      }
      logger.error("Failed to update screen header title:", error)
      screenHeaderTitle.value = DEFAULT_SCREEN_HEADER_TITLE
      screenHeaderPath.value = createDefaultHeaderPath()
    }
  }

  function isFilterOptionLocked(propName, option) {
    return isFilterLocked(propName, option)
  }

  function isRangeFilterLocked(propName) {
    return isFilterLocked(propName)
  }

  // Watch for route changes and clear selected item
  watch(currentPath, () => {
    invalidateDetailsCache()
    clearSelectedItem()
    clearPreviewItem()
    // Update screen header title when path changes
    updateScreenHeaderData()
  })

  // Watch for filter changes and clear selected item
  watch([filterByProp, activeFilters], () => {
    invalidateDetailsCache()
    clearSelectedItem()
    clearPreviewItem()
  })

  // Call this when the UI is fully rendered and ready for user interaction
  function notifyUIReady(tag) {
    log("UI is ready for interaction, finishing profiler")
    lua.ui_gridSelector.profilerFinish(backendName,tag)
  }

  // Function to set the back from details callback
  function setOnBackFromDetailsCallback(callback) {
    backFromDetailsCallback = callback
  }


  // Initialize function - call this explicitly when ready
  async function initialize() {
    if (isInitializing.value) {
      log("Already initializing, skipping...")
      return
    }

    try {
      isInitializing.value = true
      log("Initializing GridSelector composable...")
      await Promise.all([
        loadFilters(),
        loadDisplayData(),
        loadManagementDetails(),
        getSearchText()
      ])
      await updateScreenHeaderData()
      log("GridSelector composable initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize GridSelector composable:", error)
      // You might want to show a user-friendly error message here
    } finally {
      isInitializing.value = false
    }
  }

  function getSelectorSnapshot() {
    return {
      backendName,
      path: normalizePath(currentPath.value, { backendName, context: "getSelectorSnapshot.path" }),
      groups: normalizeGroupsPayload(groups.value, backendName, "getSelectorSnapshot.groups"),
      filters: normalizeFiltersPayload({
        filterList: filterList.value,
        filterByProp: filterByProp.value,
        commonFilters: commonFilters.value,
        lockedFiltersByProp: lockedFiltersByProp.value,
        activeFilters: activeFilters.value,
        onlyCommonFilters: onlyCommonFilters.value,
      }, backendName, "getSelectorSnapshot.filters"),
      displayData: normalizeDisplayDataPayload(displayData.value, backendName, "getSelectorSnapshot.displayData"),
      searchText: normalizeSearchTextPayload(searchText.value, backendName, "getSelectorSnapshot.searchText"),
      managementDetails: normalizeManagementDetailsPayload(
        managementDetails.value,
        backendName,
        "getSelectorSnapshot.managementDetails"
      ),
      header: normalizeHeaderPayload({
        title: screenHeaderTitle.value,
        pathSegments: screenHeaderPath.value,
      }, backendName, "getSelectorSnapshot.header"),
      defaultFocusKey: autoFocusKey.value === null || autoFocusKey.value === undefined ? null : String(autoFocusKey.value),
    }
  }

  function hydrateFromSnapshot(snapshot) {
    const normalizedSnapshot = normalizeSelectorSnapshot(snapshot, backendName, "hydrateFromSnapshot")
    invalidateDetailsCache()
    currentPath.value = normalizedSnapshot.path
    previousPathKey.value = getPathKey(normalizedSnapshot.path, backendName)
    groups.value = normalizedSnapshot.groups

    filterList.value = normalizedSnapshot.filters.filterList
    filterByProp.value = normalizedSnapshot.filters.filterByProp
    commonFilters.value = normalizedSnapshot.filters.commonFilters
    lockedFiltersByProp.value = normalizedSnapshot.filters.lockedFiltersByProp
    activeFilters.value = normalizedSnapshot.filters.activeFilters
    onlyCommonFilters.value = normalizedSnapshot.filters.onlyCommonFilters

    displayData.value = normalizedSnapshot.displayData
    searchText.value = normalizedSnapshot.searchText
    managementDetails.value = normalizedSnapshot.managementDetails

    screenHeaderTitle.value = normalizedSnapshot.header.title
    screenHeaderPath.value = normalizedSnapshot.header.pathSegments
    autoFocusKey.value = normalizedSnapshot.defaultFocusKey
    return normalizedSnapshot
  }

  async function hydrateFromBackendSnapshot(path = currentPath.value) {
    try {
      const normalizedPath = normalizePath(path, { backendName, context: "hydrateFromBackendSnapshot.path" })
      const snapshot = await lua.ui_gridSelector.getSelectorSnapshot(backendName, normalizedPath)
      return hydrateFromSnapshot(snapshot)
    } catch (error) {
      logger.error("Failed to hydrate from backend snapshot:", error)
      return null
    }
  }

  const exploreFolder = function(path) {
    lua.ui_gridSelector.exploreFolder(backendName, path)
  }
  const goToMod = function(modId) {
    lua.ui_gridSelector.goToMod(backendName, modId)
  }

  // Lifecycle cleanup
  onUnmounted(() => {
    logger.debug("GridSelector composable unmounting")
    // Clean up event listeners
    events.off("gridSelectorRefreshAll", refreshAllHandler)
    events.off("gridSelectorRefreshCurrentItemDetails", refreshCurrentItemDetailsHandler)
    events.off("gridSelectorExecuteButton", executeButtonHandler)
  })

  return {
    // State
    groups,
    filterList,
    filterByProp,
    lockedFiltersByProp,
    commonFilters,
    activeFilters,
    onlyCommonFilters,
    displayData,
    currentPath,
    detailsMode,
    selectedItem,
    selectedItemDetails,
    prevSelectedItem,
    previewItem,
    previewItemDetails,
    activeItem,
    activeItemDetails,
    managementDetails,
    isInitializing,
    searchText,
    getSearchText,
    setSearchText,
    setSearchTextSilently,
    autoFocusKey,

    // Screen header state
    screenHeaderTitle,
    screenHeaderPath,

    // Actions
    initialize,
    getSelectorSnapshot,
    hydrateFromSnapshot,
    hydrateFromBackendSnapshot,
    setCurrentPath,
    setCurrentPathSilently,
    loadTiles,
    loadFilters,
    loadManagementDetails,
    toggleFilter,
    updateRangeFilter,
    resetRangeFilter,
    resetSetFilter,
    applyFiltersBatch,
    clearAllFilters,
    loadDisplayData,
    updateDisplayData,
    resetDisplayDataToDefaults,
    refreshSelectorData,
    setDetailsMode,
    setSelectedItem,
    clearSelectedItem,
    setPreviewItem,
    clearPreviewItem,
    executeButton,
    notifyUIReady,
    isFilterLocked,
    isFilterOptionLocked,
    isRangeFilterLocked,
    toggleFavourite,
    clearSearch,
    updateSearch,
    commitSearch,
    updateScreenHeaderData,
    exploreFolder,
    goToMod,
    setOnBackFromDetailsCallback,
  }
}