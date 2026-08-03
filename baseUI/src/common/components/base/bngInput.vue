<template>
  <div
    ref="elementRef"
    :style="rootStyle"
    v-bind="rowNavAttrs"
    v-bng-disabled="effectiveDisabled"
    v-bng-scoped-nav="scopedNavDirective"
    :class="{
      'has-value': !isEmptyValue,
      'bng-input-readonly': readonly,
      'bng-input-invalid': validationState && !validationState.valid,
      'no-focus-frame': inRow,
    }"
    class="bng-input"
    @activate="onScopeActivated"
    @deactivate="onScopeDeactivated">
    <label v-if="(label || externalLabel || slots.label) && !floatingLabel" class="external-label" @click="activateInput" @mousedown.prevent>
      <slot name="label">{{ label || externalLabel }}</slot>
    </label>

    <span v-if="leadingIcon || slots.leadingIcon" class="leading-icon" @click="activateInput" @mousedown.prevent>
      <slot name="leading-icon">
        <BngIcon :type="leadingIcon" />
      </slot>
    </span>

    <span
      v-if="!noSpinners && type === INPUT_TYPES.number && !readonly && !effectiveDisabled"
      :class="{ 'spinner-active': numberInputState.isDownActive }"
      class="input-spinner input-spinner-down"
      @mousedown.prevent>
      <slot name="spinner-down" :changeValue="() => onSpinnerChangeValue(-1)">
        <BngButton
          v-bng-click="{ clickCallback: () => onSpinnerChangeValue(-1), holdCallback: () => onSpinnerHoldChangeValue(-1), holdSoundClass: 'bng_click_hover_generic' }"
          bng-no-nav="true"
          accent="text">
          <BngBinding v-if="!noStepBindings" controller uiEvent="focus_d" />
          <BngIcon v-if="!showIfController || noStepBindings" :type="stepIcons.down" />
        </BngButton>
      </slot>
    </span>

    <span v-if="prefix || slots.prefix" class="prefix" @click="activateInput" @mousedown.prevent>
      <slot name="prefix">{{ prefix }}</slot>
    </span>

    <div class="input-container" :style="inputStyle">
      <input
        v-if="type === INPUT_TYPES.number"
        ref="input"
        v-bng-text-input
        v-bng-on-ui-nav:ok,back.focusRequired="onInputConfirm"
        v-bng-on-ui-nav-focus:vertical.repeat="dir => onUINavChangeValue(dir)"
        v-model="value"
        :readonly="readonly"
        :disabled="effectiveDisabled"
        :placeholder="placeholder"
        :maxlength="maxlength"
        type="number"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @keydown.arrow-up="onArrowKeysChangeValue(1)"
        @keydown.arrow-down="onArrowKeysChangeValue(-1)"
        @keydown.enter="onEnterDown"
        @keydown="onKeyDown" />
      <input
        v-else
        ref="input"
        v-bng-text-input
        v-bng-on-ui-nav:ok,back.focusRequired="onInputConfirm"
        v-model="value"
        :readonly="readonly"
        :disabled="effectiveDisabled"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :min="timeInputMin"
        :max="timeInputMax"
        :step="timeInputStep"
        :type="nativeInputType"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @keydown.enter="onEnterDown"
        @keydown="onKeyDown" />
      <label v-if="(label && floatingLabel) || typeof floatingLabel === 'string' || slots.label" class="floating-label">
        <slot name="label">{{ label || floatingLabel }}</slot>
      </label>
      <span
        v-if="!noSpinners && type === INPUT_TYPES.number && !readonly && !effectiveDisabled"
        class="hover-spinner"
        @mousedown.prevent.stop>
        <BngButton
          :class="{ 'spinner-active': numberInputState.isUpActive }"
          v-bng-click="{ clickCallback: () => onSpinnerChangeValue(1), holdCallback: () => onSpinnerHoldChangeValue(1), holdSoundClass: 'bng_click_hover_generic' }"
          bng-no-nav="true"
          tabindex="-1"
          accent="text"
          class="hover-spinner-btn"
          @click.stop
          @mousedown.prevent.stop>
          <BngIcon :type="stepIcons.up" />
        </BngButton>
        <BngButton
          :class="{ 'spinner-active': numberInputState.isDownActive }"
          v-bng-click="{ clickCallback: () => onSpinnerChangeValue(-1), holdCallback: () => onSpinnerHoldChangeValue(-1), holdSoundClass: 'bng_click_hover_generic' }"
          bng-no-nav="true"
          tabindex="-1"
          accent="text"
          class="hover-spinner-btn"
          @click.stop
          @mousedown.prevent.stop>
          <BngIcon :type="stepIcons.down" />
        </BngButton>
      </span>
    </div>

    <span v-if="suffix || slots.suffix || timeSuffixIcon" class="suffix" @click="activateInput" @mousedown.prevent>
      <slot name="suffix">
        <BngIcon v-if="timeSuffixIcon" :type="timeSuffixIcon" />
        <template v-else>{{ suffix }}</template>
      </slot>
    </span>

    <span v-if="trailingIcon || slots.trailingIcon" class="trailing-icon" @click="activateInput" @mousedown.prevent>
      <slot name="trailing-icon">
        <BngIcon :type="trailingIcon" />
      </slot>
    </span>

    <span
      v-if="!noSpinners && type === INPUT_TYPES.number && !readonly && !effectiveDisabled"
      :class="{ 'spinner-active': numberInputState.isUpActive }"
      class="input-spinner input-spinner-up"
      @mousedown.prevent>
      <slot name="spinner-up" :changeValue="() => onSpinnerChangeValue(1)">
        <BngButton v-bng-click="{ clickCallback: () => onSpinnerChangeValue(1), holdCallback: () => onSpinnerHoldChangeValue(1), holdSoundClass: 'bng_click_hover_generic' }" bng-no-nav="true" accent="text">
          <BngBinding v-if="!noStepBindings" controller uiEvent="focus_u" />
          <BngIcon v-if="!showIfController || noStepBindings" :type="stepIcons.up" />
        </BngButton>
      </slot>
    </span>

    <span v-if="showExternalButton" class="external-button">
      <slot name="external-button" :externalButtonFn="externalButtonFn">
        <BngButton
          v-if="showDefaultExternalButton && externalButtonUiNavActive"
          bng-no-nav="true"
          tabindex="-1"
          v-bng-disabled="isEmptyValue"
          :icon="icons.mathMultiply"
          :disabled="effectiveDisabled"
          accent="attention"
          v-bng-on-ui-nav:action_2.asMouse
          v-bng-ui-nav-label:action_2="$ctx_t('ui.common.delete')"
          @click.stop="externalButtonFn"
          @mousedown.prevent />
        <BngButton
          v-else-if="showDefaultExternalButton"
          bng-no-nav="true"
          tabindex="-1"
          v-bng-disabled="isEmptyValue"
          :icon="icons.mathMultiply"
          :disabled="effectiveDisabled"
          accent="attention"
          @click.stop="externalButtonFn"
          @mousedown.prevent />
      </slot>
    </span>

    <span v-if="(validationState && !validationState.valid && validationState.errorMessage) || slots.errorMessage" class="error-message">
      <slot name="error-message">{{ validationState.errorMessage }}</slot>
    </span>
  </div>
