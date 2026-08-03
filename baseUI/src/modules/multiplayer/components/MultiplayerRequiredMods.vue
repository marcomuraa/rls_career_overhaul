<template>
  <div>
    <div class="title">Required Mods</div>
    <div class="explain">
      Review the mods required to join this session.
    </div>

    <div v-if="sessionInfo" class="session-preview">
      <div class="session-preview-top">
        <div class="session-preview-name">{{ sessionInfo.name }}</div>
        <div class="session-preview-players">{{ sessionInfo.player_count }}/{{ sessionInfo.max_players }}</div>
      </div>
      <div class="session-preview-meta">
        <div class="session-preview-meta-item">
          <span class="k">Level</span>
          <span class="v">{{ sessionInfo.level }}</span>
        </div>
      </div>
    </div>

    <div class="mods-box">
      <div v-if="loading" class="mods-state">Loading required mods…</div>
      <div v-else-if="error" class="mods-state mods-state--error">{{ error }}</div>
      <div v-else-if="!mods.length" class="mods-state">No mods required.</div>
      <div v-else class="mods-list">
        <div
          v-for="m in mods"
          :key="m.name"
          class="mods-item"
          :bng-nav-item="m.id ? true : null"
          :class="{ 'mods-item--clickable': !!m.id }"
          :role="m.id ? 'button' : null"
          :tabindex="m.id ? 0 : -1"
          @click="openRepositoryMod(m)"
          @keydown.enter.prevent="openRepositoryMod(m)"
          @keydown.space.prevent="openRepositoryMod(m)"
        >
          <div class="mods-name">{{ m.name }}</div>
          <div class="mods-meta">
            <span v-if="m.id" class="mods-meta-item">ID: {{ m.id }}</span>
            <span v-else class="mods-meta-item mods-meta-item--note">Mod not on mod repository - ask the host for this mod</span>
            <span v-if="m.reason === 'wrongVersion'" class="mods-meta-item mods-meta-item--note">Wrong version installed - most likely the host is using a old version of the mod</span>
            <span v-else-if="m.reason === 'wrongModID'" class="mods-meta-item mods-meta-item--note">Wrong mod installed - disable/uninstall your local copy, then download the required mod from the mod repository.</span>
          </div>
          <div class="mods-status" :class="{ missing: m.reason === 'missing', inactive: m.reason === 'inactive', wrongVersion: m.reason === 'wrongVersion', wrongModID: m.reason === 'wrongModID' }">
            <span v-if="m.reason === 'missing'">Missing</span>
            <span v-else-if="m.reason === 'inactive'">Installed (inactive)</span>
            <span v-else-if="m.reason === 'wrongVersion'">Installed (wrong version)</span>
            <span v-else-if="m.reason === 'wrongModID'">Installed (wrong mod ID)</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="downloadableCount" class="control">
      <BngButton
        accent="main"
        :bng-scoped-nav-autofocus="downloadableCount ? true : null"
        :disabled="loading || downloading || joining"
        @click="$emit('download')"
      >Download missing mods and join ({{ downloadableCount }})</BngButton>
    </div>

    <div class="control-row">
      <BngButton
        accent="outlined"
        :bng-scoped-nav-autofocus="downloadableCount ? null : true"
        :disabled="joining"
        @click="$emit('back')"
      >Back</BngButton>
      <!-- <BngButton accent="main" :disabled="!canJoin" @click="$emit('join')">
        <span class="join-label">
          <BngIcon class="join-icon" :type="icons.peopleOutline" />
          {{ $tt("ui.multiplayer.sessions.joinSession") }}
        </span>
      </BngButton> -->
    </div>

    <div v-if="joining" class="control">
      <BngButton
        accent="attentionoutlined"
        @click="$emit('cancel')"
      >{{ $tt("ui.multiplayer.sessions.cancelJoining") }}</BngButton>
    </div>
  </div>
</template>

<script setup>
import { BngButton, BngIcon, icons } from "@/common/components/base"
import { computed } from "vue"

const props = defineProps({
  sessionInfo: Object,
  mods: { type: Array, default: () => [] },
  loading: Boolean,
  error: String,
  canJoin: Boolean,
  joining: Boolean,
  downloading: Boolean,
})

defineEmits(["back", "join", "cancel", "download"])

const downloadableCount = computed(() =>
  (props.mods || []).filter(m => m?.id && (m?.reason === "missing")).length
)

