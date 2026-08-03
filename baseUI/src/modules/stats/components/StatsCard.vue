<template>
  <BngCard class="stats-card">
    <BngCardHeading type="ribbon outline" class="stats-card-title">{{ title }}</BngCardHeading>
    <div class="stats-card-body">
      <div v-for="section in sections" :key="section.key" class="stats-section">
        <div v-if="section.showHeader" class="section-header">
          <span>{{ section.title }}</span>
        </div>
        <div class="stat-blocks-container">
          <div v-for="stat in section.stats" :key="stat.key" class="stat-block" :class="stat.cssClasses">
            <div class="stat-key">{{ stat.label }}</div>
            <div class="stat-value">{{ stat.valueText }}</div>
          </div>
        </div>
      </div>
    </div>
  </BngCard>
</template>

<script setup>
import { BngCard, BngCardHeading } from "@/common/components/base"

defineOptions({ name: "StatsCard" })

defineProps({
  title: {
    type: String,
    required: true,
  },
  sections: {
    type: Array,
    required: true,
  },
})
</script>

<style scoped lang="scss">
.stats-card {
  min-width: 10em;
  --bng-card-content-padding: 0;
  --bng-card-content-gap: 0;
  --bng-card-height: 100%;
  color: var(--bng-off-white);
  height: 100%;

  .stats-card-title {
    text-transform: capitalize;
    :deep(.card-heading) {
      padding-left: 1.2em !important;
    }
  }

  .stats-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .stats-section {
    padding: 0.0em 0.5em 0.5em 0.5em;
  }

  .section-header {
    border-bottom: solid 0.125em var(--bng-cool-gray-800);
    text-transform: capitalize;

    > span {
      padding: 0.25em 0.5em;
      display: inline-flex;
      background: var(--bng-cool-gray-900);
      border: solid 0.125em var(--bng-cool-gray-800);
      border-bottom: 0;
      border-radius: 0.25em 0.25em 0 0;
    }
  }

  .stat-blocks-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0;
    gap: 0.25em 0.25em;
  }

  .stat-block {
    flex: 1 0 19%;
    box-sizing: border-box;
    padding: 0 0.5em 0 0;
    min-width: 8em;
  }

  .stat-key {
    padding: 0.25em 0;
    line-height: 1.25em;
    padding-right: 2em;
    text-transform: capitalize;
  }

  .stat-value {
    font-size: 1.25em;
    line-height: 1.2em;
    font-weight: 200;
  }
}
</style>

