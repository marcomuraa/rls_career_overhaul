<template>
  <div class="photomode-overlays-section">
    <div
      v-if="!hideButtons"
      class="photomode-overlays-section__actions"
    >
      <BngButton
        v-if="activeOverlay"
        class="photomode-overlays-section__action"
        :accent="editing ? ACCENTS.main : ACCENTS.secondary"
        :disabled="!editable || busy"
        :title="editButtonHint"
        :icon="icons.edit"
        @click="onToggleEditing"
      >
        {{ editing ? $t("ui.photomode.overlay.finishEditing") : $t("ui.photomode.overlay.editOverlay") }}
      </BngButton>
      <BngButton
        class="photomode-overlays-section__action"
        :accent="ACCENTS.secondary"
        :disabled="busy || editing"
        :title="createHint"
        @click="openCreateDialog"
      >
        {{ $t("ui.photomode.overlay.new") }}
      </BngButton>
      <BngButton
        v-if="activeOverlay"
        class="photomode-overlays-section__action"
        :accent="ACCENTS.secondary"
        :disabled="busy || editing"
        :icon="icons.copy"
        :title="cloneHint"
        @click="openCloneDialog"
      >
        {{ $t("ui.photomode.overlay.clone") }}
      </BngButton>
      <BngButton
        v-if="activeOverlay"
        class="photomode-overlays-section__action"
        :accent="ACCENTS.secondary"
        :disabled="!editable || busy || editing"
        :icon="icons.edit"
        :title="renameHint"
        @click="openRenameDialog"
      >
        {{ $t("ui.photomode.overlay.rename") }}
      </BngButton>
      <BngButton
        v-if="activeOverlay"
        class="photomode-overlays-section__action"
        :accent="ACCENTS.attention"
        :disabled="!editable || busy || editing"
        :icon="icons.removeListItem"
        :title="deleteHint"
        @click="openDeleteDialog"
      >
        {{ $t("ui.photomode.overlay.delete") }}
      </BngButton>
    </div>

    <BngList
      class="photomode-overlays-section__list"
      :tile-width="9"
      :tile-margin="0.35"
    >
      <BngImageTile
        class="photomode-overlays-section__tile"
        :class="{ 'photomode-overlays-section__tile--active': activeId === null }"
        :label="$t('ui.photomode.none')"
        :icon="icons.minus"
        ratio="16:9"
        @click="onSelect(null)"
      />
      <BngImageTile
        v-for="entry in overlays"
        :key="entry.id"
        class="photomode-overlays-section__tile"
        :class="{ 'photomode-overlays-section__tile--active': activeId === entry.id }"
        :label="resolveOverlayName(entry.name, entry.id)"
        :external-image="thumbnailFor(entry)"
        ratio="16:9"
        @click="onSelect(entry.id)"
      />
    </BngList>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { $translate } from "@/services/translation"
import { BngList, BngImageTile, BngButton, icons, ACCENTS } from "@/common/components/base"
import { getAssetURL } from "@/utils"
import { openFormDialog, openConfirmation } from "@/services/popup"
import { useOverlays, resolveOverlayName, slugifyId, withOverlayTs } from "../useOverlays"
import OverlayNameForm from "./OverlayNameForm.vue"

// Shared engine missing-texture bitmap, reused as the tile fallback when
// an overlay ships without an overlay.png thumbnail.
const MISSING_TEXTURE_URL = getAssetURL("images/missingTexture.png")

defineOptions({ name: "PhotomodeOverlaysSection" })

const props = defineProps({
  panelActive: {
    type: Boolean,
    default: false,
  },
  hideButtons: {
    type: Boolean,
    default: false,
  },
})

const {
  overlays,
  activeId,
  activeOverlay,
  editable,
  editing,
  selectOverlay,
  setEditing,
  toggleEditing,
  createBlank,
  cloneActive,
  renameActive,
  removeOverlay,
} = useOverlays()

const busy = ref(false)
const feedback = ref(null)

const selectionLabel = computed(() => {
  if (!activeOverlay.value) return $translate.instant("ui.photomode.none")
  return resolveOverlayName(activeOverlay.value.name, activeOverlay.value.id)
})

const editButtonHint = computed(() => {
  if (!editable.value) return $translate.instant("ui.photomode.overlay.editReadOnlyHint")
  return editing.value
    ? $translate.instant("ui.photomode.overlay.stopEditingHint")
    : $translate.instant("ui.photomode.overlay.dragLayersHint")
})

