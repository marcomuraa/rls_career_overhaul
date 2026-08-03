<!-- bngDatePicker - a date/time picker that looks like a select until clicked, then opens a popover with a spinner per entity -->
<template>
  <div class="bng-date-picker">
    <!-- collapsed view (looks like BngSelect/BngSmartSelect) -->
    <div
      ref="elContainer"
      class="bng-date-picker-display"
      v-bind="rowNavAttrs"
      :tabindex="rowAwareTabindex"
      v-bng-on-ui-nav:focus_l.focusRequired="() => step(-1)"
      v-bng-on-ui-nav:focus_r.focusRequired="() => step(1)"
      v-bng-on-ui-nav:ok.focusRequired="openPopover"
      v-bng-disabled="effectiveDisabled"
    >
      <BngButton
        bng-no-nav="true"
        :disabled="effectiveDisabled || !smallest"
        :accent="ACCENTS.text"
        sound-class="bng_selector"
        @click="step(-1)"
      >
        <BngIcon :type="icons.arrowLargeLeft" />
      </BngButton>
      <div
        ref="elLabel"
        class="bng-date-picker-label"
        v-bng-sound-class="!effectiveDisabled && 'bng_click_hover_generic'"
        v-bng-popover:bottom.click="popoverName"
        @click.stop
      >
        <span class="label">{{ displayText }}</span>
      </div>
      <BngButton
        bng-no-nav="true"
        :disabled="effectiveDisabled || !smallest"
        :accent="ACCENTS.text"
        sound-class="bng_selector"
        @click="step(1)"
      >
        <BngIcon :type="icons.arrowLargeRight" />
      </BngButton>
    </div>

    <!-- popover picker -->
    <BngDropdownContainer
      ref="elDropdown"
      headless
      class="bng-date-picker-popover"
      :disabled="effectiveDisabled"
      :focus-target="focusTarget"
      :popover-target="elLabel"
    >
      <div class="bng-date-picker-body">
        <div class="bng-date-picker-entities">
          <div
            v-for="(entity, idx) in entities"
            :key="entity.key"
            class="bng-date-picker-entity"
            bng-nav-item
            :tabindex="effectiveDisabled ? -1 : 0"
            :bng-scoped-nav-autofocus="idx === 0"
            v-bng-on-ui-nav-focus:vertical.repeat="bumpHandlers[entity.key]"
          >
            <BngButton
              bng-no-nav="true"
              :accent="ACCENTS.text"
              sound-class="bng_selector"
              @click="bump(entity.key, 1)"
            >
              <BngIcon :type="icons.arrowSmallUp" />
            </BngButton>
            <div class="bng-date-picker-entity-value">{{ entity.display }}</div>
            <div class="bng-date-picker-entity-label">{{ entity.label }}</div>
            <BngButton
              bng-no-nav="true"
              :accent="ACCENTS.text"
              sound-class="bng_selector"
              @click="bump(entity.key, -1)"
            >
              <BngIcon :type="icons.arrowSmallDown" />
            </BngButton>
          </div>
        </div>
        <div class="bng-date-picker-actions">
          <BngButton
            :icon="icons.undo"
            :accent="ACCENTS.outlined"
            :disabled="effectiveDisabled || !canReset"
            @click="reset"
          >{{ resetLabel }}</BngButton>
          <BngButton
            :icon="icons.calendar"
            :accent="ACCENTS.outlined"
            :disabled="effectiveDisabled"
            @click="setToday"
          >{{ todayLabel }}</BngButton>
          <slot name="extra-actions" :button-props="actionButtonProps" />
        </div>
      </div>
    </BngDropdownContainer>
  </div>
</template>

<script>
// short month names used for the month entity display
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// entities ordered largest -> smallest; "smallest" displayed one is stepped by focus_l/focus_r
const ENTITY_ORDER = ["year", "month", "day", "hour", "minute", "seconds"]

const ENTITY_LABELS = {
  year: "Year",
  month: "Month",
  day: "Day",
  hour: "Hour",
  minute: "Min",
  seconds: "Sec",
}

// default format when none is provided: a plain date
const DEFAULT_FORMAT = { year: true, month: true, day: true, hour: false, minute: false, seconds: false }

const pad2 = n => String(n).padStart(2, "0")
</script>

