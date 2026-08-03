<template>
  <div class="photomode-toggle-control">
    <SwitchToggle
      :checked="checked"
      :disabled="disabled"
    />
  </div>
</template>

<script setup>
import { SwitchToggle } from "@/common/components/utility"

defineOptions({ name: "PhotomodeToggleControl" })

defineProps({
  checked: Boolean,
  disabled: Boolean,
})
</script>

<style lang="scss" scoped>
.photomode-toggle-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3em 0.5em;
  --bng-switch-toggle-size: 1.1em;
}
</style>
