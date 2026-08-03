<template>
  <div class="pause-vehicle-spawned-summary">
    <div class="summary-line">{{ $tt("ui.pause.vehicle.spawnedSummary.currentVehicle", { name: effectiveSummary.currentVehicleName }) }}</div>
    <div class="summary-line">{{ $tt("ui.pause.vehicle.spawnedSummary.spawnedVehicles", { total: effectiveSummary.totalCount, aiControlled: effectiveSummary.aiControlledCount }) }}</div>

    <div class="vehicle-list">
      <div
        v-for="vehicle in mergedVehicles"
        :key="vehicle.vehicleId"
        class="vehicle-row"
        :class="{ 'is-current': vehicle.isCurrent, 'has-ai': vehicle.aiMode !== 'none' }"
      >
        <Background class="vehicle-row-background" />
        <span class="vehicle-label">
          <BngIcon
            v-if="vehicle.isCurrent"
            class="current-icon"
            type="steeringWheelSporty"
          />
          <span
            v-if="vehicle.labelNumber"
            class="vehicle-number"
          >
            {{ vehicle.labelNumber }}
          </span>
          <span class="vehicle-name">{{ vehicle.labelName }}</span>
        </span>
        <span
          v-if="vehicle.aiMode !== 'none'"
          class="ai-mode"
        >
          <BngIcon
            class="ai-icon"
            type="AIMicrochip"
          />
          {{ vehicle.aiModeLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { BngIcon } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { useStreams } from "@/services/events"
import { $translate } from "@/services"

defineOptions({ name: "PauseVehicleSpawnedSummary" })

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({}),
  },
  vehicles: {
    type: [Array, Object],
    default: () => [],
  },
})

const vehicleStateStreamName = "ui_pause_vehicleTabInteractions_vehicle_state"
const spawnedPayloadStreamName = "ui_pause_vehicleTabInteractions_spawned_payload"
const streamVehicleStateById = ref({})
const streamSpawnedPayload = ref(null)

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
    streamSpawnedPayload.value = streams[spawnedPayloadStreamName]
  }
})

function normalizeAiMode(aiMode) {
  if (!aiMode || aiMode === "disabled") return "none"
  return aiMode
}

function getAiModeLabel(aiMode) {
  const normalized = normalizeAiMode(aiMode)
  const keys = {
    none: "ui.pause.vehicle.aiMode.none",
    traffic: "ui.pause.vehicle.aiMode.traffic",
    chase: "ui.pause.vehicle.aiMode.chase",
    flee: "ui.pause.vehicle.aiMode.flee",
    follow: "ui.pause.vehicle.aiMode.follow",
    random: "ui.pause.vehicle.aiMode.random",
  }
  const key = keys[normalized]
  return key ? $translate.instant(key) : normalized
}

const sourceVehicles = computed(() => toArray(streamSpawnedPayload.value?.vehicles || props.vehicles))
const sourceSummary = computed(() => streamSpawnedPayload.value?.summary || props.summary || {})

const mergedVehicles = computed(() => sourceVehicles.value.map(vehicle => {
  const state = streamVehicleStateById.value[String(vehicle?.vehicleId)]
  const aiMode = normalizeAiMode(state?.aiMode ?? vehicle?.aiMode)
  const labelParts = parseVehicleLabel(vehicle?.label)
  return {
    ...vehicle,
    aiMode,
    aiModeLabel: getAiModeLabel(aiMode),
    aiControlled: state ? state.aiControlled === true : vehicle?.aiControlled === true,
    labelNumber: labelParts.number,
    labelName: labelParts.name,
  }
}))

const effectiveSummary = computed(() => {
  const aiControlledCount = mergedVehicles.value.filter(vehicle => vehicle.aiControlled).length
  return {
    currentVehicleName: sourceSummary.value?.currentVehicleName || $translate.instant("ui.pause.vehicle.none"),
    totalCount: sourceSummary.value?.totalCount ?? mergedVehicles.value.length,
    aiControlledCount,
  }
})

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return Object.values(value)
  return []
}

function parseVehicleLabel(label) {
  const text = String(label || "")
  const match = text.match(/^(\d+\.)(?:\s+)?(.*)$/)
  if (!match) {
    return {
      number: null,
      name: text || $translate.instant("ui.pause.vehicle"),
    }
  }
  return {
    number: match[1],
    name: match[2] || text,
  }
}
</script>

<style scoped lang="scss">
.pause-vehicle-spawned-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5em;
}

.summary-line {
  color: var(--bng-off-white);
  font-size: 0.9rem;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vehicle-row {
  --bng-bg-enabled: rgba(var(--bng-cool-gray-900-rgb), 0.55);
  --bng-bg-hover: rgba(var(--bng-cool-gray-900-rgb), 0.65);
  --bng-bg-active: rgba(var(--bng-cool-gray-900-rgb), 0.75);
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.08);
  --bng-bg-border-hover: rgba(var(--bng-off-white-rgb), 0.15);
  --bng-bg-border-active: rgba(var(--bng-off-white-rgb), 0.2);
  --bng-bg-border-width: 0.0625rem;
  --bng-bg-border-radius: var(--bng-corners-1);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5em;
  border-radius: var(--bng-corners-1);
  position: relative;
  isolation: isolate;

  &.is-current {
    --bng-bg-enabled: rgba(var(--bng-orange-500-rgb), 0.18);
    --bng-bg-hover: rgba(var(--bng-orange-500-rgb), 0.24);
    --bng-bg-active: rgba(var(--bng-orange-500-rgb), 0.3);
    --bng-bg-border-enabled: rgba(var(--bng-orange-500-rgb), 0.3);
    --bng-bg-image: linear-gradient(90deg, rgba(var(--bng-orange-500-rgb), 0.22), rgba(var(--bng-cool-gray-900-rgb), 0.45));
  }
}

.vehicle-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.current-icon {
  --bng-icon-color: var(--bng-orange-400);

  flex: 0 0 auto;
}

.vehicle-number {
  flex: 0 0 auto;
  font-family: var(--fnt-mono);
  color: var(--bng-cool-gray-200);
}

.vehicle-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-mode {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  color: var(--bng-cool-gray-200);
}

.ai-icon {
  font-size: 1rem;
}
</style>
