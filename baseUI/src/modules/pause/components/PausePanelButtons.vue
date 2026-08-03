<template>
  <div class="pause-panel-buttons" :class="{ 'pause-panel-buttons--compact': compact }">
    <Button
      v-for="(button, index) in visibleButtons"
      :key="button.buttonId || button.id || index"
      v-bng-route-target.id="button.routeTarget"
      class="pause-panel-button"
      :class="flavorClass(button)"
      :style="buttonLayoutStyle(button)"
      :bng-scoped-nav-autofocus="index === 0 ? 'true' : null"
      :disabled="button.enabled === false"
      :title="button.enabled === false ? button.disabledReason : undefined"
      @focusin="onButtonFocus(button)"
      @focusout="onButtonBlur(button)"
      @click="onButtonClick(button)"
    >
      <template #prefix>
        <BngIcon v-if="button.icon" :type="button.icon" />
      </template>
      <div class="pause-panel-button-content">
        <span class="label">{{ $tt(button.label || button.id || "ui.common.action") }}</span>
      </div>
      <span v-if="button.showIndicator" class="pause-panel-button-indicator"></span>
    </Button>
  </div>
</template>

<script setup>
import { computed, inject, ref, unref } from "vue"
import { BngIcon } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngRouteTarget } from "@/common/directives"
import { lua } from "@/bridge"
import { openConfirmation } from "@/services/popup"

defineOptions({ name: "PausePanelButtons" })

const props = defineProps({
  buttons: {
    type: Array,
    default: () => [],
  },
  compact: Boolean,
})
const emit = defineEmits(["focus-side-panel", "clear-focus-side-panel"])

const $simplemenu = inject("$simplemenu", ref(false))

const buttons = computed(() => Array.isArray(props.buttons) ? props.buttons : [])
const visibleButtons = computed(() =>
  buttons.value.filter(button => {
    if (button?.visible === false) return false
    if (unref($simplemenu) && button?.hideInSimpleMenu) return false
    return true
  }),
)

function getSpan(value, maxValue = null) {
  const span = Math.trunc(Number(value))
  if (!Number.isFinite(span) || span < 1) return 1
  return maxValue == null ? span : Math.min(span, maxValue)
}

function buttonLayoutStyle(button) {
  if (props.compact) return {}
  return {
    "--pause-panel-button-column-span": getSpan(button?.columnSpan, 2),
    "--pause-panel-button-row-span": getSpan(button?.rowSpan),
  }
}

function flavorClass(button) {
  if (button?.flavor === "danger" || button?.flavor === "system") {
    return `pause-panel-button--${button.flavor}`
  }
  return "pause-panel-button--base"
}

function onButtonFocus(button) {
  if (!button?.focusSidePanelId) return
  emit("focus-side-panel", button.focusSidePanelId)
}

function onButtonBlur(button) {
  if (!button?.focusSidePanelId) return
  emit("clear-focus-side-panel", button.focusSidePanelId)
}

async function onButtonClick(button) {
  if (!button || button.enabled === false || !button.buttonId) return
  if (button.confirmText) {
    const confirmed = await openConfirmation(button.label || "", button.confirmText)
    if (!confirmed) return
  }
  await lua.extensions.ui_pause_actions.executeAction(button.buttonId, { id: button.id })
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
.pause-panel-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5em;
  padding: 0.5em;
  font-size: var(--ui-rem, 1rem);
  align-content: start;
  grid-auto-rows: auto;

  &.pause-panel-buttons--compact {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    --pause-rail-button-gap: 0.5em;
    --pause-rail-button-label-opacity: 1;

    .pause-panel-button {
      --bng-icon-size: 1.75em;
      --bng-button-padding: 0.5em;
      --bng-button-padding-top: 0.5em;
      --bng-button-padding-bottom: 0.5em;
      --bng-bg-enabled: var(--bng-cool-gray-750);
      --bng-bg-hover: var(--bng-cool-gray-700);
      --bng-bg-active: var(--bng-cool-gray-700);
      --bng-bg-disabled: var(--bng-cool-gray-700);
      --bng-bg-focus: var(--bng-cool-gray-700);
      --bng-bg-enabled-opacity: 0.60;
      --bng-bg-hover-opacity: 0.75;
      --bng-bg-active-opacity: 0.9;
      --bng-bg-disabled-opacity: 0.55;
      --bng-bg-focus-opacity: 0.85;
      --bng-bg-border-enabled: var(--bng-cool-gray-500);
      --bng-bg-border-hover: var(--bng-cool-gray-500);
      --bng-bg-border-active: var(--bng-cool-gray-500);
      --bng-bg-border-disabled: var(--bng-cool-gray-500);
      --bng-bg-border-focus: var(--bng-cool-gray-300);

      gap: var(--pause-rail-button-gap, 0.5em);
      min-height: 0;
      grid-column: auto;
      grid-row: auto;
      align-self: stretch;
    }

    .label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.pause-panel-button {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --bng-icon-size: 2em;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-650);
  --bng-bg-hover: var(--bng-cool-gray-600);
  --bng-bg-active: var(--bng-cool-gray-600);
  --bng-bg-disabled: var(--bng-cool-gray-600);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.85;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;

  --bng-bg-border-enabled: var(--bng-cool-gray-300);
  --bng-bg-border-hover: var(--bng-cool-gray-300);
  --bng-bg-border-active: var(--bng-cool-gray-300);
  --bng-bg-border-disabled: var(--bng-cool-gray-300);
  --bng-bg-border-focus: var(--bng-cool-gray-300);
  --bng-bg-focus-opacity: 0.6;

  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;

  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 1em;
  --bng-button-padding-bottom: 1em;
  --bng-button-margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;

  gap: 0.5em;
  min-height: 3em;
  width: 100%;
  grid-column: span var(--pause-panel-button-column-span, 1);
  grid-row: span var(--pause-panel-button-row-span, 1);
  font-size: var(--ui-rem, 1rem);
  line-height: 1.2;
  align-self: start;

  &.pause-panel-button--danger {
    --bng-bg-enabled: var(--bng-add-red-600);
    --bng-bg-hover: var(--bng-add-red-600);
    --bng-bg-active: var(--bng-add-red-600);
    --bng-bg-disabled: var(--bng-add-red-600);
    --bng-bg-border-enabled: var(--bng-add-red-400);
    --bng-bg-border-hover: var(--bng-add-red-400);
    --bng-bg-border-active: var(--bng-add-red-400);
    --bng-bg-border-disabled: var(--bng-add-red-400);
  }

  &.pause-panel-button--system {
    --bng-bg-enabled: var(--bng-ter-blue-gray-600);
    --bng-bg-hover: var(--bng-ter-blue-gray-600);
    --bng-bg-active: var(--bng-ter-blue-gray-600);
    --bng-bg-disabled: var(--bng-ter-blue-gray-600);
  }
}

.pause-panel-button-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  flex: 1 1 auto;
  min-width: 0;
}

.label {
  display: block;
  line-height: 1.15;
  white-space: normal;
  overflow-wrap: anywhere;
}

.pause-panel-button-indicator {
  width: 0.75em;
  height: 0.75em;
  border-radius: 50%;
  background-color: var(--bng-add-yellow-500);
  flex: 0 0 auto;
}
</style>
