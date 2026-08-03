import { ref, computed, watch } from "vue"
import { lua } from "@/bridge"
import logger from "@/services/logger"
import { useRouteDataStore } from "@/services/routeData"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

// Shared configurator composable for the three "oneshot race" modes
// (quickrace, lightRunner, busRoute). Mirrors freeroam_freeroamConfigurator's
// role for the freeroam wizard, scaled down to this family's much smaller
// surface, and delegates to whichever Lua bridge module `mode.bridgeModule`
// names (each a thin per-mode wrapper around oneshotRaceCore.lua).
export default function useOneshotRaceConfigurator(mode) {
  const routeDataStore = useRouteDataStore()
  const bridge = lua[mode.bridgeModule]

  const config = ref(null)
  const error = ref(null)
  const isLoading = ref(false)

  let requestId = 0

  const level = computed(() => config.value?.level || null)
  const middle = computed(() => config.value?.middle || null)
  const vehicle = computed(() => config.value?.vehicle || null)
  // Lua serializes an empty table as `{}`, indistinguishable from an empty
  // object on the JS side, so an empty highscores list can arrive as a plain
  // object rather than an array.
  const highscores = computed(() => (Array.isArray(config.value?.highscores) ? config.value.highscores : []))
  const showLapRecords = computed(() => !!config.value?.showLapRecords)
  const isDisabled = computed(() => config.value?.isDisabled !== false)
  const settings = computed(() => middle.value?.settings || {})

  async function loadConfiguration() {
    const currentRequestId = ++requestId
    isLoading.value = true
    try {
      const data = await bridge.getConfiguration()
      if (currentRequestId !== requestId) return
      config.value = data
      error.value = null
    } catch (err) {
      if (currentRequestId !== requestId) return
      logger.error(`Failed to load ${mode.id} configuration:`, err)
      error.value = err
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false
      }
    }
  }

  function hydrateFromRouteData(wizardData) {
    if (!isPlainObject(wizardData?.config)) return false
    requestId += 1
    config.value = wizardData.config
    error.value = null
    return true
  }

  // The wizard view stays mounted across level/middle/vehicle/overview route
  // changes (only the inner panel component swaps), so route data hydration
  // is driven by a watcher rather than a one-shot onMounted hydrate.
  watch(
    () => routeDataStore.data?.[mode.routeName],
    wizardData => hydrateFromRouteData(wizardData),
    { immediate: true }
  )

  async function initialize() {
    if (!hydrateFromRouteData(routeDataStore.data?.[mode.routeName])) {
      await loadConfiguration()
    }
  }

  async function selectLevel(levelName) {
    await bridge.selectLevel(levelName)
    await loadConfiguration()
  }

  async function selectMiddle(levelName, middleName) {
    await bridge.selectMiddle(levelName, middleName)
    await loadConfiguration()
  }

  async function selectVehicle(model, vehicleConfig, additionalData) {
    await bridge.selectVehicle(model, vehicleConfig, additionalData || {})
    await loadConfiguration()
  }

  async function updateSetting(key, value) {
    await bridge.updateSetting(key, value)
    await loadConfiguration()
  }

  async function toggleShowLapRecords() {
    await bridge.toggleShowLapRecords()
    await loadConfiguration()
  }

  async function start() {
    return bridge.start()
  }

  return {
    config,
    error,
    isLoading,
    level,
    middle,
    vehicle,
    highscores,
    showLapRecords,
    isDisabled,
    settings,

    initialize,
    loadConfiguration,
    selectLevel,
    selectMiddle,
    selectVehicle,
    updateSetting,
    toggleShowLapRecords,
    start,
  }
}
