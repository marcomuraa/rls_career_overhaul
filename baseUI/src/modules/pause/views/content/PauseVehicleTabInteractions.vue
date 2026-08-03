<template>
  <div class="pause-vehicle-tab-interactions">
    <div
      v-for="section in sections"
      :key="section.id"
      class="section"
    >
      <div class="section-title">{{ section.title }}</div>
      <div
        v-for="item in section.items || []"
        :key="item.id"
      >
        <Button
          v-if="hasVehicleActions(item)"
          :class="['vehicle-card', { current: isVehiclePlayerControlled(item), ai: isVehicleAiControlled(item), online: isVehicleOnlineControlled(item), 'current-ai': isVehiclePlayerControlled(item) && isVehicleAiControlled(item) }]"
          v-bng-popover:right-start.click="popId"
          @mouseenter="onVehicleHoverStart(item)"
          @mouseleave="onVehicleHoverEnd(item)"
          @focus="onVehicleHoverStart(item)"
          @blur="onVehicleHoverEnd(item)"
          @click="openVehicleActions(item)"
        >
          <div class="vehicle-content">

            <div class="vehicle-title">{{ item.title }}</div>
            <div class="vehicle-status-icons">
              <div
                v-for="(playerSlot, idx) in getPlayerControlSlots(item)"
                :key="`top-player-${item.id}-${idx}`"
                class="vehicle-player-icon-wrap"
              >
                <BngIcon
                  class="vehicle-current-icon"
                  type="steeringWheelSporty"
                  color="white"
                />

                <div
                  v-if="playerSlot != null"
                  class="vehicle-player-slot-badge fnt-mono"
                >
                  <span class="vehicle-player-slot-text">{{ playerSlot }}</span>
                </div>
              </div>
              <BngIcon
                v-if="isVehicleAiControlled(item)"
                class="vehicle-ai-icon"
                type="AIMicrochip"
                color="white"
              />
              <BngIcon
                v-if="isVehicleOnlineControlled(item)"
                class="vehicle-online-icon"
                type="helmets"
                color="white"
              />
            </div>
          </div>
        </Button>
        <Button
          v-else
          :class="['vehicle-card', { current: isVehiclePlayerControlled(item), ai: isVehicleAiControlled(item), online: isVehicleOnlineControlled(item), 'current-ai': isVehiclePlayerControlled(item) && isVehicleAiControlled(item) }]"
          @mouseenter="onVehicleHoverStart(item)"
          @mouseleave="onVehicleHoverEnd(item)"
        >
          <div class="vehicle-content">
            <BngIcon
              v-if="item.icon"
              class="vehicle-icon"
              :type="item.icon"
              color="white"
            />
            <div class="vehicle-title">{{ item.title }}</div>
            <div class="vehicle-status-icons">
              <div
                v-for="(playerSlot, idx) in getPlayerControlSlots(item)"
                :key="`row-player-${item.id}-${idx}`"
                class="vehicle-player-icon-wrap"
              >

                <BngIcon
                  class="vehicle-current-icon"
                  type="steeringWheelSporty"
                  color="white"
                />

                <div
                  v-if="playerSlot != null"
                  class="vehicle-player-slot-badge fnt-mono"
                >
                  <span class="vehicle-player-slot-text">{{ playerSlot }}</span>
                </div>
              </div>
              <BngIcon
                v-if="isVehicleAiControlled(item)"
                class="vehicle-ai-icon"
                type="AIMicrochip"
                color="white"
              />
              <BngIcon
                v-if="isVehicleOnlineControlled(item)"
                class="vehicle-online-icon"
                type="helmets"
                color="white"
              />
            </div>
          </div>
        </Button>
      </div>
    </div>

    <BngPopoverMenu :name="popId" focus @hide="onVehicleActionsHide">

      <BngButton
        v-for="entry in visibleActionEntries"
        :key="entry.key"
        :accent="ACCENTS.menu"
        :disabled="entry.action.disabled"
        :class="{ 'submenu-entry': entry.isChild, 'submenu-parent-expanded': !entry.isChild && isActionExpanded(entry.action) }"
        v-bng-on-ui-nav:ok.focusRequired.asMouse
        @click="executeVehicleAction(entry.action)">
        {{ entry.action.label }}{{ hasActionChildren(entry.action) ? (isActionExpanded(entry.action) ? " v" : " >") : "" }}
      </BngButton>
    </BngPopoverMenu>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useBridge } from "@/bridge"
