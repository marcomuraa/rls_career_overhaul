<template>
  <div class="demo-group-panel">
    <BngGroupPanel title="Environment" title-id="demo-group-panel-title">
      <BngRow label="Clouds">
        <BngSwitch v-model="cloudsEnabled" />
      </BngRow>
      <BngRow label="Preset">
        <BngButton label="Apply default" />
      </BngRow>
    </BngGroupPanel>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngGroupPanel, BngRow, BngSwitch } from "@/common/components/base"

const cloudsEnabled = ref(true)
</script>

<style scoped lang="scss">
.demo-group-panel {
  max-width: 28rem;
  padding: 1rem;
}
</style>

<script>
import source from "./bngGroupPanel_demo.vue?raw"

export default {
  source,
  title: "Group panel",
  description: "Panel for visually grouping related settings or actions under an optional heading.",
  propInfo: [
    { name: "title", type: "String", desc: "Heading text shown in the default header." },
    { name: "titleId", type: "String", desc: "ID assigned to the heading and used for aria-labelledby." },
    { name: "hint", type: "String", desc: "Optional helper text below the title." },
    { name: "disabled", type: "Boolean", desc: "Marks the panel as disabled for assistive technology." },
    { name: "chrome", type: "Boolean", desc: "Adds a chrome modifier class for context-specific styling." },
  ],
  attrInfo: [],
  slotInfo: [
    { name: "default", desc: "Panel content." },
    { name: "header", desc: "Custom header content replacing the generated title and hint." },
    { name: "actions", desc: "Optional action content aligned to the header end." },
  ],
  eventInfo: [],
}
</script>
