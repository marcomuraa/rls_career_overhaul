<template>
  <DisplayControls
    class="scrollable-content"
    :displayData="displayData"
    :detailsMode="detailsMode"
    @display-data-update="(key, value) => emit('display-data-update', key, value)"
    @display-data-reset="emit('display-data-reset')"
    @details-mode-change="emit('toggle-details-mode', $event)"
  />
</template>

<script setup>
import DisplayControls from "./DisplayControls.vue"

defineProps({
  displayData: {
    type: Array,
    default: () => [],
  },
  detailsMode: {
    type: String,
    required: true,
  },
})

const emit = defineEmits([
  "display-data-update",
  "display-data-reset",
  "toggle-details-mode",
])
</script>

<style scoped lang="scss">
.scrollable-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
