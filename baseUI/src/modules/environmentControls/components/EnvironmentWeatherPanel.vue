<template>
  <div class="environment-controls-panel" :class="{ disabled: !canChange }">
    <EnvironmentTimeOfDaySection
      :show-tod="props.showTod"
      :compact="props.compact"
      :can-change="canChange"
      :environment-state="state"
      :time-of-day-options="timeOfDayOptions"
      :apply-partial="applyPartial"
      :availability="props.availability"
      :hidden-controls="props.hiddenControls"
    />

    <EnvironmentWeatherSettingsSection
      :compact="props.compact"
      :can-change="canChange"
      :environment-state="state"
      :level-defaults="levelDefaults"
      :apply-partial="applyPartial"
      :availability="props.availability"
      :hidden-controls="props.hiddenControls"
    />

    <EnvironmentCelestialSettingsSection
      :compact="props.compact"
      :can-change="canChange"
      :availability="props.availability"
      :hidden-controls="props.hiddenControls"
    />
  </div>
</template>

<script setup lang="js">
import EnvironmentCelestialSettingsSection from "./envPanels/EnvCelesital.vue"
import EnvironmentTimeOfDaySection from "./envPanels/EnvTod.vue"
import EnvironmentWeatherSettingsSection from "./envPanels/EnvWeather.vue"
import { useEnvironmentState } from "../composables/useEnvironmentState"

defineOptions({ name: "EnvironmentControlsPanel" })

const props = defineProps({
  showTod: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  /** Pause route payload from lua/ge/.../routeData/environment.lua (optional). */
  routeEnvironmentData: {
    type: Object,
    default: null,
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

const { state, canChange, timeOfDayOptions, levelDefaults, applyPartial } = useEnvironmentState({
  initialTimeOfDayOptions: props.routeEnvironmentData?.timeOfDayOptions,
  initialLevelDefaults: props.routeEnvironmentData?.levelDefaults,
})
</script>

<style scoped lang="scss">
.environment-controls-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.75em;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--bng-off-white);

  &.disabled {
    opacity: 0.65;
  }
}
</style>

