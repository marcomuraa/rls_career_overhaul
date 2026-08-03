<template>
  <div
    v-if="tabbed"
    class="paint-acc-wrapper"
    :class="{ 'with-background': withBackground }"
  >
    <div class="paint-preview-container">
      <PaintPreview :paints="paints" @select="tabExpand" />
    </div>
    <Accordion
      class="paint-acc-container"
      v-bng-blur="withBackground"
      singular
    >
      <AccordionItem
        key="multi-paint-setups"
        class="paint-acc-content"
        navigable
      >
        <template #caption>
          {{ $t("ui.color.paint.multiPaintSetups") }}
        </template>
        <div class="multi-paint-setups-content">
          <template v-for="paint in multipaint" :key="paint.name">
            <BngPaintTile
              class="multi-paint-setup-item"
              :paint-id="`${configId}:${paint.id}`"
              :paint="paint.paints"
              :paint-name="paint.name"
              :paint-names="paint.paintNames"
              :width="72"
              :height="24"
              with-menu
              @click="paint.apply"
              @menu-click="paint.apply"
            />
          </template>
          <div v-if="multipaint.length > 0" class="multi-paint-setup-item multi-paint-randomize-item">
            <BngPaintTile
              :paint-name="$t('ui.color.paint.randomMultipaintSetup')"
              :width="72"
              :height="24"
              @click="applyRandomMultipaint"
            />
            <BngIcon type="dice24" class="multi-paint-randomize-icon" />
          </div>
          <div v-if="availablePaintNames.length > 0" class="multi-paint-setup-item multi-paint-randomize-item">
            <BngPaintTile
              :paint-name="$t('ui.color.paint.randomizeEachPaint')"
              :width="72"
              :height="24"
              @click="applyRandomPaintPerSlot"
            />
            <BngIcon type="dice24" class="multi-paint-randomize-icon left " />
            <BngIcon type="dice24" class="multi-paint-randomize-icon middle" />
            <BngIcon type="dice24" class="multi-paint-randomize-icon right" />
          </div>
        </div>
      </AccordionItem>
      <AccordionItem
        v-for="idx in color.length"
        :key="idx"
        class="paint-acc-content"
        navigable
        :expanded="tabsState[idx - 1]"
        :style="previewStyles[idx - 1]"
      >
        <template #caption>
          {{ $t("ui.color.paint.unnamed", { index: idx }) }}
        </template>
        <div class="paint-picker-wrapper" v-bng-scoped-nav="{bubbleWhitelistEvents: ['menu']}" @deactivate="resetScroll">
          <PaintPicker
            class="paint-picker"
            picker-mode="compact_luminosity"
            v-model="color[idx - 1]"
            @change="updateColor(idx - 1)"
            :show-preview="false"
            presets-editable
            :presets="vehiclePaintPresets"
            :legacy="legacy"
          />
          <div v-if="bottomSpacer" class="paint-bottom-spacer" aria-hidden="true" />
        </div>
      </AccordionItem>
      <div v-if="bottomSpacer" class="paint-bottom-spacer" aria-hidden="true" />
    </Accordion>
  </div>
  <div
    v-else
    class="paint-container"
    :class="{ 'with-background': withBackground }"
    v-bng-blur="withBackground"
  >
    <PaintPicker
      v-for="idx in color.length"
      :key="idx"
      v-model="color[idx - 1]"
      @change="updateColor(idx - 1)"
      :show-preview="false"
      presets-editable
      :presets="vehiclePaintPresets"
      :legacy="legacy"
    >{{ $t("ui.color.paint.unnamed", { index: idx }) }}</PaintPicker>
    <div v-if="color.length % 2 === 1"></div>
    <div v-if="bottomSpacer" class="paint-bottom-spacer" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { BngPaintTile, BngIcon } from "@/common/components/base"
import { vBngBlur, vBngScopedNav } from "@/common/directives"
import PaintPicker from "./PaintPicker.vue"
import PaintPreview from "./PaintPreview.vue"
import Paint from "@/utils/paint"
import { usePaintPreviews } from "@/services/paint-previews"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { debounce } from "@/utils/rateLimit"
import { sleep } from "@/utils"

const navBlocker = useUINavBlocker()
navBlocker.blockOnly(["context"])

const paintPreviews = usePaintPreviews()

const props = defineProps({
  withBackground: Boolean,
  tabbed: {
    type: Boolean,
    default: true,
  },
  legacy: {
    type: Boolean,
    default: true,
  },
  bottomSpacer: Boolean,
})

const events = useEvents()

const colorDefault = "1 1 1 1 0 1 1 0"
// 0.09 0.21 0.47 1.2 0 1 1 0.06 - default d-series paint

const configId = ref("none")

const vehiclePaintPresets = ref({})
const multiPaintSetups = ref({})

const tabsState = ref([true, false, false])
function tabExpand(idx) {
  for (let i = 0; i < tabsState.value.length; i++) {
    tabsState.value[i] = false
  }
  nextTick(() => {
    tabsState.value[idx] = true
  })
}