const createHint = computed(() => $translate.instant("ui.photomode.overlay.createHint"))
const cloneHint = computed(() =>
  $translate.instant("ui.photomode.overlay.cloneHint", { name: selectionLabel.value })
)
const renameHint = computed(() => {
  if (!editable.value) return $translate.instant("ui.photomode.overlay.renameReadOnlyHint")
  return $translate.instant("ui.photomode.overlay.renameHint", { name: selectionLabel.value })
})
const deleteHint = computed(() => {
  if (!editable.value) return $translate.instant("ui.photomode.overlay.deleteReadOnlyHint")
  return $translate.instant("ui.photomode.overlay.deleteHint", { name: selectionLabel.value })
})

watch(
  () => props.hideButtons,
  hideButtons => {
    if (hideButtons) setEditing(false)
  },
  { immediate: true }
)

function thumbnailFor(entry) {
  if (!entry?.folderPath || entry.hasThumbnail !== true) return MISSING_TEXTURE_URL
  return withOverlayTs(`${entry.folderPath}/overlay.png`, entry.ts)
}

function onSelect(id) {
  selectOverlay(id)
  feedback.value = null
}

function onToggleEditing() {
  toggleEditing()
}

function reasonMessage(reason) {
  switch (reason) {
    case "invalid_dest_id": return $translate.instant("ui.photomode.overlay.error.invalidDestId")
    case "dest_id_exists": return $translate.instant("ui.photomode.overlay.error.destIdExists")
    case "source_not_found": return $translate.instant("ui.photomode.overlay.error.sourceNotFound")
    case "write_failed": return $translate.instant("ui.photomode.overlay.error.writeFailed")
    case "delete_failed": return $translate.instant("ui.photomode.overlay.error.deleteFailed")
    case "not_editable": return $translate.instant("ui.photomode.overlay.error.notEditable")
    case "no_active": return $translate.instant("ui.photomode.overlay.error.noActive")
    case "no_response": return $translate.instant("ui.photomode.overlay.error.noResponse")
    default:
      return reason
        ? $translate.instant("ui.photomode.overlay.error.withReason", { reason })
        : $translate.instant("ui.photomode.overlay.error.unknown")
  }
}

function dialogFormValidator(formModel) {
  const name = (formModel?.name ?? "").trim()
  const idSource = formModel?.id || formModel?.name
  const folderId = slugifyId(idSource)
  if (!name) return { error: true, message: $translate.instant("ui.photomode.overlay.validation.displayNameRequired") }
  if (!folderId) return { error: true, message: $translate.instant("ui.photomode.overlay.validation.folderIdRequired") }
  return { error: false }
}

async function promptForName({ title, description, initial, okLabel }) {
  const formModel = {
    name: initial?.name ?? "",
    id: initial?.id ?? "",
  }
  const result = await openFormDialog(
    OverlayNameForm,
    formModel,
    dialogFormValidator,
    title,
    description,
    [
      {
        label: okLabel || $translate.instant("ui.common.save"),
        value: true,
        emitData: true,
        disableIfInvalid: true,
        extras: { default: true, accent: ACCENTS.main },
      },
      {
        label: $translate.instant("ui.common.cancel"),
        value: false,
        extras: { cancel: true, accent: ACCENTS.secondary },
      },
    ],
  ).catch(() => null)
  // openFormDialog rejects the promise on cancel/back; normalise that into
  // a falsy return so callers only branch on "did we get a result".
  if (!result || result.value !== true) return null
  const data = result.formData || formModel
  return {
    name: (data.name || "").trim(),
    id: slugifyId(data.id || data.name),
  }
}

async function openCreateDialog() {
  const input = await promptForName({
    title: $translate.instant("ui.photomode.overlay.dialog.createTitle"),
    description: $translate.instant("ui.photomode.overlay.dialog.createDescription"),
    initial: { name: "", id: "" },
    okLabel: $translate.instant("ui.photomode.overlay.dialog.create"),
  })
  if (!input) return
  await runAction(() => createBlank(input), {
    successText: () => $translate.instant("ui.photomode.overlay.feedback.created", { name: input.name }),
  })
}

