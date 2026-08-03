<template>
  <section
    class="photomode-group-panel"
    :class="{ 'photomode-group-panel--chrome': chrome }"
    :aria-labelledby="titleId || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <Background class="photomode-group-panel__background" />

    <header v-if="title || hint || slots.header || slots.actions" class="photomode-group-panel__header">
      <div class="photomode-group-panel__copy">
        <slot name="header">
          <h3
            v-if="title"
            :id="titleId || undefined"
            class="photomode-group-panel__title"
          >
            {{ title }}
          </h3>
          <p v-if="hint" class="photomode-group-panel__hint">{{ hint }}</p>
        </slot>
      </div>
      <div v-if="slots.actions" class="photomode-group-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="photomode-group-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { useSlots } from "vue"
import { Background } from "@/common/components/utility"

defineOptions({ name: "PhotomodeGroupPanel" })

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
.photomode-group-panel {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.4;
  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-width: 0 0 0 0.125em;
  --bng-bg-border-radius: 0;
  --bng-select-padding: 0;
  --bng-button-margin: 0;
  --font-size: 1.0em;

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border-radius: var(--bng-corners-1);

  padding: 0.25em;
}

.photomode-group-panel__body {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}


.photomode-group-panel__header {
  display: flex;
  gap: 0.5em;
  align-items: flex-start;
  justify-content: space-between;
  h3 {
    margin: 0.25em 0;
    padding-left: 0.25em;
  }
}

.photomode-group-panel__actions {
  display: flex;
  flex: 0 0 auto;
}
</style>
