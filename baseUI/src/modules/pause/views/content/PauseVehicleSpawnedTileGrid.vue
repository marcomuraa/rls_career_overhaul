<template>
  <div
    class="vehicle-grid"
    v-bng-on-ui-nav:ok.focusRequired="onNavSwitch"
    v-bng-on-ui-nav:action_2.focusRequired="onNavOpenMore"
    v-bng-on-ui-nav:context.focusRequired="onNavDelete"
    @mouseover="onGridMouseOver"
    @mouseout="onGridMouseOut"
    @focusin="onGridFocusIn"
    @focusout="onGridFocusOut"
  >
    <PauseVehicleSpawnedTileButton
      v-for="vehicle in vehicleCards"
      :key="vehicle.vehicleId"
      :vehicle="vehicle"
      :autofocus="vehicle.vehicleId === autofocusVehicleId"
      :action-slots="cardActionSlots"
      :ai-active="isVehicleAiActive(vehicle)"
      :focused="isVehicleFocused(vehicle)"
      @slot-action="executeVehicleSlotAction"
      @select="onVehicleSelect"
    />

    <div v-if="loading" class="empty-state">
      {{ $t("ui.pause.vehicle.spawnedGrid.loading") }}
    </div>
    <div v-else-if="vehicleCards.length === 0" class="empty-state">
      {{ $t("ui.pause.vehicle.spawnedGrid.empty") }}
    </div>

    <slot name="after-tiles" />
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from "vue"
import { lua } from "@/bridge"
import { vBngOnUiNav } from "@/common/directives"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services"
import { useScopedNav } from "@/services/scopedNav/api"
import PauseVehicleSpawnedTileButton from "./PauseVehicleSpawnedTileButton.vue"

defineOptions({ name: "PauseVehicleSpawnedTileGrid" })

const props = defineProps({
  vehicles: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  selectedVehicleId: {
    type: [Number, String],
    default: null,
  },
  openMoreActionKeys: {
    type: Array,
    default: () => ["openMore"],
  },
})

const emit = defineEmits(["refresh-requested"])

const { requestScopeFocus } = useScopedNav()
const hoveredVehicleId = ref(null)
const focusedVehicleId = ref(null)
const highlightedVehicleId = ref(null)
const mainCardScopeId = "menu-content-card-1"

const cardActionSlots = computed(() => [
  { key: "switch", uiEvent: "ok", icon: "steeringWheelSporty", label: $translate.instant("ui.pause.vehicle.spawnedGrid.action.drive") },
  { key: "openMore", uiEvent: "action_2", icon: "adjust", label: $translate.instant("ui.pause.vehicle.spawnedGrid.action.manage") },
  { key: "delete", uiEvent: "context", icon: "trashBin1", label: $translate.instant("ui.common.delete") },
])

const vehicleCards = computed(() => props.vehicles.map((vehicle, index) => {
  const labelParts = getVehicleLabelParts(vehicle, index)
  return {
    ...vehicle,
    cardDisplayNumber: labelParts.number,
    cardDisplayName: labelParts.name,
    slotActions: {
      switch: getVehicleAction(vehicle, ["switchToVehicle"]),
      delete: getDeleteAction(vehicle),
      openMore: getVehicleAction(vehicle, props.openMoreActionKeys),
    },
  }
}))

const autofocusVehicleId = computed(() => {
  const selectedId = Number(props.selectedVehicleId)
  if (Number.isFinite(selectedId) && vehicleCards.value.some(vehicle => vehicle.vehicleId === selectedId)) return selectedId
  return vehicleCards.value[0]?.vehicleId ?? null
})

watch(
  autofocusVehicleId,
  async vehicleId => {
    if (vehicleId == null) return
    await nextTick()
    requestScopeFocus(mainCardScopeId, `[data-spawned-vehicle-id="${vehicleId}"]`, { reason: "spawned-vehicle-return-focus" })
  },
  { flush: "post" }
)

function isVehicleFocused(vehicle) {
  return focusedVehicleId.value === vehicle?.vehicleId
}

async function executeVehicleSlotAction(vehicle, slotKey) {
  const action = vehicle?.slotActions?.[slotKey]
  if (!action || action.disabled) return
  const result = await executeAction(action)
  if (result !== false) {
    emit("refresh-requested")
  }
}

async function executeAction(action) {
  if (!action || action.disabled || action.buttonId == null) return false
  if (action.confirmText) {
    const confirmed = await openConfirmation(action.label || "", action.confirmText)
    if (!confirmed) return false
  }
  return lua.ui_pause_providers_vehicleTabInteractions.executeVehicleTabInteractionAction(action.buttonId, {})
}

function onVehicleSelect(vehicle) {
  return executeVehicleSlotAction(vehicle, "switch")
}

const onNavSwitch = () => executeFocusedVehicleSlotAction("switch")
const onNavOpenMore = () => executeFocusedVehicleSlotAction("openMore")
const onNavDelete = () => executeFocusedVehicleSlotAction("delete")

function executeFocusedVehicleSlotAction(slotKey) {
  const vehicle = getVehicleCardById(focusedVehicleId.value) || getVehicleFromElement(document.activeElement)
  if (!vehicle) return
  return executeVehicleSlotAction(vehicle, slotKey)
}

