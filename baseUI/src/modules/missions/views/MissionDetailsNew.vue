<template>
  <LayoutSingle
    v-bng-scoped-nav="{ scopeId: 'root', trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS }"
    v-bng-on-ui-nav:tab_l="() => navigateToPage(-1)"
    v-bng-on-ui-nav:tab_r="() => navigateToPage(1)"
    v-bng-on-ui-nav:menu="gotoControl"
    class="mission-details-layout"
    @activate="handleActivate"
    @suspend="handleSuspend"
    @deactivate="handleExit">
    <div class="mission-details-layout-content">
      <div v-bng-blur class="mission-details-topbar">
        <BngButton :accent="ACCENTS.text" bng-no-nav="true" class="page-nav" @click="navigateToPage(-1)">
          <BngIcon class="arrow-icon" :type="icons.arrowSmallLeft" />
          <BngBinding ui-event="tab_l" deviceMask="xinput" :style="{ '--page-nav-icon': `'${icons.arrowSmallLeft.glyph}'` }" class="page-nav-icon" />
        </BngButton>
        <div class="details-pages-container">
          <Button
            v-for="page of availablePages"
            :key="page.value"
            class="page"
            :class="{ 'current-page': currentPage === page.value }"
            :tab-index="-1"
            :nav-item="false"
            bng-no-nav="true"
            @mousedown.prevent
            @click="(event) => { currentPage = page.value; event.currentTarget.blur() }"
          >
            <BngIcon :type="page.icon" class="page-icon-button" />
          </Button>
        </div>
        <BngButton :accent="ACCENTS.text" bng-no-nav="true" class="page-nav" @click="navigateToPage(1)">
          <BngBinding ui-event="tab_r" deviceMask="xinput" :style="{ '--page-nav-icon': `'${icons.arrowSmallRight.glyph}'` }" class="page-nav-icon" />
          <BngIcon class="arrow-icon" :type="icons.arrowSmallRight" />
        </BngButton>
      </div>

      <div class="mission-details-content">
        <div class="available-missions-container">
          <InfoCard v-if="context === 'ongoingMission' || showTasks">
            <template #header>
              <BngCardHeading type="ribbon">{{ $tt("ui.missions.details.ongoingChallenge") }}</BngCardHeading>
            </template>
            <template #content>
              <TaskList class="task-list" :header="tasksStore.header" :tasks="tasksStore.tasks" />
            </template>
            <template #button>
              <div v-if="missionStartableDetails" class="ongoing-mission-buttons">
                <BngButton
                  v-if="missionStartableDetails.continueVisible"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :accent="ACCENTS.secondary"
                  :icon-right="icons.catalog02"
                  :label="$tt('ui.missions.details.pauseMenu')"
                  class="large"
                  @click="handlePauseMenu" />

                <!-- Recovery Options -->
                <div v-if="recoveryOptions.length > 0 && !isTutorialEnabled && !hideRecoveryOptions" class="recovery-options-container">
                  <div class="recovery-options-header">{{ $tt("ui.missions.details.recoveryOptions") }}</div>
                  <div class="recovery-options-list">
                    <BngButton
                      v-for="option in recoveryOptions"
                      :key="option.key"
                      v-bng-on-ui-nav:ok.asMouse.focusRequired
                      :accent="ACCENTS.secondary"
                      :icon-right="icons[option.icon]"
                      :label="$tt(option.label)"
                      :disabled="!option.active || !option.enabled"
                      class="recovery-option-button"
                      @click="handleRecoveryOption(option.key)" />
                  </div>
                </div>
                <BngButton
                  v-if="missionStartableDetails.restartVisible"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :accent="ACCENTS.secondary"
                  :icon-right="icons.restart"
                  :label="$tt('missions.missions.general.panel.restart')"
                  :disabled="!store.customRecoveryOptionsActiveState?.restartMission?.active"
                  class="large"
                  @click="store.restartMission" />
                <BngButton
                  v-if="!hideReconfigureButton && !isTutorialEnabled"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :accent="ACCENTS.secondary"
                  :icon-right="icons.adjust"
                  :label="$tt('ui.missions.details.reconfigure')"
                  class="large"
                  @click="gotoSettings" />
                <BngButton
                  v-if="missionStartableDetails.abandonVisible"
                  :disabled="disableAbandonButton"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :icon-right="icons.abandon"
                  :accent="ACCENTS.attention"
                  :label="$tt('missions.missions.general.panel.abandon')"
                  class="large"
                  @click="store.abandonMission" />
                <BngButton
                  v-if="missionStartableDetails.continueVisible"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  bng-scoped-nav-autofocus
                  :icon-right="icons.fastTravel"
                  :label="$tt('missions.missions.general.end.continue')"
                  class="large"
                  @click="handleContinue" />
                <BngButton
                  v-if="!missionStartableDetails.startableVisible && !missionStartableDetails.continueVisible"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :icon-right="icons.lockClosed"
                  :label="$tt('ui.missions.details.locked')"
                  class="large"
                  disabled />
              </div>
            </template>
          </InfoCard>

          <InfoCard v-else>
            <template #header>
              <BngCardHeading type="ribbon">{{ $tt("ui.missions.details.availableChallenges") }}</BngCardHeading>
            </template>
            <template #content>
              <div class="mission-card-container">
                <div v-for="groupKey of missionCards.groupKeys" :key="groupKey" class="mission-group">
                  <div v-if="missionCards.groupsByKey[groupKey].label" class="group-header">
                    <div class="label">{{ $ctx_t(missionCards.groupsByKey[groupKey].label) }}</div>
                    <BngMainStars
                      v-if="missionCards.groupsByKey[groupKey].meta.formattedLeague"
                      :unlocked-stars="missionCards.groupsByKey[groupKey].meta.formattedLeague.totalStarsObtained"
                      :total-stars="missionCards.groupsByKey[groupKey].meta.formattedLeague.totalStarsAvailable"
                      class="league-stars"
                      :scale="0.6"
                      reverse
                      numerical />
                  </div>
                  <div class="mission-card-list">
                    <MissionCard
                      v-for="id in missionCards.groupsByKey[groupKey].tileIdsUnsorted"
                      v-bng-on-ui-nav:ok.asMouse.focusRequired
                      :key="id"
                      :bng-no-nav="isRootScopeSuspended && selectedMission.id !== id"
                      :data-mission-id="id"
                      :bng-scoped-nav-autofocus="
                        selectedMission.id === id || (!selectedMission.id && id === missionCards.groupsByKey[groupKey].tileIdsUnsorted[0])
                      "
                      :mission="missionCards.tilesById[id]"
                      :inactive="isDetailsScopeActive && selectedMission.id !== id"
                      :class="{ highlighted: selectedMission.id === id }"
                      class="mission-card"
                      @click.stop="selectMission(id, $event)"
                      @focusin="store.selectMission(id)" />
                  </div>
                </div>
              </div>
            </template>
            <template #button>
              <BngButton
                v-bng-on-ui-nav:ok.asMouse.focusRequired
                v-bng-sound-class="'bng_back_generic'"
                :accent="ACCENTS.attention"
                bng-no-nav="true"
                class="exit-button"
                @click="handleBack">
                <BngBinding v-if="isRootScopeActive" ui-event="back" deviceMask="xinput" />
                {{ $tt("ui.common.back") }}
              </BngButton>
            </template>
          </InfoCard>
        </div>
        <div v-bng-scoped-nav="{ scopeId: 'details-scope', type: 'container', bubbleWhitelistEvents: ['tab_l', 'tab_r', 'menu'] }" class="current-details-container">
          <InfoCard v-if="missionBasicInfo" @click="onDetailsClick">
            <template #header>

              <BngAdvCardHeading mute divider :preheadings="preheadings" :icon="missionBasicInfo.icon" class="current-details-header">
                {{ $ctx_t(missionBasicInfo.name) }}
              </BngAdvCardHeading>
              <div v-if="showMissionInfo" class="mission-info">
                <BngIcon v-if="showOfficialIcon" :type="icons.beamNG" class="official-icon" />
                {{ missionInfoString }}
              </div>
              <BngButton
                v-if="isDetailsScopeActive"
                v-bng-sound-class="'bng_back_generic'"
                :accent="ACCENTS.attention"
                bng-no-nav="true"
                tabindex="-1"
                class="details-back-binding">
                <BngIcon :type="icons.arrowSmallLeft" />
                <BngBinding ui-event="back" deviceMask="xinput" />
                {{ context === "ongoingMission" ? $tt("ui.common.back") : $tt("ui.missions.details.returnToList") }}
              </BngButton>
            </template>
            <template #content>
              <div class="details-content-container">

                <div class="details-content-entry">
                  <template v-if="currentPage === 'info'">
                    <div class="details-info-container">
                      <AspectRatio v-if="missionBasicInfo.images" class="details-info-preview">
                        <BngImageCarousel :images="missionBasicInfo.images" transition external />
                      </AspectRatio>
                      <div class="details-info-description">{{ $ctx_t(missionBasicInfo.description) }}</div>
                      <VehicleClassRequirementPanel
                        :required-vehicle-class="missionBasicInfo.requiredVehicleClass"
                        :current-vehicle-class="selectedVehicleClass"
                        background-color="rgba(255, 255, 255, 0.1)"
                        sticker-size="lg"
                        badge-size="3rem" />
                    </div>
                  </template>
                  <template v-else-if="currentPage === 'settings'">
                    <MissionSettings v-if="missionSettings && !showTasks" no-blur />
                  </template>
                  <template v-else-if="currentPage === 'leaderboards'">
                    <MissionLeaderboards v-if="selectedMission && !showTasks" no-blur />
                  </template>

                  <template v-if="currentPage === 'info' || currentPage === 'settings'">
                    <div class="details-objectives-container">
                      <MissionObjectives
                        v-if="missionProgress"
                        :stars="missionProgress.stars"
                        :message="missionProgress.message"
                        :showMessage="true"
                        :noDisabledObjectives="true"
                        no-blur
                        card-heading-type="line" />
                    </div>
                  </template>
                </div>
              </div>
            </template>
            <template #button>
              <div v-if="context === 'ongoingMission' && currentPage === 'settings'" class="ongoing-mission-reconfigure-button">
                <BngButton
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  :accent="ACCENTS.secondary"
                  :icon-right="icons.reconfigure"
                  :disabled="sameUserSettingsAsLast"
                  :label="$tt('ui.missions.details.reconfigureAndRestart')"
                  class="large"
                  @click="store.reconfigureMission" />
              </div>
              <div v-else-if="context === 'ongoingMission' && currentPage !== 'settings'" class="ongoing-mission-text">
                {{ $t("missions.missions.general.challengeCurrentlyInProgress") }}
              </div>
              <div v-else-if="context === 'availableMissions'" class="current-details-buttons">
                <div
                  v-if="currentPage === 'info' && context === 'availableMissions' && missionSettings && missionSettings.length > 0"
                  class="simple-settings-container">
                  <MissionSettingsSimple
                    :mission-settings="missionSettings"
                    :noInput="true"
                    @click="() => (currentPage = 'settings')"
                    v-bng-on-ui-nav:ok.asMouse.focusRequired />
                </div>

                <div v-if="missionBasicInfo && missionBasicInfo.entryFee" class="entry-fee">
                  <span class="label">{{ $tt("ui.missions.details.entryFee") }}</span>
                  <RewardsPills class="tiny-rewards" :rewards="missionBasicInfo.entryFee" />
                </div>
                <div v-if="missionStartableDetails.needsRepair" class="repair-item">
                  <BngSelect
                    loop
                    :options="missionStartableDetails.repairOptions"
                    :value="missionStartableDetails.selectedRepairType"
                    :config="{ label: x => x.optionsLabel, value: x => x.type }"
                    class="repair-item-control"
                    @valueChanged="store.changeRepairType" />
                </div>
                <BngButton
                  v-if="missionStartableDetails.needsRepair && missionStartableDetails.startableVisible"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  bng-scoped-nav-autofocus
                  :icon-left="icons.wrench"
                  :disabled="!missionStartableDetails.startableEnabled"
                  :label="missionStartableDetails.selectedRepairTypeLabel ? $ctx_t(missionStartableDetails.selectedRepairTypeLabel) : $tt('ui.missions.details.startChallenge')"
                  class="large"
                  @click="startMission" />
                <BngButton
                  v-else
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  bng-scoped-nav-autofocus
                  :disabled="!missionStartableDetails.startableEnabled || !missionStartableDetails.startableVisible"
                  :label="missionStartableDetails.selectedRepairTypeLabel ? $ctx_t(missionStartableDetails.selectedRepairTypeLabel) : $tt('ui.missions.details.startChallenge')"
                  class="large"
                  @click="startMission" />
              </div>
            </template>
          </InfoCard>
        </div>
      </div>
    </div>
  </LayoutSingle>
