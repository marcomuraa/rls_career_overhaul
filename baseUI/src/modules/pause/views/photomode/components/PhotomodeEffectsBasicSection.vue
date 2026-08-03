<template>
  <PhotomodeSectionShell
    class="photomode-effects-section"
    :disabled="controlDisabled"
  >
    <div class="photomode-effects-section__groups">
      <BngGroupPanel
        v-for="group in effectControlGroups"
        :key="group.key"
        :title="group.title"
        :title-id="`photomode-effects-group-${group.key}`"
        :disabled="group.disabled"
      >
        <BngRow
          v-for="row in group.toggles"
          :key="row.key"
          class="photomode-scene-section_toggle"
          :label="row.label"
          :disabled="row.disabled"
          @activate="row.onChanged(!controls[row.key])"
        >
          <PhotomodeToggleControl
            :checked="controls[row.key]"
            :disabled="row.disabled"
          />
        </BngRow>

        <p v-if="group.key === 'flash' && controls.flashEnabled && controls.flashFireOnCapture" class="photomode-effects-section__flash-hint">
          {{ $t("ui.photomode.flash.fireOnCaptureHint") }}
        </p>

        <BngRow
          v-for="row in group.sliders"
          :key="row.key"
          class="photomode-scene-section_input"
          :label="row.title"
          :tooltip="row.hint"
          :disabled="row.disabled"
        >
          <BngSlider
            v-model="controls[row.key]"
            :min="row.min"
            :max="row.max"
            :step="row.step"
            :input-step="row.inputStep"
            :unit="row.unit"
            :with-reset="defaultsAvailable && Number.isFinite(defaults[row.key])"
            :orig-value="defaults[row.key]"
            :disabled="row.disabled"
            :debounce="0"
            with-input
            @valueChanged="row.onChanged"
            @focus="markFieldEditing(row.key, true)"
            @blur="markFieldEditing(row.key, false)"
          />
        </BngRow>

        <BngRow
          v-for="row in group.qualityRows"
          :key="row.key"
          class="photomode-scene-section_select photomode-select-with-reset-row"
          :label="row.title"
          :tooltip="row.hint"
          :disabled="row.disabled"
        >
          <div class="photomode-select-with-reset">
            <BngSelect
              v-model="controls[row.key]"
              class="photomode-select-with-reset__select"
              :options="row.options"
              :config="DISCRETE_SELECT_CONFIG"
              :disabled="row.disabled"
              @valueChanged="row.onChanged"
            />
            <button
              v-if="hasDiscreteDefault(defaults[row.key])"
              type="button"
              class="photomode-select-with-reset__reset"
              bng-no-nav="true"
              tabindex="-1"
              :disabled="isDiscreteResetDisabled(controls[row.key], defaults[row.key], row.disabled)"
              @click.stop="row.onChanged(defaults[row.key])"
            >
              <BngIcon :type="icons.undo" />
            </button>
          </div>
        </BngRow>
      </BngGroupPanel>
    </div>
    <PhotomodePresetBrowser
      preset-type="effects"
      :title="$t('ui.photomode.presets.effects')"
      :disabled="controlDisabled"
      @applied="onPresetApplied"
    />
  </PhotomodeSectionShell>
</template>

<script setup>
import { computed, inject, reactive, ref, unref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngGroupPanel, BngIcon, BngRow, BngSelect, BngSlider, icons } from "@/common/components/base"
import { lua } from "@/bridge"
import PhotomodeSectionShell from "./PhotomodeSectionShell.vue"
import PhotomodeToggleControl from "./PhotomodeToggleControl.vue"
import PhotomodePresetBrowser from "./PhotomodePresetBrowser.vue"
import { clampNumber } from "@/utils/maths"
import { usePhotomodePolledSection } from "../usePhotomodePolledSection"

defineOptions({ name: "PhotomodeEffectsBasicSection" })

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))

const props = defineProps({
  payload: {
    type: Object,
    default: () => ({}),
  },
  sessionActive: {
    type: Boolean,
    default: false,
  },
  panelActive: {
    type: Boolean,
    default: false,
  },
  effectsEnabled: {
    type: Boolean,
    default: false,
  },
  hiddenControls: {
    type: Object,
    default: () => ({}),
  },
})

const EFFECTS_STATE_POLL_MS = 333

const SSAO_QUALITY_OPTIONS = Object.freeze([
  { key: "Normal", labelKey: "ui.photomode.SSAOQualityNormal" },
  { key: "High", labelKey: "ui.photomode.SSAOQualityHigh" },
])

const DISCRETE_SELECT_CONFIG = Object.freeze({
  value: option => option.value,
  label: option => option.label,
})

function translateQualityOption(option) {
  return option?.labelKey ? $translate.instant(option.labelKey) : String(option?.key ?? "")
}

function buildQualitySelectOptions(options, valueGetter) {
  return options.map(option => ({
    value: valueGetter(option),
    label: translateQualityOption(option),
  }))
}

const EFFECTS_CONTROL_RANGES = Object.freeze({
  dofMaxBlurNear: {
    min: 0,
    max: 1,
    step: 0.01,
    inputStep: 0.01,
  },
  dofMaxBlurFar: {
    min: 0,
    max: 1,
    step: 0.01,
    inputStep: 0.01,
  },
  dofFocusRange: {
    min: -100,
    max: 250,
    step: 0.1,
    inputStep: 0.1,
  },
  dofAperture: {
    min: 0.1,
    max: 100,
    step: 0.1,
    inputStep: 0.1,
  },
  dofFalloffSharpness: {
    min: 0.1,
    max: 100,
    step: 0.01,
    inputStep: 0.01,
  },
  motionBlurStrength: {
    min: 0,
    max: 2,
    step: 0.01,
    inputStep: 0.01,
  },
  reflectionSizeLog2: {
    min: 7,
    max: 11,
    step: 1,
  },
  reflectionDetail: {
    min: 0,
    max: 2,
    step: 0.01,
    inputStep: 0.01,
  },
  reflectionDistance: {
    min: 1,
    max: 2000,
    step: 1,
    inputStep: 1,
  },
  ssaoContrast: {
    min: 1,
    max: 10,
    step: 0.001,
    inputStep: 0.001,
  },
  ssaoRadius: {
    min: 0.01,
    max: 3,
    step: 0.001,
    inputStep: 0.001,
  },
})
const FLASH_SLIDER_CONFIG = Object.freeze([
  {
    key: "flashIntensity",
    patchKey: "intensity",
    labelKey: "ui.photomode.flash.intensity",
    min: 0,
    max: 1000000,
    step: 1000,
    unit: "",
  },
  {
    key: "flashHue",
    patchKey: "hue",
    labelKey: "ui.photomode.flash.hue",
    min: 0,
    max: 360,
    step: 1,
    unit: "°",
  },
  {
    key: "flashSaturation",
    patchKey: "saturation",
    labelKey: "ui.photomode.flash.saturation",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
  },
  {
    key: "flashOuterAngle",
    patchKey: "outerAngle",
    labelKey: "ui.photomode.flash.coneAngle",
    min: 1,
    max: 179,
    step: 1,
    unit: "°",
  },
])

