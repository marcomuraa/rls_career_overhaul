<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'device-controls-popup', activateOnMount: true, type:'nonav', trapPolicy: 'always' }"
    class="device-controls-popup">
    <div class="popup-header">
      <div class="popup-title">Test devices</div>
    </div>

    <BngDivider class="detail-divider" />

    <div class="hardware-content">
      <section v-for="(device, index) in devicesList" :key="device.name" class="device-section">
        <div class="detail-header">
          <BngIcon v-if="device.icon" :type="device.icon" class="device-icon" />
          <div class="detail-header-info">
            <div class="detail-header-title">{{ $tt(device.productName) }}</div>
            <div class="detail-header-description">{{ device.info }}</div>
          </div>
        </div>

        <template v-if="device.isKey">
          <div class="keyboard-controls">
            <div
              v-for="control in deviceStates[device.name].activeControls"
              :key="`${device.name}-${control}`"
              class="hardware-key-controls">
              <BngBinding :device="device.name" :device-key="control" :dark="true" />
            </div>
            <div v-if="deviceStates[device.name].activeControls.length === 0" class="no-input-hint">
              Press any key to see it here...
            </div>
          </div>
        </template>
        <template v-else>
          <div class="device-controls-grid">
            <div v-for="(control, key) in deviceStates[device.name].controls" :key="`${device.name}-${key}`" class="hardware-control">
              <InputControlBar :devname="device.name" :control="key" :value="control.value" />
            </div>
          </div>
        </template>

        <BngDivider v-if="index < devicesList.length - 1" class="device-divider" />
      </section>
    </div>

    <div class="detail-actions">
      <BngButton bng-no-nav="true" accent="attention" class="action-button" tabindex="-1" @click="stopTestAndClose">
        <BngBinding class="button-binding-container" controller :viewer-obj="modifier1BackBinding" />
        <span class="button-text">Stop Test</span>
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, watch } from "vue"
import { BngIcon, BngBinding, BngButton, BngDivider } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { lua, useBridge } from "@/bridge"
import useControls from "@/services/controls"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { ACTIONS_BY_UI_EVENT, UI_EVENTS } from "@/services/uiNav"
import InputControlBar from "@/common/modules/options/controls/components/hardware/InputControlBar.vue"

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(["return"])

const { events } = useBridge()
const controls = useControls()
const uinavBlocker = useUINavBlocker()
const MODIFIER_1_ACTION = "customModifier1"
const MODIFIER_1_CONTROL = "modifier1"
const BACK_ACTION = ACTIONS_BY_UI_EVENT[UI_EVENTS.back]
const DEVICE_TEST_ACTION_FILTER_GROUP = "deviceControlsTestPopup"
const activeModifier1Devices = new Set()
let isListeningForRawEvents = false

const devicesList = computed(() => props.devices ?? [])
const modifier1Bindings = computed(() => controls.findAllBindingsForAction(MODIFIER_1_ACTION, null, true))
const backBindings = computed(() => controls.findAllBindingsForAction(BACK_ACTION, null, true))
const modifier1BackBinding = computed(() => {
  const modifier1 = controls.makeViewerObj({ action: MODIFIER_1_ACTION, controller: true })
  const back = controls.makeViewerObj({ uiEvent: UI_EVENTS.back, controller: true })
  if (!modifier1 || !back) return null
  return { ...back, multiControls: [modifier1, back] }
})

function cloneControls(controls = {}) {
  return Object.fromEntries(
    Object.entries(controls).map(([name, control]) => [name, { ...control }])
  )
}

const deviceStates = reactive(
  Object.fromEntries(
    devicesList.value.map(device => [device.name, {
      isKey: !!device.isKey,
      controls: cloneControls(device.controls),
      activeControls: [],
    }])
  )
)

function controlParts(control = "") {
  return control.trim().split(/\s+/).filter(Boolean)
}

function controlWithoutModifiers(control = "") {
  return controlParts(control).pop()
}

function rawControlHasModifier1(control = "") {
  return controlParts(control).includes(MODIFIER_1_CONTROL)
}

function bindingMatchesRawControl(binding, data) {
  return binding.devName === data.devName && controlWithoutModifiers(binding.control) === controlWithoutModifiers(data.control)
}

function isModifier1Control(data) {
  return modifier1Bindings.value.some(binding => bindingMatchesRawControl(binding, data))
}

function isBackControl(data) {
  return backBindings.value.some(binding => bindingMatchesRawControl(binding, data))
}

function updateModifier1State(data) {
  if (!isModifier1Control(data)) return
  if (data.value > 0.1) activeModifier1Devices.add(data.devName)
  else activeModifier1Devices.delete(data.devName)
}

function shouldCloseFromRawInput(data) {
  return data.value > 0.1
    && isBackControl(data)
    && (rawControlHasModifier1(data.control) || activeModifier1Devices.has(data.devName))
}

