<template>
  <ComputerWrapper
    :title="$translate.instant('ui.career.repair.titleWithVehicle', { name: repairStore.vehicleData.name })"
    @back="close">
    <BngCard v-if="repairStore.vehicleData.name" class="repairMain blue-background">
      <div class="content blue-background" v-bng-ui-nav-scroll.force>
        <div class="title">{{ $translate.instant("ui.career.repair.title") }}</div>
        <div class="vehicle-info">
          <InsuranceVehTile class="vehicle-tile" :vehicle="repairStore.vehicleData">
            <template #rightContent>
              <div class="right-info-wrapper">
                <div class="damage-estimate-wrapper">
                  <span class="damage-estimate-text">
                    {{ $translate.instant("ui.career.repair.damageEstimate") }}
                  </span>
                  <span class="damage-estimate-value">
                    <BngUnit class="red-price" :money="repairStore.vehicleData.damageCost" />
                  </span>
                </div>
                <div v-if="!repairStore.vehicleData.isInsured">
                  <span class="not-insured-text">
                    {{ $translate.instant("ui.career.repair.notInsured") }}
                  </span>
                </div>
              </div>
            </template>
          </InsuranceVehTile>
        </div>

        <div>
          <div class="repair-options-title">{{ $translate.instant("ui.career.repair.repairOptions") }}</div>
          <div class="repair-options">
            <Button v-for="(repairOption, key) in repairStore.repairOptions" :key="key"
              class="repair-option"
              :class="{ selected: selectedRepairOptionKey === key }"
              :tab-index="-1"
              :nav-item="false"
              @click="onRepairOptionClick(key)"
            >
              <div class="icon-wrapper">
                <BngIcon :type="repairOption.useInsurance ? icons.shieldCheckmark : icons.wrench" />
              </div>
              <div>
                <div class="option-text-wrapper" v-if="repairOption.useInsurance">
                  <div class="bigger-text">
                    {{ $translate.instant("ui.career.repair.insuranceClaim") }}
                  </div>
                  <div class="smaller-text">
                    {{ repairOption.insuranceName }}
                  </div>
                  <div class="bigger-text" style="margin-top: -5px;">
                    {{ $translate.instant("ui.career.repair.deductible") }} <BngUnit class="unit-no-padding" :money="repairStore.repairOptions.insuranceRepairData.deductible" />
                  </div>
                </div>
                <div class="option-text-wrapper" v-else>
                  <div class="bigger-text">
                    {{ $translate.instant("ui.career.repair.privateRepair") }}
                  </div>
                  <div class="smaller-text">
                    {{ $translate.instant("ui.career.repair.noPolicyImpact") }}
                  </div>
                  <div class="bigger-text">
                    {{ $translate.instant("ui.career.repair.fullDamageCost") }}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <div v-if="currentRepairOption">
          <CoverageOption
          :coverageOption="currentRepairOption.repairTimeOptions"
          :key="`repairTime-${selectedRepairOptionKey}`"
          v-model="selectedRepairTimeOptionIndex"
          :simpleSelect="true"
          :showPerkMode="'none'"
          />
        </div>

        <div class="details-wrapper">
          <div class="detail-wrapper">
            <h3>{{ $translate.instant("ui.career.repair.insuranceImpact") }}</h3>
            <div class="item">
              <span>
                <div class="item-label">{{ $translate.instant("ui.career.repair.driverScoreChange") }}</div>
                <div class="accident-forgivenesses-text" v-if="currentRepairOption.useInsurance"> {{ accidentForgivenessesText }}</div>
              </span>
              <span class="item-value" :class="{ 'red-text': currentRepairOption.useInsurance && repairStore.futureDriverScore < repairStore.driverScore }">
                <template v-if="currentRepairOption.useInsurance">
                  {{ repairStore.futureDriverScore === repairStore.driverScore ? $translate.instant("ui.career.repair.noChangeWithScore", { score: repairStore.driverScore }) : $translate.instant("ui.career.repair.scoreChange", { from: repairStore.driverScore, to: repairStore.futureDriverScore }) }}
                </template>
                <template v-else>
                  {{ $translate.instant("ui.career.repair.noChangeWithScore", { score: repairStore.driverScore }) }}
                </template>
              </span>
            </div>
            <div v-if="repairStore.repairOptions.insuranceRepairData" class="item">
              <span class="item-label">{{ $translate.instant("ui.career.repair.premiumImpact") }}</span>
              <span class="item-value">
                <template v-if="currentRepairOption.useInsurance && repairStore.repairOptions.insuranceRepairData.futurePremium !== repairStore.repairOptions.insuranceRepairData.currentPremium">
                  <BngUnit :money="repairStore.repairOptions.insuranceRepairData.currentPremium" /> → <BngUnit class="red-price" :money="repairStore.repairOptions.insuranceRepairData.futurePremium" />
                </template>
                <template v-else>
                  {{ $translate.instant("ui.career.repair.noChange") }} (<BngUnit :money="repairStore.repairOptions.insuranceRepairData.currentPremium" />)
                </template>
              </span>
            </div>
            <div v-if="currentRepairOption.useInsurance" class="renews-in-wrapper">
              <span class="renews-in-name">{{ $translate.instant("ui.career.repair.renewsIn", { name: currentRepairOption.insuranceName }) }}</span>
              <span class="renews-in-value">{{ renewsInFormatted }}</span>
            </div>
          </div>
          <div class="detail-wrapper">
            <h3>{{ $translate.instant("ui.career.repair.vehicleRepair") }}</h3>
            <div class="item">
              <span class="item-label">{{ $translate.instant("ui.career.repair.repairOption") }}</span>
              <span class="item-value">{{ currentRepairOption.useInsurance ? $translate.instant("ui.career.repair.repairOptionInsurance", { name: currentRepairOption.insuranceName }) : $translate.instant("ui.career.repair.repairOptionPrivate") }}</span>
            </div>
            <div class="item">
              <span class="item-label">{{ $translate.instant("ui.career.repair.repairTime") }}</span>
              <span class="item-value">{{ selectedRepairTimeOption?.choiceText }} (<BngUnit :money="selectedRepairTimeOption?.premiumInfluence" />)</span>
            </div>
            <div v-if="currentRepairOption.useInsurance" class="item">
              <span class="item-label">{{ $translate.instant("ui.career.repair.deductibleLabel") }}</span>
              <span class="item-value"><BngUnit :money="repairStore.repairOptions.insuranceRepairData.deductible" /></span>
            </div>
            <div v-else class="item">
              <span class="item-label">{{ $translate.instant("ui.career.repair.vehicleDamage") }}</span>
              <span class="item-value"><BngUnit :money="repairStore.vehicleData.damageCost" /></span>
            </div>
            <div class="item total-cost">
              <span>{{ $translate.instant("ui.career.repair.totalCost") }}</span>
              <span class="item-value"><BngUnit :money="selectedRepairTimeOption?.totalPrice" /></span>
            </div>
          </div>
        </div>

        <BngButton
          class="bigger-button confirm-repair-button"
          :accent="ACCENTS.custom_old"
          :disabled="!selectedRepairTimeOption?.canPay || !repairStore.vehicleData.needsRepair"
          @click="startRepair(selectedRepairOptionKey, selectedRepairTimeOptionIndex)"
        >
          <div v-if="!repairStore.vehicleData.needsRepair">
            {{ $translate.instant("ui.career.repair.vehicleDoesntNeedRepair") }}
          </div>
          <div v-else-if="!selectedRepairTimeOption?.canPay">
            {{ $translate.instant("ui.career.shared.insufficientFunds") }}
            <div class="confirm-repair-money-wrapper">
              <BngUnit :money="selectedRepairTimeOption?.totalPrice" />
            </div>
          </div>
          <div v-else>
            {{ $translate.instant("ui.career.repair.confirmRepair") }}
            <div class="confirm-repair-money-wrapper">
              <BngUnit :money="selectedRepairTimeOption?.totalPrice" />
            </div>
          </div>
        </BngButton>
      </div>
    </BngCard>

    <!-- Tabs are shown in infobar because they are tracked events by crossfire.
     This is a hack to prevent them from displaying in the infobar -->
    <BngBinding v-show="false" ui-event="tab_l" controller />
    <BngBinding v-show="false" ui-event="tab_r" controller />
  </ComputerWrapper>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from "vue"
