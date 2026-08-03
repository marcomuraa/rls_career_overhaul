<template>
  <div
    class="taxi-action-bar"
    v-bng-scoped-nav="{ scopeId: 'taxi-action-bar', activateOnMount: true, bubbleWhitelistEvents: ['menu'] }"
    v-bng-on-ui-nav:tab_l.up="focusPrev"
    v-bng-on-ui-nav:tab_r.up="focusNext"
  >
    <BngBinding class="taxi-nav-hint" ui-event="tab_l" controller />

    <div class="taxi-action-slot">
      <div class="taxi-action-badge" />
      <BngButton
        class="taxi-action-btn"
        :accent="ACCENTS.ghost"
        :disabled="!canSlowDown"
        @click="$emit('slow-down')"
      >
        <BngIcon :type="icons.fastForward" class="taxi-icon-flip" />
        <span>{{ $t("ui.taxi.actions.slowDown") }}</span>
      </BngButton>
    </div>

    <div class="taxi-action-slot">
      <div class="taxi-action-badge">
        <span v-if="hurryUpLevel > 0" class="taxi-hurry-badge">x{{ hurryUpLevel }}</span>
      </div>
      <BngButton
        class="taxi-action-btn"
        :accent="ACCENTS.ghost"
        :disabled="!canHurryUp"
        @click="$emit('hurry-up')"
      >
        <BngIcon :type="icons.fastForward" />
        <span>{{ $t("ui.taxi.actions.hurryUp") }}</span>
      </BngButton>
    </div>

    <div class="taxi-action-slot">
      <div class="taxi-action-badge" />
      <BngButton
        class="taxi-action-btn"
        :accent="ACCENTS.ghost"
        :disabled="!canSkip"
        @click="$emit('skip')"
      >
        <BngIcon :type="icons.routeSimpleFlag" />
        <span>{{ $t("ui.taxi.actions.skip") }}</span>
      </BngButton>
    </div>

    <div class="taxi-action-slot">
      <div class="taxi-action-badge" />
      <BngButton
        class="taxi-action-btn"
        :accent="ACCENTS.ghost"
        :disabled="!canChangeDestination"
        @click="$emit('change-destination')"
      >
        <BngIcon :type="icons.flag" />
        <span>{{ hasDestination ? $t("ui.taxi.actions.changeDestination") : $t("ui.taxi.actions.pickDestination") }}</span>
      </BngButton>
    </div>

    <div class="taxi-action-slot">
      <div class="taxi-action-badge" />
      <BngButton
        class="taxi-action-btn"
        :accent="ACCENTS.ghost"
        :disabled="!canStop"
        @click="$emit('stop')"
      >
        <BngIcon :type="icons.square" />
        <span>{{ $t("ui.taxi.actions.stopHere") }}</span>
      </BngButton>
    </div>

    <div class="taxi-action-slot taxi-idle-slot">
      <div class="taxi-action-badge" />
      <BngSwitch v-model="localIdleCamera" always-transparent class="taxi-focusable" @change="$emit('toggle-idle-camera', $event)">
        <span>{{ $t("ui.taxi.idleCamera") }}</span>
      </BngSwitch>
    </div>

    <BngBinding class="taxi-nav-hint" ui-event="tab_r" controller />
  </div>
</template>

<script setup>
import { watch, nextTick, computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { BngButton, BngIcon, BngBinding, BngSwitch, ACCENTS, icons } from "@/common/components/base"
import useControls from "@/services/controls"

const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)

const focusables = () => document.querySelectorAll(".taxi-action-bar .taxi-action-btn:not([disabled]), .taxi-action-bar .taxi-focusable:not([disabled])")

function focusNext() {
  const els = [...focusables()]
  if (!els.length) return
  const idx = els.indexOf(document.activeElement)
  els[(idx + 1) % els.length]?.focus()
}

function focusPrev() {
  const els = [...focusables()]
  if (!els.length) return
  const idx = els.indexOf(document.activeElement)
  els[(idx - 1 + els.length) % els.length]?.focus()
}

const props = defineProps({
  canHurryUp: {
    type: Boolean,
    default: false,
  },
  canSlowDown: {
    type: Boolean,
    default: false,
  },
  hurryUpLevel: {
    type: Number,
    default: 0,
  },
  canSkip: {
    type: Boolean,
    default: false,
  },
  canChangeDestination: {
    type: Boolean,
    default: false,
  },
  hasDestination: {
    type: Boolean,
    default: false,
  },
  canStop: {
    type: Boolean,
    default: false,
  },
  idleCameraEnabled: {
    type: Boolean,
    default: true,
  },
})

defineEmits(["hurry-up", "slow-down", "skip", "change-destination", "stop", "toggle-idle-camera"])

const localIdleCamera = ref(props.idleCameraEnabled)
watch(() => props.idleCameraEnabled, v => { localIdleCamera.value = v })

// buttons start disabled until taxi state arrives, so focus the first enabled
// one whenever a controller is in use and focus isn't already on a button
const anyButtonEnabled = computed(
  () => props.canSlowDown || props.canHurryUp || props.canSkip || props.canChangeDestination || props.canStop
)

watch(
  [isControllerUsed, anyButtonEnabled],
  ([controller, enabled]) => {
    if (!controller || !enabled) return
    nextTick(() => {
      const els = [...focusables()]
      if (els.length && !els.includes(document.activeElement)) els[0].focus()
    })
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.taxi-action-bar {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.75rem;
  pointer-events: auto;

  .taxi-nav-hint {
    align-self: center;
  }

  .taxi-action-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .taxi-action-badge {
    min-height: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .taxi-hurry-badge {
    background: var(--bng-orange-b400);
    color: var(--bng-cool-gray-900);
    font-family: var(--fnt-defs);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.05rem 0.35rem;
    border-radius: var(--bng-corners-1);
    line-height: 1.2;
  }

  .taxi-action-btn {
    --bng-button-margin: 0;
    --bng-button-padding: 0.4rem 0.8rem;
    --bng-icon-size: 1.1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.75);
    border-radius: var(--bng-corners-2);
  }

  .taxi-icon-flip {
    transform: scaleX(-1);
  }

  .taxi-idle-slot .taxi-focusable {
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.75);
    border-radius: var(--bng-corners-2);
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>
