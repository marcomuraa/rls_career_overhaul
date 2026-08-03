<template>
  <div
    class="crosshair-overlay"
    :class="{ 'is-visible': visible, 'is-hovered': hovered }"
    :data-target-x="target.x ?? ''"
    :data-target-y="target.y ?? ''"
    aria-hidden="true"
    inert
    tabindex="0"
  ></div>
  <div v-if="visible && hasActionItems" class="crosshair-title" :style="labelGradientStyle" aria-hidden="true">
    <div v-for="(actionItem, idx) in actionItems" :key="`crosshair-${actionItem.action}-${idx}`" class="action-row">
      <BngBinding :action="actionItem.action" show-unassigned />
      <span class="action-label">{{ actionItem.label }}</span>
    </div>
  </div>
  <div
    class="target-info"
    :class="{ 'is-visible': targetInfoVisible }"
    :style="targetInfoStyle"
    aria-hidden="true"
  >
  <!-- the target dot needs to be hidden for now because it blocks clicking (CEF captures the input?)-->
  <div class="target-info-dot" style="visibility: hidden;"></div>
  </div>
  <div v-if="hasActionItems && !visible" class="target-info-title" :style="targetInfoTitleStyle">
    <div v-for="(actionItem, idx) in actionItems" :key="`target-${actionItem.action}-${idx}`" class="action-row">
      <BngBinding :action="actionItem.action" show-unassigned />
      <span class="action-label">{{ actionItem.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useStreams } from "@/services/events"
import BngBinding from "../base/bngBinding.vue"
import { clamp } from "@/utils/maths"

const streamName = "vehicleTriggerCrosshairVisible"
const targetStreamName = "vehicleTriggerCrosshairTarget"
const visible = ref(false)
const hovered = ref(false)
const target = ref({
  x: null,
  y: null,
  action0: null,
  action1: null,
  action2: null,
  colorR: null,
  colorG: null,
  colorB: null,
  colorA: null,
  labelX: null,
  labelY: null,
  labelTx: null,
  labelTy: null,
})
const actionItems = computed(() => {
  const items = []
  if (target.value.action0) items.push({ action: "triggerAction0", label: target.value.action0 })
  if (target.value.action1) items.push({ action: "triggerAction1", label: target.value.action1 })
  if (target.value.action2) items.push({ action: "triggerAction2", label: target.value.action2 })
  return items
})
const labelGradientStyle = computed(() => {
  const r = target.value.colorR
  const g = target.value.colorG
  const b = target.value.colorB
  const a = target.value.colorA
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return {}
  }

  const rr = Math.round(Math.max(0, Math.min(1, r)) * 255)
  const gg = Math.round(Math.max(0, Math.min(1, g)) * 255)
  const bb = Math.round(Math.max(0, Math.min(1, b)) * 255)
  const alpha = Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1

  return {
    backgroundImage: `linear-gradient(90deg, rgba(${rr}, ${gg}, ${bb}, ${Math.max(0.10, 0.64 * alpha)}) 0%, rgba(${rr}, ${gg}, ${bb}, ${Math.max(0.02, 0.06 * alpha)}) 100%)`,
  }
})
const hasActionItems = computed(() => actionItems.value.length > 0)
const targetInfoVisible = computed(() => Number.isFinite(target.value.x) && Number.isFinite(target.value.y))
const targetInfoStyle = computed(() => ({
  left: `${(target.value.x ?? 0) * 100}%`,
  top: `${(target.value.y ?? 0) * 100}%`,
}))

