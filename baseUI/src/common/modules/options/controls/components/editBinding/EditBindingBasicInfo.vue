<template>
  <section class="detail-section">
    <div class="detail-section-header">
      <div class="detail-section-title">Basic Info</div>
    </div>

    <div class="detail-controls">
      <BngRow
        class="options-item-row detail-control-row"
        :label="$tt('ui.controls.editBinding.assignedControl')"
        @activate="$emit('editBinding')">
        <div class="assigned-control-value">
          <span class="assigned-device-name">{{ $tt(assignedDeviceDisplayName) }}</span>
          <BngBinding
            :action="modelValue.action"
            :device-mask="modelValue.devname"
            :device="modelValue.devname"
            :device-key="modelValue.control"
            :device-key-mask="modelValue.control"
            :image-pack="modelValue.imagePack"
          />
        </div>
      </BngRow>

      <div class="detail-controls-actions">
        <BngButton :icon="icons.edit" accent="secondary" @click="$emit('editBinding')" />
        <BngButton
          v-if="!isNewBinding"
          :icon="icons.trashBin1"
          accent="attention"
          @click="$emit('deleteBinding')" />
      </div>
    </div>

    <div v-if="modelValue.conflicts && modelValue.conflicts.length > 0" class="detail-conflicts">
      <div class="detail-conflicts-header">
        <span class="info-label">{{ $tt("ui.common.info") }}:</span>
        <span class="info-text">{{ $tt("ui.controls.editBinding.conflicts") }}</span>
      </div>

      <div class="detail-conflicts-list">
        <BngRow
          v-for="conflict in modelValue.conflicts"
          :key="conflict.key"
          class="options-item-row conflict-row">
          <template #label>
            <span :style="{ 'text-decoration': conflict.markForDeletion ? 'line-through' : 'none' }">{{ $tt(conflict.title) }}</span>
          </template>
          <BngButton
            v-bng-tooltip="conflict.markForDeletion ? $tt('ui.controls.editBinding.removeUndo') : $tt('ui.controls.editBinding.remove')"
            :icon="conflict.markForDeletion ? icons.undo : icons.trashBin1"
            :accent="conflict.markForDeletion ? 'secondary' : 'attention'"
            @click="$emit('toggleResolveConflict', conflict)" />
        </BngRow>
      </div>
    </div>

    <BindingOptionRenderAdapter
      :model-value="modelValue.filterType"
      :config="filterTypeConfig"
      @update:modelValue="value => (modelValue.filterType = value)" />
  </section>
</template>

<script setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngButton, BngRow, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"
import { $translate } from "@/services"
import useControls from "@/services/controls"
import BindingOptionRenderAdapter from "./BindingOptionRenderAdapter.vue"
import "@/common/modules/options/render/itemStyle.scss"

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  isNewBinding: {
    type: Boolean,
    default: false,
  },
})

const controls = useControls()
const { controllers } = storeToRefs(controls)

const assignedDeviceDisplayName = computed(() => {
  const devname = props.modelValue?.devname
  if (!devname) return "device"
  return controllers.value[devname]?.productName ?? "device"
})

defineEmits(["editBinding", "deleteBinding", "toggleResolveConflict"])

const filterTypes = [-1, 0, 3, 1, 2].map(value => ({
  value,
  label: $translate.instant(`ui.controls.filters.${value}`),
}))

const filterTypeConfig = {
  key: "filterType",
  label: $translate.instant("ui.controls.filter"),
  tooltip: $translate.instant("ui.controls.filter.tooltip"),
  type: "dropdown",
  options: filterTypes,
}
</script>

<style lang="scss" scoped>
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.45);
}

.detail-section-header {
  display: flex;
  align-items: center;
}

.detail-section-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.detail-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;

  > .detail-control-row {
    flex: 1 1 auto;
    min-width: 0;
  }

  > .detail-controls-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.assigned-control-value {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 600;
  min-width: 0;

  > * {
    margin: 0;
  }
}

.detail-conflicts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-off-black-rgb), 0.25);

  .detail-conflicts-header {
    display: flex;
    align-items: center;

    > .info-label {
      padding-right: 0.5em;
      color: var(--bng-ter-peach-400);
    }

    > .info-text {
      padding-right: 0.5em;
    }
  }

  .detail-conflicts-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
