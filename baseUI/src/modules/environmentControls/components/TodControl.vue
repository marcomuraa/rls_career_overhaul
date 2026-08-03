<template>
  <div v-if="showTod" class="tod-control" :class="{ compact }">
    <BngSlider
      v-model="todMinutes"
      class="tod-slider"
      :min="0"
      :max="1440"
      :step="5"
      :debounce="0"
      :markers="todMarkers"
      :disabled="disabled"
      always-show-markers
      with-popover
      @valueChanged="onTodMinutesChanged"
    >
      <template #popover="{ hide }">
        <div
          class="tod-popover-menu"
          @click.stop
          @mousedown.stop
          @mouseup.stop
          @mouseover.stop
        >
          <BngButton
            v-for="item in todPopoverItems"
            :key="item.key"
            class="tod-popover-option"
            :accent="ACCENTS.menu"
            @click="selectTodPopoverItem(item, hide)"
          >
            {{ item.label }}
          </BngButton>
        </div>
      </template>
    </BngSlider>

    <div class="tod-time-row">
      <BngInput
        v-model="todTimeDraft"
        class="tod-time-input"
        :leading-icon="icons.timer"
        :showExternalButton="false"
        :maxLength="6"
        placeholder="HH:MM"
        :suffix="todSecondsSuffix"
        :validate="isValidTodTime"
        :disabled="disabled"
        @focus="onTodTimeFocus"
        @change="onTodTimeDraftChanged"
        @blur="onTodTimeCommit"
        @enter="onTodTimeCommit" />

      <span v-if="todUtcTimeText" class="tod-utc-time">({{ todUtcTimeText }} UTC)</span>
    </div>

    <div
      v-if="showStepControls"
      v-bng-scoped-nav="{ type: 'container', preventNavigationEscape: ['left', 'right'] }"
      bng-nav-priority-container
      class="tod-step-buttons"
    >
      <BngButton
        v-for="step in todStepButtonsBeforePlay"
        :key="step.label"
        class="tod-step-button"
        :accent="ACCENTS.outlined"
        :disabled="disabled"
        @click="stepTimeOfDay(step.minutes)"
      >
        {{ step.label }}
      </BngButton>
      <BngButton
        bng-scoped-nav-autofocus
        class="tod-step-button tod-play-step-button"
        :accent="ACCENTS.outlined"
        :disabled="disabled"
        @click="toggleTodPlay"
      >
        <BngIcon :type="todIsPlaying ? icons.pause : icons.play" />
      </BngButton>
      <BngButton
        v-for="step in todStepButtonsAfterPlay"
        :key="step.label"
        class="tod-step-button"
        :accent="ACCENTS.outlined"
        :disabled="disabled"
        @click="stepTimeOfDay(step.minutes)"
      >
        {{ step.label }}
      </BngButton>
    </div>

    <div v-if="showDayLengthSettings" class="tod-day-length-section">
      <div class="tod-day-night-visualization">
        <div class="tod-day-night-bar-row">
          <span class="tod-day-night-duration-label day">
            <BngIcon :type="icons.day" />
            <span>{{ dayLengthText }}</span>
          </span>
          <div class="tod-day-night-bar-slot">
            <div class="tod-day-night-side-line"></div>
            <div class="tod-day-night-bar" :style="{ width: `${dayNightBarWidthPercent}%` }">
              <div v-if="dayLengthSeconds > 0" class="tod-day-night-bar-segment day" :style="{ flexGrow: dayLengthSeconds }"></div>
              <div v-if="nightLengthSeconds > 0" class="tod-day-night-bar-segment night" :style="{ flexGrow: nightLengthSeconds }"></div>
            </div>
            <div class="tod-day-night-side-line"></div>
          </div>
          <span class="tod-day-night-duration-label night">
            <span>{{ nightLengthText }}</span>
            <BngIcon :type="icons.night" />
          </span>
        </div>
      </div>

      <div class="tod-day-night-length-controls">
        <BngRow class="tod-day-length-row">
          <template #label>Day length</template>
          <BngSmartSelect
            v-model="dayLengthSelect"
            :items="phaseLengthOptions"
            :disabled="disabled"
          />
        </BngRow>
      </div>
    </div>

    <div v-if="!disableDateControl" class="tod-date-controls">
      <BngDatePicker
        v-model="dateEpoch"
        :min="MIN_DATE_EPOCH"
        :max="MAX_DATE_EPOCH"
        :disabled="disabled"
      >
        <template #extra-actions="{ buttonProps }">
          <BngButton v-bind="buttonProps" :icon="icons.night" @click="findNextEclipse">
            {{ $t("ui.environment.nextEclipse") }}
          </BngButton>
        </template>
      </BngDatePicker>
    </div>
  </div>
