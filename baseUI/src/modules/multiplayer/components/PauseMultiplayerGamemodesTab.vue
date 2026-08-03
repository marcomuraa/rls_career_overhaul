<template>
  <div class="pause-mp-gamemodes-tab">
    <ReadyUpScreen v-if="readyUpGamemodeInfo && !isLobbyOwner" class="embedded-ready-up" />
    <template v-if="isLobbyOwner">
      <div v-if="!selectedGamemode" class="gamemodes-container">
        <BngInput
          v-if="hasGamemodes"
          :modelValue="searchQuery"
          @valueChanged="onSearchQueryChanged"
          class="search-input"
          :placeholder="$t('ui.multiplayer.searchGamemodes')"
        />
        <div v-if="filteredGamemodes.length > 0" class="gamemodes-list">
          <GamemodeTile
            v-for="gamemode in filteredGamemodes"
            :key="gamemode.name"
            :gamemode="gamemode"
          >
            <BngButton @click="selectGamemode(gamemode)" icon="arrowLargeRight"></BngButton>
          </GamemodeTile>
        </div>
        <div v-else class="no-gamemodes">
          {{ $t("ui.multiplayer.noGamemodesAvailable") }}
        </div>
        <p v-if="unsupportedOnMapCount > 0" class="unsupported-count-hint">
          {{ $t("ui.multiplayer.gamemodesUnsupportedOnMap", { count: unsupportedOnMapCount }) }}
        </p>
      </div>
      <div v-else class="gamemode-detail">
        <h3 class="section-title">{{ $t("ui.multiplayer.gamemode") }}</h3>
        <div :class="['gamemode-header', { 'greyed-out': currentGamemodeDisplayName }]">
          <BngButton @click="deselectGamemode" icon="arrowLargeLeft"></BngButton>
          <div class="gamemode-title">
            {{ $t(selectedGamemode.displayName) }}
          </div>
        </div>
        <div :class="['gamemode-content', { 'greyed-out': currentGamemodeDisplayName }]">
          <GenericGamemodeSettings ref="settingsRef" :settings="selectedGamemode.settings" />
        </div>
        <div class="setting-tooltip-area">
          <span v-if="settingsRef?.activeTooltip">{{ $t(settingsRef.activeTooltip) }}</span>
        </div>
        <BngButton
        v-if="roleToggleButton"
        class="role-toggle-button"
        @click="requestSetOwnGamemodeRole()"
        >{{ $t(roleToggleButton.label) }}</BngButton>
        <div v-if="!currentGamemodeDisplayName" class="desired-role-row">
          <span class="desired-role-label">{{ $t("ui.multiplayer.desiredRole") }} :</span>
          <BngSelect
          v-model="desiredRole"
          :options="roleOptions"
          :config="roleOptionsConfig"
          loop
          @valueChanged="onDesiredRoleChanged"
          />
        </div>
        <div v-if="hasUnmetLobbyRequirements" class="requirements-warning">
          <div v-for="(req, index) in selectedGamemode.unmetLobbyRequirements" :key="index" class="requirement-message">
            {{ req.message }}
          </div>
        </div>
        <div class="gamemode-footer">
          <BngButton v-if="currentGamemodeDisplayName" accent="attention" icon="square" @click="stopGamemode"></BngButton>
          <template v-else>
            <BngButton
              :accent="readyUpGamemodeInfo ? ACCENTS.attention : ACCENTS.main"
              @click="readyUpGamemodeInfo ? cancelReadyUp() : startReadyUp()"
            >
              <BngIcon v-if="readyUpGamemodeInfo" class="cancel-icon" type="undo" />
              {{ readyUpGamemodeInfo ? $t("ui.multiplayer.cancelReadyUpRequest") : $t("ui.multiplayer.requestReadyUp") }}
            </BngButton>
            <BngButton :disabled="hasUnmetLobbyRequirements" :accent="readyUpGamemodeInfo ? ACCENTS.main : ACCENTS.secondary" icon="play" @click="onStartGamemode"></BngButton>
          </template>
        </div>
      </div>
    </template>
    <template v-else-if="!readyUpGamemodeInfo">
      <div v-if="currentGamemodeDisplayName" class="currently-running">
        <p class="currently-running-text">
          {{ $t("ui.multiplayer.currentlyRunning") }} : {{ $t(currentGamemodeDisplayName) }}
        </p>
        <BngButton
          v-if="roleToggleButton"
          class="role-toggle-button"
          @click="requestSetOwnGamemodeRole()"
        >{{ $t(roleToggleButton.label) }}</BngButton>
      </div>
      <p v-else class="owner-only-hint">
        {{ $t("ui.multiplayer.ownerOnlyGamemodes") }}
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { BngButton, BngIcon, BngInput, BngSelect, ACCENTS } from "@/common/components/base"
import { useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import { $translate } from "@/services/translation"
import GamemodeTile from "@/modules/multiplayer/components/lobby/GamemodeTile.vue"
import GenericGamemodeSettings from "@/modules/multiplayer/components/lobby/GenericGamemodeSettings.vue"
import ReadyUpScreen from "@/modules/multiplayer/views/ReadyUpScreen.vue"

defineOptions({ name: "PauseMultiplayerGamemodesTab" })

const { lua } = useBridge()
const events = useEvents()
const bngVue = window.bngVue || { gotoGameState() {} }

const isLobbyOwner = ref(false)
const readyUpGamemodeInfo = ref(null)
const tabPlayers = ref([])
const selectedGamemode = ref(null)
const gamemodesList = ref([])
const unsupportedOnMapCount = ref(0)
const currentGamemodeDisplayName = ref(null)
const localPlayerLobbyRole = ref(null)
const searchQuery = ref("")
const desiredRole = ref("active")
const roleOptions = [
  { value: "active", label: "ui.multiplayer.active" },
  { value: "spectator", label: "ui.multiplayer.spectate" },
]
const roleOptionsConfig = {
  value: opt => opt.value,
  label: opt => $translate.instant(opt.label),
}

const settingsRef = ref(null)

const filteredGamemodes = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return gamemodesList.value
  return gamemodesList.value.filter(g => (g.uiSearchText || "").includes(query))
})

