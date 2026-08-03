<template>
  <div class="scrollable-content">
    <SearchBar
      :searchText="searchText"
      :placeholder="$t('ui.menu.gridSelector.searchPlaceholder')"
      @search-text-change="emit('search-text-change', $event)"
    />
    <DetailedFilters
      :filterList="filterList"
      :filterByProp="filterByProp"
      :searchText="searchText"
      :commonFilters="commonFilters"
      :detailsMode="detailsMode"
      :onlyCommonFilters="onlyCommonFilters"
      :isFilterLocked="isFilterLocked"
      :isFilterOptionLocked="isFilterOptionLocked"
      :isRangeFilterLocked="isRangeFilterLocked"
      @search-text-change="emit('search-text-change', $event)"
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
    <BngCardHeading type="line" class="heading">{{ $t("ui.menu.gridSelector.info.title") }}</BngCardHeading>
    <div class="scrollable-content">
      {{ $t("ui.menu.gridSelector.info.description") }}
    </div>
  </div>
</template>

<script setup>
import { BngCardHeading } from "@/common/components/base"
import SearchBar from "./SearchBar.vue"
import DetailedFilters from "./DetailedFilters.vue"
import DisplayControls from "./DisplayControls.vue"

defineProps({
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
  detailsMode: {
    type: String,
    required: true,
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
])
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
</style>
