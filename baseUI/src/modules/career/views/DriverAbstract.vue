<template>
  <ComputerWrapper :title="$t('ui.career.driverAbstract.title')" @back="close">
    <BngCard class="driver-abstract-card">
      <div v-if="abstractData" class="content">
        <div class="stats-grid-3">
          <div class="score-card" :class="driverColorClass">
            <div class="score-header">
              <div class="section-title">{{ $t("ui.career.driverAbstract.driverScore") }}</div>
              <TutorialButton :icon="icons.help" :pages="['driverScore']" />
            </div>
            <div class="score-content">
              <div class="score-value" :class="driverColorClass">
                {{ abstractData.driverScore }}
              </div>
              <div class="score-info">
                <div class="score-risk" :class="driverColorClass">
                  {{ abstractData.driverScoreTier.risk }}
                </div>
                <div class="score-description">
                  {{ abstractData.driverScoreTier.description }}
                </div>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="section-title">{{ $t("ui.career.driverAbstract.totalDistanceDriven") }}</div>
            <div class="stat-value blue">
              {{ totalDistanceFormatted }}
            </div>
            <div class="distance-breakdown">
              <div class="distance-row">
                <span class="distance-label">{{ $t("ui.career.driverAbstract.insured") }}:</span>
                <span class="distance-value green">{{ insuredDistanceFormatted }}</span>
              </div>
              <div class="distance-row">
                <span class="distance-label">{{ $t("ui.career.driverAbstract.uninsured") }}:</span>
                <span class="distance-value orange">{{ uninsuredDistanceFormatted }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="section-title">{{ $t("ui.career.driverAbstract.premiumEffect") }}</div>
            <div class="stat-value" :class="premiumEffectClass">
              {{ $t(premiumEffect.key, premiumEffect.params) }}
            </div>
            <div class="stat-note">
              {{ $t("ui.career.driverAbstract.premiumEffectNote") }}
            </div>
          </div>
        </div>

        <div class="stats-grid-2">
          <div class="info-card">
            <div class="section-title">{{ $t("ui.career.driverAbstract.repairHistory") }}</div>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">{{ $t("ui.career.driverAbstract.insuranceClaims") }}:</span>
                <span class="info-value orange">{{ abstractData.repairHistory.insuranceRepairs }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t("ui.career.driverAbstract.privateRepairs") }}:</span>
                <span class="info-value green">{{ abstractData.repairHistory.privateRepairs }}</span>
              </div>
              <div class="info-row total">
                <span class="info-label">{{ $t("ui.career.driverAbstract.totalRepairs") }}:</span>
                <span class="info-value">{{ (abstractData.repairHistory.insuranceRepairs) + (abstractData.repairHistory.privateRepairs) }}</span>
              </div>
            </div>
            <div class="info-tip">
              {{ $t("ui.career.driverAbstract.privateRepairsTip") }}
            </div>
          </div>

          <div class="info-card">
            <div class="section-title">{{ $t("ui.career.driverAbstract.financialSummary") }}</div>
            <div class="info-rows">
              <div class="info-row bottom-border">
                <span class="info-label">{{ $t("ui.career.driverAbstract.vehiclesInsured") }}:</span>
                <span class="info-value blue">{{ abstractData.financialSummary.vehiclesInsuredCount }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t("ui.career.driverAbstract.premiumsPaid") }}:</span>
                <span class="info-value red"><BngUnit class="no-margin" :money="abstractData.financialSummary.totalPremiumPaid" /></span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t("ui.career.driverAbstract.deductiblesPaid") }}:</span>
                <span class="info-value orange"><BngUnit class="no-margin" :money="abstractData.financialSummary.totalDeductiblePaid" /></span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t("ui.career.driverAbstract.privateRepairs") }}:</span>
                <span class="info-value yellow"><BngUnit class="no-margin" :money="abstractData.financialSummary.totalPrivateRepairsPaid" /></span>
              </div>
              <div class="info-row total">
                <span class="info-label">{{ $t("ui.career.driverAbstract.totalSpent") }}:</span>
                <span class="info-value"><BngUnit class="no-margin" :money="abstractData.financialSummary.totalPaid" /></span>
              </div>
            </div>
            <div class="info-summary">
              <div class="info-row small">
                <span class="info-label">{{ $t("ui.career.driverAbstract.damageCovered") }}:</span>
                <span class="info-value green bold"><BngUnit class="no-margin" :money="abstractData.financialSummary.damageCoveredByInsurance" /></span>
              </div>
              <div class="info-tip blue italic">
                {{ $t("ui.career.driverAbstract.damageCoveredTip") }}
              </div>
            </div>
          </div>
        </div>

        <div class="reset-card">
          <div class="section-title">{{ $t("ui.career.driverAbstract.driverScoreReset") }}</div>
          <div class="reset-content">
            <p class="reset-description">
              {{ $t("ui.career.driverAbstract.resetDescription", { resetTo: abstractData.driverScoreReset.resetTo }) }}
            </p>
            <div class="reset-details">
              <div class="reset-row">
                <span class="reset-label">{{ $t("ui.career.driverAbstract.currentScore") }}:</span>
                <span class="reset-value" :class="canResetScore ? 'red' : 'green'">{{ abstractData.driverScore }}</span>
              </div>
              <div class="reset-row">
                <span class="reset-label">{{ $t("ui.career.driverAbstract.resetTo") }}:</span>
                <span class="reset-value green">{{ abstractData.driverScoreReset.resetTo }}</span>
              </div>
              <!-- <div v-if="resetSavingsPer100km > 0" class="reset-row savings">
                <span class="reset-label">Savings per 100km:</span>
                <span class="reset-value"><BngUnit class="no-margin" :money="resetSavingsPer100km" /></span>
              </div> -->
              <div class="reset-row cost">
                <span class="reset-label">{{ $t("ui.career.driverAbstract.resetCost") }}:</span>
                <span class="reset-value yellow large">
                  <BngUnit class="no-margin" :money="abstractData.driverScoreReset.resetCost" />
                </span>
              </div>
              <div v-if="canResetScore && resetSavingsPer100km > 0" class="reset-payback">
                {{ $t("ui.career.driverAbstract.resetPayback") }}
              </div>
            </div>
            <BngButton
              accent="custom_old"
              class="reset-button"
              :disabled="!canResetScore"
              @click="resetDriverScore"
            >
              {{
                canResetScore
                ? $t("ui.career.driverAbstract.resetButton")
                : $t("ui.career.driverAbstract.resetNotAvailable", { resetTo: abstractData.driverScoreReset.resetTo })
              }}
            </BngButton>
          </div>
        </div>
      </div>
    </BngCard>

    <!-- Tabs are shown in infobar because they are tracked events by crossfire.
     This is a hack to prevent them from displaying in the infobar -->
    <BngBinding v-show="false" ui-event="tab_l" controller />
    <BngBinding v-show="false" ui-event="tab_r" controller />
  </ComputerWrapper>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue"
