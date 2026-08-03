<template>
  <ComputerWrapper :path="[$translate.instant('ui.career.shared.pathPainting')]" :title="$translate.instant('ui.career.shared.pathPainting')" back @back="close">
    <!-- tood: why is this not using the Shopping cart component?-->
    <Painting no-header @ready="isPaintingReady = true" />
  </ComputerWrapper>
</template>

<script setup>
import { ref, watch, nextTick } from "vue"
import { lua } from "@/bridge"
import { useRoute } from "vue-router"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import ComputerWrapper from "./ComputerWrapper.vue"
import Painting from "../components/painting/Painting.vue"
import { $translate } from "@/services/translation"

const route = useRoute()

const close = () => lua.extensions.ui_router.back()

const isPaintingReady = ref(false)

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return
  if (!isPaintingReady.value) return

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

watch(isPaintingReady, ready => {
  if (ready) notifyRouteMountedWhenReady()
})
</script>

<style scoped lang="scss">
</style>