const controls = reactive({
  dofEnabled: true,
  dofAutofocus: false,
  dofMaxBlurNear: 0,
  dofMaxBlurFar: 0.15,
  dofFocusRange: 50,
  dofAperture: 8,
  dofFalloffSharpness: 1,
  ssaoEnabled: true,
  ssaoContrast: 2,
  ssaoRadius: 1.5,
  ssaoQualityIndex: 0,
  screenSpaceShadowsEnabled: true,
  motionBlurEnabled: true,
  motionBlurStrength: 0.5,
  reflectionsEnabled: true,
  reflectionSizeLog2: 9,
  reflectionDetail: 0.8,
  reflectionDistance: 300,
  flashEnabled: false,
  flashFireOnCapture: false,
  flashIntensity: 25000,
  flashOuterAngle: 55,
  flashHue: 0,
  flashSaturation: 0,
})

const availability = reactive({
  dof: false,

  ssao: false,
  ssaoSettings: false,

  screenSpaceShadows: false,

  motionBlur: false,
  reflections: false,
  reflectionSize: false,
  reflectionDetail: false,
  reflectionDistance: false,
})

const defaults = reactive({
  dofMaxBlurNear: NaN,
  dofMaxBlurFar: NaN,
  dofFocusRange: NaN,
  dofAperture: NaN,
  dofFalloffSharpness: NaN,
  ssaoContrast: NaN,
  ssaoRadius: NaN,
  ssaoQualityIndex: NaN,

  motionBlurStrength: NaN,
  reflectionSizeLog2: NaN,
  reflectionDetail: NaN,
  reflectionDistance: NaN,
})

const {
  editing,
  hasLoadedState,
  syncState,
  syncErrorReason,
  markFieldEditing,
  clearEditingFlags,
  refresh: refreshEffectsState,
  startPolling,
  stopPolling,
} = usePhotomodePolledSection({
  pollMs: EFFECTS_STATE_POLL_MS,
  editingFields: [
    "dofMaxBlurNear",
    "dofMaxBlurFar",
    "dofFocusRange",
    "dofAperture",
    "dofFalloffSharpness",
    "ssaoContrast",
    "ssaoRadius",
    "motionBlurStrength",
    "reflectionDetail",
    "reflectionDistance",
    "flashIntensity",
    "flashOuterAngle",
    "flashHue",
    "flashSaturation",
  ],
  request: () => lua.extensions.ui_pause_photomode.getEffectsState(),
  applyState: effectsState => applyRemoteState(effectsState),
  isEnabled: () => props.sessionActive && props.effectsEnabled,
  unavailableReason: "effects_state_unavailable",
  errorReason: "effects_state_error",
  onPoll: () => refreshFlashState(),
})
const defaultsAvailable = ref(false)

let flashPollInFlight = false

const motionBlurHidden = computed(() => props.hiddenControls?.motionBlur === true)

const controlDisabled = computed(() => !props.effectsEnabled || !props.sessionActive || !props.panelActive)
const availabilityList = computed(() => {
  const values = [
    availability.dof,
    availability.ssao,
    availability.ssaoSettings,
    availability.screenSpaceShadows,
    availability.reflections,
  ]
  if (!motionBlurHidden.value) values.push(availability.motionBlur)
  if (!isSimpleMenu.value) {
    values.push(
      availability.reflectionSize,
      availability.reflectionDetail,
      availability.reflectionDistance
    )
  }
  return values
})

const hasAnyAvailableControl = computed(() => availabilityList.value.some(Boolean))

const hasPartialAvailability = computed(() =>
  hasAnyAvailableControl.value && availabilityList.value.some(v => v !== true)
)

