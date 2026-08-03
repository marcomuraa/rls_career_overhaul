<template>
  <aside
    class="photomode-gallery-shortcut"
    :class="{
      'photomode-gallery-shortcut--controller': controller,
      'photomode-gallery-shortcut--expanded': expanded,
    }"
  >
    <div class="photomode-gallery-shortcut__actions">
      <Button
        class="photomode-gallery-shortcut__hold-button"
        :class="{
          'hold-active': controller && contextHoldActive,
        }"
        bng-no-nav="true"
        :nav-item="false"
        :tab-index="-1"
        @click="onButtonClick"
      >
        <BngBinding
          v-if="controller"
          class="photomode-gallery-shortcut__binding"
          ui-event="context"
          controller
          track-ignore
        />
        <span>{{ controller ? $t("ui.photomode.gallery.holdOpen") : $t("ui.photomode.gallery.open") }}</span>
      </Button>
    </div>

    <div v-if="visibleItems.length > 0" class="photomode-gallery-shortcut__strip">
      <PhotomodeGalleryTile
        v-for="item in visibleItems"
        :key="item.id"
        :item="item"
        :focusable="false"
        compact
        @select="emit('open-preview', item)"
      />
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue"
import { BngBinding } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import PhotomodeGalleryTile from "./PhotomodeGalleryTile.vue"

defineOptions({ name: "PhotomodeGalleryShortcut" })

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  controller: {
    type: Boolean,
    default: false,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
  contextHoldActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["open-gallery", "open-preview"])
const MAX_VISIBLE_ITEMS = 4

const visibleItems = computed(() =>
  Array.isArray(props.items)
    ? props.items.filter(item => item?.id).slice(0, MAX_VISIBLE_ITEMS)
    : []
)

function onButtonClick() {
  if (props.controller) return
  emit("open-gallery")
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.photomode-gallery-shortcut {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: min(24rem, calc(100vw - 2rem));
  padding: 0.45rem;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.9);
  pointer-events: auto;
}

.photomode-gallery-shortcut__actions {
  display: flex;
}

.photomode-gallery-shortcut__hold-button {
  --photomode-gallery-hold-delay: 162.5ms;
  --photomode-gallery-hold-fill-duration: 487.5ms;
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;

  --bng-button-min-width: auto;
  --bng-button-margin: 0;
  --bng-button-max-width: none;
  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 0.5em;
  --bng-button-padding-bottom: 0.5em;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

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

  @include modify-focus(var(--bng-corners-1), 0.0rem);

  position: relative;
  isolation: isolate;
  width: 100%;
  overflow: hidden;
  color: rgba(var(--bng-off-white-rgb), 0.94);
  gap: 0.45rem;
  justify-content: flex-start;
  font-weight: 700;
}

.photomode-gallery-shortcut__hold-button::after {
  content: "";
  position: absolute;
  inset: 0.25em;
  z-index: 0;
  border-radius: var(--bng-corners-1);
  background: linear-gradient(90deg, rgba(var(--bng-ter-blue-gray-500-rgb), 0.7) 50%, transparent 50%) 100% 50% / 200% 100% no-repeat;
  opacity: 0;
  pointer-events: none;
  transition: background-position 150ms, opacity 0ms 150ms;
}

.photomode-gallery-shortcut__hold-button.hold-active::after {
  background-position: 0% 50%, 0 0;
  opacity: 1;
  transition:
    opacity 0ms linear var(--photomode-gallery-hold-delay),
    background-position var(--photomode-gallery-hold-fill-duration) linear var(--photomode-gallery-hold-delay);
}

.photomode-gallery-shortcut__binding {
  flex: 0 0 auto;
  min-width: 2.2rem;
}

.photomode-gallery-shortcut__strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
  height: 4rem;
  min-height: 0;
  overflow: hidden;
}

.photomode-gallery-shortcut__strip :deep(.photomode-gallery-tile) {
  height: 100%;
  min-height: 0;
}

.photomode-gallery-shortcut--controller.photomode-gallery-shortcut--expanded {
  width: min(20rem, calc(100vw - 2rem));
}

.photomode-gallery-shortcut--controller .photomode-gallery-shortcut__hold-button {
  --bng-bg-active: var(--bng-cool-gray-750);
  --bng-bg-active-opacity: 0.60;
}

@media (max-width: 900px) {
  .photomode-gallery-shortcut {
    right: 0.65rem;
    bottom: 0.65rem;
    width: min(20rem, calc(100vw - 1.3rem));
  }

  .photomode-gallery-shortcut__strip {
    height: 3.4rem;
  }
}
</style>
