<template>
  <PhotomodeSectionShell
    class="photomode-capture-section"
    :disabled="captureSectionDisabled"
  >
    <template #readouts>
      <PhotomodeReadoutGrid
        :columns="isSimpleMenu ? 2 : 3"
        :medium-columns="isSimpleMenu ? 2 : 3"
        :compact-columns="2"
        :narrow-columns="1"
      >
        <PhotomodeReadoutCard
          v-for="readout in captureReadouts"
          :key="readout.key"
          :label="readout.label"
          :value="readout.value"
          :secondary="readout.secondary || ''"
        />
      </PhotomodeReadoutGrid>
    </template>

    <BngGroupPanel
      :title="$t('ui.photomode.resolutionPreset')"
      title-id="photomode-capture-section-resolution-preset-title"
    >
      <BngRow
        v-if="resolutionPresetVisible && !isSimpleMenu"
        class="photomode-scene-section_select"
        :label="$t('ui.photomode.resolutionPreset')"
        :tooltip="resolutionPresetHintText"
        :disabled="resolutionPresetDisabled"
      >
        <div class="photomode-capture-section__resolution-control">
          <BngDropdown
            v-model="selectedResolutionPresetId"
            :items="resolutionPresetItems"
            :disabled="resolutionPresetDisabled"
            long-names="wrap"
            @valueChanged="onResolutionPresetChanged"
          />
          <p v-if="resolutionPresetCurrentWindowLabel" class="photomode-capture-section__note">
            {{ resolutionPresetCurrentWindowLabel }}
          </p>
        </div>
      </BngRow>

      <div v-if="!isSimpleMenu" class="photomode-capture-section__controls">
        <BngRow
          v-for="row in captureControlRows"
          :key="row.key"
          class="photomode-scene-section_input"
          :label="row.title"
          :tooltip="row.hint"
          :disabled="captureSectionDisabled"
        >
          <BngSlider
            v-model="controls[row.key]"
            :min="row.min"
            :max="row.max"
            :step="1"
            :input-step="1"
            :disabled="captureSectionDisabled"
            :debounce="0"
            with-input
            @valueChanged="row.onChanged"
            @focus="markFieldEditing(row.key, true)"
            @blur="markFieldEditing(row.key, false)"
          />
        </BngRow>
      </div>
    </BngGroupPanel>

    <BngGroupPanel
      v-if="warningActive"
      :title="$t('ui.photomode.highSupersamplingWarning')"
      title-id="photomode-capture-warning-title"
      :hint="warningLabel"
      :disabled="captureSectionDisabled"
      chrome
    />

    <div class="photomode-capture-section__groups">
      <BngGroupPanel
        :title="$t('ui.photomode.captureOptions')"
        title-id="photomode-capture-options-title"
        :disabled="captureSectionDisabled"
      >
        <BngRow
          v-if="showUploadCaptureSwitch"
          class="photomode-scene-section_toggle"
          :label="$t('ui.photomode.upload')"
          :tooltip="$t('ui.garage.photo.uploadToBeamng')"
          :disabled="uploadSwitchDisabled"
          @activate="onUploadCaptureChanged(!uploadEnabled)"
        >
          <PhotomodeToggleControl
            :checked="uploadEnabled"
            :disabled="uploadSwitchDisabled"
          />
        </BngRow>

        <BngRow
          v-if="showSteamCaptureSwitch"
          class="photomode-scene-section_toggle"
          :label="$t('ui.photomode.steam')"
          :tooltip="$t('ui.garage.photo.uploadToSteam')"
          :disabled="steamSwitchDisabled"
          @activate="onSteamCaptureChanged(!steamEnabled)"
        >
          <PhotomodeToggleControl
            :checked="steamEnabled"
            :disabled="steamSwitchDisabled"
          />
        </BngRow>

        <BngRow
          v-if="!isSimpleMenu"
          class="photomode-scene-section_toggle"
          :class="{ 'wide-hint': hdrDisabledReasonLabel }"
          :label="$t('ui.photomode.capture.hdrScreenshot')"
          :tooltip="$t('ui.photomode.capture.hdrHint')"
          :disabled="hdrSwitchDisabled"
          @activate="onHdrScreenshotChanged(!controls.hdrScreenshot)"
        >
          <p v-if="hdrDisabledReasonLabel" class="photomode-capture-section__note">
            {{ hdrDisabledReasonLabel }}
          </p>
          <PhotomodeToggleControl
            v-else
            :checked="controls.hdrScreenshot"
            :disabled="hdrSwitchDisabled"
          />
        </BngRow>

        <template v-if="showMotionCaptureControls">
          <BngRow
            class="photomode-scene-section_toggle"
            :class="{ 'wide-hint': captureWithMotionDisabled }"
            :label="$t('ui.photomode.capture.captureWithMotion')"
            :tooltip="$t('ui.photomode.capture.captureWithMotionHint')"
            :disabled="captureWithMotionDisabled"
            @activate="onCaptureWithMotionChanged(!controls.captureWithMotion)"
          >
            <p v-if="captureWithMotionDisabled" class="photomode-capture-section__note">
              {{ $t('ui.photomode.capture.captureWithMotionDisabled') }}
            </p>
            <PhotomodeToggleControl
              v-else
              :checked="controls.captureWithMotion"
              :disabled="captureWithMotionDisabled"
            />
          </BngRow>

          <BngRow
            v-if="!captureWithMotionDisabled"
            class="photomode-scene-section_select"
            :label="$t('ui.photomode.capture.motionBehavior')"
            :tooltip="$t('ui.photomode.capture.motionHint')"
            :disabled="motionBehaviorDisabled"
          >
            <BngSelect
              v-model="controls.motionBehavior"
              class="photomode-capture-section__motion-behavior-select"
              :options="motionBehaviorOptions"
              :config="MOTION_BEHAVIOR_SELECT_CONFIG"
              :disabled="motionBehaviorDisabled"
              text-scroller
              @valueChanged="onMotionBehaviorChanged"
            />
          </BngRow>
        </template>

        <template v-if="!isSimpleMenu">
          <BngRow
            v-for="row in artifactToggleRows"
            :key="row.key"
            class="photomode-scene-section_toggle"
            :label="row.label"
            :tooltip="row.tooltip"
            :disabled="captureSectionDisabled"
            @activate="row.onChanged(!controls[row.key])"
          >
            <PhotomodeToggleControl
              :checked="controls[row.key]"
              :disabled="captureSectionDisabled"
            />
          </BngRow>
        </template>
      </BngGroupPanel>
    </div>
  </PhotomodeSectionShell>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, unref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngDropdown, BngGroupPanel, BngRow, BngSelect, BngSlider } from "@/common/components/base"
