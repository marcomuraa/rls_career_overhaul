<template>
  <PhotomodeSectionShell
    class="photomode-camera-section"
    :disabled="controlDisabled"
  >
    <div class="photomode-camera-section__controls">
      <BngGroupPanel
        :title="$t('ui.photomode.tabCamera')"
        title-id="photomode-camera-section-camera-title"
      >
        <BngRow
          class="photomode-scene-section_select"
          :label="$t('ui.photomode.grid.toggle')"
        >
          <BngSelect
            :value="gridMode"
            class="photomode-camera-section__grid-select"
            :options="gridModeOptions"
            loop
            :config="DISCRETE_SELECT_CONFIG"
            @valueChanged="onGridModeChanged"
          />
        </BngRow>
        <BngRow
          v-for="row in cameraControlRows"
          :key="row.key"
          class="photomode-scene-section_input"
          :label="row.title"
          :tooltip="row.hint"
          :disabled="controlDisabled"
        >
          <BngSlider
            v-model="controls[row.key]"
            :min="row.min"
            :max="row.max"
            :step="row.step"
            :input-step="row.inputStep"
            :disabled="controlDisabled"
            :debounce="0"
            with-input
            :unit="row.unit"
            @valueChanged="row.onChanged"
            @focus="markFieldEditing(row.key, true)"
            @blur="markFieldEditing(row.key, false)"
          />
        </BngRow>
        <BngRow
          class="photomode-scene-section_toggle"
          :label="$t('ui.photomode.toggleSmooth')"
          :tooltip="$t('ui.photomode.smoothMovementTooltip')"
          :disabled="smoothMovementDisabled"
          @activate="onSmoothMovementChanged(!controls.smoothMovement)"
        >
          <PhotomodeToggleControl
            :checked="controls.smoothMovement"
            :disabled="smoothMovementDisabled"
          />
        </BngRow>
        <BngRow
          v-if="!isSimpleMenu"
          class="photomode-scene-section_toggle"
          :label="$t('ui.photomode.nodeGrabberNodes')"
          :tooltip="$t('ui.photomode.nodeGrabberTooltip')"
          :disabled="nodeGrabberDisabled"
          @activate="onNodeGrabberChanged(!controls.nodeGrabberVisible)"
        >
          <PhotomodeToggleControl
            :checked="controls.nodeGrabberVisible"
            :disabled="nodeGrabberDisabled"
          />
        </BngRow>
        <BngRow
          class="photomode-scene-section_toggle"
          :label="$t('ui.photomode.autoExposureLabel')"
          :tooltip="$t('ui.photomode.autoExposureTooltip')"
          :disabled="exposureDisabled"
          @activate="onAutoExposureChanged(!controls.autoExposure)"
        >
          <PhotomodeToggleControl
            :checked="controls.autoExposure"
            :disabled="exposureDisabled"
          />
        </BngRow>

        <BngRow
          class="photomode-scene-section_input"
          :label="$t('ui.photomode.manualEV')"
          :tooltip="$t('ui.photomode.manualEvTooltip')"
          :disabled="manualEvDisabled"
        >
          <BngSlider
            v-model="controls.manualEV"
            :min="CAMERA_CONTROL_RANGES.manualEV.min"
            :max="CAMERA_CONTROL_RANGES.manualEV.max"
            :step="CAMERA_CONTROL_RANGES.manualEV.step"
            :input-step="CAMERA_CONTROL_RANGES.manualEV.inputStep"
            :disabled="manualEvDisabled"
            :debounce="0"
            with-input
            @valueChanged="onManualEvChanged"
            @focus="markFieldEditing('manualEV', true)"
            @blur="markFieldEditing('manualEV', false)"
          />
        </BngRow>
      </BngGroupPanel>

      <PhotomodeReadoutGrid :columns="3">
        <PhotomodeReadoutCard
          v-for="readout in angleReadouts"
          :key="readout.key"
          :label="readout.label"
          :value="readout.value"
        />
      </PhotomodeReadoutGrid>
    </div>

    <PhotomodePresetBrowser
      preset-type="camera"
      :title="$t('ui.photomode.presets.camera')"
      :disabled="controlDisabled"
      @applied="onPresetApplied"
    />
  </PhotomodeSectionShell>
</template>

