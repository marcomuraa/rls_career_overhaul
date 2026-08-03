<!-- Progress Popup - a simple popup asking for showing a modal progress bar to the user -->
<template>
  <div
    v-bng-scoped-nav="popupScopeBinding"
    :class="['popup']"
    v-bng-on-ui-nav:back,menu="handleCancelWithBack"
  >
    <div class="popup-content">
      <div class="popup-title" v-if="title">{{ title }}</div>
      <div class="popup-body">
        <div class="popup-message" v-if="msg">{{ msg }}</div>
        <BngProgressBar
          :value="progressValue"
          :min="min"
          :max="max"
          :indeterminate="indeterminate"
          :show-value-label="!indeterminate && !!valueLabelFormat"
          :value-label-format="valueLabelFormat" />
      </div>
      <div class="popup-buttons">
        <BngButton
          v-for="(button, index) in displayButtons"
          :key="index"
          v-bng-ui-nav-focus="popupActive && button === focusButton ? 1000 : undefined"
          v-bng-focus-if="popupActive && button === focusButton"
          :bng-scoped-nav-autofocus="popupActive && button === focusButton ? true : null"
          v-bind="buttonProps[index]"
          @click="emitButtonValue(button)">
          {{ button.label }}
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, useAttrs, watch } from "vue"
import { BngButton, BngProgressBar } from "@/common/components/base"
import { vBngFocusIf, vBngOnUiNav, vBngScopedNav, vBngUiNavFocus } from "@/common/directives"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { getButtonProps, isCancel, playCancelSound, resolveFocusButton } from "../buttonRoles.js"

const emit = defineEmits(["return"])

const props = defineProps({
  title: String,
  message: String,
  popupActive: Boolean,
  buttons: Array,
  indeterminate: Boolean,
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  initialValue: {
    type: Number,
    default: 0,
  },
  valueLabelFormat: {
    type: [String, Function],
    default: () => val => `${val}%`,
  },
  timeout: {
    type: Number,
    default: 0,
  },
  cancellable: Boolean,
  tunnel: Object,
})

const displayButtons = computed(() => props.buttons || [])
const focusButton = computed(() => resolveFocusButton(displayButtons.value, false))
const cancelButton = computed(() => displayButtons.value.find(button => isCancel(button)))
const buttonProps = computed(() => displayButtons.value.map(button => getButtonProps(button, false)))

const popupNavEvents = ["focus_u", "focus_d", "focus_l", "focus_r", "back", "menu", "ok"]
const navBlocker = useUINavBlocker()
watch(() => props.popupActive, active => {
  if (active) navBlocker.allowOnly(popupNavEvents)
  else navBlocker.clear()
}, { immediate: true })

const attrs = useAttrs()
const scopeName = `_progressPopup__${attrs.__id}`
const keepPopupScopeActive = () => false
const popupScopeBinding = computed(() => ({
  scopeId: scopeName,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  canDeactivate: keepPopupScopeActive,
  preferAutoFocus: true,
  trapPolicy: "always",
}))

const progressValue = ref(props.initialValue)
const msg = ref(props.message)

const emitButtonValue = button => {
  emit("return", typeof button.value === "function" ? button.value() : button.value)
}

const handleCancelWithBack = () => {
  if (props.cancellable) {
    if (cancelButton.value) playCancelSound(cancelButton.value)
    close()
  }
}

const close = () => emit("return", cancelButton.value ? cancelButton.value.value : null)

const updateProgress = (value, message = undefined) => {
  progressValue.value = +value
  if (message !== undefined) msg.value = message
}

props.tunnel.update = updateProgress
props.tunnel.flushPendingUpdate?.(updateProgress)
props.tunnel.done = close
props.tunnel.ready = true

if (props.timeout) setTimeout(close, props.timeout * 1000)
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
    text-align: left;
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

  .popup-buttons {
    margin: 1em 0 0.5em 0;
    padding: 0 1em;
    text-align: center;
  }
}
</style>
