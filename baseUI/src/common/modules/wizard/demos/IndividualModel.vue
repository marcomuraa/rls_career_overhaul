<template>
  <div class="individual-demo">
    <div class="live-data">
      <h3>Individual Step Data</h3>
      <div class="step-data">
        <div><strong>User Type:</strong> {{ userTypeData.choice || 'Not selected' }}</div>
        <div><strong>Username:</strong> {{ profileData.username || 'Not entered' }}</div>
        <div><strong>Email:</strong> {{ profileData.email || 'Not entered' }}</div>
        <div><strong>Preferences:</strong> {{ preferencesData.choice || 'Not selected' }}</div>
      </div>

      <div class="cross-step-demo">
        <h4>Cross-Step Access</h4>
        <p><strong>Can access other steps:</strong> {{ canAccessOtherSteps ? 'Yes' : 'Not yet' }}</p>

        <button @click="prefillFromFirstStep" class="prefill-button">
          Pre-fill profile from user type
        </button>

        <button @click="getAllStepData" class="access-button">
          Log all step data from wizard ref
        </button>
      </div>
    </div>

    <!-- Each step owns its model, while the wizard ref allows cross-step reads -->
    <Wizard
      ref="wizardRef"
      title="Individual Models Demo"
      :preheadings="['Separated Step Data']"
      @wizard-finish="handleFinish"
    >
      <!-- User type step -->
      <WizardStep
        id="userType"
        title="User Type"
        type="choice"
        v-model="userTypeData"
        :choices="[
          { value: 'new', label: 'New User' },
          { value: 'experienced', label: 'Experienced User' }
        ]"
      >
        <template #description>
          <p>Select a user type.</p>
        </template>
      </WizardStep>

      <!-- Profile step -->
      <WizardStep 
        id="profile"
        title="Profile Information"
        type="form"
        v-model="profileData"
      >
        <template #description>
          <p>Create your profile.</p>
          <p v-if="userTypeData.choice" class="step-info">
            Detected user type: <strong>{{ userTypeData.choice }}</strong>
          </p>
        </template>

        <div class="form-fields">
          <div class="field-row">
            <label>Username</label>
            <BngInput
              v-model="profileData.username"
              placeholder="Enter username"
            />
          </div>

          <div class="field-row">
            <label>Email</label>
            <BngInput
              v-model="profileData.email"
              placeholder="your.email@example.com"
            />
          </div>

          <!-- Extra field driven by the user type step -->
          <div v-if="userTypeData.choice === 'experienced'" class="field-row">
            <label>Years of Experience</label>
            <BngInput
              v-model="profileData.experience"
              placeholder="How many years?"
            />
          </div>
        </div>
      </WizardStep>

      <!-- Preferences step -->
      <WizardStep
        id="preferences"
        title="Preferences"
        type="choice"
        v-model="preferencesData"
        :choices="userTypeData.choice === 'experienced' ? [
          { value: 'basic', label: 'Basic Setup' },
          { value: 'advanced', label: 'Advanced Setup' },
          { value: 'custom', label: 'Custom Configuration' }
        ] : [
          { value: 'basic', label: 'Basic Setup' },
          { value: 'custom', label: 'Custom Configuration' }
        ]"
      >
        <template #description>
          <p>Choose preferences for {{ profileData.username || 'this profile' }}.</p>
          <div v-if="userTypeData.choice === 'experienced'" class="experience-note">
            <em>Advanced options are available for experienced users.</em>
          </div>
        </template>
      </WizardStep>

      <!-- Summary step -->
      <WizardStep
        id="summary"
        title="Summary"
        type="custom"
        v-model="summaryData"
        :enabled-when="[{ step: 'preferences', value: 'custom' }]"
      >
        <template #description>
          <p>Review the custom configuration.</p>
        </template>

        <div class="summary-content">
          <h4>Configuration Summary</h4>
          <div class="summary-grid">
            <div><strong>User Type:</strong> {{ userTypeData.choice }}</div>
            <div><strong>Username:</strong> {{ profileData.username }}</div>
            <div><strong>Email:</strong> {{ profileData.email }}</div>
            <div v-if="profileData.experience">
              <strong>Experience:</strong> {{ profileData.experience }} years
            </div>
            <div><strong>Preference:</strong> {{ preferencesData.choice }}</div>
          </div>

          <div class="custom-settings">
            <h4>Additional Settings</h4>
            <div class="field-row">
              <label>Notification Frequency</label>
              <BngDropdown
                v-model="summaryData.notifications"
                :items="notificationOptions"
                placeholder="Select frequency"
              />
            </div>

            <div class="field-row">
              <label>Data Export Format</label>
              <BngDropdown
                v-model="summaryData.exportFormat"
                :items="exportOptions"
                placeholder="Select format"
              />
            </div>
          </div>
        </div>
      </WizardStep>

      <!-- Confirmation step -->
      <WizardStep
        id="confirmation"
        title="Ready to Finish"
        type="confirmation"
        v-model="confirmationData"
      >
        <template #description>
          <p>Review the setup for {{ profileData.username || 'this profile' }} and confirm.</p>
        </template>
      </WizardStep>
    </Wizard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { Wizard, WizardStep } from "@/common/modules/wizard"
