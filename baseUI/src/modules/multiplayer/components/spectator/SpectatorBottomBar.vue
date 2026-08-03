<template>
  <div class="spectator-bottom-bar" v-bng-scoped-nav="{ scopeId: 'spectator-bottom-bar' }">
    <BngButton class="spectator-player-btn" :accent="ACCENTS.ghost" :disabled="playerCount <= 1" @click="$emit('cycle', -1)">
      <BngIcon :type="icons.arrowLargeLeft" />
      <span>{{ $t("ui.multiplayer.spectator.previousPlayer") }}</span>
    </BngButton>

    <div v-if="cameraModes.length > 0" class="spectator-camera-group">
      <div class="spectator-camera-icon-stem">
        <BngIcon :type="icons.survellianceCamera" class="spectator-camera-icon" />
      </div>
      <div class="spectator-camera-modes">
        <BngButton
          v-for="mode in cameraModes"
          :key="mode.name"
          class="spectator-mode-button"
          :accent="mode.name === currentCameraMode ? ACCENTS.primary : ACCENTS.ghost"
          @click="$emit('set-camera-mode', mode.name)"
        >
          {{ mode.displayName }}
        </BngButton>
      </div>
    </div>

    <div class="spectator-ui-group">
      <div class="spectator-ui-icon-stem">
        <span class="spectator-ui-label">{{ $t("ui.multiplayer.spectator.ui") }}</span>
      </div>
      <div class="spectator-ui-modes">
        <BngButton
          v-for="mode in uiModes"
          :key="mode.value"
          class="spectator-mode-button"
          :accent="mode.value === currentUiMode ? ACCENTS.primary : ACCENTS.ghost"
          @click="$emit('set-ui-mode', mode.value)"
        >
          {{ mode.label }}
        </BngButton>
      </div>
    </div>

    <BngButton class="spectator-player-btn" :accent="ACCENTS.ghost" :disabled="playerCount <= 1" @click="$emit('cycle', 1)">
      <span>{{ $t("ui.multiplayer.spectator.nextPlayer") }}</span>
      <BngIcon :type="icons.arrowLargeRight" />
    </BngButton>
  </div>
</template>

<script setup>
import { vBngScopedNav } from "@/common/directives"
import { BngButton, BngIcon, ACCENTS, icons } from "@/common/components/base"

defineProps({
  cameraModes: {
    type: Array,
    default: () => [],
  },
  currentCameraMode: {
    type: String,
    default: "",
  },
  uiModes: {
    type: Array,
    default: () => [],
  },
  currentUiMode: {
    type: String,
    default: "complete",
  },
  playerCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(["cycle", "set-camera-mode", "set-ui-mode"])
</script>

<style lang="scss" scoped>
.spectator-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  pointer-events: auto;

  .spectator-player-btn {
    --bng-button-margin: 0;
    --bng-button-padding: 0.3rem 0.6rem;
    --bng-icon-size: 1.1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.75);
    border-radius: var(--bng-corners-2);
  }

  .spectator-camera-group,
  .spectator-ui-group {
    position: relative;
  }

  .spectator-camera-icon-stem,
  .spectator-ui-icon-stem {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.5rem 0;
    border: 1px solid var(--bng-orange-b400);
    border-bottom: none;
    border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.75);
    z-index: 1;
    margin-bottom: -1px;
  }

  .spectator-camera-icon {
    --bng-icon-size: 1.4rem;
    color: var(--bng-off-white);
  }

  .spectator-ui-label {
    color: var(--bng-off-white);
    font-family: var(--fnt-defs);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .spectator-camera-modes,
  .spectator-ui-modes {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.75rem;
    border-radius: var(--bng-corners-2);
    border: 1px solid var(--bng-orange-b400);
    border-top: none;
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.75);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: var(--bng-corners-2);
      right: var(--bng-corners-2);
      height: 1px;
      background: linear-gradient(
        to right,
        var(--bng-orange-b400) calc(50% - 1.3rem),
        transparent calc(50% - 1.3rem),
        transparent calc(50% + 1.3rem),
        var(--bng-orange-b400) calc(50% + 1.3rem)
      );
    }

    .spectator-mode-button {
      --bng-button-margin: 0;
      --bng-button-padding: 0.3rem 0.6rem;
      font-size: 0.85rem;
      text-transform: capitalize;
    }
  }
}
</style>
