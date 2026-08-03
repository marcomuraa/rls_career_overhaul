<template>
  <div class="comprehensive-demo">
    <Wizard
      ref="wizardRef"
      title="Comprehensive Setup Wizard"
      :preheadings="['Getting Started', 'Full Example']"
      @step-complete="handleStepComplete"
      @wizard-finish="handleFinish"
    >
      <!-- Welcome step -->
      <WizardStep
        id="welcome"
        title="Welcome"
        type="choice"
        v-model="welcomeData"
        :choices="[
          { value: 'yes', label: 'Yes, I am new' },
          { value: 'no', label: 'No, I have used this before' }
        ]"
      >
        <template #description>
          <p>Welcome to the setup wizard. Are you a new user?</p>
          <p><em>Choice steps continue automatically after a selection.</em></p>
        </template>
      </WizardStep>

      <!-- Profile step -->
      <WizardStep
        id="profile"
        title="Your Profile"
        type="form"
        v-model="profileData"
        :validator="validateProfile"
        :enabled-when="[{ step: 'welcome', value: 'yes' }]"
      >
        <template #description>
          <p>Create your profile with a username of at least 3 characters.</p>
        </template>

        <div class="form-fields">
          <div class="field-row">
            <label>Username *</label>
            <BngInput
              v-model="profileData.username"
              placeholder="Enter your username (min 3 chars)"
              :required="true"
            />
            <div class="validation-status">
              <span v-if="profileData.username && profileData.username.length >= 3" class="validation-pass">
                Username is valid.
              </span>
              <span v-else-if="profileData.username" class="validation-fail">
                Username must be at least 3 characters.
              </span>
              <span v-else class="validation-fail">
                Username is required.
              </span>
            </div>
          </div>
        </div>
      </WizardStep>

      <!-- Preferences step with array-based conditions -->
      <WizardStep
        id="preferences"
        title="Preferences"
        type="choice"
        v-model="preferencesData"
        :enabled-when="[
          { step: 'welcome', value: 'yes' },
          { step: 'profile', condition: (data) => data?.username?.length > 2 }
        ]"
        :advance-disabled="!isPreferencesReady"
        :choices="[
          { value: 'tutorial', label: 'Start with a tutorial' },
          { value: 'explore', label: 'Explore on my own' },
          { value: 'settings', label: 'Configure settings first' }
        ]"
      >
        <template #description>
          <p>Since this is a new profile with a valid username, choose what to open first.</p>
          <p><strong>Advance-disabled example</strong></p>
          <p>This step also requires the field below before continuing.</p>

          <div class="demo-form">
            <div class="field-row">
              <label>Reason for creating a new profile</label>
              <BngInput
                v-model="preferencesData.reason"
                floating-label="Required before continuing"
                required
              />
            </div>
            <div class="validation-status">
              <span v-if="isPreferencesReady" class="valid">
                Required field complete. You can continue.
              </span>
              <span v-else class="invalid">
                Fill in the required field to continue.
              </span>
            </div>
          </div>
        </template>
      </WizardStep>

      <!-- Custom step with default slot content -->
      <WizardStep
        id="custom"
        title="Custom Introduction"
        type="custom"
        v-model="customData"
        :enabled-when="[{ step: 'preferences', value: 'tutorial' }]"
      >
        <template #description>
          <p>This description is supplied through the description slot.</p>
        </template>

        <!-- The default slot can render arbitrary step content -->
        <div class="custom-welcome">
          This block is provided directly through the WizardStep default slot.
          <h3>Tutorial Selection</h3>
          <div class="tutorial-options">
            <button @click="setTutorialChoice('basic')" class="tutorial-btn">
              Basic Tutorial
            </button>
            <button @click="setTutorialChoice('advanced')" class="tutorial-btn">
              Advanced Tutorial
            </button>
          </div>
          <span v-if="tutorialChoice" class="choice-display">
            Selected tutorial: <strong>{{ tutorialChoice }}</strong>
          </span>
        </div>
      </WizardStep>

      <!-- Confirmation step -->
      <WizardStep
        id="confirmation"
        title="Ready to Finish"
        type="confirmation"
        v-model="confirmationData"
        :require-agreement="true"
        agreement-text="I agree to the Terms of Service"
      >
        <template #description>
          <p>Setup is ready to finish.</p>
          <p>Review the selected values before continuing:</p>
        </template>

        <WizardSummary :custom="customSummaryData" />
      </WizardStep>
    </Wizard>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { Wizard, WizardStep, WizardSummary } from "@/common/modules/wizard"
