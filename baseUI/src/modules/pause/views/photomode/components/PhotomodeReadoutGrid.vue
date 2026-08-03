<template>
  <div
    class="photomode-readout-grid"
    :style="gridStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from "vue"

defineOptions({ name: "PhotomodeReadoutGrid" })

const props = defineProps({
  columns: {
    type: [Number, String],
    default: 4,
  },
  mediumColumns: {
    type: [Number, String],
    default: 3,
  },
  compactColumns: {
    type: [Number, String],
    default: 2,
  },
  narrowColumns: {
    type: [Number, String],
    default: 1,
  },
})

const gridStyle = computed(() => ({
  "--photomode-readout-grid-columns": props.columns,
  "--photomode-readout-grid-medium-columns": props.mediumColumns,
  "--photomode-readout-grid-compact-columns": props.compactColumns,
  "--photomode-readout-grid-narrow-columns": props.narrowColumns,
}))
</script>

<style lang="scss" scoped>
.photomode-readout-grid {
  display: grid;
  grid-template-columns: repeat(var(--photomode-readout-grid-columns, 4), minmax(0, 1fr));
  gap: 0.5em;
  min-width: 0;
}

@media (max-width: 62em) {
  .photomode-readout-grid {
    grid-template-columns: repeat(var(--photomode-readout-grid-medium-columns, 3), minmax(0, 1fr));
  }
}

@media (max-width: 50em) {
  .photomode-readout-grid {
    grid-template-columns: repeat(var(--photomode-readout-grid-compact-columns, 2), minmax(0, 1fr));
  }
}

@media (max-width: 38em) {
  .photomode-readout-grid {
    grid-template-columns: repeat(var(--photomode-readout-grid-narrow-columns, 1), minmax(0, 1fr));
  }
}
</style>
