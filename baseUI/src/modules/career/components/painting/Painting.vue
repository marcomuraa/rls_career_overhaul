<template>
  <div class="painting-wrapper">
    <ComputerPanel
      class="painting-page"
      v-bng-scoped-nav="{ scopeId: 'career-painting', preferAutoFocus: true }"
      v-bng-on-ui-nav:tab_l="onTabLeft"
      v-bng-on-ui-nav:tab_r="onTabRight"
      v-bng-on-ui-nav:context="onContextToCart"
      tabindex="-1"
      v-bng-blur="1"
      :active="isPaintingScopeActive"
      :heading="$translate.instant('ui.career.shared.pathPainting')"
      heading-hint-start-icon="arrowLargeRight"
      heading-hint-start-binding-event="context"
      >
      <div class="painting-page-content">
        <BngCardHeading v-if="!noHeader">{{ $translate.instant("ui.career.shared.pathPainting") }}</BngCardHeading>
        <div v-if="!hasPaintingData" class="painting-loading">{{ $translate.instant("ui.common.loading") }}</div>
        <template v-else>
          <Tabs
            ref="tabsRef"
            class="bng-tabs"
            :selected-index="0"
            :make-tab-header-classes="headerClass"
            :style="headerVars"
            @change="changedPaintIndexTab"
          >
            <TabList>
              <template #before>
                <div class="painting-tabs-side painting-tabs-side-start" bng-no-child-nav="true">
                  <BngButton
                    class="painting-tabs-arrow"
                    :accent="ACCENTS.ghost"
                    bng-no-nav
                    tabindex="-1"
                    @click="goPrevTab"
                  >
                    <BngIcon :type="icons.arrowLargeLeft" />
                    <span class="painting-tabs-binding-slot">
                      <BngBinding
                        v-show="isPaintingScopeActive"
                        class="painting-tabs-binding"
                        ui-event="tab_l"
                        controller
                        track-ignore
                      />
                    </span>
                  </BngButton>
                </div>
              </template>
              <template #after>
                <div class="painting-tabs-side painting-tabs-side-end" bng-no-child-nav="true">
                  <BngButton
                    class="painting-tabs-arrow"
                    :accent="ACCENTS.ghost"
                    bng-no-nav
                    tabindex="-1"
                    @click="goNextTab"
                  >
                    <span class="painting-tabs-binding-slot">
                      <BngBinding
                        v-show="isPaintingScopeActive"
                        class="painting-tabs-binding"
                        ui-event="tab_r"
                        controller
                        track-ignore
                      />
                    </span>
                    <BngIcon :type="icons.arrowLargeRight" />
                  </BngButton>
                </div>
                <span class="painting-tabs-context-slot" bng-no-child-nav="true">
                  <BngBinding
                    v-show="!isPaintingScopeActive"
                    class="painting-tabs-binding"
                    ui-event="context"
                    controller
                    track-ignore
                  />
                </span>
              </template>
            </TabList>
            <div
              v-for="(paint, idx) in paints" :key="idx"
              :tab-heading="$translate.instant('ui.career.painting.paintTab', { number: idx + 1 })"
              class="paintClassSelectPane"
            >
              <BngSelect
                :options="paintClassOptions"
                :config="paintClassSelectConfig"
                v-model="colorClass"
                @change="changedPaintClassSelect" />
            </div>
          </Tabs>

          <BngCard>
            <div class="paintPicker">
              <PaintPicker
                ref="paintPicker"
                v-model="paints[paintIndex]"
                :show-main="showPickerMain()"
                :presets="getPickerShowPresets() ? presets : undefined"
                :presets-editable="getPickerPresetsEditable()"
                :advanced-open="false"
                :show-advanced-switch="false"
                @change="onChange" />

              <div v-if="showClearCoatOption()" class="clearCoatSection">
                <BngSwitch v-model="clearCoatActive" @valueChanged="clearCoatUpdateCallback">
                  {{ $translate.instant("ui.career.painting.addClearCoat", { basePrice: units.beamBucks(prices.clearcoatBase.money.amount) }) }}
                </BngSwitch>
                <BngColorSlider style="margin-top: 0.7em;" v-if="clearCoatActive" v-model="clearCoatPolish" @change="changeClearCoatPolish">{{ $translate.instant("ui.career.painting.clearCoatPolish") }}</BngColorSlider>
              </div>
            </div>
          </BngCard>
        </template>
      </div>

    </ComputerPanel>

    <PaintShoppingCart
      :active="isCartScopeActive"
      :can-activate="hasCartNavigableItems"
      :changed-paint="changedPaint"
      :rows="getShoppingCartTable()"
      :total-price="totalPrice"
      :can-pay="canPay"
      @reset-paint="resetPaint"
      @apply="apply"
      @context-to-painting="onContextToPainting" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"
