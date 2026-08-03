<template>
  <ComputerWrapper
    :path="[vehicleShoppingStore.vehicleShoppingData.currentSellerNiceName || $translate.instant('ui.career.vehicleShopping.vehicleMarketplace')]"
    :title="headerTitle"
    @back="close"
  >
    <template #status>
      {{ $translate.instant("ui.career.vehicleShopping.freeInventorySlots") }} {{ vehicleShoppingStore ? vehicleShoppingStore.vehicleShoppingData.numberOfFreeSlots : 0 }}
    </template>

    <div
      v-bng-scoped-nav="{
        scopeId: 'vehicle-shopping',
        preferAutoFocus: true,
      }"
      class="flex-container"
      v-bng-on-ui-nav:tab_l="onTabLeft"
      v-bng-on-ui-nav:tab_r="onTabRight"
      >
      <div class="content" v-bng-blur="1"> <!-- content -->
        <Tabs ref="tabsRef" class="bng-tabs" :show-tab-list="tabs.length > 1" :selectedIndex="selectedTab" @change="onTabsChange">
          <TabList>
            <template #before>
              <div class="vehicle-shopping-tabs-side vehicle-shopping-tabs-side-start" bng-no-child-nav="true">
                <BngButton
                  class="vehicle-shopping-tabs-arrow"
                  :accent="ACCENTS.ghost"
                  bng-no-nav
                  tabindex="-1"
                  @click="goPrevTab"
                >
                  <BngIcon :type="icons.arrowLargeLeft" />
                  <span class="vehicle-shopping-tabs-binding-slot">
                    <BngBinding class="vehicle-shopping-tabs-binding" ui-event="tab_l" controller track-ignore />
                  </span>
                </BngButton>
              </div>
            </template>
            <template #after>
              <div class="vehicle-shopping-tabs-side vehicle-shopping-tabs-side-end" bng-no-child-nav="true">
                <BngButton
                  class="vehicle-shopping-tabs-arrow"
                  :accent="ACCENTS.ghost"
                  bng-no-nav
                  tabindex="-1"
                  @click="goNextTab"
                >
                  <span class="vehicle-shopping-tabs-binding-slot">
                    <BngBinding class="vehicle-shopping-tabs-binding" ui-event="tab_r" controller track-ignore />
                  </span>
                  <BngIcon :type="icons.arrowLargeRight" />
                </BngButton>
              </div>
            </template>
          </TabList>

          <div v-if="buyingAvailable" :tab-heading="buyVehicleTitle" class="buying-tab-content">
            <BngCard v-if="isReady" class="buying-card">
              <div v-if="vehicleShoppingStore.vehicleShoppingData.uiDealershipsData && Object.keys(vehicleShoppingStore.vehicleShoppingData.uiDealershipsData).length">
                <div class="seller-grid">
                  <BngButton
                    v-for="dealership in vehicleShoppingStore.vehicleShoppingData.uiDealershipsData"
                    :key="dealership.id"
                    class="seller-card"
                    :class="{ disabled: dealership.disabled }"
                    :accent="ACCENTS.custom_old"
                    :title="dealership.disabled && dealership.disabledReason ? dealership.disabledReason : null"
                    @click="dealership.vehicleCount && !dealership.disabled && selectSeller(dealership.id)"
                  >
                    <div
                      class="seller-card__surface"
                      :style="{
                        '--seller-card-background': 'linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0)), url(' + ((dealership.preview && dealership.preview[0] === '/' ? dealership.preview : '/' + dealership.preview)) + ')'
                      }"
                    >
                      <div class="seller-card__background"></div>
                      <div class="seller-card__label">

                        <div class="seller-card__header">
                          <div class="seller-card__title"><BngIcon :type="dealership.icon" />{{ dealership.name }}</div>
                          <div v-if="dealership.description" class="seller-card__subtitle">{{ dealership.description }}</div>
                        </div>
                        <div class="seller-card__vehicle-thumbnails">
                          <template v-for="(vehicle, index) in getDealershipVehicles(dealership.id).slice(0, 5)">
                            <div class="seller-card__vehicle-thumbnail">
                              <AspectRatio :ratio="'16:9'" class="seller-card__vehicle-thumbnail-image" :external-image="vehicle.preview" >
                                <div v-if="index == 0 && getDealershipVehicles(dealership.id).length > 5" class="more-label">
                                  +{{ getDealershipVehicles(dealership.id).length - 4 }}
                                </div>
                                <div v-if="vehicle.discountPercentage > 0" class="discount-percentage">

                                </div>
                              </AspectRatio>
                            </div>

                          </template>

                        </div>
                      </div>
                      <div v-if="dealership.disabled && dealership.disabledReason" class="seller-card__disabled-reason">
                        {{ dealership.disabledReason }}
                      </div>
                    </div>
                  </BngButton>
                </div>
              </div>
              <div v-else>
                <span>{{ $translate.instant("ui.career.vehicleShopping.noSellersAvailable") }}</span>
              </div>
            </BngCard>
            <BngCard v-else>
              <BngCardHeading style="color: #fff;">{{ $translate.instant("ui.career.vehicleShopping.pleaseWait") }}</BngCardHeading>
            </BngCard>
          </div>

          <div v-if="marketplaceAvailable" :tab-heading="sellVehicleTitle" class="marketplace-tab-content">
            <VehicleMarketplace />
          </div>
        </Tabs>
      </div>
    </div>
  </ComputerWrapper>
