<template>
  <div
    class="mp-session-settings-panel"
    :class="{
      'mp-session-settings-panel--configure': variant === 'freeroamConfigure',
      'mp-session-settings-panel--active': variant === 'activeSession',
    }"
    @mousedown="onPanelMousedown"
  >
    <div class="mp-session-settings-main">
      <div class="mp-session-settings-heading">
        <BngCardHeading type="ribbon" class="panel-title">
          {{
            variant === "activeSession"
              ? $t("ui.multiplayer.currentSessionTitle")
              : $t("ui.multiplayer.sessionSettingsTitle")
          }}
        </BngCardHeading>
      </div>

      <template v-if="variant === 'activeSession' && showSessionMeta">
        <MultiplayerSessionIdentifiers
          v-if="sessionInvite?.id"
          :session-id="String(sessionInvite.id)"
          :join-code="sessionInvite.joinCode"
          :show-join-row="!sessionInvite.isLocalSession"
          :mask-join-code="true"
        />
        <div v-if="sessionInvite?.id && showActions" class="session-actions">
          <BngButton accent="attention" @click="emit('leave-session')">
            {{ $t("ui.multiplayer.leaveSession") }}
          </BngButton>
          <BngButton v-if="canInvite" accent="outlined" @click="emit('invite')">
            {{ $t("ui.multiplayer.invitePlayers") }}
          </BngButton>
        </div>
      </template>

      <div v-if="hasSessionOptions" class="session-options">
        <h3 class="section-title">{{ $t("ui.multiplayer.sessionOptionsHeading") }}</h3>

        <template v-if="variant === 'freeroamConfigure'">
          <BngRow
            v-if="isLocalSessionOption"
            class="switch-row"
            :disabled="disabled"
          >
            <template #label>{{ $t("ui.multiplayer.session.localSession") }}</template>
            <BngSwitch
              :model-value="isLocalSessionOption.value"
              :disabled="disabled"
              @update:model-value="v => applyFreeroamOptionChange(isLocalSessionOption, v)"
            />
          </BngRow>
          <BngRow
            v-if="maxPlayersOption"
            class="option-row option-row--max-players"
            :disabled="disabled"
          >
            <template #label>{{ $t("ui.multiplayer.maxPlayers") }}</template>
            <BngInput
              v-model="maxPlayersOption.value"
              type="number"
              :num-min="maxPlayersOption.min"
              :num-max="maxPlayersOption.max"
              :num-step="maxPlayersOption.step"
              :disabled="disabled"
              @valueChanged="v => applyFreeroamOptionChange(maxPlayersOption, v)"
            />
          </BngRow>
          <div class="switch-rows">
            <BngRow
              v-for="opt in freeroamSwitchOptions"
              :key="opt.key"
              class="switch-row"
              :disabled="disabled"
            >
              <template #label>{{ opt.label }}</template>
              <BngSwitch
                :model-value="!!opt.value"
                :disabled="disabled"
                @update:model-value="v => applyFreeroamOptionChange(opt, v)"
              />
            </BngRow>
          </div>
        </template>

        <div v-else-if="variant === 'activeSession'" class="switch-rows">
          <BngRow class="switch-row" :disabled="!canEditSessionExtras">
            <template #label>{{ $t("ui.multiplayer.session.ghostOnTeleport") }}</template>
            <BngSwitch
              :model-value="localExtra.ghostOnTp"
              :disabled="!canEditSessionExtras"
              @update:model-value="v => onActiveField('ghostOnTp', v)"
            />
          </BngRow>
          <BngRow class="switch-row" :disabled="!canEditSessionExtras">
            <template #label>{{ $t("ui.multiplayer.session.ghostOnSpawnReset") }}</template>
            <BngSwitch
              :model-value="localExtra.ghostOnReset"
              :disabled="!canEditSessionExtras"
              @update:model-value="v => onActiveField('ghostOnReset', v)"
            />
          </BngRow>
          <BngRow class="switch-row" :disabled="!canEditSessionExtras">
            <template #label>{{ $t("ui.multiplayer.session.vehicleCollisions") }}</template>
            <BngSwitch
              :model-value="localExtra.vehicleCollisions"
              :disabled="!canEditSessionExtras"
              @update:model-value="v => onActiveField('vehicleCollisions', v)"
            />
          </BngRow>
          <BngRow class="switch-row" :disabled="!canEditSessionExtras">
            <template #label>{{ $t("ui.multiplayer.session.allowPausing") }}</template>
            <BngSwitch
              :model-value="localExtra.allowPausing"
              :disabled="!canEditSessionExtras"
              @update:model-value="v => onActiveField('allowPausing', v)"
            />
          </BngRow>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue"
import { BngRow, BngButton, BngCardHeading, BngInput, BngSwitch } from "@/common/components/base"
import { useBridge } from "@/bridge"
import MultiplayerSessionIdentifiers from "@/modules/multiplayer/components/MultiplayerSessionIdentifiers.vue"

defineOptions({ name: "MultiplayerSessionSettingsPanel" })

