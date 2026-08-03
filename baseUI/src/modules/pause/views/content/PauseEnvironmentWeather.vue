<template>
  <div ref="rootRef" class="pause-environment-controls" :class="{ 'is-readonly': !isEditable }" >
    <EnvironmentWeatherPanel compact :route-environment-data="data" />
    <div v-if="!isEditable && readonlyReason" class="readonly-reason">
      {{ readonlyReason }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { setFocus } from "@/services/uiNavFocus"
import { useRouteDataStore } from "@/services/routeData"
import EnvironmentWeatherPanel from "@/modules/environmentControls/components/EnvironmentWeatherPanel.vue"

defineOptions({ name: "PauseEnvironmentWeather" })

const rootRef = ref(null)
const routeDataStore = useRouteDataStore()
const data = computed(() => routeDataStore.data?.layoutMenu?.content?.data || {})

const isEditable = computed(() => data.value?.editable !== false)
const readonlyReason = computed(() => data.value?.disabledReason || "Read-only in this mode")

function isVisibleAndFocusable(target) {
  if (!target || typeof target.focus !== "function") return false
  if (target.matches?.("[disabled]")) return false
  return target.getClientRects().length > 0
}

function focusElement(target) {
  if (!isVisibleAndFocusable(target)) return false
  const focused = setFocus(target)
  if (focused) return true
  target.focus()
  return document.activeElement === target
}

function focusEntry() {
  if (!isEditable.value) {
    const root = rootRef.value
    if (!root || typeof root.focus !== "function") return false
    root.focus()
    return true
  }

  const root = rootRef.value
  if (!root) return false

  const selectors = [
    // Keep slider entry behavior consistent with other screens:
    // first focus slider container, then OK activates knob/input.
    ".tod-slider.bng-slider-container",
    ".tod-slider",
    ".environment-controls-panel [bng-nav-item]:not([disabled])",
    ".environment-controls-panel button:not([disabled])",
    ".environment-controls-panel input:not([disabled]):not([type='range'])",
    ".environment-controls-panel input[type='range']:not([disabled])",
    ".environment-controls-panel [tabindex='0']",
  ]

  for (const selector of selectors) {
    const target = root.querySelector(selector)
    if (focusElement(target)) return true
  }
  return false
}

defineExpose({
  focusEntry,
})
</script>

<style scoped lang="scss">
.pause-environment-controls {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;

  :deep(.environment-controls-panel) {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.pause-environment-controls.is-readonly {
  :deep(.environment-controls-panel) {
    pointer-events: none;
    opacity: 0.65;
  }
}

.readonly-reason {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(var(--bng-off-white-rgb), 0.85);
}
</style>
