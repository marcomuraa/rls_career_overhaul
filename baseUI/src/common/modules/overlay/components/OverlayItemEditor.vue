<template>
  <div
    class="overlay-item-editor"
    :class="{
      'is-selected':  selected,
      'is-highlighted': highlighted,
      'is-moving':    activeOp === 'moving',
      'is-resizing':  activeOp === 'resizing',
      'is-interactive': interactive,
      'is-hover-enabled': hoverEnabled,
    }"
    @pointerdown.stop="onBodyPointerDown"
    @click.stop
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="overlay-item-editor__hover-bg"></div>
    <div class="overlay-item-editor__outline"></div>

    <template v-if="showResizeHandles">
      <div
        v-for="h in HANDLES"
        v-show="!isControllerUsed || h === HandleDir.NW || h === HandleDir.SE"
        :key="h"
        class="overlay-item-editor__handle"
        :class="[
          `overlay-item-editor__handle--${h}`,
          { 
            'is-active-controller-handle': isActiveControllerHandle(h),
            'is-controller-used': isControllerUsed
          },
        ]"
        :data-handle="h"
        @pointerdown.stop.prevent="onHandlePointerDown($event, h)"
        @click.stop
      >
        <BngIcon 
          v-if="isControllerUsed && h === HandleDir.SE" 
          :type="icons.move02" 
          class="overlay-item-editor__controller-icon" 
        />
      </div>
    </template>

    <div
      v-if="showControls"
      class="overlay-item-editor__controls"
    >
      <slot
        name="item-controls"
        :item="item"
        :rectPx="rectPx"
        :editing="true"
        :selected="selected"
        :activeOp="activeOp"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import useControls from "@/services/controls"
import { BngIcon, icons } from "@/common/components/base"
import { HandleDir } from "../types"

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  rectPx: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  hoverEnabled: {
    type: Boolean,
    default: false,
  },
  controlsVisible: {
    type: Boolean,
    default: true,
  },
  // forwarded from parent
  alwaysShowItemControls: {
    type: Boolean,
    default: false,
  },
  // "idle" | "moving" | "resizing" — the controller's current op on this item.
  activeOp: {
    type: String,
    default: "idle",
  },
})

const emit = defineEmits([
  "select",
  "hover",
  "move-start",
  "resize-start",
])

// fixed order keeps handle stacking deterministic
const HANDLES = Object.freeze([
  HandleDir.NW, HandleDir.N, HandleDir.NE,
  HandleDir.W,               HandleDir.E,
  HandleDir.SW, HandleDir.S, HandleDir.SE,
])

const { isControllerUsed } = storeToRefs(useControls())
const showResizeHandles = computed(() => {
  if (!props.interactive) return false
  if (!props.selected) return false
  if (!isControllerUsed.value) return true
  return props.activeOp === "resizing"
})
const showControls = computed(() => props.controlsVisible && (props.selected || props.alwaysShowItemControls))

function isActiveControllerHandle(handle) {
  return isControllerUsed.value
    && props.activeOp === "resizing"
    && handle === HandleDir.SE
}

function onBodyPointerDown(event) {
  if (!props.interactive) return
  // allow only the left-button
  if (event.button !== undefined && event.button !== 0) return
  emit("select", props.item.id)
  emit("move-start", event, props.item)
}

function onHandlePointerDown(event, handle) {
  if (!props.interactive) return
  if (event.button !== undefined && event.button !== 0) return
  emit("select", props.item.id)
  emit("resize-start", event, props.item, handle)
}

function onMouseEnter() {
  if (!props.hoverEnabled) return
  emit("hover", props.item.id)
}

function onMouseLeave() {
  if (!props.hoverEnabled) return
  emit("hover", null)
}
</script>

