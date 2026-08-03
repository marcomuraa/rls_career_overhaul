<template>
  <div
    class="grid-content"
    :class="{ 'highlight-active-item': highlightActiveItem, 'dim-non-active-items': dimNonActiveItems && highlightActiveItem }">
    <BngList
      v-if="hasTiles"
      ref="gridListRef"
      big
      immediate
      :nav-scroll-enabled="navScrollEnabled"
      :keep-alive="500"
      :layout="LIST_LAYOUTS.TILES" no-background
      class="grid-list"
      :title-width="20" :title-height="1.5" :title-margin="0.5"
      :tile-size-calc="tileSizeCalc"
    >
      <!-- NOTE: only vue components will be rendered correctly -->

      <template v-for="group in limitedGroups" :key="group.label">
        <GroupHeader v-if="group.label" :label="group.label" bng-list-title />
        <Tile
          v-for="tile in group.tiles"
          :key="tile.key"
          :tile="tile"
          :show-sub-element-count="showSubElementCount"
          :display-size="displaySize"
          :is-favourite="group.label === 'Favourites'"
          :tile-images-top-aligned="tileImagesTopAligned"
          :disabled="tile.disabled"
          :disabled-reason="tile.disabledReason"
          :sound-class="soundClass"
          @focus="$emit('focus-item', tile)"
          @click="$emit('select-item', tile)"
          @dblclick="$emit('double-click-item', tile)"
        />
      </template>
    </BngList>
    <span v-if="showEmptyState" class="grid-empty-label">{{ $t("ui.menu.gridSelector.emptyData") }}</span>
    <div v-if="showLoadingIndicator" class="grid-loading">
      <BngProgressBar
        class="grid-loading-progress"
        :value="loadingPercent >= 0 ? loadingPercent : 0"
        :max="100"
        :show-value-label="false"
        :indeterminate="loadingPercent < 0"
      />
      <span v-if="showLoadingProgressText" class="grid-loading-progress-text">
        {{ loadingProgressText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted, provide } from "vue"
import { BngList, LIST_LAYOUTS, BngProgressBar } from "@/common/components/base"
import { useStreams } from "@/services/events"
import { $translate } from "@/services/translation"
import Tile from "./Tile.vue"
import GroupHeader from "./GroupHeader.vue"
import { gridTileStateKey } from "./tileState"
import { hasRenderableTiles } from "../composables/gridSelectorHelpers"
import { debounce } from "@/utils/rateLimit"

const asyncBulkLoaderStreamName = "asyncBulkLoaderProgress"

const props = defineProps({
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
  showSubElementCount: {
    type: Boolean,
    default: true,
  },
  displaySize: {
    type: String,
    default: "medium",
    validator: value => ["tiny", "small", "medium", "large", "huge", "list"].includes(value),
  },
  highlightActiveItem: {
    type: Boolean,
    default: false,
  },
  dimNonActiveItems: {
    type: Boolean,
    required: false,
  },
  tileImagesTopAligned: {
    type: Boolean,
    default: false
  },
  soundClass: {
    type: String,
    default: "bng_main_selector",
  },
  navScrollEnabled: {
    type: Boolean,
    default: false,
  },
})

// autoFocusKey and activeItem are now passed as props

defineEmits(["select-item", "focus-item", "double-click-item"])

// Provide volatile tile state via injection so Tile.vue can read it without
// causing BngList to detect slot changes when only the selection/autofocus
// state changes. This prevents the loading state from flashing during
// active-item transitions.
provide(gridTileStateKey, {
  activeItemKey: computed(() => props.activeItem?.key ?? null),
  autoFocusKey: computed(() => props.autoFocusKey),
  highlightActiveItem: computed(() => props.highlightActiveItem),
})

const gridListRef = ref()
const containerWidth = ref(0)
const baseFontSize = ref(16)
const asyncBulkLoaderProgress = ref({
  count: 0,
  total: 0,
  inProgress: false,
  percent: -1,
})

const tileSizeCalc = ctx => Tile.getSizeCalc(props.displaySize)(ctx)
const hasTiles = computed(() => hasRenderableTiles(props.groups))
const showLoadingState = computed(() => props.loading && !hasTiles.value)
const showEmptyState = computed(() => !props.loading && !hasTiles.value)
const showLoadingIndicator = computed(() => props.loading && (hasTiles.value || showLoadingState.value))
const loadingPercent = computed(() => {
  const rawPercent = asyncBulkLoaderProgress.value.percent
  if (typeof rawPercent !== "number" || !Number.isFinite(rawPercent)) {
    return -1
  }
  return rawPercent
})
const showDelayedLoadingProgress = ref(false)
const loadingProgressText = computed(() => {
  if (loadingPercent.value >= 0) {
    return `${loadingPercent.value}%`
  }
  const count = Number(asyncBulkLoaderProgress.value.count) || 0
  const total = Number(asyncBulkLoaderProgress.value.total) || 0
  if (total <= 0) return $translate.instant("ui.menu.gridSelector.loadingProgressTextTakingLongerThanExpected")
  return `${count} / ${total}`
})
const showLoadingProgressText = computed(() => {
  if (loadingPercent.value >= 0) {
    return props.loading
  }
  return showDelayedLoadingProgress.value && props.loading && !!loadingProgressText.value
})

useStreams([asyncBulkLoaderStreamName], streams => {
  if (!Object.prototype.hasOwnProperty.call(streams, asyncBulkLoaderStreamName)) return
  const payload = streams[asyncBulkLoaderStreamName] || {}
  const rawPercent = payload.percent
  const percent = typeof rawPercent === "number" && Number.isFinite(rawPercent) ? rawPercent : -1
  asyncBulkLoaderProgress.value = {
    count: Number(payload.count) || 0,
    total: Number(payload.total) || 0,
    inProgress: !!payload.inProgress,
    percent,
  }
})

// Calculate max tiles per group based on container width
const maxTilesPerRow = computed(() => {
  if (!containerWidth.value) return Infinity

  // Get tile dimensions from Tile.getSizeCalc (returns values in rem)
  const size = Tile.getSizeCalc(props.displaySize)({})
  // Convert rem to pixels: tile width + gap between tiles
  const tileWidthRem = size.width + size.margin
  const tileWidthPx = tileWidthRem * baseFontSize.value
  const tilesPerRow = Math.floor(containerWidth.value / tileWidthPx) || 1

  // For list mode, allow 2 rows of tiles
  const rowCount = props.displaySize === 'list' ? 2 : 1
  return tilesPerRow * rowCount
})

// Limit tiles in each group based on calculated max
const limitedGroups = computed(() => {
  if (!props.groups || props.groups.length === 0) return []
  return props.groups.map(group => ({
    ...group,
    tiles: group.isRecentGroup ? group.tiles.slice(0, maxTilesPerRow.value) : group.tiles
  }))
})

// Map autoFocusKey to its flattened BngList item index. Group headers are
// rendered as list items before their tiles, so they must be included in the
// running index to match the slot order BngList sees.
function getAutoFocusItemIndex(key) {
  if (!key) return -1
  let index = 0
  if (!limitedGroups.value || limitedGroups.value.length === 0) return -1
  for (const group of limitedGroups.value) {
    if (group.label) index += 1
    for (const tile of group.tiles) {
      if (tile.key === key) return index
      index += 1
    }
  }
  return -1
}

async function scrollToAutoFocusTile() {
  const key = props.autoFocusKey
  if (!key) return null
  await nextTick()
  const index = getAutoFocusItemIndex(key)
  if (index < 0) return null
  const list = gridListRef.value
  if (!list?.scrollToIndex) return null
  return await list.scrollToIndex(index)
}

async function scrollToTop() {
  const list = gridListRef.value
  if (!list?.scrollToIndex) return null
  return await list.scrollToIndex(0)
}

defineExpose({
  scrollToAutoFocusTile,
  scrollToTop,
})

// Update container width and base font size
const updateContainerWidth = () => {
  if (gridListRef.value?.$el) {
    containerWidth.value = gridListRef.value.$el.clientWidth
    // Get the root font size for rem calculations
    const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize)
    baseFontSize.value = rootFontSize || 16
  }
}