</template>

<script setup>
import { ref, onBeforeMount, onUnmounted, nextTick, computed, watch } from "vue"
import { BngCard, BngCardHeading, BngButton, ACCENTS, BngIcon, BngBinding, icons } from "@/common/components/base"
import { Tabs, TabList, AspectRatio } from "@/common/components/utility"
import { useVehicleShoppingStore } from "../stores/vehicleShoppingStore"
import ComputerWrapper from "./ComputerWrapper.vue"
import VehicleMarketplace from "../components/vehicleShopping/VehicleMarketplace.vue"
import { lua } from "@/bridge"
import { useRoute } from "vue-router"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { vBngOnUiNav, vBngBlur, vBngScopedNav } from "@/common/directives"
import { $translate } from "@/services/translation"

const buyVehicleTitle = $translate.instant("ui.career.vehicleShopping.buyVehicles")
const sellVehicleTitle = $translate.instant("ui.career.vehicleShopping.sellVehicles")

const route = useRoute()
const vehicleShoppingStore = useVehicleShoppingStore()

const selectedTab = ref(0)
const tabsRef = ref(null)

// Availability/tab state is owned by Lua and arrives via the vehicleShoppingData
// guihook payload; the UI reads it back instead of holding its own copy.
const buyingAvailable = computed(() => !!vehicleShoppingStore.vehicleShoppingData.buyingAvailable)
const marketplaceAvailable = computed(() => !!vehicleShoppingStore.vehicleShoppingData.marketplaceAvailable)

// Shopping data arrives from Lua (vehicleShoppingData event) after mount; gate the
// screen, the routeMounted ack, and scope activation on it being present.
const isReady = computed(() => Object.keys(vehicleShoppingStore.vehicleShoppingData || {}).length > 0)

const tabs = computed(() => {
  let tabs = []
  if (buyingAvailable.value) {
    tabs.push(buyVehicleTitle)
  }
  if (marketplaceAvailable.value) {
    tabs.push(sellVehicleTitle)
  }
  return tabs
})

const goPrevTab = () => tabsRef.value?.goPrev?.()
const goNextTab = () => tabsRef.value?.goNext?.()
const onTabLeft = () => goPrevTab()
const onTabRight = () => goNextTab()

const onTabsChange = (tab) => {
  if (!tab) return
  selectedTab.value = tab.index
}

const headerTitle = computed(() => {
  switch (tabs.value[selectedTab.value]) {
    case buyVehicleTitle:
      return $translate.instant("ui.career.vehicleShopping.buyVehicles")
    case sellVehicleTitle:
      return $translate.instant("ui.career.vehicleShopping.sellVehicles")
    default:
      return $translate.instant("ui.career.vehicleShopping.availableVehicles")
  }
})

// Selecting a dealership is a Lua-owned action: it stores the seller, fires the
// tutorial hook, pushes fresh data, and navigates to the vehicle list route.
const selectSeller = (sellerId) => lua.career_modules_vehicleShopping.selectSeller(sellerId)