import { BngButton, BngIcon, BngPopoverMenu, ACCENTS } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngPopover, vBngOnUiNav } from "@/common/directives"
import { useEvents, useStreams } from "@/services/events"
import { usePopover } from "@/services/popover"
import { useRouteDataStore } from "@/services/routeData"
import { uniqueId } from "@/services/uniqueId"

defineOptions({ name: "PauseVehicleTabInteractions" })

const { lua } = useBridge()
const events = useEvents()
const routeDataStore = useRouteDataStore()
const popover = usePopover()
const popId = uniqueId("vehicle_switch_targets_options")
const selectedVehicleId = ref(null)
const expandedActionKeys = ref({})
const liveSections = ref(null)
const streamVehicleStateById = ref({})
const vehicleStateStreamName = "ui_pause_vehicleTabInteractions_vehicle_state"

const routeSections = computed(() => routeDataStore.data?.layoutMenu?.content?.data?.vehicleTabInteractions?.sections || [])
const baseSections = computed(() => liveSections.value || routeSections.value)
const sections = computed(() => {
  return (baseSections.value || []).map(section => ({
    ...section,
    items: (section.items || []).map(item => {
      const key = String(item?.vehicleId ?? item?.id ?? "")
      const state = streamVehicleStateById.value[key]
      if (!state) return item
      const controllerType = state.controllerType || item.controllerType || (item.isCurrent ? "player" : "none")
      const aiMode = state.aiMode ?? item.aiMode ?? null
      const aiControlled = state.aiControlled === true || (typeof aiMode === "string" && aiMode !== "" && aiMode !== "disabled" && aiMode !== "none")
      return {
        ...item,
        controllerType,
        controllingPlayerNums: Array.isArray(state.controllingPlayerNums) ? state.controllingPlayerNums : (Array.isArray(item.controllingPlayerNums) ? item.controllingPlayerNums : []),
        multiSeatLocal: state.multiSeatLocal === true || item.multiSeatLocal === true,
        onlineControlled: state.onlineControlled === true || item.onlineControlled === true,
        aiMode,
        aiControlled,
      }
    }),
  }))
})

events.on("ui_pause_vehicleTabInteractions_data", (payload) => {
  const incomingSections = payload?.sections
  streamVehicleStateById.value = {}
  liveSections.value = Array.isArray(incomingSections) ? incomingSections : []
})

function vehicleStateUpdatesAsList(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "object") return Object.values(raw)
  return []
}

useStreams([vehicleStateStreamName], (streams) => {
  if (!Object.prototype.hasOwnProperty.call(streams, vehicleStateStreamName)) return
  const nextStateById = {}
  for (const state of vehicleStateUpdatesAsList(streams[vehicleStateStreamName])) {
    const id = Number(state?.vehicleId)
    if (!Number.isFinite(id)) continue
    nextStateById[String(id)] = {
      controllerType: state.controllerType || "none",
      controllingPlayerNums: Array.isArray(state.controllingPlayerNums) ? state.controllingPlayerNums : [],
      multiSeatLocal: state.multiSeatLocal === true,
      onlineControlled: state.onlineControlled === true,
      aiMode: state.aiMode ?? null,
      aiControlled: state.aiControlled === true,
    }
  }
  streamVehicleStateById.value = nextStateById
})

function actionsAsList(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "object") return Object.values(raw)
  return []
}

function hasVehicleActions(item) {
  return actionsAsList(item?.actions).length > 0
}

function isVehiclePlayerControlled(item) {
  return item?.controllerType === "player"
}

function isVehicleAiControlled(item) {
  return item?.aiControlled === true
}

function isVehicleOnlineControlled(item) {
  return item?.onlineControlled === true
}

function getPlayerControlSlots(item) {
  const isPlayerControlled = isVehiclePlayerControlled(item)
  if (!isPlayerControlled) return []
  const controllingPlayerNums = Array.isArray(item?.controllingPlayerNums) ? item.controllingPlayerNums : []
  if (item?.multiSeatLocal === true && controllingPlayerNums.length > 0) {
    return controllingPlayerNums.map(playerNum => {
      const playerIndex = Number(playerNum)
      return Number.isFinite(playerIndex) ? Math.max(1, playerIndex + 1) : 1
    })
  }
  return item?.multiSeatLocal === true ? [] : [null]
}

