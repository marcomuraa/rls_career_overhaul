<template>
  <div class="ai-competitors-lb">
    <div
      v-if="isMultiStageLayout"
      class="ai-competitors-lb__grid ai-competitors-lb__grid--multi"
      :style="multiGridStyle"
    >
      <div class="ai-competitors-lb__head ai-competitors-lb__cell ai-competitors-lb__head--pos">{{ $tt("missions.aiCompetitorsLeaderboard.pos") }}</div>
      <div class="ai-competitors-lb__head ai-competitors-lb__cell">{{ $tt("missions.aiCompetitorsLeaderboard.name") }}</div>

      <div
        v-for="si in stageCount"
        :key="'h' + si"
        class="ai-competitors-lb__head ai-competitors-lb__cell ai-competitors-lb__head--stage"
      >
        {{ stageLabel(si) || $tt("missions.aiCompetitorsLeaderboard.stage", { n: si }) }}
      </div>

      <div class="ai-competitors-lb__head ai-competitors-lb__cell ai-competitors-lb__head--final">{{ $tt("missions.aiCompetitorsLeaderboard.final") }}</div>

      <template v-for="(row, index) in rows" :key="'m' + index">
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--pos"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          {{ row.position }}
        </div>
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--name"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
          :title="String(rowName(index, row, $tt('missions.aiCompetitorsLeaderboard.player')))"
        >
          <AiCompetitorsLeaderboardName :name="String(rowName(index, row, $tt('missions.aiCompetitorsLeaderboard.player')))" />
        </div>

        <div
          v-for="si in stageCount"
          :key="'c' + index + '-' + si"
          class="ai-competitors-lb__cell ai-competitors-lb__cell--time monospace"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          <template v-if="stageCell(row, si)?.dnf">{{ $tt("missions.aiCompetitorsLeaderboard.dnf") }}</template>
          <template v-else>{{ stageCell(row, si)?.timeText ?? "" }}</template>
        </div>

        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--time monospace"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          {{ row.finalDnf ? $tt("missions.aiCompetitorsLeaderboard.dnf") : row.finalTime }}
        </div>
      </template>
    </div>

    <div v-else class="ai-competitors-lb__grid ai-competitors-lb__grid--single">
      <div class="ai-competitors-lb__head ai-competitors-lb__cell ai-competitors-lb__head--pos">{{ $tt("missions.aiCompetitorsLeaderboard.pos") }}</div>
      <div class="ai-competitors-lb__head ai-competitors-lb__cell">{{ $tt("missions.aiCompetitorsLeaderboard.name") }}</div>
      <div class="ai-competitors-lb__head ai-competitors-lb__cell">{{ $tt("missions.aiCompetitorsLeaderboard.time") }}</div>
      <div class="ai-competitors-lb__head ai-competitors-lb__cell ai-competitors-lb__head--delta">{{ $tt("missions.aiCompetitorsLeaderboard.delta") }}</div>

      <template v-for="(row, index) in rows" :key="index">
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--pos"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          {{ row.position }}
        </div>
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--name"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
          :title="String(rowName(index, row, $tt('missions.aiCompetitorsLeaderboard.player')))"
        >
          <AiCompetitorsLeaderboardName :name="String(rowName(index, row, $tt('missions.aiCompetitorsLeaderboard.player')))" />
        </div>
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--time monospace"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          {{ row.dnf ? $tt("missions.aiCompetitorsLeaderboard.dnf") : row.time }}
        </div>
        <div
          class="ai-competitors-lb__cell ai-competitors-lb__cell--delta monospace"
          :class="{ 'ai-competitors-lb__row--player': isPlayerRow(index) }"
        >
          <div class="ai-competitors-lb__delta-stack">
            <span class="ai-competitors-lb__delta-line ai-competitors-lb__delta-line--leader">{{ row.deltaVsLeader || "-" }}</span>
            <span class="ai-competitors-lb__delta-line ai-competitors-lb__delta-line--ahead">{{ row.deltaVsAhead || "-" }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import AiCompetitorsLeaderboardName from "./AiCompetitorsLeaderboardName.vue"

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  useDefaultPlayerName: {
    type: Boolean,
    default: true,
  },
  playerName: {
    type: String,
    default: "",
  },
  playerRowIndex: {
    type: Number,
    default: 0,
  },
  multiStage: {
    type: Boolean,
    default: false,
  },
  stageCount: {
    type: Number,
    default: 1,
  },
  stageLabels: {
    type: Array,
    default: () => [],
  },
})

