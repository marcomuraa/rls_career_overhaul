<template>
  <div class="overlay-layer-edit-form">
    <div class="overlay-layer-edit-form__section">
      <label class="overlay-layer-edit-form__label">{{ isUiApp ? $t("ui.photomode.overlay.uiApp") : $t("ui.photomode.overlay.image") }}</label>
      <BngDropdownContainer
        v-model:opened="pickerOpen"
        class="overlay-layer-edit-form__dropdown"
      >
        <template #display>
          <span class="overlay-layer-edit-form__dropdown-display">
            <img
              v-if="selectedPreviewUrl"
              class="overlay-layer-edit-form__dropdown-thumb"
              :src="selectedPreviewUrl"
              alt=""
            />
            <span class="overlay-layer-edit-form__dropdown-name">
              {{ selectedLabel || $t("ui.photomode.overlay.noneSelected") }}
            </span>
          </span>
        </template>

        <div class="overlay-layer-edit-form__dropdown-panel">
          <template v-if="isUiApp">
            <BngList
              class="overlay-layer-edit-form__tiles"
              :tile-width="8"
              :tile-margin="0.3"
            >
              <BngImageTile
                class="overlay-layer-edit-form__tile"
                :class="{ 'overlay-layer-edit-form__tile--active': (model.uiapp || '') === '' }"
                :label="$t('ui.photomode.none')"
                :icon="icons.minus"
                @click="setUiApp('')"
              />
              <template v-if="showAppGroups">
                <BngCardHeading bng-list-title>{{ $t("ui.photomode.title") }}</BngCardHeading>
                <BngImageTile
                  v-for="app in photomodeApps"
                  :key="app.appName"
                  class="overlay-layer-edit-form__tile"
                  :class="{ 'overlay-layer-edit-form__tile--active': model.uiapp === app.appName }"
                  :label="app.displayName || app.appName"
                  :external-image="appPreviewUrl(app)"
                  :icon="app.preview ? undefined : icons.square"
                  @click="setUiApp(app.appName)"
                />
                <BngCardHeading bng-list-title>{{ $t("ui.photomode.overlay.otherAppsGroup") }}</BngCardHeading>
                <BngImageTile
                  v-for="app in otherApps"
                  :key="app.appName"
                  class="overlay-layer-edit-form__tile"
                  :class="{ 'overlay-layer-edit-form__tile--active': model.uiapp === app.appName }"
                  :label="app.displayName || app.appName"
                  :external-image="appPreviewUrl(app)"
                  :icon="app.preview ? undefined : icons.square"
                  @click="setUiApp(app.appName)"
                />
              </template>
              <template v-else>
                <BngImageTile
                  v-for="app in uiApps"
                  :key="app.appName"
                  class="overlay-layer-edit-form__tile"
                  :class="{ 'overlay-layer-edit-form__tile--active': model.uiapp === app.appName }"
                  :label="app.displayName || app.appName"
                  :external-image="appPreviewUrl(app)"
                  :icon="app.preview ? undefined : icons.square"
                  @click="setUiApp(app.appName)"
                />
              </template>
            </BngList>
            <p v-if="!uiApps.length" class="overlay-layer-edit-form__empty">
              {{ $t("ui.photomode.overlay.noUiApps") }}
            </p>
          </template>

          <template v-else>
            <BngList
              class="overlay-layer-edit-form__tiles"
              :tile-width="6.5"
              :tile-margin="0.3"
            >
              <BngImageTile
                class="overlay-layer-edit-form__tile"
                :class="{ 'overlay-layer-edit-form__tile--active': noSource }"
                :label="$t('ui.photomode.none')"
                :icon="icons.minus"
                @click="clearSource()"
              />
              <template v-if="images.length">
                <BngCardHeading v-if="hasLiveries" bng-list-title>{{ $t("ui.photomode.overlay.folderImagesGroup") }}</BngCardHeading>
                <BngImageTile
                  v-for="img in images"
                  :key="img"
                  class="overlay-layer-edit-form__tile"
                  :class="{ 'overlay-layer-edit-form__tile--active': !isLivery && model.image === img }"
                  :label="img"
                  :external-image="urlFor(img)"
                  @click="setImage(img)"
                />
              </template>
              <template v-for="cat in liveryCategories" :key="cat.value">
                <BngCardHeading bng-list-title>{{ cat.label }}</BngCardHeading>
                <BngImageTile
                  v-for="tex in cat.items"
                  :key="tex.path"
                  class="overlay-layer-edit-form__tile"
                  :class="{ 'overlay-layer-edit-form__tile--active': isLivery && model.liveryTexture === tex.path }"
                  :label="tex.label || tex.name"
                  :external-image="tex.path"
                  @click="setLivery(tex.path)"
                />
              </template>
            </BngList>
            <p v-if="!hasImages && !hasLiveries" class="overlay-layer-edit-form__empty">
              {{ $t("ui.photomode.overlay.dropImageFolderHint") }}
            </p>
          </template>
        </div>
      </BngDropdownContainer>
    </div>

    <div v-if="isLivery" class="overlay-layer-edit-form__section">
      <label class="overlay-layer-edit-form__label">{{ $t("ui.photomode.overlay.tint") }}</label>
      <BngDropdownContainer
        v-model:opened="tintOpen"
        class="overlay-layer-edit-form__dropdown"
      >
        <template #display>
          <span class="overlay-layer-edit-form__dropdown-display">
            <span class="overlay-layer-edit-form__tint-swatch" :style="tintSwatchStyle" />
            <span class="overlay-layer-edit-form__dropdown-name">{{ tintLabel }}</span>
          </span>
        </template>
        <div class="overlay-layer-edit-form__tint-panel">
          <BngColorPicker
            v-model="tintColor"
            view="compact_luminosity"
            @change="onTintChange"
          />
          <BngButton
            :accent="ACCENTS.secondary"
            :icon="icons.minus"
            :disabled="!hasTint"
            @click="clearTint"
          >
            {{ $t("ui.photomode.overlay.tintNone") }}
          </BngButton>
        </div>
      </BngDropdownContainer>
    </div>

    <div class="overlay-layer-edit-form__section">
      <label class="overlay-layer-edit-form__label">{{ $t("ui.photomode.overlay.zOrder") }}</label>
      <div class="overlay-layer-edit-form__zorder">
        <BngButton
          :accent="ACCENTS.secondary"
          class="overlay-layer-edit-form__z-btn"
          :icon="icons.arrowSmallDown"
          :disabled="!canSendBack"
          :title="$t('ui.photomode.overlay.sendBackTooltip')"
          @click="nudgeZ(-1)"
        >
          {{ $t("ui.photomode.overlay.sendBack") }}
        </BngButton>
        <div class="overlay-layer-edit-form__z-status">
          <span class="overlay-layer-edit-form__z-position">
            {{ zPositionLabel }}
            <span v-if="previewIndex === layerCount - 1" class="overlay-layer-edit-form__z-hint">{{ $t("ui.photomode.overlay.layerFront") }}</span>
            <span v-else-if="previewIndex === 0" class="overlay-layer-edit-form__z-hint">{{ $t("ui.photomode.overlay.layerBack") }}</span>
          </span>
          <span
            v-if="model.zOffset"
            class="overlay-layer-edit-form__z-delta"
            :class="{ 'overlay-layer-edit-form__z-delta--pos': model.zOffset > 0 }"
          >
            {{ zOffsetLabel }}
          </span>
        </div>
        <BngButton
          :accent="ACCENTS.secondary"
          class="overlay-layer-edit-form__z-btn"
          :icon="icons.arrowSmallUp"
          :disabled="!canBringForward"
          :title="$t('ui.photomode.overlay.bringForwardTooltip')"
          @click="nudgeZ(1)"
        >
          {{ $t("ui.photomode.overlay.bringForward") }}
        </BngButton>
      </div>
    </div>

    <div class="overlay-layer-edit-form__section">
      <label class="overlay-layer-edit-form__label">
        {{ $t("ui.photomode.overlay.opacity") }}
        <span class="overlay-layer-edit-form__opacity-readout">{{ opacityPercent }}%</span>
      </label>
      <BngSlider
        v-model="opacityPercent"
        class="overlay-layer-edit-form__opacity-slider"
        :min="0"
        :max="100"
        :step="1"
        :debounce="0"
      />
    </div>

    <div class="overlay-layer-edit-form__section overlay-layer-edit-form__section--inline">
      <BngSwitch
        v-model="blurEnabled"
        :label="$t('ui.photomode.overlay.blur')"
        :inline="false"
        label-before
      />
    </div>

    <div class="overlay-layer-edit-form__section">
      <label class="overlay-layer-edit-form__label">{{ $t("ui.photomode.overlay.geometry") }}</label>
      <div class="overlay-layer-edit-form__axes">
        <div
          v-for="axis in AXIS_ORDER"
          :key="axis.key"
          class="overlay-layer-edit-form__axis"
        >
          <span class="overlay-layer-edit-form__axis-label">{{ axisLabel(axis) }}</span>
          <span class="overlay-layer-edit-form__axis-value">{{ model[axis.key] || "0%" }}</span>
          <BngButton
            :accent="ACCENTS.secondary"
            class="overlay-layer-edit-form__axis-btn"
            :title="axisTitle(axis, unitLabelFor(axis.key))"
            @click="toggleAxis(axis.key)"
          >
            <strong>{{ unitLabelFor(axis.key) }}</strong>
          </BngButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngDropdownContainer, BngList, BngImageTile, BngButton, BngSlider, BngSwitch, BngCardHeading, BngColorPicker, ACCENTS, icons } from "@/common/components/base"
