import { onMounted, onUnmounted } from "vue"
import { lua, useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import { getUINavServiceInstance } from "@/services/uiNav"

// Mirrors the Angular `ScenarioEndController` command dispatch table. Built-in
// commands are handled internally; anything else is treated as a raw Lua
// command and navigates back to `play` first (same exit semantics as Angular).
function createBuiltinCommands({ bridge }) {
  return {
    openMenu: () => {
      // Replicates `$scope.$emit('MenuToggle', true)` so the global pause menu
      // bridge picks it up. Vue currently still defers to the Angular bridge
      // for this until pause is fully ported.
      window.globalAngularRootScope?.$broadcast?.("MenuToggle")
    },
    openScenarios: () => {
      setTimeout(() => {
        bridge.api.engineLua("ui_gameplaySelector_general.openScenariosSelector()")
      })
    },
    openQuickrace: () => {
      setTimeout(() => {
        lua.extensions.ui_router.navigate("menu.quickraceWizard")
      })
    },
    openLightRunner: () => {
      setTimeout(() => {
        lua.extensions.ui_router.navigate("menu.lightrunnerWizard")
      })
    },
    openCampaigns: () => {
      setTimeout(() => {
        bridge.api.engineLua("ui_gameplaySelector_general.openCampaignsSelector()")
      })
    },
  }
}

export function useScenarioEndActions({
  rewards,
  rewardChosen,
  chooseRewardVehicle,
} = {}) {
  const bridge = useBridge()
  const events = useEvents()

  const builtins = createBuiltinCommands({ bridge })

  // Returns the function to invoke and whether the command exits the end
  // screen. Built-in handlers stay on the current Vue route (e.g. opening
  // the pause menu overlay), while any unknown command is forwarded to Lua
  // after navigating back to `play` so the scenario world becomes active
  // again.
  function execHelper(cmd) {
    if (!cmd) return { func: () => {}, exits: false }
    const builtin = builtins[cmd]
    if (builtin) {
      return { func: builtin, exits: false }
    }
    return {
      func: () => {
        lua.extensions.ui_router.navigate("play")
        bridge.api.engineLua(cmd)
      },
      exits: true,
    }
  }

  // Accepts the optional `showLoadingScreen` flag from the button payload to
  // match the Angular signature even though no current caller depends on it.
  function executeCmd(cmdStr, _showLoadingScreen) {
    console.log(cmdStr)
    const cmd = execHelper(cmdStr)
    cmd.func()
  }

  function executeButton(button) {
    if (!button) return
    if (isButtonDisabled(button)) return
    executeCmd(button.cmd, button.showLoadingScreen)
  }

  function isButtonDisabled(button) {
    if (!button) return true
    if (button.disabled) return true
    if (button.enableOnChooseReward && !rewardChosen?.value) return true
    return false
  }

  function onChooseVehicle(vehicle) {
    if (!vehicle) return
    if (typeof chooseRewardVehicle === "function") {
      chooseRewardVehicle(vehicle)
    }
  }

  // Replicates the Angular destroy block that toggled forwarded input back
  // off. The end screen does not enable raw / filtered input on mount
  // (only `ScenarioStart` does), but we still clear filtered ui-nav events
  // here so any leftover focus_lr/focus_ud filter from the start screen is
  // removed before the next route.
  onMounted(() => {
    // Match the Angular controller's gamepadNav toggles. Vue routes own the
    // active scope so we just make sure no leftover filtered events leak
    // into this screen.
    getUINavServiceInstance()?.clearFilteredEvents?.()
  })

  onUnmounted(() => {
    getUINavServiceInstance()?.clearFilteredEvents?.()
  })

  // Angular listened for an external `ScenarioPlay` event during the start
  // screen but the end screen does not honor it. We intentionally do not
  // bind it here. `events` is still imported to keep the composable
  // self-contained for future end-screen broadcast handling.
  void events

  return {
    executeCmd,
    executeButton,
    onChooseVehicle,
    isButtonDisabled,
  }
}
