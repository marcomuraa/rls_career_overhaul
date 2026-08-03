<template>
  <div
    class="scenario-start-shell"
    v-bng-scoped-nav="{ scopeId: 'scenario-start-root', type: 'container', preferAutoFocus: true }"
  >
    <PortraitStartScreen
      v-if="introType === 'portrait'"
      :data="data"
      :user-settings="userSettings"
      :show-start-button="showStartButton"
      :button-text="buttonText"
      @play="onPlay"
      @extra-button="onExtraButton"
      @apply-setting="onApplySetting"
    />

    <SelectableVehicleStartScreen
      v-else-if="introType === 'selectableVehicle'"
      :data="data"
      :selected-vehicle="selectedVehicle"
      :show-start-button="showStartButton"
      :is-disabled="!isPlayerValid()"
      :button-text="buttonText"
      @play="onPlay"
      @exit="onExit"
      @select-vehicle="onSelectVehicle"
    />

    <PlayerAssignmentStartScreen
      v-else-if="hasPlayerAssignment"
      :data="data"
      :players-config="playersConfig"
      :start-html-href="startHTMLHref"
      :show-start-button="showStartButton"
      :is-disabled="!isPlayerValid()"
      :button-text="buttonText"
      @play="onPlay"
    />

    <!-- Fallback for other introTypes (htmlOnly, none, undefined, ...),
    matching legacy start.html's negated condition - most quickrace/lightRunner
    tracks have introType "none" (no custom start html) but need this
    for the Play button scope. -->
    <HtmlStartScreen
      v-else
      :data="data"
      :start-html-href="startHTMLHref"
      :show-start-button="showStartButton"
      :is-disabled="!isPlayerValid()"
      :button-text="buttonText"
      @play="onPlay"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { vBngScopedNav } from "@/common/directives"
import { activateRouteTargetScope } from "@/services/scopedNav/api"

import { useScenarioStartData } from "../composables/useScenarioStartData"
import { useScenarioStartActions } from "../composables/useScenarioStartActions"
import { useScenarioStartInput } from "../composables/useScenarioStartInput"
import { useScenarioStartSettings } from "../composables/useScenarioStartSettings"
import { useScenarioVehicleSelection } from "../composables/useScenarioVehicleSelection"

import PortraitStartScreen from "./start/PortraitStartScreen.vue"
import HtmlStartScreen from "./start/HtmlStartScreen.vue"
import PlayerAssignmentStartScreen from "./start/PlayerAssignmentStartScreen.vue"
import SelectableVehicleStartScreen from "./start/SelectableVehicleStartScreen.vue"

const route = useRoute()

const playersConfig = ref({ playerValid: true })

const isPlayerValid = () => !!playersConfig.value?.playerValid

const hasPlayerAssignment = computed(() => {
  const vehicles = playersConfig.value?.vehicles
  if (!vehicles) return false
  return Object.keys(vehicles).some(key => !!vehicles[key])
})

const { selectedVehicle, setVehicle, reset: resetVehicle, selectVehicle } =
  useScenarioVehicleSelection({ enabled: true })

const {
  data,
  introType,
  buttonText,
  startHTMLHref,
  callObj,
  readyHook,
  exitHook,
  showStartButton,
  userCheckSettings,
  init: initData,
} = useScenarioStartData({
  onSelectableVehicleData: vehicleData => setVehicle(vehicleData),
})

const { play, exit, extraButton, notifyUIReady } = useScenarioStartActions({
  readyHook,
  exitHook,
  isPlayerValid,
})

const { userSettings, applySetting } = useScenarioStartSettings()

useScenarioStartInput({
  callObj,
  onAccelerateStart: () => play(),
  getPlayersConfig: nextConfig => {
    playersConfig.value = nextConfig
  },
})

const onPlay = () => play()
const onExit = () => exit()
const onExtraButton = cmd => extraButton(cmd)
const onApplySetting = key => applySetting(key)
const onSelectVehicle = () => selectVehicle()

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

// `data` (and therefore `introType`) arrives asynchronously via the
// `ScenarioChange` event fired from Lua in response to notifyUIReady(), so it
// is very rarely already set by the time this component mounts. Until then,
// none of the introType-specific child screens render, so waiting only a
// nextTick (as notifyRouteMountedWhenReady below does) isn't enough - the
// mount ack/scope activation would fire while only scenario-start-root
// exists, tripping RouteScopeValidator's "declared but not rendered"/
// "targetScope not found" warnings for scenario-start-actions and friends.
function waitForScenarioData(timeoutMs = 3000) {
  if (data.value) return Promise.resolve()
  return new Promise(resolve => {
    let settled = false
    const stop = watch(data, value => {
      if (!value || settled) return
      settled = true
      stop()
      resolve()
    })
    setTimeout(() => {
      if (settled) return
      settled = true
      stop()
      resolve()
    }, timeoutMs)
  })
}

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
  await waitForScenarioData()
  await notifyRouteMountedWhenReady()
  activateRouteTargetScope()
}

onMounted(async () => {
  initData()
  notifyUIReady()
  await notifyRouteMounted()
})

watch(
  () => route.fullPath,
  async () => {
    await notifyRouteMounted()
  },
)
</script>

<style lang="scss" scoped>
.scenario-start-shell {
  width: 100%;
  height: 100%;
  pointer-events: auto;
  color: white;
}
</style>