import { lua } from "@/bridge"
import PhotomodeReadoutCard from "./PhotomodeReadoutCard.vue"
import PhotomodeReadoutGrid from "./PhotomodeReadoutGrid.vue"
import PhotomodeSectionShell from "./PhotomodeSectionShell.vue"
import PhotomodeToggleControl from "./PhotomodeToggleControl.vue"
import { clampNumber } from "@/utils/maths"
import { usePhotomodePolledSection } from "../usePhotomodePolledSection"

defineOptions({ name: "PhotomodeCaptureSection" })

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
  captureEnabled: {
    type: Boolean,
    default: false,
  },
  captureState: {
    type: String,
    default: "idle",
  },
})

const emit = defineEmits([
  "select-resolution-preset",
  "capture-options-change",
])

const CAPTURE_STATE_POLL_MS = 500
const CAPTURE_OPTIONS_STORAGE_KEY = "photomode.captureActions.switches.v1"
const MOTION_BEHAVIOR_SELECT_CONFIG = Object.freeze({
  value: option => option.value,
  label: option => option.label,
})
const controls = reactive({
  superSampling: 2,
  downscaleLevel: 2,
  captureWithMotion: false,
  motionBehavior: "followVehicle",
  splitSceneVehicle: false,
  saveNormalDepth: false,
  hdrScreenshot: false,
})
const SIMPLE_MENU_CAPTURE_DEFAULTS = Object.freeze({
  superSampling: 1,
  downscaleLevel: 1,
})
const {
  editing,
  hasLoadedState,
  syncState,
  syncErrorReason,
  markFieldEditing,
  startPolling,
  stopPolling,
} = usePhotomodePolledSection({
  pollMs: CAPTURE_STATE_POLL_MS,
  editingFields: ["superSampling", "downscaleLevel"],
  request: () => lua.extensions.ui_pause_photomode.getCaptureState(),
  applyState: captureState => applyRemoteState(captureState),
  isEnabled: () => props.sessionActive && props.panelActive && captureSectionEnabled.value,
  unavailableReason: "capture_state_unavailable",
  errorReason: "capture_state_error",
  applyOnError: true,
})
const limits = reactive({
  superSamplingMin: 1,
  superSamplingMax: 8,
  downscaleLevelMin: 1,
  downscaleLevelMax: 8,
})
const unavailableReadout = () => $translate.instant("ui.photomode.capture.unavailable")
const readouts = reactive({
  currentWindowLabel: unavailableReadout(),
  renderTargetLabel: unavailableReadout(),
  outputResolutionLabel: unavailableReadout(),
  formatLabel: unavailableReadout(),
  aspectLabel: unavailableReadout(),
  outputSizeLabel: unavailableReadout(),
  outputSizeRangeLabel: "",
  actionHintLabel: "",
})
const warning = reactive({
  active: false,
  label: "",
})
const hdrState = reactive({
  disabled: true,
  reasonLabel: "",
})
const motionState = reactive({
  disabled: true,
})

