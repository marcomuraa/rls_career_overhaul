<!-- Landing Page -->
<template>
  <ProgressView
    :skill-info="landingData.skillInfo"
    :heading-text="$t(pageHeading)"
    :breadcrumb-items="screenHeaderPath"
    :branch-style="branchStyle"
    :show-back-button="true"
    @breadcrumb-click="gotoHeaderItem"
    @breadcrumb-back="onBreadBack"
    @exit="exit"
  >
    <template #description>
      <div class="description-text">{{ $t(pageDescription) }}</div>
    </template>

    <template #default>

      <div
        v-bng-scoped-nav="{
          scopeId: PROGRESS_BRANCH_SCOPE_ID,
          type: 'container',
          preferAutoFocus: true,
          preventNavigationEscape: ['top', 'bottom', 'left', 'right'],
        }"
        class="progress-content-scope"
      >
        <div class="cards-container grid-view" v-bng-on-ui-nav:back="navigateBackFromProgress">
        <!--<BranchSkillCard
          tabindex="1"
          v-for="branch in BRANCHES.filter(b => !b.isSkill)"
          v-bng-sound-class="'bng_click_hover_generic'"
          :branchKey="branch.id"
          @openBranchPage="openBranchPage"
          @mouseenter="onBranchFocus(branch)"
          @mouseleave="onBranchBlur"
          @focus="onBranchFocus(branch)"
          @blur="onBranchBlur"
          bng-nav-item />
      -->
        <BranchSkillCard
          v-for="(branch, index) in BRANCHES"
          :key="branch.id"
          v-bng-sound-class="'bng_click_hover_generic'"
          :branchKey="branch.id"
          :autofocus="isAutofocusBranch(branch.id, index)"
          @ready="onBranchCardReady"
          @openBranchPage="openBranchPage"
          @mouseenter="onBranchFocus(branch)"
          @mouseleave="onBranchBlur"
          @focusin="onBranchFocus(branch)"
          @focusout="onBranchBlur"
          display-mode="row"
          :class="{ 'full-width': !isHalfBranch(branch) }" />
      </div>
      <div
        v-if="currentSkillToShow && currentSkillToShow.hasLevels && currentSkillToShow.unlockInfo && currentSkillToShow.unlockInfo.length && !currentSkillToShow.isInDevelopment"
        class="page-progress"
        v-bng-on-ui-nav:back="navigateBackFromProgress">
        <UnlockRows v-if="currentSkillToShow.hasUnlocks"
          class="stat-progress-bar bng-progress-bar progress-bar"
          :headerLeft="$ctx_t(currentSkillToShow.name)"
          :headerRight="$ctx_t(currentSkillToShow.levelLabel)"
          :value="currentSkillToShow.value"
          :max="currentSkillToShow.max"
          :min="currentSkillToShow.min"
          :maxRequiredValue="currentSkillToShow.maxRequiredValue"
          :tiers="currentSkillToShow.unlockInfo"
          :currentTier="currentSkillToShow.unlocked ? currentSkillToShow.level : -1"
          :unlocked="currentSkillToShow.unlocked"
          :progressFillColor="currentSkillToShow.accentColor"
        />
      </div>
      <div v-if="leagues && leagues.length > 0" class="facility-rows" v-bng-on-ui-nav:back="navigateBackFromProgress">
        <template v-for="(league, index) in leagues" :key="league.id">
          <LeagueRow
            :league="league"
            :leagueMissionClicked="leagueMissionClicked"
            :autofocus="BRANCHES.length === 0 && index === 0"
          />
        </template>
      </div>
      </div>
      <!--
      <div class="buttons-container" v-if="landingData.showMilestones">
        <BngCard
          bng-nav-item
          class="button milestone-button"
          v-bng-sound-class="'bng_click_hover_generic'"
          @click="openMilestonesScreen">
          <div class="content">
            <BngIcon class="icon" :type="icons.checkboxOn" />
            <div class="label">
              {{ $translate.instant("ui.career.milestones.title") }}
            </div>
            <div v-if="hasUnclaimedMilestones > 0" class="indicator">

            </div>
          </div>
        </BngCard>
      </div>
      -->
    </template>
  </ProgressView>
</template>

<script setup>
import { BngCard, BngIcon, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav, vBngSoundClass } from "@/common/directives"
import BranchSkillCard from "../components/progress/BranchSkillCard.vue"
import LeagueRow from "../components/progress/LeagueRow.vue"
import UnlockRows from "../components/progress/UnlockRows.vue"
import ProgressView from "../components/ProgressView.vue"
import { ref, onBeforeMount, onMounted, computed, onUnmounted, watch, nextTick } from "vue"
import { lua } from "@/bridge"
import { getBranchColorStyle } from "@/utils/colorUtils"
import { $translate } from "@/services/translation"
import { useRouteDataStore } from "@/services/routeData"
import { useScopedNav } from "@/services/scopedNav/api"

const props = defineProps({
  pathId: String
})

