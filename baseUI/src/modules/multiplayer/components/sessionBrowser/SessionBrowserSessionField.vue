<template>
  <div class="sb-session-field">
    <div class="sb-session-field-input">
      <div class="sb-session-field-label">{{ $tt("ui.multiplayer.sessionId") }}</div>
      <BngInput
        :modelValue="sessionId"
        :disabled="!working"
        :showExternalButton="false"
        :placeholder="$tt('ui.multiplayer.sessions.enterSessionId')"
        @valueChanged="v => $emit('update:sessionId', v)"
      />
    </div>

    <div v-if="showJoinCode" class="sb-session-field-join">
      <JoinCode
        ref="joinCodeRef"
        :modelValue="joinCode"
        :disabled="!working"
        :lanSession="isLanSession"
        @update:modelValue="v => $emit('update:joinCode', v)"
      />
    </div>

    <BngButton
      class="sb-session-field-paste"
      accent="text"
      icon="scan"
      :disabled="!working"
      @click="$emit('paste')"
    />

    <BngButton
      class="sb-session-field-clear"
      :disabled="!working || (!sessionId && !joinCode)"
      accent="attention"
      :icon="icons.mathMultiply"
      @click="$emit('clear')"
    />
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngInput, icons } from "@/common/components/base"
import JoinCode from "../JoinCode.vue"

defineOptions({ name: "SessionBrowserSessionField" })

defineProps({
  working: { type: Boolean, default: true },
  sessionId: { type: String, default: "" },
  joinCode: { type: [String, Number], default: "" },
  showJoinCode: { type: Boolean, default: false },
  isLanSession: { type: Boolean, default: false },
})

defineEmits(["update:sessionId", "update:joinCode", "paste", "clear"])

const joinCodeRef = ref(null)

function focusJoinCode() {
  joinCodeRef.value?.focus()
}

function isJoinCodeValid(code) {
  return joinCodeRef.value?.isValid(code) ?? false
}

defineExpose({ focusJoinCode, isJoinCodeValid })
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.sb-session-field {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-flow: row wrap;
  align-items: flex-end;
  gap: 0.35em 0.5em;
}

.sb-session-field-input {
  flex: 2 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.sb-session-field-label {
  font-size: calc-ui-rem(0.75);
  font-weight: 650;
  color: rgba(var(--bng-off-white-rgb), 0.55);
  letter-spacing: 0.03em;
}

.sb-session-field-input :deep(.bng-input-wrapper) {
  width: 100%;
  margin: 0;
  --input-height: 2.6em;
}

.sb-session-field-input :deep(.bng-input-container) {
  background-color: rgba(var(--bng-off-black-rgb), 0.35);
}

.sb-session-field-input :deep(.bng-highlight-container) {
  border-radius: var(--bng-corners-1);
}

.sb-session-field-input :deep(.bng-input) {
  color: rgba(var(--bng-off-white-rgb), 0.95);
}

.sb-session-field-input :deep(.bng-input)::placeholder {
  color: rgba(var(--bng-off-white-rgb), 0.45);
}

.sb-session-field-input :deep(.bng-input-container)::after {
  background-color: rgba(var(--bng-off-white-rgb), 0.22);
}

.sb-session-field-input :deep(.bng-input-group > .input-border) {
  background-color: rgba(var(--bng-off-white-rgb), 0.28);
}

.sb-session-field-input :deep(.bng-highlight-container.bng-input-focused > .bng-input-container::after) {
  background-color: rgba(var(--bng-orange-500-rgb), 0.7);
}

.sb-session-field-input :deep(.bng-highlight-container.bng-input-focused > .bng-input-container > .bng-input-group > .input-border) {
  background-color: rgba(var(--bng-orange-500-rgb), 0.85);
}

.sb-session-field-join {
  flex: 1 1 0;
  min-width: 0;
}

.sb-session-field-paste,
.sb-session-field-clear {
  flex: 0 0 auto;
  align-self: flex-end;
  margin: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;
}
</style>