const selectedResolutionPresetId = ref("current")
const simpleMenuCaptureDefaultsApplied = ref(false)
const uploadEnabled = ref(false)
const steamEnabled = ref(false)

const captureSectionEnabled = computed(() => props.payload?.capabilities?.sections?.capture === true)
const captureMediaActions = computed(() => props.payload?.mediaActions?.capture || {})
const uploadCaptureAction = computed(() => captureMediaActions.value?.upload || {})
const steamCaptureAction = computed(() => captureMediaActions.value?.steam || {})
const uploadCaptureVisible = computed(() => uploadCaptureAction.value?.visible === true)
const steamCaptureVisible = computed(() => steamCaptureAction.value?.visible === true)
const showUploadCaptureSwitch = computed(() =>
  captureSectionEnabled.value && !isSimpleMenu.value && uploadCaptureVisible.value
)
const showSteamCaptureSwitch = computed(() =>
  captureSectionEnabled.value && !isSimpleMenu.value && steamCaptureVisible.value
)
const resolutionPresetState = computed(() => props.payload?.resolutionPresets || {})
const resolutionPresetFeatureEnabled = computed(() => props.payload?.capabilities?.features?.resolutionPresets === true)
const resolutionPresetVisible = computed(() => resolutionPresetFeatureEnabled.value && resolutionPresetState.value?.visible === true)
const resolutionPresetItems = computed(() => Array.isArray(resolutionPresetState.value?.items) ? resolutionPresetState.value.items : [])
const resolutionPresetCurrentWindowLabel = computed(() => resolutionPresetState.value?.currentWindowLabel || "")
const resolutionPresetEnabled = computed(() => resolutionPresetState.value?.enabled === true)
const motionCaptureFeatureEnabled = computed(() => props.payload?.capabilities?.features?.motionBlurCapture === true)
const captureSectionDisabled = computed(() =>
  !captureSectionEnabled.value || !props.sessionActive || !props.panelActive || props.captureState === "preparing"
)
const captureActionDisabled = computed(() =>
  !captureSectionEnabled.value || !props.captureEnabled || props.captureState === "preparing"
)
const uploadCaptureDisabled = computed(() =>
  captureActionDisabled.value ||
  !showUploadCaptureSwitch.value ||
  uploadCaptureAction.value?.enabled !== true
)
const steamCaptureDisabled = computed(() =>
  captureActionDisabled.value ||
  !showSteamCaptureSwitch.value ||
  steamCaptureAction.value?.enabled !== true
)
const uploadSwitchDisabled = computed(() =>
  !showUploadCaptureSwitch.value || uploadCaptureAction.value?.enabled !== true
)
const steamSwitchDisabled = computed(() =>
  !showSteamCaptureSwitch.value || steamCaptureAction.value?.enabled !== true
)
const resolutionPresetDisabled = computed(() =>
  captureSectionDisabled.value || !resolutionPresetEnabled.value || resolutionPresetItems.value.length === 0
)
const resolutionPresetHintText = computed(() => {
  if (!resolutionPresetVisible.value) return ""
  if (!resolutionPresetEnabled.value) return $translate.instant("ui.photomode.capture.resolutionPresetUnavailable")
  return resolutionPresetState.value?.followUpBehaviorLabel
    || $translate.instant("ui.photomode.capture.resolutionPresetApplied")
})
const captureReadouts = computed(() => {
  const outputResolutionReadout = splitMegapixelReadout(readouts.outputResolutionLabel)
  const rows = [
    {
      key: "outputResolution",
      label: $translate.instant("ui.photomode.capture.outputFile"),
      value: outputResolutionReadout.value,
      secondary: outputResolutionReadout.secondary,
    },
    {
      key: "aspect",
      label: $translate.instant("ui.photomode.capture.aspect"),
      value: readouts.aspectLabel,
    },
  ]

  if (!isSimpleMenu.value) {
    const currentWindowReadout = splitMegapixelReadout(readouts.currentWindowLabel)
    const renderTargetReadout = splitMegapixelReadout(readouts.renderTargetLabel)
    rows.unshift(
      {
        key: "currentWindow",
        label: $translate.instant("ui.photomode.capture.currentWindow"),
        value: currentWindowReadout.value,
        secondary: currentWindowReadout.secondary,
      },
      {
        key: "renderTarget",
        label: $translate.instant("ui.photomode.capture.renderTarget"),
        value: renderTargetReadout.value,
        secondary: renderTargetReadout.secondary,
      }
    )

    rows.push(
      {
        key: "format",
        label: $translate.instant("ui.photomode.capture.format"),
        value: readouts.formatLabel,
      },
      {
        key: "outputSize",
        label: $translate.instant("ui.photomode.capture.approxSize"),
        value: readouts.outputSizeLabel,
        secondary: readouts.outputSizeRangeLabel,
      }
    )
  }

  return rows
})

