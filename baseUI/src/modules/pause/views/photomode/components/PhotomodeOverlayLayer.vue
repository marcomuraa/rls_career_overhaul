<template>
  <div
    v-bng-blur="blurEnabled"
    class="photomode-overlay-layer"
    :style="rootStyle"
    :data-layer-kind="layerKind"
  >
    <div
      v-if="layerKind === 'image' && imageUrl"
      class="photomode-overlay-layer__image"
      :style="imageStyle"
    />
    <canvas
      v-else-if="layerKind === 'livery'"
      ref="liveryCanvas"
      class="photomode-overlay-layer__livery"
    />
    <AppHost
      v-else-if="layerKind === 'uiapp'"
      class="photomode-overlay-layer__uiapp"
      :item="layer.uiapp"
      :rect-px="rectPx"
      prevent-uinav
    />
    <div
      v-else
      class="photomode-overlay-layer__missing"
      :style="missingStyle"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue"
import { getAssetURL } from "@/utils"
import { vBngBlur } from "@/common/directives"
import { withOverlayTs } from "../useOverlays"
import { clampNumber } from "@/utils/maths"
import AppHost from "@/modules/apps/components/AppHost.vue"

const MISSING_TEXTURE_URL = getAssetURL("images/missingTexture.png")

const props = defineProps({
  layer: {
    type: Object,
    required: true,
  },
  rectPx: {
    type: Object,
    default: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  },
  folderPath: {
    type: String,
    default: "",
  },
  images: {
    type: Array,
    default: () => [],
  },
  ts: { // cache stamp from lua
    type: [String, Number],
    default: "",
  },
})

defineOptions({ name: "PhotomodeOverlayLayer" })

const layerKind = computed(() => {
  const hasImage = typeof props.layer?.image === "string" && props.layer.image !== ""
  const hasLivery = typeof props.layer?.liveryTexture === "string" && props.layer.liveryTexture !== ""
  const hasUiApp = typeof props.layer?.uiapp === "string" && props.layer.uiapp !== ""

  if (hasImage) {
    if (hasLivery || hasUiApp) {
      console.warn("[photomode-overlays] layer declares 'image' alongside another source; 'image' wins:", props.layer)
    }
    const imageName = props.layer.image
    return props.images.includes(imageName) ? "image" : "missing"
  }
  if (hasLivery) return "livery"
  if (hasUiApp) return "uiapp"
  return "missing"
})

const imageUrl = computed(() => {
  if (layerKind.value !== "image") return ""
  if (!props.folderPath) return ""
  return withOverlayTs(`${props.folderPath}/${props.layer.image}`, props.ts)
})

const blurEnabled = computed(() => props.layer?.blur === true)

const liveryCanvas = ref(null)
let liveryImg = null

const liveryUrl = computed(() => {
  if (layerKind.value !== "livery") return ""
  return typeof props.layer?.liveryTexture === "string" ? props.layer.liveryTexture : ""
})

const liveryTint = computed(() => {
  const tint = props.layer?.tint
  return typeof tint === "string" && tint !== "" ? tint : ""
})

const liveryFit = computed(() => {
  const fit = typeof props.layer?.imageFit === "string" ? props.layer.imageFit.toLowerCase() : ""
  return fit || "contain"
})

function liveryDrawRect(fit, iw, ih, bw, bh) {
  if (!iw || !ih) return { dx: 0, dy: 0, dw: bw, dh: bh }
  let dw
  let dh
  switch (fit) {
    case "none":
      dw = iw
      dh = ih
      break
    case "x":
      dw = bw
      dh = ih * (bw / iw)
      break
    case "y":
      dh = bh
      dw = iw * (bh / ih)
      break
    case "xy":
      dw = bw
      dh = bh
      break
    case "cover": {
      const scale = Math.max(bw / iw, bh / ih)
      dw = iw * scale
      dh = ih * scale
      break
    }
    case "contain":
    default: {
      const scale = Math.min(bw / iw, bh / ih)
      dw = iw * scale
      dh = ih * scale
      break
    }
  }
  return { dx: (bw - dw) / 2, dy: (bh - dh) / 2, dw, dh }
}

function redrawLivery() {
  const canvas = liveryCanvas.value
  if (!canvas || layerKind.value !== "livery") return
  const w = Math.max(1, Math.round(Number(props.rectPx?.width) || 0))
  const h = Math.max(1, Math.round(Number(props.rectPx?.height) || 0))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  const img = liveryImg
  if (!img || !img.complete || !img.naturalWidth) return

  const { dx, dy, dw, dh } = liveryDrawRect(liveryFit.value, img.naturalWidth, img.naturalHeight, w, h)
  ctx.drawImage(img, dx, dy, dw, dh)

  const tint = liveryTint.value
  if (tint) {
    ctx.globalCompositeOperation = "source-in"
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = "source-over"
  }
}

function loadLivery() {
  const url = liveryUrl.value
  if (!url) {
    liveryImg = null
    redrawLivery()
    return
  }
  const img = new Image()
  const done = () => {
    if (liveryImg === img) redrawLivery()
  }
  img.onload = done
  img.onerror = done
  liveryImg = img
  img.src = url
}

watch(liveryUrl, loadLivery, { immediate: true })
watch(
  [() => props.rectPx?.width, () => props.rectPx?.height, liveryTint, liveryFit],
  redrawLivery
)
onMounted(redrawLivery)

const rootStyle = computed(() => {
  const opacity = clampOpacity(props.layer?.opacity)
  return {
    opacity: opacity == null ? undefined : String(opacity),
  }
})

const missingStyle = computed(() => ({
  backgroundImage: `url("${MISSING_TEXTURE_URL}")`,
}))

const imageStyle = computed(() => {
  if (layerKind.value !== "image") return {}

  const fit = typeof props.layer.imageFit === "string" ? props.layer.imageFit.toLowerCase() : "cover"
  const repeat = typeof props.layer.imageRepeat === "string" ? props.layer.imageRepeat.toLowerCase() : ""
  const position = typeof props.layer.imagePosition === "string" && props.layer.imagePosition.trim() !== ""
    ? props.layer.imagePosition
    : "50% 50%"

  return {
    backgroundImage: `url("${imageUrl.value}")`,
    backgroundSize: fitToCssSize(fit, repeat !== ""),
    backgroundRepeat: repeatToCss(repeat),
    backgroundPosition: position,
  }
})

function clampOpacity(value) {
  return clampNumber(value, 0, 1, null)
}

function fitToCssSize(fit, hasRepeat) {
  if (hasRepeat) return "auto"
  switch (fit) {
    case "none":
      return "auto"
    case "x":
      return "100% auto"
    case "y":
      return "auto 100%"
    case "xy":
      return "100% 100%"
    case "contain":
      return "contain"
    case "cover":
    default:
      return "cover"
  }
}

function repeatToCss(repeat) {
  switch (repeat) {
    case "x":
      return "repeat-x"
    case "y":
      return "repeat-y"
    case "xy":
      return "repeat"
    default:
      return "no-repeat"
  }
}
</script>

<style lang="scss" scoped>
.photomode-overlay-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.photomode-overlay-layer__image,
.photomode-overlay-layer__livery,
.photomode-overlay-layer__uiapp,
.photomode-overlay-layer__missing {
  position: absolute;
  inset: 0;
}

.photomode-overlay-layer__livery {
  width: 100%;
  height: 100%;
}

.photomode-overlay-layer__missing {
  background-repeat: repeat;
  background-size: auto;
  background-position: 0 0;
  outline: 1px solid rgba(255, 255, 255, 0.4);
}
</style>
