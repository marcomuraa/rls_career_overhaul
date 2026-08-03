<template>
  <div class="pause-vehicle-spawned">
    <div class="ai-control">
      <div class="control-label">{{ $tt("ui.pause.vehicle.npcAi") }}</div>
      <BngSelect
        v-model="selectedAiMode"
        class="ai-select"
        :options="aiModeOptions"
        :config="aiModeConfig"
        :disabled="actions.aiModeDisabled"
        loop
        @valueChanged="onAiModeChanged"
      />
    </div>

    <div class="bulk-action-grid">
      <Button
        class="bulk-action-button"
        :disabled="actions.cloneCurrent?.disabled || cloneDisabled"
        @click="onCloneCurrent"
      >
        <template #prefix>
          <BngIcon
            v-if="actions.cloneCurrent?.icon"
            :type="actions.cloneCurrent.icon"
          />
        </template>
        {{ actions.cloneCurrent?.label || "Clone current vehicle" }}
      </Button>
      <Button
        class="bulk-action-button"
        :disabled="actions.deleteOtherVehicles?.disabled"
        :class="{ danger: actions.deleteOtherVehicles?.danger }"
        @click="executeAction(actions.deleteOtherVehicles)"
      >
        <template #prefix>
          <BngIcon
            v-if="actions.deleteOtherVehicles?.icon"
            :type="actions.deleteOtherVehicles.icon"
          />
        </template>
        {{ actions.deleteOtherVehicles?.label || "Delete other vehicles" }}
      </Button>
    </div>

    <PauseVehicleSpawnedTileGrid
      :vehicles="vehicles"
      :loading="spawnedVehicles.loading"
      :selected-vehicle-id="spawnedVehicles.selectedVehicleId"
      :open-more-action-keys="openMoreActionKeys"
      @refresh-requested="requestSpawnedPayload('action')"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { BngIcon, BngSelect } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { useEvents, useStreams } from "@/services/events"
import { useRouteDataStore } from "@/services/routeData"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { openConfirmation } from "@/services/popup"
import PauseVehicleSpawnedTileGrid from "./PauseVehicleSpawnedTileGrid.vue"

defineOptions({ name: "PauseVehicleSpawned" })

const routeDataStore = useRouteDataStore()
const route = useRoute()
const blocker = useUINavBlocker()
const events = useEvents()
const selectedAiMode = ref("none")
const hydratingAiMode = ref(false)
const optimisticOtherAiMode = ref(null)
const streamVehicleStateById = ref({})
const hydratedSpawnedVehicles = ref(null)
const hydrationRequestId = ref(0)
const cloneDisabled = ref(false)
const vehicleStateStreamName = "ui_pause_vehicleTabInteractions_vehicle_state"
const spawnedPayloadStreamName = "ui_pause_vehicleTabInteractions_spawned_payload"

const aiModeConfig = Object.freeze({
  value: option => option?.value,
  label: option => option?.label,
})

const routeSpawnedVehicles = computed(() => routeDataStore.data?.layoutMenu?.content?.data?.spawnedVehicles || {})
const spawnedVehicles = computed(() => hydratedSpawnedVehicles.value || routeSpawnedVehicles.value || {})
const routeVehicles = computed(() => toArray(spawnedVehicles.value.vehicles))
const actions = computed(() => spawnedVehicles.value.actions || {})
const aiModeOptions = computed(() => toArray(spawnedVehicles.value.aiModeOptions))
const openMoreActionKeys = computed(() => {
  if (route.name === "pause.manageVehicles") {
    return ["openMoreManage", "openMore", "openMorePause"]
  }
  return ["openMore"]
})
const baseVehicles = computed(() => routeVehicles.value.map(vehicle => {
  const state = streamVehicleStateById.value[String(vehicle?.vehicleId)]
  const streamAiMode = normalizeAiMode(state?.aiMode ?? vehicle.aiMode)
  const streamControllerUiElements = Array.isArray(state?.controllerUiElements) ? state.controllerUiElements : vehicle.controllerUiElements
  return {
    ...vehicle,
    aiMode: streamAiMode,
    aiModeLabel: getAiModeLabel(streamAiMode),
    aiControlled: state ? state.aiControlled === true : vehicle.aiControlled === true,
    controllerUiElements: streamControllerUiElements,
  }
}))
const actualOtherVehiclesAiMode = computed(() => getOtherVehiclesAiMode(baseVehicles.value))
const vehicles = computed(() => baseVehicles.value.map(vehicle => {
  if (!optimisticOtherAiMode.value || vehicle.isCurrent) return vehicle
  return {
    ...vehicle,
    aiMode: optimisticOtherAiMode.value,
    aiModeLabel: getAiModeLabel(optimisticOtherAiMode.value),
    aiControlled: optimisticOtherAiMode.value !== "none",
  }
}))

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

