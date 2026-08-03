<template>
  <div
    class="play-button"
    @click="onStart"
    v-bng-on-ui-nav:action_2.asMouse.focusRequired
    bng-nav-item
    tabindex="1"
    v-bng-sound-class="'bng_click_hover_generic'"
  >
    <div class="background"></div>
    <div class="label">
      <BngIcon v-if="button?.meta?.icon" :type="button.meta.icon" class="icon" />
      <div v-show="holdBindingRef?.displayed" class="hold-binding">
        <BngBinding ref="holdBindingRef" class="binding" ui-event="action_2" controller />
        <svg class="hold-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 12" preserveAspectRatio="xMidYMid">
          <path d="M1,1 L8,2 L16,1 L8,11 z" />
        </svg>
      </div>
      <TextScroller class="label-text" always-scroll>
        {{ button?.meta?.label }}
      </TextScroller>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngBinding, BngIcon } from "@/common/components/base"
import { TextScroller } from "@/common/components/utility"
import { vBngOnUiNav, vBngSoundClass } from "@/common/directives"

const props = defineProps({
  button: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(["start"])
const holdBindingRef = ref(null)

function onStart() {
  emit("start", props.button?.meta?.buttonId)
}
</script>

<style scoped lang="scss">
.play-button {
  $hold-grad: #fffd 50%, transparent 50%;
  $hold-fill: #ddd3 0%, #eee7 45%, #fffa 50%, transparent 50%;

  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 28em;
  margin-left: 0.1em;
  font-family: "Overpass", var(--fnt-defs);
  font-weight: 800;
  font-style: italic;
  isolation: isolate;
  pointer-events: auto;
  cursor: pointer;

  --play-color: var(--bng-orange-700);
  --play-bg: var(--bng-orange-500);
  --play-bg-opacity: 1;

  &:hover {
    --play-color: var(--bng-orange-600);
    --play-bg: var(--bng-orange-400);
    --play-bg-opacity: 1;
  }

  .label {
    font-size: 1.75em;
    color: var(--bng-off-white);
    z-index: 1;
    border: 1px solid ed;
    align-items: center;
    justify-content: center;
    display: flex;
    gap: 1rem;
    height: 100%;
    padding-left: 1em;
    padding-right: 2em;
    // max-width: 20em; // use this to limit the size - text scroller will automatically engage when you do

    .icon {
      font-style: normal;
    }

    .label-text {
      padding-top: 0.35rem;
    }
  }

  .hold-binding {
    position: relative;
    display: inline-block;
    font-size: 0.8em;

    .hold-arrow {
      position: absolute;
      top: -0.3em;
      left: 0;
      width: 100%;
      height: 0.6em;
      transition: top 150ms;
      pointer-events: none;
      z-index: 1;

      path {
        fill: var(--bng-orange-100);
        stroke: var(--play-bg);
        stroke-width: 1px;
      }
    }
  }

  .background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: var(--play-bg-opacity, 1);
    pointer-events: none;
    z-index: 0;

    &::before {
      content: "";
      position: absolute;
      display: block;
      top: 0.5em;
      left: calc(100% - 2.5em);
      right: 0.5em;
      bottom: 0.5em;
      background-color: var(--bng-orange-900);
      opacity: 0.65;
    }

    &::after {
      content: "";
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--play-bg);
      background-image: linear-gradient(90deg, $hold-fill);
      clip-path: polygon(
        0.5em 50%,
        0% 0%,
        calc(100% - 2.5em) 0%,
        calc(100% - 2em) 50%,
        calc(100% - 1.25em) 50%,
        calc(100% - 1.75em) 0%,
        calc(100% - 1.25em) 0%,
        calc(100% - 0.75em) 50%,
        calc(100% - 0.5em) 50%,
        calc(100% - 1em) 0%,
        calc(100% - 0.5em) 0%,
        100% 50%,
        calc(100% - 0.5em) 100%,
        calc(100% - 1em) 100%,
        calc(100% - 0.5em) 50%,
        calc(100% - 0.75em) 50%,
        calc(100% - 1.25em) 100%,
        calc(100% - 1.75em) 100%,
        calc(100% - 1.25em) 50%,
        calc(100% - 2em) 50%,
        calc(100% - 2.5em) 100%,
        0% 100%
      );
    }
  }

  &.focus-visible::before {
    $off: 4px;
    $size: 2px;
    top: -$off !important;
    bottom: -$off !important;
    left: -$off !important;
    right: -$off !important;
    border: none !important;
    border-radius: 0 !important;
    background-color: var(--bng-orange-b400);
    background-image: linear-gradient(90deg, $hold-grad);
    background-repeat: no-repeat;
    clip-path: polygon(
      0.5em 50%,
      0% 0%,
      calc(100% - 0.5em) 0%,
      100% 50%,
      calc(100% - 0.5em) 100%,
      0% 100%,
      0.5em 50%,
      calc(0.5em + $size) 50%,
      $size calc(100% - $size),
      calc(100% - 0.5em - $size) calc(100% - $size),
      calc(100% - $size) 50%,
      calc(100% - 0.5em - $size) $size,
      $size $size,
      calc(0.5em + $size) 50%
    );
  }

  .background::before {
    transition: background-color 300ms;
  }

  .background::after,
  &.focus-visible::before {
    background-size: 200% 100%;
    background-position: 100% 50%;
    transition: background-position-x 300ms;
  }
}

</style>
