<template>
  <Button
    v-bng-route-target.id="routeTarget"
    class="pause-rail-button"
    :class="[flavorClass, { 'pause-rail-button--selected': selected }]"
    :disabled="disabled"
    :aria-label="label"
    @click="emit('click', $event)"
    v-bng-sound-class="'bng_click_hover_generic'"
  >
    <div class="pause-rail-button-content">
      <BngIcon class="pause-rail-button-icon" :type="icon" />
      <span class="pause-rail-button-label">{{ label }}</span>
    </div>
  </Button>
</template>

<script setup lang="js">
import { computed } from "vue"
import { BngIcon, ACCENTS } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngRouteTarget, vBngSoundClass } from "@/common/directives"

defineOptions({ name: "PauseRailButton" })

const props = defineProps({
  icon: {
    type: [Object, String],
    default: null,
  },
  label: {
    type: String,
    required: true,
  },
  flavor: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  routeTarget: {
    type: String,
    default: "",
  },
  selected: Boolean,
})

const emit = defineEmits(["click"])

const flavorClass = computed(() => {
  if (props.flavor === "danger" || props.flavor === "system") {
    return `pause-rail-button--${props.flavor}`
  }
  return "pause-rail-button--base"
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
.pause-rail-button {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;

  --bng-button-min-width: auto;
  --bng-button-max-width: 100%;

  --bng-button-padding: 0.5rem;
  --bng-button-padding-top: 0.5rem;
  --bng-button-padding-bottom: 0.5rem;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);
  --bng-bg-focus: var(--bng-cool-gray-700);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);

  &.pause-rail-button--danger {
    --bng-bg-enabled: var(--bng-add-red-600);
    --bng-bg-hover: var(--bng-add-red-600);
    --bng-bg-active: var(--bng-add-red-600);
    --bng-bg-disabled: var(--bng-add-red-600);
    --bng-bg-focus: var(--bng-add-red-600);
    --bng-bg-border-enabled: var(--bng-add-red-400);
    --bng-bg-border-hover: var(--bng-add-red-400);
    --bng-bg-border-active: var(--bng-add-red-400);
    --bng-bg-border-disabled: var(--bng-add-red-400);
    --bng-bg-border-focus: var(--bng-add-red-400);
  }

  &.pause-rail-button--system {
    --bng-bg-enabled: var(--bng-ter-blue-gray-700);
    --bng-bg-hover: var(--bng-ter-blue-gray-700);
    --bng-bg-active: var(--bng-ter-blue-gray-700);
    --bng-bg-disabled: var(--bng-ter-blue-gray-700);
    --bng-bg-focus: var(--bng-ter-blue-gray-700);
  }

  &.pause-rail-button--selected {
    // --bng-bg-enabled: transparent;
    // --bng-bg-hover: transparent;
    // --bng-bg-active: transparent;
    // --bng-bg-focus: transparent;

    --bng-bg-enabled-opacity: 1;
    --bng-bg-hover-opacity: 1;
    --bng-bg-active-opacity: 1;
    --bng-bg-focus-opacity: 1;

    --bng-bg-image: linear-gradient(90deg, rgba(255, 102, 0, 0.35) 0%, rgba(255, 255, 255, 0) 100%);
  }

  .pause-rail-button-content {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--pause-rail-button-gap, 0);
    min-width: 0;
    width: 100%;
  }

  .pause-rail-button-icon {
    font-size: 1.75rem;
    line-height: 1;
    flex: 0 0 auto;
  }

  .pause-rail-button-label {
    opacity: var(--pause-rail-button-label-opacity, 0);
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    transition: opacity 240ms ease;
  }
}
</style>
