import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { lua } from "@/bridge"
import useControls from "@/services/controls"
import logger from "@/services/logger"
import { debounce } from "@/utils/rateLimit"
import { useScopedNav } from "@/services/scopedNav/api"
import { useRouteDataStore } from "@/services/routeData"
import useGridSelector from "./useGridSelector"
import useGridSelectorScopes from "./useGridSelectorScopes"
import useGridSelectorRouting from "./useGridSelectorRouting"
import useGridSelectorScroll from "./useGridSelectorScroll"
import {
  GRID_SCOPE_ID,
  hasRenderableTiles,
  normalizePath,
} from "./gridSelectorHelpers"

function readMaybeRef(value, fallback) {
  if (value && typeof value === "object" && "value" in value) {
    return value.value ?? fallback
  }
  return value ?? fallback
}

function ensurePreventableEvent(payload = {}) {
  if (typeof payload.preventDefault === "function" && typeof payload.defaultPrevented === "boolean") {
    return payload
  }

  const eventPayload = {
    ...payload,
    defaultPrevented: false,
  }
  eventPayload.preventDefault = () => {
    eventPayload.defaultPrevented = true
  }
  return eventPayload
}

function resolveCallback(maybeCallback) {
  const callback = readMaybeRef(maybeCallback, null)
  return typeof callback === "function" ? callback : null
}

function waitForAnimationFrame() {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }
  return Promise.resolve()
}

