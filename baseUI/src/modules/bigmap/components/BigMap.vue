<template>
  <div v-if="transitionFinished" ref="bigmapContainerRef" class="bigmap-container">
    <div
      v-bng-scoped-nav="{
        scopeId: BIGMAP_SCOPE_CAMERA_ID,
        type: SCOPED_NAV_TYPES.nonav,
        bubbleWhitelistEvents: ['menu'],
        canBubbleEvent: canBubbleBackEvent,
        canDeactivate: () => false,
      }"
      v-bng-on-ui-nav:back,menu="handleBack"
      v-bng-on-ui-nav:focus_u,focus_d,focus_l,focus_r,focus_ud,focus_lr="onBigmapCameraFocusNavigate"
      v-bng-on-ui-nav:tab_l="onTabLeft"
      v-bng-on-ui-nav:tab_r="onTabRight"
      v-bng-on-ui-nav:action_3="onCyclePoiListDisplayMode"
      v-bng-on-ui-nav:action_2="confirmTaxiDestinationFromNav"
      v-bng-ui-nav-label:action_3="switchViewLabel"
      v-bng-ui-nav-label:tab_l,tab_r="switchTypeLabel"
    ></div>

    <div
      v-bng-scoped-nav="{
        scopeId: BIGMAP_SCOPE_ID,
        preferAutoFocus: true,
        bubbleWhitelistEvents: ['tab_l', 'tab_r', 'menu'],
        canBubbleEvent: canBubbleBackEvent,
        canDeactivate: () => false,
      }"
      v-bng-on-ui-nav:back,menu="handleBack"
      v-bng-on-ui-nav:action_3="onCyclePoiListDisplayMode"
      v-bng-on-ui-nav:action_2="confirmTaxiDestinationFromNav"
      v-bng-ui-nav-label:action_3="switchViewLabel"
      v-bng-ui-nav-label:tab_l,tab_r="switchTypeLabel"
      class="bigmap-content"
      bng-no-nav="true"
      tabindex="-1"
    >
      <div class="bigmap-left-content">
        <div class="bigmap-header-wrapper" v-bng-blur="true">
          <div class="header-row">
            <BngScreenHeadingV2 type="2" class="header-title-v2">
              {{ currentFilterTitle }}
            </BngScreenHeadingV2>
            <div class="bigmap-preheadings">
              <div v-for="preheading in translatedPreheadings" :key="preheading.key">
                {{ preheading }}
              </div>
            </div>
          </div>
        </div>
        <PoiFilters
          v-bng-on-ui-nav:tab_l="onTabLeft"
          v-bng-on-ui-nav:tab_r="onTabRight"
          v-bng-ui-nav-label:tab_l,tab_r="switchTypeLabel"
          v-bng-blur="true"
          class="bigmap-poi-filters-outline"
          :class="{ 'hidden-poi-list': poiListDisplayMode === POI_LIST_DISPLAY_MODE.HIDDEN }"
          @toggleGroupVisibility="onToggleGroupVisibility"
        />
        <div
          v-bng-blur="true"
          ref="poiListContainerRef"
          class="bigmap-poilist-outline"
          :class="{ 'hidden': poiListDisplayMode === POI_LIST_DISPLAY_MODE.HIDDEN }"
          @focusin="onPoiListFocusIn"
        >
          <PoiList
            class="bigmap-poilist"
            :group-data="groupData"
            :poi-data="poiData"
            :selected-poi="selectedPoi"
            :selected-poi-ids="selectedPoiIds"
            :poi-list-display-mode="poiListDisplayMode"
            @select-poi="onSelectPoi"
            @hover-poi="onHover"
          />
        </div>
        <div v-if="poiListDisplayMode === POI_LIST_DISPLAY_MODE.HIDDEN">

        </div>
      </div>

      <div class="bigmap-center-outline">
        <div v-if="isTaxiMode" class="taxi-prompt" v-bng-blur="true">
          <BngIcon type="location1" />
          <span>{{ taxiDestinationPreviewed ? $t("ui.taxi.bigmap.destinationSelected") : $t(isControllerUsed ? "ui.taxi.bigmap.chooseDestinationController" : "ui.taxi.bigmap.chooseDestination") }}</span>
          <BngBinding v-if="!taxiDestinationPreviewed && isControllerUsed" action="bigMapControllerSelect" show-unassigned />
          <span v-if="taxiRouteInfo?.routeLength" class="taxi-route-length">{{ taxiRouteInfo.routeLength }}</span>
        </div>
        <BngButton v-if="isTaxiMode && taxiDestinationPreviewed" accent="attention" @click="confirmTaxiDestination">
          <BngBinding ui-event="action_2" controller />
          {{ $t("ui.taxi.bigmap.confirmDestination") }}
        </BngButton>
      </div>
      <div class="bigmap-details-outline">
        <div class="bigmap-tasklist-wrapper">
          <Tasklist />
        </div>
        <div class="bigmap-details-outline-divider"></div>
        <div
          ref="detailsWrapperRef"
          tabindex="-1"
          class="bigmap-poi-details-wrapper"
          v-bng-scoped-nav="{ scopeId: BIGMAP_DETAILS_SCOPE_ID, type: SCOPED_NAV_TYPES.nonav, bubbleWhitelistEvents: ['menu'] }"
          v-bng-on-ui-nav:menu="handleBack"
          v-bng-on-ui-nav:ok="onDetailsPrimaryAction"
          v-bng-on-ui-nav:action_2="onDetailsSecondaryAction"
          v-bng-on-ui-nav:tab_l="onDetailsTabLeft"
          v-bng-on-ui-nav:tab_r="onDetailsTabRight"
          v-bng-ui-nav-label:ok="detailsPrimaryLabel"
          v-bng-ui-nav-label:action_2="detailsSecondaryLabel"
          v-bng-ui-nav-label:tab_l,tab_r="cyclePoiLabel"
          @activate="onDetailsActivate"
          @deactivate="onDetailsDeactivate"
        >
          <PoiDetails
            v-if="isDetailsVisible"
            :selected-poi="selectedPoi"
            :selected-poi-ids="selectedPoiIds"
            :poi-data="poiData"
            :is-taxi-mode="isTaxiMode"
            :taxi-destination-previewed="taxiDestinationPreviewed"
            @select-poi="onSelectPoi"
            @execute-poi-action="onExecutePoiAction"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick, provide } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { BngScreenHeadingV2, BngIcon, BngButton, BngBinding } from "@/common/components/base"