const dofToggleDisabled = computed(() => controlDisabled.value || !availability.dof)
const dofAutofocusDisabled = computed(() => dofToggleDisabled.value || !controls.dofEnabled)
const dofControlDisabled = computed(() => dofToggleDisabled.value || !controls.dofEnabled)
const dofFocusRangeDisabled = computed(() => dofControlDisabled.value || controls.dofAutofocus)
const ssaoToggleDisabled = computed(() => controlDisabled.value || !availability.ssao)
const ssaoSettingsDisabled = computed(() => controlDisabled.value || !availability.ssaoSettings || controls.ssaoEnabled !== true)
const screenSpaceShadowsToggleDisabled = computed(() => controlDisabled.value || !availability.screenSpaceShadows)
const motionBlurToggleDisabled = computed(() => controlDisabled.value || !availability.motionBlur)
const motionBlurStrengthDisabled = computed(() => motionBlurToggleDisabled.value || !controls.motionBlurEnabled)
const reflectionsToggleDisabled = computed(() => controlDisabled.value || !availability.reflections)
const reflectionInternalsAvailable = computed(() =>
  availability.reflectionSize || availability.reflectionDetail || availability.reflectionDistance
)
const reflectionInternalsDisabled = computed(() =>
  controlDisabled.value || !reflectionInternalsAvailable.value || controls.reflectionsEnabled !== true
)
const reflectionSizeDisabled = computed(() => reflectionInternalsDisabled.value || !availability.reflectionSize)
const reflectionDetailDisabled = computed(() => reflectionInternalsDisabled.value || !availability.reflectionDetail)
const reflectionDistanceDisabled = computed(() => reflectionInternalsDisabled.value || !availability.reflectionDistance)
const flashSettingsDisabled = computed(() => controlDisabled.value)
const flashDetailsDisabled = computed(() => flashSettingsDisabled.value || controls.flashEnabled !== true)
const effectToggleRows = computed(() => {
  const rows = [
    { key: "dofEnabled", label: $translate.instant("ui.photomode.toggleDoF"), disabled: dofToggleDisabled.value, onChanged: onDofToggleChanged },
    {
      key: "dofAutofocus",
      label: $translate.instant("ui.photomode.dofAutofocus"),
      hidden: controls.dofEnabled !== true,
      disabled: dofAutofocusDisabled.value,
      onChanged: onDofAutofocusChanged,
    },
  ]

  if (!motionBlurHidden.value) {
    rows.push({ key: "motionBlurEnabled", label: $translate.instant("ui.photomode.motionBlur"), disabled: motionBlurToggleDisabled.value, onChanged: onMotionBlurToggleChanged })
  }

  if (!isSimpleMenu.value) {
    rows.push(
      { key: "ssaoEnabled", label: $translate.instant("ui.photomode.effects.ssao"), disabled: ssaoToggleDisabled.value, onChanged: onSsaoToggleChanged },
      {
        key: "screenSpaceShadowsEnabled",
        label: $translate.instant("ui.photomode.screenSpaceShadows"),
        disabled: screenSpaceShadowsToggleDisabled.value,
        onChanged: onScreenSpaceShadowsToggleChanged,
      },
      {
        key: "reflectionsEnabled",
        label: $translate.instant("ui.photomode.reflections"),
        disabled: reflectionsToggleDisabled.value,
        onChanged: onReflectionsToggleChanged,
      }
    )
  }

  return rows
})
const flashSliderRows = computed(() => FLASH_SLIDER_CONFIG.map(row => ({
  ...row,
  title: $translate.instant(row.labelKey),
  inputStep: row.step,
  hidden: controls.flashEnabled !== true,
  disabled: flashDetailsDisabled.value,
  onChanged: value => onFlashSliderChanged(row, value),
})))
const effectSliderRows = computed(() => ([
  {
    key: "dofMaxBlurNear",
    title: $translate.instant("ui.photomode.effects.dofMaxBlurNear"),
    hint: $translate.instant("ui.photomode.effects.dofMaxBlurNearHint"),
    min: EFFECTS_CONTROL_RANGES.dofMaxBlurNear.min,
    max: EFFECTS_CONTROL_RANGES.dofMaxBlurNear.max,
    step: EFFECTS_CONTROL_RANGES.dofMaxBlurNear.step,
    inputStep: EFFECTS_CONTROL_RANGES.dofMaxBlurNear.inputStep,
    hidden: controls.dofEnabled !== true,
    disabled: dofControlDisabled.value,
    onChanged: onDofMaxBlurNearChanged,
  },
  {
    key: "dofMaxBlurFar",
    title: $translate.instant("ui.photomode.effects.dofMaxBlurFar"),
    hint: $translate.instant("ui.photomode.effects.dofMaxBlurFarHint"),
    min: EFFECTS_CONTROL_RANGES.dofMaxBlurFar.min,
    max: EFFECTS_CONTROL_RANGES.dofMaxBlurFar.max,
    step: EFFECTS_CONTROL_RANGES.dofMaxBlurFar.step,
    inputStep: EFFECTS_CONTROL_RANGES.dofMaxBlurFar.inputStep,
    hidden: controls.dofEnabled !== true,
    disabled: dofControlDisabled.value,
    onChanged: onDofMaxBlurFarChanged,
  },
  {
    key: "dofFocusRange",
    title: $translate.instant("ui.photomode.dofFocusRange"),
    hint: $translate.instant("ui.photomode.effects.dofFocusRangeHint"),
    min: EFFECTS_CONTROL_RANGES.dofFocusRange.min,
    max: EFFECTS_CONTROL_RANGES.dofFocusRange.max,
    step: EFFECTS_CONTROL_RANGES.dofFocusRange.step,
    inputStep: EFFECTS_CONTROL_RANGES.dofFocusRange.inputStep,
    hidden: controls.dofEnabled !== true || controls.dofAutofocus === true,
    disabled: dofFocusRangeDisabled.value,
    onChanged: onDofFocusRangeChanged,
  },
  {
    key: "dofAperture",
    title: $translate.instant("ui.photomode.dofAperture"),
    hint: $translate.instant("ui.photomode.effects.dofApertureHint"),
    min: EFFECTS_CONTROL_RANGES.dofAperture.min,
    max: EFFECTS_CONTROL_RANGES.dofAperture.max,
    step: EFFECTS_CONTROL_RANGES.dofAperture.step,
    inputStep: EFFECTS_CONTROL_RANGES.dofAperture.inputStep,
    hidden: controls.dofEnabled !== true,
    disabled: dofControlDisabled.value,
    onChanged: onDofApertureChanged,
  },
  {
    key: "dofFalloffSharpness",
    title: $translate.instant("ui.photomode.dofFalloffSharpness"),
    hint: $translate.instant("ui.photomode.effects.dofFalloffSharpnessHint"),
    min: EFFECTS_CONTROL_RANGES.dofFalloffSharpness.min,
    max: EFFECTS_CONTROL_RANGES.dofFalloffSharpness.max,
    step: EFFECTS_CONTROL_RANGES.dofFalloffSharpness.step,
    inputStep: EFFECTS_CONTROL_RANGES.dofFalloffSharpness.inputStep,
    hidden: controls.dofEnabled !== true,
    disabled: dofControlDisabled.value,
    onChanged: onDofFalloffSharpnessChanged,
  },
  {
    key: "motionBlurStrength",
    title: $translate.instant("ui.photomode.effects.motionBlurStrength"),
    hint: $translate.instant("ui.photomode.effects.motionBlurStrengthHint"),
    min: EFFECTS_CONTROL_RANGES.motionBlurStrength.min,
    max: EFFECTS_CONTROL_RANGES.motionBlurStrength.max,
    step: EFFECTS_CONTROL_RANGES.motionBlurStrength.step,
    inputStep: EFFECTS_CONTROL_RANGES.motionBlurStrength.inputStep,
    hidden: controls.motionBlurEnabled !== true,
    disabled: motionBlurStrengthDisabled.value,
    onChanged: onMotionBlurStrengthChanged,
  },
  {
    key: "reflectionDetail",
    title: $translate.instant("ui.photomode.advancedRender.reflectionDetail"),
    hint: $translate.instant("ui.photomode.advancedRender.reflectionDetailHint"),
    min: EFFECTS_CONTROL_RANGES.reflectionDetail.min,
    max: EFFECTS_CONTROL_RANGES.reflectionDetail.max,
    step: EFFECTS_CONTROL_RANGES.reflectionDetail.step,
    inputStep: EFFECTS_CONTROL_RANGES.reflectionDetail.inputStep,
    hidden: controls.reflectionsEnabled !== true || !availability.reflectionDetail,
    disabled: reflectionDetailDisabled.value,
    onChanged: onReflectionDetailChanged,
  },
  {
    key: "reflectionDistance",
    title: $translate.instant("ui.photomode.advancedRender.reflectionDistance"),
    hint: $translate.instant("ui.photomode.advancedRender.reflectionDistanceHint"),
    min: EFFECTS_CONTROL_RANGES.reflectionDistance.min,
    max: EFFECTS_CONTROL_RANGES.reflectionDistance.max,
    step: EFFECTS_CONTROL_RANGES.reflectionDistance.step,
    inputStep: EFFECTS_CONTROL_RANGES.reflectionDistance.inputStep,
    hidden: controls.reflectionsEnabled !== true || !availability.reflectionDistance,
    disabled: reflectionDistanceDisabled.value,
    onChanged: onReflectionDistanceChanged,
  },
  {
    key: "ssaoContrast",
    title: $translate.instant("ui.photomode.SSAOContrast"),
    hint: $translate.instant("ui.photomode.effects.ssaoContrastHint"),
    min: EFFECTS_CONTROL_RANGES.ssaoContrast.min,
    max: EFFECTS_CONTROL_RANGES.ssaoContrast.max,
    step: EFFECTS_CONTROL_RANGES.ssaoContrast.step,
    inputStep: EFFECTS_CONTROL_RANGES.ssaoContrast.inputStep,
    hidden: controls.ssaoEnabled !== true || !availability.ssaoSettings,
    disabled: ssaoSettingsDisabled.value,
    onChanged: onSsaoContrastChanged,
  },
  {
    key: "ssaoRadius",
    title: $translate.instant("ui.photomode.SSAORadius"),
    hint: $translate.instant("ui.photomode.effects.ssaoRadiusHint"),
    min: EFFECTS_CONTROL_RANGES.ssaoRadius.min,
    max: EFFECTS_CONTROL_RANGES.ssaoRadius.max,
    step: EFFECTS_CONTROL_RANGES.ssaoRadius.step,
    inputStep: EFFECTS_CONTROL_RANGES.ssaoRadius.inputStep,
    hidden: controls.ssaoEnabled !== true || !availability.ssaoSettings,
    disabled: ssaoSettingsDisabled.value,
    onChanged: onSsaoRadiusChanged,
  },
].filter(row => !(row.key === "motionBlurStrength" && motionBlurHidden.value))))

