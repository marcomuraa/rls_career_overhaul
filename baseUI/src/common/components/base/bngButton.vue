<template>
  <Button
    ref="elButton"
    v-bind="rowAwareAttrs"
    class="bng-button"
    :class="{
      'empty': !hasSomething,
      'l-icon': iconLeft || icon,
      'r-icon': iconRight,
      'external-icon': externalIcon,
      'show-hold': showHold,
      'hold-vertical': holdVertical,
      'fallback-hold-offset': isBase && needsFallbackHoldOffset,
      'no-focus-frame': inRow,
    }"
    :accent="accent"
    :label="labelContent"
    :disabled="effectiveDisabled"
    :no-sound="noSound"
    :sound-class="soundClass"
  >
    <template v-if="isBase && slots.prebackground" #prebackground><slot name="prebackground"></slot></template>
    <template v-if="isBase && slots.background" #background><slot name="background"></slot></template>

    <template #prefix>
      <svg v-if="showHold" class="hold-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 12" preserveAspectRatio="xMidYMid">
        <path d="M1,1 L8,2 L16,1 L8,11 z" />
      </svg>
      <BngIcon class="icon" v-if="iconLeft || icon || externalIcon" :type="iconLeft || icon" :external-image="externalIcon" />
    </template>

    <slot v-if="!labelContent"></slot>

    <template #suffix>
      <BngIcon class="icon" v-if="iconRight" :type="iconRight" />
    </template>

  </Button>
</template>

<script>
export const ACCENTS = {
  base: "base", // just a base Button, but with BngButton goodies
  main: "main",
  secondary: "secondary",
  outlined: "outlined",
  text: "text",
  attention: "attention",
  attentionghost: "attentionghost",
  attentionoutlined: "attentionoutlined",
  destructive: "destructive",
  ghost: "ghost",
  menu: "menu",
  custom_old: "custom_old",
}
</script>

<script setup>
import { ref, computed, useSlots, inject, onMounted, onBeforeUnmount } from "vue"
import { BngIcon } from "@/common/components/base"
import { Button } from "@/common/components/utility"

const elButton = ref()

const slots = useSlots()

const props = defineProps({
  accent: {
    type: String,
    default: "main",
    validator: v => Object.values(ACCENTS).includes(v) || v === "",
  },

  iconLeft: [Object, String],
  iconRight: [Object, String],
  icon: [Object, String],
  externalIcon: String,

  showHold: Boolean,
  holdVertical: Boolean,

  label: String,
  disabled: Boolean,
  noSound: Boolean,
  soundClass: String,
})

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))
const rowAwareAttrs = computed(() => inRow ? { "bng-no-nav": "true", tabindex: -1 } : {})

defineExpose({
  getElement() {
    return elButton.value?.getElement?.()
  },
})

const isBase = computed(() => props.accent === ACCENTS.base || props.accent === ACCENTS.custom_old)

const slotContent = computed(() => slots.default?.() ?? [])

// if slot has a single text node
const isPlainTextSlot = computed(() =>
  slotContent.value.length === 1 &&
  typeof slotContent.value[0].type === "symbol" &&
  String(slotContent.value[0].type).indexOf("v-txt") > -1
)

const slotTextContent = computed(() => isPlainTextSlot.value && slotContent.value[0].children.trim())
const hasTextContent = computed(() => slotTextContent.value?.length > 0)
const hasSomething = computed(() => hasTextContent.value || props.label || slotContent.value.length > 1)
const labelContent = computed(() => hasTextContent.value ? slotTextContent.value : props.label)

const needsFallbackHoldOffset = computed(() => {
  if (props.showHold && isBase.value && elButton.value?.getElement) {
    return !!window.getComputedStyle(elButton.value.getElement())
      .getPropertyValue("--bng-button-custom-hold-offset").trim()
  }
  return true
})

const rowControlApi = inRow
  ? {
      activate: () => {
        if (effectiveDisabled.value) return
        elButton.value?.getElement?.()?.click?.()
      },
      isEventInside: event => {
        const element = elButton.value?.getElement?.()
        return !!(element && event?.target instanceof Node && element.contains(event.target))
      },
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}
</script>

<style lang="scss" scoped>
@use "sass:math";
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

