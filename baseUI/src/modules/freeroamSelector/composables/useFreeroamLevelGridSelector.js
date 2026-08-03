import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { lua, useBridge } from "@/bridge"
import logger from "@/services/logger"
import { useRouteDataStore } from "@/services/routeData"
import { useScopedNav } from "@/services/scopedNav/api"
import { startLoading, waitForLoadingScreenFadeIn } from "@/services/screenCover"
import {
  DETAILS_SCOPE_ID,
  GRID_SCOPE_ID,
  normalizePath as normalizeGridPath,
} from "@/common/modules/gridSelector/composables/gridSelectorHelpers"

const BACKEND_NAME = "freeroamSelector"
const SNAPSHOT_EVENT = "freeroamSelectorDisplayDataSnapshot"
const DETAILS_EVENT = "freeroamSelectorDetails"
const DATA_LOADED_EVENT = "FreeroamSelectorDataLoaded"
const DEFAULT_DETAILS_MODE = "detail"
const HIDDEN_TABS = Object.freeze(["filter", "advanced"])
const BUBBLE_EVENTS = Object.freeze(["action_2"])
const FALLBACK_PATH = Object.freeze({ keys: ["allFreeroam"] })
const DEFAULT_SCREEN_HEADER_TITLE = "Select Level"
const DEFAULT_SCREEN_HEADER_PATH = Object.freeze([{ label: "ui.common.menu", gotoAngularState: "menu" }])

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function readMaybeRef(value) {
  if (value && typeof value === "object" && "value" in value) {
    return value.value
  }
  return value
}

function cloneHeaderPath() {
  return DEFAULT_SCREEN_HEADER_PATH.map(segment => ({ ...segment }))
}

function normalizeSearchText(value) {
  if (typeof value === "string") return value
  if (value === null || value === undefined || value === "undefined") return ""
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function normalizePathSegment(segment) {
  if (segment === null || segment === undefined || segment === "undefined") return null
  if (typeof segment === "string") return segment
  if (typeof segment === "number" || typeof segment === "boolean") return String(segment)
  return null
}

function normalizePath(value, fallbackKeys = FALLBACK_PATH.keys) {
  const sourceKeys = Array.isArray(value)
    ? value
    : (isPlainObject(value) && Array.isArray(value.keys) ? value.keys : null)
  if (!sourceKeys) {
    return { keys: [...fallbackKeys] }
  }
  const normalizedKeys = sourceKeys.map(normalizePathSegment).filter(segment => segment !== null)
  return normalizedKeys.length > 0 ? { keys: normalizedKeys } : { keys: [...fallbackKeys] }
}

function normalizeFocusKey(rawFocusKey) {
  if (rawFocusKey === null || rawFocusKey === undefined || rawFocusKey === "") {
    return null
  }
  return String(rawFocusKey)
}

function resolveDefaultFocusKeyFromGroups(nextGroups) {
  if (!Array.isArray(nextGroups)) return null
  for (const group of nextGroups) {
    const tiles = Array.isArray(group?.tiles) ? group.tiles : []
    for (const tile of tiles) {
      if (tile?.isDefaultSelected && tile?.key !== undefined && tile?.key !== null) {
        return String(tile.key)
      }
    }
  }
  return null
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

function normalizeFiltersSlice(payload) {
  const source = isPlainObject(payload) ? payload : {}
  return {
    filterList: Array.isArray(source.filterList) ? source.filterList : [],
    filterByProp: isPlainObject(source.filterByProp) ? source.filterByProp : {},
    commonFilters: Array.isArray(source.commonFilters) ? source.commonFilters : [],
    lockedFiltersByProp: isPlainObject(source.lockedFiltersByProp) ? source.lockedFiltersByProp : {},
    activeFilters: Array.isArray(source.activeFilters) ? source.activeFilters : [],
    onlyCommonFilters: source.onlyCommonFilters !== false,
  }
}

function normalizeDisplayData(value) {
  return Array.isArray(value) ? value : []
}

function normalizeManagementDetails(value) {
  return isPlainObject(value) ? value : {}
}

function normalizeHeaderPayload(value) {
  const source = isPlainObject(value) ? value : {}
  let pathSegments = cloneHeaderPath()
  if (Array.isArray(source.pathSegments)) {
    const segments = source.pathSegments.filter(isPlainObject).map(segment => ({ ...segment }))
    if (segments.length > 0) pathSegments = segments
  }
  return {
    title: typeof source.title === "string" && source.title.length > 0 ? source.title : DEFAULT_SCREEN_HEADER_TITLE,
    pathSegments,
  }
}

function normalizeTile(tile, groupIndex, tileIndex) {
  if (!isPlainObject(tile)) return null
  const normalized = { ...tile }
  if (!normalized.key) {
    normalized.key = `__missing_tile_key_${BACKEND_NAME}_${groupIndex}_${tileIndex}`
  }
  return normalized
}

function normalizeGroups(groups) {
  if (!Array.isArray(groups)) return []
  const normalized = []
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]
    if (!isPlainObject(group)) continue
    const sourceTiles = Array.isArray(group.tiles) ? group.tiles : []
    const tiles = []
    for (let tileIndex = 0; tileIndex < sourceTiles.length; tileIndex += 1) {
      const normalizedTile = normalizeTile(sourceTiles[tileIndex], groupIndex, tileIndex)
      if (normalizedTile) tiles.push(normalizedTile)
    }
    normalized.push({
      ...group,
      isRecentGroup: !!group.isRecentGroup,
      tiles,
    })
  }
  return normalized
}