function splitMegapixelReadout(label) {
  const match = String(label || "").match(/^(.*?)\s+(\([^)]*MP\))$/)
  if (!match) return { value: label, secondary: "" }
  return {
    value: match[1],
    secondary: match[2],
  }
}

const captureControlRows = computed(() => [
  {
    key: "superSampling",
    title: $translate.instant("ui.photomode.supersampling"),
    hint: superSamplingHintLabel.value,
    min: limits.superSamplingMin,
    max: limits.superSamplingMax,
    onChanged: onSuperSamplingChanged,
  },
  {
    key: "downscaleLevel",
    title: $translate.instant("ui.photomode.capture.downscaleRescale"),
    hint: downscaleHintLabel.value,
    min: limits.downscaleLevelMin,
    max: limits.downscaleLevelMax,
    onChanged: onDownscaleLevelChanged,
  },
])
const artifactToggleRows = computed(() => [
  {
    key: "splitSceneVehicle",
    label: $translate.instant("ui.photomode.splitSceneVehicle"),
    tooltip: $translate.instant("ui.photomode.splitSceneVehicleTooltip"),
    onChanged: onSplitSceneVehicleChanged,
  },
  {
    key: "saveNormalDepth",
    label: $translate.instant("ui.photomode.saveNormalDepth"),
    tooltip: $translate.instant("ui.photomode.saveNormalDepthTooltip"),
    onChanged: onSaveNormalDepthChanged,
  },
])
const warningActive = computed(() => warning.active === true)
const warningLabel = computed(() => warning.label || "")
const superSamplingHintLabel = computed(() => $translate.instant("ui.photomode.supersamplingTooltip"))
const downscaleHintLabel = computed(() => $translate.instant("ui.photomode.downscaleTooltip"))
const hdrSwitchDisabled = computed(() => captureSectionDisabled.value || hdrState.disabled)
const hdrDisabledReasonLabel = computed(() => hdrState.reasonLabel || "")
const showMotionCaptureControls = computed(() => !isSimpleMenu.value && motionCaptureFeatureEnabled.value)
const captureWithMotionDisabled = computed(() =>
  captureSectionDisabled.value || !motionCaptureFeatureEnabled.value || motionState.disabled
)
const motionBehaviorDisabled = computed(() =>
  captureWithMotionDisabled.value || controls.captureWithMotion !== true
)
const motionBehaviorOptions = computed(() => [
  {
    value: "static",
    label: $translate.instant("ui.photomode.capture.motionBehavior.static"),
  },
  {
    value: "followVehicle",
    label: $translate.instant("ui.photomode.capture.motionBehavior.followVehicle"),
  },
  {
    value: "followVehicleWithRotation",
    label: $translate.instant("ui.photomode.capture.motionBehavior.followVehicleWithRotation"),
  },
])

