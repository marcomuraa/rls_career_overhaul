<template>
  <div class="demo-modcontrols">
    <BngDropdown v-model="modfile" :items="mods" />
    <BngButton @click="cmp.reload()">Reload (from cache)</BngButton>
    <BngButton @click="cmp.reload(true)">Full reload</BngButton>
  </div>
  <div>
    <ModComponent ref="cmp" :file="modfile" />
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { BngButton, BngDropdown } from "@/common/components/base"
import { ModComponent } from "@/common/components/utility"
import { useModManager } from "@/services/modManager"

const modManager = useModManager()

const cmp = ref()

const mods = computed(() => [
  { value: "/ui/ui-vue/src/common/components/utility/demos/modComponent_item.vue", label: "Built-in demo" },
  ...modManager.modList.map(mod => ({
    value: mod.filepath,
    label: mod.name,
    disabled: !mod.filepath.endsWith(".vue"),
  }))
])
const modfile = ref(mods.value[0].value)
</script>

<style lang="scss" scoped>
.demo-modcontrols {
  display: flex;
  gap: 0.5em;
}
</style>
