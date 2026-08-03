<template>
  <div class="tests-card" v-bng-scoped-nav>
    <div class="tests-panel">
      <div v-if="inputTestState.tests.length" class="tests-header">
        <BngButton
          class="action action--main"
          :accent="inputTestState.runAllActive ? ACCENTS.main : ACCENTS.secondary"
          :disabled="!canRunInputTests"
          @click="runTests(inputTestGroups.map(group => group.runId))">
          {{ $translate.instant("ui.controls.inputTests.runAll") }}
        </BngButton>
      </div>

      <div v-if="unavailableMessage" class="tests-status">
        {{ unavailableMessage }}
      </div>

      <ul v-if="inputTestGroups.length" class="list">
        <li
          v-for="group in inputTestGroups"
          :key="group.runId"
          class="group"
          :class="{ 'group--running': group.running }">
          <div class="group__action">
            <BngButton
              class="action action--test"
              :accent="group.running ? ACCENTS.main : ACCENTS.secondary"
              :disabled="!canRunInputTests"
              @click="runTests([group.runId])">
              ▶
            </BngButton>
          </div>

          <div class="group__rows">
            <div
              v-for="test in group.tests"
              :key="test.id"
              class="item"
              :class="{ 'item--running': group.running }">
              <span class="title">{{ $translate.instant(`ui.controls.inputTests.${test.id}`) }}:</span>

              <div class="summary__value">
                <span class="summary__main" :class="{ 'summary__main--note': !!test.message }">
                  {{ test.summaryText }}
                </span>
                <span v-if="test.modeErrorText" class="summary__detail">
                  {{ test.modeErrorText }}
                </span>
              </div>

              <div class="histogram" :class="{ 'histogram--empty': !test.histogram }">
                <template v-if="test.histogram">
                  <div class="histogram__buckets">
                    <div class="histogram__range" :style="test.histogram.rangeStyle">
                      <div
                        v-for="(bucket, index) in test.histogram.buckets"
                        :key="`${test.id}-bucket-${index}`"
                        class="bucket"
                        :title="bucket.title"
                        :style="bucket.style">
                      </div>
                    </div>
                  </div>

                  <div v-if="test.histogram.errorLineStyle" class="histogram__error-line" :style="test.histogram.errorLineStyle"></div>

                  <div class="histogram__marker" :style="test.histogram.markerStyle"></div>
                </template>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, shallowRef } from "vue"
import { useBridge } from "@/bridge"
import { BngButton, ACCENTS } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { useEvents } from "@/services/events"
import { $translate } from "@/services"

const props = defineProps({
  isAvailable: {
    type: Boolean,
    default: true,
  },
})

const { lua } = useBridge()
const events = useEvents()
const inputTestState = shallowRef({
  hasVehicle: false,
  runAllActive: false,
  runningTestId: null,
  tests: [],
})
const statDecimals = { vehicleFrequencyTest: 2 }

const inputTestGroups = computed(() => {
  const groups = []
  const runningTestId = inputTestState.value.runningTestId
  for (const test of inputTestState.value.tests) {
    let group = groups[groups.length - 1]
    if (group?.runId !== test.runId) {
      group = { runId: test.runId, running: runningTestId === test.runId, tests: [] }
      groups.push(group)
    }
    group.tests.push(getInputTestRow(test, group.running))
  }
  return groups
})
const latencyHistogramMax = computed(() =>
  inputTestState.value.tests.reduce((maxValue, test) => {
    if (test.stats?.unit !== "ms" || !test.stats.buckets.length) return maxValue
    return Math.max(maxValue, test.stats.buckets[test.stats.buckets.length - 1].max)
  }, 0)
)
//const canRunInputTests = computed(() => props.isAvailable && inputTestState.value.hasVehicle)
const canRunInputTests = computed(() => true)
const unavailableMessage = computed(() => {
  if (canRunInputTests.value) return ""
  if (!props.isAvailable) return $translate.instant("ui.controls.inputTests.unavailableHardware")
  if (!inputTestState.value.hasVehicle) return $translate.instant("ui.controls.inputTests.unavailableVehicle")
})

function formatStatValue(value, unit = "", unitDecimals = 1) {
  if (unit) return `${value.toFixed(unitDecimals)}${unit}`

  const absValue = Math.abs(value)
  const decimals = absValue >= 100 ? 1 : absValue >= 10 ? 2 : absValue >= 1 ? 3 : absValue >= 0.1 ? 4 : absValue >= 0.01 ? 5 : 6
  return value.toFixed(decimals).replace(/\.?0+$/, "")
}

onMounted(() => {
  events.on("InputTestStateChanged", state => (inputTestState.value = state))
  lua.extensions.core_input_tests.updateUI()
})

function runTests(testIds) {
  if (!canRunInputTests.value) return
  lua.extensions.core_input_tests.startTests(testIds)
}

function getInputTestRow(test, running) {
  const stats = test.stats
  const row = {
    id: test.id,
    message: test.message,
    summaryText: running ? "..." : test.message || "--",
    modeErrorText: "",
    histogram: getInputTestHistogram(test),
  }
  if (running || test.message || !stats || stats.sampleCount === 0) return row

  const decimals = statDecimals[test.id] || 1
  row.summaryText = test.id === "systemFrequencyTest" && stats.unit === "Hz"
    ? `${Math.round(stats.value)}${stats.unit}`
    : formatStatValue(stats.value, stats.unit, decimals)
  if (stats.value !== 0) row.modeErrorText = `±${Math.ceil(Math.abs(stats.modeError / stats.value) * 100)}%`
  return row
}