</template>

<script setup lang="js">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { BngButton, BngDatePicker, BngInput, BngRow, BngSlider, BngSmartSelect, ACCENTS, icons, BngIcon } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { lua } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua"
import { $translate } from "@/services"
import { clampNumber } from "@/utils/maths"
import { buildSolarTimeOfDayOptions, buildSolarTodMarkers, civilOffsetHours, getCurrentLevelTime, getSolarTimeOfDayEvents } from "../solarTimeOfDay"

defineOptions({ name: "TodControl" })

const props = defineProps({
  showTod: {
    type: Boolean,
    default: true,
  },
  showStepControls: {
    type: Boolean,
    default: false,
  },
  disableDayLengthControls: {
    type: Boolean,
    default: false,
  },
  disableDateControl: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  timeOfDayOptions: {
    type: Array,
    default: () => [],
  },
  timeOfDayState: {
    type: Object,
    default: null,
  },
  applyPartial: {
    type: Function,
    default: null,
  },
})

const todState = ref(null)
const todMinutes = ref(0)
const todIsPlaying = ref(false)
const fallbackTimeOfDayOptions = ref([])
const localEnvironmentPatch = ref({})
const systemTimeTick = ref(0)
let todChangeTimer = null
let todRefreshTimer = null
let systemTimeRefreshTimer = null
let lerpSuppressUntil = 0

const TOD_APPLY_DEBOUNCE_MS = 0
const ENVIRONMENT_LERP_SECONDS = 1.15
// Needs to feel responsive even at high day/night scales.
// Legacy Angular polled at 200ms for time changes.
const TOD_REFRESH_INTERVAL_MS = 200
const TOD_MINUTES_PER_DAY = 1440
const hasExternalTimeOfDayState = computed(() =>
  props.timeOfDayState && typeof props.timeOfDayState === "object"
)
const todStepButtonsBeforePlay = [
  { label: "-1h", minutes: -60 },
  { label: "-10m", minutes: -10 },
]
const todStepButtonsAfterPlay = [
  { label: "+10m", minutes: 10 },
  { label: "+1h", minutes: 60 },
]

const SOLAR_OPTION_STATE_KEYS = ["latitude", "longitude", "year", "month", "day", "utcOffset", "dstRule"]
const currentYearFallback = new Date().getFullYear()

