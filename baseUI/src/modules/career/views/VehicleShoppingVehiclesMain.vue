<template>
  <ComputerWrapper
    :path="[vehicleShoppingStore.currentSeller?.name || $translate.instant('ui.career.vehicleShopping.buyVehicles')]"
    :title="$translate.instant('ui.career.vehicleShopping.availableVehicles')"
    back
    @back="close"
  >
    <template #status>
      {{ $translate.instant("ui.career.vehicleShopping.freeInventorySlots") }} {{ vehicleShoppingStore.vehicleShoppingData.numberOfFreeSlots || 0 }}
    </template>

    <div
      v-bng-scoped-nav="{
        scopeId: 'vehicle-shopping-vehicles',
        preferAutoFocus: true,
      }"
      class="vehicles-screen"
    >
      <VehicleList v-if="isReady" />
      <BngCard v-else>
        <BngCardHeading style="color: #fff;">{{ $translate.instant("ui.career.vehicleShopping.pleaseWait") }}</BngCardHeading>
      </BngCard>
    </div>
  </ComputerWrapper>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeMount, onUnmounted } from "vue"
import { BngCard, BngCardHeading } from "@/common/components/base"
import { lua } from "@/bridge"
import { useRoute } from "vue-router"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { vBngScopedNav } from "@/common/directives"
import { $translate } from "@/services/translation"
import ComputerWrapper from "./ComputerWrapper.vue"
import VehicleList from "../components/vehicleShopping/VehicleList.vue"
import { useVehicleShoppingStore } from "../stores/vehicleShoppingStore"

const route = useRoute()
const vehicleShoppingStore = useVehicleShoppingStore()

// Shopping data arrives from Lua (vehicleShoppingData event); gate the screen,
// the routeMounted ack, and scope activation on it being present.
const isReady = computed(() => Object.keys(vehicleShoppingStore.vehicleShoppingData || {}).length > 0)

const close = () => lua.extensions.ui_router.back()

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return
  if (!isReady.value) return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (!result?.success) return
  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null
  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return

  activateRouteTargetScope()
}

watch(
  () => route.fullPath,
  () => {
    lastMountedAckRouteName.value = ""
    notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(isReady, ready => {
  if (ready) notifyRouteMountedWhenReady()
})

onBeforeMount(() => vehicleShoppingStore.requestInitialData())

// Shared store with the seller-grid screen: only tear down when leaving the whole
// vehicleShopping family (e.g. opening a purchase), not when backing to the grid.
const SHOPPING_ROUTE_FAMILY = "career.computer.vehicleShopping"
const isLeavingShoppingFamily = () => {
  const name = route.name
  return !(name === SHOPPING_ROUTE_FAMILY || (typeof name === "string" && name.startsWith(SHOPPING_ROUTE_FAMILY + ".")))
}

onUnmounted(() => {
  if (isLeavingShoppingFamily()) vehicleShoppingStore.leaveShopping()
})
</script>

<style scoped lang="scss">
.vehicles-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 80rem;
}
</style>
