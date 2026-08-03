<template>
  <div
    class="overlay-item"
    :class="{
      'is-editing':  editing,
      'is-selected': selected,
      'is-highlighted': highlighted,
      'is-dimmed': dimmed,
    }"
    :style="positionStyle"
    :data-item-id="item?.id"
  >
    <div class="overlay-item__content" :class="{ 'is-inert': editing }">
      <slot :item="item" :rectPx="rectPx" />
    </div>

    <OverlayItemEditor
      v-if="editing"
      :item="item"
      :rect-px="rectPx"
      :selected="selected"
      :highlighted="highlighted"
      :interactive="editorInteractive"
      :hover-enabled="hoverEnabled"
      :controls-visible="itemControlsVisible"
      :active-op="activeOp"
      :always-show-item-controls="alwaysShowItemControls"
      @select="onSelect"
      @hover="onHover"
      @move-start="onMoveStart"
      @resize-start="onResizeStart"
    >
      <template #item-controls="slotProps">
        <slot name="item-controls" v-bind="slotProps" />
      </template>
    </OverlayItemEditor>
  </div>
</template>

<script setup>
import { computed } from "vue"
import OverlayItemEditor from "./OverlayItemEditor.vue"

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  rectPx: {
    type: Object,
    required: true,
  },
  editing: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  dimmed: {
    type: Boolean,
    default: false,
  },
  editorInteractive: {
    type: Boolean,
    default: true,
  },
  hoverEnabled: {
    type: Boolean,
    default: false,
  },
  itemControlsVisible: {
    type: Boolean,
    default: true,
  },
  // forwarded from the parent
  alwaysShowItemControls: {
    type: Boolean,
    default: false,
  },
  // controller's current op on this item
  // "idle" | "moving" | "resizing"
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

// avoid transforms so each item shares the overlay's stacking context
const positionStyle = computed(() => {
  const r = props.rectPx || { x: 0, y: 0, width: 0, height: 0 }
  return {
    left:   `${r.x}px`,
    top:    `${r.y}px`,
    width:  `${r.width}px`,
    height: `${r.height}px`,
  }
})

function onSelect(id) {
  emit("select", id)
}
function onHover(id) {
  emit("hover", id)
}
function onMoveStart(event, item) {
  emit("move-start", event, item)
}
function onResizeStart(event, item, handle) {
  emit("resize-start", event, item, handle)
}
</script>

<style lang="scss" scoped>
.overlay-item {
  position: absolute;
  will-change: left, top, width, height;
  pointer-events: none; // children decide what's interactive
  box-sizing: border-box;
}

.overlay-item__content {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  &.is-inert {
    pointer-events: none;

    :deep(*) {
      pointer-events: none !important;
    }
  }
}

.overlay-item.is-dimmed {
  .overlay-item__content {
    opacity: 0.32;
    filter: grayscale(0.35) brightness(0.7);
  }

  :deep(.overlay-item-editor) {
    opacity: 0.38;
  }
}
</style>