watch(
  () => resolutionPresetState.value?.selectedId,
  selectedId => {
    selectedResolutionPresetId.value = typeof selectedId === "string" && selectedId.length > 0 ? selectedId : "current"
  },
  { immediate: true }
)

watch(
  () => props.payload?.capture,
  captureState => {
    applyRemoteState(captureState)
  },
  { immediate: true }
)

watch(
  () => [props.sessionActive, props.panelActive, captureSectionEnabled.value].join(":"),
  () => {
    if (props.sessionActive && props.panelActive && captureSectionEnabled.value) {
      startPolling()
      return
    }
    stopPolling()
  },
  { immediate: true }
)

watch(
  () => [
    isSimpleMenu.value,
    props.sessionActive,
    captureSectionEnabled.value,
    props.captureState,
  ],
  ([simpleMenuActive, sessionActive, captureEnabled]) => {
    if (!sessionActive || !simpleMenuActive) {
      simpleMenuCaptureDefaultsApplied.value = false
      return
    }

    if (!captureEnabled) return

    void applySimpleMenuCaptureDefaults()
  },
  { immediate: true }
)

watch(uploadEnabled, enabled => {
  if (enabled) steamEnabled.value = false
})

watch(steamEnabled, enabled => {
  if (enabled) uploadEnabled.value = false
})

watch(isSimpleMenu, simpleMenuEnabled => {
  if (!simpleMenuEnabled) return

  uploadEnabled.value = false
  steamEnabled.value = false
})

watch(
  [uploadEnabled, steamEnabled],
  ([upload, steam]) => {
    if (typeof window === "undefined") return
    const payload = { upload: !!upload, steam: !!steam }
    window.localStorage.setItem(CAPTURE_OPTIONS_STORAGE_KEY, JSON.stringify(payload))
  }
)

watch(
  [uploadEnabled, steamEnabled, uploadCaptureDisabled, steamCaptureDisabled, () => controls.captureWithMotion, captureWithMotionDisabled],
  emitCaptureOptions,
  { immediate: true }
)

function clampInteger(value, minValue, maxValue, fallback) {
  return Math.round(clampNumber(value, minValue, maxValue, fallback))
}

