<template>
  <div
    class="bng-switch-toggle"
    :class="{ 'is-checked': checked }"
    v-bind="{ disabled: disabled ? 'disabled' : undefined }"
  ></div>
</template>

<script setup>
defineProps({
  checked: Boolean,
  disabled: Boolean,
})
</script>

<style lang="scss" scoped>
$track-background-color: var(--bng-cool-gray-600);
$track-on-background-color: var(--bng-off-white);
$knob-color: var(--bng-off-white);
$knob-on-color: var(--bng-orange-600);

.bng-switch-toggle {
  font-size: var(--bng-switch-toggle-size, 0.75em);
  position: relative;
  display: inline-flex;
  box-sizing: border-box;
  height: 1em;
  width: 1.65em;
  flex-shrink: 0;
  justify-content: flex-start;
  align-items: center;
  background-color: $track-background-color;
  border-radius: var(--bng-switch-toggle-radius, 2em);

  &::after {
    position: absolute;
    display: block;
    top: 0;
    left: 0;
    content: "";
    width: 1em;
    height: 1em;
    background-color: $knob-color;
    border-radius: var(--bng-switch-toggle-knob-radius, 50%);
    transform-origin: center center;
    transform: translateX(0) scale(0.8);
    transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out;
  }

  &.is-checked {
    background-color: $track-on-background-color;

    &::after {
      transform: translateX(65%) scale(0.8);
      background-color: $knob-on-color;
    }
  }

  &[disabled] {
    pointer-events: none;
  }
}
</style>