const ssaoQualitySelectOptions = computed(() =>
  buildQualitySelectOptions(SSAO_QUALITY_OPTIONS, option => getSsaoQualityIndex(option.key))
)
const reflectionSizeOptions = computed(() => {
  const minValue = EFFECTS_CONTROL_RANGES.reflectionSizeLog2.min
  const maxValue = EFFECTS_CONTROL_RANGES.reflectionSizeLog2.max
  const maxIndex = maxValue - minValue

  return Array.from({ length: maxIndex + 1 }, (_, index) => {
    const value = minValue + index
    const size = Math.round(Math.pow(2, value))
    return {
      value,
      label: `${size} px`,
    }
  })
})

function rowsByKey(rows) {
  return Object.fromEntries(rows.map(row => [row.key, row]))
}

function pickRows(rows, keys) {
  return keys.map(key => rows[key]).filter(row => row && row.hidden !== true)
}

const effectControlGroups = computed(() => {
  const togglesByKey = rowsByKey(effectToggleRows.value)
  const slidersByKey = rowsByKey(effectSliderRows.value)

  const groups = [
    {
      key: "dof",
      title: $translate.instant("ui.options.graphics.PostFXDOFGeneralEnabled"),
      disabled: dofToggleDisabled.value && dofControlDisabled.value,
      toggles: pickRows(togglesByKey, ["dofEnabled", "dofAutofocus"]),
      sliders: pickRows(slidersByKey, [
        "dofMaxBlurNear",
        "dofMaxBlurFar",
        "dofFocusRange",
        "dofAperture",
        "dofFalloffSharpness",
      ]),
      qualityRows: [],
    },
    {
      key: "ssao",
      title: $translate.instant("ui.photomode.effects.ssao"),
      disabled: ssaoToggleDisabled.value && ssaoSettingsDisabled.value,
      toggles: pickRows(togglesByKey, ["ssaoEnabled"]),
      sliders: pickRows(slidersByKey, ["ssaoContrast", "ssaoRadius"]),
      qualityRows: isSimpleMenu.value
        ? []
        : [
            {
              key: "ssaoQualityIndex",
              title: $translate.instant("ui.photomode.SSAOQuality"),
              hint: $translate.instant("ui.photomode.ssaoQualityTooltip"),
              options: ssaoQualitySelectOptions.value,
              hidden: controls.ssaoEnabled !== true || !availability.ssaoSettings,
              disabled: ssaoSettingsDisabled.value,
              onChanged: onSsaoQualityChanged,
            },
          ],
    },
  ]

  if (!isSimpleMenu.value) {
    groups.push({
      key: "screen-space-shadows",
      title: $translate.instant("ui.photomode.screenSpaceShadows"),
      disabled: screenSpaceShadowsToggleDisabled.value,
      toggles: pickRows(togglesByKey, ["screenSpaceShadowsEnabled"]),
      sliders: [],
      qualityRows: [],
    })
  }

  if (!motionBlurHidden.value) {
    groups.push({
      key: "motion-blur",
      title: $translate.instant("ui.photomode.motionBlur"),
      disabled: motionBlurToggleDisabled.value && motionBlurStrengthDisabled.value,
      toggles: pickRows(togglesByKey, ["motionBlurEnabled"]),
      sliders: pickRows(slidersByKey, ["motionBlurStrength"]),
      qualityRows: [],
    })
  }

  if (!isSimpleMenu.value) {
    groups.push({
      key: "reflections",
      title: $translate.instant("ui.photomode.reflections"),
      disabled: reflectionsToggleDisabled.value && reflectionSizeDisabled.value && reflectionDetailDisabled.value && reflectionDistanceDisabled.value,
      toggles: pickRows(togglesByKey, ["reflectionsEnabled"]),
      sliders: pickRows(slidersByKey, ["reflectionDetail", "reflectionDistance"]),
      qualityRows: [
        {
          key: "reflectionSizeLog2",
          title: $translate.instant("ui.photomode.advancedRender.reflectionSize"),
          hint: $translate.instant("ui.photomode.advancedRender.reflectionSizeHint"),
          options: reflectionSizeOptions.value,
          hidden: controls.reflectionsEnabled !== true || !availability.reflectionSize,
          disabled: reflectionSizeDisabled.value,
          onChanged: onReflectionSizeChanged,
        },
      ],
    })

    groups.push({
      key: "flash",
      title: $translate.instant("ui.photomode.flash.title"),
      disabled: flashSettingsDisabled.value,
      toggles: [
        {
          key: "flashEnabled",
          label: $translate.instant("ui.photomode.flash.enable"),
          disabled: flashSettingsDisabled.value,
          onChanged: onFlashEnabledChanged,
        },
        {
          key: "flashFireOnCapture",
          label: $translate.instant("ui.photomode.flash.fireOnCapture"),
          hidden: controls.flashEnabled !== true,
          disabled: flashDetailsDisabled.value,
          onChanged: onFlashFireOnCaptureChanged,
        },
      ],
      sliders: flashSliderRows.value,
      qualityRows: [],
    })
  }

  return groups
    .map(group => ({
      ...group,
      toggles: group.toggles.filter(row => row.hidden !== true),
      sliders: group.sliders.filter(row => row.hidden !== true),
      qualityRows: group.qualityRows.filter(row => row.hidden !== true),
    }))
    .filter(group => group.toggles.length || group.sliders.length || group.qualityRows.length)
})
function getSsaoQualityIndex(mode) {
  const index = SSAO_QUALITY_OPTIONS.findIndex(option => option.key === mode)
  return index >= 0 ? index : 0
}