function normalizeInt(value, fallback, min, max) {
  const n = Math.round(Number(value))
  return clampNumber(Number.isFinite(n) ? n : fallback, min, max)
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function datePartsToEpoch(year, month, day) {
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return Math.round(date.getTime() / 1000)
}

const MIN_DATE_EPOCH = datePartsToEpoch(1, 1, 1)
const MAX_DATE_EPOCH = datePartsToEpoch(9999, 12, 31)

const environmentState = computed(() => ({
  ...(todState.value || {}),
  ...(props.timeOfDayState || {}),
  ...(localEnvironmentPatch.value || {}),
}))

function hasSolarOptionStateChange(partial) {
  return SOLAR_OPTION_STATE_KEYS.some(key => Object.prototype.hasOwnProperty.call(partial || {}, key))
}

async function applyEnvironmentPartial(partial, lerpSeconds) {
  const patch = partial || {}
  localEnvironmentPatch.value = { ...(localEnvironmentPatch.value || {}), ...patch }

  try {
    if (props.applyPartial) {
      await props.applyPartial(patch, lerpSeconds)
    } else if (Number(lerpSeconds) > 0) {
      await lua.core_environment.setState(patch, lerpSeconds)
    } else {
      await lua.core_environment.setState(patch)
    }
  } catch {
    // ignore
  }

  if (hasSolarOptionStateChange(patch)) void refreshTimeOfDayOptions()
}

watch(
  () => props.timeOfDayState,
  () => {
    localEnvironmentPatch.value = {}
  }
)

function isLerpSuppressed() {
  return Date.now() < lerpSuppressUntil
}

onMounted(() => {
  if (!hasExternalTimeOfDayState.value) refreshTod()
  refreshTimeOfDayOptions()
  systemTimeRefreshTimer = setInterval(() => {
    systemTimeTick.value++
  }, 10000)
  if (!hasExternalTimeOfDayState.value) {
    todRefreshTimer = setInterval(() => {
      if (todChangeTimer || todTimeDraftDirty.value || isLerpSuppressed()) return
      refreshTod()
    }, TOD_REFRESH_INTERVAL_MS)
  }
})

onUnmounted(() => {
  if (todChangeTimer) clearTimeout(todChangeTimer)
  todChangeTimer = null
  if (todRefreshTimer) clearInterval(todRefreshTimer)
  todRefreshTimer = null
  if (systemTimeRefreshTimer) clearInterval(systemTimeRefreshTimer)
  systemTimeRefreshTimer = null
})

function clampTodMinutes(m) {
  return clampNumber(m, 0, 1440)
}

function roundToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value
  return Math.round(value / step) * step
}

function todTimeToMinutes(timeValue) {
  const t = Number(timeValue)
  if (!Number.isFinite(t)) return 0
  const seconds = ((t + 0.5) % 1) * 86400
  return seconds / 60
}

function minutesToTodTime(minutes) {
  let t = (Number(minutes) * 60) / 86400 - 0.5
  t = t % 1
  if (t < 0) t += 1
  return t
}

function normalizeTodMinutes(minutes) {
  const m = Number(minutes)
  if (!Number.isFinite(m)) return 0
  return ((m % TOD_MINUTES_PER_DAY) + TOD_MINUTES_PER_DAY) % TOD_MINUTES_PER_DAY
}

function minutesBetween(startMinutes, endMinutes) {
  return normalizeTodMinutes(Number(endMinutes) - Number(startMinutes))
}

