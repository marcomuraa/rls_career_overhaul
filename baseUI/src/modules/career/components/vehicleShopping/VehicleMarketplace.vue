<template>
    <Accordion class="part-groups">
      <template v-for="listing in listings" :key="listing.id">
        <AccordionItem
          :expanded="true"
          :class="{ 'disabled': listing.disabled }"
          :secondary-action="() => confirmRemoveListingScreen(listing.id)"
          secondary-hint-inline
          secondary-label="Remove"
          class="marketplace-listing"
          navigable
        >
          <template #caption>
            <div class="veh-part-caption" >
              <div v-if="listing.thumbnail" class="veh-preview" :style="{ backgroundImage: `url('${listing.thumbnail}')` }" ></div>
              <span class="veh-name">
                {{ listing.niceName }}
                <span class="veh-name-count">({{ listing.offers.length || 0 }})</span>
              </span>
              <span class="veh-price">
                <div>
                  {{ $translate.instant("ui.career.vehicleMarketplace.askingPrice") }}
                  <BngUnit :money="listing.value" />
                </div>
                <div>
                  {{ $translate.instant("ui.career.vehicleMarketplace.estimatedMarketValue") }}
                <BngUnit :money="listing.marketValue" />
                </div>
              </span>

              <span class="veh-remove">
                <BngButton
                  :icon="icons.trashBin1"
                  :accent="ACCENTS.attentionghost"
                  bng-no-nav="true"
                  tabindex="-1"
                  @click.stop="confirmRemoveListingScreen(listing.id)"
                >
                </BngButton>
              </span>
            </div>
          </template>
          <div v-if="listing.disabled" class="offer-card red">
            {{ listing.disableReason }}
          </div>
          <div
            v-for="(offer, index) in listing.offers"
            :class="{ 'expired': offer.expiredViewCounter == 1 }"
            v-bng-scoped-nav="{ scopeId: `offer-${listing.id}-${index}` }"
            class="offer-card"
            @mouseover="onOfferHovered(offer)"
            @mouseleave="onOfferUnhovered(offer)"
            @activate="onActivated(offer)"
            @deactivate="onDeactivated(offer)"
          >
            <div class="offer-info">
              <div class="offer-header">
                <span class="buyer-name">{{ offer.buyerPersonality.name }}</span>
                <span v-if="offer.expiredViewCounter" class="expired-badge">{{ $translate.instant("ui.career.vehicleMarketplace.expired") }}</span>
              </div>
              <div class="offer-details">
                <div class="detail-row">
                  <span class="detail-label">{{ $translate.instant("ui.career.vehicleMarketplace.offer") }}</span>
                  <BngUnit :money="offer.value" />
                  <span class="delta" :class="{ up: offer.value > listing.value, down: offer.value < listing.value }">
                    ( {{ offer.value > listing.value ? '+' : '-' }}<BngUnit :money="Math.abs(offer.value - listing.value)" />)
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $translate.instant("ui.career.vehicleMarketplace.vehicle") }}</span>
                  <span>{{ listing.niceName }}</span>
                </div>
              </div>
            </div>
            <div class="spec-actions">
              <BngButton
                class="part-button"
                @click="declineOffer(listing.id, offer.id)"
                :accent="ACCENTS.attention"
              >
                {{ offer.expiredViewCounter ? $translate.instant("ui.career.vehicleMarketplace.discard") : $translate.instant("ui.career.vehicleMarketplace.deny") }}
              </BngButton>
              <BngButton
                class="part-button negotiate-button"
                @click="startNegotiateBuyingOffer(listing.id, offer.id)"
                :accent="ACCENTS.secondary"
                :disabled="!offer.negotiationPossible || offer.value >= listing.value || listing.disabled"
                v-if="!offer.expiredViewCounter"
              >
                {{ $translate.instant("ui.career.vehicleMarketplace.negotiate") }}
              </BngButton>
              <BngButton
                v-if="!offer.expiredViewCounter"
                class="part-button"
                @click="acceptOffer(listing.id, offer.id)"
                :disabled="listing.disabled || offer.disabled"
                :accent="ACCENTS.main"
              >
                {{ $translate.instant("ui.career.vehicleMarketplace.acceptOffer") }}
              </BngButton>
            </div>
          </div>
          <div v-if="Object.keys(listing.offers || {}).length === 0" class="offer-card">
            {{ $translate.instant("ui.career.vehicleMarketplace.noOffers") }}
          </div>
        </AccordionItem>
      </template>
    </Accordion>
    <BngButton
      :accent="ACCENTS.custom_old"
      class="add-listing-button"
      @click="listVehicle"
    >
      <span class="add-listing-button-icon">+</span> {{ $translate.instant("ui.career.vehicleMarketplace.addListing") }}
    </BngButton>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { lua } from "@/bridge"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { BngUnit, BngButton, ACCENTS, icons } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services/translation"

const listings = ref([])

const confirmRemoveListingScreen = async listingId => {
  console.log("confirmRemoveListingScreen", listingId)
  const res = await openConfirmation("", $translate.instant("ui.career.vehicleMarketplace.confirmRemoveListing"), [
    { label: $translate.instant("ui.common.yes"), value: true, extras: { default: true } },
    { label: $translate.instant("ui.common.no"), value: false, extras: { accent: ACCENTS.secondary } },
  ])

  if (res) {
    removeVehicleListing(listingId)
  }
}

const onActivated = (offer) => { offer.active = true }

const onDeactivated = (offer) => { offer.active = false }