<script setup>
import { ref, computed, watch, inject, onMounted, onBeforeUnmount, provide } from "vue"
import { BngButton, BngDropdownContainer, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngOnUiNavFocus, vBngDisabled, vBngSoundClass, vBngPopover } from "@/common/directives"

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * Which entities to show, in the shape:
   * `{ year: true, month: true, day: true, hour: false, minute: false, seconds: false }`
   * Omitted keys are treated as hidden. Defaults to a date (year/month/day).
   */
  format: {
    type: Object,
    default: () => ({ ...DEFAULT_FORMAT }),
  },
  /** Treat the model value as milliseconds instead of seconds. */
  ms: Boolean,
  /** Optional lower bound for the value (same unit as the model). */
  min: {
    type: Number,
    default: null,
  },
  /** Optional upper bound for the value (same unit as the model). */
  max: {
    type: Number,
    default: null,
  },
  /**
   * Value the "reset" button restores (same unit as the model).
   * When omitted, it falls back to the value the picker first received.
   */
  resetValue: {
    type: Number,
    default: null,
  },
  /** Label for the reset button. */
  resetLabel: {
    type: String,
    default: "Reset",
  },
  /** Label for the "set to today" button. */
  todayLabel: {
    type: String,
    default: "Today",
  },
  disabled: Boolean,
})

// v-model is a unix epoch (seconds by default, milliseconds when `ms` is set)
const value = defineModel({ type: Number })

const emit = defineEmits(["change"])

const row = inject("BngRow", null)
const inRow = !!row
const effectiveDisabled = computed(() => props.disabled || (inRow && row.disabled.value))
const rowElement = computed(() => (inRow ? row.getElement?.() : undefined))

// Prevent the inner buttons from registering into the same row.
provide("BngRow", null)

const elContainer = ref()
const elLabel = ref()
const elDropdown = ref()

const popoverName = computed(() => elDropdown.value?.popoverName)
const focusTarget = computed(() => rowElement.value || elContainer.value)

const rowNavAttrs = computed(() => (inRow ? { "bng-no-nav": "true", "bng-no-child-nav": "true" } : { "bng-nav-item": "" }))
const rowAwareTabindex = computed(() => (effectiveDisabled.value || inRow ? -1 : 0))

const scale = computed(() => (props.ms ? 1 : 1000))

const epochToDate = epoch => new Date(epoch * scale.value)
const dateToEpoch = date => Math.round(date.getTime() / scale.value)

function clampEpoch(epoch) {
  if (props.min !== null && epoch < props.min) return props.min
  if (props.max !== null && epoch > props.max) return props.max
  return epoch
}

// when no value is set yet, fall back to "now" for display purposes only
const currentDate = computed(() => epochToDate(value.value ?? dateToEpoch(new Date())))

const effectiveFormat = computed(() => {
  const f = props.format || {}
  return Object.fromEntries(ENTITY_ORDER.map(key => [key, !!f[key]]))
})

const entities = computed(() =>
  ENTITY_ORDER.filter(key => effectiveFormat.value[key]).map(key => ({
    key,
    label: ENTITY_LABELS[key],
    display: displayEntity(key, currentDate.value),
  }))
)

// the smallest displayed entity, e.g. "day" for a date, "seconds" if shown
const smallest = computed(() => {
  const list = entities.value
  return list.length ? list[list.length - 1].key : null
})

const displayText = computed(() => formatDisplay(currentDate.value))

function displayEntity(key, d) {
  switch (key) {
    case "year": return String(d.getFullYear())
    case "month": return MONTHS[d.getMonth()]
    case "day": return pad2(d.getDate())
    case "hour": return pad2(d.getHours())
    case "minute": return pad2(d.getMinutes())
    case "seconds": return pad2(d.getSeconds())
    default: return ""
  }
}

function formatDisplay(d) {
  const f = effectiveFormat.value
  const dateBits = []
  if (f.month) dateBits.push(MONTHS[d.getMonth()])
  if (f.day) dateBits.push(f.month ? String(d.getDate()) : pad2(d.getDate()))
  let datePart = dateBits.join(" ")
  if (f.year) datePart = datePart ? `${datePart}, ${d.getFullYear()}` : String(d.getFullYear())

  const timeBits = []
  if (f.hour) timeBits.push(pad2(d.getHours()))
  if (f.minute) timeBits.push(pad2(d.getMinutes()))
  if (f.seconds) timeBits.push(pad2(d.getSeconds()))
  const timePart = timeBits.join(":")

  return [datePart, timePart].filter(Boolean).join("  ") || "—"
}

function commitEpoch(epoch) {
  epoch = clampEpoch(epoch)
  if (epoch === value.value) return
  value.value = epoch
  emit("change", epoch)
}

