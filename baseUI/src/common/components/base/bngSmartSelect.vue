<template>
  <BngSelect
    v-if="type !== 'dropdown'"
    ref="elSelect"
    v-bind="selectAttrs"
    class="bng-smart-select"
    v-model="value"
    :options="binds.options"
    :config="binds.config"
    :disabled="binds.disabled"
    loop
    label-clickable
    :label-popover="elDropdown?.popoverName"
    @label-click="openDropdown"
    @change="onSelectChanged"
  />
  <BngDropdown
    v-if="binds.items"
    ref="elDropdown"
    v-bind="dropdownAttrs"
    :class="`bng-smart-${type}`"
    v-model="value"
    :items="binds.items"
    :highlight="binds.highlight"
    :disabled="binds.disabled"
    :headless="type === 'select'"
    :show-search="binds.showSearch"
    :focus-target="binds.focusTarget"
    :popover-target="binds.popoverTarget"
    @valueChanged="onDropdownChanged"
  />
</template>

<script setup>
import { ref, computed, useAttrs, inject, onMounted, onBeforeUnmount, provide } from "vue"
import { BngSelect, BngDropdown } from "@/common/components/base"

defineOptions({ inheritAttrs: false })

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  threshold: {
    type: Number,
    default: 6,
  },
  type: {
    type: String,
    default: "",
    validator(val) {
      return ["", "select", "dropdown"].includes(val)
    },
  },
  highlight: [String, Array, RegExp],
  disabled: Boolean,
})

const value = defineModel()

const emit = defineEmits(["change"])

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))
const rowElement = computed(() => inRow ? row.getElement?.() : undefined)

// Prevent nested child controls from registering into the same row.
provide("BngRow", null)

const elDropdown = ref()
const elSelect = ref()
const attrs = useAttrs()
const selectAttrs = computed(() => type.value !== "dropdown" ? attrs : undefined)
const dropdownAttrs = computed(() => type.value === "dropdown" ? attrs : undefined)

const types = {
  none: BngSelect,
  select: BngSelect,
  dropdown: BngDropdown,
}

const items = computed(() => Array.isArray(props.items) ? props.items : [])
const type = computed(() =>
  props.type && props.type in types ? props.type :
    items.value.length === 0 ? "none" :
      items.value.length <= props.threshold ? "select" :
        "dropdown"
)

const binds = computed(() => {
  let res = {
    disabled: effectiveDisabled.value,
  }
  switch (type.value) {
    default:
      res.options = ["n/a"]
      res.disabled = true
      break
    case "select":
      res.loop = true
      res.labelClickable = true
      res.config = {
        label: itm => itm?.label || "n/a",
        value: itm => itm?.value,
      }
      res.options = items.value.filter(itm => !itm.disabled && !itm.group)
      res.items = items.value
      res.highlight = props.highlight
      if (!res.disabled) res.disabled = res.options.length === 0
      res.popoverTarget = elSelect.value?.getElement?.()
      res.focusTarget = rowElement.value || elSelect.value?.getContentElement?.() || res.popoverTarget
      break
    case "dropdown":
      res.items = items.value
      res.highlight = props.highlight
      res.showSearch = true
      res.focusTarget = rowElement.value
      break
  }
  return res
})

function openDropdown() {
  if (type.value === "dropdown") elDropdown.value?.open?.()
}

function stepPrev() {
  elSelect.value?.goPrev?.()
}

function stepNext() {
  elSelect.value?.goNext?.()
}

function onSelectChanged(newValue) {
  if (value.value === newValue) return
  emit('change', newValue)
}

function onDropdownChanged(newValue) {
  // Need to allow all value changes to be emitted because v-models between two aren't in sync
  // TODO: Fix this by refactoring dropdown to use defineModel
  if (value.value === newValue) return
  emit('change', newValue)
}

defineExpose({
  stepPrev,
  stepNext,
  openDropdown,
  hasDropdown: () => type.value === "dropdown",
})

const rowUiNavFocus = computed(() => (type.value === "dropdown" || effectiveDisabled.value) ? undefined : {
  callback: dir => {
    if (effectiveDisabled.value) return
    if (dir < 0) stepPrev()
    else stepNext()
  },
})

const rowControlApi = inRow
  ? {
      activate: () => {
        if (effectiveDisabled.value) return
        elSelect.value?.activate?.() || elDropdown.value?.open?.()
      },
      get uiNavFocus() {
        return rowUiNavFocus.value
      },
      isEventInside: event => {
        const target = event?.target
        if (!(target instanceof Node)) return false
        const selectElement = elSelect.value?.getElement?.()
        const dropdownElement = elDropdown.value?.getElement?.()
        return !!(
          (selectElement && selectElement.contains(target)) ||
          (dropdownElement && dropdownElement.contains(target))
        )
      },
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}
</script>

<style lang="scss" scoped>
.bng-smart-select {
  position: relative;
  --indicator-size: 2px;
  --indicator-padding: 2.25em;
  padding: 0 !important;
  > :deep(button) {
    margin: 0 !important;
  }
  .label {
    cursor: pointer;
    &:hover {
      color: var(--bng-orange);
    }
  }
}
</style>