const SWITCH_KEYS = [
  "mp_extra_ghostOnTp",
  "mp_extra_ghostOnReset",
  "mp_extra_vehicleCollisions",
  "mp_extra_allowPausing",
]

const props = defineProps({
  /** `freeroamConfigure`: wizard / new-session flow bound to freeroam option group. `activeSession`: in-game session with Lua sync. */
  variant: {
    type: String,
    required: true,
    validator: v => v === "freeroamConfigure" || v === "activeSession",
  },
  /** Freeroam multiplayer option group (`enable_step === 'multiplayer'`) with processed `options` from useFreeroamConfigurator. */
  multiplayerGroup: {
    type: Object,
    default: null,
  },
  /** When true, freeroam controls are non-interactive (multiplayer master switch off). */
  disabled: {
    type: Boolean,
    default: false,
  },
  sessionInvite: {
    type: Object,
    default: null,
  },
  sessionExtra: {
    type: Object,
    default: null,
  },
  canEditSessionExtras: {
    type: Boolean,
    default: false,
  },
  canInvite: {
    type: Boolean,
    default: false,
  },
  showSessionMeta: {
    type: Boolean,
    default: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showPlayerList: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["leave-session", "invite", "update:session-extra"])

const { lua, events } = useBridge()

async function applyFreeroamOptionChange(opt, val) {
  if (!opt?.key || props.variant !== "freeroamConfigure") return
  let next = val
  if (opt.key === "mp_mpMaxPlayers" || opt.type === "number") {
    next = Number(val)
    if (Number.isNaN(next)) return
  } else {
    next = !!val
  }
  opt.value = next
  try {
    await lua.freeroam_freeroamConfigurator.updateOption(opt.key, next)
    events.emit("freeroamConfiguratorRefreshButton")
  } catch (_) {
    /* invalid value or Lua error */
  }
}

function onPanelMousedown(e) {
  if (props.variant === "freeroamConfigure") e.stopPropagation()
}

const localExtra = reactive({
  ghostOnTp: false,
  ghostOnReset: true,
  vehicleCollisions: true,
  allowPausing: false,
})

watch(
  () => props.sessionExtra,
  se => {
    if (!se || props.variant !== "activeSession") return
    localExtra.ghostOnTp = se.ghostOnTp
    localExtra.ghostOnReset = se.ghostOnReset
    localExtra.vehicleCollisions = se.vehicleCollisions
    localExtra.allowPausing = se.allowPausing
  },
  { immediate: true },
)

function findFreeroamOption(key) {
  return props.multiplayerGroup?.options?.find(o => o && o.key === key) || null
}

function isFreeroamSwitchShape(opt) {
  return opt && (opt.type === "switch" || opt.type == null || opt.type === "")
}

const isLocalSessionOption = computed(() => {
  if (props.variant !== "freeroamConfigure") return null
  const opt = findFreeroamOption("mp_isLocalSession")
  if (!opt) return null
  return opt
})

const maxPlayersOption = computed(() => {
  if (props.variant !== "freeroamConfigure") return null
  const opt = findFreeroamOption("mp_mpMaxPlayers")
  if (!opt) return null
  return opt
})

function onActiveField(field, value) {
  localExtra[field] = value
  emit("update:session-extra", { ...localExtra })
  if (!props.canEditSessionExtras || !props.sessionInvite?.id) return
  lua.multiplayer_uiBackend_multiplayerUIManager.applyPauseSessionExtraOptions({ [field]: value })
}

const freeroamSwitchOptions = computed(() => {
  if (props.variant !== "freeroamConfigure") return []
  return SWITCH_KEYS.map(key => findFreeroamOption(key)).filter(opt => opt && isFreeroamSwitchShape(opt))
})

const hasSessionOptions = computed(() => {
  if (props.variant === "freeroamConfigure") {
    return !!isLocalSessionOption.value || !!maxPlayersOption.value || freeroamSwitchOptions.value.length > 0
  }
  return props.sessionExtra != null
})
</script>

<style scoped lang="scss">
.mp-session-settings-panel {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
  gap: 1rem;

  &--active {
    gap: 1.25rem;
  }
}

.mp-session-settings-main {
  flex: 1 1 18rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mp-session-settings-heading {
  .panel-title {
    font-weight: 800;
    font-style: italic;
  }
}

.session-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.session-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  padding: 0;
  font-size: 1.05em;
  font-weight: 600;
  font-style: italic;
  color: var(--bng-orange-100);
}

.option-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  &--local-session {
    .option-label {
      flex: 0 0 auto;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--bng-off-white);
    }
  }

  &--max-players {
    .option-label {
      flex: 0 0 auto;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--bng-off-white);
    }
  }
}

.switch-rows {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.switch-row {
  padding: 0.2rem 0.35rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.35);

  &--disabled {
    opacity: 0.65;
  }
}

.mp-session-settings-players {
  flex: 0 1 22rem;
  min-width: 16rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.players-heading {
  font-weight: 700;
  font-style: italic;
}

.players-list-wrap {
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.5);
  padding: 0.35rem 0;
  min-height: 4rem;
}
</style>
