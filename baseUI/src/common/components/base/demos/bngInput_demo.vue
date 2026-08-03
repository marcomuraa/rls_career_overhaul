<template>
  <div class="input-demo-container">
    <div class="input-entry">
      <h1>Default Input</h1>
      <BngInput v-model="textValue" type="text" />
    </div>
    <div class="input-entry">
      <h1>Number Input</h1>
      <BngInput v-model="numberValue" type="number" />
      <h2>Min, Max, Step</h2>
      <BngInput v-model="numberValue" type="number" :min="-10" :max="10" :step="0.5" label="Min -10, Max 10, Step 0.5" />
      <h2>Custom Step Icon</h2>
      <BngInput
        v-model="numberValue"
        no-step-bindings
        type="number"
        :step-icon-type="STEP_ICON_TYPES.plusMinus"
        :min="-10"
        :max="10"
        :step="0.5"
        label="Min -10, Max 10, Step 0.5" />
    </div>
    <div class="input-entry">
      <h1>Hover Spinners (in-field)</h1>
      <h2>Plain number - hover to reveal stacked spinners inside the field</h2>
      <BngInput v-model="hoverSpinnerValue" type="number" :step="1" label="Hover me" />
      <h2>Right-edge stress: suffix + trailing icon</h2>
      <BngInput
        v-model="hoverSpinnerValue"
        type="number"
        :min="0"
        :max="100"
        :step="0.5"
        suffix="kg"
        :trailing-icon="icons.beamXPLo"
        label="Suffix + trailing icon" />
      <h2>Right-edge stress: no external button</h2>
      <BngInput v-model="hoverSpinnerValue" type="number" :min="0" :max="100" :step="1" :show-external-button="false" label="No external button" />
    </div>
    <div class="input-entry">
      <h1>Labels</h1>
      <BngInput value="Input with external label" label="External Label(default)" />
      <br />
      <BngInput value="Input with floating label" label="Floating Label" floating-label />
    </div>
    <div class="input-entry">
      <h1>Extras</h1>
      <BngInput prefix="Prefix" suffix="Suffix" :trailing-icon="icons.beamXPLo" :leading-icon="icons.beamXPFull" value="Extras" />
    </div>
    <div class="input-entry">
      <h1>Max Length &amp; Input Width</h1>
      <h2>maxlength + inputWidth (ch units)</h2>
      <BngInput v-model="maxLengthValue" :maxlength="10" input-width="10ch" prefix="Prefix" suffix="Suffix" :trailing-icon="icons.beamXPLo" :leading-icon="icons.beamXPFull" />
      <h2>maxlength only (full width, character limited)</h2>
      <BngInput v-model="maxLengthValue" :maxlength="10" prefix="Prefix" suffix="Suffix" :trailing-icon="icons.beamXPLo" :leading-icon="icons.beamXPFull" />
      <h2>inputWidth only (no character limit)</h2>
      <BngInput v-model="textValue" input-width="20ch" prefix="Prefix" suffix="Suffix" :trailing-icon="icons.beamXPLo" :leading-icon="icons.beamXPFull" />
    </div>
    <div class="input-entry">
      <h1>Read only</h1>
      <BngInput value="123" type="number" readonly />
    </div>
    <div class="input-entry">
      <h1>No Scope (direct nav)</h1>
      <BngInput v-model="noScopeValue" no-scope label="Direct nav (no scope)" />
      <br />
      <BngInput v-model="scopedValue" label="Normal scoped input" />
    </div>
    <div class="input-entry demo-1">
      <BngInput ref="iptChanged" v-model="defaultValue" label="Mark Clean Demo" prefix="Prefix" suffix="Suffix" :trailing-icon="icons.bus"> </BngInput>
      <span v-if="iptChanged">Value is {{ iptChanged.dirty ? "dirty" : "the same" }}</span>
      <BngButton v-if="iptChanged && iptChanged.dirty" @click="iptChanged.markClean()">Mark clean</BngButton>
    </div>
    <div class="input-entry">
      <h1>Validation</h1>
      <BngInput prefix="Prefix" suffix="Suffix" label="Type 'error'" floating-label error-message="Invalid Text" :validate="validate"></BngInput>
    </div>
    <div class="input-entry">
      <h1>Validation Timing</h1>
      <h2>Blur validation</h2>
      <BngInput
        v-model="blurValidationValue"
        label="Type 'error' - validates on blur"
        floating-label
        error-message="Invalid Text"
        :validate="validate"
        :validation-type="VALIDATION_TYPES.blur" />
      <h2>Value change validation</h2>
      <BngInput
        v-model="instantValidationValue"
        label="Type 'error' - validates on value change"
        floating-label
        error-message="Invalid Text"
        :validate="validate"
        :validation-type="VALIDATION_TYPES.valueChange" />
    </div>
    <div class="input-entry">
      <h1>Number Validation</h1>
      <h2>Instant (type a number outside 0–100)</h2>
      <BngInput
        v-model="numValidationInstant"
        type="number"
        :min="0"
        :max="100"
        :step="0.1"
        label="Min 0, Max 100"
        floating-label
        :validation-type="VALIDATION_TYPES.valueChange" />
      <h2>Blur</h2>
      <BngInput
        v-model="numValidationBlur"
        type="number"
        :min="0"
        :max="100"
        :step="0.1"
        label="Min 0, Max 100 - blur"
        floating-label
        :validation-type="VALIDATION_TYPES.blur" />
    </div>
    <div class="input-entry">
      <h1>No Validation</h1>
      <BngInput
        v-model="noValidationValue"
        type="number"
        :min="0"
        :max="100"
        :step="0.1"
        label="Min 0, Max 100 - no validation"
        floating-label
        no-validation />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from "vue"
import { BngButton, BngInput, STEP_ICON_TYPES, VALIDATION_TYPES, icons } from "@/common/components/base"

const textValue = ref("test1")
const numberValue = ref(0)
const hoverSpinnerValue = ref(0)
const basicValue = ref(0)
const defaultValue = ref("test1")
const maxLengthValue = ref("test1")
const blurValidationValue = ref("")
const instantValidationValue = ref("")
const numValidationInstant = ref(50)
const numValidationBlur = ref(50)
const noScopeValue = ref("no scope")
const scopedValue = ref("scoped")
const noValidationValue = ref(50)

const iptChanged = ref()

const stopBasicValueWatcher = watch(
  () => basicValue.value,
  () => console.log("basic value", basicValue.value)
)

const stopValueWatcher = watch(
  () => defaultValue.value,
  () => {
    console.log("default value", defaultValue.value)
  }
)

const onDefaultValueChanged = val => console.log("onDefaultValueChanged", val)

const validate = val => {
  if (val && val.length > 0 && val.includes("error")) {
    return false
  }
  return true
}

onUnmounted(() => {
  stopValueWatcher()
  stopBasicValueWatcher()
})
</script>

<style scoped lang="scss">
.demo-1 {
  width: 70%;
}
.input-demo-container {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.input-entry {
  margin-top: 1em;
}
</style>
