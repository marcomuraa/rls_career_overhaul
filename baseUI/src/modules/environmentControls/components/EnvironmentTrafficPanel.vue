<template>
  <div class="environment-traffic-panel" :class="{ disabled: !canChange, compact: props.compact }">
    <component
      :is="props.compact ? 'div' : BngGroupPanel"
      :title="props.compact ? undefined : $t('ui.apps.traffic.mode')"
      :title-id="props.compact ? undefined : 'environment-traffic-mode-title'"
    >
      <div class="traffic-overview">
        <div class="traffic-status-row" :class="{ active: trafficIsActive }">
          <span>Status</span>
          <strong>{{ trafficStateLabel }}</strong>
        </div>
        <div
          class="traffic-count-panel"
          :class="{ active: trafficIsActive }"
          tabindex="0"
          bng-nav-item
          bng-no-child-nav="true"
          v-bng-popover:right="trafficSummaryPopoverName"
        >
          <div class="traffic-summary-row">
            <span class="traffic-summary-item">
              <BngIcon class="traffic-count-icon" :type="icons.cars" />
              <strong>{{ normalTrafficCounts.active }}</strong>
            </span>
            <span class="traffic-summary-item">
              <BngIcon class="traffic-count-icon" :type="icons.carPlus" />
              <strong>{{ normalTrafficCounts.inactive }}</strong>
            </span>
            <span class="traffic-summary-item">
              <BngIcon class="traffic-count-icon" :type="icons.carChase01" />
              <strong>{{ policeCounts.total }}</strong>
            </span>
            <span class="traffic-summary-item">
              <BngIcon class="traffic-count-icon" :type="icons.parking" />
              <strong>{{ parkedCounts.total }}</strong>
            </span>
          </div>
        </div>
        <BngPopoverContent :name="trafficSummaryPopoverName" placement="right">
          <div class="traffic-summary-popover">
            <div>This summary shows the current traffic state:</div>
            <div class="traffic-summary-popover-legend">
              <span><BngIcon class="traffic-count-icon" :type="icons.cars" /> Active normal traffic vehicles</span>
              <span><BngIcon class="traffic-count-icon" :type="icons.carPlus" /> Pooled normal traffic vehicles</span>
              <span><BngIcon class="traffic-count-icon" :type="icons.carChase01" /> Police traffic vehicles</span>
              <span><BngIcon class="traffic-count-icon" :type="icons.parking" /> Parked vehicles</span>
            </div>
          </div>
        </BngPopoverContent>
      </div>
    </component>

    <div v-if="props.compact && compactAction">
      <div class="traffic-actions">
        <Button
          class="traffic-btn"
          :disabled="compactAction.disabled"
          v-bng-popover:right="getSpawnActionPopoverName(compactAction)"
          @click="executeTrafficAction(compactAction)"
        >
          <div class="traffic-btn-content">
            <BngIcon class="traffic-btn-icon" :type="getActionIcon(compactAction)" />
            <span class="traffic-btn-label">{{ compactAction.label }}</span>
          </div>
        </Button>
        <BngPopoverContent v-if="compactAction.spawnAmount" :name="getSpawnActionPopoverName(compactAction)" placement="right">
          <div class="traffic-spawn-popover">
            <strong>{{ compactAction.label }}</strong>
            <div>Total vehicles: {{ compactAction.spawnAmount.total }}</div>
            <div class="traffic-spawn-popover-breakdown">
              <span v-if="compactAction.spawnAmount.traffic > 0"><BngIcon class="traffic-count-icon" :type="icons.cars" /> Traffic: {{ compactAction.spawnAmount.traffic }}</span>
              <span v-if="compactAction.spawnAmount.extraTraffic > 0"><BngIcon class="traffic-count-icon" :type="icons.carPlus" /> Extra variety: {{ compactAction.spawnAmount.extraTraffic }}</span>
              <span v-if="compactAction.spawnAmount.police > 0"><BngIcon class="traffic-count-icon" :type="icons.carChase01" /> Police: {{ compactAction.spawnAmount.police }}</span>
              <span v-if="compactAction.spawnAmount.parked > 0"><BngIcon class="traffic-count-icon" :type="icons.parking" /> Parked: {{ compactAction.spawnAmount.parked }}</span>
            </div>
          </div>
        </BngPopoverContent>
      </div>
    </div>

    <BngGroupPanel
      v-if="!props.compact"
      :title="$t('ui.radialmenu2.traffic')"
      title-id="environment-traffic-controls-title"
    >
      <div class="traffic-actions">
        <Button
          v-for="action in controlActions"
          :key="action.action"
          class="traffic-btn"
          :class="{ 'traffic-btn--danger': action.accent === 'attention' }"
          :disabled="action.disabled"
          @click="executeTrafficAction(action)"
        >
          <div class="traffic-btn-content">
            <BngIcon class="traffic-btn-icon" :type="getActionIcon(action)" />
            <span class="traffic-btn-label">{{ action.label }}</span>
          </div>
        </Button>
      </div>
    </BngGroupPanel>

    <BngGroupPanel
      v-if="!props.compact"
      :title="$t('ui.radialmenu2.traffic.spawn')"
      title-id="environment-traffic-spawn-title"
    >
      <div class="traffic-actions">
        <template v-for="action in spawnActions" :key="action.action">
          <Button
            class="traffic-btn"
            :disabled="action.disabled"
            v-bng-popover:right="getSpawnActionPopoverName(action)"
            @click="executeTrafficAction(action)"
          >
            <div class="traffic-btn-content">
              <BngIcon class="traffic-btn-icon" :type="getActionIcon(action)" />
              <span class="traffic-btn-label">{{ action.label }}</span>
            </div>
          </Button>
          <BngPopoverContent v-if="action.spawnAmount" :name="getSpawnActionPopoverName(action)" placement="right">
            <div class="traffic-spawn-popover">
              <strong>{{ action.label }}</strong>
              <div>Total vehicles: {{ action.spawnAmount.total }}</div>
              <div class="traffic-spawn-popover-breakdown">
                <span v-if="action.spawnAmount.traffic > 0"><BngIcon class="traffic-count-icon" :type="icons.cars" /> Traffic: {{ action.spawnAmount.traffic }}</span>
                <span v-if="action.spawnAmount.extraTraffic > 0"><BngIcon class="traffic-count-icon" :type="icons.carPlus" /> Extra variety: {{ action.spawnAmount.extraTraffic }}</span>
                <span v-if="action.spawnAmount.police > 0"><BngIcon class="traffic-count-icon" :type="icons.carChase01" /> Police: {{ action.spawnAmount.police }}</span>
                <span v-if="action.spawnAmount.parked > 0"><BngIcon class="traffic-count-icon" :type="icons.parking" /> Parked: {{ action.spawnAmount.parked }}</span>
              </div>
            </div>
          </BngPopoverContent>
        </template>
      </div>

    </BngGroupPanel>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { BngGroupPanel, BngIcon, BngPopoverContent, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngPopover } from "@/common/directives"
