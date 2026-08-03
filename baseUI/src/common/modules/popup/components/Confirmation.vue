<!-- Confirmation Popup - a simple popup asking for confirmation of something -->
<template>
  <div
    v-bng-scoped-nav="popupScopeBinding"
    :class="['popup', 'popup-style-' + appearance]"
    v-bng-on-ui-nav:back,menu="handleCancelWithBack"
  >
    <div class="popup-content">
      <div class="popup-title" v-if="title">{{ title }}</div>
      <div class="popup-body" v-if="messageIsComponent"><component :is="message.component" v-bind="message.props" /></div>
      <div class="popup-body" v-else><DynamicComponent :template="message" bbcode /></div>
      <div class="popup-buttons">
        <BngButton
          v-for="(button, index) in displayButtons"
          :key="index"
          v-bng-ui-nav-focus="popupActive && button === focusButton ? 1000 : undefined"
          v-bng-focus-if="popupActive && button === focusButton"
          :bng-scoped-nav-autofocus="popupActive && button === focusButton ? true : null"
          v-bind="buttonProps[index]"
          @click="emit('return', button.value)"
        >
          <template v-for="(part, partIndex) in buttonLabelParts[index]" :key="partIndex">
            <BngBinding v-if="part.action" :action="part.action" show-unassigned />
            <template v-else>{{ part.text }}</template>
          </template>
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, useAttrs, watch } from "vue"
import { BngBinding, BngButton } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngFocusIf, vBngOnUiNav, vBngScopedNav, vBngUiNavFocus } from "@/common/directives"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { getButtonProps, hasRoles, isCancel, orderButtonsByRole, playCancelSound, resolveFocusButton, popupOrderDevWarn } from "../buttonRoles.js"

const props = defineProps({
  appearance: String,
  popupActive: Boolean,
  message: {
    type: [String, Object],
    required: true,
  },
  title: String,
  buttons: Array,
  // Opt-OUT of the canonical role engine. Defaults to false (canonical-capable);
  // popup.js helpers pass `true` to freeze existing popups to legacy behavior.
  unordered: { type: Boolean, default: false },
})

const emit = defineEmits(["return"])

const attrs = useAttrs()
const scopeName = `_confirmPopup__${attrs.__id}`
const keepPopupScopeActive = () => false
const popupScopeBinding = computed(() => ({
  scopeId: scopeName,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  canDeactivate: keepPopupScopeActive,
  preferAutoFocus: true,
  trapPolicy: "always",
}))

const navBlocker = useUINavBlocker()
watch(() => props.popupActive, active => {
  if (active) navBlocker.allowNavigationOnly()
  else navBlocker.clear()
}, { immediate: true })

// Roles only take effect when not opted-out AND the button set actually declares roles.
const useRoles = computed(() => !props.unordered && hasRoles(props.buttons))
const displayButtons = computed(() => (useRoles.value ? orderButtonsByRole(props.buttons) : props.buttons))
const buttonLabelParts = computed(() => displayButtons.value.map(button => {
  const label = String(button.label ?? "")
  const parts = []
  const actionToken = /\[action=([^\]]+)\]/gi
  let textStart = 0
  let match
  while ((match = actionToken.exec(label)) !== null) {
    if (match.index > textStart) parts.push({ text: label.slice(textStart, match.index) })
    parts.push({ action: match[1] })
    textStart = actionToken.lastIndex
  }
  if (textStart < label.length) parts.push({ text: label.slice(textStart) })
  return parts
}))
const focusButton = computed(() => resolveFocusButton(displayButtons.value, useRoles.value))
const cancelButton = props.buttons.find(button => isCancel(button))

const buttonProps = computed(() => displayButtons.value.map(button => getButtonProps(button, useRoles.value)))

const messageIsComponent = computed(() => props.message && typeof props.message === "object" && props.message.component)

let warnedNoCancel = false
const handleCancelWithBack = () => {
  if (!cancelButton && !warnedNoCancel) {
    warnedNoCancel = true
    popupOrderDevWarn(`${props.title || scopeName} (no cancel role)`)
  }
  if (cancelButton) {
    playCancelSound(cancelButton)
    emit("return", cancelButton.value)
  }
}

onMounted(() => {
  if (props.unordered && displayButtons.value.length >= 2) {
    popupOrderDevWarn(props.title || scopeName)
  }
})
</script>

<script>
import { popupPosition } from "../options.js"

export default {
  // export popup settings (optional)
  wrapper: {
    blur: true,
    style: null,
  },
  position: popupPosition.center,
  animated: true,
}
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

// popup appearances
.popup-style-experimental {
  padding: 0.2em;
  background-image: repeating-linear-gradient(45deg, rgba(#f00, 0.3) 0 0.5em, #f00 0.5em 1.5em);

  .popup-title {
    background: #700;
  }
}
</style>
