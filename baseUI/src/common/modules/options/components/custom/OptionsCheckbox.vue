<template>
  <div class="options-checkbox">
    <SwitchToggle class="options-checkbox-toggle" :checked="isSwitchOn" :disabled="effectiveDisabled" />
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from "vue"
import { SwitchToggle } from "@/common/components/utility"

const props = defineProps({
  modelValue: [Boolean, Number, String],
  checked: {
    type: Boolean,
    default: false,
  },
  disabled: Boolean,
  valueOn: {
    type: [Boolean, Number, String],
    default: undefined,
  },
  valueOff: {
    type: [Boolean, Number, String],
    default: undefined,
  },
})

const emit = defineEmits(["update:modelValue", "change", "valueChanged"])

const row = inject("BngRow")
const effectiveDisabled = computed(() => props.disabled || row.disabled.value)

const valOn = computed(() => (typeof props.valueOn === "undefined" ? true : props.valueOn))
const valOff = computed(() => (typeof props.valueOff === "undefined" ? false : props.valueOff))
const isSwitchOn = computed(() => (props.modelValue != null ? props.modelValue === valOn.value : props.checked))

function onClicked() {
  if (effectiveDisabled.value) return

  const newValue = !isSwitchOn.value ? valOn.value : valOff.value

  if (props.modelValue != null) emit("update:modelValue", newValue)

  emit("valueChanged", newValue)
  emit("change", newValue)
}

const rowControlApi = { activate: onClicked }
onMounted(() => row.register(rowControlApi))
onBeforeUnmount(() => row.unregister(rowControlApi))

defineExpose({
  toggle: onClicked,
})
</script>

<style lang="scss" scoped>
.options-checkbox {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
}

.options-checkbox-toggle {
  --bng-switch-toggle-size: 1.1em;
  --bng-switch-toggle-radius: 2em;
  --bng-switch-toggle-knob-radius: 50%;
}
</style>
