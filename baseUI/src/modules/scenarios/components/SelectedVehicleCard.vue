<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'scenario-start-vehicle', type: 'container' }"
    class="selected-vehicle-card"
    tabindex="0"
    @click="$emit('click')"
  >
    <div class="vehicle-info">
      <div class="header">
        <img
          v-if="vehicle?.official"
          :src="officialLogoUrl"
          class="official-logo"
        />
        <span class="vehicle-name">{{ vehicle?.name || "" }}</span>
      </div>

      <div class="preview">
        <img
          v-if="vehicle?.preview"
          :src="vehicle.preview"
          class="preview-img"
        />
      </div>
    </div>

    <div class="vehicle-details">
      <div class="detail-row">
        <span class="label">{{ $tt("ui.quickrace.country") }}</span>
        <span class="value">{{ $tt(vehicle?.file?.Country || "ui.common.unknown") }}</span>
      </div>
      <div class="detail-row">
        <span class="label">{{ $tt("ui.quickrace.brand") }}</span>
        <span class="value">{{ $tt(vehicle?.file?.Brand || "ui.common.unknown") }}</span>
      </div>
      <div class="detail-row">
        <span class="label">{{ $tt("ui.quickrace.derby") }}</span>
        <span class="value">{{ $tt(vehicle?.file?.["Derby Class"] || "ui.common.unknown") }}</span>
      </div>
    </div>

    <div v-if="selectionText" class="selection-text">
      {{ $tt(selectionText) }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngScopedNav } from "@/common/directives"
import { getAssetURL } from "@/utils"

defineProps({
  vehicle: { type: Object, default: () => ({}) },
  selectionText: { type: String, default: null },
})

defineEmits(["click"])

const officialLogoUrl = computed(() => getAssetURL("images/beamng_logo_50x50.png"))
</script>

<style lang="scss" scoped>
.selected-vehicle-card {
  display: flex;
  flex-direction: row;
  background-color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  padding: 0.5rem;
  gap: 1rem;
  position: relative;
}

.vehicle-info {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  min-width: 0;

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5em;
    font-weight: bold;
  }

  .official-logo {
    height: 22px;
    filter: brightness(0) invert(1);
  }

  .preview {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 0;
  }

  .preview-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.vehicle-details {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 0.5rem;

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .label {
    font-weight: bold;
    font-size: 0.85em;
    opacity: 0.85;
  }
}

.selection-text {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  font-size: 1.1em;
  font-weight: bold;
}
</style>