const hasGamemodes = computed(() => gamemodesList.value.length > 0)
const hasUnmetLobbyRequirements = computed(() => {
  const reqs = selectedGamemode.value?.unmetLobbyRequirements
  return reqs && reqs.length > 0
})

const localPlayerUnmetRequirements = computed(() => {
  const local = tabPlayers.value.find(p => p.isLocalPlayer)
  return local?.unmetPlayerRequirements ?? null
})

const hasLocalPlayerUnmetRequirements = computed(() => {
  return localPlayerUnmetRequirements.value && localPlayerUnmetRequirements.value.length > 0
})

const roleToggleButton = computed(() => {
  if (!currentGamemodeDisplayName.value) return null
  if (localPlayerLobbyRole.value === "active") {
    return { label: "ui.multiplayer.becomeSpectator" }
  }
  return null
})

function requestSetOwnGamemodeRole() {
  lua.multiplayer_uiBackend_multiplayerUIManager.requestSetOwnGamemodeRole("spectator")
}

function selectGamemode(gamemode) {
  selectedGamemode.value = gamemode
  lua.multiplayer_uiBackend_multiplayerUIManager.selectGamemodeForOwner(gamemode.name)
}

function onSearchQueryChanged(value) {
  searchQuery.value = value
}

function deselectGamemode() {
  lua.multiplayer_uiBackend_multiplayerUIManager.deselectGamemodeForOwner()
  selectedGamemode.value = null
}

function startReadyUp() {
  if (!selectedGamemode.value) return
  lua.multiplayer_uiBackend_multiplayerUIManager.startReadyUp({ name: selectedGamemode.value.name, displayName: selectedGamemode.value.displayName })
}

function cancelReadyUp() {
  lua.multiplayer_uiBackend_multiplayerUIManager.stopReadyUp()
}

function onStartGamemode() {
  const settings = settingsRef.value?.settingValues || {}
  if (!selectedGamemode.value) return
  lua.multiplayer_uiBackend_multiplayerUIManager.startGamemode(selectedGamemode.value.name, settings)
  bngVue.gotoGameState("play")
}

function stopGamemode() {
  const gamemodeName = selectedGamemode.value?.name
  lua.multiplayer_uiBackend_multiplayerUIManager.stopGamemode()
  if (gamemodeName) {
    lua.multiplayer_uiBackend_multiplayerUIManager.selectGamemodeForOwner(gamemodeName)
  }
}