import { SCOPED_NAV_TYPES } from "@/services/scopedNav/constants"
import { vBngOnUiNav, vBngScopedNav, vBngBlur, vBngUiNavLabel } from "@/common/directives"
import { useScopedNav, activateRouteTargetScope } from "@/services/scopedNav/api"
import useControls from "@/services/controls"
import { useRouteDataStore } from "@/services/routeData"
import { storeToRefs } from "pinia"
import { useEvents } from "@/services/events"
import PoiList from "./PoiList.vue"
import PoiDetails from "./PoiDetails.vue"
import PoiFilters from "./PoiFilters.vue"
import { Tasklist } from "@/modules/apps"
import useBigMap, { BIGMAP_KEY } from "../composables/useBigMap"
import { POI_LIST_DISPLAY_MODE } from "../constants"
import useBigMapHints, {
  BIGMAP_SCOPE_ID,
  BIGMAP_DETAILS_SCOPE_ID,
  BIGMAP_SCOPE_CAMERA_ID,
  BIGMAP_LAYOUT_SCOPE_ID,
} from "../composables/useBigMapHints"

const props = defineProps({
  instant: {
    type: Boolean,
    default: false,
  },
  isMenuBigmap: {
    type: Boolean,
    default: false,
  },
})

const { isControllerUsed } = storeToRefs(useControls())
const route = useRoute()
const routeDataStore = useRouteDataStore()
const events = useEvents()

