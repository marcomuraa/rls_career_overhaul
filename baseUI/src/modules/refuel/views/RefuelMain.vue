<!--*** Refuelling Interface  -->
<template>
  <LayoutSingle
    v-if="refuelStore.currentFuelData"
    v-bng-scoped-nav="{ scopeId: 'career-refueling', type: 'nonav' }"
    v-bng-on-ui-nav:ok="onPayNav"
    v-bng-on-ui-nav:back,menu="onExitNav"
    v-bng-on-ui-nav:context="onPumpFuelNav"
    v-bng-ui-nav-label:ok="$t('ui.career.refueling.pay')"
    v-bng-ui-nav-label:context="$t(pumpFuelLabel)"
    v-bng-ui-nav-label:back,menu="$t('ui.common.back')"
    tabindex="-1">
    <div class="refuel-panel">
      <BngBreadcrumbs
        class="refuel-breadcrumbs"
        :items="breadcrumbItems"
        :hide-last-item="false"
        disable-last-item
        show-back-button
        :navigable="false"
        @back="onExitNav" />
      <BngCard class="refuel-card" v-bng-blur='1'>
        <BngCardHeading type="ribbon">{{ $t(refuelStore.gasStationName) }}</BngCardHeading>
        <div class="gauge">
          <FuelGauge
            class="main-gauge"
            :fuelling="refuelStore.isFuelling"
            :type="mainSettings.gaugeType"
            :value="refuelStore.currentFuelLevel"
            :label="refuelStore.isFuelling ? $t(mainSettings.fuellingOngoingLabel) : ''"
            :minLabel="refuelStore.minEnergyLabel"
            :maxLabel="refuelStore.maxEnergyLabel" />
        </div>
        <FuelNozzle
          :refuel-type="refuelStore.currentFuelType"
          :nozzle-mode="refuelStore.nozzleMode"
          :fill-level="refuelStore.flowRate"
          @triggerDown="refuelStore.changeFlowRate(1)"
          @triggerUp="refuelStore.changeFlowRate(0)" />
        <FuelInfo
          :total-cost="refuelStore.overallPrice"
          :price-per-unit="refuelStore.currentFuelData.pricePerUnit"
          :unit-label="mainSettings.unitLabel"
          :fuel-discount-data="refuelStore.fuelDiscountData" />
        <div class="settings content" v-if="refuelStore.showFuelTypeSettings || refuelStore.showAmountSettings">
          <FuelTypeSettings v-if="refuelStore.showFuelTypeSettings" :fuel-options="refuelStore.fuelOptions" />
          <FuelAmountSettings
            v-if="refuelStore.showAmountSettings"
            :min-slider="refuelStore.minSlider"
            :max-slider="refuelStore.maxSlider"
            :unit-label="mainSettings.unitLabel" />
        </div>
        <template #buttons>
          <Button
            class="refuel-action-button"
            :class="{ 'refuel-action-button--pumping': refuelStore.isAutoFuelling }"
            bng-no-nav="true"
            :nav-item="false"
            :tab-index="-1"
            :disabled="!refuelStore.canRefuel && !refuelStore.isAutoFuelling"
            @click="onPumpFuelNav">
            <BngBinding class="refuel-action-button__binding" controller ui-event="context" track-ignore />
            {{ $t(pumpFuelLabel) }}
          </Button>
          <Button
            class="refuel-action-button"
            bng-no-nav="true"
            :nav-item="false"
            :tab-index="-1"
            :disabled="!refuelStore.canPay"
            @click="onPayNav">
            <BngBinding class="refuel-action-button__binding" controller ui-event="ok" track-ignore />
            {{ $t("ui.career.refueling.pay") }}
          </Button>
        </template>
      </BngCard>
    </div>
  </LayoutSingle>
  <div class="status-container">
    <CareerStatus class="profileStatus" />
    <TaskList class="tasklist"
      :header="store.header"
      :tasks="store.tasks" />
  </div>
</template>

<script>
import { icons } from "@/assets/icons"