function onDesiredRoleChanged(role) {
  lua.multiplayer_uiBackend_multiplayerUIManager.setOwnerPreReadyRole(role)
}

function onMultiplayerTabData(data) {
  isLobbyOwner.value = data?.isLobbyOwner === true
  readyUpGamemodeInfo.value = data?.readyUpGamemodeInfo || null
  tabPlayers.value = Array.isArray(data?.players) ? data.players : []
  gamemodesList.value = Object.values(data?.gamemodes || {})
  unsupportedOnMapCount.value = data?.unsupportedOnMapCount || 0
  currentGamemodeDisplayName.value = data?.currentGamemodeDisplayName || null
  localPlayerLobbyRole.value = data?.localPlayerLobbyRole || null

  const preReady = data?.preReadyStatuses
  if (preReady) {
    const localPlayer = tabPlayers.value.find(p => p.isLocalPlayer)
    if (localPlayer) {
      desiredRole.value = preReady[localPlayer.id] === "spectator" ? "spectator" : "active"
    }
  } else {
    desiredRole.value = "active"
  }

  if (selectedGamemode.value) {
    const refreshed = gamemodesList.value.find(g => g.name === selectedGamemode.value.name)
    if (refreshed) selectedGamemode.value = refreshed
  }
  if (currentGamemodeDisplayName.value) {
    const running = gamemodesList.value.find(g => g.displayName === currentGamemodeDisplayName.value)
    if (running) selectedGamemode.value = running
  }
}

onMounted(async () => {
  events.on("OnMultiplayerTabData", onMultiplayerTabData)
  await lua.extensions.load("multiplayer_uiBackend_multiplayerUIManager")
  lua.multiplayer_uiBackend_multiplayerUIManager.requestMultiplayerTabData()
})

onUnmounted(() => {
  lua.multiplayer_uiBackend_multiplayerUIManager.deselectGamemodeForOwner()
  events.off("OnMultiplayerTabData", onMultiplayerTabData)
})
</script>

<style scoped lang="scss">
.pause-mp-gamemodes-tab {
  padding: 0.35rem 0.65rem 0.75rem;
  box-sizing: border-box;
}

.embedded-ready-up {
  max-width: none;
  padding: 0;
  align-items: stretch;
}

.greyed-out {
  opacity: 0.3;
  pointer-events: none;
  filter: grayscale(0.6);
}

.gamemodes-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.search-input {
  --input-height: 2rem;
}

.gamemodes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.no-gamemodes {
  padding: 1rem;
  text-align: center;
  color: var(--bng-cool-gray-400);
  font-style: italic;
}

.unsupported-count-hint {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--bng-cool-gray-300);
}

.section-title {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  font-style: italic;
  color: var(--bng-orange-100);
}

.gamemode-detail {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  height: 100%;
  padding-bottom: 0.25rem;
}

.gamemode-header {
  display: flex;
  align-items: center;
}

.gamemode-content {
  flex: 1;
}

.gamemode-title {
  flex: 1;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bng-off-white);
}

.setting-tooltip-area {
  min-height: 1.5rem;
  font-size: 0.8rem;
  color: var(--bng-cool-gray-400);
  font-style: italic;
  padding: 0 0.25rem;
}

.requirements-warning {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.requirement-message {
  padding: 0.5rem 0.75rem;
  background-color: rgba(var(--bng-add-red-500-rgb), 0.2);
  border: 1px solid var(--bng-add-red-500);
  border-radius: var(--bng-corners-1);
  color: var(--bng-add-red-300);
  font-size: 0.85rem;
  font-weight: 500;
}

.gamemode-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cancel-icon {
  --bng-icon-size: 1em;
  margin-right: 0.5rem;
}

.currently-running {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-toggle-button {
  align-self: center;
}

.currently-running-text {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--bng-off-white);
}

.owner-only-hint {
  margin: 0;
  padding: 0.25rem 0.15rem 0.5rem;
  color: var(--bng-cool-gray-400);
  font-size: 0.95rem;
  line-height: 1.4;
}

.desired-role-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.desired-role-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--bng-cool-gray-300);
  white-space: nowrap;
  margin-right: 0.1rem;
}
</style>
