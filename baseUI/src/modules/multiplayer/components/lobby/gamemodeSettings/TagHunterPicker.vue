<template>
  <div class="hunter-picker">
    <div v-if="lobbyPlayers.length === 0" class="no-players">
      {{ $t("ui.multiplayer.noPlayersInLobby") }}
    </div>
    <div v-else class="player-list">
      <div
        v-for="player in lobbyPlayers"
        :key="player.id"
        class="player-row"
      >
        <BngSwitch
          :modelValue="isSelected(player.id)"
          :disabled="isSelected(player.id) && selectedPlayerIds.length <= 1"
          @update:modelValue="togglePlayer(player.id, $event)"
        >
          {{ player.name }}
        </BngSwitch>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { BngSwitch } from "@/common/components/base"
import { useEvents } from "@/services/events"
import { useBridge } from "@/bridge"

defineProps({
  modelValue: {
    default: () => [],
  },
})

const emit = defineEmits(["update:modelValue"])
const { lua } = useBridge()
const events = useEvents()

const lobbyPlayers = ref([])
const selectedPlayerIds = ref([])

const onMultiplayerTabData = (data) => {
  if (!data.players) return

  lobbyPlayers.value = data.players

  const validIds = new Set(lobbyPlayers.value.map(p => p.id))
  const cleaned = selectedPlayerIds.value.filter(id => validIds.has(id))

  if (cleaned.length === 0 && lobbyPlayers.value.length > 0) {
    cleaned.push(lobbyPlayers.value[0].id)
  }

  if (cleaned.length !== selectedPlayerIds.value.length || cleaned.some((id, i) => id !== selectedPlayerIds.value[i])) {
    selectedPlayerIds.value = cleaned
    emit("update:modelValue", cleaned)
  }
}

onMounted(() => {
  events.on("OnMultiplayerTabData", onMultiplayerTabData)
  lua.multiplayer_uiBackend_multiplayerUIManager.requestMultiplayerTabData()
})

const isSelected = (playerId) => selectedPlayerIds.value.includes(playerId)

const togglePlayer = (playerId, selected) => {
  if (selected) {
    selectedPlayerIds.value.push(playerId)
  } else {
    selectedPlayerIds.value = selectedPlayerIds.value.filter(id => id !== playerId)
  }
  emit("update:modelValue", [...selectedPlayerIds.value])
}
</script>

<style scoped lang="scss">
.hunter-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-row {
  padding: 0.25rem 0.5rem;
  border-radius: var(--bng-corners-2);
  background-color: var(--bng-cool-gray-700);
}

.no-players {
  padding: 0.5rem;
  text-align: center;
  color: var(--bng-cool-gray-400);
  font-style: italic;
}
</style>
