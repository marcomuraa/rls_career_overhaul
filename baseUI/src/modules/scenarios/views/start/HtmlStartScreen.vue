<template>
  <div class="html-start" >
    <div class="html-panel" v-bng-blur="true">
      <BngCardHeading v-if="data?.name">{{ $tt(data.name) }}</BngCardHeading>
      <div>
        <DynamicComponent  v-if="data?.description" :template="data.description" />
      </div>

      <div
        v-if="showStartButton && buttonText"
        class="start-actions"
        v-bng-scoped-nav="{ scopeId: 'scenario-start-actions', type: 'container' }"
      >
        <BngButton
          :accent="ACCENTS.main"
          :disabled="isDisabled"
          bng-scoped-nav-autofocus
          @click="$emit('play')"
        >
          {{ $tt(buttonText) }}
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { BngButton, BngCardHeading, ACCENTS } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngScopedNav, vBngBlur } from "@/common/directives"

defineProps({
  data: { type: Object, default: () => ({}) },
  startHtmlHref: { type: String, default: null },
  showStartButton: { type: Boolean, default: true },
  isDisabled: { type: Boolean, default: false },
  buttonText: { type: String, default: "" },
})

defineEmits(["play"])
</script>

<style lang="scss" scoped>
.html-start {
  position: absolute;
  width: 100%;
  height: 84%;
  bottom: 8%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.html-panel {
  width: 600px;
  min-height: 50%;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1rem;
  border-radius: var(--bng-corners-2);
  gap: 0.75rem;
}

.start-actions {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  align-items: center;
}

.html-frame {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;

  iframe {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    background: transparent;
  }
}
</style>
