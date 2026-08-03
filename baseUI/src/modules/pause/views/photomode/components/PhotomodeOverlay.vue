<template>
  <div
    v-if="activeOverlay"
    class="photomode-overlay"
    :class="{ 'photomode-overlay--editing': editing }"
    data-testid="photomode-overlay"
  >
    <Overlay
      ref="overlayRef"
      :items="items"
      :resolve="resolveLayer"
      :editable="editable"
      :initial-editing="false"
      :uinav="editingEnabled"
      controls-position="top-right"
      @item-changed="onItemChanged"
    >
      <template #controls="{ editing: overlayEditing }">
        <div v-if="overlayEditing" class="photomode-overlay__toolbar">
          <span class="photomode-overlay__toolbar-label">
            {{ $t("ui.photomode.overlay.editing", { name: activeOverlayDisplayName }) }}
          </span>
          <BngButton
            :accent="ACCENTS.secondary"
            :icon="icons.plus"
            :disabled="!assetContext.images?.length"
            @click="openAddLayerDialog('image')"
          >
            {{ $t("ui.photomode.overlay.addImage") }}
          </BngButton>
          <BngButton
            :accent="ACCENTS.secondary"
            :icon="icons.plus"
            :disabled="!uiApps.length"
            @click="openAddLayerDialog('uiapp')"
          >
            {{ $t("ui.photomode.overlay.addUiAppWip") }}
          </BngButton>
          <BngButton :accent="ACCENTS.main" @click="exitEditing">
            {{ $t("ui.photomode.overlay.exitEditing") }}
          </BngButton>
        </div>
      </template>

      <template #default="{ item, rectPx }">
        <PhotomodeOverlayLayer
          :layer="item"
          :rect-px="rectPx"
          :folder-path="activeOverlay.folderPath || ''"
          :images="activeOverlay.images || []"
          :ts="activeOverlay.ts ?? ''"
        />
      </template>

      <template #item-controls="{ item, rectPx }">
        <PhotomodeLayerControls :item="item" :rect-px="rectPx" />
      </template>
    </Overlay>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, provide, ref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngButton, ACCENTS, icons } from "@/common/components/base"
import { openFormDialog } from "@/services/popup"
import { Overlay } from "@/common/modules/overlay"
import { resolveLayer, parseValue, fromPx } from "../overlayValues"
import { useOverlays, resolveOverlayName } from "../useOverlays"
import PhotomodeOverlayLayer from "./PhotomodeOverlayLayer.vue"
import PhotomodeLayerControls from "./PhotomodeLayerControls.vue"
import OverlayAddLayerForm from "./OverlayAddLayerForm.vue"
import { PHOTOMODE_LAYER_OPS } from "../layerOpsKey"

defineOptions({ name: "PhotomodeOverlay" })

const {
  activeOverlay, saveLayers,
  editable, editing, setEditing,
  uiApps, fetchUiApps,
  liveryTextures, fetchLiveryTextures
} = useOverlays()

const activeOverlayDisplayName = computed(() =>
  resolveOverlayName(activeOverlay.value?.name, activeOverlay.value?.id)
)

onMounted(() => {
  // warm up caches for UI apps and livery graphics
  fetchUiApps()
  fetchLiveryTextures()
})

function exitEditing() {
  setEditing(false)
}
const overlayRef = ref(null)

const items = computed(() => {
  const layers = Array.isArray(activeOverlay.value?.layers) ? activeOverlay.value.layers : []
  return layers.map((layer, index) => ({
    id: String(index),
    sourceIndex: index,
    ...layer,
  }))
})

const editingEnabled = computed(() => editable.value && editing.value)

watch([editingEnabled, overlayRef], ([enabled, instance]) => {
  if (!instance) return
  if (instance.isEditing?.() === enabled) return
  instance.toggleEditor?.(enabled)
})

function onItemChanged(item, rectPx, frame) {
  if (!editingEnabled.value) return
  if (!rectPx || !frame) return

  const current = Array.isArray(activeOverlay.value?.layers) ? [...activeOverlay.value.layers] : []
  const index = Number(item?.sourceIndex)
  if (!Number.isInteger(index) || index < 0 || index >= current.length) return

  const source = current[index] || {}
  const next = {
    ...source,
    width: fromPx(rectPx.width, frame.width, 0, source.width ?? "100%"),
    height: fromPx(rectPx.height, frame.height, 0, source.height ?? "100%"),
    x: fromPx(rectPx.x, frame.width, rectPx.width, source.x ?? "0%"),
    y: fromPx(rectPx.y, frame.height, rectPx.height, source.y ?? "0%"),
  }
  current[index] = next
  saveLayers(current)
}

