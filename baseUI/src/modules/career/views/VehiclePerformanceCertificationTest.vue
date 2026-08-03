<template>
  <div class="certification-test-in-progress">
    <BngCard v-bng-scoped-nav="{ scopeId: 'root' }" class="certification-card">
      <div class="certification-content">
        <div>
          <div class="certificationTestText" :class="{ 'cancelling': cancellingTest }">{{ $t(assessmentProgressMessage) }}</div>
        </div>
        <div class="certification-icon">
          <BngIcon :type="icons.timeUnlockOutline" />
        </div>
      </div>
      <div class="cancelButton">
        <BngButton
          :accent="ACCENTS.RED"
          :disabled="cancellingTest"
          v-bng-on-ui-nav:back,menu.asMouse
          @click="cancelTest"
        >
          {{ $t("ui.career.vehiclePerformance.cancelTest") }}
        </BngButton>
      </div>
    </BngCard>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngCard, BngIcon, BngButton, icons, ACCENTS } from "@/common/components/base"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { lua } from "@/bridge"

const assessmentProgressMessage = ref("ui.career.vehiclePerformance.assessmentInProgress")
const cancellingTest = ref(false)

const cancelTest = () => {
  cancellingTest.value = true
  lua.career_modules_vehiclePerformance.cancelTest()
}
</script>

<style scoped lang="scss">
.certification-test-in-progress {
  padding: 1em;
  width: 20%;
  height: 20%;
}

.certification-card {
  background-color: var(--bng-black-8);
}

.certification-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.certification-icon {
  font-size: 5rem;
  color: white;
}

.certificationTestText {
  padding: 1em;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;

  &.cancelling {
    color: var(--bng-add-red-400);
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.cancelButton {
  text-align: center;
  margin: 0 auto;
}
</style>