function formatTodHHMM(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function formatTodHHMMFromTime(timeValue) {
  return formatTodHHMM(todTimeToMinutes(timeValue))
}

function formatCurrentSystemHHMM() {
  systemTimeTick.value
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

function formatCurrentLevelLocalSystemHHMM() {
  systemTimeTick.value
  return getCurrentLevelTime(environmentState.value)
}

function syncTodState(data) {
  if (!data || typeof data !== "object") return false
  todState.value = data
  if (data.play !== undefined) todIsPlaying.value = !!data.play

  const time = Number(data.time)
  if (!Number.isFinite(time)) return true

  // Simulation time should update at minute resolution (slider/input display),
  // while manual user set snaps to 5 minutes (see `onTodMinutesChanged`).
  todMinutes.value = clampTodMinutes(roundToStep(todTimeToMinutes(time), 1))
  return true
}

async function refreshTod() {
  if (isLerpSuppressed()) return
  try {
    const data = await lua.core_environment.getTimeOfDay()
    syncTodState(data)
  } catch {
    todState.value = null
    todIsPlaying.value = false
    todMinutes.value = 0
  }
}

async function refreshTimeOfDayOptions() {
  if (props.timeOfDayOptions.length > 0) return
  try {
    fallbackTimeOfDayOptions.value = (await lua.core_environment.getTimeOfDayOptions()) || []
  } catch {
    fallbackTimeOfDayOptions.value = []
  }
}

async function applyTodMinutesToEngine(minutes) {
  try {
    // Always start from authoritative TimeOfDay object; a missing dayLength
    // would otherwise get written back as `nil` and reset the cycle length.
    const base = hasExternalTimeOfDayState.value ? environmentState.value : (await lua.core_environment.getTimeOfDay()) || todState.value || {}
    const next = { ...base, time: minutesToTodTime(minutes) }
    todState.value = next
    lerpSuppressUntil = Date.now() + ENVIRONMENT_LERP_SECONDS * 1000 + 150
    await applyEnvironmentPartial({ time: next.time, play: !!next.play }, ENVIRONMENT_LERP_SECONDS)
  } catch {
    // ignore
  }
}

async function applyTodTimeToEngine(time) {
  const t = Number(time)
  if (!Number.isFinite(t)) return

  try {
    const base = hasExternalTimeOfDayState.value ? environmentState.value : (await lua.core_environment.getTimeOfDay()) || todState.value || {}
    const next = { ...base, time: t }
    todState.value = next
    todIsPlaying.value = !!next.play
    todMinutes.value = clampTodMinutes(roundToStep(todTimeToMinutes(t), 1))
    lerpSuppressUntil = Date.now() + ENVIRONMENT_LERP_SECONDS * 1000 + 150
    await applyEnvironmentPartial({ time: next.time, play: !!next.play }, ENVIRONMENT_LERP_SECONDS)
  } catch {
    // ignore
  }
}

async function syncTimeToRealClock() {
  try {
    await lua.core_environment.syncTimeToRealClock(ENVIRONMENT_LERP_SECONDS)
    await refreshTod()
  } catch {
    // ignore
  }
}

async function syncTimeToRealClockUtc() {
  try {
    await lua.core_environment.syncTimeToRealClockUtc(ENVIRONMENT_LERP_SECONDS)
    await refreshTod()
  } catch {
    // ignore
  }
}

async function toggleTodPlay() {
  try {
    const base = hasExternalTimeOfDayState.value ? environmentState.value : (await lua.core_environment.getTimeOfDay()) || todState.value || {}
    const next = { ...base, play: !base.play }
    todState.value = next
    todIsPlaying.value = !!next.play
    await applyEnvironmentPartial({ play: !!next.play })
  } catch {
    // ignore
  }
}

function scheduleTodApply(minutes) {
  if (todChangeTimer) clearTimeout(todChangeTimer)
  if (TOD_APPLY_DEBOUNCE_MS <= 0) {
    void applyTodMinutesToEngine(minutes)
    todChangeTimer = null
    return
  }
  todChangeTimer = setTimeout(async () => {
    try {
      await applyTodMinutesToEngine(minutes)
    } finally {
      todChangeTimer = null
    }
  }, TOD_APPLY_DEBOUNCE_MS)
}

function setTodMinutesRaw(minutes) {
  const m = clampTodMinutes(roundToStep(Number(minutes), 1))
  todMinutes.value = m
  // Update local state immediately (also resets seconds to 00 in UI).
  todState.value = { ...(todState.value || {}), time: minutesToTodTime(m) }
  scheduleTodApply(m)
}

function setTodMinutesSnapped(minutes) {
  const m = clampTodMinutes(roundToStep(Number(minutes), 5))
  todMinutes.value = m
  // Update local state immediately (also resets seconds to 00 in UI).
  todState.value = { ...(todState.value || {}), time: minutesToTodTime(m) }
  scheduleTodApply(m)
}

function onTodMinutesChanged(v) {
  // Slider/icon/manual step: keep 5-min snapping.
  setTodMinutesSnapped(v)
}

function stepTimeOfDay(minutesDelta) {
  setTodMinutesRaw(normalizeTodMinutes(todMinutes.value + minutesDelta))
}

const todTimeText = computed(() => formatTodHHMM(todMinutes.value))
const todUtcTimeText = computed(() => {
  const offset = civilOffsetHours(environmentState.value)
  if (!Number.isFinite(offset)) return ""
  return formatTodHHMM(todMinutes.value - offset * 60)
})
const todSecondsSuffix = computed(() => {
  const t = Number(todState.value?.time)
  if (!Number.isFinite(t)) return ":00"
  const seconds = ((t + 0.5) % 1) * 86400
  const ss = Math.floor(seconds % 60)
  return `:${String(ss).padStart(2, "0")}`
})

const todTimeDraft = ref("")
const todTimeDraftDirty = ref(false)

watch(
  todTimeText,
  v => {
    if (!todTimeDraftDirty.value) todTimeDraft.value = v
  },
  { immediate: true }
)

watch(
  () => props.timeOfDayState,
  data => {
    if (todTimeDraftDirty.value || isLerpSuppressed()) return
    syncTodState(data)
  },
  { immediate: true }
)

const resolvedTimeOfDayOptions = computed(() => {
  const propOptions = Array.isArray(props.timeOfDayOptions) ? props.timeOfDayOptions : []
  const options = propOptions.length > 0 ? propOptions : Array.isArray(fallbackTimeOfDayOptions.value) ? fallbackTimeOfDayOptions.value : []
  return buildSolarTimeOfDayOptions(environmentState.value, options)
})

const todPopoverItems = computed(() => {
  const presetItems = resolvedTimeOfDayOptions.value
    .filter(x => x && x.value !== undefined && x.value !== null)
    .map((x, i) => {
      const label = x.label ? $translate.instant(x.label) : ""
      return {
        key: `preset-${i}-${x.value}`,
        type: "preset",
        value: x.value,
        label: `${formatTodHHMMFromTime(x.value)} - ${label}`,
      }
    })

  return [
    {
      key: "system-time",
      type: "system",
      label: `${formatCurrentSystemHHMM()} - ${$translate.instant("ui.environment.now")}`,
    },
    {
      key: "system-time-utc",
      type: "systemUtc",
      label: `${formatCurrentLevelLocalSystemHHMM()} - ${$translate.instant("ui.environment.nowUtc")}`,
    },
    ...presetItems,
  ]
})

function selectTodPopoverItem(item, hide) {
  hide?.()
  if (item?.type === "system") {
    syncTimeToRealClock()
    return
  }
  if (item?.type === "systemUtc") {
    syncTimeToRealClockUtc()
    return
  }
  applyTodTimeToEngine(item?.value)
}

function isValidTodTime(raw) {
  const s = String(raw ?? "").trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) || s === "24:00"
}

function parseTodTimeToMinutes(raw) {
  const s = String(raw ?? "").trim()
  if (s === "24:00") return 1440
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function onTodTimeFocus() {
  todTimeDraftDirty.value = false
}

function onTodTimeDraftChanged() {
  todTimeDraftDirty.value = true
}

function onTodTimeCommit() {
  const minutes = parseTodTimeToMinutes(todTimeDraft.value)
  todTimeDraftDirty.value = false
  if (minutes === null) {
    todTimeDraft.value = todTimeText.value
    return
  }

  // Input commit: set exact typed minute (no 5-min snapping).
  setTodMinutesRaw(minutes)
  todTimeDraft.value = todTimeText.value
}

const selectedYear = computed(() => normalizeInt(environmentState.value?.year, currentYearFallback, 1, 9999))
const selectedMonth = computed(() => normalizeInt(environmentState.value?.month, 1, 1, 12))
const selectedDay = computed(() => normalizeInt(environmentState.value?.day, 1, 1, daysInMonth(selectedYear.value, selectedMonth.value)))

const dateEpoch = computed({
  get: () => datePartsToEpoch(selectedYear.value, selectedMonth.value, selectedDay.value),
  set: epoch => {
    const date = new Date(clampNumber(Number(epoch), MIN_DATE_EPOCH, MAX_DATE_EPOCH) * 1000)
    const year = normalizeInt(date.getFullYear(), selectedYear.value, 1, 9999)
    const month = normalizeInt(date.getMonth() + 1, selectedMonth.value, 1, 12)
    const day = normalizeInt(date.getDate(), selectedDay.value, 1, daysInMonth(year, month))
    void applyEnvironmentPartial({ year, month, day })
  },
})

const REAL_SECONDS_PER_HALF_DAY = 43200
const MIN_PHASE_LENGTH_SECONDS = 5 * 60
const MAX_PHASE_LENGTH_SECONDS = REAL_SECONDS_PER_HALF_DAY
const MIN_DAY_NIGHT_BAR_SECONDS = 10 * 60
const DEFAULT_COMBINED_DAY_NIGHT_SECONDS = 22.5 * 60
const MAX_COMBINED_DAY_NIGHT_SECONDS = 2 * 60 * 60
const MIN_DAY_NIGHT_BAR_WIDTH_PERCENT = 60
const DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT = 80
const MAX_DAY_NIGHT_BAR_WIDTH_PERCENT = 100

function formatDayNightLength(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s < 0) return ""
  if (s === 0) return "0s"
  const totalSeconds = Math.round(s)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secondsLeft = totalSeconds % 60
  if (hours > 0) return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
  if (minutes > 0) return secondsLeft > 0 ? `${minutes}m${String(secondsLeft).padStart(2, "0")}s` : `${minutes}m`
  return `${secondsLeft}s`
}

function buildPhaseLengthOptions() {
  const seconds = []
  for (let value = 5 * 60; value <= 10 * 60; value += 60) seconds.push(value)
  for (let value = 11 * 60; value <= 20 * 60; value += 60) seconds.push(value)
  for (let value = 25 * 60; value <= 60 * 60; value += 5 * 60) seconds.push(value)
  for (let value = 2 * 60 * 60; value <= 12 * 60 * 60; value += 60 * 60) seconds.push(value)
  seconds.push(24 * 60 * 60)
  return seconds.map(value => ({ value, label: formatDayNightLength(value) }))
}

const phaseLengthOptions = buildPhaseLengthOptions()
const phaseLengthValues = phaseLengthOptions.map(option => option.value)

function closestPhaseLengthSeconds(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value)) return phaseLengthValues[0]
  return phaseLengthValues.reduce((closest, option) => (
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest
  ), phaseLengthValues[0])
}