function openRepositoryMod(mod) {
  const id = mod?.id
  if (!id) return

  const idStr = String(id)
  const url = /^\d+$/.test(idStr)
    ? `http-external://www.beamng.com/resources/.${idStr}/?ingame=2`
    : `http-external://www.beamng.com/resources/?ingame=2&q=${encodeURIComponent(idStr)}`

  window.location.href = url
}
</script>

<style scoped lang="scss">
.title {
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
  box-sizing: border-box;
}

.explain {
  width: 100%;
  max-width: calc-ui-rem(29);
  text-align: center;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  font-size: calc-ui-rem(0.85);
  line-height: 1.25;
  margin-top: -0.15em;
  margin-bottom: 0.6em;
  box-sizing: border-box;
}

.session-preview {
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
  box-sizing: border-box;
}

.session-preview-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
}

.session-preview-name {
  min-width: 0;
  flex: 1 1 auto;
  font-weight: 700;
  color: rgba(var(--bng-off-white-rgb), 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-preview-players {
  flex: 0 0 auto;
  font-size: calc-ui-rem(0.85);
  font-weight: 650;
  color: rgba(var(--bng-off-white-rgb), 0.75);
}

.session-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  font-size: calc-ui-rem(0.85);
  color: rgba(var(--bng-off-white-rgb), 0.75);
}

.session-preview-meta-item .k {
  color: rgba(var(--bng-off-white-rgb), 0.6);
  margin-right: 0.4em;
  font-weight: 650;
}

.session-preview-meta-item .v {
  color: rgba(var(--bng-off-white-rgb), 0.88);
  font-weight: 650;
}

.mods-box {
  width: 100%;
  max-width: calc-ui-rem(29);
  padding: 0.6em 0.75em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-white-rgb), 0.04);
  box-shadow: inset 0 0 0 calc-ui-rem(0.0625) rgba(var(--bng-off-white-rgb), 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.45em;
  min-height: calc-ui-rem(10);
  box-sizing: border-box;
}

.mods-box + .control {
  margin-top: 0.6em;
  padding-top: 0.6em;
  border-top: 1px solid rgba(var(--bng-off-white-rgb), 0.12);
}

.mods-state {
  color: rgba(var(--bng-off-white-rgb), 0.75);
  font-size: calc-ui-rem(0.85);
  text-align: center;
  padding: 0.35em 0;
}

.mods-state--error {
  color: rgba(var(--bng-add-red-200-rgb), 0.95);
}

.mods-list {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
}

.mods-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.1em 0.6em;
  padding: 0.35em 0.4em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-off-white-rgb), 0.03);
  outline: none;
}

.mods-item--clickable {
  cursor: pointer;
}

.mods-item--clickable:hover {
  background-color: rgba(var(--bng-off-white-rgb), 0.06);
}

.mods-item--clickable:focus {
  box-shadow: 0 0 0 calc-ui-rem(0.0625) rgba(var(--bng-orange-300-rgb), 0.7);
}

.mods-name {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  font-weight: 650;
  font-size: calc-ui-rem(0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.mods-meta {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  color: rgba(var(--bng-off-white-rgb), 0.55);
  font-size: calc-ui-rem(0.75);
  min-width: 0;
}

.mods-meta-item--note {
  flex: 0 0 100%;
  color: var(--bng-orange-200);
}

.mods-status {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  align-self: center;
  justify-self: end;
  font-size: calc-ui-rem(0.75);
  font-weight: 650;
  color: var(--bng-add-green-200);
}

.mods-status.inactive {
  color: var(--bng-orange-300);
}

.mods-status.missing {
  color: var(--bng-add-red-500);
}

.mods-status.wrongVersion {
  color: var(--bng-orange-300);
}

.mods-status.wrongModID {
  color: var(--bng-orange-300);
}

.control-row {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
  display: flex;
  gap: 0.5em;
}

.control + .control-row {
  margin-top: 0.6em;
}

.control-row :deep(.bng-button) {
  flex: 1 1 0;
  justify-content: center;
  margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: 999em;
  --bng-content-justify: center;
  --bng-content-align: center;
}

.join-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  width: 100%;
}

.join-icon {
  font-size: 1.25em;
}

.control {
  align-self: center;
  width: 100%;
  max-width: calc-ui-rem(29);
  display: flex;
  justify-content: center;
}

.control :deep(.bng-button) {
  width: 100%;
  justify-content: center;
  margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: 999em;
  --bng-content-justify: center;
  --bng-content-align: center;
  --bng-button-padding-top: 0.55em;
  --bng-button-padding-bottom: 0.6em;
}
</style>
