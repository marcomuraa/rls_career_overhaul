<template>
  <div
    ref="rowRef"
    v-bng-on-ui-nav:ok.focusRequired="onOkActivate"
    v-bng-on-ui-nav:context.focusRequired="contextNavHandler"
    v-bng-on-ui-nav:action_2.focusRequired="action2NavHandler"
    v-bng-on-ui-nav:action_4.focusRequired="action4NavHandler"
    v-bng-on-ui-nav:focus_l.focusRequired="focusLeftNavHandler"
    v-bng-on-ui-nav:focus_r.focusRequired="focusRightNavHandler"
    v-bng-on-ui-nav-focus.repeat="directionalFocusConfig"
    v-bng-tooltip="tooltipBinding"
    v-bng-disabled="disabled"
    v-bng-sound-class.mouseenter.focus="rowDirectiveSoundClass"
    bng-nav-item
    bng-no-child-nav="true"
    :tabindex="disabled ? -1 : 0"
    :class="{
      'bng-row': true,
      'bng-row-vertical': vertical,
      'bng-row-label-before': labelBefore,
      'bng-row-disabled': disabled,
      'no-focus-frame': noFocusFrame,
    }"
    @click="onRowClick"
    @mouseenter="onRowMouseEnter"
    @mouseleave="onTooltipHide"
    @focusin="onRowFocusIn"
    @focusout="onRowFocusOut"
    @uinav-focus="onRowUiNavFocus"
    @uinav-blur="onRowUiNavBlur"
  >
    <Background v-if="!noBackground" class="bng-row-background" :disabled="disabled" />
    <div
      v-if="hasLabel"
      class="bng-row-label"
      v-bng-disabled="disabled"
      @click="onLabelClick"
    >
      <slot name="label">{{ label }}</slot>
    </div>
    <div class="bng-row-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, provide, useSlots, watch, onUnmounted } from "vue"
import { vBngOnUiNav, vBngOnUiNavFocus, vBngDisabled, vBngTooltip, vBngSoundClass } from "@/common/directives"
import { playSoundEvent } from "@/services/soundManager"
import { UI_EVENTS } from "@/services/uiNav"
import { useUINavTracker } from "@/services/uiNavTracker"
import { uniqueId } from "@/services/uniqueId"
import Background from "@/common/components/utility/background.vue"

const HORIZONTAL_DIRECTIONAL_INPUTS = Object.freeze([UI_EVENTS.focus_l, UI_EVENTS.focus_r, UI_EVENTS.focus_lr])
const VERTICAL_DIRECTIONAL_INPUTS = Object.freeze([UI_EVENTS.focus_u, UI_EVENTS.focus_d, UI_EVENTS.focus_ud])
const DIRECTIONAL_INPUTS = Object.freeze([...HORIZONTAL_DIRECTIONAL_INPUTS, ...VERTICAL_DIRECTIONAL_INPUTS])
const DIRECTIONAL_INPUT_ALIASES = Object.freeze({
  horizontal: HORIZONTAL_DIRECTIONAL_INPUTS,
  vertical: VERTICAL_DIRECTIONAL_INPUTS,
  all: DIRECTIONAL_INPUTS,
})

function normalizeDirectionalInputs(value) {
  if (!value) return []
  const values = Array.isArray(value) ? value : [value]
  return values.reduce((result, item) => {
    const inputNames = DIRECTIONAL_INPUT_ALIASES[item] || (DIRECTIONAL_INPUTS.includes(item) ? [item] : [])
    inputNames.forEach(name => {
      if (!result.includes(name)) result.push(name)
    })
    return result
  }, [])
}

const props = defineProps({
  /** @description Plain-text label. Use the `label` slot for richer content. */
  label: String,
  /** @description Stack the label above the control instead of side-by-side. */
  vertical: Boolean,
  /** @description Place the label after the control (only relevant for horizontal layout). */
  labelBefore: Boolean,
  /** @description Disables the row and any registered child control activation. */
  disabled: Boolean,
  /** @description Hides the focus/hover background visuals. */
  noBackground: Boolean,
  /** @description Hides the focus frame (still focusable). */
  noFocusFrame: Boolean,
  /** @description Disables row-focused navigation handling of the registered control. */
  noNavigationHandling: Boolean,
  /** @description Hides unused directional navigation hints while the row is focused. `true` currently infers unused horizontal inputs; strings/arrays hide explicit groups or event names. */
  noUnusedNavigation: {
    type: [Boolean, String, Array],
    default: false,
  },
  /** @description Tooltip value (string or v-bng-tooltip object). */
  tooltip: {
    type: [String, Object],
    default: undefined,
  },
  /** @description Called with tooltip content instead of showing an actual tooltip. */
  tooltipHandler: Function,
  /** @description Sound class for row hover/focus and row-owned activation. */
  soundClass: {
    type: String,
    default: "bng_main_secondary",
  },
  /** @description Disables row-owned sound playback. */
  noSound: Boolean,
})

const emit = defineEmits(["activate"])

