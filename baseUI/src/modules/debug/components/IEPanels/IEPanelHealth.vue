<template>
  <div v-show="visible" class="health-rollup">
    <div class="health-row health-head">
      <span class="health-title">UI Health</span>
      <span :class="status === 'healthy' ? 'green' : 'red'">{{ status }}</span>
      <button
        class="health-action"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        title="Log health snapshot"
        @click.stop="logSnapshot"
      >Log snapshot</button>
    </div>

    <div class="health-row">
      <span class="health-label">Recoveries</span>
      <span class="health-value green">{{ recoveries }}</span>
    </div>
    <div class="health-row">
      <span class="health-label">Suspicions</span>
      <span class="health-value red">{{ suspicions }}</span>
    </div>
    <div class="health-row">
      <span class="health-label">Last incident</span>
      <span class="health-value">{{ incidentTitle }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onUnmounted, provide, ref } from "vue"
import { useUiHealth } from "@/services/uiHealth"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const uiHealth = useUiHealth()
const visible = ref(false)
const status = computed(() => uiHealth.status)
const recoveries = computed(() => uiHealth.counters.recoveries)
const suspicions = computed(() => uiHealth.counters.suspicions)
const incidentTitle = computed(() => {
  const incident = uiHealth.lastIncident
  return incident ? `${incident.kind}: ${incident.reason}` : "no incidents"
})
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("health")
  visible.value = nextVisible
}

function togglePanel() {
  setVisible(!visible.value)
}

function logSnapshot() {
  console.log("[Navigator][uiHealth]", uiHealth.snapshot())
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "health",
  order: 40,
  tooltip: computed(() => incidentTitle.value),
  label: computed(() => `Health ${status.value} ${recoveries.value} / ${suspicions.value}`),
  parts: computed(() => [
    { text: "Health " },
    { text: status.value, class: status.value === "healthy" ? "status-healthy" : "status-unhealthy" },
    { text: " " },
    { text: recoveries.value, class: "green" },
    { text: " / " },
    { text: suspicions.value, class: "red" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || status.value !== "healthy"),
  onClick: togglePanel,
  close: () => setVisible(false),
})

onUnmounted(() => unregisterPanelButton?.())
</script>

<style lang="scss" scoped>
.health-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.health-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
}

.health-head {
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.health-title {
  flex: 1 1 auto;
  font-weight: 700;
}

.health-label {
  flex: 0 0 auto;
  width: 5.5rem;
  color: var(--bng-cool-gray-300);
}

.health-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.health-action {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0.06rem 0.3rem;
  cursor: pointer;
  font-size: 0.78rem;
  white-space: nowrap;
}

.green {
  color: var(--bng-add-green-300);
}

.red {
  color: var(--bng-add-red-300);
}
</style>
