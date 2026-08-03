<template>
  <div class="standard-scenario-end fade-in">
    <ScenarioEndHeader :data="data" />

    <div class="end-body show-in-order">
      <ScenarioEndStatsPanel
        v-if="!hasMissionData"
        class="end-section stats-section"
        :stats="stats"
        :overall="overall"
        :medal-info="medalInfo"
      />

      <ScenarioEndRewardsPanel
        v-if="rewards"
        class="end-section rewards-section"
        :rewards="rewards"
        :chosen-vehicle="chosenVehicle"
        @choose-vehicle="vehicle => $emit('choose-vehicle', vehicle)"
      />

      <ScenarioEndTextPanel
        class="end-section text-section"
        :text="data && data.text"
        :portrait-img="portraitImg"
        :failed="failed"
        :medal-info="medalInfo"
      />

      <ScenarioEndMissionPanel
        v-if="hasMissionData"
        class="end-section mission-section"
        :mission-data="missionData"
      />
    </div>

    <ScenarioEndActions
      class="end-actions"
      :buttons="buttons"
      :active-button="activeButton"
      :reward-chosen="rewardChosen"
      @execute="button => $emit('execute', button)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue"

import ScenarioEndHeader from "../../components/ScenarioEndHeader.vue"
import ScenarioEndStatsPanel from "../../components/ScenarioEndStatsPanel.vue"
import ScenarioEndRewardsPanel from "../../components/ScenarioEndRewardsPanel.vue"
import ScenarioEndTextPanel from "../../components/ScenarioEndTextPanel.vue"
import ScenarioEndMissionPanel from "../../components/ScenarioEndMissionPanel.vue"
import ScenarioEndActions from "../../components/ScenarioEndActions.vue"

const props = defineProps({
  data: { type: Object, default: () => null },
  rewards: { type: Object, default: () => null },
  missionData: { type: Object, default: () => null },
  portraitImg: { type: Object, default: () => null },
  medalInfo: { type: Object, default: () => null },
  chosenVehicle: { type: Object, default: () => null },
  rewardChosen: { type: Boolean, default: true },
  activeButton: { type: Number, default: 0 },
  hasMissionData: { type: Boolean, default: false },
})

defineEmits(["choose-vehicle", "execute"])

const overall = computed(() => props.data?.overall || {})
const failed = computed(() => !!overall.value.failed)
const stats = computed(() => Array.isArray(props.data?.stats) ? props.data.stats : [])
const buttons = computed(() => Array.isArray(props.data?.buttons) ? props.data.buttons : [])
</script>

<style lang="scss" scoped>
.standard-scenario-end {
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
  flex-direction: column;
  flex-grow: 1;
  justify-content: center;
  min-width: 1000px;
  width: 100%;
}

.end-section {
  align-self: center;
  width: 100%;
}

.stats-section {
  height: 400px;
}

.text-section {
  height: 200px;
}

.mission-section {
  height: 400px;
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