function applyStep(key, delta) {
  if (effectiveDisabled.value || !key || !delta) return
  const d = new Date(currentDate.value.getTime())
  switch (key) {
    case "year": d.setFullYear(d.getFullYear() + delta); break
    case "month": d.setMonth(d.getMonth() + delta); break
    case "day": d.setDate(d.getDate() + delta); break
    case "hour": d.setHours(d.getHours() + delta); break
    case "minute": d.setMinutes(d.getMinutes() + delta); break
    case "seconds": d.setSeconds(d.getSeconds() + delta); break
    default: return
  }
  commitEpoch(dateToEpoch(d))
}

// step the smallest displayed entity (collapsed chevrons + focus_l/focus_r)
const step = delta => applyStep(smallest.value, delta)
// step a specific entity (popover spinner buttons)
const bump = (key, delta) => applyStep(key, delta)

// stable per-entity handlers for v-bng-on-ui-nav-focus (focus_u/focus_d on a column).
// Must keep a stable identity so the directive doesn't tear down its hold-repeat timers
// every time the value (and thus the rendered columns) updates.
const bumpHandlers = Object.fromEntries(ENTITY_ORDER.map(key => [key, dir => applyStep(key, dir)]))

// remember the value the picker first received, so "reset" can restore it
const initialValue = ref(value.value ?? null)
if (initialValue.value === null) {
  const stopInit = watch(value, v => {
    if (v !== null && v !== undefined) {
      initialValue.value = v
      stopInit()
    }
  })
}

const resetTarget = computed(() => props.resetValue ?? initialValue.value)
const canReset = computed(() => resetTarget.value !== null && resetTarget.value !== undefined && resetTarget.value !== value.value)
const actionButtonProps = computed(() => ({
  accent: ACCENTS.outlined,
  disabled: effectiveDisabled.value,
}))

function reset() {
  if (effectiveDisabled.value || !canReset.value) return
  commitEpoch(resetTarget.value)
}

function setToday() {
  if (effectiveDisabled.value) return
  commitEpoch(dateToEpoch(new Date()))
}

function openPopover() {
  if (effectiveDisabled.value) return
  elDropdown.value?.open?.()
}

defineExpose({
  step,
  reset,
  setToday,
  open: openPopover,
  close: () => elDropdown.value?.close?.(),
  getElement: () => elContainer.value,
})

const rowControlApi = inRow
  ? {
      activate: () => {
        if (effectiveDisabled.value) return
        openPopover()
      },
      activateOnClick: false,
      stepLeft: () => {
        if (effectiveDisabled.value) return true
        step(-1)
        return false
      },
      stepRight: () => {
        if (effectiveDisabled.value) return true
        step(1)
        return false
      },
      isEventInside: event => {
        const target = event?.target
        if (!(target instanceof Node)) return false
        const containerEl = elContainer.value
        const dropdownEl = elDropdown.value?.getElement?.()
        return !!((containerEl && containerEl.contains(target)) || (dropdownEl && dropdownEl.contains(target)))
      },
    }
  : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/density" as *;
@use "@/styles/modules/mixins" as *;

.bng-date-picker {
  position: relative;
}

.bng-date-picker-display {
  $b-rad: $border-rad-1;
  $f-offset: 0.25rem;

  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  border-radius: $b-rad + $f-offset;
  padding: var(--bng-select-padding, 0.25rem);
  height: auto;
  background: rgba(black, 0.6);
  user-select: none;

  @include modify-focus($b-rad, $f-offset);

  > .bng-date-picker-label {
    flex: 1 1 auto;
    display: block;
    text-align: center;
    overflow: hidden;
    cursor: pointer;

    &:hover > .label {
      color: var(--bng-orange);
    }

    > .label {
      display: inline-block;
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
  }

  > .bng-button {
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

.bng-date-picker-body {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
}

.bng-date-picker-entities {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.25rem;
  padding: 0.5rem;
}

.bng-date-picker-actions {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  align-items: stretch;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-left: 0.25rem;
  border-left: 1px solid var(--bng-cool-gray-700);

  > .bng-button,
  :slotted(.bng-button) {
    --bng-button-min-width: 0;
    margin: 0;
  }
}

.bng-date-picker-entity {
  $b-rad: $border-rad-1;

  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.5em;
  padding: 0.25rem;
  border-radius: $b-rad;
  user-select: none;

  @include modify-focus($b-rad, 0.15rem);
  &.focus-visible {
    background: rgba(white, 0.08);
  }

  .bng-date-picker-entity-value {
    font-size: 1.5rem;
    line-height: 1.4;
    color: white;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .bng-date-picker-entity-label {
    font-size: 0.75rem;
    color: var(--bng-cool-gray-300);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  > .bng-button {
    --bng-button-min-width: 0;
  }
}
</style>
