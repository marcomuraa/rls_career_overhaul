<template>
  <div
    ref="elRoot"
    class="overlay"
    :class="[
      `overlay--controls-${controlsPosition}`,
      {
        'is-editing':  editing,
        'is-editable': editable,
        'is-adjusting': adjusting,
      },
    ]"
  >
    <div
      v-if="editing && hasControlsSlot && controllerState.op === 'idle'"
      class="overlay__chrome"
      @pointerdown.stop
      @click.stop
    >
      <slot
        name="controls"
        :editing="editing"
        :toggle-editor="toggleEditor"
        :selection="selectionList"
        :select="select"
      />
    </div>

    <div
      ref="elFrame"
      class="overlay__frame"
      @pointerdown="onFrameBackgroundPointerDown"
    >
      <OverlayItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :rect-px="getGeometry(item.id) ?? EMPTY_RECT"
        :editing="editing"
        :selected="isSelected(item.id)"
        :highlighted="highlightedItemId != null && String(highlightedItemId) === String(item.id)"
        :dimmed="dimUnselectedItems && !!selectedId && !isSelected(item.id)"
        :editor-interactive="itemEditorInteractive"
        :hover-enabled="itemHoverEnabled"
        :item-controls-visible="itemControlsVisible"
        :active-op="controllerState.itemId === item.id ? controllerState.op : 'idle'"
        :always-show-item-controls="alwaysShowItemControls"
        @select="select"
        @hover="onItemHover"
        @move-start="onMoveStart"
        @resize-start="onResizeStart"
      >
        <template #default="slotProps">
          <slot v-bind="slotProps" />
        </template>
        <template #item-controls="slotProps">
          <slot name="item-controls" v-bind="slotProps" />
        </template>
      </OverlayItem>

      <OverlayGuides
        v-if="editing && activeGuides.length > 0"
        class="overlay__guides"
        :guides="activeGuides"
        :frame="frameSize"
      />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  useSlots,
} from "vue"

import OverlayItem   from "./OverlayItem.vue"
import OverlayGuides from "./OverlayGuides.vue"

import useOverlayFrame     from "../composables/useOverlayFrame"
import useOverlayGeometry  from "../composables/useOverlayGeometry"
import useOverlaySelection from "../composables/useOverlaySelection"
import useOverlaySnapping  from "../composables/useOverlaySnapping"
import useOverlayController from "../composables/useOverlayController"

import { DEFAULT_SNAP, NavMode } from "../types"

import { uniqueId } from "@/services/uniqueId"
import { useUINavTracker, useUiNavLabel } from "@/services/uiNavTracker"

// consumers can override these defaults through `uinavLabels`
const DEFAULT_UINAV_LABELS = Object.freeze({
  select:         "ui.common.select",
  edit:           "ui.common.edit",
  confirm:        "ui.actions.confirm",
  cancel:         "ui.common.cancel",
  move:           "ui.hudApps.hint.move",   // TODO: change the string to "Move"
  resize:         "ui.hudApps.hint.resize", // TODO: change the string to "Resize"
  switchToResize: "ui.hudApps.hint.switchToResize",
  switchToMove:   "ui.hudApps.hint.switchToMove",
})

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  resolve: {
    type: Function,
    required: true,
  },
  frame: { // the frame element (defaults to the overlay's frame element)
    type: Object,
    default: null,
  },
  editable: {
    type: Boolean,
    default: true,
  },
  initialEditing: {
    type: Boolean,
    default: false,
  },
  controlsPosition: {
    type: String,
    default: "top",
    validator: v => ["top", "top-right", "bottom", "floating"].includes(v),
  },
  alwaysShowItemControls: {
    type: Boolean,
    default: false,
  },
  dimUnselectedItems: {
    type: Boolean,
    default: false,
  },
  itemEditorInteractive: {
    type: Boolean,
    default: true,
  },
  itemHoverEnabled: {
    type: Boolean,
    default: false,
  },
  itemControlsVisible: {
    type: Boolean,
    default: true,
  },
  adjustBackCancels: {
    type: Boolean,
    default: true,
  },
  lockSelection: { // disables element-to-element selection
    type: Boolean,
    default: false,
  },
  highlightedItemId: {
    type: [String, Number],
    default: null,
  },
  snap: {
    type: Object,
    default: () => ({ ...DEFAULT_SNAP }),
  },
  uinav: { // master switch for the overlay's built-in uinav handling
    type: Boolean,
    default: true,
  },
  uinavLabels: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits([
  "item-changed",
  "select",
  "toggle",
  "item-hover",
  "adjusting-change",
  "confirm",
])

