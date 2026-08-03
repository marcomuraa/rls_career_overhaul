<template>
  <div class="centralized-demo">
    <div class="live-data">
      <h3>All Wizard Data (Centralized)</h3>
      <pre>{{ JSON.stringify(wizardData, null, 2) }}</pre>

      <div class="cross-step-demo">
        <h4>Cross-Step Data Access</h4>
        <p><strong>User Type:</strong> {{ wizardData.userType?.choice || 'Not selected' }}</p>
        <p><strong>Username:</strong> {{ wizardData.profile?.username || 'Not entered' }}</p>

        <button @click="prefillFromFirstStep" class="prefill-button">
          Pre-fill profile from user type
        </button>

        <button @click="crossStepValidation" class="validation-button">
          Validate all step data
        </button>
      </div>
    </div>

    <!-- The wizard owns a single model shared by all steps -->
    <Wizard
      v-model="wizardData"
      title="Centralized Data Demo"
      :preheadings="['Single Source of Truth']"
      @wizard-finish="handleFinish"
    >
      <!-- User type step -->
      <WizardStep
        id="userType"
        title="User Type"
        type="choice"
        :choices="[
          { value: 'new', label: 'New User' },
          { value: 'experienced', label: 'Experienced User' }
        ]"
      >
        <template #description>
          <p>Select a user type.</p>
        </template>
      </WizardStep>

      <!-- Profile step can read wizardData.userType -->
      <WizardStep
        id="profile"
        title="Profile Information"
        type="form"
      >
        <template #description>
          <p>Create your profile. This step can read data from previous steps.</p>
          <p v-if="wizardData.userType?.choice" class="step-info">
            Detected user type: <strong>{{ wizardData.userType.choice }}</strong>
          </p>
        </template>

        <div class="form-fields">
          <div class="field-row">
            <label>Username</label>
            <BngInput
              v-model="wizardData.profile.username"
              placeholder="Enter username"
            />
          </div>

          <div class="field-row">
            <label>Email</label>
            <BngInput
              v-model="wizardData.profile.email"
              placeholder="your.email@example.com"
            />
          </div>

          <!-- Extra field driven by the user type step -->
          <div v-if="wizardData.userType?.choice === 'experienced'" class="field-row">
            <label>Years of Experience</label>
            <BngInput
              v-model="wizardData.profile.experience"
              placeholder="How many years?"
            />
          </div>
        </div>
      </WizardStep>

      <!-- Preferences step reads data from the earlier steps -->
      <WizardStep
        id="preferences"
        title="Preferences"
        type="choice"
        :enabled-when="[
          { condition: () => wizardData.profile?.username?.length > 2 }
        ]"
        :choices="wizardData.userType?.choice === 'experienced' ? [
          { value: 'basic', label: 'Basic Setup' },
          { value: 'advanced', label: 'Advanced Setup' },
          { value: 'custom', label: 'Custom Configuration' }
        ] : [
          { value: 'basic', label: 'Basic Setup' },
          { value: 'custom', label: 'Custom Configuration' }
        ]"
      >
        <template #description>
          <p>Choose preferences for {{ wizardData.profile?.username || 'this profile' }}.</p>
          <div v-if="wizardData.userType?.choice === 'experienced'" class="experience-note">
            <em>Advanced options are available for experienced users.</em>
          </div>
        </template>
      </WizardStep>

      <!-- Custom step with cross-step data -->
      <WizardStep
        id="summary"
        title="Summary"
        type="custom"
        :enabled-when="[{ step: 'preferences', value: 'custom' }]"
      >
        <template #description>
          <p>Custom configuration for {{ wizardData.profile?.username || 'this profile' }}.</p>
        </template>

        <div class="summary-content">
          <h4>Configuration Summary</h4>
          <div class="summary-grid">
            <div><strong>User Type:</strong> {{ wizardData.userType?.choice }}</div>
            <div><strong>Username:</strong> {{ wizardData.profile?.username }}</div>
            <div><strong>Email:</strong> {{ wizardData.profile?.email }}</div>
            <div v-if="wizardData.profile?.experience">
              <strong>Experience:</strong> {{ wizardData.profile.experience }} years
            </div>
            <div><strong>Preference:</strong> {{ wizardData.preferences?.choice }}</div>
          </div>

          <div class="custom-settings">
            <h4>Custom Settings</h4>
            <div class="field-row">
              <label>Theme</label>
              <BngDropdown
                v-model="wizardData.summary.theme"
                :items="themeOptions"
                placeholder="Select theme"
              />
            </div>

            <div class="field-row">
              <label>Language</label>
              <BngDropdown
                v-model="wizardData.summary.language"
                :items="languageOptions"
                placeholder="Select language"
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
      >
        <template #description>
          <p>Review the setup for {{ wizardData.profile?.username || 'this profile' }} and confirm.</p>
        </template>
      </WizardStep>
    </Wizard>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { Wizard, WizardStep } from "@/common/modules/wizard"
import { BngInput, BngDropdown } from "@/common/components/base"

// Single model shared across all wizard steps
const wizardData = ref({
  userType: {},
  profile: {},
  preferences: {},
  summary: {},
  confirmation: {},
})

// Dropdown options
const themeOptions = [
  { value: "dark", label: "Dark Theme" },
  { value: "light", label: "Light Theme" },
  { value: "auto", label: "Auto (System)" },
]

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
]

// Cross-step helper actions
const prefillFromFirstStep = () => {
  if (wizardData.value.userType.choice && wizardData.value.profile.username) {
    // Build a demo email from the username and user type
    const domain = wizardData.value.userType.choice === "experienced" ? "pro.example.com" : "example.com"
    wizardData.value.profile.email = `${wizardData.value.profile.username}@${domain}`

    // Give experienced users a default value so the conditional field is populated
    if (wizardData.value.userType.choice === "experienced" && !wizardData.value.profile.experience) {
      wizardData.value.profile.experience = "5"
    }
  }
}

const crossStepValidation = () => {
  const issues = []

  if (!wizardData.value.userType.choice) {
    issues.push("User type not selected")
  }

  if (!wizardData.value.profile.username || wizardData.value.profile.username.length < 3) {
    issues.push("Username must be at least 3 characters")
  }

  if (wizardData.value.userType.choice === "experienced" && !wizardData.value.profile.experience) {
    issues.push("Experience years required for experienced users")
  }

  if (issues.length > 0) {
    console.error("Validation Issues:\n" + issues.join("\n"))
  } else {
    console.info("All validation checks passed.")
  }
}

const handleFinish = (result) => {
  console.log("Centralized wizard completed.")
  console.log("Result from wizard:", result.data)
  console.log("Direct access to centralized data:", wizardData.value)

  // All step data is available through the shared wizard model
  console.info(`Centralized setup complete. User: ${wizardData.value.profile.username}`)
}
</script>

<style lang="scss" scoped>
.centralized-demo {
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
  color: #eee;

  h3, h4 {
    color: var(--bng-off-white);
    margin-bottom: 1rem;
  }

  pre {
    background: var(--bng-cool-gray-900);
    padding: 1rem;
    border-radius: 0.25rem;
    color: var(--bng-green-300);
    font-size: 0.875rem;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }

  .cross-step-demo {
    margin-top: 1.5rem;
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

      &.validation-button {
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