// Single uniform day-night cycle length (seconds); day and night phases are each ~half.
const DEFAULT_DAY_LENGTH = 1800
const cycleLengthSeconds = computed(() => {
  const s = Number(environmentState.value?.dayLength)
  return clampNumber(Number.isFinite(s) && s > 0 ? s : DEFAULT_DAY_LENGTH, MIN_PHASE_LENGTH_SECONDS, MAX_PHASE_LENGTH_SECONDS)
})
const solarTodEvents = computed(() => getSolarTimeOfDayEvents(environmentState.value))
const dayLengthFraction = computed(() => {
  const events = solarTodEvents.value
  if (events?.polar === "day") return 1
  if (events?.polar === "night") return 0
  if (events?.sunrise !== null && events?.sunrise !== undefined && events?.sunset !== null && events?.sunset !== undefined) {
    return clampNumber(minutesBetween(events.sunrise, events.sunset) / TOD_MINUTES_PER_DAY, 0, 1)
  }
  return 0.5
})
const dayLengthSeconds = computed(() => cycleLengthSeconds.value * dayLengthFraction.value)
const nightLengthSeconds = computed(() => cycleLengthSeconds.value - dayLengthSeconds.value)
const dayLengthSelect = computed({
  get: () => closestPhaseLengthSeconds(cycleLengthSeconds.value),
  set: seconds => void applyEnvironmentPartial({ dayLength: clampNumber(Number(seconds), MIN_PHASE_LENGTH_SECONDS, MAX_PHASE_LENGTH_SECONDS) }),
})
const combinedDayNightSeconds = computed(() => cycleLengthSeconds.value)
const dayLengthText = computed(() => formatDayNightLength(dayLengthSeconds.value))
const nightLengthText = computed(() => formatDayNightLength(nightLengthSeconds.value))
const showDayLengthSettings = computed(() => !props.disableDayLengthControls && todIsPlaying.value)