</template>

<script>
const AVAILABLE_PAGES = [
  {
    value: "info",
    label: "ui.common.info",
    icon: "medal",
  },
  {
    value: "settings",
    label: "ui.missions.details.settings",
    icon: "adjust",
  },
  {
    value: "leaderboards",
    label: "ui.missions.details.leaderboards",
    icon: "chartBars",
  },
]
</script>

<script setup>
import { ref, onBeforeMount, computed, reactive, onMounted, provide, onUnmounted, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { BngBinding, BngSelect, BngIcon, icons, BngCardHeading, BngButton, ACCENTS, BngMainStars, BngImageCarousel } from "@/common/components/base"
import { vBngBlur, vBngSoundClass, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"
import { $translate } from "@/services"
import { lua } from "@/bridge"
import { LayoutSingle } from "@/common/layouts"
import useControls from "@/services/controls"
// import { useScopedNav } from "@/services/scopedNav"
import { useScopedNav } from "@/services/scopedNav/api"
import { useMissionDetailsStore } from "@/modules/missions/stores/missionDetailsStore"
import { useTasksStore } from "@/services/tasklistStore"
import InfoCard from "../components/InfoCard.vue"
import BngAdvCardHeading from "../components/bngAdvCardHeading.vue"
import MissionCard from "@/modules/career/components/progress/MissionCard.vue"
import { AspectRatio, Button } from "@/common/components/utility"
import MissionSettings from "../components/MissionSettings.vue"
import MissionObjectives from "../components/MissionObjectives.vue"
import MissionSettingsSimple from "../components/MissionSettingsSimple.vue"
import MissionLeaderboards from "../components/MissionLeaderboards.vue"
import RewardsPills from "@/modules/career/components/progress/RewardsPills.vue"
import TaskList from "@/modules/tasks/components/TaskList.vue"
import VehicleClassRequirementPanel from "@/modules/career/components/vehiclePerformance/VehicleClassRequirementPanel.vue"

const store = useMissionDetailsStore()
const {
  context,
  missionCards,
  missionBasicInfo,
  missionStartableDetails,
  missionSettings,
  missionProgress,
  selectedMission,
  isTutorialEnabled,
  hideReconfigureButton,
  hideRecoveryOptions,
  disableAbandonButton,
  sameUserSettingsAsLast,
  preselectedPage,
  availableVehicles,
} = storeToRefs(store)
const controls = useControls()
const scopedNav = useScopedNav()
const tasksStore = useTasksStore()
const route = useRoute()

const currentPage = ref("info")

// Watch for preselected page changes
watch(
  preselectedPage,
  newPage => {
    if (newPage && AVAILABLE_PAGES.some(page => page.value === newPage)) {
      currentPage.value = newPage
    }
  },
  { immediate: true }
)

// The "Yours" sticker reflects the vehicle currently selected in mission settings,
// not the player's own vehicle. Vehicle selector settings carry the resolved
// `vehicleClass` per option (or `type === "player"` to fall back to the live
// player vehicle class). If no vehicle setting exists we fall back to the player
// vehicle directly.
const selectedVehicleClass = computed(() => {
  const settings = availableVehicles.value
  if (settings && settings.length > 0) {
    for (const s of settings) {
      const opt = s?.currentOption
      if (!opt) continue
      if (opt.type === "player") return missionBasicInfo.value?.playerVehicleClass || null
      if (opt.vehicleClass) return opt.vehicleClass
    }
    return null
  }
  return missionBasicInfo.value?.playerVehicleClass || null
})

const availablePages = computed(() => {
  return AVAILABLE_PAGES.filter(page => !(page.value === "settings" && hideReconfigureButton.value))
})

// const scopeNavState = reactive({
//   missionDetailsActivated: false,
// })
const uiState = reactive({
  missionStarted: false,
  settingsTriggered: false,
})

const isGamepadAvailable = controls.isGamepadAvailable(true)
const showTasks = computed(() => tasksStore.tasks.length > 0 && isTutorialEnabled.value)
const preheadings = computed(() => missionBasicInfo.value.missionTypeLabels.map(x => $translate.contextTranslate(x)))
const restartProperties = computed(() => {
  const showRestart = (isGamepadAvailable && isGamepadAvailable.value) || sameUserSettingsAsLast.value
  return {
    label: showRestart ? "missions.missions.general.panel.restart" : "ui.missions.details.reconfigure",
    icon: showRestart ? icons.restart : icons.reconfigure,
  }
})

const displayedAuthor = computed(() => missionBasicInfo.value.author || "")
const displayedDate = computed(() => (missionBasicInfo.value.date ? new Date(missionBasicInfo.value.date * 1000).toLocaleDateString() : ""))
const showOfficialIcon = computed(() => !!missionBasicInfo.value.official)
const showMissionInfo = computed(() => displayedAuthor.value || displayedDate.value)
const missionInfoString = computed(() => {
  if (displayedAuthor.value && displayedDate.value) {
    return `${displayedAuthor.value} • ${displayedDate.value}`
  } else if (displayedAuthor.value) {
    return displayedAuthor.value
  } else if (displayedDate.value) {
    return displayedDate.value
  } else {
    return ""
  }
})

const recoveryOptions = computed(() => {
  if (!store.customRecoveryOptionsActiveState) return []
  return Object.entries(store.customRecoveryOptionsActiveState)
    .filter(([key, option]) => option.isRecoveryOption)
    .map(([key, option]) => ({ key, ...option }))
})

/* Start provide */
const playAudio = () => lua.Engine.Audio.playOnce("AudioGui", "event:>UI>Career>Checkbox")
provide("animationSettings", {
  animate: true,
  animateOnMount: false,
  animateOnMountIntervalDelay: 0.2,
  animateOnEmptyIntervalDelay: 0.1,
  animateOnEmpty: true,
  animateNextTask: true,
  successCallback: playAudio,
})
/* End provide */

const isRootScopeActive = computed(() => {
  console.log("isRootScopeActive", scopedNav.current.value)
  return scopedNav.current.value?.id === "root"
})
const isDetailsScopeActive = computed(() => {
  console.log("isDetailsScopeActive", scopedNav.current.value)
  return scopedNav.current.value?.id === "details-scope"
})

onBeforeMount(async () => {
  lua.simTimeAuthority.pushPauseRequest('missionDetails')
  await store.init()
})

onUnmounted(() => {
  store.$dispose()
  lua.simTimeAuthority.popPauseRequest('missionDetails')
})

const startMission = () => {
  // console.log("startMission")
  uiState.missionStarted = true
  window.bngVue.gotoGameState("blank", { tryAngular: false, blankAngularJS: true })
  store.startMission()
}

const selectMission = (id, event) => {
  console.log("selectMission", id, event)
  if (event?.fromController) {
    scopedNav.activateScope("details-scope")
  }
  store.selectMission(id)
}

const navigateToPage = (direction = 1) => {
  const currentIndex = availablePages.value.findIndex(page => page.value === currentPage.value)
  const nextIndex = (currentIndex + direction + availablePages.value.length) % availablePages.value.length
  currentPage.value = availablePages.value[nextIndex].value
}

const handleBack = () => {
  if (route.name === "pause.career.branch.missionDetails") {
    window.bngVue.gotoGameState("pause.career.branch", { params: { pathId: route.params?.pathId } })
    return
  }
  if (route.name === "pause.career.missionDetails") {
    window.bngVue.gotoGameState("pause.career")
    return
  }
  lua.extensions.ui_router.back()
}

const handleContinue = async () => {
  const isMissionActive = await lua.extensions.gameplay_missions_missionScreen.isAnyMissionActive()
  if (isMissionActive) {
    const isMissionStartOrEndScreen = await lua.extensions.gameplay_missions_missionScreen.isMissionStartOrEndScreenActive()
    if (isMissionStartOrEndScreen) {
      window.bngVue.gotoGameState("mission.control", { params: { mode: isMissionStartOrEndScreen } })
      return
    }
  }

  window.bngVue.gotoGameState("play")
}

const handlePauseMenu = () => {
  window.bngVue.gotoGameState("pause")
}

const gotoMenu = () => {
  console.log("gotoMenu")
  // lua.career_career.isActive().then(isActive => {
  //   if (isActive) {
  //     window.bngVue.gotoAngularState("menu.careerPause")
  //   } else {
  //     window.bngVue.gotoAngularState("menu")
  //   }
  // })
  window.globalAngularRootScope?.$broadcast("MenuToggle")
}

const gotoControl = () => {
  // // UINav doesn't support async functions yet
  // lua.extensions.gameplay_missions_missionScreen.isAnyMissionActive().then(isMissionActive => {
  //   if (isMissionActive) {
  //     return lua.extensions.gameplay_missions_missionScreen.isMissionStartOrEndScreenActive().then(isMissionStartOrEndScreen => {
  //       if (isMissionStartOrEndScreen) {
  //         window.bngVue.gotoGameState("mission.control", { params: { mode: isMissionStartOrEndScreen } })
  //       } else {
  //         window.bngVue.gotoGameState("play")
  //       }
  //     })
  //   }
  //   window.bngVue.gotoGameState("play")
  // })
  window.globalAngularRootScope?.$broadcast("MenuToggle")
}

const gotoSettings = () => {
  currentPage.value = "settings"
  scopedNav.activateScope("details-scope")
  uiState.settingsTriggered = true
}

const onDetailsClick = event => {
  // console.log("onDetailsClick", event.target)
  scopedNav.activateScope("details-scope")
}

const handleRecoveryOption = optionKey => {
  lua.core_recoveryPrompt.buttonPressed(optionKey, { type: "vehicle", vehId: 0 })
}

async function handleExit(event) {
  console.log("handleExit", event)

  // the scope is deactivated due to the component being unmounted, likely due to a reroute
  // if so, prevent reroute
  if (event.detail.force) return

  // if abandoning or starting a mission, ignore
  const taskDataType = await lua.extensions.gameplay_missions_missionManager.getCurrentTaskdataTypeOrNil()
  console.log("taskDataType", taskDataType)
  if (taskDataType) {
    return
  }

  if (route.name === "pause.career.branch.missionDetails" || route.name === "pause.career.missionDetails") {
    handleBack()
    return
  }

  if (context.value === "ongoingMission") {
    gotoControl()
  } else {
    // window.bngVue.gotoGameState("play")
    gotoMenu()
  }
}

const isRootScopeSuspended = ref(false)
const handleActivate = () => {
  isRootScopeSuspended.value = false
}

const handleSuspend = () => {
  isRootScopeSuspended.value = true
}
</script>

<style lang="scss" scoped>
$background-color: rgba(var(--bng-off-black-rgb), 0.75);

.mission-details-layout {
  --content-flow: column;

  .mission-details-layout-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    align-self: center;
    height: 100%;
    max-width: 90rem;
    min-width: 81rem;
  }

  .arrow-icon {
    width: 0.5em;
    transform: translateX(-0.25em);
  }
  .page-nav-icon {
    padding: 0 0.25rem;
  }
}

.mission-details-topbar {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 0;
  background: $background-color;
  border-radius: 0.5rem;
  --bng-content-align: center;
}

.details-pages-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  --bng-icon-size: 1.5em;
}

