import { ref, onMounted, onBeforeUnmount } from "vue"
import { lua, useBridge } from "@/bridge"

const DEFAULT_VEHICLE = Object.freeze({
  name: "",
  file: null,
  preview: "/ui/images/appDefault.png",
})

const moduleState = {
  selectedVehicle: ref({ ...DEFAULT_VEHICLE }),
}

export function useScenarioVehicleSelection({ enabled = true } = {}) {
  const bridge = useBridge()
  const selectedVehicle = moduleState.selectedVehicle

  function setVehicle(vehicleData) {
    if (!vehicleData) return
    selectedVehicle.value = { ...DEFAULT_VEHICLE, ...vehicleData }
  }

  function reset() {
    selectedVehicle.value = { ...DEFAULT_VEHICLE }
  }

  async function ensureCurrentVehicleLoaded() {
    if (selectedVehicle.value.name) return
    try {
      const details = await lua.core_vehicles.getCurrentVehicleDetails()
      if (!details) return
      const setVehData = {
        official: details.configs?.aggregates?.Source?.["BeamNG - Official"],
        model: details.current?.key,
        config: details.current?.config_key,
        color: details.current?.color,
        name: details.configs?.Name,
        preview: details.configs?.preview,
        file: details.model,
      }
      setVehicle(setVehData)

      const vehicle = {
        model: details.current?.key,
        config: details.current?.config_key,
        color: details.current?.color,
      }
      bridge.api.engineLua(
        `extensions.hook("onVehicleSelectedInitially", ${bridge.api.serializeToLua(vehicle)}, ${bridge.api.serializeToLua(setVehData)})`
      )
    } catch (err) {
      console.warn("[ScenarioStart] Failed to load current vehicle", err)
    }
  }

  function selectVehicle() {
    // Navigate to the vehicle selector. Until the legacy selectableVehicle hook flow
    // is ported into Vue we still drive the existing menu.vehicles state.
    lua.extensions.ui_router.navigate("menu.vehicles", { mode: "selectableVehicle" })
  }

  if (enabled) {
    onMounted(() => {
      ensureCurrentVehicleLoaded()
    })
    onBeforeUnmount(() => {
      reset()
    })
  }

  return {
    selectedVehicle,
    setVehicle,
    reset,
    selectVehicle,
    ensureCurrentVehicleLoaded,
  }
}
