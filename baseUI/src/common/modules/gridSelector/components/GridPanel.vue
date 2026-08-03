<template>
  <div
    class="grid-wrapper"
    :class="{ active: activeSectionScope === 'grid' }">
    <BlurBackground />
    <div
      class="header-row"
      :class="{
        active: activeSectionScope === 'grid' &&
        showIfController,
        'no-controller': !showIfController
      }">
      <BngScreenHeadingV2 type="2" class="header-title-v2">
        {{ screenHeaderTitle }}
        <BngBinding
          v-show="canSwitchDetails && showIfController && activeSectionScope === 'details'"
          class="header-context-binding"
          ui-event="context"
          controller
          track-ignore
        />
      </BngScreenHeadingV2>
    </div>
    <Grid
      :highlight-active-item="inDetails"
      :dim-non-active-items="showIfController"
      :display-size="displaySize"
      :auto-focus-key="autoFocusKey"
      :active-item="activeItem"
      :groups="groups"
      :loading="loading"
      :tile-images-top-aligned="tileImagesTopAligned"
      @focus-item="$emit('focus-item', $event)"
      @select-item="$emit('select-item', $event)"
      @deselect-item="$emit('deselect-item')"
      @double-click-item="$emit('double-click-item', $event)"
    />
  </div>
</template>

<script setup>
import { BngBinding, BngScreenHeadingV2 } from "@/common/components/base"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import Grid from "./Grid.vue"

defineProps({
  screenHeaderTitle: {
    type: String,
    required: true,
  },
  activeSectionScope: {
    type: String,
    required: true,
  },
  showIfController: {
    type: Boolean,
    required: true,
  },
  canSwitchDetails: {
    type: Boolean,
    required: true,
  },
  inDetails: {
    type: Boolean,
    required: true,
  },
  displaySize: {
    type: String,
    required: true,
  },
  autoFocusKey: {
    type: String,
    default: null,
  },
  activeItem: {
    type: Object,
    default: null,
  },
  groups: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  tileImagesTopAligned: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  "focus-item",
  "select-item",
  "deselect-item",
  "double-click-item",
])
</script>

<style scoped lang="scss">
.grid-wrapper {
  flex: 1 1 75%;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0.5rem;
  overflow: hidden;
}

.header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.25);
  --bng-heading-background-opacity: 0;
  min-height: 3.6rem;
  flex: 0 0 auto;

  &.active {
    background-color: rgba(0, 0, 0, 0.75);
  }

  &.no-controller {
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.header-title-v2 {
  flex: 1 1 auto;
  min-width: 0;

  :deep(.header > h1) {
    font-weight: 1000 !important;
  }
}

.header-context-binding {
  flex: 0 0 auto;
  padding-right: 0.5rem;
  padding-left: 0.5rem;
  align-self: center;
  --bng-icon-size: 1.5rem;
  text-shadow: 0 0 0.25rem #0008;
}

</style>
