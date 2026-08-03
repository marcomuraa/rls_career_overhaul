<template>
  <div class="auto-skip-demo">
    <div class="demo-info">
      <h2>Auto-Skip Demo</h2>
      <p><strong>This demo shows how automatic advancement and disabled-step skipping work.</strong></p>
      <ul>
        <li><strong>advanceOnChoice</strong> - continues after a choice is selected</li>
        <li><strong>autoSkip</strong> - skips disabled steps automatically</li>
      </ul>

      <div class="instructions">
        <h3>Suggested Flow</h3>
        <ol>
          <li><strong>Choose "Basic"</strong> to continue to Basic Configuration while Advanced Configuration is skipped.</li>
          <li><strong>Choose "Advanced"</strong> to skip Basic Configuration and continue to Advanced Configuration.</li>
          <li><strong>Select a configuration option</strong> to continue to the summary.</li>
          <li><strong>Navigate back or forwards</strong> to see disabled steps skipped in both directions.</li>
        </ol>
      </div>

      <div class="debug-data">
        <h3>Current Data</h3>
        <div class="data-item">
          <strong>Setup:</strong> {{ JSON.stringify(setupData, null, 2) }}
        </div>
        <div class="data-item">
          <strong>Basic:</strong> {{ JSON.stringify(basicData, null, 2) }}
        </div>
        <div class="data-item">
          <strong>Advanced:</strong> {{ JSON.stringify(advancedData, null, 2) }}
        </div>
      </div>
    </div>

    <Wizard title="Auto-Skip Demonstration" @wizard-finish="handleFinish">
      <!-- Step 1: setup choice -->
      <WizardStep
        id="setup"
        title="Setup Type"
        type="choice"
        v-model="setupData"
        :choices="[
          { value: 'basic', label: 'Basic Setup (enables Basic Configuration)' },
          { value: 'advanced', label: 'Advanced Setup (enables Advanced Configuration)' }
        ]"
      >
        <template #description>
          <p>Choose a setup type. The selection controls which configuration step is available:</p>
          <ul>
            <li><strong>Basic:</strong> shows the Basic Configuration step and skips Advanced Configuration</li>
            <li><strong>Advanced:</strong> skips Basic Configuration and shows the Advanced Configuration step</li>
          </ul>
          <div v-if="setupData.choice" class="current-choice">
            <strong>Selected:</strong> {{ setupData.choice }}
          </div>
        </template>
      </WizardStep>

      <!-- Step 2: basic configuration, available only for basic setup -->
      <WizardStep
        id="basicConfig"
        title="Basic Configuration"
        type="choice"
        v-model="basicData"
        :auto-skip="true"
        :enabled-when="[{ step: 'setup', value: 'basic' }]"
        :choices="[
          { value: 'default', label: 'Use Default Settings' },
          { value: 'custom', label: 'Customize Basic Settings' }
        ]"
      >
        <template #description>
          <p><strong>Basic Configuration</strong></p>
          <p>This step is only shown when "Basic Setup" is selected.</p>
          <p>When "Advanced Setup" is selected, this step is automatically skipped.</p>
          <p><em>Selecting any choice continues to the next step automatically.</em></p>
          <div v-if="basicData.choice" class="current-choice">
            <strong>Basic Choice:</strong> {{ basicData.choice }}
          </div>
        </template>
      </WizardStep>

      <!-- Step 3: advanced configuration, available only for advanced setup -->
      <WizardStep
        id="advancedConfig"
        title="Advanced Configuration"
        type="choice"
        v-model="advancedData"
        :auto-skip="true"
        :enabled-when="[{ step: 'setup', value: 'advanced' }]"
        :choices="[
          { value: 'performance', label: 'Performance Mode' },
          { value: 'development', label: 'Development Mode' },
          { value: 'production', label: 'Production Mode' }
        ]"
      >
        <template #description>
          <p><strong>Advanced Configuration</strong></p>
          <p>This step is only shown when "Advanced Setup" is selected.</p>
          <p>When "Basic Setup" is selected, this step is automatically skipped.</p>
          <p><em>Selecting any choice continues to the next step automatically.</em></p>
          <div v-if="advancedData.choice" class="current-choice">
            <strong>Advanced Choice:</strong> {{ advancedData.choice }}
          </div>
        </template>
      </WizardStep>

      <!-- Step 4: summary, always shown -->
      <WizardStep
        id="summary"
        title="Configuration Summary"
        type="confirmation"
        v-model="summaryData"
      >
        <template #description>
          <p>Configuration is complete. These are the selected values:</p>
        </template>

        <WizardSummary />

        <div class="auto-skip-results">
          <h4>Auto-Skip Results</h4>
          <div class="result-item">
            <strong>Setup Type:</strong>
            <span class="choice-value">{{ setupData.choice || 'Not selected' }}</span>
          </div>
          <div class="result-item">
            <strong>Basic Config:</strong>
            <span :class="shouldShowBasic ? 'enabled' : 'skipped'">
              {{ shouldShowBasic ? (basicData.choice || 'Available') : 'Auto-skipped' }}
            </span>
          </div>
          <div class="result-item">
            <strong>Advanced Config:</strong>
            <span :class="shouldShowAdvanced ? 'enabled' : 'skipped'">
              {{ shouldShowAdvanced ? (advancedData.choice || 'Available') : 'Auto-skipped' }}
            </span>
          </div>
        </div>
      </WizardStep>
    </Wizard>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { openMessage } from "@/services/popup"
