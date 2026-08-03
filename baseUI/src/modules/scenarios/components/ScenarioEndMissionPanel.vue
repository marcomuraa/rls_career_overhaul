<template>
  <div
    v-if="missionData"
    class="scenario-end-mission"
    v-bng-scoped-nav="{ scopeId: 'scenario-end-mission', type: 'container' }"
  >
    <div class="panel mission-panel mission-objectives">
      <div class="section-title">{{ $tt("missions.missions.general.objectives") }}:</div>
      <div
        v-for="(star, index) in stars"
        :key="index"
        class="objective-row"
        :class="{ newBest: isNewBest(star) }"
      >
        <div class="objective-line">
          <span v-if="star.label" class="objective-label">{{ $tt(star.label) }}</span>
          <span v-if="star.text" class="objective-text">{{ $tt(star.text) }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="hasRewardsOrUnlocks"
      class="panel mission-panel mission-rewards-panel"
    >
      <div v-if="hasStarRewards">
        <div class="section-title">{{ $tt("missions.missions.general.rewards") }}:</div>
        <div class="rewards-list">
          <div
            v-for="(reward, index) in starRewardsList"
            :key="'sr-' + index"
            class="reward-item"
          >
            <span class="reward-amount">{{ reward.rewardAmount }}</span>
            <span v-if="reward.attributeKey" class="reward-key">{{ reward.attributeKey }}</span>
          </div>
        </div>
      </div>

      <div v-if="hasUnlockedMissions">
        <div class="section-title">{{ $tt("missions.missions.general.unlockedMissions") }}:</div>
        <ul class="unlocks-list">
          <li
            v-for="(m, index) in unlockedMissions"
            :key="'um-' + index"
          >
            {{ $tt(m.name) }}
          </li>
        </ul>
      </div>
    </div>

    <div class="panel mission-panel mission-progress-panel">
      <div class="section-title">
        Progress for "{{ progressKeyLabel }}"
      </div>

      <table v-if="ownAggregate" class="progress-table">
        <thead>
          <tr>
            <th v-for="(val, key) in ownAggregate.labels" :key="'h-' + key">
              {{ $tt(val) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowKey) in ownAggregate.rows"
            :key="'r-' + rowKey"
          >
            <td
              v-for="(d, dataIndex) in row"
              :key="'c-' + dataIndex"
              :class="{ newBest: isNewBestAggregate(dataIndex) }"
            >
              {{ $tt(d.text) }}
            </td>
          </tr>
        </tbody>
      </table>

      <hr class="progress-sep" />

      <span v-if="leaderboardKey === 'recent'">
        {{ $tt("missions.missions.general.recentAttempts") }}
      </span>
      <span v-else>
        {{ $tt("missions.missions.general.leaderboard") }}
      </span>

      <table v-if="attempts" class="progress-table">
        <thead>
          <tr>
            <th v-for="(val, key) in attempts.labels" :key="'ah-' + key">
              {{ $tt(val) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in limitedAttemptsRows"
            :key="'ar-' + rowIndex"
          >
            <td
              v-for="(d, dataIndex) in row"
              :key="'ac-' + dataIndex"
              :class="{ currentAttempt: isCurrentAttempt(rowIndex) }"
            >
              {{ $tt(d.text) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  missionData: { type: Object, default: () => null },
})

const stars = computed(() => props.missionData?.formattedStars?.stars || [])

const ownAggregate = computed(() => props.missionData?.formattedProgress?.ownAggregate || null)
const attempts = computed(() => props.missionData?.formattedProgress?.attempts || null)

const limitedAttemptsRows = computed(() => {
  const rows = attempts.value?.rows
  if (!rows) return []
  const list = Array.isArray(rows) ? rows : Object.values(rows)
  return list.slice(0, 6)
})

const starRewardsList = computed(() => props.missionData?.aggregateChange?.starRewards?.sumList || [])
const unlockedMissions = computed(() => props.missionData?.aggregateChange?.unlockedMissions || [])

const hasStarRewards = computed(() => starRewardsList.value.length > 0)
const hasUnlockedMissions = computed(() => unlockedMissions.value.length > 0)
const hasRewardsOrUnlocks = computed(() => hasStarRewards.value || hasUnlockedMissions.value)

const leaderboardKey = computed(() => props.missionData?.leaderboardKey)

const progressKeyLabel = computed(() => {
  const md = props.missionData
  if (!md) return ""
  const key = md.progressKey
  const translations = md.progressKeyTranslations || {}
  return translations[key] || key || ""
})

function isNewBest(star) {
  return !!props.missionData?.aggregateChange?.unlockedStarsAttempt?.[star?.key]
}

function isNewBestAggregate(dataIndex) {
  const md = props.missionData
  if (!md) return false
  const newBestKeys = ownAggregate.value?.newBestKeys
  if (!newBestKeys) return false
  const key = newBestKeys[dataIndex]
  return !!md.aggregateChange?.aggregateChange?.newBestKeysByKey?.[key]
}

function isCurrentAttempt(rowIndex) {
  const md = props.missionData
  if (!md) return false
  const lk = md.leaderboardKey
  if (!lk) return false
  const changeKey = md.leaderboardChangeKeys?.[lk]
  return md.aggregateChange?.aggregateChange?.newBestKeysByKey?.[changeKey] === rowIndex + 1
}
</script>

<style lang="scss" scoped>
.scenario-end-mission {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 400px;
  padding: 0.5rem;
  box-sizing: border-box;
  gap: 1rem;
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  box-sizing: border-box;
}

.mission-panel {
  flex: 1;
  height: 100%;
  overflow: auto;
}

.section-title {
  font-weight: bold;
  font-size: 1.17em;
  margin-bottom: 0.55em;
}

.objective-row {
  padding: 0.25rem 0;
}

.objective-line {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reward-item {
  font-weight: 700;
  font-size: 1.5em;
}

.unlocks-list {
  margin: 0;
  padding-left: 1.2rem;

  li {
    font-weight: 700;
  }
}

.progress-table {
  width: 100%;
  text-align: center;
  border-collapse: collapse;

  th,
  td {
    padding: 0.2rem 0.3rem;
  }
}

.progress-sep {
  width: 100%;
  margin: 0.5rem 0;
}

@keyframes flashRecord {
  0% { background-color: rgba(200, 200, 200, 0.5); }
  33% { background-color: rgba(200, 200, 200, 0.5); }
  100% { background-color: rgba(0, 0, 0, 0.5); }
}

.newBest {
  background-color: rgba(200, 200, 200, 0.5);
  animation: flashRecord 3s infinite;
}

.currentAttempt {
  background-color: rgba(120, 120, 120, 0.5);
}
</style>
