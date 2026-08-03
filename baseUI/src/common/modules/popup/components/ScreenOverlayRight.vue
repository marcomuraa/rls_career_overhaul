<template>
  <component :is="view" @close="$emit('return', true)" />
</template>

<script>
import { popupPosition } from "../options.js"

export default {
  position: popupPosition.right,
}
</script>

<script setup>
defineProps({
  view: Object
})

defineEmits(["return"])
</script>

<style scoped lang="scss"></style>
