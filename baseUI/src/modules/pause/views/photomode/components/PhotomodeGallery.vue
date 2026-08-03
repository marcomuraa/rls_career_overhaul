<template>
  <section
    v-bng-scoped-nav="galleryScopeBinding"
    class="photomode-gallery"
    tabindex="-1"
    v-bng-on-ui-nav:back="handleCloseNav"
    v-bng-on-ui-nav:tab_l.down="startShowNewerHold"
    v-bng-on-ui-nav:tab_l.up="stopCycleHold"
    v-bng-on-ui-nav:tab_r.down="startShowOlderHold"
    v-bng-on-ui-nav:tab_r.up="stopCycleHold"
    @activate="onScopeActivate"
    @deactivate="onScopeDeactivate"
  >
    <aside class="photomode-gallery__sidebar">
      <section class="photomode-gallery__panel photomode-gallery__panel--actions">
        <Background class="photomode-gallery__panel-bg" />
        <div class="photomode-gallery__actions">
          <Button
            class="photomode-gallery__button photomode-gallery__close"
            bng-scoped-nav-autofocus="true"
            @click="emit('close')"
          >
            <BngBinding
              v-if="controller"
              class="photomode-gallery__binding"
              ui-event="back"
              controller
              track-ignore
            />
            {{ $t("ui.photomode.previewClose") }}
          </Button>

          <Button
            class="photomode-gallery__button"
            @click="emit('show-in-explorer')"
          >
            {{ $t("ui.photomode.previewShowInExplorer") }}
          </Button>
          <Button
            v-if="showOpenShareUrlAction"
            class="photomode-gallery__button"
            :disabled="!canOpenShareUrl"
            @click="emit('open-share-url')"
          >
            {{ $t("ui.photomode.openOnWeb") }}
          </Button>
          <Button
            v-for="action in metadataPresetActions"
            :key="action.key"
            class="photomode-gallery__button"
            :class="{ 'photomode-gallery__button--preset-loaded': action.loaded }"
            @click="emit('load-presets-from-metadata', action.key)"
          >
            <span class="photomode-gallery__button-label">{{ action.label }}</span>
            <span
              v-if="action.loaded"
              class="photomode-gallery__preset-loaded-indicator"
              aria-hidden="true"
            >
              <BngIcon :type="icons.checkmark" />
            </span>
          </Button>
        </div>
      </section>

      <section
        class="photomode-gallery__panel photomode-gallery__panel--metadata"
        bng-no-child-nav="true"
      >
        <Background class="photomode-gallery__panel-bg" />
        <BngCardHeading
          id="photomode-gallery-title"
          class="photomode-gallery__title"
          type="ribbon"
          outline
        >
          {{ $t("ui.photomode.gallery.metadata") }}
        </BngCardHeading>
        <dl class="photomode-gallery__metadata-list">
          <div class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.photomode.screenshot") }}</dt>
            <dd>{{ fileNameLabel }}</dd>
          </div>
          <div v-if="dateLabel" class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.common.order.date") }}</dt>
            <dd>{{ dateLabel }}</dd>
          </div>
          <div v-if="levelLabel" class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.menu.gameplaySelector.propName.level") }}</dt>
            <dd>{{ levelLabel }}</dd>
          </div>
          <div v-if="playerNameLabel" class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.photomode.playerName") }}</dt>
            <dd>{{ playerNameLabel }}</dd>
          </div>
          <div v-if="resolutionLabel" class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.options.graphics.resolution") }}</dt>
            <dd>{{ resolutionLabel }}</dd>
          </div>
          <div v-if="timeOfDayLabel" class="photomode-gallery__metadata-row">
            <dt>{{ $t("ui.photomode.scene.time") }}</dt>
            <dd>{{ timeOfDayLabel }}</dd>
          </div>
        </dl>
        <div
          v-if="presetToast"
          :key="presetToast.id"
          class="photomode-gallery__metadata-toast"
          role="status"
          aria-live="polite"
        >
          {{ $t(presetToast.translationKey, {
            presetName: presetToast.presetName,
            tabName: $t(presetToast.tabLabelKey),
          }) }}
        </div>
      </section>
    </aside>

    <main
      class="photomode-gallery__panel photomode-gallery__panel--preview"
      bng-no-child-nav="true"
    >
      <Background class="photomode-gallery__panel-bg" />
      <div class="photomode-gallery__preview">
        <div class="photomode-gallery__stage">
          <Button
            v-if="canNavigate"
            class="photomode-gallery__nav photomode-gallery__nav-button photomode-gallery__button"
            bng-no-nav="true"
            :nav-item="false"
            :tab-index="-1"
            :aria-label="$t('ui.photomode.previewNewer')"
            @click="showNewerOnce"
          >
            <BngIcon :type="icons.arrowLargeLeft" />
            <BngBinding
              v-if="controller"
              class="photomode-gallery__binding"
              ui-event="tab_l"
              controller
              track-ignore
            />
          </Button>

          <AspectRatio
            class="photomode-gallery__viewer"
            :ratio="'16:9'"
            :slot-scroll="false"
          >
            <div class="photomode-gallery__viewer-content">
              <img
                v-if="hasImage"
                class="photomode-gallery__image"
                :src="item.url"
                :alt="fileNameLabel"
                @load="onImageLoad"
                @error="previewFailed = true"
              />

              <div v-else class="photomode-gallery__fallback">
                <span class="photomode-gallery__fallback-label">{{ fileNameLabel }}</span>
              </div>
            </div>
          </AspectRatio>

          <Button
            v-if="canNavigate"
            class="photomode-gallery__nav photomode-gallery__nav-button photomode-gallery__button"
            bng-no-nav="true"
            :nav-item="false"
            :tab-index="-1"
            :aria-label="$t('ui.photomode.previewOlder')"
            @click="showOlderOnce"
          >
            <BngIcon :type="icons.arrowLargeRight" />
            <BngBinding
              v-if="controller"
              class="photomode-gallery__binding"
              ui-event="tab_r"
              controller
              track-ignore
            />
          </Button>
        </div>

        <div v-if="canShowFilmstrip" class="photomode-gallery__filmstrip">
          <BngList
            ref="filmstripList"
            class="photomode-gallery__filmstrip-list"
            :layout="LIST_LAYOUTS.RIBBON"
            big
            immediate
            no-background
            :keep-alive="80"
            :tile-width="7"
            :tile-height="4.4"
            :tile-margin="0.25"
          >
            <PhotomodeGalleryTile
              v-for="filmstripItem in galleryItems"
              :key="filmstripItem.id"
              :item="filmstripItem"
              :selected="filmstripItem.id === item?.id"
              :autofocus="filmstripInteractive && filmstripItem.id === item?.id"
              :interactive="filmstripInteractive"
              :focusable="false"
              compact
              @select="selectFilmstripItem(filmstripItem)"
            />
          </BngList>
        </div>
      </div>
    </main>
  </section>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue"
