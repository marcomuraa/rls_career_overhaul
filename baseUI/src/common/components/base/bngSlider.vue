<template>
  <div
    ref="elementRef"
    v-bng-scoped-nav="scopeDirective"
    v-bng-disabled="effectiveDisabled"
    v-bng-on-ui-nav:context.focusRequired="internalContextNavHandler"
    class="bng-slider-container"
    :class="{
      'no-focus-frame': inRow,
      'has-always-markers': alwaysShowMarkers && !overlayMarkers && resolvedMarkers.length > 0,
      'has-overlay-markers': overlayMarkers && resolvedMarkers.length > 0,
    }"
    @activate="onScopeActivated(true, $event)"
    @deactivate="onScopeActivated(false)"
    @focusin="onContainerFocusIn"
    @focusout="onContainerFocusOut"
  >
    <div class="bng-slider-track-wrap">
      <input
        ref="sliderRef"
        class="bng-slider"
        type="range"
        :disabled="effectiveDisabled"
        v-model.number="sliderValue"
        :min="sliderMin"
        :max="sliderMax"
        :step="sliderStep"
        v-bng-on-ui-nav:ok,back.focusRequired="onSliderConfirm"
        v-bng-on-ui-nav:context.focusRequired="internalContextNavHandler"
        v-bng-on-ui-nav-focus.repeat="uiNavFocusFunction"
        bng-scoped-nav-autofocus
        @pointerdown="onPointerDown"
        @input="onSliderInput"
        @change="onSliderChange"
        @focus="onSliderFocus"
        @blur="onSliderBlur"
      />
      <div
        v-if="resolvedMarkers.length"
        class="bng-slider-markers"
        :class="{ 'is-visible': markersVisible }"
        aria-hidden="true"
      >
        <div
          v-for="(m, i) in resolvedMarkers"
          :key="i"
          v-bng-tooltip:top="m.tooltip"
          class="bng-slider-marker"
          :style="{ left: m.percent + '%', '--marker-lift': m.liftRatio }"
          @pointerdown="onMarkerPointerDown"
          @click="onMarkerClick(m.value)"
        >
          <BngIconMarker
            class="bng-slider-marker-icon"
            :marker="m.marker"
            :type="m.type"
            :color="m.color"
          />
        </div>
      </div>
    </div>
    <BngButton
      v-if="canShowMarkerPopover"
      ref="markerPopoverButtonRef"
      class="bng-slider-popover-button"
      bng-no-nav="true"
      tabindex="-1"
      :accent="ACCENTS.text"
      :disabled="effectiveDisabled"
      aria-label="Open marker options"
      @click.stop="toggleMarkerPopover"
    >
      <BngBinding v-show="componentFocused" ui-event="context" controller class="bng-slider-popover-binding" />
      <BngIcon class="bng-slider-popover-icon" :type="icons.listSmall" />
    </BngButton>
    <BngInput
      v-if="withInput"
      ref="inputRef"
      v-model="inputProps.value"
      :min="inputProps.min"
      :max="inputProps.max"
      :step="inputProps.step"
      :suffix="unit"
      :show-external-button="false"
      :validation-type="VALIDATION_TYPES.blur"
      :disabled="effectiveDisabled"
      :no-validation="inputNoValidation"
      :validate="inputValidate"
      :error-message="inputErrorMessage"
      :maxlength="inputMaxlength"
      :placeholder="inputPlaceholder"
      no-scope
      bubble-confirm-events-on-no-scope
      no-spinners
      :type="inputType"
      bng-no-nav="true"
      bng-no-child-nav="true"
      tabindex="-1"
      class="bng-slider-input"
      v-bng-on-ui-nav:back="onBackFromInput"
      v-bng-on-ui-nav:ok="onOkFromInput"
      v-bng-on-ui-nav:context.focusRequired="internalContextNavHandler"
      v-bng-on-ui-nav:focus_l,focus_r.focusRequired="() => false"
      @focus="onEmbeddedInputFocus"
      @blur="onEmbeddedInputBlur"
      @enter="toggleFocusedInput"
    />
    <BngButton
      v-if="withReset"
      ref="resetRef"
      class="bng-slider-reset"
      bng-no-nav="true"
      tabindex="-1"
      :accent="ACCENTS.text"
      :icon="icons.undo"
      :disabled="resetDisabled"
      @click="resetValue"
    />
    <BngPopoverContent v-if="withInput && !canShowMarkerPopover && showIfController" :name="uniqueInputHintName" placement="top">
      <BngBinding ui-event="context" />
    </BngPopoverContent>
    <BngPopoverContent v-if="withReset && showIfController" :name="uniqueResetHintName" placement="top">
      <BngBinding ui-event="back" />
    </BngPopoverContent>
    <BngPopoverContent
      v-if="canShowMarkerPopover"
      :name="uniqueMarkerPopoverName"
      placement="right-start"
      hide-arrow
      @hide="onMarkerPopoverHide"
    >
      <template #default="{ hide }">
        <slot name="popover" :hide="hide"></slot>
      </template>
    </BngPopoverContent>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, inject, provide, useSlots, nextTick } from "vue"