const labelLayout = computed(() => {
  if (
    Number.isFinite(target.value.labelX)
    && Number.isFinite(target.value.labelY)
    && typeof target.value.labelTx === "string"
    && typeof target.value.labelTy === "string"
  ) {
    return {
      left: `${target.value.labelX * 100}%`,
      top: `${target.value.labelY * 100}%`,
      transform: `translate(${target.value.labelTx}, ${target.value.labelTy})`,
    }
  }

  const x = target.value.x ?? 0.5
  const y = target.value.y ?? 0.5

  const isLeftZone = x < 0.25
  const isRightZone = x > 0.75
  const isSideZone = isLeftZone || isRightZone
  const isCenterVerticalZone = y >= 0.25 && y <= 0.75

  let baseTx = "-50%"
  if (isLeftZone) baseTx = "2rem"
  else if (isRightZone) baseTx = "calc(-100% - 2rem)"

  let baseTy = "2.0rem"
  if (isSideZone && isCenterVerticalZone) baseTy = "-50%"
  if (y > 0.75) baseTy = "calc(-100% - 2rem)"

  let anchorX = x
  if (isLeftZone) anchorX = clamp(x, 0.02, 0.25)
  else if (isRightZone) anchorX = clamp(x, 0.75, 0.98)
  else anchorX = clamp(x, 0.1, 0.9)

  let anchorY = y
  if (y > 0.75) anchorY = clamp(y, 0.75, 0.98)
  else if (isSideZone && isCenterVerticalZone) anchorY = clamp(y, 0.05, 0.95)
  else anchorY = clamp(y, 0.02, 0.82)

  return {
    left: `${anchorX * 100}%`,
    top: `${anchorY * 100}%`,
    transform: `translate(${baseTx}, ${baseTy})`,
  }
})

const targetInfoTitleStyle = computed(() => ({
  left: labelLayout.value.left,
  top: labelLayout.value.top,
  transform: labelLayout.value.transform,
  opacity: "1",
  ...labelGradientStyle.value,
}))

useStreams([streamName, targetStreamName], (streams) => {
  if (Object.prototype.hasOwnProperty.call(streams, streamName)) {
    const payload = streams[streamName]
    visible.value = payload && payload.visible === true
    hovered.value = payload && payload.hovered === true
  }

  if (Object.prototype.hasOwnProperty.call(streams, targetStreamName)) {
    const targetPayload = streams[targetStreamName] || {}
    target.value = {
      x: targetPayload.x ?? null,
      y: targetPayload.y ?? null,
      action0: targetPayload.action0 ?? null,
      action1: targetPayload.action1 ?? null,
      action2: targetPayload.action2 ?? null,
      colorR: targetPayload.colorR ?? null,
      colorG: targetPayload.colorG ?? null,
      colorB: targetPayload.colorB ?? null,
      colorA: targetPayload.colorA ?? null,
      labelX: targetPayload.labelX ?? null,
      labelY: targetPayload.labelY ?? null,
      labelTx: targetPayload.labelTx ?? null,
      labelTy: targetPayload.labelTy ?? null,
    }
  }
})
</script>

<style scoped lang="scss">
.crosshair-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  overflow: visible;
  z-index: 10000;
  pointer-events: none !important;
  user-select: none;
  display: block;
  background: var(--bng-off-white);
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  border: 0;
  filter: drop-shadow(0 0 2px var(--bng-black-o8));
  opacity: 0;
  transition: opacity 300ms ease;
}

.crosshair-overlay.is-visible {
  opacity: 1;
}

.crosshair-overlay.is-hovered {
  box-shadow: 0 0 0 2px var(--bng-off-white);
}

.crosshair-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, 2.5rem);
  z-index: 10000;
  pointer-events: none !important;
  user-select: none;
  color: var(--bng-off-white);
  font-size: 1.0rem;
  white-space: nowrap;
  text-shadow: 0 0 2px var(--bng-black-o8);
  text-align: center;
  padding: 0.1rem;
  padding-right: 0.25rem;
  border-radius: var(--bng-corners-2);
  filter: drop-shadow(0 0 2px var(--bng-black-o8));
  background: var(--bng-cool-gray-800);
}

.target-info {
  position: absolute;
  width: 0;
  height: 0;
  z-index: 10000;
  pointer-events: none !important;
  user-select: none;
  opacity: 0;
  transition: opacity 200ms ease;
}

.target-info.is-visible {
  opacity: 1;
}

.target-info-dot {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  border: 1px solid var(--bng-add-green-400);
  box-shadow: 0 0 0 1px var(--bng-black-o8);
  background: var(--bng-off-white);
}

.target-info-title {
  position: absolute;
  left: 0;
  top: 0;
  color: var(--bng-off-white);
  font-size: 1.0rem;
  white-space: nowrap;
  text-shadow: 0 0 2px var(--bng-black-o8);
  background: var(--bng-cool-gray-800);
  padding: 0.1rem;
  padding-right: 0.25rem;
  border-radius: var(--bng-corners-2);
  pointer-events: none !important;

  filter: drop-shadow(0 0 2px var(--bng-black-o8));
}

.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35rem;
  padding: 0.1rem;
}

.action-row + .action-row {
  margin-top: 0.1rem;
}
</style>
