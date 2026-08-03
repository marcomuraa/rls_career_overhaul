<template>
  <section
    class="bng-group-panel"
    :class="{ 'bng-group-panel--chrome': chrome }"
    :aria-labelledby="titleId || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <Background class="bng-group-panel__background" />

    <header v-if="title || hint || slots.header || slots.actions" class="bng-group-panel__header">
      <div class="bng-group-panel__copy">
        <slot name="header">
          <BngCardHeading
            v-if="title"
            type="ribbon"
            outline
            :id="titleId || undefined"
            class="bng-group-panel__title"
          >
            {{ title }}
          </BngCardHeading>
          <p v-if="hint" class="bng-group-panel__hint">{{ hint }}</p>
        </slot>
      </div>
      <div v-if="slots.actions" class="bng-group-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="bng-group-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { useSlots } from "vue"
import { BngCardHeading } from "@/common/components/base"
import { Background } from "@/common/components/utility"

defineOptions({ name: "BngGroupPanel" })

defineProps({
  title: {
    type: String,
    default: "",
  },
  titleId: {
    type: String,
    default: "",
  },
  hint: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  chrome: {
    type: Boolean,
    default: false,
  },
})

const slots = useSlots()
</script>

<style lang="scss" scoped>
.bng-group-panel {
  --bng-select-padding: 0;

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--bng-group-panel-padding, 0.25em);
  border-radius: var(--bng-group-panel-border-radius, var(--bng-corners-1));
}

.bng-group-panel__background {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.4;
  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-width: 0 0 0 0.125em;
  --bng-bg-border-radius: var(--bng-group-panel-background-border-radius, var(--bng-corners-1));
}

.bng-group-panel__body {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-radius: var(--bng-group-panel-body-border-radius, var(--bng-corners-2));
}

.bng-group-panel__header {
  display: flex;
  gap: 0.5em;
  align-items: center;
  justify-content: space-between;
}

.bng-group-panel__title {
  margin: 0;
  margin-left: -0.15rem;
  --bng-card-heading-ribbon-color: var(--bng-cool-gray-700);
  font-size: var(--bng-group-panel-title-font-size, 1.25em);
  font-weight: 600;
  line-height: 1.625em;
}

.bng-group-panel__actions {
  display: flex;
  flex: 0 0 auto;
}
</style>
