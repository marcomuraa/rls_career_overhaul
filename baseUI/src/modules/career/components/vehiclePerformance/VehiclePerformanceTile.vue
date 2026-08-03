<template>
  <BngCard class="card" v-bng-blur="true">
    <div class="vehicle-content-wrapper" v-bng-ui-nav-scroll.force>
      <div>
        <VehicleTileRow
          class="vehicle-tile-row"
          :data="vehicleData"
          :noInteraction="true"
          :small="true"
        />
      </div>

      <div class="certification-container">
        <!-- Technical Specifications Section -->
        <div class="specs-section">
          <div class="section-header">
            <h2>{{ $translate.instant("ui.career.vehiclePerformance.technicalSpecifications") }}</h2>
          </div>

          <div v-if="!selectedCertificationData.vehicleClass">
            {{ $translate.instant("ui.career.vehiclePerformance.notAssessedYet") }}
          </div>
          <div v-else class="specs-grid">
            <div class="spec-row">
              <div class="spec-label">{{ $t('ui.options.units.weight') }}</div>
              <div class="spec-value">
                {{ units.buildString('weight', selectedCertificationData.weight, 0) }}
              </div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $translate.instant("ui.career.performance.powerToWeightScore") }}</div>
              <div class="spec-value">{{ $translate.instant("ui.career.vehiclePerformance.powerPerWeightValue", { value: selectedCertificationData.powerPerTon.toFixed(0) }) }}</div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $t('vehicle.info.Drivetrain') }}</div>
              <div class="spec-value">{{ selectedCertificationData.drivetrain }}</div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $t('vehicle.info.Fuel Type') }}</div>
              <div class="spec-value">{{ selectedCertificationData.fuelType }}</div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $t('vehicle.info.Induction Type') }}</div>
              <div class="spec-value">{{ selectedCertificationData.inductionType }}</div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $translate.instant("ui.career.vehiclePerformance.mileage") }}</div>
              <div class="spec-value">{{ units.buildString('length', selectedCertificationData.mileage, 0) }}</div>
            </div>
            <div class="spec-row">
              <div class="spec-label">{{ $translate.instant("ui.career.vehiclePerformance.lateralGForce") }}</div>
              <div class="spec-value">{{ $translate.instant("ui.career.vehiclePerformance.gForceValue", { value: selectedCertificationData.lateralGForce.toFixed(2) }) }}</div>
            </div>
          </div>
        </div>

        <!-- Performance Metrics Section -->
        <div class="specs-section">
          <div class="section-header">
            <h2>{{ $translate.instant("ui.career.vehiclePerformance.metrics") }}</h2>
          </div>
          <div v-if="selectedCertificationData.vehicleClass" class="metrics-grid">
            <BngProgressBar
              v-if="selectedCertificationData.power"
              :headerLeft="$translate.instant('ui.career.vehiclePerformance.powerOutput')"
              :headerRight="units.buildString('power', selectedCertificationData.power, 0)"
              :value="selectedCertificationData.power"
              :min="0"
              :max="1000"
              :showValueLabel="false"
              :valueColor="getColorForValue(selectedCertificationData.power, 0, 1000)"
              class="score-progress"
            />

            <BngProgressBar
              :headerLeft="$translate.instant('ui.career.vehiclePerformance.time060PreppedSurface')"
              :headerRight="selectedCertificationData.time_0_60 ? $translate.instant('ui.career.vehiclePerformance.timeSeconds', { time: selectedCertificationData.time_0_60.toFixed(2) }) : $translate.instant('ui.career.vehiclePerformance.notAvailable')"
              :value="selectedCertificationData.time_0_60 ? -selectedCertificationData.time_0_60 : -25"
              :min="-25"
              :max="-2"
              :showValueLabel="false"
              :valueColor="getColorForValue(selectedCertificationData.time_0_60 ? -selectedCertificationData.time_0_60 : -25, -25, -2)"
              class="score-progress"
            />

            <BngProgressBar
              v-if="selectedCertificationData.time_1_4"
              :headerLeft="$translate.instant('ui.career.vehiclePerformance.quarterMile')"
              :headerRight="`${selectedCertificationData.time_1_4.toFixed(2)} s @ ${units.buildString('speed', selectedCertificationData.velAt_1_4, 0)}`"
              :value="selectedCertificationData.time_1_4 ? -selectedCertificationData.time_1_4 : -35"
              :min="-35"
              :max="-8.1"
              :showValueLabel="false"
              :valueColor="getColorForValue(selectedCertificationData.time_1_4 ? -selectedCertificationData.time_1_4 : -35, -35, -8.1)"
              class="score-progress"
            />

            <BngProgressBar
              v-if="selectedCertificationData.performanceAggregateScores.brakingGForceScore"
              :headerLeft="$translate.instant('ui.career.vehiclePerformance.brakingForce')"
              :headerRight="selectedCertificationData.brakingG ? $translate.instant('ui.career.vehiclePerformance.gForceValue', { value: selectedCertificationData.brakingG.toFixed(2) }) : $translate.instant('ui.career.vehiclePerformance.notAvailable')"
              :value="selectedCertificationData.brakingG || 0"
              :min="0.5"
              :max="1.9"
              :showValueLabel="false"
              :valueColor="getColorForValue(selectedCertificationData.brakingG || 0, 0.5, 1.9)"
              class="score-progress"
            />

            <div v-if="selectedCertificationData && selectedCertificationData.vehicleClass" class="performance-index-container">
              <div class="progress-wrapper">
                <BngProgressBar
                  :headerLeft="$translate.instant('ui.career.vehiclePerformance.title')"
                  :value="selectedCertificationData.vehicleClass.performanceIndex"
                  :min="0"
                  :max="110"
                  :showValueLabel="false"
                  :valueColor="performanceIndexBarColor"
                  class="score-progress performance-index"
                />
                <div class="class-markers">
                  <div v-for="(classInfo, index) in [{pi: 101, name: 'X'}, {pi: 86, name: 'S'},
                        {pi: 66, name: 'A'}, {pi: 41, name: 'B'}, {pi: 21, name: 'C'}]"
                        :key="index"
                        class="class-marker"
                        :style="{ left: `${(classInfo.pi/110)*100}%` }">
                    <div class="marker-line"></div>
                    <div class="marker-label">{{ classInfo.name }}</div>
                  </div>
                </div>
              </div>
              <div class="performance-index-sticker-row">
                <PerformanceIndexSticker
                  :vehicle-class="selectedCertificationData.vehicleClass"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
    <template #footer>
      <div class="history-dropdown-container">
        <div class="dropdown">
          <div class="dropdown-label">{{ $translate.instant("ui.career.vehiclePerformance.previousAssessments") }}</div>
          <BngDropdown v-model="selectedHistoryIndex" :items="historyOptions" class="history-select">
            {{ historyOptions[selectedHistoryIndex]?.label }}
          </BngDropdown>
        </div>
        <BngButton @click="startTest()" :disabled="vehicleData.needsRepair || !vehicleData.owned">
          {{ startTestTitle }}
        </BngButton>
      </div>
    </template>
  </BngCard>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { BngCard, BngButton, BngProgressBar, BngDropdown } from "@/common/components/base"
