import { lua, useBridge } from "@/bridge"
import { useEvents } from "@/services/events"

export function useScenarioStartActions({ readyHook, exitHook, isPlayerValid }) {
  const bridge = useBridge()
  const events = useEvents()

  function notifyUIReady() {
    bridge.api.engineLua('extensions.hook("onScenarioUIReady", "start")')
  }

  function play() {
    if (typeof isPlayerValid === "function" && !isPlayerValid()) return

    const hook = readyHook?.value
    if (hook) {
      bridge.api.engineLua(hook)
    } else {
      bridge.api.engineLua('extensions.hook("onScenarioUIReady", "play")')
    }

    lua.extensions.ui_router.navigate("play")
  }

  function exit() {
    if (typeof isPlayerValid === "function" && !isPlayerValid()) return

    const hook = exitHook?.value
    if (hook) {
      bridge.api.engineLua(hook)
    } else {
      bridge.api.engineLua('extensions.hook("onScenarioUIReady", "play")')
    }

    lua.extensions.ui_router.navigate("play")
  }

  function extraButton(cmd) {
    if (!cmd) return
    bridge.api.engineLua(cmd)
  }

  events.on("ScenarioPlay", () => play())

  return {
    notifyUIReady,
    play,
    exit,
    extraButton,
  }
}