function getSsaoQualityOption(index) {
  const numericIndex = Math.round(clampNumber(index, 0, SSAO_QUALITY_OPTIONS.length - 1))
  return SSAO_QUALITY_OPTIONS[numericIndex] || SSAO_QUALITY_OPTIONS[0]
}

function hasDiscreteDefault(defaultValue) {
  return defaultsAvailable.value && Number.isFinite(Number(defaultValue))
}

function isDiscreteResetDisabled(currentValue, defaultValue, disabled) {
  const numericDefault = Number(defaultValue)
  return disabled || !Number.isFinite(numericDefault) || Number(currentValue) === numericDefault
}

const ssaoQualityLabel = computed(() => translateQualityOption(getSsaoQualityOption(controls.ssaoQualityIndex)))

function applyRemoteState(effectsState) {
  if (!effectsState || typeof effectsState !== "object") return

  availability.dof = effectsState?.availability?.dof === true
  availability.ssao = effectsState?.availability?.ssao === true
  availability.ssaoSettings = effectsState?.availability?.ssaoSettings === true
  availability.screenSpaceShadows = effectsState?.availability?.screenSpaceShadows === true
  availability.motionBlur = effectsState?.availability?.motionBlur === true
  availability.reflections = effectsState?.availability?.reflections === true
  availability.reflectionSize = effectsState?.availability?.reflectionSize === true
  availability.reflectionDetail = effectsState?.availability?.reflectionDetail === true
  availability.reflectionDistance = effectsState?.availability?.reflectionDistance === true
  defaultsAvailable.value = effectsState?.defaultsAvailable === true

  const nextDefaults = effectsState?.defaults
  if (nextDefaults && typeof nextDefaults === "object") {
    if (Number.isFinite(Number(nextDefaults.dofMaxBlurNear))) defaults.dofMaxBlurNear = Number(nextDefaults.dofMaxBlurNear)
    if (Number.isFinite(Number(nextDefaults.dofMaxBlurFar))) defaults.dofMaxBlurFar = Number(nextDefaults.dofMaxBlurFar)
    if (Number.isFinite(Number(nextDefaults.dofFocusRange))) defaults.dofFocusRange = Number(nextDefaults.dofFocusRange)
    if (Number.isFinite(Number(nextDefaults.dofAperture))) { defaults.dofAperture = Number(nextDefaults.dofAperture)}
    if (Number.isFinite(Number(nextDefaults.dofFalloffSharpness))) { defaults.dofFalloffSharpness = Number(nextDefaults.dofFalloffSharpness)}
    if (Number.isFinite(Number(nextDefaults.motionBlurStrength))) defaults.motionBlurStrength = Number(nextDefaults.motionBlurStrength)
    if (Number.isFinite(Number(nextDefaults.ssaoContrast))) defaults.ssaoContrast = Number(nextDefaults.ssaoContrast)
    if (Number.isFinite(Number(nextDefaults.ssaoRadius))) defaults.ssaoRadius = Number(nextDefaults.ssaoRadius)
    defaults.reflectionSizeLog2 = Number.isFinite(Number(nextDefaults.reflectionSizeLog2)) ? Number(nextDefaults.reflectionSizeLog2) : NaN
    defaults.reflectionDetail = Number.isFinite(Number(nextDefaults.reflectionDetail)) ? Number(nextDefaults.reflectionDetail) : NaN
    defaults.reflectionDistance = Number.isFinite(Number(nextDefaults.reflectionDistance)) ? Number(nextDefaults.reflectionDistance) : NaN
    defaults.ssaoQualityIndex = typeof nextDefaults.ssaoQualityMode === "string"
      ? getSsaoQualityIndex(nextDefaults.ssaoQualityMode)
      : NaN
    FLASH_SLIDER_CONFIG.forEach(row => {
      defaults[row.key] = NaN
    })
    const nextFlashDefaults = nextDefaults.flash
    if (nextFlashDefaults && typeof nextFlashDefaults === "object") {
      FLASH_SLIDER_CONFIG.forEach(row => {
        defaults[row.key] = Number.isFinite(Number(nextFlashDefaults[row.patchKey]))
          ? clampNumber(nextFlashDefaults[row.patchKey], row.min, row.max, controls[row.key])
          : NaN
      })
    }
  }

  if (typeof effectsState.dofEnabled === "boolean") controls.dofEnabled = effectsState.dofEnabled
  if (typeof effectsState.dofAutofocus === "boolean") controls.dofAutofocus = effectsState.dofAutofocus
  if (!editing.dofMaxBlurNear && Number.isFinite(Number(effectsState.dofMaxBlurNear))) {
    controls.dofMaxBlurNear = clampNumber(
      effectsState.dofMaxBlurNear,
      EFFECTS_CONTROL_RANGES.dofMaxBlurNear.min,
      EFFECTS_CONTROL_RANGES.dofMaxBlurNear.max,
      controls.dofMaxBlurNear
    )
  }
  if (!editing.dofMaxBlurFar && Number.isFinite(Number(effectsState.dofMaxBlurFar))) {
    controls.dofMaxBlurFar = clampNumber(
      effectsState.dofMaxBlurFar,
      EFFECTS_CONTROL_RANGES.dofMaxBlurFar.min,
      EFFECTS_CONTROL_RANGES.dofMaxBlurFar.max,
      controls.dofMaxBlurFar
    )
  }
  if (!editing.dofFocusRange && Number.isFinite(Number(effectsState.dofFocusRange))) {
    controls.dofFocusRange = clampNumber(
      effectsState.dofFocusRange,
      EFFECTS_CONTROL_RANGES.dofFocusRange.min,
      EFFECTS_CONTROL_RANGES.dofFocusRange.max,
      controls.dofFocusRange
    )
  }
  if (!editing.dofAperture && Number.isFinite(Number(effectsState.dofAperture))) {
    controls.dofAperture = clampNumber(
      effectsState.dofAperture,
      EFFECTS_CONTROL_RANGES.dofAperture.min,
      EFFECTS_CONTROL_RANGES.dofAperture.max,
      controls.dofAperture
    )
  }

  if (!editing.dofFalloffSharpness && Number.isFinite(Number(effectsState.dofFalloffSharpness))) {
    controls.dofFalloffSharpness = clampNumber(
      effectsState.dofFalloffSharpness,
      EFFECTS_CONTROL_RANGES.dofFalloffSharpness.min,
      EFFECTS_CONTROL_RANGES.dofFalloffSharpness.max,
      controls.dofFalloffSharpness
    )
  }
  if (typeof effectsState.ssaoEnabled === "boolean") controls.ssaoEnabled = effectsState.ssaoEnabled
  if (!editing.ssaoContrast && Number.isFinite(Number(effectsState.ssaoContrast))) {
    controls.ssaoContrast = clampNumber(
      effectsState.ssaoContrast,
      EFFECTS_CONTROL_RANGES.ssaoContrast.min,
      EFFECTS_CONTROL_RANGES.ssaoContrast.max,
      controls.ssaoContrast
    )
  }

  if (!editing.ssaoRadius && Number.isFinite(Number(effectsState.ssaoRadius))) {
    controls.ssaoRadius = clampNumber(
      effectsState.ssaoRadius,
      EFFECTS_CONTROL_RANGES.ssaoRadius.min,
      EFFECTS_CONTROL_RANGES.ssaoRadius.max,
      controls.ssaoRadius
    )
  }

  if (typeof effectsState.ssaoQualityMode === "string") {
    controls.ssaoQualityIndex = getSsaoQualityIndex(effectsState.ssaoQualityMode)
  }
  if (typeof effectsState.screenSpaceShadowsEnabled === "boolean") {
    controls.screenSpaceShadowsEnabled = effectsState.screenSpaceShadowsEnabled
  }
  if (typeof effectsState.motionBlurEnabled === "boolean") controls.motionBlurEnabled = effectsState.motionBlurEnabled
  if (!editing.motionBlurStrength && Number.isFinite(Number(effectsState.motionBlurStrength))) {
    controls.motionBlurStrength = clampNumber(
      effectsState.motionBlurStrength,
      EFFECTS_CONTROL_RANGES.motionBlurStrength.min,
      EFFECTS_CONTROL_RANGES.motionBlurStrength.max,
      controls.motionBlurStrength
    )
  }
  if (typeof effectsState.reflectionsEnabled === "boolean") controls.reflectionsEnabled = effectsState.reflectionsEnabled
  if (Number.isFinite(Number(effectsState.reflectionSizeLog2))) {
    controls.reflectionSizeLog2 = Math.round(
      clampNumber(
        effectsState.reflectionSizeLog2,
        EFFECTS_CONTROL_RANGES.reflectionSizeLog2.min,
        EFFECTS_CONTROL_RANGES.reflectionSizeLog2.max,
        controls.reflectionSizeLog2
      )
    )
  }
  if (!editing.reflectionDetail && Number.isFinite(Number(effectsState.reflectionDetail))) {
    controls.reflectionDetail = clampNumber(
      effectsState.reflectionDetail,
      EFFECTS_CONTROL_RANGES.reflectionDetail.min,
      EFFECTS_CONTROL_RANGES.reflectionDetail.max,
      controls.reflectionDetail
    )
  }
  if (!editing.reflectionDistance && Number.isFinite(Number(effectsState.reflectionDistance))) {
    controls.reflectionDistance = clampNumber(
      effectsState.reflectionDistance,
      EFFECTS_CONTROL_RANGES.reflectionDistance.min,
      EFFECTS_CONTROL_RANGES.reflectionDistance.max,
      controls.reflectionDistance
    )
  }
  if (effectsState?.flash) applyFlashRemoteState(effectsState)

  if (!hasLoadedState.value) {
    hasLoadedState.value = [
      effectsState.dofMaxBlurNear,
      effectsState.dofMaxBlurFar,
      effectsState.dofFocusRange,
      effectsState.dofAperture,
      effectsState.dofFalloffSharpness,
      effectsState.ssaoContrast,
      effectsState.ssaoRadius,
      effectsState.motionBlurStrength,
      effectsState.reflectionSizeLog2,
      effectsState.reflectionDetail,
      effectsState.reflectionDistance,
    ].some(value => Number.isFinite(Number(value)))
      || typeof effectsState.ssaoQualityMode === "string"
      || typeof effectsState.screenSpaceShadowsEnabled === "boolean"
  }
}

