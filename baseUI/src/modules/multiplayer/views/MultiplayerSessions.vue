<template>
  <LayoutSingle class="mp-layout" v-bng-on-ui-nav:back="onBack">
    <div
      v-bng-scoped-nav="{
        scopeId: MULTIPLAYER_SESSIONS_SCOPE_ID,
        preferAutoFocus: true,
        canDeactivate: canDeactivateSessionsScope,
      }"
      class="mp-panel"
    >
      <div class="mp-content">
        <div class="mp-header-box" v-bng-blur>
          <BlurBackground />
          <div class="mp-info-header">
            <BngScreenHeadingV2 type="2">
              {{ $tt("ui.playmodes.multiplayer") }}
            </BngScreenHeadingV2>
            <div class="mp-info-tags">
              <div v-if="!working" class="mp-info-tag-item mp-info-tag-item--warn">{{ $tt("ui.multiplayer.sessions.mpNotWorking") }}</div>
            </div>
          </div>
        </div>

        <div class="mp-join-box" v-bng-blur>
          <BlurBackground />

          <template v-if="joinUi === 'mods'">
            <div
              v-bng-scoped-nav="{
                scopeId: MULTIPLAYER_REQUIRED_MODS_SCOPE_ID,
                preferAutoFocus: true,
              }"
              class="mp-required-mods-scope"
              @deactivate="onModsScopeDeactivate"
            >
              <MultiplayerRequiredMods
                :sessionInfo="sessionInfo"
                :mods="requiredMods"
                :loading="requiredModsLoading"
                :error="requiredModsError"
                :canJoin="canJoinAfterModsCheck"
                :joining="isJoining"
                :downloading="requiredModsDownloading"
                @back="onModsBack"
                @join="continueJoinAfterMods"
                @download="downloadMissingMods"
                @cancel="cancelJoin"
              />
            </div>
          </template>

          <template v-else>
            <!--
            <div class="mp-join-explain">
              {{ $tt("ui.multiplayer.sessions.explanation") }}
            </div>
            -->
            <div class="mp-browser">
              <div class="mp-browser-toolbar">
                <SessionBrowserSessionField
                  ref="sessionBrowserFieldRef"
                  v-model:session-id="inputSessionId"
                  v-model:join-code="joinCode"
                  :working="working"
                  :show-join-code="!isLanSession && !!sessionInfo?.id"
                  :is-lan-session="isLanSession"
                  @paste="pasteFromClipboard"
                  @clear="clearInputs"
                />
                <div class="mp-browser-toolbar-spacer" aria-hidden="true" />
                <div class="mp-browser-toolbar-aside">
                  <div class="mp-browser-host">
                    <BngButton
                      accent="secondary"
                      :disabled="!working"
                      v-bng-on-ui-nav:action_2.asMouse
                      @click="openPlatformOverlay"
                    >
                      <span class="mp-join-label">
                        <BngBinding controller ui-event="action_2" />
                        {{ $tt("ui.multiplayer.sessions.openFriendsList") }}
                      </span>
                    </BngButton>
                  </div>
                  <div class="mp-browser-host">
                    <BngButton
                      accent="secondary"
                      v-bng-on-ui-nav:context.asMouse
                      @click="openFreeroamMultiplayerWizard"
                    >
                      <span class="mp-join-label">
                        <BngBinding controller ui-event="context" />
                        <BngIcon class="mp-join-icon" :type="icons.helmets" />
                        Host Session...
                      </span>
                    </BngButton>
                  </div>
                </div>
              </div>
              <div class="mp-browser-sections">
                <div class="mp-browser-section">
                  <SessionBrowserList
                    :sessions="foundSessionRows"
                    @select="onBrowserSessionSelect"
                  />
                </div>

                <div  class="mp-browser-section">
                  <div class="mp-browser-section-header">
                    <div class="mp-browser-section-title">Local sessions</div>
                    <BngButton
                      class="mp-browser-section-refresh"
                      accent="text"
                      :icon="icons.arrowsReplace"
                      :disabled="!working"
                      @click="refreshLocalSessions"
                    />
                  </div>
                  <SessionBrowserList v-if="localSessionRows.length"
                    :sessions="localSessionRows"
                    @select="onBrowserSessionSelect"
                  />
                  <template v-else>
                    <div class="mp-browser-section-notice">No Local Sessions found.</div>
                  </template>
                </div>

                <div v-if="recentSessionRows.length" class="mp-browser-section">
                  <div class="mp-browser-section-title">Recent connections</div>
                  <SessionBrowserList
                    :sessions="recentSessionRows"
                    @select="onBrowserSessionSelect"
                  />
                </div>
              </div>
            </div>
            <!--
            <div v-if="recentSessions.length" class="mp-session-container">
              <button class="mp-sessionlist-toggle" @click="recentOpen = !recentOpen">
                <BngIcon class="mp-sessionlist-arrow" :class="{ open: recentOpen }" :type="icons.arrowSmallDown" />
                <span>{{ $tt("ui.multiplayer.sessions.recentSessions") }}</span>
              </button>
              <div v-if="recentOpen" class="mp-session-list">
                <button
                  v-for="entry in recentSessions"
                  :key="entry.host"
                  class="mp-session-list-item"
                  @click="selectSession(entry, false)"
                >
                  <span class="mp-session-list-name">{{ entry.hostName }}</span>
                  <span class="mp-session-list-date">{{ formatDate(entry.lastPlayed) }}</span>
                  {{ entry }}
                </button>
              </div>
            </div>

            <div v-if="localSessions.length" class="mp-session-container">
              <button class="mp-sessionlist-toggle" @click="localSessionsOpen = !localSessionsOpen">
                <BngIcon class="mp-sessionlist-arrow" :class="{ open: localSessionsOpen }" :type="icons.arrowSmallDown" />
                <span>{{ $tt("ui.multiplayer.sessions.localSessions") }}</span>
                <BngButton
                  class="mp-sessionlist-refresh-btn"
                  accent="outlined"
                  :disabled="!working"
                  @click="refreshLocalSessions"
                ><BngIcon :type="icons.refresh" /></BngButton>
              </button>
              <div v-if="localSessionsOpen" class="mp-session-list">
                <button
                  v-for="entry in localSessions"
                  :key="entry.id"
                  class="mp-session-list-item"
                  @click="selectSession(entry, true)"
                >
                  <span class="mp-session-list-name">{{ entry.name }}</span>
                  <span class="mp-session-list-players">{{ entry.player_count }}/{{ entry.max_players }}</span>
                  {{ entry }}
                </button>
              </div>
            </div>

            <div class="mp-or-separator">
              <span class="line"></span>
              <span class="text">or</span>
              <span class="line"></span>
            </div>

            <div class="mp-control">
              <BngButton
                accent="outlined"
                :disabled="!working"
                @click="openPlatformOverlay"
              >{{ $tt("ui.multiplayer.sessions.openFriendsList") }}</BngButton>
            </div>



            <div class="mp-preview-divider"></div>

            <div v-if="sessionInfo" class="mp-session-preview">
              <div class="mp-session-preview-top">
                <div class="mp-session-preview-name">{{ sessionInfo.name }}</div>
                <div class="mp-session-preview-players">{{ sessionInfo.player_count }}/{{ sessionInfo.max_players }}</div>
              </div>
              <div class="mp-session-preview-meta">
                <div class="mp-session-preview-meta-item">
                  <span class="k">Level</span>
                  <span class="v">{{ sessionInfo.level }}</span>
                </div>
              </div>
            </div>

            <div class="mp-control">
              <BngButton
                accent="main"
                :disabled="!canJoin || requiredModsLoading"
                @click="joinSessionCheckMods"
              >
                <span class="mp-join-label">
                  <BngIcon class="mp-join-icon" :type="icons.peopleOutline" />
                  {{ $tt("ui.multiplayer.sessions.joinSession") }}
                </span>
              </BngButton>
            </div>

            <div v-if="isJoining" class="mp-control">
              <BngButton
                accent="attentionoutlined"
                @click="cancelJoin"
              >{{ $tt("ui.multiplayer.sessions.cancelJoining") }}</BngButton>
            </div>


            -->
          </template>
        </div>
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { BngBinding, BngButton, BngIcon, BngScreenHeadingV2, icons } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { LayoutSingle } from "@/common/layouts"
import { lua } from "@/bridge"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import MultiplayerRequiredMods from "../components/MultiplayerRequiredMods.vue"
import SessionBrowserList from "../components/sessionBrowser/SessionBrowserList.vue"
import SessionBrowserSessionField from "../components/sessionBrowser/SessionBrowserSessionField.vue"
import { useEvents } from "@/services/events"
import { useScopedNav } from "@/services/scopedNav/api"
import { timeSpan } from "@/utils/datetime"