import { BngInput, BngButton, BngBinding, BngIcon, BngIconMarker, BngPopoverContent, ACCENTS, icons, VALIDATION_TYPES, numberApi } from "@/common/components/base"
import { vBngScopedNav, vBngOnUiNavFocus, vBngDisabled, vBngOnUiNav, vBngTooltip } from "@/common/directives"
import { useDirty } from "@/services/dirty"
import { debounce as debounceFn } from "@/utils/rateLimit"
import { uniqueId } from "@/services/uniqueId"
import { storeToRefs } from "pinia"
import { lua } from "@/bridge"
import { usePopover } from "@/services/popover"
import useControls from "@/services/controls"
import { setFocus } from "@/services/uiNavFocus"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useScopedNav } from "@/services/scopedNav/api"
import { clamp, clampNumber } from "@/utils/maths"

const navBlocker = useUINavBlocker()
const scopedNav = useScopedNav()
const slots = useSlots()

const popover = usePopover()
const controls = useControls()
const { showIfController } = storeToRefs(controls)
const uniqueInputHintName = uniqueId("slider-input-hint")
const uniqueResetHintName = uniqueId("slider-reset-hint")
const uniqueMarkerPopoverName = uniqueId("slider-marker-popover")

const props = defineProps({
  modelValue: Number,
  origValue: {
    type: [Number, String],
    default: NaN,
  },
  min: {
    type: [Number, String],
    default: 0,
  },
  max: {
    type: [Number, String],
    required: true,
  },
  step: {
    type: [Number, String],
    default: 0,
  },
  withReset: {
    type: Boolean,
    default: false,
  },
  withInput: {
    type: Boolean,
    default: false,
  },
  inputMultiplier: {
    type: Number,
    default: 1,
  },
  inputMin: {
    type: [Number, String],
    default: null,
  },
  inputMax: {
    type: [Number, String],
    default: null,
  },
  inputStep: {
    type: [Number, String],
    default: null,
  },
  inputType: {
    type: String,
    default: "number",
    validator: value => ["number", "text", "time"].includes(value),
  },
  inputFormatter: {
    type: Function,
    default: null,
  },
  inputParser: {
    type: Function,
    default: null,
  },
  inputValidate: {
    type: Function,
    default: null,
  },
  inputMaxlength: {
    type: [Number, String],
    default: null,
  },
  inputPlaceholder: {
    type: String,
    default: "",
  },
  inputErrorMessage: {
    type: String,
    default: "",
  },
  inputNoValidation: {
    type: Boolean,
    default: true,
  },
  // Bidirectional mapping hooks.
  // When omitted, the slider is linear and the native range domain matches [min..max].
  // When provided, the native range domain is normalised to [0..1] with step 0.001 and the consumer is
  // responsible for translating between model values and slider positions.
  //   position = {
  //     // ctx = { min, max, step, sliderMin, sliderMax, sliderStep, helpers, clamp }
  //     to(modelValue, ctx) -> positionValue (in [sliderMin..sliderMax]),
  //     from(positionValue, ctx) -> modelValue,
  //   }
  position: {
    type: Object,
    default: null,
    validator: v => v == null || (typeof v.to === "function" && typeof v.from === "function"),
  },
  // Markers drawn on the slider track.
  //   markers = Array<{
  //     value: Number | String,    // model-domain value where the marker sits
  //     marker?: String,           // `marker` prop (default: "markerRectanglePin")
  //     icon?: String | Object,    // inner icon glyph
  //     color?: String | Array,    // colour(s) (default: "#eee")
  //     activeColor?: String | Array, // colour(s) when slider value == marker value
  //                                   // default active is "#f60" when base color is default
  //     label?: String,            // menu label when withPopover is enabled
  //     tooltip?: String,          // top-placed tooltip text shown on hover/focus
  //   }>
  markers: {
    type: Array,
    default: () => [],
  },
  alwaysShowMarkers: {
    type: Boolean,
    default: false,
  },
  overlayMarkers: {
    type: Boolean,
    default: false,
  },
  withPopover: {
    type: Boolean,
    default: false,
  },
  unit: {
    type: String,
    default: "",
  },
  debounce: {
    type: Number,
    default: 500,
  },
  disabled: Boolean,
  uiNavFocus: {
    type: [Boolean, Object],
    default: () => ({}),
    validator: val => (typeof val === "boolean" && !val) || typeof val === "object",
  },
})

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))

// Prevent nested controls (input/reset button) from registering into the same row.
provide("BngRow", null)

