<template>
  <WizardView
    ref="wizardViewRef"
    v-bng-scoped-nav="onlineConsentScopeConfig"
    v-bng-blur
    v-bng-on-ui-nav:back="onWizardBackNav"
    v-bng-on-ui-nav:menu="backToMenu"
    title="ui.mainmenu.onlineFeatures.featureTitle"
    :preheadings="[$t('ui.mainmenu.onlineConsent.preheading')]"
    style="--wizard-height: 45rem;"
    @step-complete="onStepComplete"
    @step-change="onWizardStepChange"
    @wizard-finish="onFinish"
  >
    <WizardStep
      id="onlineFeatures"
      title="ui.options.onlineFeatures"
      type="choice"
      v-model="onlineFeaturesData"
      :auto-focus-target="{ type: 'choice', value: 'disable' }"
      :choices="[
        { value: 'disable', label: 'ui.common.no', isNo: true },
        { value: 'enable', label: 'ui.common.yes', isYes: true }
      ]"
    >
      <template #description>
        <DynamicComponent
          translate-id="ui.mainmenu.onlineFeatures.featureDescription"
          bbcode
        />
      </template>
    </WizardStep>

    <WizardStep
      id="telemetry"
      title="ui.options.telemetry"
      type="choice"
      v-model="telemetryData"
      :auto-focus-target="{ type: 'choice', value: 'disable' }"
      :auto-skip="true"
      :enabled-when="[{ step: 'onlineFeatures', value: 'enable' }]"
      :choices="[
        { value: 'disable', label: 'ui.common.no', isNo: true },
        { value: 'enable', label: 'ui.common.yes', isYes: true }
      ]"
    >
      <template #description>
        <DynamicComponent
          :translate-id="onlineFeaturesData.choice === 'enable'
            ? 'ui.mainmenu.telemetry.featureDescription'
            : 'ui.mainmenu.telemetryOnlineHint'"
          bbcode
        />
      </template>
    </WizardStep>

    <WizardStep
      id="confirmation"
      title="ui.consent.confirmation"
      type="confirmation"
      v-model="confirmationData"
      :auto-focus-target="{ type: 'navigation', value: 'finish' }"
    >
      <template #description>
        <DynamicComponent
          translate-id="ui.mainmenu.privacyPolicyHint"
          bbcode
        />
      </template>
      <WizardSummary />
    </WizardStep>
  </WizardView>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue"
import { WizardView, WizardStep, WizardSummary } from "@/common/modules/wizard"
import { DynamicComponent } from "@/common/components/utility"
import { vBngBlur, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { useScopedNav } from "@/services/scopedNav/api"
import { useSettings } from "@/services/settings"
import { lua } from "@/bridge"

const settings = useSettings()
const { requestScopeFocus } = useScopedNav()

const wizardViewRef = ref()
const currentWizardStepIndex = ref(0)
const onlineFeaturesData = ref({})
const telemetryData = ref({})
const confirmationData = ref({})

const onlineConsentScopeConfig = computed(() => ({
  scopeId: "root",
  preferAutoFocus: true,
  canDeactivate: () => currentWizardStepIndex.value === 0,
}))

const getWizardStepIndex = () => {
  const stepIndex = wizardViewRef.value?.currentStepIndex
  if (typeof stepIndex === "number") return stepIndex
  if (typeof stepIndex?.value === "number") return stepIndex.value
  return 0
}

const syncWizardStepIndex = () => {
  currentWizardStepIndex.value = getWizardStepIndex()
}

const requestWizardScopeFocus = async () => {
  await nextTick()
  requestScopeFocus("root")
}

const onStepComplete = ({ stepId, data }) => {
  if (stepId === "onlineFeatures") {
    telemetryData.value = data.choice === "enable" ? {} : { choice: "disable" }
  }
}

const onWizardStepChange = async () => {
  const previousIndex = currentWizardStepIndex.value
  // Wizard emits step-change before its async index update resolves hence wait for two ticks.
  await nextTick()
  await nextTick()
  syncWizardStepIndex()
  if (currentWizardStepIndex.value === previousIndex) return
  await requestWizardScopeFocus()
}

const onWizardBackNav = () => {
  if (currentWizardStepIndex.value === 0) return true
  wizardViewRef.value?.previousStep?.()
  return false
}

const onFinish = async () => {
  try {
    const settingsToApply = {}
    if (onlineFeaturesData.value.choice) {
      settingsToApply.onlineFeatures = onlineFeaturesData.value.choice
    }
    if (telemetryData.value.choice) {
      settingsToApply.telemetry = telemetryData.value.choice
    }
    await settings.apply(settingsToApply)

    if (settingsToApply.telemetry === "enable") {
      console.log("Starting telemetry...")
    } else if (settingsToApply.telemetry === "disable") {
      console.log("Unloading telemetry...")
    }

    backToMenu()
  } catch (error) {
    console.error("Error applying consent settings:", error)
  }
}

const backToMenu = () => lua.extensions.ui_router.navigate("menu")

onMounted(async () => {
  await settings.waitForData()
  const onlineFeatures = settings.values.onlineFeatures
  if (onlineFeatures && onlineFeatures !== "ask") {
    onlineFeaturesData.value = { choice: onlineFeatures }
  }
  const telemetry = settings.values.telemetry
  if (telemetry && telemetry !== "ask") {
    telemetryData.value = { choice: telemetry }
  }

  syncWizardStepIndex()
  await requestWizardScopeFocus()
})
</script>
