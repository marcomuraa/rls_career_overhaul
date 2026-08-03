<template>
  <div class="camera-order-container">
    <div
      v-for="(cam, visibleIndex) in visibleCameras"
      :key="cam.name"
      class="camera-row-wrapper"
      :class="{ 'camera-default-separator': visibleIndex === defaultCameraIdx }"
    >
      <div v-if="visibleIndex === defaultCameraIdx" class="camera-default-header">
        {{ $t("ui.camera.default") }}
      </div>

      <BngRow
        class="camera-row"
        :class="{ 'camera-row-engaged': engagedCameraName === cam.name }"
        v-bng-ui-nav-label:ok="engagedCameraName ? $t('ui.options.camera.orderFinish') : $t('ui.options.camera.order')"
        @click="onMouseRowClick(cam)"
        @focusin="onCameraRowFocusIn(cam)"
        @focusout="onCameraRowFocusOut(cam, $event)"
      >
        <OptionsCameraRow
          :cam="cam"
          :engaged="engagedCameraName === cam.name"
          :has-gamepad-focus="focusedCameraName === cam.name"
          :is-default="visibleIndex === defaultCameraIdx"
          :is-current="focused === cam.name"
          :is-first="visibleIndex === 0"
          :is-last="visibleIndex === lastCameraIdx"
          :reorder-pending="reorderPending"
          :ref="component => setCameraRowRef(cam.name, component)"
          @activate="onActivate(cam)"
          @activate-camera="onActivateCamera(cam)"
          @disengage="disengage"
          @reorder="onReorder(cam, $event)"
          @edit-binding="onEditBinding(cam)"
          @toggle-enabled="onToggleEnabled(cam)"
        />
      </BngRow>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue"
import { BngRow } from "@/common/components/base"
import { vBngUiNavLabel } from "@/common/directives"
import { useBridge } from "@/bridge"
import { storeToRefs } from "pinia"
import { addPopup } from "@/services/popup"
import { useScopedNav } from "@/services/scopedNav/api"
import useControls from "@/services/controls"
import { useOptionsControlsStore } from "@/common/modules/options/controls/optionsControls"
import EditBinding from "@/common/modules/options/controls/components/EditBinding.vue"
import OptionsCameraRow from "./OptionsCameraRow.vue"

const props = defineProps({
  list: Array,
  focused: String,
})

const { lua } = useBridge()

const controls = useControls()
const controlsStore = useOptionsControlsStore()
const { isNewBinding, updateBindingDetails } = storeToRefs(controlsStore)
const scopedNav = useScopedNav()
const EDIT_BINDING_SCOPE_ID = "options-edit-binding-popup"

const setCameraByName = name => lua.core_camera.setByName(0, name)
const changeOrderLua = (index, direction) => lua.core_camera.changeOrder(index, direction)
const toggleEnabledLua = index => lua.core_camera.toggleEnabledById(index)

const visibleCameras = computed(() => (props.list || []).filter(cam => !cam.hidden))
const defaultCameraIdx = computed(() => visibleCameras.value.length > 0 ? 0 : -1)
const lastCameraIdx = computed(() => visibleCameras.value.length - 1)

const indexOf = cam => visibleCameras.value.findIndex(item => item.name === cam.name)
const configIndexOf = cam => (props.list || []).findIndex(item => item.name === cam.name)

const engagedCameraName = ref(null)
const focusedCameraName = ref(null)
const reorderPending = ref(false)
const REORDER_COOLDOWN_MS = 250
const FOCUS_RESTORE_TIMEOUT_MS = 3000
const POPUP_CLOSE_FOCUS_DELAY_MS = 240
const cameraRowRefs = new Map()

watch(visibleCameras, list => {
  if (engagedCameraName.value === null) return
  if (!list.some(cam => cam.name === engagedCameraName.value)) {
    engagedCameraName.value = null
  }
})

const disengage = () => engagedCameraName.value = null

function onCameraRowFocusIn(cam) {
  focusedCameraName.value = cam.name
}