const PROGRESS_BRANCH_SCOPE_ID = "career-progress-landing"
const AUTO_FOCUS_BRANCH_SELECTOR = "[bng-scoped-nav-autofocus='true']"
const routeDataStore = useRouteDataStore()
const scopedNav = useScopedNav()
const currentPathId = computed(() => routeDataStore.route?.params?.pathId ?? props.pathId)
const returnRoute = computed(() => routeDataStore.route?.params?.returnRoute)
const focusPathId = computed(() => routeDataStore.route?.params?.focusPathId)
const isPauseCareerBranchRoute = computed(() => String(routeDataStore.routeName || "").startsWith("pause.career.branch"))
const progressRootRouteName = computed(() => isPauseCareerBranchRoute.value ? "pause.career" : "career.domainSelection")
const branchRouteName = computed(() => isPauseCareerBranchRoute.value ? "pause.career.branch" : "career.branchPage")
const missionDetailsRouteName = computed(() => isPauseCareerBranchRoute.value ? "pause.career.branch.missionDetails" : "career.branchPage.mission.details")
const bigmapRouteName = computed(() => isPauseCareerBranchRoute.value ? "pause.career.branch.bigmap" : "career.branchPage.bigmap")
const withReturnRoute = params => {
  if (!returnRoute.value) return params
  return { ...params, returnRoute: returnRoute.value }
}

function normalizeProgressBreadcrumbs(breadcrumbs) {
  if (!isPauseCareerBranchRoute.value || !Array.isArray(breadcrumbs)) return breadcrumbs
  const normalized = breadcrumbs.map(item => {
    if (item?.routeName === "career.domainSelection") {
      return { ...item, routeName: "pause.career" }
    }
    if (item?.routeName === "career.progressLanding" || item?.routeName === "career.branchPage") {
      return { ...item, routeName: "pause.career.branch" }
    }
    return item
  })
  return normalized
}

const landingData = ref({
  heading: "ui.career.landingPage.name",
  description: "ui.career.landingPage.description",
  branches: [],
  showMilestones: true,
  showOrganizations: true
})

const leagues = ref([])

const fetchLandingData = async () => {
  const pathId = currentPathId.value
  landingData.value = {
    heading: "ui.career.landingPage.name",
    description: "ui.career.landingPage.description",
    branches: [],
    showMilestones: true,
    showOrganizations: true
  }
  const data = await lua.career_modules_branches_landing.getLandingPageData(pathId)
  if (pathId !== currentPathId.value) return
  landingData.value = data
  leagues.value = data.leagues || []
  console.log("data", data)
  if(data.breadcrumbs) {
    screenHeaderPath.value = normalizeProgressBreadcrumbs(data.breadcrumbs)
    console.log("screenHeaderPath", screenHeaderPath.value)
  }
}


const hasUnclaimedMilestones = ref(false)
onMounted(async () => {
  await fetchLandingData()
  lua.career_modules_milestones_milestones.unclaimedMilestonesCount().then((c) => hasUnclaimedMilestones.value = c)
  focusBranchCards()
})

onBeforeMount(() => {
  lua.simTimeAuthority.pushPauseRequest('progressLanding')
})

onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest('progressLanding')
})

// Watch for canonical Lua pathId changes and refetch data when navigating between landing pages.
watch(currentPathId, async (newPathId, oldPathId) => {
  if (newPathId !== oldPathId) {
    await fetchLandingData()
    lua.career_modules_milestones_milestones.unclaimedMilestonesCount().then((c) => hasUnclaimedMilestones.value = c)
    focusBranchCards()
  }
})

watch(focusPathId, () => {
  focusBranchCards()
})

const leagueMissionClicked = mission => {
  if (mission.canStartFromProgressScreen) {
    lua.extensions.gameplay_missions_missionScreen.setPreselectedMissionId(mission.id)
    lua.extensions.gameplay_missions_missionScreen.openAPMChallenges(currentPathId.value, mission.skill[0], missionDetailsRouteName.value, withReturnRoute({ pathId: currentPathId.value }))
  } else {
    lua.extensions.gameplay_missions_missionScreen.navigateToMission(mission.id, bigmapRouteName.value, withReturnRoute({ pathId: currentPathId.value }))
  }
}

const branchStyle = computed(() => {
  if (!landingData.value.skillInfo) {
    return {
      '--branch-accent-color': 'var(--bng-cool-gray-500-rgb)',
      '--branch-color': 'var(--bng-cool-gray-500-rgb)'
    }
  }

  return getBranchColorStyle({
    color: landingData.value.skillInfo.color,
    accentColor: landingData.value.skillInfo.accentColor
  })
})

const pageHeading = computed(() => landingData.value.branchHeading || landingData.value.heading)
const currentDescription = ref(null)
const pageDescription = computed(() =>
  currentDescription.value || landingData.value.description
)
const BRANCHES = computed(() => landingData.value.branches)
const getFocusTargetBranch = () => {
  const targetBranchId = focusPathId.value || BRANCHES.value[0]?.id
  return BRANCHES.value.find(branch => branch.id === targetBranchId) || null
}
const isAutofocusBranch = (branchId, index) => {
  if (focusPathId.value) {
    return branchId === focusPathId.value
  }
  return index === 0
}