import { $translate } from "@/services/translation"
import { BngBinding, BngCardHeading, BngIcon, BngList, LIST_LAYOUTS, icons } from "@/common/components/base"
import { AspectRatio, Background, Button } from "@/common/components/utility"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { SCROLL_EVENT_H, SCROLL_EVENT_V } from "@/services/crossfire"
import PhotomodeGalleryTile from "./PhotomodeGalleryTile.vue"

defineOptions({ name: "PhotomodeGallery" })

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  previewIndex: {
    type: Number,
    default: -1,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],
  },
  shareUrlAction: {
    type: Object,
    default: () => ({}),
  },
  controller: {
    type: Boolean,
    default: false,
  },
  scopeId: {
    type: String,
    default: "photomode-gallery",
  },
  filmstripInteractive: {
    type: Boolean,
    default: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  presetToast: {
    type: Object,
    default: null,
  },
  loadedPresetTypes: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits([
  "close",
  "show-older",
  "show-newer",
  "show-in-explorer",
  "open-share-url",
  "load-presets-from-metadata",
  "select-preview",
])

const navBlocker = useUINavBlocker()
const previewFailed = ref(false)
const imageDimensions = ref(null)
const filmstripList = ref(null)
const CYCLE_HOLD_REPEAT_DELAY_MS = 330
const CYCLE_HOLD_REPEAT_INTERVAL_MS = 180
let cycleHoldDelayId = null
let cycleHoldIntervalId = null
let cycleHoldEventName = null
let scrollFilmstripOnNextItemChange = false
const METADATA_PRESET_TYPES = Object.freeze([
  {
    key: "camera",
    labelKey: "ui.photomode.loadCameraPresetFromMetadata",
  },
  {
    key: "scene",
    labelKey: "ui.photomode.loadScenePresetFromMetadata",
  },
  {
    key: "effects",
    labelKey: "ui.photomode.loadEffectsPresetFromMetadata",
  },
])

const galleryScopeBinding = computed(() => ({
  scopeId: props.scopeId || "photomode-gallery",
  type: "container",
  activated: props.active,
  open: props.active,
  preferAutoFocus: true,
  trapPolicy: "always",
  canDeactivate: () => false,
  bubbleWhitelistEvents: ["menu", "action_4"],
}))

const canNavigate = computed(() => props.totalCount > 1)
const galleryItems = computed(() => Array.isArray(props.items) ? props.items.filter(galleryItem => galleryItem?.id) : [])
const canShowFilmstrip = computed(() => galleryItems.value.length > 1)
const hasImage = computed(() => Boolean(props.item?.url) && previewFailed.value !== true)
const hasShareUrl = computed(() => Boolean(props.item?.shareUrl))
const showOpenShareUrlAction = computed(() =>
  hasShareUrl.value && props.shareUrlAction?.visible === true
)
const canOpenShareUrl = computed(() =>
  showOpenShareUrlAction.value && props.shareUrlAction?.enabled === true
)
const metadataPresets = computed(() => {
  const presets = props.item?.metadata?.photomodePresets
  return presets && typeof presets === "object" ? presets : null
})
const metadataPresetActions = computed(() =>
  METADATA_PRESET_TYPES
    .filter(action => metadataPresets.value?.[action.key])
    .map(action => ({
      ...action,
      label: $translate.instant(action.labelKey),
      loaded: props.loadedPresetTypes?.[action.key] === true,
    }))
)
const canLoadPresetsFromMetadata = computed(() =>
  metadataPresetActions.value.length > 0
)
const fileNameLabel = computed(() =>
  props.item?.fileName || props.item?.dateLabel || $translate.instant("ui.photomode.screenshot")
)
const dateLabel = computed(() => props.item?.dateLabel || "")
const levelLabel = computed(() => {
  const levelPath = props.item?.openMap?.level || props.item?.metadata?.level || ""
  return levelNameFromPath(levelPath)
})
const playerNameLabel = computed(() => props.item?.metadata?.playerName || props.item?.metadata?.steamPlayerName || "")
const resolutionLabel = computed(() => {
  const dimensions = imageDimensions.value
  if (!dimensions?.width || !dimensions?.height) return ""
  return `${dimensions.width} x ${dimensions.height}`
})
const timeOfDayLabel = computed(() => {
  const metadataTime = props.item?.metadata?.timeOfDay ?? props.item?.metadata?.tod?.time
  return formatTimeOfDay24h(metadataTime ?? props.item?.openMap?.timeOfDay)
})
const previewCountLabel = computed(() => {
  if (props.totalCount <= 0) return ""
  const humanIndex = props.previewIndex >= 0 ? props.previewIndex + 1 : 1
  return $translate.instant("ui.photomode.previewCount", {
    index: humanIndex,
    total: props.totalCount,
  })
})

watch(() => props.item?.id, itemId => {
  previewFailed.value = false
  imageDimensions.value = null
  if (scrollFilmstripOnNextItemChange) {
    scrollFilmstripOnNextItemChange = false
    scrollFilmstripToItem(itemId)
  }
}, { immediate: true })

onMounted(() => {
  document.addEventListener("keydown", onKeydown)
})

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown)
  stopCycleHold()
  navBlocker.clear()
})