export default function useGridSelectorController(options = {}) {
  const route = readMaybeRef(options.route, useRoute())
  const routeDataStore = readMaybeRef(options.routeDataStore, useRouteDataStore())

  const backendName = computed(() => readMaybeRef(options.backendName, "vehicleSelector"))
  const defaultPath = computed(() => normalizePath(readMaybeRef(options.defaultPath, { keys: ["allModels"] })))
  const defaultDetailsMode = computed(() => readMaybeRef(options.defaultDetailsMode, "detail"))
  const hiddenTabs = computed(() => readMaybeRef(options.hiddenTabs, []))
  const bubbleEvents = computed(() => readMaybeRef(options.bubbleEvents, []))
  const enabled = computed(() => readMaybeRef(options.enabled, true) !== false)

  const enableDefaultNavigation = computed(() => readMaybeRef(options.enableDefaultNavigation, true) !== false)
  const enableDefaultBackFromGrid = computed(() => readMaybeRef(options.enableDefaultBackFromGrid, true) !== false)
  const enableDefaultDoubleClick = computed(() => readMaybeRef(options.enableDefaultDoubleClick, true) !== false)
  const activateGridScopeOnMount = computed(() => readMaybeRef(options.activateGridScopeOnMount, true) !== false)
  const getCurrentPathSegments = computed(() => resolveCallback(options.getCurrentPathSegments))

  const closeBackendOnUnmount = computed(() => readMaybeRef(options.closeBackendOnUnmount, true) !== false)
  const closeBackendOnDisable = computed(() => readMaybeRef(options.closeBackendOnDisable, false) === true)

  const gridScrollableContentElement = computed(() => readMaybeRef(options.gridScrollableContentElement, null))

  const Controls = useControls()
  const { showIfController: showIfControllerRef, isControllerUsed } = storeToRefs(Controls)
  const { activateScope, requestScopeFocus } = useScopedNav()

  const store = useGridSelector(backendName.value, defaultPath.value, defaultDetailsMode.value, () => isControllerUsed.value)
  const {
    groups,
    filterList,
    filterByProp,
    commonFilters,
    onlyCommonFilters,
    displayData,
    searchText,
    managementDetails,
    detailsMode,
    selectedItem,
    screenHeaderTitle,
    screenHeaderPath,
    activeItem,
    activeItemDetails,
  } = store

  const selectorProps = {
    get backendName() {
      return backendName.value
    },
    get defaultPath() {
      return defaultPath.value
    },
    get defaultDetailsMode() {
      return defaultDetailsMode.value
    },
  }

  const hasLoadedInitialSelectorData = ref(false)
  const hasProcessedInitialRoutePathWatcher = ref(false)
  const hasRenderedGroupsDom = ref(false)
  let initializeRequestId = 0
  let hasWarnedMissingPathSegmentsAdapter = false
  let hasWarnedInvalidPathSegments = false

  function markRoutePathWatcherProcessed() {
    hasProcessedInitialRoutePathWatcher.value = true
  }

  function markInitialSelectorDataLoaded() {
    hasLoadedInitialSelectorData.value = true
  }

  function markGroupsDomRendered() {
    hasRenderedGroupsDom.value = true
  }

  function handleRouteFullPathChange() {
    hasRenderedGroupsDom.value = false
  }

  async function initializeSelectorData() {
    const requestId = ++initializeRequestId
    await store.initialize()
    if (requestId !== initializeRequestId) return
  }

  function resolveCurrentPathSegments() {
    const fallbackPathSegments = normalizePath(defaultPath.value).keys
    const pathSegmentsAdapter = getCurrentPathSegments.value

    if (typeof pathSegmentsAdapter !== "function") {
      if (!hasWarnedMissingPathSegmentsAdapter) {
        hasWarnedMissingPathSegmentsAdapter = true
        logger.warn("useGridSelectorController requires getCurrentPathSegments adapter; falling back to defaultPath", {
          backendName: backendName.value,
          defaultPath: fallbackPathSegments,
        })
      }
      return [...fallbackPathSegments]
    }

    const resolvedPathSegments = pathSegmentsAdapter()
    if (!Array.isArray(resolvedPathSegments)) {
      if (!hasWarnedInvalidPathSegments) {
        hasWarnedInvalidPathSegments = true
        logger.warn("useGridSelectorController.getCurrentPathSegments must return an array; falling back to defaultPath", {
          backendName: backendName.value,
          defaultPath: fallbackPathSegments,
          resolvedPathSegments,
        })
      }
      return [...fallbackPathSegments]
    }

    return [...resolvedPathSegments]
  }

  const {
    activeSectionScope,
    canSwitchDetails,
    switchDetailsMode,
    toggleDetailsMode,
    switchScope,
    onToggleSectionScope,
    onGridActivate,
    onDetailsActivate,
    setDetailsScope,
    canBubbleGridEvent,
    canBubbleDetailsEvent,
    canDeactivateGrid,
    onBackFromDetails,
  } = useGridSelectorScopes({
    detailsMode,
    screenHeaderPath,
    hiddenTabs,
    bubbleEvents,
    setDetailsMode: store.setDetailsMode,
    activateScope,
  })

  const handleNavigationRequest = async navigationRequest => {
    const eventPayload = ensurePreventableEvent(navigationRequest)
    const requestNavigation = resolveCallback(options.requestNavigation)

    if (!requestNavigation) {
      logger.warn("useGridSelectorController.requestNavigation handler missing", eventPayload)
      return
    }

    try {
      await requestNavigation(eventPayload)
    } catch (error) {
      logger.error("useGridSelectorController.requestNavigation", error)
    }

    if (eventPayload.defaultPrevented || !enableDefaultNavigation.value) {
      return
    }
  }

  const handleBackFromGrid = async payload => {
    const backEvent = ensurePreventableEvent(payload)
    const requestBackFromGrid = resolveCallback(options.requestBackFromGrid)

    if (requestBackFromGrid) {
      try {
        await requestBackFromGrid(backEvent)
      } catch (error) {
        logger.error("useGridSelectorController.requestBackFromGrid", error)
      }
    }

    if (backEvent.defaultPrevented) {
      return
    }

    if (!enableDefaultBackFromGrid.value) {
      return
    }

    await lua.extensions.ui_router.back()
  }

  const {
    currentPathSegments,
    routeNav,
    onBackFromGrid: onBackFromGridRequest,
    onBreadBack,
    setCurrentPath,
  } = useGridSelectorRouting({
    props: selectorProps,
    store,
    screenHeaderPath,
    switchScope,
    getCurrentPathSegments: resolveCurrentPathSegments,
    requestNavigation: navigationRequest => {
      void handleNavigationRequest(navigationRequest)
    },
    requestBackFromGrid: backPayload => {
      void handleBackFromGrid(backPayload)
    },
  })

  const { restoreScrollPosition, saveScrollPositionForSegments } = useGridSelectorScroll({
    currentPathSegments,
    gridScrollableContentElement,
  })

  const displaySize = computed(() => {
    const option = displayData.value.find(displayOption => displayOption.key === "displaySize")
    return option ? option.value : "medium"
  })

  const hasSelectedItem = computed(() => !!selectedItem.value)
  const isGridInDetailMode = computed(() => activeSectionScope.value === "details" && detailsMode.value === "detail")
  const preselectFocusedItem = debounce(item => onItemSelect(item, false), 200)
  const isCurrentRouteDataEntry = computed(() => {
    return !!route.name && routeDataStore.routeName === route.name
  })
  const selectorRouteStatus = computed(() => {
    if (!isCurrentRouteDataEntry.value) {
      return ""
    }
    return routeDataStore.status || ""
  })
  const selectorError = computed(() => {
    if (!isCurrentRouteDataEntry.value || selectorRouteStatus.value !== "error") {
      return null
    }
    const routeError = routeDataStore.error
    if (typeof routeError === "string") {
      return routeError
    }
    if (routeError && typeof routeError.message === "string") {
      return routeError.message
    }
    return routeError ? String(routeError) : null
  })
  const isSelectorReady = computed(() => {
    if (!isCurrentRouteDataEntry.value || selectorRouteStatus.value === "error") {
      return false
    }
    return hasLoadedInitialSelectorData.value && hasRenderedGroupsDom.value
  })
  const isBootingSelector = computed(() => {
    if (!isCurrentRouteDataEntry.value) {
      return false
    }
    return !isSelectorReady.value && !selectorError.value
  })
  const resolvedShowIfController = computed(() => {
    const configuredShowIfController = readMaybeRef(options.showIfController, undefined)
    if (typeof configuredShowIfController === "boolean") {
      return configuredShowIfController
    }
    return showIfControllerRef.value
  })

  let hasInitialized = false
  let hasMounted = false
  let initialDomReadyRequestId = 0

  const initializeControllerState = () => {
    if (!enabled.value || hasInitialized) {
      return
    }
    hasInitialized = true
    void initializeSelectorData()
  }

  const cancelPendingInitialDomReadySignal = () => {
    initialDomReadyRequestId += 1
  }

  const signalInitialMountedReadiness = async () => {
    if (!enabled.value || !hasLoadedInitialSelectorData.value || hasRenderedGroupsDom.value) {
      return
    }

    const requestId = ++initialDomReadyRequestId
    await nextTick()
    await waitForAnimationFrame()

    if (requestId !== initialDomReadyRequestId) return
    if (!enabled.value || !hasLoadedInitialSelectorData.value || hasRenderedGroupsDom.value) return

    markGroupsDomRendered()
    store.notifyUIReady()
    restoreScrollPosition()
  }

  const handleGroupsChange = async newGroups => {
    if (!enabled.value) return
    if (!Array.isArray(newGroups)) return
    if (!hasLoadedInitialSelectorData.value && !hasRenderableTiles(newGroups)) return

    await nextTick()
    await nextTick()

    markGroupsDomRendered()
    store.notifyUIReady()
    restoreScrollPosition()
    if (
      store.autoFocusKey.value
      && activeSectionScope.value === "grid"
    ) {
      requestScopeFocus(GRID_SCOPE_ID, { reason: "grid-autofocus-refresh" })
    }
  }

  const handleCurrentPathChange = async (segments, oldSegments) => {
    if (!enabled.value) {
      return
    }

    if (oldSegments) {
      saveScrollPositionForSegments(oldSegments)
    }

    const path = normalizePath(segments)
    const isInitialWatcherRun = !hasProcessedInitialRoutePathWatcher.value
    markRoutePathWatcherProcessed()

    await store.setCurrentPath(path)
    if (isInitialWatcherRun) {
      markInitialSelectorDataLoaded()
      void signalInitialMountedReadiness()
    }
  }

  watch(
    () => [backendName.value, defaultPath.value, defaultDetailsMode.value],
    ([newBackendName, newDefaultPath, newDefaultDetailsMode], oldValues = []) => {
      if (!enabled.value) {
        return
      }

      const oldBackendName = oldValues[0]
      const oldDefaultDetailsMode = oldValues[2]
      if (newBackendName !== oldBackendName && newDefaultPath) {
        void store.setCurrentPath(normalizePath(newDefaultPath))
      }
      if (newDefaultDetailsMode !== oldDefaultDetailsMode) {
        store.setDetailsMode(newDefaultDetailsMode)
      }
    },
    { deep: true }
  )

  store.setOnBackFromDetailsCallback(() => {
    onBackFromDetails()
  })

  watch(
    groups,
    newGroups => {
      void handleGroupsChange(newGroups)
    },
    { immediate: true }
  )

  watch(
    currentPathSegments,
    (segments, previousSegments) => {
      void handleCurrentPathChange(segments, previousSegments)
    },
    { immediate: true }
  )

  watch(
    () => route.fullPath,
    () => {
      if (!enabled.value) {
        return
      }
      cancelPendingInitialDomReadySignal()
      handleRouteFullPathChange()
    }
  )

  watch(
    enabled,
    (isEnabled, wasEnabled) => {
      if (isEnabled) {
        initializeControllerState()
        if (wasEnabled === false) {
          void handleCurrentPathChange(currentPathSegments.value)
          void handleGroupsChange(groups.value)
          void signalInitialMountedReadiness()
        }
        if (hasMounted && activateGridScopeOnMount.value) {
          nextTick(() => {
            activateScope(GRID_SCOPE_ID)
          })
        }
        return
      }

      preselectFocusedItem.cancel()
      cancelPendingInitialDomReadySignal()
      if (closeBackendOnDisable.value) {
        lua.ui_gridSelector.closedFromUI(backendName.value)
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    hasMounted = true
    if (!enabled.value || !activateGridScopeOnMount.value) {
      return
    }
    nextTick(() => {
      activateScope(GRID_SCOPE_ID)
    })
  })

  onUnmounted(() => {
    preselectFocusedItem.cancel()
    cancelPendingInitialDomReadySignal()
    if (closeBackendOnUnmount.value) {
      lua.ui_gridSelector.closedFromUI(backendName.value)
    }
  })

  function onItemFocus(item) {
    if (!enabled.value || isGridInDetailMode.value) {
      return
    }

    if (item?.showDetails) {
      store.setPreviewItem(item)
    }

    if (resolvedShowIfController.value) {
      preselectFocusedItem(item)
    }
  }

  async function onItemSelect(item, doNavigation = true) {
    if (!enabled.value) {
      return
    }

    preselectFocusedItem.cancel()

    if (item.gotoPath && Array.isArray(item.gotoPath)) {
      store.prevSelectedItem.value = item.key
      let navigationRequest = null
      if (doNavigation) {
        navigationRequest = routeNav(item)
        if (!navigationRequest) {
          logger.warn("useGridSelectorController.onItemSelect: navigation request not emitted", item)
        }
      }
      store.clearSelectedItem()
      if (doNavigation && navigationRequest) {
        switchScope("grid")
      }
      return
    }

    if (!item.showDetails) {
      return
    }

    await store.setSelectedItem(item)
    if (doNavigation) {
      switchScope("details")
    }
  }

  function onItemDeselect() {
    if (!enabled.value) {
      return
    }
    store.clearSelectedItem()
  }

  async function onItemDoubleClick(item) {
    if (!enabled.value || !item?.doubleClickDetails) {
      return
    }

    const payload = ensurePreventableEvent({
      item,
      details: item.doubleClickDetails,
      backendName: backendName.value,
    })
    const requestItemDoubleClick = resolveCallback(options.requestItemDoubleClick)

    if (requestItemDoubleClick) {
      try {
        await requestItemDoubleClick(payload)
      } catch (error) {
        logger.error("useGridSelectorController.requestItemDoubleClick", error)
      }
    }

    if (payload.defaultPrevented || !enableDefaultDoubleClick.value) {
      return
    }

    const details = payload?.details
    if (!details) {
      return
    }

    const resolvedBackendName = payload?.backendName || backendName.value
    if (typeof resolvedBackendName !== "string" || resolvedBackendName.length === 0) {
      logger.warn("useGridSelectorController.onItemDoubleClick: Missing backendName", payload)
      return
    }

    try {
      await lua.ui_gridSelector.executeDoubleClick(resolvedBackendName, details)
    } catch (error) {
      logger.error("useGridSelectorController.onItemDoubleClick", error)
    }
  }

  function onToggleFavorite() {
    if (!enabled.value || !activeItem.value?.showDetails) {
      return
    }
    void toggleFavourite(activeItem.value)
  }

  function setSearchText(searchValue) {
    if (!enabled.value) {
      return
    }
    if (isBootingSelector.value) {
      return store.setSearchTextSilently(searchValue)
    }
    return store.setSearchText(searchValue)
  }

  function setSearchTextSilently(searchValue) {
    if (!enabled.value) {
      return
    }
    return store.setSearchTextSilently(searchValue)
  }

  function clearSearch() {
    if (!enabled.value) {
      return
    }
    return store.clearSearch()
  }

  async function clearFilters() {
    if (!enabled.value) {
      return
    }
    if (typeof store.clearAllFilters === "function") {
      return store.clearAllFilters()
    }
    const filtersToReset = Array.isArray(store.activeFilters?.value) ? [...store.activeFilters.value] : []
    for (const filter of filtersToReset) {
      if (!filter?.propName) {
        continue
      }
      if (filter.type === "range") {
        await store.resetRangeFilter(filter.propName)
      } else {
        await store.resetSetFilter(filter.propName)
      }
    }
  }

  function toggleFilter(propName, option) {
    if (!enabled.value || !propName) {
      return
    }
    return store.toggleFilter(propName, option)
  }

  function updateRangeFilter(propName, min, max) {
    if (!enabled.value || !propName) {
      return
    }
    return store.updateRangeFilter(propName, min, max)
  }

  function resetRangeFilter(propName) {
    if (!enabled.value || !propName) {
      return
    }
    return store.resetRangeFilter(propName)
  }

  function updateDisplayData(key, value) {
    if (!enabled.value || !key) {
      return
    }
    return store.updateDisplayData(key, value)
  }

  function resetDisplayDataToDefaults() {
    if (!enabled.value) {
      return
    }
    return store.resetDisplayDataToDefaults()
  }

  function executeButton(buttonId, additionalData) {
    if (!enabled.value || !buttonId) {
      return
    }
    return store.executeButton(buttonId, additionalData)
  }

  function toggleFavourite(item = activeItem.value) {
    if (!enabled.value || !item?.showDetails) {
      return
    }
    return store.toggleFavourite(item)
  }

  function exploreFolder(path) {
    if (!enabled.value) {
      return
    }
    return store.exploreFolder(path)
  }

  function goToMod(modId) {
    if (!enabled.value) {
      return
    }
    return store.goToMod(modId)
  }

  function getSelectorSnapshot() {
    if (typeof store.getSelectorSnapshot !== "function") {
      return null
    }
    return store.getSelectorSnapshot()
  }

  function hydrateFromSnapshot(snapshot) {
    if (typeof store.hydrateFromSnapshot !== "function") {
      return null
    }
    return store.hydrateFromSnapshot(snapshot)
  }

  function hydrateFromBackendSnapshot(path) {
    if (typeof store.hydrateFromBackendSnapshot !== "function") {
      return null
    }
    return store.hydrateFromBackendSnapshot(path)
  }

  async function refreshSelectorData(requestedSlices) {
    if (typeof store.refreshSelectorData !== "function") {
      return null
    }
    return store.refreshSelectorData(requestedSlices)
  }

  function applyFiltersBatch(operations, options) {
    if (!enabled.value) {
      return false
    }
    if (typeof store.applyFiltersBatch !== "function") {
      return false
    }
    return store.applyFiltersBatch(operations, options)
  }

  function setCurrentPathSilently(path) {
    if (!enabled.value) {
      return
    }
    if (typeof store.setCurrentPathSilently !== "function") {
      return
    }
    return store.setCurrentPathSilently(path)
  }

  function onGridBackRequest() {
    if (!enabled.value) {
      return false
    }
    return onBackFromGridRequest()
  }

  /**
   * Binding surface consumed by `GridSelector.vue`.
   * - `gridSelectorProps` keys match `GridSelector` prop names.
   * - `gridSelectorListeners` keys match emitted event names for `v-on` object syntax.
   */
  const gridSelectorProps = computed(() => ({
    groups: groups.value,
    displaySize: displaySize.value,
    screenHeaderTitle: screenHeaderTitle.value,
    activeItem: activeItem.value,
    activeItemDetails: activeItemDetails.value,
    autoFocusKey: store.autoFocusKey.value,
    searchText: searchText.value,
    filterList: filterList.value,
    filterByProp: filterByProp.value,
    commonFilters: commonFilters.value,
    onlyCommonFilters: onlyCommonFilters.value,
    displayData: displayData.value,
    managementDetails: managementDetails.value,
    isFilterLocked: store.isFilterLocked,
    isFilterOptionLocked: store.isFilterOptionLocked,
    isRangeFilterLocked: store.isRangeFilterLocked,
    activeSectionScope: activeSectionScope.value,
    showIfController: resolvedShowIfController.value,
    detailsMode: detailsMode.value,
    hasSelectedItem: hasSelectedItem.value,
    canSwitchDetails: canSwitchDetails.value,
    hiddenTabs: hiddenTabs.value,
    canBubbleGridEvent,
    canBubbleDetailsEvent,
    canDeactivateGrid,
    isBootingSelector: isBootingSelector.value,
    isSelectorReady: isSelectorReady.value,
    selectorError: selectorError.value,
    selectorRouteStatus: selectorRouteStatus.value,
  }))

  const gridSelectorListeners = {
    "focus-item": onItemFocus,
    "select-item": onItemSelect,
    "deselect-item": onItemDeselect,
    "item-double-click": onItemDoubleClick,
    "toggle-favorite": onToggleFavorite,
    "switch-details-mode": switchDetailsMode,
    "toggle-details-mode": toggleDetailsMode,
    "set-details-scope": setDetailsScope,
    "grid-activate": onGridActivate,
    "details-activate": onDetailsActivate,
    "toggle-section-scope": onToggleSectionScope,
    "back-from-details": onBackFromDetails,
    "back-from-grid": onGridBackRequest,
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
    displaySize,
    screenHeaderTitle,
    screenHeaderPath,
    activeItem,
    activeItemDetails,
    autoFocusKey: store.autoFocusKey,
    activeSectionScope,
    showIfController: resolvedShowIfController,
    detailsMode,
    hasSelectedItem,
    canSwitchDetails,
    canBubbleGridEvent,
    canBubbleDetailsEvent,
    canDeactivateGrid,
    searchText,
    filterList,
    filterByProp,
    commonFilters,
    onlyCommonFilters,
    displayData,
    managementDetails,
    isFilterLocked: store.isFilterLocked,
    isFilterOptionLocked: store.isFilterOptionLocked,
    isRangeFilterLocked: store.isRangeFilterLocked,
    isBootingSelector,
    isSelectorReady,
    selectorError,
    selectorRouteStatus,

    switchDetailsMode,
    toggleDetailsMode,
    setDetailsScope,
    onToggleSectionScope,
    onGridActivate,
    onDetailsActivate,
    onBackFromDetails,
    onGridBackRequest,
    onItemFocus,
    onItemSelect,
    onItemDeselect,
    onItemDoubleClick,
    onToggleFavorite,
    setSearchText,
    setSearchTextSilently,
    toggleFilter,
    updateRangeFilter,
    resetRangeFilter,
    updateDisplayData,
    resetDisplayDataToDefaults,
    executeButton,
    toggleFavourite,
    exploreFolder,
    goToMod,
    getSelectorSnapshot,
    hydrateFromSnapshot,
    hydrateFromBackendSnapshot,
    refreshSelectorData,
    applyFiltersBatch,

    clearSearch,
    clearFilters,
    setCurrentPath,
    setCurrentPathSilently,
    onBreadBack,
  }
}
