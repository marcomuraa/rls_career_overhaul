<template>
  <div class="scenario-end-points">
    <span v-if="points === undefined && maxPoints === undefined">-</span>

    <span v-else-if="typeof points === 'number' && points < 0">
      {{ points.toFixed(0) }}
    </span>

    <span v-else-if="points !== undefined || maxPoints !== undefined">
      <span v-if="points !== undefined">{{ points.toFixed(0) }}</span>
      <span v-else class="na">NA</span>
      &nbsp;/&nbsp;
      <span v-if="maxPoints !== undefined">{{ maxPoints.toFixed(0) }}</span>
      <span v-else class="na">NA</span>
    </span>
  </div>
</template>

<script setup>
defineProps({
  points: { type: Number, default: undefined },
  maxPoints: { type: Number, default: undefined },
})
</script>

<style lang="scss" scoped>
.scenario-end-points {
  display: flex;
  align-items: center;
  justify-content: center;
}

.na {
  color: rgb(200, 200, 200);
}
</style>