import { BngCard, BngUnit, BngBinding, BngButton, icons } from "@/common/components/base"
import { useRoute } from "vue-router"
import { lua, useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import { useRouteDataStore } from "@/services/routeData"

import { TutorialButton } from "@/modules/career/components"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import ComputerWrapper from "./ComputerWrapper.vue"
import "@/modules/career/components/insurance/insuranceStyle.css"

const { units } = useBridge()
const route = useRoute()
const routeDataStore = useRouteDataStore()
const events = useEvents()

// Initial data comes from routeData (onRouteMount); post-reset updates arrive
// via the `playerAbstractData` guihook and override the routeData payload.
const resetData = ref(null)
const abstractData = computed(() => resetData.value || routeDataStore.data?.playerAbstract || null)

events.on("playerAbstractData", data => {
  resetData.value = data
})

const driverTier = computed(() => abstractData.value?.driverScoreTier)

const totalDistanceFormatted = computed(() => {
  if (!abstractData.value) return ''
  return units.buildString('length', abstractData.value.totalDistanceDriven, 0)
})

const insuredDistanceFormatted = computed(() => {
  if (!abstractData.value) return ''
  return units.buildString('length', abstractData.value.insuredDistanceDriven, 0)
})

const uninsuredDistanceFormatted = computed(() => {
  if (!abstractData.value) return ''
  return units.buildString('length', abstractData.value.uninsuredDistanceDriven, 0)
})

const premiumEffectClass = computed(() => {
  if (!driverTier.value) return ''
  const multiplier = driverTier.value.multiplier
  if (multiplier < 1) return 'green'
  if (multiplier > 1) return 'red'
  return 'neutral'
})

const premiumEffect = computed(() => {
  if (!driverTier.value) return { key: "ui.career.driverAbstract.premiumStandard" }
  const multiplier = driverTier.value.multiplier

  if (multiplier < 1) {
    return { key: "ui.career.driverAbstract.premiumSavings", params: { savings: Math.round((1 - multiplier) * 100) } }
  } else if (multiplier > 1) {
    return { key: "ui.career.driverAbstract.premiumPenalty", params: { penalty: Math.round((multiplier - 1) * 100) } }
  }
  return { key: "ui.career.driverAbstract.premiumStandard" }
})

const canResetScore = computed(() => {
  if (!abstractData.value) return false
  const currentScore = abstractData.value.driverScore
  const resetToScore = abstractData.value.driverScoreReset.resetTo
  return currentScore < resetToScore
})

const driverColorClass = computed(() => {
  if (!driverTier.value) return 'green'
  const multiplier = driverTier.value.multiplier
  if (multiplier < 1) return 'blue'
  if (multiplier < 1.1) return 'green'
  if (multiplier < 1.3) return 'yellow'
  if (multiplier < 1.5) return 'orange'
  return 'red'
})

const resetDriverScore = async () => {
  try {
    // fresh data is pushed back via the `playerAbstractData` guihook
    await lua.career_modules_insurance_insurance.resetDriverScore()
  } catch (error) {
    console.error("Failed to reset driver score:", error)
  }
}

const close = () => lua.extensions.ui_router.back()

// handlesOwnReady flow: ack the mount once the shell is rendered, then activate
// the route target scope after the routeData payload reports mounted-ready.
const isReady = computed(() => routeDataStore.routeName === route.name && routeDataStore.status === "mounted-ready")

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0

async function notifyRouteMounted() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeDataStore.routeName || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (!result?.success) return
  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null

  activateScopeWhenReady()
}

