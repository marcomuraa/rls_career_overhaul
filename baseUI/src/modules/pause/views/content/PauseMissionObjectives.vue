<template>
  <MissionObjectives
    class="pause-mission-objectives"
    v-if="hasStars"
    :stars="objectives.stars"
    :message="objectives.message"
    :show-message="objectives.showMessage"
    :no-blur="true"

  />
  <div v-else class="pause-mission-objectives-empty">—</div>
</template>

<script setup>
import { computed } from "vue"
import MissionObjectives from "@/modules/missions/components/MissionObjectives.vue"
import { useRouteDataStore } from "@/services/routeData"

defineOptions({ name: "PauseMissionObjectives" })

const routeDataStore = useRouteDataStore()
const objectives = computed(() => routeDataStore.data?.layoutMenu?.content?.data?.missionObjectives || {})
const hasStars = computed(() => Array.isArray(objectives.value.stars) && objectives.value.stars.length > 0)
</script>

<style scoped lang="scss">
.pause-mission-objectives {
  padding-top: 1rem;
}
.pause-mission-objectives-empty {
  font-size: 0.9rem;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  padding: 0.25rem 0;
}
</style>