const isMultiStageLayout = computed(() => props.multiStage === true && props.stageCount >= 1)

const multiGridStyle = computed(() => {
  const n = Math.max(1, props.stageCount)
  const stageCol = "minmax(4.5rem, 6.75rem)"
  return {
    gridTemplateColumns: `2.75rem minmax(9rem, 11rem) repeat(${n}, ${stageCol}) minmax(5.5rem, 7.5rem)`,
  }
})

function isPlayerRow(zeroBasedIndex) {
  if (!props.playerRowIndex || props.playerRowIndex < 1) {
    return false
  }
  return zeroBasedIndex + 1 === props.playerRowIndex
}

function rowName(zeroBasedIndex, row, defaultPlayerLabel) {
  if (isPlayerRow(zeroBasedIndex)) {
    return props.useDefaultPlayerName ? defaultPlayerLabel : props.playerName
  }
  return row?.name ?? ""
}

function stageLabel(si) {
  const labels = props.stageLabels || []
  const label = labels[si - 1] ?? labels[si]
  return typeof label === "string" && label ? label : null
}

/** si: 1-based stage index (matches Lua / headers) */
function stageCell(row, si) {
  const cells = row?.stageCells
  if (!cells || cells.length === 0) {
    return null
  }
  return cells[si - 1] ?? cells[si] ?? null
}
</script>

<style scoped lang="scss">
.ai-competitors-lb {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.ai-competitors-lb__grid {
  display: grid;
  row-gap: 0;
  align-items: stretch;
  font-size: 0.92rem;
}

.ai-competitors-lb__grid--multi {
  min-width: min-content;
}

.ai-competitors-lb__grid--single {
  grid-template-columns: 2.75rem minmax(10rem, 12rem) minmax(5rem, 8rem) minmax(5rem, 7rem);
}

.ai-competitors-lb__head {
  font-weight: 800;
  font-style: italic;
  padding: 0.2rem 0.25rem;
  border-bottom: 0.125rem solid rgba(var(--bng-cool-gray-900-rgb), 0.55);
  text-align: center;
}

.ai-competitors-lb__head--delta {
  text-align: right;
}

.ai-competitors-lb__head--stage,
.ai-competitors-lb__head--final {
  font-size: 0.82rem;
  padding: 0.15rem 0.2rem;
  line-height: 1.15;
}

.ai-competitors-lb__cell {
  padding: 0.35rem 0.25rem;
  min-height: 3.1em;
  align-items: center;
  box-sizing: border-box;
}

.ai-competitors-lb__cell--name {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.ai-competitors-lb__cell--time {
  min-width: 0;
  justify-content: center;
  text-align: center;
  font-size: 0.88rem;
}

.ai-competitors-lb__cell--delta {
  padding: 0.28rem 0.25rem;
  min-width: 0;
  justify-content: flex-end;
}

.ai-competitors-lb__row--player {
  background: rgba(var(--bng-orange-500-rgb), 0.22);
}

.monospace {
  font-family: var(--fnt-mono);
}

.ai-competitors-lb__delta-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.12em;
  line-height: 1.12;
  max-width: 100%;
}

.ai-competitors-lb__delta-line--leader {
  font-size: 0.72rem;
}

.ai-competitors-lb__delta-line--ahead {
  font-size: 0.58rem;
  opacity: 0.9;
}

</style>
