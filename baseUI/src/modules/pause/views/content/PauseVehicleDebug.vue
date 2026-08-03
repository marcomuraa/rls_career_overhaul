<template>
  <Debug
    v-bng-scoped-nav="{
      scopeId: 'pause-vehicle-debug-content',
      type: 'normal',
      preferAutoFocus: true,
      bubbleWhitelistEvents: ['menu'],
    }"
    class="scrollable"
    ref="debugRef"
  />
</template>

<script setup>
import { ref } from "vue"
import { vBngScopedNav } from "@/common/directives"
import Debug from "@/modules/vehicleConfig/components/Debug.vue"

defineOptions({ name: "PauseVehicleDebug" })

const debugRef = ref(null)

function getDebugRootElement() {
  const debugInstance = debugRef.value
  if (!debugInstance) return null
  return debugInstance.$el || null
}

function focusEntry() {
  const rootElement = getDebugRootElement()
  if (!rootElement) return false

  const target = rootElement.querySelector("[bng-nav-item]:not([disabled])")
    || rootElement.querySelector("button:not([disabled])")
    || rootElement.querySelector("input:not([disabled])")
    || rootElement.querySelector("select:not([disabled])")
    || rootElement.querySelector("textarea:not([disabled])")

  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  return !!(await debugRef.value?.activateBottomBar?.())
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>

<style lang="scss" scoped>
.scrollable {
  box-sizing: border-box;
  width: clamp(32rem, 36vw, 42rem);
  max-width: 100%;
  height: 100%;
  backface-visibility: hidden;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  padding: 0.5rem 1rem;
}
</style>
