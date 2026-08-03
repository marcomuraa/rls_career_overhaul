<template>
  <div class="camera-row-scope" v-bng-scoped-nav="scopeDirective">
    <div
      ref="contentRef"
      class="camera-row-content"
      bng-nav-item
      bng-scoped-nav-autofocus
      bng-no-child-nav="true"
      :bng-no-nav="hasControlFocus ? undefined : 'true'"
      :tabindex="hasControlFocus ? 0 : -1"

      v-bng-on-ui-nav:ok.focusRequired="hasControlFocus ? onExitToRow : undefined"
      v-bng-on-ui-nav:back.focusRequired="onExitToRow"
      v-bng-on-ui-nav:focus_u.focusRequired="() => onReorder(-1)"
      v-bng-on-ui-nav:focus_d.focusRequired="() => onReorder(1)"
      v-bng-on-ui-nav:focus_ud.focusRequired="onReorderScalar"
      v-bng-on-ui-nav:context.focusRequired="!$simplemenu && hasControlFocus ? onEditBinding : undefined"

      v-bng-ui-nav-label:back="hasControlFocus ? $t('ui.common.back') : ''"
      v-bng-ui-nav-label:focus_u,focus_d,focus_ud="hasControlFocus ? $t('ui.common.reorder') : ''"
      v-bng-ui-nav-label:context="!$simplemenu && hasControlFocus ? $t('ui.controls.editBinding.reassign') : ''"

      @focus="onControlFocus"
      @blur="onControlBlur"
    >
      <span class="binding-container" v-if="!$simplemenu">
        <BngBinding
          :action="`camera_${cam.slotId}`"
          class="clickable"
        />
      </span>

      <BngButton
        :disabled="isFirst"
        class="order-button up-button"
        :accent="ACCENTS.text"
        :icon="icons.arrowLargeUp"
        bng-no-nav
        tabindex="-1"
        @click.stop="emit('reorder', -1)"
      />

      <BngButton
        :disabled="isLast"
        class="order-button down-button"
        :accent="ACCENTS.text"
        :icon="icons.arrowLargeDown"
        bng-no-nav
        tabindex="-1"
        @click.stop="emit('reorder', 1)"
      />

      <span class="camera-name clickable">{{ $t(`ui.camera.mode.${cam.name}`) }}</span>

      <span v-if="hasGamepadFocus" class="camera-action-hint">
        <BngBinding
          ui-event="action_2"
          controller
        />

        {{
          engaged ? $t(cam.enabled ? 'ui.common.disable' : 'ui.common.enable') : $t('ui.options.camera.switchHint')
        }}
      </span>

      <span class="current-indicator">
        <BngIcon
          v-if="isCurrent"
          :type="icons.survellianceCamera"
          v-bng-tooltip:left="$t('ui.options.camera.current')"
        />
      </span>

      <BngSwitch
        :model-value="cam.enabled"
        class="camera-enabled-switch"
        bng-no-nav
        tabindex="-1"
        @click.stop
        @update:model-value="emit('toggle-enabled')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, provide, ref, nextTick, onMounted, onBeforeUnmount } from "vue"
import { BngBinding, BngButton, BngIcon, BngSwitch, ACCENTS, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav, vBngTooltip, vBngUiNavLabel } from "@/common/directives"
import { setFocus } from "@/services/uiNavFocus"

const $simplemenu = inject("$simplemenu")

const props = defineProps({
  cam: { type: Object, required: true },
  engaged: Boolean, // the camera is being reordered
  isDefault: Boolean,
  isCurrent: Boolean,
  isFirst: Boolean,
  isLast: Boolean,
  hasGamepadFocus: Boolean,
  reorderPending: Boolean,
})

const emit = defineEmits(["activate", "activate-camera", "disengage", "reorder", "edit-binding", "toggle-enabled"])

const row = inject("BngRow")
const inRow = !!row
const contentRef = ref(null)
const hasControlFocus = ref(false)
const internalScopeId = `options-camera-row-${props.cam.slotId || props.cam.name}`
const scopeDirective = computed(() => inRow ? { disabled: true } : { scopeId: internalScopeId, preferAutoFocus: true })

// shadow row for descendants
provide("BngRow", null)

const rowControlApi = {
  // prevent BngRow mouse activation
  activateOnClick: false,
  activate: () => {
    emit("activate")
    focusControlSoon()
  },
  get context() {
    return !$simplemenu && props.engaged? onRowContext : undefined
  },
  action2: () => {
    if (props.engaged) {
      emit("toggle-enabled")
    } else {
      emit("activate-camera")
    }
    return false
  },
}

if (row) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

function onRowContext() {
  const rowElement = row.getElement?.()
  if (rowElement && !rowElement.contains(document.activeElement)) return true
  emit("edit-binding")
  return false
}

function focusControl() {
  const target = contentRef.value
  if (!target) return
  setFocus(target, true, false)
  target.focus?.()
  target.classList.add("focus-visible")
  hasControlFocus.value = true
}

function focusControlSoon() {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      focusControl()
    })
  })
}

function exitToRow() {
  if (!inRow) return false
  const rowElement = row.getElement?.()
  if (!rowElement) return false
  contentRef.value?.blur?.()
  if (!setFocus(rowElement, true, false)) rowElement.focus?.()
  rowElement.classList.add("focus-visible")
  window.requestAnimationFrame(() => rowElement.classList.add("focus-visible"))
  return true
}

function onExitToRow() {
  emit("disengage")
  if (!exitToRow()) return true
  return false
}

function onReorder(direction) {
  if (props.reorderPending) {
    focusControlSoon()
    return false
  }
  emit("reorder", direction)
  focusControlSoon()
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => focusControl())
  })
  return false
}

function onReorderScalar(event) {
  const value = Number(event?.detail?.value)
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) return false
  return onReorder(value > 0 ? -1 : 1)
}

function onEditBinding() {
  hasControlFocus.value = false
  contentRef.value?.classList.remove("focus-visible")
  contentRef.value?.blur?.()
  document.activeElement?.blur?.()
  emit("edit-binding")
  return false
}

function onControlFocus() {
  hasControlFocus.value = true
}

function onControlBlur() {
  hasControlFocus.value = false
}

defineExpose({
  focusControl,
  focusControlSoon,
})
</script>

<style lang="scss" scoped>
.camera-row-scope {
  display: flex;
  width: 100%;
}

.camera-row-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  line-height: 1.5em;
  outline: none;

  .binding-container {
    margin-left: 0.5em;
  }

  .order-button {
    min-width: 2em;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &.up-button {
      margin-left: 12px;
    }

    &.down-button {
      margin-right: 10px;
    }
  }

  .camera-name {
    flex: 1;
    text-transform: capitalize;
    cursor: pointer;
  }

  .camera-action-hint {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
  }

  small {
    margin: 0 8px;
  }

  .current-indicator {
    flex: 0 0 5%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clickable {
    cursor: pointer;
  }

  .camera-enabled-switch {
    margin-right: calc(0.5em + 0.125em + 0.125em); // to align the checkboxes with other options
  }
}
</style>
