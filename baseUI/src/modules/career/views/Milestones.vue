<!-- Milestones -->
<template>
  <LayoutSingle v-bng-on-ui-nav:back,menu="exit" class="milestones-layout" v-bng-blur>
    <div class="milestones-wrapper">
      <!-- Route focus belongs to the milestone cards; keep this chrome out of controller navigation. -->
      <div class="milestones-actions" bng-no-child-nav="true">
        <BngBreadcrumbs
          class="milestones-breadcrumbs"
          :items="breadcrumbItems"
          limit="5"
          simple
          disable-last-item
          :navigable="false"
          :show-back-button="true"
          @back="exit"
        />
        <CareerStatus class="milestones-career-status" ref="careerStatusRef" slim />
      </div>
      <div
        class="career-milestones-card"
        v-bng-on-ui-nav:back,menu="exit">
        <div class="career-milestones-container">
          <div class="milestones-header">
            <BngScreenHeadingV2 type="2" class="header-title-v2">
              {{ $translate.instant("ui.career.milestones.title") }}
            </BngScreenHeadingV2>
          </div>
          <!-- Filters are changed via tab_l/tab_r from the card scope, not by focusing the pills. -->
          <div class="filters" bng-no-child-nav="true">
            <BngBinding class="filter-binding" ui-event="tab_l" controller />
            <BngPillFilters class="milestones-filter-pills" required ref="selectOneFilters" v-model="selectedFilters" :options="FILTER_OPTIONS" tabindex="-1" @valueChanged="filterChanged" />
            <BngBinding class="filter-binding" ui-event="tab_r" controller />
          </div>
          <div
            v-bng-scoped-nav="{
              scopeId: MILESTONES_SCOPE_ID,
              type: 'container',
              preferAutoFocus: true,
            }"
            class="milestones-list-scope"
            v-bng-on-ui-nav:tab_l="selectPreviousFilter"
            v-bng-on-ui-nav:tab_r="selectNextFilter">
            <BngList
              ref="milestonesListRef"
              big
              immediate
              :keep-alive="500"
              class="milestones-list"
              :layout="LIST_LAYOUTS.TILES"
              :tile-size-calc="milestoneTileSizeCalc"
              no-background
              nav-scroll-enabled>
              <MilestoneCard
                tabindex="1"
                v-for="(entry, index) in entries"
                :key="entry.claimId"
                :milestone="entry"
                :isCondensed="false"
                :bng-scoped-nav-autofocus="index === 0"
                @claim="claimMilestone" />
            </BngList>
          </div>
        </div>
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { LayoutSingle } from "@/common/layouts"
import { BngScreenHeadingV2, BngPillFilters, BngBreadcrumbs, BngBinding, BngList, LIST_LAYOUTS } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import MilestoneCard from "../components/milestones/MilestoneCard.vue"
import { CareerStatus } from "@/modules/career/components"
import { lua } from "@/bridge"
import { computed, nextTick, ref, onUnmounted, onBeforeMount } from "vue"

import { useRouteDataStore } from "@/services/routeData"
import { useScopedNav } from "@/services/scopedNav/api"
import { $translate } from "@/services/translation"

const MILESTONES_SCOPE_ID = "milestones"
const routeDataStore = useRouteDataStore()
const scopedNav = useScopedNav()
const careerStatusRef = ref()
const milestonesListRef = ref()
let allEntries = []
const entries = ref([])
const selectOneFilters = ref()
const selectedFilters = ref(['general'])
//const filterOnlyAll = [{ value: 0, label: "All" }]
//filteroptions should be computed in the setup function :(
const FILTER_OPTIONS = [
  { value: "general", label: $translate.instant("ui.career.milestones.filters.general") },
  { value: "all", label: $translate.instant("ui.career.milestones.filters.all") },
  { value: "mission", label: $translate.instant("ui.career.milestones.filters.mission") },
  { value: "branch", label: $translate.instant("ui.career.milestones.filters.branch") },
  { value: "delivery", label: $translate.instant("ui.career.milestones.filters.delivery") },
  { value: "money", label: $translate.instant("ui.career.milestones.filters.money") },
  { value: "speedTrap", label: $translate.instant("ui.career.milestones.filters.speedTrap") },
  { value: "insurance", label: $translate.instant("ui.career.milestones.filters.insurance") },
]

const fallbackBreadcrumbItems = computed(() => [
  { label: $translate.instant("ui.environment.pause"), routeName: "pause" },
  {
    label: $translate.instant(routeDataStore.routeName === "pause.career.milestones" ? "ui.pause.career.history" : "ui.career.landingPage.name"),
    routeName: routeDataStore.routeName === "pause.career.milestones" ? "pause.career.history" : "pause.career",
  },
  { label: $translate.instant("ui.career.milestones.title"), routeName: routeDataStore.routeName === "pause.career.milestones" ? "pause.career.milestones" : "pause.milestones" }
])
const breadcrumbItems = computed(() => routeDataStore.breadcrumbs?.length ? routeDataStore.breadcrumbs : fallbackBreadcrumbItems.value)
const milestoneTileSizeCalc = ctx => MilestoneCard.getSizeCalc()(ctx)