defineOptions({ name: "MainMenuMultiplayerSessions" })

defineProps({
  firstTime: Boolean,
  addons: Object,
})

const MULTIPLAYER_SESSIONS_SCOPE_ID = "multiplayer-sessions"
const MULTIPLAYER_REQUIRED_MODS_SCOPE_ID = "multiplayer-required-mods"

const events = useEvents()
const { switchScope } = useScopedNav()

const working = ref(false)
const isJoining = ref(false)

const inputSessionId = ref("")
const sessionInfo = ref(null)
const joinCode = ref("")
const sessionBrowserFieldRef = ref(null)
let pendingJoinCode = ""
let previewTimer = null

const recentSessions = ref([])
const recentOpen = ref(false)
const localSessions = ref([])
const localSessionsOpen = ref(false)
const recentConnectionStates = ref({})
const sessionIdInputSanitized = computed(() => sanitizeSessionId(inputSessionId.value))
const isSessionIdFormatValid = computed(() => /^\d{9}$/.test(sessionIdInputSanitized.value))

function getRecentKey(entry, idx) {
  return String(entry?.host ?? entry?.id ?? `recent_${idx}`)
}

const foundSessionRows = computed(() => {
  if (!sessionIdInputSanitized.value) {
    return [{
      key: "found:empty",
      source: "found",
      id: "",
      name: "Please enter a session ID",
      level: "Session ID must be exactly 9 digits",
      players: "—",
      preview: "",
      state: "recentUnknown",
      actionable: false,
    }]
  }

  if (!isSessionIdFormatValid.value) {
    return [{
      key: "found:invalid",
      source: "found",
      id: "",
      name: "Invalid session ID format",
      level: "Session ID must be exactly 9 digits",
      players: "—",
      preview: "",
      state: "unavailable",
      actionable: false,
    }]
  }

  if (sessionInfo.value?.noSessionFound) {
    return [{
      key: `found:notfound:${sessionIdInputSanitized.value}`,
      source: "found",
      id: "",
      name: "Session not found",
      level: `No active session for ID ${sessionIdInputSanitized.value}`,
      players: "—",
      preview: "",
      state: "unavailable",
      actionable: false,
    }]
  }

  if (!sessionInfo.value?.id) {
    return [{
      key: `found:pending:${sessionIdInputSanitized.value}`,
      source: "found",
      id: "",
      name: "Looking up session...",
      level: `Searching for ID ${sessionIdInputSanitized.value}`,
      players: "—",
      preview: "",
      state: "recentUnknown",
      actionable: false,
    }]
  }
  return [{
    key: `found:${sessionInfo.value.id}`,
    source: "found",
    id: sessionInfo.value.id,
    name: sessionInfo.value.name || sessionInfo.value.id,
    level: sessionInfo.value.level || "Unknown",
    players: `${sessionInfo.value.player_count ?? 0}/${sessionInfo.value.max_players ?? "?"}`,
    preview: sessionInfo.value.preview || sessionInfo.value.thumbnail || "",
    state: "live",
    actionable: true,
  }]
})

