<template>
  <div ref="rootRef" class="pause-environment-digest" :class="{ 'is-readonly': !isEditable }">
    <BngCardHeading class="block-heading" type="ribbon">{{ $t("ui.environment.timeOfDay") }}</BngCardHeading>
    <div class="tod-block" :class="{ 'is-disabled': !isEditable }">
      <TodControl
        show-step-controls
        disable-day-length-controls
        disable-date-control
        compact
        :disabled="!canChange || !isEditable"
        :time-of-day-options="timeOfDayOptions"
        :time-of-day-state="state"
      />
    </div>


    <PauseRailButton
      v-if="weatherButton"
      :key="weatherButton.buttonId || weatherButton.id"
      :label="weatherButton.label"
      :icon="weatherButton.icon || '_empty'"
      :disabled="weatherButton.enabled === false"
      :route-target="weatherButton.routeTarget"
      @click="executeAction(weatherButton)"
    />

    <BngCardHeading class="block-heading" type="ribbon">{{ $t("ui.apps.traffic.name") }}</BngCardHeading>
    <EnvironmentTrafficPanel compact :route-environment-data="data" />


    <PauseRailButton
      v-if="trafficButton"
      :key="trafficButton.buttonId || trafficButton.id"
      :label="trafficButton.label"
      :icon="trafficButton.icon || '_empty'"
      :disabled="trafficButton.enabled === false"
      :route-target="trafficButton.routeTarget"
      @click="executeAction(trafficButton)"
    />

    <BngCardHeading class="block-heading" type="ribbon">{{ $t("ui.options.other") }}</BngCardHeading>

    <template v-for="button in otherButtons" :key="button.id">
      <PauseRailButton
        :label="button.label"
        :icon="button.icon || '_empty'"
        :disabled="button.enabled === false"
        :route-target="button.routeTarget"
        @click="executeAction(button)"
      />
    </template>
    <div v-if="!isEditable && readonlyReason" class="readonly-reason">
      {{ readonlyReason }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { lua } from "@/bridge"
import { BngCardHeading } from "@/common/components/base"
import { useRouteDataStore } from "@/services/routeData"
import { useEnvironmentState } from "@/modules/environmentControls/composables/useEnvironmentState"
import EnvironmentTrafficPanel from "@/modules/environmentControls/components/EnvironmentTrafficPanel.vue"
import TodControl from "@/modules/environmentControls/components/TodControl.vue"
import { $translate } from "@/services"
import PauseRailButton from "../../components/PauseRailButton.vue"

defineOptions({ name: "PauseEnvironmentDigest" })

const props = defineProps({
  editable: {
    type: Boolean,
    default: true,
  },
  weatherButton: {
    type: Object,
    default: null,
  },
  simulationButton: {
    type: Object,
    default: null,
  },
  trafficButton: {
    type: Object,
    default: null,
  },
  otherButtons: {
    type: Array,
    default: () => [],
  },
})

const rootRef = ref(null)
const routeDataStore = useRouteDataStore()
const data = computed(() => routeDataStore.data?.layoutMenu?.content?.data || {})

const isEditable = computed(() => data.value?.editable !== false)
const readonlyReason = computed(() => data.value?.disabledReason || $translate.instant("ui.pause.readOnlyInThisMode"))

const { state, canChange, timeOfDayOptions } = useEnvironmentState({
  initialTimeOfDayOptions: data.value?.timeOfDayOptions,
  initialLevelDefaults: data.value?.levelDefaults,
})

async function executeAction(action) {
  if (!action || action.enabled === false || !action.buttonId) return
  await lua.extensions.ui_pause_actions.executeAction(action.buttonId, { id: action.id })
}

function focusEntry() {
  const root = rootRef.value
  if (!root) return false
  const selectors = [
    "[bng-nav-item]:not([disabled])",
    "button:not([disabled])",
    "input:not([disabled])",
    "[tabindex='0']",
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
.pause-environment-digest {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem;
  color: var(--bng-off-white);
  --pause-rail-button-label-opacity: 1;
  --pause-rail-button-gap: 0.5em;
  --bng-button-margin: 0;
}

.block-heading {
  margin-top: 0;
  margin-bottom: 0.0em;
  margin-left: -0.4em;
}

.tod-block {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0 0.5em;

  &.is-disabled {
    pointer-events: none;
    opacity: 0.65;
  }
}

.readonly-reason {
  font-size: 0.85rem;
  color: rgba(var(--bng-off-white-rgb), 0.85);
}

.is-readonly {
  opacity: 0.75;
}

</style>
