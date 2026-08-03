<template>
  <ul v-if="isList" v-bng-disabled="disabled" :class="classList">
    <li v-for="val in modelValue">{{ $tt(val.name || val.label || val) }}</li>
  </ul>
  <span v-else-if="modelValue" v-bng-disabled="disabled" :class="classList" v-html="modelValue"></span>
  <span v-else v-bng-disabled="disabled" :class="classList"><slot></slot></span>
</template>

<script setup>
import { computed } from "vue"
import { vBngDisabled } from "@/common/directives"

const props = defineProps({
  modelValue: Array,
  unit: String,
  disabled: Boolean,
  variant: String,
})

const isList = computed(() => props.modelValue && Array.isArray(props.modelValue))

const classList = computed(() => props.variant ? `options-text-${props.variant}` : "")
</script>

<style lang="scss" scoped>
span, ul {
  &[disabled] {
    opacity: 0.5;
  }
}
span:not(:first-of-type):last-of-type,
ul {
  flex: 0 0 50%;
}
ul {
  margin: 0;
  padding: 0;
  padding-left: 1.2em;
}

.options-text-mono {
  font-family: var(--fnt-mono);
}

.options-text-warning {
  color: var(--bng-ter-yellow-400);
}
.options-text-error {
  color: var(--bng-add-red-400);
}
.options-text-success {
  color: var(--bng-add-green-400);
}
.options-text-info {
  color: var(--bng-add-babyblue-400);
}
</style>
