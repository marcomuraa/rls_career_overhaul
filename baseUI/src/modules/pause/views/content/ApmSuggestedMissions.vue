<template>
  <BngGroupPanel v-if="missions.length" class="apm-suggested-missions" :title="$t('ui.pause.career.apmSuggestedMissions')">
    <div class="mission-list">
      <MissionCard
        v-for="mission in missions"
        :key="mission.id"
        class="suggested-mission-card"
        :mission="mission"
        :showStartableIcons="true"
        :showHintIcon="false"
        @clicked="openMission"
        @focusin="showMissionInfo(mission)"
        @focusout="hideMissionInfo(mission)"
        @mouseenter="showMissionInfo(mission)"
        @mouseleave="hideMissionInfo(mission)"
      />
    </div>
  </BngGroupPanel>
</template>

<script setup>
import { onMounted, ref } from "vue"
import { BngGroupPanel } from "@/common/components/base"
import { lua } from "@/bridge"
import MissionCard from "@/modules/career/components/progress/MissionCard.vue"

defineOptions({ name: "ApmSuggestedMissions" })
const emit = defineEmits(["focus-side-panel", "clear-focus-side-panel"])

const missions = ref([])

function openMission(mission) {
  if (!mission?.id) return
  lua.extensions.gameplay_missions_missionScreen.setPreselectedMissionId(mission.id)
  lua.extensions.gameplay_missions_missionScreen.openAPMChallenges("apm", mission.skill?.[0], "pause.career.missionDetails", { pathId: "apm" })
}

function getMissionPanelId(mission) {
  return mission?.id ? `careerProgressMission.${mission.id}` : null
}

function showMissionInfo(mission) {
  const panelId = getMissionPanelId(mission)
  if (!panelId) return
  emit("focus-side-panel", {
    id: panelId,
    content: [
      {
        id: `${panelId}.info`,
        type: "component",
        componentName: "ProgressMissionInfo",
        props: {
          mission,
        },
      },
    ],
  })
}

function hideMissionInfo(mission) {
  const panelId = getMissionPanelId(mission)
  if (panelId) emit("clear-focus-side-panel", panelId)
}

onMounted(async () => {
  const result = await lua.career_modules_branches_landing.getSuggestedMissionsForDomain("apm")
  missions.value = Array.isArray(result) ? result : []
})
</script>

<style scoped lang="scss">
.apm-suggested-missions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--bng-off-white);
  margin: 0 0.5rem 0.5rem 0.5rem;
}

.mission-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0.25rem;
}

.suggested-mission-card {
  min-height: 4rem;
}
</style>