const slots = useSlots()
const uiNavTracker = useUINavTracker()
const directionalIgnoreOwnerId = uniqueId("bngRowDirectionalIgnore")
const hasLabel = computed(() => !!props.label || !!slots.label)
const hasTooltipSlot = computed(() => !!slots.tooltip)

function extractNodeText(node) {
  if (node == null) return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractNodeText).join("")
  if (typeof node === "object" && "children" in node) return extractNodeText(node.children)
  return ""
}

const tooltipSlotText = computed(() => {
  if (!hasTooltipSlot.value) return undefined
  const text = extractNodeText(slots.tooltip?.() ?? []).trim()
  return text || undefined
})
const resolvedTooltipContent = computed(() => tooltipSlotText.value ?? props.tooltip)
const usesTooltipHandler = computed(() => typeof props.tooltipHandler === "function")
const tooltipBinding = computed(() => usesTooltipHandler.value ? undefined : resolvedTooltipContent.value)

const rowDirectiveSoundClass = computed(() => (!props.disabled && !props.noSound && props.soundClass) ? props.soundClass : null)

const rowRef = ref(null)
const isRowActive = ref(false)
const apiNoUnusedNavigation = shallowRef(undefined)
let ignoredDirectionalInputs = []

// only one registered control per row (the latest registration wins; warn in dev)
const registeredControl = shallowRef(null)
const contextNavHandler = computed(() => registeredControl.value?.context ? onContextActivate : undefined)
const action2NavHandler = computed(() => registeredControl.value?.action2 ? onAction2Activate : undefined)
const action4NavHandler = computed(() => registeredControl.value?.action4 ? onAction4Activate : undefined)
const focusLeftNavHandler = computed(() => (!props.noNavigationHandling && registeredControl.value?.stepLeft) ? onFocusLeft : undefined)
const focusRightNavHandler = computed(() => (!props.noNavigationHandling && registeredControl.value?.stepRight) ? onFocusRight : undefined)
// Repeat-capable directional handling (e.g. smart select / slider) is delegated to the
// v-bng-on-ui-nav-focus directive using the control-provided config. Controls expose either
// stepLeft/stepRight (single step) or uiNavFocus (repeat), not both.
const directionalFocusConfig = computed(() => {
  if (props.disabled || props.noNavigationHandling) return false
  return registeredControl.value?.uiNavFocus || false
})
const explicitIgnoredDirectionalInputs = computed(() =>
  apiNoUnusedNavigation.value ?? registeredControl.value?.noUnusedNavigation ?? props.noUnusedNavigation
)
const inferredIgnoredDirectionalInputs = computed(() => {
  if (!props.noNavigationHandling && (registeredControl.value?.stepLeft || registeredControl.value?.stepRight || registeredControl.value?.uiNavFocus)) return []
  return HORIZONTAL_DIRECTIONAL_INPUTS
})
const ignoredDirectionalInputConfig = computed(() => {
  const explicit = explicitIgnoredDirectionalInputs.value
  return explicit === true ? inferredIgnoredDirectionalInputs.value : normalizeDirectionalInputs(explicit)
})
const activeIgnoredDirectionalInputs = computed(() => (!props.disabled && isRowActive.value) ? ignoredDirectionalInputConfig.value : [])

watch(activeIgnoredDirectionalInputs, inputs => {
  syncIgnoredDirectionalInputs(inputs)
}, { immediate: true })

onUnmounted(() => syncIgnoredDirectionalInputs())

function syncIgnoredDirectionalInputs(inputs = []) {
  const nextInputs = normalizeDirectionalInputs(inputs)
  ignoredDirectionalInputs
    .filter(name => !nextInputs.includes(name))
    .forEach(name => uiNavTracker.removeIgnore(name, directionalIgnoreOwnerId))
  nextInputs
    .filter(name => !ignoredDirectionalInputs.includes(name))
    .forEach(name => uiNavTracker.addIgnore(name, directionalIgnoreOwnerId))
  ignoredDirectionalInputs = nextInputs
}

function register(api) {
  if (registeredControl.value && import.meta.hot) {
    console.warn("[BngRow] Multiple controls registered inside one row. Only the latest will be activated.")
  }
  registeredControl.value = api
}

function unregister(api) {
  if (registeredControl.value === api) registeredControl.value = null
}

function setNoUnusedNavigation(inputs) {
  apiNoUnusedNavigation.value = inputs
  return () => {
    if (apiNoUnusedNavigation.value === inputs) apiNoUnusedNavigation.value = undefined
  }
}

function clearNoUnusedNavigation() {
  apiNoUnusedNavigation.value = undefined
}

provide("BngRow", {
  register,
  unregister,
  setNoUnusedNavigation,
  clearNoUnusedNavigation,
  disabled: computed(() => props.disabled),
  getElement: () => rowRef.value,
})

function isClickInsideControl(event) {
  if (!registeredControl.value?.isEventInside) return false
  return !!registeredControl.value.isEventInside(event)
}

function canMouseActivate() {
  return registeredControl.value?.activateOnClick !== false
}

