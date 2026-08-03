<template>
  <div class="configurator-sections">
    <div class="steps-container" v-bng-blur>
      <div class="background-bar">
        <BlurBackground />
      </div>

      <WizardStepButton
        first
        :active="step === 'level'"
        :completed="stepCompleted.level"
        :title="$tt('ui.menu.freeroamSelector.wizard.location')"
        :tooltip="configData?.currentSpawnPoint?.headerTitle"
        :preview="configData?.currentSpawnPoint?.preview"
        icon="road"
        @activate="$emit('spawn-point-click')"
      />

      <WizardStepButton
        :active="step === 'vehicle'"
        :completed="stepCompleted.vehicle"
        :title="$tt('ui.menu.freeroamSelector.wizard.vehicle')"
        :tooltip="configData?.currentVehicle?.headerTitle"
        :preview="configData?.currentVehicle?.preview"
        icon="car"
        :show-paint-tile="!!vehiclePaintData"
        :paint-id="`${configData?.currentVehicle?.key || 'vehicle'}:${vehiclePaintData?.paint}`"
        :paints="vehiclePaintData?.paints || []"
        :paint-name="vehiclePaintData ? vehiclePaintData.paintNames.join(', ') : ''"
        @activate="$emit('vehicle-click')"
      />

      <WizardStepButton
        :active="step === 'options'"
        :completed="stepCompleted.options"
        :title="$tt('ui.menu.freeroamSelector.wizard.options')"
        :tooltip="$tt('ui.menu.freeroamSelector.wizard.options')"
        icon="adjust"
        @activate="$emit('options-click')"
      />

      <WizardStepButton
        v-if="isMultiplayerAvailable"
        :active="step === 'multiplayer'"
        :completed="stepCompleted.multiplayer"
        title="Multiplayer"
        tooltip="Multiplayer"
        icon="helmets"
        @activate="$emit('multiplayer-click')"
      >
        <template #overlay>
          <BngIcon
            :type="isMultiplayerEnabled ? 'checkmark' : 'circleSlashed'"
            :class="['multiplayer-step-overlay', isMultiplayerEnabled ? 'enabled' : 'disabled']" />
        </template>
      </WizardStepButton>
    </div>

    <FreeroamWizardPlayButton
      :button="button"
      @start="$emit('start-button-click', $event)"
    />
  </div>
</template>

<script setup>
import { BngIcon } from "@/common/components/base"
import { vBngBlur } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import WizardStepButton from "./wizardStepButton.vue"
import FreeroamWizardPlayButton from "./FreeroamWizardPlayButton.vue"

defineProps({
  step: {
    type: String,
    required: true,
  },
  stepCompleted: {
    type: Object,
    required: true,
  },
  configData: {
    type: Object,
    default: null,
  },
  vehiclePaintData: {
    type: Object,
    default: null,
  },
  isMultiplayerEnabled: {
    type: Boolean,
    default: false,
  },
  isMultiplayerAvailable: {
    type: Boolean,
    default: false,
  },
  button: {
    type: Object,
    default: null,
  },
})

defineEmits([
  "spawn-point-click",
  "vehicle-click",
  "options-click",
  "multiplayer-click",
  "start-button-click",
])
</script>

<style scoped lang="scss">
.configurator-sections {
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  overflow: visible;
  gap: 0;
  min-width: 100%;

  .steps-container {
    display: flex;
    flex: 1;
    flex-direction: row;
    overflow: visible;
    justify-content: flex-start;
    position: relative;

    .background-bar {
      --bar-bg: var(--bng-off-black);
      --bar-bg-rgb: var(--bng-off-black-rgb);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      inset: 0;
      border-radius: var(--bng-corners-2) 0 0 var(--bng-corners-2);
      clip-path: polygon(
        0% 0%,
        calc(100% - 0.5em) 0%,
        100% 50%,
        calc(100% - 0.5em) 100%,
        0% 100%
      );
      overflow: hidden;
      pointer-events: none;
      z-index: 0;

      &::before {
        content: "";
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bng-off-black);
        opacity: 0.8;
      }
    }
  }
}

.multiplayer-step-overlay {
  --bng-icon-size: 1.15em;
  color: var(--bng-off-white);
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.75));
  border-radius: 100%;
  width: 1.15em;
  height: 1.15em;
  display: flex;
  align-items: center;
  justify-content: center;

  &.enabled {
    background: var(--bng-add-green-400);
  }

  &.disabled {
    background: var(--bng-cool-gray-500);
  }
}
</style>
