<template>
  <div class="ready-up-screen">
    <div v-if="info" class="ready-up-card">
      <div v-if="info.thumbnail" class="card-thumbnail" :style="{ backgroundImage: `url(${info.thumbnail})` }">
        <span class="status-pill" :class="`status-${status}`">
          <span class="status-label">{{ $t("ui.multiplayer.status") }} :</span>
          <span class="status-value">{{ $t(statusLabelKey) }}</span>
        </span>
        <span :class="['ready-count', { 'all-ready': readyPlayerCount === totalPlayerCount }]">{{ readyPlayerCount }} / {{ totalPlayerCount }} {{ $t("ui.multiplayer.playersReady") }}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">{{ $ctx_t({ txt: "ui.multiplayer.inPreparation", context: { gamemode: info.displayName || info.name } }) }}</h2>

        <div v-if="reqs.length > 0" class="requirements-section">
          <h2 class="requirements-title">{{ $t("ui.multiplayer.requirementsLabel") }} :</h2>
          <div class="requirements-list">
            <div
              v-for="req in reqs"
              :key="req.key"
              class="requirement-row"
              :class="{ met: req.met, unmet: !req.met }"
            >
              <BngIcon class="requirement-icon" :type="req.met ? 'checkmark' : 'xmark'" />
              <span class="requirement-label">{{ req.label }}</span>
            </div>
          </div>
        </div>

        <div class="actions">
          <BngButton
            :accent="status === 'ready' ? ACCENTS.attention : ACCENTS.main"
            :class="{ selected: status === 'ready' }"
            :disabled="hasUnmetRequirements && status !== 'ready'"
            @click="toggleReadyUp"
          >
            <BngIcon v-if="status === 'ready'" class="cancel-icon" type="undo" />
            {{ status === 'ready' ? $t("ui.multiplayer.cancelReadyUp") : $t("ui.multiplayer.readyUp") }}
          </BngButton>
          <BngButton
            :accent="status === 'spectator' ? ACCENTS.attention : ACCENTS.main"
            :class="{ selected: status === 'spectator' }"
            @click="toggleSpectate"
          >
            <BngIcon v-if="status === 'spectator'" class="cancel-icon" type="undo" />
            {{ status === 'spectator' ? $t("ui.multiplayer.cancelSpectate") : $t("ui.multiplayer.spectate") }}
          </BngButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngButton, BngIcon, ACCENTS } from "@/common/components/base"
import { useBridge } from "@/bridge"
import { gamemodeInfo as info, requirements as reqs, localStatus as status, readyPlayerCount, totalPlayerCount } from "@/services/readyUpScreenService.js"

const { lua } = useBridge()

const hasUnmetRequirements = computed(() => reqs.value.some(r => !r.met))

const statusLabelKey = computed(() => {
  if (status.value === "ready") return "ui.multiplayer.ready"
  if (status.value === "spectator") return "ui.multiplayer.readyRoleSpectator"
  return "ui.multiplayer.notReady"
})

function toggleReadyUp() {
  const role = status.value === "ready" ? "notReady" : "active"
  lua.multiplayer_uiBackend_multiplayerUIManager.respondToReadyUp(role)
}

function toggleSpectate() {
  const role = status.value === "spectator" ? "notReady" : "spectator"
  lua.multiplayer_uiBackend_multiplayerUIManager.respondToReadyUp(role)
}
</script>

<style scoped lang="scss">
.ready-up-screen {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 2rem;
  max-width: 28rem;
}

.ready-up-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  color: var(--bng-off-white);
}

.card-thumbnail {
  position: relative;
  width: 100%;
  height: 10rem;
  background-size: cover;
  background-position: center;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 40%, transparent 100%);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
}

.card-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.card-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--bng-cool-gray-200);
  line-height: 1.4;
}

.requirements-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.requirements-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.requirement-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.requirement-icon {
  --bng-icon-size: 1.2em;
}

.requirement-row.met .requirement-icon {
  --bng-icon-color: var(--bng-add-green-400);
}

.requirement-row.unmet .requirement-icon {
  --bng-icon-color: var(--bng-add-red-400);
}

.requirement-row.unmet .requirement-label {
  color: var(--bng-add-red-300);
}

.status-pill {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.75);
  padding: 0.2rem 0.5rem;
  border-radius: var(--bng-corners-1);
}

.status-label {
  font-weight: 600;
}

.status-value {
  font-weight: 700;
}

.status-pill.status-ready .status-value {
  color: var(--bng-add-green-400);
}

.status-pill.status-spectator .status-value {
  color: var(--bng-ter-yellow-50);
}

.status-pill.status-notReady .status-value {
  color: var(--bng-add-red-500);
}

.ready-count {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--bng-off-white);
  background: rgba(0, 0, 0, 0.75);
  padding: 0.2rem 0.5rem;
  border-radius: var(--bng-corners-1);

  &.all-ready {
    color: var(--bng-add-green-400);
  }
}

.cancel-icon {
  --bng-icon-size: 1em;
  margin-right: 0.5rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
