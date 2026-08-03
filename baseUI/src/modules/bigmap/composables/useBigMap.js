import { ref, computed, watch, nextTick, unref } from "vue"
import { lua, useBridge } from "@/bridge"
import { $translate } from "@/services/translation"
import { POI_LIST_DISPLAY_MODE, isModeValid } from "../constants"

// set to true to enable logging
const DEBUG_BIGMAP = false

// Centralized debug logging utility for all bigmap components
export const debugLog = (component, message, data) => {
  if (DEBUG_BIGMAP) {
    console.log(`[BigMap:${component}] ${message}`, data)
  }
}

// Injection key for the shared instance
export const BIGMAP_KEY = Symbol.for("bigMap")

export default function useBigMap(options = {}) {
  // State
  const selectedPoi = ref(null)
  const selectedPoiIds = ref([])
  const filterData = ref([])
  const groupData = ref([])
  const poiData = ref({})
  const gameMode = ref("")
  const levelData = ref({ title: "" })
  const isDetailsVisible = ref(false)
  const poiListDisplayMode = ref(POI_LIST_DISPLAY_MODE.TREE)
  const transitionFinished = ref(false)
  const { events } = useBridge()

  const isInstantOpen = computed(() => {
    return unref(options.instant) === true
  })

  const translatedPreheadings = computed(() => {
    const preheadings = []

    if (levelData.value?.title) {
      preheadings.push($translate.instant(levelData.value.title))
    }

    if (gameMode.value) {
      preheadings.push($translate.instant(`ui.playmodes.${gameMode.value}`))
    }

    return preheadings
  })

  const currentFilterTitle = ref(null)

  // gets POI data, game state, and display mode
  const getStaticDataFromLua = async () => {
    try {
      // Get POI data
      const poiDataResult = await lua.freeroam_vueBigMap.getPoiData()
      poiData.value = poiDataResult || {}

      // Get game state info
      const gameStateResult = await lua.freeroam_vueBigMap.getGameStateInfo()
      if (gameStateResult) {
        gameMode.value = gameStateResult.gameMode || ""
        levelData.value = gameStateResult.levelData || { title: "" }
        // Get poiListDisplayMode from game state
        if (gameStateResult.poiListDisplayMode && isModeValid(gameStateResult.poiListDisplayMode)) {
          poiListDisplayMode.value = gameStateResult.poiListDisplayMode
        }
      }

      debugLog("Store", "Static data loaded from Lua", {
        poiData: poiData.value,
        gameMode: gameMode.value,
        poiListDisplayMode: poiListDisplayMode.value
      })
    } catch (error) {
      console.error("Error getting static data from Lua:", error)
    }
  }

  // gets filters and groups
  const getDynamicDataFromLua = async () => {
    try {
      // Get filter data
      const filterDataResult = await lua.freeroam_vueBigMap.getFilters()
      filterData.value = filterDataResult || []

      // Get group data
      const groupDataResult = await lua.freeroam_vueBigMap.getGroups()
      groupData.value = groupDataResult || []

      debugLog("Store", "Dynamic data loaded from Lua", {
        filterData: filterData.value,
        groupData: groupData.value
      })
    } catch (error) {
      console.error("Error getting dynamic data from Lua:", error)
    }
  }

  // Event handler for showPoiDetails hook
  const handleShowPoiDetails = (data) => {
    debugLog("Store", "Show POI details", data)
    const poiIds = data?.poiIds || []

    // Store the POI IDs list
    selectedPoiIds.value = poiIds

    if (poiIds.length === 0) {
      // No POIs to show, clear selection
      selectedPoi.value = null
      isDetailsVisible.value = false
      return
    }

    // First ID is the selected POI
    const selectedPoiId = poiIds[0]
    if (selectedPoiId && poiData.value[selectedPoiId]) {
      selectedPoi.value = poiData.value[selectedPoiId]
      isDetailsVisible.value = true
    } else {
      selectedPoi.value = null
      isDetailsVisible.value = false
    }
  }

  const toggleGroupVisibility = async (groupKey) => {
    debugLog("Store", "Toggling group visibility", groupKey)

    try {
      // there's a slight discrepancy between the JS function name and the Lua function name, but this is the correct name
      await lua.freeroam_vueBigMap.toggleFiltersByIds([groupKey])
      await getDynamicDataFromLua()
    } catch (error) {
      console.error("Error toggling group visibility:", error)
    }
  }

  const toggleFilterSectionVisibility = async (filterKey) => {
    debugLog("Store", "Toggling filter visibility", filterKey)

    try {
      await lua.freeroam_vueBigMap.toggleFilterSectionById(filterKey)
      let filterSection = filterData.value.find(filter => filter.key === filterKey)
      if (filterSection) {
        currentFilterTitle.value = $translate.instant(filterSection.title)
      } else {
        currentFilterTitle.value = ""
      }
      await getDynamicDataFromLua()
    } catch (error) {
      console.error("Error toggling filter visibility:", error)
    }
  }

  const selectedFilterIndex = ref(0)

  const validFilterSections = computed(() =>
    filterData.value?.filter(section => section && section.groups) || [])

  const hasActiveFilters = (filterSection) => {
    if (!filterSection?.groups || !Array.isArray(filterSection.groups)) return false

    let visibleGroups = 0
    let totalGroups = 0

    for (const group of filterSection.groups) {
      if (group?.elementCount > 0) {
        totalGroups++
        if (group.visible) {
          visibleGroups++
        }
      }
    }

    // Return true if not all groups are visible (meaning some are filtered out)
    return visibleGroups < totalGroups
  }

  const selectFilterSection = (index) => {
    if (index >= 0 && index < validFilterSections.value.length) {
      selectedFilterIndex.value = index
    }
  }

  const goToPreviousFilterSection = () => {
    if (validFilterSections.value.length === 0) return
    selectedFilterIndex.value = (selectedFilterIndex.value - 1 + validFilterSections.value.length) % validFilterSections.value.length
  }

  const goToNextFilterSection = () => {
    if (validFilterSections.value.length === 0) return
    selectedFilterIndex.value = (selectedFilterIndex.value + 1) % validFilterSections.value.length
  }

  // Keep selectedFilterIndex in bounds when the available sections change
  watch(() => validFilterSections.value.length, (newLength) => {
    if (newLength > 0 && (selectedFilterIndex.value < 0 || selectedFilterIndex.value >= newLength)) {
      selectedFilterIndex.value = 0
    }
  }, { immediate: true })

  // Apply the newly selected filter section
  watch(selectedFilterIndex, async (newIndex, oldIndex) => {
    // Only call if index actually changed (not initial undefined)
    if (oldIndex !== undefined && newIndex !== oldIndex && validFilterSections.value[newIndex]) {
      const section = validFilterSections.value[newIndex]
      await toggleFilterSectionVisibility(section.key)
    }
  })

  // Actions
  const selectPoi = async (poiId) => {
    debugLog("Store", "Selecting POI", poiId)
    try {
      // Check if collapsed mode is active (more than 1 POI selected)
      const isCollapsedMode = selectedPoiIds.value?.length > 1
      const result = await lua.freeroam_vueBigMap.selectPoiFromList(poiId, isCollapsedMode)
      if (result === "success") {
        if (poiId) {
          selectedPoi.value = poiData.value[poiId]
          isDetailsVisible.value = true
          lua.freeroam_vueBigMap.panToPoi(poiId)
        } else {
          selectedPoi.value = null
          isDetailsVisible.value = false
        }
      } else {
        console.error("Failed to select POI:", result)
      }
    } catch (error) {
      console.error("Error selecting POI:", error)
    }
  }

  const onHover = async (poiId, active) => {
    try {
      await lua.freeroam_vueBigMap.hoverPoiFromList(poiId, active)
    } catch (error) {
      console.error("Error hovering POI:", error)
    }
  }

  const executePoiAction = async (actionId) => {
    try {
      await lua.freeroam_vueBigMap.executePoiAction(actionId)
    } catch (error) {
      console.error("Error executing POI action:", error)
    }
  }

  const setPoiListDisplayMode = async (mode) => {
    if (isModeValid(mode)) {
      if (mode === POI_LIST_DISPLAY_MODE.HIDDEN && poiListDisplayMode.value === POI_LIST_DISPLAY_MODE.HIDDEN) {
        mode = POI_LIST_DISPLAY_MODE.TREE
      }
      poiListDisplayMode.value = mode
      debugLog("Store", "POI list display mode changed", mode)
      // Save to Lua settings
      try {
        await lua.freeroam_vueBigMap.setPoiListDisplayMode(mode)
      } catch (error) {
        console.error("Error setting POI list display mode:", error)
      }
    }
  }

  const cyclePoiListDisplayMode = async () => {
    const displayModes = Object.values(POI_LIST_DISPLAY_MODE)
    const currentModeIndex = displayModes.indexOf(poiListDisplayMode.value)
    const nextModeIndex = currentModeIndex === -1 ? 0 : (currentModeIndex + 1) % displayModes.length
    await setPoiListDisplayMode(displayModes[nextModeIndex])
  }

  const handleBigmapTransitionFinished = () => {
    if (isInstantOpen.value) return
    debugLog("Store", "Bigmap transition finished")
    transitionFinished.value = true
  }

  const reconcileTransitionState = async () => {
    if (isInstantOpen.value) return
    try {
      const active = await lua.freeroam_bigMapMode.bigMapActive()
      const transitioning = await lua.freeroam_bigMapMode.isTransitionActive()
      if (active && !transitioning) {
        debugLog("Store", "Recovered finished bigmap transition from Lua state")
        transitionFinished.value = true
      }
    } catch (error) {
      console.error("Error reconciling bigmap transition state:", error)
    }
  }

  // Lifecycle
  const initialize = async () => {
    try {
      if (isInstantOpen.value) {
        transitionFinished.value = false
      }

      events.on("showPoiDetails", handleShowPoiDetails)
      events.on("bigmapTransitionFinished", handleBigmapTransitionFinished)

      await reconcileTransitionState()

      let luaOptions = {ignoreUiStateChange: true}
      if (options.isMenuBigmap) {
        luaOptions.isMenuBigmap = true
      }
      if (options.isControllerUsed) {
        luaOptions.controllerUsed = true
      }

      await lua.freeroam_vueBigMap.enterBigMap(luaOptions)

      await getStaticDataFromLua()

      await getDynamicDataFromLua()

      const pendingAutoSelectPoiId = await lua.freeroam_vueBigMap.getAndClearPendingAutoSelectPoiId()
      if (pendingAutoSelectPoiId) {
        await selectPoi(pendingAutoSelectPoiId)
      }

      // Select the initial filter section
      if (validFilterSections.value.length > 0 && validFilterSections.value[selectedFilterIndex.value]) {
        const section = validFilterSections.value[selectedFilterIndex.value]
        await toggleFilterSectionVisibility(section.key)
      }

      if (isInstantOpen.value) {
        // Delay reveal one frame so instant-open can catch up with initial UI mount/data.
        debugLog("Store", "Waiting for next frame to reveal bigmap...")
        await nextTick()
        await new Promise(resolve => requestAnimationFrame(resolve))
        debugLog("Store", "Bigmap transition finished")
        transitionFinished.value = true
      }

    } catch (error) {
      console.error("Error initializing bigmap:", error)
    }
  }

  const cleanup = async () => {
    try {
      await lua.freeroam_vueBigMap.exitBigMap()

      events.off("showPoiDetails")
      events.off("bigmapTransitionFinished")
    } catch (error) {
      console.error("Error cleaning up bigmap:", error)
    }
  }

  const enableBigMapControls = async (enable) => {
    try {
      await lua.freeroam_bigMapMode.enableBigMapControls(enable)
    } catch (error) {
      console.error("Error enabling/disabling bigmap controls:", error)
    }
  }

  const setUiNavigationActive = async (active) => {
    try {
      await lua.freeroam_bigMapMode.setUiNavigationActive(active)
    } catch (error) {
      console.error("Error setting bigmap UI navigation state:", error)
    }
  }

  return {
    // State
    selectedPoi,
    selectedPoiIds,
    groupData,
    poiData,
    isDetailsVisible,
    poiListDisplayMode,
    selectedFilterIndex,

    // Computed
    translatedPreheadings,
    currentFilterTitle,
    transitionFinished,
    validFilterSections,

    // Actions
    initialize,
    cleanup,
    selectPoi,
    onHover,
    executePoiAction,
    toggleGroupVisibility,
    toggleFilterSectionVisibility,
    setPoiListDisplayMode,
    cyclePoiListDisplayMode,
    enableBigMapControls,
    setUiNavigationActive,
    hasActiveFilters,
    selectFilterSection,
    goToPreviousFilterSection,
    goToNextFilterSection,
  }
}