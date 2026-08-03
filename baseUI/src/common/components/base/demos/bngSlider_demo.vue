<template>
  <div v-bng-on-ui-nav:back="() => {}">
    <div class="demo-controls">
      <BngSwitch v-model="withInput">Enable text input</BngSwitch>
      <BngInput v-model="unit" prefix="Unit" :disabled="!withInput" />
      <BngSwitch v-model="withReset">Enable reset button</BngSwitch>
      <BngSwitch v-model="withPopover">Enable marker popover</BngSwitch>
      <BngSwitch v-model="overlayMarkers">Overlay always-visible markers</BngSwitch>
    </div>
    <div style="margin-top: 1em">
      Default Slider
      <BngSlider ref="iptChanged" :min="-100" :max="100" :step="1" v-model="defaultSliderValue" @valueChanged="onValueChanged" :with-input="withInput" :with-reset="withReset" :unit="unit" />
      {{ defaultSliderValue }}
      <BngButton v-if="iptChanged" :disabled="!iptChanged.dirty" @click="iptChanged.markClean()">Mark clean</BngButton>
      <span v-if="iptChanged">{{ iptChanged.dirty ? "Dirty" : "Original" }} value</span>
    </div>
    <div style="margin-top: 1em">
      Step Slider
      <BngSlider :min="0" :max="100" :step="10" v-model="stepSliderValue" :with-input="withInput" :with-reset="withReset" :unit="unit" />
      {{ stepSliderValue }}
    </div>
    <div style="margin-top: 1em">
      No Debounce Slider (debounce=0)
      <BngSlider :min="0" :max="100" :step="1" v-model="noDebounceSliderValue" :debounce="0" :with-input="withInput" :with-reset="withReset" :unit="unit" />
      {{ noDebounceSliderValue }}
    </div>
    <div style="margin-top: 1em">
      Disabled Slider
      <BngSlider :min="0" :max="100" v-model="disabledSliderValue" disabled :with-input="withInput" :with-reset="withReset" :unit="unit" />
    </div>
    <div style="margin-top: 1em">
      Custom Position Mapping (log10) with markers
      <BngSlider :min="0" :max="1000" :step="1" v-model="log10SliderValue" :debounce="0" :position="log10Position" :markers="log10Markers" :with-input="withInput" :with-reset="withReset" :with-popover="withPopover" :unit="unit">
        <template #popover="{ hide }">
          <div class="slider-popover-menu">
            <BngButton
              v-for="marker in log10Markers"
              :key="marker.value"
              class="slider-popover-option"
              @click="selectMarker('log10', marker.value, hide)"
            >
              {{ markerLabel(marker) }}
            </BngButton>
          </div>
        </template>
      </BngSlider>
      {{ log10SliderValue }}
    </div>
    <div style="margin-top: 1em">
      Always-visible markers (uses default marker + colour)
      <BngSlider :min="0" :max="100" :step="1" v-model="alwaysMarkersSliderValue" :markers="defaultMarkers" always-show-markers :overlay-markers="overlayMarkers" :with-input="withInput" :with-reset="withReset" :with-popover="withPopover" :unit="unit">
        <template #popover="{ hide }">
          <div class="slider-popover-menu">
            <BngButton
              v-for="marker in defaultMarkers"
              :key="marker.value"
              class="slider-popover-option"
              @click="selectMarker('always', marker.value, hide)"
            >
              {{ markerLabel(marker) }}
            </BngButton>
          </div>
        </template>
      </BngSlider>
      {{ alwaysMarkersSliderValue }}
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngSlider, BngButton, BngSwitch, BngInput, icons } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"

const defaultSliderValue = ref(0)
const stepSliderValue = ref(0)
const noDebounceSliderValue = ref(50)
const disabledSliderValue = ref(50)
const log10SliderValue = ref(5)
const alwaysMarkersSliderValue = ref(50)
const withInput = ref(false)
const withReset = ref(false)
const withPopover = ref(false)
const overlayMarkers = ref(false)
const unit = ref("")

const iptChanged = ref()

const log10Position = {
  to(modelVal, ctx) {
    const v = Number(modelVal)
    if (!Number.isFinite(v) || !(ctx.max > ctx.min)) return 0
    const span = ctx.max - ctx.min
    return ctx.clamp(Math.log10(ctx.clamp(v, ctx.min, ctx.max) - ctx.min + 1) / Math.log10(span + 1), 0, 1)
  },
  from(positionVal, ctx) {
    const t = ctx.clamp(Number(positionVal) || 0, 0, 1)
    if (!(ctx.max > ctx.min)) return ctx.min
    const span = ctx.max - ctx.min
    const raw = Math.pow(10, t * Math.log10(span + 1)) - 1 + ctx.min
    return ctx.clamp(ctx.helpers.roundToStep(raw, ctx.step), ctx.min, ctx.max)
  },
}

