<template>
  <div class="popup-notification">
    <span class="popup-text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true
  }
})
</script>

<style scoped lang="scss">
.popup-notification {
  position: absolute;
  top: 50%;
  right: 100%;
  transform: translateY(-50%);
  margin-right: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--bng-cool-gray-800-rgb), 0.95);
  border: 1px solid var(--bng-orange-500);
  border-radius: var(--bng-corners-2);
  border-left: 3px solid var(--bng-orange-500);
  white-space: nowrap;
}

.popup-text {
  color: var(--bng-off-white);
  font-size: 0.9rem;
}
</style>
