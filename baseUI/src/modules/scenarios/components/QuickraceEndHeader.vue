<template>
  <div v-if="data" class="quickrace-end-header" :class="{ fail: failed, success: !failed }">
    <span v-if="data.campaigntitle" class="quick-name">{{ $tt(data.campaigntitle) }}:</span>
    <span class="quick-name">{{ $tt(data.title) }}</span>

    <div v-if="isNewLocalBest" class="quick-best">New local best time!</div>
    <div v-else-if="hasPlace" class="quick-place">Place {{ place }}</div>

    <div v-if="data.time" class="quick-time">{{ data.time }}</div>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, required: true },
  failed: { type: Boolean, default: false },
  isNewLocalBest: { type: Boolean, default: false },
  hasPlace: { type: Boolean, default: false },
  place: { type: Number, default: -1 },
})
</script>

<style lang="scss" scoped>
.quickrace-end-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-transform: uppercase;
  font-family: "Overpass", var(--fnt-defs);

  .quick-name {
    font-size: 2em;
    line-height: 1.1;
  }

  .quick-best,
  .quick-place {
    font-size: 1.4em;
    margin-top: 0.25rem;
  }

  .quick-time {
    font-size: 1.4em;
    margin-top: 0.25rem;
    color: white;
  }
}

.quickrace-end-header.success {
  color: rgb(0, 200, 0);
}

.quickrace-end-header.fail {
  color: rgb(200, 0, 0);
}
</style>