import { Wizard, WizardStep, WizardSummary } from "@/common/modules/wizard"

// State for each wizard step
const setupData = ref({})
const basicData = ref({})
const advancedData = ref({})
const summaryData = ref({})

// Derived availability used by the summary panel
const shouldShowBasic = computed(() => setupData.value.choice === "basic")
const shouldShowAdvanced = computed(() => setupData.value.choice === "advanced")

const handleFinish = async () => {
  const txt = []

  txt.push("Auto-skip demo completed.")
  txt.push("- Setup: " + JSON.stringify(setupData.value, null, 2))
  txt.push("- Basic: " + JSON.stringify(basicData.value, null, 2))
  txt.push("- Advanced: " + JSON.stringify(advancedData.value, null, 2))

  txt.push("Auto-skip results:")
  txt.push("- Setup type: " + setupData.value.choice || "None")
  txt.push("- Basic enabled: " + shouldShowBasic.value)
  txt.push("- Advanced enabled: " + shouldShowAdvanced.value)
  txt.push("- Basic data: " + basicData.value.choice || "Skipped")
  txt.push("- Advanced data: " + advancedData.value.choice || "Skipped")

  await openMessage("Auto-skip demo completed", txt.join("<br/>"))
  console.log(txt.join("\n"))
}
</script>

<style lang="scss" scoped>
.auto-skip-demo {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
  gap: 2rem;
  overflow: auto;
  padding: 1rem;
}

.demo-info {
  flex: 0 0 auto;
  max-width: 450px;
  background: var(--bng-cool-gray-800);
  padding: 1.5rem;
  border-radius: 0.5rem;
  color: #eee;
}

.demo-info h2 {
  margin-top: 0;
  color: var(--bng-purple-400);
}

.demo-info ul {
  margin: 1rem 0 0 1.5rem;
}

.instructions {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bng-purple-900);
  border: 1px solid var(--bng-purple-600);
  border-radius: 0.5rem;
}

.instructions h3 {
  margin-top: 0;
  color: var(--bng-purple-200);
}

.instructions ol {
  margin: 0.5rem 0 0 1.5rem;
}

.debug-data {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bng-cool-gray-900);
  border-radius: 0.25rem;
  font-family: var(--fnt-mono);
  font-size: 0.9rem;
}

.data-item {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: var(--bng-cool-gray-800);
  border-radius: 0.25rem;
  word-break: break-all;
}

.current-choice {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bng-purple-900);
  border: 1px solid var(--bng-purple-600);
  border-radius: 0.25rem;
  color: var(--bng-purple-200);
}

.auto-skip-results {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bng-cool-gray-800);
  border-radius: 0.5rem;
}

.result-item {
  margin: 0.5rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.choice-value {
  color: var(--bng-blue-400);
  font-weight: bold;
}

.enabled {
  color: var(--bng-green-400);
  font-weight: bold;
}

.skipped {
  color: var(--bng-orange-400);
  font-style: italic;
}
</style>