const fuellingModes = {
  fuel: {
    title: "ui.career.refuelling.modes.fuel.title",
    gaugeType: "refuel",
    nozzleIconType: icons.general.fuel_nozzle,
    fuellingOngoingLabel: "ui.career.refuelling.modes.fuel.ongoing",
    startLabel: "ui.career.refuelling.modes.fuel.start",
    stopLabel: "ui.career.refuelling.modes.fuel.stop",
    manualLabel: "ui.career.refuelling.modes.fuel.pumpManual",
    unitLabel: "L",
  },
  charge: {
    title: "ui.career.refuelling.modes.charge.title",
    gaugeType: "recharge",
    nozzleIconType: icons.general.recharge_connector,
    fuellingOngoingLabel: "ui.career.refuelling.modes.charge.ongoing",
    startLabel: "ui.career.refuelling.modes.charge.start",
    stopLabel: "ui.career.refuelling.modes.charge.stop",
    manualLabel: "ui.career.refuelling.modes.charge.chargeManual",
    unitLabel: "kWh",
  },
}
</script>

<script setup>
import { onBeforeUnmount, onUnmounted, computed, onBeforeMount, provide, watch } from "vue"
import { useRefuelStore } from "@/modules/refuel/refuelStore"
import { LayoutSingle } from "@/common/layouts"
import { BngCard, BngCardHeading, BngBinding, BngBreadcrumbs } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngOnUiNav, vBngScopedNav, vBngUiNavLabel, vBngBlur } from "@/common/directives"
import FuelGauge from "@/modules/refuel/components/FuelGauge.vue"
import FuelTypeSettings from "../components/FuelTypeSettings.vue"
import FuelNozzle from "../components/FuelNozzle.vue"
import FuelInfo from "../components/FuelInfo.vue"
import FuelAmountSettings from "../components/FuelAmountSettings.vue"
import { CareerStatus } from "@/modules/career/components"
import { TaskList } from '@/modules/tasks'
import { useTasksStore } from "@/services/tasklistStore"
import { useInfoBar } from "@/services/infoBar"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useBridge } from '@/bridge'

const { lua } = useBridge()

const refuelStore = useRefuelStore()
// const emit = defineEmits(['okClick', 'cancelClick', 'startRefuel', 'stopRefuel'])
const infoBar = useInfoBar()
const uiNavBlocker = useUINavBlocker()

const mainSettings = computed(() => fuellingModes[refuelStore.currentFuelType])
const pumpFuelLabel = computed(() => refuelStore.isAutoFuelling ? mainSettings.value.stopLabel : mainSettings.value.startLabel)
const breadcrumbItems = Object.freeze([
  { label: "ui.career.refueling.title" },
])
const MANUAL_PUMP_HINT_ID = "refuel-manual-pump"
const manualPumpHint = computed(() => ({
  id: MANUAL_PUMP_HINT_ID,
  content: {
    type: "binding",
    props: {
      action: "fuelVehicle",
      controller: true,
    },
    label: mainSettings.value.manualLabel,
  },
}))
// const mainSettings = computed(() => fuellingModes[props.mode])

onBeforeMount(() => {
  refuelStore.requestFuelingData()
  uiNavBlocker.allowOnly(["ok", "back", "menu", "context", "rotate_h_cam", "rotate_v_cam"])
})

onBeforeUnmount(() => {
  refuelStore.cancelTransaction()
})

onUnmounted(() => {
  infoBar.removeHints(MANUAL_PUMP_HINT_ID)
  uiNavBlocker.clear()
  refuelStore.$dispose()
})

watch(manualPumpHint, hint => {
  infoBar.removeHints(MANUAL_PUMP_HINT_ID)
  infoBar.addHints(hint)
}, { immediate: true })

const store = useTasksStore()

provide('animationSettings', {
  animate: true,
  animateOnMount: false,
  animateOnMountIntervalDelay: 0.2,
  animateOnEmptyIntervalDelay: 0.1,
  animateOnEmpty: true,
  animateNextTask: true,
  successCallback: playAudio
})