function applyFlashRemoteState(captureState) {
  const flashState = captureState?.flash
  if (!flashState || typeof flashState !== "object") return

  if (typeof flashState.enabled === "boolean") controls.flashEnabled = flashState.enabled
  if (typeof flashState.fireOnCapture === "boolean") controls.flashFireOnCapture = flashState.fireOnCapture

  FLASH_SLIDER_CONFIG.forEach(row => {
    const value = flashState[row.patchKey]
    if (editing[row.key] || !Number.isFinite(Number(value))) return
    controls[row.key] = clampNumber(value, row.min, row.max, controls[row.key])
  })
}

function onPresetApplied(result) {
  if (result?.state) {
    clearEditingFlags()
    applyRemoteState(result.state)
    syncState.value = "ready"
    syncErrorReason.value = ""
    return
  }

  void refreshEffectsState()
}

async function refreshFlashState() {
  if (flashPollInFlight || !props.sessionActive || !props.effectsEnabled || isSimpleMenu.value) return

  flashPollInFlight = true
  try {
    const captureState = await lua.extensions.ui_pause_photomode.getCaptureState()
    if (!props.sessionActive || !props.effectsEnabled) return
    if (captureState?.ok === false) return
    applyFlashRemoteState(captureState)
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || "flash_state_error"
  } finally {
    flashPollInFlight = false
  }
}