const emit = defineEmits(["change", "valueChanged", "update:modelValue", "blur", "focus"])
const internalScopeId = uniqueId("bng-slider")

const elementRef = ref(null)
const sliderRef = ref(null)
const inputRef = ref(null)
const resetRef = ref(null)
const markerPopoverButtonRef = ref(null)
const value = ref(props.modelValue)
const lastEmittedValue = ref(Number(props.modelValue))
let lastScheduledValue = Number(props.modelValue)
let hasPendingDebounce = false
const isScopeActive = ref(false)
const isDragging = ref(false)
const sliderFocused = ref(false)
const embeddedInputFocused = ref(false)
const componentFocused = ref(false)
const restoreContainerFocusOnPopoverClose = ref(false)
const scopeDirective = computed(() =>
  inRow ? { disabled: true } : { scopeId: internalScopeId, preferAutoFocus: true, canBubbleEvent }
)

function onPointerDown() {
  if (effectiveDisabled.value) return
  isDragging.value = true
  window.addEventListener("pointerup", onPointerUp, { once: true })
}

function onPointerUp() {
  isDragging.value = false
  const v = Number(sliderValue.value)
  if (Number.isFinite(v)) visualPosition.value = v
}

function onSliderInput(event) {
  const v = Number(event.target.value)
  if (Number.isFinite(v)) {
    visualPosition.value = v
    value.value = applyFromPosition(v)
  }
  playSliderStepSoundIfChanged()
  if (props.debounce <= 0) {
    emitValue()
  } else {
    scheduleDebouncedEmitIfChanged()
  }
}

function onSliderChange() {
  commitNow()
}

function onMarkerPointerDown(event) {
  event.preventDefault()
}

function onMarkerClick(markerValue, focusSlider = true) {
  if (effectiveDisabled.value) return
  const num = Number(markerValue)
  if (!Number.isFinite(num)) return
  const next = clamp(num, modelMin.value, modelMax.value)
  value.value = next
  const pos = Number(applyToPosition(next))
  if (Number.isFinite(pos)) visualPosition.value = pos
  playSliderStepSoundIfChanged()
  commitNow()
  if (focusSlider) sliderRef.value?.focus?.()
}

function commitNow() {
  if (props.debounce > 0) debouncedEmitValue.cancel()
  updateSliderBackground()
  emitValue()
}

function flushPendingChange() {
  if (!hasPendingDebounce) return
  debouncedEmitValue.cancel()
  emitValue()
}

function onContainerFocusOut(event) {
  const next = event.relatedTarget
  if (next && elementRef.value && elementRef.value.contains(next)) return
  componentFocused.value = false
  if (inRow) {
    updateContextBlocker()
    showContextHint()
    return
  }
  flushPendingChange()
  if (isScopeActive.value) scopedNav.deactivateScope(internalScopeId)
  updateContextBlocker()
  showContextHint()
}

const modelMin = computed(() => +props.min)
const modelMax = computed(() => +props.max)

const hasCustomMapping = computed(() => !!props.position)

const sliderMin = computed(() => (hasCustomMapping.value ? 0 : modelMin.value))
const sliderMax = computed(() => (hasCustomMapping.value ? 1 : modelMax.value))
const sliderStep = computed(() => (hasCustomMapping.value ? 0.001 : +props.step))

const resolvedInputMin = computed(() => {
  if (props.inputMin == null) return props.inputType === "number" ? modelMin.value * props.inputMultiplier : undefined
  return props.inputType === "number" ? +props.inputMin : props.inputMin
})
const resolvedInputMax = computed(() => {
  if (props.inputMax == null) return props.inputType === "number" ? modelMax.value * props.inputMultiplier : undefined
  return props.inputType === "number" ? +props.inputMax : props.inputMax
})
const resolvedInputStep = computed(() => {
  if (props.inputStep == null) return props.inputType === "number" ? props.step * props.inputMultiplier : undefined
  return props.inputType === "number" ? +props.inputStep : props.inputStep
})

function mappingCtx() {
  return {
    min: modelMin.value,
    max: modelMax.value,
    step: +props.step,
    sliderMin: sliderMin.value,
    sliderMax: sliderMax.value,
    sliderStep: sliderStep.value,
    helpers: numberApi,
    clamp: clampNumber,
  }
}

function applyToPosition(modelVal) {
  if (props.position) return props.position.to(modelVal, mappingCtx())
  return clampNumber(modelVal, modelMin.value, modelMax.value)
}

function applyFromPosition(positionVal) {
  if (props.position) return props.position.from(positionVal, mappingCtx())
  return clampNumber(numberApi.roundToStep(positionVal, +props.step), modelMin.value, modelMax.value)
}

