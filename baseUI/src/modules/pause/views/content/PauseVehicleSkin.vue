<template>
  <div ref="rootRef" class="pause-vehicle-skin">
    <PauseSkin ref="pauseSkinRef" />
  </div>
</template>

<script setup>
import { ref } from "vue"
import PauseSkin from "../../components/PauseSkin.vue"

defineOptions({ name: "PauseVehicleSkin" })

const rootRef = ref(null)
const pauseSkinRef = ref(null)

function focusEntry() {
  const skinFocus = pauseSkinRef.value?.focusEntry?.()
  if (skinFocus) return true

  const rootElement = rootRef.value
  if (!rootElement) return false

  const target = rootElement.querySelector(".tabbed-panel-content .bng-accitem-caption")
    || rootElement.querySelector(".paint-preview-container [bng-nav-item]:not([disabled])")
    || rootElement.querySelector("button:not([disabled])")
    || rootElement.querySelector("input:not([disabled])")

  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  return !!(await pauseSkinRef.value?.activateBottomBar?.())
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>

<style scoped lang="scss">
.pause-vehicle-skin {
  display: flex;
  flex-flow: column;
  justify-content: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