let resizeObserver
let loadingProgressDelayTimeout = null

function teardownResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

function teardownLoadingProgressDelay() {
  if (loadingProgressDelayTimeout !== null) {
    clearTimeout(loadingProgressDelayTimeout)
    loadingProgressDelayTimeout = null
  }
}

function setupLoadingProgressDelay() {
  teardownLoadingProgressDelay()
  showDelayedLoadingProgress.value = false
  if (!props.loading) return

  loadingProgressDelayTimeout = setTimeout(() => {
    loadingProgressDelayTimeout = null
    showDelayedLoadingProgress.value = props.loading
  }, 3000)
}

async function setupResizeObserver() {
  if (props.loading) return
  await nextTick()
  if (props.loading || !gridListRef.value?.$el) return
  teardownResizeObserver()
  resizeObserver = new ResizeObserver(debounce(updateContainerWidth, 100))
  resizeObserver.observe(gridListRef.value.$el)
  updateContainerWidth()
}

watch(() => props.loading, loading => {
  setupLoadingProgressDelay()
  if (loading) {
    teardownResizeObserver()
  } else {
    setupResizeObserver()
  }
}, { immediate: true })

watch(() => props.displaySize, async () => {
  await nextTick()
  gridListRef.value?.refresh?.()
  updateContainerWidth()
})

onUnmounted(() => {
  teardownResizeObserver()
  teardownLoadingProgressDelay()
})
</script>

<style lang="scss" scoped>
.grid-content {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;

  &::before {
    display: none !important;
  }

  &:not(.highlight-active-item) {
    :deep(.tile.selected),
    :deep(.tile.focus-visible),
    :deep(.tile:focus-visible) {
      transform: none;
      z-index: auto;
    }
  }

  &.dim-non-active-items {
    :deep(.tile-wrapper:not(.is-active-item) .tile:not(:hover)) {
      opacity: 0.5;
    }
  }
}

.grid-list {
  width: 100%;
  height: 100%;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.1);
}

.grid-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(24rem, 60%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.grid-loading-progress {
  width: 100%;
}

.grid-loading-progress-text {
  color: var(--bng-off-white);
  font-size: 1rem;
  font-weight: 800;
  text-shadow: 0 0 0.25rem #000;
}

.grid-empty-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--bng-off-white);
  font-size: 2em;
  font-weight: 800;
}
</style>