import { vBngBlur, vBngUiNavScroll } from "@/common/directives"
import { useBridge } from "@/bridge"
import VehicleTileRow from "../vehicleInventory/VehicleTileRow.vue"
import PerformanceIndexSticker from "./PerformanceIndexSticker.vue"
import { $translate } from "@/services/translation"
const { units, lua } = useBridge()

const props = defineProps({
  vehicleData: Object,
})

const title = computed(() => props.vehicleData.niceName || "No Name")
const startTestTitle = computed(() =>
  props.vehicleData.needsRepair
    ? $translate.instant("ui.career.shared.assessPerformanceRepairRequired")
    : $translate.instant("ui.career.vehiclePerformance.assessPerformanceNow")
)

const certificationKeyMap = {
  'weight': "ui.options.units.weight",
  'power': "ui.options.units.power",
  'torque': "ui.options.units.torque",
}

const performanceKeyMap = {
  'quarterMileScore': "ui.career.performance.quarterMileScore",
  'powerToWeightScore': "ui.career.performance.powerToWeightScore",
  'timeTo60Score': "ui.career.performance.timeTo60Score",
  'brakingGForceScore': "ui.career.performance.brakingGForceScore",
  'speedProgressionScore': "ui.career.performance.speedProgressionScore"
}

const getTranslationKey = (key) => {
  return certificationKeyMap[key] || `ui.career.certification.${key}`
}

const getPerformanceTranslationKey = (key) => {
  return performanceKeyMap[key] || key
}

const startTest = function() {
  lua.career_modules_vehiclePerformance.startDragTest()
}

const getColorForValue = (value, min = 0, max = 1) => {
  // Normalize value to 0-1 range using provided min/max
  const normalizedValue = (value - min) / (max - min)
  // Adjust the normalized value to start interpolation at 10%
  const adjustedValue = Math.max(0, normalizedValue - 0.1) * (1 / 0.9)

  let red, green
  if (adjustedValue < 0.5) {
    // Red to Yellow (20-60%)
    red = 200
    green = Math.round(200 * (adjustedValue * 2))
  } else {
    // Yellow to Green (60-100%)
    red = Math.round(200 * (2 - adjustedValue * 2))
    green = 200
  }

  return `rgb(${red}, ${green}, 0)`
}

const selectedHistoryIndex = ref(0)

