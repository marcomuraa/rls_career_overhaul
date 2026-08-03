<template>
  <PhotomodeSectionShell
    class="photomode-scene-section"
    :disabled="sectionShellDisabled"
  >
    <div
      v-if="sceneControlsVisible"
      class="photomode-scene-section__controls"
    >
      <EnvTod
        :title="$t('ui.environment.timeOfDay')"
        :show-tod="true"
        :show-step-controls="true"
        disable-day-length-controls
        :compact="false"
        :can-change="weatherCanChange"
        :environment-state="sceneEnvironmentState"
        :time-of-day-options="[]"
        :apply-partial="applyTimeOfDayPartial"
        :availability="availability"
        :hidden-controls="props.hiddenControls"
      />
    </div>

    <BngGroupPanel
      v-if="showAdvancedUnlockButton"
      :title="$t('ui.photomode.advancedControls')"
      title-id="photomode-scene-section-advanced-unlock-title"
      :hint="advancedUnlockHintText"
      :disabled="advancedUnlockDisabled"
      chrome
    >
      <BngButton
        :disabled="advancedUnlockDisabled"
        @click="onEnableAdvancedControls"
      >
        {{ $t("ui.photomode.enableAdvancedControls") }}
      </BngButton>
    </BngGroupPanel>

    <div
      v-if="advancedRenderControlsVisible || sceneControlsVisible"
      class="photomode-scene-section__advanced-render"
    >
      <div class="photomode-scene-section__advanced-render-groups">
        <BngGroupPanel
          v-if="advancedRenderControlsVisible && advancedShadowGroupVisible"
          :title="$t('ui.options.graphics.shadowsHeading')"
          title-id="photomode-advanced-render-shadows-title"
          :disabled="advancedShadowsQualityDisabled && advancedLastSplitCastersDisabled && advancedVehicleShadowDisabled"
        >
          <BngRow
            v-if="!advancedShadowsQualityHidden"
            class="photomode-scene-section_select photomode-select-with-reset-row"
            :label="$t('ui.options.graphics.GraphicShadowsQuality')"
            :tooltip="$t('ui.photomode.advancedRender.shadowsHint')"
            :disabled="advancedShadowsQualityDisabled"
          >
            <div class="photomode-select-with-reset">
              <BngSelect
                v-model="advancedControls.shadowsQualityIndex"
                class="photomode-select-with-reset__select"
                :options="advancedShadowsQualityOptions"
                :config="DISCRETE_SELECT_CONFIG"
                :disabled="advancedShadowsQualityDisabled"
                @valueChanged="onAdvancedShadowsQualityChanged"
              />
              <button
                v-if="hasAdvancedDiscreteDefault(advancedDefaults.shadowsQualityIndex)"
                type="button"
                class="photomode-select-with-reset__reset"
                bng-no-nav="true"
                tabindex="-1"
                :disabled="isAdvancedDiscreteResetDisabled(advancedControls.shadowsQualityIndex, advancedDefaults.shadowsQualityIndex, advancedShadowsQualityDisabled)"
                @click.stop="onAdvancedShadowsQualityChanged(advancedDefaults.shadowsQualityIndex)"
              >
                <BngIcon :type="icons.undo" />
              </button>
            </div>
          </BngRow>

          <BngRow
            v-if="!advancedLastSplitCastersHidden"
            class="photomode-scene-section_toggle"
            :label="$t('ui.options.graphics.lastSplitCastersEnabled')"
            :tooltip="$t('ui.photomode.advancedRender.distantShadowsHint')"
            :disabled="advancedLastSplitCastersDisabled"
            @activate="onAdvancedLastSplitCastersToggle(!advancedControls.lastSplitCastersEnabled)"
          >
            <PhotomodeToggleControl
              :checked="advancedControls.lastSplitCastersEnabled"
              :disabled="advancedLastSplitCastersDisabled"
            />
          </BngRow>

          <BngRow
            v-if="!advancedVehicleShadowHidden"
            class="photomode-scene-section_toggle"
            :label="$t('ui.options.graphics.vehicleShadowEnabled')"
            :tooltip="$t('ui.options.graphics.vehicleShadowEnabledTooltip')"
            :disabled="advancedVehicleShadowDisabled"
            @activate="onAdvancedVehicleShadowToggle(!advancedControls.vehicleShadowEnabled)"
          >
            <PhotomodeToggleControl
              :checked="advancedControls.vehicleShadowEnabled"
              :disabled="advancedVehicleShadowDisabled"
            />
          </BngRow>
        </BngGroupPanel>

        <BngGroupPanel
          v-if="advancedRenderControlsVisible"
          :title="$t('ui.photomode.advancedRender.detailTerrain')"
          title-id="photomode-advanced-render-detail-title"
          :disabled="advancedDetailAdjustDisabled && advancedTerrainLodScaleDisabled && advancedGrassDensityDisabled && advancedCloudQualityDisabled"
        >
          <BngRow
            class="photomode-scene-section_input"
            :label="$t('ui.photomode.advancedRender.objectDetailAdjust')"
            :tooltip="$t('ui.photomode.advancedRender.objectDetailAdjustHint')"
            :disabled="advancedDetailAdjustDisabled"
          >
            <BngSlider
              v-model="advancedControls.detailAdjust"
              :min="ADVANCED_RENDER_RANGES.detailAdjust.min"
              :max="ADVANCED_RENDER_RANGES.detailAdjust.max"
              :step="ADVANCED_RENDER_RANGES.detailAdjust.step"
              :input-step="ADVANCED_RENDER_RANGES.detailAdjust.inputStep"
              :with-reset="advancedDefaultsAvailable && Number.isFinite(advancedDefaults.detailAdjust)"
              :orig-value="advancedDefaults.detailAdjust"
              :disabled="advancedDetailAdjustDisabled"
              :debounce="0"
              with-input
              @valueChanged="onAdvancedDetailAdjustChanged"
              @focus="markAdvancedFieldEditing('detailAdjust', true)"
              @blur="markAdvancedFieldEditing('detailAdjust', false)"
            />
          </BngRow>

          <BngRow
            v-if="!advancedTerrainLodScaleHidden"
            class="photomode-scene-section_input"
            :label="$t('ui.photomode.terrainLODScale')"
            :tooltip="$t('ui.photomode.advancedRender.terrainLodHint')"
            :disabled="advancedTerrainLodScaleDisabled"
          >
            <BngSlider
              :key="advancedTerrainLodSliderKey"
              :model-value="advancedTerrainLodQuality"
              :min="ADVANCED_TERRAIN_LOD_QUALITY_RANGE.min"
              :max="ADVANCED_TERRAIN_LOD_QUALITY_RANGE.max"
              :step="ADVANCED_TERRAIN_LOD_QUALITY_RANGE.step"
              :input-step="ADVANCED_TERRAIN_LOD_QUALITY_RANGE.inputStep"
              :with-reset="advancedDefaultsAvailable && Number.isFinite(advancedDefaults.terrainLodScale)"
              :orig-value="advancedDefaultTerrainLodQuality"
              :disabled="advancedTerrainLodScaleDisabled"
              :debounce="0"
              with-input
              @valueChanged="onAdvancedTerrainLodQualityChanged"
              @focus="markAdvancedFieldEditing('terrainLodScale', true)"
              @blur="markAdvancedFieldEditing('terrainLodScale', false)"
            />
          </BngRow>

          <BngRow
            v-if="!advancedGrassDensityHidden"
            class="photomode-scene-section_input"
            :label="$t('ui.options.graphics.GraphicGrassDensity')"
            :tooltip="$t('ui.photomode.advancedRender.grassDensityHint')"
            :disabled="advancedGrassDensityDisabled"
          >
            <BngSlider
              v-model="advancedControls.grassDensity"
              :min="ADVANCED_RENDER_RANGES.grassDensity.min"
              :max="ADVANCED_RENDER_RANGES.grassDensity.max"
              :step="ADVANCED_RENDER_RANGES.grassDensity.step"
              :input-step="ADVANCED_RENDER_RANGES.grassDensity.inputStep"
              :with-reset="advancedDefaultsAvailable && Number.isFinite(advancedDefaults.grassDensity)"
              :orig-value="advancedDefaults.grassDensity"
              :disabled="advancedGrassDensityDisabled"
              :debounce="0"
              with-input
              @valueChanged="onAdvancedGrassDensityChanged"
              @focus="markAdvancedFieldEditing('grassDensity', true)"
              @blur="markAdvancedFieldEditing('grassDensity', false)"
            />
          </BngRow>

          <BngRow
            v-if="!advancedCloudQualityHidden"
            class="photomode-scene-section_select photomode-select-with-reset-row"
            :label="$t('ui.photomode.cloudQuality')"
            :tooltip="$t('ui.photomode.advancedRender.cloudQualitySliderHint')"
            :disabled="advancedCloudQualityDisabled"
          >
            <div class="photomode-select-with-reset">
              <BngSelect
                v-model="advancedControls.cloudQualityIndex"
                class="photomode-select-with-reset__select"
                :options="advancedCloudQualityOptions"
                :config="DISCRETE_SELECT_CONFIG"
                :disabled="advancedCloudQualityDisabled"
                @valueChanged="onAdvancedCloudQualityChanged"
              />
              <button
                v-if="hasAdvancedDiscreteDefault(advancedDefaults.cloudQualityIndex)"
                type="button"
                class="photomode-select-with-reset__reset"
                bng-no-nav="true"
                tabindex="-1"
                :disabled="isAdvancedDiscreteResetDisabled(advancedControls.cloudQualityIndex, advancedDefaults.cloudQualityIndex, advancedCloudQualityDisabled)"
                @click.stop="onAdvancedCloudQualityChanged(advancedDefaults.cloudQualityIndex)"
              >
                <BngIcon :type="icons.undo" />
              </button>
            </div>
          </BngRow>
        </BngGroupPanel>

        <EnvWeather
          v-if="sceneControlsVisible"
          :title="$t('ui.environment.weather')"
          :compact="false"
          :can-change="weatherCanChange"
          :environment-state="weatherEnvironmentState"
          :level-defaults="environmentLevelDefaults"
          :apply-partial="applyWeatherEnvironmentPartial"
          :availability="availability"
          :hidden-controls="weatherHiddenControls"
        />

        <EnvCelesital
          :key="celestialPanelKey"
          v-if="sceneControlsVisible"
          :title="$t('ui.environment.celestialSettings')"
          :compact="false"
          :can-change="!controlDisabled"
          :availability="sceneCelestialAvailability"
          :hidden-controls="props.hiddenControls"
          :north-override-value="controls.northOverride"
          :apply-north-override="onNorthOverrideChanged"
        />
      </div>
    </div>

    <PhotomodePresetBrowser
      v-if="scenePresetVisible"
      preset-type="scene"
      :title="$t('ui.photomode.presets.scene')"
      :disabled="scenePresetDisabled"
      @applied="onScenePresetApplied"
    />
  </PhotomodeSectionShell>