<style lang="scss" scoped>
$handle-size:        12px;
$handle-offset:      #{-$handle-size * 0.5};
$outline-colour:     rgba(255, 255, 255, 0.35);
$selected-colour:    var(--bng-color-accent, #ffae00);
$active-colour:      #5bd1ff;
$active-colour-soft: rgba(91, 209, 255, 0.3);
$highlight-colour-soft: rgba(var(--bng-orange-500-rgb), 0.25);

.overlay-item-editor {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  cursor: move;
  touch-action: none;
  user-select: none;

  &.is-interactive {
    pointer-events: auto;
  }

  &.is-hover-enabled {
    pointer-events: auto;
    cursor: default;
  }

  &.is-interactive {
    cursor: move;
  }
}

.overlay-item-editor__hover-bg {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--bng-black-o2);
  pointer-events: none;
  opacity: 1;
}

.overlay-item-editor:hover:not(.is-moving):not(.is-resizing) .overlay-item-editor__hover-bg {
  background: $active-colour-soft;
}

.overlay-item-editor.is-selected:not(:hover):not(.is-moving):not(.is-resizing) .overlay-item-editor__hover-bg {
  background: $active-colour-soft;
  opacity: 0.5;
}

.overlay-item-editor.is-highlighted:not(.is-moving):not(.is-resizing) .overlay-item-editor__hover-bg,
.overlay-item-editor.is-selected.is-highlighted:not(:hover):not(.is-moving):not(.is-resizing) .overlay-item-editor__hover-bg {
  background: $highlight-colour-soft;
  opacity: 1;
}

.overlay-item-editor__outline {
  position: absolute;
  inset: 0;
  z-index: 11;
  border: 1px dashed $outline-colour;
  pointer-events: none;

  .is-selected &,
  .is-highlighted & {
    border-style: solid;
    border-color: $selected-colour;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  }
}

.overlay-item-editor:hover:not(.is-moving):not(.is-resizing) .overlay-item-editor__outline {
  border-style: solid;
  border-color: $active-colour;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}

.overlay-item-editor.is-moving   .overlay-item-editor__outline,
.overlay-item-editor.is-resizing .overlay-item-editor__outline {
  border-style: solid;
  border-color: $active-colour;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}

.overlay-item-editor__handle {
  position: absolute;
  z-index: 30;
  width:  $handle-size;
  height: $handle-size;
  padding: 0;
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.6);
  background: $selected-colour;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  pointer-events: auto;
  touch-action: none;

  &.is-active-controller-handle {
    opacity: 1;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--bng-off-white-rgb), 0.9);
  }

  &--n  { top: $handle-offset; left: 50%;     transform: translateX(-50%); cursor: ns-resize; }
  &--s  { bottom: $handle-offset; left: 50%;  transform: translateX(-50%); cursor: ns-resize; }
  &--e  { right: $handle-offset; top: 50%;    transform: translateY(-50%); cursor: ew-resize; }
  &--w  { left: $handle-offset; top: 50%;     transform: translateY(-50%); cursor: ew-resize; }
  &--ne { top: $handle-offset; right: $handle-offset;    cursor: nesw-resize; }
  &--nw { top: $handle-offset; left: $handle-offset;     cursor: nwse-resize; }
  &--se { bottom: $handle-offset; right: $handle-offset; cursor: nwse-resize; }
  &--sw { bottom: $handle-offset; left: $handle-offset;  cursor: nesw-resize; }

  &.is-controller-used.overlay-item-editor__handle--nw {
    border-radius: 50%;
    background-color: rgba(var(--bng-off-white-rgb), 0.9);
    border: none;
    box-shadow: none;
  }

  &.is-controller-used.overlay-item-editor__handle--se {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bng-black-o8);
    border: none;
    box-shadow: none;
    width: 1.5em;
    height: 1.5em;
    bottom: -0.75em;
    right: -0.75em;
    border-radius: 50%;

    .overlay-item-editor__controller-icon {
      color: white;
      font-size: 1.5em;
    }
  }
}

.overlay-item-editor__controls {
  position: absolute;
  z-index: 40;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: min(12em, 100%);
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  cursor: default;

  &:empty {
    display: none;
  }
}
</style>
