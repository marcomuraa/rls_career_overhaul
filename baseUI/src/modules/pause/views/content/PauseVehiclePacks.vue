<template>
  <div ref="rootRef" class="pause-vehicle-packs">
    <PartPacks v-if="isPacksRoute" :can-deactivate-scope="onPacksScopeBack" :with-scoped-nav="false" />
    <div v-else class="pause-vehicle-packs-placeholder">
      Vehicle subroute is not available yet.
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import PartPacks from "@/modules/vehicleConfig/components/PartsPacks.vue"

defineOptions({ name: "PauseVehiclePacks" })

const route = useRoute()
const rootRef = ref(null)
const isPacksRouteBackPending = ref(false)

const normalizedRoutePath = computed(() => route.path.replace(/\/+$/, "") || "/")
const isPacksRoute = computed(() => normalizedRoutePath.value.startsWith("/pause/vehicle/packs"))

function onPacksScopeBack() {
  if (isPacksRouteBackPending.value) return false
  isPacksRouteBackPending.value = true
  void Promise.resolve(lua.extensions.ui_router.back())
    .finally(() => {
      isPacksRouteBackPending.value = false
    })
  return false
}

function focusEntry() {
  const rootElement = rootRef.value
  if (!rootElement) return false
  const target = rootElement.querySelector(".path-back, .folder-button, .pack-item-button, button:not([disabled])")
  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

defineExpose({
  focusEntry,
})
</script>

<style scoped lang="scss">
.pause-vehicle-packs {
  width: 100%;
  height: 100%;
}

.pause-vehicle-packs-placeholder {
  color: rgba(var(--bng-off-white-rgb), 0.8);
  font-size: 0.9rem;
  padding: 0.5rem 0;
}
</style>