import { lua, useBridge } from "@/bridge"
import { Tabs, TabList } from "@/common/components/utility"
import { BngCardHeading, BngButton, BngCard, BngColorSlider, BngSwitch, BngSelect, BngBinding, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngBlur, vBngScopedNav } from "@/common/directives"
import { useScopedNav } from "@/services/scopedNav/api"

defineProps({
  noHeader: Boolean,
})

// Emitted once the initial paintingData payload has arrived and been applied, so
// the route view can ack routeMounted and activate the painting scope.
const emit = defineEmits(["ready"])

import PaintPicker from "@/modules/vehicleConfig/components/PaintPicker.vue"
import PaintShoppingCart from "./PaintShoppingCart.vue"
import ComputerPanel from "../ComputerPanel.vue"
import Paint from "@/utils/paint"
import { $translate } from "@/services/translation"

const { units, events } = useBridge()

const presets = ref({})

const colorClass = ref("factory")
const paintIndex = ref(0)
const chosenPackage = ref([{}, {}, {}])
const changedPaint = ref(false)
const totalPrice = ref(0)

const clearCoatActive = ref(false)
const clearCoatPolish = ref(0)

const paints = ref([])
const originalPaints = ref([])
const prices = ref({})
const colorClassData = ref({})
const canPay = ref(false)
const paintPicker = ref(null)
const tabsRef = ref(null)

const { requestScopeFocus, switchScope, current } = useScopedNav()

const goPrevTab = () => tabsRef.value?.goPrev?.()
const goNextTab = () => tabsRef.value?.goNext?.()

const refocusScope = () => nextTick(() => requestScopeFocus("career-painting"))

// The cart is enterable whenever paint has changed, so the user can still remove
// items even when the purchase button is disabled by insufficient funds.
const hasCartNavigableItems = computed(() => changedPaint.value)
const isPaintingScopeActive = computed(() => current.value?.id === "career-painting")
const isCartScopeActive = computed(() => current.value?.id === "career-painting-cart")

const onContextToCart = () => {
  if (!hasCartNavigableItems.value) return
  switchScope("career-painting-cart")
}
const onContextToPainting = () => switchScope("career-painting")

const onTabLeft = () => {
  goPrevTab()
  refocusScope()
}
const onTabRight = () => {
  goNextTab()
  refocusScope()
}

const hasPaintingData = computed(() => paints.value.length > 0 && !!prices.value.basePrices && !!prices.value.clearcoatBase)

const paintClassTabInfo = [
  {
    defaultPaintClass: "factory",
    titleKey: "ui.color.factory",
  },
  {
    defaultPaintClass: "semiGloss",
    titleKey: "ui.career.painting.tab.gloss",
    paintClasses: [
      { id: "matte", titleKey: "ui.career.painting.class.matte" },
      { id: "semiGloss", titleKey: "ui.career.painting.class.semiGloss" },
      { id: "gloss", titleKey: "ui.career.painting.class.gloss" },
    ],
  },
  {
    defaultPaintClass: "metallic",
    titleKey: "ui.career.painting.tab.metallic",
    paintClasses: [
      { id: "semiMetallic", titleKey: "ui.career.painting.class.semiMetallic" },
      { id: "metallic", titleKey: "ui.color.metallic" },
      { id: "chrome", titleKey: "ui.career.painting.class.chrome" },
    ],
  },
  {
    defaultPaintClass: "custom",
    titleKey: "ui.color.custom",
  },
]

// Expose only the four top-level categories (Factory, Gloss, Metallic, Custom) in
// the paint-class BngSelect. Grouped class entries are not flattened into separate
// visible options; each top-level entry uses its defaultPaintClass.
const paintClassOptions = paintClassTabInfo.map(tab => ({ id: tab.defaultPaintClass, titleKey: tab.titleKey }))