const allCertificationData = computed(() => {
  // Create a list with current certification data at the beginning followed by performance history
  return [
    props.vehicleData.certificationData || { noPerformanceData: true }, // Add empty entry with current timestamp if undefined
    ...(props.vehicleData.performanceHistory || [])
  ]
})

const historyOptions = computed(() => {
  if (!allCertificationData.value.length) return []

  // Create options for dropdown
  return allCertificationData.value.map((item, index) => {
    const date = new Date(item.timeStamp).toLocaleString()
    return {
      value: index,
      label: index === 0
        ? (item.noPerformanceData
          ? $translate.instant("ui.career.vehiclePerformance.currentTestResultsNoData")
          : $translate.instant("ui.career.vehiclePerformance.currentTestResults", { date }))
        : $translate.instant("ui.career.vehiclePerformance.previousTestResults", { date }),
    }
  })
})

const emptyCertificationData = Object.freeze({ noPerformanceData: true })

const selectedCertificationData = computed(() => {
  return allCertificationData.value[selectedHistoryIndex.value] || emptyCertificationData
})

// Reset the selection when the available history shrinks (e.g. routeData is
// replaced on navigation) so the selected index never points past the list.
watch(allCertificationData, data => {
  if (selectedHistoryIndex.value >= data.length) {
    selectedHistoryIndex.value = 0
  }
})

// Class -> minPI mapping. Sampling the gradient at minPI / 110 gives the bar
// the same class-correlated color used by the threshold markers.
const classMinPiMap = { D: 0, C: 21, B: 41, A: 66, S: 86, X: 101 }

const performanceIndexBarColor = computed(() => {
  const vc = selectedCertificationData.value?.vehicleClass
  const minPi = classMinPiMap[vc?.class?.name]
  if (minPi === undefined) {
    return getColorForValue(vc?.performanceIndex / 110)
  }
  return getColorForValue(minPi / 110)
})

watch(() => props.vehicleData, (newVal) => {
}, { immediate: true })

</script>

<style lang="scss" scoped>
.card {
  color: #fff;
  width: 65%;
  height: 100%;
  background-color: var(--bng-black-8);
  & :deep(.card-cnt) {
    background-color: rgba(0, 0, 0, 0);
  }
}

.vehicle-content-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1em;
  overflow: auto;
}

.vehicle-tile-row {
  background:none;
  width: 100%;
}

.certification-container {
  padding-top: 1em;
  padding-bottom: 1em;
  display: flex;
  gap: 1em;
  align-items: flex-start;
  flex-direction: column;
}

.specs-section {
  background-color: var(--bng-black-4);
  border-radius: var(--bng-corners-2);
  padding: 1em;
  width: 100%;
}

.section-header {
  margin-top: -1em;
  margin-bottom: 0.75em;

  h2 {
    font-size: 1.2em;
    font-weight: 600;
    color: #fff;
  }
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 4em;
  row-gap: 0.5em;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2em;
}

.spec-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9em;
}

.spec-value {
  font-weight: 500;
  color: #fff;
}

.metrics-grid {
  display: grid;
  gap: 0.5em;
}

.performance-index-container {
  margin-top: 0.75em;
  padding-top: 0.75em;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.performance-index-sticker-row {
  display: flex;
  justify-content: left;
  margin-top: 1em;
}

.score-progress {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--bng-corners-1);
  padding: 0.25em 0.5em;

  :deep(.progress-bar) {
    height: 0.5em;
    border-radius: 999px;
  }

  :deep(.header) {
    margin-bottom: 0.25em;
  }

  &.performance-index {
    padding-bottom: 0.5em;
    :deep(.header-text) {
      font-size: 1.1em;
      font-weight: bold;
    }

    :deep(.value-label) {
      font-size: 1.1em;
      font-weight: bold;
    }

    :deep(.progress-bar) {
      height: 2em !important;
    }
  }
}

.progress-wrapper {
  position: relative;
  width: 100%;
}

.class-markers {
  position: absolute;
  top: 1.75em;
  left: 0.5em;
  right: 0.5em;
  pointer-events: none;
  z-index: 2;
}

.class-marker {
  position: absolute;
  height: 2em;
  //transform: translateX(-1px);
  display: flex;
  align-items: center;

  .marker-line {
    width: 2px;
    height: 2em;
    background: rgba(255, 255, 255, 0.5);
  }

  .marker-label {
    position: absolute;
    left: 8px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9em;
    font-weight: 600;
  }
}

.dropdown {
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;
}

.dropdown-label {
  margin-bottom: 0.5em;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9em;
}

.history-select {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.5em;
  border-radius: var(--bng-corners-1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
  position: relative;
  z-index: 10;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  option {
    background-color: #333;
    color: #fff;
  }
}

.history-dropdown-container {
  > * {
    width: 100%;
  }
  :deep(.bng-button) {
    width: 100%;
    max-width: calc(100% - 0.5em) !important;
  }
}
</style>
