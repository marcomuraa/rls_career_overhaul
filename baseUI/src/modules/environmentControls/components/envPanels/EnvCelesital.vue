<template>
  <BngGroupPanel
    v-if="hasVisibleControls"
    class="environment-weather-section environment-weather-section__group"
    :class="{ 'environment-weather-section--compact': props.compact }"
    :title="props.title || $t('ui.environment.celestialSettings')"
    title-id="environment-weather-celestial-title"
  >
    <BngRow v-if="meteorsVisible" class="environment-weather-section__select">
      <template #label>{{ $t("ui.environment.meteors") }}</template>
      <BngSmartSelect
        class="environment-smart-select"
        v-model="meteorRatePreset"
        :items="meteorRatePresetItems"
        :disabled="!canChangeCelestial"
      />
    </BngRow>
    <BngRow
      v-if="northOverrideVisible"
      class="environment-weather-section__input"
      :tooltip="$t('ui.photomode.scene.northOverrideHint')"
    >
      <template #label>{{ $t("ui.photomode.northOverride") }}</template>
      <BngSlider
        v-model="northOverride"
        :min="NORTH_OVERRIDE_RANGE.min"
        :max="NORTH_OVERRIDE_RANGE.max"
        :step="NORTH_OVERRIDE_RANGE.step"
        :input-step="NORTH_OVERRIDE_RANGE.inputStep"
        :debounce="0"
        unit="°"
        with-input
        with-reset
        :orig-value="0"
        :disabled="!canChangeCelestial || northOverride === undefined"
      />
    </BngRow>
    <BngRow v-if="constellationLinesVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.constellationLines") }}</template>
      <BngSwitch v-model="constellationLinesEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
    <BngRow v-if="constellationLabelsVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.constellationLabels") }}</template>
      <BngSwitch v-model="constellationLabelsEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
    <BngRow v-if="horizonGridVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.horizon") }}</template>
      <BngSwitch v-model="horizonGridEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
    <BngRow v-if="equatorialGridVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.equatorial") }}</template>
      <BngSwitch v-model="equatorialGridEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
    <BngRow v-if="meridianGridVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.meridian") }}</template>
      <BngSwitch v-model="meridianGridEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
    <BngRow v-if="moonGridVisible" class="environment-weather-section__toggle">
      <template #label>{{ $t("ui.environment.moonLines") }}</template>
      <BngSwitch v-model="moonGridEnabled" :disabled="!canChangeCelestial" />
    </BngRow>
  </BngGroupPanel>
</template>

<script setup>
import { computed, onMounted, ref } from "vue"
import { BngGroupPanel, BngRow, BngSmartSelect, BngSlider, BngSwitch } from "@/common/components/base"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import { clampNumber } from "@/utils/maths"

defineOptions({ name: "EnvironmentCelestialSettingsSection" })

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
  availability: {
    type: Object,
    default: () => ({}),
  },
  hiddenControls: {
    type: Object,
    default: () => ({}),
  },
  northOverrideValue: {
    type: Number,
    default: null,
  },
  applyNorthOverride: {
    type: Function,
    default: null,
  },
})

const NORTH_OVERRIDE_RANGE = Object.freeze({
  min: -180,
  max: 180,
  step: 1,
  inputStep: 0.25,
})
const METEOR_RATE_PRESET_KEYS = ["default", "low", "moderate", "high"]

const meteorRatePresetItems = computed(() => METEOR_RATE_PRESET_KEYS.map(key => ({
  value: key,
  label: $translate.instant(`ui.environment.meteors.${key}`),
})))
const celestialState = ref({})
const celestialStateLoaded = ref(false)
const canChangeCelestial = computed(() => props.canChange && celestialStateLoaded.value && celestialState.value?.display?.hasSky !== false)
const celestialAvailable = computed(() => {
  if (typeof props.availability?.celestial === "boolean") return props.availability.celestial
  return celestialState.value?.display?.hasSky !== false
})

function isAvailable(key, fallback) {
  if (typeof props.availability?.[key] === "boolean") return props.availability[key]
  return fallback
}

function isVisible(key, fallback) {
  return props.hiddenControls?.[key] !== true && isAvailable(key, fallback)
}