function applyRemoteState(captureState) {
  if (!captureState || typeof captureState !== "object") return

  const remoteLimits = captureState?.limits || {}
  const superSamplingLimits = remoteLimits?.superSampling || {}
  const downscaleLimits = remoteLimits?.downscaleLevel || {}

  if (Number.isFinite(Number(superSamplingLimits.min))) limits.superSamplingMin = Number(superSamplingLimits.min)
  if (Number.isFinite(Number(superSamplingLimits.max))) limits.superSamplingMax = Number(superSamplingLimits.max)
  if (Number.isFinite(Number(downscaleLimits.min))) limits.downscaleLevelMin = Number(downscaleLimits.min)
  if (Number.isFinite(Number(downscaleLimits.max))) limits.downscaleLevelMax = Number(downscaleLimits.max)

  if (!editing.superSampling && Number.isFinite(Number(captureState.superSampling))) {
    controls.superSampling = clampInteger(
      captureState.superSampling,
      limits.superSamplingMin,
      limits.superSamplingMax,
      controls.superSampling
    )
  }
  if (!editing.downscaleLevel && Number.isFinite(Number(captureState.downscaleLevel))) {
    controls.downscaleLevel = clampInteger(
      captureState.downscaleLevel,
      limits.downscaleLevelMin,
      limits.downscaleLevelMax,
      controls.downscaleLevel
    )
  }

  if (typeof captureState?.artifacts?.splitSceneVehicle === "boolean") controls.splitSceneVehicle = captureState.artifacts.splitSceneVehicle
  if (typeof captureState?.artifacts?.saveNormalDepth === "boolean") controls.saveNormalDepth = captureState.artifacts.saveNormalDepth
  if (typeof captureState?.hdr?.enabled === "boolean") controls.hdrScreenshot = captureState.hdr.enabled
  if (typeof captureState?.motion?.enabled === "boolean") controls.captureWithMotion = captureState.motion.enabled
  if (typeof captureState?.motion?.behavior === "string") controls.motionBehavior = captureState.motion.behavior

  const nextReadouts = captureState?.readouts || {}
  const fallback = unavailableReadout()
  readouts.currentWindowLabel = nextReadouts.currentWindowLabel || fallback
  readouts.renderTargetLabel = nextReadouts.renderTargetLabel || fallback
  readouts.outputResolutionLabel = nextReadouts.outputResolutionLabel || fallback
  readouts.formatLabel = nextReadouts.formatLabel || fallback
  readouts.aspectLabel = nextReadouts.aspectLabel || fallback
  readouts.outputSizeLabel = nextReadouts.outputSizeLabel || fallback
  readouts.outputSizeRangeLabel = nextReadouts.outputSizeRangeLabel || ""
  readouts.actionHintLabel = nextReadouts.actionHintLabel || ""

  warning.active = captureState?.warning?.active === true
  warning.label = captureState?.warning?.label || ""

  hdrState.disabled = captureState?.hdr?.disabled !== false
  hdrState.reasonLabel = captureState?.hdr?.disabledReasonLabel || ""
  motionState.disabled = captureState?.motion?.disabled !== false

  hasLoadedState.value = true
}