function currentLayers() {
  return Array.isArray(activeOverlay.value?.layers) ? [...activeOverlay.value.layers] : []
}

function withinRange(layers, index) {
  return Number.isInteger(index) && index >= 0 && index < layers.length
}

function addLayer(kind, data) {
  const layers = currentLayers()
  let layer = null
  if (kind === "image") {
    const name = typeof data?.image === "string" ? data.image : ""
    if (!name) return
    layer = {
      image: name,
      x: "0%",
      y: "0%",
      width: "30%",
      height: "30%",
      opacity: 1,
    }
  } else if (kind === "livery") {
    const path = typeof data?.path === "string" ? data.path : ""
    if (!path) return
    layer = {
      liveryTexture: path,
      x: "0%",
      y: "0%",
      width: "30%",
      height: "30%",
      imageFit: "contain",
      opacity: 1,
    }
  } else if (kind === "uiapp") {
    const appName = typeof data?.appName === "string" ? data.appName : ""
    if (!appName) return
    const css = data?.css || {}
    layer = {
      uiapp: appName,
      x: typeof css.left === "string" && css.left ? css.left : "0px",
      y: typeof css.top === "string" && css.top ? css.top : "0px",
      width: typeof css.width === "string" && css.width ? css.width : "320px",
      height: typeof css.height === "string" && css.height ? css.height : "48px",
      opacity: 1,
    }
  }
  if (!layer) return

  layers.push(layer)
  saveLayers(layers)
}

async function openAddLayerDialog(kind) {
  const ctx = assetContext.value
  if (kind === "uiapp") {
    await fetchUiApps()
  }
  if (kind === "image") {
    await fetchLiveryTextures()
  }

  const isImage = kind === "image"
  const formModel = {
    kind,
    selected: "",
    selectedType: "image",
    images: isImage ? [...(ctx.images || [])] : [],
    liveryTextures: isImage ? [...(liveryTextures.value || [])] : [],
    uiApps: isImage ? [] : [...(uiApps.value || [])],
    folderPath: ctx.folderPath,
    ts: ctx.ts,
  }

  const title = isImage
    ? $translate.instant("ui.photomode.overlay.addImageLayer")
    : $translate.instant("ui.photomode.overlay.addUiAppLayer")
  const description = isImage
    ? $translate.instant("ui.photomode.overlay.addImageDescription")
    : $translate.instant("ui.photomode.overlay.addUiAppDescription")

  const result = await openFormDialog(
    OverlayAddLayerForm,
    formModel,
    () => ({ error: false }),
    title,
    description,
    [
      { label: $translate.instant("ui.photomode.overlay.add"), value: "add", emitData: true, extras: { default: true, accent: ACCENTS.main } },
      { label: $translate.instant("ui.common.cancel"), value: "cancel", extras: { cancel: true, accent: ACCENTS.secondary } },
    ],
  ).catch(() => null)
  if (!result || result.value !== "add") return

  const data = result.formData || formModel
  const selected = typeof data.selected === "string" ? data.selected : ""
  if (!selected) return

  if (isImage) {
    if (data.selectedType === "livery") {
      addLayer("livery", { path: selected })
    } else {
      addLayer("image", { image: selected })
    }
  } else {
    const app = (uiApps.value || []).find(entry => entry.appName === selected)
    if (!app) return
    addLayer("uiapp", { appName: app.appName, css: app.css })
  }
}

function deleteLayer(sourceIndex) {
  const layers = currentLayers()
  if (!withinRange(layers, sourceIndex)) return
  layers.splice(sourceIndex, 1)
  overlayRef.value?.select?.(null)
  saveLayers(layers)
}

function replaceLayerImage(sourceIndex, imageName) {
  const layers = currentLayers()
  if (!withinRange(layers, sourceIndex)) return
  const source = layers[sourceIndex] || {}
  layers[sourceIndex] = {
    ...source,
    image: typeof imageName === "string" ? imageName : "",
    uiapp: source.uiapp && !imageName ? source.uiapp : undefined,
  }
  saveLayers(layers)
}

function patchLayer(sourceIndex, patch) {
  applyLayerEdit(sourceIndex, { patch, zOffset: 0 })
}