import { BngButton, BngCard, BngIcon,BngUnit, BngBinding, icons, ACCENTS } from "@/common/components/base"
import { vBngUiNavScroll } from "@/common/directives"
import { Button } from "@/common/components/utility"
import { lua, useBridge } from "@/bridge"
import { $translate } from "@/services/translation"
import { useRepairStore } from "../stores/repairStore"
import { CoverageOption, InsuranceVehTile } from "@/modules/career/components"

import ComputerWrapper from "./ComputerWrapper.vue"

import "@/modules/career/components/insurance/insuranceStyle.css"

const { units } = useBridge()

const repairStore = useRepairStore()

const selectedRepairOptionKey = ref(null)
const selectedRepairTimeOptionIndex = ref(1)

const currentRepairOption = computed(() => {
  if (!selectedRepairOptionKey.value || !repairStore.repairOptions) return null
  return repairStore.repairOptions[selectedRepairOptionKey.value]
})

const accidentForgivenessesText = computed(() => {
  if (!repairStore.repairOptions.insuranceRepairData.accidentForgivenesses > 0) {
    return $translate.instant("ui.career.repair.noAccidentForgivenessesLeft")
  }else{
    return $translate.instant("ui.career.repair.accidentForgivenessesLeft", { count: repairStore.repairOptions.insuranceRepairData.accidentForgivenesses })
  }
})

