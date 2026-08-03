<template>
  <div
    class="binding-item-rail no-focus-frame"
    v-bng-scoped-nav="scopeDirective"
    @deactivate="onScopeDeactivate"
  >
    <div
      ref="railEl"
      class="binding-item-rail-content no-focus-frame"
      bng-nav-item
      bng-scoped-nav-autofocus
      bng-no-child-nav="true"
      :bng-no-nav="engaged ? undefined : 'true'"
      :tabindex="engaged ? 0 : -1"
      v-bng-on-ui-nav:ok.focusRequired="onOk"
      v-bng-on-ui-nav:back,menu.focusRequired="onBack"
      v-bng-on-ui-nav:focus_l.focusRequired="stepLeftHandler"
      v-bng-on-ui-nav:focus_r.focusRequired="stepRightHandler"
      v-bng-on-ui-nav:focus_u.focusRequired="verticalNavHandler"
      v-bng-on-ui-nav:focus_d.focusRequired="verticalNavHandler"
      v-bng-on-ui-nav:focus_ud.focusRequired="verticalNavHandler"
      v-bng-ui-nav-label:back="engaged ? $t('ui.common.back') : ''"
      v-bng-ui-nav-label:focus_l,focus_r="stepLabel"
      v-bng-ui-nav-label:ok="engagedOkLabel"
    >
      <template v-if="hasBindings">
        <BngBinding
          v-for="(binding, index) in bindings"
          :key="`${binding.devname}-${binding.control}-${index}`"
          :action="binding.action"
          :device="binding.devname"
          :device-mask="binding.devname"
          :device-key="binding.control"
          class="binding-item-chip"
          :class="{ 'binding-item-chip-selected': engaged && chipIndex === index }"
          @click.stop="onChipClick(binding, index)"
        />
      </template>
      <div v-else class="binding-item-unassigned">
        <BngBinding
          always-show-unassigned
          :action="actionKey"
          :unassigned-text="''"
          class="binding-item-chip"
        />
      </div>
    </div>

    <BngButton
      v-if="canAdd"
      :icon="icons.plus"
      :accent="ACCENTS.outlined"
      class="binding-item-add"
      bng-no-nav="true"
      tabindex="-1"
      @click.stop="emit('add')"
    />
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, provide, ref } from "vue"
import { BngBinding, BngButton, ACCENTS, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavLabel, vBngScopedNav } from "@/common/directives"
import { setFocus } from "@/services/uiNavFocus"
import { useScopedNav, useScopedNavObserver } from "@/services/scopedNav/api"
import { SCOPED_NAV_OBSERVER_EVENTS } from "@/services/scopedNav/constants"
import { $translate } from "@/services"

const props = defineProps({
  actionKey: String,
  bindings: Array,
  engaged: Boolean,
  canAdd: Boolean,
  chipIndex: { type: Number, default: 0 },
})

const emit = defineEmits(["activate", "add", "disengage", "edit-current", "step", "chip-click"])

const row = inject("BngRow")
const scopedNav = useScopedNav()
const railEl = ref(null)
const pendingParentFocus = ref(null)

const hasBindings = computed(() => !!props.bindings?.length)
const internalScopeId = computed(() => `options-binding-item-rail-${props.actionKey || "unknown"}`)
const scopeDirective = computed(() => ({
  scopeId: internalScopeId.value,
  type: "normal",
  activated: props.engaged,
  preferAutoFocus: true,
  trapPolicy: "always",
  bubbleWhitelistEvents: ["action_2"],
}))

const stepLabel = computed(() => {
  if (!props.engaged || !hasBindings.value || (props.bindings?.length ?? 0) < 2) return ""
  return $translate.instant("ui.common.select")
})

const engagedOkLabel = computed(() => {
  if (!props.engaged || !hasBindings.value) return ""
  return $translate.instant("ui.common.edit")
})

const stepLeftHandler = computed(() => (props.engaged && hasBindings.value && props.bindings.length > 1) ? onStepLeft : undefined)
const stepRightHandler = computed(() => (props.engaged && hasBindings.value && props.bindings.length > 1) ? onStepRight : undefined)
const verticalNavHandler = computed(() => props.engaged ? consumeVerticalNav : undefined)

provide("BngRow", null)

function activateHandler() {
  emit("activate")
  return false
}

function action2Handler() {
  if (!props.canAdd) return true
  emit("add")
  return false
}

const rowControlApi = {
  activateOnClick: false,
  activate: activateHandler,
  get action2() {
    return props.canAdd ? action2Handler : undefined
  },
}

if (row) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

useScopedNavObserver((eventName, payload) => {
  const pending = pendingParentFocus.value
  if (!pending || eventName !== SCOPED_NAV_OBSERVER_EVENTS.onScopeResumed) return
  if (payload?.scope?.id !== pending.scopeId) return

  pendingParentFocus.value = null
  if (!document.contains(pending.element)) return
  scopedNav.requestScopeFocus(pending.scopeId, pending.element, {
    force: true,
    activeOnly: false,
    reason: "binding-row-exit",
  })
})

function queueParentFocusRestore() {
  const rowElement = row?.getElement?.()
  if (!rowElement) return false

  const parentScope = scopedNav.getScopeForElement(rowElement)
  if (!parentScope?.scopeId) {
    rowElement.focus?.()
    return true
  }

  pendingParentFocus.value = {
    scopeId: parentScope.scopeId,
    element: rowElement,
  }
  return true
}

function exitToRow() {
  queueParentFocusRestore()
  emit("disengage")
}

function onOk() {
  if (!props.engaged) return true
  if (hasBindings.value) {
    emit("edit-current")
    return false
  }
  exitToRow()
  return false
}

function onBack() {
  if (!props.engaged) return true
  exitToRow()
  return false
}

function onStepLeft() {
  if (!props.engaged || !hasBindings.value) return true
  emit("step", -1)
  return false
}

function onStepRight() {
  if (!props.engaged || !hasBindings.value) return true
  emit("step", 1)
  return false
}

function consumeVerticalNav() {
  return false
}

function onChipClick(binding, index) {
  emit("chip-click", { binding, index })
}

function onScopeDeactivate() {
  if (!props.engaged) return
  emit("disengage")
}

function focusRail() {
  const target = railEl.value
  if (!target) return
  setFocus(target, true, false)
  target.focus?.()
}

defineExpose({
  focusRail,
  getRailElement: () => railEl.value,
})
</script>

<style lang="scss" scoped>
.binding-item-rail {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
}

.binding-item-rail-content {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 0;
  outline: none;
  padding: 0.125rem 0.25rem;
  border-radius: var(--bng-corners-1);

}

.binding-item-chip {
  margin: 0;
  position: relative;
  border-radius: var(--bng-corners-1);
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: outline-color 120ms ease;
}

.binding-item-chip-selected {
  outline-color: var(--bng-orange-550);
}

.binding-item-unassigned {
  opacity: 0.75;
  pointer-events: none;
}

.binding-item-add {
  --bng-button-margin: 0;
  min-width: unset;
  width: 2rem;
}
</style>
