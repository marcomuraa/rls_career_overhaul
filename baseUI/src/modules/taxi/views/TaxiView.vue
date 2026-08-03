<template>
  <div class="taxi-hud">
    <div class="taxi-top-group">
      <TaxiProgress v-if="taxi.totalDistance > 0" :distance-left="taxi.distanceLeft" :total-distance="taxi.totalDistance" />
      <span v-else class="taxi-no-destination">{{ $t("ui.taxi.noDestination") }}</span>
      <span v-if="taxi.currentFare != null" class="taxi-fare">${{ taxi.currentFare.toFixed(2) }}</span>
      <TaxiStatusBanner :message="taxi.message" />
    </div>

    <TaxiActionBar
      class="taxi-action-bar"
      :can-hurry-up="taxi.canHurryUp"
      :can-slow-down="taxi.canSlowDown"
      :hurry-up-level="taxi.hurryUpLevel"
      :can-skip="taxi.canSkip"
      :can-change-destination="taxi.canChangeDestination"
      :has-destination="taxi.hasDestination"
      :can-stop="taxi.canStop"
      :idle-camera-enabled="idleCameraEnabled"
      @hurry-up="lua.gameplay_taxi.onHurryUpCalled()"
      @slow-down="lua.gameplay_taxi.onSlowDownCalled()"
      @skip="lua.gameplay_taxi.onSkipCalled()"
      @change-destination="lua.gameplay_taxi.onChangeDestinationCalled()"
      @stop="lua.gameplay_taxi.onStopTaxiCalled()"
      @toggle-idle-camera="onIdleCameraToggle"
    />

    <div class="taxi-tacho">
      <AppHost item="Tacho2" />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useStreams } from "@/services/events"
import { useRouteDataStore } from "@/services/routeData"
import { lua } from "@/bridge"
import TaxiProgress from "../components/TaxiProgress.vue"
import TaxiStatusBanner from "../components/TaxiStatusBanner.vue"
import TaxiActionBar from "../components/TaxiActionBar.vue"
import AppHost from "@/modules/apps/components/AppHost.vue"

const routeData = useRouteDataStore().data?.taxi || {}

// initial snapshot comes from the route's onEnter data, then the "taxi" stream keeps it live
const taxi = ref(routeData)
const idleCameraEnabled = ref(routeData.idleCameraEnabled ?? true)

function onIdleCameraToggle(value) {
  lua.gameplay_taxi.setIdleCameraEnabled(value)
}

useStreams(["taxi"], streams => {
  if (streams.taxi) {
    taxi.value = streams.taxi
    idleCameraEnabled.value = streams.taxi.idleCameraEnabled ?? true
  }
})
</script>

<style lang="scss" scoped>
.taxi-hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    pointer-events: none;
  }

  > .taxi-top-group {
    position: absolute;
    top: 7%;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;

    > .taxi-no-destination {
      font-family: var(--fnt-defs);
      font-size: 1.4rem;
      font-weight: 500;
      color: var(--bng-off-white);
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
      letter-spacing: 0.05em;
      opacity: 0.8;
    }

    > .taxi-fare {
      font-family: var(--fnt-mono);
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--bng-off-white);
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
      letter-spacing: 0.02em;
    }
  }

  > .taxi-action-bar {
    position: absolute;
    top: 90%;
    z-index: 1;
  }

  > .taxi-tacho {
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: 300px;
    height: 300px;
    z-index: 1;
  }

}
</style>