let scopeActivationRequestId = 0
async function activateScopeWhenReady() {
  if (!isReady.value) return
  if (!lastMountedAckRouteName.value) return

  const requestId = ++scopeActivationRequestId
  const routeName = route.name
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== scopeActivationRequestId) return
  if (route.name !== routeName) return

  activateRouteTargetScope()
}

watch(
  () => route.fullPath,
  () => {
    lastMountedAckRouteName.value = ""
    notifyRouteMounted()
  },
  { immediate: true }
)

watch(isReady, ready => {
  if (ready) activateScopeWhenReady()
})
</script>

<style scoped lang="scss">

.content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background-color: var(--blue-shade-100);
  color: white;
  padding: 1.5rem;
  max-height: 90vh;
  overflow-y: auto;
}

/* Header */
.abstract-header {
  margin-bottom: 0.5rem;
}

.abstract-title {
  font-size: 1.875rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.25rem;
}

.abstract-subtitle {
  font-size: 0.975rem;
  color: var(--grey-200);
}

/* Grid Layouts */
.stats-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.driver-abstract-card{
  width: 50vw;
}

.stats-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Score Card (main driver score) */
.score-card {
  background: linear-gradient(135deg, var(--grey-300), var(--grey-400));
  border-radius: 0.5rem;
  padding: 1rem;
  border: 2px solid var(--green-300);
  position: relative;

  &.blue {
    border-color: var(--blue-200);
  }

  &.green {
    border-color: var(--green-300);
  }

  &.yellow {
    border-color: var(--yellow-400);
  }

  &.orange {
    border-color: var(--orange-shade-10);
  }

  &.red {
    border-color: var(--red-400);
  }
}

.score-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--grey-200);
}

.score-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-value {
  font-size: 3.1rem;
  font-weight: 900;
}

.score-info {
  display: flex;
  flex-direction: column;
}

.score-risk {
  font-size: 1.225rem;
  font-weight: bold;
}

.score-description {
  font-size: 0.975rem;
  color: var(--grey-200);
}

/* Stat Cards */
.stat-card {
  background-color: var(--grey-300);
  border-radius: 0.5rem;
  padding: 1rem;
}

