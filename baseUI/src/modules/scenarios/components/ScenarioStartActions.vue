<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'scenario-start-actions', type: 'container' }"
    class="scenario-start-actions"
  >
    <BngButton
      v-for="(btn, index) in extraButtons"
      :key="`extra-${index}`"
      class="action-button"
      :accent="ACCENTS.secondary"
      @click="$emit('extra-button', btn.cmd)"
    >
      {{ $tt(btn.label) }}
    </BngButton>

    <BngButton
      v-if="showStartButton && buttonText"
      class="action-button start-button"
      :accent="ACCENTS.main"
      bng-scoped-nav-autofocus
      @click="$emit('play')"
    >
      {{ $tt(buttonText) }}
    </BngButton>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngButton, ACCENTS } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  buttonText: { type: String, default: "" },
  showStartButton: { type: Boolean, default: true },
})

defineEmits(["play", "extra-button"])

const extraButtons = computed(() => Array.isArray(props.data?.extraButtons) ? props.data.extraButtons : [])
</script>

<style lang="scss" scoped>
.scenario-start-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.action-button {
  width: 100%;
  text-transform: uppercase;
  font-size: 1.4em;
}
</style>
