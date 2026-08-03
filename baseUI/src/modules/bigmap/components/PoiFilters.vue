<template>
  <div class="poi-filters" >
    <BngBinding
      class="filter-binding"
      :class="{ 'disabled' : selectedPoi !== null }"
      ui-event="action_3"
      controller
    />
    <div
      class="filter-icon"
      :class="{ 'selected': poiListDisplayMode === POI_LIST_DISPLAY_MODE.HIDDEN }"
      no-nav="true"
      v-bng-sound-class="'bng_click_hover_generic'"
      @click="setPoiListDisplayMode(POI_LIST_DISPLAY_MODE.HIDDEN)"
    >
      <BngTooltip :text="$t('bigMap.poiFilters.displayMode.hidden')">
        <BngIcon type="eyeSolidClosed" />
      </BngTooltip>
    </div>
    <div
      class="filter-icon"
      :class="{ 'selected': poiListDisplayMode === POI_LIST_DISPLAY_MODE.TREE }"
      no-nav="true"
      v-bng-sound-class="'bng_click_hover_generic'"
      @click="setPoiListDisplayMode(POI_LIST_DISPLAY_MODE.TREE)"
    >
      <BngTooltip :text="$t('bigMap.poiFilters.displayMode.tree')">
        <BngIcon type="listIndented" />
      </BngTooltip>
    </div>
    <div
      class="filter-icon"
      :class="{ 'selected': poiListDisplayMode === POI_LIST_DISPLAY_MODE.SIMPLE }"
      no-nav="true"
      v-bng-sound-class="'bng_click_hover_generic'"
      @click="setPoiListDisplayMode(POI_LIST_DISPLAY_MODE.SIMPLE)"
    >
      <BngTooltip :text="$t('bigMap.poiFilters.displayMode.simple')">
        <BngIcon type="listSmall" />
      </BngTooltip>
    </div>
    <div class="divider"></div>
    <BngBinding
      class="filter-binding"
      :class="{ 'disabled' : selectedPoi !== null }"
      ui-event="tab_l"
      controller
    />
    <template v-for="(filterSection, index) in validFilterSections" :key="filterSection.key">
      <div
        v-if="filterSection && filterSection.groups"
        class="filter-icon"
        no-nav="true"
        v-bng-sound-class="'bng_click_hover_generic'"
        :class="{
          'has-active-filters': hasActiveFilters(filterSection),
          'selected': selectedFilterIndex === index,
        }"
        @click="poiListDisplayMode !== POI_LIST_DISPLAY_MODE.HIDDEN ? selectFilterSection(index) : null"
      >
        <BngTooltip :text="$tt(filterSection.title)">
          <BngIcon :type="filterSection.icon" />
        </BngTooltip>
      </div>
    </template>
    <BngBinding
      class="filter-binding"
      :class="{ 'disabled' : selectedPoi !== null }"
      ui-event="tab_r"
      controller
    />
  </div>
</template>

<script setup>
import { inject } from "vue"
import { vBngSoundClass } from "@/common/directives"
import { BngIcon } from "@/common/components/base"
import BngTooltip from "@/common/components/base/bngTooltip.vue"
import BngBinding from "@/common/components/base/bngBinding.vue"
import { BIGMAP_KEY } from "../composables/useBigMap"
import { POI_LIST_DISPLAY_MODE } from "../constants"

const {
  poiListDisplayMode,
  selectedPoi,
  validFilterSections,
  selectedFilterIndex,
  selectFilterSection,
  hasActiveFilters,
  setPoiListDisplayMode,
} = inject(BIGMAP_KEY)
</script>

<style lang="scss" scoped>
.poi-filters {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  width: fit-content;
  align-self: center;
}

.divider {
  width: 1px;
  height: 100%;
  background: var(--bng-cool-gray-600);
}


.filter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: 2px solid transparent;

  &:hover {
    background: var(--bng-cool-gray-700);
  }

  &.has-active-filters {
    color: var(--bng-orange-500);

    :deep(.bng-icon) {
      color: var(--bng-orange-500);
    }
  }

  &.selected {
    background: var(--bng-cool-gray-600);
    border-color: var(--bng-orange-500);

    :deep(.bng-icon) {
      color: var(--bng-orange-500);
    }

  }

  &.disabled {
    opacity: 0.33;
    cursor: not-allowed;
    pointer-events: none;

    &.selected {
      background: transparent;
      border-color: transparent;

      :deep(.bng-icon) {
        color: var(--bng-off-white);
      }
    }
  }

  :deep(.bng-icon) {
    font-size: 1.5rem;
    color: var(--bng-off-white);

    &:hover {
      filter: drop-shadow(0 0 8px var(--bng-off-white));
    }
  }
}

.filter-binding {
  align-self: center;
  flex: 0 0 auto;
  font-size: 0.75rem;
  padding: 0.15rem;
  &.disabled {
    opacity: 0.33;
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 5rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;

  &:hover {
    background: var(--bng-cool-gray-700);
  }

  &.inactive {
    opacity: 0.5;
  }

  :deep(.bng-icon) {
    font-size: 1.5rem;
    cursor: pointer;

    &:hover {
      filter: drop-shadow(0 0 8px var(--bng-off-white));
    }
  }
}
</style>
