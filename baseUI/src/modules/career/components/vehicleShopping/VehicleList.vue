<template>
  <!--div class="vehicle-shop-wrapper"-->
  <BngCard class="vehicle-shop-wrapper" v-bng-blur>
    <div class="site-body">
      <div class="heading">
        <span class="header-text">{{ getHeaderText() }}</span>
        <span class="price-notice">
          <div><span>*&nbsp;</span><span>{{ $translate.instant("ui.career.vehicleShopping.additionalTaxesNotice") }}</span></div>
          <div v-if="vehicleShoppingStore.currentSeller?.remotePurchaseOnly"><span>{{ $translate.instant("ui.career.vehicleShopping.remotePurchaseOnly") }}</span></div>
        </span>
      </div>
      <BngList
        v-if="vehicleShoppingStore"
        :layout="LIST_LAYOUTS.LIST"
        no-background
        nav-scroll-enabled
        class="vehicle-list"
        >
        <VehicleCard
          v-for="(vehicle, key) in vehicleShoppingStore.filteredVehicles"
          :key="`available-${key}`"
          :vehicleShoppingData="vehicleShoppingStore.vehicleShoppingData"
          :vehicle="vehicle" />
        <template v-if="vehicleShoppingStore.filteredSoldVehicles && vehicleShoppingStore.filteredSoldVehicles.length > 0">
          <div bng-list-title class="list-section-title">{{ $translate.instant("ui.career.vehicleShopping.recentlySoldVehicles", { count: vehicleShoppingStore.filteredSoldVehicles.length }) }}</div>
          <VehicleCard
            v-for="(vehicle, key) in vehicleShoppingStore.filteredSoldVehicles"
            :key="`sold-${key}`"
            class="sold-vehicle-card"
            :vehicleShoppingData="vehicleShoppingStore.vehicleShoppingData"
            :vehicle="vehicle" />
        </template>
      </BngList>
    </div>
  </BngCard>
  <!--/div-->
</template>

<script setup>
import VehicleCard from "./VehicleCard.vue"
import { BngCard, BngList, LIST_LAYOUTS } from "@/common/components/base"
import { vBngBlur } from "@/common/directives"
import { $translate } from "@/services"
import { useVehicleShoppingStore } from "../../stores/vehicleShoppingStore"

const vehicleShoppingStore = useVehicleShoppingStore()

const getHeaderText = () => {
  return vehicleShoppingStore?.currentSeller?.name || $translate.instant("ui.career.vehicleShopping.defaultSiteName")
}
</script>

<style scoped lang="scss">
.vehicle-shop-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  padding: 0.5rem;
  flex-direction: column;

  // BngCard clips its inner content height by default; let it fill the wrapper
  // so the scroll region below is the element that actually overflows.
  :deep(.card-cnt) {
    min-height: 0;
    height: 100%;
  }

  .address-bar {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: var(--bng-cool-gray-700);
    padding: 0.5rem;

    & > .spacer {
      flex: 0.2 0.2 0.25rem;
    }
    & > .field {
      border-radius: var(--bng-corners-1);
      background-color: var(--bng-cool-gray-900);
      // border: 0.0625rem solid var(--bng-cool-gray-600);
      padding: 0.5rem 0.75rem;
      flex: 1 1 auto;
      text-overflow: ellipsis;
      color: white;
      text-align: center;
      // text-transform: lowercase;
      & > span {
        &::before {
          content: " ";
          display: inline-block;
          height: auto;
          color: var(--bng-cool-gray-400);
        }
        &::after {
          content: " ";
          display: inline-block;
          height: auto;
          color: var(--bng-cool-gray-400);
        }
      }
    }
  }

  .site-body {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    color: white;
  }
  .layo-ut {
    position: sticky;
    top: 0px;
    left: 1rem;
    z-index: 9999;
    border-radius: var(--bng-corners-2);
    width: 16rem;
    padding: 0.5rem;
    background: var(--bng-cool-gray-800);
  }
  .price-notice {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    width: 100%;
    color: var(--bng-cool-gray-200);
  }
  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--bng-cool-gray-700);
    > * {
      flex: 1;
    }
    .header-text {
      font-weight: 600;
      font-size: 1.25rem;
    }
  }
  .vehicle-list {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    padding: 0.75rem;

    :deep(.list-content > .list-items) {
      padding-bottom: 0.5rem;
    }
  }
  :deep(.sold-vehicle-card) {
    filter: grayscale(0.6) brightness(0.8);
  }
  .list-section-title {
    width: 100%;
    text-align: center;
    padding: 0.75rem 0;
  }
}

.layout-selected {
  color: pink;
}
</style>
