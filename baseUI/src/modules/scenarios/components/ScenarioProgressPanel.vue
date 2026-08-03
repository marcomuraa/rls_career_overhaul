<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'scenario-start-progress', type: 'container' }"
    class="scenario-progress-panel"
  >
    <div class="objectives-heading">{{ $tt("missions.missions.general.objectives") }}:</div>

    <div v-if="formattedStars && !formattedStars.disabled" class="stars">
      <div
        v-for="(star, idx) in formattedStars.stars"
        :key="`star-${idx}`"
        class="star-line"
      >
        <span class="star-label">{{ $ctx_t(star.label) }}</span>
        <span
          v-for="(reward, rIdx) in star.rewards"
          :key="`reward-${rIdx}`"
          class="reward"
        >
          {{ reward.rewardAmount }}
        </span>
      </div>
    </div>

    <div v-if="formattedProgress" class="progress-summary">
      <h3>
        Progress for: "{{
          $ctx_t(progressKeyTranslations[formattedProgressKey] || formattedProgressKey || "")
        }}"
      </h3>
      <div
        v-for="(col, i) in formattedProgress.ownAggregateCols || []"
        :key="`col-${i}`"
        class="progress-key"
      >
        <div
          v-for="(d, j) in col"
          :key="`val-${j}`"
          :class="j === 0 ? 'key-label' : 'key-value'"
        >
          {{ $tt(d?.text || d?.label || "") }}
        </div>
      </div>
    </div>

    <div v-if="recentAttempts" class="progress-attempts">
      <h3 v-if="leaderboardKey === 'recent'">{{ $tt("bigMap.progressLabels.recentAttempts") }}</h3>
      <table class="attempts-table">
        <tr>
          <th
            v-for="(label, key) in recentAttempts.labels"
            :key="key"
          >
            {{ $tt(label) }}
          </th>
        </tr>
        <tr
          v-for="(row, rowIdx) in attemptRowsLimited"
          :key="`row-${rowIdx}`"
        >
          <td v-for="(d, cellIdx) in row" :key="`cell-${cellIdx}`">
            {{ $tt(d?.text || "") }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  data: { type: Object, required: true },
})

const formattedProgress = computed(() => props.data?.formattedProgress || null)
const formattedStars = computed(() => props.data?.formattedStars || null)
const progressKeyTranslations = computed(() => props.data?.progressKeyTranslations || {})
const formattedProgressKey = computed(() => props.data?.formattedProgressKey)
const leaderboardKey = computed(() => props.data?.leaderboardKey)

const recentAttempts = computed(() => formattedProgress.value?.attempts || null)
const attemptRowsLimited = computed(() => {
  const rows = recentAttempts.value?.rows
  if (!Array.isArray(rows)) return []
  return rows.slice(0, 5)
})
</script>

<style lang="scss" scoped>
.scenario-progress-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: white;
}

.objectives-heading {
  font-weight: bold;
  font-size: 1.17em;
}

.stars {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .star-line {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }
}

.progress-summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;

  .progress-key {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
  }

  .key-label {
    font-weight: bold;
  }
}

.progress-attempts {
  .attempts-table {
    width: 100%;
    text-align: center;
  }
}
</style>
