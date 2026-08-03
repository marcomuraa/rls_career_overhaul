<template>
  <div v-if="saveSlotData" class="career-profile-overview">
    <BngCardHeading class="profile-name" type="ribbon">
      {{ saveSlotData.displayName || saveSlotData.id }}
    </BngCardHeading>
    <ProfileStatus
      class="pause-profile-status"
      expanded
      :beamXP="saveSlotData.beamXP"
      :vouchers="saveSlotData.vouchers"
      :money="saveSlotData.money"
      :insuranceScore="saveSlotData.insuranceScore"
      :branches="saveSlotData.branches"
    />
    <div class="vehicle-name">
      <BngIcon :type="icons.car" />
      {{ currentVehicleName }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue"
import { BngCardHeading, BngIcon, icons } from "@/common/components/base"
import { lua } from "@/bridge"
import ProfileStatus from "@/modules/career/components/profiles/ProfileStatus.vue"

defineOptions({ name: "PauseCareerProfileOverview" })

const saveSlotData = ref(null)

const currentVehicleName = computed(() => makeVehicleName(saveSlotData.value?.currentVehicle))

function makeVehicleName(data) {
  if (!data) return "Walking"
  if (typeof data === "string") return data
  if (data.key === "unicycle") return "Walking"
  return data.niceName || "Walking"
}

onMounted(async () => {
  saveSlotData.value = await lua.career_career.sendCurrentProfileData()
})
</script>

<style lang="scss" scoped>
.career-profile-overview {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--bng-off-white);
}

.profile-name {
  color: var(--bng-off-white);
  font-size: 1.9rem;
  font-weight: 700;
  padding-top: 0.5rem;
}

.pause-profile-status {
  color: var(--bng-off-white);
  background: none;
  padding-bottom: 0;
  :deep(.profile-status-levels) {
    background: none;
  }
}

.vehicle-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  color: var(--bng-off-white);
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem;
  text-align: center;
}
</style>