import { parseValue, fromPx, hexToPickerColor, pickerColorToHex } from "../overlayValues"
import { withOverlayTs } from "../useOverlays"
import { clampNumber } from "@/utils/maths"

defineOptions({ name: "OverlayLayerEditForm" })

/**
 * `{
 *   // mutable, read back by the parent after Apply:
 *   image, x, y, width, height,
 *   // read-only context snapshotted by the parent at open time:
 *   folderPath, images, ts, geometry, frame,
 * }`
 *
 * `geometry` is the layer's resolved px rect and `frame` is
 * the photo frame px size - both are needed to round-trip unit
 * toggles through fromPx without losing pixel position
 */
const model = defineModel({
  type: Object,
  default: () => ({
    layerType: "image",
    image: "",
    uiapp: "",
    liveryTexture: "",
    tint: "",
    x: "0%",
    y: "0%",
    width: "100%",
    height: "100%",
    opacity: 1,
    blur: false,
    folderPath: "",
    images: [],
    uiApps: [],
    liveryTextures: [],
    ts: "",
    geometry: { x: 0, y: 0, width: 0, height: 0 },
    frame: { width: 0, height: 0 },
    layerIndex: 0,
    layerCount: 1,
    zOffset: 0,
  }),
})

const pickerOpen = ref(false)
const tintOpen = ref(false)

