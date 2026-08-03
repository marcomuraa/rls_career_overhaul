<template>
  <GridSelector
    class="oneshot-race-level-grid"
    v-bind="gridSelectorProps"
    v-on="gridSelectorListeners"
  >
    <template #item-details="{ activeItem, activeItemDetails }">
      <GameplayDetails
        v-if="activeItem && activeItemDetails"
        :active-item="activeItem"
        :active-item-details="activeItemDetails"
        :button-override="nextStepButton"
        :show-header-title="true"
        @override-click="onNextStepClick"
      />
    </template>
  </GridSelector>
</template>

<script setup>
import { computed } from "vue"
import GridSelector from "@/common/modules/gridSelector/GridSelector.vue"
import GameplayDetails from "@/modules/gameplaySelector/components/GameplayDetails.vue"
import useGridSelectorController from "@/common/modules/gridSelector/composables/useGridSelectorController"
import { $translate } from "@/services/translation"

const props = defineProps({
  mode: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["select-level"])

// Flat grid, no folder drill-down (no gotoPath tiles from the Lua backend),
// so the current path never diverges from this default.
const LEVELS_PATH_SEGMENTS = Object.freeze(["levels"])

const { gridSelectorProps, gridSelectorListeners } = useGridSelectorController({
  backendName: props.mode.backendName,
  defaultPath: { keys: LEVELS_PATH_SEGMENTS },
  getCurrentPathSegments: () => LEVELS_PATH_SEGMENTS,
})

const nextStepButton = computed(() => ({
  icon: "fastTravel",
  label: $translate.instant(props.mode.selectMiddleLabelKey),
}))

function onNextStepClick({ activeItem }) {
  if (!activeItem?.showDetails?.levelName) return
  emit("select-level", activeItem.showDetails.levelName)
}
</script>

<style scoped lang="scss">
.oneshot-race-level-grid {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