.stat-value {
  font-size: 1.975rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-value.blue {
  color: var(--blue-200);
}

.stat-unit {
  font-size: 1.35rem;
  color: var(--grey-200);
}

.distance-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--bng-cool-gray-100);
  font-size: 0.85rem;
}

.distance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.distance-label {
  color: var(--grey-200);
}

.distance-value {
  font-weight: 600;
}

.stat-note {
  font-size: 0.85rem;
  color: var(--grey-200);
  line-height: 1.5;
  margin-top: 0.5rem;
}

.info-card {
  background-color: var(--grey-300);
  border-radius: 0.5rem;
  padding: 1rem;
}

.section-title {
  font-size: 1.225rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.75rem;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.975rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row.total {
  border-top: 1px solid var(--bng-cool-gray-100);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.info-row.bottom-border {
  border-bottom: 1px solid var(--bng-cool-gray-100);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

.info-row.small {
  font-size: 0.975rem;
}

.info-label {
  color: var(--grey-200);
}

.info-row.total .info-label {
  color: white;
  font-weight: 600;
}

.info-value {
  font-weight: 600;
}

.info-value.blue {
  color: var(--blue-200);
}

.info-value.green {
  color: var(--green-300);
}

.info-value.orange {
  color: var(--orange-shade-10);
}

.info-value.red {
  color: var(--red-400);
}

.info-value.yellow {
  color: var(--yellow-400);
}

.info-value.bold {
  font-weight: bold;
}

.info-row.total .info-value {
  color: white;
  font-weight: bold;
}

.info-tip {
  font-size: 0.85rem;
  color: var(--blue-200);
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bng-cool-gray-100);
}

.info-tip.green {
  color: var(--green-300);
}

.info-tip.blue {
  color: var(--blue-200);
}

.info-tip.italic {
  font-style: italic;
}

.info-summary {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bng-cool-gray-100);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Reset Card */
.reset-card {
  background: linear-gradient(135deg, var(--purple-900), var(--purple-800));
  border: 2px solid var(--purple-500);
  border-radius: 0.5rem;
  padding: 1rem;
}

.reset-content {
  font-size: 0.975rem;
  color: var(--grey-200);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-description {
  margin: 0;
}

.highlight {
  color: white;
  font-weight: 600;
}

.reset-details {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.reset-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.reset-row.savings {
  background-color: rgba(22, 42, 41, 0.3);
  border-radius: 0.375rem;
  padding: 0.5rem;
}

.reset-row.cost {
  padding-top: 0.5rem;
  border-top: 1px solid var(--grey-300);
}

.reset-label {
  color: var(--grey-200);
}

.reset-row.cost .reset-label {
  color: white;
  font-weight: 600;
}

.reset-value {
  font-weight: bold;
}

.reset-value.green {
  color: var(--green-400);
}

.reset-value.red {
  color: var(--red-400);
}

.reset-value.yellow {
  color: var(--yellow-400);
}

.reset-value.large {
  font-size: 1.225rem;
}

.reset-payback {
  font-size: 0.85rem;
  color: var(--grey-200);
  text-align: center;
  margin-top: 0.5rem;
}

.reset-button {
  width: 100%;
  --bng-button-custom-enabled: var(--purple-600);
  --bng-button-custom-hover: var(--purple-500);
  --bng-button-custom-active: var(--purple-800);
  --bng-button-custom-disabled: var(--grey-300);
  --bng-button-custom-enabled-opacity: 1;
  --bng-button-custom-hover-opacity: 1;
  --bng-button-custom-active-opacity: 1;
  --bng-button-custom-disabled-opacity: 1;
  --bng-button-custom-text-enabled-color: white;
  --bng-button-custom-text-hover-color: white;
  --bng-button-custom-text-active-color: white;
  --bng-button-custom-text-disabled-color: var(--grey-200);
}

/* Color Classes */
.blue {
  color: var(--blue-200);
}

.green {
  color: var(--green-300);
}

.yellow {
  color: var(--yellow-400);
}

.orange {
  color: var(--orange-shade-10);
}

.red {
  color: var(--red-400);
}

.neutral {
  color: var(--grey-200);
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid-3 {
    grid-template-columns: 1fr;
  }

  .stats-grid-2 {
    grid-template-columns: 1fr;
  }
}

/* BngUnit styling */
:deep(.no-margin.info-item) {
  padding: 0;
  margin: 0;
}

</style>

