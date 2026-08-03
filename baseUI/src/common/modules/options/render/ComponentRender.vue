<template>
  <component
    v-if="componentRef"
    ref="controlRef"
    :is="componentRef"
    v-model="componentValue"
    v-bind="componentProps.binds"
    v-on="componentProps.events"
  >
    <template v-if="!renderData.separateLabel && !renderData.innerCaption && renderData.label">
      <DynamicComponent v-if="dynamicLabel" :template="renderData.label" />
      <template v-else>{{ renderData.label }}</template>
    </template>
    <template v-else-if="renderData.separateLabel && renderData.innerCaption && renderData.caption">
      <DynamicComponent v-if="dynamicCaption" :template="renderData.caption" />
      <template v-else>{{ renderData.caption }}</template>
    </template>
    <slot></slot>
  </component>
</template>

<script setup>
import { ref, reactive, watch, inject } from "vue"
import { DynamicComponent } from "@/common/components/utility"
import { buildComponent } from "@/common/modules/options/layout/components"
import { finalizeRenderData } from "@/common/modules/options/render/renderModel"

const props = defineProps({
  data: Object,
  disabled: Boolean,
  debugSetting: Boolean, // display a bug icon
  deepUpdate: Boolean, // used in edit popup for a live preview
})

const settingsValues = inject("settingsValues")
const settingsOptions = inject("settingsOptions")
const settingsTimestamp = inject("settingsTimestamp")

const emit = defineEmits(["click", "change", "blur"])

const bug = "🐞" // bug! :)

// component itself, its model value and props
const componentRef = ref()
const componentValue = ref()
const componentProps = reactive({ binds: {}, events: {} })

const dynamicLabel = ref(false)
const dynamicCaption = ref(false)

const controlRef = ref()
const renderData = ref({})

// update on data change just in case (or when deep is enabled for editor preview)
watch(() => props.data, update, { immediate: true, deep: props.deepUpdate })
// update on settings change
watch(settingsTimestamp, update)

function update() {
  renderData.value = { ...props.data }

  // reset props
  // note: we're not setting disabled here, because it often fires a bit late
  componentProps.binds = {}
  componentProps.events = {}

  buildComponent(
    renderData,
    componentRef,
    componentProps,
    componentValue,
    emit,
    settingsValues.value || {},
    settingsOptions.value || {}
  )

  const dynamicFlags = finalizeRenderData(renderData.value, props.debugSetting, bug)
  dynamicLabel.value = dynamicFlags.dynamicLabel
  dynamicCaption.value = dynamicFlags.dynamicCaption

  componentProps.binds.disabled = props.disabled
}
</script>
