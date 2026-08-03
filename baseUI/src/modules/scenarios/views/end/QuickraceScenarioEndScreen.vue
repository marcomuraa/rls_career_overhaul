<template>
  <div class="quickrace-scenario-end fade-in">
    <QuickraceEndHeader
      :data="data"
      :failed="failed"
      :is-new-local-best="isNewLocalBest"
      :has-place="hasPlace"
      :place="place"
    />

    <div class="end-body show-in-order">
      <QuickraceLapTimesPanel
        class="laps-section"
        :rows="lapRows"
        :detailed="detailed"
        @toggle-detail="$emit('toggle-detail')"
      />

      <div class="leaderboard-column">
        <QuickraceLeaderboardPanel
          :rows="leaderboardRows"
          :view-detailed="viewDetailed"
          @update:view-detailed="value => $emit('update:viewDetailed', value)"
          @select-record="index => $emit('select-record', index)"
        />
        <QuickraceRecordFooter :record="detailedRecord" />
      </div>
    </div>

    <ScenarioEndActions
      class="end-actions"
      :buttons="buttons"
      :active-button="activeButton"
      @execute="button => $emit('execute', button)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue"

import QuickraceEndHeader from "../../components/QuickraceEndHeader.vue"
import QuickraceLapTimesPanel from "../../components/QuickraceLapTimesPanel.vue"
import QuickraceLeaderboardPanel from "../../components/QuickraceLeaderboardPanel.vue"
import QuickraceRecordFooter from "../../components/QuickraceRecordFooter.vue"
import ScenarioEndActions from "../../components/ScenarioEndActions.vue"

const props = defineProps({
  data: { type: Object, default: () => null },
  failed: { type: Boolean, default: false },
  isNewLocalBest: { type: Boolean, default: false },
  hasPlace: { type: Boolean, default: false },
  place: { type: Number, default: -1 },
  detailed: { type: Boolean, default: false },
  lapRows: { type: Array, default: () => [] },
  leaderboardRows: { type: Array, default: () => [] },
  viewDetailed: { type: Number, default: 0 },
  detailedRecord: { type: Object, default: () => ({}) },
  activeButton: { type: Number, default: 0 },
})

defineEmits(["toggle-detail", "update:viewDetailed", "select-record", "execute"])

const buttons = computed(() => Array.isArray(props.data?.buttons) ? props.data.buttons : [])
</script>

<style lang="scss" scoped>
.quickrace-scenario-end {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1.25rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: auto;
  pointer-events: auto;
  color: white;
}

.end-body {
  align-self: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
  width: 1000px;
  height: 450px;
  overflow-y: hidden;
}

.laps-section {
  margin: 10px;
}

.leaderboard-column {
  align-self: center;
  width: calc(40% - 20px);
  height: calc(100% - 20px);
  display: flex;
  flex-direction: column;
  margin: 10px;
  position: relative;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  opacity: 0;
  animation: fadeIn linear 0.3s forwards;
}
</style>