</template>

<script setup>
import { computed, inject, reactive, ref, unref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngButton, BngGroupPanel, BngIcon, BngRow, BngSelect, BngSlider, icons } from "@/common/components/base"
import { lua } from "@/bridge"
import { useEnvironmentState } from "@/modules/environmentControls/composables/useEnvironmentState"
import EnvCelesital from "@/modules/environmentControls/components/envPanels/EnvCelesital.vue"
import EnvTod from "@/modules/environmentControls/components/envPanels/EnvTod.vue"
import EnvWeather from "@/modules/environmentControls/components/envPanels/EnvWeather.vue"
import PhotomodeSectionShell from "./PhotomodeSectionShell.vue"
import PhotomodeToggleControl from "./PhotomodeToggleControl.vue"
import PhotomodePresetBrowser from "./PhotomodePresetBrowser.vue"
import { clampNumber } from "@/utils/maths"
import { usePhotomodePolledSection } from "../usePhotomodePolledSection"

defineOptions({ name: "PhotomodeSceneSection" })
const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))

const props = defineProps({
  sessionActive: {
    type: Boolean,
    default: false,
  },
  panelActive: {
    type: Boolean,
    default: false,
  },
  sceneEnabled: {
    type: Boolean,
    default: false,
  },
  developerEnabled: {
    type: Boolean,
    default: false,
  },
  advancedUnlockVisible: {
    type: Boolean,
    default: false,
  },
  advancedRenderEnabled: {
    type: Boolean,
    default: false,
  },
  hiddenControls: {
    type: Object,
    default: () => ({}),
  },
  advancedRenderHiddenControls: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["advanced-enabled"])
const {
  state: environmentState,
  canChange: environmentCanChange,
  levelDefaults: environmentLevelDefaults,
  applyPartial: applyEnvironmentPartial,
} = useEnvironmentState()

const SCENE_STATE_POLL_MS = 333
const SCENE_CONTROL_RANGES = Object.freeze({
  timeMinutes: {
    min: 0,
    max: 1440,
    modelStep: 1,
    sliderStep: 5,
  },
  northOverride: {
    min: -180,
    max: 180,
    step: 1,
    inputStep: 0.25,
    unit: "°",
  },
  cloudCover: {
    min: 0,
    max: 3,
    step: 0.01,
    inputStep: 0.01,
  },
  fogDensity: {
    min: 0,
    max: 50,
    step: 0.005,
    inputStep: 0.005,
  },
  fogAtmosphereHeight: {
    min: 1,
    max: 1000,
    step: 0.5,
    inputStep: 0.5,
    unit: "m",
  },
})
const ADVANCED_RENDER_STATE_POLL_MS = 333
const ADVANCED_RENDER_RANGES = Object.freeze({
  detailAdjust: {
    min: 0.5,
    max: 5,
    step: 0.25,
    inputStep: 0.25,
  },
  terrainLodScale: {
    min: 0.001,
    max: 2,
    step: 0.001,
    inputStep: 0.001,
  },
  grassDensity: {
    min: 0,
    max: 1,
    step: 0.05,
    inputStep: 0.05,
  },
})
const ADVANCED_TERRAIN_LOD_QUALITY_RANGE = Object.freeze({
  min: 0,
  max: 2,
  step: 0.1,
  inputStep: 0.1,
})
const CLOUD_QUALITY_OPTIONS = Object.freeze([
  { key: "Low", labelKey: "ui.photomode.quality.low" },
  { key: "Normal", labelKey: "ui.photomode.SSAOQualityNormal" },
  { key: "High", labelKey: "ui.photomode.SSAOQualityHigh" },
  { key: "Ultra", labelKey: "ui.photomode.quality.ultra" },
])
const SHADOW_QUALITY_OPTIONS = Object.freeze([
  { key: "Lowest", labelKey: "ui.options.graphics.Lowest" },
  { key: "Low", labelKey: "ui.options.graphics.Low" },
  { key: "Normal", labelKey: "ui.options.graphics.Normal" },
  { key: "High", labelKey: "ui.options.graphics.High" },
  { key: "Ultra", labelKey: "ui.options.graphics.Ultra" },
])
const DISCRETE_SELECT_CONFIG = Object.freeze({
  value: option => option.value,
  label: option => option.label,
})

const controls = reactive({
  timeMinutes: 720,
  cloudCover: 0,
  fogDensity: 0,
  fogAtmosphereHeight: 1,
  northOverride: 0,
})
const ENVIRONMENT_LERP_SECONDS = 1.15
const availability = reactive({
  timeOfDay: false,
  cloudCover: false,
  fogDensity: false,
  fogAtmosphereHeight: false,
  northOverride: false,
})
const {
  editing,
  hasLoadedState,
  syncState,
  syncErrorReason,
  clearEditingFlags,
  refresh: refreshSceneState,
  startPolling,
  stopPolling,
} = usePhotomodePolledSection({
  pollMs: SCENE_STATE_POLL_MS,
  editingFields: ["time", "cloudCover", "fogDensity", "fogAtmosphereHeight", "northOverride"],
  request: () => lua.extensions.ui_pause_photomode.getSceneState(),
  applyState: sceneState => applyRemoteState(sceneState, { suppressControls: isLerpSuppressed() }),
  isEnabled: () => props.sessionActive && props.sceneEnabled,
  unavailableReason: "scene_state_unavailable",
  errorReason: "scene_state_error",
})
const advancedControls = reactive({
  shadowsQualityIndex: 2,
  lastSplitCastersEnabled: false,
  vehicleShadowEnabled: false,
  detailAdjust: 2,
  terrainLodScale: 0.75,
  grassDensity: 1,
  cloudQualityIndex: 2,
})
const advancedAvailability = reactive({
  shadowsQuality: false,
  lastSplitCasters: false,
  vehicleShadow: false,
  detailAdjust: false,
  terrainLodScale: false,
  grassDensity: false,
  cloudQuality: false,
})
const advancedDefaults = reactive({
  shadowsQualityIndex: NaN,
  detailAdjust: NaN,
  terrainLodScale: NaN,
  grassDensity: NaN,
  cloudQualityIndex: NaN,
})
const {
  editing: advancedEditing,
  hasLoadedState: advancedHasLoadedState,
  syncState: advancedSyncState,
  syncErrorReason: advancedSyncErrorReason,
  markFieldEditing: markAdvancedFieldEditing,
  clearEditingFlags: clearAdvancedEditingFlags,
  refresh: refreshAdvancedRenderState,
  startPolling: startAdvancedPolling,
  stopPolling: stopAdvancedPolling,
} = usePhotomodePolledSection({
  pollMs: ADVANCED_RENDER_STATE_POLL_MS,
  editingFields: ["detailAdjust", "terrainLodScale", "grassDensity"],
  request: () => lua.extensions.ui_pause_photomode.getAdvancedRenderState(),
  applyState: state => applyAdvancedRemoteState(state),
  isEnabled: () => props.sessionActive && advancedRenderControlsVisible.value,
  unavailableReason: "advanced_render_state_unavailable",
  errorReason: "advanced_render_state_error",
})

const hasSavedEnvironmentBookmark = ref(false)
const advancedDefaultsAvailable = ref(false)
const hasSavedAdvancedRenderBookmark = ref(false)
const celestialPanelKey = ref(0)

let lerpSuppressUntil = 0

function isLerpSuppressed() {
  return Date.now() < lerpSuppressUntil
}

const showAdvancedUnlockButton = computed(() =>
  !isSimpleMenu.value
  && props.developerEnabled !== true
  && props.advancedUnlockVisible === true
)

const advancedUnlockDisabled = computed(() =>
  !props.sessionActive || !props.panelActive
)

const advancedUnlockHintText = computed(() => {
  if (isSimpleMenu.value) return ""
  if (!props.sessionActive) return $translate.instant("ui.photomode.scene.advancedUnlock.session")
  if (!props.panelActive) return $translate.instant("ui.photomode.scene.advancedUnlock.panel")
  return $translate.instant("ui.photomode.scene.advancedUnlock.default")
})

const advancedShadowsQualityHidden = computed(() => props.advancedRenderHiddenControls?.shadowsQuality === true)
const advancedLastSplitCastersHidden = computed(() => props.advancedRenderHiddenControls?.lastSplitCasters === true)
const advancedVehicleShadowHidden = computed(() => props.advancedRenderHiddenControls?.vehicleShadow === true)
const advancedTerrainLodScaleHidden = computed(() => props.advancedRenderHiddenControls?.terrainLodScale === true)
const advancedGrassDensityHidden = computed(() => props.advancedRenderHiddenControls?.grassDensity === true)
const advancedCloudQualityHidden = computed(() => props.advancedRenderHiddenControls?.cloudQuality === true)

const controlDisabled = computed(() => !props.sceneEnabled || !props.sessionActive || !props.panelActive)
const sceneControlsVisible = computed(() => props.sceneEnabled === true)
const advancedRenderControlsVisible = computed(() =>
  !isSimpleMenu.value && props.advancedRenderEnabled === true
)
const advancedShadowGroupVisible = computed(() =>
  !advancedShadowsQualityHidden.value
  || !advancedLastSplitCastersHidden.value
  || !advancedVehicleShadowHidden.value
)
const advancedControlDisabled = computed(() =>
  !advancedRenderControlsVisible.value || !props.sessionActive || !props.panelActive
)
const visibleAdvancedAvailabilities = computed(() => {
  const values = [
    advancedAvailability.detailAdjust,
  ]
  if (!advancedShadowsQualityHidden.value) values.push(advancedAvailability.shadowsQuality)
  if (!advancedLastSplitCastersHidden.value) values.push(advancedAvailability.lastSplitCasters)
  if (!advancedVehicleShadowHidden.value) values.push(advancedAvailability.vehicleShadow)
  if (!advancedTerrainLodScaleHidden.value) values.push(advancedAvailability.terrainLodScale)
  if (!advancedGrassDensityHidden.value) values.push(advancedAvailability.grassDensity)
  if (!advancedCloudQualityHidden.value) values.push(advancedAvailability.cloudQuality)
  return values
})
const hasAnyAvailableAdvancedControl = computed(() =>
  visibleAdvancedAvailabilities.value.some(value => value === true)
)
const advancedShadowsQualityDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.shadowsQuality)
const advancedLastSplitCastersDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.lastSplitCasters)
const advancedVehicleShadowDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.vehicleShadow)
const advancedDetailAdjustDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.detailAdjust)
const advancedTerrainLodScaleDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.terrainLodScale)
const advancedGrassDensityDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.grassDensity)
const advancedCloudQualityDisabled = computed(() => advancedControlDisabled.value || !advancedAvailability.cloudQuality)
const advancedCloudQualityOptions = computed(() =>
  buildQualitySelectOptions(CLOUD_QUALITY_OPTIONS, option => getCloudQualityIndex(option.key))
)
const advancedShadowsQualityOptions = computed(() =>
  buildQualitySelectOptions(SHADOW_QUALITY_OPTIONS, option => getShadowsQualityIndex(option.key))
)
const advancedTerrainLodQuality = computed(() =>
  terrainLodScaleToQuality(advancedControls.terrainLodScale, advancedControls.terrainLodScale)
)
const advancedDefaultTerrainLodQuality = computed(() =>
  terrainLodScaleToQuality(advancedDefaults.terrainLodScale, NaN)
)
const advancedTerrainLodSliderKey = computed(() =>
  Number.isFinite(advancedDefaultTerrainLodQuality.value)
    ? `terrain-lod-quality-default-${advancedDefaultTerrainLodQuality.value}`
    : "terrain-lod-quality-default-unavailable"
)
const hasSceneFlowContent = computed(() =>
  sceneControlsVisible.value || showAdvancedUnlockButton.value
)
const sectionShellDisabled = computed(() =>
  hasSceneFlowContent.value ? controlDisabled.value : advancedControlDisabled.value
)
const scenePresetVisible = computed(() =>
  sceneControlsVisible.value || advancedRenderControlsVisible.value
)
const scenePresetDisabled = computed(() => {
  if (sceneControlsVisible.value && advancedRenderControlsVisible.value) {
    return controlDisabled.value && advancedControlDisabled.value
  }
  if (sceneControlsVisible.value) return controlDisabled.value
  return advancedControlDisabled.value
})