function getSliderStepIndex(modelVal) {
  const numericValue = Number(modelVal)
  const min = Number(modelMin.value)
  const max = Number(modelMax.value)
  const rawStep = Number(props.step)
  const step = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : (hasCustomMapping.value ? null : 1)

  if (!Number.isFinite(numericValue) || !Number.isFinite(min) || !Number.isFinite(max) || !(step > 0)) return null
  return Math.round((clamp(numericValue, min, max) - min) / step)
}

let lastSliderSoundStepIndex = getSliderStepIndex(value.value)

function syncSliderSoundStepIndex() {
  lastSliderSoundStepIndex = getSliderStepIndex(value.value)
}

function playSliderStepSoundIfChanged() {
  const stepIndex = getSliderStepIndex(value.value)
  if (stepIndex === null || stepIndex === lastSliderSoundStepIndex) return
  lastSliderSoundStepIndex = stepIndex
  lua.ui_audio.playEventSound("bng_slider", "click")
}

// dev-only sanity check for `position.from(position.to(x)) ~= x`
function checkMappingInvertibility() {
  if (!__BNG_DEV__) return
  if (!props.position) return

  const min = modelMin.value
  const max = modelMax.value
  const step = +props.step
  const epsilon = Math.max(Math.abs(step) || 0, 1e-9)

  const samples = [min, max, (min + max) / 2, Number(value.value)]
    .filter(v => Number.isFinite(v))

  for (const x of samples) {
    let mapped
    let roundTrip
    try {
      mapped = applyToPosition(x)
      roundTrip = applyFromPosition(mapped)
    } catch (err) {
      console.warn("[BngSlider] mapping threw during invertibility check", {
        value: x,
        error: err,
        min,
        max,
        step,
      })
      continue
    }
    const diff = Math.abs(Number(roundTrip) - x)
    if (!Number.isFinite(diff) || diff > epsilon) {
      console.warn("[BngSlider] non-invertible mapping: position.from(position.to(x)) !~= x", {
        value: x,
        mapped,
        roundTrip,
        tolerance: epsilon,
        min,
        max,
        step,
      })
    }
  }
}

const sliderValue = computed({
  get: () => applyToPosition(value.value),
  set: v => {
    value.value = applyFromPosition(v)
  },
})

const visualPosition = ref(Number(applyToPosition(value.value)) || 0)

watch(sliderValue, v => {
  if (isDragging.value) return
  const n = Number(v)
  if (Number.isFinite(n)) visualPosition.value = n
})

const sliderPercent = computed(() => {
  const span = sliderMax.value - sliderMin.value
  if (!(span > 0)) return 0
  return ((visualPosition.value - sliderMin.value) / span) * 100
})

const MARKER_LIFT_THRESHOLD_PX = 32 // where to start marker lift
const sliderWidthPx = ref(0)
const sliderFontPx = ref(0)
let sliderResizeObserver = null
const DEFAULT_MARKER_COLOR = "#eee"
const DEFAULT_ACTIVE_MARKER_COLOR = "#f60"

const resolvedMarkers = computed(() => {
  const list = props.markers
  if (!Array.isArray(list) || list.length === 0) return []
  const span = sliderMax.value - sliderMin.value
  if (!(span > 0)) return []
  const knobPercent = sliderPercent.value
  const currentValue = Number(value.value)
  const markerActiveEpsilon = 1e-9

  const widthPx = sliderWidthPx.value
  const halfKnobPx = 0.25 * sliderFontPx.value
  const trackPx = widthPx > 0 ? Math.max(1, widthPx - 2 * halfKnobPx) : 0

  const out = []
  for (const m of list) {
    if (!m || m.value === undefined || m.value === null) continue
    const pos = Number(applyToPosition(m.value))
    if (!Number.isFinite(pos)) continue
    const rawPercent = ((pos - sliderMin.value) / span) * 100
    if (!Number.isFinite(rawPercent)) continue
    const percent = Math.max(0, Math.min(100, rawPercent))

    let liftRatio = 0
    if (trackPx > 0) {
      const markerXpx = (percent / 100) * trackPx
      const knobRightXpx = (knobPercent / 100) * trackPx + halfKnobPx // account for the knob skew
      const distancePx = Math.abs(markerXpx - knobRightXpx)
      if (distancePx < MARKER_LIFT_THRESHOLD_PX) {
        liftRatio = 1 - distancePx / MARKER_LIFT_THRESHOLD_PX
      }
    }
    const markerValue = Number(m.value)
    const isMarkerActive = Number.isFinite(currentValue) &&
      Number.isFinite(markerValue) &&
      Math.abs(currentValue - markerValue) <= markerActiveEpsilon
    const baseColor = m.color ?? DEFAULT_MARKER_COLOR
    const activeColor = m.activeColor ?? (m.color == null ? DEFAULT_ACTIVE_MARKER_COLOR : baseColor)
    const tooltip = typeof m.tooltip === "string" && m.tooltip.length > 0 ? m.tooltip : undefined
    const label = typeof m.label === "string" && m.label.length > 0 ? m.label : tooltip ?? String(m.value)

    out.push({
      percent,
      liftRatio,
      value: m.value,
      marker: m.marker ?? "markerRectanglePin",
      type: m.icon || m.type,
      color: isMarkerActive ? activeColor : baseColor,
      active: isMarkerActive,
      label,
      // point: m.point ?? "down",
      tooltip,
    })
  }
  return out
})

