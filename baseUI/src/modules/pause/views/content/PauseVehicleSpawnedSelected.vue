<template>
  <div class="pause-vehicle-spawned-selected">
    <div v-if="vehicle" class="selected-summary">
      <div class="vehicle-meta">
        <span v-if="vehicle.isCurrent">
          <BngIcon :type="vehicle.icon" />
          {{ $t("ui.pause.vehicle.isCurrent") }}
        </span>
        <template v-else>
          {{ vehicle.label }}
        </template>
      </div>
    </div>

    <div
      v-for="group in groups"
      :key="group.id"
      class="action-group"
    >
      <div class="group-title">
        <template v-if="group.id === 'ai'">
          <BngIcon type="AIMicrochip" />
        </template>
        {{ group.label }}
      </div>
      <div
        class="group-actions"
        :class="{ 'two-columns': group.id === 'ai' }"
      >
        <PauseRailButton
          v-for="action in group.actions || []"
          :key="action.buttonId || action.action || action.label"
          :label="action.label"
          :icon="action.icon || '_empty'"
          :flavor="action.flavor || (action.danger ? 'danger' : '')"
          :disabled="action.disabled || (action.action === 'cloneVehicle' && cloneDisabled)"
          :route-target="action.routeTarget"
          @click="executeAction(action)"
        />
      </div>
    </div>

    <div v-if="!vehicle" class="empty-state">
      {{ $t("ui.radialmenu2.noVehicle") }}
    </div>
    <div v-else-if="selected.loading" class="loading-state">
      <BngProgressBar :max="100" :show-value-label="false" indeterminate />
      <span>{{ $t("ui.common.loading") }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { lua } from "@/bridge"
import { BngIcon, BngProgressBar } from "@/common/components/base"
import { useEvents, useStreams } from "@/services/events"
import { useRouteDataStore } from "@/services/routeData"
import { openConfirmation } from "@/services/popup"
import PauseRailButton from "../../components/PauseRailButton.vue"

defineOptions({ name: "PauseVehicleSpawnedSelected" })

const routeDataStore = useRouteDataStore()
const events = useEvents()
const hydratedSelected = ref(null)
const hydrationRequestId = ref(0)
const cloneDisabled = ref(false)
const selectedPayloadStreamName = "ui_pause_vehicleTabInteractions_spawned_selected_payload"

const routeSelected = computed(() => routeDataStore.data?.layoutMenu?.content?.data?.spawnedVehicleSelected || {})
const selected = computed(() => hydratedSelected.value || routeSelected.value || {})
const vehicle = computed(() => selected.value.vehicle || null)
const groups = computed(() => selected.value.groups || [])

useStreams([selectedPayloadStreamName], streams => {
  if (!Object.prototype.hasOwnProperty.call(streams, selectedPayloadStreamName)) return
  applySelectedPayload(streams[selectedPayloadStreamName])
})

onMounted(() => {
  requestSelectedPayload("mounted")
})

async function executeAction(action) {
  if (!action || action.disabled || action.buttonId == null) return
  if (action.confirmText) {
    const confirmed = await openConfirmation(action.label || "", action.confirmText)
    if (!confirmed) return
  }
  if (action.action === "cloneVehicle") cloneDisabled.value = true
  await lua.ui_pause_providers_vehicleTabInteractions.executeVehicleTabInteractionAction(action.buttonId, {})
  if (action.action === "deleteVehicle") return
  await requestSelectedPayload("action")
}

events.on("VehicleTabSpawnFinished", () => {
  cloneDisabled.value = false
})

async function requestSelectedPayload(reason) {
  const requestId = ++hydrationRequestId.value
  hydratedSelected.value = {
    ...selected.value,
    loading: true,
  }
  const payload = await lua.ui_pause_providers_vehicleTabInteractions.requestSpawnedSelectedVehiclePayload({
    requestId,
    reason,
  })
  applySelectedPayload(payload)
}

function applySelectedPayload(payload) {
  if (!payload || typeof payload !== "object") return
  if (payload.debugDelayed === true) return
  const requestId = Number(payload.requestId)
  if (Number.isFinite(requestId) && requestId < hydrationRequestId.value) return
  Object.assign(hydratedSelected.value, payload)
}
</script>

<style scoped lang="scss">
.pause-vehicle-spawned-selected {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.selected-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.45);
}

.vehicle-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.vehicle-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--bng-cool-gray-200);

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 0.0625rem solid rgba(var(--bng-off-white-rgb), 0.12);
  border-radius: var(--bng-corners-1);
}

.group-title {
  font-weight: 700;
}

.group-actions {
  --pause-rail-button-gap: 0.25rem;
  --pause-rail-button-label-opacity: 1;

  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &.two-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.empty-state {
  padding: 0.75rem;
  color: var(--bng-cool-gray-200);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  color: var(--bng-cool-gray-200);
}
</style>
