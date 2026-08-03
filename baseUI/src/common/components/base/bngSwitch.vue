<template>
  <div
    ref="bngSwitch"
    v-bng-on-ui-nav:ok.asMouse.focusRequired
    v-bind="rootAttrs"
    v-bng-disabled="effectiveDisabled"
    class="bng-switch"
    :class="{
      'bng-switch-on': isSwitchOn,
      'with-background': !alwaysTransparent,
      'always-opaque': alwaysOpaque,
      'with-label': label || slots.default,
      'label-position-before': labelBefore,
      'inline-switch': (!label && !slots.default) || inline,
      'no-focus-frame': inRow,
    }"
    :tabindex="rootTabindex"
    @click="onClicked">
    <SwitchToggle class="bng-switch-control" :checked="isSwitchOn" :disabled="effectiveDisabled" />
    <template v-if="slots.default || label">
      <div class="bng-switch-label" :class="['label-alignment-' + labelAlignment]">
        <slot>
          <span v-if="label">{{ label }}</span>
        </slot>
      </div>
    </template>
  </div>
</template>

<script>
export const LABEL_ALIGNMENTS = {
  START: "start",
  END: "end",
  CENTER: "center",
}
</script>

<script setup>
import { computed, inject, onMounted, onBeforeUnmount, onUpdated, ref, useAttrs, useSlots } from "vue"
import { SwitchToggle } from "@/common/components/utility"
import { vBngDisabled, vBngOnUiNav } from "@/common/directives"
import { lua } from "@/bridge"
import { ensureFocus } from "@/services/uiNavFocus"

const props = defineProps({
  modelValue: [Boolean, Number, String],
  /** @description For static switches only and will not change the switches value on click. Use modelValue to automatically change the value on click.*/
  checked: {
    type: Boolean,
    default: false,
  },
  label: String,
  /** @description Positions the label before the switch control if set to true. */
  labelBefore: Boolean,
  /** @description Sets the width to the content's width otherwise fills the parent's width. Default is true */
  labelAlignment: {
    type: String,
    default: LABEL_ALIGNMENTS.END,
    validator: value => Object.values(LABEL_ALIGNMENTS).includes(value),
  },
  inline: {
    type: Boolean,
    default: true,
  },
  alwaysTransparent: Boolean,
  alwaysOpaque: Boolean,
  disabled: Boolean,
  noNav: Boolean,
  bngNoNav: [Boolean, String],
  valueOn: {
    type: [Boolean, Number, String],
    default: undefined,
  },
  valueOff: {
    type: [Boolean, Number, String],
    default: undefined,
  },
})

const emit = defineEmits(["update:modelValue", "change", "valueChanged"])
defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const slots = useSlots()

const bngSwitch = ref(null)

// row-aware mode: when wrapped in <BngRow>, the row owns focus + activation;
// the switch suppresses its own nav handling and registers itself with the row
const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))
const navDisabled = computed(() => props.noNav || props.bngNoNav || inRow)

const rootAttrs = computed(() => {
  const { tabindex, tabIndex, ...fallthroughAttrs } = attrs

  return {
    ...fallthroughAttrs,
    ...(navDisabled.value ? { "bng-no-nav": "true" } : { "bng-nav-item": "" }),
  }
})
const rootTabindex = computed(() => {
  if (props.noNav || props.bngNoNav) return null
  if (effectiveDisabled.value) return -1
  return inRow ? -1 : (attrs.tabindex ?? attrs.tabIndex ?? 0)
})

const valOn = computed(() => (typeof props.valueOn === "undefined" ? true : props.valueOn))
const valOff = computed(() => (typeof props.valueOff === "undefined" ? false : props.valueOff))

const isSwitchOn = computed(() => (props.modelValue != null ? props.modelValue === valOn.value : props.checked))

function playSwitchSound() {
  lua.ui_audio.playEventSound("bng_switch", "click")
}

function onClicked() {
  if (effectiveDisabled.value) return

  const newValue = !isSwitchOn.value ? valOn.value : valOff.value
  playSwitchSound()

  if (props.modelValue != null) emit("update:modelValue", newValue)

  emit("valueChanged", newValue)
  emit("change", newValue)
}

const rowControlApi = inRow
  ? {
      activate: onClicked,
      isEventInside: event => !!(bngSwitch.value && event?.target instanceof Node && bngSwitch.value.contains(event.target)),
    }
  : null
if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

onUpdated(() => {
  if (!navDisabled.value) ensureFocus(bngSwitch.value)
})
</script>

<style lang="scss" scoped>
$on-background-color: (var(--bng-cool-gray-700));

@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.bng-switch {
  $f-offset: 0.25rem;
  $rad: $border-rad-1;

  position: relative;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  cursor: pointer;

  // Modify the focus frame radius and offset based on switch corner radius
  @include modify-focus($rad, $f-offset);

  &.inline-switch {
    display: inline-flex;
    justify-content: flex-start;
  }

  &.with-label {
    padding: 0.3em 0.5em;
    border-radius: var(--bng-corners-2);
    border: 0.125em solid transparent;
    background-clip: padding-box;

    &.label-position-before {
      flex-direction: row-reverse;

      > .bng-switch-label {
        padding-left: 0;
        padding-right: 0.5em;
      }
    }
  }

  .bng-switch-control {
    flex-shrink: 0;
  }

  &.bng-switch-on {
    &.with-background.with-label {
      background: $on-background-color;
    }
  }

  &.always-opaque.with-label {
    background: rgba(0, 0, 0, 0.6);
  }

  &[disabled] {
    border-color: transparent;
    background-clip: padding-box;
    pointer-events: none;
    opacity: 0.7;
  }
}


.bng-switch-label {
  display: flex;
  flex-grow: 1;
  padding-left: 0.5em;
  color: var(--bng-off-white);
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;

  &.label-alignment-start {
    justify-content: flex-start;
  }

  &.label-alignment-end {
    justify-content: flex-end;
  }

  &.label-alignment-center {
    justify-content: center;
  }

  span {
    display: inline-block;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
}
</style>
