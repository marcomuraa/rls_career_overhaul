<template>
  <div v-bng-scoped-nav="{ scopeId: 'multistep-binding-wizard', activateOnMount: true, trapPolicy: 'always' }"
    class="multistep-binding-wizard">
    <!-- Header -->
    <div class="wizard-header">
      <div class="wizard-title">{{ $tt(actionDetails.title) }}</div>
      <div class="wizard-description">{{ $tt(actionDetails.desc) }}</div>
    </div>

    <BngDivider class="wizard-divider" />

    <!-- Progress Indicator (shown after non-axis binding is captured on step 1, or on subsequent steps) -->
    <div
      v-if="(currentStep === 1 && normalDirection.control && !normalDirection.isAxis) || (currentStep > 1 && !normalDirection.isAxis)"
      class="wizard-progress">
      <div v-for="step in steps" :key="step.id" class="progress-step" :class="{
        active: currentStep === step.id,
        completed: currentStep > step.id
      }">
        <div class="step-number">{{ step.id }}</div>
        <div class="step-label">{{ step.title }}</div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="wizard-content">
      <!-- Steps 1 & 2: Capture Bindings -->
      <template v-if="currentStep === 1 || currentStep === 2">
        <div v-if="currentStep === 2" class="step-instruction">Press the control for opposite/negative direction</div>

        <div v-if="isCapturing" class="listening-data-container">
          <div class="detecting-label">{{ $tt("ui.controls.detectingBinding") }}</div>
          <InputControlBar v-for="(axis, index) in listeningData" :key="index" :devname="axis.device"
            :control="axis.control" :value="axis.accumulated" />
        </div>

        <div v-else-if="currentDirection.control" class="captured-control">
          <BngCard>
            <BngCardHeading>Captured Control</BngCardHeading>
            <div class="control-display">
              <BngBinding :device="currentDirection.devname" :device-key="currentDirection.control" />
              <BngButton :icon="icons.edit" accent="secondary" @click="startCapture" />
            </div>
          </BngCard>
        </div>
      </template>

      <!-- Step 3: Complete -->
      <template v-if="currentStep === 3">
        <div class="completion-content">
          <BngIcon :type="icons.checkmarkBold" class="completion-icon" />
          <div class="completion-message">Binding configuration complete!</div>

          <BngCard class="summary-card">
            <BngCardHeading>Summary</BngCardHeading>
            <div class="summary-content">
              <BngRow class="options-item-row summary-row">
                <template #label>
                  <span class="summary-label">Normal Direction:</span>
                </template>
                <BngBinding :device="normalDirection.devname" :device-key="normalDirection.control" />
              </BngRow>
              <BngRow class="options-item-row summary-row">
                <template #label>
                  <span class="summary-label">Opposite Direction: </span>
                </template>
                <BngBinding :device="oppositeDirection.devname" :device-key="oppositeDirection.control" />
              </BngRow>
            </div>
          </BngCard>
        </div>
      </template>
    </div>

    <!-- Action Buttons (hidden while capturing) -->
    <div v-if="!isCapturing" class="wizard-actions">
      <BngButton v-if="currentStep > 1 && currentStep < 3" accent="secondary" class="action-button"
        @click="previousStep" v-bng-on-ui-nav:cancel.asMouse>
        {{ $tt("ui.common.back") }}
      </BngButton>

      <BngButton v-if="(currentStep === 1 && normalDirection.control && !normalDirection.isAxis) || currentStep === 2"
        :accent="canProceed ? 'primary' : 'secondary'" :disabled="!canProceed" class="action-button" @click="nextStep"
        v-bng-on-ui-nav:ok.focusRequired.asMouse>
        {{ currentStep === 2 ? $tt("ui.common.finish") : $tt("ui.common.next") }}
      </BngButton>

      <BngButton v-if="currentStep === 1" v-bng-on-ui-nav:context="editBinding" accent="secondary"
        class="action-button">
        Edit
      </BngButton>

      <BngButton accent="attention" class="action-button" @click="cancelWizard" v-bng-on-ui-nav:back,menu.asMouse>
        {{ $tt("ui.common.cancel") }}
      </BngButton>

      <BngButton v-if="(currentStep === 1 && normalDirection.isAxis) || currentStep === 3" accent="primary"
        class="action-button" @click="applyBinding" v-bng-on-ui-nav:ok.focusRequired.asMouse>
        {{ $tt("ui.common.apply") }}
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue"
import { storeToRefs } from "pinia"
import {
  BngButton,
  BngCard,
  BngCardHeading,
  BngDivider,
  BngIcon,
  icons,
  BngBinding,
  BngRow
} from "@/common/components/base"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { $translate } from "@/services"
import { useOptionsControlsStore } from "@/common/modules/options/controls/optionsControls"
import useControls from "@/services/controls"
import InputControlBar from "../hardware/InputControlBar.vue"
import "@/common/modules/options/render/itemStyle.scss"

