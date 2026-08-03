import { defineStore } from "pinia"
import { ref } from "vue"

// Runtime cache replacing Angular `CampaignResults`. Used to reopen the
// scenario.end screen without re-supplying payloads (e.g. navigating back from
// pause). Storing snapshots here keeps complex payloads out of the URL because
// `globalRouter.js` drops unsupported path params for Vue routes.
export const useScenarioEndResultsStore = defineStore("scenarioEndResults", () => {
  const stats = ref(null)
  const rewards = ref(null)
  const missionData = ref(null)
  const portrait = ref(null)
  // Quickrace screen cache: holds the live `scenario_scenarios.getScenario()`
  // snapshot (or the `mockScenario` payload) so we can repopulate the
  // leaderboard / lap tables on reopen without re-querying lua.
  const scenario = ref(null)

  function snapshot(payload = {}) {
    if (payload.stats !== undefined) stats.value = payload.stats
    if (payload.rewards !== undefined) rewards.value = payload.rewards
    if (payload.missionData !== undefined) missionData.value = payload.missionData
    if (payload.portrait !== undefined) portrait.value = payload.portrait
    if (payload.scenario !== undefined) scenario.value = payload.scenario
  }

  function reset() {
    stats.value = null
    rewards.value = null
    missionData.value = null
    portrait.value = null
    scenario.value = null
  }

  function hasUsableStats() {
    return !!(stats.value && stats.value.overall)
  }

  return {
    stats,
    rewards,
    missionData,
    portrait,
    scenario,
    snapshot,
    reset,
    hasUsableStats,
  }
})