$main-enabled: var(--bng-orange-500);
$main-hold-fill: var(--bng-orange-300);
$main-active: var(--bng-orange-600);
$main-hover: var(--bng-orange-b400);
$main-disabled: var(--bng-cool-gray-400);

$secondary-enabled: var(--bng-ter-blue-gray-700);
$secondary-active: var(--bng-ter-blue-gray-800);
$secondary-hover: var(--bng-ter-blue-gray-600);
$secondary-disabled: var(--bng-cool-gray-800);

$attention-enabled: var(--bng-add-red-600);
$attention-active: var(--bng-add-red-700);
$attention-hover: var(--bng-add-red-500);
$attention-disabled: var(--bng-add-red-700);

$attention-ghost-fg: var(--bng-add-red-500);
$attention-ghost-enabled: var(--bng-off-black);
$attention-ghost-active: var(--bng-off-black);
$attention-ghost-hover: var(--bng-add-red-700);
$attention-ghost-disabled: var(--bng-off-black);

$destructive-enabled: var(--bng-cool-gray-900);
$destructive-hover: var(--bng-add-red-600);
$destructive-active: var(--bng-add-red-900);
$destructive-disabled: var(--bng-cool-gray-900);
$destructive-focus: var(--bng-add-red-700);
$destructive-enabled-opacity: 1;
$destructive-hover-opacity: 1;
$destructive-active-opacity: 1;
$destructive-focus-opacity: 1;
$destructive-border: var(--bng-add-red-600);
$destructive-border-hover: $destructive-border;
$destructive-border-active: $destructive-border;
$destructive-border-disabled: $destructive-border;
$destructive-border-focus: $destructive-border;
$destructive-text: var(--bng-add-red-400);
$destructive-text-hover: var(--bng-off-white);
$destructive-text-focus: var(--bng-off-white);

$ghost-enabled: transparent;
$ghost-active: transparent;
$ghost-hover: var(--bng-orange-700);
$ghost-disabled: transparent;

$outlined-enabled: var(--bng-black-o4);
$outlined-active: var(--bng-orange-800);
$outlined-hover: var(--bng-orange-600);
$outlined-disabled: var(--bng-black-o6);
$outlined-border-enabled: var(--bng-cool-gray-600);
$outlined-border-active: var(--bng-orange-700);
$outlined-border-hover: var(--bng-orange-b400);
$outlined-border-disabled: rgba(var(--bng-cool-gray-800-rgb), 0.8);

$text-enabled: var(--bng-off-black);
$text-active: var(--bng-off-black);
$text-hover: var(--bng-orange-600);
$text-disabled: var(--bng-off-black);

$menu-enabled: transparent;
$menu-active: var(--bng-ter-blue-gray-500);
$menu-hover: var(--bng-ter-blue-gray-500);
$menu-disabled: transparent;

// icon
$base-icon-align: var(--bng-icon-align, baseline);
$base-icon-size: var(--bng-icon-size, 1.5em);
$base-icon-line-height: var(--bng-icon-line-height, 1em);

// hold
$f-offset: 5px;
// focus frame when holding
// $hold-rad: calc($rad * 1.1);
// $hold-f-offset: calc($f-offset * 1.4);
$hold-rad: 4px;
$hold-f-offset: $f-offset;
$base-hold-offset: var(--bng-button-hold-offset, $hold-f-offset);


// important: "base" accent must have no overrides


[accent="main"] {
  --bng-bg-enabled: #{$main-enabled};
  --bng-bg-hover: #{$main-hover};
  --bng-bg-active: #{$main-active};
  --btn-hold-fill: #{$main-enabled} 40%, #{$main-hold-fill} 50%, transparent 50%;
}

[accent="secondary"] {
  font-weight: 900 !important;
  --bng-bg-enabled: #{$secondary-enabled};
  --bng-bg-hover: #{$secondary-hover};
  --bng-bg-active: #{$secondary-active};
  --bng-bg-disabled-opacity: 0.5;
  --btn-hold-fill: #{$secondary-enabled} 40%, var(--bng-ter-blue-gray-500) 47%, var(--bng-ter-blue-gray-400) 50%, transparent 50%;
}

[accent="attention"] {
  --bng-bg-enabled: #{$attention-enabled};
  --bng-bg-hover: #{$attention-hover};
  --bng-bg-active: #{$attention-active};
  --bng-bg-disabled: #{$attention-disabled};
  --bng-bg-disabled-opacity: 0.5;
  --btn-hold-fill: #{$attention-enabled} 40%, var(--bng-add-red-500) 47%, var(--bng-add-red-400) 50%, transparent 50%;
}