const canShowMarkerPopover = computed(() => props.withPopover && !!slots.popover)
const canOpenMarkerPopover = computed(() => canShowMarkerPopover.value && !effectiveDisabled.value)
const hasContextAction = computed(() => props.withInput || canShowMarkerPopover.value)
const contextNavHandler = computed(() => hasContextAction.value ? onContextNav : undefined)
const internalContextNavHandler = computed(() => inRow ? undefined : contextNavHandler.value)
const rowContextNavHandler = computed(() => inRow && hasContextAction.value && isFocusedInsideSlider() ? onContextNav : undefined)
const markerPopoverTarget = computed(() => markerPopoverButtonRef.value?.getElement?.() || sliderRef.value || elementRef.value)

const markersVisible = computed(() =>
  props.alwaysShowMarkers ||
  sliderFocused.value ||
  embeddedInputFocused.value ||
  isScopeActive.value
)

const uiNavFocusFunction = computed(() =>
  !props.uiNavFocus
    ? false
    : {
        callback: (dir, val) => {
          value.value = val
          playSliderStepSoundIfChanged()
          notify()
        },
        value: () => value.value,
        min: modelMin.value,
        max: modelMax.value,
        step: () => (+props.step > 0 ? +props.step : 1),
        ...props.uiNavFocus,
      }
)

watch(
  () => props.modelValue,
  val => {
    if (isDragging.value) return
    value.value = Number(val)
    lastEmittedValue.value = Number(val)
    syncSliderSoundStepIndex()
    updateSliderBackground()
  }
)

watch([modelMin, modelMax, () => props.step, hasCustomMapping], syncSliderSoundStepIndex)

const dirty = useDirty(value, null, updateSliderBackground)
const dirtyReset = useDirty(value, null, updateSliderBackground)
dirty.activateSlider = () => sliderRef.value?.focus()
defineExpose(dirty)

const resetDisabled = computed(() => {
  if (effectiveDisabled.value) return true
  if (!isNaN(dirtyReset.currentCleanValue.value)) return !dirtyReset.dirty.value
  return !dirty.dirty.value
})

onMounted(() => {
  updateSliderBackground()
  inputProps.value = formatInputValue(value.value)
  checkMappingInvertibility()

  const refreshSliderMetrics = () => {
    if (!sliderRef.value) return
    sliderWidthPx.value = sliderRef.value.offsetWidth || 0
    const fs = parseFloat(window.getComputedStyle(sliderRef.value).fontSize)
    if (Number.isFinite(fs) && fs > 0) sliderFontPx.value = fs
  }
  if (sliderRef.value) {
    refreshSliderMetrics()
    if (typeof ResizeObserver !== "undefined") {
      sliderResizeObserver = new ResizeObserver(refreshSliderMetrics)
      sliderResizeObserver.observe(sliderRef.value)
    }
  }
})

if (__BNG_DEV__) {
  watch(
    () => [props.position, modelMin.value, modelMax.value, +props.step],
    () => checkMappingInvertibility()
  )
}

function emitValue() {
  emit("update:modelValue", value.value)
  emit("valueChanged", value.value)
  emit("change", value.value)
  lastEmittedValue.value = Number(value.value)
  lastScheduledValue = Number(value.value)
  hasPendingDebounce = false
  updateSliderBackground()
}

const debouncedEmitValue = debounceFn(emitValue, props.debounce)

function scheduleDebouncedEmitIfChanged() {
  if (props.debounce <= 0) return
  const v = Number(value.value)
  if (v === lastScheduledValue) return
  lastScheduledValue = v
  hasPendingDebounce = true
  debouncedEmitValue()
}

function notify() {
  updateSliderBackground()
  if (props.debounce > 0) {
    scheduleDebouncedEmitIfChanged()
  } else {
    emitValue()
  }
}

onBeforeUnmount(() => {
  if (hasPendingDebounce) {
    debouncedEmitValue.cancel()
    emitValue()
  }
  window.removeEventListener("pointerup", onPointerUp)
  sliderResizeObserver?.disconnect()
  sliderResizeObserver = null
})

