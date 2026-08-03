<template>
  <div
    ref="playerRef"
    v-bng-on-ui-nav:ok.focusRequired="primaryActionHandler"
    v-bng-ui-nav-label:ok="primaryActionLabel"
    v-bng-on-ui-nav:action_3.focusRequired="canEject ? onEjectClick : null"
    v-bng-on-ui-nav:tab_l.focusRequired="canJump ? onJumpBackwardHotkey : null"
    v-bng-on-ui-nav:tab_r.focusRequired="canJump ? onJumpForwardHotkey : null"
    v-bng-on-ui-nav:subtab_l.focusRequired="canDecreaseSpeed ? onSubtabSlower : null"
    v-bng-on-ui-nav:subtab_r.focusRequired="canIncreaseSpeed ? onSubtabFaster : null"
    v-bng-on-ui-nav:rotate_h_cam,rotate_v_cam.focusRequired="onRotateCamera"
    v-bng-on-ui-nav:back.focusRequired="onBackHotkey"
    v-bng-ui-nav-label:action_3="canEject ? stopUnloadHotkeyLabel : ''"
    v-bng-ui-nav-label:tab_l="canJump ? jumpHintLabel : ''"
    v-bng-ui-nav-label:tab_r="canJump ? jumpHintLabel : ''"
    v-bng-ui-nav-label:subtab_l="canDecreaseSpeed ? slowerHintLabel : ''"
    v-bng-ui-nav-label:subtab_r="canIncreaseSpeed ? fasterHintLabel : ''"
    class="replay-player"
    bng-nav-item
    bng-no-child-nav="true"
    tabindex="0"
  >
    <Background class="replay-player__background" />
    <div class="replay-player__copy">
      <h2>{{ hasLoadedReplay ? displayName : $t("ui.replay.noReplayLoaded") }}</h2>
      <p v-if="!hasLoadedReplay">{{ $t(items.length ? "ui.replay.selectReplayHint" : "ui.replay.noReplaysFound") }}</p>
      <p v-if="error" class="replay-player__error">{{ error }}</p>
    </div>

    <div class="replay-player__scrubber-row">
      <div class="replay-player__timeline">
        <BngSlider
          v-model="positionPercent"
          :min="0"
          :max="1"
          :step="0.001"
          :disabled="!canSeek"
          :debounce="-1"
          @change="seekWithResumeIntent"
        />
        <div class="replay-player__time">
          <span class="position" :class="{ disabled: !showElapsed }">{{ positionLabel }}</span>
          <span class="speed" :class="{ disabled: !canSeek }">{{ speedLabel }}<span class="speed-multiplier">×</span></span>
          <span class="duration" :class="{ disabled: !canSeek }">{{ durationLabel }}</span>
        </div>
      </div>
    </div>

    <div class="replay-player__controls primary">
      <BngButton
        v-if="hasLoadedReplay && !isRecording"
        class="replay-player-control"
        :icon="isPlaying ? icons.pause : icons.play"
        :accent="ACCENTS.text"
        :disabled="!canPlayPause"
        @click="togglePlay()"
      >
        {{ $t(isPlaying ? "ui.replay.pause" : "ui.replay.play") }}
        <BngBinding ui-event="ok" track-ignore controller/>
      </BngButton>
      <BngButton
        v-else
        class="replay-player-control"
        :icon="isRecording ? 'square' : 'bigDot'"
        :accent="isRecording ? ACCENTS.attention : ACCENTS.text"
        :disabled="!canRecord && !canStopRecording"
        @click="onRecordClick"
      >
        {{ $t(isRecording ? "ui.replay.stopRecording.button" : "ui.replay.record") }}
        <BngBinding ui-event="ok" track-ignore controller/>
      </BngButton>

      <BngButton
        class="replay-player-control replay-player-control--right"
        :icon-right="isRecording ? icons.undo : icons.eject"
        :accent="ACCENTS.attention"
        :disabled="!canEject"
        @click="onEjectClick"
      >
        {{ $t(isRecording ? "ui.common.cancel" : "ui.replay.stopUnload") }}
        <BngBinding ui-event="action_3" track-ignore controller/>
      </BngButton>
    </div>

    <div class="replay-player__controls secondary">
      <BngButton
        v-if="!isSimplemenu"
        class="replay-player-control speed"
        icon-left="mathMinus"
        :accent="ACCENTS.text"
        :disabled="!canDecreaseSpeed"
        @click="speedDown()"
      >
        {{ $t("ui.replay.slower") }}
        <BngBinding ui-event="subtab_l" track-ignore controller/>
      </BngButton>
      <BngButton
        class="replay-player-control jump"
        icon-left="arrowLargeLeft"
        :accent="ACCENTS.secondary"
        :disabled="!canJump"
        @click="jumpBackward()"
      >
        {{ jumpBackwardLabel }}
        <BngBinding ui-event="tab_l" track-ignore controller/>
      </BngButton>
      <BngButton
        class="replay-player-control replay-player-control--right jump"
        icon-right="arrowLargeRight"
        :accent="ACCENTS.secondary"
        :disabled="!canJump"
        @click="jumpForward()"
      >
        {{ jumpForwardLabel }}
        <BngBinding ui-event="tab_r" track-ignore controller/>
      </BngButton>
      <BngButton
        v-if="!isSimplemenu"
        class="replay-player-control replay-player-control--right speed"
        icon-right="mathPlus"
        :accent="ACCENTS.text"
        :disabled="!canIncreaseSpeed"
        @click="speedUp()"
      >
        {{ $t("ui.replay.faster") }}
        <BngBinding ui-event="subtab_r" track-ignore controller/>
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from "vue"
import { vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import { BngButton, BngSlider, BngBinding, ACCENTS, icons } from "@/common/components/base"
import Background from "@/common/components/utility/background.vue"
import { useReplayPlayer } from "@/modules/replay/composables/useReplayPlayer"
import { useReplayCatalog } from "../composables/useReplayCatalog"

defineOptions({ name: "ReplayPlayer" })

const $simplemenu = inject("$simplemenu", null)
const isSimplemenu = computed(() => !!$simplemenu?.value)

const {
  positionPercent,
  error,
  hasLoadedReplay,
  isRecording,
  isPlayback,
  isPlaying,
  canPlayPause,
  canStopUnload,
  canRecord,
  canStopRecording,
  canSeek,
  canJump,
  canDecreaseSpeed,
  canIncreaseSpeed,
  displayName,
  positionLabel,
  durationLabel,
  speedLabel,
  defaultJumpSeconds,
  togglePlay,
  stopUnload,
  cancelRecording,
  toggleRecord,
  jumpBackward,
  jumpForward,
  speedDown,
  speedUp,
  seekWithResumeIntent,
} = useReplayPlayer()

const items = useReplayCatalog().items
const showElapsed = computed(() => isRecording.value || isPlayback.value)

const playHotkeyLabel = computed(() => $translate.instant(isPlaying.value ? "ui.replay.pause" : "ui.replay.play"))
const playerRef = ref(null)
const canToggleRecord = computed(() => canRecord.value || canStopRecording.value)
const recordHotkeyLabel = computed(() => {
  if (!canToggleRecord.value) return ""
  return $translate.instant(isRecording.value ? "ui.replay.stopRecording" : "ui.replay.record")
})
const primaryActionHandler = computed(() => {
  if (canPlayPause.value) return onPlayHotkey
  if (canToggleRecord.value) return onRecordHotkey
  return null
})
const primaryActionLabel = computed(() => {
  if (canPlayPause.value) return playHotkeyLabel.value
  if (canToggleRecord.value) return recordHotkeyLabel.value
  return ""
})
const stopUnloadHotkeyLabel = computed(() => canStopUnload.value ? $translate.instant("ui.replay.stopUnload") : "")
const jumpBackwardLabel = computed(() => $translate.instant("ui.replay.jumpBackward", { seconds: defaultJumpSeconds }))
const jumpForwardLabel = computed(() => $translate.instant("ui.replay.jumpForward", { seconds: defaultJumpSeconds }))
const jumpHintLabel = computed(() => $translate.instant("ui.replay.jump", { seconds: defaultJumpSeconds }))
const slowerHintLabel = computed(() => $translate.instant("ui.replay.slower"))
const fasterHintLabel = computed(() => $translate.instant("ui.replay.faster"))

const canEject = computed(() => canStopUnload.value || isRecording.value)

function onPlayHotkey() {
  togglePlay()
  return false
}

function onRecordHotkey() {
  if (!canToggleRecord.value) return false
  onRecordClick()
  return false
}

function onJumpBackwardHotkey() {
  jumpBackward()
  return false
}

function onJumpForwardHotkey() {
  jumpForward()
  return false
}

// Triggers (subtab nav) are analog inputs, so threshold values are needed to detect press/release.
const TRIGGER_PRESS = 0.35
const TRIGGER_RELEASE = 0.35
const triggerEngaged = { trigger_l: false, trigger_r: false }

function handleTriggerStep(event, action) {
  const { name, value } = event.detail
  if (value >= TRIGGER_PRESS) {
    if (!triggerEngaged[name]) {
      triggerEngaged[name] = true
      action()
    }
  } else if (value <= TRIGGER_RELEASE) {
    triggerEngaged[name] = false
  }
  return false
}

function onSubtabSlower(event) {
  return handleTriggerStep(event, speedDown)
}

function onSubtabFaster(event) {
  return handleTriggerStep(event, speedUp)
}

function onRotateCamera(event) {
  const { name, value, extras } = event.detail
  const filterType = Array.isArray(extras) ? extras[0] ?? 0 : 0
  if (name === "rotate_v_cam") lua.core_camera.rotate_pitch(value, filterType)
  else lua.core_camera.rotate_yaw(value, filterType)
  return false
}

function onBackHotkey() {
  lua.extensions.ui_router.back()
  return false
}

async function onRecordClick() {
  const wasRecording = isRecording.value
  const result = await toggleRecord({ autoplayAfterStopping: true })
  if (!result || wasRecording) return
  await lua.extensions.ui_router.navigate("play")
}

async function onEjectClick() {
  if (isRecording.value) {
    cancelRecording()
  } else {
    stopUnload()
  }
}

defineExpose({
  focus: () => playerRef.value?.focus(),
})
</script>

<style scoped lang="scss">
.replay-player {
  --bng-card-bg-shadow: none;

  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 1rem;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  outline: none;
  isolation: isolate;
  container: replay-player / inline-size;

  &:focus > .replay-player__background {
    --bng-bg-enabled: var(--bng-cool-gray-800);
    --bng-bg-hover: var(--bng-cool-gray-800);
    --bng-bg-border-enabled: var(--bng-cool-gray-500);
    --bng-bg-border-hover: var(--bng-orange-500);
    --bng-bg-border-width: 0.125em;
    --bng-bg-enabled-opacity: 0.82;
    --bng-bg-hover-opacity: 0.9;
    --bng-card-bg-shadow: inset 0 0 1.5em rgba(var(--bng-ter-blue-gray-400-rgb), 0.35);
  }
}

.replay-player__background {
  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-900);
  --bng-bg-border-enabled: var(--bng-cool-gray-750);
  --bng-bg-border-hover: var(--bng-cool-gray-600);
  --bng-bg-border-active: var(--bng-cool-gray-900);
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-enabled-opacity: 0.6;
  --bng-bg-hover-opacity: 1;
  --bng-bg-active-opacity: 1;

  border-radius: var(--bng-corners-2);
  box-shadow: var(--bng-card-bg-shadow);
}

