<template>
  <div
    v-bng-scoped-nav="popupScopeBinding"
    class="form-dialog"
    :style="{ maxWidth: props.maxWidth }"
    v-bng-on-ui-nav:back,menu="handleCancelWithBack"
  >
    <div v-if="title" class="form-dialog-toolbar">
      <div class="toolbar-title">
        {{ title }}
      </div>
    </div>
    <div :class="{ 'no-title': !title }" class="form-dialog-content">
      <div v-if="message" class="content-description">
        {{ message }}
      </div>
      <div class="content-wrapper">
        <component :is="view" v-model="formModel" />
      </div>
    </div>
    <div class="form-actions-bar">
      <BngButton
        v-for="(button, index) in displayButtons"
        :key="index"
        v-bng-ui-nav-focus="getButtonFocusPriority(button, index)"
        v-bng-focus-if="popupActive && button === focusButton"
        :bng-scoped-nav-autofocus="popupActive && button === focusButton ? true : null"
        v-bind="buttonProps[index]"
        :disabled="button.disableIfInvalid && !formValid"
        @click="onClick(button)"
        >{{ button.label }}</BngButton
      >
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, useAttrs } from "vue"
import { BngButton } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavFocus, vBngFocusIf, vBngScopedNav } from "@/common/directives"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { getButtonProps, hasRoles, isCancel, orderButtonsByRole, playCancelSound, resolveFocusButton, popupOrderDevWarn } from "../buttonRoles.js"

const props = defineProps({
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  popupActive: Boolean,
  view: {
    type: [Object, String],
    required: true,
  },
  formValidator: {
    type: Function,
    default: () => true,
  },
  buttons: {
    type: Array,
    required: true,
  },
  maxWidth: {
    type: String,
    default: "40rem",
  },
  // Opt-OUT of the canonical role engine. Defaults to false (canonical-capable);
  // popup.js helpers pass `true` to freeze existing popups to legacy behavior.
  unordered: { type: Boolean, default: false },
})

const popupNavEvents = ["focus_u", "focus_d", "focus_l", "focus_r", "back", "menu", "ok"]
const navBlocker = useUINavBlocker()
watch(() => props.popupActive, active => {
  if (active) navBlocker.allowOnly(popupNavEvents)
  else navBlocker.clear()
}, { immediate: true })

const emit = defineEmits(["return"])
const formModel = defineModel("formModel")

const attrs = useAttrs()
const scopeName = `_formdialog__${attrs.__id}`
const keepPopupScopeActive = () => false
const popupScopeBinding = computed(() => ({
  scopeId: scopeName,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  canDeactivate: keepPopupScopeActive,
  preferAutoFocus: true,
  trapPolicy: "always",
}))

const useRoles = computed(() => !props.unordered && hasRoles(props.buttons))
const displayButtons = computed(() => (useRoles.value ? orderButtonsByRole(props.buttons) : props.buttons))
const focusButton = computed(() => resolveFocusButton(displayButtons.value, useRoles.value))

const buttonProps = computed(() => displayButtons.value.map(button => getButtonProps(button, useRoles.value)))

const getButtonFocusPriority = (button, index) => {
  if (!props.popupActive) return undefined
  if (button === focusButton.value) return 1000
  return useRoles.value ? undefined : displayButtons.value.length - index
}

let warnedNoCancel = false
const handleCancelWithBack = () => {
  const cancelButton = props.buttons.find(x => isCancel(x))
  if (cancelButton) {
    playCancelSound(cancelButton)
    onClick(cancelButton)
  }
  else {
    if (!warnedNoCancel) {
      warnedNoCancel = true
      popupOrderDevWarn(`${props.title || scopeName} (no cancel role)`)
    }
    emit("return")
  }
}

onMounted(() => {
  if (props.unordered && displayButtons.value.length >= 2) {
    popupOrderDevWarn(props.title || scopeName)
  }
})

const onClick = button => {
  const data = { value: button.value }
  if (button.emitData) data.formData = formModel.value
  emit("return", data)
}

const formValid = ref(false)
const message = ref(null)

watch(
  formModel,
  () => {
    const res = props.formValidator(formModel.value)
    message.value = res.error ? res.message : props.description
    formValid.value = !res.error
  },
  { immediate: true, deep: true }
)
</script>

<style lang="scss" scoped>
$border-top: 0.5rem 0.5rem 0 0;

.form-dialog {
  display: flex;
  flex-direction: column;
  color: white;
  max-width: 40rem;

  > .form-dialog-toolbar {
    background: #333;
    padding: 0.5rem;
    overflow: hidden;
    border-radius: $border-top;

    > .toolbar-title {
      padding: 0 0.5rem;
      font-size: 1.2em;
    }
  }

  > .form-dialog-content {
    padding: 1rem;
    background-color: #252525;
    overflow: hidden;

    &.no-title {
      border-radius: $border-top;
    }

    > .content-description {
      padding: 1rem;
      border-radius: 0.125rem;
      font-size: 0.9rem;
      background: rgba(0, 0, 0, 0.4);
    }

    > .content-wrapper {
      padding-top: 0.5rem;
    }
  }

  > .form-actions-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0.5rem;
    background-color: #252525;
    border-radius: 0 0 var(--bng-corners-2) var(--bng-corners-2);
  }
}
</style>
