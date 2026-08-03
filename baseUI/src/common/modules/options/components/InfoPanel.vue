<template>
  <div class="info-panel">
    <slot name="top" />
    <div class="info-items">
      <div v-for="item in items" :key="item.id" class="info-item" v-html="item.text" />
    </div>
    <div class="info-spacer" />
    <slot />
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped lang="scss">
.info-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  color: var(--bng-off-white);
}

.info-items {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.5em;
  padding: 1em 0.5em 1.5em 0.5em;
  > .info-item {
    display: block;
    font-size: 1.0em;
    font-weight: 300;
    line-height: 1.35;
    &:not(:last-of-type) {
      padding-bottom: 0.25em;
      border-bottom: 1px solid var(--bng-off-white);
      opacity: 0.6;
    }
  }
}

.info-spacer {
  flex: 1 1 auto;
}

.info-panel.info-hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