</template>

<script>
export const INPUT_TYPES = {
  text: "text",
  number: "number",
  time: "time",
}
export const STEP_ICON_TYPES = {
  arrowUpDown: "arrowUpDown",
  arrowLeftRight: "arrowLeftRight",
  plusMinus: "plusMinus",
}
export const VALIDATION_TYPES = {
  valueChange: "valueChange",
  blur: "blur",
}

const STEP_ICON_TYPES_MAP = {
  [STEP_ICON_TYPES.arrowUpDown]: {
    up: "arrowSmallUp",
    down: "arrowSmallDown",
  },
  [STEP_ICON_TYPES.arrowLeftRight]: {
    up: "arrowSmallRight",
    down: "arrowSmallLeft",
  },
  [STEP_ICON_TYPES.plusMinus]: {
    up: "plus",
    down: "minus",
  },
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const NATIVE_TIME_INPUT_SUPPORTED = (() => {
  if (typeof document === "undefined") return false
  const element = document.createElement("input")
  element.setAttribute("type", INPUT_TYPES.time)
  return element.type === INPUT_TYPES.time
})()
const ERROR_TYPES = {
  invalidformat: "invalidformat",
  outofrange: "outofrange",
  required: "required",
  custom: "custom",
}
const ERROR_MESSAGES = {
  [ERROR_TYPES.invalidformat]: "Invalid format",
  [ERROR_TYPES.outofrange]: "Value must be between {min} and {max}",
  [`${ERROR_TYPES.outofrange}-min`]: "Value must be greater than {min}",
  [`${ERROR_TYPES.outofrange}-max`]: "Value must be less than {max}",
  [ERROR_TYPES.required]: "Value is required",
}
const NUMBER_INPUT_MODES = {
  spinner: "spinner",
  arrowKeys: "arrowKeys",
  uinav: "uinav",
}

function getStepPrecision(step) {
  const numericStep = Number(step)
  if (!Number.isFinite(numericStep) || numericStep <= 0) return 0

  const stepString = String(numericStep).toLowerCase()
  if (stepString.includes("e-")) {
    const exp = Number(stepString.split("e-")[1])
    return Number.isFinite(exp) ? exp : 0
  }

  const dotIndex = stepString.indexOf(".")
  return dotIndex === -1 ? 0 : stepString.length - dotIndex - 1
}

function parseNumber(raw) {
  if (raw === null || raw === undefined || raw === "") return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  if (typeof raw === "string") {
    const parsed = raw.includes(".") ? parseFloat(raw) : parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  const coerced = Number(raw)
  return Number.isFinite(coerced) ? coerced : null
}

function roundToStep(value, step) {
  if (!Number.isFinite(value)) return value
  const precision = getStepPrecision(step)
  return parseFloat(value.toFixed(precision))
}

// Note: this function works differently than clampNumber if `max` and `min` props are not specified
function clampToRange(value, min, max) {
  if (!Number.isFinite(value)) return value
  let result = value
  if (Number.isFinite(min) && result < min) result = min
  if (Number.isFinite(max) && result > max) result = max
  return result
}

export const numberApi = {
  getStepPrecision,
  parseNumber,
  roundToStep,
  clampToRange,
}
</script>

<script setup>
import { computed, ref, useSlots, nextTick, reactive, onUnmounted, inject, provide, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { vBngOnUiNav, vBngDisabled, vBngTextInput, vBngScopedNav, vBngClick, vBngOnUiNavFocus, vBngUiNavLabel } from "@/common/directives"
import { BngBinding, BngButton, BngIcon, icons } from "@/common/components/base"
import { useDirty } from "@/services/dirty"
import { debounce } from "@/utils/rateLimit"
import useControls from "@/services/controls"
import { useScopedNav } from "@/services/scopedNav/api"
import { uniqueId } from "@/services/uniqueId"
import { setFocus } from "@/services/uiNavFocus"
import { lua } from "@/bridge"

const SPINNER_HOLD_CLICK_SOUND_CLASS = "bng_click_hover_generic"

/**
 * @description
 *
 * @param {Number | String} modelValue - only use either modelValue or value, not both
 * @param {Number | String} value - one-way binding useful for readonly inputs. only use either modelValue or value, not both
 * @param {String} label - The label of the input.
 * @param {Boolean} floatingLabel - Whether the label is floating.
 * @param {String} prefix - The prefix of the input.
 * @param {String} suffix - The suffix of the input.
 * @param {Number} step - The step of the number input. The precision of the value will be determined by the step value.
 * For example, if the step is 0.01, the value will be rounded to 2 decimal places.
 */
const props = defineProps({
  // only use either modelValue or value, not both
  modelValue: {
    type: [Number, String],
    default: undefined,
  },
  // one-way binding useful for readonly inputs if you do not want
  //  to create a ref variable just for to the modelValue
  value: {
    type: [Number, String],
    default: undefined,
  },
  type: {
    type: String,
    default: INPUT_TYPES.text,
    validator(value) {
      return Object.keys(INPUT_TYPES).includes(value)
    },
  },
  showExternalButton: {
    type: Boolean,
    default: true,
  },
  floatingLabel: [
    Boolean,
    // `floatingLabel` as string value is for backwards compatibility only
    // TODO: Remove this once we have a proper migration
    String,
  ],
  externalButtonFn: Function,
  // `externalLabel` is for backwards compatibility only
  // TODO: Remove this once we have a proper migration
  externalLabel: String,
  label: String,
  prefix: String,
  suffix: String,
  leadingIcon: Object,
  trailingIcon: Object,
  maxlength: {
    type: [Number, String],
    default: null,
    validator(value) {
      if (value === null) return true
      return typeof parseInt(value) === "number" && parseInt(value) >= 0
    },
  },
  inputWidth: {
    type: String,
    default: null,
  },
  readonly: Boolean,
  disabled: Boolean,
  required: Boolean,
  noScope: Boolean,
  bubbleConfirmEventsOnNoScope: Boolean,
  clampOnBlur: {
    type: Boolean,
    default: true,
  },
  placeholder: String,

  // validation purposes
  validate: Function,
  validationType: {
    type: String,
    default: VALIDATION_TYPES.valueChange,
    validator(value) {
      return Object.keys(VALIDATION_TYPES).includes(value)
    },
  },
  // for backwards compatibility only
  // include the errorMessage as a return value from the validate function
  // TODO: Remove this once we have a proper migration
  errorMessage: String,

  // props below are only applicable if type is number
  min: {
    type: [Number, String],
    default: undefined,
  },
  max: {
    type: [Number, String],
    default: undefined,
  },
  step: {
    type: Number,
    default: 1,
  },
  stepIconType: {
    type: String,
    default: STEP_ICON_TYPES.arrowUpDown,
    validator(value) {
      return Object.keys(STEP_ICON_TYPES).includes(value)
    },
  },
  noStepBindings: Boolean,
  noSpinners: Boolean,
  noValidation: Boolean,
  scopeId: String,
  bubbleWhitelistEvents: {
    type: Array,
    default: () => ["menu"],
  },
})

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))

// Prevent nested controls (spinner/delete buttons) from registering into the same row.
provide("BngRow", null)

const emit = defineEmits([
  "update:modelValue",
  "change",
  "error",
  "blur",
  "focus",
  // valueChanged is for backwards compatibility only
  // TODO: Remove this once we have a proper migration
  "valueChanged",
  "enter",
])

const slots = useSlots()

const Controls = useControls()
const { showIfController } = storeToRefs(Controls)

const input = ref(null)
const elementRef = ref(null)
const scopedNav = useScopedNav()
const internalScopeId = props.scopeId || uniqueId("bng-input")
const rowNavAttrs = computed(() => inRow ? { "bng-no-nav": "true" } : {})

const scopeActivated = ref(false)
const validationState = ref(null)
const numberInputState = reactive({
  inputType: null,
  isUpActive: false,
  isDownActive: false,
})

const value = computed({
  get: () => props.modelValue !== undefined ? props.modelValue : props.value,
  set: newValue => {
    if (props.noValidation) {
      emitChange(newValue)
      return
    }
    const res = validateRawValue(newValue)
    if (props.validationType === VALIDATION_TYPES.valueChange) {
      validationState.value = res
    }
    emitChange(newValue)
  },
})
const inputScopeBubbleWhitelist = computed(() => props.bubbleWhitelistEvents)
const scopedNavDirective = computed(() =>
  props.noScope || inRow
    ? { disabled: true }
    : { scopeId: internalScopeId, trapPolicy: "always", bubbleWhitelistEvents: inputScopeBubbleWhitelist.value, canActivate: canActivateScope }
)
const isEmptyValue = computed(() => isEmpty(value.value))

const inputStyle = computed(() => ({
  "max-width": props.inputWidth || "initial",
}))

const rootStyle = computed(() =>
  props.inputWidth ? { width: "fit-content" } : {}
)

const stepIcons = computed(() => STEP_ICON_TYPES_MAP[props.stepIconType])
const nativeInputType = computed(() => {
  if (props.type === INPUT_TYPES.time) {
    return NATIVE_TIME_INPUT_SUPPORTED ? INPUT_TYPES.time : INPUT_TYPES.text
  }
  return INPUT_TYPES.text
})
const timeInputMin = computed(() => props.type === INPUT_TYPES.time ? props.min : undefined)
const timeInputMax = computed(() => props.type === INPUT_TYPES.time ? props.max : undefined)
const timeInputStep = computed(() => props.type === INPUT_TYPES.time ? props.step : undefined)
const timeSuffixIcon = computed(() => props.type === INPUT_TYPES.time && !props.suffix && !slots.suffix ? icons.timer : null)
const showDefaultExternalButton = computed(() => !props.readonly && !effectiveDisabled.value)
const externalButtonUiNavActive = computed(() => props.noScope || inRow || scopeActivated.value)

const exposed = useDirty(value)
exposed.scopeActivated = scopeActivated
exposed.scopeId = internalScopeId
exposed.domInput = input
exposed.el = elementRef
exposed.activateScope = () => scopedNav.activateScope(internalScopeId)
exposed.deactivateScope = () => scopedNav.deactivateScope(internalScopeId)
defineExpose(exposed)

onUnmounted(() => {
  resetInputState.cancel()
})

const activateInput = () => {
  if (effectiveDisabled.value || props.readonly) return
  nextTick(() => input.value.focus())
}

const canActivateScope = () => !props.readonly && !effectiveDisabled.value && !inRow

const externalButtonFn = () => {
  if (props.externalButtonFn) {
    props.externalButtonFn()
  } else if (props.type === INPUT_TYPES.number) {
    value.value = props.min || 0
  } else {
    value.value = ""
  }
}

function onFocusIn() {
  emit("focus")
}

function onFocusOut(event) {
  let blurValue = value.value

  if (props.type === INPUT_TYPES.number && props.clampOnBlur) {
    const clamped = clampNumberOnBlur(value.value)
    if (clamped.changed) {
      value.value = clamped.value
      blurValue = clamped.value
    }
  }

  if (!props.noValidation && props.validationType === VALIDATION_TYPES.blur) {
    validationState.value = validateRawValue(blurValue)
  }
  emit("blur", blurValue)
}

function onScopeActivated(event) {
  scopeActivated.value = true
}

function onScopeDeactivated(event) {
  scopeActivated.value = false
}

const resetInputState = debounce(() => {
  numberInputState.inputType = null
  numberInputState.isUpActive = false
  numberInputState.isDownActive = false
}, 150)

function onUINavChangeValue(dir) {
  if (numberInputState.inputType && numberInputState.inputType !== NUMBER_INPUT_MODES.uinav) return
  numberInputState.inputType = NUMBER_INPUT_MODES.uinav
  updateNumValue(dir)
  resetInputState()
}

function onArrowKeysChangeValue(dir) {
  if (numberInputState.inputType && numberInputState.inputType !== NUMBER_INPUT_MODES.arrowKeys) return
  numberInputState.inputType = NUMBER_INPUT_MODES.arrowKeys
  updateNumValue(dir)
  resetInputState()
}

function onSpinnerChangeValue(dir) {
  if (numberInputState.inputType && numberInputState.inputType !== NUMBER_INPUT_MODES.spinner) return false
  numberInputState.inputType = NUMBER_INPUT_MODES.spinner
  const changed = updateNumValue(dir)
  resetInputState()
  return changed
}

function onSpinnerHoldChangeValue(dir) {
  const changed = onSpinnerChangeValue(dir)
  console.log("spinnerValueChanged", changed)
  if (!changed) return
  lua.ui_audio.playEventSound(SPINNER_HOLD_CLICK_SOUND_CLASS, "click")
}

function updateNumValue(dir) {
  if (props.type !== INPUT_TYPES.number || effectiveDisabled.value || props.readonly) return false
  const min = !isNullOrUndefined(props.min) ? Number(props.min) : null
  const max = !isNullOrUndefined(props.max) ? Number(props.max) : null
  const previousValue = Number(value.value)
  let val = previousValue
  if (!Number.isFinite(val)) {
    val = Number.isFinite(min) ? min : 0
  }
  if (dir === 1) {
    numberInputState.isUpActive = true
    val = roundToStep(val + props.step, props.step)
  } else {
    numberInputState.isDownActive = true
    val = roundToStep(val - props.step, props.step)
  }
  const clampedValue = clampToRange(val, min, max)
  const changed = clampedValue !== previousValue
  value.value = clampedValue
  return changed
}

function onEnterDown(event) {
  event.preventDefault()
  emit("enter", value.value)
  if (!props.noScope) scopedNav.deactivateScope(internalScopeId)
}

function onKeyDown(event) {
  if (event.key === "Enter") {
    event.preventDefault()
    return
  }

  if (props.type === INPUT_TYPES.number && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault()
  }
}

function onInputConfirm(event) {
  if (props.noScope && props.bubbleConfirmEventsOnNoScope) {
    return true
  }

  const isBack = event?.detail?.name === "back"
  if (isBack) {
    exposed.resetValue?.()
  }

  if (inRow) {
    const rowElement = row.getElement?.()
    if (!rowElement) return true
    input.value?.blur?.()
    setFocus(rowElement, true, false)
    return false
  }

  if (!props.noScope) {
    scopedNav.deactivateScope(internalScopeId)
    return false
  }

  input.value?.blur?.()
  return false
}

function validateRawValue(value) {
  let valid = true
  let newValue = value
  let errorMessage = null

  if (isEmpty(value) && props.required) return { valid: false, error: ERROR_TYPES.required }

  // if not required and the value is empty just return to avoid further validation
  if (isEmpty(value) && props.type === INPUT_TYPES.number) return { valid: true, value: undefined }

  if (props.type === INPUT_TYPES.number && typeof value === "string") {
    if (value.includes(".")) {
      newValue = parseFloat(value)
    } else {
      newValue = parseInt(value)
    }

    if (isNaN(newValue)) return { valid: false, error: ERROR_TYPES.invalidformat }
  }

  if (props.type === INPUT_TYPES.number) {
    const res = validateRange(newValue)
    return { ...res, value: newValue }
  }

  if (props.type === INPUT_TYPES.time) {
    const res = validateTimeValue(value)
    if (!res.valid || !props.validate) return res
  }

  if (props.validate) {
    const res = props.validate(value)
    if (typeof res === "boolean") {
      valid = res
      errorMessage = props.errorMessage
    } else if (typeof res === "object") {
      if ("valid" in res) console.warn("`validate` function must return a boolean `valid` property. Ignoring validation result...")
      valid = res.valid || true
      if (!valid) errorMessage = "errorMessage" in res ? res.errorMessage : props.errorMessage
    }
  }

  return { valid, value: newValue, errorMessage }
}

function validateTimeValue(value) {
  if (isEmpty(value)) return { valid: !props.required, error: props.required ? ERROR_TYPES.required : null, errorMessage: props.required ? ERROR_MESSAGES[ERROR_TYPES.required] : null }
  if (!TIME_PATTERN.test(String(value))) return { valid: false, error: ERROR_TYPES.invalidformat, errorMessage: props.errorMessage || ERROR_MESSAGES[ERROR_TYPES.invalidformat] }

  const currentMinutes = timeStringToMinutes(value)
  const minMinutes = timeStringToMinutes(props.min)
  const maxMinutes = timeStringToMinutes(props.max)
  let valid = true,
    errorMessage = null

  if (minMinutes !== null && currentMinutes < minMinutes) {
    valid = false
    errorMessage = ERROR_MESSAGES[`${ERROR_TYPES.outofrange}-min`].replace("{min}", props.min)
  } else if (maxMinutes !== null && currentMinutes > maxMinutes) {
    valid = false
    errorMessage = ERROR_MESSAGES[`${ERROR_TYPES.outofrange}-max`].replace("{max}", props.max)
  }

  return { valid, error: !valid ? ERROR_TYPES.outofrange : null, errorMessage, value }
}

function timeStringToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value ?? ""))
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function validateRange(value) {
  const lessThanMin = !isNullOrUndefined(props.min) && value < props.min
  const greaterThanMax = !isNullOrUndefined(props.max) && value > props.max
  let valid = true,
    errorMessage = null

  if (!isNullOrUndefined(props.min) && !isNullOrUndefined(props.max) && (lessThanMin || greaterThanMax)) {
    errorMessage = ERROR_MESSAGES[ERROR_TYPES.outofrange].replace("{min}", props.min).replace("{max}", props.max)
    valid = false
  } else if (lessThanMin) {
    errorMessage = ERROR_MESSAGES[`${ERROR_TYPES.outofrange}-min`].replace("{min}", props.min)
    valid = false
  } else if (greaterThanMax) {
    errorMessage = ERROR_MESSAGES[`${ERROR_TYPES.outofrange}-max`].replace("{max}", props.max)
    valid = false
  }

  return { valid, error: !valid ? ERROR_TYPES.outofrange : null, errorMessage }
}

