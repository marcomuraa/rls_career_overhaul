<template>
  <span class="performance-index-sticker"
    :class="[
      `size-${size}`,
      { 'is-na': !hasData, 'high-contrast': highContrast }
    ]"
    :style="stickerStyle">
    <template v-if="hasData">
      <span v-if="showClass" class="class-name">
        <template v-if="longText">{{ $t(classKey) }}</template>
        <template v-else>{{ className }}</template>
      </span>
      <span v-if="showClass && showIndex" class="separator">&nbsp;|&nbsp;</span>
      <span v-if="showIndex && longText" class="index-prefix">{{ $t("ui.career.performance.indexLabelLong") }}&nbsp;</span>
      <span v-if="showIndex" class="index-value">{{ indexValue }}</span>
    </template>
    <span v-else class="na-text">{{ $t("ui.common.unknown") }}</span>
  </span>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  vehicleClass: {
    type: Object,
    default: null,
  },
  size: {
    type: String,
    default: "md",
    validator: v => ["sm", "md", "lg"].includes(v),
  },
  showClass: {
    type: Boolean,
    default: true,
  },
  showIndex: {
    type: Boolean,
    default: true,
  },
  longText: {
    type: Boolean,
    default: true,
  },
  highContrast: {
    type: Boolean,
    default: false,
  },
})

const hasData = computed(() =>
  !!(props.vehicleClass && props.vehicleClass.class && typeof props.vehicleClass.performanceIndex === "number")
)

const className = computed(() => props.vehicleClass?.class?.name ?? "")

const indexValue = computed(() =>
  hasData.value ? props.vehicleClass.performanceIndex.toFixed(0) : ""
)

const classKey = computed(() => `ui.career.performance.class${className.value}`)

const classIndexMap = { D: 0, C: 1, B: 2, A: 3, S: 4, X: 5 }
const classCount = 5

const getRgbForValue = (value, min = 0, max = 1) => {
  const normalized = (value - min) / (max - min)
  const adjusted = Math.max(0, normalized - 0.1) * (1 / 0.9)
  let red, green
  if (adjusted < 0.5) {
    red = 200
    green = Math.round(200 * (adjusted * 2))
  } else {
    red = Math.max(0, Math.round(200 * (2 - adjusted * 2)))
    green = 200
  }
  return [red, green, 0]
}

const classColor = computed(() => {
  const idx = classIndexMap[className.value]
  if (idx === undefined) return null
  const [r, g, b] = getRgbForValue(idx, 0, classCount)
  return `rgb(${r}, ${g}, ${b})`
})

const stickerStyle = computed(() => {
  if (!hasData.value || !classColor.value) return null
  return {
    color: classColor.value,
    borderColor: classColor.value,
  }
})
</script>

<style lang="scss" scoped>
.performance-index-sticker {
  display: inline-flex;
  align-items: center;
  background-color: rgba(var(--bng-cool-gray-100-rgb), 0.1);
  border-radius: 999px;
  border: 2px solid transparent;
  color: var(--bng-orange-b400);
  font-family: "Overpass", var(--fnt-defs);
  white-space: nowrap;
}

.is-na {
  color: var(--bng-cool-gray-300);
  font-style: italic;
}

.size-sm {
  font-size: 0.85em;
  padding: 4px 10px;
}

.size-md {
  font-size: 1em;
  padding: 6px 12px;
}

.size-lg {
  font-size: 1.1em;
  padding: 8px 16px;
}

.high-contrast {
  font-weight: 600;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.6);
}
</style>