<script setup>
import { computed, inject, reactive, ref, unref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngGroupPanel, BngRow, BngSelect, BngSlider } from "@/common/components/base"
import { lua } from "@/bridge"
import PhotomodeReadoutCard from "./PhotomodeReadoutCard.vue"
import PhotomodeReadoutGrid from "./PhotomodeReadoutGrid.vue"
import PhotomodeSectionShell from "./PhotomodeSectionShell.vue"
import PhotomodeToggleControl from "./PhotomodeToggleControl.vue"
import PhotomodePresetBrowser from "./PhotomodePresetBrowser.vue"
import { clampNumber } from "@/utils/maths"
import { usePhotomodePolledSection } from "../usePhotomodePolledSection"

defineOptions({ name: "PhotomodeCameraSection" })

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
  cameraEnabled: {
    type: Boolean,
    default: false,
  },
  gridMode: {
    type: String,
    default: "off",
  },
})

const emit = defineEmits(["grid-mode-change"])

const CAMERA_STATE_POLL_MS = 333
const GRID_MODE_KEYS = Object.freeze(["off", "thirds", "golden", "vertical", "horizontal", "dev-loading", "dev-mainmenu"])
const DISCRETE_SELECT_CONFIG = Object.freeze({
  value: option => option.value,
  label: option => option.label,
})
const CAMERA_CONTROL_RANGES = Object.freeze({
  fov: {
    min: 10,
    max: 120,
    step: 0.2,
    inputStep: 0.1,
  },
  speed: {
    min: 2,
    max: 300,
    step: 0.5,
    inputStep: 0.5,
  },
  roll: {
    min: -90,
    max: 90,
    step: 0.1,
    inputStep: 0.01,
  },
  manualEV: {
    min: -20,
    max: 20,
    step: 0.01,
    inputStep: 0.01,
  },
})

const controls = reactive({
  fov: 60,
  speed: 15,
  roll: 0,
  smoothMovement: false,
  autoExposure: true,
  manualEV: 10,
  nodeGrabberVisible: false,
})
const angleState = reactive({
  yawDeg: 0,
  pitchDown: 0,
  rollDeg: 0,
})
const availability = reactive({
  exposure: false,
  smoothMovement: false,
  nodeGrabber: false,
})

const {
  editing,
  hasLoadedState,
  syncState,
  syncErrorReason,
  markFieldEditing,
  clearEditingFlags,
  refresh: refreshCameraState,
  startPolling,
  stopPolling,
} = usePhotomodePolledSection({
  pollMs: CAMERA_STATE_POLL_MS,
  editingFields: ["fov", "speed", "roll", "manualEV"],
  request: () => lua.extensions.ui_pause_photomode.getCameraState(),
  applyState: cameraState => applyRemoteState(cameraState),
  isEnabled: () => props.sessionActive && props.cameraEnabled,
  unavailableReason: "camera_state_unavailable",
  errorReason: "camera_state_error",
})

const controlDisabled = computed(() => !props.cameraEnabled || !props.sessionActive || !props.panelActive)
const nodeGrabberDisabled = computed(() => controlDisabled.value || !availability.nodeGrabber)
const smoothMovementDisabled = computed(() => controlDisabled.value || !availability.smoothMovement)
const gridModeOptions = computed(() =>
  GRID_MODE_KEYS.map(value => ({
    value,
    label: $translate.instant(`ui.photomode.grid.${value}`),
  }))
)
const angleReadouts = computed(() => [
  {
    key: "yaw",
    label: $translate.instant("ui.photomode.yaw"),
    value: formatAngle(angleState.yawDeg),
  },
  {
    key: "pitch",
    label: $translate.instant("ui.photomode.pitch"),
    value: formatAngle(angleState.pitchDown),
  },
  {
    key: "roll",
    label: $translate.instant("ui.photomode.roll"),
    value: formatAngle(angleState.rollDeg),
  },
])
const cameraControlRows = computed(() => [
  {
    key: "fov",
    title: $translate.instant("ui.photomode.fov"),
    hint: $translate.instant("ui.photomode.fovHint"),
    min: CAMERA_CONTROL_RANGES.fov.min,
    max: CAMERA_CONTROL_RANGES.fov.max,
    step: CAMERA_CONTROL_RANGES.fov.step,
    inputStep: CAMERA_CONTROL_RANGES.fov.inputStep,
    unit: "°",
    onChanged: onFovChanged,
  },
  {
    key: "speed",
    title: $translate.instant("ui.photomode.moveSpeed"),
    hint: $translate.instant("ui.photomode.moveSpeedHint"),
    min: CAMERA_CONTROL_RANGES.speed.min,
    max: CAMERA_CONTROL_RANGES.speed.max,
    step: CAMERA_CONTROL_RANGES.speed.step,
    inputStep: CAMERA_CONTROL_RANGES.speed.inputStep,
    unit: "",
    onChanged: onSpeedChanged,
  },
  {
    key: "roll",
    title: $translate.instant("ui.photomode.roll"),
    hint: $translate.instant("ui.photomode.rollHint"),
    min: CAMERA_CONTROL_RANGES.roll.min,
    max: CAMERA_CONTROL_RANGES.roll.max,
    step: CAMERA_CONTROL_RANGES.roll.step,
    inputStep: CAMERA_CONTROL_RANGES.roll.inputStep,
    unit: "°",
    onChanged: onRollChanged,
  },
])
const exposureDisabled = computed(() => controlDisabled.value || !availability.exposure)
const manualEvDisabled = computed(() => exposureDisabled.value || controls.autoExposure === true)

