<template>
  <div class="scrollable-content">
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
  </div>
</template>

<script setup>
import DetailedFilters from "./DetailedFilters.vue"

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
</style>