const slots = useSlots()
const hasControlsSlot = computed(() => !!slots.controls)

const EMPTY_RECT = Object.freeze({ x: 0, y: 0, width: 0, height: 0 })

const elRoot  = ref(null)
const elFrame = ref(null)

const editing = ref(!!props.initialEditing)

const itemsGetter = () => props.items
const snapGetter  = () => props.snap

const frameSource = computed(() => props.frame ?? elFrame.value)
const {
  frame: frameSize,
  refresh: refreshFrame,
} = useOverlayFrame(frameSource)

const geometry = useOverlayGeometry(itemsGetter, props.resolve, frameSize)
const { getGeometry } = geometry

const selection = useOverlaySelection(itemsGetter)
const { select, isSelected, selectedId, selection: selectionList } = selection

const snapping = useOverlaySnapping(
  itemsGetter,
  frameSize,
  snapGetter,
  id => getGeometry(id),
)

const controller = useOverlayController({
  getFrameEl: () => (props.frame ?? elFrame.value),
  frame: frameSize,
  itemsSource: itemsGetter,
  resolve: props.resolve,
  geometry,
  snapping,
  selection,
  adjustBackCancels: () => props.adjustBackCancels,
  lockSelection: () => props.lockSelection,
  onConfirm: () => emit("confirm"),
  onCommitted: (item, rectPx, frame) => {
    emit("item-changed", item, rectPx, frame)
  },
})
const {
  activeGuides,
  state: controllerState,
  adjustMode,
  navMode,
} = controller

const adjusting = computed(() => controllerState.op === "moving" || controllerState.op === "resizing")

function onMoveStart(event, item) {
  if (!editing.value) return
  controller.beginMove(event, item)
}
function onResizeStart(event, item, handle) {
  if (!editing.value) return
  controller.beginResize(event, item, handle)
}

function onItemHover(itemId) {
  emit("item-hover", itemId)
}

function onFrameBackgroundPointerDown(event) {
  if (!editing.value) return
  if (event.target !== event.currentTarget) return
  select(null)
}

watch(selectedId, id => {
  emit("select", id)
})

watch(adjusting, active => {
  emit("adjusting-change", active)
}, { immediate: true })

function toggleEditor(force) {
  if (!props.editable) return
  const next = typeof force === "boolean" ? force : !editing.value
  if (next === editing.value) return
  editing.value = next
  if (!next) {
    controller.exitAdjust()
    controller.cancel()
  }
  emit("toggle", next)
}

watch(() => props.items, () => refreshFrame(), { immediate: false })

// capture navigation without claiming the consumer's scoped-nav ownership
const uinavOwnerId = uniqueId("overlay-uinav")
const tracker      = useUINavTracker()
const labelStore   = useUiNavLabel()

const labels = computed(() => ({ ...DEFAULT_UINAV_LABELS, ...props.uinavLabels }))

