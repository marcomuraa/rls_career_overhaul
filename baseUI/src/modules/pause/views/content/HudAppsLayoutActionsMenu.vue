<template>
  <BngPopoverContent
    :name="menuId"
    placement="right"
    @hide="onPopoverHide"
  >
    <div class="hud-apps-layout-actions-menu">
      <p class="hud-apps-layout-actions-menu__title">{{ layoutDisplayName }}</p>

      <BngButton
        bng-scoped-nav-autofocus
        :accent="ACCENTS.menu"
        :icon="icons.edit"
        :disabled="!canRename"
        @click="onRename"
      >{{ $t("ui.appselect.layout.rename") }}</BngButton>
      <BngButton
        :accent="ACCENTS.menu"
        :icon="icons.copy"
        :disabled="!canDuplicate"
        @click="onDuplicate"
      >{{ $t("ui.appselect.layout.duplicate") }}</BngButton>
      <BngButton
        :accent="ACCENTS.menu"
        :icon="icons.restart"
        :disabled="!canReset"
        @click="onReset"
      >{{ $t("ui.appselect.layout.reset") }}</BngButton>
      <BngButton
        :accent="ACCENTS.menu"
        :icon="icons.trashBin1"
        class="hud-apps-layout-actions-menu__delete"
        :disabled="!canDelete"
        @click="onDelete"
      >{{ $t("ui.appselect.layout.delete") }}</BngButton>

      <div v-if="disabledHints.length" class="hud-apps-layout-actions-menu__hints">
        <p v-for="hint in disabledHints" :key="hint">{{ $t(hint) }}</p>
      </div>
    </div>
  </BngPopoverContent>
</template>

<script setup>
import { computed, ref } from "vue"
import { BngButton, BngPopoverContent, ACCENTS, icons } from "@/common/components/base"
import { $translate } from "@/services"
import { openConfirmation, openPrompt } from "@/services/popup"
import { usePopoverHelper } from "@/services/popover"
import { uniqueId } from "@/services/uniqueId"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore.js"

defineOptions({ name: "HudAppsLayoutActionsMenu" })

const menuId = uniqueId("hud-apps-layout-actions-menu")
const appLayoutsStore = useAppLayoutsStore()
const popoverHelper = usePopoverHelper()

const activeItem = ref(null)

const hasFilename = computed(() => typeof activeItem.value?.filename === "string" && activeItem.value.filename !== "")
const isCustom = computed(() => activeItem.value?.isCustom === true && activeItem.value?.isSystem !== true)

const canRename = computed(() => hasFilename.value && isCustom.value)
const canDuplicate = computed(() => hasFilename.value)
const canReset = computed(() => hasFilename.value && activeItem.value?.isResettable === true)
const canDelete = computed(() => hasFilename.value && isCustom.value)

const disabledHints = computed(() => {
  const hints = []
  if (!canRename.value) hints.push("ui.hudApps.disabled.customRequired")
  if (!canReset.value) hints.push("ui.hudApps.disabled.resettableRequired")
  return hints
})

const layoutDisplayName = computed(() => {
  const item = activeItem.value
  if (!item) return $translate.instant("ui.hudApps.noLayoutSelected")
  return item.title || item.label || item.type || item.filename || $translate.instant("ui.hudApps.unnamedLayout")
})

function toDisplayName(item) {
  return item?.title || item?.label || item?.type || item?.filename || $translate.instant("ui.appselect.layout.fallbackName")
}

function open(item, targetEl) {
  if (!item) return
  activeItem.value = item
  popoverHelper.show(menuId, targetEl || document.activeElement || undefined)
}

function hide() {
  popoverHelper.hide(menuId)
}

function onPopoverHide() {
  activeItem.value = null
}

async function onRename() {
  const item = activeItem.value
  if (!item || !canRename.value) return
  hide()
  const currentTitle = item.title || item.type || ""
  const nextTitle = await openPrompt(
    $translate.instant("ui.appselect.layout.prompt.renameText"),
    $translate.instant("ui.appselect.layout.prompt.renameTitle"),
    { defaultValue: currentTitle },
  ).catch(() => null)
  const trimmed = typeof nextTitle === "string" ? nextTitle.trim() : ""
  if (!trimmed || trimmed === currentTitle) return
  await appLayoutsStore.renameLayout(item.filename, trimmed)
}

async function onDuplicate() {
  const item = activeItem.value
  if (!item || !canDuplicate.value) return
  hide()
  const title = await openPrompt(
    $translate.instant("ui.appselect.layout.prompt.duplicateText"),
    $translate.instant("ui.appselect.layout.prompt.duplicateTitle"),
    { defaultValue: `${toDisplayName(item)}${$translate.instant("ui.appselect.layout.copySuffix")}` },
  ).catch(() => null)
  const trimmed = typeof title === "string" ? title.trim() : ""
  if (!trimmed) return
  await appLayoutsStore.duplicateLayout(item.filename, trimmed)
}

async function onReset() {
  const item = activeItem.value
  if (!item || !canReset.value) return
  hide()
  const ok = await openConfirmation(
    $translate.instant("ui.appselect.layout.confirm.resetTitle"),
    $translate.instant("ui.appselect.layout.confirm.resetMessage", { name: toDisplayName(item) }),
  ).catch(() => false)
  if (!ok) return
  await appLayoutsStore.resetLayout(item.filename)
}

async function onDelete() {
  const item = activeItem.value
  if (!item || !canDelete.value) return
  hide()
  const ok = await openConfirmation(
    $translate.instant("ui.appselect.layout.confirm.deleteTitle"),
    $translate.instant("ui.appselect.layout.confirm.deleteMessage", { name: toDisplayName(item) }),
  ).catch(() => false)
  if (!ok) return
  await appLayoutsStore.deleteLayout(item.filename)
}

defineExpose({ open, hide })
</script>

<style scoped lang="scss">
.hud-apps-layout-actions-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  min-width: 12rem;
  max-width: 20rem;

  :deep(.bng-button) {
    width: 100%;
    max-width: unset;
    margin: 0;
  }
}

.hud-apps-layout-actions-menu__title {
  margin: 0 0 0.15em;
  padding: 0 0.25em;
  color: var(--bng-off-white);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-apps-layout-actions-menu__delete {
  --bng-button-text-enabled-color: var(--bng-add-red-300);
  --bng-bg-hover: var(--bng-add-red-600);
  --bng-bg-active: var(--bng-add-red-800);
}

.hud-apps-layout-actions-menu__hints {
  display: flex;
  flex-direction: column;
  gap: 0.15em;
  margin-top: 0.15em;
  padding: 0.25em;
  border-top: 1px solid rgba(255, 255, 255, 0.12);

  p {
    margin: 0;
    color: var(--bng-cool-gray-200);
    font-size: 0.78em;
  }
}
</style>