const emit = defineEmits(["return"])

const controls = useControls()
const controlsStore = useOptionsControlsStore()
const { selectedBinding } = storeToRefs(controlsStore)

// Wizard state
const currentStep = ref(1)
const isCapturing = ref(false)
const listeningData = ref([])

// Action details from selected binding
const actionDetails = computed(() => ({
  action: selectedBinding.value?.action || "",
  title: selectedBinding.value?.title || "",
  desc: selectedBinding.value?.description || ""
}))

// Captured controls for each direction
const normalDirection = ref({
  devname: "",
  control: "",
  isAxis: false
})

const oppositeDirection = ref({
  devname: "",
  control: "",
  isAxis: false
})

const steps = computed(() => ([
  {
    id: 1,
    title: "Normal Direction",
    description: "Press the control for normal/positive direction",
  },
  {
    id: 2,
    title: "Opposite Direction",
    description: "Press the control for opposite/negative direction",
  },
  {
    id: 3,
    title: "Complete",
    description: "Binding configuration complete!",
  }
]))

// Computed properties
const currentDirection = computed(() => {
  return currentStep.value === 1 ? normalDirection.value : oppositeDirection.value
})

const canProceed = computed(() => {
  if (currentStep.value === steps.value[0].id) {
    return normalDirection.value.control !== ""
  } else if (currentStep.value === steps.value[1].id) {
    return oppositeDirection.value.control !== ""
  }
  return false
})