const recentSessionRows = computed(() =>
  recentSessions.value.map((entry, idx) => {
    const key = getRecentKey(entry, idx)
    const connection = entry.host || ""
    return {
      key: `recent:${key}`,
      source: "recent",
      id: entry.id || "",
      host: entry.host,
      connection,
      recentKey: key,
      name: entry.hostName || entry.name || "Recent session",
      level: entry.level || "Unknown",
      players: entry.player_count != null && entry.max_players != null
        ? `${entry.player_count}/${entry.max_players}`
        : "—",
      preview: entry.preview || entry.thumbnail || "",
      lastJoinedAgo: formatTimeSince(entry.lastPlayed),
      state: recentConnectionStates.value[connection] || "recentUnknown",
      actionable: true,
    }
  })
)

const localSessionRows = computed(() =>
  localSessions.value.map((entry, idx) => ({
    key: `local:${entry.id ?? idx}`,
    source: "local",
    id: entry.id || "",
    name: entry.name || "Local session",
    level: entry.level || "Local",
    players: `${entry.player_count ?? 0}/${entry.max_players ?? "?"}`,
    preview: entry.preview || entry.thumbnail || "",
    state: "live",
    actionable: true,
  }))
)

async function onBrowserSessionSelect(row) {
  if (!row) return
  if (row.actionable === false) return

  const rowId = row.id ? String(row.id) : ""

  // LAN browser list: join directly; do not write `lan:...` into Session ID (9-digit field).
  if (row.source === "local" && rowId) {
    sessionInfo.value = localSessions.value.find(e => String(e.id) === rowId) ?? { id: rowId }
    await joinSessionCheckMods()
    return
  }

  // If the row points to the currently resolved live session and join is valid,
  // treat row activation as "join now".
  if (row.state === "live" && rowId && sessionInfo.value?.id === rowId && canJoin.value) {
    await joinSessionCheckMods()
    return
  }

  // Found/live rows can be selected directly by id.
  if ((row.source === "found" || row.state === "live") && rowId) {
    inputSessionId.value = rowId
    return
  }

  // Recent rows are just shorthand: resolve ID by host, then fill Session ID input.
  if (row.source !== "recent" || !row.recentKey) return

  if (row.host) {
    lua.multiplayer_sessionManager.findSessionByConnectionForUI(row.host)
  } else if (row.id) {
    inputSessionId.value = row.id
  }
}

