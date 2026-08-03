<template>
  <GridSelector
    class="oneshot-race-vehicle-grid"
    v-bind="gridSelectorProps"
    v-on="gridSelectorListeners"
  >
    <template #item-details="{ activeItem, activeItemDetails }">
      <VehicleDetails
        v-if="activeItem && activeItemDetails"
        :active-item="activeItem"
        :active-item-details="activeItemDetails"
        :button-override="selectButton"
        :show-header-title="true"
        @override-click="onSelectClick"
      />
    </template>
  </GridSelector>
</template>

<script setup>
import { computed, ref } from "vue"
import GridSelector from "@/common/modules/gridSelector/GridSelector.vue"
import VehicleDetails from "@/modules/vehicleselect/components/VehicleDetails.vue"
import useGridSelectorController from "@/common/modules/gridSelector/composables/useGridSelectorController"
import { $translate } from "@/services/translation"

const props = defineProps({
  mode: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["select-vehicle"])

const ROOT_PATH_SEGMENTS = Object.freeze(["allModels"])

// Vehicle model tiles with multiple configs expose a `gotoPath` drilldown
// (e.g. into that model's configs) instead of a leaf selection. Tracked
// locally rather than via the URL since the wizard doesn't need deep-linkable
// sub-paths for this step.
const pathSegments = ref([...ROOT_PATH_SEGMENTS])

function requestNavigation(navigationRequest) {
  const gotoPath = navigationRequest?.gotoPath
  if (!Array.isArray(gotoPath) || gotoPath.length === 0) return
  navigationRequest.preventDefault?.()
  pathSegments.value = [...gotoPath]
}

function requestBackFromGrid(backEvent) {
  if (backEvent?.isAtGridRoot) return
  backEvent?.preventDefault?.()
  pathSegments.value = [...ROOT_PATH_SEGMENTS]
}

const { gridSelectorProps, gridSelectorListeners } = useGridSelectorController({
  backendName: "vehicleSelector",
  defaultPath: { keys: ROOT_PATH_SEGMENTS },
  getCurrentPathSegments: () => pathSegments.value,
  requestNavigation,
  requestBackFromGrid,
})

const selectButton = computed(() => ({
  icon: "checkmark",
  label: $translate.instant(props.mode.selectConfirmLabelKey),
}))

function onSelectClick({ activeItem, additionalData }) {
  if (!activeItem?.model_key) return
  emit("select-vehicle", activeItem.model_key, activeItem.config_key, additionalData)
}
</script>

<style scoped lang="scss">
.oneshot-race-vehicle-grid {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
