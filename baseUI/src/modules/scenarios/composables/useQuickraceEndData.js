import { computed, ref, watch } from "vue"

import { useScenarioEndData } from "./useScenarioEndData"

// View modes for the leaderboard selector (mirrors the Angular bng-select
// options `[{l: 'Total Time', v: 0}, {l: 'Single Lap', v: 1}]`).
export const LEADERBOARD_MODE = Object.freeze({
  TOTAL: 0,
  SINGLE_LAP: 1,
})

// Returns true when the scenario payload carries at least the pieces the
// quickrace screen needs to render lap times. Used to decide whether the
// cached scenario should be restored on reopen instead of being overwritten
// by an empty post-mission `scenario_scenarios.getScenario()` response.
function isUsableScenario(scenario) {
  if (!scenario || typeof scenario !== "object") return false
  const detailedTimes = scenario.detailedTimes
  if (!detailedTimes) return false
  const hasNormal = Array.isArray(detailedTimes.normal) && detailedTimes.normal.length > 0
  const hasDetail = Array.isArray(detailedTimes.detail) && detailedTimes.detail.length > 0
  return hasNormal || hasDetail
}

export function useQuickraceEndData() {
  const base = useScenarioEndData({
    includeRewards: false,
    sendDragTimeslip: false,
  })

  const viewDetailed = ref(LEADERBOARD_MODE.TOTAL)

  // Cache the live scenario snapshot whenever a usable one comes in so reopen
  // (no fresh stats / empty `scenario_scenarios.getScenario()`) can repopulate
  // the lap and leaderboard tables. Mirrors how stats are cached by the base
  // composable for the standard end screen.
  watch(
    () => base.scenario.value,
    next => {
      if (!isUsableScenario(next)) return
      base.cache.snapshot({ scenario: next })
    },
    { deep: false },
  )

  // Lap rows reversed for newest-first display, matching the Angular
  // `scenario.detailedTimes.detail.slice().reverse()` / `normal.slice().reverse()`
  // bindings.
  const normalLapRows = computed(() => {
    const rows = base.scenario.value?.detailedTimes?.normal
    if (!Array.isArray(rows)) return []
    return rows.slice().reverse()
  })

  const detailLapRows = computed(() => {
    const rows = base.scenario.value?.detailedTimes?.detail
    if (!Array.isArray(rows)) return []
    return rows.slice().reverse()
  })

  const visibleLapRows = computed(() => (base.detailed.value ? detailLapRows.value : normalLapRows.value))

  // Leaderboard rows for the currently selected view (Total Time vs Single Lap).
  const totalScoreRows = computed(() => {
    const rows = base.scenario.value?.highscores?.scores
    return Array.isArray(rows) ? rows : []
  })

  const singleScoreRows = computed(() => {
    const rows = base.scenario.value?.highscores?.singleScores
    return Array.isArray(rows) ? rows : []
  })

  const currentLeaderboardRows = computed(() => {
    return viewDetailed.value === LEADERBOARD_MODE.TOTAL
      ? totalScoreRows.value
      : singleScoreRows.value
  })

  // Place / new-best message shown next to the title.
  const place = computed(() => base.scenario.value?.highscores?.place ?? -1)
  const isNewLocalBest = computed(() => place.value === 1)
  const hasPlace = computed(() => place.value !== -1 && place.value !== 1)

  // Quickrace failed/title styling falls back to the base data; expose a
  // boolean so the view can swap success/fail color classes.
  const isFailed = computed(() => !!base.data.value?.overall?.failed)

  function toggleDetail() {
    base.detailed.value = !base.detailed.value
  }

  // Angular `$scope.showRecord(index, total)`: switches the detail row
  // displayed beneath the leaderboard. `total === true` selects from the
  // total-time scores, otherwise from the single-lap scores.
  function showRecord(index, total) {
    const scenario = base.scenario.value
    if (!scenario || !scenario.highscores) return
    const list = total ? scenario.highscores.scores : scenario.highscores.singleScores
    if (!Array.isArray(list)) return
    const record = list[index]
    if (!record) return
    base.detailedRecord.value = record
  }

  // Convenience helper for row hover/focus parity: callers can pass the
  // leaderboard row directly and we will resolve it back to an index.
  function selectRecord(record) {
    const list = currentLeaderboardRows.value
    const index = list.indexOf(record)
    if (index === -1) return
    showRecord(index, viewDetailed.value === LEADERBOARD_MODE.TOTAL)
  }

  function setLeaderboardMode(mode) {
    if (mode !== LEADERBOARD_MODE.TOTAL && mode !== LEADERBOARD_MODE.SINGLE_LAP) return
    viewDetailed.value = mode
  }

  async function init() {
    await base.init()

    // After base init has set `data.value`, restore the cached scenario when
    // this is a reopen (no fresh stats came through the route/store) so the
    // lap and leaderboard tables hydrate immediately. The base
    // `fetchScenarioInfo` call is already inflight; it will be ignored on
    // empty responses thanks to the empty-scenario guard in
    // `applyScenarioInfo`.
    const payload = base.pickPayload()
    if (payload.reopened && isUsableScenario(base.cache.scenario)) {
      base.applyScenarioInfo(base.cache.scenario)
    }
  }

  return {
    ...base,
    init,
    viewDetailed,
    setLeaderboardMode,
    normalLapRows,
    detailLapRows,
    visibleLapRows,
    totalScoreRows,
    singleScoreRows,
    currentLeaderboardRows,
    place,
    isNewLocalBest,
    hasPlace,
    isFailed,
    toggleDetail,
    showRecord,
    selectRecord,
  }
}
