<template>
  <div class="grid-selector" v-bng-blur>
    <div class="content-container">
      <slot name="side-panel" />

      <GridPanel
        v-bng-scoped-nav="{
          scopeId: GRID_SCOPE_ID,
          canBubbleEvent: resolvedCanBubbleGridEvent,
          canDeactivate: resolvedCanDeactivateGrid,
          preferAutoFocus: true,
        }"
        v-bng-on-ui-nav:context="() => emit('toggle-section-scope')"
        v-bng-ui-nav-label:context="$t('ui.menu.gridSelector.filtersAndMore')"
        v-bng-on-ui-nav:back="() => emit('back-from-grid')"
        :screen-header-title="resolvedScreenHeaderTitle"
        :active-section-scope="resolvedActiveSectionScope"
        :show-if-controller="resolvedShowIfController"
        :can-switch-details="resolvedCanSwitchDetails"
        :in-details="isGridInDetailMode"
        :display-size="resolvedDisplaySize"
        :auto-focus-key="resolvedAutoFocusKey"
        :active-item="resolvedActiveItem"
        :groups="resolvedGroups"
        :loading="resolvedLoading"
        :tile-images-top-aligned="props.tileImagesTopAligned"
        bng-no-nav="true"
        tabindex="-1"
        @focus-item="emit('focus-item', $event)"
        @select-item="emit('select-item', $event)"
        @deselect-item="emit('deselect-item')"
        @double-click-item="onItemDoubleClick"
        @activate="emit('grid-activate')"
      />

      <DetailsPanel
        v-bng-scoped-nav="{
          scopeId: DETAILS_SCOPE_ID,
          canDeactivate: () => false,
          canBubbleEvent: resolvedCanBubbleDetailsEvent,
          bubbleWhitelistEvents: ['menu'],
        }"
        v-bng-on-ui-nav:context="() => emit('toggle-section-scope')"
        v-bng-ui-nav-label:context="$t('ui.menu.gridSelector.filtersAndMore')"
        v-bng-on-ui-nav:action_2="() => emit('toggle-favorite')"
        v-bng-ui-nav-label:action_2="$t('ui.menu.gridSelector.toggleFavorite')"
        v-bng-on-ui-nav:back.focusRequired="() => emit('back-from-details')"
        :search-text="resolvedSearchText"
        :filter-list="resolvedFilterList"
        :filter-by-prop="resolvedFilterByProp"
        :common-filters="resolvedCommonFilters"
        :only-common-filters="resolvedOnlyCommonFilters"
        :display-data="resolvedDisplayData"
        :management-details="resolvedManagementDetails"
        :active-item="resolvedActiveItem"
        :active-item-details="resolvedActiveItemDetails"
        :is-filter-locked="resolvedIsFilterLocked"
        :is-filter-option-locked="resolvedIsFilterOptionLocked"
        :is-range-filter-locked="resolvedIsRangeFilterLocked"
        :active-section-scope="resolvedActiveSectionScope"
        :show-if-controller="resolvedShowIfController"
        :can-switch-details="resolvedCanSwitchDetails"
        :hidden-tabs="props.hiddenTabs"
        :details-mode="resolvedDetailsMode"
        :has-selected-item="resolvedHasSelectedItem"
        bng-no-nav="true"
        tabindex="-1"
        @activate="emit('details-activate')"
        @switch-details-mode="emit('switch-details-mode', $event)"
        @toggle-details-mode="emit('toggle-details-mode', $event)"
        @set-details-scope="emit('set-details-scope')"
        @search-text-change="emit('search-text-change', $event)"
        @filter-toggle="(...args) => emit('filter-toggle', ...args)"
        @range-filter-update="(...args) => emit('range-filter-update', ...args)"
        @range-filter-reset="(...args) => emit('range-filter-reset', ...args)"
        @display-data-update="(...args) => emit('display-data-update', ...args)"
        @display-data-reset="emit('display-data-reset')"
        @execute-button="(...args) => emit('execute-button', ...args)"
        @toggle-item-favorite="emit('toggle-item-favorite', $event)"
        @explore-folder="emit('explore-folder', $event)"
        @go-to-mod="emit('go-to-mod', $event)"
      >
        <template #item-details="slotProps">
          <slot name="item-details" v-bind="slotProps" />
        </template>
        <template #management-details="slotProps">
          <slot name="management-details" v-bind="slotProps" />
        </template>
      </DetailsPanel>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngBlur, vBngOnUiNav, vBngScopedNav, vBngUiNavLabel } from "@/common/directives"