const isUiApp = computed(() => model.value?.layerType === "uiapp")

// a livery sourced layer enables the tint colour picker
const isLivery = computed(() => typeof model.value?.liveryTexture === "string" && model.value.liveryTexture !== "")
const noSource = computed(() => (model.value?.image || "") === "" && (model.value?.liveryTexture || "") === "")

const liveryCategories = computed(() => (model.value?.liveryTextures || []).filter(cat => cat.items?.length))
const hasLiveries = computed(() => liveryCategories.value.length > 0)

function liveryNameFor(path) {
  for (const cat of liveryCategories.value) {
    const found = (cat.items || []).find(tex => tex.path === path)
    if (found) return found.label || found.name || path
  }
  return path
}

const hasTint = computed(() => typeof model.value?.tint === "string" && model.value.tint !== "")
const tintLabel = computed(() => (hasTint.value ? model.value.tint : $translate.instant("ui.photomode.overlay.tintNone")))
const tintSwatchStyle = computed(() => ({
  backgroundColor: hasTint.value ? model.value.tint : "transparent",
}))

const DEFAULT_TINT_PICKER = { hue: 0.08, saturation: 1, luminosity: 0.5 }
const tintColor = ref({ ...(hexToPickerColor(model.value?.tint) || DEFAULT_TINT_PICKER) })
watch(() => model.value?.tint, tint => {
  const parsed = hexToPickerColor(tint)
  if (parsed) tintColor.value = parsed
})

function onTintChange(color) {
  model.value = { ...model.value, tint: pickerColorToHex(color) }
}

function clearTint() {
  model.value = { ...model.value, tint: "" }
}

// BngSlider works in 0-100 percent space while the JSON layer stores opacity
// as a 0..1 float - bridge the two via a writable computed so v-model stays
// reactive in both directions.
const opacityPercent = computed({
  get() {
    const raw = Number(model.value?.opacity)
    if (!Number.isFinite(raw)) return 100
    return Math.round(Math.max(0, Math.min(1, raw)) * 100)
  },
  set(value) {
    const n = Number(value)
    const clamped = clampNumber(n, 0, 100, 100) / 100
    model.value = { ...model.value, opacity: clamped }
  },
})

const blurEnabled = computed({
  get() {
    return model.value?.blur === true
  },
  set(value) {
    model.value = { ...model.value, blur: value === true }
  },
})