async function submitEffectsUpdate(partialState, sourceName) {
  if (controlDisabled.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode.setEffectsState(partialState)
    if (result?.ok === false) {
      if (result?.state) applyRemoteState(result.state)
      syncState.value = "error"
      syncErrorReason.value = result.reason || sourceName
      return
    }

    if (result?.state) {
      applyRemoteState(result.state)
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || sourceName
  }
}

async function submitFlashUpdate(partialFlashState, sourceName) {
  if (controlDisabled.value || isSimpleMenu.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode.setCaptureState({
      flash: partialFlashState,
    })
    if (result?.state) applyFlashRemoteState(result.state)
    if (result?.ok === false) {
      syncState.value = "error"
      syncErrorReason.value = result.reason || sourceName
      return
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || sourceName
  }
}

function onDofToggleChanged(value) {
  controls.dofEnabled = value === true
  void submitEffectsUpdate({ dofEnabled: controls.dofEnabled }, "dofEnabled")
}

function onDofAutofocusChanged(value) {
  controls.dofAutofocus = value === true
  void submitEffectsUpdate({ dofAutofocus: controls.dofAutofocus }, "dofAutofocus")
}

function onDofMaxBlurNearChanged(value) {
  controls.dofMaxBlurNear = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.dofMaxBlurNear.min,
    EFFECTS_CONTROL_RANGES.dofMaxBlurNear.max,
    controls.dofMaxBlurNear
  )
  void submitEffectsUpdate({ dofMaxBlurNear: controls.dofMaxBlurNear }, "dofMaxBlurNear")
}

function onDofMaxBlurFarChanged(value) {
  controls.dofMaxBlurFar = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.dofMaxBlurFar.min,
    EFFECTS_CONTROL_RANGES.dofMaxBlurFar.max,
    controls.dofMaxBlurFar
  )
  void submitEffectsUpdate({ dofMaxBlurFar: controls.dofMaxBlurFar }, "dofMaxBlurFar")
}

function onDofFocusRangeChanged(value) {
  controls.dofFocusRange = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.dofFocusRange.min,
    EFFECTS_CONTROL_RANGES.dofFocusRange.max,
    controls.dofFocusRange
  )
  void submitEffectsUpdate({ dofFocusRange: controls.dofFocusRange }, "dofFocusRange")
}

function onDofApertureChanged(value) {
  controls.dofAperture = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.dofAperture.min,
    EFFECTS_CONTROL_RANGES.dofAperture.max,
    controls.dofAperture
  )

  void submitEffectsUpdate({
    dofAperture: controls.dofAperture,
  }, "dofAperture")
}

function onDofFalloffSharpnessChanged(value) {
  controls.dofFalloffSharpness = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.dofFalloffSharpness.min,
    EFFECTS_CONTROL_RANGES.dofFalloffSharpness.max,
    controls.dofFalloffSharpness
  )

  void submitEffectsUpdate({
    dofFalloffSharpness: controls.dofFalloffSharpness,
  }, "dofFalloffSharpness")
}

function onSsaoToggleChanged(value) {
  controls.ssaoEnabled = value === true
  void submitEffectsUpdate({ ssaoEnabled: controls.ssaoEnabled }, "ssaoEnabled")
}

