<template>
  <div
    class="garage-blackscreen"
    :class="{ 'garage-blackscreen-active': blackscreen }"
    v-bng-blur="blackscreen"
  ></div>

  <LayoutMenu
    class="garage-layout"
    nav-scope="garage-layout"
    :nav-active="false"
    :show-topbar="breadcrumbItems.length > 0"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="showBreadcrumbBackButton"
    :heading="garageHeadingText"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div v-bng-on-ui-nav:back="onBack" v-bng-on-ui-nav:menu="toggleMenu" v-bng-on-ui-nav:action_4="toggleSidemenu" class="garage-view">
      <div class="garage-row-main">
      <div class="garage-menu-container garage-menu-main">
        <!-- stand-alone garage -->
        <div v-if="!vehcomp" class="garage-menu garage-menu-primary">
          <GarageButton
            :icon="icons.engine"
            :active="vehcomp === 'parts'"
            @click="menuOpen('parts')"
            v-bng-route-target.id="'garage.vehicle.parts'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.parts") }}</GarageButton>
          <!-- title: ui.garage.tabs.parts -->
          <GarageButton
            :icon="icons.wrench"
            :active="vehcomp === 'tuning'"
            @click="menuOpen('tuning')"
            v-bng-route-target.id="'garage.vehicle.tuning'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.tune") }}</GarageButton>
          <!-- title: ui.garage.tune.tuning -->
          <GarageButton
            :icon="icons.sprayCan"
            :active="vehcomp === 'paint'"
            @click="menuOpen('paint')"
            v-bng-route-target.id="'garage.vehicle.paint'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.paint") }}</GarageButton>
          <!-- title: ui.garage.tabs.paint -->
          <GarageButton
            v-if="!$simplemenu"
            :icon="icons.star"
            :active="vehcomp === 'decals'"
            @click="launchLiveryEditor"
            v-bng-route-target.id="'garage.vehicle.decals'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.decals") }}</GarageButton>
          <!-- title: ui.garage.tabs.decals -->
        </div>
        <div v-if="!vehcomp" class="garage-menu garage-menu-secondary">
          <GarageButton
            :icon="icons.car"
            :active="vehcomp === 'vehicles'"
            @click="menuOpen('vehicles')"
            v-bng-route-target.id="'garage.vehicles'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.vehicles") }}</GarageButton>
          <!-- title: none -->
          <GarageButton
            :icon="icons.keys1"
            :active="vehcomp === 'mycars'"
            @click="menuOpen('mycars')"
            v-bng-route-target.id="'garage.mycars'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.load") }}</GarageButton>
          <!-- title: ui.garage.load.loadCar -->
          <GarageButton
            :icon="icons.photo"
            @click="menuOpen('photo')"
            v-bng-route-target.id="'garage.photomode'"
            v-bng-disabled="!loaded.vehicle"
            v-bng-blur
          >{{ $t("ui.garage.tabs.photo") }}</GarageButton>
          <!-- title: ui.garage.tabs.photo -->
        </div>

        <!-- sub-views -->
        <div
          v-if="vehcomp && vehcompview"
          class="garage-content"
          v-bng-frustum-mover:left="true"
        >
          <component
            :is="vehcompview"
            v-bind="vehicleConfigComponentProps"
            with-background
            :with-padding="false"
          />
        </div>
      </div>
      </div>
    </div>

    <template #buttons-side>
      <div
        class="garage-sidemenu"
        v-bng-scoped-nav="{
          scopeId: 'garage-sidemenu',
          bubbleWhitelistEvents: ['menu', 'action_4'],
          canDeactivate: () => false,
        }"
        bng-no-nav="true"
        v-bng-on-ui-nav:back="sideMenuBack"
      >
        <h4 class="garage-sidemenu-title" v-bng-blur>
          <BngBinding class="back-binding" ui-event="action_4" controller />
          {{ $t("ui.garage2.features") }}
        </h4>

        <!-- Camera menu -->
        <Drawer v-model="drawerCamera" position="left" class="garage-menugroup">
          <template #header>
            <div class="garage-drawer-header" v-bng-blur>
              <GarageButton
                type="drawer-toggle"
                :icon="icons.movieCamera"
                :active="drawerCamera"
                v-bng-disabled="!loaded.init"
                @click="toggleDrawerCamera"
              >{{ $t("ui.garage.photo.camera") }}</GarageButton>
            </div>
          </template>
          <template #expanded-content>
            <div
              v-bng-scoped-nav="{ scopeId: sidemenuScopeIds.camera, bubbleWhitelistEvents: ['action_4']}"
              class="garage-drawer-content"
              v-bng-blur
              @deactivate="toggleDrawerCamera">
              <!-- engine.editor.menu.camera.perspective ui.options.camera.defaultMode -->
              <GarageButton
                type="drawer-button"
                :icon="icons.camera3Fourth1"
                @click="setCamera('default')"
              >{{ $t("camera.position.standard") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.cameraFront1"
                @click="setCamera('front')"
              >{{ $t("camera.position.front") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.cameraBack1"
                @click="setCamera('back')"
              >{{ $t("camera.position.rear") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.cameraSideRight"
                @click="setCamera('side')"
              >{{ $t("camera.position.right") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.cameraTop1"
                bng-scoped-nav-autofocus
                @click="setCamera('top')"
              >{{ $t("camera.position.top") }}</GarageButton>
            </div>
          </template>
        </Drawer>

        <!-- Vehicle features menu -->
        <Drawer v-model="drawerVehicle" position="left" class="garage-menugroup">
          <template #header>
            <div class="garage-drawer-header" v-bng-blur>
              <GarageButton
                type="drawer-toggle"
                :icon="icons.electronicSchemeOutline"
                :active="drawerVehicle"
                v-bng-disabled="!loaded.vehicle || !loaded.status"
                @click="toggleDrawerVehicle"
              >{{ $t("ui.radialmenu2.electrics") }}</GarageButton>
            </div>
          </template>
          <template #expanded-content>
            <div
              v-bng-scoped-nav="{ scopeId: sidemenuScopeIds.vehicle, bubbleWhitelistEvents: ['action_4']}"
              class="garage-drawer-content"
              v-bng-blur
              @deactivate="toggleDrawerVehicle">
              <GarageButton
                type="drawer-button"
                :icon="icons.lowBeam"
                :active="vehicle.electrics.lowbeam"
                v-bng-disabled="!loaded.vehicle"
                @click="vehSwitch('lowbeam')"
              >{{ $t("ui.radialmenu2.electrics.headlights.low") }}</GarageButton>
              <!-- ui.inputActions.vehicle.toggle_headlights.title ui.radialmenu2.electrics.headlights -->
              <GarageButton
                type="drawer-button"
                :icon="icons.highBeam"
                :active="vehicle.electrics.highbeam"
                v-bng-disabled="!loaded.vehicle"
                @click="vehSwitch('highbeam')"
              >{{ $t("ui.radialmenu2.electrics.headlights.high") }}</GarageButton>
              <!-- ui.inputActions.vehicle.toggle_foglights.title -->
              <GarageButton
                type="drawer-button"
                :icon="icons.fogLight"
                :active="vehicle.electrics.fog_lights"
                v-bng-disabled="!loaded.vehicle"
                @click="vehSwitch('fog')"
              >{{ $t("ui.radialmenu2.electrics.fog_lights") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.hazardLights"
                :active="vehicle.electrics.hazard"
                v-bng-disabled="!loaded.vehicle"
                @click="vehSwitch('hazard')"
              >{{ $t("ui.radialmenu2.electrics.hazard_lights") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.wigwags"
                :active="vehicle.electrics.lightbar"
                v-bng-disabled="!loaded.vehicle"
                bng-scoped-nav-autofocus
                @click="vehSwitch('lightbar')"
              >{{ $t("ui.radialmenu2.electrics.lightbar") }}</GarageButton>
            </div>
          </template>
        </Drawer>

        <!-- Garage features menu -->
        <Drawer v-model="drawerGarage" position="left" class="garage-menugroup">
          <template #header>
            <div class="garage-drawer-header" v-bng-blur>
              <GarageButton
                type="drawer-toggle"
                :icon="icons.garage01"
                :active="drawerGarage"
                v-bng-disabled="!loaded.init"
                @click="toggleDrawerGarage"
              >{{ $t("ui.garage2.features") }}</GarageButton>
            </div>
          </template>
          <template #expanded-content>
            <div
              v-bng-scoped-nav="{ scopeId: sidemenuScopeIds.garage, bubbleWhitelistEvents: ['action_4']}"
              class="garage-drawer-content"
              v-bng-blur
              @deactivate="toggleDrawerGarage">
              <GarageButton
                type="drawer-button"
                :icon="icons.lightGarageG32"
                :active="lightState[0]"
                @click="lightToggle(0)"
              >{{ $t("ui.garage2.lights.west") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.lightGarageG22"
                :active="lightState[1]"
                @click="lightToggle(1)"
              >{{ $t("ui.garage2.lights.middle") }}</GarageButton>
              <GarageButton
                type="drawer-button"
                :icon="icons.lightGarageG12"
                :active="lightState[2]"
                bng-scoped-nav-autofocus
                @click="lightToggle(2)"
              >{{ $t("ui.garage2.lights.east") }}</GarageButton>
            </div>
          </template>
        </Drawer>
      </div>
    </template>

    <template #buttons-bottom>
      <div class="garage-row-bottom" :bng-no-child-nav="vehcomp ? 'true' : undefined">
      <!-- normal garage -->
      <GarageButton
        :active="vehcomp === 'save'"
        @click="menuOpen('save')"
        v-bng-disabled="!loaded.vehicle"
        :icon="icons.saveAs1"
        v-bng-blur
        v-bng-tooltip:top="$t('ui.vehicleconfig.save')"
      />
      <!--
      <GarageButton
        :active="vehcomp === 'save'"
        @click="mainMode('savedefault')"
        v-bng-disabled="!loaded.vehicle"
        :icon="icons.vehicleFavorite"
        v-bng-blur
        v-bng-tooltip="[set default]"
      /> -->
      <GarageButton
        @click="menuOpen('test')"
        v-bng-disabled="!loaded.vehicle"
        :icon="icons.trafficCone"
        v-bng-blur
        v-bng-tooltip:top="$t('ui.common.test')"
      />
      <GarageButton
        @click="quitToMainMenu"
        :icon="icons.exit"
        v-bng-blur
        v-bng-tooltip:top="$t('ui.mainmenu.exit')"
      />
      </div>
    </template>
  </LayoutMenu>
</template>

<script setup>
// base includes
import { ref, reactive, watch, markRaw, onBeforeMount, onUnmounted, nextTick, computed, inject } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { $translate } from "@/services/translation"
import { BngBinding, BngScreenHeadingV2, icons, ACCENTS } from "@/common/components/base"
import { Drawer } from "@/common/components/utility"
import { LayoutMenu } from "@/common/layouts"
import { vBngBlur, vBngFrustumMover, vBngOnUiNav, vBngDisabled, vBngTooltip, vBngScopedNav, vBngRouteTarget } from "@/common/directives"
import { openExperimental, openMessage, openConfirmation } from "@/services/popup"
import GarageButton from "../components/GarageButton.vue"

// service includes
import { useBridge } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"
import { useEvents, useStreams } from "@/services/events"
import useControls from "@/services/controls"
import { useUINavTracker } from "@/services/uiNavTracker"
import { useScopedNav, activateScreenRootScope, activateRouteTargetScope } from "@/services/scopedNav/api"
import { useRouteDataStore } from "@/services/routeData"

// sub includes
import Paint from "@/modules/vehicleConfig/components/Paint.vue"
import Parts from "@/modules/vehicleConfig/components/Parts.vue"
import Tuning from "@/modules/vehicleConfig/components/Tuning.vue"
import SaveWrapper from "../components/GarageSaveWrapper.vue"

const components = {
  paint: Paint,
  parts: Parts,
  tuning: Tuning,
  save: SaveWrapper,
}

const sidemenuScopeIds = {
  camera: "garage-sidemenu-camera",
  vehicle: "garage-sidemenu-vehicle",
  garage: "garage-sidemenu-garage",
}

const ownerId = "garage"
const route = useRoute()
const uiNavTracker = useUINavTracker()
const Controls = useControls()
const { showIfController } = storeToRefs(Controls)
const { lua, api } = useBridge()
const events = useEvents()
const scopedNav = useScopedNav()
const bngVue = window.bngVue || { gotoGameState() {} }
const routeDataStore = useRouteDataStore()
const $simplemenu = inject("$simplemenu")

const streamsList = ["electrics"]
useStreams(streamsList, onStreamsUpdate)

// Drawer expanded states
const drawerCamera = ref(false)
const drawerVehicle = ref(false)
const drawerGarage = ref(false)

const showBreadcrumbBackButton = computed(() => {
  return breadcrumbItems.value.length > 1
})

watch(
  () => showIfController,
  val => val ? uiNavTracker.addIgnore("action_4", ownerId) : uiNavTracker.removeIgnore("action_4", ownerId),
  { immediate: true }
)

const garageHeadingText = computed(() => {
  if (breadcrumbItems.value) {
    const lastItem = breadcrumbItems.value[breadcrumbItems.value.length - 1]
    return lastItem ? lastItem.label : (route.meta?.menu?.label || $translate.instant("ui.mainmenu.garage"))
  }
  return vehicle.name
})

const launchLiveryEditor = async () => {
  if ($simplemenu.value) return
  const dynDecalsCapable = await runRaw('extensions.core_vehicle_partmgmt.hasAvailablePart(be:getPlayerVehicle(0).JBeam .. "_skin_dynamicTextures")')

  if (!dynDecalsCapable) {
    openMessage("", $translate.instant("ui.garage.decals.notAvailableForVehicle"))
  } else {
    const res = await openExperimental(
      "Dynamic Decals",
      "This is an early highly experimental preview of the Decal Editor. Please be aware that anything created with this feature may be lost in future hotfixes and updates. Do you wish to proceed?",
      [
        { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.secondary } },
        { label: "Yes, I'm buckled up and ready to go!", value: true, extras: { default: true } },
      ]
    )
    if (res) {
      await lua.extensions.ui_router.navigate("livery", null, null)
      // bngVue.gotoGameState("livery-manager")
    }
  }
}

const props = defineProps({
  component: String,
})

function toggleMenu() {
  window.globalAngularRootScope?.$broadcast("MenuToggle")
}

function toggleSidemenu() {
  const currentScope = scopedNav.currentScope()
  if (!currentScope) {
    return activateScreenRootScope()
  }

  const currentScopeId = currentScope.id
  const isSidemenuScope = Object.values(sidemenuScopeIds).includes(currentScopeId)
  if (isSidemenuScope || currentScopeId === "garage-sidemenu") {
    return activateScreenRootScope()
  } else {
    scopedNav.activateScope("garage-sidemenu")
  }
}

const sideMenuBack = () => {
  activateScreenRootScope()
}

const lightState = ref([false, false, false])
async function lightToggle(idx) {
  lightState.value[idx] = !lightState.value[idx]
  await lua.extensions.gameplay_garageMode.setLighting(lightState.value)
}

async function setCamera(view) {
  await lua.extensions.gameplay_garageMode.setCamera(view)
}

// electric switches
const switches = reactive({
  lowbeam: { func: "setLightsState", value: "lights_state", on: 1, off: 0, state: false },
  highbeam: { func: "setLightsState", value: "lights_state", on: 2, off: 0, state: false },
  fog: { func: "set_fog_lights", value: "fog", on: 1, off: 0, state: false },
  lightbar: { func: "set_lightbar_signal", value: "lightbar", on: 1, off: 0, state: false },
  hazard: { func: "set_warn_signal", value: "hazard_enabled", on: 1, off: 0, state: false },
})

function vehSwitch(key, on) {
  if (!(key in switches)) return
  const svc = switches[key]
  if (typeof on === "undefined") {
    // toggle if undefined
    on = !svc.state
  } else if (on === svc.state) {
    // no change - do nothing
    return
  }
  api.activeObjectLua(`electrics.${svc.func}(${on ? svc.on : svc.off})`)
}

const loaded = reactive({
  init: false,
  vehicle: false,
  status: false,
})
const vehicle = reactive({
  name: "Unknown",
  vehicle: null,
  electrics: {},
  state: {},
})

const blackscreen = ref(false)
const vehcomp = ref("")
const vehcompview = ref(null)
let tmrInit

const vehicleConfigComponentProps = computed(() =>
  vehcomp.value === "tuning" ? { mirrorsRoute: "garage.vehicle.tuning.mirrors" } : {}
)

// Per-route mount-ack and gated scope-activation state.
// Activation is delayed until both the manual routeMounted ack has succeeded
// and the vehicle data is ready (or the wait timeout has elapsed) so that
// `bng-scoped-nav-autofocus` lands on a navigable button.
const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0
const hasMountedAck = ref(false)
const hasActivatedInitialRouteScope = ref(false)
const vehicleWaitTimedOut = ref(false)

const breadcrumbItems = computed(() => routeDataStore.breadcrumbs || [])

async function onBreadcrumbClick(item) {
  console.log("onBreadcrumbClick", item)
  if (!item) return
  if (item.routeName && !item.abstract) await lua.extensions.ui_router.navigate(item.routeName, item.params)
  if (item.routeName === "garage") {
    if (vehcomp.value) {
      vehcomp.value = ""
      vehcompview.value = null
      return
    }
    return
  }
}

async function onBreadcrumbBack() {
  await lua.extensions.ui_router.back()
}

function setGarageSubview(componentName) {
  vehcomp.value = componentName || ""
  vehcompview.value = componentName && components[componentName] ? markRaw(components[componentName]) : null
}

async function quitToMainMenu() {
  if (vehicle.state.vehicleDirty) {
    const shouldQuit = await openConfirmation(
      null,
      $translate.instant("ui.career.garage.vehicleSwitchPrompt"),
      [
        { label: $translate.instant("ui.common.yes"), value: true },
        { label: $translate.instant("ui.common.no"), value: false, extras: { default: true, cancel: true, accent: ACCENTS.secondary } },
      ]
    )
    if (!shouldQuit) return
  }
  lua.extensions.gameplay_garageMode.stop()
  lua.returnToMainMenu()
}

async function menuOpen(mode) {
  vehcomp.value = vehcomp.value === mode ? "" : mode
  let component = null
  switch (mode) {
    case "paint":
      lua.extensions.gameplay_garageMode.setGarageMenuState("paint")
      // component = components.paint
      lua.extensions.ui_router.navigate("garage.vehicle.paint", null, null)
      break
    case "decals":
      bngVue.gotoGameState("decals-loader")
      break
    case "parts":
      lua.extensions.gameplay_garageMode.setGarageMenuState("parts")
      // component = components.parts
      lua.extensions.ui_router.navigate("garage.vehicle.parts", null, null)
      break
    case "tuning":
      lua.extensions.gameplay_garageMode.setGarageMenuState("tuning")
      // component = components.tuning
      lua.extensions.ui_router.navigate("garage.vehicle.tuning", null, null)
      break
    case "vehicles":
      lua.extensions.gameplay_garageMode.setGarageMenuState("vehicles")
      lua.ui_vehicleSelector_general.openVehicleSelectorForGarage(false)
      break
    case "mycars":
      lua.extensions.gameplay_garageMode.setGarageMenuState("mycars")
      lua.ui_vehicleSelector_general.openVehicleSelectorForGarage(true)
      // lua.extensions.ui_router.navigate("garage.vehicles", null)
      break
    case "photo":
      lua.extensions.ui_router.navigate("garage.photomode", null, null)
      break
    case "save":
      // component = components.save
      lua.extensions.ui_router.navigate("garage.vehicle.save", null, { preferredScope: "garage-vehicle-save" })
      break
    case "savedefault":
      console.log("TODO: save as default")
      break
    case "test":
      vehcomp.value = ""
      lua.extensions.gameplay_garageMode.testVehicle()
      break
    default:
      vehcomp.value = ""
      break
  }

  // if (component) vehcompview.value = markRaw(component)
}

// handles vehicle change
async function vehChange() {
  // this function init is at bottom of garage controller
  // reset menus // don't! if you do, check if it's not conflicting with parts change
  //vehcomp.value = ""
  // lock status
  loaded.vehicle = false
  loaded.status = false
  // start a fresh readiness attempt so a previous attempt's timeout cannot leak
  vehicleWaitTimedOut.value = false
  // reset vehicle
  vehicle.name = "Unknown"
  vehicle.vehicle = null
  vehicle.electrics = {}
  // enable electrics w/o ignition
  await api.activeObjectLua("electrics.setIgnitionLevel(1)")
  // request info
  const data = await lua.core_vehicles.getCurrentVehicleDetails()
  if (tmrInit) {
    loaded.init = true // to unlock controls even on a wrong data
    clearTimeout(tmrInit)
    tmrInit = null
  }
  // console.log("VEHICLE", data)
  if (!data) return
  loaded.vehicle = true
  vehicle.vehicle = data
  if (data.model.Brand) vehicle.name = `${data.model.Brand} ${data.model.Name}`
  else vehicle.name = data.configs.Name
  if (data.configs.Configuration) {
    if (data.configs.Source === "BeamNG - Official") {
      vehicle.name += ` - ${data.configs.Configuration}`
    } else {
      vehicle.name += " - Custom" // ?
    }
  }
}

function onStreamsUpdate(streams) {
  if (typeof streams !== "object") return
  if (!streamsList.every(name => name in streams)) return
  const data = streams.electrics
  loaded.status = data.ignitionLevel > 0 // check if electrics is on
  // console.log("ELECTRICS", data)
  for (let key in switches) {
    const svc = switches[key]
    svc.state = svc.value in data && data[svc.value] === svc.on
    vehicle.electrics[key] = svc.state
  }
}

const toggleDrawerCamera = () => {
  console.log("toggleDrawerCamera")
  nextTick(() => {
    drawerCamera.value = !drawerCamera.value

    if (drawerCamera.value) {
      nextTick(() => scopedNav.activateScope(sidemenuScopeIds.camera))
    }
  })
}

const toggleDrawerVehicle = () => {
  nextTick(() => {
    drawerVehicle.value = !drawerVehicle.value
    if (drawerVehicle.value) {
      nextTick(() => scopedNav.activateScope(sidemenuScopeIds.vehicle))
    }
  })
}

const toggleDrawerGarage = () => {
  nextTick(() => {
    drawerGarage.value = !drawerGarage.value
    if (drawerGarage.value) {
      nextTick(() => scopedNav.activateScope(sidemenuScopeIds.garage))
    }
  })
}

const onBack = () => {
  if (vehcomp.value) {
    lua.extensions.ui_router.back()
  }
}

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (!result?.success) return
  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null
  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return

  hasMountedAck.value = true
  await maybeActivateInitialRouteScope(routeName)
}

async function maybeActivateInitialRouteScope(originalRouteName) {
  if (originalRouteName && route.name !== originalRouteName) return
  if (!hasMountedAck.value) return
  if (hasActivatedInitialRouteScope.value) return
  if (!loaded.vehicle && !vehicleWaitTimedOut.value) return

  await nextTick()

  if (originalRouteName && route.name !== originalRouteName) return
  if (!hasMountedAck.value) return
  if (hasActivatedInitialRouteScope.value) return
  if (!loaded.vehicle && !vehicleWaitTimedOut.value) return

  hasActivatedInitialRouteScope.value = true
  activateRouteTargetScope()
}

watch(
  () => route.fullPath,
  async () => {
    lastMountedAckRouteName.value = ""
    hasMountedAck.value = false
    hasActivatedInitialRouteScope.value = false
    vehicleWaitTimedOut.value = false
    await notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(
  [() => loaded.vehicle, vehicleWaitTimedOut],
  ([vehicleReady, timedOut]) => {
    if (vehicleReady || timedOut) maybeActivateInitialRouteScope()
  }
)

onBeforeMount(async () => {
  // // see also play.js
  // $scope.$watch("$parent.app.gameState", gameState => {
  //   // this is to make garage disappear when garage was opened inside freeroam or else
  //   if (gameState !== "garage")
  //     $state.go("play")
  // })

  tmrInit = setTimeout(() => {
    console.log("Unable to get vehicle details in time. Forcing to init...")
    loaded.init = true
    vehicleWaitTimedOut.value = true
    tmrInit = null
  }, 3000)

  events.on("VehicleChange", vehChange)
  api.activeObjectLua("electrics.setIgnitionLevel(1)") // enable electrics w/o ignition

  events.on("garageVehicleDirtied", data => {
    if (typeof data !== "object") return
    vehicle.state.vehicleDirty = !!data.vehicleDirty
    vehicle.state.switchedToNewVehicle = !!data.switchedToNewVehicle
  })

  // garage configs are registered in angular vehicle controller

  events.on("GarageModeBlackscreen", data => blackscreen.value = data.active)

  vehChange() // init

  // garage lighting
  lightState.value = await lua.extensions.gameplay_garageMode.getLighting()
})

watch(() => props.component, (newComp, oldComp) => {
  console.log("newComp", newComp, "oldComp", oldComp)
  setGarageSubview(newComp)
}, { immediate: true })

onUnmounted(() => {
  tmrInit && clearTimeout(tmrInit)
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.garage-layout {
  --layout-menu-buttons-bottom-justify: flex-start;
  --layout-menu-buttons-side-top: 2.8rem;
  --layout-menu-buttons-side-transform: none;
}

.garage-view,
.garage-view * {
  position: relative;
  font-family: "Overpass", var(--fnt-defs);
}

.garage-view {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
  width: 100%;
  padding: 0;
  padding-bottom: 1em; // to align with infobar
  font-size: 16px !important;
  overflow: hidden;
}

.garage-row-title {
  // margin-left: 0.375em;
}

.garage-title-main {
  margin: 0;
}

.garage-row-title,
.garage-row-footer {
  flex: 0 0 auto;
}
.garage-row-main {
  flex: 0 1 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  overflow: hidden; // cef fix
}

.garage-menu-container {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  min-height: 0;
  min-width: 35rem;
  width: 25%;
  max-width: 50rem;
}

.garage-menu-container > * {
  flex: 0 0 auto;
}

.garage-menu {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  padding-bottom: 0.25em;
  margin-bottom: 0.5em;
  /* max-width: 400px; */
}
.garage-menu > * {
  flex: 0 0 10%;
  width: 10%;
}
.garage-menu > * {
  flex-grow: 1;
}
.garage-menu-main .garage-menu::after {
  $size: 0.2em;
  content: "";
  position: absolute;
  bottom: -$size;
  left: 0.25em;
  right: 0.25em;
  height: $size;
  background-color: var(--bng-orange);
  border-radius: 0.1em;
}
:not(.garage-menu-main) > .garage-menu-secondary {
  display: none;
}
.garage-menu-main :deep(.garage-button) {
  max-width: unset !important;
}

.garage-sidemenu {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;
  padding: 0 0.375em;

  &::before {
    // hide focus frame
    content: none !important;
  }

  .garage-sidemenu-title {
    margin: 0.25em;
    padding: 0.2em 0.25em 0.1em 0.25em;
    color: var(--bng-off-white);
    background-color: var(--bng-black-o6);
    border-radius: $border-rad-1;
  }

  .garage-menugroup {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    width: auto;
    height: auto;
    margin: 0.25em;

    > :deep(.drawer-header) {
      position: relative;
      transform: none;
    }

    > :deep(.drawer-header),
    > :deep(.content) {
      background-color: transparent;
    }

    .garage-drawer-header {
      height: 100%;
    }

    .garage-drawer-content {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: stretch;
      height: 100%;
    }
  }
}

.garage-content {
  flex: 1 1 auto;
  height: 100%;
  margin: 0.5em;
  overflow: hidden;
  background: rgba(var(--bng-off-black-rgb), 0.6);
  > :deep(*) {
    // width: 100% !important;
    // height: 100% !important;
    // overflow: hidden;
    color: #fff;
    pointer-events: auto;
    > .bng-card-content {
      height: 100%;
      overflow: auto;
    }
  }
}

.garage-row-bottom {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-left: 0.25rem;
  // margin-bottom: -0.5em;
  max-width: fit-content;
  z-index: 1;
}

/* smaller screen */
@media (max-width: 1280px) {
  .garage-view {
    font-size: 1.094vw !important;
  }
  .garage-menu-container {
    width: 36em;
  }
}

/* portrait mode */
@media (max-width: 1081px) and (orientation: portrait) {
  .garage-view {
    font-size: 1.95vw !important;
  }
  .garage-menu-container {
    width: 80%;
  }
  .garage-row-main {
    flex-direction: column;
  }
}

.garage-blackscreen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  pointer-events: none;
  opacity: 0;
  /* transition: opacity 100ms; */
  z-index: calc(var(--zorder_main_menu_navigation_focus) + 1);
}
.garage-blackscreen-active {
  opacity: 1;
  pointer-events: all !important;
}
</style>
