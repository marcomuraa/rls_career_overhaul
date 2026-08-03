<template>
  <div :class="['options-group', `options-group-${layout || 'column'}`, { 'options-group-use-title': firstAsTitle }]">
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  layout: {
    type: String, // "" (column), "column" or "row"
    default: "column",
  },
  firstAsTitle: Boolean,
})
</script>

<style lang="scss" scoped>
.options-group {
  display: flex;
  min-height: 2.5em;
  padding: 0.5em;
  // overflow: hidden;
}
.options-group-column {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: stretch;
  > * {
    flex: 1 1 100%;
    width: auto;
  }
}
.options-group-row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  > * {
    flex: 1 1 10%;
    width: 10%;
    min-width: 10%;
    max-width: 100%;
  }
}

.options-group-use-title {
  > *:first-child {
    flex: 1 0 100%;
    width: auto;
  }
}
.options-group-column.options-group-use-title {
  $pad: 0.75em;
  padding-left: $pad;
  margin-bottom: 0.5em;
  > *:first-child {
    margin-left: calc(#{$pad} / -2);
    width: auto;
  }
  &::before {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 0.0125em solid rgba(var(--bng-off-white-rgb), 0.15);
    border-radius: var(--bng-corners-1);
  }
}
</style>