const selectedVehicle = computed(() => {
  if (selectedVehicleId.value == null) return null
  for (const section of sections.value) {
    const item = (section.items || []).find(i => String(i.id) === String(selectedVehicleId.value))
    if (item) return item
  }
  return null
})

const selectedVehicleActions = computed(() => {
  if (!selectedVehicle.value) return []
  return actionsAsList(selectedVehicle.value.actions)
})

const visibleActionEntries = computed(() => {
  const out = []
  for (const action of selectedVehicleActions.value) {
    const actionKey = getActionKey(action)
    out.push({ key: `root:${actionKey}`, action, isChild: false })
    if (hasActionChildren(action) && expandedActionKeys.value[actionKey]) {
      for (const child of actionsAsList(action.children)) {
        out.push({ key: `child:${actionKey}:${getActionKey(child)}`, action: child, isChild: true })
      }
    }
  }
  return out
})

function openVehicleActions(item) {
  if (!item) return
  selectedVehicleId.value = item.id
  expandedActionKeys.value = {}
  // Defer Lua callback so popover opening is not blocked by sync bridge calls.
  window.setTimeout(() => {
    notifyHoverState("onVehiclePopoverOpen", item)
  }, 0)
}

function onVehicleActionsHide() {
  if (selectedVehicle.value) {
    const selected = selectedVehicle.value
    window.setTimeout(() => {
      notifyHoverState("onVehiclePopoverClose", selected)
    }, 0)
  }
  expandedActionKeys.value = {}
  selectedVehicleId.value = null
}

function closeVehicleActions() {
  popover.hide(popId)
  expandedActionKeys.value = {}
}

function executeVehicleAction(action) {
  if (!action || action.disabled) return
  if (hasActionChildren(action)) {
    const actionKey = getActionKey(action)
    expandedActionKeys.value = {
      ...expandedActionKeys.value,
      [actionKey]: !expandedActionKeys.value[actionKey],
    }
    return
  }
  if (action.buttonId == null) return
  lua.ui_pause_providers_vehicleTabInteractions.executeVehicleTabInteractionAction(action.buttonId, {})
  closeVehicleActions()
}

function hasActionChildren(action) {
  return actionsAsList(action?.children).length > 0
}

function getActionKey(action) {
  return String(action?.buttonId ?? action?.action ?? action?.label ?? "")
}

function isActionExpanded(action) {
  return expandedActionKeys.value[getActionKey(action)] === true
}

function notifyHoverState(methodName, item) {
  const vehicleId = Number(item?.vehicleId)
  if (!Number.isFinite(vehicleId)) return
  const method = lua.ui_pause_providers_vehicleTabInteractions?.[methodName]
  if (typeof method !== "function") return
  method(vehicleId)
}

function onVehicleHoverStart(item) {
  notifyHoverState("onVehicleHoverStart", item)
}