function clampNumberOnBlur(rawValue) {
  if (isEmpty(rawValue)) return { changed: false, value: rawValue }

  const parsedValue = parseNumber(rawValue)
  if (parsedValue === null) return { changed: false, value: rawValue }

  const min = isNullOrUndefined(props.min) ? null : Number(props.min)
  const max = isNullOrUndefined(props.max) ? null : Number(props.max)

  const clampedValue = clampToRange(parsedValue, min, max)
  return { changed: clampedValue !== parsedValue, value: clampedValue }
}

function isEmpty(val) {
  return val === null || val === undefined || val === ""
}

function isNullOrUndefined(val) {
  return val === null || val === undefined
}

function emitChange(value) {
  emit("update:modelValue", value)
  emit("change", value)
  // valueChanged is for backwards compatibility only
  // TODO: Remove this once we have a proper migration
  emit("valueChanged", value)
}

const rowControlApi = inRow
  ? {
      activate: activateInput,
      stepLeft: () => {
        if (props.type !== INPUT_TYPES.number) return true
        updateNumValue(-1)
        return false
      },
      stepRight: () => {
        if (props.type !== INPUT_TYPES.number) return true
        updateNumValue(1)
        return false
      },
      isEventInside: event => !!(elementRef.value && event?.target instanceof Node && elementRef.value.contains(event.target)),
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onUnmounted(() => row.unregister(rowControlApi))
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

// focus frame
$f-offset: 2px;
$rad: $border-rad-1;

// Reset Angular styles leaking in
// TODO: Remove this once the global Angular styles is removed
.bng-input input {
  // all: unset;
  background: unset;
  border: none;
}

$text-color: var(--bng-off-white);
$label-color: var(--bng-cool-gray-200);
$input-border-color: var(--bng-off-white);
$border-width: 0.0625em; // 1px
$border-color: var(--bng-cool-gray-500);
$background-color: var(--bng-cool-gray-900);

$focused-input-border-color: var(--bng-orange-500);
$focused-border-color: var(--bng-orange-500);
$focused-border-width: 0.125em; // 2px
$focused-background-color: var(--bng-cool-gray-850);

$invalid-input-border-color: var(--bng-add-red-550);
$invalid-label-color: var(--bng-add-red-550);
$invalid-background-color: rgba(var(--bng-add-red-800-rgb), 0.5);

$disabled-text-color: var(--bng-cool-gray-200);
$disabled-label-color: var(--bng-cool-gray-200);
$disabled-border-color: var(--bng-cool-gray-750);
$disabled-background-color: rgba(var(--bng-cool-gray-500-rgb), 0.5);

$alternate-background-color: var(--bng-cool-gray-700);
$alternate-border-color: var(--bng-cool-gray-500);

$input-padding: calc-ui-rem(0.25);

.bng-input {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc-ui-rem(2.25);
  border-radius: calc-ui-rem(0.25) calc-ui-rem(0.25) 0 0;
  font-size: calc-ui-rem();
  color: $text-color;
  cursor: default;

  @include modify-focus($rad, $f-offset);
}

.bng-input > label,
.input-container > label {
  position: absolute;
  left: 0;
  font-size: calc-ui-rem();
  color: $label-color;
  white-space: nowrap;

  &.external-label {
    top: calc-ui-rem(-1.5);
  }

  &.floating-label {
    top: calc-ui-rem(0.5);
    left: $input-padding;
    pointer-events: none;
  }
}

.bng-input > .error-message {
  position: absolute;
  bottom: calc-ui-rem(-1.125);
  left: 0;
  width: 100%;
  height: 1em;
  color: $invalid-label-color;
  font-weight: 400;
  pointer-events: none;
}

.input-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: calc-ui-rem(3);
  margin: 0 calc-ui-rem(0.25);

  :deep(.bng-button) {
    margin: 0;
    min-width: calc-ui-rem(2);
    width: 100%;
    height: 100%;
  }

  // TODO: This is a hack and needs more feedback on how to handle this properly
  &.spinner-active {
    :deep(.bng-binding-icon),
    :deep(.icon-base) {
      color: $focused-input-border-color !important;
    }
  }
}

