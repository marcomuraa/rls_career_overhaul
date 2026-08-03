import { computed, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents, useStreams } from "@/services/events"
import { clamp } from "@/utils/maths"

const OFFICIAL_CONFIG_SOURCE = "BeamNG - Official"

export function usePauseVehicleTab() {
  const events = useEvents()

  const isLoading = ref(true)
  const currentVehicleData = ref(null)
  const fuelRatio = ref(null)

  async function refreshVehicleData() {
    try {
      const data = await lua.core_vehicles.getCurrentVehicleDetails()
      currentVehicleData.value = data || null
    } catch {
      currentVehicleData.value = null
    } finally {
      isLoading.value = false
    }
  }

  function onElectricsStreamUpdate(streams) {
    const fuel = streams?.electrics?.fuel
    fuelRatio.value = typeof fuel === "number" ? clamp(fuel, 0, 1) : null
  }

  const digest = computed(() => {
    const data = currentVehicleData.value || {}
    const model = data.model || {}
    const configs = data.configs || {}
    const current = data.current || {}

    const brand = model.Brand || ""
    const modelName = model.Name || ""
    const fallbackName = configs.Name || "Unknown vehicle"
    const displayName = brand && modelName ? `${brand} ${modelName}` : modelName || fallbackName

    const configName = configs.Configuration || configs.Name || "Unknown config"
    const sourceLabel = configs.Source || "Unknown source"

    return {
      displayName,
      configName,
      modelKey: current.key || "",
      configKey: current.config_key || "",
      sourceLabel,
      isOfficialConfig: sourceLabel === OFFICIAL_CONFIG_SOURCE,
      fuelRatio: fuelRatio.value,
    }
  })

  useStreams(["electrics"], onElectricsStreamUpdate)
  events.on("VehicleChange", refreshVehicleData)

  refreshVehicleData()

  return {
    isLoading,
    digest,
    refreshVehicleData,
  }
}
