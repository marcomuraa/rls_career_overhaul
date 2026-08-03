import { computed, unref } from "vue"

function noop() {}
function noopFalse() {
  return false
}

export function useGameplayAdvancedAuxillaryTab(options = {}) {
  const showAdvancedFilters = options.showAdvancedFilters || noop
  const resetAdvancedFiltersView = options.resetAdvancedFiltersView || noop
  const setAdvancedFiltersExpanded = options.setAdvancedFiltersExpanded || null

  function onUpdateShowDetailedFilters(isExpanded = true) {
    const shouldExpand = isExpanded !== false

    if (typeof setAdvancedFiltersExpanded === "function") {
      setAdvancedFiltersExpanded(shouldExpand)
      return
    }

    if (shouldExpand) {
      showAdvancedFilters()
      return
    }

    resetAdvancedFiltersView()
  }

  const props = computed(() => ({
    searchText: unref(options.searchText) ?? "",
    filterList: unref(options.filterList) ?? [],
    filterByProp: unref(options.filterByProp) ?? {},
    commonFilters: unref(options.commonFilters) ?? [],
    onlyCommonFilters: unref(options.onlyCommonFilters) ?? true,
    displayData: unref(options.displayData) ?? [],
    managementDetails: unref(options.managementDetails) ?? {},
    detailsMode: unref(options.detailsMode) ?? "advanced",
    showDetailedFilters: unref(options.isAdvancedFiltersExpanded) ?? false,
    inlineDetailedFilters: !!unref(options.inlineDetailedFilters),
    isFilterLocked: options.isFilterLocked || noopFalse,
    isFilterOptionLocked: options.isFilterOptionLocked || noopFalse,
    isRangeFilterLocked: options.isRangeFilterLocked || noopFalse,
  }))

  const listeners = {
    "search-text-change": options.setSearchText || noop,
    "filter-toggle": options.toggleFilter || noop,
    "range-filter-update": options.updateRangeFilter || noop,
    "range-filter-reset": options.resetRangeFilter || noop,
    "display-data-update": options.updateDisplayData || noop,
    "display-data-reset": options.resetDisplayDataToDefaults || noop,
    "toggle-details-mode": options.setDetailsMode || noop,
    "update:show-detailed-filters": onUpdateShowDetailedFilters,
    "show-detailed-filters": onUpdateShowDetailedFilters,
    "execute-button": options.executeButton || noop,
  }

  return {
    props,
    listeners,
  }
}