watch(
  () => spawnedVehicles.value.aiOtherVehiclesMode,
  async mode => {
    optimisticOtherAiMode.value = null
    hydratingAiMode.value = true
    selectedAiMode.value = mode || "none"
    await nextTick()
    hydratingAiMode.value = false
  },
  { immediate: true }
)

watch(
  actualOtherVehiclesAiMode,
  async mode => {
    if (!mode) return
    if (optimisticOtherAiMode.value) {
      if (mode === optimisticOtherAiMode.value || mode === "mixed") {
        optimisticOtherAiMode.value = null
      } else {
        return
      }
    }
    hydratingAiMode.value = true
    selectedAiMode.value = mode
    await nextTick()
    hydratingAiMode.value = false
  },
  { immediate: true }
)

onMounted(() => {
  blocker.ensureNoBlock(["context", "action_2", "action_3"])
  requestSpawnedPayload("mounted")
})

onUnmounted(() => {
  blocker.ensureNoBlock([])
})

async function executeAction(action, options = {}) {
  if (!action || action.disabled || action.buttonId == null) return
  if (action.confirmText) {
    const confirmed = await openConfirmation(action.label || "", action.confirmText)
    if (!confirmed) return
  }
  const result = await lua.ui_pause_providers_vehicleTabInteractions.executeVehicleTabInteractionAction(action.buttonId, {})
  if (options.reload === true) {
    await lua.extensions.ui_router.reload()
  } else if (options.refreshPayload !== false) {
    await requestSpawnedPayload("action")
  }
  return result
}

async function onCloneCurrent() {
  if (cloneDisabled.value) return
  cloneDisabled.value = true
  await executeAction(actions.value.cloneCurrent)
}

events.on("VehicleTabSpawnFinished", () => {
  cloneDisabled.value = false
})

async function onAiModeChanged(value) {
  if (hydratingAiMode.value || value === "mixed") return
  const buttonId = actions.value.aiModeButtons?.[value]
  if (buttonId == null) return
  const previousMode = selectedAiMode.value
  optimisticOtherAiMode.value = value
  const result = await executeAction({ buttonId, label: `Set AI mode: ${value}` }, { refreshPayload: false })
  if (result === false) {
    optimisticOtherAiMode.value = null
    selectedAiMode.value = spawnedVehicles.value.aiOtherVehiclesMode || previousMode || "none"
  }
}

async function selectVehicle(vehicle) {
  if (!vehicle?.selectButtonId) return
  await lua.ui_pause_providers_vehicleTabInteractions.executeVehicleTabInteractionAction(vehicle.selectButtonId, {})
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

function getAiModeLabel(aiMode) {
  const normalized = normalizeAiMode(aiMode)
  const labels = {
    none: "None",
    traffic: "Traffic",
    chase: "Chase",
    flee: "Flee",
    follow: "Follow",
    random: "Random",
  }
  return labels[normalized] || normalized
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

function getOtherVehiclesAiMode(vehicleList) {
  let mode = null
  let hasOtherVehicle = false
  for (const vehicle of vehicleList || []) {
    if (vehicle?.isCurrent) continue
    hasOtherVehicle = true
    const vehicleMode = normalizeAiMode(vehicle?.aiMode)
    if (mode == null) {
      mode = vehicleMode
    } else if (mode !== vehicleMode) {
      return "mixed"
    }
  }
  return hasOtherVehicle ? mode || "none" : "none"
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
.pause-vehicle-spawned {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem;
}

.ai-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  flex: 0 0 auto;
}

.ai-select {
  min-width: 14rem;
}

.danger {
  --bng-bg-enabled: var(--bng-add-red-600);
  --bng-bg-hover: var(--bng-add-red-600);
  --bng-bg-active: var(--bng-add-red-600);
  --bng-bg-disabled: var(--bng-add-red-600);
  --bng-bg-border-enabled: var(--bng-add-red-400);
  --bng-bg-border-hover: var(--bng-add-red-400);
  --bng-bg-border-active: var(--bng-add-red-400);
  --bng-bg-border-disabled: var(--bng-add-red-400);
}

.bulk-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.bulk-action-button {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --bng-icon-size: 1.75em;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-650);
  --bng-bg-hover: var(--bng-cool-gray-600);
  --bng-bg-active: var(--bng-cool-gray-600);
  --bng-bg-disabled: var(--bng-cool-gray-600);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.85;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;

  --bng-bg-border-enabled: var(--bng-cool-gray-300);
  --bng-bg-border-hover: var(--bng-cool-gray-300);
  --bng-bg-border-active: var(--bng-cool-gray-300);
  --bng-bg-border-disabled: var(--bng-cool-gray-300);
  --bng-bg-border-focus: var(--bng-cool-gray-300);
  --bng-bg-focus-opacity: 0.6;

  --bng-content-align: center;
  --bng-content-justify: flex-start;
  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 0.85em;
  --bng-button-padding-bottom: 0.85em;
  --bng-button-margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;

  gap: 0.5em;
  min-height: 3em;
  width: 100%;
  justify-content: flex-start;
  text-align: left;
}
</style>
