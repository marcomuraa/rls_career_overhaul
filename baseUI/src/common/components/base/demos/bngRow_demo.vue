<template>
  <div class="bng-row-demo">
    <BngRow>
      <template #label>Switch</template>
      <BngSwitch v-model="switchValue" />
    </BngRow>

    <BngRow>
      <template #label>Button</template>
      <BngButton @click="buttonClicks++">Press me ({{ buttonClicks }})</BngButton>
    </BngRow>

    <BngRow>
      <template #label>Input</template>
      <BngInput v-model="inputValue" />
    </BngRow>

    <BngRow>
      <template #label>Slider</template>
      <BngSlider v-model="sliderValue" :min="0" :max="100" :step="1" />
    </BngRow>

    <BngRow>
      <template #label>Select</template>
      <BngSelect v-model="selectValue" :options="selectOptions" />
    </BngRow>

    <BngRow>
      <template #label>Dropdown</template>
      <BngDropdown v-model="dropdownValue" :items="dropdownItems" />
    </BngRow>

    <BngRow>
      <template #label>Smart Select</template>
      <BngSmartSelect v-model="smartSelectValue" :items="smartSelectItems" />
    </BngRow>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngRow, BngSwitch, BngButton, BngInput, BngSlider, BngSelect, BngDropdown, BngSmartSelect } from "@/common/components/base"

const switchValue = ref(false)
const buttonClicks = ref(0)
const inputValue = ref("Hello")
const sliderValue = ref(25)

const selectOptions = ["Low", "Medium", "High"]
const selectValue = ref("Medium")

const dropdownItems = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
  { label: "Gamma", value: "gamma" },
]
const dropdownValue = ref("beta")

const smartSelectItems = [
  { label: "Easy", value: "easy" },
  { label: "Normal", value: "normal" },
  { label: "Hard", value: "hard" },
]
const smartSelectValue = ref("normal")
</script>

<script>
// Demo Metadata
// -------------------------------------------------------
import source from "./bngRow_demo.vue?raw"
export default {
  source,
  title: "Simple row wrapper",
  description: "A simple labelled row that owns focus and forwards activation to an in-row control.",
  propInfo: [
    {
      name: "label",
      type: "String",
      desc: "Fallback label text when `label` slot is not provided.",
    },
    {
      name: "vertical",
      type: "Boolean",
      desc: "Stacks the label above the control instead of placing them side by side.",
    },
    {
      name: "labelBefore",
      type: "Boolean",
      desc: "Places the label after the control in horizontal layout.",
    },
    {
      name: "disabled",
      type: "Boolean",
      desc: "Disables row activation and propagates disabled state to row-aware controls.",
    },
    {
      name: "noBackground",
      type: "Boolean",
      desc: "Hides the focus and hover background visuals.",
    },
    {
      name: "noFocusFrame",
      type: "Boolean",
      desc: "Hides the focus frame while keeping the row focusable.",
    },
    {
      name: "noNavigationHandling",
      type: "Boolean",
      desc: "Disables row-focused navigation handling for the registered control.",
    },
    {
      name: "noUnusedNavigation",
      type: "Boolean/String/Array",
      desc: "Hides unused directional navigation hints while the row is focused.",
    },
    {
      name: "tooltip",
      type: "String/Object",
      desc: "Tooltip content used when no `tooltip` slot is provided.",
    },
    {
      name: "tooltipHandler",
      type: "Function",
      desc: "If provided, receives tooltip content instead of showing a tooltip popover.",
    },
    {
      name: "soundClass",
      type: "String",
      desc: "Sound class used for row hover, focus, and row-owned activation.",
    },
    {
      name: "noSound",
      type: "Boolean",
      desc: "Disables row-owned sound playback.",
    },
  ],
  attrInfo: [],
}
</script>

<style scoped lang="scss">
.bng-row-demo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 40rem;
}
</style>
