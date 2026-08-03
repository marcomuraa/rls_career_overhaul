<template>
  <InfoCard
    :header="translatedHeader"
    headerType="ribbon"
    class="dynamic"
    :class="{ 'experimental': panel.experimental, 'full-height': panel.fullHeight }"
    :no-blur="noBlur"
  >
    <template #content>
      <BngCardHeading type="ribbon" class="replay-heading">
        Stage Score
      </BngCardHeading>
      <div class="score-section-container">
        <div class="score-section" v-if="speedScore">
          <span class="score-section-title">{{ speedScore.scoreName }}</span>
          <span>{{ speedScore.actualSpeed.text }} : {{ speedScore.actualSpeed.value }} {{ speedScore.actualSpeed.unit }}</span>
          <span>{{ speedScore.targetSpeed.text }} : {{ speedScore.targetSpeed.value }} {{ speedScore.targetSpeed.unit }}</span>
          <span>{{ speedScore.diff.text }} : {{ speedScore.diff.value }} {{ speedScore.diff.unit }}</span>
          <span class="score-earned">Score : {{ speedScore.score }} / {{ speedScore.maxScore }}</span>
        </div>

        <div class="score-section" v-if="timeScore">
          <span class="score-section-title">{{ timeScore.scoreName }}</span>
          <span>{{ timeScore.timeToImpact.text }} : {{ timeScore.timeToImpact.value }} {{ timeScore.timeToImpact.unit }}</span>
          <span class="score-earned">Score : {{ timeScore.score }} / {{ timeScore.maxScore }}</span>
        </div>

        <div class="score-section" v-if="damageLocationScore">
          <span class="score-section-title">{{ damageLocationScore.scoreName }}</span>
          <span>{{ damageLocationScore.requiredImpactLocation.text }} : {{ damageLocationScore.requiredImpactLocation.value }}</span>
          <span>{{ damageLocationScore.actualImpactLocation.text }} : {{ damageLocationScore.actualImpactLocation.value }} {{ damageLocationScore.actualImpactLocation.precision }}</span>
          <span class="score-earned">Score : {{ damageLocationScore.score }} / {{ damageLocationScore.maxScore }}</span>
        </div>
      </div>

      <span class="new-score-title">New score : </span>
      <PointsBar />

      <DynamicComponent v-if="content" :template="content"/>
    </template>
  </InfoCard>
</template>

<script setup>
import { computed } from "vue"
import { BngCardHeading } from "@/common/components/base"
import InfoCard from "../components/InfoCard.vue"
import { DynamicComponent } from "@/common/components/utility"
import { PointsBar } from "@/modules/apps"

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
  noBlur: {
    type: Boolean,
    default: false
  }
})

const speedScore = computed(() => props.panel.stepScoreData?.speedScore)
const timeScore = computed(() => props.panel.stepScoreData?.timeScore)
const damageLocationScore = computed(() => props.panel.stepScoreData?.damageLocationScore)
</script>

<style scoped lang="scss">
.dynamic {
  :deep(.info-content) {
    padding: 0 1rem;
    margin-top:10px;
    :first-child {
      margin-top: 0;
    }
  }

}

.full-height {
  height: 100%;
}

.new-score-title {
  font-size: 1.4rem;
  color: white;
  margin-bottom: 10px;
}

.score-section-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin: 40px 0 40px 0;
}
.score-section-title {
  font-size: 1.4rem;
  color: white;
  margin-bottom: 10px;
}
.score-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--bng-orange-300);
  font-weight: 500;
}

.score-earned {
  font-size: 1.4rem;
  color:rgb(255, 213, 0);
  margin-top: 10px;
  margin-bottom: 10px;
}
.experimental {
  :deep(.card-cnt) {
    border: 2px solid rgba(220,0,0, 0.8);
    background-color: rgba(22,0,0, 0.6);
  }
  :deep(.card-heading) {
    &.heading-style-ribbon::before {
      background: rgba(220,0,0, 0.8);
    }
  }
}

</style>
