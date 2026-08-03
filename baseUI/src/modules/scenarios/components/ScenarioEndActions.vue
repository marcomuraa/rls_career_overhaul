<template>
  <div
    class="scenario-end-actions"
    v-bng-scoped-nav="{ scopeId: 'scenario-end-actions', type: 'container', preferAutoFocus: true }"
  >
    <BngButton
      v-for="(button, index) in buttons"
      :key="index"
      class="action-button"
      :class="{ disabled: isDisabled(button) }"
      :accent="ACCENTS.main"
      :disabled="isDisabled(button)"
      :bng-scoped-nav-autofocus="index === activeButton ? true : undefined"
      @click="onClick(button)"
    >
      {{ $tt(button.label) }}
    </BngButton>
  </div>
</template>

<script setup>
import { BngButton, ACCENTS } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  buttons: { type: Array, default: () => [] },
  activeButton: { type: Number, default: 0 },
  rewardChosen: { type: Boolean, default: true },
})

const emit = defineEmits(["execute"])

function isDisabled(button) {
  if (!button) return true
  if (button.disabled) return true
  if (button.enableOnChooseReward && !props.rewardChosen) return true
  return false
}

function onClick(button) {
  if (isDisabled(button)) return
  emit("execute", button)
}
</script>

<style lang="scss" scoped>
.scenario-end-actions {
  height: 100px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.action-button {
  padding: 0.6rem 1rem;
  font-size: 1.4em;
  font-weight: 600;
  min-width: 100px;

  &.disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
}
</style>
