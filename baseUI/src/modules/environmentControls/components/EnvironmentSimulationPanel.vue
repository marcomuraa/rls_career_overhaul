<template>
  <div class="environment-simulation-panel" :class="{ disabled: !canChange, compact: props.compact }">
    <BngGroupPanel
      :title="$t('ui.environment.gravity')"
      title-id="environment-simulation-gravity-title"
    >
      <BngRow class="environment-simulation-panel_select">
        <template #label>{{ $t("ui.environment.gravity") }}</template>
        <BngSmartSelect
          v-model="gravityPresetKey"
          :items="gravityPresetItems"
          :threshold="20"
          :disabled="!canChange"
        />
      </BngRow>

      <BngRow class="environment-simulation-panel_input">
        <template #label>{{ $t("ui.environment.gravity") }}</template>
        <BngSlider
          v-model="gravity"
          :min="-280"
          :max="10"
          :step="0.01"
          :debounce="0"
          with-input
          with-reset
          :orig-value="orig.gravity"
          :disabled="!canChange || gravity === undefined"
        />
      </BngRow>
    </BngGroupPanel>

    <BngGroupPanel
      :title="$t('ui.environment.simulationSpeed')"
      title-id="environment-simulation-speed-title"
    >
      <BngRow class="environment-simulation-panel_select">
        <template #label>{{ $t("ui.environment.simulationSpeed") }}</template>
        <BngSmartSelect
          v-model="simSpeedPresetKey"
          :items="simSpeedPresetItems"
          :threshold="20"
          :disabled="!canChange"
        />
      </BngRow>

      <BngRow v-if="simSpeedPresetKey === CUSTOM_KEY" class="environment-simulation-panel_input">
        <template #label>
          {{ $t("ui.environment.simulationSpeed") }}:
          <span class="hint">{{ simSpeedHint }}</span>
        </template>
        <BngSlider
          v-model="simSpeedDivider"
          :min="1"
          :max="1000"
          :step="1"
          :debounce="0"
          :position="simSpeedMapping"
          with-input
          with-reset
          :orig-value="1"
          :disabled="!canChange"
        />
      </BngRow>
    </BngGroupPanel>

    <BngGroupPanel
      :title="$t('ui.environment.tireMarks')"
      title-id="environment-simulation-tiremarks-title"
    >
      <div class="simulation-tiremarks-actions">
        <Button class="simulation-tiremarks-btn" :disabled="!canChange" @click="saveTireMarks">
          <div class="simulation-tiremarks-btn-content">
            <BngIcon class="simulation-tiremarks-btn-icon" :type="icons.saveMesh" />
            <span class="simulation-tiremarks-btn-label">{{ $t("ui.environment.tireMarks.save") }}</span>
          </div>
        </Button>
        <Button class="simulation-tiremarks-btn" :disabled="!canChange" @click="loadTireMarks">
          <div class="simulation-tiremarks-btn-content">
            <BngIcon class="simulation-tiremarks-btn-icon" :type="icons.loadMesh" />
            <span class="simulation-tiremarks-btn-label">{{ $t("ui.environment.tireMarks.load") }}</span>
          </div>
        </Button>
        <Button class="simulation-tiremarks-btn simulation-tiremarks-btn--danger" :disabled="!canChange" @click="resetTireMarks">
          <div class="simulation-tiremarks-btn-content">
            <BngIcon class="simulation-tiremarks-btn-icon" :type="icons.broom" />
            <span class="simulation-tiremarks-btn-label">{{ $t("ui.environment.tireMarks.reset") }}</span>
          </div>
        </Button>
      </div>
    </BngGroupPanel>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { BngGroupPanel, BngIcon, BngRow, BngSmartSelect, BngSlider, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { lua } from "@/bridge"
import { useEnvironmentState } from "../composables/useEnvironmentState"
import { $translate } from "@/services"
import { clampNumber } from "@/utils/maths"

defineOptions({ name: "EnvironmentSimulationPanel" })

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  /** Pause route payload from lua/ge/.../routeData/environment.lua (optional). */
  routeEnvironmentData: {
    type: Object,
    default: null,
  },
})

const { state, canChange, simSpeedFactor, applyPartial, applySimSpeedFactorDebounced } = useEnvironmentState({
  initialTimeOfDayOptions: props.routeEnvironmentData?.timeOfDayOptions,
  initialLevelDefaults: props.routeEnvironmentData?.levelDefaults,
})

/** Filled from Lua when not supplied by pause route (standalone EnvironmentControls). */
const luaGravityPresets = ref(null)
const luaSimSpeedPresets = ref(null)

onMounted(async () => {
  try {
    if (!props.routeEnvironmentData?.gravityPresets?.length) {
      luaGravityPresets.value = (await lua.core_environment.getGravityPresets()) || null
    }
    if (!props.routeEnvironmentData?.simSpeedPresets?.length) {
      luaSimSpeedPresets.value = (await lua.core_environment.getSimSpeedPresets()) || null
    }
  } catch {
    // ignore
  }
})