[accent="attentionghost"] {
  --bng-bg-enabled: #{$attention-ghost-enabled};
  --bng-bg-hover: #{$attention-ghost-hover};
  --bng-bg-active: #{$attention-ghost-active};
  --bng-bg-active-opacity: 1;
  --bng-bg-disabled: #{$attention-ghost-disabled};
  --bng-bg-disabled-opacity: 0.4;
  --bng-button-text-color: #{$attention-ghost-fg};
  --bng-icon-color: #{$attention-ghost-fg};
  --btn-hold-fill: #{$attention-ghost-enabled} 40%, var(--bng-add-red-700) 47%, var(--bng-add-red-500) 50%, transparent 50%;
}

[accent="ghost"] {
  --bng-bg-enabled: #{$ghost-enabled};
  --bng-bg-hover: #{$ghost-hover};
  --bng-bg-hover-opacity: 0.4;
  --bng-bg-active: #{$ghost-active};
  --bng-bg-active-opacity: 0.6;
  --bng-bg-disabled: #{$ghost-disabled};
  --bng-bg-disabled-opacity: 0.4;
  --btn-hold-fill: #{$ghost-enabled} 40%, var(--bng-orange-700) 47%, var(--bng-orange-500) 50%, transparent 50%;
}

[accent="outlined"] {
  --bng-bg-enabled: #{$outlined-enabled};
  --bng-bg-hover: #{$outlined-hover};
  --bng-bg-active: #{$outlined-active};
  --bng-bg-disabled: #{$outlined-disabled};
  --bng-bg-disabled-opacity: 0.5;
  --bng-bg-border-enabled: #{$outlined-border-enabled};
  --bng-bg-border-hover: #{$outlined-border-hover};
  --bng-bg-border-active: #{$outlined-border-active};
  --bng-bg-border-disabled: #{$outlined-border-disabled};
  --btn-hold-fill: #7D9FB588 40%, #7D9FB5 50%, transparent 50%;
}

[accent="attentionoutlined"] {
  --bng-bg-enabled: #{$attention-enabled};
  --bng-bg-hover: #{$ghost-hover};
  --bng-bg-hover-opacity: 0.5;
  --bng-bg-active: #{$outlined-active};
  --bng-bg-active-opacity: 0.6;
  --bng-bg-disabled: #{$outlined-disabled};
  --bng-bg-disabled-opacity: 0.5;
  --bng-bg-border-enabled: #{$attention-enabled};
  --bng-bg-border-hover: #{$attention-hover};
  --bng-bg-border-active: #{$attention-active};
  --bng-bg-border-disabled: #{$attention-disabled};
  --bng-button-text-hover-color: var(--bng-off-white);
  --bng-button-text-active-color: var(--bng-off-white);
  --btn-hold-fill: #7D9FB588 40%, #7D9FB5 50%, transparent 50%;
}

[accent="destructive"] {
  --bng-bg-enabled: #{$destructive-enabled};
  --bng-bg-enabled-opacity: #{$destructive-enabled-opacity};
  --bng-bg-hover: #{$destructive-hover};
  --bng-bg-hover-opacity: #{$destructive-hover-opacity};
  --bng-bg-active: #{$destructive-active};
  --bng-bg-active-opacity: #{$destructive-active-opacity};
  --bng-bg-disabled: #{$destructive-disabled};
  --bng-bg-disabled-opacity: 0.5;
  --bng-bg-focus-opacity: #{$destructive-focus-opacity};
  --bng-bg-border-enabled: #{$destructive-border};
  --bng-bg-border-hover: #{$destructive-border-hover};
  --bng-bg-border-active: #{$destructive-border-active};
  --bng-bg-border-disabled: #{$destructive-border-disabled};
  --bng-bg-border-focus: #{$destructive-border-focus};
  --bng-bg-focus: #{$destructive-focus};
  --bng-button-text-enabled-color: #{$destructive-text};
  --bng-button-text-hover-color: #{$destructive-text-hover};
  --bng-button-text-active-color: #{$destructive-text};
  --bng-button-text-disabled-color: #{$destructive-text};
  --bng-button-text-focus-color: #{$destructive-text-focus};
  --btn-hold-fill: #{$destructive-enabled} 40%, #{$destructive-border} 47%, #{$destructive-text} 50%, transparent 50%;
}

