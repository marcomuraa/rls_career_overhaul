<template>
  <div class="option-summary-panel">
    <div class="config-section selectable-component" v-bng-blur @click="onSpawnPointClick">
      <BlurBackground />
      <div class="section-header">
        <BngCardHeading type="ribbon" class="section-title">
          <span class="section-title-label">{{ $tt("ui.menu.freeroamSelector.summary.locationLabel") }}</span>
          <span class="section-title-value">
            {{ configData?.currentSpawnPoint?.headerTitle || $tt("ui.menu.freeroamSelector.summary.selectLocation") }}
          </span>
        </BngCardHeading>
      </div>
      <div class="section-content">
        <GameplayDetails
          v-if="configData?.currentSpawnPoint"
          :active-item="{ levelName: configData.currentSpawnPoint.levelName, spawnPointObjectName: configData.currentSpawnPoint.spawnPointObjectName }"
          :active-item-details="configData.currentSpawnPoint"
          inline
          :show-header-title="false"
        />
        <div v-else class="placeholder-content">
          <BngIcon type="road" class="placeholder-icon" />
          <p class="placeholder-text">{{ $tt("ui.menu.freeroamSelector.summary.clickToSelectLocation") }}</p>
        </div>
      </div>
    </div>

    <div class="config-section selectable-component" v-bng-blur @click="onVehicleClick">
      <BlurBackground />
      <div class="section-header">
        <BngCardHeading type="ribbon" class="section-title">
          <span class="section-title-label">{{ $tt("ui.menu.freeroamSelector.summary.vehicleLabel") }}</span>
          <span class="section-title-value">
            {{ configData?.currentVehicle?.headerTitle || $tt("ui.menu.freeroamSelector.summary.selectVehicle") }}
          </span>
        </BngCardHeading>
      </div>
      <div class="section-content">
        <VehicleDetails
          v-if="configData?.currentVehicle"
          :active-item="{ model: configData.currentVehicle.model, config: configData.currentVehicle.config }"
          :active-item-details="configData.currentVehicle"
          hide-details-and-buttons
          inline
          :show-header-title="false"
        />
        <div v-else class="placeholder-content">
          <BngIcon type="car" class="placeholder-icon" />
          <p class="placeholder-text">{{ $tt("ui.menu.freeroamSelector.summary.clickToSelectVehicle") }}</p>
        </div>
      </div>
    </div>

    <OptionsPanel
      v-bng-on-ui-nav:back="onBack"
      v-bng-on-ui-nav:menu="onBack"
      class="config-section"
      :options="configData?.options || []"
      :has-options="hasOptions"
      :can-configure-options="canConfigureOptions"
      @navigate-step="onNavigateStep"
    />
  </div>
</template>

<script setup>
import { BngCardHeading, BngIcon } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import GameplayDetails from "@/modules/gameplaySelector/components/GameplayDetails.vue"
import VehicleDetails from "@/modules/vehicleselect/components/VehicleDetails.vue"
import OptionsPanel from "./OptionsPanel.vue"

defineProps({
  configData: {
    type: Object,
    default: null,
  },
  hasOptions: {
    type: Boolean,
    default: false,
  },
  canConfigureOptions: {
    type: Boolean,
    default: true,
  },
  onBack: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(["spawn-point-click", "vehicle-click", "navigate-step"])

function onSpawnPointClick() {
  emit("spawn-point-click")
}

function onVehicleClick() {
  emit("vehicle-click")
}

function onNavigateStep(targetStep) {
  emit("navigate-step", targetStep)
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.option-summary-panel {
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  width: 100%;
  overflow: visible;
  align-self: center;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
}

.config-section {
  position: relative;
  background-color: var(--bng-black-o4);
  border-radius: var(--bng-corners-2);
  overflow: visible;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: white;
  flex: 0 0 30em;
  min-width: 25em;
  --font-size: 1rem;
  @include modify-focus(0.5rem, 0.25rem);

  &.selectable-component:hover {
    box-shadow: inset 0 0 5rem rgba(var(--bng-orange-400-rgb), 0.33);
  }

  &.selectable-component {
    cursor: pointer;
  }
}

.section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--bng-black-o2);

  .section-title {
    color: white;
    margin-bottom: 0;
    padding-bottom: 0.5rem;
    margin-top: 0.5rem;
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    width: 100%;
    overflow: visible;

    .section-title-label {
      margin-right: 0.5rem;
    }

    .section-title-value {
      font-weight: 600;
    }
  }
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  gap: 1rem;

  &.row {
    flex-direction: row;
  }
}

.placeholder-text {
  font-size: 1rem;
  font-style: italic;
  margin: 0;
}
</style>
