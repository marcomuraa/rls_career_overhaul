<template>
  <div class="photomode-layer-controls" @pointerdown.stop>
    <BngButton
      :accent="ACCENTS.secondary"
      class="photomode-layer-controls__btn"
      :icon="icons.edit"
      :title="$t('ui.photomode.overlay.editLayerTitle')"
      @click="openEditor"
    />
  </div>
</template>

<script setup>
import { inject } from "vue"
import { $translate } from "@/services/translation"
import { BngButton, ACCENTS, icons } from "@/common/components/base"
import { openFormDialog, openConfirmation } from "@/services/popup"
import { PHOTOMODE_LAYER_OPS } from "../layerOpsKey"
import OverlayLayerEditForm from "./OverlayLayerEditForm.vue"
import { clampNumber } from "@/utils/maths"

defineOptions({ name: "PhotomodeLayerControls" })

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  // rectPx is provided by <Overlay>'s item-controls slot but we don't use it
  // directly - the editor form asks PhotomodeOverlay for a live geometry
  // snapshot at open time so it stays accurate even if the selection drifted
  // between mount and click.
  rectPx: {
    type: Object,
    default: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  },
})

const ops = inject(PHOTOMODE_LAYER_OPS, null)

async function openEditor() {
  if (!ops) return

  const ctx = ops.assetContext?.value
  const geometryInfo = ops.getLayerGeometry?.(props.item.sourceIndex)
  if (!geometryInfo) return

  const hasImage = typeof props.item?.image === "string" && props.item.image !== ""
  const hasUiApp = typeof props.item?.uiapp === "string" && props.item.uiapp !== ""
  const layerType = hasUiApp && !hasImage ? "uiapp" : "image"

  // warm the relevant catalogue caches on demand
  if (layerType === "uiapp") {
    if (typeof ops.fetchUiApps === "function") await ops.fetchUiApps()
  } else if (typeof ops.fetchLiveryTextures === "function") {
    await ops.fetchLiveryTextures()
  }

  const formModel = {
    layerType,
    image: props.item?.image ?? "",
    uiapp: props.item?.uiapp ?? "",
    liveryTexture: props.item?.liveryTexture ?? "",
    tint: props.item?.tint ?? "",
    x: props.item?.x ?? "0%",
    y: props.item?.y ?? "0%",
    width: props.item?.width ?? "100%",
    height: props.item?.height ?? "100%",
    opacity: clampOpacity(props.item?.opacity),
    blur: props.item?.blur === true,
    folderPath: ctx?.folderPath || "",
    images: Array.isArray(ctx?.images) ? [...ctx.images] : [],
    uiApps: Array.isArray(ops.uiApps?.value) ? [...ops.uiApps.value] : [],
    liveryTextures: Array.isArray(ops.liveryTextures?.value) ? [...ops.liveryTextures.value] : [],
    ts: ctx?.ts ?? "",
    geometry: { ...geometryInfo.geometry },
    frame: { ...geometryInfo.frame },
    layerIndex: Number(props.item?.sourceIndex) || 0,
    layerCount: Number(ops.layerCount?.value) || 0,
    zOffset: 0,
  }

  const result = await openFormDialog(
    OverlayLayerEditForm,
    formModel,
    validateAlways,
    $translate.instant("ui.photomode.overlay.editLayer"),
    $translate.instant("ui.photomode.overlay.editLayerDescription"),
    [
      {
        label: $translate.instant("ui.common.apply"),
        value: "apply",
        emitData: true,
        extras: { default: true, accent: ACCENTS.main },
      },
      {
        label: $translate.instant("ui.common.delete"),
        value: "delete",
        extras: { accent: ACCENTS.attention },
      },
      {
        label: $translate.instant("ui.common.cancel"),
        value: "cancel",
        extras: { cancel: true, accent: ACCENTS.secondary },
      },
    ],
  ).catch(() => null)

  if (!result) return

  if (result.value === "apply") {
    const data = result.formData || formModel
    const patch = {
      x: data.x ?? formModel.x,
      y: data.y ?? formModel.y,
      width: data.width ?? formModel.width,
      height: data.height ?? formModel.height,
      // Drop default values from the JSON to keep authored overlays tidy:
      // opacity 1 + blur false are the renderer defaults, so we omit them.
      opacity: normaliseOpacityForPatch(data.opacity),
      blur: data.blur === true ? true : undefined,
    }
    if (layerType === "uiapp") {
      patch.uiapp = data.uiapp ?? ""
    } else {
      patch.image = data.image ?? ""
      patch.liveryTexture = data.liveryTexture ?? ""
      patch.tint = data.liveryTexture ? (data.tint ?? "") : ""
    }
    ops.applyLayerEdit?.(props.item.sourceIndex, {
      patch,
      zOffset: Number(data.zOffset) || 0,
    })
    return
  }

  if (result.value === "delete") {
    const label = layerType === "uiapp"
      ? $translate.instant("ui.photomode.overlay.deleteLayerUiApp", {
        name: formModel.uiapp || props.item?.uiapp || "",
      })
      : (formModel.image || formModel.liveryTexture || props.item?.liveryTexture || $translate.instant("ui.photomode.overlay.thisLayer"))
    const confirmed = await openConfirmation(
      $translate.instant("ui.photomode.overlay.deleteLayer"),
      $translate.instant("ui.photomode.overlay.deleteLayerConfirm", { label }),
      [
        { label: $translate.instant("ui.common.delete"), value: true, extras: { default: true, accent: ACCENTS.attention } },
        { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true, accent: ACCENTS.secondary } },
      ],
    ).catch(() => false)
    if (confirmed !== true) return
    ops.deleteLayer?.(props.item.sourceIndex)
  }
}

const validateAlways = () => ({ error: false })

function clampOpacity(value) {
  return clampNumber(value, 0, 1, 1)
}

function normaliseOpacityForPatch(value) {
  const n = clampOpacity(value)
  // Default opacity is 1 - omit it from the patch so we don't bloat the JSON
  // with a redundant property on the round-trip.
  return n >= 0.9995 ? undefined : Number(n.toFixed(3))
}
</script>

<style lang="scss" scoped>
.photomode-layer-controls {
  display: flex;
  align-items: center;
  padding: 0.1rem;
}

.photomode-layer-controls__btn {
  padding-inline: 0.5rem !important;
}
</style>
