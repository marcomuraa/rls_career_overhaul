<template>
  <section v-bng-ui-nav-scroll.force class="detail-section ffb-options-content">
    <div class="detail-section-header">
      <div class="detail-section-title">{{ $tt("ui.controls.ffb") }}</div>
    </div>

    <div v-for="config in ffbInputs" :key="config.key">
      <BindingOptionRenderAdapter
        v-if="config.show !== false"
        :model-value="getVal(config.key)"
        :config="config"
        :disabled="(config.key !== 'isForceEnabled' && !modelValue.isForceEnabled) || config.disabled === true"
        @update:modelValue="value => setVal(config.key, value)" />

      <div v-if="config.items" class="options-sub-items">
        <template v-for="item in config.items" :key="item.key">
          <BindingOptionRenderAdapter
            v-show="item.show !== false"
            :model-value="getVal(item.key)"
            :config="item"
            :disabled="!modelValue.isForceEnabled || item.disabled === true"
            @update:modelValue="value => setVal(item.key, value)" />
        </template>
      </div>
    </div>

    <div v-if="!$simplemenu" class="graph-container">
      <BngSimpleGraph v-if="modelValue.ffb?.responseCorrected && !modelValue.ffb?.isVibrationEnabled" :points="responseCurvePoints" class="response-curve" />
    </div>
  </section>
</template>

<script setup>
import { computed, inject, reactive, ref, watchEffect } from "vue"
import { $translate } from "@/services"
import { vBngUiNavScroll } from "@/common/directives"
import BngSimpleGraph from "@/common/components/base/bngSimpleGraph.vue"
import BindingOptionRenderAdapter from "./BindingOptionRenderAdapter.vue"
import { mapUI, refPath } from "@/utils/mapUI"

const $simplemenu = inject("$simplemenu", ref(false))

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["update:modelValue"])

const logitechVibrotactileFreqMin = computed(() => props.modelValue.logitechVibrotactileFreqMaxUIRangeMin)
const logitechVibrotactileFreqMax = computed(() => props.modelValue.logitechVibrotactileFreqMaxUIRangeMax)

const ROOT_BINDING_KEYS = new Set([
  "isForceEnabled",
  "isForceInverted",
  "useLogitechSDK",
  "logitechVibrotactileCoef",
  "logitechVibrotactileFreqMax",
])

const MAP_UI_BINDING_KEYS = new Set(["softlockForce", "gforceCoef", "logitechVibrotactileCoef"])

function bindingPathForKey(key) {
  return ROOT_BINDING_KEYS.has(key) ? key : `ffb.${key}`
}

const uidata = reactive({})
const getModel = () => props.modelValue

function emitBinding() {
  const m = props.modelValue
  emit("update:modelValue", {
    ...m,
    ffb: { ...m.ffb },
  })
}

mapUI(getModel, uidata, "ffb.softlockForce", v => Math.round((v ?? 0) * 100), v => v / 100, emitBinding)
mapUI(getModel, uidata, "ffb.gforceCoef", v => Math.round((v ?? 0) * 100), v => v / 100, emitBinding)
mapUI(getModel, uidata, "logitechVibrotactileCoef", v => Math.round((v ?? 0) * 100), v => v / 100, emitBinding)

function getVal(key) {
  if (MAP_UI_BINDING_KEYS.has(key)) {
    if (key === "logitechVibrotactileCoef") return uidata.logitechVibrotactileCoef
    return uidata.ffb[key]
  }
  return refPath(getModel(), bindingPathForKey(key))
}

function setVal(key, v) {
  if (MAP_UI_BINDING_KEYS.has(key)) {
    if (key === "logitechVibrotactileCoef") uidata.logitechVibrotactileCoef = v
    else uidata.ffb[key] = v
    return
  }
  refPath(getModel(), bindingPathForKey(key), v)
  emitBinding()
}