const gravityPresetsList = computed(() => {
  const r = props.routeEnvironmentData?.gravityPresets
  if (Array.isArray(r) && r.length) return r
  const f = luaGravityPresets.value
  return Array.isArray(f) && f.length ? f : []
})

const simSpeedPresetsList = computed(() => {
  const r = props.routeEnvironmentData?.simSpeedPresets
  if (Array.isArray(r) && r.length) return r
  const f = luaSimSpeedPresets.value
  return Array.isArray(f) && f.length ? f : []
})

const CUSTOM_KEY = "__custom__"

const orig = ref({})
watch(
  () => state.value,
  v => {
    if (!orig.value || Object.keys(orig.value).length === 0) orig.value = { ...(v || {}) }
  },
  { immediate: true }
)

const gravity = computed({
  get: () => state.value?.gravity,
  set: v => applyPartial({ gravity: Number(v) }),
})

const gravityPresetItems = computed(() => {
  const current = Number(gravity.value)
  const customLabel = Number.isFinite(current) ? `Custom [${current.toFixed(2)}]` : "Custom"
  const presets = gravityPresetsList.value.map(x => ({ label: $translate.instant(x.title), value: x.key }))
  return [{ label: customLabel, value: CUSTOM_KEY }, ...presets]
})

function getGravityPresetKeyFromValue(val) {
  const current = Number(val)
  if (!Number.isFinite(current)) return CUSTOM_KEY
  const match = gravityPresetsList.value.find(p => Math.abs(p.value - current) < 1e-6)
  return match ? match.key : CUSTOM_KEY
}

// IMPORTANT: this is a *UI mode* (preset vs custom), not derived data.
// If the user selects Custom, we keep it selected even if the value matches a preset.
const gravityPresetKey = ref(getGravityPresetKeyFromValue(gravity.value))

watch(
  () => gravity.value,
  v => {
    if (gravityPresetKey.value === CUSTOM_KEY) return
    gravityPresetKey.value = getGravityPresetKeyFromValue(v)
  }
)

watch(
  () => gravityPresetKey.value,
  key => {
    if (!key || key === CUSTOM_KEY) return
    const preset = gravityPresetsList.value.find(p => p.key === key)
    if (!preset) return
    gravity.value = preset.value
  }
)

const simSpeedDivider = computed({
  get: () => clampNumber(Math.round(simSpeedFactor.value), 1, 1000),
  set: v => {
    const n = clampNumber(Math.round(v), 1, 1000)
    applySimSpeedFactorDebounced(n >= 1000 ? 1000 : n)
  },
})

const simSpeedHint = computed(() => `1/${clampNumber(simSpeedDivider.value, 1, 1000)}x`)

// logarithmic mapping for the sim-speed divider so the lower end (1..10x slow) gets most of the track
const simSpeedMapping = {
  to(modelVal, ctx) {
    const v = Number(modelVal)
    if (!Number.isFinite(v)) return 0
    const { min, max } = ctx
    if (!(min > 0) || !(max > min)) return ctx.clamp((v - min) / (max - min), 0, 1)
    return ctx.clamp((Math.log10(ctx.clamp(v, min, max)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)), 0, 1)
  },
  from(positionVal, ctx) {
    const s = Number(positionVal)
    if (!Number.isFinite(s)) return ctx.min
    const { min, max, step, helpers } = ctx
    if (!(min > 0) || !(max > min)) return ctx.clamp(min + ctx.clamp(s, 0, 1) * (max - min), min, max)
    const t = ctx.clamp(s, 0, 1)
    const raw = min * Math.pow(10, t * (Math.log10(max) - Math.log10(min)))
    return ctx.clamp(helpers.roundToStep(raw, step), min, max)
  },
}

const simSpeedPresetItems = computed(() => {
  const current = Number(simSpeedDivider.value)
  const customLabel = Number.isFinite(current) ? `Custom [${current}]` : "Custom"
  const presets = simSpeedPresetsList.value.map(x => ({
    label: x.label.startsWith("ui.") ? $translate.instant(x.label) : x.label,
    value: x.key,
  }))
  return [{ label: customLabel, value: CUSTOM_KEY }, ...presets]
})

function getSimSpeedPresetKeyFromDivider(divider) {
  const current = Number(divider)
  if (!Number.isFinite(current)) return CUSTOM_KEY
  const match = simSpeedPresetsList.value.find(p => p.value === current)
  return match ? match.key : CUSTOM_KEY
}

const simSpeedPresetKey = ref(getSimSpeedPresetKeyFromDivider(simSpeedDivider.value))

watch(
  () => simSpeedDivider.value,
  v => {
    if (simSpeedPresetKey.value === CUSTOM_KEY) return
    simSpeedPresetKey.value = getSimSpeedPresetKeyFromDivider(v)
  }
)

