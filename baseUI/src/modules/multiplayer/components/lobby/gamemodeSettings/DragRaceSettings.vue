<template>
  <div class="drag-race-settings">
    <div class="setting-row">
      <label class="setting-label">{{ $t("ui.drag.label.dragType") }}</label>
      <BngSelect
        v-model="settingValues.dragType"
        :options="dragTypeOptions"
        :config="labelConfig"
      />
    </div>
    <div class="setting-row">
      <label class="setting-label">{{ $t("ui.drag.label.treeType") }}</label>
      <BngSelect
        v-model="settingValues.treeType"
        :options="treeTypeOptions"
        :config="labelConfig"
      />
    </div>
    <div class="setting-row">
      <label class="setting-label">{{ $t("ui.drag.label.winnerBy") }}</label>
      <BngSelect
        v-model="settingValues.importantTimerId"
        :options="winnerByOptions"
        :config="labelConfig"
      />
    </div>

    <div class="lanes-section">
      <h4 class="section-heading">{{ $t("ui.drag.settings.currentHeat") }}</h4>
      <div v-if="laneInfoList.length > 0" class="lanes-list">
        <div v-for="(lane, idx) in laneInfoList" :key="lane.index" class="lane-row">
          <span class="lane-label">{{ lane.longName }}</span>
          <BngSelect
            :value="laneAssignments[idx] || EMPTY_LANE"
            :options="getAvailablePlayersForLane()"
            :config="playerConfig"
            @valueChanged="v => assignLane(idx, v)"
          />
        </div>
      </div>
      <div v-else class="no-lanes">{{ $t("ui.drag.settings.noStripData") }}</div>
    </div>

    <div class="queue-section">
      <h4 class="section-heading">{{ $t("ui.drag.settings.waiting", [waitingPlayers.length]) }}</h4>
      <div class="queue-list">
        <template v-if="waitingPlayers.length > 0">
          <div
            v-for="(player, idx) in waitingPlayers"
            :key="player.id"
            class="queue-item"
            :class="{ 'queue-item-alt': idx % 2 === 1 }"
          >
            <span class="queue-player-name">{{ player.name }}</span>
            <span class="queue-position">#{{ idx + 1 }}</span>
          </div>
        </template>
        <div v-else class="queue-empty">{{ $t("ui.drag.noPlayersWaiting") }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { BngSelect } from "@/common/components/base"
import { useEvents } from "@/services/events"
import { useBridge } from "@/bridge"
import { $translate } from "@/services/translation"

const EMPTY_LANE = "Empty"

const DRAG_TYPE_OPTIONS = [
  { value: "headsUpRace", labelKey: "ui.drag.dragType.headsUp" },
  { value: "bracketRace", labelKey: "ui.drag.dragType.bracket" },
]

const TREE_TYPE_OPTIONS = [
  { value: ".400", labelKey: "ui.drag.treeType.pro" },
  { value: ".500", labelKey: "ui.drag.treeType.sportsmanTree" },
]

const WINNER_BY_OPTIONS = [
  { value: "reactionTime", labelKey: "ui.drag.winnerBy.reactionTime" },
  { value: "time_60", labelKey: "ui.drag.winnerBy.time60" },
  { value: "time_330", labelKey: "ui.drag.winnerBy.time330" },
  { value: "time_1_8", labelKey: "ui.drag.winnerBy.time18" },
  { value: "time_1000", labelKey: "ui.drag.winnerBy.time1000" },
  { value: "time_1_4", labelKey: "ui.drag.winnerBy.time14" },
  { value: "velAt_1_8", labelKey: "ui.drag.winnerBy.speedAt18" },
  { value: "velAt_1_4", labelKey: "ui.drag.winnerBy.speedAt14" },
]

const labelConfig = {
  value: opt => opt.value,
  label: opt => opt.labelKey ? $translate.instant(opt.labelKey) : (opt.label || opt.value),
}

const playerConfig = {
  value: opt => opt.value,
  label: opt => opt.label,
}

const { lua } = useBridge()
const events = useEvents()

const lobbyPlayers = ref([])

const settingValues = ref({
  dragType: "headsUpRace",
  treeType: ".500",
  importantTimerId: "time_1_4",
})

const laneAssignments = ref([])

const laneInfoList = ref([])
const numLanes = ref(2)
const stripTimers = ref([])

const dragTypeOptions = computed(() => DRAG_TYPE_OPTIONS)
const treeTypeOptions = computed(() => TREE_TYPE_OPTIONS)
const winnerByOptions = computed(() => {
  if (stripTimers.value.length > 0) {
    return stripTimers.value.map(t => ({
      value: t.id,
      labelKey: t.labelKey || null,
      label: t.label || t.id,
    }))
  }
  return WINNER_BY_OPTIONS
})

const assignedPlayerIds = computed(() => {
  return new Set(laneAssignments.value.filter(id => id && id !== EMPTY_LANE))
})

const waitingPlayers = computed(() => {
  return lobbyPlayers.value.filter(p => !assignedPlayerIds.value.has(p.id))
})

function getAvailablePlayersForLane() {
  const opts = [{ value: EMPTY_LANE, label: $translate.instant("ui.vehicleconfig.empty") }]
  for (const p of lobbyPlayers.value) {
    opts.push({ value: p.id, label: p.name })
  }
  return opts
}

function assignLane(laneIdx, playerId) {
  const arr = [...laneAssignments.value]
  const resolvedId = playerId === EMPTY_LANE ? null : playerId
  if (resolvedId) {
    for (let i = 0; i < arr.length; i++) {
      if (i !== laneIdx && arr[i] === resolvedId) {
        arr[i] = null
      }
    }
  }
  arr[laneIdx] = resolvedId
  laneAssignments.value = arr
}

function autoAssignPlayers() {
  const arr = new Array(numLanes.value).fill(null)
  const players = [...lobbyPlayers.value]
  for (let i = 0; i < Math.min(players.length, numLanes.value); i++) {
    arr[i] = players[i].id
  }
  laneAssignments.value = arr
}

const onMultiplayerTabData = (data) => {
  if (!data.players) return
  lobbyPlayers.value = data.players

  const validIds = new Set(lobbyPlayers.value.map(p => p.id))
  const cleaned = laneAssignments.value.map(id => (id && validIds.has(id)) ? id : null)

  const hasAnyAssigned = cleaned.some(id => id !== null)
  if (!hasAnyAssigned) {
    autoAssignPlayers()
  } else {
    laneAssignments.value = cleaned
  }
}

onMounted(() => {
  events.on("OnMultiplayerTabData", onMultiplayerTabData)
  lua.multiplayer_uiBackend_multiplayerUIManager.requestMultiplayerTabData()

  lua.gameplay_drag_dragBridge.getStripLaneInfo().then(stripInfo => {
    if (!stripInfo) return
    const lanes = stripInfo.lanes
    if (Array.isArray(lanes) && lanes.length) {
      laneInfoList.value = lanes
      numLanes.value = lanes.length
    }
    const timers = stripInfo.timers
    if (Array.isArray(timers) && timers.length) {
      stripTimers.value = timers
    }
    if (stripInfo.importantTimerId) {
      settingValues.value.importantTimerId = stripInfo.importantTimerId
    }
  })
})

onUnmounted(() => {
  events.off("OnMultiplayerTabData", onMultiplayerTabData)
})

watch(() => numLanes.value, (n) => {
  const arr = [...laneAssignments.value]
  while (arr.length < n) arr.push(null)
  if (arr.length > n) arr.length = n
  laneAssignments.value = arr
})

defineExpose({
  settingValues: computed(() => ({
    ...settingValues.value,
    laneAssignments: laneAssignments.value.map(id => id || ""),
  })),
})
</script>

<style scoped lang="scss">
.drag-race-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--bng-corners-1);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.setting-label {
  min-width: 8rem;
  flex-shrink: 0;
  color: var(--bng-cool-gray-200);
}

:deep(.bng-select) {
  flex: 1;
  min-width: 0;
}

.section-heading {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.9em;
  font-weight: 600;
  font-style: italic;
  color: var(--bng-orange-100);
}

.lanes-section {
  display: flex;
  flex-direction: column;
}

.lanes-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lane-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--bng-corners-1);
  background-color: var(--bng-black-o4);
}

.lane-label {
  min-width: 4rem;
  flex-shrink: 0;
  font-weight: 600;
  color: var(--bng-off-white);
}

.no-lanes {
  padding: 0.5rem;
  text-align: center;
  color: var(--bng-cool-gray-400);
  font-style: italic;
}

.queue-section {
  display: flex;
  flex-direction: column;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.6rem;
  border-radius: var(--bng-corners-1);
  background-color: var(--bng-black-o4);

  &.queue-item-alt {
    background-color: var(--bng-black-o6);
  }
}

.queue-player-name {
  color: var(--bng-off-white);
}

.queue-position {
  font-size: 0.8rem;
  color: var(--bng-cool-gray-400);
}

.queue-empty {
  padding: 0.3rem 0.6rem;
  color: var(--bng-cool-gray-500);
  font-style: italic;
  font-size: 0.85rem;
}
</style>