const ffbInputs = computed(() => [
  {
    key: "isForceEnabled",
    label: $translate.instant("ui.controls.ffb.isForceEnabled"),
    type: "switch",
    tooltip: $translate.instant("ui.controls.ffb.isForceEnabled.tooltip"),
  },
  {
    key: "isVibrationEnabled",
    label: $translate.instant("ui.controls.ffb.feedbackMode"),
    type: "dropdown",
    tooltip: $translate.instant("ui.controls.ffb.feedbackMode.tooltip"),
    options: [
      { label: $translate.instant("ui.controls.ffb.feedbackMode.forceFeedback"), value: false },
      { label: $translate.instant("ui.controls.ffb.feedbackMode.vibration"), value: true },
    ],
  },
  {
    key: "isForceInverted",
    label: $translate.instant("ui.controls.ffb.isForceInverted"),
    type: "switch",
    tooltip: $translate.instant("ui.controls.ffb.isForceInverted.tooltip"),
    show: !props.modelValue.ffb?.isVibrationEnabled,
  },
  {
    key: "smoothing",
    label: $translate.instant("ui.controls.ffb.smoothing"),
    type: "slider",
    tooltip: $translate.instant("ui.controls.ffb.smoothing.tooltip"),
    show: !props.modelValue.ffb?.isVibrationEnabled,
    min: 0,
    max: 500,
    step: 10,
    items: [
      {
        key: "smoothing2automatic",
        label: $translate.instant("ui.controls.ffb.smoothing2automatic"),
        type: "switch",
        tooltip: $translate.instant("ui.controls.ffb.smoothing2automatic.tooltip"),
        show: !props.modelValue.ffb?.smoothing2automatic,
      },
      {
        key: "smoothing2",
        label: $translate.instant("ui.controls.ffb.smoothing2"),
        type: "slider",
        tooltip: $translate.instant("ui.controls.ffb.smoothing2.tooltip"),
        min: 0,
        max: 500,
        step: 10,
        show: !props.modelValue.ffb?.smoothing2automatic,
      },
      {
        key: "smoothing2AutoValue",
        label: $translate.instant("ui.controls.ffb.smoothing2"),
        tooltip: $translate.instant("ui.controls.ffb.smoothing2.tooltip"),
        type: "slider",
        min: 0,
        max: 500,
        step: 10,
        disabled: true,
        show: !props.modelValue.ffb?.smoothing2automatic,
      },
    ],
  },
  {
    key: "forceCoef",
    label: $translate.instant("ui.controls.ffb.strength"),
    type: "slider",
    tooltip: $translate.instant("ui.controls.ffb.strength.tooltip"),
    min: 0,
    max: 500,
    step: 10,
    items: [
      {
        key: "softlockForce",
        label: $translate.instant("ui.controls.ffb.softlockForce"),
        type: "slider",
        tooltip: $translate.instant("ui.controls.ffb.softlockForce.tooltip"),
        show: !props.modelValue.ffb?.isVibrationEnabled,
        min: 0,
        max: 100,
        step: 1,
        suffix: "%",
      },
      {
        key: "gforceCoef",
        label: $translate.instant("ui.controls.ffb.gforceCoef"),
        type: "slider",
        tooltip: $translate.instant("ui.controls.ffb.gforceCoef.tooltip"),
        show: !props.modelValue.ffb?.isVibrationEnabled,
        min: 0,
        max: 20,
        step: 1,
        suffix: "%",
      },
      {
        key: "lowspeedCoef",
        label: $translate.instant("ui.controls.ffb.lowspeedCoef"),
        type: "switch",
        tooltip: $translate.instant("ui.controls.ffb.lowspeedCoef.tooltip"),
        show: !props.modelValue.ffb?.isVibrationEnabled,
      },
      {
        key: "useLogitechSDK",
        label: $translate.instant("ui.controls.ffb.useLogitechSDK"),
        type: "switch",
        show: !props.modelValue.ffb?.isVibrationEnabled,
      },
      {
        key: "logitechVibrotactileCoef",
        label: $translate.instant("ui.controls.ffb.logitechVibrotactileCoef"),
        type: "slider",
        tooltip: $translate.instant("ui.controls.ffb.logitechVibrotactileCoef.tooltip"),
        show: !props.modelValue.ffb?.isVibrationEnabled,
        disabled: !props.modelValue.isForceEnabled || !props.modelValue.useLogitechSDK,
        min: 0,
        max: 9000,
        step: 5,
        suffix: "%",
      },
      {
        key: "logitechVibrotactileFreqMax",
        label: $translate.instant("ui.controls.ffb.logitechVibrotactileFreqMax"),
        type: "slider",
        tooltip: $translate.instant("ui.controls.ffb.logitechVibrotactileFreqMax.tooltip"),
        show: !props.modelValue.ffb?.isVibrationEnabled,
        disabled: !props.modelValue.isForceEnabled || !props.modelValue.useLogitechSDK,
        min: logitechVibrotactileFreqMin.value,
        max: logitechVibrotactileFreqMax.value,
        step: 1,
        scale: "log10",
        unit: "Hz",
      },
    ],
  },
  {
    key: "enableThrottleForceFeedback",
    label: $translate.instant("ui.controls.ffb.enableThrottleForceFeedback"),
    type: "switch",
    tooltip: $translate.instant("ui.controls.ffb.enableThrottleForceFeedback.tooltip"),
    show: props.modelValue.ffb?.isVibrationEnabled,
  },
  {
    key: "enableBrakeForceFeedback",
    label: $translate.instant("ui.controls.ffb.enableBrakeForceFeedback"),
    type: "switch",
    tooltip: $translate.instant("ui.controls.ffb.enableBrakeForceFeedback.tooltip"),
    show: props.modelValue.ffb?.isVibrationEnabled,
  },
  {
    key: "deviceLightingMode",
    label: $translate.instant("ui.controls.ffb.deviceLightingMode"),
    type: "dropdown",
    tooltip: $translate.instant("ui.controls.ffb.deviceLightingMode.tooltip"),
    show: props.modelValue.ffb?.isVibrationEnabled,
    options: [
      { label: $translate.instant("ui.controls.ffb.deviceLightingMode.default"), value: "default" },
      { label: $translate.instant("ui.controls.ffb.deviceLightingMode.off"), value: "off" },
    ],
  },
  {
    key: "updateRateLimit",
    label: $translate.instant("ui.controls.ffb.updateRateLimit"),
    type: "dropdown",
    tooltip: $translate.instant("ui.controls.ffb.updateRateLimit.tooltip"),
    options: [
      { label: $translate.instant("ui.controls.ffb.updateRateLimit.automatic"), value: 0 },
      { label: "2000 Hz", value: 2000 },
      { label: "1500 Hz", value: 1500 },
      { label: "1250 Hz", value: 1250 },
      { label: "1000 Hz", value: 1000 },
      { label: "750 Hz", value: 750 },
      { label: "600 Hz", value: 600 },
      { label: "500 Hz", value: 500 },
      { label: "400 Hz", value: 400 },
      { label: "333 Hz", value: 333 },
      { label: "250 Hz", value: 250 },
      { label: "200 Hz", value: 200 },
      { label: "150 Hz", value: 150 },
      { label: "100 Hz", value: 100 },
      { label: "75 Hz", value: 75 },
      { label: "60 Hz", value: 60 },
      { label: "50 Hz", value: 50 },
      { label: "30 Hz", value: 30 },
    ],
  },
  {
    key: "updateType",
    label: $translate.instant("ui.controls.ffb.updateType"),
    type: "dropdown",
    tooltip: $translate.instant("ui.controls.ffb.updateType.tooltip"),
    show: !props.modelValue.ffb?.isVibrationEnabled,
    options: [
      { label: $translate.instant("ui.controls.ffb.updateType.fast"), value: 0 },
      { label: $translate.instant("ui.controls.ffb.updateType.slow"), value: 1 },
    ],
  },
  {
    key: "responseCorrected",
    label: $translate.instant("ui.controls.ffb.responseCorrected"),
    type: "switch",
    tooltip: $translate.instant("ui.controls.ffb.responseCorrected.tooltip"),
    show: !$simplemenu.value && !props.modelValue.ffb?.isVibrationEnabled,
  },
])

