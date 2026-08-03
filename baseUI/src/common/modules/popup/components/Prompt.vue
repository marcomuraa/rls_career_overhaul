<!-- Prompt Popup - a simple popup asking for some input from the user -->
<template>
  <div
    v-bng-scoped-nav="popupScopeBinding"
    :class="['popup']"
    v-bng-on-ui-nav:back,menu="handleCancelWithBack"
  >
    <div class="popup-content">
      <div class="popup-title" v-if="title">{{ title }}</div>
      <div class="popup-body">
        <div class="popup-message" v-if="message">{{ message }}</div>
        <BngInput
          :id="INPUT_ID"
          v-model="text"
          :maxlength="maxLength"
          :validate="validate"
          :error-message="errorMessage"
          :bng-scoped-nav-autofocus="popupActive ? true : null"
          v-on:keyup.enter="handleEnterButton(text)"
        />
      </div>
      <div class="popup-buttons">
        <BngButton
          v-for="(button, index) in displayButtons"
          :key="index"
          v-bind="buttonProps[index]"
          :disabled="disableWhenInvalid && validate && !validate(text) && (useRoles ? isConfirm(button) : index > 0)"
          @click="$emit('return', typeof button.value == 'function' ? button.value(text) : button.value)"
          >{{ button.label }}</BngButton
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useAttrs, watch } from "vue"
import { BngButton, BngInput } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { uniqueId } from "@/services/uniqueId"
import { getButtonProps, hasRoles, isCancel, isConfirm, orderButtonsByRole, playCancelSound, resolveFocusButton, popupOrderDevWarn } from "../buttonRoles.js"

const emit = defineEmits(["return"])
const DEFAULT_BUTTON_ID = uniqueId("___DEFAULT", "_")
const INPUT_ID = uniqueId("___INPUT", "_")

const props = defineProps({
  buttons: Array,
  popupActive: Boolean,
  message: String,
  title: String,
  maxLength: Number,
  defaultValue: undefined,
  validate: Function,
  errorMessage: String,
  disableWhenInvalid: Boolean,
  // Opt-OUT of the canonical role engine. Defaults to false (canonical-capable);
  // popup.js helpers pass `true` to freeze existing popups to legacy behavior.
  unordered: { type: Boolean, default: false },
})

const attrs = useAttrs()
const scopeName = `_promptPopup__${attrs.__id}`
const keepPopupScopeActive = () => false
const popupScopeBinding = computed(() => ({
  scopeId: scopeName,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  canDeactivate: keepPopupScopeActive,
  preferAutoFocus: true,
  trapPolicy: "always",
}))

const text = ref(props.defaultValue || "")

const useRoles = computed(() => !props.unordered && hasRoles(props.buttons))
const displayButtons = computed(() => (useRoles.value ? orderButtonsByRole(props.buttons) : props.buttons))
const focusButton = computed(() => resolveFocusButton(displayButtons.value, useRoles.value))
const cancelButton = props.buttons.find(button => isCancel(button))

const buttonProps = computed(() => displayButtons.value.map((button, index) =>
  getButtonProps(button, useRoles.value, button === focusButton.value ? { id: DEFAULT_BUTTON_ID } : {})
))

const handleEnterButton = (text) => {
  if (!(props.disableWhenInvalid && props.validate && !props.validate(text))) {
    emit("return", text)
  }
}

let warnedNoCancel = false
const handleCancelWithBack = () => {
  if (!cancelButton && !warnedNoCancel) {
    warnedNoCancel = true
    popupOrderDevWarn(`${props.title || scopeName} (no cancel role)`)
  }
  if (cancelButton) playCancelSound(cancelButton)
  emit("return", cancelButton ? cancelButton.value : null)
}

const focusInput = async () => {
  await nextTick()
  document.querySelector(`#${INPUT_ID} input`)?.focus()
}

watch(() => props.popupActive, active => {
  if (active) focusInput()
}, { immediate: true })

onMounted(() => {
  if (props.unordered && displayButtons.value.length >= 2) {
    popupOrderDevWarn(props.title || scopeName)
  }
})
</script>

<style lang="scss" scoped>
$border-rad: 0.75em;

.popup {
  position: relative;
  display: inline-block;
  min-width: 20em;
  max-width: 40em;
  border: 0.3em;
  color: #fff;
  border-radius: $border-rad;

  transition: box-shadow 200ms;
  box-shadow: 0 1em 0em 1em rgba(#000, 0);
  &.popup-active {
    box-shadow: 0 1em 4em 1em rgba(#000, 0.3);
  }

  &.popup-inactive {
    filter: grayscale(50%);
    .popup-content > * {
      opacity: 0.5;
    }
  }

  .popup-content {
    display: block;
    width: 100%;
    height: 100%;
    background-color: #252525;
    border-radius: $border-rad;
    overflow: hidden;
  }

  .popup-message {
    padding: 0 0 1em 0;
  }

  .popup-title {
    background: #333;
    padding: 0.3em;
    font-size: 1.2em;
    text-align: center;
  }

  .popup-body {
    margin: 1em 0;
    padding: 0 1em;
    text-align: center;
  }

  // The input's validation error is absolutely positioned below the field and can
  // wrap to multiple lines. Reserve room only while it's shown so it isn't clipped
  // by `.popup-content { overflow: hidden }` or overlap the buttons.
  .popup-body:has(.bng-input-invalid .error-message) {
    padding-bottom: 2em;
  }

  .popup-buttons {
    margin: 1em 0 0.5em 0;
    padding: 0 1em;
    text-align: center;
  }
}
</style>