[accent="text"] {
  --bng-bg-enabled: #{$text-enabled};
  --bng-bg-enabled-opacity: 0.4;
  --bng-bg-hover: #{$text-hover};
  --bng-bg-hover-opacity: 0.6;
  --bng-bg-active: #{$text-active};
  --bng-bg-active-opacity: 1;
  --bng-bg-disabled: #{$text-disabled};
  --bng-bg-disabled-opacity: 0.4;
  --btn-hold-fill: #7D9FB544 40%, #7D9FB588 50%, transparent 50%;
}

[accent="menu"] {
  --bng-bg-enabled: #{$menu-enabled};
  --bng-bg-enabled-opacity: 0.4;
  --bng-bg-hover: #{$menu-hover};
  --bng-bg-hover-opacity: 0.4;
  --bng-bg-active: #{$menu-active};
  --bng-bg-active-opacity: 1;
  --bng-bg-disabled: #{$menu-disabled};
  --bng-bg-disabled-opacity: 0.4;

  display: flex;
  justify-content: stretch;
  // width: 100%;
  margin: 0.125rem;
  text-align: left;
  // @include modify-focus($rad, 0.0rem);

  &.selected {
    --bng-button-text-enabled-color: #f60;
    --bng-button-text-hover-color: #f60;
    --bng-button-text-active-color: #f60;
    --bng-button-text-disabled-color: #f60;
  }
}

// fallback accent with older var names
[accent="custom_old"] {
  --bng-bg-enabled: var(--bng-button-custom-enabled);
  --bng-bg-hover: var(--bng-button-custom-hover);
  --bng-bg-active: var(--bng-button-custom-active);
  --bng-bg-disabled: var(--bng-button-custom-disabled);
  --bng-bg-enabled-opacity: var(--bng-button-custom-enabled-opacity);
  --bng-bg-hover-opacity: var(--bng-button-custom-hover-opacity);
  --bng-bg-active-opacity: var(--bng-button-custom-active-opacity);
  --bng-bg-disabled-opacity: var(--bng-button-custom-disabled-opacity);
  --bng-bg-border-enabled: var(--bng-button-custom-border-enabled);
  --bng-bg-border-hover: var(--bng-button-custom-border-hover);
  --bng-bg-border-active: var(--bng-button-custom-border-active);
  --bng-bg-border-disabled: var(--bng-button-custom-border-disabled);
  --bng-bg-image: var(--bng-button-bg-image, none);
  --bng-bg-size: var(--bng-button-bg-size, auto);
  --bng-bg-position: var(--bng-button-bg-position, center);
  --bng-button-text-enabled-color: var(--bng-button-custom-text-enabled-color);
  --bng-button-text-hover-color: var(--bng-button-custom-text-hover-color);
  --bng-button-text-active-color: var(--bng-button-custom-text-active-color);
  --bng-button-text-disabled-color: var(--bng-button-custom-text-disabled-color);
}


.bng-button {
  .icon {
    align-self: $base-icon-align;
    font-size: $base-icon-size;
    line-height: $base-icon-line-height;
    transform: translateY(0.025em);
    font-style: normal;
    font-weight: 500 !important;
    z-index: 1;
  }

  .bngicon {
    min-width: 1.5em;
    min-height: 1.5em;
  }

  &.l-icon:not(.empty) {
    text-align: left;
    .icon {
      padding-right: 0.2em;
    }
    .bngicon {
      margin-right: 0.2em;
    }
  }
  &.r-icon:not(.empty) {
    .icon {
      padding-left: 0.2em;
    }
    .bngicon {
      margin-left: 0.2em;
    }
  }

  &.external-icon {
    align-items: center;
  }
}


