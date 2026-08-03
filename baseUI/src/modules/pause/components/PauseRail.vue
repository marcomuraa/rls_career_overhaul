<template>
  <div class="resume-and-recover-wrapper">
    <Background />
    <template v-for="(group, groupIndex) in visibleGroups" :key="group.id || `group-${groupIndex}`">
      <div v-if="groupIndex > 0" class="resume-and-recover-divider"></div>
      <PauseRailButton
        v-for="(action, actionIndex) in group.actions"
        :key="action.buttonId || action.id || `${group.id || groupIndex}-${actionIndex}`"
        v-show="!$simplemenu || !action.hideInSimpleMenu"
        :label="action.label"
        :icon="action.icon"
        :flavor="action.flavor"
        :disabled="action.enabled === false"
        :selected="action.id === props.selectedActionId || action.buttonId === props.selectedActionId"
        :title="action.enabled === false ? action.disabledReason : undefined"
        :route-target="action.routeTarget"
        @focusin="onActionFocus(action)"
        @focusout="onActionBlur(action)"
        @mouseenter="onActionFocus(action)"
        @mouseleave="onActionBlur(action)"
        @click="onActionClick(action)"
      />
    </template>
  </div>
</template>

<script setup lang="js">
import { computed, inject } from "vue"
import { lua } from "@/bridge"
import { Background } from "@/common/components/utility"
import { openConfirmation } from "@/services/popup"
import PauseRailButton from "./PauseRailButton.vue"
const $simplemenu = inject("$simplemenu")

const props = defineProps({
  groups: {
    type: Array,
    default: () => [],
  },
  selectedActionId: {
    type: String,
    default: null,
  },
})
const emit = defineEmits(["focus-side-panel", "clear-focus-side-panel"])

function toActionList(value) {
  return Array.isArray(value) ? value : []
}

const visibleGroups = computed(() =>
  (Array.isArray(props.groups) ? props.groups : [])
    .map(group => ({
      ...group,
      actions: toActionList(group?.actions).filter(action => action?.visible !== false),
    }))
    .filter(group => group.actions.length > 0)
)

function onActionFocus(action) {
  if (!action?.focusSidePanelId) return
  emit("focus-side-panel", action.focusSidePanelId)
}

function onActionBlur(action) {
  if (!action?.focusSidePanelId) return
  emit("clear-focus-side-panel", action.focusSidePanelId)
}

async function onActionClick(action) {
  if (!action || action.enabled === false) return
  if (typeof action.onSelect === "function") {
    action.onSelect()
    return
  }
  if (!action.buttonId) return
  if (action.confirmText) {
    const confirmed = await openConfirmation(action.confirmText)
    if (!confirmed) return
  }
  await lua.extensions.ui_pause_actions.executeAction(action.buttonId, { id: action.id })
}
</script>

<style lang="scss" scoped>
.resume-and-recover-wrapper {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-border-width: 1px ;
  --bng-bg-border-enabled: var(--bng-cool-gray-800);

  position: relative;
  isolation: isolate;
  padding: 0.25em;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.125em;
  pointer-events: auto;


  --pause-rail-button-gap: 0.5em;
  --pause-rail-button-label-opacity: 1;

  width: var(--pause-system-rail-width-expanded, 16em);
  // Keep overflow visible so BngButton focus frame isn't clipped
  overflow: visible;

  .resume-and-recover-divider {
    height: 1px;
    background-color: rgba(var(--bng-off-white-rgb), 0.25);
    margin: 0.25em 0.25em;
  }
}
</style>