const color = ref([colorDefault, colorDefault, colorDefault])
const updateColor = (index, preview = true) => nextTick(() => {
  lua.core_vehicle_colors.setVehicleColor(index, color.value[index])
  paints[index].paint = color.value[index]
  if (preview) updatePaint(index)
})

function resetScroll() {
  const elm = document.activeElement.closest(".bng-accitem-content")
  if (elm) elm.scrollTop = 0
}

const paints = Array.from({ length: color.value.length }, () => reactive(new Paint({ legacy: props.legacy })))
const paintImgs = ref(Array(color.value.length).fill(null))
const previewStyles = ref(Array(color.value.length).fill(null).map(() => ({
  "--paint-url": "none",
  "--paint-prev-url": "none",
  "--paint-prev-transition": "none",
  "--paint-prev-opacity": 0,
})))
const previewAnimating = Array(color.value.length).fill(0) // 0: not animating, 1: animating, -1: cancelling
const previewAnimTime = 400 // set to 0 to disable transition

const updatePaintPreview = async (index, url) => {
  if (previewAnimating[index] === 1) {
    previewAnimating[index] = -1
    while (previewAnimating[index] === -1) await sleep(50)
  }
  previewAnimating[index] = 1
  previewStyles.value[index]["--paint-prev-transition"] = "none"
  paintImgs.value[index] = url
  if (previewAnimTime === 0) {
    if (previewAnimating[index] === -1) return previewAnimating[index] = 0
    previewStyles.value[index]["--paint-url"] = `url(${url})`
    previewAnimating[index] = 0
    return
  }
  const currentUrl = previewStyles.value[index]["--paint-url"]
  const isFirstRender = currentUrl === "none" || !currentUrl
  if (isFirstRender) {
    if (previewAnimating[index] === -1) return previewAnimating[index] = 0
    previewStyles.value[index]["--paint-url"] = `url(${url})`
    previewAnimating[index] = 0
    return
  }
  previewStyles.value[index]["--paint-prev-url"] = currentUrl
  previewStyles.value[index]["--paint-url"] = `url(${url})`
  previewStyles.value[index]["--paint-prev-opacity"] = 1
  previewStyles.value[index]["--paint-prev-transition"] = "none"
  requestAnimationFrame(() => {
    if (previewAnimating[index] === -1) return previewAnimating[index] = 0
    previewStyles.value[index]["--paint-prev-transition"] = `opacity ${previewAnimTime}ms ease-in-out`
    previewStyles.value[index]["--paint-prev-opacity"] = 0
    setTimeout(() => {
      if (previewAnimating[index] === -1) return previewAnimating[index] = 0
      previewStyles.value[index]["--paint-prev-transition"] = "none"
      previewAnimating[index] = 0
    }, previewAnimTime)
  })
}

const updatePaint = debounce(async index => {
  const paintData = color.value[index]
  paintPreviews.getBlobPreview(paintData, {
    paintId: `${configId.value}:single-${index}`, width: 80, height: 24,
  }).then(url => {
    if (url) updatePaintPreview(index, url)
  }).catch(() => { })
}, 30)

const updateAllPaints = async () => {
  const urls = await Promise.all(paints.map(async (paint, idx) => await paintPreviews.getBlobPreview(paint.paint, {
    paintId: `${configId.value}:single-${idx}`, width: 80, height: 24,
  })))
  for (let i = 0; i < color.value.length; i++) {
    updatePaintPreview(i, urls[i])
  }
}

const multipaint = computed(() => {
  const res = []
  for (let i = 0; i < multiPaintSetups.value.length; i++) {
    const setup = multiPaintSetups.value[i]
    const paintNames = [setup.paintName1, setup.paintName2, setup.paintName3]
    const paints = paintNames.map(name => vehiclePaintPresets.value[name])
    res.push({
      id: paintNames.join("|"),
      name: setup.name,
      paintNames,
      paints,
      apply: idx => applyMultipaint(setup, idx),
    })
  }
  return res
})

const availablePaintNames = computed(() => Object.keys(vehiclePaintPresets.value || {}).filter(name => !!vehiclePaintPresets.value[name]))

function applyMultipaint(setup, index = -1) {
  console.log("applyMultipaint", index)
  const paintNames = [setup.paintName1, setup.paintName2, setup.paintName3]
  for (let i = 0; i < paintNames.length; i++) {
    if (index > -1 && i !== index) continue
    const paintName = paintNames[i]
    if (paintName && paintName.trim() !== "") {
      if (vehiclePaintPresets.value[paintName]) {
        const paintData = vehiclePaintPresets.value[paintName]
        const paint = new Paint({ legacy: props.legacy })
        paint.paint = paintData
        color.value[i] = paint.paintString
        updateColor(i, false)
      }
    }
  }
  nextTick(updateAllPaints)
}

function applyRandomMultipaint() {
  if (!multipaint.value.length) return
  const randomIndex = Math.floor(Math.random() * multipaint.value.length)
  multipaint.value[randomIndex].apply()
}

