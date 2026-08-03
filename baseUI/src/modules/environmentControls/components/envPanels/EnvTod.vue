<template>
  <BngGroupPanel
    v-if="timeOfDayVisible"
    class="environment-weather-section environment-weather-section__group"
    :class="{ 'environment-weather-section--compact': props.compact }"
    :title="props.title || $t('ui.environment.timeOfDay')"
    title-id="environment-weather-time-title"
  >
    <TodControl
      class="environment-weather-section__tod"
      :show-step-controls="props.showStepControls"
      :show-tod="props.showTod"
      :compact="props.compact"
      :disabled="!props.canChange"
      :disable-day-length-controls="props.disableDayLengthControls"
      :disable-date-control="props.disableDateControl"
      :time-of-day-options="props.timeOfDayOptions"
      :time-of-day-state="props.environmentState"
      :apply-partial="props.applyPartial"
    />
  </BngGroupPanel>
</template>

<script setup>
import { computed } from "vue"
import { BngGroupPanel } from "@/common/components/base"
import TodControl from "../TodControl.vue"

defineOptions({ name: "EnvironmentTimeOfDaySection" })

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  showTod: {
    type: Boolean,
    default: true,
  },
  showStepControls: {
    type: Boolean,
    default: true,
  },
  disableDayLengthControls: {
    type: Boolean,
    default: false,
  },
  disableDateControl: {
    type: Boolean,
    default: false,
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
  timeOfDayOptions: {
    type: Array,
    default: () => [],
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

function isAvailable(key, fallback) {
  if (typeof props.availability?.[key] === "boolean") return props.availability[key]
  return fallback
}

const timeOfDayVisible = computed(() =>
  props.hiddenControls?.timeOfDay !== true
  && isAvailable("timeOfDay", props.environmentState?.time !== undefined)
)
</script>

<style scoped lang="scss">
@use "./shared";
</style>