const joinUi = ref("join") // "join" | "mods"
const requiredModsLoading = ref(false)
const requiredModsError = ref("")
const requiredMods = ref([])
const requiredModsDownloading = ref(false)

function sanitizeSessionId(v) {
  return (v ?? "").toString().trim()
}

function formatDate(timestamp) {
  const d = new Date(timestamp * 1000)
  // will change
  return d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB")
}

function formatTimeSince(timestamp) {
  if (!timestamp) return ""
  const relative = timeSpan(timestamp, null, 1, true)
  if (!relative || relative === "-") return ""
  return `Last joined ${relative}`
}

function selectSession(entry, isLocal) {
  if (isLocal) {
    inputSessionId.value = entry.id
  } else {
    lua.multiplayer_sessionManager.findSessionByConnectionForUI(entry.host)
  }
}

function onRecentSessionCheckedResults(data) {
  if (!data || typeof data !== "object") return


  const connection = data.connection != null ? String(data.connection) : ""
  const sessionId = data.session_id || data.sessionId || ""
  const noSessionFound = !!data.noSessionFound

  if (connection) {
    recentConnectionStates.value = {
      ...recentConnectionStates.value,
      [connection]: noSessionFound ? "unavailable" : (sessionId ? "live" : "recentUnknown"),
    }
  }

  if (noSessionFound) {
    inputSessionId.value = ""
  } else if (sessionId) {
    inputSessionId.value = String(sessionId)
  }
}

function onSessionInfoData(data) {
  sessionInfo.value = data
  if (data?.id && !isLanSession.value) {
    if (pendingJoinCode) {
      joinCode.value = pendingJoinCode
      pendingJoinCode = ""
    }
    nextTick(() => sessionBrowserFieldRef.value?.focusJoinCode())
  }
}

function handlePaste(e, clipText) {
  const raw =
    clipText != null
      ? clipText
      : (e?.clipboardData || window.clipboardData)?.getData("text")
  const text = raw?.trim()
  if (!text || !text.includes("|")) return

  const parts = text.split("|")
  if (parts.length !== 2) return

  const [pastedId, pastedCode] = parts
  const id = sanitizeSessionId(pastedId)
  const codeNum = Number(pastedCode)
  if (id.length !== 9 || !Number.isInteger(codeNum) || codeNum < 1000 || codeNum > 9999) return

  if (e) e.preventDefault()

  if (sessionInfo.value) {
    joinCode.value = pastedCode
  } else {
    pendingJoinCode = pastedCode
    inputSessionId.value = id
  }
}

const isLanSession = computed(() =>
  sessionInfo.value?.id?.startsWith("lan:") ?? false
)

const canJoin = computed(() =>
  working.value &&
  !isJoining.value &&
  !!sessionInfo.value?.id &&
  (isLanSession.value || sessionBrowserFieldRef.value?.isJoinCodeValid(joinCode.value))
)

async function joinSessionCheckMods() {
  if (!sessionInfo.value) return

  requiredModsLoading.value = true
  requiredModsError.value = ""
  requiredMods.value = []
  requiredModsDownloading.value = false

  const id = sessionInfo.value.id
  const code = isLanSession.value ? undefined : Number(joinCode.value)
  isJoining.value = true
  if (isLanSession.value) {
    await lua.multiplayer_sessionManager.joinSessionThruLAN(id)
  } else {
    await lua.multiplayer_sessionManager.joinSessionThruSessionsServer(id, code)
  }
  isJoining.value = false
}

