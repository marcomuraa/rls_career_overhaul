<template>
  <div
    class="scenario-end-shell"
    v-bng-scoped-nav="{ scopeId: 'scenario-end-root', type: 'container', preferAutoFocus: true }"
  >
    <StandardScenarioEndScreen
      v-if="data"
      :data="data"
      :rewards="rewards"
      :mission-data="missionData"
      :portrait-img="portraitImg"
      :medal-info="medalInfo"
      :chosen-vehicle="chosenVehicle"
      :reward-chosen="rewardChosen"
      :active-button="activeButton"
      :has-mission-data="hasMissionData"
      @choose-vehicle="onChooseVehicleClick"
      @execute="onExecute"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { vBngScopedNav } from "@/common/directives"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { useRouteDataStore } from "@/services/routeData"

import StandardScenarioEndScreen from "./end/StandardScenarioEndScreen.vue"
import { useScenarioEndData } from "../composables/useScenarioEndData"
import { useScenarioEndActions } from "../composables/useScenarioEndActions"

const route = useRoute()
const routeDataStore = useRouteDataStore()

const SCENARIO_END_ROUTE_NAMES = ["scenario.end", "scenario.chapter.end"]

const chosenVehicle = ref(null)

const {
  data,
  rewards,
  missionData,
  portraitImg,
  rewardChosen,
  hasMissionData,
  activeButton,
  medalInfo,
  init: initData,
  chooseRewardVehicle,
} = useScenarioEndData()

const { executeButton, onChooseVehicle } = useScenarioEndActions({
  rewards,
  rewardChosen,
  chooseRewardVehicle,
})

function onChooseVehicleClick(vehicle) {
  chosenVehicle.value = vehicle
  onChooseVehicle(vehicle)
}

function onExecute(button) {
  executeButton(button)
}

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  const routeFullPath = route.fullPath
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return false

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (requestId !== mountedAckRequestId) return false
  if (route.fullPath !== routeFullPath) return false

  const luaRouter = window.__luaRouter__
  const canonicalRoute = luaRouter?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return true

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  if (requestId !== mountedAckRequestId) return false
  if (route.fullPath !== routeFullPath) return false
  if (!result?.success) return false

  lastMountedAckRouteName.value = canonicalRoute
  if (luaRouter && luaRouter._pendingCanonicalRoute === canonicalRoute) {
    luaRouter._pendingCanonicalRoute = null
  }
  return true
}

async function notifyRouteMounted() {
  lastMountedAckRouteName.value = ""
  mountedAckRequestId += 1
  await notifyRouteMountedWhenReady()
  activateRouteTargetScope()
}

onMounted(async () => {
  await initData()
  await notifyRouteMounted()
})

watch(
  () => route.fullPath,
  async () => {
    await initData()
    await notifyRouteMounted()
  },
)

// Re-run `initData()` once the Lua router publishes the resolved route data
// for this screen. `onMounted` may fire before `routeDataStore.route.params`
// is populated (the Lua router emits `enter-ready` very early and the Vue
// route name has no path params), so without this watcher `pickPayload()`
// reads an empty payload and `data` stays null. Re-hydrating on
// `enter-ready` / `mounted-ready` ensures `stats`/`rewards`/etc. land in
// place once they arrive.
watch(
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "enter-ready" && status !== "mounted-ready") return
    if (!SCENARIO_END_ROUTE_NAMES.includes(routeName)) return
    if (data.value) return
    await initData()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.scenario-end-shell {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  color: white;
}
</style>