const images = computed(() => model.value?.images || [])
const hasImages = computed(() => images.value.length > 0)
const uiApps = computed(() => model.value?.uiApps || [])

const photomodeApps = computed(() => uiApps.value.filter(app => app.photomode))
const otherApps = computed(() => uiApps.value.filter(app => !app.photomode))
const showAppGroups = computed(() => photomodeApps.value.length > 0 && otherApps.value.length > 0)

const selectedLabel = computed(() => {
  if (isUiApp.value) {
    const sel = model.value?.uiapp
    if (!sel) return ""
    const app = uiApps.value.find(a => a.appName === sel)
    return app?.displayName || app?.appName || sel
  }
  if (isLivery.value) return liveryNameFor(model.value.liveryTexture)
  return model.value?.image || ""
})

const selectedPreviewUrl = computed(() => {
  if (isUiApp.value) {
    const sel = model.value?.uiapp
    if (!sel) return ""
    const app = uiApps.value.find(a => a.appName === sel)
    return app ? appPreviewUrl(app) : ""
  }
  // livery paths are full VFS urls; folder images resolve via folderPath
  if (isLivery.value) return model.value.liveryTexture
  const name = model.value?.image
  if (!name) return ""
  return urlFor(name)
})

const layerIndex = computed(() => Number(model.value?.layerIndex) || 0)
const layerCount = computed(() => Math.max(1, Number(model.value?.layerCount) || 1))
const previewIndex = computed(() => {
  const raw = layerIndex.value + (Number(model.value?.zOffset) || 0)
  return Math.max(0, Math.min(layerCount.value - 1, raw))
})
const canSendBack = computed(() => previewIndex.value > 0)
const canBringForward = computed(() => previewIndex.value < layerCount.value - 1)
const zPositionLabel = computed(() =>
  $translate.instant("ui.photomode.overlay.positionOf", {
    index: previewIndex.value + 1,
    total: Math.max(1, layerCount.value),
  })
)
const zOffsetLabel = computed(() => {
  const offset = model.value?.zOffset
  if (!offset) return ""
  const offsetText = offset > 0 ? `+${offset}` : String(offset)
  return $translate.instant("ui.photomode.overlay.applyZOffset", { offset: offsetText })
})

function nudgeZ(delta) {
  const currentOffset = Number(model.value?.zOffset) || 0
  const nextPreview = Math.max(0, Math.min(layerCount.value - 1, layerIndex.value + currentOffset + delta))
  const nextOffset = nextPreview - layerIndex.value
  model.value = { ...model.value, zOffset: nextOffset }
}

const AXIS_ORDER = Object.freeze([
  { key: "x", labelKey: "X" },
  { key: "y", labelKey: "Y" },
  { key: "width", labelKey: "ui.photomode.overlay.axis.width" },
  { key: "height", labelKey: "ui.photomode.overlay.axis.height" },
])

function axisLabel(axis) {
  return axis?.labelKey ? $translate.instant(axis.labelKey) : axis?.key || ""
}

function axisTitle(axis, unit) {
  const flip = unit.endsWith("%")
    ? $translate.instant("ui.photomode.overlay.unit.pixels")
    : $translate.instant("ui.photomode.overlay.unit.percent")
  return $translate.instant("ui.photomode.overlay.axisInUnit", {
    axis: axisLabel(axis),
    unit,
    flip,
  })
}

function urlFor(imageName) {
  const folder = model.value?.folderPath || ""
  if (!folder || !imageName) return ""
  return withOverlayTs(`${folder}/${imageName}`, model.value?.ts)
}

const appPreviewUrl = app => typeof app?.preview === "string" ? app.preview : ""

function setImage(value) {
  // switching to a folder image clears any livery source + its tint
  model.value = { ...model.value, image: value, liveryTexture: "", tint: "" }
  pickerOpen.value = false
}

function setLivery(path) {
  model.value = { ...model.value, liveryTexture: path, image: "" }
  pickerOpen.value = false
}

function clearSource() {
  model.value = { ...model.value, image: "", liveryTexture: "", tint: "" }
  pickerOpen.value = false
}

function setUiApp(value) {
  model.value = { ...model.value, uiapp: value }
  pickerOpen.value = false
}

function unitLabelFor(axis) {
  const raw = model.value?.[axis]
  const parsed = parseValue(raw)
  const unit = parsed?.unit === "px" ? "px" : "%"
  if ((axis === "x" || axis === "y") && parsed?.sign === -1) return `-${unit}`
  return unit
}