function updateSliderBackground() {
  if (!sliderRef.value) return
  const sliderSpan = sliderMax.value - sliderMin.value
  const committedSlider = Number(applyToPosition(lastEmittedValue.value))
  const current = sliderSpan > 0 ? ((committedSlider - sliderMin.value) / sliderSpan) * 100 : 0
  let init = [-100, -100]
  let dirtyVal = dirtyReset.currentCleanValue.value
  if (typeof dirtyVal !== "number" || isNaN(dirtyVal)) {
    dirtyVal = dirty.currentCleanValue.value
  }
  if (typeof dirtyVal === "number" && !isNaN(dirtyVal)) {
    const initSlider = applyToPosition(dirtyVal)
    const initpos = sliderSpan > 0 ? ((initSlider - sliderMin.value) / sliderSpan) * 100 : 0
    init[current < initpos ? 0 : 1] = initpos
  }
  sliderRef.value.style.backgroundPosition = `${init[0]}% 50%, ${100 - current}% 50%, ${init[1]}% 50%`
}

const inputProps = reactive({
  value: formatInputValue(value.value),
  min: resolvedInputMin.value,
  max: resolvedInputMax.value,
  step: resolvedInputStep.value,
  suffix: props.unit,
})

function hasCustomInputFormatting() {
  return typeof props.inputFormatter === "function" || typeof props.inputParser === "function"
}

function formatInputValue(modelValue) {
  if (typeof props.inputFormatter === "function") {
    return props.inputFormatter(modelValue)
  }
  return numberApi.roundToStep(modelValue * props.inputMultiplier, resolvedInputStep.value)
}

function parseCustomInputValue(inputValue) {
  if (typeof props.inputParser !== "function") return null
  const parsed = props.inputParser(inputValue)
  const numericValue = Number(parsed)
  if (!Number.isFinite(numericValue)) return null
  return numberApi.clampToRange(numericValue, +props.min, +props.max)
}

watch(
  () => value.value,
  val => {
    if (embeddedInputFocused.value && hasCustomInputFormatting()) return
    inputProps.value = formatInputValue(val)
  }
)

watch(
  [resolvedInputMin, resolvedInputMax, resolvedInputStep],
  ([min, max, step]) => {
    inputProps.min = min
    inputProps.max = max
    inputProps.step = step
    if (embeddedInputFocused.value && hasCustomInputFormatting()) return
    inputProps.value = formatInputValue(value.value)
  }
)

watch(
  () => props.origValue,
  val => {
    val = +val
    if (!isNaN(val)) dirtyReset.setCleanValue(val)
  },
  { immediate: true }
)

function onInputBlur(num) {
  if (hasCustomInputFormatting()) {
    const parsed = parseCustomInputValue(num)
    if (parsed === null) {
      inputProps.value = formatInputValue(value.value)
      return
    }

    value.value = parsed
    inputProps.value = formatInputValue(value.value)
    playSliderStepSoundIfChanged()
    notify()
    return
  }

  const parsed = numberApi.parseNumber(num)
  if (parsed === null) return

  const norm = numberApi.roundToStep(parsed, inputProps.step)
  if (parsed !== norm) inputProps.value = norm

  let modelVal = norm / props.inputMultiplier
  modelVal = numberApi.roundToStep(modelVal, +props.step)
  modelVal = numberApi.clampToRange(modelVal, +props.min, +props.max)

  value.value = modelVal
  playSliderStepSoundIfChanged()
  notify()
}

function updateContextBlocker() {
  const isActive = isFocusedInsideSlider()
  navBlocker.ensureNoBlock(isActive && hasContextAction.value ? ["context"] : [])
}

function isFocusedInsideSlider() {
  const active = document.activeElement
  return !!(
    componentFocused.value ||
    sliderFocused.value ||
    embeddedInputFocused.value ||
    (elementRef.value && active && elementRef.value.contains(active))
  )
}

function onEmbeddedInputFocus() {
  embeddedInputFocused.value = true
  updateContextBlocker()
  showContextHint()
}

function onEmbeddedInputBlur(num) {
  embeddedInputFocused.value = false
  updateContextBlocker()
  showContextHint()
  onInputBlur(num)
}

function resetValue() {
  const val = +props.origValue
  if (!isNaN(val)) value.value = val
  else dirty.resetValue()
  playSliderStepSoundIfChanged()
  notify()
}

function exitToRow() {
  if (!inRow) return false
  const rowElement = row.getElement?.()
  if (!rowElement) return false
  sliderRef.value?.blur?.()
  inputRef.value?.domInput?.blur?.()
  setFocus(rowElement, true, false)
  return true
}

function toggleFocusedInput() {
  if (isDragging.value || effectiveDisabled.value) return
  if (!inRow && !isScopeActive.value) return

  if (document.activeElement === sliderRef.value) {
    const target = inputRef.value?.domInput
    if (target) {
      if (!setFocus(target, true, false)) target.focus?.()
    }
  } else {
    const target = sliderRef.value
    if (target) {
      if (!setFocus(target, true, false)) target.focus?.()
    }
  }
}

function onContextNav() {
  if (canOpenMarkerPopover.value) return toggleMarkerPopover()
  if (!props.withInput) return true
  toggleFocusedInput()
  return false
}