function applyLayerEdit(sourceIndex, edit = {}) {
  const layers = currentLayers()
  if (!withinRange(layers, sourceIndex)) return

  const source = layers[sourceIndex] || {}
  let next = { ...source }

  const patch = edit.patch
  if (patch && typeof patch === "object") {
    for (const key of ["image", "uiapp", "liveryTexture", "tint", "imageFit", "x", "y", "width", "height", "opacity", "blur"]) {
      if (key in patch) next[key] = patch[key]
    }
    // clear unrelated fields
    if (typeof patch.image === "string" && patch.image) {
      next.uiapp = undefined
      next.liveryTexture = undefined
      next.tint = undefined
    }
    if (typeof patch.liveryTexture === "string" && patch.liveryTexture) {
      next.image = undefined
      next.uiapp = undefined
    }
    if (typeof patch.uiapp === "string" && patch.uiapp) {
      next.image = undefined
      next.liveryTexture = undefined
      next.tint = undefined
    }
    // clear emptied props
    for (const key of ["image", "uiapp", "liveryTexture", "tint", "imageFit"]) {
      if (next[key] === "" || next[key] == null) next[key] = undefined
    }
  }
  layers[sourceIndex] = next

  const rawOffset = Number(edit.zOffset)
  const zOffset = Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0
  let finalIndex = sourceIndex
  if (zOffset !== 0) {
    finalIndex = Math.max(0, Math.min(layers.length - 1, sourceIndex + zOffset))
    if (finalIndex !== sourceIndex) {
      const [moved] = layers.splice(sourceIndex, 1)
      layers.splice(finalIndex, 0, moved)
    }
  }

  saveLayers(layers)

  if (finalIndex !== sourceIndex) {
    nextTick(() => overlayRef.value?.select?.(String(finalIndex)))
  }
}

function toggleAxisUnit(sourceIndex, axis) {
  const layers = currentLayers()
  if (!withinRange(layers, sourceIndex)) return

  const source = layers[sourceIndex] || {}
  const id = String(sourceIndex)
  const geometry = overlayRef.value?.getGeometry?.(id)
  if (!geometry) return

  const isPosition = axis === "x" || axis === "y"
  const exposed = overlayRef.value?.frameSize
  const frame = exposed && typeof exposed === "object" && "value" in exposed ? exposed.value : exposed
  if (!frame) return

  const frameDim = axis === "x" || axis === "width" ? frame.width : frame.height
  const layerSize = axis === "x" ? geometry.width : axis === "y" ? geometry.height : 0

  const currentRaw = source[axis]
  const parsed = parseValue(currentRaw) || { sign: 1, unit: "%", magnitude: 0 }
  const nextUnit = parsed.unit === "%" ? "px" : "%"
  const nextSign = isPosition ? parsed.sign : 1

  const nextValue = fromPx(geometry[axis], frameDim, layerSize, { unit: nextUnit, sign: nextSign })
  layers[sourceIndex] = { ...source, [axis]: nextValue }
  saveLayers(layers)
}

const assetContext = computed(() => ({
  folderPath: activeOverlay.value?.folderPath || "",
  images: activeOverlay.value?.images || [],
  hasThumbnail: activeOverlay.value?.hasThumbnail === true,
  ts: activeOverlay.value?.ts ?? "",
}))

function getLayerGeometry(sourceIndex) {
  const id = String(sourceIndex)
  const geometry = overlayRef.value?.getGeometry?.(id)
  if (!geometry) return null
  const exposed = overlayRef.value?.frameSize
  const frame = exposed && typeof exposed === "object" && "value" in exposed ? exposed.value : exposed
  if (!frame) return null
  return { geometry, frame }
}

const layerCount = computed(() => Array.isArray(activeOverlay.value?.layers) ? activeOverlay.value.layers.length : 0)

provide(PHOTOMODE_LAYER_OPS, {
  deleteLayer,
  replaceLayerImage,
  toggleAxisUnit,
  patchLayer,
  applyLayerEdit,
  addLayer,
  getLayerValue: (sourceIndex, axis) => {
    const layers = activeOverlay.value?.layers || []
    return layers[sourceIndex]?.[axis]
  },
  getLayerGeometry,
  assetContext,
  layerCount,
  uiApps,
  fetchUiApps,
  liveryTextures,
  fetchLiveryTextures,
})
</script>

<style lang="scss" scoped>
.photomode-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;

  :deep(.overlay) {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  :deep(.overlay__frame) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.photomode-overlay--editing {
  pointer-events: none;

  :deep(.overlay),
  :deep(.overlay__frame) {
    pointer-events: auto;
  }
}

.photomode-overlay__toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.7rem;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-off-black-rgb), 0.72);
  box-shadow: 0 0.4rem 1rem rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.12);
  pointer-events: auto;
}

.photomode-overlay__toolbar-label {
  font-size: 0.82rem;
  color: rgba(var(--bng-off-white-rgb), 0.88);
  max-width: 18rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
