<template>
  <section
    class="photomode-section-shell"
    :class="shellClasses"
    :aria-labelledby="titleId || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <header v-if="hasHeader" class="photomode-section-shell__header">
      <div class="photomode-section-shell__heading">
        <slot name="heading">
          <h2
            v-if="title"
            :id="titleId || undefined"
            class="photomode-section-shell__title"
          >
            {{ title }}
          </h2>
        </slot>
      </div>
      <p v-if="status" class="photomode-section-shell__status">{{ status }}</p>
    </header>

    <div v-if="slots.readouts" class="photomode-section-shell__readouts">
      <slot name="readouts" />
    </div>

    <div v-if="slots.default" class="photomode-section-shell__body">
      <slot />
    </div>

    <div v-if="slots.actions" class="photomode-section-shell__actions">
      <slot name="actions" />
    </div>

    <slot name="custom" />
  </section>
</template>

<script setup>
import { computed, useSlots } from "vue"

defineOptions({ name: "PhotomodeSectionShell" })

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  titleId: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: "",
  },
})

const slots = useSlots()
const hasHeader = computed(() => !!props.title || !!props.status || !!slots.heading)
const shellClasses = computed(() => ({
  "photomode-section-shell--disabled": props.disabled,
  [`photomode-section-shell--${props.variant}`]: !!props.variant,
}))
</script>

<style lang="scss" scoped>
.photomode-section-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0.5em 0.25em 2em;
  min-width: 0;
  box-sizing: border-box;
  color: rgba(var(--bng-off-white-rgb), 0.9);
}

.photomode-section-shell__header,
.photomode-section-shell__heading,
.photomode-section-shell__body {
  display: flex;
  flex-direction: column;
}

.photomode-section-shell__header {
  gap: 0.35em;
}

.photomode-section-shell__heading {
  gap: 0.15em;
}

.photomode-section-shell__title,
.photomode-section-shell__status {
  margin: 0;
}

.photomode-section-shell__title {
  font-size: 1em;
  line-height: 1.2;
  color: var(--bng-off-white);
}

.photomode-section-shell__status {
  font-size: 0.85em;
  line-height: 1.3;
  color: var(--bng-cool-gray-400);
}

.photomode-section-shell__body {
  gap: 0.5em;
}

.photomode-section-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  --bng-bg-border-radius: var(--bng-corners-1);
}

</style>