function playAudio() {
  lua.Engine.Audio.playOnce('AudioGui', 'event:>UI>Career>Checkbox')
}

async function onPayNav() {
  if (!refuelStore.canPay) return false
  await refuelStore.payPrice()
  return false
}

async function onPumpFuelNav() {
  if (refuelStore.isAutoFuelling) {
    await refuelStore.stopFuelling()
    return false
  }
  await refuelStore.startFuelling()
  return false
}

async function onExitNav() {
  await refuelStore.cancelTransaction()
  return false
}
</script>

<style lang="scss" scoped>
$textcolor: #fff;
$fontsize: 16px;

.layout-content {
  color: $textcolor;
  font-size: $fontsize;
  padding: 1em;
}

.gauge {
  display: flex;
  justify-content: center;
  margin-top: -36px;
  padding: 0.5em 1em 0;
}

.refuel-panel {
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.refuel-card {
  width: 330px;
  color: $textcolor;
  :deep(.card-cnt) {
    overflow: visible;
  }
  :deep(.footer-container) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  :deep(.footer-container .refuel-action-button) {
    width: 100%;
    max-width: none;
    margin: 0 !important;
  }
}

.refuel-action-button {
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: center;

  --bng-button-min-width: auto;
  --bng-button-max-width: none;
  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 0.5em;
  --bng-button-padding-bottom: 0.5em;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);
  --bng-bg-focus: var(--bng-cool-gray-700);

  --bng-bg-enabled-opacity: 0.6;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);

  gap: 0.5em;
  justify-content: center;
  overflow: hidden;
}

.refuel-action-button--pumping {
  --bng-bg-enabled: var(--bng-orange-500);
  --bng-bg-hover: var(--bng-orange-500);
  --bng-bg-active: var(--bng-orange-600);
  --bng-bg-focus: var(--bng-orange-500);
  --bng-bg-enabled-opacity: 0.25;
  --bng-bg-hover-opacity: 0.3;
  --bng-bg-active-opacity: 0.4;
  --bng-bg-focus-opacity: 0.35;
  --bng-bg-border-enabled: var(--bng-orange-400);
  --bng-bg-border-hover: var(--bng-orange-400);
  --bng-bg-border-active: var(--bng-orange-600);
  --bng-bg-border-disabled: var(--bng-orange-400);
  --bng-bg-border-focus: var(--bng-orange-400);
  box-shadow: inset 0 0 0 0.0625em var(--bng-orange-400);

  :deep(.bng-background) {
    animation: refuel-pump-color 1s ease-in-out infinite alternate;
  }
}

@keyframes refuel-pump-color {
  from {
    background-color: var(--bng-orange-400);
    box-shadow: inset 0 0 0 0.0625em var(--bng-orange-400);
  }

  to {
    background-color: var(--bng-orange-600);
    box-shadow: inset 0 0 0 0.0625em var(--bng-orange-600);
  }
}

.refuel-action-button__binding {
  display: inline-flex;
  align-items: center;
  font-size: 1em;
  gap: 0.25em;
  margin-right: 0.2em;
}

.refuel-breadcrumbs {
  --bng-button-custom-margin: 0;
  flex: 0 0 auto;
  max-width: 50rem;
  padding: 0;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.8);
  pointer-events: auto;
  height: 100%;

  :deep(.bng-path) {
    position: relative;
    padding-right: 0.5rem;

    &::after {
      content: "/";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 0.5rem;
      color: var(--bng-off-white);
      opacity: 0.9;
    }
  }
}

.main-gauge {
  width: 246px;
  height: 246px;
}

:deep(.nozzle) {
  position: absolute;
  left: 100%;
  top: 0;
  mask-position: 0 45%;
  -webkit-mask-position: 0 45%;
  margin-left: 0.2em;
}

.status-container {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tasklist {
  max-width: 35rem;
}

.profileStatus {
  align-self: flex-end;
  border-radius: var(--bng-corners-2);
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  & :deep(.card-cnt) {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
