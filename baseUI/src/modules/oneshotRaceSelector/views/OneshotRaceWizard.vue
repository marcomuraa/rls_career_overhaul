<template>
  <LayoutMenu
    class="oneshot-race-wizard"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="oneshot-race-wizard-content">
      <div v-if="error" class="error-state">
        <BlurBackground />
        <div class="error-content">
          <BngIcon type="warning" class="error-icon" />
          <p>{{ $tt("ui.common.error") }}</p>
          <BngButton :accent="ACCENTS.secondary" @click="configurator.loadConfiguration">{{ $tt("ui.common.retry") }}</BngButton>
        </div>
      </div>
      <component
        v-else
        :is="activePanelComponent"
        v-bind="activePanelProps"
        v-on="activePanelListeners"
      />
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import { BngButton, BngIcon, ACCENTS } from "@/common/components/base"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"
import { getModeConfig } from "../modeConfig"
import useOneshotRaceConfigurator from "../composables/useOneshotRaceConfigurator"
import OneshotRaceOverview from "../components/OneshotRaceOverview.vue"
import OneshotRaceLevelGridSelector from "../components/OneshotRaceLevelGridSelector.vue"
import OneshotRaceMiddleGridSelector from "../components/OneshotRaceMiddleGridSelector.vue"
import OneshotRaceVehicleGridSelector from "../components/OneshotRaceVehicleGridSelector.vue"

const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  component: {
    type: String,
    required: true,
  },
})

const mode = getModeConfig(props.mode)
// Wizards are only ever included under "menu".
const wizardRoot = `menu.${mode.routeName}`

const route = useRoute()
const routeDataStore = useRouteDataStore()
const configurator = useOneshotRaceConfigurator(mode)
const { error, level, middle, vehicle, settings, highscores, showLapRecords, isDisabled } = configurator

const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

async function onBreadcrumbClick(item) {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

function onBreadcrumbBack() {
  lua.extensions.ui_router.back()
}

// lightRunner/busRoute restrict the vehicle grid to a fixed subset (see
// ui_vehicleSelector_general.setVehicleRestrictionMode). oneshotRaceCore.lua's
// onWizard*RouteEnter hooks already toggle this on the Lua side, but this
// watcher is kept as a guard directly off the `component`
// prop in case a step is ever reached without a matching Lua transition.
watch(
  () => props.component,
  component => {
    lua.ui_vehicleSelector_general.setVehicleRestrictionMode(component === "vehicle" ? mode.vehicleRestrictionMode || null : null)
  },
  { immediate: true }
)
onUnmounted(() => {
  lua.ui_vehicleSelector_general.setVehicleRestrictionMode(null)
})

// Campaign/other callers can deep-link straight into a preset race via query
// params (e.g. `?level=xxx&middle=yyy&vehicleModel=zzz`), pre-filling the
// wizard's selection before it shows the overview screen
async function applyQueryPrefill() {
  const { level: levelName, middle: middleName, vehicleModel, vehicleConfig } = route.query
  if (!levelName) return false
  if (middleName) {
    await configurator.selectMiddle(levelName, middleName)
  } else {
    await configurator.selectLevel(levelName)
  }
  if (vehicleModel) {
    await configurator.selectVehicle(vehicleModel, vehicleConfig)
  }
  return true
}

onMounted(async () => {
  // selectLevel/selectMiddle/selectVehicle already refresh the configuration
  // themselves, so only fall back to initialize() (route-data/RPC hydration)
  // when there was nothing to pre-fill.
  const prefilled = await applyQueryPrefill()
  if (!prefilled) {
    configurator.initialize()
  }
})

function goToOverview() {
  lua.extensions.ui_router.navigate(wizardRoot)
}

async function onSelectLevel(levelName) {
  await configurator.selectLevel(levelName)
  lua.extensions.ui_router.navigate(`${wizardRoot}.level.middle`)
}

async function onSelectMiddle(levelName, middleName) {
  await configurator.selectMiddle(levelName, middleName)
  lua.extensions.ui_router.navigate(`${wizardRoot}.vehicle`)
}

async function onSelectVehicle(model, vehicleConfig, additionalData) {
  await configurator.selectVehicle(model, vehicleConfig, additionalData)
  goToOverview()
}

const panelsByComponent = {
  overview: {
    is: OneshotRaceOverview,
    props: () => ({
      mode,
      level: level.value,
      middle: middle.value,
      vehicle: vehicle.value,
      settings: settings.value,
      highscores: highscores.value,
      showLapRecords: showLapRecords.value,
      isDisabled: isDisabled.value,
    }),
    listeners: () => ({
      "go-to-level": () => lua.extensions.ui_router.navigate(`${wizardRoot}.level`),
      "go-to-middle": () => lua.extensions.ui_router.navigate(`${wizardRoot}.level.middle`),
      "go-to-vehicle": () => lua.extensions.ui_router.navigate(`${wizardRoot}.vehicle`),
      "update-setting": (key, value) => configurator.updateSetting(key, value),
      "toggle-lap-records": () => configurator.toggleShowLapRecords(),
      play: () => configurator.start(),
    }),
  },
  level: {
    is: OneshotRaceLevelGridSelector,
    props: () => ({ mode }),
    listeners: () => ({ "select-level": onSelectLevel }),
  },
  middle: {
    is: OneshotRaceMiddleGridSelector,
    props: () => ({ mode, levelName: middle.value?.levelName || level.value?.levelName || "" }),
    listeners: () => ({ "select-middle": onSelectMiddle }),
  },
  vehicle: {
    is: OneshotRaceVehicleGridSelector,
    props: () => ({ mode }),
    listeners: () => ({ "select-vehicle": onSelectVehicle }),
  },
}

const activePanel = computed(() => panelsByComponent[props.component] || panelsByComponent.overview)
const activePanelComponent = computed(() => activePanel.value.is)
const activePanelProps = computed(() => activePanel.value.props())
const activePanelListeners = computed(() => activePanel.value.listeners())
</script>

<style scoped lang="scss">
.oneshot-race-wizard {
  pointer-events: none;
  width: 100%;
  height: 100%;

  > * {
    pointer-events: auto;
  }
}

.oneshot-race-wizard-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.error-state {
  position: relative;
  display: flex;
  flex: 1;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
}

.error-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  color: white;
}

.error-icon {
  font-size: 3rem;
}
</style>
