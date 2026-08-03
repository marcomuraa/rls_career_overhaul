<template>
  <BngRow
    v-if="visible"
    ref="rowRef"
    class="binding-item-row"
    :class="{ 'binding-item-engaged': engaged, 'binding-item-empty': !hasBindings }"
    :label="$tt(title)"
    :no-focus-frame="engaged"
    :sound-class="''"
    v-bng-ui-nav-label:ok="rowOkLabel"
    v-bng-ui-nav-label:action_2="rowAction2Label"
  >
    <BindingItemRail
      ref="railRef"
      :action-key="actionKey"
      :bindings="bindings"
      :engaged="engaged"
      :can-add="canAdd"
      :chip-index="currentChipIndex"
      @activate="onActivate"
      @add="onAddRequested"
      @disengage="onDisengage"
      @edit-current="onEditCurrent"
      @step="onStep"
      @chip-click="onChipClick"
    />
  </BngRow>
  <div v-else class="binding-item-placeholder"></div>
</template>

<script setup>
import { computed, inject, nextTick, ref, watch } from "vue"
import { BngRow } from "@/common/components/base"
import { vBngUiNavLabel } from "@/common/directives"
import { setFocus } from "@/services/uiNavFocus"
import { $translate } from "@/services"
import BindingItemRail from "./BindingItemRail.vue"

const $simplemenu = inject("$simplemenu", ref(false))

const props = defineProps({
  actionKey: String,
  bindings: Array,
  title: String,
  hideAddButton: Boolean,
  activeRowKey: {
    type: String,
    default: null,
  },
  visible: { type: Boolean, default: true },
})

const emit = defineEmits(["binding-click", "add-click", "engage", "disengage"])

const rowRef = ref(null)
const railRef = ref(null)
const engaged = ref(false)
const currentChipIndex = ref(0)

const hasBindings = computed(() => !!props.bindings?.length)
const canAdd = computed(() => !props.hideAddButton && !$simplemenu.value)

const rowOkLabel = computed(() => {
  if (hasBindings.value) return $translate.instant("ui.common.edit")
  if (canAdd.value) return $translate.instant("ui.controls.addBinding")
  return undefined
})
const rowAction2Label = computed(() => canAdd.value ? $translate.instant("ui.controls.addBinding") : "")

watch(() => props.bindings, list => {
  const len = list?.length ?? 0
  if (!len) {
    engaged.value = false
    currentChipIndex.value = 0
    return
  }
  if (currentChipIndex.value >= len) currentChipIndex.value = len - 1
  if (currentChipIndex.value < 0) currentChipIndex.value = 0
})

watch(() => props.activeRowKey, key => {
  if (!engaged.value) return
  if (key !== props.actionKey) engaged.value = false
})

function onActivate() {
  if (hasBindings.value) {
    engageAtIndex(0)
    return
  }
  if (canAdd.value) {
    emit("engage", props.actionKey)
    emit("add-click")
  }
}

function onAddRequested() {
  if (canAdd.value) {
    emit("engage", props.actionKey)
    emit("add-click")
  }
}

function onDisengage() {
  engaged.value = false
  emit("disengage", props.actionKey)
}

function onEditCurrent() {
  const binding = props.bindings?.[currentChipIndex.value]
  if (!binding) return
  emit("binding-click", binding)
}

function onStep(direction) {
  if (!hasBindings.value) return
  const len = props.bindings.length
  currentChipIndex.value = (currentChipIndex.value + direction + len) % len
}

function onChipClick(payload) {
  const binding = payload?.binding
  const index = Number(payload?.index)
  if (Number.isFinite(index)) {
    currentChipIndex.value = Math.max(0, Math.min(index, (props.bindings?.length ?? 1) - 1))
  }
  engaged.value = true
  emit("engage", props.actionKey)
  emit("binding-click", binding)
}

function engageAtIndex(index) {
  if (!hasBindings.value) return
  currentChipIndex.value = Math.max(0, Math.min(index, props.bindings.length - 1))
  engaged.value = true
  emit("engage", props.actionKey)
  nextTick(() => {
    railRef.value?.focusRail?.()
  })
}

function getRowElement() {
  const el = rowRef.value?.$el
  return el instanceof HTMLElement ? el : null
}

function focusRow() {
  engaged.value = false
  emit("disengage", props.actionKey)
  const el = getRowElement()
  if (!el) return
  if (!setFocus(el, true, false)) el.focus?.()
}

function focusBinding(binding) {
  if (!binding || !props.bindings?.length) return false
  const idx = props.bindings.findIndex(b => b.devname === binding.devname && b.control === binding.control)
  if (idx < 0) return false
  engageAtIndex(idx)
  return true
}

function focusLastBinding() {
  if (!props.bindings?.length) return false
  engageAtIndex(props.bindings.length - 1)
  return true
}

defineExpose({
  focusRow,
  focusBinding,
  focusLastBinding,
  getActionKey: () => props.actionKey,
  hasBindings: () => hasBindings.value,
})
</script>

<style lang="scss" scoped>
.binding-item-row {
  --bng-row-breakpoint: 50%;
  cursor: default;

  &.binding-item-engaged {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-hover: var(--bng-orange-550);
    --bng-bg-enabled-opacity: 0.4;
    --bng-bg-hover-opacity: 0.5;
  }
}

.binding-item-placeholder {
  min-height: 2.85rem;
}
</style>