const taxiDestinationPreviewed = ref(false)
const taxiRouteInfo = ref(null)
events.on("TaxiDestinationPreviewed", (data) => {
  taxiDestinationPreviewed.value = !!data?.set
  taxiRouteInfo.value = data?.set ? data : null
})
const confirmTaxiDestination = () => lua.gameplay_taxi.confirmTaxiDestination()
const confirmTaxiDestinationFromNav = () => {
  if (taxiDestinationPreviewed.value) confirmTaxiDestination()
}

const effectiveInstant = computed(() => {
  const luaInstant = routeDataStore.route?.params?.instant
  return luaInstant === true || luaInstant === "true" || props.instant
})
const isTaxiMode = computed(() => routeDataStore.route?.params?.mode === "taxi")
const bigMapStore = useBigMap({ instant: effectiveInstant, isMenuBigmap: props.isMenuBigmap, isControllerUsed: isControllerUsed.value })
provide(BIGMAP_KEY, bigMapStore)

const poiListContainerRef = ref(null)
const detailsWrapperRef = ref(null)
const bigmapContainerRef = ref(null)

const { activateScope } = useScopedNav()

const {
  switchViewLabel,
  switchTypeLabel,
  cyclePoiLabel,
  detailsPrimaryLabel,
  detailsSecondaryLabel,
  findPoiAction,
} = useBigMapHints({
  isTaxiMode,
  taxiDestinationPreviewed,
  selectedPoi: bigMapStore.selectedPoi,
  isControllerUsed
})

const {
  isDetailsVisible,
  selectedPoi,
  selectedPoiIds,
  groupData,
  poiData,
  currentFilterTitle,
  translatedPreheadings,
  onHover,
  poiListDisplayMode,
  transitionFinished,
  enableBigMapControls,
  setUiNavigationActive,
  cyclePoiListDisplayMode,
  toggleGroupVisibility,
  initialize,
  cleanup,
} = bigMapStore

function hasActivePoiSelection() {
  return isDetailsVisible.value || !!selectedPoi.value || selectedPoiIds.value.length > 0
}

// Only blur focus that BigMap itself owns. Late BigmapCameraMove / BigmapMouseOverMap
// events can arrive after another scope (e.g. a tutorial popup) has taken focus, and
// must not steal focus out of that scope's DOM.
function blurActiveElement() {
  const activeElement = document.activeElement
  const root = bigmapContainerRef.value
  if (!root || !activeElement || activeElement === document.body) return
  if (!root.contains(activeElement)) return
  if (typeof activeElement.blur === "function") activeElement.blur()
}

async function handleBigmapCameraMove() {
  if (hasActivePoiSelection()) {
    isDetailsVisible.value = false
    selectedPoi.value = null
    selectedPoiIds.value = []
    await bigMapStore.selectPoi()
    activateScope(BIGMAP_SCOPE_CAMERA_ID)
    return
  }

  blurActiveElement()
  activateScope(BIGMAP_SCOPE_CAMERA_ID)
}

// Lua's mouse-over-map notification fires once when the cursor transitions onto the map,
// but can arrive before transitionFinished / the scope tree mounts. Remember it and replay
// it once the route's target scope has actually been activated (see notifyRouteMountedWhenReady),
// otherwise the map gets stuck in list-focus navigation.
let mouseOverMapPendingActivation = false

// Panning only fires BigmapCameraMove, so moving the mouse over the map without panning
// never leaves list-focus navigation. Once the cursor is confirmed to be over the native map
// (and nothing is selected yet), switch into the exploration scope too.
function handleBigmapMouseOverMap() {
  if (isControllerUsed.value) return
  if (hasActivePoiSelection()) return

  mouseOverMapPendingActivation = true

  blurActiveElement()
  activateScope(BIGMAP_SCOPE_CAMERA_ID)
}

let isCameraMoveListenerActive = false

