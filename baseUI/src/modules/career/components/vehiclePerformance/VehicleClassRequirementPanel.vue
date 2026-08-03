<template>
  <!-- Renders nothing when there is no requirement to display. -->
  <div v-if="requiredVehicleClass" class="vehicle-class-panel" :class="`variant-${variant}`">
    <span class="vehicle-class-panel-title">{{ $t("ui.career.performance.requiredVehicleClassLabel") }}</span>
    <div class="vehicle-class-panel-row">
      <div class="vehicle-class-item">
        <span class="vehicle-class-item-label">{{ $t("ui.career.performance.yoursLabel") }}</span>
        <PerformanceIndexSticker
          :vehicle-class="currentVehicleClass"
          :show-index="false"
          :size="stickerSize" />
      </div>
      <div class="vehicle-class-match-badge" :class="`state-${effectiveState}`" :style="badgeSizeStyle">
        <BngIcon
          v-if="badgeIcon"
          class="vehicle-class-match-icon"
          :style="iconSizeStyle"
          :type="badgeIcon" />
      </div>
      <div class="vehicle-class-item">
        <span class="vehicle-class-item-label">{{ $t("ui.career.performance.requiredLabel") }}</span>
        <PerformanceIndexSticker
          :vehicle-class="requiredVehicleClass"
          :show-index="false"
          :size="stickerSize" />
      </div>
    </div>
    <span class="vehicle-class-panel-status">
      {{ $t(statusKey) }}
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import PerformanceIndexSticker from "@/modules/career/components/vehiclePerformance/PerformanceIndexSticker.vue"

const props = defineProps({
  requiredVehicleClass: {
    type: Object,
    default: null,
  },
  currentVehicleClass: {
    type: Object,
    default: null,
  },
  // Lua-precomputed match state. "auto" derives it from the two class objects;
  // pass an explicit "met"/"unmet"/"unknown" when the backend already resolved it.
  state: {
    type: String,
    default: "auto",
    validator: v => ["auto", "met", "unmet", "unknown"].includes(v),
  },
  // Visual variant. Avoids hardcoded color literals at call sites.
  // - "panel"   -> translucent light surface for in-page panels (mission details).
  // - "overlay" -> translucent dark surface for image-overlay contexts (big map).
  variant: {
    type: String,
    default: "panel",
    validator: v => ["panel", "overlay"].includes(v),
  },
  stickerSize: {
    type: String,
    default: "lg",
    validator: v => ["sm", "md", "lg"].includes(v),
  },
  badgeSize: {
    type: String,
    default: "2.5rem",
  },
  iconSize: {
    type: String,
    default: "1.6rem",
  },
})

const effectiveState = computed(() => {
  if (props.state !== "auto") return props.state
  const req = props.requiredVehicleClass
  const own = props.currentVehicleClass
  if (!req || !own) return "unknown"
  return req.class?.name === own.class?.name ? "met" : "unmet"
})

const badgeIcon = computed(() => {
  switch (effectiveState.value) {
    case "met": return icons.checkmarkBold
    case "unmet": return icons.xmarkBold
    default: return null
  }
})

const statusKey = computed(() => {
  switch (effectiveState.value) {
    case "met": return "ui.career.performance.requirementSatisfied"
    case "unmet": return "ui.career.performance.requirementNotSatisfied"
    default: return "ui.career.performance.requirementUnknown"
  }
})

const badgeSizeStyle = computed(() => ({ width: props.badgeSize, height: props.badgeSize }))
const iconSizeStyle = computed(() => ({ "--bng-icon-size": props.iconSize }))
</script>

<style lang="scss" scoped>
.vehicle-class-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: 0.5rem;
  padding: 1.25rem 1.5rem;

  &.variant-panel {
    background-color: rgba(var(--bng-cool-gray-100-rgb), 0.1);
  }

  &.variant-overlay {
    background-color:rgba(16, 16, 16, 0.6);
  }
}

.vehicle-class-panel-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--bng-off-white);
  text-align: center;
}

.vehicle-class-panel-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.5rem;
}

.vehicle-class-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.vehicle-class-item-label {
  font-weight: 300;
  color: var(--bng-off-white);
}

.vehicle-class-match-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex: 0 0 auto;

  &.state-met { background-color: var(--bng-add-green-500); }
  &.state-unmet { background-color: var(--bng-add-red-500); }
  &.state-unknown {
    background-color: rgba(var(--bng-cool-gray-500-rgb), 0.4);
    border: 1px dashed var(--bng-cool-gray-300);
  }

  .vehicle-class-match-icon {
    --bng-icon-color: var(--bng-off-white);
  }
}

.vehicle-class-panel-status {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 100;
  color: var(--bng-off-gray-400);
}
</style>