const paintClassSelectConfig = {
  value: opt => opt.id,
  label: opt => $translate.instant(opt.titleKey),
}

const PAINT_CLASS_KEYS = {
  factory: "ui.color.factory",
  custom: "ui.color.custom",
  matte: "ui.career.painting.class.matte",
  semiGloss: "ui.career.painting.class.semiGloss",
  gloss: "ui.career.painting.class.gloss",
  semiMetallic: "ui.career.painting.class.semiMetallic",
  metallic: "ui.color.metallic",
  chrome: "ui.career.painting.class.chrome",
}

// i tried to use a watcher instead of a valueChanged callback, but that broke the painting menu for some reason (it makes the paint picker apply color changes to all 3 vehicle paints)
const clearCoatUpdateCallback = newValue => {
  clearCoatPolish.value = 0
  changeClearCoatPolish(0)
  enableClearCoat(newValue)
}

// PaintPicker ref can be null when Tabs emits its initial `change` during setup,
// before the nested PaintPicker has mounted. Guard all ref access through these.
const setPaintPickerAdvancedVisible = isVisible => paintPicker.value?.setAdvancedVisible(isVisible)
const notifyPaintPickerUpdated = () => paintPicker.value?.paintUpdated()

const enableClearCoat = enabled => {
  paints.value[paintIndex.value]._clearcoat = enabled ? 1 : 0
  notifyPaintPickerUpdated()
}

const changeClearCoatPolish = value => {
  paints.value[paintIndex.value]._clearcoatRoughness = -0.13 * value + 0.13
  notifyPaintPickerUpdated()
}

const getShoppingCartTable = () => {
  let res = []

  for (const [index, paintOptions] of chosenPackage.value.entries()) {
    if (!Object.keys(paintOptions).length) continue

    res.push({
      name: $translate.instant("ui.career.painting.cart.paintLine", {
        number: index + 1,
        paintClass: getNicePaintClassName(paintOptions.paintClass),
      }),
      price: prices.value.basePrices[paintOptions.paintClass].money.amount,
      topLevel: true,
      index,
    })

    if (paintOptions.clearCoat) {
      res.push({
        name: $translate.instant("ui.career.painting.cart.clearcoat"),
        price: prices.value.clearcoatBase.money.amount,
      })
      res.push({
        name: $translate.instant("ui.career.painting.cart.extraClearCoatPolish"),
        price: prices.value.clearcoatPolishFactor.money.amount * paintOptions.clearCoatPolish,
      })
    }
  }

  return res
}

const setPaintingShoppingCartData = data => {
  canPay.value = data.canPay
  totalPrice.value = data.totalPrice.money.amount
}

const setPaintingData = data => {
  if (!data) return
  presets.value = data.factoryPaint || {}
  prices.value = data.prices || {}
  colorClassData.value = data.colorClassData || {}
  if (!Array.isArray(data.colors)) {
    paints.value = []
    originalPaints.value = []
    return
  }
  paints.value = data.colors.map(val => new Paint({ paint: val }))
  originalPaints.value = data.colors.map(val => new Paint({ paint: val }))
  if (hasPaintingData.value) emit("ready")
}

const getPickerShowPresets = () => colorClass.value == "factory"

const getPickerPresetsEditable = () => colorClass.value == "custom"

const showPickerMain = () => colorClass.value != "factory"

const showClearCoatOption = () => colorClass.value != "factory" && colorClass.value != "custom"

const setCurrentColorClass = () => {
  setPaintPickerAdvancedVisible(false)
  paints.value[paintIndex.value]._metallic = colorClassData.value[colorClass.value].metallic
  paints.value[paintIndex.value]._roughness = colorClassData.value[colorClass.value].roughness
  clearCoatActive.value = false
  enableClearCoat(false)
}

const changedPaintIndexTab = tab => {
  paintIndex.value = tab.index
  colorClass.value = chosenPackage.value[paintIndex.value].paintClass || "factory"
  setPaintPickerAdvancedVisible(colorClass.value == "custom")
  clearCoatActive.value = !!chosenPackage.value[paintIndex.value].clearCoat
  clearCoatPolish.value = chosenPackage.value[paintIndex.value].clearCoatPolish || 0
}