function setCameraMoveListener(enabled) {
  if (enabled && !isCameraMoveListenerActive) {
    events.on("BigmapCameraMove", handleBigmapCameraMove)
    events.on("BigmapMouseOverMap", handleBigmapMouseOverMap)
    isCameraMoveListenerActive = true
    return
  }

  if (!enabled && isCameraMoveListenerActive) {
    events.off("BigmapCameraMove", handleBigmapCameraMove)
    events.off("BigmapMouseOverMap", handleBigmapMouseOverMap)
    isCameraMoveListenerActive = false
  }
}

function onBigmapCameraFocusNavigate() {
  if (hasActivePoiSelection()) {
    return false
  }

  activateScope(BIGMAP_SCOPE_ID)
  return false
}

function canBubbleBackEvent(event) {
  if (event.detail.name === "back") {
    return routeDataStore.route.name !== "bigmap"
  }
  return false
}

function handleBack() {
  if (routeDataStore.route.name === "pause.career.branch.bigmap") {
    const params = routeDataStore.route?.params || {}
    lua.extensions.ui_router.navigate("pause.career.branch", {
      pathId: params.pathId,
      returnRoute: params.returnRoute,
    })
    return false
  }
  if (routeDataStore.route.name === "bigmap") {
    lua.freeroam_bigMapMode.toggleBigMap()
  }
  return true
}

let mountedAckRequestId = 0
const lastMountedAckRouteName = ref("")

async function notifyRouteMountedWhenReady() {
  if (!transitionFinished.value) return

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

  activateRouteTargetScope()

  if (mouseOverMapPendingActivation) {
    mouseOverMapPendingActivation = false
    activateScope(BIGMAP_SCOPE_CAMERA_ID)
  }
}

watch(
  () => route.fullPath,
  async () => {
    lastMountedAckRouteName.value = ""
    mountedAckRequestId += 1
    await notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

function syncDetailsScopeActivation() {
  if (!transitionFinished.value) return

  if (isDetailsVisible.value) {
    nextTick(() => activateScope(BIGMAP_DETAILS_SCOPE_ID))
  }
}

watch(() => isDetailsVisible.value, syncDetailsScopeActivation, { immediate: true })

watch(transitionFinished, async (isFinished) => {
  if (!isFinished) return
  await notifyRouteMountedWhenReady()
})

watch(effectiveInstant, async (isInstant) => {
  if (!isInstant || transitionFinished.value) return
  await nextTick()
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(resolve))
  }
  transitionFinished.value = true
})

function onToggleGroupVisibility(groupKey) {
  toggleGroupVisibility(groupKey)
}

function onTabLeft() {
  bigMapStore.goToPreviousFilterSection()
}

function onTabRight() {
  bigMapStore.goToNextFilterSection()
}

function getSelectablePoiIds() {
  if (!Array.isArray(selectedPoiIds.value) || selectedPoiIds.value.length === 0) {
    return []
  }

  return selectedPoiIds.value.filter(poiId => !!poiData.value?.[poiId])
}

async function cycleSelectedPoi(step) {
  const selectablePoiIds = getSelectablePoiIds()
  if (selectablePoiIds.length <= 1) return

  const currentPoiId = selectedPoi.value?.id
  const currentIndex = selectablePoiIds.indexOf(currentPoiId)
  const startIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (startIndex + step + selectablePoiIds.length) % selectablePoiIds.length
  const nextPoiId = selectablePoiIds[nextIndex]

  if (!nextPoiId || nextPoiId === currentPoiId) return
  await onSelectPoi(nextPoiId)
}

function onDetailsTabLeft() {
  cycleSelectedPoi(-1)
}

function onDetailsTabRight() {
  cycleSelectedPoi(1)
}

function onDetailsPrimaryAction() {
  const setRouteAction = findPoiAction("setRoute")
  if (setRouteAction) onExecutePoiAction(setRouteAction.actionId)
}

function onDetailsSecondaryAction() {
  if (isTaxiMode.value) {
    confirmTaxiDestinationFromNav()
    return
  }

  const quickTravelAction = findPoiAction("quickTravel")
  if (quickTravelAction) onExecutePoiAction(quickTravelAction.actionId)
}

function onCyclePoiListDisplayMode() {
  // the handler needs to return `undefined`
  cyclePoiListDisplayMode()
}

