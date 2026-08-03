import { ref, computed, onUnmounted, watch } from "vue"
import { lua, useBridge } from "@/bridge"
import logger from "@/services/logger"
import { useRouteDataStore } from "@/services/routeData"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export default function useFreeroamConfigurator() {
  const { events } = useBridge()
  const routeDataStore = useRouteDataStore()

  // State
  const configData = ref(null)
  const button = ref(null)
  const error = ref(null)
  const isInitializing = ref(false)

  // Request sequence counters so stale Lua responses cannot clobber fresher
  // state (e.g. rapid step changes triggering multiple refreshes).
  const requestCounters = {
    config: 0,
    button: 0,
  }
  const nextRequestId = key => {
    requestCounters[key] = (requestCounters[key] || 0) + 1
    return requestCounters[key]
  }
  const isCurrentRequest = (key, requestId) => requestCounters[key] === requestId

  // Track which route fullPath we last hydrated from so a routeData refresh
  // for the same mount does not re-run hydration unnecessarily.
  const lastHydratedRouteFullPath = ref("")

  // Event handlers
  const refreshConfigHandler = () => {
    // logger.debug("freeroamConfiguratorRefreshConfig")
    loadConfiguration()
  }

  const refreshButtonHandler = () => {
    // logger.debug("freeroamConfiguratorRefreshButton")
    loadButtons()
  }

  // Register event listeners
  events.on("freeroamConfiguratorRefreshConfig", refreshConfigHandler)
  events.on("freeroamConfiguratorRefreshButton", refreshButtonHandler)

  // Apply a config snapshot to local state. Reused by both routeData hydration
  // and direct getConfiguration responses.
  const applyConfigSnapshot = data => {
    if (!isPlainObject(data)) return false

    if (data.options) {
      processOptionsTree(data.options)
    }
    configData.value = data
    return true
  }

  // Load button from backend, guarded by requestId so stale responses are
  // dropped when newer refreshes are already in flight.
  const loadButtons = async () => {
    const requestId = nextRequestId("button")
    try {
      const buttonData = await lua.freeroam_freeroamConfigurator.getButtons()
      if (!isCurrentRequest("button", requestId)) return
      button.value = buttonData || null
      // logger.debug("Loaded button:", buttonData)
    } catch (err) {
      if (!isCurrentRequest("button", requestId)) return
      logger.error("Failed to load button:", err)
      error.value = err
    }
  }

  // Load configuration data from Lua. RequestId guards prevent older responses
  // from overwriting state when a newer request finishes first.
  const loadConfiguration = async () => {
    const requestId = nextRequestId("config")
    try {
      error.value = null

      const data = await lua.freeroam_freeroamConfigurator.getConfiguration()
      if (!isCurrentRequest("config", requestId)) return

      applyConfigSnapshot(data)
      // logger.debug("Loaded configuration:", data)

      // Load buttons after configuration is loaded
      await loadButtons()
    } catch (err) {
      if (!isCurrentRequest("config", requestId)) return
      logger.error("Failed to load freeroam configuration:", err)
      error.value = err
    }
  }

  // Hydrate from a freeroamWizard route data snapshot when present. Returns
  // true when at least one field (config or button) was hydrated, so callers
  // can decide whether a direct fetch is still required.
  const hydrateFromRouteData = () => {
    const wizardData = routeDataStore.data?.freeroamWizard
    if (!isPlainObject(wizardData)) return false

    let hydrated = false
    if (isPlainObject(wizardData.config)) {
      // Bump the config request counter so any in-flight getConfiguration
      // response gets discarded in favor of the route data snapshot.
      nextRequestId("config")
      applyConfigSnapshot(wizardData.config)
      hydrated = true
    }
    if (wizardData.button !== undefined) {
      nextRequestId("button")
      button.value = isPlainObject(wizardData.button) ? wizardData.button : null
      hydrated = true
    }
    if (hydrated) {
      error.value = null
    }
    return hydrated
  }

  // Watch routeData mounted-ready transitions so we pick up wizard config/button
  // snapshots without an extra Lua roundtrip. Only re-hydrates once per mount.
  const stopRouteDataWatch = watch(
    () => [routeDataStore.status, routeDataStore.routeName, routeDataStore.route?.fullPath],
    ([status, routeName, fullPath]) => {
      if (status !== "mounted-ready") return
      if (!routeName) return
      const fullPathKey = typeof fullPath === "string" ? fullPath : routeName
      if (lastHydratedRouteFullPath.value === fullPathKey) return

      if (hydrateFromRouteData()) {
        lastHydratedRouteFullPath.value = fullPathKey
        // logger.debug("FreeroamConfigurator.hydration.routeData", {
        //   routeName,
        //   fullPath: fullPathKey,
        //   hasConfig: !!routeDataStore.data?.freeroamWizard?.config,
        //   hasButton: !!routeDataStore.data?.freeroamWizard?.button,
        // })
      }
    },
    { immediate: true },
  )

  // Helper to attach logic to the raw data tree. Declared as a function
  // (hoisted) because applyConfigSnapshot references it before its source
  // position via the immediate route data hydration watcher.
  function processOptionsTree(options) {
    if (!options || !Array.isArray(options)) return

    options.forEach(group => {
      if (group.key) {
        group.onChange = val => {
          group.value = val
          handleOptionChange(group.key, val)
        }
      }

      Object.defineProperty(group, "enabled", {
        get() {
          return !this.key || !!this.value
        },
        enumerable: true,
        configurable: true
      })

      if (group.options && Array.isArray(group.options)) {
        group.options.forEach(option => {
          if (option.key) {
            option.onChange = val => {
              option.value = val
              handleOptionChange(option.key, val)
            }
          }
        })
      }
    })
  }

  // Tile click handlers
  const onSpawnPointTileClick = async () => {
    try {
      await lua.freeroam_freeroamConfigurator.onSpawnPointTileClick()
      // logger.debug("Spawn point tile clicked")
    } catch (err) {
      logger.error("Failed to handle spawnpoint tile click:", err)
      error.value = err
    }
  }

  const onVehicleTileClick = async () => {
    try {
      await lua.freeroam_freeroamConfigurator.onVehicleTileClick()
      // logger.debug("Vehicle tile clicked")
    } catch (err) {
      logger.error("Failed to handle vehicle tile click:", err)
      error.value = err
    }
  }

  // Update configuration option
  const updateOption = async (key, value) => {
    try {
      await lua.freeroam_freeroamConfigurator.updateOption(key, value)
      // logger.debug(`Updated option ${key}:`, value)
    } catch (err) {
      logger.error(`Failed to update option ${key}:`, err)
      error.value = err
    }
  }

  // Handle option changes directly from select elements. Declared as a
  // function (hoisted) so processOptionsTree can reference it during the
  // immediate route data hydration that runs at setup time.
  async function handleOptionChange(key, newValue) {
    try {
      await lua.freeroam_freeroamConfigurator.updateOption(key, newValue)
      // Reload buttons after option change as they might be affected
      await loadButtons()
      // logger.debug(`Handled option change ${key}:`, newValue)
    } catch (err) {
      logger.error(`Failed to update ${key} option:`, err)
      error.value = err
    }
  }

  // Handle button clicks
  const handleButtonClick = async (buttonId) => {
    try {
      await lua.freeroam_freeroamConfigurator.triggerButton(buttonId)
      // logger.debug("Button clicked:", buttonId)
    } catch (err) {
      logger.error("Failed to trigger button:", err)
      error.value = err
    }
  }

  // Select spawn point. The post-command tile fetch is skipped when the
  // wizard route already publishes the fresh tile via routeData
  // (data.freeroamWizard.config.currentSpawnPoint); the routeData watcher
  // hydrates configData on the subsequent mount. When routeData does not
  // carry that snapshot (e.g. before the Lua side ships config snapshots,
  // or for the legacy FreeroamConfigurator view) we fall back to a targeted
  // getCurrentSpawnPointTile fetch so the consumer's right panel does not
  // display stale state.
  const selectSpawnPoint = async (levelName, spawnPointObjectName, key) => {
    try {
      if (!levelName) {
        logger.error("selectSpawnPoint: levelName is required")
        throw new Error("levelName is required")
      }

      await lua.freeroam_freeroamConfigurator.setSpawnPoint(levelName, spawnPointObjectName, key)

      if (!routeProvidesConfigSnapshot()) {
        const updatedTile = await lua.freeroam_freeroamConfigurator.getCurrentSpawnPointTile()
        if (configData.value) {
          configData.value.currentSpawnPoint = updatedTile
        }
      }

      // logger.debug("Selected spawn point:", { levelName, spawnPointObjectName })
      return true
    } catch (err) {
      logger.error("Failed to select spawn point:", err)
      error.value = err
      return false
    }
  }

  // Select vehicle. Same routeData-aware fallback as selectSpawnPoint: when
  // the wizard route ships the fresh vehicle tile via routeData, the
  // post-command fetch is skipped and the routeData watcher handles hydration.
  const selectVehicle = async (model, config, additionalData, key) => {
    try {
      if (!model) {
        logger.error("selectVehicle: model is required")
        throw new Error("model is required")
      }

      await lua.freeroam_freeroamConfigurator.setVehicle(model, config, additionalData || {}, key)

      if (!routeProvidesConfigSnapshot()) {
        const updatedTile = await lua.freeroam_freeroamConfigurator.getCurrentVehicleTile()
        if (configData.value) {
          configData.value.currentVehicle = updatedTile
        }
      }

      // logger.debug("Selected vehicle:", { model, config, additionalData })
      return true
    } catch (err) {
      logger.error("Failed to select vehicle:", err)
      error.value = err
      return false
    }
  }

  // True when the active wizard routeData already contains a config snapshot
  // we trust to refresh configData via the routeData watcher. Used to skip
  // post-command tile fetches in selectSpawnPoint / selectVehicle once the
  // Lua side ships data.freeroamWizard.config on relevant routes.
  function routeProvidesConfigSnapshot() {
    return isPlainObject(routeDataStore.data?.freeroamWizard?.config)
  }

  // Navigation helpers
  const gotoHeaderItem = (item) => {
    if (item.gotoPath) {
      window.bngVue.gotoGameState(item.gotoPath.path, { params: item.gotoPath.props })
      // logger.debug("Navigated to path:", item.gotoPath)
    }
    if (item.gotoAngularState) {
      window.bngVue.gotoAngularState(item.gotoAngularState)
      // logger.debug("Navigated to angular state:", item.gotoAngularState)
    }
    if (item.click) {
      item.click()
      // logger.debug("Navigated to click:", item.click)
    }
  }

  const goBack = () => {
    // logger.debug("goBack called")
    gotoHeaderItem({ gotoAngularState: "menu" })
  }

  // Computed properties
  const hasOptions = computed(() =>
    configData.value?.options && configData.value.options.length > 0
  )

  const hasSpawnPoint = computed(() =>
    !!configData.value?.currentSpawnPoint
  )

  const hasVehicle = computed(() =>
    !!configData.value?.currentVehicle
  )

  const canConfigureOptions = computed(() =>
    hasSpawnPoint.value && hasVehicle.value
  )

  // Helper methods
  const isGroupEnabled = (group) => {
    return !group.key || !!group.value
  }

  // Initialize function. Prefers route data hydration when the wizard route
  // already provides a config/button snapshot, falling back to direct Lua
  // fetches for the legacy FreeroamConfigurator view (which has no wizard
  // routeData) and for routes that have not yet adopted config snapshots.
  const initialize = async () => {
    if (isInitializing.value) {
      // logger.debug("Already initializing, skipping...")
      return
    }

    try {
      isInitializing.value = true
      // logger.debug("Initializing FreeroamConfigurator composable...")

      const wizardData = routeDataStore.data?.freeroamWizard
      const hasRouteConfig = isPlainObject(wizardData?.config)
      const hasRouteButton = wizardData?.button !== undefined
      const hydrated = hydrateFromRouteData()
      if (hydrated && hasRouteConfig && hasRouteButton) {
        // logger.debug("FreeroamConfigurator composable initialized from routeData")
        return
      }

      if (!hasRouteConfig) {
        await loadConfiguration()
      } else if (!hasRouteButton) {
        await loadButtons()
      }
      // logger.debug("FreeroamConfigurator composable initialized successfully")
    } catch (err) {
      logger.error("Failed to initialize FreeroamConfigurator composable:", err)
      error.value = err
    } finally {
      isInitializing.value = false
    }
  }

  // Cleanup function
  const cleanup = () => {
    // logger.debug("FreeroamConfigurator composable cleanup")
    events.off("freeroamConfiguratorRefreshConfig", refreshConfigHandler)
    events.off("freeroamConfiguratorRefreshButton", refreshButtonHandler)
    if (typeof stopRouteDataWatch === "function") {
      stopRouteDataWatch()
    }
  }

  // Lifecycle cleanup
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    configData,
    config: configData,
    button,
    error,
    isInitializing,

    // Computed
    hasOptions,
    hasSpawnPoint,
    hasVehicle,
    canConfigureOptions,

    // Actions
    initialize,
    loadConfiguration,
    loadButtons,
    onSpawnPointTileClick,
    onVehicleTileClick,
    updateOption,
    handleOptionChange,
    handleButtonClick,
    selectSpawnPoint,
    selectVehicle,
    gotoHeaderItem,
    goBack,

    // Helper methods
    isGroupEnabled
  }
}
