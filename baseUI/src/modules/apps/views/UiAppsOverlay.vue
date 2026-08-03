<template>
  <div
    v-if="visible"
    class="ui-apps-overlay"
    :class="{ 'ui-apps-overlay-interactive': overlayInteractive }"
  >
    <Overlay
      ref="overlayRef"
      :items="items"
      :resolve="resolveUiAppPlacement"
      :editable="true"
      :initial-editing="false"
      :uinav="overlayInteractive"
      :snap="snap"
      :dim-unselected-items="overlayInteractive && dimUnselectedApps"
      :item-editor-interactive="overlayInteractive"
      :item-hover-enabled="editing"
      :item-controls-visible="overlayInteractive"
      :adjust-back-cancels="!dimUnselectedApps"
      :lock-selection="overlayInteractive && dimUnselectedApps"
      :highlighted-item-id="hoveredAppId"
      :always-show-item-controls="true"
      controls-position="top"
      @item-changed="onItemChanged"
      @select="onSelect"
      @item-hover="onItemHover"
      @confirm="onConfirm"
    >
      <template #default="{ item, rectPx }">
        <AppHost :item="item" :rect-px="rectPx" prevent-uinav />
      </template>

      <template #item-controls="{ item, rectPx, selected: itemSelected, activeOp }">
        <div
          v-if="isControllerUsed && (activeOp === 'moving' || activeOp === 'resizing')"
          class="ui-apps-overlay__adjust-hint"
        >
          <div class="ui-apps-overlay__adjust-hint-row">
            <BngBinding ui-event="action_2" controller track-ignore class="ui-apps-overlay__binding" />
            <span>{{ activeOp === "resizing" ? $t("ui.hudApps.hint.switchToMove") : $t("ui.hudApps.hint.switchToResize") }}</span>
          </div>
          <div class="ui-apps-overlay__adjust-hint-row">
            <BngBinding ui-event="action_3" controller track-ignore class="ui-apps-overlay__binding" />
            <span>{{ $t("ui.appselect.noCockpit") }}</span>
            <SwitchToggle :checked="!!item.settings?.noCockpit" class="ui-apps-overlay__adjust-hint-switch" />
          </div>
        </div>
        <AppItemActions
          v-else
          :item="item"
          :rect-px="rectPx"
          :selected="itemSelected"
        />
      </template>
    </Overlay>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { Overlay } from "@/common/modules/overlay"
import { BngBinding } from "@/common/components/base"
import SwitchToggle from "@/common/components/utility/switchToggle.vue"
import { luaRouterScopedNavBack } from "@/services/scopedNav/api"
import useControls from "@/services/controls"
import AppHost from "../components/AppHost.vue"
import AppItemActions from "../components/AppItemActions.vue"
import { useAppLayoutsStore } from "../appLayoutsStore.js"
import { resolveUiAppPlacement } from "../placementResolve.js"

defineOptions({ name: "UiAppsOverlay" })

const store = useAppLayoutsStore()
const { apps: items, editing, selectedAppId, hoveredAppId, overlayEditingEnabled, dimUnselectedApps, visible } = storeToRefs(store)
const { isControllerUsed } = storeToRefs(useControls())

const overlayRef = ref(null)
const overlayInteractive = computed(() => editing.value && overlayEditingEnabled.value)
// allow final commit while transform exit disables overlay interactivity
let committingTransformExit = false

const snap = {
  edges: true,
  centre: true,
  threshold: 5, // px
}

onMounted(() => {
  store.loadInitialData().catch(err => {
    console.warn("[UiAppsOverlay] loadInitialData failed", err)
  })
})

watch([editing, overlayRef], ([on, instance]) => {
  if (!instance || instance.isEditing?.() === on) return
  instance.toggleEditor?.(on)
})

watch([selectedAppId, overlayRef], ([itemId, instance]) => {
  if (!instance) return
  instance.select?.(itemId)
})

watch([overlayInteractive, dimUnselectedApps, selectedAppId, overlayRef], async ([interactive, dim, itemId, instance]) => {
  if (!interactive || !dim || !itemId || !instance) return
  await nextTick()
  instance.select?.(itemId)
  instance.enterAdjust?.(itemId)
}, { flush: "post" })

watch([overlayInteractive, dimUnselectedApps, overlayRef], ([interactive, dimmed, instance], [, wasDimmed]) => {
  if (interactive && dimmed) return
  if (wasDimmed && instance?.isAdjusting?.()) {
    committingTransformExit = true
    instance.exitAdjust()
    committingTransformExit = false
  } else if (!interactive) {
    instance?.exitAdjust?.()
  }
  if (interactive) return
  instance?.cancel?.()
})

function onItemChanged(item, rectPx, frame) {
  if (!overlayInteractive.value && !committingTransformExit) return
  if (!item || !rectPx || !frame) return
  store.applyPxFromOverlay(item.id, rectPx, frame)
}

function onSelect(itemId) {
  store.selectApp(itemId)
}

function onItemHover(itemId) {
  store.hoverApp(itemId)
}

function onConfirm() {
  void luaRouterScopedNavBack("hudapps-edit-layout")
}

</script>

<style lang="scss" scoped>
.ui-apps-overlay {
  width: 100%;
  height: 100%;
  pointer-events: none;
  &-interactive {
    pointer-events: auto;
  }
}

.ui-apps-overlay__adjust-hint {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35em;
  padding: 0.25em 0.5em;
  color: var(--bng-off-white);
  font-size: 1em;
  white-space: nowrap;
  pointer-events: none;
}

.ui-apps-overlay__adjust-hint-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
}

.ui-apps-overlay__binding {
  font-size: 1.35em;
}

.ui-apps-overlay__adjust-hint-switch {
  --bng-switch-toggle-size: 1em;
}
</style>