function onScopeActivate() {
  navBlocker.allowOnly(["ok", "back", "menu", "tab_l", "tab_r", "focus_u", "focus_d", "focus_l", "focus_r", "focus_ud", "focus_lr", "action_4", SCROLL_EVENT_H, SCROLL_EVENT_V])
}

function onScopeDeactivate() {
  stopCycleHold()
  navBlocker.clear()
}

function handleCloseNav() {
  emit("close")
  return false
}

function emitCycleEvent(eventName) {
  if (!canNavigate.value) return false
  scrollFilmstripOnNextItemChange = true
  emit(eventName)
  return true
}

function showNewerOnce() {
  emitCycleEvent("show-newer")
}

function showOlderOnce() {
  emitCycleEvent("show-older")
}

function startCycleHold(eventName) {
  if (!canNavigate.value) return false
  if (cycleHoldEventName === eventName) return false

  stopCycleHold()
  cycleHoldEventName = eventName
  emitCycleEvent(eventName)

  if (typeof window !== "undefined") {
    cycleHoldDelayId = window.setTimeout(() => {
      cycleHoldDelayId = null
      cycleHoldIntervalId = window.setInterval(() => {
        emitCycleEvent(eventName)
      }, CYCLE_HOLD_REPEAT_INTERVAL_MS)
    }, CYCLE_HOLD_REPEAT_DELAY_MS)
  }

  return false
}

