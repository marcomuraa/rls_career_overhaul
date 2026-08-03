<template>
  <div v-if="data" class="scenario-end-header" :class="{ fail: failed, success: !failed }">
    <span v-if="data.campaigntitle" class="scen-name">{{ $tt(data.campaigntitle) }}:</span>
    <span class="scen-name">{{ $tt(data.title) }}</span>

    <div class="scen-result">
      {{ $tt(failed ? (data.customFail || "ui.scenarios.end.result.fail") : (data.customSuccess || "ui.scenarios.end.result.success")) }}
    </div>

    <div v-if="data.time" class="scen-time">{{ data.time }}</div>
  </div>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  data: { type: Object, required: true },
})

const failed = computed(() => !!props.data?.overall?.failed)
</script>

<style lang="scss" scoped>
.scenario-end-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  margin-top: 20px;
  font-size: 3vmin;
  font-family: "Overpass", var(--fnt-defs);
  font-weight: bold;

  .scen-name {
    font-size: 2em;
    line-height: 1.1;
  }

  .scen-result {
    font-size: 1.6em;
    margin-top: 0.25rem;
  }

  .scen-time {
    font-size: 1.4em;
    margin-top: 0.25rem;
    color: white;
  }
}

.scenario-end-header.success :is(.scen-result, .scen-time) {
  color: rgb(0, 200, 0);
}

.scenario-end-header.fail :is(.scen-result, .scen-time) {
  color: rgb(200, 0, 0);
}
</style>
