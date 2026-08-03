<template>
  <div v-if="totalDistance > 0" class="taxi-progress">
    <div class="taxi-progress-markers">
      <div class="taxi-progress-marker taxi-progress-car-marker" :style="{ left: progressPercent + '%' }">
        <BngIcon :type="icons.taxiCar3" class="taxi-progress-icon" />
        <div class="taxi-progress-stem" />
      </div>
      <div class="taxi-progress-marker taxi-progress-flag-marker">
        <BngIcon :type="icons.finish" class="taxi-progress-icon" />
        <div class="taxi-progress-stem" />
      </div>
    </div>
    <div class="taxi-progress-track">
      <div class="taxi-progress-fill" :style="{ width: progressPercent + '%' }" />
    </div>
    <span class="taxi-progress-label">{{ distanceLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { useBridge } from "@/bridge"

const { units } = useBridge()

const props = defineProps({
  distanceLeft: {
    type: Number,
    default: 0,
  },
  totalDistance: {
    type: Number,
    default: 0,
  },
})

const progressPercent = computed(() => {
  if (props.totalDistance <= 0) return 0
  const traveled = props.totalDistance - props.distanceLeft
  return Math.min(100, Math.max(0, (traveled / props.totalDistance) * 100))
})

const distanceLabel = computed(() => {
  const converted = units.length(props.distanceLeft)
  if (!converted) return ""
  return converted.val.toFixed(converted.val >= 100 ? 0 : 1) + " " + converted.unit
})
</script>

<style lang="scss" scoped>
.taxi-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  pointer-events: none;
  width: 27rem;
}

.taxi-progress-markers {
  position: relative;
  width: 100%;
  height: 2.8rem;
}

.taxi-progress-marker {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.taxi-progress-car-marker {
  transition: left 0.3s ease;
}

.taxi-progress-flag-marker {
  right: 0;
  left: auto;
  transform: translateX(50%);
}

.taxi-progress-icon {
  --bng-icon-size: 2rem;
  color: var(--bng-off-white);
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8));
}

.taxi-progress-stem {
  width: 2px;
  height: 0.5rem;
  background: var(--bng-off-white);
  opacity: 0.4;
}

.taxi-progress-track {
  width: 100%;
  height: 8px;
  background: rgba(var(--bng-cool-gray-600-rgb), 0.5);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05);
}

.taxi-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--bng-orange-b400), var(--bng-orange-b300, #f5a623));
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(var(--bng-orange-b400-rgb, 245, 166, 35), 0.4);
}

.taxi-progress-label {
  margin-top: 0.35rem;
  color: var(--bng-off-white);
  font-family: var(--fnt-defs);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  opacity: 0.9;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
</style>