function onVehicleHoverEnd(item) {
  notifyHoverState("onVehicleHoverEnd", item)
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.pause-vehicle-tab-interactions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.section {
  border: 0.0625rem solid rgba(var(--bng-off-white-rgb), 0.15);
  border-radius: var(--bng-corners-1);
  padding: 0.5rem;
}

.section-title {
  font-size: 0.95rem;
  margin-bottom: 0.35rem;
}

.vehicle-card {
  --bng-button-margin: 0;
  --bng-button-min-width: 100%;
  --bng-button-max-width: 100%;
  --bng-button-padding: 0.5rem;
  --bng-button-padding-top: 0.5rem;
  --bng-button-padding-bottom: 0.5rem;
  --bng-bg-enabled: rgba(var(--bng-cool-gray-900-rgb), 0.96);
  --bng-bg-hover: rgba(var(--bng-cool-gray-900-rgb), 0.9);
  --bng-bg-active: rgba(var(--bng-cool-gray-900-rgb), 0.9);
  --bng-bg-border-enabled: transparent;
  --bng-bg-border-hover: transparent;
  --bng-bg-border-active: transparent;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-image: linear-gradient(90deg, rgba(var(--bng-cool-gray-900-rgb), 0.96) 0%, rgba(var(--bng-cool-gray-900-rgb), 0.9) 62%, rgba(var(--bng-cool-gray-900-rgb), 0.2) 100%);
  --bng-bg-size: 100% 100%;
  --bng-bg-position: center;
  @include modify-focus(var(--bng-corners-2), 2px);

  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 1.8rem;
  margin-bottom: 0.35rem;
  position: relative;
}

.vehicle-card.current {
  --bng-bg-image: linear-gradient(-90deg, rgba(var(--bng-orange-500-rgb), 0.32) 0%, rgba(var(--bng-cool-gray-900-rgb), 0.88) 62%, rgba(var(--bng-cool-gray-900-rgb), 0.2) 100%);
}

.vehicle-card.ai {
  --bng-bg-image: linear-gradient(-90deg, rgba(var(--bng-ter-blue-gray-500-rgb), 0.32) 0%, rgba(var(--bng-cool-gray-900-rgb), 0.88) 62%, rgba(var(--bng-cool-gray-900-rgb), 0.2) 100%);
}

.vehicle-card.current-ai {
  --bng-bg-image: linear-gradient(-90deg, rgba(var(--bng-orange-500-rgb), 0.28) 0%, rgba(var(--bng-ter-blue-gray-500-rgb), 0.24) 32%, rgba(var(--bng-cool-gray-900-rgb), 0.88) 68%, rgba(var(--bng-cool-gray-900-rgb), 0.2) 100%);
}

.vehicle-card.online {
  --bng-bg-image: linear-gradient(-90deg, rgba(var(--bng-orange-650-rgb), 0.36) 0%, rgba(var(--bng-cool-gray-900-rgb), 0.9) 62%, rgba(var(--bng-cool-gray-900-rgb), 0.2) 100%);
}

.vehicle-icon {
  font-size: 1.3rem;
  z-index: 1;
  flex: 0 0 1rem;
}

.vehicle-content {
  min-width: 0;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.vehicle-title {
  font-size: 0.95rem;
  padding-top: 0.15rem;
  font-weight: 500;
  max-width: none;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
}

.vehicle-current-icon {
  flex: 0 0 auto;
  font-size: 1.25rem;
  opacity: 0.95;
}

.vehicle-status-icons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
}

.vehicle-player-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vehicle-player-slot-badge {
  position: absolute;
  right: -0.15rem;
  bottom: -0.10rem;
  width: 0.75rem;
  height: 0.7rem;
  border-radius: 50%;
  background: rgba(var(--bng-off-white-rgb), 0.96);
  color: color-mix(in srgb, var(--bng-cool-gray-800) 70%, rgb(var(--bng-orange-500-rgb)) 30%);
  font-family: var(--fnt-mono);
  font-size: 0.65rem;
  line-height: 0.75rem;
  text-align: center;
  font-weight: 1000;
  outline: 1.5px solid color-mix(in srgb, var(--bng-cool-gray-800) 70%, rgb(var(--bng-orange-500-rgb)) 30%);
  outline-offset: 0;
}

.vehicle-player-slot-text {
  display: inline-block;
  transform: translate(-0.01rem, 0.09rem);
}

.vehicle-ai-icon {
  flex: 0 0 auto;
  font-size: 1.15rem;
  opacity: 0.95;
}

.vehicle-online-icon {
  flex: 0 0 auto;
  font-size: 1.15rem;
  opacity: 0.95;
}

.submenu-entry {
  padding-left: 1.2rem;
  --bng-bg-enabled: rgba(var(--bng-cool-gray-800-rgb), 0.6);
  --bng-bg-hover: rgba(var(--bng-cool-gray-800-rgb), 0.72);
  --bng-bg-active: rgba(var(--bng-cool-gray-800-rgb), 0.76);
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.08);
  --bng-bg-border-width: 1px;
}

.submenu-parent-expanded {
  --bng-bg-enabled: rgba(var(--bng-ter-blue-gray-500-rgb), 0.22);
  --bng-bg-hover: rgba(var(--bng-ter-blue-gray-500-rgb), 0.3);
  --bng-bg-active: rgba(var(--bng-ter-blue-gray-500-rgb), 0.34);
  --bng-bg-border-enabled: rgba(var(--bng-ter-blue-gray-300-rgb), 0.28);
  --bng-bg-border-width: 1px;
}
</style>
