<template>
  <button
    ref="elButton"
    class="bng-button"
    :tabindex="tabIndex"
    v-bind="navItem ? { 'bng-nav-item': '' } : {}"
    :disabled="disabled"
    v-bng-sound-class="!disabled && !noSound && (soundClass || 'bng_click_hover_generic')"
  >
    <slot name="prebackground"></slot>
    <slot name="background"><Background /></slot>
    <slot name="prefix"></slot>
    <span v-if="label" class="label">{{ label }}</span>
    <slot v-else></slot>
    <slot name="suffix"></slot>
  </button>
</template>

<script setup>
import { ref } from "vue"
import { Background } from "@/common/components/utility"
import { vBngSoundClass } from "@/common/directives"

const elButton = ref()

defineProps({
  label: String, // when defined, will override the slot content
  disabled: Boolean,
  noSound: Boolean,
  soundClass: String,
  tabIndex: {
    type: Number,
    default: 0,
  },
  navItem: {
    type: Boolean,
    default: true,
  },
})

defineExpose({
  getElement() {
    return elButton.value
  },
})
</script>

<style lang="scss" scoped>
@use "sass:math";
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

// focus frame
$f-offset: 5px;
$rad: $border-rad-1;

// text color variables
$base-text-enabled-color: var(--bng-button-text-enabled-color, var(--bng-off-white));
$base-text-hover-color: var(--bng-button-text-hover-color, var(--bng-off-white));
$base-text-active-color: var(--bng-button-text-active-color, var(--bng-off-white));
$base-text-disabled-color: var(--bng-button-text-disabled-color, var(--bng-off-white));
$base-text-focus-color: var(--bng-button-text-focus-color, var(--bng-off-white));

// button min and max width
$base-min-width: var(--bng-button-min-width, 6em);
$base-max-width: var(--bng-button-max-width, 20em);

// button margin
$base-margin: var(--bng-button-margin, 0.25rem);

// button padding
$base-padding: var(--bng-button-padding, 0.5em);
$base-padding-top: var(--bng-button-padding-top, 0.3em);
$base-padding-bottom: var(--bng-button-padding-bottom, 0.325em); // move the text up a little to compensate for lowercase alignment

// button content flow
$base-content-flow: var(--bng-content-flow, row);
$base-content-align: var(--bng-content-align, baseline);
$base-content-justify: var(--bng-content-justify, center);

// button UI event padding override
$base-ui-event-padding-override: var(--bng-ui-event-padding-override, 0.25em);

// button border radius (note: focus frame must be set manually)
$base-border-radius: var(--bng-bg-border-radius, $rad); // yes we use bg for that to be in-sync visually

.bng-button {
  color: $base-text-enabled-color;
  box-sizing: border-box;
  font-family: var(--fnt-defs);
  font-size: 1rem; // default value to be overriden with the parent component's styles
  line-height: 1.5rem; // default value to be overriden with the parent component's styles
  // min-height: 2em; Button size should be driven by the line-height. If you need it to be taller - override the line-height
  margin: $base-margin;
  padding: $base-padding;
  padding-top: $base-padding-top;
  padding-bottom: $base-padding-bottom;
  border: 0;
  border-radius: $base-border-radius; // Focus frame radius uses this variable to adjust, keep it
  overflow: visible;
  display: inline-flex;
  flex-direction: $base-content-flow;
  flex-wrap: nowrap;
  align-items: $base-content-align;
  justify-content: $base-content-justify;
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  isolation: isolate;

  @include modify-focus($rad, $f-offset);

  > * {
    flex: 0 0 auto;
  }

  :not(.bng-background) {
    z-index: 1;
  }

  &:active,
  &.hold-active {
    color: $base-text-active-color;
  }

  &:disabled {
    color: $base-text-disabled-color;
    opacity: 0.5;
    // opacity: var(--bng-bg-disabled-opacity, 1); // maybe?
    pointer-events: none;
  }

  &.no-hover:hover {
    cursor: default !important;
    opacity: inherit;
  }

  &:not(.no-hover):hover {
    color: $base-text-hover-color;
  }

  &:focus,
  &.focus-visible {
    color: $base-text-focus-color;
  }

  &.allcaps {
    text-transform: uppercase;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    & > .label {
      padding-left: 0.125rem;
      padding-right: 0.125rem;
    }
    .icon {
      transform: none;
    }
  }
  &.large {
    font-family: "Overpass", var(--fnt-defs);
    font-size: 1.5em;
    line-height: 1.25em;
    font-weight: 700;
    font-style: italic;
    padding-top: 0.35em;
    padding-bottom: 0.4em;
    &.straight {
      font-style: normal;
    }
  }
  &.small {
    font-size: 0.875em;
    line-height: 1.15em;
    font-weight: 500;
    padding: 0.125em;
    padding-top: 0.125em;
    padding-bottom: 0.13em;
  }
  > .label {
    display: inline-block;
    flex: 0.15 1 auto;
    word-wrap: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 1;
  }

  &:not(.empty) {
    min-width: $base-min-width;
    max-width: $base-max-width;
  }
}

:deep(span[ui-event]) {
  padding-right: $base-ui-event-padding-override;
}
</style>
