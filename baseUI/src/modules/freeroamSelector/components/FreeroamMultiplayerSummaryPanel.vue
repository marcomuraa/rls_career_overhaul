<template>
  <div
    class="multiplayer-summary-panel"
    v-bng-on-ui-nav:back="onBack"
    v-bng-on-ui-nav:menu="onBack"
  >
    <div class="multiplayer-config-section">
      <BlurBackground />
      <div class="multiplayer-section-header">
        <BngCardHeading :outline="!multiplayerEnabled" type="ribbon" class="section-title">
          <BngSwitch
            class="group-switch"
            v-model="multiplayerEnabled"
            :label="multiplayerGroup?.name || 'Multiplayer'"
            labelBefore
            inline
            alwaysTransparent
          />
        </BngCardHeading>
      </div>
      <div class="multiplayer-section-content" :class="{ disabled: !multiplayerEnabled }">
        <MultiplayerSessionSettingsPanel
          variant="freeroamConfigure"
          :multiplayer-group="multiplayerGroup"
          :disabled="!multiplayerEnabled"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngSwitch, BngCardHeading } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import MultiplayerSessionSettingsPanel from "@/modules/multiplayer/components/MultiplayerSessionSettingsPanel.vue"

const props = defineProps({
  multiplayerGroup: {
    type: Object,
    default: null,
  },
  onBack: {
    type: Function,
    default: null,
  },
})

const multiplayerEnabled = computed({
  get: () => !!props.multiplayerGroup?.value,
  set: value => props.multiplayerGroup?.onChange?.(value),
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.multiplayer-summary-panel {
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

.group-switch {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  width: 100%;
  overflow: visible;

  :deep(.bng-switch-label) {
    justify-content: flex-start;
  }
}

.multiplayer-config-section {
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
}

.multiplayer-section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--bng-black-o2);
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;

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

.multiplayer-section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  padding: 0.65rem 0.85rem 0.85rem;
  box-sizing: border-box;
}
</style>