const sceneEnvironmentState = computed(() => ({
  ...(environmentState.value || {}),
  time: minutesToTime(controls.timeMinutes),
  cloudCover: controls.cloudCover,
  fogDensity: controls.fogDensity,
  fogAtmosphereHeight: controls.fogAtmosphereHeight,
}))
const weatherEnvironmentState = computed(() => ({
  ...(environmentState.value || {}),
  cloudCover: controls.cloudCover,
  fogDensity: controls.fogDensity,
  fogAtmosphereHeight: controls.fogAtmosphereHeight,
}))
const weatherCanChange = computed(() =>
  !controlDisabled.value && environmentCanChange.value
)
const weatherHiddenControls = computed(() => ({
  ...(props.hiddenControls || {}),
  temperature: true,
}))
const sceneCelestialAvailability = computed(() => ({
  northOverride: availability.northOverride,
}))

async function applySceneEnvironmentPartial(partial, lerpSeconds = 0) {
  const patch = partial || {}
  const nextState = {}

  if (patch.time !== undefined) {
    controls.timeMinutes = normalizeTimeMinutes(timeToMinutes(patch.time))
    nextState.time = minutesToTime(controls.timeMinutes)
  }
  if (patch.cloudCover !== undefined) {
    controls.cloudCover = clampNumber(
      patch.cloudCover,
      SCENE_CONTROL_RANGES.cloudCover.min,
      SCENE_CONTROL_RANGES.cloudCover.max,
      controls.cloudCover
    )
    nextState.cloudCover = controls.cloudCover
  }
  if (patch.fogDensity !== undefined) {
    controls.fogDensity = clampNumber(
      patch.fogDensity,
      SCENE_CONTROL_RANGES.fogDensity.min,
      SCENE_CONTROL_RANGES.fogDensity.max,
      controls.fogDensity
    )
    nextState.fogDensity = controls.fogDensity
  }
  if (patch.fogAtmosphereHeight !== undefined) {
    controls.fogAtmosphereHeight = clampNumber(
      patch.fogAtmosphereHeight,
      SCENE_CONTROL_RANGES.fogAtmosphereHeight.min,
      SCENE_CONTROL_RANGES.fogAtmosphereHeight.max,
      controls.fogAtmosphereHeight
    )
    nextState.fogAtmosphereHeight = controls.fogAtmosphereHeight
  }

  if (Object.keys(nextState).length === 0) return
  await submitSceneUpdate(nextState, lerpSeconds)
}