const responseCurvePoints = computed(() => {
  if (!props.modelValue.ffb.responseCurve || props.modelValue.ffb.responseCurve.length === 0) return []

  const curve = props.modelValue.ffb.responseCurve

  return [
    {
      label: "ffbResponse",
      color: "var(--bng-orange-400)",
      points: curve.map(point => [point[0], point[1]]),
    },
  ]
})

watchEffect(() => {
  const m = getModel()
  if (!m?.ffb) return
  if (!m.ffb.smoothing2automatic) return
  const next =
    Math.round((Math.max(5000, (500 - m.ffb.smoothing * 0.7) * 100 + 5000) - 500) / 109 / 10) * 10
  if (m.ffb.smoothing2AutoValue === next) return
  m.ffb.smoothing2AutoValue = next
  emitBinding()
})
</script>

<style lang="scss" scoped>
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.45);
}

.detail-section-header {
  display: flex;
  align-items: center;
}

.detail-section-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.ffb-options-content {
  display: flex;
  flex-direction: column;
  color: white;
  gap: 1rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.options-sub-items {
  margin-left: 1rem;
}

.options-slider-input {
  display: flex;
  align-items: center;
  width: 100%;

  > .options-item-slider {
    flex: 1;
    margin-right: 1em;
  }

  > .options-item-input {
    max-width: 5em;
  }
}

.graph-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .response-curve {
    width: 100%;
    height: 180px;
    margin-bottom: 1rem;
  }
}
</style>