function normalizeAngle(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.abs(numericValue) < 0.05 ? 0 : numericValue
}

function formatAngle(value) {
  return `${normalizeAngle(value).toFixed(1)}°`
}

function applyRemoteState(cameraState) {
  if (!cameraState || typeof cameraState !== "object") return

  const nextFov = Number(cameraState.fov)
  const nextSpeed = Number(cameraState.speed)
  const nextRoll = Number(cameraState.rollDeg)
  const nextYaw = Number(cameraState.yawDeg)
  const nextPitch = Number(cameraState.pitchDown)
  const nextManualEV = Number(cameraState.manualEV)

  availability.exposure = cameraState?.availability?.exposure === true
  availability.smoothMovement = cameraState?.availability?.smoothMovement === true
  availability.nodeGrabber = cameraState?.availability?.nodeGrabber === true

  if (typeof cameraState.smoothMovement === "boolean") {
    controls.smoothMovement = cameraState.smoothMovement
  }

  if (typeof cameraState.nodeGrabberVisible === "boolean") {
    controls.nodeGrabberVisible = cameraState.nodeGrabberVisible
  }

  if (typeof cameraState.autoExposure === "boolean") {
    controls.autoExposure = cameraState.autoExposure
  }

  if (!editing.manualEV && Number.isFinite(nextManualEV)) {
    controls.manualEV = clampNumber(
      nextManualEV,
      CAMERA_CONTROL_RANGES.manualEV.min,
      CAMERA_CONTROL_RANGES.manualEV.max,
      controls.manualEV
    )
  }

  if (!editing.fov && Number.isFinite(nextFov)) {
    controls.fov = clampNumber(
      nextFov,
      CAMERA_CONTROL_RANGES.fov.min,
      CAMERA_CONTROL_RANGES.fov.max,
      controls.fov
    )
  }

  if (!editing.speed && Number.isFinite(nextSpeed)) {
    controls.speed = clampNumber(
      nextSpeed,
      CAMERA_CONTROL_RANGES.speed.min,
      CAMERA_CONTROL_RANGES.speed.max,
      controls.speed
    )
  }

  if (!editing.roll && Number.isFinite(nextRoll)) {
    controls.roll = clampNumber(
      nextRoll,
      CAMERA_CONTROL_RANGES.roll.min,
      CAMERA_CONTROL_RANGES.roll.max,
      controls.roll
    )
  }

  if (Number.isFinite(nextYaw)) angleState.yawDeg = nextYaw
  if (Number.isFinite(nextPitch)) angleState.pitchDown = nextPitch
  if (Number.isFinite(nextRoll)) angleState.rollDeg = nextRoll

  if (!hasLoadedState.value) {
    hasLoadedState.value = [
      nextFov,
      nextSpeed,
      nextRoll,
      nextYaw,
      nextPitch,
      nextManualEV,
    ].some(Number.isFinite)
      || typeof cameraState.autoExposure === "boolean"
      || typeof cameraState.smoothMovement === "boolean"
      || typeof cameraState.nodeGrabberVisible === "boolean"
  }
}

function onPresetApplied(result) {
  if (result?.state) {
    clearEditingFlags()
    applyRemoteState(result.state)
    syncState.value = "ready"
    syncErrorReason.value = ""
    return
  }

  void refreshCameraState()
}

function onGridModeChanged(value) {
  if (!GRID_MODE_KEYS.includes(value)) return
  emit("grid-mode-change", value)
}