import { lua } from "@/bridge"
defineOptions({ name: "EnvironmentTrafficPanel" })

const LIVE_UPDATE_INTERVAL_MS = 1000
const trafficSummaryPopoverName = "environment-traffic-summary-tooltip"
const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  /** Pause route payload from lua/ge/.../routeData/environment.lua (optional). */
  routeEnvironmentData: {
    type: Object,
    default: null,
  },
})

const canChange = computed(() => props.routeEnvironmentData?.editable !== false)
const hydratedTraffic = ref(null)
const trafficPayloadRequestId = ref(0)
let liveUpdateTimer = null
const trafficPayload = computed(() => hydratedTraffic.value || props.routeEnvironmentData?.traffic || {})
const drivingCounts = computed(() => normalizeCounts(trafficPayload.value.driving))
const parkedCounts = computed(() => normalizeCounts(trafficPayload.value.parked))
const policeCounts = computed(() => normalizeCounts(trafficPayload.value.police))
const normalTrafficCounts = computed(() => subtractCounts(drivingCounts.value, policeCounts.value))
const trafficState = computed(() => trafficPayload.value.state || "off")
const trafficActions = computed(() => trafficPayload.value.actions || {})
const controlActions = computed(() => Array.isArray(trafficActions.value.controls) ? trafficActions.value.controls : [])
const spawnActions = computed(() => Array.isArray(trafficActions.value.spawn) ? trafficActions.value.spawn : [])
const trafficIsActive = computed(() => trafficState.value === "on")
const compactAction = computed(() => {
  if (!props.compact) return null
  const state = trafficState.value
  const actions = state === "on" ? controlActions.value : spawnActions.value
  const actionName = trafficState.value === "on" ? "removeTraffic" : "spawnNormalTraffic"
  const action = actions.find(action => action?.action === actionName)
  if (!action) return null
  return state === "off" || state === "on" ? action : { ...action, disabled: true }
})
const trafficStateLabel = computed(() => {
  const labels = {
    off: "Off",
    on: "Active",
    loading: "Loading",
    spawning: "Spawning",
  }
  return labels[trafficState.value] || trafficState.value
})