const dayNightBarWidthPercent = computed(() => {
  const totalSeconds = combinedDayNightSeconds.value
  if (totalSeconds <= DEFAULT_COMBINED_DAY_NIGHT_SECONDS) {
    const ratio = (totalSeconds - MIN_DAY_NIGHT_BAR_SECONDS) / (DEFAULT_COMBINED_DAY_NIGHT_SECONDS - MIN_DAY_NIGHT_BAR_SECONDS)
    return clampNumber(
      MIN_DAY_NIGHT_BAR_WIDTH_PERCENT + ratio * (DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT - MIN_DAY_NIGHT_BAR_WIDTH_PERCENT),
      MIN_DAY_NIGHT_BAR_WIDTH_PERCENT,
      DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT
    )
  }
  const growthRatio = (totalSeconds - DEFAULT_COMBINED_DAY_NIGHT_SECONDS) / (MAX_COMBINED_DAY_NIGHT_SECONDS - DEFAULT_COMBINED_DAY_NIGHT_SECONDS)
  return clampNumber(
    DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT + growthRatio * (MAX_DAY_NIGHT_BAR_WIDTH_PERCENT - DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT),
    DEFAULT_DAY_NIGHT_BAR_WIDTH_PERCENT,
    MAX_DAY_NIGHT_BAR_WIDTH_PERCENT
  )
})