.mission-details-content {
  display: flex;
  flex: 1 0.5 auto;
  padding-top: 0.5rem;
  overflow: hidden;
  height: 90%;
}

.available-missions-container {
  display: flex;
  flex-direction: column;
  max-width: 25rem;
  height: 100%;

  &::before {
    // hide the scoped nav focus frame
    opacity: 0;
  }

  :deep(.info-card) {
    height: 100%;
  }

  .mission-card-container {
    height: 100%;
  }

  .task-list {
    padding: 0;
    margin: 0 -0.5rem;
    :deep(.header-wrapper) {
      margin-left: 0;
      width: 100%;
    }
    :deep(.tasks-content) {
      padding-left: 0;
    }
    :deep(.task-goal) {
      border-radius: 0;
    }
  }
}

.mission-card-list {
  display: flex;
  flex-direction: column;

  .highlighted {
    :deep(.highlight-marker) {
      width: 0.75rem;
    }
    :deep(.condensed) {
      padding-left: 1rem;
    }
  }
}

.mission-card {
  margin: 0.25rem;
}

.ongoing-mission-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 0 auto;

  :deep(.bng-button) {
    max-width: unset;
  }
}

.recovery-options-container {
  margin: 1rem 0;
  padding: 0.75rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.recovery-options-header {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

.recovery-options-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recovery-option-button {
  :deep(.bng-button) {
    max-width: unset;
    padding: 0.5rem;
    font-size: 0.9rem;
  }
}

.current-details-container {
  display: flex;
  flex-direction: column;
  margin-left: 0.5rem;
  max-width: 65rem;
  // Quick fix to jumpy width when switching between viewing mission details
  min-width: 62.5rem;
  flex: 0 0 62.5rem;

  &::before {
    // hide the scoped nav focus frame
    opacity: 0;
  }

  > :deep(.info-card) {
    width: 100%;
    height: 100%;
    max-height: 100%;

    .info-content {
      padding: 1rem 1rem 1rem 1rem;
    }
  }

  .ongoing-mission-text {
    padding: 0.5rem;
    text-align: center;
    font-size: 1.2rem;
    font-weight: 400;
  }

  .ongoing-mission-reconfigure-button {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 400;
    width: 100%;

    :deep(.bng-button) {
      width: 100%;
      max-width: unset;
    }
  }

  .current-details-buttons {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1 0 auto;
    padding: 0.25rem;

    > .simple-settings-container {
      width: 100%;
      margin-bottom: 0.5rem;
      border-radius: 0.25rem;

      :deep(.card-cnt) {
        justify-content: flex-start;

        > * {
          flex: 0 0 auto;
        }
      }
    }

    :deep(.bng-button) {
      max-width: unset;
      padding: 0;
      margin: 0;

      .label {
        text-align: center;
      }
    }

    .entry-fee {
      display: flex;
      align-items: center;
      padding: 0.2rem;

      .label {
        padding-right: 1em;
      }
    }

    .repair-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.2rem;
      padding-top: 0;

      .repair-item-control {
        flex: 1 0 auto;

        :deep(.bng-button) {
          max-width: 2.5rem;
        }
      }
    }

    :deep(.bng-button) {
      width: 100%;
      padding: 1rem;
    }
  }

  .current-details-header {
    // margin-bottom: 1rem;
    background: rgba(0, 0, 0, 0.45);
    position: relative;

    :deep(.decorator) {
      margin-bottom: 0;
    }
  }

  .mission-info {
    opacity: 0.5;
    position: absolute;
    top: 0.5rem;
    right: 0;
    padding-right: 0.75rem;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    width: 100%;
    font-weight: 400;

    .official-icon {
      font-size: 1.2em;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
    }
  }

  .details-extra-actions {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1 0 auto;
  }
}

.details-back-binding {
  position: absolute;
  top: 2.5rem;
  right: 0.5rem;
  font-size: 1rem;
  font-weight: 400;
  z-index: 10;
}

.details-content-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  // height: 100%;

  > .details-content-entry {
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    flex-wrap: wrap;
    // max-width: 100%;
  }
}