function sortMilestones() {
  entries.value.sort(function (a, b) {
    if (a.claimable && !b.claimable) return -1 // a is claimable, b is not, so a should come first
    if (b.claimable && !a.claimable) return 1 // b is claimable, a is not, so b should come first
    if (!a.completed && b.completed) return -1 // a is not completed, b is completed, so a should come first
    if (a.completed && !b.completed) return 1 // b is not completed, a is completed, so b should come first
    // If both are claimable or both are completed, sort by claimId
    if (a.claimId < b.claimId) return -1 // a's claimId is smaller, so it should come first
    return 1 // b's claimId is smaller or equal, so it should come first or be equal
  })
}

let currentFilter = "general"
function filterEntries() {
  if (currentFilter == "all") {
    entries.value = allEntries.filter(e => true)
  } else {
    entries.value = allEntries.filter(e => e.filter[currentFilter])
  }
  sortMilestones()
}

function filterChanged(filterList) {
  if (filterList) {
    currentFilter = filterList[0]
  }
  filterEntries()
}

async function focusMilestoneCards(reason = "milestones-default-focus") {
  await nextTick()
  await milestonesListRef.value?.scrollToIndex?.(0)
  scopedNav.requestScopeFocus(MILESTONES_SCOPE_ID, { reason })
}

function selectFilterByOffset(offset) {
  const currentFilterIndex = Math.max(0, FILTER_OPTIONS.findIndex(option => option.value === currentFilter))
  const nextFilterIndex = Math.max(0, Math.min(FILTER_OPTIONS.length - 1, currentFilterIndex + offset))
  if (nextFilterIndex === currentFilterIndex) return

  selectedFilters.value = [FILTER_OPTIONS[nextFilterIndex].value]
  filterChanged(selectedFilters.value)
  focusMilestoneCards("milestones-filter-change-focus")
}

const selectPreviousFilter = () => selectFilterByOffset(-1)
const selectNextFilter = () => selectFilterByOffset(1)

function setup(data) {
  allEntries = data.list
  let hasClaimable = false
  data.list.forEach((x) => {if(x.claimable) hasClaimable=true})
  if(hasClaimable) {
    selectedFilters.value = ['all']
    filterChanged(selectedFilters.value)
  }
  //filterOptions.value = filterOnlyAll.concat(data.filters.map((filter, index) => ({ value: index + 1, label: filter })));
  //filterOptions = computed(() => filterOnlyAll.concat(data.filters.map((filter, index) => ({ value: index + 1, label: filter }))))
  filterEntries()
  focusMilestoneCards()
}

lua.career_modules_milestones_milestones.getMilestones().then(setup)

const claimMilestone = entry => {
  lua.career_modules_milestones_milestones.claim(entry.claimId).then(replacementEntry => {
    careerStatusRef.value.updateDisplay()
    let replacementId = allEntries.findIndex(item => item.claimId === entry.claimId)

    //replace entry and exit early
    if (replacementEntry !== undefined && replacementEntry !== null && replacementId !== -1) {
      allEntries[replacementId] = replacementEntry
      filterEntries()
      return
    }

    //if no entry or no replacement id found
    allEntries[replacementId].claimable = false
    filterEntries()
  })
}

const exit = async () => {
  await lua.extensions.ui_router.back()
}

onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest('milestones')
})

onBeforeMount(() => {
  lua.simTimeAuthority.pushPauseRequest('milestones')
})

</script>

<style lang="scss" scoped>
$textcolor: #fff;
$fontsize: 1rem;

hr {
  margin: 0.5em;
  border: none;
  border-top: 1px solid var(--bng-cool-gray-600);
}

.milestones-layout {
  --content-flow: column;
  color: $textcolor;
  font-size: $fontsize;
}

.milestones-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  width: 100%;
  max-width: 76rem;
  height: 100%;
  margin: 0 auto;
  padding-top: 1rem;
}

.milestones-actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.milestones-breadcrumbs {
  $bg: rgba(0, 0, 0, 0.66);
  --background-color: #{$bg};
  --bng-breadcrumbs-enabled-opacity: 0.01;
  align-self: flex-start;
}

.milestones-career-status {
  flex: 0 0 auto;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: var(--bng-corners-2);
}

.career-milestones-card {
  display: flex;
  height: calc(100% - 2.5rem);
  width: 100%;
  overflow: hidden;
}

.career-milestones-container {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  min-width: 0;
  background: rgba(0, 0, 0, 0.8);
  border-radius: var(--bng-corners-2);
  overflow: hidden;
}

.milestones-header {
  display: flex;
  flex: 0 0 3.5rem;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.33);
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;
  --bng-heading-background-opacity: 0;

  .header-title-v2 {
    margin-left: 0.5rem;
    margin-bottom: 0.25rem;
  }
}

.milestones-list-scope {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.milestones-list {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem 0.25rem 1rem 0;
  scrollbar-gutter: stable;

  :deep(.list-content) {
    flex: 1 1 auto;
    overflow-y: scroll !important;
    scrollbar-gutter: stable;
  }

  :deep(.list-items) {
    padding-bottom: 1rem;
  }
}

.filters {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem 0.5rem 1rem;
  background: rgba(var(--bng-off-black-rgb), 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-binding {
  flex: 0 0 auto;
}

.milestones-filter-pills {
  flex: 0 1 auto;
  border-radius: 0 !important;
  background: transparent;


  :deep(.bng-pill-filters) {
    overflow: visible;
    outline: none !important;
    box-shadow: none;

    &::before {
      content: none;
    }
  }

  :deep(.pills-wrapper) {
    padding: 0;
  }
}
</style>
