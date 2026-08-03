<template>
  <div ref="rootEl" class="photomode-composition-grid" aria-hidden="true">
    <template v-if="lineMode">
      <span
        v-for="(line, index) in gridLines"
        :key="index"
        class="photomode-composition-grid__line"
        :class="`photomode-composition-grid__line--${line.axis}`"
        :style="line.style"
      />
    </template>
    <div
      v-else-if="frameMode"
      class="photomode-composition-grid__frame"
      :class="`photomode-composition-grid__frame--${mode}`"
      :style="frameStyle"
    />
    <img
      v-else-if="referenceMode"
      class="photomode-composition-grid__reference"
      :src="referenceMode.src"
      alt=""
      draggable="false"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import { getURL } from "@/utils"

defineOptions({ name: "PhotomodeCompositionGrid" })

const props = defineProps({
  mode: {
    type: String,
    default: "off",
  },
})

const GRID_LINE_RATIOS = Object.freeze({
  thirds: [1 / 3, 2 / 3],
  golden: [0.382, 0.618],
})

const FRAME_RATIOS = Object.freeze({
  vertical: 9 / 16,
  horizontal: 16 / 9,
})

const COMPOSITION_GRID_ROOT = "/ui/ui-vue/src/modules/pause/views/photomode/overlays/compositionGrid"

const REFERENCE_MODES = Object.freeze({
  "dev-loading": {
    src: getURL(`${COMPOSITION_GRID_ROOT}/dev-loading.png`),
  },
  "dev-mainmenu": {
    src: getURL(`${COMPOSITION_GRID_ROOT}/dev-mainmenu.png`),
  },
})

const rootEl = ref(null)
const frameBounds = reactive({
  width: 0,
  height: 0,
})
let resizeObserver = null

const lineMode = computed(() => Array.isArray(GRID_LINE_RATIOS[props.mode]))
const frameMode = computed(() => FRAME_RATIOS[props.mode] || null)
const referenceMode = computed(() => REFERENCE_MODES[props.mode] || null)

const frameStyle = computed(() => {
  const targetRatio = frameMode.value
  if (!targetRatio || frameBounds.width <= 0 || frameBounds.height <= 0) return null

  const boundsRatio = frameBounds.width / frameBounds.height
  if (boundsRatio > targetRatio) {
    return {
      width: `${frameBounds.height * targetRatio}px`,
      height: `${frameBounds.height}px`,
    }
  }

  return {
    width: `${frameBounds.width}px`,
    height: `${frameBounds.width / targetRatio}px`,
  }
})

const gridLines = computed(() => {
  const ratios = GRID_LINE_RATIOS[props.mode]
  if (!ratios) return []

  const lines = []
  ratios.forEach(ratio => {
    const percent = `${Number((ratio * 100).toFixed(4))}%`
    lines.push({ axis: "v", style: { left: percent } })
    lines.push({ axis: "h", style: { top: percent } })
  })
  return lines
})

function updateFrameBounds() {
  const rect = rootEl.value?.getBoundingClientRect()
  frameBounds.width = rect?.width || 0
  frameBounds.height = rect?.height || 0
}

onMounted(() => {
  updateFrameBounds()
  if (typeof ResizeObserver !== "undefined" && rootEl.value) {
    resizeObserver = new ResizeObserver(updateFrameBounds)
    resizeObserver.observe(rootEl.value)
    return
  }

  if (typeof window !== "undefined") {
    window.addEventListener("resize", updateFrameBounds)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateFrameBounds)
  }
})
</script>

<style lang="scss" scoped>
.photomode-composition-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.photomode-composition-grid__line {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.55),
    0 0 4px rgba(0, 0, 0, 0.85);
}

.photomode-composition-grid__line--v {
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-0.5px);
}

.photomode-composition-grid__line--h {
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-0.5px);
}

.photomode-composition-grid__frame {
  position: absolute;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.35);
}

.photomode-composition-grid__frame--vertical {
  border-left: 1px solid rgba(255, 255, 255, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
}

.photomode-composition-grid__frame--horizontal {
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
}

.photomode-composition-grid__reference {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.8;
  user-select: none;
}
</style>