onMounted(() => {
  requestTrafficPayload("mounted")
  liveUpdateTimer = window.setInterval(() => {
    requestTrafficPayload("live")
  }, LIVE_UPDATE_INTERVAL_MS)
})

onUnmounted(() => {
  if (liveUpdateTimer) {
    window.clearInterval(liveUpdateTimer)
    liveUpdateTimer = null
  }
})

function normalizeCounts(counts) {
  const total = Number(counts?.total) || 0
  const active = Number(counts?.active) || 0
  const inactive = Number(counts?.inactive) || Math.max(0, total - active)
  return { total, active, inactive }
}

function subtractCounts(counts, subtract) {
  return {
    total: Math.max(0, counts.total - subtract.total),
    active: Math.max(0, counts.active - subtract.active),
    inactive: Math.max(0, counts.inactive - subtract.inactive),
  }
}

async function requestTrafficPayload(reason) {
  try {
    const requestId = ++trafficPayloadRequestId.value
    const payload = await lua.ui_pause_providers_routeData_environment.requestEnvironmentTrafficPayload({ requestId, reason, editable: canChange.value })
    if (!payload || typeof payload !== "object") return
    const payloadRequestId = Number(payload.requestId)
    if (Number.isFinite(payloadRequestId) && payloadRequestId < trafficPayloadRequestId.value) return
    hydratedTraffic.value = payload
  } catch {
    // ignore
  }
}

function getActionIcon(action) {
  return icons[action?.icon] || action?.icon
}

function getSpawnActionPopoverName(action) {
  return action?.spawnAmount ? `environment-traffic-spawn-${action.action}` : null
}

async function executeTrafficAction(action) {
  if (!action || action.disabled || action.buttonId == null) return
  try {
    await lua.ui_pause_providers_trafficControls.executeTrafficControlAction(action.buttonId, { action: action.action })
  } catch {
    // ignore
  } finally {
    await requestTrafficPayload("action")
  }
}
</script>

