<template>
  <LayoutMenu
    class="purchase-layout"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumbs="true"
    :hide-breadcrumb-last-item="false"
    @breadcrumb-click="breadcrumbClick"
    @breadcrumb-back="cancel"
  >
    <template #topbar-right>
      <BngCard class="status-container" v-bng-blur="true">
        <CareerStatus class="profile-status" />
      </BngCard>
    </template>

    <BngCard
      v-if="vehiclePurchaseStore.vehicleInfo.niceName"
      v-bng-scoped-nav="{ scopeId: 'vehicle-purchase', preferAutoFocus: true }"
      class="purchase-screen"
      v-bng-blur="1"
    >
      <div class="header-row">
        <BngCardHeading type="ribbon">
          {{ $translate.instant("ui.career.vehiclePurchase.purchaseInformation") }}
          <div class="header-seller-info">
            {{ $translate.instant("ui.career.vehiclePurchase.purchasingFrom", { sellerName: vehiclePurchaseStore.vehicleInfo.sellerName }) }}
          </div>
        </BngCardHeading>
        <BngButton class="close-button" @click="cancel" :accent="ACCENTS.attention" bng-no-nav="true" tabindex="-1">
          <BngBinding ui-event="back" controller />
          <BngIcon
            type="xmarkBold"
              :color="'var(--bng-cool-gray-100)'"
            />
        </BngButton>
      </div>

      <div class="purchase-list">
        <div class="purchase-row">
          <div class="label">
            <div>{{ vehiclePurchaseStore.vehicleInfo.year }} {{ vehiclePurchaseStore.vehicleInfo.niceName }}</div>
            <div class="sub-info">({{ units.buildString("length", vehiclePurchaseStore.vehicleInfo.Mileage, 0) }})</div>
          </div>
          <div class="price">
            <div class="current-price-line">
              <span v-if="vehiclePurchaseStore.vehicleInfo.originalSellValue" class="old-price">
                <BngUnit :money="vehiclePurchaseStore.vehicleInfo.originalSellValue" />
              </span>
              <BngUnit class="money" :money="vehiclePurchaseStore.vehicleInfo.Value" />
            </div>
            <div class="sub-info">
              <div>
                {{ $translate.instant("ui.career.vehiclePurchase.estMarket") }}
                <BngUnit class="money" :money="vehiclePurchaseStore.vehicleInfo.marketValue" />
              </div>
            </div>
          </div>
        </div>

        <div class="purchase-divider"></div>
        <div v-if="vehiclePurchaseStore.insuranceOptions.insuranceId > 0" class="purchase-row thin light-blue">
          <div class="label category ">{{ vehiclePurchaseStore.insuranceOptions.spendingReason }}</div>
          <div class="price category"><BngUnit class="money" :money="vehiclePurchaseStore.insuranceOptions.priceMoney" /></div>
        </div>
        <div class="purchase-row thin light-blue">
          <div class="label">{{ $translate.instant("ui.career.vehiclePurchase.dealershipFees") }}</div>
          <div class="price"><BngUnit class="money" :money="vehiclePurchaseStore.vehicleInfo.fees" /></div>
        </div>
        <div class="purchase-divider" v-if="vehiclePurchaseStore.tradeInVehicleInfo?.niceName"></div>
        <div v-if="vehiclePurchaseStore.tradeInVehicleInfo.niceName" class="purchase-row thin green">
          <div class="label">{{ $translate.instant("ui.career.vehiclePurchase.tradeIn", { vehicleName: vehiclePurchaseStore.tradeInVehicleInfo.niceName }) }}</div>
          <div class="price"><BngUnit class="money" :money="-vehiclePurchaseStore.tradeInVehicleInfo.Value" /></div>
        </div>
        <div class="purchase-divider"></div>

        <template v-if="vehiclePurchaseStore.discountPercentage > 0">
          <div class="purchase-row thin green">
            <div class="label">{{ $translate.instant("ui.career.vehiclePurchase.discount", { percentage: vehiclePurchaseStore.discountPercentage }) }}</div>
            <div class="price">
              <BngUnit class="money" :money="vehiclePurchaseStore.prices.discount" />
            </div>
          </div>
          <div class="purchase-divider"></div>
        </template>

        <div class="purchase-row">
          <div class="label">{{ $translate.instant("ui.career.vehiclePurchase.subtotal") }}</div>
          <div class="price">
            <BngUnit class="money" :money="vehiclePurchaseStore.finalPackagePrice - vehiclePurchaseStore.prices.taxes - (vehiclePurchaseStore.buyCustomLicensePlate ? vehiclePurchaseStore.prices.customLicensePlate : 0) + (vehiclePurchaseStore.prices.discount || 0)" />
          </div>
        </div>

        <div class="purchase-row thin yellow ">
          <div class="label ">{{ $translate.instant("ui.career.vehiclePurchase.salesTax", { rate: 7 }) }}</div>
          <div class="price "><BngUnit class="money" :money="vehiclePurchaseStore.prices.taxes" /></div>
        </div>

        <div v-if="vehiclePurchaseStore.buyCustomLicensePlate" class="purchase-row thin">
          <div class="label">{{ $translate.instant("ui.career.vehiclePurchase.customLicensePlate") }}</div>
          <div class="price"><BngUnit class="money" :money="vehiclePurchaseStore.prices.customLicensePlate" /></div>
        </div>

        <div class="purchase-divider"></div>
        <div class="purchase-row ">
          <div class="label highlight-category">{{ $translate.instant("ui.career.vehiclePurchase.total") }}</div>
          <div class="price highlight-category"><BngUnit class="money" :money="vehiclePurchaseStore.finalPackagePrice" /></div>
        </div>

        <div v-if="vehiclePurchaseStore.finalPackagePrice > vehiclePurchaseStore.playerMoney" class="purchase-row money-warning red">
          <div class="label"><BngIcon type="danger" /> {{ $translate.instant("ui.career.vehiclePurchase.additionalFundsRequired") }}</div>
          <div class="price">
            <BngUnit class="money" :money="(vehiclePurchaseStore.finalPackagePrice - vehiclePurchaseStore.playerMoney)" />
          </div>
        </div>

        <div class="purchase-customization-group">
          <h4>{{ $translate.instant("ui.career.vehiclePurchase.purchaseOptions") }}</h4>
          <BngButton
            v-bng-tooltip:top="negotiationButtonMessage"
            :disabled="!canNegotiatePrice"
            accent="secondary"
            @click="negotiatePrice"
          >
            {{ $translate.instant("ui.career.vehiclePurchase.negotiatePrice") }}
          </BngButton>

          <BngButton  v-bng-tooltip:top="tradeInButtonMessage" :disabled="!vehiclePurchaseStore.tradeInEnabled || !hasVehicle" accent="secondary" @click="chooseTradeInVehicle"
            >{{ $translate.instant("ui.career.vehiclePurchase.chooseTradeIn") }}</BngButton>
          <BngButton
            v-if="vehiclePurchaseStore.tradeInEnabled && vehiclePurchaseStore.tradeInVehicleInfo.niceName"
            @click="removeTradeInVehicle"
            :accent="ACCENTS.attention"
            >{{ $translate.instant("ui.career.vehiclePurchase.removeTradeIn") }}</BngButton>

          <BngButton @click="chooseInsurance" :accent="ACCENTS.secondary">{{ $translate.instant("ui.career.vehiclePurchase.chooseInsurance") }}</BngButton>
        </div>
      </div>

      <template #buttons>
        <div class="button-group">
          <BngButton :disabled="vehiclePurchaseStore.purchaseType !== 'inspect' || vehiclePurchaseStore.alreadyDidTestDrive"
          v-bng-tooltip:top="testDriveButtonMessage"
          @click="startTestDrive" :accent="ACCENTS.secondary">{{ $translate.instant("ui.career.vehiclePurchase.testDrive") }}</BngButton>

          <BngButton
            :disabled="
              vehiclePurchaseStore.finalPackagePrice > vehiclePurchaseStore.playerMoney ||
              !vehicleFitsInventory ||
              vehiclePurchaseStore.buyCustomLicensePlate && !licensePlateTextValid
            "
            show-hold
            bng-scoped-nav-autofocus
            v-bng-on-ui-nav:ok.asMouse.focusRequired
            v-bng-click="{
              holdCallback: completePurchaseHold,
              holdDelay: 1000,
              repeatInterval: 0,
              holdSoundInstanceId: 'vehicle-purchase-buy',
            }"
          >
            <div v-if="vehiclePurchaseStore.finalPackagePrice > vehiclePurchaseStore.playerMoney">{{ $translate.instant("ui.career.vehiclePurchase.insufficientFunds") }}</div>
            <div v-else-if="!vehicleFitsInventory">{{ $translate.instant("ui.career.vehiclePurchase.noFreeInventorySlots") }}</div>
            <div v-else>{{ $translate.instant("ui.career.vehiclePurchase.purchase") }}</div>
          </BngButton>
        </div>
      </template>

    </BngCard>

    <template #side-tasklist>
      <TaskList
        class="task-list"
        :header="store.header"
        :tasks="store.tasks" />
    </template>
  </LayoutMenu>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from "vue"
