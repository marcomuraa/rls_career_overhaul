<template>
  <BngCard class="device-info-card">
    <div class="device-info-content">
      <div class="icon-container">
        <BngIcon v-if="icon" :type="icon" class="device-icon" />
      </div>
      <div class="content-container">
        <span>{{ name }}</span>
        <span class="device-info"> {{ info }} </span>
      </div>
    </div>
  </BngCard>
</template>

<script setup>
import { BngIcon, BngCard } from "@/common/components/base"

defineProps({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: [String, Object],
  },
  info: {
    type: String,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.device-info-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1em;
  min-height: 5em;
  min-width: 5em;
}

.icon-container > .device-icon {
  font-size: 3em;
}

.content-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex-grow: 1;
}

.device-info {
  font-size: calc-ui-rem(0.875);
  color: var(--bng-cool-gray-200);
}

</style>