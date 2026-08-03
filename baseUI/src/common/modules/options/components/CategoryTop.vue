<template>
  <Button
    class="options-category-button"
    :class="{
      'selected': selected,
      'no-hover': selected,
      'no-focus-frame': true,
      'has-subcategories': hasSubcategories,
      'hidden-by-condition': hiddenByCondition
      }"
    bng-no-nav
    :disabled="disabled"
    @click="emit('click')"
  >
    <template #prefix><BngIcon :type="icon || '_empty'" /></template>
    <TextScroller v-if="$slots.default" ref="scrollerRef">{{ debugSettings ? "🐞" : "" }}<slot></slot></TextScroller>
  </Button>
</template>

<script setup>
import { ref, watch, nextTick } from "vue"
import { BngIcon } from "@/common/components/base"
import { TextScroller, Button } from "@/common/components/utility"

const props = defineProps({
  index: Number,
  hasSubcategories: Boolean,
  icon: String,
  selected: Boolean,
  disabled: Boolean,
  hiddenByCondition: Boolean,
  debugSettings: Boolean,
})

const emit = defineEmits(["click"])

const scrollerRef = ref(null)

watch(() => props.selected, selected => {
  nextTick(() => {
    if (selected) scrollerRef.value?.start()
    else scrollerRef.value?.stop()
  })
}, { immediate: true })
</script>

<style lang="scss" scoped>
.options-category-button {
  flex: 1 1 auto;
  justify-content: start !important;
  padding: 0.25em 0.75em 0.25em 0.5em;
  margin: 0;
  white-space: nowrap;
  gap: 0.325em;

  --bng-bg-border-radius: var(--bng-corners-2);

  --bng-icon-color: var(--bng-off-white);
  --bng-bg-border-width: 0.125em;
  --bng-bg-hover: var(--bng-orange-500);
  --bng-bg-active: var(--bng-orange-600);
  --bng-bg-disabled: transparent;
  &.selected {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-enabled-opacity: 1;
    --bng-bg-border-enabled: var(--bng-orange-400);
    --bng-bg-border-focus: var(--bng-orange-400);
  }

  &.hidden-by-condition {
    opacity: 0.6;
    background-color: #0008;
    &::after {
      content: "[hidden]";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: inline-block;
      padding: 0 1em;
      font-size: 1.2rem;
      font-weight: bold;
      color: #f0f;
      background-color: #0008;
      opacity: 0.8;
      pointer-events: none;
      z-index: 5;
    }
  }
}
</style>