const dealershipVehiclesMap = computed(() => {
  const map = new Map()
  if (!vehicleShoppingStore.vehicleShoppingData.vehiclesInShop) return map

  vehicleShoppingStore.vehicleShoppingData.vehiclesInShop
    .filter(vehicle => vehicle.preview)
    .forEach(vehicle => {
      if (!map.has(vehicle.sellerId)) {
        map.set(vehicle.sellerId, [])
      }
      map.get(vehicle.sellerId).push(vehicle)
    })

  return map
})

const getDealershipVehicles = (dealershipId) => {
  return dealershipVehiclesMap.value.get(dealershipId) || []
}

// Apply the Lua-owned tab selection once the first data payload lands.
let initialized = false
const initFromData = () => {
  if (initialized) return
  initialized = true

  const screenTag = vehicleShoppingStore.vehicleShoppingData.screenTag
  const idx = tabs.value.indexOf(screenTag === "marketplace" ? sellVehicleTitle : buyVehicleTitle)
  selectedTab.value = Math.max(idx, 0)
}

// handlesOwnReady flow: ack the mount and activate the route target scope only
// once the data is present and rendered, so autofocus lands on a real entry.
const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return
  if (!isReady.value) return

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
}

watch(
  () => route.fullPath,
  () => {
    lastMountedAckRouteName.value = ""
    notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(isReady, ready => {
  if (!ready) return
  initFromData()
  notifyRouteMountedWhenReady()
})

const start = () => {
  vehicleShoppingStore.requestInitialData()
  if (isReady.value) initFromData()
}

// The seller grid and the .vehicles list are sibling routes sharing one store.
// Only tear down when leaving the whole vehicleShopping family; navigating to
// .vehicles must not dispose the shared listener or close the shopping menu.
const SHOPPING_ROUTE_FAMILY = "career.computer.vehicleShopping"
const isLeavingShoppingFamily = () => {
  const name = route.name
  return !(name === SHOPPING_ROUTE_FAMILY || (typeof name === "string" && name.startsWith(SHOPPING_ROUTE_FAMILY + ".")))
}

const kill = () => {
  if (!isLeavingShoppingFamily()) return
  vehicleShoppingStore.leaveShopping()
}

// BACK: hand off to the router, whose back handler exits shopping. The seller
// vehicle list is now its own route, so it handles its own back navigation.
const close = () => {
  lua.extensions.ui_router.back()
}

onBeforeMount(start)
onUnmounted(kill)
</script>

<style scoped lang="scss">
.active-tab {
  background-color: var(--bng-accents);
  color: white;
}

.flex-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 80rem;
  position: relative;
}

.tabs {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.content :deep(.bng-tabs) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  --tab-bg: var(--bng-black-o8, 0.5);
  --tab-content-bg: var(--bng-black-o8, 0.5);
  --tab-list-corners: var(--bng-corners-2);
  --tab-content-corners: var(--bng-corners-2);
  .tab-list {
    >* {
      flex: 1 auto;
      max-width: none;
      background-color: rgba(var(--bng-cool-gray-400-rgb), 0.1);
    }
  }
}

.content :deep(.tab-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.content :deep(.tab-content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.buying-tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  :deep(.bng-card) {
    --bg-opacity: 0.0;
  }
}

.marketplace-tab-content {
  padding: 0.5em;
}

.vehicle-shopping-tabs-side {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.vehicle-shopping-tabs-side-start {
  justify-content: flex-end;
}

.vehicle-shopping-tabs-side-end {
  justify-content: flex-start;
}

.vehicle-shopping-tabs-arrow {
  --bng-button-margin: 0;
  --bng-button-min-width: 2.5rem;
  --bng-button-padding: 0.35rem;
  --bng-icon-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.vehicle-shopping-tabs-binding-slot {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vehicle-shopping-tabs-binding {
  pointer-events: none;
}
/* Seller grid/cards */
.seller-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
  gap: 0.5em;
  padding: 0.5em;
}

.seller-card {
  --bng-button-min-width: 0;
  --bng-button-max-width: 100%;
  --bng-button-margin: 0;
  --bng-button-padding: 0;
  --bng-button-padding-top: 0;
  --bng-button-padding-bottom: 0;
  --bng-button-custom-enabled: transparent;
  --bng-button-custom-hover: transparent;
  --bng-button-custom-active: transparent;
  --bng-button-custom-disabled: transparent;
  --bng-button-custom-enabled-opacity: 1;
  --bng-button-custom-hover-opacity: 1;
  --bng-button-custom-active-opacity: 1;
  --bng-button-custom-disabled-opacity: 1;
  --bng-button-custom-border-enabled: transparent;
  --bng-button-custom-border-hover: transparent;
  --bng-button-custom-border-active: transparent;
  --bng-button-custom-border-disabled: transparent;

  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  border-radius: 0;
  cursor: pointer;
  height: 14em;
  width: 100%;
  max-width: 100%;
  color: var(--bng-off-white-brighter);
}

.seller-card__surface {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  overflow: hidden;
  border-radius: var(--bng-corners-2);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-sizing: border-box;
  height: 100%;
  width: 100%;
}

.seller-card__background {
  position: absolute;
  inset: 0;
  background-image: var(--seller-card-background);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* Uniform dark overlay over image */
  background-color: rgba(0, 0, 0, 0.1);
  background-blend-mode: multiply;
  transform: scale(1);
  transform-origin: center center;
  transition: transform 160ms ease, background-color 160ms ease;
}

.seller-card__label {
  position: relative;
  z-index: 1;
}

.seller-card:hover .seller-card__background {
  background-color: rgba(0, 0, 0, 0.0);
  border-color: rgba(255, 255, 255, 0.12);
}

.seller-card:focus .seller-card__background,
.seller-card:focus-within .seller-card__background,
.seller-card.focus-visible .seller-card__background {
  transform: scale(1.04);
}

.seller-card.disabled {
  cursor: not-allowed;
}

.seller-card.disabled .seller-card__background,
.seller-card.disabled .seller-card__vehicle-thumbnail-image {
  filter: grayscale(100%) brightness(0.6);
  opacity: 1;
}

.seller-card.disabled .seller-card__title,
.seller-card.disabled .seller-card__subtitle {
  color: var(--bng-cool-gray-200);
}

.seller-card.disabled:hover {
  .seller-card__background {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.seller-card__disabled-reason {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  width: calc(100% - 2rem);
  max-width: 24rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--bng-corners-1);
  background-color: rgba(0, 0, 0, 0.8);
  color: var(--bng-off-white);
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.25;
  opacity: 0;
  transition: opacity 120ms ease;
  pointer-events: none;
}

.seller-card.disabled:hover .seller-card__disabled-reason,
.seller-card.disabled:focus .seller-card__disabled-reason,
.seller-card.disabled:focus-within .seller-card__disabled-reason {
  opacity: 1;
}

.seller-card__label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  height: 100%;
}

.seller-card__header {
  padding: 0.75rem;
}

.seller-card__title {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 0.25rem;
  :deep(.icon-base) {
    margin-right: 0.5rem;
  }
}

.seller-card__subtitle {
  font-size: 0.8rem;
  font-weight: 200;
  padding-top: 0;
}

.seller-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.seller-card__vehicle-thumbnails {
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: nowrap;
  align-items: flex-end;
  justify-content: flex-end;
  width: 100%;
  margin-top: auto;

  gap: 0.25em;
  padding: 0.25em;
  background: linear-gradient(to top, rgba(0, 0, 0, 1) 0, rgba(0, 0, 0, 0.8) 2rem, rgba(0, 0, 0, 0) 100%);
  overflow: hidden;
  height: 5rem;


  .seller-card__vehicle-thumbnail-image {
    width: 4.8em;
    border-radius: var(--bng-corners-1);
    overflow: hidden;
    position: relative;
    .more-label {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.75);
      color: white;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .discount-percentage {
      content: "";
      position: absolute;
      background-color: var(--bng-add-green-400);
      top: 0;
      right: 0;
      width: 0.6em;
      height: 0.4em;
      border-bottom-left-radius: var(--bng-corners-1);
      z-index: 1;

    }
  }

}

.availability {
  padding: 0.25rem 0.5rem;
  border-radius: var(--bng-corners-1);
  background-color: var(--bng-orange-500);

  font-weight: 600;
  font-size: 0.85rem;
}

.availability.empty {
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}
</style>