.details-info-container {
  display: flex;
  flex-direction: column;
  flex: 1 1 50%;

  > *:not(:last-child) {
    margin-bottom: 1rem;
  }

  .details-info-preview {
    height: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    max-height: 20rem;
    position: relative;

    .bng-image-carousel {
      width: 100%;
      height: 100%;
      border-radius: 0.5rem;
      overflow: hidden;

      :deep(img) {
        border-radius: 0.5rem;
      }
    }

    .preview-overlay {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      gap: 0.25rem;

      .official-icon {
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
      }
    }
  }

  .details-info-description {
    flex: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
    position: relative;
    text-align: center;
  }

}

.details-objectives-container {
  flex: 0.5 0.5 25rem;
  // margin-left: 1.5rem;
  --bng-info-card-width: auto;
}

.details-pages-container > .page {
  --bng-button-min-width: auto;
  --bng-button-max-width: none;
  --bng-button-margin: 0.25rem;
  --bng-button-padding: 0.3rem;
  --bng-button-padding-top: 0.3rem;
  --bng-button-padding-bottom: 0.3rem;
  --bng-bg-border-radius: 0.5rem;
  --bng-bg-border-width: 0;
  --bng-bg-enabled: transparent;
  --bng-bg-hover: transparent;
  --bng-bg-active: transparent;
  --bng-bg-focus: transparent;
  --bng-bg-disabled: transparent;
  --bng-bg-border-enabled: transparent;
  --bng-bg-border-hover: transparent;
  --bng-bg-border-active: transparent;
  --bng-bg-border-focus: transparent;
  --bng-bg-border-disabled: transparent;

  // height: 100%;
  //font-size: 1.2rem;
  --bng-icon-color: var(--bng-off-white);
  --bng-icon-size: 1.8em;

  &.current-page {
    --bng-bg-enabled: rgba(255, 255, 255, 0.2);
    --bng-bg-hover: rgba(255, 255, 255, 0.2);
    --bng-bg-active: rgba(255, 255, 255, 0.2);
    --bng-bg-focus: rgba(255, 255, 255, 0.2);
    --bng-icon-color: var(--bng-orange-300);
  }
}

.details-pages-container > .page-nav-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.mission-details-content > .available-missions-container .exit-button {
  max-width: 100%;
}
</style>