const desiredUinavEvents = computed(() => {
  if (!props.uinav || !editing.value) return null
  const out = {}
  const L = labels.value
  const locked = props.lockSelection
  if (adjustMode.value) {
    const moveOrResize = navMode.value === NavMode.Resize ? L.resize : L.move
    // keep `ok` active to confirm or exit adjust mode
    out.ok       = L.confirm
    out.back     = L.cancel
    out.focus_l  = moveOrResize
    out.focus_r  = moveOrResize
    out.focus_u  = moveOrResize
    out.focus_d  = moveOrResize
    out.focus_lr = moveOrResize
    out.focus_ud = moveOrResize
    out.action_2 = navMode.value === NavMode.Resize ? L.switchToMove : L.switchToResize
  } else if (selectedId.value) {
    out.ok = L.edit
    if (!locked) {
      out.focus_l  = L.select
      out.focus_r  = L.select
      out.focus_u  = L.select
      out.focus_d  = L.select
      out.focus_lr = "ui.mainmenu.navbar.navigate"
      out.focus_ud = "ui.mainmenu.navbar.navigate"
    }
  } else {
    out.ok = L.select
    if (!locked) {
      out.focus_l  = L.select
      out.focus_r  = L.select
      out.focus_u  = L.select
      out.focus_d  = L.select
      out.focus_lr = "ui.mainmenu.navbar.navigate"
      out.focus_ud = "ui.mainmenu.navbar.navigate"
    }
  }
  return out
})

let registeredUinavEvents = {}
let trackerHostEl = null

function syncUinavTracker(target) {
  const host = elRoot.value || trackerHostEl
  if (!host) return
  for (const name of Object.keys(registeredUinavEvents)) {
    if (!target || !(name in target)) {
      tracker.removeEvent(name, uinavOwnerId, host)
      labelStore.clearLabels(host, [name])
    }
  }
  if (target) {
    for (const [name, label] of Object.entries(target)) {
      labelStore.registerLabel(host, [name], label)
      tracker.addEvent(name, uinavOwnerId, host)
    }
  }
  registeredUinavEvents = target ? { ...target } : {}
  trackerHostEl = target ? host : null
}

watch(desiredUinavEvents, t => syncUinavTracker(t))

function onUiNavEvent(event) {
  controller.handleUiNav(event)
}

let uinavListenerEl = null
function attachUinavListener() {
  if (uinavListenerEl) return
  document.addEventListener("ui_nav", onUiNavEvent, true)
  uinavListenerEl = document
}
function detachUinavListener() {
  if (!uinavListenerEl) return
  uinavListenerEl.removeEventListener("ui_nav", onUiNavEvent, true)
  uinavListenerEl = null
}

watch(
  [() => props.uinav, editing],
  ([on, ed]) => {
    if (on && ed) attachUinavListener()
    else detachUinavListener()
  },
)

onMounted(() => {
  syncUinavTracker(desiredUinavEvents.value)
  if (props.uinav && editing.value) attachUinavListener()
})

onBeforeUnmount(() => {
  controller.exitAdjust()
  controller.cancel()
  emit("adjusting-change", false)
  detachUinavListener()
  syncUinavTracker(null)
})

defineExpose({
  toggleEditor,
  select,
  commit: controller.commit,
  cancel: controller.cancel,
  getGeometry,
  nudge: controller.nudge,
  resize: controller.resize,
  enterAdjust: controller.enterAdjust,
  exitAdjust: controller.exitAdjust,
  setNavMode: controller.setNavMode,
  toggleNavMode: controller.toggleNavMode,
  isEditing: () => editing.value,
  isAdjusting: () => adjustMode.value,
  navMode,
  frameSize,
})
</script>

<style lang="scss" scoped>
.overlay {
  position: relative;
  width: 100%;
  height: 100%;
  outline: none;
  isolation: isolate;
}

.overlay__chrome {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: auto;

  .overlay--controls-top & {
    top: 6px;
    left: 6px;
    right: 6px;
  }
  .overlay--controls-top-right & {
    top: 6px;
    right: 6px;
  }
  .overlay--controls-bottom & {
    bottom: 6px;
    left: 6px;
    right: 6px;
  }
  .overlay--controls-floating & {
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.overlay__frame {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: visible; // guides can spill
}

.overlay__guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.overlay.is-editing .overlay__frame {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
