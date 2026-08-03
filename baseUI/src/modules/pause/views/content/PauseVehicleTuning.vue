<template>
  <Tuning ref="tuningRef" />
</template>

<script setup>
import { ref } from "vue"
import Tuning from "@/modules/vehicleConfig/components/Tuning.vue"

defineOptions({ name: "PauseVehicleTuning" })

const tuningRef = ref(null)

function getTuningRootElement() {
  const tuningInstance = tuningRef.value
  if (!tuningInstance) return null
  return tuningInstance.$el || null
}

function focusEntry() {
  const tuningFocus = tuningRef.value?.focusEntry?.()
  if (tuningFocus) return true

  const rootElement = getTuningRootElement()
  if (!rootElement) return false

  const target = rootElement.querySelector(".property-slider [bng-nav-item]:not([disabled])")
    || rootElement.querySelector(".property-slider input:not([disabled])")
    || rootElement.querySelector(".buttons button:not([disabled])")
    || rootElement.querySelector("button:not([disabled])")
    || rootElement.querySelector("input:not([disabled])")

  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  return !!(await tuningRef.value?.activateBottomBar?.())
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>