$hover-spinner-width: calc-ui-rem(1.25);

.hover-spinner {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  width: $hover-spinner-width;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;

  :deep(.bng-button) {
    margin: 0;
    min-width: 0;
    width: 100%;
    height: 50%;
    padding: 0;
    font-size: calc-ui-rem(0.75);
  }

  // TODO: This is a hack and needs more feedback on how to handle this properly
  .hover-spinner-btn.spinner-active {
    :deep(.icon-base) {
      color: $focused-input-border-color !important;
    }
  }
}

.input-container:has(> .hover-spinner) > input {
  padding-right: $hover-spinner-width;
}

.input-container:hover > .hover-spinner,
.hover-spinner:hover {
  opacity: 1;
  pointer-events: auto;
}

.leading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 $input-padding;
  height: 100%;
}

.external-button {
  :deep(button) {
    margin: 0 0 0 calc-ui-rem(0.25) !important;
    padding-top: calc-ui-rem(0.35);
    padding-bottom: calc-ui-rem(0.45);
  }
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  height: 100%;
  width: 100%;
  padding: 0 calc-ui-rem(0.25);
  padding-top: calc-ui-rem(0.25);
  max-width: var(--bng-input-max-width);
  background: $background-color;

  &::before {
    background: $input-border-color;
  }
}

