<template>
  <div class="demo-modwrapper">
    <div>
      <div class="demo-modcontrols">
        <b>UI slots:</b>
        <!-- <BngSwitch v-model="tree">Tree</BngSwitch> -->
        <BngSwitch v-model="instant" v-bng-tooltip:top="'Enables instant preview on expand'">Instant</BngSwitch>
      </div>

      <AccordionTree v-if="tree" :data="treeSlots" data-field="items">
        <template #caption="{ entry }">
          {{ entry.caption }}
        </template>
        <template #controls="{ entry }">
          <BngButton
            v-if="entry.uiSlot"
            class="demo-modpreview-btn"
            :class="{ 'demo-modpreview-btn-on': uiSlot === entry.uiSlot }"
            :accent="ACCENTS.text"
            :icon="uiSlot === entry.uiSlot ? icons.eyeSolidOpened : icons.eyeSolidClosed"
            @click="uiSlot = uiSlot === entry.uiSlot ? null : entry.uiSlot"
          />
        </template>
        <template #default="{ entry }">
          {{ entry.content }}
        </template>
      </AccordionTree>

      <Accordion v-else singular>
        <AccordionItem
          v-for="(mount, name) in modManager.uiSlots"
          :key="name"
          @expanded="onExpand(name, $event)"
          :selected="uiSlot === name"
        >
          <template #caption>
            {{ name }} ({{ mount.mods.length }})
          </template>
          <template #controls v-if="!instant">
            <BngButton
              class="demo-modpreview-btn"
              :class="{ 'demo-modpreview-btn-on': uiSlot === name }"
              :accent="ACCENTS.text"
              :icon="uiSlot === name ? icons.eyeSolidOpened : icons.eyeSolidClosed"
              @click="uiSlot = uiSlot === name ? null : name"
            />
          </template>
          <div v-for="mod in mount.mods" :key="name + mod.filepath">
            {{ mod.name }}
          </div>
        </AccordionItem>
      </Accordion>

      <div>
        <BngButton :accent="ACCENTS.outlined" @click="modManager.reloadMods()" v-bng-tooltip:bottom="'Reread all mods from disk'">Reread mods</BngButton>
        <BngButton :accent="ACCENTS.outlined" @click="modManager.refreshMods()" v-bng-tooltip:bottom="'Reread and reload all mods'">Update mods</BngButton>
      </div>
    </div>

    <div class="demo-modpreview">
      <div class="demo-modslotname">{{ uiSlot }}</div>
      <ModSlot v-if="uiSlot" class="demo-modcontainer" :name="uiSlot" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { BngSwitch, BngButton, ACCENTS, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"
import { ModSlot, Accordion, AccordionItem, AccordionTree, MODSLOTS } from "@/common/components/utility"
import { useModManager } from "@/services/modManager"

const modManager = useModManager()

const uiSlot = ref(modManager.uiSlots[0]?.name)

const instant = ref(true)
watch(instant, () => uiSlot.value = null)

const tree = ref(false)
const treeSlots = computed(() => (function dive(node, data) {
  if (typeof node === "string") {
    const res = data[node].mods.map(mod => ({ caption: mod.name }))
    if (res.length === 0) return [{ caption: "<no mods>" }]
    return res
  }
  const res = []
  for (const [name, slot] of Object.entries(node)) {
    res.push({
      caption: name,
      uiSlot: typeof slot === "string" ? slot : null,
      // selected: uiSlot.value === slot,
      items: dive(slot, data),
    })
  }
  if (node === MODSLOTS) console.log("tree", res)
  return res
})(MODSLOTS, modManager.uiSlots))

let tmrCollapse
function onExpand(name, expanded) {
  if (!instant.value) return
  clearTimeout(tmrCollapse)
  if (expanded) {
    uiSlot.value = name
  } else if (uiSlot.value === name) {
    tmrCollapse = setTimeout(() => uiSlot.value = null, 100)
  }
}
</script>

<style lang="scss" scoped>
.demo-modwrapper {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: flex-start;
  > * {
    flex: 0 0 20em;
    width: 20em;
  }
}

.demo-modcontrols {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: space-between;
}

.demo-modpreview {
  flex: 1 1 auto;
  width: auto;
  padding-left: 1em;

  .demo-modslotname {
    display: block;
    font-size: 1.2em;
    font-weight: bold;
    padding: 0.5em 0;
  }

  .demo-modcontainer {
    border: 2px dashed #0aa;
  }
}

.demo-modpreview-btn {
  margin: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  --bng-icon-line-height: 0.9;
  &:not(.demo-modpreview-btn-on) {
    --bng-icon-color: #aaa;
  }
}
</style>