function getInputTestHistogram(test) {
  const { stats } = test
  if (!stats || !stats.buckets.length) return null
  const decimals = statDecimals[test.id] || 1
  const sampleLabel = $translate.instant("ui.controls.inputTests.stats.samples")
  const buckets = stats.buckets
  const actualMin = buckets[0].min
  const actualMax = buckets[buckets.length - 1].max
  const min = 0
  const max = stats.unit === "ms" ? Math.max(latencyHistogramMax.value, actualMax) : actualMax
  const hasDomain = max > min
  const hasError = hasDomain && (stats.modeErrorLow > 0 || stats.modeErrorHigh > 0)
  const domainPercent = value => Math.min(100, Math.max(0, (value - min) / (max - min) * 100))
  const left = hasDomain ? domainPercent(actualMin) : 0
  const right = hasDomain ? 100 - domainPercent(actualMax) : 0
  const markerLeft = hasDomain ? domainPercent(stats.value) : 50
  const errorStart = hasError ? domainPercent(stats.value - stats.modeErrorLow) : 0
  const errorEnd = hasError ? domainPercent(stats.value + stats.modeErrorHigh) : 0
  return {
    buckets: buckets.map(bucket => ({
      title: `${formatStatValue(bucket.min, stats.unit, decimals)} .. ${formatStatValue(bucket.max, stats.unit, decimals)} | ${bucket.count} ${sampleLabel}`,
      style: {
        "--bucket-strength": stats.bucketPeakCount > 0 ? bucket.count / stats.bucketPeakCount : 0,
      },
    })),
    rangeStyle: {
      left: `${left}%`,
      right: `${right}%`,
    },
    markerStyle: {
      left: `${markerLeft}%`,
    },
    errorLineStyle:
      errorEnd > errorStart
        ? {
            left: `${errorStart}%`,
            width: `${errorEnd - errorStart}%`,
          }
        : null,
  }
}
</script>

<style lang="scss" scoped>
.tests-card,
.tests-panel,
.tests-header,
.group__action,
.group__rows,
.histogram__buckets,
.list {
  display: flex;
}

.tests-card {
  padding-top: 0.25rem;
  width: 100%;
  box-sizing: border-box;
}

.tests-panel {
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 0.75rem;
  background: var(--bng-cool-gray-800);
  border: 1px solid var(--bng-cool-gray-600);
  border-radius: 0.5rem;
  box-sizing: border-box;
}

.tests-header {
  align-items: center;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.tests-status {
  color: rgba(var(--bng-off-white-rgb), 0.8);
}

.list {
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
  box-sizing: border-box;
}

.group {
  --group-accent: var(--bng-off-white);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;

  &:has(.action--test:hover),
  &:has(.action--test:focus-visible),
  &--running {
    --group-accent: var(--bng-orange-400);

    .title {
      color: var(--bng-orange-400);
    }
  }
}

.group__action {
  position: relative;
  align-items: center;
  justify-content: center;
  min-width: 1.8rem;

  &::after {
    content: "";
    position: absolute;
    left: 100%;
    right: -0.5rem;
    top: 50%;
    height: 2px;
    background: var(--group-accent);
    transform: translateY(-50%);
  }
}

.group__rows {
  position: relative;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  margin-left: 0.5rem;
  padding-left: 1rem;
  box-sizing: border-box;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    bottom: 50%;
    width: 2px;
    background: var(--group-accent);
  }
}

.item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 13rem) minmax(5.5rem, 8rem) minmax(0, 1fr);
  align-items: center;
  column-gap: 0.5rem;
  padding: 0.35rem 0;
  width: 100%;
  box-sizing: border-box;

  &::before {
    content: "";
    position: absolute;
    left: -1rem;
    top: 50%;
    width: 0.5rem;
    height: 2px;
    background: var(--group-accent);
    transform: translateY(-50%);
  }

  &:first-child:last-child::before {
    left: -1.25rem;
    width: 0.75rem;
  }

  &:first-child:not(:last-child)::after,
  &:last-child:not(:first-child)::after {
    content: "";
    position: absolute;
    left: -1rem;
    width: 2px;
    background: var(--group-accent);
  }

  &:first-child:not(:last-child)::after {
    top: 50%;
    bottom: -50%;
  }

  &:last-child:not(:first-child)::after {
    top: -50%;
    bottom: 50%;
  }
}

.action {
  justify-self: start;
}

.action--main {
  align-self: stretch;
}

.action--test {
  --bng-button-min-width: 1.8rem;
  --bng-button-padding: 0.2em;
  --bng-button-padding-top: 0.15em;
  --bng-button-padding-bottom: 0.175em;
  --bng-button-margin: 0;
}

.title,
.summary__main,
.summary__detail {
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title {
  font-weight: 600;
}

.summary__value {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.35rem;
  min-width: 0;
}

.summary__main {
  color: var(--bng-off-white);
  text-align: right;
}

.summary__main--note {
  opacity: 0.8;
}

.summary__detail {
  color: rgba(var(--bng-off-white-rgb), 0.62);
  font-size: 0.82rem;
  line-height: 1;
  text-align: right;
}

.histogram {
  position: relative;
  min-width: 0;
  height: 1rem;
  padding: 0 1px;
}

.histogram--empty {
  visibility: hidden;
  opacity: 0;
}

.histogram__buckets {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(var(--bng-off-white-rgb), 0.22);
  background-color: #000;
  box-sizing: border-box;
  overflow: hidden;
}

.histogram__range {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  min-width: 0;
}

.histogram__marker {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--bng-orange-400);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
}

.histogram__error-line {
  position: absolute;
  top: 50%;
  height: 2px;
  background: #000;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
}

.bucket {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  background-color: rgba(var(--bng-off-white-rgb), calc(var(--bucket-strength, 0) * 0.9));
}
</style>
