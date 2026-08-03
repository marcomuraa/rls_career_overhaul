<template>
  <BngGroupPanel
    v-if="hasVisibleControls"
    class="environment-weather-section environment-weather-section__group"
    :class="{ 'environment-weather-section--compact': props.compact }"
    :title="props.title || $t('ui.environment.weather')"
    title-id="environment-weather-weather-title"
  >
    <div
      v-if="temperatureVisible"
      class="environment-weather-section__row environment-weather-section__row--temperature"
    >
      <div class="environment-weather-section__label">{{ $t("ui.environment.environmentalTemperature") }}</div>
      <div class="environment-weather-section__value">{{ temperatureText }}</div>
    </div>

    <BngRow v-if="windSpeedVisible" class="environment-weather-section__input">
      <template #label>{{ $t("ui.environment.windSpeed") }}</template>
      <BngSlider
        v-model="windSpeed"
        :min="0"
        :max="10"
        :step="0.1"
        :debounce="0"
        with-input
        with-reset
        :orig-value="origWeather.windSpeed ?? orig.windSpeed"
        :disabled="!props.canChange || windSpeed === undefined"
      />
    </BngRow>

    <BngRow v-if="cloudWindDirectionVisible" class="environment-weather-section__input">
      <template #label>
        {{ $t("ui.environment.cloudWindDirection") }}:
        <span class="environment-weather-section__hint">{{ cloudWindDirectionText }}</span>
      </template>
      <BngSlider
        v-model="cloudWindDirection"
        :min="0"
        :max="355"
        :step="5"
        :debounce="0"
        with-input
        with-reset
        :orig-value="origCloudWindDirection"
        :disabled="!props.canChange || cloudWindDirection === undefined"
      />
    </BngRow>

    <BngRow v-if="cloudCoverVisible" class="environment-weather-section__input">
      <template #label>{{ $t("ui.environment.cloudCover") }}</template>
      <BngSlider
        :model-value="cloudCover"
        :min="0"
        :max="3"
        :step="0.01"
        :debounce="0"
        with-input
        with-reset
        :orig-value="origWeather.cloudCover ?? orig.cloudCover"
        :disabled="!props.canChange || cloudCover === undefined"
        @valueChanged="onCloudCoverChanged"
      />
    </BngRow>

    <div v-if="cloudCoverVisible" class="environment-weather-section__actions">
      <Button
        class="environment-weather-section__action-button"
        :disabled="!props.canChange"
        @click="regenerateClouds"
      >
        <div class="environment-weather-section__action-button-content">
          <span class="environment-weather-section__action-button-label">{{ $t("ui.environment.regenerateClouds") }}</span>
        </div>
      </Button>
    </div>

    <BngRow v-if="fogDensityVisible" class="environment-weather-section__input">
      <template #label>{{ $t("ui.environment.fogDensity") }}</template>
      <BngSlider
        :model-value="fogDensity"
        :min="0"
        :max="50"
        :step="0.005"
        :debounce="0"
        :position="fogDensityMapping"
        with-input
        with-reset
        :orig-value="origWeather.fogDensity ?? origFogDensity"
        :disabled="!props.canChange || fogDensity === undefined"
        @valueChanged="onFogDensityChanged"
      />
    </BngRow>

    <BngRow v-if="fogAtmosphereHeightVisible" class="environment-weather-section__input">
      <template #label>{{ $t("ui.environment.fogAtmosphereHeight") }}</template>
      <BngSlider
        :model-value="fogAtmosphereHeight"
        :min="1"
        :max="1000"
        :step="0.5"
        :debounce="0"
        with-input
        with-reset
        :orig-value="origWeather.fogAtmosphereHeight ?? origFogAtmosphereHeight"
        :disabled="!props.canChange || fogAtmosphereHeight === undefined"
        @valueChanged="onFogAtmosphereHeightChanged"
      />
    </BngRow>

    <BngRow v-if="groundWindVisible" class="environment-weather-section__input">
      <template #label>
        {{ $t("ui.environment.groundWindSpeed") }}:
        <span class="environment-weather-section__hint">{{ groundWindSpeedText }}</span>
      </template>
      <BngSlider
        v-model="groundWindSpeed"
        :min="0"
        :max="210"
        :step="0.1"
        :debounce="0"
        :position="groundWindSpeedMapping"
        with-input
        with-reset
        :orig-value="origGroundWindSpeed"
        :disabled="!props.canChange || groundWindSpeed === undefined"
      />
    </BngRow>

    <BngRow v-if="groundWindVisible" class="environment-weather-section__input">
      <template #label>
        {{ $t("ui.environment.groundWindDirection") }}:
        <span class="environment-weather-section__hint">{{ groundWindDirectionText }}</span>
      </template>
      <BngSlider
        v-model="groundWindDirection"
        :min="0"
        :max="355"
        :step="5"
        :debounce="0"
        with-input
        with-reset
        :orig-value="origGroundWindDirection"
        :disabled="!props.canChange || groundWindDirection === undefined"
      />
    </BngRow>
  </BngGroupPanel>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { BngGroupPanel, BngRow, BngSlider } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { lua } from "@/bridge"