async function applyTimeOfDayPartial(partial, lerpSeconds = 0) {
  const patch = partial || {}
  const scenePatch = {}
  const environmentPatch = {}
  const hasTimePatch = patch.time !== undefined

  Object.keys(patch).forEach(key => {
    if (key === "time" || (hasTimePatch && key === "play")) {
      scenePatch[key] = patch[key]
      return
    }
    environmentPatch[key] = patch[key]
  })

  if (Object.keys(scenePatch).length > 0) {
    await applySceneEnvironmentPartial(scenePatch, lerpSeconds)
  }
  if (Object.keys(environmentPatch).length > 0) {
    applyEnvironmentPartial(environmentPatch, lerpSeconds)
  }
}

async function applyWeatherEnvironmentPartial(partial, lerpSeconds = 0) {
  const patch = partial || {}
  const scenePatch = {}
  const environmentPatch = {}

  Object.keys(patch).forEach(key => {
    if (key === "cloudCover" || key === "fogDensity" || key === "fogAtmosphereHeight") {
      scenePatch[key] = patch[key]
      return
    }
    environmentPatch[key] = patch[key]
  })

  if (Object.keys(scenePatch).length > 0) {
    await applySceneEnvironmentPartial(scenePatch, lerpSeconds)
  }
  if (Object.keys(environmentPatch).length > 0) {
    applyEnvironmentPartial(environmentPatch, lerpSeconds)
  }
}

function roundToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value
  return Math.round(value / step) * step
}

function terrainLodScaleToQuality(value, fallback = NaN) {
  const rawMin = ADVANCED_RENDER_RANGES.terrainLodScale.min
  const rawMax = ADVANCED_RENDER_RANGES.terrainLodScale.max
  const qualityMin = ADVANCED_TERRAIN_LOD_QUALITY_RANGE.min
  const qualityMax = ADVANCED_TERRAIN_LOD_QUALITY_RANGE.max
  const rawValue = clampNumber(value, rawMin, rawMax, fallback)

  if (!Number.isFinite(rawValue)) return NaN

  if (rawValue <= rawMin) return qualityMax
  return clampNumber(qualityMax - rawValue, qualityMin, qualityMax)
}

function terrainQualityToLodScale(value) {
  const qualityMin = ADVANCED_TERRAIN_LOD_QUALITY_RANGE.min
  const qualityMax = ADVANCED_TERRAIN_LOD_QUALITY_RANGE.max
  const rawMin = ADVANCED_RENDER_RANGES.terrainLodScale.min
  const rawMax = ADVANCED_RENDER_RANGES.terrainLodScale.max
  const qualityValue = clampNumber(value, qualityMin, qualityMax, advancedTerrainLodQuality.value)

  return clampNumber(qualityMax - qualityValue, rawMin, rawMax)
}

