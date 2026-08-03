<template>
  <div class="players-section">
    <div v-if="playerList.length > 0" class="players-list">
      <Button
        v-for="player in playerList"
        :key="player.id"
        class="player-card"
        v-bng-popover:right-start.click="popId"
        @click="openPlayerActions(player)"
      >
        <div class="player-content">
          <span class="player-name">{{ player.name }}</span>
          <div class="player-meta">
            <span v-if="player.isOwner" class="player-badge owner-badge">{{ $t("ui.multiplayer.owner") }}</span>
            <span v-if="player.isLocalPlayer" class="player-badge you-badge">{{ $t("ui.multiplayer.you") }}</span>
            <template v-if="player.unmetPlayerRequirements?.length">
              <span
                v-for="req in player.unmetPlayerRequirements"
                :key="req.key"
                class="ready-status unmet-requirement">
                {{ req.message }}
              </span>
            </template>
            <template v-else>
              <span v-if="player.readyRole === 'ready'" class="ready-status ready">{{ $t("ui.multiplayer.ready") }}</span>
              <span v-else-if="player.readyRole === 'notReady'" class="ready-status not-ready">{{ $t("ui.multiplayer.notReady") }}</span>
              <span v-else-if="player.readyRole === 'spectator'" class="ready-status spectator">{{ $t("ui.multiplayer.readyRoleSpectator") }}</span>
            </template>
            <span class="player-ping">{{ player.ping }}ms</span>
          </div>
        </div>
      </Button>
    </div>

    <BngPopoverMenu :name="popId" focus @hide="onPlayerActionsHide">
      <BngButton
        v-for="action in selectedPlayerActions"
        :key="action.buttonId"
        :accent="ACCENTS.menu"
        :disabled="action.disabled"
        v-bng-on-ui-nav:ok.focusRequired.asMouse
        @click="executePlayerAction(action)">
        {{ action.label }}
      </BngButton>
    </BngPopoverMenu>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useEvents, useStreams } from "@/services/events"
import { useBridge } from "@/bridge"
import { Button } from "@/common/components/utility"
import { BngButton, BngPopoverMenu, ACCENTS } from "@/common/components/base"
import { vBngPopover, vBngOnUiNav } from "@/common/directives"
import { usePopover } from "@/services/popover"
import { uniqueId } from "@/services/uniqueId"

defineOptions({ name: "PauseMultiplayerPlayerList" })

defineProps({
  interactive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["local-player-ready-change", "local-player-unmet-requirements"])
const { lua } = useBridge()
const events = useEvents()
const playerList = ref([])
const popover = usePopover()
const popId = uniqueId("mp_player_options")
const selectedPlayerId = ref(null)

const selectedPlayer = computed(() => {
  if (selectedPlayerId.value == null) return null
  return playerList.value.find(player => player.id === selectedPlayerId.value) || null
})

function actionsAsList(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "object") return Object.values(raw)
  return []
}

const selectedPlayerActions = computed(() => {
  if (!selectedPlayer.value) return []
  return actionsAsList(selectedPlayer.value.actions)
})

const isLocalPlayerReady = computed(() => {
  const local = playerList.value.find(player => player.isLocalPlayer)
  if (!local) return false
  return local.readyRole === "ready" || local.readyRole === "spectator"
})

const localPlayerUnmetRequirements = computed(() => {
  const local = playerList.value.find(player => player.isLocalPlayer)
  return local?.unmetPlayerRequirements ?? null
})

watch(isLocalPlayerReady, (isReady) => {
  emit("local-player-ready-change", isReady)
}, { immediate: true })

watch(localPlayerUnmetRequirements, (unmet) => {
  emit("local-player-unmet-requirements", unmet)
}, { immediate: true })

const onMultiplayerPlayerListData = (data) => {
  playerList.value = Array.isArray(data?.players) ? data.players : []
}

function openPlayerActions(player) {
  if (!player) return
  selectedPlayerId.value = player.id
}

function onPlayerActionsHide() {
  selectedPlayerId.value = null
}

function closePlayerActions() {
  popover.hide(popId)
}

function executePlayerAction(action) {
  if (!action || action.disabled || action.buttonId == null) return
  lua.multiplayer_uiBackend_playerListProvider.executePlayerAction(action.buttonId, {})
  closePlayerActions()
}

function pingUpdatesAsList(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "object") return Object.values(raw)
  return []
}

useStreams(["multiplayer_ping_updates"], (streams) => {
  for (const player of pingUpdatesAsList(streams.multiplayer_ping_updates)) {
    if (!player || player.id == null) continue
    const index = playerList.value.findIndex(entry => entry.id === player.id)
    if (index !== -1) {
      playerList.value[index].ping = player.ping
    }
  }
})

onMounted(() => {
  events.on("OnMultiplayerPlayerListData", onMultiplayerPlayerListData)
  lua.multiplayer_uiBackend_playerListProvider.requestMultiplayerPlayerListData()
})

onUnmounted(() => {
  events.off("OnMultiplayerPlayerListData", onMultiplayerPlayerListData)
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.players-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.player-card {
  --bng-button-margin: 0;
  --bng-button-min-width: 100%;
  --bng-button-max-width: 100%;
  --bng-button-padding: 0.0rem 0.5rem;
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

  display: flex;
  align-items: center;
  position: relative;
  @include modify-focus(var(--bng-corners-2), 2px);
}

.player-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.player-name {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--bng-off-white);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;

}

.player-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex: 0 1 auto;
}

.player-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: var(--bng-corners-1);
}

.owner-badge {
  background-color: rgba(var(--bng-orange-500-rgb), 0.3);
  color: var(--bng-orange-100);
}

.you-badge {
  background-color: rgba(var(--bng-ter-blue-400-rgb), 0.3);
  color: var(--bng-ter-blue-100);
}

.ready-status {
  font-size: 0.75rem;
  font-weight: 600;

  &.ready {
    color: var(--bng-add-green-400);
  }

  &.not-ready {
    color: var(--bng-add-red-500);
  }

  &.spectator {
    color: var(--bng-ter-yellow-200);
  }

  &.unmet-requirement {
    color: var(--bng-add-red-300);
  }
}

.player-ping {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bng-cool-gray-400);
}

</style>