import { clampNumber } from "@/utils/maths"

defineOptions({ name: "EnvironmentWeatherSettingsSection" })

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  compact: {
    type: Boolean,
    default: false,
  },
  canChange: {
    type: Boolean,
    default: true,
  },
  environmentState: {
    type: Object,
    default: () => ({}),
  },
  levelDefaults: {
    type: Object,
    default: null,
  },
  applyPartial: {
    type: Function,
    required: true,
  },
  availability: {
    type: Object,
    default: () => ({}),
  },
  hiddenControls: {
    type: Object,
    default: () => ({}),
  },
})

const ENVIRONMENT_LERP_SECONDS = 1.15

function isAvailable(key, fallback) {
  if (typeof props.availability?.[key] === "boolean") return props.availability[key]
  return fallback
}

function isVisible(key, fallback) {
  return props.hiddenControls?.[key] !== true && isAvailable(key, fallback)
}

const temperatureVisible = computed(() => isVisible("temperature", props.environmentState?.temperatureC !== undefined))
const windSpeedVisible = computed(() => isVisible("windSpeed", props.environmentState?.windSpeed !== undefined))
const cloudCoverVisible = computed(() => isVisible("cloudCover", props.environmentState?.cloudCover !== undefined))
const cloudWindDirectionVisible = computed(() => isVisible("cloudWindDirection", props.environmentState?.cloudWindDirection !== undefined))
const fogDensityVisible = computed(() => isVisible("fogDensity", props.environmentState?.fogDensity !== undefined))
const fogAtmosphereHeightVisible = computed(() => isVisible("fogAtmosphereHeight", props.environmentState?.fogAtmosphereHeight !== undefined))
const groundWindVisible = computed(() => isVisible("groundWind", props.environmentState?.groundWind !== undefined))
const hasVisibleControls = computed(() =>
  temperatureVisible.value
  || windSpeedVisible.value
  || cloudCoverVisible.value
  || cloudWindDirectionVisible.value
  || fogDensityVisible.value
  || fogAtmosphereHeightVisible.value
  || groundWindVisible.value
)

const orig = ref({})
watch(
  () => props.environmentState,
  v => {
    if (!orig.value || Object.keys(orig.value).length === 0) orig.value = { ...(v || {}) }
  },
  { immediate: true }
)

const fogDensity = computed({
  get: () => props.environmentState?.fogDensity === undefined ? undefined : clampNumber(props.environmentState.fogDensity, 0, 50),
  set: v => onFogDensityChanged(v),
})

function onFogDensityChanged(value) {
  props.applyPartial({ fogDensity: clampNumber(value, 0, 50) }, ENVIRONMENT_LERP_SECONDS)
}

const origFogDensity = computed(() => clampNumber(orig.value?.fogDensity, 0, 50))

const fogAtmosphereHeight = computed({
  get: () => props.environmentState?.fogAtmosphereHeight,
  set: v => onFogAtmosphereHeightChanged(v),
})

function onFogAtmosphereHeightChanged(value) {
  props.applyPartial({ fogAtmosphereHeight: clampNumber(value, 1, 1000) }, ENVIRONMENT_LERP_SECONDS)
}