function onCameraRowFocusOut(cam, event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  if (focusedCameraName.value === cam.name) focusedCameraName.value = null
}

function setCameraRowRef(cameraName, component) {
  if (component) {
    cameraRowRefs.set(cameraName, component)
  } else {
    cameraRowRefs.delete(cameraName)
  }
}

function onMouseRowClick(cam) {
  setCameraByName(cam.name)
  disengage()
}

function onActivate(cam) {
  engagedCameraName.value = engagedCameraName.value === cam.name ? null : cam.name
}

function onActivateCamera(cam) {
  setCameraByName(cam.name)
  return false
}

async function onReorder(cam, direction) {
  if (reorderPending.value) return
  const index = indexOf(cam)
  if (index < 0) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex > lastCameraIdx.value) return

  reorderPending.value = true
  try {
    const activeCameraName = props.focused
    const configIndex = configIndexOf(cam)
    if (configIndex < 0) return
    await Promise.resolve(changeOrderLua(configIndex + 1, direction))
    if (activeCameraName) await Promise.resolve(setCameraByName(activeCameraName))
  } finally {
    window.setTimeout(() => {
      reorderPending.value = false
    }, REORDER_COOLDOWN_MS)
  }
}

function onToggleEnabled(cam) {
  const index = configIndexOf(cam)
  if (index < 0) return
  toggleEnabledLua(index + 1)
}

function onEditBinding(cam) {
  const actionKey = `camera_${cam.slotId}`
  const actionDetails = controls.getActionDetails(actionKey)
  if (!actionDetails) return false
  const existingBinding = controls.findBindingForAction(actionKey)
  isNewBinding.value = !existingBinding
  updateBindingDetails.value = true
  controlsStore.setSelectedBinding(existingBinding || {
    action: actionKey,
    title: actionDetails.title,
    desc: actionDetails.desc,
    description: actionDetails.desc,
  })
  const popup = addPopup(EditBinding)
  activateEditBindingPopupSoon()
  popup.promise
    .catch(() => undefined)
    .finally(() => restoreCameraRowFocusAfterPopup(cam.name))
  return false
}

async function activateEditBindingPopupSoon() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 1000) {
    await nextTick()
    if (scopedNav.getScopeById(EDIT_BINDING_SCOPE_ID)) {
      await Promise.resolve(scopedNav.activateScope(EDIT_BINDING_SCOPE_ID, { force: true, reason: "options-camera-edit-binding" }))
      scopedNav.requestScopeFocus(EDIT_BINDING_SCOPE_ID, { force: true, activeOnly: false, reason: "options-camera-edit-binding" })
      return
    }
    await new Promise(resolve => window.requestAnimationFrame(resolve))
  }
}

async function restoreCameraRowFocusAfterPopup(cameraName) {
  await new Promise(resolve => window.setTimeout(resolve, POPUP_CLOSE_FOCUS_DELAY_MS))
  const row = await waitForCameraRow(cameraName)
  if (!row) return
  engagedCameraName.value = cameraName
  row.focusControlSoon?.()
}

async function waitForCameraRow(cameraName) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < FOCUS_RESTORE_TIMEOUT_MS) {
    await nextTick()
    const row = cameraRowRefs.get(cameraName)
    if (row && visibleCameras.value.some(cam => cam.name === cameraName)) {
      return row
    }
    await new Promise(resolve => window.requestAnimationFrame(resolve))
  }
  return null
}
</script>

<style lang="scss" scoped>
.camera-order-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.camera-row-wrapper {
  position: relative;
}

.camera-default-separator {
  padding-bottom: 0.25rem;
  border-bottom: 0.0625rem solid var(--bng-orange-300);
}

.camera-default-header {
  margin: 0.25rem 0.25rem 0;
  color: var(--bng-orange-300);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.camera-row {
  margin-bottom: 0;

  // subtle accent to communicate the engaged state to the user
  &.camera-row-engaged {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-hover: var(--bng-orange-550);
    --bng-bg-enabled-opacity: 0.4;
    --bng-bg-hover-opacity: 0.5;
  }
}
</style>
