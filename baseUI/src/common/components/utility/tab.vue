<!-- Tab [DEPRECATED] -->
<template>
  <slot v-bind="$attrs" :tab-heading="heading" :tab-selected="selected"></slot>
</template>

<script setup>
defineProps({
  heading: String,
  selected: Boolean,
})
</script>