function stopTestAndClose() {
  activeModifier1Devices.clear()
  listenRawEvents(false)
  resetControls()
  emit("return", null)
}

function handleKeyControls(data) {
  const deviceState = deviceStates[data.devName]
  if (!deviceState?.isKey) return

  const ctrlIndex = deviceState.activeControls.indexOf(data.control)
  if (data.value > 0.1 && ctrlIndex < 0) {
    deviceState.activeControls.push(data.control)
  } else if (data.value < 0.1 && ctrlIndex >= 0) {
    deviceState.activeControls.splice(ctrlIndex, 1)
  }
}

function handleControls(data) {
  const deviceState = deviceStates[data.devName]
  const controlName = controlWithoutModifiers(data.control)
  if (!deviceState?.controls[controlName]) return
  deviceState.controls[controlName].value = data.value
}

function handleRawEvents(data) {
  if (!data) return
  updateModifier1State(data)
  if (shouldCloseFromRawInput(data)) {
    stopTestAndClose()
    return
  }
  handleKeyControls(data)
  handleControls(data)
}

// TODO: May not work properly with multiseat; controls.vehicleSpecific only exposes player 0 actions. Please fix.
function collectBlockedTestActions(vehicleSpecific = []) {
  const actionNames = new Set(["toggleWalkingMode"])
  for (const playerActions of vehicleSpecific) {
    if (!Array.isArray(playerActions)) continue
    for (const entry of playerActions) {
      if (entry?.actionName) actionNames.add(entry.actionName)
    }
  }
  return [...actionNames]
}

function syncActionFilter(vehicleSpecific) {
  const actions = collectBlockedTestActions(vehicleSpecific)
  lua.extensions.core_input_actionFilter.setGroup(DEVICE_TEST_ACTION_FILTER_GROUP, actions)
  lua.extensions.core_input_actionFilter.addAction(0, DEVICE_TEST_ACTION_FILTER_GROUP, true)
}

function disableActionFilter() {
  lua.extensions.core_input_actionFilter.addAction(0, DEVICE_TEST_ACTION_FILTER_GROUP, false)
  lua.extensions.core_input_actionFilter.setGroup(DEVICE_TEST_ACTION_FILTER_GROUP, [])
}

function listenRawEvents(shouldListen) {
  if (isListeningForRawEvents === shouldListen) return
  isListeningForRawEvents = shouldListen

  const method = shouldListen ? "on" : "off"
  events[method]("RawInputChanged", handleRawEvents)
  lua.Input.setForwardRawEvents(shouldListen)
  lua.setCEFTyping(shouldListen)
}

function resetControls() {
  Object.values(deviceStates).forEach(deviceState => {
    Object.values(deviceState.controls).forEach(control => {
      control.value = 0
    })
    deviceState.activeControls.splice(0)
  })
}

watch(() => controls.vehicleSpecific, vehicleSpecific => {
  syncActionFilter(vehicleSpecific)
})

onMounted(() => {
  uinavBlocker.allowOnly([])
  syncActionFilter(controls.vehicleSpecific)
  listenRawEvents(true)
})

onUnmounted(() => {
  activeModifier1Devices.clear()
  uinavBlocker.clear()
  disableActionFilter()
  listenRawEvents(false)
  resetControls()
})
</script>

<style lang="scss" scoped>
.device-controls-popup {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  gap: 1rem;
  width: 64rem;
  max-width: min(95vw, 64rem);
  max-height: 95%;
  min-height: 24rem;
  border-radius: var(--bng-corners-2);
  padding: 1.25rem;
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-off-black-rgb), 0.96);
  overflow: hidden;
}

.popup-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.popup-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.detail-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;

  >.device-icon {
    font-size: 2.5em;
  }

  >.detail-header-info {
    display: flex;
    flex-direction: column;
    min-width: 0;

    >.detail-header-title {
      font-size: 1.25em;
      font-weight: 600;
    }

    >.detail-header-description {
      font-size: 0.9em;
      opacity: 0.7;
      overflow-wrap: anywhere;
    }
  }
}

.detail-divider {
  height: 0.125rem;
  flex: 0 0 auto;
}

.hardware-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.device-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.5rem;
}

.keyboard-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hardware-control {
  min-width: 0;
}

.hardware-key-controls {
  display: flex;
  align-items: center;
}

.no-input-hint {
  color: var(--bng-cool-gray-400);
  font-style: italic;
}

.device-divider {
  margin-top: 0.25rem;
}

.detail-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 0.25rem;
  width: 100%;

  >.action-button {
    flex: 1;
    gap: 0.25em;

    >.button-binding-container {
      display: inline-flex;
      align-items: center;
      // gap: 0.25em;
    }
  }
}
</style>