function toggleMarkerPopover() {
  if (!canOpenMarkerPopover.value) return true
  const target = markerPopoverTarget.value
  if (!target) return true
  if (popover.isShown(uniqueMarkerPopoverName)) popover.hide(uniqueMarkerPopoverName)
  else {
    popover.show(uniqueMarkerPopoverName, target)
  }
  return false
}

function onMarkerPopoverHide() {
  restoreContainerFocusOnPopoverClose.value = true
}

const canBubbleEvent = (event) => {
  const eventName = event.detail.name

  if (eventName === "menu") {
    return true
  }

  if (!isScopeActive.value && eventName === "back") {
    return document.activeElement === elementRef.value
  }

  return false
}

function onScopeActivated(activated, event) {
  isScopeActive.value = activated
  if (activated) componentFocused.value = true
  if (activated && event?.detail?.resume && restoreContainerFocusOnPopoverClose.value) {
    restoreContainerFocusOnPopoverClose.value = false
    nextTick(() => {
      if (elementRef.value) setFocus(elementRef.value, true, false)
      showContextHint()
    })
  }
  if (!activated) {
    componentFocused.value = false
    flushPendingChange()
    emit("blur")
  }
  showContextHint()
}

function onBackFromInput() {
  if (document.activeElement === inputRef.value.domInput) {
    resetValue()
    if (inRow) {
      if (exitToRow()) return false
    } else {
      scopedNav.deactivateScope(internalScopeId)
      return false
    }
    sliderRef.value.focus()
    return false
  }

  return true
}

function onOkFromInput() {
  if (document.activeElement !== inputRef.value?.domInput) return true
  if (inRow) {
    if (!exitToRow()) return true
  } else {
    scopedNav.deactivateScope(internalScopeId)
    return false
  }
  return false
}

function onSliderConfirm(event) {
  if (event?.detail?.name === "back" && props.withReset) {
    resetValue()
  }
  if (inRow) {
    if (!exitToRow()) return true
  } else {
    scopedNav.deactivateScope(internalScopeId)
  }
  return false
}