const selectedRepairTimeOption = computed(() => {
  if (!currentRepairOption.value?.repairTimeOptions?.choices) return null
  return currentRepairOption.value.repairTimeOptions.choices.find(choice => choice.id === selectedRepairTimeOptionIndex.value)
})

const renewsInFormatted = computed(() => {
  if (!currentRepairOption.value?.renewsIn) return ''
  return units.buildString('length', currentRepairOption.value.renewsIn * 1000, 0)
})

// watch for repairOptions to be loaded and set the first insurance option as default
watch(() => repairStore.repairOptions, (newOptions) => {
  if (newOptions && Object.keys(newOptions).length > 0 && !selectedRepairOptionKey.value) {
    // find the first option that uses insurance
    const insuranceKey = Object.keys(newOptions).find(key => newOptions[key].useInsurance)
    // fall back to first option if no insurance option is found
    const selectedKey = insuranceKey || Object.keys(newOptions)[0]
    selectedRepairOptionKey.value = selectedKey
    // set the initial repair time option index from the data
    if (newOptions[selectedKey]?.repairTimeOptions?.currentValueId) {
      selectedRepairTimeOptionIndex.value = newOptions[selectedKey].repairTimeOptions.currentValueId
    }
  }
}, { immediate: true })

// watch for repair option changes and reset the time option index
watch(() => selectedRepairOptionKey.value, (newKey) => {
  if (newKey && repairStore.repairOptions[newKey]?.repairTimeOptions?.currentValueId) {
    selectedRepairTimeOptionIndex.value = repairStore.repairOptions[newKey].repairTimeOptions.currentValueId
  } else {
    selectedRepairTimeOptionIndex.value = 1
  }
})

const onRepairOptionClick = (key) => {
  selectedRepairOptionKey.value = key
}

const close = () => {
  lua.career_modules_insurance_repairScreen.closeMenu()
}

const startRepair = (repairOptionKey, repairTimeOptionIndex) => {
  if (!selectedRepairTimeOption.value) return
  lua.career_modules_insurance_repairScreen.startRepairInGarage(repairStore.vehicleData.invVehId, {
    repairTime: selectedRepairTimeOption.value.value,
    isInsuranceRepair: currentRepairOption.value.useInsurance,
    cost: {
      repairTimeCost: selectedRepairTimeOption.value.premiumInfluence,
      deductible: currentRepairOption.value.useInsurance
        ? repairStore.repairOptions.insuranceRepairData.deductible
        : repairStore.vehicleData.damageCost
    }
  })
}

onMounted(() => {
  repairStore.getRepairData()
})

onUnmounted(() => {
  repairStore.resetStore()
})


</script>

<style scoped lang="scss">
.content {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  overflow: auto;
  width: 100%;
}