async function submitCameraExposureUpdate(partialState, sourceName) {
  if (controlDisabled.value) return

  try {
    console.log("Sending exposure patch:", JSON.stringify(partialState))

    const result = await lua.extensions.ui_pause_photomode.setCameraExposureState(partialState)

    console.log("Exposure patch result:", JSON.stringify(result))

    if (result?.ok === false) {
      syncState.value = "error"
      syncErrorReason.value = result.reason || sourceName
      if (result?.state) applyRemoteState(result.state)
      return
    }

    if (result?.state) {
      applyRemoteState(result.state)
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    console.error("Exposure patch failed:", error)
    syncState.value = "error"
    syncErrorReason.value = error?.message || sourceName
  }
}

function onAutoExposureChanged(value) {
  const autoExposure = value === true
  controls.autoExposure = autoExposure

  if (autoExposure) {
    void submitCameraExposureUpdate({ autoExposure: true }, "autoExposure")
    return
  }

  void submitCameraExposureUpdate({
    autoExposure: false,
    manualEV: controls.manualEV,
  }, "autoExposure")
}

function onSmoothMovementChanged(value) {
  controls.smoothMovement = value === true
  void runCameraAction("setCameraSmoothMovement", controls.smoothMovement)
}

function onNodeGrabberChanged(value) {
  controls.nodeGrabberVisible = value === true
  void runCameraAction("setNodeGrabberVisible", controls.nodeGrabberVisible)
}

function onManualEvChanged(value) {
  controls.manualEV = clampNumber(
    value,
    CAMERA_CONTROL_RANGES.manualEV.min,
    CAMERA_CONTROL_RANGES.manualEV.max,
    controls.manualEV
  )

  void submitCameraExposureUpdate({ manualEV: controls.manualEV }, "manualEV")
}

async function submitCameraUpdate(methodName, fieldName, value) {
  if (controlDisabled.value) return

  try {
    const result = await lua.extensions.ui_pause_photomode[methodName](value)
    if (result?.ok === false) {
      syncState.value = "error"
      syncErrorReason.value = result.reason || methodName
      return
    }

    syncState.value = "ready"
    syncErrorReason.value = ""

    if (!editing[fieldName] && Number.isFinite(Number(result?.value))) {
      controls[fieldName] = Number(result.value)
    }
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || methodName
  }
}

async function runCameraAction(methodName, payload = undefined) {
  if (controlDisabled.value) return

  try {
    const result = payload === undefined
      ? await lua.extensions.ui_pause_photomode[methodName]()
      : await lua.extensions.ui_pause_photomode[methodName](payload)
    if (result?.ok === false) {
      syncState.value = "error"
      syncErrorReason.value = result.reason || methodName
      return
    }

    if (result?.state) {
      applyRemoteState(result.state)
    }

    syncState.value = "ready"
    syncErrorReason.value = ""
  } catch (error) {
    syncState.value = "error"
    syncErrorReason.value = error?.message || methodName
  }
}

function onFovChanged(value) {
  controls.fov = clampNumber(
    value,
    CAMERA_CONTROL_RANGES.fov.min,
    CAMERA_CONTROL_RANGES.fov.max,
    controls.fov
  )
  void submitCameraUpdate("setCameraFov", "fov", controls.fov)
}

function onSpeedChanged(value) {
  controls.speed = clampNumber(
    value,
    CAMERA_CONTROL_RANGES.speed.min,
    CAMERA_CONTROL_RANGES.speed.max,
    controls.speed
  )
  void submitCameraUpdate("setCameraSpeed", "speed", controls.speed)
}

function onRollChanged(value) {
  controls.roll = clampNumber(
    value,
    CAMERA_CONTROL_RANGES.roll.min,
    CAMERA_CONTROL_RANGES.roll.max,
    controls.roll
  )
  void submitCameraUpdate("setCameraRoll", "roll", controls.roll)
}

watch(
  () => [props.sessionActive, props.cameraEnabled],
  ([sessionActive, cameraEnabled]) => {
    if (!sessionActive) {
      hasLoadedState.value = false
      return
    }

    if (cameraEnabled) {
      void refreshCameraState()
    }
  },
  { immediate: true }
)

watch(
  () => [props.panelActive, props.sessionActive, props.cameraEnabled],
  ([panelActive, sessionActive, cameraEnabled]) => {
    if (panelActive && sessionActive && cameraEnabled) {
      startPolling()
      return
    }

    stopPolling()
    clearEditingFlags()

    if (!cameraEnabled) {
      syncState.value = "error"
      syncErrorReason.value = "camera_unavailable"
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

.photomode-camera-section__controls {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.photomode-camera-section__grid-select {
  width: 100%;
}
</style>