function applyRandomPaintPerSlot() {
  if (!availablePaintNames.value.length) return
  for (let i = 0; i < color.value.length; i++) {
    const randomIndex = Math.floor(Math.random() * availablePaintNames.value.length)
    const randomPaintName = availablePaintNames.value[randomIndex]
    const paintData = vehiclePaintPresets.value[randomPaintName]
    if (!paintData) continue
    const paint = new Paint({ legacy: props.legacy })
    paint.paint = paintData
    color.value[i] = paint.paintString
    updateColor(i, false)
  }
  nextTick(updateAllPaints)
}

async function fetchDefinedColors() {
  for (let i = 0; i < color.value.length; i++) {
    const promise = i === 0 ? lua.getVehicleColor() : lua.getVehicleColorPalette(i - 1)
    color.value[i] = (await promise) || colorDefault
    paints[i].paint = color.value[i]
  }
  await updateAllPaints()
  // console.log("fetchDefinedColors", color.value)
}

async function getVehicleColors() {
  const data = await lua.core_vehicles.getCurrentVehicleDetails()
  vehiclePaintPresets.value = data.model?.paints || {}
  multiPaintSetups.value = data.model?.multiPaintSetups || []
  configId.value = data.current?.config_key
  let currentKey = data.current?.config_key

  if (currentKey) {
    let newMultiPaintSetups = []
    for (let i = 0; i < multiPaintSetups.value.length; i++) {
      if (multiPaintSetups.value[i].usedByConfigByKey[currentKey] || multiPaintSetups.value[i].forAllConfigs) {
        // remove from multiPaintSetups
        newMultiPaintSetups.push(multiPaintSetups.value[i])
      }
    }
    multiPaintSetups.value = newMultiPaintSetups
  }
  await fetchDefinedColors()
}

events.on("VehicleChange", getVehicleColors)
events.on("VehicleFocusChanged", getVehicleColors)
events.on("VehicleChangeColor", fetchDefinedColors)

onMounted(getVehicleColors)
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

$bg-color: rgba(0, 0, 0, 0.6);

.paint-acc-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
  .paint-acc-container {
    flex: 0 1 auto;
    justify-content: stretch;
    align-items: stretch;
    min-height: 2em;
    padding: 0;
    overflow: hidden;
    .paint-acc-content {
      flex: 0 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: stretch;
      align-items: stretch;
      min-height: 2em;
      padding: 0 0.5em;
      overflow: hidden;
      :deep(.bng-accitem-content) {
        flex: 1 1 auto;
        margin: 0.1em -0.5em;
        padding: 0.25em;
        overflow-y: auto;
      }
    }
  }
  &:not(.with-background) {
    padding: 0.5em;
  }
  &.with-background {
    .paint-acc-content:not(.bng-accitem-expanded) {
      :deep(.bng-accitem-caption) {
        background-color: $bg-color;
      }
    }
    .paint-acc-content.bng-accitem-expanded {
      border-radius: $border-rad-2;
      background-color: $bg-color;
    }
  }

  .paint-picker-wrapper {
    width: 100%;
    height: 100%;
    overflow: visible;
    @include modify-focus(var(--bng-corners-2), 0.01em);
  }
}

.paint-container,
.paint-container-tabs {
  height: 100%;
  overflow: auto;
}

.paint-bottom-spacer {
  flex: 0 0 3rem;
  height: 3rem;
}

.paint-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: flex-start;
  padding: 1rem;
  > * {
    width: 48%;
  }
  &.with-background {
    background-color: $bg-color;
  }
}

.paint-acc-container {
  @include modify-focus($border-rad-1, 0px);
  :deep(.bng-accitem-content) {
    padding: 0.4rem;
  }
}

.paint-acc-content > :deep(.bng-accitem-caption) {
  background-image: var(--paint-url, none);
  &, &::after {
    background-size: 5em 100%;
    background-repeat: no-repeat;
    background-position: 100% 50%;
  }
  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 5em;
    height: 100%;
    border-radius: 0 $border-rad-2 $border-rad-2 0;
    background-image: var(--paint-prev-url, none);
    opacity: var(--paint-prev-opacity, 0);
    transition: var(--paint-prev-transition, none);
    pointer-events: none;
  }
}

.paint-preview-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 0.5em;
}

.multi-paint-setups-content {
  $tile: 4.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, $tile);
  gap: 0.5rem;
  padding: 0.5rem;
  width: 100%;
  --tile-width: $tile;
}

.multi-paint-setup-item {
  height: 24px;
}

.multi-paint-randomize-item {
  position: relative;
  //border: 2px solid rgba(255, 255, 255, 0.5);
  outline: 2px solid rgba(255, 255, 255, 0.5);
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0.25em;
}

.multi-paint-randomize-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -46%);
  pointer-events: none;
  --bng-icon-size: 1.5em;


  &.left {
    left: 0;
    transform: translate(0, -46%);
    --bng-icon-color: rgba(255, 128, 128, 1);
  }
  &.middle {
    --bng-icon-color: rgba(128, 255, 128, 1);
  }
  &.right {
    right: 0;
    left: auto;
    transform: translate(0, -46%);
    --bng-icon-color: rgba(128, 128, 255, 1);
  }
}
</style>