function onDetailsDeactivate(event) {
  const reason = event?.detail?.reason

  if (isDetailsVisible.value &&
    (
      reason === "descendant-scope-activation" ||
      (reason === "parent-scope-resumed" && event?.detail?.parentScopeId === BIGMAP_LAYOUT_SCOPE_ID)
    )) {
    nextTick(() => activateScope(BIGMAP_DETAILS_SCOPE_ID))
    return
  }

  nextTick(() => {
    isDetailsVisible.value = false
    bigMapStore.selectPoi()
  })
}

function onPoiListFocusIn() {
  setUiNavigationActive(true)
}

function onDetailsActivate() {
  setUiNavigationActive(true)
  // Focus the nonav wrapper so its ok/action_2 hints show
  nextTick(() => detailsWrapperRef.value?.focus())
}

async function onSelectPoi(poiId) {
  await bigMapStore.selectPoi(poiId)
  activateScope(BIGMAP_DETAILS_SCOPE_ID)
}

async function onExecutePoiAction(actionId) {
  await bigMapStore.executePoiAction(actionId)
}

onMounted(() => {
  initialize()
  enableBigMapControls(true)
  setUiNavigationActive(true)
  setCameraMoveListener(true)
})

onUnmounted(() => {
  setUiNavigationActive(false)
  enableBigMapControls(false)
  cleanup()
  setCameraMoveListener(false)
})
</script>

<style lang="scss" scoped>
$width: 25rem;

.bigmap-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bigmap-header-wrapper {
  width: $width;
  flex: 0 0 auto;
}

.bigmap-preheadings {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
  align-items: center;
  color: var(--bng-off-white);
  padding: 0 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  background-color: rgba(255, 255, 255, 0.05);

}

.bigmap-preheading {
  font-size: 0.75rem;
  opacity: 0.5;
}

.header-row {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.20rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0 0.5rem 0 0;
  background-color: rgba(16, 16, 16, 0.75);
  --bng-heading-background-opacity: 0;
  min-height: 3.6rem;
  flex: 0 0 auto;
  width: 100%;
  min-width: fit-content;
}

.header-title-v2 {
  :deep(.header) {
    >h1 {
      font-weight: 1000 !important;
    }
  }
}

.bigmap-content {
  flex: 1 1 auto;
  display: flex;
  overflow: hidden;
}


.bigmap-left-content {
  flex: 0 1 auto;
  min-height: 1px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  margin-top: 0.5rem;
  width: $width;
  position: relative;
}

.bigmap-poi-filters-outline {
  background-color: rgba(16, 16, 16, 0.6);
  width: 100%;
  padding: 0.5rem;
  justify-content: space-between;

  &.hidden-poi-list {
    border-radius: 0 0 0.5rem 0;
  }
}

.bigmap-poilist-outline {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(16, 16, 16, 0.5);
  border-radius: 0 0 0.5rem 0;

  &.hidden {
    border-top: none;
    height: 0;
    max-height: 0;
  }
}

.bigmap-poilist {
  width: $width;
  height: 100%;
  overflow: hidden;
}

.bigmap-center-outline {
  flex: 1;
  border-radius: 0;
  box-sizing: border-box;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.taxi-prompt {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.2rem;
  margin-top: 1rem;
  border-radius: var(--bng-corners-2);
  background-color: rgba(16, 16, 16, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: var(--fnt-defs);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  --bng-icon-size: 2em;

  .taxi-route-length {
    opacity: 0.6;
    font-weight: 400;
  }
}

.bigmap-details-outline {
  width: $width;
  flex: none;
  border-radius: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-self: flex-end;
  height: 100%;
  min-height: 0;
}

.bigmap-tasklist-wrapper {
  flex: 0 0 auto;
  align-self: flex-start;
  width: 100%;
}

.bigmap-details-outline-divider {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
}

.bigmap-poi-details-wrapper {
  flex: 0 0 auto;
  align-self: flex-start;
  width: 100%;
}
</style>