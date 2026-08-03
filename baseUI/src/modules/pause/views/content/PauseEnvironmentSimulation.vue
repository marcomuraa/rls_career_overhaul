<template>
  <div ref="rootRef" class="pause-environment-simulation" :class="{ 'is-readonly': !isEditable }" >
    <EnvironmentSimulationPanel compact :route-environment-data="data" />
    <div v-if="!isEditable && readonlyReason" class="readonly-reason">
      {{ readonlyReason }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useRouteDataStore } from "@/services/routeData"
import EnvironmentSimulationPanel from "@/modules/environmentControls/components/EnvironmentSimulationPanel.vue"

defineOptions({ name: "PauseEnvironmentSimulation" })

const rootRef = ref(null)
const routeDataStore = useRouteDataStore()
const data = computed(() => routeDataStore.data?.layoutMenu?.content?.data || {})

const isEditable = computed(() => data.value?.editable !== false)
const readonlyReason = computed(() => data.value?.disabledReason || "Read-only in this mode")

function focusEntry() {
  if (!isEditable.value) {
    const root = rootRef.value
    if (!root || typeof root.focus !== "function") return false
    root.focus()
    return true
  }

  const root = rootRef.value
  if (!root) return false

  const selectors = [
    ".environment-simulation-panel [bng-nav-item]:not([disabled])",
    ".environment-simulation-panel button:not([disabled])",
    ".environment-simulation-panel input:not([disabled]):not([type='range'])",
    ".environment-simulation-panel input[type='range']:not([disabled])",
    ".environment-simulation-panel [tabindex='0']",
  ]

  for (const selector of selectors) {
    const target = root.querySelector(selector)
    if (target && typeof target.focus === "function" && target.getClientRects().length > 0) {
      target.focus()
      return true
    }
  }
  return false
}

defineExpose({
  focusEntry,
})
</script>

<style scoped lang="scss">
.pause-environment-simulation {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;

  :deep(.environment-simulation-panel) {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.pause-environment-simulation.is-readonly {
  :deep(.environment-simulation-panel) {
    pointer-events: none;
    opacity: 0.65;
  }
}

.readonly-reason {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(var(--bng-off-white-rgb), 0.85);
}
</style>