const onOfferHovered = (offer) => { offer.hovered = true }

const onOfferUnhovered = (offer) => { offer.hovered = false }

const handleListings = (data) => { listings.value = data }

const getNewData = () => {
  lua.career_modules_marketplace.getListings().then(handleListings)
}

const acceptOffer = (inventoryId, offerId) => {
  lua.career_modules_marketplace.acceptOffer(inventoryId, offerId).then(getNewData)
}

const declineOffer = (inventoryId, offerId) => {
  lua.career_modules_marketplace.declineOffer(inventoryId, offerId).then(getNewData)
}

const startNegotiateBuyingOffer = (inventoryId, offerId) => {
  lua.career_modules_marketplace.startNegotiateBuyingOffer(inventoryId, offerId).then(getNewData)
}

const removeVehicleListing = (inventoryId) => {
  lua.career_modules_marketplace.removeVehicleListing(inventoryId).then(getNewData)
}

const listVehicle = () => {
  lua.career_modules_inventory.openInventoryMenuForChoosingListing()
}

const start = () => {
  lua.career_modules_marketplace.menuOpened(true)
  getNewData()
}

const stop = () => {
  lua.career_modules_marketplace.menuOpened(false)
}

onMounted(start)
onUnmounted(stop)
</script>

<style scoped lang="scss">


.offer-card {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  outline: 2px solid rgba(var(--bng-cool-gray-50-rgb), 0.5);
  border-radius: 4px;
  white-space: nowrap;
  padding: 0.75em 0.9em;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.8);
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  &.red {
    background-color: rgba(var(--bng-add-red-400-rgb), 0.1);
    outline-color: rgba(var(--bng-add-red-400-rgb), 0.5);
    color: var(--bng-add-red-200);
  }
}

.expired {
  .offer-info {
    opacity: 0.5;
  }
}
.offer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.offer-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-weight: 600;
}

.buyer-name { color: var(--bng-off-white); }

.expired-badge {
  padding: 0.05em 0.5em;
  border-radius: 3px;
  font-size: 0.85em;
  color: var(--bng-add-red-400);
  background-color: rgba(var(--bng-add-red-400-rgb), 0.1);
}

.offer-details { color: var(--bng-off-white); }

.detail-row {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
}

.detail-label {
  color: var(--bng-cool-gray-200);
}

.delta { margin-left: 0.25em; }
.delta.up { color: var(--bng-add-green-400); }
.delta.down { color: var(--bng-add-red-400); }


.add-listing-button {
  display: flex;
  max-width: none !important;
  padding: 0.5em;
  font-size: 1.5em;
  line-height: 1.5em;
  color: var(--bng-off-white);
  display: flex;
  align-items: center !important;
  justify-content: center;

  --bng-button-custom-enabled: var(--bng-cool-gray-750);
  --bng-button-custom-hover: var(--bng-cool-gray-700);
  --bng-button-custom-active: var(--bng-cool-gray-900);
  --bng-button-custom-disabled: var(--bng-cool-gray-700);
  --bng-button-custom-enabled-opacity: 0.5;
  --bng-button-custom-hover-opacity: 0.5;
  --bng-button-custom-active-opacity: 1;
  --bng-button-custom-disabled-opacity: 0.2;
  --bng-button-custom-margin: 0.25em 0 0 0;


  border: 0.125rem dashed rgba(var(--bng-off-white-rgb), 0.25);

  .add-listing-button-icon {
    font-size: 1.5em;
    margin-right: 0.25em;
    font-weight: 700;
  }
}

.spec-actions {
  visibility: visible;
  display: flex;
  gap: 0.5em;
}

.part-info-col,
.part-info-row {
  display: none;
}

.part-button {
  flex: 0 0 auto;
}

.center {
  text-align: center;
}
.right {
  text-align: left;
}

.marketplace-card {
  color: white;
}

.veh-part-caption {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  overflow: hidden;
  //width: 100%;
  height: 4em;
  $preview: 8em; // thumbnail width
  .veh-preview {
    width: $preview;
    align-self: stretch;
    background-size: auto 110%;
    background-position: 50% 50%;
    background-repeat: no-repeat;
    border-radius: var(--bng-corners-1);
  }
  .veh-name {
    flex: 0 0 30%;
    padding-left: 0.3em;
    font-size: 1.2em;
    text-align: left;
    padding-left: 0.5em;
    .veh-name-count {
      font-weight: 300;
    }
  }

  .veh-price {
    flex: 0 0 40%;
    text-align: center;
  }

  .veh-remove {
    flex: 1 0 10%;
    display: flex;
    justify-content: flex-end;

    :deep(.bng-button) {
      --bng-content-flow: row;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 0.35em;

      .binding-wrapper,
      .icon-base {
        display: inline-flex;
        align-items: center;
        line-height: 1;
      }
    }
  }
}

.part-groups {
  overflow: hidden auto;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.0);
  border-radius: var(--bng-corners-2);
  gap: 0.3em;
  :deep(.bng-accitem) {
    margin: 0;
  }
  :deep(.bng-accitem-caption) {
    background-color: rgba(var(--bng-cool-gray-700-rgb), 0.6);
  }
}

.disabled {
  .veh-name, .veh-price {
    color: var(--bng-add-red-400);
    --bng-icon-color: var(--bng-add-red-400);
  }

  background-color: rgba(var(--bng-add-red-400-rgb), 0.1);
  border-radius: var(--bng-corners-2);
}
</style>