import { BngInput } from "@/common/components/base"

// Step model data
const welcomeData = ref({})
const profileData = ref({})
const preferencesData = ref({})
const customData = ref({})
const confirmationData = ref({})

// Local state used by the custom step
const tutorialChoice = ref("")
const wizardRef = ref(null)

// Store the selected tutorial type in both local and step state
const setTutorialChoice = (choice) => {
  tutorialChoice.value = choice

  // Keep the custom step data in sync with the custom slot UI
  customData.value.tutorialType = choice
}

// Profile step validation
const validateProfile = data => data.username?.length >= 3

// This drives the advance-disabled example in the preferences step
const isPreferencesReady = computed(() => preferencesData.value.reason?.length > 3)

// Extra rows shown by WizardSummary
const customSummaryData = computed(() => {
  const customItems = []

  // Include the form value, which is not part of the built-in choice summary
  if (profileData.value.username) {
    customItems.push({
      label: "Username",
      value: profileData.value.username,
      disabled: false
    })
  }

  // Include the tutorial selected in the custom step
  if (tutorialChoice.value) {
    customItems.push({
      label: "Tutorial Type",
      value: tutorialChoice.value.charAt(0).toUpperCase() + tutorialChoice.value.slice(1),
      disabled: false
    })
  }

  return customItems
})

// Clear data from steps that become unavailable after the welcome choice changes
const resetSkippedStepsData = () => {
  profileData.value = {}
  preferencesData.value = {}
  customData.value = {}
  tutorialChoice.value = ""
  console.log("Cleared data for skipped steps")
}

const handleStepComplete = ({ stepId, data }) => {
  // Choosing "no" bypasses the profile, preferences, and custom steps
  if (stepId === "welcome" && data.choice === "no") {
    resetSkippedStepsData()
  }
}

const handleFinish = (result) => {
  console.log("Setup wizard completed.", result.data)

  // The step refs can be read directly when the wizard completes
  console.log("User is new:", welcomeData.value.choice === "yes")
  console.log("Username:", profileData.value.username)
  console.log("First preference:", preferencesData.value.choice)
  console.log("Tutorial type:", customData.value.tutorialType)

  console.info(`Setup complete. User: ${profileData.value.username}`)
}
</script>

<style lang="scss" scoped>
.simple-demo {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.custom-welcome {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  overflow: auto;

  h3 {
    color: var(--bng-off-white);
    margin-bottom: 1rem;
  }

  p {
    color: var(--bng-cool-gray-300);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .tutorial-options {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;

    .tutorial-btn {
      padding: 0.75rem 1.5rem;
      background: var(--bng-ter-blue-gray-700);
      border: 1px solid var(--bng-ter-blue-gray-600);
      border-radius: 0.375rem;
      color: var(--bng-off-white);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--bng-ter-blue-gray-600);
        border-color: var(--bng-ter-blue-gray-500);
      }
      &:active {
        background: var(--bng-ter-blue-gray-800);
      }
    }
  }

  .choice-display {
    color: var(--bng-green-400);
    font-weight: 500;

    strong {
      color: var(--bng-green-300);
    }
  }
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    label {
      font-weight: 500;
      color: var(--bng-off-white);
    }
  }
}

.demo-form {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--bng-ter-blue-gray-600);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
}

.validation-status {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.validation-status .valid {
  color: var(--bng-green-400);
}

.validation-status .invalid {
  color: var(--bng-orange-400);
}
</style>