function startShowNewerHold() {
  return startCycleHold("show-newer")
}

function startShowOlderHold() {
  return startCycleHold("show-older")
}

function stopCycleHold() {
  if (typeof window !== "undefined") {
    if (cycleHoldDelayId != null) {
      window.clearTimeout(cycleHoldDelayId)
    }
    if (cycleHoldIntervalId != null) {
      window.clearInterval(cycleHoldIntervalId)
    }
  }
  cycleHoldDelayId = null
  cycleHoldIntervalId = null
  cycleHoldEventName = null
  return false
}

function onImageLoad(event) {
  const image = event?.target
  const width = Math.round(Number(image?.naturalWidth) || 0)
  const height = Math.round(Number(image?.naturalHeight) || 0)
  imageDimensions.value = width > 0 && height > 0 ? { width, height } : null
}

function scrollFilmstripToItem(itemId) {
  if (!itemId || !canShowFilmstrip.value) return

  void nextTick(() => {
    const index = galleryItems.value.findIndex(filmstripItem => filmstripItem?.id === itemId)
    if (index < 0) return

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        void filmstripList.value?.scrollToIndex?.(index)
      })
      return
    }
    void filmstripList.value?.scrollToIndex?.(index)
  })
}

function selectFilmstripItem(filmstripItem) {
  if (!props.filmstripInteractive) return
  if (!filmstripItem?.id) return
  emit("select-preview", filmstripItem)
}

function onKeydown(event) {
  if (!props.active) return

  if (event.key === "Escape") {
    event.preventDefault()
    emit("close")
    return
  }

  if (!canNavigate.value) return

  if (event.key === "ArrowLeft") {
    event.preventDefault()
    showNewerOnce()
    return
  }

  if (event.key === "ArrowRight") {
    event.preventDefault()
    showOlderOnce()
  }
}

function levelNameFromPath(levelPath) {
  const normalizedPath = String(levelPath || "").replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalizedPath) return ""
  const levelMatch = /^levels\/([^/]+)\//i.exec(normalizedPath)
  if (levelMatch?.[1]) return levelMatch[1]
  const pathParts = normalizedPath.split("/").filter(Boolean)
  if (pathParts.length >= 2) return pathParts[pathParts.length - 2]
  return (pathParts[0] || "").replace(/\.level\.json$/i, "")
}

function formatTimeOfDay24h(timeValue) {
  const numericValue = Number(timeValue)
  if (!Number.isFinite(numericValue)) return ""

  let seconds = ((numericValue + 0.5) % 1) * 86400
  if (seconds < 0) seconds += 86400
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60 - (hours * 60))
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.photomode-gallery {
  position: relative;
  box-sizing: border-box;
  z-index: 1;
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  width: 100%;
  gap: 0.75rem;
  color: rgba(var(--bng-off-white-rgb), 0.94);
  overflow: hidden;
  pointer-events: auto;
}

.photomode-gallery__sidebar,
.photomode-gallery__preview,
.photomode-gallery__panel,
.photomode-gallery__actions,
.photomode-gallery__metadata-list,
.photomode-gallery__metadata-row {
  display: flex;
}

.photomode-gallery__sidebar,
.photomode-gallery__preview,
.photomode-gallery__panel,
.photomode-gallery__actions,
.photomode-gallery__metadata-list {
  flex-direction: column;
}

.photomode-gallery__sidebar {
  flex: 0 0 clamp(14rem, 19vw, 18rem);
  min-width: 0;
  min-height: 0;
  height: 100%;
  gap: 0.75rem;
}