import { BngButton, ACCENTS, BngCard, BngCardHeading, BngUnit, BngIcon, BngBinding } from "@/common/components/base"
import { useVehiclePurchaseStore } from "../stores/vehiclePurchaseStore"
import { lua, useBridge } from "@/bridge"
import { vBngClick, vBngTooltip, vBngOnUiNav, vBngBlur, vBngScopedNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { CareerStatus, ChooseInsuranceMain } from "@/modules/career/components"
import { addPopup, openConfirmation } from "@/services/popup"
import { $translate } from "@/services/translation"
import { useRoute } from "vue-router"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { useTasksStore } from "@/services/tasklistStore"
import TaskList from "@/modules/tasks/components/TaskList.vue"

const { units } = useBridge()

const route = useRoute()
const routeDataStore = useRouteDataStore()

const breadcrumbItems = computed(() => routeDataStore.breadcrumbs || [])

const hasVehicle = ref(false)
const licensePlateTextValid = ref(true)

const vehiclePurchaseStore = useVehiclePurchaseStore()
const store = useTasksStore()
const isLicensePlateTextValid = (text) => {
  lua.career_modules_inventory.isLicensePlateValid(text).then(valid => {
    licensePlateTextValid.value = valid
  })
  return licensePlateTextValid.value
}

const tradeInButtonMessage = computed(() => {
  if (!vehiclePurchaseStore.tradeInEnabled) return $translate.instant("ui.career.vehiclePurchase.tradeInOnlyInPerson")

  return !hasVehicle.value ? $translate.instant("ui.career.vehiclePurchase.noOwnedVehicles") : undefined
})

const testDriveButtonMessage = computed(() => {
  if (vehiclePurchaseStore.purchaseType !== 'inspect') return $translate.instant("ui.career.vehiclePurchase.testDriveInspectOnly")
  if (vehiclePurchaseStore.alreadyDidTestDrive) return $translate.instant("ui.career.vehiclePurchase.testDriveAlreadyDone")
  return undefined
})

const canNegotiatePrice = computed(() => {
  return !!vehiclePurchaseStore.vehicleInfo.negotiationPossible && (vehiclePurchaseStore.vehicleInfo.discountPercentage || 0) <= 0
})

const negotiationButtonMessage = computed(() => {
  if ((vehiclePurchaseStore.vehicleInfo.discountPercentage || 0) > 0) return $translate.instant("ui.career.vehiclePurchase.negotiationUnavailableDiscounted")
  if (!vehiclePurchaseStore.vehicleInfo.negotiationPossible) return vehiclePurchaseStore.vehicleInfo.negotiationDisabledReason || $translate.instant("ui.career.vehiclePurchase.negotiationUnavailable")
  return undefined
})

const vehicleFitsInventory = computed(() => {
  if (vehiclePurchaseStore.vehicleInfo.takesNoInventorySpace) return true

  return vehiclePurchaseStore.inventoryHasFreeSlot || (vehiclePurchaseStore.tradeInVehicleInfo.niceName && !vehiclePurchaseStore.tradeInVehicleInfo.takesNoInventorySpace)
})

vehiclePurchaseStore.inventoryIsEmpty().then(empty => {
  hasVehicle.value = !empty
})

const buy = () => buyVehicle(!vehiclePurchaseStore.locationSelectionEnabled || vehiclePurchaseStore.makeDelivery)

function isPrimaryInteraction(event) {
  return !event || event.fromController || event.button === 0
}

function completePurchaseHold(event) {
  if (!isPrimaryInteraction(event)) return
  buy()
}

// BACK is owned by the router: the active scope is route-managed, so scoped-nav
// defers to ui_router.back(), whose handler runs the purchase-type-aware cancel.
const cancel = () => {
  lua.extensions.ui_router.back()
}

async function breadcrumbClick(item) {
  if (!item) return
  if (item.closeAllMenus) {
    lua.career_career.closeAllMenus()
    return
  }
  if (item.routeName && !item.abstract) {
    await lua.extensions.ui_router.navigate(item.routeName, item.params)
  }
}

const startTestDrive = () => {
  vehiclePurchaseStore.startTestDrive()
}

const chooseTradeInVehicle = () => {
  vehiclePurchaseStore.chooseTradeInVehicle()
}

const chooseInsurance = () => {
  addPopup(ChooseInsuranceMain, {
    menuMode: 'purchase',
    params: {
      purchaseType: vehiclePurchaseStore.purchaseType,
      shopId: vehiclePurchaseStore.vehicleInfo.shopId,
      insuranceId: vehiclePurchaseStore.insuranceOptions.insuranceId
    }
  })
}

const negotiatePrice = () => {
  if (!canNegotiatePrice.value) return
  lua.career_modules_marketplace.startNegotiateSellingOffer(vehiclePurchaseStore.vehicleInfo.shopId)
}

const removeTradeInVehicle = () => {
  vehiclePurchaseStore.removeTradeInVehicle()
}

const buyVehicle = _makeDelivery => {
  vehiclePurchaseStore.buyVehicle(_makeDelivery)
}

const start = () => {
  vehiclePurchaseStore.requestPurchaseData()
}

const kill = async () => {
  await lua.career_modules_inspectVehicle.onPurchaseMenuClosed()
  vehiclePurchaseStore.$dispose()
}

// Purchase data arrives from Lua (vehiclePurchaseData event) after mount; gate the
// routeMounted ack and scope activation on the focusable card being present.
const isReady = computed(() => !!vehiclePurchaseStore.vehicleInfo.niceName)

// handlesOwnReady flow: ack the mount and activate the route target scope only
// once the data is present and rendered, so autofocus lands on a real button.
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
  if (ready) notifyRouteMountedWhenReady()
})

