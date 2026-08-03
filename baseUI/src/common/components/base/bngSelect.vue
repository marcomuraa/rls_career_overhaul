<!-- bngSelect - a select box control -->
<template>
  <div
    ref="elContainer"
    class="bng-select"
    v-bind="rowNavAttrs"
    :tabindex="rowAwareTabindex"
    v-bng-on-ui-nav:[navLeftEvent].focusRequired="goPrev"
    v-bng-on-ui-nav:[navRightEvent].focusRequired="goNext"
    v-bng-disabled="effectiveDisabled"
  >
    <slot name="previousButton" :click="goPrev" :disabled="isLeftDisabled">
      <BngButton
        bng-no-nav="true"
        :disabled="effectiveDisabled || isLeftDisabled"
        :accent="ACCENTS.text"
        :mute="$attrs.mute"
        sound-class="bng_selector"
        data-testid="previous-btn"
        @click="goPrev"
      >
        <BngIcon :type="leftBinding?.displayed ? icons.arrowSmallLeft : icons.arrowLargeLeft" :class="leftIconClass" />
        <BngBinding ref="leftBinding" v-if="navLeftEvent && navLeftEvent !== 'focus_l'" :uiEvent="navLeftEvent" controller />
      </BngButton>
    </slot>
    <div
      ref="elContent"
      class="bng-select-content"
      :class="{ 'label-clickable': labelClickable }"
      v-bng-sound-class="!effectiveDisabled && labelClickable && 'bng_click_hover_generic'"
      v-bng-popover:bottom.click="labelPopover"
      @click.stop="labelClickable && emit('label-click')"
    >
      <slot name="display" :label="current.label" :value="current.value">
        <span class="label select">
          <TextScroller v-if="textScroller" class="label-scroller" :watch-content="true">{{ current.label }}</TextScroller>
          <template v-else>{{ current.label }}</template>
        </span>
        <label flavour></label>
      </slot>
    </div>
    <slot name="nextButton" :click="goNext" :disabled="isRightDisabled">
      <BngButton
        ref="elNextButton"
        bng-no-nav="true"
        :disabled="effectiveDisabled || isRightDisabled"
        :accent="ACCENTS.text"
        :mute="$attrs.mute"
        sound-class="bng_selector"
        data-testid="next-btn"
        @click="goNext"
      >
        <BngBinding ref="rightBinding" v-if="navRightEvent && navRightEvent !== 'focus_r'" :uiEvent="navRightEvent" controller />
        <BngIcon :type="rightBinding?.displayed ? icons.arrowSmallRight : icons.arrowLargeRight" :class="rightIconClass" />
      </BngButton>
    </slot>
    <div class="bng-select-indicator">
      <div
        v-for="idx in options.length" :key="idx"
        :class="{ active: idx - 1 === index }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onBeforeUnmount, provide } from "vue"
import { vBngOnUiNav, vBngDisabled, vBngSoundClass, vBngPopover } from "@/common/directives"
import { BngButton, ACCENTS, icons, BngBinding, BngIcon } from "@/common/components/base"
import { TextScroller } from "@/common/components/utility"
import { clamp } from "@/utils/maths"

const leftBinding = ref()
const rightBinding = ref()

const vModel = defineModel({
  type: [Object, Boolean, Number, String],
  default: undefined,
})

const props = defineProps({
  value: undefined,
  options: {
    type: Array,
    required: true,
  },
  config: {
    type: Object,
    // default is for super simple options where opt = label = value
    default: () => ({
      value: opt => opt,
      label: opt => opt,
    }),
  },
  loop: Boolean,
  labelClickable: Boolean,
  labelPopover: String,
  disabled: Boolean,
  textScroller: Boolean,
  navLeftEvent: {
    type: String,
    default: "focus_l"
  },
  navRightEvent: {
    type: String,
    default: "focus_r"
  },
})

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))

// Prevent nested button controls from registering into the same row.
provide("BngRow", null)

const elContainer = ref()
const elContent = ref()
const elNextButton = ref()
const rowNavAttrs = computed(() => inRow ? { "bng-no-nav": "true", "bng-no-child-nav": "true" } : { "bng-nav-item": "" })
const rowAwareTabindex = computed(() => (effectiveDisabled.value || inRow ? -1 : 0))

const valueToIndex = computed(() => {
  const map = new Map()
  props.options.forEach((opt, idx) => {
    const value = props.config.value(opt)
    if (!map.has(value)) map.set(value, idx)
  })
  return map
})

const index = ref(getInitialIndex())

const current = computed(() => ({
  option: props.options[index.value],
  value: props.config.value(props.options[index.value]),
  label: props.config.label(props.options[index.value]),
}))

const leftIconClass = computed(() => ({
  'with-binding': leftBinding.value?.displayed
}))

