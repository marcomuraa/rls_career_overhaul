<template>
  <div class="datepicker-demo">
    <div class="example">
      <h4>Date ({{ dateValue }})</h4>
      <BngDatePicker v-model="dateValue" @change="onChange" />
    </div>

    <div class="example">
      <h4>Date &amp; time ({{ dateTimeValue }})</h4>
      <BngDatePicker
        v-model="dateTimeValue"
        :format="{ year: true, month: true, day: true, hour: true, minute: true, seconds: true }"
        @change="onChange"
      />
    </div>

    <div class="example">
      <h4>Time only ({{ timeValue }})</h4>
      <BngDatePicker
        v-model="timeValue"
        :format="{ hour: true, minute: true, seconds: true }"
      />
    </div>

    <div class="example">
      <h4>Inside a BngRow</h4>
      <BngRow label="Expiry date">
        <BngDatePicker v-model="dateValue" />
      </BngRow>
    </div>

    <div class="example">
      <h4>With extra action</h4>
      <BngDatePicker v-model="dateValue">
        <template #extra-actions="{ buttonProps }">
          <BngButton v-bind="buttonProps" :icon="icons.calendar">Custom action</BngButton>
        </template>
      </BngDatePicker>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngDatePicker, BngRow, icons } from "@/common/components/base"

const nowSeconds = Math.floor(Date.now() / 1000)

const dateValue = ref(nowSeconds)
const dateTimeValue = ref(nowSeconds)
const timeValue = ref(nowSeconds)

function onChange(epoch) {
  console.log("BngDatePicker change", epoch, new Date(epoch * 1000).toString())
}
</script>

<style lang="scss" scoped>
.datepicker-demo {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 30rem;
}

.example {
  h4 {
    margin: 0 0 0.5rem 0;
  }
}
</style>

<script>
// Demo Metadata
// -------------------------------------------------------
import source from "./bngDatePicker_demo.vue?raw"
export default {
  source,
  title: "Date Picker",
  description: `A date/time picker that looks like a \`BngSmartSelect\` until clicked.\n\nThe \`v-model\` is a unix epoch (seconds by default, milliseconds with the \`ms\` prop). \`focus_l\`/\`focus_r\` and the side chevrons step the smallest displayed entity. Clicking the label opens a popover with a spinner per entity (each column is one nav item; \`focus_u\`/\`focus_d\` change its value). The popover also has "reset" (restore the initial/\`reset-value\`) and "today" (set to now) buttons.`,
  propInfo: [
    {
      name: "modelValue",
      type: "Number",
      desc: "`v-model` - the date as a unix epoch (seconds by default).",
    },
    {
      name: "format",
      type: "Object",
      desc: "Which entities to show:\n\n`{ year: true, month: true, day: true, hour: false, minute: false, seconds: false }`\n\nOmitted keys are hidden. Defaults to a plain date (year/month/day).",
    },
    {
      name: "ms",
      type: "Boolean",
      desc: "Treat the model value as milliseconds instead of seconds.",
    },
    {
      name: "min",
      type: "Number",
      desc: "Optional lower bound for the value (same unit as the model).",
    },
    {
      name: "max",
      type: "Number",
      desc: "Optional upper bound for the value (same unit as the model).",
    },
    {
      name: "resetValue",
      type: "Number",
      desc: "Value the popover's reset button restores. When omitted, it falls back to the value the picker first received.",
    },
    {
      name: "resetLabel",
      type: "String",
      desc: "Label for the reset button. Default: `Reset`.",
    },
    {
      name: "todayLabel",
      type: "String",
      desc: "Label for the set-to-today button. Default: `Today`.",
    },
    {
      name: "disabled",
      type: "Boolean",
      desc: "Disables the picker.",
    },
  ],
  slotInfo: [
    {
      name: "extra-actions",
      desc: "Adds extra `BngButton` actions below Reset and Today. The slot receives `buttonProps` for matching the picker action button accent and disabled state.",
    },
  ],
  eventInfo: [
    {
      name: "change",
      type: "(epoch: Number)",
      desc: "Emitted when the value changes, with the new epoch.",
    },
  ],
}
</script>
