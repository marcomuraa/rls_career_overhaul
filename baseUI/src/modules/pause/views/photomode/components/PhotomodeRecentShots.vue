<template>
  <div
    class="photomode-recent-shots"
  >
    <div class="photomode-recent-shots__actions">
      <Button
        class="photomode-recent-shots__action-button"
        :aria-label="$t('ui.photomode.openScreenshotsFolder')"
        @click="openScreenshotsFolder"
      >
        <BngIcon :type="icons.folder" />
        <span class="photomode-recent-shots__folder-label">{{ $t("ui.photomode.openScreenshotsFolder") }}</span>
      </Button>
      <Button
        class="photomode-recent-shots__action-button"
        :disabled="recentItems.length === 0"
        @click="emit('open-gallery')"
      >
        {{ $t("ui.photomode.gallery.viewAll") }}
      </Button>
    </div>

    <div
      v-if="recentItems.length > 0"
      class="photomode-recent-shots__strip"
      v-bng-scoped-nav="{ type: 'container' , preventNavigationEscape: ['left', 'right', 'up', 'down'] }"
    bng-nav-priority-container
    >
      <div
        v-for="(item, index) in visibleRecentItems"
        :key="item.id"
        class="photomode-recent-shots__tile-card"
      >
        <button
          type="button"
          class="photomode-recent-shots__tile"
          :title="buildTileLabel(item)"
          :bng-scoped-nav-autofocus="index === 0 ? 'true' : null"
          @click="openPreview(item)"
        >
          <div class="photomode-recent-shots__tile-visual">
            <img
              v-if="hasPreview(item)"
              class="photomode-recent-shots__tile-image"
              :src="item.url"
              :alt="buildTileLabel(item)"
              @error="markPreviewFailed(item.id)"
            />

            <div v-else class="photomode-recent-shots__tile-fallback">
              <span class="photomode-recent-shots__tile-fallback-label">{{ getItemLabel(item) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div v-else class="photomode-recent-shots__empty">
      <p class="photomode-recent-shots__empty-title">{{ emptyTitle }}</p>
      <p class="photomode-recent-shots__empty-copy">{{ emptyCopy }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { $translate } from "@/services/translation"
import { lua } from "@/bridge"
import { BngIcon, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { usePhotomodeMediaState } from "../usePhotomodeMediaState"
import { vBngScopedNav } from "@/common/directives"

defineOptions({ name: "PhotomodeRecentShots" })
const emit = defineEmits(["open-preview", "open-gallery"])

const mediaState = usePhotomodeMediaState()
const recentReady = mediaState.recentReady
const recentItems = mediaState.recentItems
const setPreviewTarget = mediaState.setPreviewTarget

const failedPreviewIds = ref({})
const MAX_RECENT_TILES = 6

const visibleRecentItems = computed(() => recentItems.value.slice(0, MAX_RECENT_TILES))

const emptyTitle = computed(() => {
  if (!recentReady.value) return $translate.instant("ui.photomode.recent.loadingShots")
  return $translate.instant("ui.photomode.recent.noShotsYet")
})

const emptyCopy = computed(() => {
  if (!recentReady.value) return $translate.instant("ui.photomode.recent.hydrating")
  return $translate.instant("ui.photomode.recent.takeToPopulate")
})

function getItemLabel(item) {
  return item?.fileName || item?.dateLabel || $translate.instant("ui.photomode.screenshot")
}

function getItemDetail(item) {
  if (item?.dateLabel && item.dateLabel !== item.fileName) return item.dateLabel
  if (item?.source === "job") return $translate.instant("ui.photomode.recent.freshCapture")
  return $translate.instant("ui.photomode.recent.savedScreenshot")
}

function buildTileLabel(item) {
  return $translate.instant("ui.photomode.recent.tileLabel", {
    name: getItemLabel(item),
    detail: getItemDetail(item),
    action: $translate.instant("ui.photomode.recent.selectToPreview"),
  })
}

function hasPreview(item) {
  return Boolean(item?.url) && failedPreviewIds.value[item.id] !== true
}

function markPreviewFailed(itemId) {
  if (!itemId || failedPreviewIds.value[itemId] === true) return
  failedPreviewIds.value = {
    ...failedPreviewIds.value,
    [itemId]: true,
  }
}

function openPreview(item) {
  if (!item?.id) return
  setPreviewTarget(item)
  emit("open-preview", item)
}

async function openScreenshotsFolder() {
  await lua.screenshot.openScreenshotsFolderInExplorer()
}
</script>

<style lang="scss" scoped>
.photomode-recent-shots {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: rgba(var(--bng-off-white-rgb), 0.92);

}

.photomode-recent-shots__actions {
  display: flex;
  gap: 0.35rem;
}

.photomode-recent-shots__action-button {
  flex: 1 1 0;
  --bng-button-margin: 0;
  --bng-button-min-width: 0;
  gap: 0.5rem;

  --bng-bg-enabled: var(--bng-black-o4);
  --bng-bg-hover: var(--bng-orange-600);
  --bng-bg-active: var(--bng-orange-800);
  --bng-bg-disabled: var(--bng-black-o6);
  --bng-bg-enabled-opacity: 1;
  --bng-bg-disabled-opacity: 0.5;
  --bng-bg-border-enabled: var(--bng-cool-gray-600);
  --bng-bg-border-hover: var(--bng-orange-b400);
  --bng-bg-border-active: var(--bng-orange-700);
  --bng-bg-border-disabled: rgba(var(--bng-cool-gray-800-rgb), 0.8);
  --bng-bg-border-width: 0.125rem;
  --bng-bg-border-radius: var(--bng-corners-1);
  --btn-hold-fill: #7D9FB588 40%, #7D9FB5 50%, transparent 50%;
}

.photomode-recent-shots__folder-label {
  font-weight: 700;
}

.photomode-recent-shots__empty {
  display: flex;
  flex-direction: column;
}

.photomode-recent-shots__empty-title,
.photomode-recent-shots__empty-copy {
  margin: 0;
}

.photomode-recent-shots__strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.25em;
  min-width: 0;
  padding: 0.25em;
}

.photomode-recent-shots__tile-card {
  position: relative;
  min-width: 0;
}

.photomode-recent-shots__tile {
  --bng-bg-enabled: var(--bng-black-o4);
  --bng-bg-hover: var(--bng-orange-600);
  --bng-bg-active: var(--bng-orange-800);
  --bng-bg-enabled-opacity: 1;
  --bng-bg-border-enabled: var(--bng-cool-gray-600);
  --bng-bg-border-hover: var(--bng-orange-b400);
  --bng-bg-border-active: var(--bng-orange-700);
  --bng-bg-border-width: 0.125rem;
  --bng-bg-border-radius: var(--bng-corners-1);

  width: 100%;
  box-sizing: border-box;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  padding: 0.15rem;
  border: 0;
  border-radius: var(--bng-bg-border-radius);
  background: var(--bng-bg-enabled);
  cursor: pointer;
  text-align: left;
}

.photomode-recent-shots__tile:hover,
.photomode-recent-shots__tile:focus-visible {
  background: var(--bng-bg-hover);
  box-shadow: inset 0 0 0 var(--bng-bg-border-width) var(--bng-bg-border-hover);
}

.photomode-recent-shots__tile:active {
  background: var(--bng-bg-active);
  box-shadow: inset 0 0 0 var(--bng-bg-border-width) var(--bng-bg-border-active);
}

.photomode-recent-shots__tile:focus-visible {
  outline: 2px solid rgba(var(--bng-orange-b400-rgb), 0.65);
  outline-offset: 1px;
}

.photomode-recent-shots__tile-visual {
  position: relative;
  overflow: hidden;
  border-radius: var(--bng-corners-1);
  aspect-ratio: 1 / 1;
  background: rgba(var(--bng-off-black-rgb), 0.3);
}

.photomode-recent-shots__tile-image,
.photomode-recent-shots__tile-fallback {
  width: 100%;
  height: 100%;
}

.photomode-recent-shots__tile-image {
  display: block;
  object-fit: cover;
}

.photomode-recent-shots__tile-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem;
  background:
    linear-gradient(180deg, rgba(var(--bng-off-white-rgb), 0.08), rgba(var(--bng-off-white-rgb), 0.03)),
    rgba(var(--bng-off-black-rgb), 0.45);
  text-align: center;
}

.photomode-recent-shots__tile-fallback-label {
  display: block;
  font-size: 0.68rem;
  line-height: 1.2;
  color: rgba(var(--bng-off-white-rgb), 0.72);
  word-break: break-word;
}

.photomode-recent-shots__empty {
  gap: 0.18rem;
}

.photomode-recent-shots__empty-title {
  font-size: 0.82rem;
  color: rgba(var(--bng-off-white-rgb), 0.88);
}

.photomode-recent-shots__empty-copy {
  font-size: 0.76rem;
  color: rgba(var(--bng-off-white-rgb), 0.6);
}
</style>