.replay-player__copy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  margin-bottom: 0.5rem;

  h2,
  p {
    padding: 0;
    margin: 0;
  }

  h2 {
    display: -webkit-box;
    overflow: hidden;
    font-size: 2rem;
    font-weight: 700;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    word-wrap: break-word;
  }

  p {
    color: rgba(var(--bng-off-white-rgb), 0.82);
    overflow-wrap: anywhere;
  }
}

.replay-player__error {
  color: var(--bng-orange-200);
}

.replay-player__timeline {
  position: relative;
  border-radius: var(--bng-corners-1);
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--replay-panel-bg);
    opacity: var(--replay-panel-bg-opacity);
    pointer-events: none;
  }
}

.replay-player__scrubber-row {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.replay-player__timeline {
  --replay-panel-bg: var(--bng-cool-gray-900);
  --replay-panel-bg-opacity: 0.35;

  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
}

.replay-player__time {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  color: rgba(var(--bng-off-white-rgb), 0.75);
  font-family: var(--fnt-mono);

  .speed {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 0.85rem;

    &.disabled {
      opacity: 0.5;
    }
  }

  .duration {
    text-align: right;
  }

  .position,
  .duration {
    &.disabled {
      opacity: 0;
    }
  }
}

.replay-player__controls {
  display: flex;
  flex-wrap: wrap;
}

.replay-player-control {
  flex: 1 1 0;
  min-width: 0;
  justify-content: flex-start;

  :deep(.bng-background) {
    border-radius: var(--bng-corners-1);
  }

  :deep(.binding-wrapper) {
    margin-inline-start: auto;
  }
}

.replay-player-control--right {
  justify-content: flex-end;
  text-align: right;

  :deep(.binding-wrapper) {
    order: -1;
    margin-inline-start: 0;
    margin-inline-end: auto;
  }
}

@container replay-player (max-width: 34rem) {
  .replay-player__controls.secondary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    .jump {
      order: 1;
      min-width: 0;
    }

    .speed {
      order: 2;
      min-width: 0;
    }
  }
}
</style>
