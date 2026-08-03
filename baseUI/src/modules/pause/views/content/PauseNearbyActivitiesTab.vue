<template>
  <div class="pause-nearby-activities-tab">
    <BngCardHeading
      v-if="normalizedSections[0]?.title"
      class="nearby-activities-heading"
      type="ribbon"
      outline
    >
      {{ $ctx_t(normalizedSections[0].title) }}
    </BngCardHeading>

    <div
      v-for="section in normalizedSections"
      :key="section.id"
      class="section"
    >
      <div class="poi-grid">
        <div
          v-for="item in section.items"
          :key="item.id"
          v-bng-on-ui-nav:action_2.focusRequired="(isControllerUsed && item.route.action) ? () => executeAction(item.route.action) : null"
          v-bng-ui-nav-label:ok="item.view.label"
          v-bng-ui-nav-label:action_2="item.route.label"
        >
          <BngRow
            class="poi-card"
            @activate="executeAction(item.view.action)"
          >
            <div class="poi-main-row">
              <BngIcon
                v-if="item.icon"
                class="poi-icon"
                :type="item.icon"
              />
              <div class="poi-title">{{ item.title }}</div>
            </div>
            <div class="poi-action-area">
              <div v-if="item.distanceM" class="poi-distance">{{ item.distanceM }}m</div>
              <Button
                v-if="item.route.action"
                class="poi-action-slot"
                :disabled="item.route.disabled"
                :title="item.route.label"
                tabindex="-1"
                @click.stop="executeAction(item.route.action)"
              >
                <BngBinding
                  ui-event="action_2"
                  controller
                  track-ignore
                  class="poi-action-binding"
                />
                <BngIcon
                  class="poi-action-icon"
                  type="routeSimple"
                />
              </Button>
            </div>
          </BngRow>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useBridge } from "@/bridge"
import { BngBinding, BngCardHeading, BngIcon, BngRow } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { useRouteDataStore } from "@/services/routeData"
import { Button } from "@/common/components/utility"
import useControls from "@/services/controls"
import { $translate } from "@/services"

defineOptions({ name: "PauseNearbyActivitiesTab" })

const props = defineProps({
  sections: {
    type: Array,
    default: null,
  },
  mode: {
    type: String,
    default: "",
  },
})

const { lua } = useBridge()
const routeDataStore = useRouteDataStore()

const { isControllerUsed } = storeToRefs(useControls())

const normalizedSections = computed(() => {
  const sections = Array.isArray(props.sections)
    ? props.sections
    : (routeDataStore.data?.layoutMenu?.content?.data?.nearbyActivities?.sections || [])

  return sections.map(section => ({
    ...section,
    items: (section.items || []).map(item => {
      const viewAction = item.actions?.view ?? null
      const routeAction = item.actions?.route ?? null

      return {
        ...item,
        view: {
          action: viewAction,
          label: viewAction?.label || $translate.instant("ui.pause.nearbyActivities.action.view"),
        },
        route: {
          action: routeAction,
          label: routeAction?.label || $translate.instant("ui.pause.nearbyActivities.action.setRoute"),
          disabled: !routeAction || !!routeAction.disabled,
        },
      }
    }),
  }))
})

const nearbyActivitiesMode = computed(() => props.mode || routeDataStore.data?.layoutMenu?.content?.data?.nearbyActivities?.mode || "")

function executeAction(action) {
  if (!action || action.disabled || action.buttonId == null) return

  if (nearbyActivitiesMode.value === "freeroamTutorial") {
    lua.gameplay_discover_freeroamTutorial_pauseDataProvider.executePauseAction(action.buttonId, {})
  } else {
    lua.ui_pause_providers_nearbyActivities.executeNearbyActivityAction(action.buttonId, {})
  }
}
</script>

<style scoped lang="scss">
.pause-nearby-activities-tab {
  display: flex;
  flex-direction: column;

  position: relative;
}

.nearby-activities-heading {
  --bng-card-heading-ribbon-color: var(--bng-cool-gray-700);

  margin: 0;
  margin-left: 0;
  font-size: 1.25em;
  font-weight: 600;
  line-height: 1.625em;
}

.section {
  border-radius: var(--bng-corners-1);
  padding: 0.5em;
}

.poi-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.poi-card {
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

  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  box-sizing: border-box;
  color: var(--bng-off-white);
  cursor: pointer;
  position: relative;
}

.poi-main-row {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}

.poi-main-row {
  flex: 1 1 auto;
  gap: 0.5rem;
}

.poi-icon {
  --bng-icon-size: 1.65em;
  flex: 0 0 auto;
}

.poi-title {
  display: -webkit-box;
  font-size: 0.95em;
  font-weight: 500;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  line-height: 1.2;
}

.poi-action-area {
  flex: 0 0 auto;
  display: grid;
  align-items: center;
  justify-items: end;
  min-width: 6.5rem;
}

.poi-distance {
  grid-area: 1 / 1;
  font-size: 0.95rem;
  font-weight: 300;
  color: rgba(var(--bng-off-white-rgb), 0.85);
  white-space: nowrap;
  text-align: right;

  .poi-card:hover &,
  .poi-card:focus &,
  .poi-card.focus-visible &,
  .poi-card:focus-within & {
    display: none;
  }
}

.poi-action-slot {
  --bng-button-min-width: 3em;
  --bng-button-max-width: none;
  --bng-button-margin: 0;
  --bng-button-padding: 0 0.25em;

  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  color: var(--bng-off-white);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.12s ease;

  .poi-card:hover &,
  .poi-card:focus &,
  .poi-card.focus-visible &,
  .poi-card:focus-within & {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  &:disabled {
    cursor: default;
    opacity: 0.42;
  }
}

.poi-action-binding {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:empty {
    display: none;
  }
}
</style>