onMounted(start)
onUnmounted(kill)
</script>

<style scoped lang="scss">
.purchase-screen {
  width: 35rem;
  color: white;
  background-color: var(--bng-black-o6);
  align-self: flex-start;
  & :deep(.card-cnt) {
    background-color: var(--bng-black-o6);
  }
  :deep(.footer-container) {
    display: flex;
    flex-direction: column;
  }
}

// Header
.header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;
  min-height: 3.6rem;
  >* {
    line-height: 1.2;
  }
  .header-seller-info {
    margin-top: 0rem;
    font-size: 0.875rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.5);
  }
}

.close-button {
  cursor: pointer;
  height: 2.25rem;
  min-width: 5.25rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  margin-top: 0.75rem !important;
}

// Purchase list
.purchase-list {
  display: flex;
  flex-direction: column;
  padding: 1rem 2.5rem 0;
  gap: 0.25rem;
}

.purchase-divider {
  width: 100%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0.4rem 0;
}

// Purchase row
.purchase-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  padding: 0.1rem 0.25rem;
  border-radius: var(--bng-corners-2);
  background: linear-gradient(to right, var(--bng-cool-gray-800), rgba(var(--bng-cool-gray-850-rgb), 0));

  &.thin {
    .label {
      font-weight: 300;
    }
    .price {
      :deep(.icon) {
        --icon-size: 1.5em;
      }
      :deep(.value-label) {
        font-weight: 300;
      }
    }
  }

  &.light-blue {
    background: linear-gradient(to right, var(--bng-add-blue-800), rgba(var(--bng-add-blue-200-rgb), 0));
  }

  &.yellow {
    background: linear-gradient(to right, var(--bng-ter-yellow-800), rgba(var(--bng-ter-yellow-300-rgb), 0));
  }

  &.green {
    background: linear-gradient(to right, var(--bng-add-green-800), rgba(var(--bng-add-green-300-rgb), 0));
  }

  &.red {
    background: linear-gradient(to right, var(--bng-add-red-800), rgba(var(--bng-add-red-300-rgb), 0));
    color: var(--bng-add-red-400);
    --bng-icon-color: var(--bng-add-red-400);
  }
}

