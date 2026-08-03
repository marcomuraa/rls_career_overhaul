<template>
  <div class="pause-mp-session-tab">
    <MultiplayerSessionSettingsPanel
      v-if="sessionInvite?.id || sessionExtra"
      variant="activeSession"
      :session-invite="sessionInvite"
      :session-extra="sessionExtra"
      :can-edit-session-extras="canEditSessionExtras"
      :can-invite="canInvite"
      @leave-session="leaveSession"
      @invite="invitePlayers"
    />

    <template v-if="!sessionInvite?.id && !sessionExtra && !readyUpGamemodeInfo">
      <MultiplayerSessionSettingsPanel
        variant="activeSession"
        :session-extra="hostExtraOptions"
        :can-edit-session-extras="true"
        :show-session-meta="false"
        :show-actions="false"
        @update:session-extra="onHostExtraUpdate"
      />
      <BngButton accent="main" @click="hostSession">Host Session</BngButton>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue"
import { BngButton } from "@/common/components/base"
import { useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import MultiplayerSessionSettingsPanel from "@/modules/multiplayer/components/MultiplayerSessionSettingsPanel.vue"

defineOptions({ name: "PauseMultiplayerSessionTab" })

const { lua } = useBridge()
const events = useEvents()

const readyUpGamemodeInfo = ref(null)
const sessionInvite = ref(null)
const sessionExtra = ref(null)
const canEditSessionExtras = ref(false)

const hostExtraOptions = ref({
  ghostOnTp: false,
  ghostOnReset: true,
  vehicleCollisions: true,
  allowPausing: false,
})

const canInvite = computed(
  () =>
    sessionInvite.value &&
    !sessionInvite.value.isLocalSession &&
    sessionInvite.value.isSessionHost === true,
)

function leaveSession() {
  lua.multiplayer_sessionManager.leaveCurrentSession()
}

function invitePlayers() {
  lua.multiplayer_sessionManager.openInviteDialogForCurrentSession()
}

function onHostExtraUpdate(extra) {
  hostExtraOptions.value = extra
}

function hostSession() {
  lua.multiplayer_sessionManager.createSessionFromUI(true, {}, hostExtraOptions.value)
}

function onMultiplayerTabData(data) {
  readyUpGamemodeInfo.value = data?.readyUpGamemodeInfo || null
  sessionInvite.value = data?.sessionInvite || null
  sessionExtra.value = data?.sessionExtra || null
  canEditSessionExtras.value = data?.canEditSessionExtras === true
}

onMounted(() => {
  events.on("OnMultiplayerTabData", onMultiplayerTabData)
  lua.extensions.load("multiplayer_uiBackend_multiplayerUIManager")
  lua.multiplayer_uiBackend_multiplayerUIManager.requestMultiplayerTabData()
})

onUnmounted(() => {
  events.off("OnMultiplayerTabData", onMultiplayerTabData)
})
</script>

<style scoped lang="scss">
.pause-mp-session-tab {
  padding: 0.35rem 0.65rem 0.75rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-tab-empty {
  margin: 0;
  color: var(--bng-cool-gray-400);
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