const canJoinAfterModsCheck = computed(() =>
  canJoin.value && requiredMods.value.length === 0
)

async function continueJoinAfterMods() {
  requiredModsLoading.value = true
  requiredModsError.value = ""
  requiredModsDownloading.value = false
  await lua.multiplayer_sessionManager.continueJoiningSessionAfterMods()
  requiredModsLoading.value = false
}

async function downloadMissingMods() {
  requiredModsDownloading.value = true
  await lua.multiplayer_sessionManager.downloadMissingMods()
  //requiredModsDownloading.value = false
}

function closeModsUi() {
  joinUi.value = "join"
  requiredModsLoading.value = false
  requiredModsError.value = ""
  requiredMods.value = []
  requiredModsDownloading.value = false
}

function focusSessionsScope() {
  nextTick(() => switchScope(MULTIPLAYER_SESSIONS_SCOPE_ID))
}

function closeModsUiAndFocusSessions() {
  closeModsUi()
  focusSessionsScope()
}

function onModsBack() {
  closeModsUiAndFocusSessions()
}

function onModsScopeDeactivate() {
  if (joinUi.value !== "mods") return
  closeModsUiAndFocusSessions()
}

function canDeactivateSessionsScope() {
  if (joinUi.value !== "mods") return true
  closeModsUiAndFocusSessions()
  return false
}

async function cancelJoin() {
  isJoining.value = false
  await lua.multiplayer_sessionManager.cancelJoiningSession()
}

async function pasteFromClipboard() {
  const text = await lua.getClipboard()
  handlePaste(null, text)
}

function clearInputs() {
  inputSessionId.value = ""
  joinCode.value = ""
  sessionInfo.value = null
  closeModsUi()
}

function openPlatformOverlay() {
  lua.OnlineServiceProvider.openFriendsListDialog()
}

async function openFreeroamMultiplayerWizard() {
  await lua.freeroam_freeroamConfigurator.updateOption("mp_mpEnabled", true)
  await lua.extensions.ui_router.navigate("menu.freeroamLevels.vehicles.options.multiplayer")
}

function onBack(event) {
  if (event?.detail?.force) return
  if (joinUi.value === "mods") {
    onModsBack()
    return
  }
  // lua.extensions.ui_router.navigate("menu.others")
  lua.extensions.ui_router.back()
}

async function onRequiredModsData(data) {
  requiredModsError.value = ""
  requiredMods.value = data.mods
  requiredModsLoading.value = false

  joinUi.value = "mods"
  await nextTick()
  switchScope(MULTIPLAYER_REQUIRED_MODS_SCOPE_ID)
}

function onMultiplayerLocalSessionDiscovered(session) {
  localSessions.value.push(session)
}

function refreshLocalSessions() {
  localSessions.value = []
  lua.multiplayer_uiBackend_sessionListProvider.requestLocalSessionsDataForUI()
}

onMounted(async () => {
  await lua.extensions.load("multiplayer_multiplayer")
  working.value = await lua.extensions.isExtensionLoaded("multiplayer_multiplayer")
  if (working.value) {
    await lua.extensions.load("multiplayer_sessionsImgui")
  }

  events.on("OnMultiplayerSessionInfoData", onSessionInfoData)
  events.on("onRecentSessionCheckedResults", onRecentSessionCheckedResults)
  events.on("OnMultiplayerSessionRequiredMods", onRequiredModsData)
  events.on("OnMultiplayerLocalSessionDiscovered", onMultiplayerLocalSessionDiscovered)
  document.addEventListener("paste", handlePaste)

  const history = await lua.multiplayer_sessionManager.getSessionHistory(true)
  if (history) recentSessions.value = history

  lua.multiplayer_uiBackend_sessionListProvider.requestLocalSessionsDataForUI()
})

watch(inputSessionId, (raw) => {
  const id = sanitizeSessionId(raw)

  if (previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }

  sessionInfo.value = null
  joinCode.value = ""
  closeModsUi()

  if (!/^\d{9}$/.test(id)) return

  previewTimer = setTimeout(() => {
    lua.multiplayer_sessionManager.requestSessionInfoForUI(id)
  }, 300)
})

