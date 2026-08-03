<template>
  <div class="bng-background"></div>
</template>

<style lang="scss">
@use "@/styles/modules/density" as *;

// background image variables
$base-bg-image: var(--bng-bg-image, none);
$base-bg-size: var(--bng-bg-size, auto);
$base-bg-position: var(--bng-bg-position, center);

// background color variables
$base-enabled: var(--bng-bg-enabled, transparent);
$base-hover: var(--bng-bg-hover, #{$base-enabled});
$base-active: var(--bng-bg-active, #{$base-hover});
$base-disabled: var(--bng-bg-disabled, #{$base-enabled});
$base-focus: var(--bng-bg-focus, #{$base-enabled});

// opacity variables
$base-enabled-opacity: var(--bng-bg-enabled-opacity, 1);
$base-hover-opacity: var(--bng-bg-hover-opacity, #{$base-enabled-opacity});
$base-active-opacity: var(--bng-bg-active-opacity, #{$base-hover-opacity});
$base-disabled-opacity: var(--bng-bg-disabled-opacity, #{$base-enabled-opacity});

// border color variables
$base-border-enabled: var(--bng-bg-border-enabled, transparent);
$base-border-hover: var(--bng-bg-border-hover, #{$base-border-enabled});
$base-border-active: var(--bng-bg-border-active, #{$base-border-hover});
$base-border-disabled: var(--bng-bg-border-disabled, #{$base-border-enabled});

$base-border-focus: var(--bng-bg-border-focus, transparent);
$base-focus-opacity: var(--bng-bg-focus-opacity, #{$base-enabled-opacity});

// accent border width
$base-border-width: var(--bng-bg-border-width, 0.125rem);

// accent border radius
$rad: $border-rad-1;
$base-border-radius: var(--bng-bg-border-radius, #{$rad} #{$rad} #{$rad} #{$rad});

.bng-background {
  position: absolute !important;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: $base-enabled;
  background-image: $base-bg-image;
  background-size: $base-bg-size;
  background-position: $base-bg-position;
  border-radius: $base-border-radius;
  border-style: solid;
  border-width: $base-border-width;
  border-color: $base-border-enabled;
  opacity: $base-enabled-opacity;
  pointer-events: none;
  z-index: -1;
}

*:not(.no-hover):hover {
  > .bng-background {
    background-color: $base-hover;
    opacity: $base-hover-opacity;
    border-width: $base-border-width;
    border-color: $base-border-hover;
  }
}

*:active,
*.hold-active {
  > .bng-background {
    background-color: $base-active !important;
    opacity: $base-active-opacity !important;
    border-width: $base-border-width !important;
    border-color: $base-border-active !important;
  }
}

.focus-visible:not(.no-focus-frame) {
  > .bng-background {
    background-color: $base-focus;
    border-width: $base-border-width;
    border-color: $base-border-focus;
    opacity: $base-focus-opacity;
  }
}

*:disabled,
*[disabled] {
  > .bng-background {
    background-color: $base-disabled;
    opacity: $base-disabled-opacity;
    border-width: $base-border-width;
    border-color: $base-border-disabled;
  }
}
</style>