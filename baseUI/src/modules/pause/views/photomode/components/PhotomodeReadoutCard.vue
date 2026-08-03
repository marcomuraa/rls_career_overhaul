<template>
  <div
    class="photomode-readout-card"
    :class="cardClass"
  >
    <Background class="photomode-readout-card__background" />
    <p class="photomode-readout-card__label" :class="labelClass">{{ label }}</p>
    <p class="photomode-readout-card__value" :class="valueClass">{{ value }}</p>
    <p
      v-if="secondary"
      class="photomode-readout-card__secondary"
      :class="secondaryClass"
    >
      {{ secondary }}
    </p>
  </div>
</template>

<script setup>
import { Background } from "@/common/components/utility"

defineOptions({ name: "PhotomodeReadoutCard" })

defineProps({
  cardClass: {
    type: [String, Array, Object],
    default: "",
  },
  labelClass: {
    type: [String, Array, Object],
    default: "",
  },
  valueClass: {
    type: [String, Array, Object],
    default: "",
  },
  secondaryClass: {
    type: [String, Array, Object],
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  value: {
    type: [String, Number],
    default: "",
  },
  secondary: {
    type: String,
    default: "",
  },
})
</script>

<style lang="scss" scoped>
.photomode-readout-card {
  --bng-bg-enabled: var(--bng-off-black);
  --bng-bg-enabled-opacity: 0.5;
  --bng-bg-border-enabled: var(--bng-cool-gray-700);
  --bng-bg-border-width: 0.0625em;
  --bng-bg-border-radius: var(--bng-corners-1);

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 0.12em;
  min-width: 0;
  padding: 0.52em 0.62em;
  border-radius: var(--bng-corners-1);
  overflow: hidden;
}

.photomode-readout-card__label,
.photomode-readout-card__value,
.photomode-readout-card__secondary {
  position: relative;
  z-index: 1;
  margin: 0;
  line-height: 1.2;
}

.photomode-readout-card__label {
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
  color: rgba(var(--bng-off-white-rgb), 0.58);
}

.photomode-readout-card__value {
  font-family: var(--fnt-mono);
  font-size: 1em;
  font-weight: 600;
  color: rgba(var(--bng-off-white-rgb), 0.94);
  white-space: nowrap;
}

.photomode-readout-card__secondary {
  font-size: 0.72em;
  color: rgba(var(--bng-off-white-rgb), 0.56);
}
</style>
