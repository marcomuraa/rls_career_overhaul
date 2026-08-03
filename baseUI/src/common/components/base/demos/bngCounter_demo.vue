<template>
  <div class="counter-demo">
    <div class="row controls">
      <BngInput v-model="sec" type="number" :min="0" :max="10" :step="0.1" floating-label="Animation seconds" />
      <BngInput v-model="pad" type="number" :min="0" :max="10" :step="1" floating-label="Left zero padding" />
      <BngInput v-model="prec" type="number" :min="0" :max="10" :step="1" floating-label="Decimal precision" />
    </div>
    <div class="row">
      <BngCounter :number="num" :seconds="sec" :pad="pad" :precision="prec" />
      <BngButton @click="rollInt">New number</BngButton>
    </div>
    <div class="row">
      <BngCounter :number="flt" :seconds="sec" type="float" :pad="pad" :precision="prec" />
      <BngButton @click="rollFloat">New float</BngButton>
    </div>
    <div class="row">
      <BngCounter :number="time" :seconds="sec" type="time" :pad="pad" :precision="prec" />
      <BngButton @click="rollTime">New time</BngButton>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngCounter, BngButton, BngInput } from "@/common/components/base"

const sec = ref(3)
const num = ref(5)
const flt = ref(3.14)
const time = ref(83.456)
const pad = ref(0)
const prec = ref(3)

const rollInt = () => num.value = ~~(Math.random() * 1e5)
const rollFloat = () => flt.value = Math.random() * 1000
const rollTime = () => time.value = Math.random() * 600

rollInt()
rollFloat()
rollTime()
</script>

<style scoped lang="scss">
.counter-demo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 3rem;

  .row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .controls {
    font-size: 1rem;
  }

  button {
    font-size: 1rem;
  }
}
</style>

<script>
import source from "./bngCounter_demo.vue?raw"
export default {
  source,
  title: "Animated odometer-style counter",
  description: "Very performant CSS-based counter with rolling wheels, supporting int, float, time, precision, and left padding.",
  propInfo: [
    {
      name: "number",
      type: "Number|String",
      desc: "Target value to display and animate toward.",
    },
    {
      name: "seconds",
      type: "Number|String",
      desc: "Total animation time in seconds.",
    },
    {
      name: "type",
      type: "String",
      desc: "Display mode: \"int\", \"float\", or \"time\".",
    },
    {
      name: "precision",
      type: "Number|String",
      desc: "Decimal precision for float, millisecond digits for time (up to 3).",
    },
    {
      name: "pad",
      type: "Number",
      desc: "Minimum left-side digit count (zero-padded).",
    },
  ],
  attrInfo: [],
}
</script>
