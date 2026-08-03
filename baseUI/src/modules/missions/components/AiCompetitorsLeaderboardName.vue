<template>
  <TextScroller ref="scrollerRef">{{ name }}</TextScroller>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue"
import { TextScroller } from "@/common/components/utility"

const props = defineProps({
  name: {
    type: String,
    default: "",
  },
})

const scrollerRef = ref(null)

function startScroller() {
  nextTick(() => {
    requestAnimationFrame(() => {
      scrollerRef.value?.start()
    })
  })
}

onMounted(startScroller)
watch(() => props.name, startScroller)
onUnmounted(() => scrollerRef.value?.stop())
</script>

<style scoped lang="scss">
:deep(.bng-text-scroller) {
  width: 100%;
}
</style>