onUnmounted(() => {
  if (previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
  events.off("OnMultiplayerSessionInfoData", onSessionInfoData)
  events.off("onRecentSessionCheckedResults", onRecentSessionCheckedResults)
  events.off("OnMultiplayerSessionRequiredMods", onRequiredModsData)
  events.off("OnMultiplayerLocalSessionDiscovered", onMultiplayerLocalSessionDiscovered)
  document.removeEventListener("paste", handlePaste)
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.mp-layout {
  --content-flow: column;
  --content-max-width: calc-ui-rem(85);
  --content-h-position: center;

  :deep(.layout-content) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
}

.mp-panel {
  width: 100%;
  max-width: calc-ui-rem(87);
  border-radius: var(--bng-corners-2);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: calc-ui-rem(35);
  height: 100%;
}

.mp-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  padding: 0.75em;
  gap: 0.5em;
}

.mp-header-box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  align-items: stretch;
  width: 100%;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  --bng-heading-background: none;
  color: var(--bng-off-white);
}

.mp-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5em;
}

.mp-header-box :deep(.bng-screen-heading) {
  padding: 0.6em 0.75em;
  margin-top: 0;
}

.mp-join-box {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75em;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  gap: 0.6em;
}

.mp-required-mods-scope {
  width: 100%;
  display: flex;
  justify-content: center;
}

.mp-join-title {
  font-weight: 700;
  font-style: italic;
  font-size: calc-ui-rem(1.6);
  line-height: 1.1;
  letter-spacing: 0.015em;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  width: 100%;
  max-width: calc-ui-rem(29);
  padding: 0.7em 0.75em;
  margin: 0;
  border-bottom: 1px solid rgba(var(--bng-off-white-rgb), 0.12);
  text-align: center;
}

.mp-join-explain {
  width: 100%;
  max-width: calc-ui-rem(29);
  text-align: center;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  font-size: calc-ui-rem(0.85);
  line-height: 1.25;
  margin-top: -0.15em;
}

.mp-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  padding: 0 0.75em 0.6em 0.75em;
  justify-content: flex-end;
}

.mp-info-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  font-size: calc-ui-rem(0.75);
  line-height: 1.2;
  font-weight: 500;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.5);
  padding: 0.25em 0.5em;
  border-radius: calc-ui-rem(0.5);
}

.mp-info-tag-item--warn {
  color: rgba(var(--bng-add-red-200-rgb), 0.9);
}

.mp-control {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
  display: flex;
  justify-content: center;
}

.mp-control :deep(.bng-button) {
  width: 100%;
  justify-content: center;
  margin: 0;
  /* Override Button's default 6em..20em limits so our max-width rules win */
  --bng-button-min-width: 0;
  --bng-button-max-width: 999em;
  --bng-content-justify: center;
  --bng-content-align: center;
  --bng-button-padding-top: 0.55em;
  --bng-button-padding-bottom: 0.6em;
}

.mp-control :deep(.bng-button[accent="outlined"]) {
  --bng-button-text-enabled-color: rgba(var(--bng-off-white-rgb), 0.92);
  --bng-button-text-hover-color: rgba(var(--bng-off-white-rgb), 0.98);
  --bng-button-text-active-color: rgba(var(--bng-off-white-rgb), 0.92);

  --bng-bg-enabled: rgba(var(--bng-off-white-rgb), 0.06);
  --bng-bg-hover: rgba(var(--bng-off-white-rgb), 0.09);
  --bng-bg-active: rgba(var(--bng-off-white-rgb), 0.12);
  --bng-bg-enabled-opacity: 1;
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.35);
  --bng-bg-border-hover: rgba(var(--bng-off-white-rgb), 0.55);
  --bng-bg-border-active: rgba(var(--bng-off-white-rgb), 0.65);
  --bng-bg-border-width: calc-ui-rem(0.11);
  --bng-bg-border-radius: var(--bng-corners-1);
}

.mp-join-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  width: 100%;
}

.mp-join-icon {
  font-size: 1.25em;
}

/* --- Session browser (join screen) --- */

.mp-browser {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: calc-ui-rem(60);
  max-height: calc-ui-rem(35);
  align-self: center;
  justify-self: center;
  gap: 0.75em;
}

.mp-browser-sections {
  display: flex;
  flex-direction: column;
  gap: 0.65em;
  min-height: 0;
}

.mp-browser-section {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  min-height: 0;
}

.mp-browser-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4em;
}

