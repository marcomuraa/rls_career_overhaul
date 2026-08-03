<template>
  <div class="ready-notification">
    <div class="ready-text">{{ $t("ui.multiplayer.inPreparation") }} : {{ $t(notification.gamemodeInfo?.displayName || "Unknown") }}</div>
    <div class="actions">
      <BngButton accent="main" @click="ready">{{ $t("ui.multiplayer.readyUp") }}</BngButton>
      <BngButton @click="spectate">{{ $t("ui.multiplayer.spectate") }}</BngButton>
      <BngButton @click="openGamemode">Open Gamemode</BngButton>
    </div>
  </div>
</template>

<script setup>
import { BngButton } from "@/common/components/base"
import { useBridge } from "@/bridge"

const props = defineProps({
  notification: { type: Object, required: true },
})

const emit = defineEmits(["accepted"])

const bngVue = window.bngVue || { gotoGameState() {} }
const { lua } = useBridge()

function openGamemode() {
  bngVue.gotoGameState("pause.multiplayer.gamemode")
  emit("accepted")
}

function ready() {
  lua.multiplayer_uiBackend_multiplayerUIManager.respondToReadyUp("active")
  emit("accepted")
}

function spectate() {
  lua.multiplayer_uiBackend_multiplayerUIManager.respondToReadyUp("spectator")
  emit("accepted")
}
</script>

<style scoped lang="scss">
.ready-notification {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--bng-cool-gray-800);
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
}

.ready-text {
  font-weight: 600;
  font-size: 1.05rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