// Snapshots arrive in two shapes:
//  - Wizard route data: { backendName, path, snapshot: <innerSnapshot> }
//  - emitDisplayDataSnapshot payload: { backendName, requestId, snapshot: <innerSnapshot> }
// Both wrap the actual snapshot under `snapshot`. We accept either the wrapper
// or the inner snapshot to keep callers simple.
function unwrapSnapshot(payload) {
  if (!isPlainObject(payload)) return null
  if (isPlainObject(payload.snapshot)) return payload.snapshot
  return payload
}

export default function useFreeroamLevelGridSelector(options = {}) {
  const routeDataStore = useRouteDataStore()
  const scopedNav = useScopedNav()
  const { events: bridgeEvents } = useBridge()

  const enabledOption = options.enabled
  const initialSnapshotOption = options.initialSnapshot
  const isEnabled = computed(() => readMaybeRef(enabledOption) !== false)
  const gridScrollableContentElement = computed(() => readMaybeRef(options.gridScrollableContentElement) ?? null)

  const groups = ref([])
  const filterList = ref([])
  const filterByProp = ref({})
  const commonFilters = ref([])
  const lockedFiltersByProp = ref({})
  const activeFilters = ref([])
  const onlyCommonFilters = ref(true)
  const displayData = ref([])
  const managementDetails = ref({})
  const searchText = ref("")
  const screenHeaderTitle = ref(DEFAULT_SCREEN_HEADER_TITLE)
  const screenHeaderPath = ref(cloneHeaderPath())
  const detailsMode = ref(DEFAULT_DETAILS_MODE)
  const activeItem = ref(null)
  const activeItemDetails = ref(null)
  const autoFocusKey = ref(null)
  const currentPath = ref(normalizePath(null))
  // Default to true so the level grid shows the loading state while async
  // bulk loading is in flight before the first snapshot arrives. Mirrors
  // useGameplaySelector's initial isLoadingGroups behavior.
  const isLoading = ref(true)
  const activeSectionScope = ref("grid")
  // Bumped every time Lua emits `FreeroamSelectorDataLoaded` and we
  // successfully hydrate the snapshot. The view watches this counter to run
  // post-hydration work (autofocus scroll, scope focus) without duplicating
  // the hydration logic in the component.
  const dataLoadedSignal = ref(0)
  const lastLoadedRouteName = ref(null)

  const requestCounters = {
    snapshot: 0,
    details: 0,
  }

  function nextRequestId(key) {
    requestCounters[key] = (requestCounters[key] || 0) + 1
    return requestCounters[key]
  }

  function isCurrentRequest(key, requestId) {
    return requestCounters[key] === requestId
  }

  function applyFiltersSlice(payload) {
    const normalized = normalizeFiltersSlice(payload)
    filterList.value = normalized.filterList
    filterByProp.value = normalized.filterByProp
    commonFilters.value = normalized.commonFilters
    lockedFiltersByProp.value = normalized.lockedFiltersByProp
    activeFilters.value = normalized.activeFilters
    onlyCommonFilters.value = normalized.onlyCommonFilters
  }

  function applyDisplayDataSlice(payload) {
    const normalized = normalizeDisplayData(payload)
    displayData.value = normalized
    const searchOption = normalized.find(option => option?.key === "searchText")
    if (searchOption) {
      searchText.value = normalizeSearchText(searchOption.value)
    }
  }

  function applyHeaderSlice(payload) {
    const normalized = normalizeHeaderPayload(payload)
    screenHeaderTitle.value = normalized.title
    screenHeaderPath.value = normalized.pathSegments
  }

  function applySnapshot(snapshot) {
    if (!isPlainObject(snapshot)) return false
    if (Object.prototype.hasOwnProperty.call(snapshot, "path")) {
      currentPath.value = normalizePath(snapshot.path)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "groups")) {
      const normalizedGroups = normalizeGroups(snapshot.groups)
      groups.value = normalizedGroups
      // Pull a defaultFocusKey from tiles flagged isDefaultSelected when the
      // snapshot doesn't include an explicit defaultFocusKey field. Mirrors
      // the freeroam vehicle composable so the level grid restores autofocus
      // on the previously selected spawn point / cluster after route entry.
      if (!Object.prototype.hasOwnProperty.call(snapshot, "defaultFocusKey")) {
        autoFocusKey.value = resolveDefaultFocusKeyFromGroups(normalizedGroups)
      }
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "filters")) {
      applyFiltersSlice(snapshot.filters)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "displayData")) {
      applyDisplayDataSlice(snapshot.displayData)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "searchText")) {
      searchText.value = normalizeSearchText(snapshot.searchText)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "managementDetails")) {
      managementDetails.value = normalizeManagementDetails(snapshot.managementDetails)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "header")) {
      applyHeaderSlice(snapshot.header)
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, "defaultFocusKey")) {
      const focusKey = snapshot.defaultFocusKey
      autoFocusKey.value = focusKey === null || focusKey === undefined || focusKey === ""
        ? null
        : String(focusKey)
    }
    return true
  }

  // Apply a route lifecycle snapshot. Bumps the snapshot request counter so any
  // in-flight guihook responses get discarded as stale. When the wizard wraps
  // the inner snapshot ({ backendName, path, snapshot }), prefer the outer
  // `path` as the authoritative current path because the inner snapshot's
  // `path` field can occasionally arrive malformed across the bridge.
  function hydrateFromSnapshot(snapshotPayload) {
    const snapshot = unwrapSnapshot(snapshotPayload)
    if (!snapshot) return false
    nextRequestId("snapshot")
    isLoading.value = false
    const applied = applySnapshot(snapshot)
    if (applied && isPlainObject(snapshotPayload) && snapshotPayload.path) {
      currentPath.value = normalizePath(snapshotPayload.path)
    }
    return applied
  }

  // Guihook payload arrives as
  // { backendName, requestId, snapshot: {...inner snapshot...} }. We accept
  // only the latest snapshot request so rapid control changes drop stale
  // responses.
  function handleDisplayDataSnapshot(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) return
    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      // logger.debug("Ignoring freeroam level snapshot with invalid request id", payload?.requestId)
      return
    }
    if (!isCurrentRequest("snapshot", payloadRequestId)) {
      // logger.debug("Ignoring stale freeroam level snapshot", payloadRequestId)
      return
    }
    const snapshot = unwrapSnapshot(payload)
    if (snapshot) applySnapshot(snapshot)
  }

  function handleDetailsPayload(payload) {
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) return
    const payloadRequestId = normalizeRequestId(payload.requestId)
    if (payloadRequestId === null) {
      // logger.debug("Ignoring freeroam level details with invalid request id", payload?.requestId)
      return
    }
    if (!isCurrentRequest("details", payloadRequestId)) {
      // logger.debug("Ignoring stale freeroam level details", payloadRequestId)
      return
    }
    if (!isPlainObject(payload.item)) return
    activeItem.value = payload.item
    activeItemDetails.value = isPlainObject(payload.details) ? payload.details : null
    detailsMode.value = DEFAULT_DETAILS_MODE
  }

  // Initial async load completion from Lua
  // (util_asyncBulkLoader.loadLevels finished and freeroamConfigurator built
  // a fresh route snapshot). This replaces the synchronous wizard routeData
  // snapshot path used on cold loads; the view reacts to `dataLoadedSignal`
  // to run post-hydration work.
  function handleDataLoadedPayload(payload) {
    // console.log("[useFreeroamLevelGridSelector] FreeroamSelectorDataLoaded received", payload)
    if (!isPlainObject(payload) || payload.backendName !== BACKEND_NAME) {
      return
    }
    if (!isPlainObject(payload.snapshot)) {
      // logger.debug("Ignoring freeroam selector data loaded payload with missing snapshot", payload)
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

  bridgeEvents?.on?.(SNAPSHOT_EVENT, handleDisplayDataSnapshot)
  bridgeEvents?.on?.(DETAILS_EVENT, handleDetailsPayload)
  bridgeEvents?.on?.(DATA_LOADED_EVENT, handleDataLoadedPayload)

  async function setCurrentPath(path) {
    const normalizedPath = normalizePath(path)
    currentPath.value = normalizedPath
    const requestId = nextRequestId("snapshot")
    try {
      // Tell Lua which path is now active so the emitted snapshot resolves
      // tiles/header for the new path instead of the previous one.
      if (typeof lua.ui_freeroamSelector_general?.setCurrentSelectorPath === "function") {
        await lua.ui_freeroamSelector_general.setCurrentSelectorPath(normalizedPath)
      }
      await lua.ui_freeroamSelector_general.emitDisplayDataSnapshot(requestId)
    } catch (error) {
      logger.error("Freeroam level selector setCurrentPath emit failed:", error)
    }
  }

  function setCurrentPathSilently(path) {
    currentPath.value = normalizePath(path)
  }

  async function setSearchText(value) {
    const normalizedSearchText = normalizeSearchText(value)
    if (searchText.value === normalizedSearchText) return false
    searchText.value = normalizedSearchText
    if (isLoading.value) return false
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.setSearchText(BACKEND_NAME, normalizedSearchText, requestId)
      return true
    } catch (error) {
      logger.error("Freeroam level selector set search text failed:", error)
      return false
    }
  }

  function setSearchTextSilently(value) {
    searchText.value = normalizeSearchText(value)
  }

  function clearSearch() {
    return setSearchText("")
  }

  async function toggleFilter(propName, option) {
    if (!propName) return false
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.toggleFilter(BACKEND_NAME, propName, option, requestId)
      return true
    } catch (error) {
      logger.error("Freeroam level selector toggle filter failed:", error)
      return false
    }
  }

  async function updateRangeFilter(propName, min, max) {
    if (!propName) return false
    const current = filterByProp.value?.[propName]
    if (current && current.min === min && current.max === max) return false
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.updateRangeFilter(BACKEND_NAME, propName, min, max, requestId)
      return true
    } catch (error) {
      logger.error("Freeroam level selector update range filter failed:", error)
      return false
    }
  }

  async function resetRangeFilter(propName) {
    if (!propName) return false
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.resetRangeFilter(BACKEND_NAME, propName, requestId)
      return true
    } catch (error) {
      logger.error("Freeroam level selector reset range filter failed:", error)
      return false
    }
  }

  async function clearFilters() {
    const hasSearch = typeof searchText.value === "string" && searchText.value.length > 0
    const hasFilters = Array.isArray(activeFilters.value) && activeFilters.value.length > 0
    if (!hasSearch && !hasFilters) return
    const requestId = nextRequestId("snapshot")
    try {
      // freeroamSelector.clearAllFilters accepts an optional requestId and will
      // emit the snapshot when one is provided.
      await lua.ui_gridSelector.clearAllFilters(BACKEND_NAME, requestId)
    } catch (error) {
      logger.error("Freeroam level selector clear filters failed:", error)
    }
  }

  async function updateDisplayData(key, value) {
    if (!key) return
    const current = displayData.value.find(option => option?.key === key)
    if (current && current.value === value) return
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.setDisplayDataOption(BACKEND_NAME, key, value, requestId)
    } catch (error) {
      logger.error("Freeroam level selector update display data failed:", error)
    }
  }

  async function resetDisplayDataToDefaults() {
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_gridSelector.resetDisplayDataToDefaults(BACKEND_NAME, requestId)
    } catch (error) {
      logger.error("Freeroam level selector reset display data failed:", error)
    }
  }

  // Tiles in the freeroam level grid expose their details payload in two
  // shapes:
  //   - `showDetails` (focused leaf tile from the gameplay selector tile
  //     generators), and
  //   - `itemDetails` (raw details payload, e.g. when a controller path
  //     already resolved the leaf).
  // Either is acceptable as input to the Lua bridge `requestDetails` call.
  function resolveDetailsRequestPayload(item) {
    if (isPlainObject(item?.showDetails)) return item.showDetails
    if (isPlainObject(item?.itemDetails)) return item.itemDetails
    if (isPlainObject(item)) return item
    return null
  }

  // A tile drills down (no leaf details) when it carries a non-empty
  // `gotoPath`. This mirrors the gameplay selector cluster/group convention
  // where drilldown cluster tiles may also expose `doubleClickDetails` but
  // must not be treated as a focusable leaf.
  function isDrilldownItem(item) {
    return Array.isArray(item?.gotoPath) && item.gotoPath.length > 0
  }

  async function focusItem(item) {
    const detailsPayload = resolveDetailsRequestPayload(item)
    if (!detailsPayload) {
      const requestId = nextRequestId("details")
      activeItem.value = null
      activeItemDetails.value = null
      return requestId
    }
    const requestId = nextRequestId("details")
    try {
      await lua.ui_gridSelector.requestDetails(BACKEND_NAME, detailsPayload, requestId)
    } catch (error) {
      logger.error("Freeroam level selector focus item failed:", error)
    }
    return requestId
  }

  function clearActiveItem() {
    nextRequestId("details")
    activeItem.value = null
    activeItemDetails.value = null
  }

  // Explicit autofocus restore helper. Only callers that intentionally want to
  // move the autofocus tile (route hydration, returning from the auxiliary/
  // details panel) should use this. Routine focus events must NOT update
  // `autoFocusKey`, otherwise BngList sees a slot change and briefly flashes
  // its loading state. Mirrors `useFreeroamVehicleGridSelector.setAutoFocusKey`.
  function setAutoFocusKey(focusKey) {
    autoFocusKey.value = normalizeFocusKey(focusKey)
  }

  // Drop any in-flight details response and clear active item/details so
  // GameplayDetails unmounts. Falls back from `detail` mode to `advanced`
  // so the auxiliary panel does not render an empty state.
  function clearActiveDetailsState() {
    clearActiveItem()
    if (detailsMode.value === "detail") {
      detailsMode.value = "advanced"
    }
  }

  function patchTileFavouriteState(itemKey, isFavourite) {
    if (!itemKey || !Array.isArray(groups.value) || groups.value.length === 0) return
    const favouritePercent = isFavourite ? 1 : 0
    const nextGroups = groups.value.map(group => {
      const tiles = Array.isArray(group?.tiles) ? group.tiles : []
      let didPatch = false
      const nextTiles = tiles.map(tile => {
        if (tile?.key !== itemKey) return tile
        didPatch = true
        return { ...tile, showFavouriteIconPercent: favouritePercent }
      })
      return didPatch ? { ...group, tiles: nextTiles } : group
    })
    groups.value = nextGroups
  }

  function markCurrentSelection(details) {
    if (!isPlainObject(details) || !Array.isArray(groups.value) || groups.value.length === 0) return
    const spawnPointKey = details.levelName && details.spawnPointObjectName
      ? `spawnPoint_${details.levelName}_${details.spawnPointObjectName}`
      : null
    const selectedKeys = new Set([details.key, spawnPointKey].filter(Boolean))
    if (selectedKeys.size === 0) return

    const nextGroups = groups.value.map(group => {
      const tiles = Array.isArray(group?.tiles) ? group.tiles : []
      let didPatch = false
      const nextTiles = tiles.map(tile => {
        if (Array.isArray(tile?.gotoPath) || tile?.subElementCount > 0) return tile
        const tileDetails = tile.showDetails || tile.doubleClickDetails || tile
        const tileKey = tileDetails?.key || tile?.key
        const isSelected = selectedKeys.has(tileKey)
        const nextCornerIcon = isSelected ? "road" : undefined
        if ((tile?.cornerIcon || undefined) === nextCornerIcon) return tile
        didPatch = true
        const nextTile = { ...tile }
        if (nextCornerIcon) nextTile.cornerIcon = nextCornerIcon
        else delete nextTile.cornerIcon
        return nextTile
      })
      return didPatch ? { ...group, tiles: nextTiles } : group
    })
    groups.value = nextGroups
  }

  async function toggleFavourite(item = activeItem.value) {
    const itemDetails = item?.showDetails || item
    if (!isPlainObject(itemDetails) || !itemDetails.key) return
    let isFavourite = false
    try {
      isFavourite = !!(await lua.ui_gridSelector.toggleFavourite(BACKEND_NAME, itemDetails))
    } catch (error) {
      logger.error("Freeroam level selector toggle favourite failed:", error)
      return
    }
    patchTileFavouriteState(itemDetails.key, isFavourite)
    const activeKey = activeItem.value?.showDetails?.key ?? activeItem.value?.key
    if (activeItemDetails.value && activeKey === itemDetails.key) {
      activeItemDetails.value = { ...activeItemDetails.value, isFavourite }
    }
    // Re-pull details so any button states reflecting favourite status update.
    if (activeKey === itemDetails.key) {
      const detailsRequestId = nextRequestId("details")
      try {
        await lua.ui_gridSelector.requestDetails(BACKEND_NAME, itemDetails, detailsRequestId)
      } catch (error) {
        logger.error("Freeroam level selector toggle favourite details refresh failed:", error)
      }
    }
    // Re-emit display snapshot so tile favourite markers refresh.
    const snapshotRequestId = nextRequestId("snapshot")
    try {
      await lua.ui_freeroamSelector_general.emitDisplayDataSnapshot(snapshotRequestId)
    } catch (error) {
      logger.error("Freeroam level selector toggle favourite snapshot refresh failed:", error)
    }
  }

  function exploreFolder(path) {
    lua.ui_gridSelector.exploreFolder(BACKEND_NAME, path)
  }

  function goToMod(modId) {
    lua.ui_gridSelector.goToMod(BACKEND_NAME, modId)
  }

  async function handleExecuteButtonResult(data) {
    if (!isPlainObject(data)) return
    if (data.gotoPath) {
      await setCurrentPath(normalizeGridPath(data.gotoPath))
    } else if (isPlainObject(data.refreshSlices)) {
      // Any requested slice refresh is satisfied by a full snapshot push from
      // Lua. The exact slice shape no longer matters on the UI side.
      const requestId = nextRequestId("snapshot")
      try {
        await lua.ui_freeroamSelector_general.emitDisplayDataSnapshot(requestId)
      } catch (error) {
        logger.error("Freeroam level selector executeButton snapshot refresh failed:", error)
      }
    }
  }

  async function executeButton(buttonId, additionalData) {
    if (buttonId === null || buttonId === undefined) return
    try {
      if (additionalData?.waitForLoadingScreen) {
        bridgeEvents?.emit?.("LoadingScreen", { active: true })
        await startLoading(async () => {
          await waitForLoadingScreenFadeIn()
          const data = await lua.ui_gridSelector.executeButton(BACKEND_NAME, buttonId, additionalData)
          await handleExecuteButtonResult(data)
        })
        return
      }
      const data = await lua.ui_gridSelector.executeButton(BACKEND_NAME, buttonId, additionalData)
      await handleExecuteButtonResult(data)
    } catch (error) {
      logger.error("Freeroam level selector execute button failed:", error)
    }
  }

  async function executeDoubleClick(item) {
    if (!item?.doubleClickDetails) return
    try {
      await lua.ui_gridSelector.executeDoubleClick(BACKEND_NAME, item.doubleClickDetails)
    } catch (error) {
      logger.error("Freeroam level selector execute double click failed:", error)
    }
  }

  function switchSectionScope(name) {
    const target = name || (activeSectionScope.value === "grid" ? "details" : "grid")
    activeSectionScope.value = target
    if (target === "details") {
      scopedNav.activateScope(DETAILS_SCOPE_ID)
    } else {
      scopedNav.activateScope(GRID_SCOPE_ID)
    }
  }

  function onGridActivate() {
    activeSectionScope.value = "grid"
  }

  function onDetailsActivate() {
    activeSectionScope.value = "details"
  }

  function onToggleSectionScope() {
    switchSectionScope()
  }

  function setDetailsScope() {
    switchSectionScope("details")
  }

  function switchDetailsMode(mode) {
    if (typeof mode === "string" && mode.length > 0) {
      detailsMode.value = mode
    }
    switchSectionScope("details")
  }

  function toggleDetailsMode(mode) {
    if (typeof mode === "string" && mode.length > 0) {
      detailsMode.value = mode
    }
  }

  function onBackFromDetails() {
    if (detailsMode.value === "displayControls" || detailsMode.value === "filter") {
      toggleDetailsMode("advanced")
      return false
    }
    switchSectionScope("grid")
    return false
  }

  function canBubbleGridEvent(event) {
    const eventName = event?.detail?.name
    if (eventName === "rotate_v_cam" || eventName === "menu") return true
    if (BUBBLE_EVENTS.includes(eventName)) return true
    return false
  }

  function canBubbleDetailsEvent(event) {
    const eventName = event?.detail?.name
    if (eventName === "rotate_v_cam" || eventName === "menu") return true
    if (BUBBLE_EVENTS.includes(eventName)) return true
    return false
  }

  function canDeactivateGrid() {
    return screenHeaderPath.value.length <= 1
  }

  const requestNavigation = options.requestNavigation
  const requestBackFromGrid = options.requestBackFromGrid
  const requestItemDoubleClick = options.requestItemDoubleClick

  async function onItemSelect(item) {
    if (!isEnabled.value) return
    if (Array.isArray(item?.gotoPath) && item.gotoPath.length > 0) {
      if (typeof requestNavigation === "function") {
        try {
          await requestNavigation({ item, gotoPath: [...item.gotoPath] })
        } catch (error) {
          logger.error("Freeroam level selector navigation request failed:", error)
        }
      }
      return
    }
    if (item?.showDetails) {
      await focusItem(item)
      switchSectionScope("details")
    }
  }

  function onItemDeselect() {
    if (!isEnabled.value) return
    clearActiveItem()
  }

  async function onItemDoubleClick(item) {
    if (!isEnabled.value || !item?.doubleClickDetails) return
    const payload = {
      item,
      details: item.doubleClickDetails,
      backendName: BACKEND_NAME,
      defaultPrevented: false,
      preventDefault() {
        payload.defaultPrevented = true
      },
    }
    if (typeof requestItemDoubleClick === "function") {
      try {
        await requestItemDoubleClick(payload)
      } catch (error) {
        logger.error("Freeroam level selector double click request failed:", error)
      }
    }
    if (payload.defaultPrevented) return
    await executeDoubleClick(item)
  }

  async function onBackFromGrid() {
    if (typeof requestBackFromGrid === "function") {
      try {
        await requestBackFromGrid({
          currentPathSegments: [...currentPath.value.keys],
          isAtGridRoot: screenHeaderPath.value.length <= 1,
          defaultPrevented: false,
          preventDefault() {},
        })
      } catch (error) {
        logger.error("Freeroam level selector back-from-grid request failed:", error)
      }
    }
  }

  function onItemFocus(item) {
    if (!isEnabled.value) return
    // Mirror the freeroam vehicle grid: focusing a leaf tile (one that has a
    // details payload and no drilldown `gotoPath`) preselects GameplayDetails.
    // Drilldown/cluster tiles clear stale details so GameplayDetails does not
    // stay stuck on the previously focused leaf.
    if (!isDrilldownItem(item) && resolveDetailsRequestPayload(item)) {
      void focusItem(item)
      return
    }
    clearActiveDetailsState()
  }

  const scrollPositions = new Map()
  let scrollSaveTimeout = null
  let attachedScrollElement = null
  let attachedScrollHandler = null

  function getScrollPathKey() {
    return Array.isArray(currentPath.value.keys) ? currentPath.value.keys.join("/") : ""
  }

  function saveScrollPositionForSegments(segments) {
    const element = gridScrollableContentElement.value
    if (!element) return
    const key = Array.isArray(segments) ? segments.join("/") : ""
    scrollPositions.set(key, element.scrollTop)
  }

  function restoreScrollPosition() {
    const element = gridScrollableContentElement.value
    if (!element) return
    const saved = scrollPositions.get(getScrollPathKey())
    if (saved === undefined) return
    nextTick(() => {
      if (!gridScrollableContentElement.value) return
      gridScrollableContentElement.value.scrollTop = saved
    })
  }

  function detachScrollListener() {
    if (!attachedScrollElement || !attachedScrollHandler) return
    attachedScrollElement.removeEventListener("scroll", attachedScrollHandler)
    attachedScrollElement = null
    attachedScrollHandler = null
  }

  function attachScrollListener(element) {
    attachedScrollElement = element
    attachedScrollHandler = () => {
      if (scrollSaveTimeout) clearTimeout(scrollSaveTimeout)
      scrollSaveTimeout = setTimeout(() => {
        saveScrollPositionForSegments(currentPath.value.keys)
      }, 100)
    }
    element.addEventListener("scroll", attachedScrollHandler)
  }

  watch(gridScrollableContentElement, element => {
    detachScrollListener()
    if (element) attachScrollListener(element)
  }, { immediate: true })

  // Hydrate from the route lifecycle snapshot supplied by the wizard. Watching
  // the snapshot directly means re-entering a route (with a fresh snapshot)
  // replaces the previous grid contents without any extra getSelectorSnapshot
  // pull.
  //
  // When the wizard route does not include a level snapshot (cold load while
  // util_asyncBulkLoader.loadLevels is still running), keep the grid in its
  // loading state so the progress bar stays visible and UINav/tab blockers
  // remain active until FreeroamSelectorDataLoaded fires.
  watch(
    () => readMaybeRef(initialSnapshotOption),
    snapshotPayload => {
      if (!isEnabled.value) return
      if (!isPlainObject(snapshotPayload) && !isPlainObject(unwrapSnapshot(snapshotPayload))) {
        isLoading.value = true
        // logger.debug("FreeroamLevelGridSelector.initialSnapshot.pendingAsyncLoad", {
        //   routeName: routeDataStore.routeName,
        // })
        return
      }
      const ok = hydrateFromSnapshot(snapshotPayload)
      // logger.debug("FreeroamLevelGridSelector.hydrateFromInitialSnapshot", {
      //   routeName: routeDataStore.routeName,
      //   applied: ok,
      // })
    },
    { immediate: true, deep: false },
  )

  watch(isEnabled, enabled => {
    if (!enabled) return
    const snapshotPayload = readMaybeRef(initialSnapshotOption)
    if (!isPlainObject(snapshotPayload) && !isPlainObject(unwrapSnapshot(snapshotPayload))) {
      isLoading.value = true
      return
    }
    hydrateFromSnapshot(snapshotPayload)
  })

  const refreshAllHandler = async targetBackendName => {
    if (targetBackendName !== BACKEND_NAME) return
    const requestId = nextRequestId("snapshot")
    try {
      await lua.ui_freeroamSelector_general.emitDisplayDataSnapshot(requestId)
    } catch (error) {
      logger.error("Freeroam level selector refresh-all snapshot emit failed:", error)
    }
  }

  const refreshCurrentItemDetailsHandler = async targetBackendName => {
    if (targetBackendName !== BACKEND_NAME) return
    if (!activeItem.value?.showDetails) return
    const requestId = nextRequestId("details")
    try {
      await lua.ui_gridSelector.requestDetails(BACKEND_NAME, activeItem.value.showDetails, requestId)
    } catch (error) {
      logger.error("Freeroam level selector refresh-current-item details request failed:", error)
    }
  }

  const executeButtonHandler = (targetBackendName, buttonId, additionalData) => {
    if (targetBackendName !== BACKEND_NAME) return
    void executeButton(buttonId, additionalData)
  }

  bridgeEvents?.on?.("gridSelectorRefreshAll", refreshAllHandler)
  bridgeEvents?.on?.("gridSelectorRefreshCurrentItemDetails", refreshCurrentItemDetailsHandler)
  bridgeEvents?.on?.("gridSelectorExecuteButton", executeButtonHandler)

  onMounted(() => {
    // The `initialSnapshot` watcher with { immediate: true } already hydrated
    // the composable state before mount. All we need here is to restore the
    // scroll position once the DOM exists.
    if (!isEnabled.value) return
    restoreScrollPosition()
  })

  onUnmounted(() => {
    detachScrollListener()
    if (scrollSaveTimeout) clearTimeout(scrollSaveTimeout)
    bridgeEvents?.off?.(SNAPSHOT_EVENT, handleDisplayDataSnapshot)
    bridgeEvents?.off?.(DETAILS_EVENT, handleDetailsPayload)
    bridgeEvents?.off?.(DATA_LOADED_EVENT, handleDataLoadedPayload)
    bridgeEvents?.off?.("gridSelectorRefreshAll", refreshAllHandler)
    bridgeEvents?.off?.("gridSelectorRefreshCurrentItemDetails", refreshCurrentItemDetailsHandler)
    bridgeEvents?.off?.("gridSelectorExecuteButton", executeButtonHandler)
    try {
      lua.ui_gridSelector.closedFromUI(BACKEND_NAME)
    } catch (error) {
      // logger.debug("Freeroam level selector closedFromUI on unmount failed:", error)
    }
  })

  const displaySize = computed(() => {
    const option = displayData.value.find(displayOption => displayOption?.key === "displaySize")
    return option?.value || "medium"
  })
  const hasSelectedItem = computed(() => !!activeItem.value)
  const canSwitchDetails = computed(() => activeSectionScope.value !== "default" || detailsMode.value === "advanced")

  function isFilterLocked(propName, option = null) {
    const locks = lockedFiltersByProp.value?.[propName]
    if (!locks) return false
    if (option !== null && option !== undefined) {
      return Object.prototype.hasOwnProperty.call(locks, option)
    }
    return Object.keys(locks).length > 0
  }

  function isFilterOptionLocked(propName, option) {
    return isFilterLocked(propName, option)
  }

  function isRangeFilterLocked(propName) {
    return isFilterLocked(propName)
  }

  const gridSelectorProps = computed(() => ({
    groups: groups.value,
    displaySize: displaySize.value,
    screenHeaderTitle: screenHeaderTitle.value,
    activeItem: activeItem.value,
    activeItemDetails: activeItemDetails.value,
    autoFocusKey: autoFocusKey.value,
    searchText: searchText.value,
    filterList: filterList.value,
    filterByProp: filterByProp.value,
    commonFilters: commonFilters.value,
    onlyCommonFilters: onlyCommonFilters.value,
    displayData: displayData.value,
    managementDetails: managementDetails.value,
    isFilterLocked,
    isFilterOptionLocked,
    isRangeFilterLocked,
    activeSectionScope: activeSectionScope.value,
    detailsMode: detailsMode.value,
    hasSelectedItem: hasSelectedItem.value,
    canSwitchDetails: canSwitchDetails.value,
    hiddenTabs: HIDDEN_TABS,
    canBubbleGridEvent,
    canBubbleDetailsEvent,
    canDeactivateGrid,
    loading: isLoading.value,
  }))

  const gridSelectorListeners = {
    "focus-item": onItemFocus,
    "select-item": onItemSelect,
    "deselect-item": onItemDeselect,
    "item-double-click": onItemDoubleClick,
    "toggle-favorite": () => toggleFavourite(),
    "switch-details-mode": switchDetailsMode,
    "toggle-details-mode": toggleDetailsMode,
    "set-details-scope": setDetailsScope,
    "grid-activate": onGridActivate,
    "details-activate": onDetailsActivate,
    "toggle-section-scope": onToggleSectionScope,
    "back-from-details": onBackFromDetails,
    "back-from-grid": onBackFromGrid,
    "search-text-change": setSearchText,
    "filter-toggle": toggleFilter,
    "range-filter-update": updateRangeFilter,
    "range-filter-reset": resetRangeFilter,
    "display-data-update": updateDisplayData,
    "display-data-reset": resetDisplayDataToDefaults,
    "execute-button": executeButton,
    "toggle-item-favorite": toggleFavourite,
    "explore-folder": exploreFolder,
    "go-to-mod": goToMod,
  }

  return {
    gridSelectorProps,
    gridSelectorListeners,

    groups,
    displayData,
    displaySize,
    screenHeaderTitle,
    screenHeaderPath,
    activeItem,
    activeItemDetails,
    autoFocusKey,
    searchText,
    filterList,
    filterByProp,
    commonFilters,
    onlyCommonFilters,
    activeFilters,
    lockedFiltersByProp,
    managementDetails,
    detailsMode,
    activeSectionScope,
    currentPath,
    hasSelectedItem,
    canSwitchDetails,
    isLoading,
    dataLoadedSignal,
    lastLoadedRouteName,

    onItemSelect,
    onItemFocus,
    onItemDeselect,
    onItemDoubleClick,
    onBackFromGrid,
    onGridActivate,
    onDetailsActivate,
    switchDetailsMode,
    toggleDetailsMode,
    onToggleSectionScope,
    setDetailsScope,
    onBackFromDetails,
    setSearchText,
    setSearchTextSilently,
    clearSearch,
    toggleFilter,
    updateRangeFilter,
    resetRangeFilter,
    clearFilters,
    updateDisplayData,
    resetDisplayDataToDefaults,
    executeButton,
    toggleFavourite,
    exploreFolder,
    goToMod,
    focusItem,
    clearActiveItem,
    setAutoFocusKey,
    markCurrentSelection,
    hydrateFromSnapshot,
    setCurrentPath,
    setCurrentPathSilently,
    isFilterLocked,
    isFilterOptionLocked,
    isRangeFilterLocked,

    normalizePath: normalizeGridPath,
  }
}
