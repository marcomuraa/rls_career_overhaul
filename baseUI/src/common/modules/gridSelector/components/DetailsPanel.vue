<template>
  <div
    class="details-wrapper wide"
    :class="{ active: activeSectionScope === 'details', 'no-controller': !showIfController }"
  >
    <BlurBackground />
    <div
      class="header-row"
      :class="{ active: activeSectionScope === 'details' && showIfController, 'no-controller': !showIfController }"
      bng-no-child-nav="true"
    >
      <div class="details-mode-tabs">
        <BngBinding
          v-show="canSwitchDetails && showIfController && activeSectionScope === 'grid'"
          class="details-mode-tabs-binding"
          ui-event="context"
          controller
          track-ignore
        />
        <BngTabs
          v-model="activeDetailsTabIndex"
          icon-only
          show-tooltips
          show-bindings
          use-bindings
          class="details-mode-tabs-control"
          @change="requestSwitchDetailsModeByIndex"
        >
          <div v-if="!hiddenTabs.includes('detail')" tab-heading="Details" :tab-icon="icons.info">Details</div>
          <div v-if="!hiddenTabs.includes('advanced')" tab-heading="Advanced" :tab-icon="icons.laneProperties">Advanced</div>
          <div v-if="!hiddenTabs.includes('filter')" tab-heading="Filters" :tab-icon="icons.filter">Filters</div>
          <div v-if="!hiddenTabs.includes('displayControls')" tab-heading="Display" :tab-icon="icons.adjust">Display</div>
        </BngTabs>
      </div>
    </div>

    <DetailsPanelAdvanced
      v-if="detailsMode === 'advanced'"
      :searchText="searchText"
      :filterList="filterList"
      :filterByProp="filterByProp"
      :commonFilters="commonFilters"
      :onlyCommonFilters="onlyCommonFilters"
      :displayData="displayData"
      :managementDetails="managementDetails"
      :detailsMode="detailsMode"
      :isFilterLocked="isFilterLocked"
      :isFilterOptionLocked="isFilterOptionLocked"
      :isRangeFilterLocked="isRangeFilterLocked"
      @search-text-change="emit('search-text-change', $event)"
      @filter-toggle="(propName, option) => emit('filter-toggle', propName, option)"
      @range-filter-update="(propName, min, max) => emit('range-filter-update', propName, min, max)"
      @range-filter-reset="emit('range-filter-reset', $event)"
      @display-data-update="(key, value) => emit('display-data-update', key, value)"
      @display-data-reset="emit('display-data-reset')"
      @toggle-details-mode="emit('toggle-details-mode', $event)"
      @execute-button="(buttonId, additionalData) => emit('execute-button', buttonId, additionalData)"
    >
      <template #management-details="{ managementDetails, executeButton }">
        <slot
          name="management-details"
          :managementDetails="managementDetails"
          :executeButton="executeButton"
        />
      </template>
    </DetailsPanelAdvanced>

    <DetailsPanelFilter
      v-else-if="detailsMode === 'filter'"
      :searchText="searchText"
      :filterList="filterList"
      :filterByProp="filterByProp"
      :commonFilters="commonFilters"
      :onlyCommonFilters="onlyCommonFilters"
      :detailsMode="detailsMode"
      :isFilterLocked="isFilterLocked"
      :isFilterOptionLocked="isFilterOptionLocked"
      :isRangeFilterLocked="isRangeFilterLocked"
      @search-text-change="emit('search-text-change', $event)"
      @filter-toggle="(propName, option) => emit('filter-toggle', propName, option)"
      @range-filter-update="(propName, min, max) => emit('range-filter-update', propName, min, max)"
      @range-filter-reset="emit('range-filter-reset', $event)"
      @toggle-details-mode="emit('toggle-details-mode', $event)"
    />

    <DetailsPanelDisplayControls
      v-else-if="detailsMode === 'displayControls'"
      :displayData="displayData"
      :detailsMode="detailsMode"
      @display-data-update="(key, value) => emit('display-data-update', key, value)"
      @display-data-reset="emit('display-data-reset')"
      @toggle-details-mode="emit('toggle-details-mode', $event)"
    />

    <slot
      v-else-if="detailsMode === 'detail' && hasSelectedItem"
      name="item-details"
      :activeItem="activeItem"
      :activeItemDetails="activeItemDetails"
      :executeButton="executeButton"
      :toggleFavourite="toggleFavourite"
      :exploreFolder="exploreFolder"
      :goToMod="goToMod"
    />

    <DetailsPanelDetail
      v-else-if="detailsMode === 'detail'"
      :searchText="searchText"
      :filterList="filterList"
      :filterByProp="filterByProp"
      :commonFilters="commonFilters"
      :onlyCommonFilters="onlyCommonFilters"
      :displayData="displayData"
      :detailsMode="detailsMode"
      :isFilterLocked="isFilterLocked"
      :isFilterOptionLocked="isFilterOptionLocked"
      :isRangeFilterLocked="isRangeFilterLocked"
      @search-text-change="emit('search-text-change', $event)"
      @filter-toggle="(propName, option) => emit('filter-toggle', propName, option)"
      @range-filter-update="(propName, min, max) => emit('range-filter-update', propName, min, max)"
      @range-filter-reset="emit('range-filter-reset', $event)"
      @display-data-update="(key, value) => emit('display-data-update', key, value)"
      @display-data-reset="emit('display-data-reset')"
      @toggle-details-mode="emit('toggle-details-mode', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngBinding, BngTabs, icons } from "@/common/components/base"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import DetailsPanelAdvanced from "./DetailsPanelAdvanced.vue"