async function openCloneDialog() {
  if (!activeOverlay.value) return
  const sourceLabel = resolveOverlayName(activeOverlay.value.name, activeOverlay.value.id)
  const input = await promptForName({
    title: $translate.instant("ui.photomode.overlay.dialog.cloneTitle", { name: sourceLabel }),
    description: $translate.instant("ui.photomode.overlay.dialog.cloneDescription"),
    initial: {
      name: `${sourceLabel}${$translate.instant("ui.photomode.overlay.feedback.copySuffix")}`,
      id: `${activeOverlay.value.id}-copy`,
    },
    okLabel: $translate.instant("ui.photomode.overlay.clone"),
  })
  if (!input) return
  await runAction(() => cloneActive(input), {
    successText: () => $translate.instant("ui.photomode.overlay.feedback.cloned", { name: input.name }),
  })
}

async function openRenameDialog() {
  if (!activeOverlay.value || !editable.value) return
  const overlayName = resolveOverlayName(activeOverlay.value.name, activeOverlay.value.id)
  const input = await promptForName({
    title: $translate.instant("ui.photomode.overlay.dialog.renameTitle", { name: overlayName }),
    description: $translate.instant("ui.photomode.overlay.dialog.renameDescription"),
    initial: {
      name: overlayName,
      id: activeOverlay.value.id,
    },
    okLabel: $translate.instant("ui.photomode.overlay.rename"),
  })
  if (!input) return
  await runAction(() => renameActive(input), {
    successText: () => $translate.instant("ui.photomode.overlay.feedback.renamed", { name: input.name }),
  })
}

async function openDeleteDialog() {
  if (!activeOverlay.value || !editable.value) return
  const label = selectionLabel.value
  const confirmed = await openConfirmation(
    $translate.instant("ui.photomode.overlay.dialog.deleteTitle"),
    $translate.instant("ui.photomode.overlay.dialog.deleteDescription", { name: label }),
    [
      { label: $translate.instant("ui.common.delete"), value: true, extras: { default: true, accent: ACCENTS.attention } },
      { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true, accent: ACCENTS.secondary } },
    ],
  ).catch(() => false)
  if (confirmed !== true) return
  await runAction(() => removeOverlay(activeOverlay.value?.id), {
    successText: () => $translate.instant("ui.photomode.overlay.feedback.deleted", { name: label }),
  })
}

async function runAction(fn, { successText }) {
  busy.value = true
  feedback.value = null
  try {
    const result = await fn()
    if (result?.ok) {
      feedback.value = { kind: "ok", text: typeof successText === "function" ? successText() : successText }
    } else {
      feedback.value = { kind: "error", text: reasonMessage(result?.reason) }
    }
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.photomode-overlays-section {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.9rem 1rem;
  border-radius: var(--bng-corners-2);
  // background: rgba(var(--bng-off-black-rgb), 0.38);
  // box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.08);
  flex: 1 1 auto;
  min-height: 0;
}

.photomode-overlays-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.photomode-overlays-section__heading {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.photomode-overlays-section__title {
  margin: 0;
  font-size: 1rem;
  color: rgba(var(--bng-off-white-rgb), 0.96);
}

.photomode-overlays-section__hint {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.7;
}

.photomode-overlays-section__list {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
}

// BngTile defaults to a single-line, generously padded label. We want a
// shorter card with room for a two-line title under a 16:9 thumbnail, so
// we trim the outer chrome and let the label wrap & clamp.
.photomode-overlays-section__tile {
  padding: 0.3rem;
}

.photomode-overlays-section__tile:deep(.label) {
  padding: 0.3rem 0.15rem 0.1rem;
  line-height: 1.15;
  font-size: 0.78rem;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.photomode-overlays-section__tile--active {
  // Mirrors PhotomodeRecentShots' selection style: tinted fill + subtle
  // inset/outset orange-b400 shadows. Distinct from the pure orange-500
  // gamepad focus frame so authors can tell selection apart from focus.
  background: rgba(var(--bng-orange-b400-rgb), 0.18);
  box-shadow:
    inset 0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.55),
    0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.18);
  border-radius: var(--bng-corners-1);
}

.photomode-overlays-section__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.photomode-overlays-section__action {
  align-self: flex-start;
}

.photomode-overlays-section__feedback {
  margin: 0;
  font-size: 0.8rem;

  &--ok {
    color: rgba(var(--bng-off-white-rgb), 0.85);
  }

  &--error {
    color: rgba(var(--bng-attention-rgb, 229 80 80), 0.95);
  }
}
</style>
