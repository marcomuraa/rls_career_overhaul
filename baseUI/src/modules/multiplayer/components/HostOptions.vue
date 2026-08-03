<template>
  <BngCard class="host-options">
    <div class="card-content">
      <div class="content-layout">
        <div class="settings-column">
          <BngCardHeading>Host Options</BngCardHeading>

          <MultiplayerSessionIdentifiers
            v-if="sessionInviteInfo?.id"
            :session-id="sessionInviteInfo.id"
            :join-code="sessionInviteInfo.joinCode"
            :show-join-row="!sessionInviteInfo.isLocalSession"
          />

          <div class="settings-group">
            <h3 class="section-header">Session Settings:</h3>
            <div class="switch-list">
              <BngSwitch
                v-for="setting in settingsDataIn.sessionSettings || []"
                :key="setting.name"
                :label="$tt(setting.label)"
                v-model="setting.value"
                @update:model-value="val => setSessionSetting(setting.name, val)"
              />
            </div>
          </div>

          <div class="settings-group">
            <h3 class="section-header">Extra Options:</h3>
            <div class="switch-list">
              <BngSwitch
                v-for="setting in settingsDataIn.extraOptions || []"
                :key="setting.name"
                :label="$tt(setting.label)"
                v-model="setting.value"
                @update:model-value="val => setExtraOption(setting.name, val)"
              />
            </div>
          </div>

          <div class="action-buttons">
            <BngButton v-if="!isInSession" accent="attention" @click="createSession">Create</BngButton>
            <BngButton v-if="!isInSession" @click="createSessionWithCurrentLevel">Create with Current Level</BngButton>
            <BngButton v-else accent="attention" @click="leaveSession">{{ $t("ui.multiplayer.leaveSession") }}</BngButton>
            <BngButton
              v-if="canInviteFromSession"
              accent="outlined"
              @click="invitePlayers"
            >{{ $t("ui.multiplayer.invitePlayers") }}</BngButton>
            <BngButton v-if="isInSession && hasChanges" @click="applySettings">Apply</BngButton>
          </div>
        </div>

        <div class="players-column">
          <h3 class="section-header">Players</h3>
          <div class="players-list" v-if="isInSession">
            <div
              v-for="player in playersDataIn"
              :key="player.id"
              class="player-row"
              :class="{ 'is-local': player.isLocal }"
            >
              <span class="player-name">{{ player.persona || player.id }}</span>
              <span class="player-platform">{{ player.platform }}</span>
              <span class="player-ping">{{ player.ping }}ms</span>
            </div>
            <div v-if="playersDataIn.length === 0" class="players-empty">
              No players
            </div>
          </div>
        </div>
      </div>
    </div>
  </BngCard>
</template>

<script setup>
import { BngCard, BngCardHeading, BngButton, BngSwitch } from "@/common/components/base"
import MultiplayerSessionIdentifiers from "@/modules/multiplayer/components/MultiplayerSessionIdentifiers.vue"
import { ref, onMounted, onUnmounted, computed } from "vue"
import { lua } from "@/bridge"

const settingsDataIn = ref({})
const playersDataIn = ref([])

const sessionSettingsOut = ref({})
const extraOptionsOut = ref({})
const sessionInviteInfo = ref(null)

let playersIntervalId = null

const hasChanges = computed(() => {
  return Object.keys(sessionSettingsOut.value).length > 0 || Object.keys(extraOptionsOut.value).length > 0
})

const isInSession = computed(() => {
  return settingsDataIn.value && settingsDataIn.value.inSession === true
})

const canInviteFromSession = computed(() => {
  const s = sessionInviteInfo.value
  return s && s.inSession && !s.isLocalSession && s.isSessionHost === true
})

onMounted(async () => {
  settingsDataIn.value = (await lua.multiplayer_sessionManager.getSettingsDataForUI()) || {}

  const sessionSettings = Object.values(settingsDataIn.value.sessionSettings || {})
  const extraOptions = Object.values(settingsDataIn.value.extraOptions || {})

  for (let setting of sessionSettings) {
    setting.value = ref(setting.value)
  }
  for (let option of extraOptions) {
    option.value = ref(option.value)
  }

  await refreshPlayers()
  playersIntervalId = setInterval(refreshPlayers, 1000)
})

onUnmounted(() => {
  if (playersIntervalId) {
    clearInterval(playersIntervalId)
    playersIntervalId = null
  }
})

const refreshPlayers = async () => {
  playersDataIn.value = (await lua.multiplayer_sessionManager.getSessionPlayersForUI()) || []
  await refreshSessionInvite()
}

const refreshSessionInvite = async () => {
  if (!isInSession.value) {
    sessionInviteInfo.value = null
    return
  }
  sessionInviteInfo.value = (await lua.multiplayer_sessionManager.getSessionInviteInfoForUI()) || null
}

const setSessionSetting = (name, value) => {
  sessionSettingsOut.value[name] = value
}

const setExtraOption = (name, value) => {
  extraOptionsOut.value[name] = value
}

const applySettings = () => {
  lua.multiplayer_sessionManager.setSettingsDataFromUI(sessionSettingsOut.value, extraOptionsOut.value)
  sessionSettingsOut.value = {}
  extraOptionsOut.value = {}
}

const createSession = () => {
  lua.multiplayer_sessionManager.createSessionFromUI(false, sessionSettingsOut.value, extraOptionsOut.value)
}

const createSessionWithCurrentLevel = () => {
  lua.multiplayer_sessionManager.createSessionFromUI(true, sessionSettingsOut.value, extraOptionsOut.value)
}

const leaveSession = () => {
  lua.multiplayer_sessionManager.leaveCurrentSession()
}

const invitePlayers = () => {
  lua.multiplayer_sessionManager.openInviteDialogForCurrentSession()
}

</script>

<style scoped lang="scss">
.host-options {
  width: 44em;
  background: var(--bng-cool-gray-800);
  opacity: 0.8;
}

.section-header {
  font-family: 'Overpass', var(--fnt-defs);
}

.card-content {
  padding: 1em;
  color: var(--bng-off-white);
}

.content-layout {
  display: flex;
  gap: 1rem;
}

.settings-column {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.players-column {
  width: 23em;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.switch-list {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--bng-cool-gray-700);
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.player-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8em;
}

.player-row.is-local .player-name {
  font-weight: 600;
}

.player-platform {
  color: var(--bng-cool-gray-300);
  font-size: 0.9em;
}

.player-ping,
.players-empty {
  color: var(--bng-cool-gray-300);
  font-size: 0.9em;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1em;
}
</style>