function normalizeTimeMinutes(value, fallback = controls.timeMinutes) {
  return clampNumber(
    roundToStep(Number(value), SCENE_CONTROL_RANGES.timeMinutes.modelStep),
    SCENE_CONTROL_RANGES.timeMinutes.min,
    SCENE_CONTROL_RANGES.timeMinutes.max,
    fallback
  )
}

function timeToMinutes(timeValue) {
  const numericValue = Number(timeValue)
  if (!Number.isFinite(numericValue)) return 0
  const seconds = ((numericValue + 0.5) % 1) * 86400
  return seconds / 60
}

function minutesToTime(minutes) {
  let nextValue = (Number(minutes) * 60) / 86400 - 0.5
  nextValue %= 1
  if (nextValue < 0) nextValue += 1
  return nextValue
}

function translateQualityOption(option) {
  return option?.labelKey ? $translate.instant(option.labelKey) : String(option?.key ?? "")
}

function buildQualitySelectOptions(options, valueGetter) {
  return options.map(option => ({
    value: valueGetter(option),
    label: translateQualityOption(option),
  }))
}

function getCloudQualityIndex(mode) {
  const index = CLOUD_QUALITY_OPTIONS.findIndex(option => option.key === mode)
  return index >= 0 ? index : 2
}

function getCloudQualityOption(index) {
  const numericIndex = Math.round(clampNumber(index, 0, CLOUD_QUALITY_OPTIONS.length - 1, 2))
  return CLOUD_QUALITY_OPTIONS[numericIndex] || CLOUD_QUALITY_OPTIONS[2]
}

function getShadowsQualityIndex(mode) {
  const index = SHADOW_QUALITY_OPTIONS.findIndex(option => option.key === mode)
  return index >= 0 ? index : 2
}

function getShadowsQualityOption(index) {
  const numericIndex = Math.round(clampNumber(index, 0, SHADOW_QUALITY_OPTIONS.length - 1, 2))
  return SHADOW_QUALITY_OPTIONS[numericIndex] || SHADOW_QUALITY_OPTIONS[2]
}

function applyRemoteState(sceneState, options = {}) {
  if (!sceneState || typeof sceneState !== "object") return

  const suppressControls = options.suppressControls === true
  availability.timeOfDay = sceneState?.availability?.timeOfDay === true
  availability.cloudCover = sceneState?.availability?.cloudCover === true
  availability.fogDensity = sceneState?.availability?.fogDensity === true
  availability.fogAtmosphereHeight = sceneState?.availability?.fogAtmosphereHeight === true
  availability.northOverride = sceneState?.availability?.northOverride === true

  const nextTime = Number(sceneState.time)
  const nextCloudCover = Number(sceneState.cloudCover)
  const nextFogDensity = Number(sceneState.fogDensity)
  const nextFogAtmosphereHeight = Number(sceneState.fogAtmosphereHeight)
  const nextNorthOverride = Number(sceneState.northOverride)

  if (!suppressControls && !editing.time && Number.isFinite(nextTime)) {
    controls.timeMinutes = normalizeTimeMinutes(timeToMinutes(nextTime))
  }
  if (!suppressControls && !editing.cloudCover && Number.isFinite(nextCloudCover)) {
    controls.cloudCover = clampNumber(
      nextCloudCover,
      SCENE_CONTROL_RANGES.cloudCover.min,
      SCENE_CONTROL_RANGES.cloudCover.max,
      controls.cloudCover
    )
  }
  if (!suppressControls && !editing.fogDensity && Number.isFinite(nextFogDensity)) {
    controls.fogDensity = clampNumber(
      nextFogDensity,
      SCENE_CONTROL_RANGES.fogDensity.min,
      SCENE_CONTROL_RANGES.fogDensity.max,
      controls.fogDensity
    )
  }
  if (!suppressControls && !editing.fogAtmosphereHeight && Number.isFinite(nextFogAtmosphereHeight)) {
    controls.fogAtmosphereHeight = clampNumber(
      nextFogAtmosphereHeight,
      SCENE_CONTROL_RANGES.fogAtmosphereHeight.min,
      SCENE_CONTROL_RANGES.fogAtmosphereHeight.max,
      controls.fogAtmosphereHeight
    )
  }
  if (!suppressControls && !editing.northOverride && Number.isFinite(nextNorthOverride)) {
    controls.northOverride = clampNumber(
      nextNorthOverride,
      SCENE_CONTROL_RANGES.northOverride.min,
      SCENE_CONTROL_RANGES.northOverride.max,
      controls.northOverride
    )
  }

  if (typeof sceneState.bookmarkAvailable === "boolean") {
    hasSavedEnvironmentBookmark.value = sceneState.bookmarkAvailable
  }

  if (!hasLoadedState.value) {
    hasLoadedState.value = [nextTime, nextCloudCover, nextFogDensity, nextFogAtmosphereHeight, nextNorthOverride].some(Number.isFinite)
  }
}

function applyCombinedScenePresetState(state) {
  if (!state || typeof state !== "object") return false

  let applied = false
  if (state.scene) {
    clearEditingFlags()
    applyRemoteState(state.scene)
    celestialPanelKey.value++
    syncState.value = "ready"
    syncErrorReason.value = ""
    applied = true
  }
  if (state.advancedRender) {
    clearAdvancedEditingFlags()
    applyAdvancedRemoteState(state.advancedRender)
    advancedSyncState.value = "ready"
    advancedSyncErrorReason.value = ""
    applied = true
  }

  return applied
}

