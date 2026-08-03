<template>
  <Button
    :class="{
      'options-category-side': true,
      editable,
      selected,
      subcategory,
      [`subcategory-${subcategory}`]: subcategory,
      'has-subcategories': hasSubcategories,
      'hidden-by-condition': hiddenByCondition,
    }"
    @click="emit('click')"
    @focus="emit('focus')"
    >
    <template #prefix>
      <BngIcon class="icon" :type="icon || '_empty'" />
    </template>
    {{ debugSettings ? "🐞" : "" }}<slot></slot>
    <component
      v-if="canEdit && editable"
      :is="EditFloater"
      class="options-edit"
      no-menu
      @emit-edit-cmd="emitEdit"
    />
  </Button>
</template>

<script setup>
import { computed, inject } from "vue"
import { BngIcon } from "@/common/components/base"
import { Button } from "@/common/components/utility"

const props = defineProps({
  index: Number,
  hasSubcategories: Boolean,
  subcategory: String,
  icon: String,
  selected: Boolean,
  editable: Boolean,
  disabled: Boolean,
  hiddenByCondition: Boolean,
  debugSettings: Boolean,
})

const canEdit = import.meta.hot

const EditUI = canEdit ? inject("EditUI") : null
const EditFloater = computed(() => EditUI?.value?.EditFloater)

const emit = defineEmits(["click", "focus", "edit-cmd"])
const emitEdit = (event, ...args) => canEdit && emit("edit-cmd", event, props.index, ...args)
</script>

<style lang="scss" scoped>
.options-category-side {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 0.25em 0.5em;
  max-width: 20em;
  gap: 0.325em;
  justify-content: flex-start;
  text-align: left;

  .icon {
    align-self: first baseline;
  }

  // Background subcomponent vars (basic defaults on purpose)
  --bng-bg-enabled: var(--category-button-bg, transparent);
  --bng-bg-hover: var(--category-button-hover-bg, var(--bng-orange-500));
  --bng-bg-active: var(--category-button-active-bg, var(--bng-orange-600));
  --bng-bg-disabled: var(--category-button-disabled-bg, transparent);

  --bng-bg-enabled-opacity: var(--category-button-bg-opacity, 1);
  --bng-bg-hover-opacity: var(--category-button-hover-bg-opacity, 1);
  --bng-bg-active-opacity: var(--category-button-active-bg-opacity, 1);
  --bng-bg-disabled-opacity: var(--category-button-disabled-opacity, 0.5);

  --bng-bg-border-radius: var(--category-button-border-radius, var(--bng-corners-2));
  --bng-bg-border-width: var(--category-button-border-width, 0.125em);
  --category-side-bg-right: var(--category-button-bg-right, 0);

  &:not(:hover) .options-edit {
    display: none;
  }
  &:hover .options-edit {
    opacity: 1;
    pointer-events: auto;
  }

  & :deep(.bng-background) {
    right: var(--category-side-bg-right, 0);
  }

  &.selected {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-hover: var(--bng-orange-400);
    --bng-bg-enabled-opacity: 1;
    --bng-bg-hover-opacity: 1;
    --bng-bg-border-radius: var(--category-button-border-radius, var(--bng-corners-2)) 0 0 var(--category-button-border-radius, var(--bng-corners-2));
    --category-side-bg-right: -0.5em;
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
