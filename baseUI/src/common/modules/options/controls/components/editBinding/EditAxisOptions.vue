<template>
  <section class="detail-section axis-options-content">
    <div class="detail-section-header">
      <div class="detail-section-title">Axis Options</div>
    </div>

    <BindingOptionRenderAdapter
      v-if="modelValue.action === 'steering'"
      :model-value="values.angle"
      :config="angleConfig"
      @update:modelValue="value => updateValue('angle', value)"
      @blur="onAngleBlur" />

    <!-- 1:1 matching behaviour -->
    <BindingOptionRenderAdapter
      v-if="modelValue.action === 'steering'"
      :model-value="values.lockType"
      :config="lockTypeConfig"
      :disabled="values.angle <= 0"
      @update:modelValue="value => updateValue('lockType', value)" />

    <div class="graph-container">
      <BngSimpleGraph class="axis-response-curve" :points="graphPoints" :currentX="currentX" :ranges="ranges" :gridDivisions="[4, 4]" :subgridDivider="1" />
      <BngPropVal key-label="Output" :value-label="currentY + '%'" />
    </div>

    <BindingOptionRenderAdapter
      v-for="config in axisOptionRows"
      :key="config.key"
      :model-value="values[config.key]"
      :config="config"
      @update:modelValue="value => updateValue(config.key, value)"
      @blur="onAxisOptionBlur(config)" />
  </section>
</template>

<script>
const configs = {
  inverted: {
    label: "Invert Axis",
    tooltip:
      "Use if the binding does the opposite than it should.[br][br]For example, when lifting the throttle pedal accelerates the car, or when turning left moves the car to the right.",
    type: "switch",
  },
  linearity: {
    min: 0.1,
    max: 5,
    step: 0.1,
    label: "Linearity",
    tooltip: "Greater values mean finer grained response in the center, at the expense of a worse response near the limit. Use 1 for steering wheels.",
    type: "slider",
  },
  deadzoneResting: {
    min: 0,
    max: 1,
    step: 0.025,
    label: "Deadzone (rest)",
    tooltip:
      "Use when the resting position is still triggering an action.[list][*]Typical values are 0.1 to 0.25 for gamepad sticks.[*]Use 0 for steering wheels.[*]For pedals and gamepad triggers, you shouldn't normally need any deadzone. If you do, consider calibrating the device axis following the instructions of the manufacturer.[/list]",
    type: "slider",
  },
  deadzoneEnd: {
    min: 0,
    max: 1,
    step: 0.025,
    label: "Deadzone (end)",
    tooltip:
      "Use when you cannot reach all the axis travel range. For example, flooring the throttle does not reflect as 100% throttle in-game.[br][br]If you need to use a value greater than 0, consider instead calibrating the device axis following the instructions of the manufacturer.",
    type: "slider",
  },
}

const lockTypes = [
  { label: "ui.controls.lockTypes.1", value: 1 },
  { label: "ui.controls.lockTypes.2", value: 2 },
  { label: "ui.controls.lockTypes.3", value: 3 },
  { label: "ui.controls.lockTypes.0", value: 0 },
]
</script>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue"
import { BngPropVal } from "@/common/components/base"
import BngSimpleGraph from "@/common/components/base/bngSimpleGraph.vue"
import { lua, useBridge } from "@/bridge"
import BindingOptionRenderAdapter from "./BindingOptionRenderAdapter.vue"

const { events } = useBridge()

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["update:modelValue"])

const isCentered = computed(() => !!props.modelValue.isCentered)

const getValuesFromModel = modelValue => ({
  linearity: modelValue.linearity,
  deadzoneResting: modelValue.deadzoneResting,
  deadzoneEnd: modelValue.deadzoneEnd,
  inverted: modelValue.inverted || modelValue.isInverted || false,
  angle: modelValue.angle || 0,
  lockType: modelValue.lockType || 0,
})

const serializeValues = value => JSON.stringify(value)
const isSyncingFromModel = ref(false)

const values = ref(getValuesFromModel(props.modelValue))

const angleConfig = {
  key: "angle",
  label: "ui.controls.angle",
  tooltip: "ui.controls.angle.tooltip",
  type: "slider",
  min: 0,
  max: 2520,
  step: 10,
  extraItemData: {
    inputMax: 6000,
    inputStep: 10,
  },
}

const lockTypeConfig = {
  key: "lockType",
  label: "ui.controls.lockType",
  tooltip: "ui.controls.lockTypes.tooltip",
  type: "dropdown",
  options: lockTypes,
}

const prevAngle = ref(values.value.angle)

function syncValuesFromModel(modelValue) {
  const nextValues = getValuesFromModel(modelValue)
  prevAngle.value = nextValues.angle
  if (serializeValues(values.value) === serializeValues(nextValues)) return

  isSyncingFromModel.value = true
  values.value = nextValues
  nextTick(() => {
    isSyncingFromModel.value = false
  })
}

watch(
  () => props.modelValue,
  modelValue => syncValuesFromModel(modelValue),
  { immediate: true, deep: true }
)

watch(
  values,
  currentValues => {
    if (isSyncingFromModel.value) return
    emitValues(currentValues)
  },
  { deep: true }
)

function emitValues(currentValues = values.value) {
  emit("update:modelValue", {
    ...props.modelValue,
    ...currentValues,
    isInverted: currentValues.inverted,
  })
}

