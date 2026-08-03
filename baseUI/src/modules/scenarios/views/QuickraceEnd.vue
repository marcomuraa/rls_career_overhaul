<template>
  <div
    class="quickrace-end-shell"
    v-bng-scoped-nav="{ scopeId: 'scenario-quickrace-end-root', type: 'container', preferAutoFocus: true }"
  >
    <QuickraceScenarioEndScreen
      v-if="data"
      :data="data"
      :failed="isFailed"
      :is-new-local-best="isNewLocalBest"
      :has-place="hasPlace"
      :place="place"
      :detailed="detailed"
      :lap-rows="visibleLapRows"
      :leaderboard-rows="currentLeaderboardRows"
      :view-detailed="viewDetailed"
      :detailed-record="detailedRecord"
      :active-button="activeButton"
      @toggle-detail="toggleDetail"
      @update:view-detailed="onLeaderboardModeChange"
      @select-record="onSelectRecord"
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

import QuickraceScenarioEndScreen from "./end/QuickraceScenarioEndScreen.vue"
import { useQuickraceEndData } from "../composables/useQuickraceEndData"
import { useScenarioEndActions } from "../composables/useScenarioEndActions"

const route = useRoute()

const {
  data,
  detailed,
  detailedRecord,
  activeButton,
  rewards,
  rewardChosen,
  viewDetailed,
  visibleLapRows,
  currentLeaderboardRows,
  place,
  isNewLocalBest,
  hasPlace,
  isFailed,
  init: initData,
  toggleDetail,
  showRecord,
  setLeaderboardMode,
  chooseRewardVehicle,
} = useQuickraceEndData()

const { executeButton } = useScenarioEndActions({
  rewards,
  rewardChosen,
  chooseRewardVehicle,
})

function onLeaderboardModeChange(next) {
  setLeaderboardMode(next)
}

function onSelectRecord(index) {
  showRecord(index, viewDetailed.value === 0)
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
</script>

<style lang="scss" scoped>
.quickrace-end-shell {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  color: white;
}
</style>
