<template>
  <div class="player-assignment-start">
    <BngCard class="player-panel" layered-background>
      <BngCardHeading v-if="data?.name">{{ $tt(data.name) }}</BngCardHeading>
      <DynamicComponent v-if="data?.description" :template="data.description" />

      <PlayerVehicleGrid v-if="playersConfig?.vehicles" :players-config="playersConfig" />

      <div v-if="playersConfig?.invalidMsg" class="invalid-msg">
        <strong>{{ playersConfig.invalidMsg }}</strong>
      </div>

      <div
        v-if="showStartButton && buttonText"
        class="start-actions"
        v-bng-scoped-nav="{ scopeId: 'scenario-start-actions', type: 'container' }"
      >
        <BngButton
          class="start-button"
          :accent="ACCENTS.main"
          :disabled="isDisabled"
          bng-scoped-nav-autofocus
          @click="$emit('play')"
        >
          {{ $tt(buttonText) }}
        </BngButton>
      </div>
    </BngCard>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, ACCENTS } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngScopedNav } from "@/common/directives"
import PlayerVehicleGrid from "../../components/PlayerVehicleGrid.vue"

defineProps({
  data: { type: Object, default: () => ({}) },
  playersConfig: { type: Object, default: () => ({ playerValid: true }) },
  startHtmlHref: { type: String, default: null },
  showStartButton: { type: Boolean, default: true },
  isDisabled: { type: Boolean, default: false },
  buttonText: { type: String, default: "" },
})

defineEmits(["play"])
</script>

<style lang="scss" scoped>
.player-assignment-start {
  position: absolute;
  width: 100%;
  height: 84%;
  bottom: 8%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  color: white;
}

.player-panel {
  width: 600px;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.75rem;
}

.start-actions {
  display: flex;
  flex-direction: column;
}

.start-actions .start-button:not(.empty) {
  width: 100%;
  max-width: none;
}

.invalid-msg {
  color: salmon;
  text-align: center;
}

.html-frame {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;

  iframe {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    background: transparent;
  }
}
</style>