const nextStep = () => {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
    if (currentStep.value === 2 && !oppositeDirection.value.control) {
      // Start capture for step 2
      startCapture()
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const startCapture = async () => {
  isCapturing.value = true
  listeningData.value = []

  // Wait for next tick to ensure UI updates
  await nextTick()

  // Start listening for control input
  controls.captureBinding(true).then(
    result => {
      // Successful capture
      console.log("CAPTURED BINDING RESULT", result)
      const capturedData = {
        devname: result.devName,
        control: result.control,
        isAxis: result.controlType === "axis",
        direction: result.direction
      }

      console.log("CAPTURED DATA", capturedData)

      if (currentStep.value === 1) {
        normalDirection.value = capturedData

        // If it's an axis binding, just stop capturing and show the Apply button
        if (capturedData.isAxis) {
          console.log("Axis binding detected, waiting for user confirmation")
          isCapturing.value = false
          listeningData.value = []
          return
        }
      } else if (currentStep.value === 2) {
        // Validate that it's not the same control
        if (capturedData.devname === normalDirection.value.devname &&
          capturedData.control === normalDirection.value.control) {
          // Same control as normal direction, restart capture
          alert($translate.instant("ui.controls.multistep.sameControlError") ||
            "Please use a different control for the opposite direction")
          startCapture()
          return
        }
        oppositeDirection.value = capturedData
      }

      isCapturing.value = false
      listeningData.value = []
    },
    error => {
      // Capture cancelled or failed
      isCapturing.value = false
      listeningData.value = []
      console.error("Control capture failed:", error)
    },
    eventsRegister => {
      // Update listening data for visual feedback
      listeningData.value = Object.entries(eventsRegister)
        .filter(([_, deviceData]) => deviceData.axis && Object.keys(deviceData.axis).length > 0)
        .flatMap(([deviceName, deviceData]) =>
          Object.entries(deviceData.axis)
            .filter(([_, controlData]) => controlData.accumulated > 0.1)
            .map(([controlName, controlData]) => ({
              device: deviceName,
              control: controlName,
              ...controlData,
            }))
        )
    }
  )
}

const applyBinding = () => {
  console.log("BINDINGS", { first: normalDirection.value, second: oppositeDirection.value })

  // If we're on step 1 with an axis binding, only save the axis binding
  if (currentStep.value === 1 && normalDirection.value.isAxis) {
    const bindingData = {
      action: actionDetails.value.action,
      devname: normalDirection.value.devname,
      control: normalDirection.value.control,
    }
    controls.addNewBinding(bindingData)
    emit("return", { success: true })
    return
  }

  // Otherwise, save both bindings (button/key bindings on step 3)
  // Add first normal direction binding
  const normalDirectionData = {
    action: actionDetails.value.action,
    devname: normalDirection.value.devname,
    control: normalDirection.value.control,
  }
  controls.addNewBinding(normalDirectionData)

  // Add opposite direction binding
  const oppositeDirectionData = {
    action: actionDetails.value.action,
    devname: oppositeDirection.value.devname,
    control: oppositeDirection.value.control,
    isInverted: true,
  }
  controls.addNewBinding(oppositeDirectionData)

  emit("return", { success: true })
}

const editBinding = () => {
  startCapture()
}

const cancelWizard = () => {
  emit("return", null)
}

onMounted(() => {
  nextTick(() => {
    // Start capture for the first step
    if (currentStep.value === 1) {
      startCapture()
    }
  })
})
</script>

<style lang="scss" scoped>
.multistep-binding-wizard {
  display: flex;
  flex-direction: column;
  width: 40rem;
  max-width: 95%;
  height: auto;
  max-height: 95%;
  padding: 1.5rem;
  color: var(--bng-off-white);
  background-color: rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.wizard-header {
  margin-bottom: 0.5rem;

  .wizard-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .wizard-description {
    color: var(--bng-white-o7);
  }
}

.wizard-divider {
  margin: 1rem 0;
}

.wizard-progress {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 0 2rem;

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;

    &:not(:last-child)::after {
      content: "";
      position: absolute;
      top: 1rem;
      left: calc(100% - 3rem);
      width: 14.5rem;
      height: 2px;
      background-color: var(--bng-white-o2);
    }

    &.completed::after {
      background-color: var(--bng-orange-400);
    }

    .step-number {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bng-white-o2);
      font-weight: 600;
      margin-bottom: 0.5rem;
      position: relative;
      z-index: 1;
    }

    &.active .step-number,
    &.completed .step-number {
      background-color: var(--bng-orange-400);
      color: var(--bng-black);
    }

    .step-label {
      font-size: 0.875rem;
      text-align: center;
      color: var(--bng-white-o7);
    }

    &.active .step-label {
      color: var(--bng-white);
      font-weight: 600;
    }
  }
}

.wizard-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
  min-height: 200px;

  .step-instruction {
    font-size: 1.125rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  .listening-data-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 30rem;

    .detecting-label {
      text-align: center;
      margin-bottom: 1rem;
      font-size: 1.25rem;
      color: var(--bng-orange-400);
    }

    >*:not(:last-child) {
      margin-bottom: 0.5rem;
    }
  }

  .captured-control {
    width: 100%;
    max-width: 30rem;

    .control-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;

      .control-name {
        font-weight: 600;
      }
    }
  }

  .completion-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    .completion-icon {
      font-size: 4rem;
      color: var(--bng-green-400);
      margin-bottom: 1rem;
    }

    .completion-message {
      font-size: 1.25rem;
      text-align: center;
      margin-bottom: 2rem;
    }

    .summary-card {
      width: 100%;
      max-width: 30rem;

      .summary-content {
        padding: 1rem;

        .summary-row:not(:last-child) {
          border-bottom: 1px solid var(--bng-white-o1);
        }

        .summary-label {
          font-weight: 600;
        }
      }
    }
  }
}

.wizard-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;

  .action-button {
    min-width: 8rem;
  }
}
</style>