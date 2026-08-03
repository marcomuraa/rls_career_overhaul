<template>
  <div ref="rootRef" class="pause-vehicle-parts">
    <PauseParts ref="pausePartsRef" v-if="isPartsRoute" />
    <div v-else class="pause-vehicle-parts-placeholder">
      Vehicle parts route is not available yet.
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import PauseParts from "../../components/PauseParts.vue"

defineOptions({ name: "PauseVehicleParts" })

const route = useRoute()
const rootRef = ref(null)
const pausePartsRef = ref(null)

const normalizedRoutePath = computed(() => route.path.replace(/\/+$/, "") || "/")
const isPartsRoute = computed(() => normalizedRoutePath.value.startsWith("/pause/vehicle/parts"))

function focusEntry() {
  const pausePartsFocus = pausePartsRef.value?.focusEntry?.()
  if (pausePartsFocus) return true

  const rootElement = rootRef.value
  if (!rootElement) return false

  const target = rootElement.querySelector(".pause-parts-content .bng-accitem-caption")
    || rootElement.querySelector(".pause-parts-search input")
    || rootElement.querySelector(".pause-parts button:not([disabled])")

  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  return !!(await pausePartsRef.value?.activateBottomBar?.())
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>

<style scoped lang="scss">
.pause-vehicle-parts {
  display: flex;
  flex-flow: column;
  justify-content: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.pause-vehicle-parts-placeholder {
  color: rgba(var(--bng-off-white-rgb), 0.8);
  font-size: 0.9rem;
  padding: 0.5rem 0;
}
</style>
