<template>
  <div bng-nav-item class="no-insurance-card" @click="$emit('open')">
    <div class="left-no-insurance">
      <BngIcon class="no-insurance-icon" :type="icons.checkmark" />
      <div class="no-insurance-text-wrapper">
        <div class="no-insurance-title">
          {{ uninsuredVehsData.title }}
        </div>
        <div class="no-insurance-description">
          {{ uninsuredVehsData.description }}
        </div>
      </div>
    </div>
    <div class="uninsured-count">
      {{ $translate.instant("ui.career.insurance.vehiclesCount", { count: uninsuredVehsData.carsUninsuredCount }) }}
    </div>
  </div>
</template>

<script setup>
import { BngIcon, icons } from "@/common/components/base"
import { $translate } from "@/services/translation"

defineEmits(["open"])

defineProps({
  uninsuredVehsData: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.no-insurance-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  justify-content: center;
  align-items: flex-start;
}

.no-insurance-icon {
  font-size: 4rem;
}

.no-insurance-title {
  font-size: 2rem;
  font-weight: 800;
  text-align: left;
}

.left-no-insurance {
  display: flex;
  flex-direction: row;
  gap: 1.25rem;
  align-items: center;
}

.no-insurance-card {
  $rad: var(--bng-corners-3);
  $f-offset: 0.5rem;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 1.2rem;
  height: 8rem;
  padding: 0.5rem 1.2rem;
  margin: 0 0.5em 0.25em 0.5em;
  justify-content: space-between;
  align-items: center;

  background-color: var(--bng-add-red-800);
  border: 3px solid var(--bng-add-red-500);
  border-radius: var(--bng-corners-3);
  cursor: pointer;
  transition: all 0.2s ease;

  @include modify-focus($rad, $f-offset);

  &:hover,
  &:focus,
  &:focus-within {
    background-color: var(--bng-add-red-700);
    border-color: var(--bng-add-red-400);
  }
}

.uninsured-count {
  display: flex;
  font-size: 1.2rem;
  font-weight: 300;
  justify-content: flex-end;
  align-items: center;
  opacity: 0.8;
}

.no-insurance-description {
  font-size: 1.2rem;
  font-weight: 300;
  text-align: left;
  opacity: 0.8;
}
</style>