function activateRow() {
  if (props.disabled) return
  if (registeredControl.value?.activate) {
    // registered controls should implement their own click/sound paths
    registeredControl.value.activate()
    return
  }
  // play row click sound through the sound manager so directive-owned ownership/mute rules still apply
  if (!props.noSound && rowRef.value) {
    playSoundEvent(rowRef.value, "click")
  }
  emit("activate")
}

function onLabelClick(event) {
  if (props.disabled) return
  if (!canMouseActivate()) return
  // prevent the click from also bubbling to the row root
  event.preventDefault()
  event.stopPropagation()
  activateRow()
}

function onRowClick(event) {
  if (props.disabled) return
  // ignore clicks coming from inside the control itself
  if (isClickInsideControl(event)) return
  if (!canMouseActivate()) return
  activateRow()
}

function onOkActivate() {
  if (props.disabled) return true
  activateRow()
  return false
}

function onContextActivate() {
  if (props.disabled) return true
  if (registeredControl.value?.context) return registeredControl.value.context()
  return true
}

function onAction2Activate() {
  if (props.disabled) return true
  if (registeredControl.value?.action2) return registeredControl.value.action2()
  return true
}

function onAction4Activate() {
  if (props.disabled) return true
  if (registeredControl.value?.action4) return registeredControl.value.action4()
  return true
}

function onFocusLeft() {
  if (props.disabled) return true
  if (registeredControl.value?.stepLeft) return registeredControl.value.stepLeft()
  return true
}

function onFocusRight() {
  if (props.disabled) return true
  if (registeredControl.value?.stepRight) return registeredControl.value.stepRight()
  return true
}

function onRowMouseEnter() {
  onTooltipShow()
}

function onRowFocusIn() {
  isRowActive.value = true
  onTooltipShow()
}

function onRowFocusOut(event) {
  if (!(event.relatedTarget instanceof Node && rowRef.value?.contains(event.relatedTarget))) {
    isRowActive.value = false
  }
  onTooltipHide()
}

function onRowUiNavFocus() {
  isRowActive.value = true
  // ui-nav focus that doesn't bring DOM focus still wants the row's focus sound
  if (!props.disabled && !props.noSound && rowRef.value) {
    playSoundEvent(rowRef.value, "focus")
  }
  onTooltipShow()
}

function onRowUiNavBlur() {
  isRowActive.value = false
  onTooltipHide()
}

function onTooltipShow() {
  if (!usesTooltipHandler.value || resolvedTooltipContent.value === undefined) return
  props.tooltipHandler(resolvedTooltipContent.value)
}

function onTooltipHide() {
  if (!usesTooltipHandler.value) return
  props.tooltipHandler(undefined)
}
</script>

<style lang="scss">
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.bng-row {
  $f-offset: 0.125rem;
  $rad: $border-rad-1;

  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-900);
  --bng-bg-border-enabled: var(--bng-cool-gray-750);
  --bng-bg-border-hover: var(--bng-cool-gray-600);
  --bng-bg-border-active: var(--bng-cool-gray-900);
  --bng-bg-border-width: 0;

  --bng-bg-focus-opacity: 1;
  --bng-bg-enabled-opacity: 0.6;
  --bng-bg-hover-opacity: 1;
  --bng-bg-active-opacity: 1;
  --bng-bg-disabled-opacity: 0.2;
  --bng-row-effective-breakpoint: var(--bng-row-breakpoint, 50%); // where label and control should meet on horizontal layout

  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: stretch;
  margin: 0.25em;
  padding: 0.25em;
  border-radius: var(--bng-corners-1);
  isolation: isolate;
  cursor: pointer;

  @include modify-focus($rad, $f-offset);

  &.focus-visible:not(.no-focus-frame) {
    --bng-bg-enabled: var(--bng-orange-550);
  }

  > .bng-row-background {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: var(--bng-corners-1);
  }

  > .bng-row-label,
  > .bng-row-content {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    min-width: 0;
  }

  > .bng-row-label {
    padding: var(--bng-row-label-padding, 0.25em 0 0.25em 0.5em);
    flex: 0 0 var(--bng-row-effective-breakpoint);
    overflow: hidden;
    color: var(--bng-off-white);
    user-select: none;
    -webkit-user-select: none;

    &[disabled] {
      opacity: 0.5;
    }
  }

  > .bng-row-content {
    flex: 1 0 calc(100% - var(--bng-row-effective-breakpoint));
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  &.bng-row-vertical {
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;

    > .bng-row-label,
    > .bng-row-content {
      flex: 1 1 auto;
      width: 100%;
    }

    > .bng-row-label {
      text-align: left;
    }

    > .bng-row-content {
      justify-content: stretch;
      align-items: stretch;

      > * {
        width: 100%;
      }
    }
  }

  &.bng-row-label-before:not(.bng-row-vertical) {
    flex-direction: row-reverse;
  }

  &.bng-row-disabled {
    pointer-events: none;
    cursor: default;
  }
}
</style>