.label {
  text-align: left;
  flex: 1;
  min-width: 0;
  font-weight: 600;
  margin-top: 0.25rem;
}

.price {
  align-self: flex-start;
  align-items: flex-end;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: -0.1rem;
  :deep(.info-item) {
    padding: 0;
  }
  .old-price {
    font-size: 0.85em;
    opacity: 0.5;
    :deep(.value-label) {
      text-decoration: line-through;
    }

    :deep(.icon) {
      --icon-size: 1.1em;
    }
  }
  .current-price-line {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
  }
}

.sub-info {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  --bng-icon-color: rgba(255, 255, 255, 0.5);
  font-weight: 300;
  :deep(.value-label) {
    font-weight: 300;
  }
}

.highlight-category {
  font-size: 1.5em;
  font-weight: 900 !important;
  :deep(.value-label) {
    font-weight: 900 !important;
  }
  :deep(.icon) {
    --icon-size: 1.4em;
  }
}

// Purchase options
.purchase-customization-group {
  --bng-button-margin: 0;
  margin: 1rem 2rem 0.5rem;
  border-radius: var(--bng-corners-2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: stretch;
  h4 {
    padding: 0;
    margin: 0;
  }
  >* {
    width: 100%;
    max-width: 100% !important;
  }
}

// Buttons
.button-group {
  --bng-button-margin: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
  gap: 0.5rem;
  padding: 0.125rem;
  >* {
    flex: 1;
  }
}

// Status sidebar
.status-container {
  border-radius: var(--bng-corners-2);
  color: white;
  align-self: flex-start;
  flex: 0 0 auto;
  .status-add {
    text-align: center;
    padding: 0.25rem 0.5rem;
  }
}

.profile-status {
  background-color: rgba(0, 0, 0, 0.7);
  & :deep(.card-cnt) {
    background-color: rgba(0, 0, 0, 0.7);
  }
}

.task-list {
  width: 33rem;
  align-self: flex-start;
}
</style>
