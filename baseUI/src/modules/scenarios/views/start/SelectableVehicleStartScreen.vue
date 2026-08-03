<template>
  <div class="selectable-vehicle-start">
    <div class="grid-row">
      <div class="info-tile">
        <div v-if="data?.name" class="header">{{ $tt(data.name) }}</div>
        <div class="description">
          <DynamicComponent v-if="data?.description" :template="data.description" />
        </div>
      </div>

      <SelectedVehicleCard
        class="vehicle-tile"
        :vehicle="selectedVehicle"
        :selection-text="data?.selectionText"
        @click="$emit('select-vehicle')"
      />
    </div>

    <div class="grid-row buttons-row">
      <div class="spacer" />
      <div
        class="start-actions"
        v-bng-scoped-nav="{ scopeId: 'scenario-start-actions', type: 'container' }"
      >
        <BngButton
          v-if="showStartButton && buttonText"
          class="play-btn"
          :accent="ACCENTS.main"
          :disabled="isDisabled"
          bng-scoped-nav-autofocus
          @click="$emit('play')"
        >
          {{ $tt(buttonText) }}
        </BngButton>
        <BngButton
          v-if="data?.exitButtonText"
          class="exit-btn"
          :accent="ACCENTS.secondary"
          :disabled="isDisabled"
          @click="$emit('exit')"
        >
          {{ $tt(data.exitButtonText) }}
        </BngButton>
      </div>
      <div class="spacer" />
    </div>
  </div>
</template>

<script setup>
import { BngButton, ACCENTS } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngScopedNav } from "@/common/directives"
import SelectedVehicleCard from "@/modules/scenarios/components/SelectedVehicleCard.vue"

defineProps({
  data: { type: Object, default: () => ({}) },
  selectedVehicle: { type: Object, default: () => ({}) },
  showStartButton: { type: Boolean, default: true },
  isDisabled: { type: Boolean, default: false },
  buttonText: { type: String, default: "" },
})

defineEmits(["play", "exit", "select-vehicle"])
</script>

<style lang="scss" scoped>
.selectable-vehicle-start {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: 1rem;
  padding: 2rem;
  box-sizing: border-box;
}

.grid-row {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 140vh;
  gap: 1rem;
}

.info-tile {
  flex: 0 0 30%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  padding: 0.5rem;

  .header {
    font-size: 1.5em;
    font-weight: bold;
    padding: 0.5rem;
  }

  .description {
    flex: 1 1 auto;
    overflow: auto;
    padding: 0.5rem;
  }
}

.vehicle-tile {
  flex: 1 1 auto;
}

.buttons-row {
  align-items: center;
  justify-content: center;
}

.start-actions {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.spacer {
  flex: 1 1 0;
}

.play-btn,
.exit-btn {
  font-size: 2rem;
  min-width: 18rem;
}
</style>
