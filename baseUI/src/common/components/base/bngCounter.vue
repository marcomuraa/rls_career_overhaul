<template>
  <div class="bng-counter">
    <template v-for="(item, i) in digits" :key="`${updateId}-${i}`">
      <div v-if="item.sep !== undefined" class="cnt-sep">{{ item.sep }}</div>
      <div v-else class="cnt-window">
        <div class="cnt-ribbon" :style="item.style">
          <div v-for="(num, n) in item.cells" :key="n">{{ num }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"

const props = defineProps({
  seconds: {
    type: [Number, String],
    default: 3,
  },
  number: [Number, String],
  pad: { // left zero padding
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    default: "int", // int|float|time
  },
  precision: { // decimal places for "float", ms digits (max 3) for "time"
    type: [Number, String],
    default: 3,
  },
})

const digits = ref([])
const updateId = ref(0) // to remount/replay on update
let state = null // { from, to, start, duration } - all in ticks (smallest displayed unit)

// effective precision; time caps milliseconds to 3 digits
const prec = () => {
  const p = Math.max(0, Math.round(Number(props.precision) || 0))
  return props.type === "time" ? Math.min(p, 3) : p
}

// how many ticks make up one whole unit (1 for int, 10^precision otherwise)
const scale = () => props.type === "int" ? 1 : Math.pow(10, prec())

// minimum number of integer digits to show, zero-filled (larger values are kept)
const pad = () => Math.max(0, Math.round(Number(props.pad) || 0))

// raw prop value -> integer ticks (time treats the value as seconds)
const toTicks = raw => {
  let n = Number(raw) || 0
  if (n < 0) {
    console.warn(`BngCounter: negative value (${n}) converted to absolute`)
    n = Math.abs(n)
  }
  return Math.round(n * scale())
}

// interpolates the ticks shown right now from the running roll
const currentTicks = () => {
  if (!state) return 0
  const elapsed = Date.now() - state.start
  if (elapsed >= state.duration) return state.to
  return Math.round(state.from + (state.to - state.from) * (elapsed / state.duration))
}

// the real number currently shown (ticks back into the prop's unit)
const currentNumber = () => currentTicks() / scale()

defineExpose({
  currentNumber,
})

// intermediate representation: an ordered list of slots, each either a static
// separator { sep } or a wheel { unit, radix }. A wheel's digit at value V is
// floor(V / unit) % radix, so the roll math is identical for every format
function buildSlots(maxTicks, hasMs) {
  const slots = []
  if (props.type === "time") {
    const sec = scale() // ticks per second
    const minutes = Math.floor(maxTicks / sec / 60)
    const minLen = Math.max(1, String(minutes).length, pad())
    for (let p = minLen - 1; p >= 0; p--) slots.push({ unit: 60 * sec * Math.pow(10, p), radix: 10 }) // MM, no leading zero
    slots.push({ sep: ":" })
    slots.push({ unit: 10 * sec, radix: 6 }) // tens of seconds (0..5)
    slots.push({ unit: sec, radix: 10 }) // seconds
    if (hasMs) {
      slots.push({ sep: "." })
      for (let p = prec() - 1; p >= 0; p--) {
        slots.push({ unit: Math.pow(10, p), radix: 10 }) // milliseconds
      }
    }
    return slots
  }
  // int and float: a base-10 integer group, float adds a fractional group
  const p = props.type === "float" ? prec() : 0
  const intPart = Math.floor(maxTicks / Math.pow(10, p))
  const intLen = Math.max(1, String(intPart).length, pad())
  for (let q = intLen - 1; q >= 0; q--) {
    slots.push({ unit: Math.pow(10, p + q), radix: 10 })
  }
  if (p > 0) {
    slots.push({ sep: "." })
    for (let q = p - 1; q >= 0; q--) {
      slots.push({ unit: Math.pow(10, q), radix: 10 }) // trailing zeros kept
    }
  }
  return slots
}

function buildWheels(newTicks, oldTicks) {
  const seconds = Number(props.seconds) || 0
  const maxTicks = Math.max(newTicks, oldTicks)
  // time shows the ms group only when either end actually has sub-second value
  const hasMs = props.type === "time" && prec() > 0 &&
    (newTicks % scale() !== 0 || oldTicks % scale() !== 0)

  return buildSlots(maxTicks, hasMs).map(slot => {
    if (slot.sep !== undefined) return { sep: slot.sep }
    const { unit, radix } = slot
    const steps = Math.floor(newTicks / unit) - Math.floor(oldTicks / unit) // carries from the right included
    const mag = Math.abs(steps)
    if (mag === 0 || seconds === 0) return { cells: [Math.floor(newTicks / unit) % radix], style: { animationName: "none" } }
    const start = Math.floor(oldTicks / unit) % radix
    const loops = mag / radix // full loops, the fractional remainder lands it on the target digit
    return {
      cells: Array.from({ length: radix + 1 }, (_, i) => (start + i) % radix), // radix-digit wheel + 1 wrap clone
      style: {
        "--loops": `${loops}`,
        "--dur": `${seconds / loops}s`,
        "--dir": steps >= 0 ? "normal" : "reverse",
        animationName: `bng-counter-${radix}`,
      },
    }
  })
}

watch(() => [props.number, props.type, props.precision, props.seconds, props.pad], () => {
  const from = currentTicks() // continue from wherever the previous roll is
  const to = toTicks(props.number)
  digits.value = buildWheels(to, from)
  state = { from, to, start: Date.now(), duration: (Number(props.seconds) || 0) * 1000 }
  updateId.value++
  // console.log("bngCounter", from, "->", to, digits.value)
}, { immediate: true })
</script>

<style lang="scss" scoped>
$height: 1.2em;

.bng-counter {
  display: inline-flex;
  height: $height;
  line-height: $height;

  .cnt-sep {
    display: inline-block;
    text-align: center;
    padding: 0 0.05em;
  }

  .cnt-window {
    position: relative;
    display: inline-block;
    width: 0.65em;
    height: $height;
    overflow: hidden;

    .cnt-ribbon {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      will-change: transform;
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-duration: var(--dur, 0s);
      animation-iteration-count: var(--loops, 0);
      animation-direction: var(--dir, normal);
      > * {
        display: block;
        height: $height;
        text-align: center;
      }
    }
  }
}
</style>

<style lang="scss">
// this needs to be global because scoped keyframes have different names

$height: 1.2em; // single-digit height in em, must match $height above

@keyframes bng-counter-6 {
  from { transform: translateY(0); }
  to { transform: translateY(#{6 * -$height}); }
}
@keyframes bng-counter-10 {
  from { transform: translateY(0); }
  to { transform: translateY(#{10 * -$height}); }
}
</style>