.photomode-gallery__preview {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  gap: 0.55rem;
}

.photomode-gallery__panel {
  position: relative;
  isolation: isolate;
  min-width: 0;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  pointer-events: auto;
}

.photomode-gallery__panel--actions {
  flex: 0 0 auto;
}

.photomode-gallery__panel--metadata {
  flex: 1 1 0;
  min-height: 0;
  padding: 0.5rem;
}

.photomode-gallery__panel--preview {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  padding: 0.5rem;
}

.photomode-gallery__panel-bg {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: absolute;
  inset: 0;
  z-index: -1;
}

.photomode-gallery__title {
  flex: 0 0 auto;
  margin: 0;
  margin-left: -0.5rem;
  --bng-card-heading-ribbon-color: var(--bng-cool-gray-700);
  font-size: 1.25rem;
  line-height: 1.625rem;
  font-weight: 700;
  word-break: break-word;
}

.photomode-gallery__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  justify-items: center;
  gap: 0.75rem;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.photomode-gallery__viewer {
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  min-height: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--bng-corners-2);
}

.photomode-gallery__viewer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.photomode-gallery__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--bng-corners-2);
}

.photomode-gallery__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 1rem;
  text-align: center;
}

.photomode-gallery__fallback-label {
  font-size: 0.95rem;
  line-height: 1.3;
  color: rgba(var(--bng-off-white-rgb), 0.72);
  word-break: break-word;
}

.photomode-gallery__nav {
  align-self: center;
}

.photomode-gallery__button {
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;
  --bng-button-min-width: auto;
  --bng-button-margin: 0.25em;
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

  gap: 0.5em;
  justify-content: flex-start;
  font-weight: 700;
}

.photomode-gallery__button-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photomode-gallery__button--preset-loaded {
  --bng-content-justify: flex-start;
}

.photomode-gallery__preset-loaded-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 1.15rem;
  height: 1.15rem;
  margin-left: auto;
  border-radius: 50%;
  background: var(--bng-add-green-700);
  color: var(--bng-off-white);
  --bng-icon-size: 0.72rem;
}

.photomode-gallery__binding {
  flex: 0 0 auto;
}

.photomode-gallery__actions {
  min-width: 0;
  padding: 0.25rem;
  gap: 0;
}

.photomode-gallery__nav-button {
  width: 3rem;
  --bng-button-padding: 0;
  --bng-content-flow: column;
  --bng-content-align: center;
  --bng-content-justify: center;
  --bng-icon-size: 1.6rem;
  gap: 0.2rem;
}

.photomode-gallery__filmstrip {
  flex: 0 0 6rem;
  min-height: 0;
  overflow: hidden;
  padding: 0.35rem 0.4rem 0.4rem;
  border-radius: var(--bng-corners-1);

}

.photomode-gallery__filmstrip-list {
  height: 100%;
  --list-skeleton-color: rgba(var(--bng-off-white-rgb), 0.12);
}

.photomode-gallery__metadata-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  margin: 0.5rem 0 0;
  gap: 0.35rem;
}

.photomode-gallery__metadata-toast {
  flex: 0 0 auto;
  margin-top: 0.5rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-add-green-700-rgb), 0.86);
  color: rgba(var(--bng-off-white-rgb), 0.96);
  font-size: 0.78rem;
  line-height: 1.25;
  font-weight: 700;
  box-shadow: inset 0 0 0 0.0625rem rgba(var(--bng-off-white-rgb), 0.14);
  overflow-wrap: anywhere;
}

.photomode-gallery__metadata-row {
  min-width: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.photomode-gallery__metadata-row dt,
.photomode-gallery__metadata-row dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photomode-gallery__metadata-row dt {
  color: rgba(var(--bng-off-white-rgb), 0.62);
  font-size: 0.8rem;
  font-weight: 300;
  text-transform: uppercase;
}

.photomode-gallery__metadata-row dd {
  color: rgba(var(--bng-off-white-rgb), 0.92);
  font-size: 0.9rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

@media (max-height: 700px) {
  .photomode-gallery {
    gap: 0.5rem;
    padding: 0.65rem;
  }

  .photomode-gallery__filmstrip {
    flex-basis: 4.8rem;
    padding: 0.3rem 0.35rem 0.4rem;
  }
}
</style>
