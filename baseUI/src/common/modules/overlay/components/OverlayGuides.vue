<template>
  <svg
    v-if="frame.width > 0 && frame.height > 0"
    class="overlay-guides"
    :viewBox="`0 0 ${frame.width} ${frame.height}`"
    :width="frame.width"
    :height="frame.height"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g v-for="(g, i) in guides" :key="i" :class="['overlay-guides__group', `is-${g.kind || 'default'}`]">
      <line
        v-if="g.axis === 'x'"
        class="overlay-guides__line"
        :x1="g.at" :x2="g.at"
        :y1="g.from" :y2="g.to"
      />
      <line
        v-else
        class="overlay-guides__line"
        :x1="g.from" :x2="g.to"
        :y1="g.at"  :y2="g.at"
      />
      <text
        v-if="g.label"
        class="overlay-guides__label"
        :x="g.axis === 'x' ? g.at + 4 : (g.from + g.to) / 2"
        :y="g.axis === 'x' ? (g.from + g.to) / 2 : g.at - 4"
        dominant-baseline="middle"
      >{{ g.label }}</text>
    </g>
  </svg>
</template>

<script setup>
defineProps({
  guides: {
    type: Array,
    default: () => [],
  },
  frame: {
    type: Object,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
.overlay-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.overlay-guides__line {
  stroke: var(--bng-color-accent, #ffae00);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  vector-effect: non-scaling-stroke;
  opacity: 0.9;
}

.overlay-guides__label {
  fill: #fff;
  font-size: 10px;
  font-family: inherit;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.8);
  stroke-width: 2px;
  stroke-linejoin: round;
}

.overlay-guides__group {
  &.is-frame-edge .overlay-guides__line,
  &.is-frame-centre .overlay-guides__line {
    stroke: rgba(255, 255, 255, 0.85);
  }
  &.is-sibling-edge .overlay-guides__line {
    stroke: #5bd1ff;
  }
  &.is-sibling-centre .overlay-guides__line {
    stroke: #ff6fe0;
  }
  &.is-grid .overlay-guides__line {
    stroke: rgba(255, 255, 255, 0.4);
    stroke-dasharray: 2 4;
  }
}
</style>