.show-hold {
  $hold-grad: #fffd 50%, transparent 50%;

  // note: hold-fill will be deprecated soon so... whatever
  // --btn-hold-fill-def: #ddd3 0%, #eee7 45%, #fffa 50%, transparent 50%;
  --btn-hold-fill-def:
    var(--bng-bg-enabled, transparent) 40%,
    var(--bng-bg-hover, transparent) 47%,
    var(--bng-bg-active, transparent) 50%,
    transparent 50%
  ;

  .hold-arrow {
    position: absolute;
    top: -$hold-f-offset * 1.8;
    left: 0;
    width: 100%;
    height: $hold-f-offset * 2.25;
    transition: top 150ms;
    pointer-events: none;
    z-index: 1;
    path {
      fill: var(--bng-cool-gray-200);
      stroke: #0008;
      stroke-width: 1px;
    }
  }

  &::after {
    content: "";
    display: inline-block;
    position: absolute;
    top: -$hold-f-offset;
    left: -$hold-f-offset;
    right: -$hold-f-offset;
    bottom: -$hold-f-offset;

    @include rounded-clip($hold-rad, $rad, $hold-f-offset);

    background-color: #fff5;
    background-image: linear-gradient(90deg, $hold-grad);
    background-repeat: no-repeat;
    opacity: 1;
    // reset time
    transition: background-position 300ms, opacity 0ms 300ms;
    pointer-events: none;
  }
  > :deep(.bng-background) {
    background-image: linear-gradient(90deg, var(--btn-hold-fill, var(--btn-hold-fill-def)));
    background-size: calc(200% + $hold-f-offset * 2) 100%;
    transition: background-position 300ms, opacity 0ms 300ms;
  }
  &::after {
    background-size: 200% 100%;
  }
  > :deep(.bng-background), &::after {
    background-position: 100% 50%;
  }
  &.hold-vertical {
    > :deep(.bng-background) {
      background-image: linear-gradient(0deg, var(--btn-hold-fill, var(--btn-hold-fill-def)));
      background-size: 100% calc(200% + $hold-f-offset * 2);
    }
    &::after {
      background-size: 100% 200%;
      background-image: linear-gradient(0deg, $hold-grad);
    }
    > :deep(.bng-background), &::after {
      background-position: 50% 0%;
    }
  }

  // focus frame flash
  &::before {
    background-color: rgba(#fff, 0);
    transition: background-color 500ms;
  }

  // when starting to hold
  &.hold-start {
    > :deep(.bng-background), &::after {
      background-position: 80% 50%;
      transition: none;
    }
    &.hold-vertical > :deep(.bng-background), &.hold-vertical::after {
      background-position: 50% 20%;
    }
  }

  // while holding
  &.hold-active {
    .hold-arrow {
      top: -$hold-f-offset * 1.2;
      path {
        fill: #fff;
      }
    }
    &::after {
      opacity: 1;
    }
    > :deep(.bng-background), &::after {
      background-position: 0% 50%;
      transition: background-position var(--hold-time, 1s);
    }
    &.hold-vertical > :deep(.bng-background), &.hold-vertical::after {
      background-position: 50% 100%;
    }
    // when not focused, emulate focus frame for flash effect on hold-complete
    // NOTE: add :not(:focus-visible) only when our CEF supports it, otherwise this rule will be completely ignored
    &:not(:focus):not(.focus-visible)::before {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: var(--bng-corners-1);
      pointer-events: none;
    }
  }
  // NOTE: add &:focus-visible only when our CEF supports it, otherwise this rule will be completely ignored
  &.hold-active, &:focus, &.focus-visible {
    .hold-arrow {
      // keep arrow above the focus frame
      z-index: 202;
    }
  }

  // when completed
  &.hold-completed {
    &::after {
      transition: background-position 0ms 100ms, opacity 100ms;
    }

    // while still holding
    &.hold-active {
      &::after {
        background-position: 0% 50%;
      }
      &.hold-vertical::after {
        background-position: 50% 100%;
      }

      // focus frame flash
      &::before {
        background-color: rgba(#fff, 0.5);
        transition: background-color 100ms;
      }
    }
  }

  // offsets
  --custom-hold-offset: #{$base-hold-offset};
  .hold-arrow {
    top: calc(-1 * var(--custom-hold-offset) - 0.25rem);
    pointer-events: none;
  }
  &.hold-active {
    .hold-arrow {
      top: calc(-1 * var(--custom-hold-offset));
    }
  }
  &::after {
    top: calc(-1 * var(--custom-hold-offset));
    left: calc(-1 * var(--custom-hold-offset));
    right: calc(-1 * var(--custom-hold-offset));
    bottom: calc(-1 * var(--custom-hold-offset));
  }
  &.fallback-hold-offset::after {
    @include rounded-clip($hold-rad, $rad, $hold-f-offset);
  }
}
</style>
