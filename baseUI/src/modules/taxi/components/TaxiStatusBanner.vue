<template>
  <div v-if="message" class="taxi-status-banner">
    <span class="taxi-status-message">{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: "",
  },
})
</script>

<style lang="scss" scoped>
.taxi-status-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;

  .taxi-status-message {
    color: var(--bng-off-white);
    font-family: var(--fnt-defs);
    font-size: 1.4rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 1);
    padding: 0.5rem 1.5rem;
    border-radius: var(--bng-corners-2);
  }
}
</style>
