<template>
  <div class="hud-apps-layout-minimap">
    <header class="hud-apps-layout-minimap__header">
      <h3 class="hud-apps-layout-minimap__title">{{ title }}</h3>
      <p v-if="status" class="hud-apps-layout-minimap__status">{{ status }}</p>
    </header>

    <div class="hud-apps-layout-minimap__body" :style="bodyStyle">
      <p v-if="!models.length" class="hud-apps-layout-minimap__empty">
        {{ $t("ui.hudApps.noAppsInLayout") }}
      </p>
      <p v-else-if="!hasFrame" class="hud-apps-layout-minimap__empty">
        {{ $t("ui.hudApps.previewUnavailable") }}
      </p>
      <svg
        v-else
        class="hud-apps-layout-minimap__canvas"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <rect class="hud-apps-layout-minimap__backdrop" x="0" y="0" width="1" height="1" />
        <rect
          v-for="(entry, index) in drawableModels"
          :key="entry.id || `${entry.appName}-${index}`"
          class="hud-apps-layout-minimap__app"
          :x="entry.rect.x"
          :y="entry.rect.y"
          :width="entry.rect.width"
          :height="entry.rect.height"
          rx="0.01"
          ry="0.01"
        />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"

defineOptions({ name: "HudAppsLayoutMinimap" })

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "",
  },
  models: {
    type: Array,
    default: () => [],
  },
  frame: {
    type: Object,
    default: null,
  },
})

const hasFrame = computed(() => {
  const width = Number(props.frame?.width)
  const height = Number(props.frame?.height)
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
})
const bodyStyle = computed(() => {
  if (!hasFrame.value) return null
  return { aspectRatio: `${Number(props.frame.width)} / ${Number(props.frame.height)}` }
})

const drawableModels = computed(() => props.models.reduce((out, model) => {
  const rect = model?.rectNormalized
  if (!rect) return out
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return out
  if (rect.width <= 0 || rect.height <= 0) return out

  out.push({
    ...model,
    rect: {
      x: clamp01(rect.x),
      y: clamp01(rect.y),
      width: clamp01(rect.width),
      height: clamp01(rect.height),
    },
  })
  return out
}, []))

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
</script>

<style scoped lang="scss">
.hud-apps-layout-minimap {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  min-height: 8em;
}

.hud-apps-layout-minimap__header {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.hud-apps-layout-minimap__title,
.hud-apps-layout-minimap__status {
  margin: 0;
}

.hud-apps-layout-minimap__title {
  color: var(--bng-off-white);
  font-size: 1em;
  font-weight: 600;
}

.hud-apps-layout-minimap__status {
  color: var(--bng-cool-gray-200);
  font-size: 0.85em;
}

.hud-apps-layout-minimap__body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.55);
}

.hud-apps-layout-minimap__canvas {
  width: 100%;
  height: 100%;
  border-radius: var(--bng-corners-1);
}

.hud-apps-layout-minimap__backdrop {
  fill: var(--bng-cool-gray-900);
  opacity: 0.8;
  stroke: none;
}

.hud-apps-layout-minimap__app {
  fill: rgba(var(--bng-orange-500-rgb), 0.7);
  stroke: none;
}

.hud-apps-layout-minimap__empty {
  margin: 0;
  padding: 0.75em;
  color: var(--bng-cool-gray-200);
  text-align: center;
}
</style>
