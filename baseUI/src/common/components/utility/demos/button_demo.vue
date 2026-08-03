<template>
  <div>
    <h3>Basic Usage</h3>
    <div class="buttons">
      <Button @click="log('Clicked default')">Default Button</Button>
      <Button disabled @click="log('Clicked disabled')">Disabled</Button>
      <Button label="Label Prop" @click="log('Clicked label prop')" />
    </div>

    <h3>Custom Content</h3>
    <div class="buttons">
      <Button @click="log('Clicked custom')">
        <span>Custom <b>HTML</b> Content</span>
      </Button>
    </div>

    <h3>Slots Usage</h3>
    <div class="buttons">
      <Button>
        <template #prefix>
          <span style="margin-right: 0.5em">Prefix</span>
        </template>
        Main Content
        <template #suffix>
          <span style="margin-left: 0.5em">Suffix</span>
        </template>
      </Button>

      <Button>
        <template #background>
          <div style="background: rgba(255, 0, 0, 0.2); width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: -1;"></div>
        </template>
        Custom Background Slot
      </Button>
    </div>
  </div>
</template>

<script setup>
import Button from "../button.vue"

const log = (msg) => console.log(msg)
</script>

<style lang="scss" scoped>
.buttons {
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
  margin-bottom: 1em;
}
</style>

<script>
import source from "./button_demo.vue?raw"

export default {
  source,
  title: "Utility Button",
  description: "A base button component with layout and styles detached from BngButton.",
  propInfo: [
    { name: "label", type: "String", desc: "Button text label" },
    { name: "disabled", type: "Boolean", desc: "Disable the button" },
    { name: "noSound", type: "Boolean", desc: "Disable click sound" },
  ],
  slotInfo: [
    { name: "default", desc: "Button content (text, html, etc.)" },
    { name: "background", desc: "Replaces the default background component" },
    { name: "prebackground", desc: "Content before the background (lowest z-index)" },
    { name: "prefix", desc: "Content before the label/default slot" },
    { name: "suffix", desc: "Content after the label/default slot" },
  ],
}
</script>