watch(
  () => simSpeedPresetKey.value,
  key => {
    if (!key || key === CUSTOM_KEY) return
    const preset = simSpeedPresetsList.value.find(p => p.key === key)
    if (!preset) return
    simSpeedDivider.value = preset.value
  }
)

// Standalone: preset lists load async; sync select keys once when Lua data arrives.
watch(luaGravityPresets, (v, oldV) => {
  if (!v || !v.length) return
  if (oldV != null) return
  const gk = getGravityPresetKeyFromValue(gravity.value)
  if (gk !== CUSTOM_KEY) gravityPresetKey.value = gk
})

watch(luaSimSpeedPresets, (v, oldV) => {
  if (!v || !v.length) return
  if (oldV != null) return
  const sk = getSimSpeedPresetKeyFromDivider(simSpeedDivider.value)
  if (sk !== CUSTOM_KEY) simSpeedPresetKey.value = sk
})

async function resetTireMarks() {
  try {
    await lua.core_environment.resetTireMarks()
  } catch {
    // ignore
  }
}

async function saveTireMarks() {
  try {
    await lua.core_environment.saveTireMarks()
  } catch {
    // ignore
  }
}

async function loadTireMarks() {
  try {
    await lua.core_environment.loadTireMarks()
  } catch {
    // ignore
  }
}
</script>

<style scoped lang="scss">
.environment-simulation-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.75em;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.5em 0.75em;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--bng-off-white);

  &_input {
    --bng-row-breakpoint: 35%;
  }

  &_select {
    --bng-row-breakpoint: 50%;
  }

  :deep(.bng-slider-container) {
    align-items: center;
  }

  &.disabled {
    opacity: 0.65;
  }

  .bng-group-panel {
    flex: 0 0 auto;
  }

  --input-width: 7em;
  --bng-slider-margin: 0.25em;

  .hint {
    font-family: var(--fnt-mono);
    opacity: 0.85;
    font-size: 0.9em;
  }

  &.compact {
    --bng-button-max-width: auto;
  }

  .simulation-tiremarks-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    align-items: stretch;
  }

  .simulation-tiremarks-btn {
    --bng-content-flow: row;
    --bng-content-align: center;
    --bng-content-justify: flex-start;

    --bng-button-min-width: auto;
    --bng-button-max-width: 100%;
    --bng-button-padding: 0.5rem;
    --bng-button-padding-top: 0.5rem;
    --bng-button-padding-bottom: 0.5rem;

    --bng-bg-border-radius: var(--bng-corners-1);
    --bng-bg-border-width: 0.0625em;

    --bng-bg-enabled: var(--bng-cool-gray-750);
    --bng-bg-hover: var(--bng-cool-gray-700);
    --bng-bg-active: var(--bng-cool-gray-700);
    --bng-bg-disabled: var(--bng-cool-gray-700);
    --bng-bg-focus: var(--bng-cool-gray-700);

    --bng-bg-enabled-opacity: 0.60;
    --bng-bg-hover-opacity: 0.75;
    --bng-bg-active-opacity: 0.9;
    --bng-bg-disabled-opacity: 0.55;
    --bng-bg-focus-opacity: 0.85;

    --bng-bg-border-enabled: var(--bng-cool-gray-500);
    --bng-bg-border-hover: var(--bng-cool-gray-500);
    --bng-bg-border-active: var(--bng-cool-gray-500);
    --bng-bg-border-disabled: var(--bng-cool-gray-500);
    --bng-bg-border-focus: var(--bng-cool-gray-300);

    width: 100%;
    margin: 0;

    &:focus-visible,
    &.focus-visible {
      outline: 0.125rem solid var(--bng-orange-550);
      outline-offset: 0.125rem;
      box-shadow: 0 0 0 0.0625rem rgba(var(--bng-off-white-rgb), 0.45);
    }

    &.simulation-tiremarks-btn--danger {
      --bng-bg-enabled: var(--bng-add-red-600);
      --bng-bg-hover: var(--bng-add-red-600);
      --bng-bg-active: var(--bng-add-red-600);
      --bng-bg-disabled: var(--bng-add-red-600);
      --bng-bg-focus: var(--bng-add-red-600);
      --bng-bg-border-enabled: var(--bng-add-red-400);
      --bng-bg-border-hover: var(--bng-add-red-400);
      --bng-bg-border-active: var(--bng-add-red-400);
      --bng-bg-border-disabled: var(--bng-add-red-400);
      --bng-bg-border-focus: var(--bng-add-red-400);
    }
  }

  .simulation-tiremarks-btn-content {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
  }

  .simulation-tiremarks-btn-icon {
    flex: 0 0 auto;
    font-size: 1.5rem;
    line-height: 1;
  }

  .simulation-tiremarks-btn-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
  }
}
</style>
