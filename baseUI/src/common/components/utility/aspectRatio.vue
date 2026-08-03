<!-- AspectRatio - for displaying an image at a fixed aspect ratio, optionally with overlaid content -->
<template>
  <div class="aspect-ratio" :style="backgroundStyle">
    <!-- Slot for content -->
    <div class="slotted">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { getAssetURL } from "@/utils"

const placeholderImageURL = getAssetURL("images/noimage.png")

const DEFAULT_RATIO = { width: 16, height: 9 }

function parseRatio(ratio) {
  if (typeof ratio !== "string") return null
  const trimmed = ratio.trim()
  if (!trimmed) return null

  const sep = trimmed.includes(":") ? ":" : trimmed.includes("/") ? "/" : null
  if (!sep) return null

  const [wRaw, hRaw] = trimmed.split(sep).map(s => s.trim())
  const width = Number(wRaw)
  const height = Number(hRaw)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

const parsedRatio = computed(() => parseRatio(props.ratio) || DEFAULT_RATIO)

// Prop for aspect ratio and image
const props = defineProps({
  ratio: {
    type: String,
    default: "16:9",
  },
  placeholder: {
    type: Boolean,
    default: false,
  },
  slotVAlign: {
    type: String,
    default: "center",
    validator: v => ["top", "center", "bottom"].includes(v),
  },
  slotScroll: {
    type: Boolean,
    default: true,
  },
  imageMode: {
    type: String,
    default: "cover",
    validator: value => ["cover", "contain"].includes(value),
  },
  image: {
    type: String,
    default: null,
  },
  externalImage: {
    type: String,
    default: null,
  },
})

const padding = computed(() => {
  const { width, height } = parsedRatio.value
  return `${(height / width) * 100}%`
})

const aspectRatio = computed(() => {
  const { width, height } = parsedRatio.value
  return `${width} / ${height}`
})

const slotJustifyContent = computed(() => {
  switch (props.slotVAlign) {
    case "top":
      return "flex-start"
    case "bottom":
      return "flex-end"
    default:
      return "center"
  }
})

// Compute background style
const backgroundStyle = computed(() => {
  const common = {
    "--padding": padding.value,
    "--aspect-ratio": aspectRatio.value,
    "--slot-v-align": slotJustifyContent.value,
    "--slot-overflow-y": props.slotScroll ? "auto" : "hidden",
  }

  if (props.image || props.externalImage) {
    return {
      ...common,
      backgroundImage: `url("${props.externalImage ? props.externalImage : getAssetURL(props.image)}")`,
    }
  }

  if (props.placeholder) {
    return {
      ...common,
      backgroundImage: `url("${placeholderImageURL}")`,
    }
  }

  return {
    ...common,
    backgroundImage: "none",
  }
})
</script>

<style lang="scss" scoped>
.aspect-ratio {
  position: relative;
  background-size: v-bind(imageMode);
  background-position: center;
  background-repeat: no-repeat;
}

.aspect-ratio::after {
  content: "";
  display: block;
  padding-bottom: var(--padding);
}

.aspect-ratio {
  // When supported, use native aspect-ratio and disable padding hack.
  @supports (aspect-ratio: 1 / 1) {
    aspect-ratio: var(--aspect-ratio);
    &::after {
      content: none;
      display: none;
      padding-bottom: 0;
    }
  }
}

.aspect-ratio > .slotted {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  white-space: normal;
  overflow-y: var(--slot-overflow-y, auto);
  overflow-x: hidden;
  display: flex;
  align-items: var(--slot-v-align, center);
  justify-content: center;
}
</style>
