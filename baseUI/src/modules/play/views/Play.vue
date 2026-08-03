<template>
  <div class="play-view">
    <div v-if="showLegacyCrosshair" class="legacy-crosshair"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"

const events = useEvents()
const showLegacyCrosshair = ref(false)

let notifyCameraTimeout = null
let playHookActive = false

function setPlayHookActive(active) {
  if (playHookActive === active) return
  playHookActive = active
  lua.extensions.hook("onUIPlayStateChanged", active)
}

function scheduleCameraNotify() {
  if (notifyCameraTimeout) {
    clearTimeout(notifyCameraTimeout)
  }
  notifyCameraTimeout = window.setTimeout(() => {
    lua.core_camera.notifyUI()
    notifyCameraTimeout = null
  }, 150)
}

function onCrosshairVisibilityChanged(visible) {
  showLegacyCrosshair.value = visible === true
}

onMounted(() => {
  events.on("onCrosshairVisibilityChanged", onCrosshairVisibilityChanged)
  setPlayHookActive(true)
  scheduleCameraNotify()
})

onBeforeUnmount(() => {
  if (notifyCameraTimeout) {
    clearTimeout(notifyCameraTimeout)
    notifyCameraTimeout = null
  }
  setPlayHookActive(false)
})
</script>

<style scoped lang="scss">
.play-view {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.legacy-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -200%);
  z-index: var(--zorder_play_crosshair);
  background-image: url("/ui/images/crosshair.png");
  background-size: cover;
  background-position: center center;
  pointer-events: none;
}
</style>