const focusBranchCards = async () => {
  await nextTick()
  const selector = focusPathId.value ? `[data-branch-id="${focusPathId.value}"]` : AUTO_FOCUS_BRANCH_SELECTOR
  scopedNav.requestScopeFocus(PROGRESS_BRANCH_SCOPE_ID, selector, {
    activeOnly: false,
    force: true,
    reason: focusPathId.value ? "career-branch-back-focus" : "career-branch-default-focus",
  })
  const focusedBranch = getFocusTargetBranch()
  if (focusedBranch) {
    onBranchFocus(focusedBranch)
  }
}

const onBranchCardReady = branchId => {
  if (branchId === getFocusTargetBranch()?.id) {
    focusBranchCards()
  }
}

const openBranchPage = branchKey => {
  console.log("openBranchPage", branchKey)
  window.bngVue.gotoGameState(branchRouteName.value, { params: withReturnRoute({ pathId: branchKey }) })
}
const exit = () => navigateBackFromProgress()

const openReputationScreen = () => window.bngVue.gotoGameState("career.organizations")



const onBranchFocus = (branch) => {
  currentDescription.value = branch.description
}

const onBranchBlur = () => {
  currentDescription.value = null
}

const isHalfBranch = (branch) => {
  const hasSkills = branch.skills && branch.skills.length > 0
  const hasDescription = branch.shortDescription
  return !hasSkills && !hasDescription
}

const currentSkillToShow = computed(() => {
  return landingData.value.skillInfo || null
})

//breadcrumbs
const screenHeaderPath = ref([
  { label: $translate.instant("ui.environment.pause"), routeName: "pause" },
  { label: landingData.value.heading, routeName: progressRootRouteName.value }
])
const gotoHeaderItem = (item, options = {}) => {
  if( item.routeName) {
    const shouldPassFocusPath =
      options.focusCurrentPath !== false &&
      isPauseCareerBranchRoute.value &&
      (item.routeName === "pause.career" || item.routeName === "pause.career.branch")
    if (shouldPassFocusPath && item.routeName === "pause.career" && typeof window !== "undefined") {
      window.__pauseCareerFocusPathId = currentPathId.value
    }
    const params = shouldPassFocusPath
      ? withReturnRoute({ ...(item.params || {}), focusPathId: currentPathId.value })
      : item.params
    if (params) {
      window.bngVue.gotoGameState(item.routeName, { params })
      return
    }
    window.bngVue.gotoGameState(item.routeName)
  }
  if(item.gotoAngularState) {
    window.bngVue.gotoAngularState(item.gotoAngularState)
  }
}
function getProgressBackTarget() {
  if (!isPauseCareerBranchRoute.value) return null
  const breadcrumbs = Array.isArray(screenHeaderPath.value) ? screenHeaderPath.value : []
  if (breadcrumbs.length >= 2) return breadcrumbs[breadcrumbs.length - 2]
  return { routeName: "pause.career" }
}

const navigateBackFromProgress = () => {
  const target = getProgressBackTarget()
  if (target) {
    gotoHeaderItem(target)
    return
  }
  lua.extensions.ui_router.back()
}
const onBreadBack = navigateBackFromProgress

</script>

<style lang="scss" scoped>
.description-text {
  font-size: 1.2rem;
  line-height: 1.2;
  height: 3rem;
  align-content: center;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
}

.page-progress {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-items: center;
  gap: 1rem;
  padding: 0.5rem;
  padding-bottom: 0;
}

.progress-content-scope {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding-top: 0.25rem;
}

.cards-container {
  flex: 0 auto;
  padding: 0 0.5rem ;
  justify-content: center;
  :deep(.stat-progress-bar) {
    font-size: 1.25rem;
  }

  &.grid-view {
    display: grid;
    grid-template-columns: 1fr 1fr ;
    gap: 0.5rem;
    align-items: stretch;
    grid-auto-flow: row dense;
    grid-auto-rows: min-content;

    > * {
        grid-column: span 2;
    }
  }
}

.facility-rows {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 0.25rem;
  background-color: rgba(black, 0.6);
  border-radius: var(--bng-corners-2);
  gap: 0.25rem;
  margin: 0.5rem;
}

.buttons-container {
  display: flex;
  justify-content: center;
  padding: 0.5rem;
  padding-top: 0rem;
  cursor: pointer;

  > * {
    flex: 1 1 auto;
    padding: 0.5rem;
    padding-top: 0rem;
    max-width: 32rem;
  }

  > .milestone-button {
    padding: 0;
  }

  .indicator {
    width: 0.75rem;
    height: 0.75rem;
    background-color: yellow;
    border-radius: 50%;
    position: absolute;
    top: 0.35rem;
    right: 1rem;
  }

  :deep(.content) {
    &:focus,
    &:hover {
      background-color: rgba(var(--bng-cool-gray-800-rgb), 0.9) !important;
    }
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    .icon {
      font-size: 3rem;
      padding-right: 1rem;
    }
    .label {
      font-size: 1.5rem;
    }
  }
}
</style>
