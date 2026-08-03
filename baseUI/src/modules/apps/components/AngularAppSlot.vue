<template>
  <div :id="slotId" class="ui-angular-app-slot"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from "vue"
import { uniqueSafeId } from "@/services/uniqueId"
import { useModManager } from "@/services/modManager/manager"
import Logger from "@/services/logger"

defineOptions({ name: "AngularAppSlot" })

const modManager = useModManager()

const props = defineProps({
  // legacy angular entry (`directive`, `domElement`, `jsSource`, ...)
  app: {
    type: Object,
    required: true,
  },
  instanceId: {
    type: String,
    default: "",
  },
  rectPx: {
    type: Object,
    default: null,
  },
})

const localKey = uniqueSafeId()
const directive = computed(() => props.app?.directive || "app")
const slotId = computed(() => `bng-app-slot_${directive.value}_${props.instanceId || localKey}`)

const mounted = ref(false)

const getShim = () => window.UIAppsServiceShim || null

function normalise(value) {
  return String(value || "").toLowerCase()
}

function appMatchesChange(change) {
  if (!change || change.targeted !== true) return true
  const changedApps = Array.isArray(change.apps) ? change.apps : []
  if (changedApps.length === 0) return false

  const current = props.app || {}
  const currentIds = [
    current.appName,
    current.directive,
    current.folder,
    current.jsSource,
    current.appJsonPath,
  ].filter(Boolean).map(normalise)

  return changedApps.some(app => {
    if (!app || (app.hasAppJs === false && !app.jsSource)) return false
    const changedIds = [
      app.appName,
      app.directive,
      app.folder,
      app.jsSource,
      app.appJsonPath,
    ].filter(Boolean).map(normalise)
    return changedIds.some(id => currentIds.includes(id))
  })
}

async function mountAngular() {
  await nextTick()
  const shim = getShim()
  if (!shim || typeof shim.mountDirective !== "function") {
    setTimeout(mountAngular, 200)
    return
  }
  try {
    shim.mountDirective(slotId.value, props.app)
    mounted.value = true
    queueResizeAfterMount()
  } catch (err) {
    Logger.error("[AngularAppSlot] mountDirective failed", err)
  }
}

function emitResize() {
  if (!mounted.value) return false
  const shim = getShim()
  if (!shim || typeof shim.resizeDirective !== "function") return false
  const width = Math.round(Number(props.rectPx?.width) || 0)
  const height = Math.round(Number(props.rectPx?.height) || 0)
  if (width <= 0 || height <= 0) return false
  try {
    return shim.resizeDirective(slotId.value, { width, height }) === true
  } catch (err) {
    Logger.error("[AngularAppSlot] resizeDirective failed", err)
  }
  return false
}

function queueResizeAfterMount(attempt = 0) {
  requestAnimationFrame(() => {
    if (emitResize()) return
    if (!mounted.value || attempt >= 8) return
    setTimeout(() => queueResizeAfterMount(attempt + 1), 50)
  })
}

watch(
  () => [props.rectPx?.width, props.rectPx?.height],
  () => emitResize(),
)

function unmountAngular() {
  if (!mounted.value) return
  const shim = getShim()
  if (shim && typeof shim.unmountDirective === "function") {
    try {
      shim.unmountDirective(slotId.value)
    } catch (err) {
      Logger.error("[AngularAppSlot] unmountDirective failed", err)
    }
  }
  mounted.value = false
}

// handle directive swap just in case
watch(() => props.app?.directive, (next, prev) => {
  if (next === prev) return
  unmountAngular()
  mountAngular()
})

watch(() => modManager.uiAppRefresh, change => {
  if (!mounted.value) return
  if (!appMatchesChange(change)) return
  unmountAngular()
  mountAngular()
})

onMounted(mountAngular)
onBeforeUnmount(unmountAngular)
</script>

<style lang="scss" scoped>
.ui-angular-app-slot {
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
}
</style>
