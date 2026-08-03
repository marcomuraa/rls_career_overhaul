import { onMounted, onUnmounted } from "vue"
import { lua, useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import { getUINavServiceInstance } from "@/services/uiNav"

export function useScenarioStartInput({ callObj, onAccelerateStart, getPlayersConfig }) {
  const bridge = useBridge()
  const events = useEvents()

  function dispatchToCallObj(action, devName, value) {
    const obj = callObj?.value || "scenario_scenarios"
    const cmd = `if ${obj} ~= nil then ${obj}.onFilteredInputChanged('${devName}', '${action}', ${value}) end`
    bridge.api.engineLua(cmd)
  }

  function onFilteredInputChanged(data) {
    if (!data) return
    if (
      data.bindingAction === "accelerate" &&
      data.value > 0 &&
      data.controlType === "key"
    ) {
      onAccelerateStart?.()
    }
    dispatchToCallObj(data.bindingAction, data.devName, data.value)
  }

  function onRawInputChanged(data) {
    if (!data || !data.devName) return
    if (data.devName[0] !== "k") return
    if (data.control !== "left" && data.control !== "right") return
    const action = "steer_" + data.control
    dispatchToCallObj(action, data.devName, data.value)
  }

  function onPlayersChanged(playersData) {
    if (!playersData) return
    if (typeof getPlayersConfig === "function") {
      getPlayersConfig(playersData)
    }
    if (
      playersData.vehicles &&
      Object.keys(playersData.vehicles).length > 1
    ) {
      const uiNavService = getUINavServiceInstance()
      uiNavService?.setFilteredEvents?.("focus_lr", "focus_ud")
    }
  }

  onMounted(() => {
    lua.Input.setForwardRawEvents(true)
    lua.setCEFTyping(true)
    lua.Input.setForwardFilteredEvents(true)

    events.on("FilteredInputChanged", onFilteredInputChanged)
    events.on("RawInputChanged", onRawInputChanged)
    events.on("PlayersChanged", onPlayersChanged)
  })

  onUnmounted(() => {
    lua.Input.setForwardRawEvents(false)
    lua.setCEFTyping(false)
    lua.Input.setForwardFilteredEvents(false)

    const uiNavService = getUINavServiceInstance()
    uiNavService?.clearFilteredEvents?.()
  })
}