function onSsaoContrastChanged(value) {
  controls.ssaoContrast = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.ssaoContrast.min,
    EFFECTS_CONTROL_RANGES.ssaoContrast.max,
    controls.ssaoContrast
  )

  void submitEffectsUpdate({ ssaoContrast: controls.ssaoContrast }, "ssaoContrast")
}

function onSsaoRadiusChanged(value) {
  controls.ssaoRadius = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.ssaoRadius.min,
    EFFECTS_CONTROL_RANGES.ssaoRadius.max,
    controls.ssaoRadius
  )

  void submitEffectsUpdate({ ssaoRadius: controls.ssaoRadius }, "ssaoRadius")
}

function onSsaoQualityChanged(value) {
  controls.ssaoQualityIndex = Math.round(
    clampNumber(value, 0, SSAO_QUALITY_OPTIONS.length - 1, controls.ssaoQualityIndex)
  )

  const selectedOption = getSsaoQualityOption(controls.ssaoQualityIndex)

  void submitEffectsUpdate({ ssaoQualityMode: selectedOption.key }, "ssaoQualityMode")
}

function onScreenSpaceShadowsToggleChanged(value) {
  controls.screenSpaceShadowsEnabled = value === true

  void submitEffectsUpdate({
    screenSpaceShadowsEnabled: controls.screenSpaceShadowsEnabled,
  }, "screenSpaceShadowsEnabled")
}

function onMotionBlurToggleChanged(value) {
  controls.motionBlurEnabled = value === true
  void submitEffectsUpdate({ motionBlurEnabled: controls.motionBlurEnabled }, "motionBlurEnabled")
}

function onMotionBlurStrengthChanged(value) {
  controls.motionBlurStrength = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.motionBlurStrength.min,
    EFFECTS_CONTROL_RANGES.motionBlurStrength.max,
    controls.motionBlurStrength
  )
  void submitEffectsUpdate({ motionBlurStrength: controls.motionBlurStrength }, "motionBlurStrength")
}

function onReflectionsToggleChanged(value) {
  controls.reflectionsEnabled = value === true
  void submitEffectsUpdate({ reflectionsEnabled: controls.reflectionsEnabled }, "reflectionsEnabled")
}

function onReflectionSizeChanged(value) {
  controls.reflectionSizeLog2 = Math.round(
    clampNumber(
      value,
      EFFECTS_CONTROL_RANGES.reflectionSizeLog2.min,
      EFFECTS_CONTROL_RANGES.reflectionSizeLog2.max,
      controls.reflectionSizeLog2
    )
  )
  void submitEffectsUpdate({ reflectionSizeLog2: controls.reflectionSizeLog2 }, "reflectionSizeLog2")
}

function onReflectionDetailChanged(value) {
  controls.reflectionDetail = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.reflectionDetail.min,
    EFFECTS_CONTROL_RANGES.reflectionDetail.max,
    controls.reflectionDetail
  )
  void submitEffectsUpdate({ reflectionDetail: controls.reflectionDetail }, "reflectionDetail")
}

function onReflectionDistanceChanged(value) {
  controls.reflectionDistance = clampNumber(
    value,
    EFFECTS_CONTROL_RANGES.reflectionDistance.min,
    EFFECTS_CONTROL_RANGES.reflectionDistance.max,
    controls.reflectionDistance
  )
  void submitEffectsUpdate({ reflectionDistance: controls.reflectionDistance }, "reflectionDistance")
}

function onFlashEnabledChanged(value) {
  controls.flashEnabled = value === true
  void submitFlashUpdate({ enabled: controls.flashEnabled }, "flash_enabled_update_failed")
}

function onFlashFireOnCaptureChanged(value) {
  controls.flashFireOnCapture = value === true
  void submitFlashUpdate({ fireOnCapture: controls.flashFireOnCapture }, "flash_fire_on_capture_update_failed")
}

function onFlashSliderChanged(row, value) {
  controls[row.key] = clampNumber(value, row.min, row.max, controls[row.key])
  void submitFlashUpdate({ [row.patchKey]: controls[row.key] }, `flash_${row.patchKey}_update_failed`)
}

watch(
  () => [props.sessionActive, props.effectsEnabled],
  ([sessionActive, effectsEnabled]) => {
    if (!sessionActive) {
      hasLoadedState.value = false
      defaultsAvailable.value = false
      availability.dof = false
      availability.ssao = false
      availability.ssaoSettings = false
      availability.screenSpaceShadows = false
      availability.motionBlur = false
      availability.reflections = false
      availability.reflectionSize = false
      availability.reflectionDetail = false
      availability.reflectionDistance = false

      defaults.dofMaxBlurNear = NaN
      defaults.dofMaxBlurFar = NaN
      defaults.dofFocusRange = NaN
      defaults.dofAperture = NaN
      defaults.dofFalloffSharpness = NaN
      defaults.ssaoContrast = NaN
      defaults.ssaoRadius = NaN
      defaults.ssaoQualityIndex = NaN
      defaults.motionBlurStrength = NaN
      defaults.reflectionSizeLog2 = NaN
      defaults.reflectionDetail = NaN
      defaults.reflectionDistance = NaN
      controls.flashEnabled = false
      controls.flashFireOnCapture = false
      return
    }

    if (effectsEnabled) {
      void refreshEffectsState()
      void refreshFlashState()
    }
  },
  { immediate: true }
)

watch(
  () => [props.panelActive, props.sessionActive, props.effectsEnabled],
  ([panelActive, sessionActive, effectsEnabled]) => {
    if (panelActive && sessionActive && effectsEnabled) {
      startPolling()
      return
    }

    stopPolling()
    clearEditingFlags()

    if (!effectsEnabled) {
      syncState.value = "error"
      syncErrorReason.value = "effects_unavailable"
      return
    }

    syncState.value = "idle"
    syncErrorReason.value = ""
  },
  { immediate: true }
)

</script>

<style lang="scss" scoped>
@use "./sharedRows";

.photomode-effects-section__groups {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.photomode-effects-section__flash-hint {
  margin: 0;
  font-size: 0.78em;
  color: rgba(var(--bng-off-white-rgb), 0.62);
}

</style>
