<template>
  <template v-if="noContainer && mods.length > 0">
    <ModComponent v-for="mod in mods" :key="mod.id" :file="mod.filepath" :data="mod.data" />
  </template>
  <div v-else-if="mods.length > 0" class="mod-container">
    <ModComponent v-for="mod in mods" :key="mod.id" :file="mod.filepath" :data="mod.data" />
  </div>
</template>

<script>
import { MODSLOTS, MODSLOTS_LIST } from "@/services/modManager"
export { MODSLOTS, MODSLOTS_LIST }
</script>

<script setup>
import { computed, watch, onUnmounted } from "vue"
import { ModComponent } from "@/common/components/utility"
import { useModManager } from "@/services/modManager"
import { uniqueId } from "@/services/uniqueId"

const modManager = useModManager()

const props = defineProps({
  name: {
    type: String,
    required: true,
    validator: val => MODSLOTS_LIST.includes(val),
  },
  noContainer: Boolean,
})

const slotId = uniqueId("modUiSlot")
const mods = computed(() => props.name && props.name in modManager.uiSlots ? modManager.uiSlots[props.name].mods : [])

watch(() => props.name, (name, prev) => {
  prev && modManager.removeUiSlot(prev, slotId)
  name && modManager.addUiSlot(name, slotId)
}, { immediate: true })

onUnmounted(() => modManager.removeUiSlot(props.name, slotId))
</script>

<style lang="scss" scoped>
.mod-container {
  position: relative;
}
</style>