const log10Markers = [
  { value: 1, marker: "circlePin", icon: icons.beamNG, color: "#ffae00", tooltip: "One" },
  { value: 10, marker: "markerTriangle", icon: icons.adjust, color: ["#54c0ff", "#000", "#fff"], tooltip: "Ten" },
  { value: 100, marker: "circlePin", icon: icons.abandon, color: "#4dff6d", tooltip: "One hundred" },
  { value: 500, marker: "circlePin", icon: icons.aperture, color: "#ff4d6d", tooltip: "Five hundred" },
  { value: 1000, marker: "markerRectanglePin", icon: icons.beamNG, color: "#9af07a", tooltip: "Maximum (1000)" },
]

const defaultMarkers = [
  { value: 0, icon: icons.beamNG, tooltip: "Min" },
  { value: 25, icon: icons.beamNG },
  { value: 50, icon: icons.beamNG, tooltip: "Half" },
  { value: 75, icon: icons.beamNG },
  { value: 100, icon: icons.beamNG, tooltip: "Max" },
]

function onValueChanged(value) {
  console.log("valueChanged", value)
}

function markerLabel(marker) {
  return marker.label || marker.tooltip || marker.value
}

function selectMarker(slider, value, hide) {
  if (slider === "log10") log10SliderValue.value = value
  if (slider === "always") alwaysMarkersSliderValue.value = value
  hide()
}
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: stretch;
}

.slider-popover-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  min-width: 10em;
}

.slider-popover-option {
  justify-content: flex-start;
}
</style>

<script>
// Demo Metadata
// -------------------------------------------------------
import source from "./bngSlider_demo.vue?raw"
export default {
  source,
  title: "Slider control",
  description: `Stylised slider control for selecting numerical values`,
  propInfo: [
    {
      name: "modelValue",
      type: "Number",
      desc: "For `v-model` - shouldn't be used directly",
    },
    {
      name: "min",
      type: "Number/String",
      desc: "Minimum value of the slider range (defaul is `0`)",
    },
    {
      name: "max",
      type: "Number/String",
      desc: "[Required] Maxium value of the slider range",
    },
    {
      name: "step",
      type: "Number/String",
      desc: "Step value (granularity) for the slider. Defaul is `0`)",
    },
    {
      name: "withInput",
      type: "Boolean",
      desc: "Flag for showing an input field alongside the slider",
    },
    {
      name: "withPopover",
      type: "Boolean",
      desc: "Shows a small popover button and opens the `#popover` slot from the context UINav action when the slider is focused.",
    },
    {
      name: "inputMultiplier",
      type: "Number",
      desc: "Multiplier for the input value (default is `1`)",
    },
    {
      name: "unit",
      type: "String",
      desc: "Unit for the input value",
    },
    {
      name: "disabled",
      type: "Boolean",
      desc: "Flag for disabling the slider",
    },
    {
      name: "debounce",
      type: "Number",
      desc: "Debounce delay in milliseconds before emitting the model value (default is `500`)",
    },
    {
      name: "uiNavFocus",
      type: "Boolean/Object",
      desc: "For configuring UINav behaviour (see demo page for [`vBngOnUiNavFocus`](#/components/vBngOnUiNavFocus))",
    },
    {
      name: "position",
      type: "Object `{ to, from }`",
      desc: "Optional bidirectional mapping between model values and slider position. When set, the native track is normalised to `[0..1]` and `to(model, ctx)` / `from(position, ctx)` translate between the two domains. `ctx` exposes `{ min, max, step, sliderMin, sliderMax, sliderStep, helpers, clamp }`.",
    },
    {
      name: "markers",
      type: "Array<{ value, marker?, icon?, color?, activeColor?, label?, tooltip? }>",
      desc: "Optional value markers drawn on the track. `value` is in the slider model domain (so it respects the active `position` mapping); `marker`, `icon`, `color` are forwarded to [`BngIconMarker`](#/components/BngIconMarker). `tooltip` is a string shown above the marker on hover/focus. `label` is used in the marker popover, falling back to `tooltip` or `value`. `activeColor` is used when the slider value is exactly on that marker. Markers gently lift up when the knob approaches, so the knob can pass under them. Clicking a marker jumps the slider to its value. Defaults: `marker = \"markerRectanglePin\"`, `color = \"#eee\"`, active color with default base color = `\"#f60\"`.",
    },
    {
      name: "alwaysShowMarkers",
      type: "Boolean",
      desc: "When `false` (default), markers fade in only while the slider is \"inside\" (focused / scope active). When `true`, markers stay visible regardless of focus state and the slider reserves vertical space above the track for them.",
    },
    {
      name: "overlayMarkers",
      type: "Boolean",
      desc: "When used with `alwaysShowMarkers`, keeps the always-visible markers overlaid on the slider without reserving extra padding around them.",
    },
  ],
  attrInfo: [],
}
</script>