function onGridMouseOver(event) {
  const vehicle = getVehicleFromElement(event.target)
  if (!vehicle) {
    if (hoveredVehicleId.value == null) return
    hoveredVehicleId.value = null
    syncHighlightedVehicle()
    return
  }
  if (hoveredVehicleId.value === vehicle.vehicleId) return
  hoveredVehicleId.value = vehicle.vehicleId
  syncHighlightedVehicle()
}

function onGridMouseOut(event) {
  if (event.currentTarget instanceof Node && event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
  if (hoveredVehicleId.value == null) return
  hoveredVehicleId.value = null
  syncHighlightedVehicle()
}

function onGridFocusIn(event) {
  const vehicle = getVehicleFromElement(event.target)
  if (!vehicle || focusedVehicleId.value === vehicle.vehicleId) return
  focusedVehicleId.value = vehicle.vehicleId
  syncHighlightedVehicle()
}

function onGridFocusOut(event) {
  if (event.currentTarget instanceof Node && event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
  if (focusedVehicleId.value == null) return
  focusedVehicleId.value = null
  syncHighlightedVehicle()
}

function syncHighlightedVehicle() {
  const nextId = focusedVehicleId.value ?? hoveredVehicleId.value ?? null
  if (nextId === highlightedVehicleId.value) return
  if (highlightedVehicleId.value != null) {
    void lua.ui_pause_providers_vehicleTabInteractions.onVehicleHoverEnd(highlightedVehicleId.value)
  }
  if (nextId != null) {
    void lua.ui_pause_providers_vehicleTabInteractions.onVehicleHoverStart(nextId)
  }
  highlightedVehicleId.value = nextId
}

onUnmounted(() => {
  if (highlightedVehicleId.value != null) {
    void lua.ui_pause_providers_vehicleTabInteractions.onVehicleHoverEnd(highlightedVehicleId.value)
  }
})

function getVehicleFromElement(element) {
  const vehicleElement = element?.closest?.("[data-spawned-vehicle-id]")
  if (!vehicleElement) return null
  return getVehicleCardById(vehicleElement.dataset.spawnedVehicleId)
}

function getVehicleCardById(vehicleId) {
  if (vehicleId == null) return null
  return vehicleCards.value.find(vehicle => String(vehicle.vehicleId) === String(vehicleId)) || null
}

function normalizeAiMode(aiMode) {
  if (!aiMode || aiMode === "disabled") return "none"
  return aiMode
}

function isVehicleAiActive(vehicle) {
  return normalizeAiMode(vehicle?.aiMode) !== "none"
}

function getVehicleLabelParts(vehicle, index) {
  const parsedLabel = parseVehicleLabel(vehicle?.label)
  const displayNumber = vehicle?.displayNumberLabel || (vehicle?.displayNumber != null ? `${vehicle.displayNumber}.` : null) || parsedLabel.number || `${vehicle?.index || index + 1}.`
  const displayName = vehicle?.rawName || parsedLabel.name || vehicle?.label || $translate.instant("ui.pause.vehicle")
  return {
    number: displayNumber,
    name: displayName,
  }
}

function parseVehicleLabel(label) {
  const text = String(label || "")
  const match = text.match(/^(\d+\.)(?:\s+)?(.*)$/)
  if (!match) {
    return {
      number: null,
      name: text,
    }
  }
  return {
    number: match[1],
    name: match[2],
  }
}

function getVehicleAction(vehicle, actionKeys) {
  for (const key of actionKeys) {
    const action = vehicle?.cardActions?.[key]
    if (action?.buttonId != null || action?.visualOnly === true) return action
  }
  return null
}

function getDeleteAction(vehicle) {
  const action = getVehicleAction(vehicle, ["deleteVehicle"]) || getQuickDeleteFallback(vehicle)
  if (!action) return action
  const vehicleName = getVehicleNameForDeleteConfirm(vehicle)
  return {
    ...action,
    confirmText: $translate.instant("ui.pause.vehicle.action.confirmDeleteVehicle", { vehicle: vehicleName }),
  }
}

function getQuickDeleteFallback(vehicle) {
  if (!vehicle?.quickDeleteButtonId) return null
  const vehicleName = getVehicleNameForDeleteConfirm(vehicle)
  return {
    buttonId: vehicle.quickDeleteButtonId,
    label: $translate.instant("ui.pause.vehicle.spawnedGrid.action.quickDelete"),
    icon: "removeListItem",
    danger: true,
    confirmText: $translate.instant("ui.pause.vehicle.action.confirmDeleteVehicle", { vehicle: vehicleName }),
  }
}

function getVehicleNameForDeleteConfirm(vehicle) {
  return vehicle?.cardDisplayName || vehicle?.rawName || vehicle?.label || $translate.instant("ui.pause.vehicle.spawnedGrid.fallbackDeleteName")
}
</script>

<style scoped lang="scss">
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

}

.empty-state {
  grid-column: 1 / -1;
  padding: 0.75rem;
  color: var(--bng-cool-gray-200);
}
</style>
