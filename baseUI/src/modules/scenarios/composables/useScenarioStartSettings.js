import { ref } from "vue"
import { lua, useBridge } from "@/bridge"
import { useEvents } from "@/services/events"

export function useScenarioStartSettings() {
  const bridge = useBridge()
  const events = useEvents()
  const userSettings = ref({ values: {}, options: {} })

  function onSettingsChanged(data) {
    if (!data) return
    userSettings.value = data
  }

  function applySetting(key) {
    const value = userSettings.value?.values?.[key]
    if (key == null || value == null) return
    bridge.api.engineLua(`settings.setValue("${key}", "${value}")`)
  }

  events.on("SettingsChanged", onSettingsChanged)
  lua.settings.notifyUI()

  return {
    userSettings,
    applySetting,
  }
}
