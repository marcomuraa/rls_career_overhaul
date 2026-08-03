<template>
  <div class="scrollable-content">
    <SearchBar
      :searchText="searchText"
      :placeholder="$t('ui.menu.gridSelector.searchPlaceholder')"
      @search-text-change="emit('search-text-change', $event)"
    />
    <div v-if="hasAvailableFilters" class="details-mode-buttons">
      <BngButton @click="onMoreFiltersClick" :accent="ACCENTS.secondary" class="more-filters-toggle-button">
        <span class="more-filters-toggle-label">{{ $t("ui.menu.gridSelector.moreFilters") }}</span>
        <SwitchToggle class="more-filters-toggle-switch" :checked="showDetailedFilters" />
      </BngButton>
    </div>
    <DetailedFilters
      v-if="hasAvailableFilters"
      :filterList="filterList"
      :filterByProp="filterByProp"
      :commonFilters="commonFilters"
      :detailsMode="detailsMode"
      :showDetailedFilters="showDetailedFilters"
      :onlyCommonFilters="onlyCommonFilters"
      :isFilterLocked="isFilterLocked"
      :isFilterOptionLocked="isFilterOptionLocked"
      :isRangeFilterLocked="isRangeFilterLocked"
      @filter-toggle="(propName, option) => emit('filter-toggle', propName, option)"
      @range-filter-update="(propName, min, max) => emit('range-filter-update', propName, min, max)"
      @range-filter-reset="emit('range-filter-reset', $event)"
      @details-mode-change="emit('toggle-details-mode', $event)"
    />
    <DisplayControls
      :displayData="displayData"
      :detailsMode="detailsMode"
      @display-data-update="(key, value) => emit('display-data-update', key, value)"
      @display-data-reset="emit('display-data-reset')"
      @details-mode-change="emit('toggle-details-mode', $event)"
    />
    <BngCardHeading v-if="slots.managementDetails" type="line" class="heading">{{ $t("ui.menu.gridSelector.management.title") }}</BngCardHeading>
    <slot
      name="management-details"
      :managementDetails="managementDetails"
      :executeButton="(buttonId, additionalData) => emit('execute-button', buttonId, additionalData)"
    />
  </div>
</template>

<script setup>
import { computed, useSlots, watch } from "vue"
import { BngButton, BngCardHeading, ACCENTS } from "@/common/components/base"
import { SwitchToggle } from "@/common/components/utility"
import SearchBar from "./SearchBar.vue"
import DetailedFilters from "./DetailedFilters.vue"
import DisplayControls from "./DisplayControls.vue"

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
  detailsMode: {
    type: String,
    required: true,
  },
  showDetailedFilters: {
    type: Boolean,
    default: false,
  },
  inlineDetailedFilters: {
    type: Boolean,
    default: false,
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
})

const emit = defineEmits([
  "search-text-change",
  "filter-toggle",
  "range-filter-update",
  "range-filter-reset",
  "display-data-update",
  "display-data-reset",
  "toggle-details-mode",
  "update:show-detailed-filters",
  "execute-button",
])

const slots = useSlots()

// Filters are renderable when there are common chips or at least one
// filterList entry that DetailedFilters can actually display (a range filter
// or a set filter with non-empty options).
const hasAvailableFilters = computed(() => {
  if (Array.isArray(props.commonFilters) && props.commonFilters.length > 0) {
    return true
  }
  if (!Array.isArray(props.filterList)) return false
  return props.filterList.some(filter => {
    if (!filter || typeof filter !== "object") return false
    if (filter.type === "range") return true
    return Array.isArray(filter.options) && filter.options.length > 0
  })
})

watch(hasAvailableFilters, (hasFilters) => {
  if (!hasFilters && props.showDetailedFilters) {
    emit("update:show-detailed-filters", false)
  }
})

function onMoreFiltersClick() {
  if (props.inlineDetailedFilters) {
    emit("update:show-detailed-filters", !props.showDetailedFilters)
    return
  }
  emit("toggle-details-mode", "filter")
}
</script>

<style scoped lang="scss">
.scrollable-content {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.heading {
  margin-left: -0.5rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.details-mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  > * {
    max-width: unset !important;
    align-items: center;
    margin: 0 !important;
  }
}

.more-filters-toggle-button {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.more-filters-toggle-label {
  flex: 1 1 auto;
  text-align: left;
}

.more-filters-toggle-switch {
  --bng-switch-toggle-size: 1.25em;
}
</style>
