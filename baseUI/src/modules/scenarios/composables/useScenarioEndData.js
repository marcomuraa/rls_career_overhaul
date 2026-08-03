import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import { useBridge } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"
import { $translate, $content, useRouteDataStore } from "@/services"

import { useScenarioEndResultsStore } from "../stores/scenarioEndResultsStore"

const DEFAULT_CUSTOM_SUCCESS = "ui.scenarios.end.result.success"
const DEFAULT_CUSTOM_FAIL = "ui.scenarios.end.result.fail"

const MEDAL_INFO = {
  wood: {
    img: "/ui/modules/scenariocontrol/medal_wooden.png",
    sound: "event:>UI>Missions>End_Failed",
  },
  bronze: {
    img: "/ui/modules/scenariocontrol/medal_bronze.png",
    sound: "event:>UI>Missions>End_Bronze",
  },
  silver: {
    img: "/ui/modules/scenariocontrol/medal_silver.png",
    sound: "event:>UI>Missions>End_Silver",
  },
  gold: {
    img: "/ui/modules/scenariocontrol/medal_gold.png",
    sound: "event:>UI>Missions>End_Gold",
  },
}

// Mirrors the Angular `ScenarioEndController` reward enrichment, attaching the
// real config entry returned by `core_vehicles.getConfigList()` plus the 1-based
// id used by the radio-group selection.
function enrichVehicleList(vehicleIDs, configs) {
  if (!Array.isArray(vehicleIDs)) return vehicleIDs
  const out = []
  for (let i = 0; i < vehicleIDs.length; i += 1) {
    const veh = vehicleIDs[i]
    const cfg = configs?.[`${veh.model}_${veh.config}`]
    if (!cfg) {
      out[i] = { ...veh, id: i + 1 }
      continue
    }
    out[i] = { ...cfg, id: i + 1 }
  }
  return out
}

function translateStatLabels(stats) {
  if (!Array.isArray(stats)) return stats
  return stats.map(stat => ({
    ...stat,
    label: stat.label ? $translate.contextTranslate(stat.label) : stat.label,
  }))
}

function translateButtonLabels(buttons) {
  if (!Array.isArray(buttons)) return buttons
  return buttons.map(btn => ({
    ...btn,
    label: btn.label ? $translate.contextTranslate(btn.label) : btn.label,
  }))
}

// Apply the same translation / BBCode pipeline used by Angular's
// `ScenarioEndController`. Returns a fresh object so reactive consumers see a
// stable structure.
function processStats(rawStats) {
  if (!rawStats || typeof rawStats !== "object") return rawStats

  const next = { ...rawStats }

  if (next.customSuccess == null) next.customSuccess = DEFAULT_CUSTOM_SUCCESS
  if (next.customFail == null) next.customFail = DEFAULT_CUSTOM_FAIL

  if (next.stats) next.stats = translateStatLabels(next.stats)
  if (next.buttons) next.buttons = translateButtonLabels(next.buttons)

  if (next.multiDescription != null) {
    next.text = $translate.multiContextTranslate(next.multiDescription)
  } else if (next.text) {
    next.text = $translate.contextTranslate(next.text)
  }

  if (next.text) {
    next.text = $content.bbcode.parse(next.text)
  }

  if (next.progress) {
    next.progress = $translate.contextTranslate(next.progress)
  }

  if (next.title) {
    next.title = $translate.contextTranslate(next.title)
  }

  return next
}

function computeActiveButton(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return 0
  let active = buttons.length - 1
  for (let i = buttons.length - 1; i >= 0; i--) {
    if (buttons[i].active) active = i
  }
  for (let i = buttons.length - 1; i >= 0; i--) {
    if (buttons[i].focus) active = i
  }
  return active
}

