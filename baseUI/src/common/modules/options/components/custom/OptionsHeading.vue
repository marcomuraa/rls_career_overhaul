<template>
  <component :is="tag" v-bng-disabled="disabled">
    <BngIcon v-if="icon" :type="icon" class="heading-icon" />
    <slot></slot>
  </component>
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { vBngDisabled } from "@/common/directives"

const props = defineProps({
  variant: String,
  icon: String,
  disabled: Boolean,
})

const tag = computed(() => props.variant || "h4")
const icon = computed(() => props.icon ? icons[props.icon] : null)
</script>

<style lang="scss" scoped>
.heading-icon {
  margin-right: 0.3em;
}
</style>
