<template>
  <ComputerWrapper :title="title" @back="close">
    <VehiclePerformanceTile :vehicle-data="vehicleData" />

    <!-- Tabs are shown in infobar because they are tracked events by crossfire.
     This is a hack to prevent them from displaying in the infobar -->
    <BngBinding v-show="false" ui-event="tab_l" controller />
    <BngBinding v-show="false" ui-event="tab_r" controller />
  </ComputerWrapper>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue"
import { BngBinding } from "@/common/components/base"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"

import VehiclePerformanceTile from "../components/vehiclePerformance/VehiclePerformanceTile.vue"
import ComputerWrapper from "./ComputerWrapper.vue"

const route = useRoute()
const routeDataStore = useRouteDataStore()

const vehicleData = computed(() => routeDataStore.data?.vehicleData || {})

const title = computed(() => vehicleData.value.niceName ? $translate.instant("ui.career.vehiclePerformance.titleWithVehicle", { name: vehicleData.value.niceName }) : "ui.career.vehiclePerformance.title")

const close = () => lua.extensions.ui_router.back()

const isPerformanceReady = computed(() => routeDataStore.routeName === route.name && routeDataStore.status === "mounted-ready")

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMounted() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

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

  // Data may already be present on fast re-entry; try activating right away.
  activatePerformanceScopeWhenReady()
}

let scopeActivationRequestId = 0
async function activatePerformanceScopeWhenReady() {
  if (!isPerformanceReady.value) return
  if (!lastMountedAckRouteName.value) return

  const requestId = ++scopeActivationRequestId
  const routeName = route.name
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== scopeActivationRequestId) return
  if (route.name !== routeName) return

  activateRouteTargetScope()
}

watch(
  () => route.fullPath,
  () => {
    lastMountedAckRouteName.value = ""
    notifyRouteMounted()
  },
  { immediate: true }
)

watch(isPerformanceReady, ready => {
  if (ready) activatePerformanceScopeWhenReady()
})
</script>