async function submitCaptureUpdate(partialState, sourceName) {
  if (captureSectionDisabled.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode.setCaptureState(partialState)
    if (result?.state) applyRemoteState(result.state)
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

function onUploadCaptureChanged(value) {
  if (uploadSwitchDisabled.value) return
  uploadEnabled.value = value === true
}

function onSteamCaptureChanged(value) {
  if (steamSwitchDisabled.value) return
  steamEnabled.value = value === true
}

function emitCaptureOptions() {
  emit("capture-options-change", {
    motion: controls.captureWithMotion,
    upload: uploadEnabled.value,
    steam: steamEnabled.value,
    motionDisabled: captureWithMotionDisabled.value,
    uploadDisabled: uploadCaptureDisabled.value,
    steamDisabled: steamCaptureDisabled.value,
  })
}

async function applySimpleMenuCaptureDefaults() {
  if (simpleMenuCaptureDefaultsApplied.value) return
  if (!isSimpleMenu.value) return
  if (!props.sessionActive) return
  if (!captureSectionEnabled.value) return
  if (props.captureState === "preparing") return

  simpleMenuCaptureDefaultsApplied.value = true

  controls.superSampling = SIMPLE_MENU_CAPTURE_DEFAULTS.superSampling
  controls.downscaleLevel = SIMPLE_MENU_CAPTURE_DEFAULTS.downscaleLevel

  try {
    const result = await lua.extensions.ui_pause_photomode.setCaptureState(SIMPLE_MENU_CAPTURE_DEFAULTS)

    if (result?.state) {
      applyRemoteState(result.state)
    }

    if (result?.ok === false) {
      simpleMenuCaptureDefaultsApplied.value = false
      syncState.value = "error"
      syncErrorReason.value = result.reason || "simplemenu_capture_defaults_failed"
      return
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    simpleMenuCaptureDefaultsApplied.value = false
    syncState.value = "error"
    syncErrorReason.value = error?.message || "simplemenu_capture_defaults_failed"
  }
}

function onSuperSamplingChanged(value) {
  void submitCaptureUpdate({
    superSampling: clampInteger(value, limits.superSamplingMin, limits.superSamplingMax, controls.superSampling),
  }, "capture_supersampling_update_failed")
}

function onDownscaleLevelChanged(value) {
  void submitCaptureUpdate({
    downscaleLevel: clampInteger(value, limits.downscaleLevelMin, limits.downscaleLevelMax, controls.downscaleLevel),
  }, "capture_downscale_update_failed")
}

function onCaptureWithMotionChanged(value) {
  if (captureWithMotionDisabled.value) return
  controls.captureWithMotion = value === true
  void submitCaptureUpdate({
    motion: {
      enabled: controls.captureWithMotion,
    },
  }, "capture_motion_update_failed")
}

function onMotionBehaviorChanged(value) {
  if (motionBehaviorDisabled.value) return
  controls.motionBehavior = value
  void submitCaptureUpdate({
    motion: {
      behavior: controls.motionBehavior,
    },
  }, "capture_motion_behavior_update_failed")
}

function onSplitSceneVehicleChanged(value) {
  controls.splitSceneVehicle = value === true
  void submitCaptureUpdate({
    artifacts: {
      splitSceneVehicle: controls.splitSceneVehicle,
    },
  }, "capture_split_scene_vehicle_update_failed")
}

function onSaveNormalDepthChanged(value) {
  controls.saveNormalDepth = value === true
  void submitCaptureUpdate({
    artifacts: {
      saveNormalDepth: controls.saveNormalDepth,
    },
  }, "capture_normal_depth_update_failed")
}

function onHdrScreenshotChanged(value) {
  controls.hdrScreenshot = value === true
  void submitCaptureUpdate({
    hdr: {
      enabled: controls.hdrScreenshot,
    },
  }, "capture_hdr_update_failed")
}

function onResolutionPresetChanged(presetId) {
  if (!resolutionPresetVisible.value) return
  emit("select-resolution-preset", typeof presetId === "string" && presetId.length > 0 ? presetId : "current")
}

onMounted(() => {
  if (typeof window === "undefined") return

  const raw = window.localStorage.getItem(CAPTURE_OPTIONS_STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)

    if (!isSimpleMenu.value) {
      uploadEnabled.value = parsed?.upload === true
      steamEnabled.value = parsed?.steam === true
    } else {
      uploadEnabled.value = false
      steamEnabled.value = false
    }
  } catch {}
})
</script>

<style lang="scss" scoped>
@use "./sharedRows";

.wide-hint {
  --bng-row-breakpoint: 50%;
}



.photomode-capture-section__groups,
.photomode-capture-section__controls {
  display: flex;
  flex-direction: column;
}

.photomode-capture-section__resolution-control {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  width: 100%;
  min-width: 0;
}

.photomode-capture-section__note {
  margin: 0 0.5em;
  font-size: 0.78em;
  text-align: right;
  color: rgba(var(--bng-off-white-rgb), 0.62);
}

.photomode-capture-section__motion-behavior-select {
  width: 100%;
}

</style>