const changedPaintClassSelect = paintClass => changedPaintClassTab(paintClass)

const changedPaintClassTab = paintClass => {
  if (paintClass == "factory") {
    colorClass.value = "factory"
    return
  }
  if (paintClass == "custom") {
    colorClass.value = "custom"
    setPaintPickerAdvancedVisible(true)
    clearCoatActive.value = false
    return
  }

  colorClass.value = paintClass
  setCurrentColorClass()
}

function resetPaint(index) {
  chosenPackage.value[index] = {}

  // Copy the original paint
  Object.assign(paints.value[index], originalPaints.value[index])

  let chosenPackageEmpty = true
  for (const color of Object.values(chosenPackage.value)) {
    if (Object.keys(color).length !== 0) {
      chosenPackageEmpty = false
    }
  }
  if (chosenPackageEmpty) {
    changedPaint.value = false
  }

  lua.career_modules_painting.setPaints(
    paints.value.map(paint => paint.paintObject),
    chosenPackage.value
  )

  if (!canPay.value || !changedPaint.value) switchScope("career-painting")
}

function onChange() {
  if (colorClass.value == "factory") {
    clearCoatActive.value = false
  }
  chosenPackage.value[paintIndex.value].paintClass = colorClass.value
  chosenPackage.value[paintIndex.value].clearCoat = clearCoatActive.value
  chosenPackage.value[paintIndex.value].clearCoatPolish = clearCoatPolish.value

  changedPaint.value = true

  lua.career_modules_painting.setPaints(
    paints.value.map(paint => paint.paintObject),
    chosenPackage.value
  )
}

const getNicePaintClassName = paintClass => {
  const key = PAINT_CLASS_KEYS[paintClass]
  return key ? $translate.instant(key) : paintClass
}

function headerClass(tab) {
  return {
    "painting-tab": true,
    [`painting-tab-${tab.index}`]: true,
  }
}
const headerVars = computed(() =>
  paints.value.reduce(
    (res, paint, idx) => ({
      ...res,
      [`--painting-dot-${idx}`]: `hsl(${Paint.hslCssStr(paint.hsl)})`,
    }),
    {}
  )
)

const apply = () => lua.career_modules_painting.apply()
const close = () => lua.career_modules_painting.close()

const start = () => {
  events.on("paintingData", setPaintingData)
  events.on("sendPaintingShoppingCartData", setPaintingShoppingCartData)
  lua.career_modules_painting.onUIOpened()
  lua.career_modules_painting.sendPaintingDataToUI()
}

onMounted(start)
onUnmounted(() => {
  events.off("paintingData", setPaintingData)
  events.off("sendPaintingShoppingCartData", setPaintingShoppingCartData)
  lua.career_modules_painting.cleanup()
})

defineExpose({
  apply,
  close,
})
</script>

<style scoped lang="scss">
.painting-page {
  color: var(--bng-off-white);
  width: 50%;
  height: 100%;
}

:deep(.painting-tab) {
  &::after {
    content: "";
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: var(--bng-corners-3);
    margin-left: 0.5em;
  }
  @for $i from 0 through 2 {
    &.painting-tab-#{$i}::after {
      background-color: var(--painting-dot-#{$i});
    }
  }
}

.painting-page-content {
  overflow: auto;
}

.painting-loading {
  padding: 1em;
  opacity: 0.7;
}

.paintPicker {
  margin: 0.5em;
}

.clearCoatSection {
  margin-top: 1em;
}

.painting-wrapper {
  position: relative;
  height: 100%;
}

.button-container {
  margin-left: 0.5em;
  display: flex;
  //gap: 0.5em;
  flex-wrap: wrap;
}

.paintClassSelectPane {
  padding: 0.5em;
}

.painting-tabs-side {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.painting-tabs-side-start {
  justify-content: flex-end;
}

.painting-tabs-side-end {
  justify-content: flex-start;
}

.painting-tabs-arrow {
  --bng-button-margin: 0;
  --bng-button-min-width: 2.5rem;
  --bng-button-padding: 0.35rem;
  --bng-icon-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.painting-tabs-binding-slot {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.painting-tabs-binding {
  pointer-events: none;
}

.painting-tabs-context-slot {
  margin-left: auto;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
}
</style>