import {
  DETAILS_SCOPE_ID,
  GRID_SCOPE_ID,
} from "./composables/gridSelectorHelpers"
import GridPanel from "./components/GridPanel.vue"
import DetailsPanel from "./components/DetailsPanel.vue"

/**
 * Presentational GridSelector contract.
 *
 * The component owns UI composition/scoped-nav wiring only.
 * Smart parents provide state and handle all emitted requests.
 *
 * Props:
 * - Grid state: `groups`, `displaySize`, `screenHeaderTitle`, `activeItem`, `autoFocusKey`.
 * - Details data: `activeItemDetails`, `managementDetails`, `displayData`.
 * - Search/filter state: `searchText`, `filterList`, `filterByProp`, `commonFilters`, `onlyCommonFilters`.
 * - Route/scope state: `activeSectionScope`, `showIfController`, `detailsMode`, `hasSelectedItem`.
 * - Details behavior: `canSwitchDetails`, `detailsModeTitles`, `detailsModeBackTo`.
 * - Optional chrome/config: `hiddenTabs`, `tileImagesTopAligned`, `inlineHeaderContainer`.
 * - Optional lock delegates (used by filters): `isFilterLocked`, `isFilterOptionLocked`, `isRangeFilterLocked`.
 * - Optional scoped-nav delegates: `canBubbleGridEvent`, `canBubbleDetailsEvent`, `canDeactivateGrid`.
 *
 * Notes:
 * - Details/search/filter props are optional and default-safe; they are consumed when details content is visible
 *   (`detailsMode !== "detail"` or `detailsMode === "detail"` without a selected item).
 */
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
  activeItemDetails: {
    type: Object,
    default: null,
  },
  isFilterLocked: {
    type: Function,
    default: null,
  },
  isFilterOptionLocked: {
    type: Function,
    default: null,
  },
  isRangeFilterLocked: {
    type: Function,
    default: null,
  },
  groups: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  displaySize: {
    type: String,
    default: "medium",
  },
  screenHeaderTitle: {
    type: String,
    default: "",
  },
  activeItem: {
    type: Object,
    default: null,
  },
  autoFocusKey: {
    type: String,
    default: null,
  },
  activeSectionScope: {
    type: String,
    default: "grid",
  },
  showIfController: {
    type: Boolean,
    default: true,
  },
  detailsMode: {
    type: String,
    default: "detail",
  },
  hasSelectedItem: {
    type: Boolean,
    default: false,
  },
  canSwitchDetails: {
    type: Boolean,
    default: true,
  },
  hiddenTabs: {
    type: Array,
    default: () => [],
  },
  tileImagesTopAligned: {
    type: Boolean,
    default: false,
  },
  canBubbleGridEvent: {
    type: Function,
    default: () => false,
  },
  canBubbleDetailsEvent: {
    type: Function,
    default: () => false,
  },
  canDeactivateGrid: {
    type: Function,
    default: () => false,
  },
})

