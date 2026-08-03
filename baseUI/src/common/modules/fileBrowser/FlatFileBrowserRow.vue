<template>
  <div
    v-if="navigationEnabled"
    v-bng-on-ui-nav:context.focusRequired="contextAction ? onContextNav : undefined"
    v-bng-on-ui-nav:action_2.focusRequired="action2Action ? onAction2Nav : undefined"
    v-bng-on-ui-nav:action_4.focusRequired="action4Action ? onAction4Nav : undefined"
    v-bng-on-ui-nav:ok.up.focusRequired="useHold ? onOkRelease : undefined"
  >
    <BngRow
      ref="rowRef"
      v-bind="bngRowBindings"
      v-bng-double-click="useDoubleClick ? onDoubleClick : null"
      v-bng-ui-nav-label:ok="defaultActionLabel"
      v-bng-ui-nav-label:context="active ? contextAction?.label : null"
      v-bng-ui-nav-label:action_2="active ? action2Action?.label : null"
      v-bng-ui-nav-label:action_4="active ? action4Action?.label : null"
    >
      <FlatFileBrowserRowContent v-bind="rowContentBindings" />
    </BngRow>
  </div>
  <BngRow
    ref="rowRef"
    v-else
    v-bind="bngRowBindings"
  >
    <FlatFileBrowserRowContent v-bind="rowContentBindings" />
  </BngRow>
</template>

<script setup>
import { computed, ref } from "vue"
import { BngRow } from "@/common/components/base"
import FlatFileBrowserRowContent from "./FlatFileBrowserRowContent.vue"
import { vBngOnUiNav, vBngUiNavLabel, vBngDoubleClick } from "@/common/directives"
import { $translate } from "@/services"

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  selected: Boolean,
  active: Boolean,
  focused: Boolean,
  autofocus: Boolean,
  navigationEnabled: {
    type: Boolean,
    default: true,
  },
  // treat the default (ok) action as a press/release "hold"
  // the row stops emitting `default-action` for ok and instead emits `hold-press`/`hold-release`
  // `hold-press` carries `{ item, mouse }` (mouse=true for a real mouse button, false for controller/keyboard ok)
  useHold: {
    type: Boolean,
    default: false,
  },
  // emit `doubleclick` { item } on a mouse
  useDoubleClick: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["focus", "blur", "hover", "leave", "default-action", "action", "hold-press", "hold-release", "doubleclick"])

const rowRef = ref(null)

function getRowAnchorEl() {
  const row = rowRef.value
  const el = row?.$el ?? row
  return el instanceof HTMLElement ? el : null
}

const visibleActions = computed(() => Array.isArray(props.item.actions)
  ? props.item.actions.reduce((actions, action) => {
    if (!action?.key) return actions
    actions.push({
      ...action,
      label: $translate.instant(action.label),
    })
    return actions
  }, [])
  : []
)

function firstEnabledActionFor(uiEvent) {
  return visibleActions.value.find(action => action.uiEvent === uiEvent && !action.disabled)
}

const contextAction = computed(() => firstEnabledActionFor("context"))
const action2Action = computed(() => firstEnabledActionFor("action_2"))
const action4Action = computed(() => firstEnabledActionFor("action_4"))
const defaultActionLabel = computed(() => {
  if (typeof props.item.defaultAction === "object") return props.item.defaultAction?.label
  if (typeof props.item.defaultAction === "string") return visibleActions.value.find(action => action.key === props.item.defaultAction)?.label
  return null
})
const bngRowBindings = computed(() => {
  const bindings = {
    class: {
      "flat-file-browser-row": true,
      "is-selected": props.selected,
      "is-focused": props.focused,
      "focus-visible": props.focused,
    },
    disabled: props.item.disabled,
    tooltip: props.item.disabled ? props.item.disabledReason : undefined,
    "bng-scoped-nav-autofocus": props.autofocus ? "true" : null,
    onActivate: onRowActivate,
    onFocusin: () => emit("focus", props.item),
    onFocusout: () => emit("blur", props.item),
    onUinavFocus: () => emit("focus", props.item),
    onUinavBlur: () => emit("blur", props.item),
    onMouseenter: () => emit("hover", props.item),
    onMouseleave: () => emit("leave", props.item),
  }
  if (props.useHold) {
    // hold rows emit raw press/release; the consumer owns the peek logic. Mouse
    // press/release come from pointer events, controller ok from activate/ok.up.
    bindings.onPointerdown = onPointerDown
    bindings.onPointerup = onPointerUp
  } else {
    bindings.onClick = onDefaultAction
  }
  return bindings
})
const rowContentBindings = computed(() => ({
  item: props.item,
  active: props.active,
  visibleActions: visibleActions.value,
  onAction: emitAction,
}))

function emitAction(action) {
  if (props.item.disabled || !action || action.disabled) return false
  emit("action", { item: props.item, action, anchorEl: getRowAnchorEl() })
  return true
}

function emitPress() {
  if (props.item.disabled) return
  emit("default-action", { item: props.item, action: props.item.defaultAction ?? null })
}

// for non-hold consumers
function onDefaultAction() {
  emitPress()
}

function onDoubleClick() {
  if (props.item.disabled) return
  emit("doubleclick", { item: props.item })
}

function onRowActivate() {
  if (props.item.disabled) return
  if (props.useHold) {
    // ignore the mouse-driven activate (the trailing click)
    if (mouseInteracting) return
    emit("hold-press", { item: props.item, mouse: false })
    return
  }
  emitPress()
}

// controller/keyboard ok release
function onOkRelease() {
  if (props.item.disabled) return true
  emit("hold-release", { item: props.item })
  return false
}

let mouseInteracting = false

function releaseMouseGuardSoon() {
  // the row's "activate" (click) fires synchronously right after pointer-up
  // clear the guard so that click is ignored but a later controller activate is not
  setTimeout(() => { mouseInteracting = false }, 0)
}

function onPointerDown(event) {
  if (props.item.disabled) return
  if (event?.pointerType && event.pointerType !== "mouse") return
  mouseInteracting = true
  emit("hold-press", { item: props.item, mouse: true })
}

function onPointerUp(event) {
  if (event?.pointerType && event.pointerType !== "mouse") return
  emit("hold-release", { item: props.item })
  releaseMouseGuardSoon()
}

function onContextNav() {
  return !emitAction(contextAction.value)
}

function onAction2Nav() {
  return !emitAction(action2Action.value)
}

function onAction4Nav() {
  return !emitAction(action4Action.value)
}
</script>

<style lang="scss" scoped>
.flat-file-browser-row {
  &.is-selected {
    --bng-bg-enabled-opacity: 1;
    --bng-bg-hover-opacity: 1;
    --bng-bg-active-opacity: 1;
    --bng-bg-focus-opacity: 1;
    --bng-bg-image: linear-gradient(90deg, rgba(255, 102, 0, 0.35) 0%, rgba(255, 255, 255, 0) 100%);
  }

  &.is-focused,
  &.focus-visible {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-focus: var(--bng-orange-550);
    --bng-bg-border-enabled: var(--bng-orange-550);
    --bng-bg-border-focus: var(--bng-orange-550);
    --bng-bg-border-width: 0.0625rem;
  }
}

</style>
