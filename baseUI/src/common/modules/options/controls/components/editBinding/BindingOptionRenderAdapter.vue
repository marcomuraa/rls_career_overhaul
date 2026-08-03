<template>
  <div ref="rootRef" @focusin="onFocusIn">
    <BngRow
      v-if="useRow"
      class="options-item-row binding-option-row"
      :disabled="disabled"
      :tooltip="rowTooltipText"
      :tooltip-handler="rowTooltipHandler"
    >
      <template v-if="labelInfo.present" #label>
        <DynamicComponent v-if="labelInfo.dynamic" :template="labelInfo.text" />
        <template v-else>{{ labelInfo.text }}</template>
      </template>
      <ComponentRender
        :data="itemData"
        :disabled="disabled"
        deep-update
        @change="onChange"
        @blur="$emit('blur')"
        @click="$emit('click')" />
    </BngRow>
    <ComponentRender
      v-else
      :data="itemData"
      :disabled="disabled"
      deep-update
      @change="onChange"
      @blur="$emit('blur')"
      @click="$emit('click')" />
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from "vue"
import ComponentRender from "@/common/modules/options/render/ComponentRender.vue"
import { BngRow } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { $content } from "@/services"
import { createItem } from "@/common/modules/options/layout/schema"
import { buildRenderTooltip, computeItemLabel } from "@/common/modules/options/render/renderModel"
import { uniqueId } from "@/services/uniqueId"
import { useScopedNav } from "@/services/scopedNav/api"
import { setFocus } from "@/services/uiNavFocus"
import "@/common/modules/options/render/itemStyle.scss"

const ROW_ITEM_TYPES = new Set(["checkbox", "link", "slider", "options", "input", "button"])

const props = defineProps({
  modelValue: {
    type: [Number, String, Boolean, Array, Object],
    default: undefined,
  },
  config: {
    type: Object,
    required: true,
  },
  disabled: Boolean,
})

const emit = defineEmits(["update:modelValue", "change", "click", "blur"])

const rootRef = ref(null)
const localSettingKey = props.config.settingKey || props.config.key || uniqueId("binding-option")
const localSettingsValues = reactive({})
const settingsTimestamp = ref(0)
const scopedNav = useScopedNav()
const showInfo = inject("showInfo", null)
const showCurrentInfo = text => showInfo?.(localSettingKey, text)

provide("settingsValues", computed(() => localSettingsValues))
provide("settingsOptions", computed(() => props.config.settingsOptions || {}))
provide("settingsTimestamp", settingsTimestamp)
provide("infoHidden", ref(false))

const cloneValue = value => {
  if (typeof value === "undefined") return value
  return JSON.parse(JSON.stringify(value))
}

const serializeValue = value => {
  if (typeof value === "undefined") return "undefined"
  return JSON.stringify(value)
}

watch(
  () => props.modelValue,
  value => {
    const clonedValue = cloneValue(value)
    if (serializeValue(localSettingsValues[localSettingKey]) === serializeValue(clonedValue)) return
    localSettingsValues[localSettingKey] = clonedValue
    settingsTimestamp.value++
  },
  { immediate: true, deep: true }
)

const itemData = computed(() => {
  const itemType = props.config.itemType || ({
    switch: "checkbox",
    slider: "slider",
    dropdown: "options",
    input: "input",
  })[props.config.type]

  const item = {
    itemType,
    version: props.config.version || "popup",
    setting: localSettingKey,
    label: props.config.label,
    tooltip: props.config.tooltip,
  }

  if (itemType === "checkbox") {
    if ("valueOn" in props.config) item.valueOn = props.config.valueOn
    if ("valueOff" in props.config) item.valueOff = props.config.valueOff
  } else if (itemType === "slider") {
    item.min = props.config.min
    item.max = props.config.max
    item.step = props.config.step
    item.compact = !!props.config.compact
    if ("valueMultiplier" in props.config) item.valueMultiplier = props.config.valueMultiplier
    if (props.config.unit || props.config.suffix) item.unit = props.config.unit || props.config.suffix
  } else if (itemType === "options") {
    item.options = props.config.options || []
    if (props.config.optionsSource) item.optionsSource = props.config.optionsSource
  } else if (itemType === "input") {
    item.inputType = props.config.inputType || "text"
    if (props.config.unit || props.config.suffix) item.unit = props.config.unit || props.config.suffix
  }

  const createdItem = createItem(item, true)
  if (props.config.extraItemData) Object.assign(createdItem, props.config.extraItemData)
  return createdItem
})

const useRow = computed(() => ROW_ITEM_TYPES.has(itemData.value?.itemType))
const labelInfo = computed(() => computeItemLabel(itemData.value, {}))
const rowTooltipText = computed(() => buildRenderTooltip(itemData.value, props.disabled).info)

const rowTooltipHandler = content => showCurrentInfo(content ? $content.bbcode.parse(content) : undefined)

function onChange(value) {
  localSettingsValues[localSettingKey] = cloneValue(value)
  emit("update:modelValue", value)
  emit("change", value)
}

const isSliderRow = () => (props.config.itemType || props.config.type) === "slider"
const getRowElement = () => rootRef.value?.querySelector?.("[bng-nav-item]")

function restoreRowFocus() {
  const rowElement = getRowElement()
  if (!(rowElement instanceof HTMLElement) || !document.contains(rowElement)) return
  setFocus(rowElement)
}

function onFocusIn(event) {
  const target = event?.target
  if (!(target instanceof HTMLElement) || !rootRef.value?.contains(target)) return

  if (!isSliderRow()) return

  const sliderRoot = target.closest(".bng-slider-container")
  if (!sliderRoot) return

  // On `back`, BngSlider deactivates its inner scope and focuses the slider container itself.
  // Re-activating on that container focus would immediately throw focus back onto the knob.
  if (target === sliderRoot) return

  const scopeId = scopedNav.getScopeForElement(sliderRoot)?.scopeId
  if (!scopeId) return
  void Promise.resolve(scopedNav.activateScope(scopeId, { force: true }))
}

function onSliderDeactivate(event) {
  if (!isSliderRow()) return

  const sliderRoot = event?.target
  if (!(sliderRoot instanceof HTMLElement) || !sliderRoot.classList.contains("bng-slider-container")) return
  if (event.detail?.reason === "parent-scope-deactivation") return
  if (document.activeElement !== sliderRoot) return

  requestAnimationFrame(() => {
    if (document.activeElement !== sliderRoot || !rootRef.value?.contains(sliderRoot)) return
    restoreRowFocus()
  })
}

onMounted(() => {
  rootRef.value?.addEventListener("deactivate", onSliderDeactivate, true)
})

onBeforeUnmount(() => {
  showCurrentInfo(undefined)
  rootRef.value?.removeEventListener("deactivate", onSliderDeactivate, true)
})
</script>
