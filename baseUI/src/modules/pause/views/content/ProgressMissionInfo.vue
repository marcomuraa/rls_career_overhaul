<template>
  <div v-if="mission" class="progress-mission-info">
    <BngCardHeading type="ribbon" class="mission-heading">
      <div class="mission-heading-content">
        <div class="mission-heading-text">
          <div v-if="missionTypeLabel" class="mission-type">{{ missionTypeLabel }}</div>
          <div class="mission-title">{{ $ctx_t(mission.label) }}</div>
        </div>
      </div>
    </BngCardHeading>

    <AspectRatio v-if="previewImageUrl" class="mission-preview" :external-image="previewImageUrl" />

    <div v-if="mission.description" class="mission-description">
      {{ $ctx_t(mission.description) }}
    </div>

    <MissionObjectives
      v-if="missionProgress"
      class="mission-objectives"
      :stars="missionProgress.stars"
      :message="missionProgress.message"
      :show-message="missionProgress.showMessage"
      no-blur
      no-disabled-objectives
    />
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngCardHeading, BngIcon, icons } from "@/common/components/base"
import { AspectRatio } from "@/common/components/utility"
import { $translate } from "@/services"
import { getURL } from "@/utils"
import MissionObjectives from "@/modules/missions/components/MissionObjectives.vue"

defineOptions({ name: "ProgressMissionInfo" })

const props = defineProps({
  mission: {
    type: Object,
    default: null,
  },
})

const missionTypeLabel = computed(() => {
  const label = props.mission?.missionTypeLabel
  return label ? $translate.contextTranslate(label) : ""
})

const missionIcon = computed(() => icons[props.mission?.icon] || icons.medal)

const previewImageUrl = computed(() => {
  const image = props.mission?.preview || props.mission?.previews?.[0] || props.mission?.thumbnail
  return image ? getURL(image) : ""
})

const missionProgress = computed(() => {
  const stars = props.mission?.formattedProgress?.unlockedStars?.stars
  if (!Array.isArray(stars) || stars.length === 0) return null
  return {
    stars: stars.map(star => ({
      enabled: true,
      visible: true,
      order: star.globalStarIndex,
      isDefaultStar: star.isDefaultStar,
      key: star.key,
      label: star.label,
      rewards: star.rewards,
      unlocked: star.unlocked,
      count: star.count,
    })),
    message: null,
    showMessage: false,
  }
})
</script>

<style scoped lang="scss">
.progress-mission-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--bng-off-white);
  padding: 0.5rem;
}

.mission-heading {
  margin: 0;
  margin-left: -0.5rem;
}

.mission-heading-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.mission-heading-icon {
  flex: 0 0 auto;
  font-size: 1.35rem;
}

.mission-heading-text {
  min-width: 0;
}

.mission-type {
  font-size: 0.85rem;
  line-height: 1;
  color: rgba(var(--bng-off-white-rgb), 0.75);
}


.mission-preview {
  flex: 0 0 auto;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
}

.mission-description {
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--bng-corners-2);
  padding: 0.75rem;
  line-height: 1.25;
}

.mission-objectives {
  margin-left: -0.5rem;
}
</style>
