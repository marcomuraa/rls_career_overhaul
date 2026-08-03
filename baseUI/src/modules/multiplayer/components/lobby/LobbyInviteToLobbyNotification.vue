<template>
  <div class="invite-notification">
    <div class="owner-name">
      Lobby Invite from {{ ownerName }}
    </div>
    <div v-if="expiresIn > 0" class="expires">
      Expires in: {{ expiresIn }}s
    </div>

    <div class="actions">
      <BngButton @click="accept">Accept</BngButton>
      <BngButton :disabled="isIgnored" @click="ignore">Ignore</BngButton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngButton } from "@/common/components/base"
import { useBridge } from "@/bridge"

const props = defineProps({
  notification: { type: Object, required: true },
})

const emit = defineEmits(["accepted"])

const { lua } = useBridge()

const ownerName = computed(() => props.notification?.ownerPersona || "Unknown")

const isIgnored = computed(() => !!props.notification?.ignore)

const expiresIn = computed(() => props.notification?.expiresIn ?? 0)

function accept() {
  const lobbyId = props.notification?.lobbyId
  if (lobbyId == null) return
  lua.multiplayer_uiBackend_notificationManager.acceptInvite(lobbyId)
  emit("accepted")
}

function ignore() {
  const lobbyId = props.notification?.lobbyId
  if (lobbyId == null) return
  lua.multiplayer_uiBackend_notificationManager.ignoreInvite(lobbyId)
}
</script>

<style scoped lang="scss">
.invite-notification {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--bng-cool-gray-800);
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
}

.invite-notification.ignored {
  opacity: 0.55;
}

.owner-name {
  font-weight: 600;
  font-size: 1.05rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expires {
  font-size: 0.85rem;
  color: var(--bng-orange-500);
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
