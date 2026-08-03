<template>
  <Save ref="saveRef" :on-save-success="onConfigSaved" />
</template>

<script setup>
import { ref } from "vue"
import Save from "@/modules/vehicleConfig/components/Save.vue"
import { showToast } from "@/services/toast"
import { $translate } from "@/services/translation"
import { useEvents } from "@/services/events"

defineOptions({ name: "PauseVehicleSave" })

const saveRef = ref(null)
const events = useEvents()
const bngVue = window.bngVue || { gotoGameState() {} }
let postSaveHandled = false

const POST_SAVE_TOAST_VISIBLE_MS = 400

function getSavedDisplayName(payload) {
  return String(payload?.displayName || "").trim()
}

function formatSavedFileName(payload) {
  const rawName = payload?.fileName || payload?.displayName || ""
  return !rawName ? "" : rawName.endsWith(".pc") ? rawName : `${rawName}.pc`
}

function formatSavedToastContent(payload) {
  const displayName = getSavedDisplayName(payload)
  const fileName = formatSavedFileName(payload)
  if (!displayName && !fileName) return null

  const savedTitle = $translate.instant("ui.career.garage.saveVehiclePopup")
  return {
    title: displayName || savedTitle,
    message: displayName && fileName ? fileName : (fileName || displayName),
  }
}

function showSaveToastAndWait(payload) {
  const toastContent = formatSavedToastContent(payload)
  if (!toastContent) return Promise.resolve()

  return new Promise(resolve => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackTimer)
      window.setTimeout(resolve, POST_SAVE_TOAST_VISIBLE_MS)
    }
    const fallbackTimer = window.setTimeout(finish, 500 + POST_SAVE_TOAST_VISIBLE_MS)

    showToast({
      id: `pause-vehicle-save-${Date.now()}`,
      type: "success",
      title: toastContent.title,
      message: toastContent.message,
      timeout: 3,
      onShown: finish,
    })
  })
}

async function onConfigSaved(payload) {
  if (postSaveHandled) return
  postSaveHandled = true

  try {
    await showSaveToastAndWait(payload)
    await bngVue.gotoGameState("pause.vehicle.configurationcombined")
  } finally {
    window.setTimeout(() => {
      postSaveHandled = false
    }, 1000)
  }
}

function onVehicleConfigSaved() {
  window.setTimeout(() => {
    const payload = saveRef.value?.getLastSavedPayload?.()
    if (payload) void onConfigSaved(payload)
  }, 0)
}

events.on("VehicleconfigSaved", onVehicleConfigSaved)

function getSaveRootElement() {
  const saveInstance = saveRef.value
  if (!saveInstance) return null
  return saveInstance.$el || null
}

function focusEntry() {
  const saveFocus = saveRef.value?.focusEntry?.()
  if (saveFocus) return true

  const rootElement = getSaveRootElement()
  if (!rootElement) return false

  const target = rootElement.querySelector(".saveload-filename input:not([disabled])")
    || rootElement.querySelector(".saveload-filename button:not([disabled])")
    || rootElement.querySelector(".saveload-list-item")
    || rootElement.querySelector(".saveload-controls button:not([disabled])")
    || rootElement.querySelector("button:not([disabled])")
    || rootElement.querySelector("input:not([disabled])")

  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  return !!(await saveRef.value?.activateBottomBar?.())
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>
