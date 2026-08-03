<template>
  <BngImageAsset mask :class="nozzleClass" :src="nozzleImageURL" :bg-color="nozzleBackgroundColor" :style="nozzleStyle">
    <span v-if="normalizedFillLevel > 0" class="nozzle-fill" aria-hidden="true"></span>
    <BngButton
      bng-no-nav="true"
      :class="{ empty: true, gamepad: showIfController }"
      :disabled="!modeSettings.buttonEnabled"
      @mousedown="emit('triggerDown')"
      @mouseup="emit('triggerUp')"
      :accent="ACCENTS.text">
      <BngBinding v-if="showIfController" action="fuelVehicle" controller :disabled="!modeSettings.buttonEnabled" :accent="ACCENTS.text" />
      <BngIcon v-else :type="icons.plus" title="Activate" />
    </BngButton>
  </BngImageAsset>
</template>

<script>
const nozzleModes = {
  on: {
    color: "var(--bng-black-o6)",
    fillColor: "var(--bng-orange-b400)",
    buttonEnabled: true,
  },
  off: {
    color: "var(--bng-black-o6)",
    buttonEnabled: true,
  },
  disabled: {
    color: "var(--bng-black-o2)",
    buttonEnabled: false,
  },
}

const fuellingModes = {
  fuel: {
    nozzleIconType: oldIcons.general.fuel_nozzle,
  },
  charge: {
    nozzleIconType: oldIcons.general.recharge_connector,
  },
}
</script>

<script setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { BngButton, ACCENTS, BngImageAsset, BngBinding, BngIcon, icons } from "@/common/components/base"
import { icons as oldIcons } from "@/assets/icons"
import useControls from "@/services/controls"

const Controls = useControls()
const { showIfController } = storeToRefs(Controls)

const props = defineProps({
  refuelType: {
    type: String,
    required: true,
  },
  nozzleMode: {
    type: String,
    default: "off",
  },
  fillLevel: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(["triggerDown", "triggerUp"])

const nozzleImageURL = computed(() => `icons/${typeSettings.value.nozzleIconType}.svg`)
const typeSettings = computed(() => fuellingModes[props.refuelType])
const modeSettings = computed(() => nozzleModes[props.nozzleMode])
const nozzleClass = computed(() => ({ nozzle: true, [props.refuelType]: true }))
const normalizedFillLevel = computed(() => (props.nozzleMode === "on" ? Math.max(0, Math.min(props.fillLevel || 0, 1)) : 0))
const nozzleBackgroundColor = computed(() => modeSettings.value.color)
const nozzleStyle = computed(() => ({
  "--nozzle-fill-level": `${normalizedFillLevel.value * 75 + 25}%`,
  "--nozzle-fill-color": modeSettings.value.fillColor || "transparent",
}))
</script>

<style scoped lang="scss">
.nozzle {
  position: relative;
  overflow: hidden;

  .nozzle-fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--nozzle-fill-level);
    background-color: var(--nozzle-fill-color);
    pointer-events: none;
    transition: height 120ms linear;
  }

  & .bng-button {
    position: relative;
    z-index: 1;
  }

  &.charge {
    width: 5em !important;
    & .bng-button {
      display: none;
      top: 34.5%;
      left: 10%;
    }
  }
  &.fuel {
    width: 6.25em !important;
    & .bng-button {
      top: 33%;
      left: 34%;
      width: 2.75em;
      height: 2em;
      padding-top: 2px;
      margin-top: 8px;
    }
    & .bng-button.gamepad {
      top: 34%;
    }
  }
  margin-top: 5em;
  height: 15em !important;
}
</style>