import { BngInput, BngDropdown } from "@/common/components/base"

// Separate model for each wizard step
const userTypeData = ref({})
const profileData = ref({})
const preferencesData = ref({})
const summaryData = ref({})
const confirmationData = ref({})

// Wizard ref used for cross-step access examples
const wizardRef = ref()

// Dropdown options
const notificationOptions = [
  { value: "never", label: "Never" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "realtime", label: "Real-time" }
]

const exportOptions = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "xml", label: "XML" },
  { value: "pdf", label: "PDF" }
]

// Whether the wizard instance can be queried
const canAccessOtherSteps = computed(() => {
  return wizardRef.value !== null
})

// Cross-step helper actions
const prefillFromFirstStep = () => {
  if (userTypeData.value.choice && profileData.value.username) {
    // Build a demo email from the username and user type
    const domain = userTypeData.value.choice === "experienced" ? "pro.example.com" : "example.com"
    profileData.value.email = `${profileData.value.username}@${domain}`

    // Give experienced users a default value so the conditional field is populated
    if (userTypeData.value.choice === "experienced" && !profileData.value.experience) {
      profileData.value.experience = "5"
    }
  }
}

const getAllStepData = () => {
  // Direct access through the separate step refs
  const directData = {
    userType: userTypeData.value,
    profile: profileData.value,
    preferences: preferencesData.value,
    summary: summaryData.value,
    confirmation: confirmationData.value
  }

  // Wizard-level access can be enabled if the component exposes it
  // const wizardData = wizardRef.value?.getAllStepData?.()

  console.log("Direct data access:", directData)
}

const handleFinish = (result) => {
  console.log("Individual model wizard completed.")
  console.log("Result from wizard:", result.data)

  // The separate step refs remain available after completion
  console.log("Direct access:")
  console.log("- User type:", userTypeData.value)
  console.log("- Profile:", profileData.value)
  console.log("- Preferences:", preferencesData.value)
  console.log("- Summary:", summaryData.value)

  console.info(`Individual setup complete. User: ${profileData.value.username}`)
}

onMounted(() => {
  console.log("Wizard ref available:", !!wizardRef.value)
})
</script>

<style lang="scss" scoped>
.individual-demo {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.live-data {
  background: var(--bng-cool-gray-800);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;

  h3, h4 {
    color: var(--bng-off-white);
    margin-bottom: 1rem;
  }

  .step-data {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1.5rem;

    > div {
      padding: 0.5rem;
      background: var(--bng-cool-gray-750);
      border-radius: 0.25rem;
      color: var(--bng-cool-gray-300);

      strong {
        color: var(--bng-off-white);
      }
    }
  }

  .cross-step-demo {
    padding-top: 1.5rem;
    border-top: 1px solid var(--bng-cool-gray-600);

    p {
      color: var(--bng-cool-gray-300);
      margin-bottom: 0.5rem;

      strong {
        color: var(--bng-off-white);
      }
    }

    button {
      margin-right: 1rem;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      font-weight: 500;
      cursor: pointer;

      &.prefill-button {
        background: var(--bng-green-600);
        color: white;

        &:hover {
          background: var(--bng-green-500);
        }
      }

      &.access-button {
        background: var(--bng-orange-600);
        color: white;

        &:hover {
          background: var(--bng-orange-500);
        }
      }
    }
  }
}

.step-info {
  background: var(--bng-ter-blue-gray-700);
  padding: 0.75rem;
  border-radius: 0.25rem;
  border-left: 3px solid var(--bng-orange-500);
  color: var(--bng-cool-gray-300);

  strong {
    color: var(--bng-orange-400);
  }
}

.experience-note {
  background: var(--bng-green-800);
  padding: 0.5rem;
  border-radius: 0.25rem;
  color: var(--bng-green-300);
  font-style: italic;
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

.summary-content {
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;

    > div {
      padding: 0.75rem;
      background: var(--bng-cool-gray-750);
      border-radius: 0.25rem;
      color: var(--bng-cool-gray-300);

      strong {
        color: var(--bng-off-white);
      }
    }
  }

  .custom-settings {
    h4 {
      color: var(--bng-off-white);
      margin-bottom: 1rem;
    }

    .field-row {
      margin-bottom: 1rem;

      label {
        display: block;
        color: var(--bng-off-white);
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
    }
  }
}
</style>