input {
  width: 100%;
  height: 100%;
  padding: 0;
  color: $text-color;
  font-family: var(--fnt-defs);
  cursor: text;
  pointer-events: auto;

  &::before {
    display: none;
  }

  &::-webkit-inner-spin-button {
    display: none;
  }

  &[type="time"] {
    color-scheme: dark;

    &::-webkit-calendar-picker-indicator {
      display: none;
      -webkit-appearance: none;
      appearance: none;
    }
  }
}

// Floating label
.bng-input.has-value > .input-container {
  padding-top: 0;

  > .floating-label {
    top: calc-ui-rem(-0.125);
    font-size: calc-ui-rem(0.75);
    font-weight: 400;
  }
}

// Alternate background color
.prefix,
.suffix,
.trailing-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 $input-padding;
  height: 100%;
  background: $alternate-background-color;

  &::before {
    background: $alternate-border-color;
  }
}

.bng-input:has(> .external-label) {
  margin-top: calc-ui-rem(1.5);
}

.bng-input {
  &:has(.prefix) > .trailing-icon {
    background: $background-color;
  }
}

// BngInput's border radius
.input-container,
.suffix,
.prefix,
.trailing-icon {
  position: relative;

  &::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: $border-width;
    pointer-events: none;
  }
}

.bng-input {
  .prefix {
    border-top-left-radius: calc-ui-rem(0.25);
  }

  &:not(:has(.prefix)) > .input-container {
    border-top-left-radius: calc-ui-rem(0.25);
  }

  > .trailing-icon {
    border-top-right-radius: calc-ui-rem(0.25);
  }

  &:not(:has(.trailing-icon)) > .prefix {
    border-top-right-radius: calc-ui-rem(0.25);
  }

  &:not(:has(.trailing-icon)):not(:has(.prefix)) > .input-container {
    border-top-right-radius: calc-ui-rem(0.25);
  }

  &:has(input:focus) {
    .prefix,
    .suffix,
    .trailing-icon,
    .input-container {
      &::before {
        background: $focused-border-color;
        height: $focused-border-width;
      }
    }
  }
}