const rightIconClass = computed(() => ({
  'with-binding': rightBinding.value?.displayed
}))

const isLeftDisabled = props.loop ? false : computed(() => index.value == 0)
const isRightDisabled = props.loop ? false : computed(() => index.value == props.options.length - 1)

const emit = defineEmits(["change", "valueChanged", "label-click"])

const goPrev = () => {
  if (!effectiveDisabled.value && !isLeftDisabled.value) changeIndex(-1)
}
const goNext = () => {
  if (!effectiveDisabled.value && !isRightDisabled.value) changeIndex(1)
}

function commitIndex(nextIndex, emitChanges = false) {
  if (nextIndex === index.value) return
  index.value = nextIndex
  if (!emitChanges) return
  const { value, label, option } = current.value
  emit("valueChanged", value, label, option)
  emit("change", value, label, option)
  if (vModel.value !== value) {
    vModel.value = value
  }
}

const syncIndexFromExternal = value => commitIndex(getIndexForValue(value), false)

defineExpose({
  goNext,
  goPrev,
  activate: activateFromRow,
  getElement: () => elContainer.value,
  getContentElement: () => elContent.value,
})

function activateFromRow() {
  if (effectiveDisabled.value) return
  if (props.labelClickable) {
    elContent.value?.click?.()
    return
  }
  const nextEl = elNextButton.value?.getElement?.()
  if (nextEl && !isRightDisabled.value) {
    nextEl.click()
    return
  }
  goNext() // fallback
}

const rowControlApi = inRow
  ? {
      activate: activateFromRow,
      activateOnClick: false,
      stepLeft: () => {
        if (effectiveDisabled.value) return true
        goPrev()
        return false
      },
      stepRight: () => {
        if (effectiveDisabled.value) return true
        goNext()
        return false
      },
      isEventInside: event => !!(elContainer.value && event?.target instanceof Node && elContainer.value.contains(event.target)),
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

watch(() => props.value, syncIndexFromExternal)
watch(vModel, syncIndexFromExternal)

function changeIndex(offset) {
  if (!props.options.length) return
  let nextIndex = index.value
  if (props.loop) {
    nextIndex = (props.options.length + index.value + offset) % props.options.length
  } else {
    nextIndex = clamp(index.value + offset, 0, props.options.length - 1)
  }
  commitIndex(nextIndex, true)
}

function getIndexForValue(value) {
  if (value === null || value === undefined) return 0
  return valueToIndex.value.get(value) ?? 0
}

function getInitialIndex() {
  if (vModel.value !== null && vModel.value !== undefined) return getIndexForValue(vModel.value)
  return "value" in props ? getIndexForValue(props.value) : 0
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/density" as *;
@use "@/styles/modules/mixins" as *;

.bng-select {
  --ind-size: var(--indicator-size, 3px);
  --ind-pad: var(--indicator-padding, 2.75em);

  $b-rad: $border-rad-1;
  $f-offset: 0.25rem;

  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  border-radius: $b-rad + $f-offset;
  padding: var(--bng-select-padding, 0.25rem);
  // padding-bottom: calc(0.25em + var(--ind-size));
  height: auto; // Overrided to avoid beamng.controls.css pollution
  background: rgba(black, 0.6);
  user-select: none;

  // Modify the focus frame radius and offset based on switch corner radius
  @include modify-focus($b-rad, $f-offset);

  > .bng-select-content {
    flex: 1 1 auto;
    display: block;
    text-align: center;
    overflow: hidden;

    &.label-clickable {
      cursor: pointer;
      &:hover > .label {
        color: var(--bng-orange);
      }
    }

    > .label {
      display: inline-block;
      box-sizing: border-box;
      max-width: 100%;
      font-size: var(--font-size, 1.125rem);
      padding: 0 0.25rem;
      text-align: center;
      color: white;
      min-width: 3em;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    > .label > .label-scroller {
      display: flex;
      width: 100%;
    }
  }

  & > .bng-button {
    flex: 0 0 auto;
    padding-left: 0.25em;
    padding-right: 0.25em;
    --bng-button-min-width: 0;
    --bng-ui-event-padding-override: 0;
  }

  &[disabled],
  &[disabled] > * {
    pointer-events: none;
    cursor: default;
    opacity: 0.7;
  }
}

.bng-select-indicator {
  position: absolute;
  box-sizing: border-box;
  left: 0%;
  bottom: 0.1em;
  padding: 0 var(--ind-pad);
  width: 100%;
  height: var(--ind-size);
  gap: var(--ind-size);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  pointer-events: none;
  overflow: hidden;

  > * {
    flex: 1 1 auto;
    height: var(--ind-size);
    background-color: #fff4;
    transition: background-color 200ms;
    &.active {
      background-color: var(--bng-orange);
    }
  }
}

.with-binding {
  width: 0.5em;
  transform: translateX(-50%);
}
</style>
