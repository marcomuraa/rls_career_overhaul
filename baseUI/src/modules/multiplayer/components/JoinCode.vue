<template>
  <div v-if="!lanSession" class="join-code">
    <div class="join-code-label">Join Code</div>
    <div class="join-code-input">
      <BngInput
        ref="inputRef"
        :modelValue="modelValue"
        :disabled="disabled"
        :showExternalButton="false"
        @valueChanged="onValueChanged"
        placeholder="4-digit code"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngInput } from "@/common/components/base"

const inputRef = ref(null)

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: "",
  },
  disabled: Boolean,
  lanSession: Boolean,
})

const emit = defineEmits(["update:modelValue"])

function onValueChanged(v) {
  emit("update:modelValue", v)
}

function isValid(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1000 && n <= 9999
}

function focus() {
  inputRef.value?.$el?.querySelector("input")?.focus()
}

defineExpose({ isValid, focus })
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.join-code {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  width: 100%;
}

.join-code-label {
  font-size: calc-ui-rem(0.75);
  font-weight: 650;
  color: rgba(var(--bng-off-white-rgb), 0.55);
  letter-spacing: 0.03em;
}

.join-code-input {
  display: flex;

  :deep(.bng-input-wrapper) {
    width: 100%;
    margin: 0;
    --input-height: 2.6em;
  }

  :deep(.bng-input-container) {
    background-color: rgba(var(--bng-off-black-rgb), 0.35);
  }

  :deep(.bng-highlight-container) {
    border-radius: var(--bng-corners-1);
  }

  :deep(.bng-input) {
    color: rgba(var(--bng-off-white-rgb), 0.95);
  }

  :deep(.bng-input)::placeholder {
    color: rgba(var(--bng-off-white-rgb), 0.45);
  }

  :deep(.bng-input-container)::after {
    background-color: rgba(var(--bng-off-white-rgb), 0.22);
  }

  :deep(.bng-input-group > .input-border) {
    background-color: rgba(var(--bng-off-white-rgb), 0.28);
  }

  :deep(.bng-highlight-container.bng-input-focused > .bng-input-container::after) {
    background-color: rgba(var(--bng-orange-500-rgb), 0.7);
  }

  :deep(.bng-highlight-container.bng-input-focused > .bng-input-container > .bng-input-group > .input-border) {
    background-color: rgba(var(--bng-orange-500-rgb), 0.85);
  }
}
</style>
