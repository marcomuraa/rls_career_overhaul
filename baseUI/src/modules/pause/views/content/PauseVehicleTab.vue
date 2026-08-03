<template>
  <div ref="rootRef" class="pause-vehicle-tab" tabindex="-1">
    <div v-if="isLoading" class="vehicle-loading">{{ $t("ui.pause.vehicleTab.loadingVehicleData") }}</div>

    <template v-else>
      <div class="vehicle-summary">
        <div class="vehicle-name">{{ digest.displayName }}</div>
        <div class="vehicle-line">{{ $t("ui.pause.vehicleTab.config") }}: {{ digest.configName }}</div>
        <div class="vehicle-line">
          {{ $t("ui.pause.vehicleTab.source") }}:
          <span :class="{ official: digest.isOfficialConfig }">{{ translatedSourceLabel }}</span>
        </div>
        <div class="vehicle-line" v-if="fuelLabel">{{ $t("ui.pause.vehicleTab.fuel") }}: {{ fuelLabel }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { $translate } from "@/services/translation"
import { usePauseVehicleTab } from "../../composables/usePauseVehicleTab.js"

defineOptions({ name: "PauseVehicleTab" })

const SOURCE_LABEL_KEYS = {
  "BeamNG - Official": "ui.vehicles.source.official",
  Custom: "ui.vehicles.source.custom",
  Mod: "ui.vehicles.source.mod",
}

const rootRef = ref(null)
const { isLoading, digest } = usePauseVehicleTab()

const translatedSourceLabel = computed(() => {
  const key = SOURCE_LABEL_KEYS[digest.value.sourceLabel]
  return key ? $translate.instant(key) : digest.value.sourceLabel
})

const fuelLabel = computed(() => {
  if (typeof digest.value.fuelRatio !== "number") return ""
  return `${Math.round(digest.value.fuelRatio * 100)}%`
})

function focusEntryAction() {
  const target = rootRef.value
  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

defineExpose({
  focusEntryAction,
})
</script>

<style scoped lang="scss">
.pause-vehicle-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: 0.5em;
}

.vehicle-loading {
  color: rgba(var(--bng-off-white-rgb), 0.8);
}

.vehicle-summary {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  padding: 0.5em;
  border: 0.0625em solid rgba(var(--bng-cool-gray-500-rgb), 0.35);
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.35);
}

.vehicle-name {
  font-size: 1.1em;
  font-weight: 600;
}

.vehicle-line {
  font-size: 0.9em;
  color: rgba(var(--bng-off-white-rgb), 0.85);
}

.official {
  color: var(--bng-off-white);
}
</style>
