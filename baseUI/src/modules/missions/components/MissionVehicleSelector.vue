<template>
  <InfoCard
    :header="translatedHeader"
    headerType="ribbon"
    class="vehicle-selector-panel"
    :no-blur="noBlur"
  >
    <template #content>
      <template v-if="vehicle">
        <AspectRatio
          class="thumbnail"
          ratio="16:9"
          :external-image="vehicle.thumbnail || undefined"
          :placeholder="!vehicle.thumbnail"
        />
        <div class="name">{{ $ctx_t(vehicle.name) }}</div>
        <div class="stats" v-if="vehicle.stats && vehicle.stats.length">
          <BngPropVal
            class="stat"
            v-for="(stat, index) in vehicle.stats"
            :key="index"
            :key-label="$t(stat.label)"
            :value-label="stat.value"
          />
        </div>
      </template>
      <div v-else class="empty">
        {{ $t("ui.quickrace.selectVehicle") }}
      </div>
    </template>
  </InfoCard>
</template>

<script setup>
import { computed } from "vue"
import { $translate } from "@/services"
import { BngPropVal } from "@/common/components/base"
import { AspectRatio } from "@/common/components/utility"
import InfoCard from "../components/InfoCard.vue"

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
  noBlur: {
    type: Boolean,
    default: false,
  },
})

const vehicle = computed(() => props.panel.vehicle)

const translatedHeader = computed(() => {
  if (!props.panel.header) return null
  return $translate.contextTranslate(props.panel.header)
})
</script>

<style scoped lang="scss">
.vehicle-selector-panel {
  :deep(.info-content) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .thumbnail {
    width: 100%;
    border-radius: var(--bng-corners-2);
    overflow: hidden;
  }

  .name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--bng-text-primary);
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    .stat {
      background-color: rgba(var(--bng-cool-gray-900-rgb), 0.6);
      border-radius: var(--bng-corners-2);
      padding: 0.25rem 0.5rem;
      display: flex;

      :deep(.key-label) {
        flex: 1 1 auto;
      }
    }
  }

  .empty {
    color: var(--bng-text-secondary);
    font-style: italic;
    padding: 1rem 0.5rem;
    text-align: center;
  }
}
</style>