.mp-browser-section-title {
  font-size: calc-ui-rem(0.72);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--bng-off-white-rgb), 0.5);
  padding: 0 0.15em;
  border-bottom: 1px solid rgba(var(--bng-off-white-rgb), 0.12);
}

.mp-browser-section-notice {
  font-size: calc-ui-rem(0.72);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--bng-off-white-rgb), 0.5);
  padding: 0 0.15em;
  background: rgba(var(--bng-cool-gray-900-rgb), 0.88);
  border-radius: var(--bng-corners-1);
  text-align: center;
  padding: 0.75em;
}

.mp-browser-section-refresh {
  flex: 0 0 auto;
  margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;
  --bng-button-padding-top: 0.2em;
  --bng-button-padding-bottom: 0.2em;
}

.mp-browser-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  gap: 0.75em;
  width: 100%;
}

.mp-browser-toolbar-spacer {
  flex: 1 1 0;
  min-width: 0.5em;
  align-self: stretch;
  pointer-events: none;
}

.mp-browser-toolbar-aside {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 0.5em;
}

.mp-browser-host {
  width: auto;
  max-width: none;
  align-self: flex-end;
  display: flex;
  justify-content: flex-end;
}

.mp-browser-host :deep(.bng-button) {
  width: auto;
  min-width: max-content;
  margin: 0;
}

.mp-preview-divider {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
  height: 1px;
  margin: 0.1em 0;
  background: linear-gradient(90deg, transparent 0%, rgba(var(--bng-off-white-rgb), 0.25) 50%, transparent 100%);
}

.mp-session-container {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
}

.mp-sessionlist-toggle {
  all: unset;
  display: flex;
  align-items: center;
  gap: 0.4em;
  width: 100%;
  padding: 0.5em 0.6em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-white-rgb), 0.06);
  color: rgba(var(--bng-off-white-rgb), 0.75);
  font-size: calc-ui-rem(0.85);
  font-weight: 650;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    background-color: rgba(var(--bng-off-white-rgb), 0.1);
  }
}

.mp-sessionlist-arrow {
  font-size: 0.85em;
  transition: transform 0.15s ease;
  transform: rotate(-90deg);

  &.open {
    transform: rotate(0deg);
  }
}

.mp-session-list-item {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75em;
  padding: 0.45em 0.6em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-white-rgb), 0.04);
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    background-color: rgba(var(--bng-off-white-rgb), 0.09);
  }
}

.mp-session-list-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  font-weight: 650;
  font-size: calc-ui-rem(0.85);
}

.mp-session-list-date {
  flex: 0 0 auto;
  color: rgba(var(--bng-off-white-rgb), 0.45);
  font-size: calc-ui-rem(0.75);
}

// align to the right
.mp-sessionlist-refresh-btn {
  margin-left: auto;
}

.mp-or-separator {
  width: 100%;
  max-width: calc-ui-rem(29);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75em;
  margin: 0.1em 0 0.15em;
  color: rgba(var(--bng-off-white-rgb), 0.55);
  font-weight: 650;
  font-size: calc-ui-rem(0.85);
}

.mp-or-separator .text {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85em;
  opacity: 0.9;
}

.mp-or-separator .line {
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(var(--bng-off-white-rgb), 0.25) 50%, transparent 100%);
}

.mp-session-preview {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
  padding: 0.6em 0.75em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-white-rgb), 0.06);
  box-shadow: inset 0 0 0 calc-ui-rem(0.0625) rgba(var(--bng-off-white-rgb), 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.35em;
}

.mp-session-preview-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
}

.mp-session-preview-name {
  min-width: 0;
  flex: 1 1 auto;
  font-weight: 700;
  color: rgba(var(--bng-off-white-rgb), 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-session-preview-players {
  flex: 0 0 auto;
  font-size: calc-ui-rem(0.85);
  font-weight: 650;
  color: rgba(var(--bng-off-white-rgb), 0.75);
}

.mp-session-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  font-size: calc-ui-rem(0.85);
  color: rgba(var(--bng-off-white-rgb), 0.75);
}

.mp-session-preview-meta-item .k {
  color: rgba(var(--bng-off-white-rgb), 0.6);
  margin-right: 0.4em;
  font-weight: 650;
}

.mp-session-preview-meta-item .v {
  color: rgba(var(--bng-off-white-rgb), 0.88);
  font-weight: 650;
}

</style>