const lastRawValue = ref(isCentered.value ? 0.5 : 0)

const axisOptionRows = computed(() => Object.entries(configs).map(([key, config]) => ({
  key,
  ...config,
})))

const graphPoints = computed(() => {
  const curve = []

  // Generate points for a V-shaped graph
  const points = 100 // Number of points for smooth curve

  // Generate the curve points
  for (let i = 0; i <= points; i++) {
    const x = i / points
    const point = applyFilters(x, values.value, isCentered.value)

    // Always abs — centered produces V-shape, non-centered stays linear
    let y = Math.abs(point[1])

    // Add the point to the curve
    curve.push([x * 100, y * 100]) // Scale to percentage
  }

  return [
    {
      label: "Response",
      color: "var(--bng-orange-400)",
      points: curve,
    },
  ]
})

const currentX = computed(() => {
  let x = values.value.inverted ? 1 - lastRawValue.value : lastRawValue.value
  return x * 100
})

const currentY = computed(() => {
  const point = applyFilters(lastRawValue.value, values.value, isCentered.value)
  return Math.round(point[1] * 100)
})

const ranges = computed(() => {
  const result = []

  // Get deadzone values and ensure they're not negative
  const dzRestingRaw = Math.max(0, values.value.deadzoneResting)
  const dzEndRaw = Math.max(0, values.value.deadzoneEnd)

  // Apply same scaling as original code
  let deadzoneResting = dzRestingRaw
  let deadzoneEnd = dzEndRaw

  if (isCentered.value) {
    // In centered mode (steering wheel, joystick), the deadzone is distributed
    // around the center point, so we need to adjust the values
    deadzoneResting = (deadzoneResting + 1) / 2
    deadzoneEnd /= 2
  }

  // Calculate scaled positions (as percentages)
  const dzRestingEndScaled = deadzoneResting * 100
  const dzEndEndScaled = 100 - deadzoneEnd * 100
  const dzRestingBeginScaled = isCentered.value ? 100 - dzRestingEndScaled : 0

  // Define the accent colors (matching the original)
  const accentColor = "var(--bng-orange-400)"

  // Resting deadzone ranges
  if (dzRestingRaw > 0) {
    result.push({
      start: 0,
      end: dzRestingEndScaled,
      fill: accentColor,
      opacity: 0.25,
    })

    // Add second range for centered axes
    if (isCentered.value) {
      result.push({
        start: dzRestingBeginScaled,
        end: 100,
        fill: accentColor,
        opacity: 0.25,
      })
    }
  }

  // End deadzone ranges
  if (dzEndRaw > 0) {
    result.push({
      start: dzEndEndScaled,
      end: 100,
      fill: accentColor,
      opacity: 0.25,
    })

    // Add second range for centered axes
    if (isCentered.value) {
      result.push({
        start: 0,
        end: 100 - dzEndEndScaled,
        fill: accentColor,
        opacity: 0.25,
      })
    }
  }

  return result
})

function onAngleBlur() {
  const newAngle = values.value.angle
  const oldAngle = prevAngle.value
  prevAngle.value = newAngle
  if (newAngle <= 0 && oldAngle > 0) {
    values.value.lockType = 0
  } else if (newAngle > 0 && oldAngle <= 0) {
    values.value.lockType = 1
  } else {
    emitValues()
  }
}


onMounted(() => {
  listenRawEvents(true)
})

onUnmounted(() => {
  listenRawEvents(false)
})

function listenRawEvents(listen) {
  const method = listen ? "on" : "off"
  events[method]("RawInputChanged", onRawInputChanged)
  lua.Input.setForwardRawEvents(listen)
  lua.setCEFTyping(listen)
}

function onRawInputChanged(data) {
  if (data.devName === props.modelValue.devname && data.control === props.modelValue.control) {
    lastRawValue.value = data.value
  }
}

function updateValue(key, value) {
  values.value[key] = value
}

function onAxisOptionBlur(config) {
  if (config.type === "slider") emitValues()
}

// Helper function to apply filters (similar to the one in options.js)
function applyFilters(x, filter, isCentered) {
  const deadzoneResting = Math.max(0, filter.deadzoneResting)
  const deadzoneEnd = Math.max(0, filter.deadzoneEnd)
  let value = x
  const linearity = Math.max(0.1, filter.linearity)

  if (filter.inverted || filter.isInverted) {
    x = 1.0 - x
    value = 1.0 - value
  }

  if (isCentered) {
    value = value * 2.0 - 1.0 // Convert from [0..+1] to [-1..+1]
  }

  if (value >= -deadzoneResting && value <= deadzoneResting) {
    value = 0.0
  } else {
    if (value >= 0.0) {
      value = (value - deadzoneResting) / (1.0 - deadzoneResting - deadzoneEnd)
    } else {
      value = (value + deadzoneResting) / (1.0 - deadzoneResting - deadzoneEnd)
    }
  }

  value = (value < 0.0 ? -1.0 : 1.0) * Math.min(1, Math.pow(Math.abs(value), linearity))
  return [x, value]
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/density" as *;

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

.axis-options-content {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  gap: 0.25rem;
}

.graph-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .axis-response-curve {
    width: 100%;
    height: 180px;
    margin-bottom: 1rem;
  }
}
</style>
