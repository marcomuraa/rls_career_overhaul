<template>
  <ComputerWrapper :title="$translate.instant('ui.career.insurance.title')" @back="close">
    <BngCard class="insurances-card blue-background">
      <div v-if="selectedInsuranceClassId" class="small-insurance-cards-wrapper blue-background">
        <SmallInsuranceCard
          v-for="insurance in plClassesData[selectedInsuranceClassId].insurances"
          :key="insurance.id"
          :insuranceData="insurance"
          :driverScoreData="driverScoreData" />
      </div>
      <div v-else class="cards-wrapper blue-background">
        <div class="insurance-tiers-wrapper">
          <InsuranceTierCard
            v-for="{ classId, classData } in sortedInsuranceClasses"
            :key="classId"
            :classId="classId"
            :classData="classData"
            @select="selectInsuranceClass" />
        </div>
        <UninsuredCard
          :uninsuredVehsData="uninsuredVehsData"
          @open="openUninsuredVehicles" />
      </div>
    </BngCard>

    <!-- Tabs are shown in infobar because they are tracked events by crossfire.
     This is a hack to prevent them from displaying in the infobar -->
    <BngBinding v-show="false" ui-event="tab_l" controller />
    <BngBinding v-show="false" ui-event="tab_r" controller />
  </ComputerWrapper>
</template>

<script setup>
import { onBeforeMount, onUnmounted, computed, ref } from "vue"
import { BngCard, BngBinding } from "@/common/components/base"
import { addPopup } from "@/services/popup"
import { lua, useBridge } from "@/bridge"
import { $translate } from "@/services/translation"
import { useScopedNav } from "@/services/scopedNav/api"

import { SmallInsuranceCard, UninsuredVehicles, InsuranceTierCard, UninsuredCard } from "../components"
import ComputerWrapper from "./ComputerWrapper.vue"

const { events } = useBridge()
const scopedNav = useScopedNav()

const invVehsInsurancesData = ref({})
const plClassesData = ref({})
const uninsuredVehsData = ref({})
const driverScoreData = ref({})

const selectedInsuranceClassId = ref(null)

events.on("insurancesData", data => {
  invVehsInsurancesData.value = data.invVehsInsurancesData
  plClassesData.value = data.plClassesData
  uninsuredVehsData.value = data.uninsuredVehsData
  driverScoreData.value = data.driverScoreData
})

const selectInsuranceClass = (classId) => {
  selectedInsuranceClassId.value = classId
  scopedNav.requestCurrentScopeFocus()
}

const sortedInsuranceClasses = computed(() => {
  const classes = plClassesData.value
  if (!classes) return []

  return Object.entries(classes)
    .map(([classId, classData]) => ({ classId, classData }))
    .sort((a, b) => a.classData.priority - b.classData.priority)
})

const start = () => {
  lua.career_modules_insurance_insurance.sendUIData()
}

const kill = () => {
  lua.extensions.hook("onExitInsurancesComputerScreen")
  events.off("insurancesData")
}

onBeforeMount(start)
onUnmounted(kill)

const close = () => {
  if (selectedInsuranceClassId.value) {
    selectedInsuranceClassId.value = null
    scopedNav.requestCurrentScopeFocus()
  } else {
    lua.career_modules_insurance_insurance.closeMenu()
  }
}

const openUninsuredVehicles = () => {
  addPopup(UninsuredVehicles, { uninsuredData: uninsuredVehsData.value })
}
</script>

<style scoped lang="scss">
.insurances-card {
  overflow-y: auto;
  color: white;
  max-height: 100%;
  height: fit-content;
  padding: 1rem;
  max-width: 90vw;
  width: fit-content;
}

.blue-background{
  background-color: var(--blue-shade-100);
}

.small-insurance-cards-wrapper{
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 1.2rem;
  overflow-x: auto;
  overflow-y: hidden;
  max-height: 100%;
  padding: 0.25rem;
}

.cards-wrapper{
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 100%;
  overflow: hidden;
}
.savings{
  font-size: 2rem;
  font-weight: 800;
}
.premium-rate{
  margin-top: 1.25rem;

  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  justify-content: center;
  align-items: center;

  border-radius: var(--bng-corners-3);
  border: 1px solid var(--bng-cool-gray-700);
  width: 100%;
  padding: 0.625rem 1.25rem;

}

.driver-score-wrapper{
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, var(--bng-cool-gray-800) 0%, var(--bng-add-blue-900) 100%);

  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-3);
  padding: 0.625rem 0.625rem;
  width:fit-content;
  align-self: center;
}
.driver-score-title{
  font-size: 1.2rem;
  font-weight: 300;
}
.driver-score-value{
  font-size: 2rem;
  font-weight: 800;
}
.driver-score-tier-risk{
  font-size: 1rem;
  font-weight: 300;
  text-align: center;
  opacity: 0.8;
}

.insurance-tiers-wrapper{
  display: flex;
  flex-direction: row;
  gap: 1.2rem;
  padding: 0 0.5rem;
  overflow: hidden;
}
.innerList {
  height: 100%;
}

.status {
  position: absolute;
  top: 0;
  right: 0;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  & :deep(.card-cnt) {
    background-color: rgba(0, 0, 0, 0.7);
  }
}
</style>
