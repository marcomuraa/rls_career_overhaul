<template>
  <div class="input-control-bar" :title="devname && control ? `${devname}: ${control}` : control">
    <div class="input-control-bar-fill" :style="{ width: `${value * 100}%` }"></div>
    <div class="input-control-content">
      <BngIcon
        class="hardware-control-icon"
        :class="{ 'special-control-icon': viewerObj?.ownIcon }"
        :type="icons[viewerObj?.ownIcon || viewerObj?.icon] || icons.placeholder" />
      <span v-if="!viewerObj?.ownIcon" class="hardware-control-text">
        {{ viewerObj?.control || control }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import useControls from "@/services/controls"

const props = defineProps({
  devname: String,
  control: String,
  value: {
    type: Number,
    default: 0,
  },
})

const controls = useControls()

const viewerObj = computed(() => props.devname && props.control
  ? controls.makeViewerObj({ device: props.devname, deviceKey: props.control })
  : null)
</script>

<style lang="scss" scoped>
.input-control-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.125rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(var(--bng-off-white-rgb), 0.18);
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-black-rgb), 0.35);
  overflow: hidden;
}

.input-control-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: var(--bng-orange-400);
  opacity: 0.85;
}

.input-control-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.0625rem;
  width: 100%;
  color: var(--bng-off-white);
}

.hardware-control-icon {
  --bng-icon-size: 1.05rem;
  flex-shrink: 0;

  &.special-control-icon {
    --bng-icon-size: 1.5rem;
  }
}

.hardware-control-text {
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.1;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