/**
 * Emits from GridSelector.
 *
 * UI signal:
 * - `focus-item(item)` is a focus/preselection signal from grid navigation.
 *
 * Selection/detail scope requests:
 * - `select-item(item)`, `deselect-item()`, `item-double-click(item)`, `toggle-favorite()`.
 * - `switch-details-mode(mode)`, `toggle-details-mode(mode)`, `set-details-scope()`.
 * - `toggle-section-scope()`, `grid-activate()`, `details-activate()`.
 * - `back-from-grid()`, `back-from-details()`.
 *
 * Details panel data/action requests:
 * - `search-text-change(searchText)`.
 * - `filter-toggle(propName, option)`.
 * - `range-filter-update(propName, min, max)`, `range-filter-reset(propName)`.
 * - `display-data-update(key, value)`, `display-data-reset()`.
 * - `execute-button(buttonId, additionalData)`.
 * - `toggle-item-favorite(item)`, `explore-folder(path)`, `go-to-mod(modId)`.
 */
const emit = defineEmits([
  "focus-item",
  "select-item",
  "deselect-item",
  "item-double-click",
  "toggle-favorite",
  "switch-details-mode",
  "toggle-details-mode",
  "set-details-scope",
  "grid-activate",
  "details-activate",
  "toggle-section-scope",
  "back-from-details",
  "back-from-grid",
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
const resolvedGroups = computed(() => Array.isArray(props.groups) ? props.groups : [])
const resolvedLoading = computed(() => props.loading === true)
const resolvedDisplaySize = computed(() => props.displaySize || "medium")
const resolvedScreenHeaderTitle = computed(() => props.screenHeaderTitle || "")
const resolvedActiveItem = computed(() => props.activeItem || null)
const resolvedAutoFocusKey = computed(() => props.autoFocusKey || null)
const resolvedActiveSectionScope = computed(() => props.activeSectionScope || "grid")
const resolvedShowIfController = computed(() => props.showIfController)
const resolvedDetailsMode = computed(() => props.detailsMode || "detail")
const resolvedHasSelectedItem = computed(() => props.hasSelectedItem === true)
const resolvedCanSwitchDetails = computed(() => props.canSwitchDetails === true)
const resolvedSearchText = computed(() => props.searchText || "")
const resolvedFilterList = computed(() => Array.isArray(props.filterList) ? props.filterList : [])
const resolvedFilterByProp = computed(() => props.filterByProp || {})
const resolvedCommonFilters = computed(() => Array.isArray(props.commonFilters) ? props.commonFilters : [])
const resolvedOnlyCommonFilters = computed(() => props.onlyCommonFilters !== false)
const resolvedDisplayData = computed(() => Array.isArray(props.displayData) ? props.displayData : [])
const resolvedManagementDetails = computed(() => props.managementDetails || {})
const resolvedActiveItemDetails = computed(() => props.activeItemDetails || null)
const resolvedCanBubbleGridEvent = event => props.canBubbleGridEvent(event)
const resolvedCanBubbleDetailsEvent = event => props.canBubbleDetailsEvent(event)
const resolvedCanDeactivateGrid = () => props.canDeactivateGrid()
const resolvedIsFilterLocked = (...args) => {
  if (typeof props.isFilterLocked !== "function") {
    return false
  }
  return props.isFilterLocked(...args)
}
const resolvedIsFilterOptionLocked = (...args) => {
  if (typeof props.isFilterOptionLocked !== "function") {
    return false
  }
  return props.isFilterOptionLocked(...args)
}
const resolvedIsRangeFilterLocked = (...args) => {
  if (typeof props.isRangeFilterLocked !== "function") {
    return false
  }
  return props.isRangeFilterLocked(...args)
}

const isGridInDetailMode = computed(() => {
  return resolvedActiveSectionScope.value === "details" && resolvedDetailsMode.value === "detail"
})

function onItemDoubleClick(item) {
  if (!item?.doubleClickDetails) {
    return
  }
  emit("item-double-click", item)
}

</script>

<style scoped lang="scss">
.grid-selector {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.25em;
  min-width: 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  pointer-events: auto;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.content-container {
  display: flex;
  flex: 1;
  gap: 0.5em;
  box-sizing: border-box;
  min-height: 0;
}

:slotted(.grid-selector-side-panel) {
  flex: 0 0 20rem;
  min-height: 0;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

:deep(.grid-selector-side-panel .tasks-container) {
  height: auto;
}
</style>