const findNextEclipse = () => runRaw("core_celestial.findNextSolarEclipse()").then(applyEnvironmentPartial)

const todMarkers = computed(() =>
  buildSolarTodMarkers(environmentState.value, icons)
    .map(marker => ({
      ...marker,
      value: clampTodMinutes(roundToStep(marker.value, 5)),
    }))
)
</script>

<style scoped lang="scss">
.tod-control {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  width: 100%;

  .tod-slider {
    --bng-slider-margin: 0.35em;
    width: 100%;
  }

  .tod-time-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5em;
    width: 100%;
    min-width: 0;

    .tod-time-input {
      box-sizing: border-box;
      width: 100%;
      flex: 1 1 0;
      min-width: 0;
      :deep(input) {
        font-family: var(--fnt-mono);
      }
      :deep(.suffix) {
        font-family: var(--fnt-mono);
      }
    }

    .tod-utc-time {
      flex: 0 1 auto;
      font-family: var(--fnt-mono);
      font-size: 0.9em;
      opacity: 0.85;
      white-space: nowrap;
    }
  }

  &.compact {
    .tod-time-row {
      justify-content: flex-start;
      gap: 0.35em;

      .tod-time-input {
        flex: 0 1 auto;
        min-width: 0;
      }

      .tod-utc-time {
        font-size: 0.85em;
      }
    }
  }

  .tod-step-buttons {
    display: flex;
    flex-direction: row;
    gap: 0.35em;
    width: 100%;
    padding-top: 0.25em;
  }

  .tod-step-button {
    --bng-button-margin: 0;
    --bng-button-min-width: 0;

    flex: 0.5 0 0;
  }

  .tod-day-length-section {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
  }

  .tod-day-night-visualization {
    display: flex;
    width: 100%;
    padding: 0.25em 0.5em;
  }

  .tod-day-night-length-controls {
    display: flex;
    flex-direction: row;
    gap: 0.75em;

    > * {
      flex: 1 1 auto;
    }
  }

  .tod-day-length-row {
    --bng-row-breakpoint: 50%;
  }

  .tod-date-controls {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    width: 100%;
  }

  .tod-day-night-duration-label {
    display: flex;
    align-items: center;
    gap: 0.25em;
    flex: 0 0 auto;
    font-family: var(--fnt-mono);
    font-size: 0.9em;
    opacity: 0.9;

    :deep(.bng-icon) {
      font-size: 1.35em;
    }

    &.day :deep(.bng-icon) {
      color: #ffc94a;
    }

    &.night :deep(.bng-icon) {
      color: #5f72d6;
    }
  }

  .tod-day-night-bar-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    width: 100%;
  }

  .tod-day-night-bar-slot {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex: 1 1 auto;
    min-width: 0;
  }

  .tod-day-night-side-line {
    flex: 1 1 0;
    height: 1px;
    background: rgba(var(--bng-off-white-rgb), 0.35);
  }

  .tod-day-night-bar {
    display: flex;
    flex: 0 0 auto;
    height: 0.65em;
    min-width: 0.5em;
    overflow: hidden;
    border-radius: 1000px;
    background: var(--bng-cool-gray-800);
    border: 0.0625em solid var(--bng-cool-gray-700);
  }

  .tod-day-night-bar-segment {
    min-width: 0.25em;

    &.day {
      background: linear-gradient(90deg, #ffc94a, #ff9f2e);
    }

    &.night {
      background: linear-gradient(90deg, #273469, #16213f);
    }
  }
}

.tod-popover-menu {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 12rem;
  overflow: visible;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
}

.tod-popover-option {
  --bng-button-margin: 0;
  --bng-button-min-width: 100%;
  --bng-button-max-width: 18rem;
  --bng-content-justify: flex-start;
  --bng-content-align: center;
  text-align: left;
  white-space: nowrap;
}
</style>