import DetailsPanelFilter from "./DetailsPanelFilter.vue"
import DetailsPanelDisplayControls from "./DetailsPanelDisplayControls.vue"
import DetailsPanelDetail from "./DetailsPanelDetail.vue"

const props = defineProps({
  searchText: {
    type: String,
    default: "",
  },
  filterList: {
    type: Array,
    default: () => [],
  },
  filterByProp: {
    type: Object,
    default: () => ({}),
  },
  commonFilters: {
    type: Array,
    default: () => [],
  },
  onlyCommonFilters: {
    type: Boolean,
    default: true,
  },
  displayData: {
    type: Array,
    default: () => [],
  },
  managementDetails: {
    type: Object,
    default: () => ({}),
  },
  activeItem: {
    type: Object,
    default: null,
  },
  activeItemDetails: {
    type: Object,
    default: null,
  },
  isFilterLocked: {
    type: Function,
    default: () => false,
  },
  isFilterOptionLocked: {
    type: Function,
    default: () => false,
  },
  isRangeFilterLocked: {
    type: Function,
    default: () => false,
  },
  activeSectionScope: {
    type: String,
    required: true,
  },
  showIfController: {
    type: Boolean,
    required: true,
  },
  canSwitchDetails: {
    type: Boolean,
    required: true,
  },
  hiddenTabs: {
    type: Array,
    default: () => [],
  },
  detailsMode: {
    type: String,
    required: true,
  },
  hasSelectedItem: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  "switch-details-mode",
  "toggle-details-mode",
  "set-details-scope",
  "search-text-change",
  "filter-toggle",
  "range-filter-update",
  "range-filter-reset",
  "display-data-update",
  "display-data-reset",
  "execute-button",
  "toggle-item-favorite",
  "explore-folder",
  "go-to-mod",
])

const allDetailsModes = Object.freeze(["detail", "advanced", "filter", "displayControls"])

const visibleDetailsModes = computed(() =>
  allDetailsModes.filter(mode => !props.hiddenTabs.includes(mode))
)

const activeDetailsTabIndex = computed(() => {
  const detailsIndex = visibleDetailsModes.value.findIndex(mode => mode === props.detailsMode)
  return detailsIndex >= 0 ? detailsIndex : 0
})

const requestSwitchDetailsModeByIndex = tab => {
  const index = typeof tab === "number" ? tab : (tab?.index ?? 0)
  const selectedMode = visibleDetailsModes.value[index]
  if (!selectedMode || selectedMode === props.detailsMode) return
  emit("switch-details-mode", selectedMode)
}

const executeButton = (buttonId, additionalData) => emit("execute-button", buttonId, additionalData)
const toggleFavourite = item => emit("toggle-item-favorite", item)
const exploreFolder = path => emit("explore-folder", path)
const goToMod = modId => emit("go-to-mod", modId)
</script>

<style scoped lang="scss">
.details-wrapper {
  position: relative;
  background-color: rgba(0, 0, 0, 0.5);
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 0.5rem;
  color: white;
  flex: 1 0 30rem;
  align-self: stretch;

  &::before {
    display: none !important;
  }

  &.wide {
    padding-bottom: 0;
  }
}

.header-row {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.25);
  --bng-heading-background-opacity: 0;
  min-height: 3.6rem;
  flex: 0 0 auto;

  &.no-controller {
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.details-mode-tabs {
  width: 100%;
  height: 3.6rem;
  display: flex;
  align-items: center;
}

.details-mode-tabs-binding {
  flex: 0 0 auto;
  padding-right: 0.5rem;
  padding-left: 0.5rem;
  align-self: center;
  --bng-icon-size: 1.5rem;
  text-shadow: 0 0 0.25rem #0008;
}

.details-mode-tabs-control {
  flex: 1 1 auto;
  min-width: 0;
  --tab-list-padding: 0;
  --tab-list-bottom-border: 0;
  --tab-content-overflow: hidden;

  :deep(.tab-content) {
    display: none;
  }
}
</style>