// .suffix,
// .prefix,
// .trailing-icon,
// .leading-icon {
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   padding: 0 calc-ui-rem(0.5);
//   height: 100%;
// }

// .leading-icon {
//   border-bottom: none;
// }

// .prefix,
// .suffix {
//   padding: 0 calc-ui-rem(0.25);
//   // font-family: var(--fnt-mono);
// }

// // bottom borders
// .inner-container,
// .prefix,
// .suffix,
// .trailing-icon {
//   position: relative;

//   &::before {
//     content: "";
//     position: absolute;
//     bottom: 0;
//     left: 0;
//     width: 100%;
//     height: $border-width;
//     background: $input-border-color;
//     pointer-events: none;
//   }
// }

// alternating background colors
// .bng-input {
//   // set items after the input container to be grey
//   > .inner-container + *:not(.external-button):not(label) {
//     background: $alternate-background-color;
//     &::before {
//       background: $alternate-border-color;
//     }
//   }

//   > .prefix {
//     background: $alternate-background-color;
//     &::before {
//       background: $alternate-border-color;
//     }
//   }

//   > .trailing-icon {
//     background: $background-color;
//     &::before {
//       background: $input-border-color;
//     }
//   }
// }

// BngInput's border radius
// .bng-input {
//   > :first-child:not(.leading-icon) {
//     border-top-left-radius: calc-ui-rem(0.25);
//   }