const origFogAtmosphereHeight = computed(() => clampNumber(orig.value?.fogAtmosphereHeight, 1, 1000))

const fogDensityMapping = {
  to(modelVal, ctx) {
    const v = Number(modelVal)
    if (!Number.isFinite(v)) return 0
    const fog = ctx.clamp(v, ctx.min, ctx.max)
    if (fog <= 10) return ctx.clamp(fog / 10 / 2, 0, 1)
    return ctx.clamp(0.5 + ((fog - 10) / (ctx.max - 10)) * 0.5, 0, 1)
  },
  from(positionVal, ctx) {
    const s = Number(positionVal)
    if (!Number.isFinite(s)) return ctx.min
    const t = ctx.clamp(s, 0, 1)
    let raw
    if (t <= 0.5) raw = t * 20
    else raw = 10 + ((t - 0.5) / 0.5) * (ctx.max - 10)
    return ctx.clamp(ctx.helpers.roundToStep(raw, ctx.step), ctx.min, ctx.max)
  },
}

const groundWindSpeedMapping = {
  to(modelVal, ctx) {
    const v = Number(modelVal)
    if (!Number.isFinite(v)) return 0

    const lowRange = 16
    const highRange = 210
    const lowRangeSlider = 0.7
    const speed = ctx.clamp(v, 0, highRange)

    if (speed <= lowRange) {
      return ctx.clamp((speed / lowRange) * lowRangeSlider, 0, 1)
    }

    return ctx.clamp(
      lowRangeSlider + ((speed - lowRange) / (highRange - lowRange)) * (1 - lowRangeSlider),
      0,
      1
    )
  },

  from(positionVal, ctx) {
    const s = Number(positionVal)
    if (!Number.isFinite(s)) return ctx.min

    const lowRange = 16
    const highRange = 210
    const lowRangeSlider = 0.7
    const t = ctx.clamp(s, 0, 1)

    let raw
    if (t <= lowRangeSlider) {
      raw = (t / lowRangeSlider) * lowRange
    } else {
      raw = lowRange + ((t - lowRangeSlider) / (1 - lowRangeSlider)) * (highRange - lowRange)
    }

    return ctx.clamp(ctx.helpers.roundToStep(raw, ctx.step), ctx.min, ctx.max)
  },
}

const origWeather = computed(() => {
  const d = props.levelDefaults || {}
  return {
    windSpeed: d.windSpeed,
    cloudCover: d.cloudCover === undefined ? undefined : clampNumber(d.cloudCover, 0, 3),
    fogDensity: d.fogDensity === undefined ? undefined : clampNumber(d.fogDensity, 0, 50),
    fogAtmosphereHeight: d.fogAtmosphereHeight,
  }
})

function normalizeGroundWindDirection(direction) {
  let d = Number(direction) || 0
  d %= 360
  if (d < 0) d += 360
  return d
}