const meteorsVisible = computed(() => isVisible("meteors", celestialAvailable.value))
const northOverrideVisible = computed(() => isVisible(
  "northOverride",
  celestialAvailable.value && (props.northOverrideValue !== null || celestialState.value?.northOffsetDeg !== undefined)
))
const constellationLinesVisible = computed(() => isVisible("constellationLines", celestialAvailable.value))
const constellationLabelsVisible = computed(() => isVisible("constellationLabels", celestialAvailable.value))
const horizonGridVisible = computed(() => isVisible("horizonGrid", celestialAvailable.value))
const equatorialGridVisible = computed(() => isVisible("equatorialGrid", celestialAvailable.value))
const meridianGridVisible = computed(() => isVisible("meridianGrid", celestialAvailable.value))
const moonGridVisible = computed(() => isVisible("moonGrid", celestialAvailable.value))
const hasVisibleControls = computed(() =>
  meteorsVisible.value
  || northOverrideVisible.value
  || constellationLinesVisible.value
  || constellationLabelsVisible.value
  || horizonGridVisible.value
  || equatorialGridVisible.value
  || meridianGridVisible.value
  || moonGridVisible.value
)

async function refreshCelestialState() {
  try {
    await lua.extensions.load("core_celestial")
    celestialState.value = (await lua.core_celestial.getState()) || {}
    celestialStateLoaded.value = true
  } catch {
    celestialStateLoaded.value = false
  }
}

function patchCelestialDisplay(key, value) {
  celestialState.value = {
    ...(celestialState.value || {}),
    display: {
      ...(celestialState.value?.display || {}),
      [key]: !!value,
    },
  }
}

function setCelestialDisplayOption(key, value) {
  patchCelestialDisplay(key, value)
  lua.core_celestial.setDisplayOption(key, !!value)
    .then(refreshCelestialState)
    .catch(refreshCelestialState)
}

function celestialDisplaySwitch(key) {
  return computed({
    get: () => celestialState.value?.display?.[key] === true,
    set: value => setCelestialDisplayOption(key, value),
  })
}

const constellationLinesEnabled = celestialDisplaySwitch("constellationLines")
const constellationLabelsEnabled = celestialDisplaySwitch("constellationLabels")
const horizonGridEnabled = celestialDisplaySwitch("horizonGrid")
const equatorialGridEnabled = celestialDisplaySwitch("equatorialGrid")
const meridianGridEnabled = celestialDisplaySwitch("meridianGrid")
const moonGridEnabled = celestialDisplaySwitch("moonGrid")

const northOverride = computed({
  get: () => {
    const value = Number(props.northOverrideValue !== null ? props.northOverrideValue : celestialState.value?.northOffsetDeg)
    if (!Number.isFinite(value)) return undefined
    return clampNumber(value, NORTH_OVERRIDE_RANGE.min, NORTH_OVERRIDE_RANGE.max)
  },
  set: value => setNorthOverride(value),
})

function setNorthOverride(value) {
  const nextValue = clampNumber(value, NORTH_OVERRIDE_RANGE.min, NORTH_OVERRIDE_RANGE.max)
  celestialState.value = {
    ...(celestialState.value || {}),
    northOffsetDeg: nextValue,
  }
  if (props.applyNorthOverride) {
    props.applyNorthOverride(nextValue)
    return
  }
  lua.core_celestial.setNorthOffset(nextValue)
    .then(refreshCelestialState)
    .catch(refreshCelestialState)
}

const meteorRatePreset = computed({
  get: () => {
    const key = celestialState.value?.meteor?.ratePreset
    return METEOR_RATE_PRESET_KEYS.includes(key) ? key : "default"
  },
  set: key => {
    if (!METEOR_RATE_PRESET_KEYS.includes(key)) return
    celestialState.value = {
      ...(celestialState.value || {}),
      meteor: {
        ...(celestialState.value?.meteor || {}),
        ratePreset: key,
      },
    }
    lua.core_celestial.setMeteorRatePreset(key)
      .then(refreshCelestialState)
      .catch(refreshCelestialState)
  },
})

onMounted(refreshCelestialState)
</script>

<style scoped lang="scss">
@use "./shared";
</style>