//   > .leading-icon + * {
//     border-top-left-radius: calc-ui-rem(0.25);
//   }

//   > :last-child:not(.external-button) {
//     border-top-right-radius: calc-ui-rem(0.25);
//   }

//   &:has(.external-button) > :nth-last-child(2) {
//     border-top-right-radius: calc-ui-rem(0.25);
//   }
// }

// invalid input
// .bng-input.bng-input-invalid {
//   label {
//     color: $invalid-label-color !important;
//   }

//   > .inner-container {
//     background: $invalid-background-color !important;
//   }

//   > .suffix,
//   > .prefix,
//   > .trailing-icon,
//   > .inner-container {
//     &::before {
//       background: $invalid-label-color !important;
//     }
//   }

//   &:has(.error-message) {
//     margin-bottom: 1.5em;
//   }
// }

// reset button positioning
// .bng-input .external-button {
//   :deep(button) {
//     margin: 0 calc-ui-rem(0.25) !important;
//     padding-top: calc-ui-rem(0.35);
//     padding-bottom: calc-ui-rem(0.45);
//   }
// }

// label positioning
// .bng-input {
//   &:has(.external-label) {
//     margin-top: calc-ui-rem(1.5);

//     > .external-label {
//       top: calc-ui-rem(-1.5);
//       left: 0;
//     }
//   }

//   // minimize translate to the top
//   &.has-value:has(.inner-container > .floating-label) {
//     .inner-container {
//       padding-top: calc-ui-rem(0.5);
//     }

//     .inner-container > .floating-label {
//       font-size: calc-ui-rem(0.75);
//       font-weight: 400;
//       transform: translateY(calc-ui-rem(-1.25));
//     }
//   }
// }

// // focus styling. only apply focus styling if any other element except the reset button is focused
// .bng-input:not(.bng-input-readonly) {
//   &:has(input:focus) {
//     .inner-container,
//     .prefix,
//     .suffix,
//     .trailing-icon {
//       &::before {
//         background: $focused-border-color;
//         height: $focused-border-width;
//       }
//     }
//   }
// }

// .bng-input[disabled] {
//   pointer-events: none;
//   color: $disabled-text-color;

//   .suffix,
//   .prefix,
//   .trailing-icon,
//   .inner-container {
//     &::before {
//       background: $disabled-border-color !important;
//     }
//   }
// }
</style>
