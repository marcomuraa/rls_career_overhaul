<template>
  <div class="pause-panel-simple-text">
    <div v-if="title" class="pause-panel-simple-text-title">{{ $tt(title) }}</div>
    <div v-if="bodyText" class="pause-panel-simple-text-body">{{ $tt(bodyText) }}</div>
  </div>
</template>

<script setup>
import { computed } from "vue"

defineOptions({ name: "PausePanelSimpleText" })

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  text: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
})

const bodyText = computed(() => props.text || props.description || "")
</script>

<style scoped lang="scss">
.pause-panel-simple-text {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  font-size: 1rem;
  line-height: 1.25;
}

.pause-panel-simple-text-title {
  color: var(--bng-off-white);
  font-size: 1.15rem;
  font-weight: 600;
}

.pause-panel-simple-text-body {
  white-space: pre-line;
}
</style>