const rowControlApi = inRow
  ? {
      activate: () => {
        sliderRef.value?.focus?.()
      },
      get context() {
        return rowContextNavHandler.value
      },
      get uiNavFocus() {
        return uiNavFocusFunction.value
      },
      isEventInside: event => !!(elementRef.value && event?.target instanceof Node && elementRef.value.contains(event.target)),
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

function onContainerFocusIn() {
  componentFocused.value = true
  updateContextBlocker()
  showContextHint()
}

function onSliderFocus() {
  sliderFocused.value = true
  updateContextBlocker()
  emit("focus")
  showContextHint()
}

function onSliderBlur() {
  sliderFocused.value = false
  updateContextBlocker()
  // emit("blur")
  showContextHint()
}

function showContextHint() {
  const isInside = isFocusedInsideSlider() || isScopeActive.value
  const hasInputPopover = popover.getPopover(uniqueInputHintName)
  if (hasInputPopover) {
    let contextTarget = null
    if (sliderFocused.value && props.withInput) contextTarget = inputRef.value?.el
    if (embeddedInputFocused.value) contextTarget = sliderRef.value
    if (isInside && contextTarget) popover.show(uniqueInputHintName, contextTarget)
    else popover.hide(uniqueInputHintName)
  }
  const hasResetPopover = popover.getPopover(uniqueResetHintName)
  if (hasResetPopover) {
    const target = resetRef.value?.getElement?.()
    if (isInside && props.withReset && target) popover.show(uniqueResetHintName, target)
    else popover.hide(uniqueResetHintName)
  }
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

// focus frame
$f-offset: 2px;
$rad: $border-rad-1;
// focus frame when holding
// $hold-rad: calc($rad * 1.1);
// $hold-f-offset: calc($f-offset * 1.4);
// $hold-rad: 4px;
// $hold-f-offset: $f-offset;

$knob-color: var(--bng-off-white);
$knob-highlight-color: var(--bng-orange-400);
$knob-shadow-color: rgba(var(--bng-off-black-rgb), 0.25);
$knob-disabled-color: var(--bng-cool-gray-500);
$background-mark-color: var(--bng-cool-gray-600);
$foreground-mark-color: var(--bng-cool-gray-400);
$track-enabled-color-a: var(--bng-off-white);
$track-enabled-color-b: var(--bng-cool-gray-600);
$track-active-color-a: var(--bng-orange-500);
$track-active-color-b: var(--bng-cool-gray-600);
$track-disabled-color-a: var(--bng-cool-gray-500);
$track-disabled-color-b: var(--bng-cool-gray-900);

$marker-size: var(--bng-slider-marker-size, 2em);

// START RESET
// Make sure to reset styles back to initial due to
// main.css styles leaking into vue
.bng-slider {
  position: initial;
  height: initial;
  padding: initial;
  background-color: initial;
  color: initial;
  border-width: initial;
  border-radius: initial;
  transition: initial;
  &:focus {
    display: initial;
    &::before {
      content: none;
    }
  }
}
// END RESET

.bng-slider-container {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: stretch;
  flex: 1 0 auto;

  @include modify-focus($rad, $f-offset);

  &[disabled] {
    pointer-events: none;
    cursor: default;
  }

  &.has-always-markers {
    padding-top: calc($marker-size + 0.5em);
    padding-left: 0.75em;
  }

  &.has-overlay-markers {
    .bng-slider-popover-button {
      margin-top: 0;
    }
  }
}

.bng-slider-input {
  $w: var(--input-width, 5.5em);
  flex: 0 0 $w;
  width: $w;
  margin-left: 0.5em;
}

.bng-slider-popover-button {
  --bng-button-margin: 0 0 0 1em;
  margin-top: calc(-1 * ($marker-size + 0.5em));
  --bng-button-min-width: 2.75em;
  --bng-button-padding: 0 0.5em;
  --bng-button-padding-top: 0;
  --bng-button-padding-bottom: 0;
  --bng-content-align: center;
  --bng-content-justify: center;
  --bng-ui-event-padding-override: 0;
  align-self: stretch;
  flex: 0 0 auto;
  flex-direction: column;
  font-size: 0.95em;
  line-height: 1em;
  gap: 0.25em;
}

.bng-slider-track-wrap {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.bng-slider-markers {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.25em;
  right: 0.25em;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 140ms ease-out;
  &.is-visible {
    opacity: 1;
    .bng-slider-marker {
      pointer-events: auto;
    }
  }
}

.bng-slider-marker {
  position: absolute;
  display: block;
  left: 0;
  bottom: 50%;
  --marker-lift: 0;
  transform: translate(-50%, calc(-0.05em - var(--marker-lift) * 0.5em));
  transition: transform 140ms ease-out;
  color: var(--bng-off-white);
  cursor: pointer;
}

.bng-slider-marker-icon {
  font-size: $marker-size;
}

.bng-slider-popover-binding {
  font-size: 0.85em;
}

.bng-slider-popover-icon {
  font-size: 1.5em;
}

.bng-slider {
  --knob-color: #{$knob-color};
  --knob-highlight-color: #{$knob-highlight-color};
  --knob-shadow-color: #{$knob-shadow-color};
  --knob-disabled-color: #{$knob-disabled-color};
  --background-mark-color: #{$background-mark-color};
  --foreground-mark-color: #{$foreground-mark-color};
  --track-color-a: #{$track-enabled-color-a};
  --track-color-b: #{$track-enabled-color-b};

  flex: 1 1 auto;
  display: inline-block;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  margin: var(--bng-slider-margin, 0.7em) 0;
  border-bottom: 0;
  position: relative;
  background-repeat: no-repeat;
  // background mark shows up when value is over initial, and vice versa
  background-image: linear-gradient(90deg, var(--foreground-mark-color) 0% 100%),
    // foreground mark
    linear-gradient(105deg, var(--track-color-a) 0% 50%, var(--track-color-b) 50% 100%),
    // track
    linear-gradient(90deg, var(--background-mark-color) 0% 100%);
  // background mark
  background-size: 0.3em 0.65em,
    // foreground mark
    200% 0.15em,
    // track (must be 200% size)
    0.3em 0.65em; // background mark

  // if you need to disable resizing with font-size,
  // remove the next line and add "font-size: 1rem;"
  height: 1em;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: $knob-color;
    cursor: pointer;
    border-radius: 0.03em;
    width: 0.5em;
    height: 1em;
    transform: skewX(-20deg);
    box-shadow: 0 0 0.5em 0.125em $knob-shadow-color;
  }

  &:focus {
    --track-color-a: #{$track-active-color-a};
    --track-color-b: #{$track-active-color-b};
    &::-webkit-slider-thumb {
      background-color: $knob-highlight-color;
      box-shadow: 0 0 0 0.25rem rgba(var(--bng-orange-400-rgb), 0.5), 0 0 0.5rem 0.125rem $knob-shadow-color;
    }
  }

  &.bng-slider-rounded::-webkit-slider-thumb {
    width: 0.6em;
    height: 0.6em;
    border-radius: 50%;
    transform: none;
  }

  &[disabled] {
    --track-color-a: #{$track-disabled-color-a};
    --track-color-b: #{$track-disabled-color-b};
    cursor: default;
    pointer-events: none;
    opacity: 0.8;

    &::-webkit-slider-thumb {
      background-color: $knob-disabled-color !important;
    }
  }
}

.bng-slider-reset {
  font-size: 0.8em;
  align-self: center;
}
</style>