export function useScenarioEndData(options = {}) {
  // `includeRewards` controls reward enrichment / `core_vehicles.getConfigList()`
  // hits and the related rewardChosen logic. Quickrace and other minimal end
  // screens opt out via `includeRewards: false`.
  // `sendDragTimeslip` controls the 1s delayed
  // `gameplay_drag_general.sendTimeslipDataToUi()` kick that the standard end
  // screen issues to populate drag-only data.
  const { includeRewards = true, sendDragTimeslip = true } = options

  const route = useRoute()
  const bridge = useBridge()
  const routeDataStore = useRouteDataStore()
  const cache = useScenarioEndResultsStore()

  const data = ref(null)
  const rewards = ref(null)
  const missionData = ref(null)
  const portraitImg = ref(null)
  const scenario = ref(null)
  const detailed = ref(false)
  const detailedRecord = ref({})
  const rewardChosen = ref(true)

  const hasMissionData = computed(() => {
    return !!missionData.value && missionData.value.progressKey !== undefined
  })

  const activeButton = computed(() => computeActiveButton(data.value?.buttons))

  const medalInfo = computed(() => {
    const medal = data.value?.overall?.medal
    if (!medal || medal === "none") return null
    return MEDAL_INFO[medal] || null
  })

  function getBarSound(index) {
    return index === 0 ? "event:>UI>Missions>End_Counting" : null
  }

  function pickPayload() {
    // Vue route params only carry values declared in the route path (none for
    // `/scenario/end`), so `lua.extensions.ui_router.navigate("scenario.end",
    // { stats, rewards, ... })` does not surface here. Read the original Lua
    // navigation params from the routeData store, which preserves the full
    // payload that Lua sent.
    const params = route.params || {}
    const luaParams = routeDataStore.route?.params || {}
    const stored = routeDataStore.data || {}
    const rawStats = params.stats || luaParams.stats || stored.stats || null
    const reopened = !rawStats || rawStats.overall === undefined

    if (reopened) {
      return {
        stats: cache.stats,
        rewards: cache.rewards,
        missionData: cache.missionData,
        portrait: cache.portrait,
        reopened: true,
      }
    }

    return {
      stats: rawStats,
      rewards: params.rewards || luaParams.rewards || stored.rewards || null,
      missionData: params.missionData || luaParams.missionData || stored.missionData || null,
      portrait: params.portrait || luaParams.portrait || stored.portrait || null,
      reopened: false,
    }
  }

  function applyScenarioInfo(scenarioInfo) {
    if (!scenarioInfo || typeof scenarioInfo !== "object") return

    // Avoid clobbering a previously-restored usable scenario (e.g. from the
    // quickrace reopen cache) with an empty post-mission response from
    // `scenario_scenarios.getScenario()`. An empty object lacks every field
    // we actually consume, so it provides no benefit to overwrite.
    const incomingIsEmpty =
      scenarioInfo.detailedTimes == null &&
      scenarioInfo.portraitImg == null &&
      scenarioInfo.lapCount == null &&
      scenarioInfo.highscores == null
    if (incomingIsEmpty && scenario.value && typeof scenario.value === "object") {
      return
    }

    scenario.value = scenarioInfo

    if (scenarioInfo.portraitImg != null) {
      portraitImg.value = scenarioInfo.portraitImg
    }

    if (scenarioInfo.lapCount === 1) {
      detailed.value = true
    }

    if (scenarioInfo.detailedTimes != null && data.value) {
      const normalTimes = scenarioInfo.detailedTimes.normal
      if (Array.isArray(normalTimes) && normalTimes.length > 0) {
        const finalTime = normalTimes[normalTimes.length - 1].total
        data.value = { ...data.value, time: finalTime }
        if (scenarioInfo.detailedRecord != null) {
          detailedRecord.value = {
            ...scenarioInfo.detailedRecord,
            formattedTime: finalTime,
          }
        }
      }
    }
  }

  // Mirrors the Angular `scenario_scenarios and scenario_scenarios.getScenario() or {}`
  // raw call. The bridge typed signature for this is intentionally not added
  // because the call only exists on the lua side while a scenario is loaded.
  function fetchScenarioInfo() {
    const params = route.params || {}
    if (params.mockScenario && params.mockScenario.detailedTimes !== undefined) {
      applyScenarioInfo(params.mockScenario)
      return Promise.resolve(params.mockScenario)
    }

    return new Promise(resolve => {
      bridge.api.engineLua(
        "scenario_scenarios and scenario_scenarios.getScenario() or {}",
        scenarioInfo => {
          applyScenarioInfo(scenarioInfo)
          resolve(scenarioInfo)
        },
      )
    })
  }

  async function enrichRewards(rawRewards) {
    if (!rawRewards) return null

    const next = { ...rawRewards }
    rewardChosen.value = !next.choices

    const hasVehicles = !!next.vehicles
    const hasChoiceVehicles = !!(next.choices && next.choices.vehicles)
    if (!hasVehicles && !hasChoiceVehicles) {
      return next
    }

    const res = await runRaw("core_vehicles.getConfigList()")
    const configs = res?.configs || {}

    if (hasVehicles) {
      next.vehicles = enrichVehicleList(next.vehicles, configs)
    }
    if (hasChoiceVehicles) {
      next.choices = {
        ...next.choices,
        vehicles: enrichVehicleList(next.choices.vehicles, configs),
      }
    }

    return next
  }

  async function init() {
    const payload = pickPayload()

    data.value = processStats(payload.stats)
    portraitImg.value = payload.portrait || null
    missionData.value = payload.missionData || null

    if (includeRewards) {
      rewards.value = await enrichRewards(payload.rewards)
      autoChooseSingleVehicleReward()
    } else {
      rewards.value = null
      rewardChosen.value = true
    }

    cache.snapshot({
      stats: data.value,
      rewards: rewards.value,
      missionData: missionData.value,
      portrait: portraitImg.value,
    })

    fetchScenarioInfo()

    if (sendDragTimeslip) {
      // Mirror the 1s delayed drag timeslip kick so a drag end screen receives
      // its timeslip data after Lua finished assembling it.
      setTimeout(() => {
        bridge.api.engineLua(
          "if gameplay_drag_general then gameplay_drag_general.sendTimeslipDataToUi() end",
        )
      }, 1000)
    }
  }

  function chooseRewardVehicle(vehicle) {
    if (!vehicle) return
    rewardChosen.value = true
    // The reward callback is the raw Lua string supplied by the scenario
    // payload (e.g. `scenario_scenarios.onChosenReward`). We forward the
    // 1-based id selected by the user.
    const callback = rewards.value?.callback
    if (!callback) return
    bridge.api.engineLua(`${callback}(${vehicle.id})`)
  }

  function autoChooseSingleVehicleReward() {
    const choiceVehicles = rewards.value?.choices?.vehicles
    if (Array.isArray(choiceVehicles) && choiceVehicles.length === 1) {
      chooseRewardVehicle(choiceVehicles[0])
    }
  }

  return {
    data,
    rewards,
    missionData,
    portraitImg,
    scenario,
    detailed,
    detailedRecord,
    rewardChosen,
    hasMissionData,
    activeButton,
    medalInfo,
    getBarSound,
    init,
    chooseRewardVehicle,
    autoChooseSingleVehicleReward,
    // Internals exposed so the quickrace composable can layer in its own
    // reopen/cache logic without duplicating stats processing or scenario
    // fetching.
    applyScenarioInfo,
    fetchScenarioInfo,
    pickPayload,
    cache,
  }
}