function getGroundWindSpeedFromVector(w) {
  if (!w || typeof w !== "object") return undefined

  const x = Number(w.x)
  const y = Number(w.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined

  return Math.sqrt(x * x + y * y)
}

function getGroundWindDirectionFromVector(w) {
  if (!w || typeof w !== "object") return undefined

  const x = Number(w.x)
  const y = Number(w.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined

  const lenxy = Math.sqrt(x * x + y * y)
  if (lenxy <= 0) return undefined

  return normalizeGroundWindDirection(Math.atan2(x, y) * 180 / Math.PI)
}

const groundWindDirectionUi = ref(0)

watch(
  () => props.environmentState?.groundWind,
  w => {
    const dir = getGroundWindDirectionFromVector(w)
    if (dir !== undefined) groundWindDirectionUi.value = dir
  },
  { immediate: true }
)

function submitGroundWind(speed, direction) {
  const lenxy = clampNumber(speed, 0, 210)
  const dir = normalizeGroundWindDirection(direction) * Math.PI / 180

  props.applyPartial({
    groundWind: {
      x: lenxy * Math.sin(dir),
      y: lenxy * Math.cos(dir),
      z: 0,
    },
  })
}

const groundWindSpeed = computed({
  get: () => getGroundWindSpeedFromVector(props.environmentState?.groundWind),
  set: v => {
    const speed = clampNumber(v, 0, 210)
    submitGroundWind(speed, groundWindDirectionUi.value)
  },
})

const groundWindDirection = computed({
  get: () => {
    if (props.environmentState?.groundWind === undefined) return undefined
    return groundWindDirectionUi.value
  },
  set: v => {
    const dir = normalizeGroundWindDirection(v)
    groundWindDirectionUi.value = dir
    submitGroundWind(groundWindSpeed.value || 0, dir)
  },
})

const origGroundWindSpeed = computed(() => {
  const speed = getGroundWindSpeedFromVector(orig.value?.groundWind)
  return clampNumber(speed, 0, 210)
})

const origGroundWindDirection = computed(() => {
  const dir = getGroundWindDirectionFromVector(orig.value?.groundWind)
  return dir === undefined ? 0 : normalizeGroundWindDirection(dir)
})

const compassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

function getGroundWindCompass(direction) {
  const d = normalizeGroundWindDirection(direction)
  return compassPoints[Math.floor((d + 22.5) / 45) % compassPoints.length]
}

function formatSpeed(speed) {
  const s = Number(speed)
  if (!Number.isFinite(s)) return ""

  try {
    if (globalThis.UiUnits?.buildString) {
      return globalThis.UiUnits.buildString("speed", s, 0)
    }
  } catch {
    // fallback below
  }

  return `${s.toFixed(0)} m/s`
}

const groundWindSpeedText = computed(() => formatSpeed(groundWindSpeed.value))

const groundWindDirectionText = computed(() => {
  const d = Number(groundWindDirection.value)
  if (!Number.isFinite(d)) return ""
  return `${normalizeGroundWindDirection(d).toFixed(0)}° ${getGroundWindCompass(d)}`
})

const windSpeed = computed({
  get: () => props.environmentState?.windSpeed,
  set: v => props.applyPartial({ windSpeed: v }),
})

const cloudCover = computed({
  get: () => props.environmentState?.cloudCover === undefined ? undefined : clampNumber(props.environmentState.cloudCover, 0, 3),
  set: v => onCloudCoverChanged(v),
})

function onCloudCoverChanged(value) {
  props.applyPartial({ cloudCover: clampNumber(value, 0, 3) }, ENVIRONMENT_LERP_SECONDS)
}

async function regenerateClouds() {
  try {
    await lua.core_environment.regenerateWeatherMap()
  } catch {
    // ignore
  }
}

const cloudWindDirectionUi = ref(0)

watch(
  () => props.environmentState?.cloudWindDirection,
  w => {
    const dir = getGroundWindDirectionFromVector(w)
    if (dir !== undefined) cloudWindDirectionUi.value = dir
  },
  { immediate: true }
)

function submitCloudWindDirection(direction) {
  const rad = normalizeGroundWindDirection(direction) * Math.PI / 180
  props.applyPartial({
    cloudWindDirection: {
      x: Math.sin(rad),
      y: Math.cos(rad),
      z: 0,
    },
  })
}

const cloudWindDirection = computed({
  get: () => {
    if (props.environmentState?.cloudWindDirection === undefined) return undefined
    return cloudWindDirectionUi.value
  },
  set: v => {
    const dir = normalizeGroundWindDirection(v)
    cloudWindDirectionUi.value = dir
    submitCloudWindDirection(dir)
  },
})

const origCloudWindDirection = computed(() => {
  const dir = getGroundWindDirectionFromVector(orig.value?.cloudWindDirection)
  return dir === undefined ? 0 : normalizeGroundWindDirection(dir)
})

const cloudWindDirectionText = computed(() => {
  const d = Number(cloudWindDirection.value)
  if (!Number.isFinite(d)) return ""
  return `${normalizeGroundWindDirection(d).toFixed(0)}° ${getGroundWindCompass(d)}`
})

const temperatureText = computed(() => {
  const t = Number(props.environmentState?.temperatureC)
  if (!Number.isFinite(t)) return ""
  return `${t.toFixed(1)}°C`
})
</script>

<style scoped lang="scss">
@use "./shared";
</style>