function onScenePresetApplied(result) {
  if (applyCombinedScenePresetState(result?.state)) return

  void refreshSceneState()
  void refreshAdvancedRenderState()
}

async function submitSceneUpdate(partialState, lerpSeconds = 0) {
  if (controlDisabled.value) return

  try {
    const useLerp = Number(lerpSeconds) > 0
    if (useLerp) lerpSuppressUntil = Date.now() + Number(lerpSeconds) * 1000 + 150
    const result = await lua.extensions.ui_pause_photomode.setSceneState(useLerp ? { ...partialState, __lerpSeconds: lerpSeconds } : partialState)
    if (result?.ok === false) {
      if (result?.state) applyRemoteState(result.state)
      syncState.value = "error"
      syncErrorReason.value = result.reason || "setSceneState"
      return
    }

    if (result?.state && !useLerp) {
      applyRemoteState(result.state)
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || "setSceneState"
  }
}

function onNorthOverrideChanged(value) {
  controls.northOverride = clampNumber(
    value,
    SCENE_CONTROL_RANGES.northOverride.min,
    SCENE_CONTROL_RANGES.northOverride.max,
    controls.northOverride
  )
  void submitSceneUpdate({ northOverride: controls.northOverride })
}

async function onEnableAdvancedControls() {
  if (advancedUnlockDisabled.value || isSimpleMenu.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode.setAdvancedRenderTuningEnabled(true)

    if (result?.ok === false) {
      syncState.value = "error"
      syncErrorReason.value = result.reason || "advanced_controls_enable_failed"
      return
    }

    syncState.value = "ready"
    syncErrorReason.value = ""

    emit("advanced-enabled", result)
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || "advanced_controls_enable_failed"
  }
}

function hasAdvancedDiscreteDefault(defaultValue) {
  return advancedDefaultsAvailable.value && Number.isFinite(Number(defaultValue))
}

function isAdvancedDiscreteResetDisabled(currentValue, defaultValue, disabled) {
  const numericDefault = Number(defaultValue)
  return disabled || !Number.isFinite(numericDefault) || Number(currentValue) === numericDefault
}

function clearAdvancedAvailability() {
  Object.keys(advancedAvailability).forEach(fieldName => {
    advancedAvailability[fieldName] = false
  })
}

function clearAdvancedDefaults() {
  Object.keys(advancedDefaults).forEach(fieldName => {
    advancedDefaults[fieldName] = NaN
  })
}

function resetAdvancedLocalState() {
  advancedHasLoadedState.value = false
  advancedDefaultsAvailable.value = false
  hasSavedAdvancedRenderBookmark.value = false
  advancedSyncState.value = "idle"
  advancedSyncErrorReason.value = ""
  clearAdvancedAvailability()
  clearAdvancedDefaults()
  clearAdvancedEditingFlags()
}

function applyAdvancedRemoteState(state) {
  if (!state || typeof state !== "object") return

  advancedAvailability.shadowsQuality = state?.availability?.shadowsQuality === true
  advancedAvailability.lastSplitCasters = state?.availability?.lastSplitCasters === true
  advancedAvailability.vehicleShadow = state?.availability?.vehicleShadow === true
  advancedAvailability.detailAdjust = state?.availability?.detailAdjust === true
  advancedAvailability.terrainLodScale = state?.availability?.terrainLodScale === true
  advancedAvailability.grassDensity = state?.availability?.grassDensity === true
  advancedAvailability.cloudQuality = state?.availability?.cloudQuality === true
  advancedDefaultsAvailable.value = state?.defaultsAvailable === true
  hasSavedAdvancedRenderBookmark.value = state?.bookmarkAvailable === true

  const nextDefaults = state?.defaults
  if (nextDefaults && typeof nextDefaults === "object") {
    advancedDefaults.shadowsQualityIndex = typeof nextDefaults.shadowsQualityMode === "string" ? getShadowsQualityIndex(nextDefaults.shadowsQualityMode) : NaN
    advancedDefaults.detailAdjust = Number.isFinite(Number(nextDefaults.detailAdjust)) ? Number(nextDefaults.detailAdjust) : NaN
    advancedDefaults.terrainLodScale = Number.isFinite(Number(nextDefaults.terrainLodScale)) ? Number(nextDefaults.terrainLodScale) : NaN
    advancedDefaults.grassDensity = Number.isFinite(Number(nextDefaults.grassDensity)) ? Number(nextDefaults.grassDensity) : NaN
    advancedDefaults.cloudQualityIndex = typeof nextDefaults.cloudQualityMode === "string" ? getCloudQualityIndex(nextDefaults.cloudQualityMode) : NaN
  }

  if (typeof state.shadowsQualityMode === "string") advancedControls.shadowsQualityIndex = getShadowsQualityIndex(state.shadowsQualityMode)
  if (typeof state.lastSplitCastersEnabled === "boolean") advancedControls.lastSplitCastersEnabled = state.lastSplitCastersEnabled
  if (typeof state.vehicleShadowEnabled === "boolean") advancedControls.vehicleShadowEnabled = state.vehicleShadowEnabled
  if (!advancedEditing.detailAdjust && Number.isFinite(Number(state.detailAdjust))) advancedControls.detailAdjust = Number(state.detailAdjust)
  if (!advancedEditing.terrainLodScale && Number.isFinite(Number(state.terrainLodScale))) advancedControls.terrainLodScale = Number(state.terrainLodScale)
  if (!advancedEditing.grassDensity && Number.isFinite(Number(state.grassDensity))) advancedControls.grassDensity = Number(state.grassDensity)
  if (typeof state.cloudQualityMode === "string") advancedControls.cloudQualityIndex = getCloudQualityIndex(state.cloudQualityMode)

  if (!advancedHasLoadedState.value) {
    advancedHasLoadedState.value = hasAnyAvailableAdvancedControl.value
      || typeof state.shadowsQualityMode === "string"
      || typeof state.cloudQualityMode === "string"
  }
}

async function submitAdvancedRenderUpdate(partialState, sourceName) {
  if (advancedControlDisabled.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode.setAdvancedRenderState(partialState)
    if (result?.ok === false) {
      if (result?.state) applyAdvancedRemoteState(result.state)
      advancedSyncState.value = "error"
      advancedSyncErrorReason.value = result.reason || sourceName
      return
    }

    if (result?.state) applyAdvancedRemoteState(result.state)
    advancedSyncState.value = "ready"
    advancedSyncErrorReason.value = ""
  } catch (error) {
    advancedSyncState.value = "error"
    advancedSyncErrorReason.value = error?.message || sourceName
  }
}

function onAdvancedShadowsQualityChanged(value) {
  advancedControls.shadowsQualityIndex = Math.round(clampNumber(value, 0, SHADOW_QUALITY_OPTIONS.length - 1, advancedControls.shadowsQualityIndex))
  const selectedOption = getShadowsQualityOption(advancedControls.shadowsQualityIndex)
  void submitAdvancedRenderUpdate({ shadowsQualityMode: selectedOption.key }, "shadowsQualityMode")
}

function onAdvancedLastSplitCastersToggle(value) {
  advancedControls.lastSplitCastersEnabled = value === true
  void submitAdvancedRenderUpdate({ lastSplitCastersEnabled: advancedControls.lastSplitCastersEnabled }, "lastSplitCastersEnabled")
}

function onAdvancedVehicleShadowToggle(value) {
  advancedControls.vehicleShadowEnabled = value === true
  void submitAdvancedRenderUpdate({ vehicleShadowEnabled: advancedControls.vehicleShadowEnabled }, "vehicleShadowEnabled")
}

function onAdvancedDetailAdjustChanged(value) {
  advancedControls.detailAdjust = clampNumber(value, ADVANCED_RENDER_RANGES.detailAdjust.min, ADVANCED_RENDER_RANGES.detailAdjust.max, advancedControls.detailAdjust)
  void submitAdvancedRenderUpdate({ detailAdjust: advancedControls.detailAdjust }, "detailAdjust")
}

function onAdvancedTerrainLodQualityChanged(value) {
  advancedControls.terrainLodScale = terrainQualityToLodScale(value)
  void submitAdvancedRenderUpdate({ terrainLodScale: advancedControls.terrainLodScale }, "terrainLodScale")
}

function onAdvancedGrassDensityChanged(value) {
  advancedControls.grassDensity = clampNumber(value, ADVANCED_RENDER_RANGES.grassDensity.min, ADVANCED_RENDER_RANGES.grassDensity.max, advancedControls.grassDensity)
  void submitAdvancedRenderUpdate({ grassDensity: advancedControls.grassDensity }, "grassDensity")
}

function onAdvancedCloudQualityChanged(value) {
  advancedControls.cloudQualityIndex = Math.round(clampNumber(value, 0, CLOUD_QUALITY_OPTIONS.length - 1, advancedControls.cloudQualityIndex))
  const selectedOption = getCloudQualityOption(advancedControls.cloudQualityIndex)
  void submitAdvancedRenderUpdate({ cloudQualityMode: selectedOption.key }, "cloudQualityMode")
}

watch(
  () => [props.sessionActive, props.sceneEnabled],
  ([sessionActive, sceneEnabled]) => {
    if (!sessionActive) {
      hasSavedEnvironmentBookmark.value = false
      hasLoadedState.value = false
      availability.timeOfDay = false
      availability.cloudCover = false
      availability.fogDensity = false
      availability.fogAtmosphereHeight = false
      availability.northOverride = false
      return
    }

    if (sceneEnabled) {
      void refreshSceneState()
    }
  },
  { immediate: true }
)

watch(
  () => [props.panelActive, props.sessionActive, props.sceneEnabled],
  ([panelActive, sessionActive, sceneEnabled]) => {
    if (panelActive && sessionActive && sceneEnabled) {
      startPolling()
      return
    }

    stopPolling()
    clearEditingFlags()

    if (!sceneEnabled) {
      syncState.value = "error"
      syncErrorReason.value = "scene_unavailable"
      return
    }

    syncState.value = "idle"
    syncErrorReason.value = ""
  },
  { immediate: true }
)

watch(
  () => [props.sessionActive, advancedRenderControlsVisible.value],
  ([sessionActive, advancedControlsVisible]) => {
    if (!sessionActive || !advancedControlsVisible) {
      resetAdvancedLocalState()
      return
    }

    void refreshAdvancedRenderState()
  },
  { immediate: true }
)

watch(
  () => [props.panelActive, props.sessionActive, advancedRenderControlsVisible.value],
  ([panelActive, sessionActive, advancedControlsVisible]) => {
    if (panelActive && sessionActive && advancedControlsVisible) {
      startAdvancedPolling()
      return
    }

    stopAdvancedPolling()
    clearAdvancedEditingFlags()
    advancedSyncState.value = "idle"
    advancedSyncErrorReason.value = ""
  },
  { immediate: true }
)

// TODO: keep the scene block self-contained so the later tab split can move it without changing the Lua contract again.
</script>

<style lang="scss" scoped>
@use "./sharedRows";

.photomode-scene-section__controls {
  display: flex;
  flex-direction: column;
}

.photomode-scene-section__advanced-render {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.photomode-scene-section__advanced-render-groups {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

</style>