<style scoped lang="scss">
.environment-traffic-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.75em;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.75em 0.75em;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--bng-off-white);

  &.disabled {
    opacity: 0.65;
  }

  .bng-group-panel {
    flex: 0 0 auto;
  }

  .traffic-overview {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .traffic-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5em;
    padding: 0.35em 0.5em;
    background: rgba(var(--bng-cool-gray-800-rgb), 0.65);
    border: 0.0625em solid transparent;
    border-radius: 0.25em;

    &.active {
      background:
        linear-gradient(90deg, rgba(var(--bng-orange-700-rgb), 0.24), rgba(var(--bng-cool-gray-800-rgb), 0.65) 55%),
        rgba(var(--bng-cool-gray-800-rgb), 0.65);
      border-color: rgba(var(--bng-orange-300-rgb), 0.38);
      box-shadow: inset 0 0 0 0.0625em rgba(var(--bng-orange-700-rgb), 0.2);
    }
  }

  .traffic-count-panel {
    display: flex;
    flex-direction: column;
    gap: 0.45em;
    padding: 0.6em 0.65em;
    background: rgba(var(--bng-cool-gray-800-rgb), 0.65);
    border: 0.0625em solid transparent;
    border-radius: 0.25em;
    cursor: default;

    &.active {
      background:
        linear-gradient(135deg, rgba(var(--bng-orange-700-rgb), 0.18), rgba(var(--bng-cool-gray-800-rgb), 0.65) 62%),
        rgba(var(--bng-cool-gray-800-rgb), 0.65);
      border-color: rgba(var(--bng-orange-300-rgb), 0.34);
      box-shadow: inset 0 0 0 0.0625em rgba(var(--bng-orange-700-rgb), 0.18);
    }

    &:focus,
    &.focus-visible {
      outline: 0.125em solid var(--bng-orange-550);
      outline-offset: 0.125em;
    }
  }

  .traffic-summary-row {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    flex-wrap: nowrap;
    color: rgba(var(--bng-off-white-rgb), 0.82);
  }

  .traffic-summary-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25em;
    flex: 0 0 25%;
    min-width: 0;

    & + .traffic-summary-item {
      border-left: 0.0625em solid rgba(var(--bng-off-white-rgb), 0.35);
    }
  }

  .traffic-count-icon {
    color: var(--bng-off-white);
    font-size: 1.50em;
  }

  .traffic-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    align-items: stretch;
  }

  .traffic-btn {
    --bng-content-flow: row;
    --bng-content-align: center;
    --bng-content-justify: flex-start;

    --bng-button-min-width: auto;
    --bng-button-max-width: 100%;
    --bng-button-padding: 0.5rem;
    --bng-button-padding-top: 0.5rem;
    --bng-button-padding-bottom: 0.5rem;

    --bng-bg-border-radius: var(--bng-corners-1);
    --bng-bg-border-width: 0.0625em;

    --bng-bg-enabled: var(--bng-cool-gray-750);
    --bng-bg-hover: var(--bng-cool-gray-700);
    --bng-bg-active: var(--bng-cool-gray-700);
    --bng-bg-disabled: var(--bng-cool-gray-700);
    --bng-bg-focus: var(--bng-cool-gray-700);

    --bng-bg-enabled-opacity: 0.60;
    --bng-bg-hover-opacity: 0.75;
    --bng-bg-active-opacity: 0.9;
    --bng-bg-disabled-opacity: 0.55;
    --bng-bg-focus-opacity: 0.85;

    --bng-bg-border-enabled: var(--bng-cool-gray-500);
    --bng-bg-border-hover: var(--bng-cool-gray-500);
    --bng-bg-border-active: var(--bng-cool-gray-500);
    --bng-bg-border-disabled: var(--bng-cool-gray-500);
    --bng-bg-border-focus: var(--bng-cool-gray-300);

    width: 100%;
    margin: 0;

    &:focus-visible,
    &.focus-visible {
      outline: 0.125rem solid var(--bng-orange-550);
      outline-offset: 0.125rem;
      box-shadow: 0 0 0 0.0625rem rgba(var(--bng-off-white-rgb), 0.45);
    }

    &.traffic-btn--danger {
      --bng-bg-enabled: var(--bng-add-red-600);
      --bng-bg-hover: var(--bng-add-red-600);
      --bng-bg-active: var(--bng-add-red-600);
      --bng-bg-disabled: var(--bng-add-red-600);
      --bng-bg-focus: var(--bng-add-red-600);
      --bng-bg-border-enabled: var(--bng-add-red-400);
      --bng-bg-border-hover: var(--bng-add-red-400);
      --bng-bg-border-active: var(--bng-add-red-400);
      --bng-bg-border-disabled: var(--bng-add-red-400);
      --bng-bg-border-focus: var(--bng-add-red-400);
    }
  }

  .traffic-btn-content {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
  }

  .traffic-btn-icon {
    flex: 0 0 auto;
    font-size: 1.5rem;
    line-height: 1;
  }

  .traffic-btn-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
  }

  &.compact {
    padding: 0;
    overflow:visible;


    .traffic-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

:global(.traffic-summary-popover) {
  max-width: 18em;
  padding: 0.5em 0.65em;
  color: var(--bng-off-white);
  line-height: 1.35;
}

:global(.traffic-summary-popover-legend) {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  margin-top: 0.4em;
}

:global(.traffic-summary-popover-legend span) {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}

:global(.traffic-summary-popover .traffic-count-icon) {
  color: var(--bng-off-white);
  font-size: 1.05em;
}

:global(.traffic-spawn-popover) {
  max-width: 18em;
  padding: 0.5em 0.65em;
  color: var(--bng-off-white);
  line-height: 1.35;
}

:global(.traffic-spawn-popover-breakdown) {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  margin-top: 0.4em;
}

:global(.traffic-spawn-popover-breakdown span) {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}

:global(.traffic-spawn-popover .traffic-count-icon) {
  color: var(--bng-off-white);
  font-size: 1.05em;
}
</style>