function toggleAxis(axis) {
  const raw = model.value?.[axis]
  const parsed = parseValue(raw) || { sign: 1, unit: "%", magnitude: 0 }
  const nextUnit = parsed.unit === "%" ? "px" : "%"
  const isPosition = axis === "x" || axis === "y"
  const nextSign = isPosition ? parsed.sign : 1

  const geometry = model.value?.geometry || { x: 0, y: 0, width: 0, height: 0 }
  const frame = model.value?.frame || { width: 0, height: 0 }
  const frameDim = axis === "x" || axis === "width" ? frame.width : frame.height
  const layerSize = axis === "x" ? geometry.width : axis === "y" ? geometry.height : 0

  const nextValue = fromPx(geometry[axis], frameDim, layerSize, { unit: nextUnit, sign: nextSign })
  model.value = { ...model.value, [axis]: nextValue }
}
</script>

<style lang="scss" scoped>
.overlay-layer-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 26rem;
}

.overlay-layer-edit-form__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.overlay-layer-edit-form__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  color: rgba(var(--bng-off-white-rgb), 0.78);
}

.overlay-layer-edit-form__opacity-readout {
  font-family: var(--fnt-mono, monospace);
  font-size: 0.78rem;
  color: rgba(var(--bng-off-white-rgb), 0.92);
}

.overlay-layer-edit-form__opacity-slider {
  width: 100%;
}

.overlay-layer-edit-form__section--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.overlay-layer-edit-form__dropdown {
  width: 100%;
}

.overlay-layer-edit-form__dropdown-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.overlay-layer-edit-form__dropdown-thumb {
  width: 1.8rem;
  height: 1.8rem;
  object-fit: cover;
  border-radius: 0.2rem;
  background: rgba(var(--bng-off-white-rgb), 0.06);
}

.overlay-layer-edit-form__dropdown-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-layer-edit-form__dropdown-panel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem;
}

.overlay-layer-edit-form__tint-swatch {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 0.2rem;
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.35);
  background-image:
    linear-gradient(45deg, rgba(var(--bng-off-white-rgb), 0.15) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(var(--bng-off-white-rgb), 0.15) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(var(--bng-off-white-rgb), 0.15) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(var(--bng-off-white-rgb), 0.15) 75%);
  background-size: 0.6rem 0.6rem;
  background-position: 0 0, 0 0.3rem, 0.3rem -0.3rem, -0.3rem 0;
}

.overlay-layer-edit-form__tint-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  width: 18rem;
  max-width: 60vw;
}

.overlay-layer-edit-form__tiles {
  width: 22em;
  max-width: 50vw;
  max-height: 40vh;
  overflow: auto;
}

.overlay-layer-edit-form__tile--active {
  background: rgba(var(--bng-orange-b400-rgb), 0.18);
  box-shadow:
    inset 0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.55),
    0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.18);
  border-radius: var(--bng-corners-1);
}

.overlay-layer-edit-form__empty {
  margin: 0;
  padding: 0.4rem 0.55rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-off-black-rgb), 0.4);
  font-size: 0.78rem;
  color: rgba(var(--bng-off-white-rgb), 0.8);
}

.overlay-layer-edit-form__zorder {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-off-black-rgb), 0.38);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.06);
}

.overlay-layer-edit-form__z-btn {
  flex: 0 0 auto;
}

.overlay-layer-edit-form__z-status {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  font-size: 0.78rem;
  line-height: 1.15;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  text-align: center;
}

.overlay-layer-edit-form__z-hint {
  opacity: 0.6;
  margin-inline-start: 0.2rem;
}

.overlay-layer-edit-form__z-delta {
  font-family: var(--fnt-mono, monospace);
  font-size: 0.74rem;
  padding: 0.05rem 0.35rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-off-white-rgb), 0.08);
  color: rgba(var(--bng-off-white-rgb), 0.92);
}

.overlay-layer-edit-form__z-delta--pos {
  background: rgba(var(--bng-accent-rgb), 0.22);
}

.overlay-layer-edit-form__axes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}

.overlay-layer-edit-form__axis {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-off-black-rgb), 0.38);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.06);
}

.overlay-layer-edit-form__axis-label {
  font-weight: 600;
  font-size: 0.8rem;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  min-width: 3rem;
}

.overlay-layer-edit-form__axis-value {
  flex: 1 1 auto;
  font-family: var(--fnt-mono, monospace);
  font-size: 0.82rem;
  opacity: 0.82;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-layer-edit-form__axis-btn {
  min-width: 3rem;
}
</style>
