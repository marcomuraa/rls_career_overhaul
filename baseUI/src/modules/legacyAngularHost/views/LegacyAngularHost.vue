<template>
  <div ref="targetEl" class="legacy-angular-host"></div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, inject, nextTick } from "vue"

const targetEl = ref(null)
const targetRef = inject("angularHostTargetRef", null)

watch(
  [targetEl, targetRef],
  () => targetRef && (targetRef.value = targetEl.value),
  { immediate: true }
)

onBeforeUnmount(() => targetRef && targetRef.value === targetEl.value && (targetRef.value = null))
</script>

<style scoped lang="scss">
.legacy-angular-host {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}
</style>

