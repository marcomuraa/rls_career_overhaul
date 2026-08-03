<template>
  <div class="insurance-tier-card" @click="$emit('select', classId)" bng-nav-item>
    <BngIcon class="insurance-icon" :type="icons[classData.icon]" />
    <div class="insurance-tier-card-name">
      {{ classData.name }}
    </div>
    <div class="insurance-tier-card-description">
      {{ classData.description }}
    </div>
    <div class="insurance-tier-card-cars-insured">
      {{ $translate.instant("ui.career.insurance.vehiclesInsured", { count: classData.carsInsured }) }}
    </div>
  </div>
</template>

<script setup>
import { BngIcon, icons } from "@/common/components/base"
import { $translate } from "@/services/translation"

defineEmits(["select"])

defineProps({
  classId: {
    type: String,
    required: true,
  },
  classData: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.insurance-tier-card {
  $f-offset: 0.5rem;
  $rad: var(--bng-corners-3);
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  border-radius: var(--bng-corners-3);
  align-items: center;
  border: 3px solid var(--bng-ter-blue-gray-500);
  padding: 3rem 0.5rem;
  margin: 0.5rem 0;
  background: linear-gradient(135deg, var(--bng-cool-gray-800) 0%, var(--bng-add-blue-900) 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 20rem;

  // Modify the focus frame radius and offset based on tile corner radius
  @include modify-focus($rad, $f-offset);

  &:hover,
  &:focus,
  &:focus-within {
    background: linear-gradient(135deg, var(--bng-cool-gray-700) 0%, var(--bng-add-blue-800) 100%);
    border-color: rgba(255, 255, 255, 0.7);
  }
}

.insurance-icon {
  font-size: 4rem;
}

.insurance-tier-card-name {
  font-size: 2.3rem;
  font-weight: 800;
}

.insurance-tier-card-description {
  font-size: 1.1rem;
  opacity: 0.8;
  text-align: center;
}

.insurance-tier-card-cars-insured {
  width: 80%;
  font-weight: 800;
  font-size: 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  margin-top: 1.2rem;
  padding-top: 0.5rem;
  text-align: center;
}
</style>
