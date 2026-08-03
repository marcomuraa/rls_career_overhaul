<template>
  <div class="pause-nearby-vehicles" v-if="!isCareerMode">
    <PauseVehicleSpawnedTileGrid
      class="nearby-vehicles-grid"
      :vehicles="limitedVehicles"
      :loading="spawnedVehicles.loading"
      :selected-vehicle-id="spawnedVehicles.selectedVehicleId"
      :open-more-action-keys="openMoreActionKeys"
      @refresh-requested="onGridRefreshRequested"
    >
      <template #after-tiles>
        <Button
          class="open-spawned-button"
          :class="{ 'is-full-width': shouldManageButtonSpanTwoColumns }"
          @click="openSpawnedVehicles"
        >
          {{ manageButtonLabel }}
        </Button>
      </template>
    </PauseVehicleSpawnedTileGrid>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue"
import { lua } from "@/bridge"
import { Button } from "@/common/components/utility"
import { useStreams } from "@/services/events"
import { $translate } from "@/services"
import { useRouteDataStore } from "@/services/routeData"
import PauseVehicleSpawnedTileGrid from "./PauseVehicleSpawnedTileGrid.vue"

defineOptions({ name: "PauseNearbyVehicles" })

const routeDataStore = useRouteDataStore()
const bngVue = window.bngVue || { gotoGameState() {} }
const streamVehicleStateById = ref({})
const hydratedSpawnedVehicles = ref(null)
const hydrationRequestId = ref(0)
const vehicleStateStreamName = "ui_pause_vehicleTabInteractions_vehicle_state"
const spawnedPayloadStreamName = "ui_pause_vehicleTabInteractions_spawned_payload"
const openMoreActionKeys = Object.freeze(["openMorePause", "openMore"])

const routeSpawnedVehicles = computed(() => routeDataStore.data?.layoutMenu?.content?.data?.spawnedVehicles || {})
const spawnedVehicles = computed(() => hydratedSpawnedVehicles.value || routeSpawnedVehicles.value || {})
const routeVehicles = computed(() => toArray(spawnedVehicles.value.vehicles))
const vehicles = computed(() => routeVehicles.value.map(vehicle => {
  const state = streamVehicleStateById.value[String(vehicle?.vehicleId)]
  const streamAiMode = normalizeAiMode(state?.aiMode ?? vehicle.aiMode)
  const streamControllerUiElements = Array.isArray(state?.controllerUiElements) ? state.controllerUiElements : vehicle.controllerUiElements
  return {
    ...vehicle,
    aiMode: streamAiMode,
    aiControlled: state ? state.aiControlled === true : vehicle.aiControlled === true,
    controllerUiElements: streamControllerUiElements,
  }
}))
const limitedVehicles = computed(() => vehicles.value.slice(0, 5))
const totalVehicleCount = computed(() => vehicles.value.length)
const manageButtonLabel = computed(() =>
  totalVehicleCount.value > 0
    ? $translate.instant("ui.pause.vehicle.manageAll", { count: totalVehicleCount.value })
    : $translate.instant("ui.pause.vehicle.manageVehicles")
)
const shouldManageButtonSpanTwoColumns = computed(() => totalVehicleCount.value % 2 === 0)
const isCareerMode = ref(false)

useStreams([vehicleStateStreamName, spawnedPayloadStreamName], streams => {
  if (Object.prototype.hasOwnProperty.call(streams, vehicleStateStreamName)) {
    const nextStateById = {}
    const entries = Array.isArray(streams[vehicleStateStreamName]) ? streams[vehicleStateStreamName] : Object.values(streams[vehicleStateStreamName] || {})
    for (const state of entries) {
      const id = Number(state?.vehicleId)
      if (!Number.isFinite(id)) continue
      nextStateById[String(id)] = state
    }
    streamVehicleStateById.value = nextStateById
  }

  if (Object.prototype.hasOwnProperty.call(streams, spawnedPayloadStreamName)) {
    applySpawnedPayload(streams[spawnedPayloadStreamName])
  }
})

onMounted(async () => {
  requestSpawnedPayload("nearby-mounted")
  isCareerMode.value = await lua.career_career.isActive()
})

function onGridRefreshRequested() {
  requestSpawnedPayload("nearby-action")
}

async function requestSpawnedPayload(reason) {
  const requestId = ++hydrationRequestId.value
  hydratedSpawnedVehicles.value = {
    ...spawnedVehicles.value,
    loading: true,
  }
  const payload = await lua.ui_pause_providers_vehicleTabInteractions.requestSpawnedVehiclesPayload({
    requestId,
    reason,
    context: { mode: routeSpawnedVehicles.value.mode },
  })
  applySpawnedPayload(payload)
}

function applySpawnedPayload(payload) {
  if (!payload || typeof payload !== "object") return
  if (payload.debugDelayed === true) return
  const requestId = Number(payload.requestId)
  if (Number.isFinite(requestId) && requestId < hydrationRequestId.value) return
  hydratedSpawnedVehicles.value = payload
}

function normalizeAiMode(aiMode) {
  if (!aiMode || aiMode === "disabled") return "none"
  return aiMode
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return Object.values(value)
  return []
}

function openSpawnedVehicles() {
  void Promise.resolve(bngVue.gotoGameState("pause.manageVehicles"))
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
.pause-nearby-vehicles {
  padding: 0.5rem;
}

.open-spawned-button {
  grid-column: span 1;
}

.open-spawned-button.is-full-width {
  grid-column: 1 / -1;
}

.open-spawned-button {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);
  --bng-bg-focus: var(--bng-cool-gray-700);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);
  --bng-bg-focus-opacity: 0.6;

  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: center;

  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 1em;
  --bng-button-padding-bottom: 1em;
  --bng-button-margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;

  gap: 0.5em;
  min-height: 3em;
  width: 100%;
  --bng-button-align: center;
  --bng-button-justify: center;
}
</style>