.right-info-wrapper{
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.damage-estimate-wrapper{
  display: flex;
  flex-direction: row;
  align-items: center;
  :deep(.info-item){
    margin: 0 !important;
    padding: 0 !important;
  }
}


.vehicle-tile{
  width: 100%;
}
.blue-background{
  background-color: var(--blue-shade-100);
}

.item{
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.total-cost{
  font-size: 1.2rem;
  font-weight: 600;
  border-top: 1px solid var(--bng-cool-gray-700);
}

.title{
  font-size: 2rem;
  font-weight: 600;
  align-self: center;
  text-align: center;
  width: 100%;
}

.renews-in-wrapper{
  margin-top: 0.625rem;
  text-align: right;
}

.not-insured-text{
  font-size: 1.2rem;
  font-weight: 600;
  opacity: 1;
  color: var(--bng-add-red-500);
}

.renews-in-name{
  font-size: 0.9rem;
  font-weight: 400;
  opacity: 0.7;
}

.renews-in-value{
  font-size: 1rem;
  font-weight: 800;
  color: var(--bng-add-blue-300);
}

.accident-forgivenesses-text{
  font-size: 0.8rem;
  font-weight: 300;
  opacity: 0.7;
}

.repair-options-title{
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.7rem;
}

.red-text{
  color: var(--bng-add-red-500);
}

.confirm-repair-money-wrapper{
  font-size: 1.2rem;
  font-weight: 600;
}

.damage-estimate-value{
  font-size: 1.4rem;
}

.item-value{
  font-size: 1.12rem;
  font-weight: 600;
}

.vehicle-name{
  font-size: 1.5rem;
  font-weight: 600;
}

.damage-estimate-text{
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.7;
}

.bigger-text{
  font-size: 1.2rem;
  font-weight: 600;
}

.smaller-text{
  font-size: 0.9rem;
  font-weight: 400;
  opacity: 0.7;
}

.item-label{
  font-weight: 400;
  opacity: 0.7;
}

.unit-no-padding :deep(*) {
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.red-price *) {
  color: var(--bng-add-red-500) !important;
  padding: 0 !important;
  font-weight: 600;
}

.icon-wrapper{
  font-size: 2.5rem;
}

.details-wrapper{
  display: flex;
  flex-direction: row;
  gap: 0.625rem;
  margin-top: 0.7rem;
}

.detail-wrapper{
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;

  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-3);
  background-color: var(--blue-shade-100);
  padding: 0.625rem;
}

.vehicle-info {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.repair-option{
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;
  --bng-button-min-width: 20rem;
  --bng-button-max-width: none;
  --bng-button-margin: 0;
  --bng-button-padding: 0.625rem;
  --bng-button-padding-top: 0.625rem;
  --bng-button-padding-bottom: 0.625rem;
  --bng-bg-border-radius: var(--bng-corners-3);
  --bng-bg-border-width: 2px;
  --bng-bg-enabled: var(--bng-cool-gray-800);
  --bng-bg-hover: var(--orange-shade-50);
  --bng-bg-active: var(--orange-shade-50);
  --bng-bg-focus: var(--orange-shade-50);
  --bng-bg-disabled: var(--bng-cool-gray-800);
  --bng-bg-enabled-opacity: 1;
  --bng-bg-hover-opacity: 1;
  --bng-bg-active-opacity: 1;
  --bng-bg-focus-opacity: 1;
  --bng-bg-disabled-opacity: 1;
  --bng-bg-border-enabled: var(--bng-cool-gray-700);
  --bng-bg-border-hover: var(--orange-shade-10);
  --bng-bg-border-active: var(--orange-shade-10);
  --bng-bg-border-focus: var(--orange-shade-10);
  --bng-bg-border-disabled: var(--bng-cool-gray-700);

  gap: 0.625rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 20rem;
  transition: all 0.2s ease;

  &.selected {
    --bng-bg-enabled: var(--orange-shade-50);
    --bng-bg-hover: var(--orange-shade-50);
    --bng-bg-active: var(--orange-shade-50);
    --bng-bg-focus: var(--orange-shade-50);
    --bng-bg-border-enabled: var(--orange-shade-10);
    --bng-bg-border-hover: var(--orange-shade-10);
    --bng-bg-border-active: var(--orange-shade-10);
    --bng-bg-border-focus: var(--orange-shade-10);
  }
}

.option-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.repair-options{
  display: flex;
  flex-direction: row;
  gap: 0.625rem;
}

.repairOptions {
  height: 100%;
}

.priceOption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.9375rem 0;
}

/* FIXME: There is a CSS conflict with AngularJS CSS with this class name */
.career-status-value {
  display: flex;
  justify-content: left;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  & > :first-child {
    margin-right: 0.125rem;
  }
}

.veh-part-caption {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  overflow: hidden;
  width: 100%;
  height: 5rem;
  $preview: 10rem; // thumbnail width
  .veh-preview {
    width: $preview;
    align-self: stretch;
    background-size: auto 110%;
    background-position: 50% 50%;
    background-repeat: no-repeat;
  }
}

.repairMain {
  width: 60%;
  height: 100%;
  padding: 0.625rem;
  color: white;
  overflow-y: hidden;
  & :deep(.card-cnt) {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

.repairOption {
  padding: 0.0625rem 1.25rem 0 1.25rem;
  background-color: rgba(83, 83, 83, 0.465);
  border-radius: var(--bng-corners-2);
  margin: 1.5625rem 0.625rem 1.5625rem 0;
}

.bigger-button{
  padding: 0.9375rem 1.5625rem;
  --bng-button-border-radius: var(--bng-corners-2);
  --bng-button-custom-border-radius: var(--bng-corners-2);
}

.confirm-repair-button {
  --bng-button-custom-enabled: var(--orange-shade-20);
  --bng-button-custom-hover: var(--orange-shade-10);
  --bng-button-custom-active: var(--orange-shade-10);
  --bng-button-custom-disabled: var(--bng-cool-gray-800);
  --bng-button-max-width: none;
  display: flex;
  width: 98%;
  align-self: center;

  &:disabled > * {
    opacity: 0.7;
  }
}
</style>
