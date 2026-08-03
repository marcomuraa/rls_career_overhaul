<template>
  <ComputerWrapper :title="title" back @back="close">
    <VehicleInventory class="vehicle-inventory" />
  </ComputerWrapper>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from "vue"
import ComputerWrapper from "./ComputerWrapper.vue"
import { useVehicleInventoryStore } from "../stores/vehicleInventoryStore"
import { ACCENTS } from "@/common/components/base"
import VehicleInventory from "../components/vehicleInventory/VehicleInventory.vue"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services/translation"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { useRouteDataStore } from "@/services/routeData"

const vehicleInventoryStore = useVehicleInventoryStore()
const route = useRoute()
const routeDataStore = useRouteDataStore()
const title = computed(() => vehicleInventoryStore.vehicleInventoryData.header || $translate.instant("ui.career.shared.myVehicles"))

// Inventory rows depend on Lua data arriving after mount. Delay the manual
// routeMounted ack and scope activation until the data is present and rendered
// so `bng-scoped-nav-autofocus` lands on a navigable vehicle entry.
const isInventoryReady = computed(() => !!vehicleInventoryStore.vehicleInventoryData?.vehicles)

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return
  if (!isInventoryReady.value) return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeDataStore.routeName || routeName
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

watch(isInventoryReady, ready => {
  if (ready) notifyRouteMountedWhenReady()
})

// display repair popup when required
watch(
  () => vehicleInventoryStore.vehIdToChooseAfterRepairPopup,
  (newId, oldId) => {
    !oldId && newId && confirmRepair()
  }
)

const confirmRepair = async vehicle => {
  const res = await openConfirmation("", $translate.instant("ui.career.shared.repairPreviousVehicleQuestion"), [
    { label: $translate.instant("ui.common.yes"), value: true, extras: { default: true } },
    { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.secondary } },
  ])
  if (res) {
    vehicleInventoryStore.repairPopupAccept()
  } else {
    vehicleInventoryStore.repairPopupDecline()
  }
}

const close = () => lua.extensions.ui_router.back()

const kill = () => {
  vehicleInventoryStore.$dispose()
}

onUnmounted(kill)
</script>

<style scoped lang="scss">
.vehicle-inventory {
  max-width: 60rem;
  height: 100%;
}
</style>
