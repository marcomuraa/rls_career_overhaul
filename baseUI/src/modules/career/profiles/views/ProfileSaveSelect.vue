<template>
  <LayoutMenu
    class="career-profile-saves"
    :nav-scope="navScope"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    v-bng-on-ui-nav:back="onBack"
    @breadcrumb-back="onBack"
    @breadcrumb-click="onBreadcrumbClick"
  >
    <div class="saves-screen-panel">
      <div class="profiles-info-box" v-bng-blur>
        <BlurBackground />
        <div class="profiles-info-header">
          <BngScreenHeadingV2 type="2">{{ heading }}</BngScreenHeadingV2>
        </div>


      </div>

      <div
        class="saves-panel"
        :class="{ disabled: isBusy }"
        v-bng-blur
      >
        <div v-if="isSaveMode" class="save-bar">
          <BngInput
            class="save-name-input"
            v-model="saveName"
            bng-scoped-nav-autofocus
            :maxlength="SAVE_NAME_MAX_LENGTH"
            :validate="validateSaveNameInput"
            :placeholder="$t('ui.career.profiles.saves.namePlaceholder')"
          />
          <BngButton
            class="save-confirm-button"
            accent="outlined"
            :disabled="!canSave"
            v-bng-sound-class="'bng_click_generic'"
            @click="onSave"
          >
            <BngIcon :type="isOverwrite ? 'warning' : 'floppyDisk'" />
            <span>{{ saveButtonLabel }}</span>
          </BngButton>
        </div>
        <div v-if="isSaveMode && nameError" class="save-error">{{ nameError }}</div>
        <div v-if="isLoadingSaves" class="saves-state-text">{{ $t("ui.common.loading") }}</div>
        <div v-else-if="!saveFolders.length" class="saves-state-text">{{ $t("ui.career.profiles.saves.empty") }}</div>
        <BngList
          v-else
          class="saves-list"
          :layout="LIST_LAYOUTS.LIST"
          :target-width="40"
          :target-height="5.5"
          :target-margin="0.5"
          no-background
          v-bng-on-ui-nav:ok.focusRequired="onChooseFocused"
          v-bng-on-ui-nav:context.focusRequired="onDeleteFocused"
        >
          <div
            v-for="(save, index) in saveFolders"
            :key="save.name"
            class="save-item"
            :class="{ incompatible: save.incompatibleVersion, corrupted: save.corrupted, selected: isSaveMode && matchesName(save.name) }"
            role="button"
            bng-nav-item
            tabindex="0"
            v-bind="!isSaveMode && index === 0 ? { 'bng-scoped-nav-autofocus': true } : {}"
            v-bng-sound-class="'bng_click_hover_generic'"
            @click="onChooseSave(save)"
            @focusin.self="focusedName = save.name"
            @focusout.self="focusedName = null"
          >
            <span class="save-main">
              <span class="save-name">{{ save.name }}</span>
              <span class="save-subtitle">
                <span v-if="save.incompatibleVersion">{{ $t("ui.career.profiles.warning.incompatibleVersion") }}</span>
                <span v-else-if="save.corrupted">{{ $t("ui.career.profiles.saves.corrupted") }}</span>
                <span v-else>{{ $t("ui.career.profiles.vehicleCountShort", { count: save.vehicleCount }) }}</span>
              </span>
            </span>
            <span class="save-side">
              <BngUnit :money="save.money?.value || 0" />
              <span>{{ lastPlayed(save) }}</span>
            </span>
            <span class="save-actions">
              <button
                class="save-action"
                type="button"
                bng-no-nav="true"
                tabindex="-1"
                :disabled="isPrimaryDisabled(save)"
                v-bng-sound-class="'bng_click_generic'"
                :title="$t(isSaveMode ? 'ui.common.save' : 'ui.common.select')"
                @click.stop="onChooseSave(save)"
              >
                <BngBinding v-if="isControllerUsed && focusedName === save.name" class="save-action-binding" ui-event="ok" controller />
                <BngIcon class="save-action-icon" :type="isSaveMode ? 'edit' : 'play'" />
              </button>
              <button
                class="save-action save-action--danger"
                type="button"
                bng-no-nav="true"
                tabindex="-1"
                :disabled="isDeleteDisabled(save)"
                v-bng-sound-class="'bng_click_generic'"
                :title="$t('ui.career.delete')"
                @click.stop="onDeleteSave(save)"
              >
                <BngBinding v-if="isControllerUsed && focusedName === save.name && !isDeleteDisabled(save)" class="save-action-binding" ui-event="context" controller />
                <BngIcon class="save-action-icon" type="trashBin1" />
              </button>
            </span>
          </div>
        </BngList>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, onUnmounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngButton, BngIcon, BngInput, BngList, BngScreenHeadingV2, BngUnit, LIST_LAYOUTS } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngSoundClass } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { lua } from "@/bridge"
import useControls from "@/services/controls"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services/translation"
import { timeSpan } from "@/utils/datetime"
import { useCareerProfiles } from "../composables/useCareerProfiles"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"

const SAVE_NAME_MAX_LENGTH = 100
const INVALID_SAVE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/

const props = defineProps({
  profileId: {
    type: String,
    default: "",
  },
  mode: {
    type: String,
    default: "load",
  },
})

const { isLoadingProfile, getSaveFolders, loadProfileSave, saveCurrentAs, removeSaveFolder } = useCareerProfiles()
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)

const saveFolders = ref([])
const isLoadingSaves = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const isCareerActive = ref(false)
const resolvedProfileId = ref(props.profileId)
const profileDisplayName = ref(props.profileId)
const saveName = ref("")
const nameError = ref(null)
const focusedName = ref(null)

const isSaveMode = computed(() => props.mode === "save")
const navScope = computed(() => (isSaveMode.value ? "career-profiles-saveas" : "career-profiles-saves"))
const isBusy = computed(() => isLoadingProfile.value || isSaving.value || isDeleting.value)

function isPrimaryDisabled(save) {
  if (isBusy.value) return true
  return !isSaveMode.value && (save.incompatibleVersion || save.corrupted)
}

function isDeleteDisabled(save) {
  return isBusy.value || save.isCurrent
}

function getFocusedSave() {
  return saveFolders.value.find(save => save.name === focusedName.value) || null
}

function onChooseFocused() {
  const save = getFocusedSave()
  if (save) onChooseSave(save)
  return false
}

function onDeleteFocused() {
  const save = getFocusedSave()
  if (save && !isDeleteDisabled(save)) onDeleteSave(save)
  return false
}

const heading = computed(() => {
  const displayName = profileDisplayName.value || resolvedProfileId.value
  const key = isSaveMode.value ? "ui.career.profiles.saves.saveAsTitleFor" : "ui.career.profiles.saves.titleFor"
  return $translate.instant(key, { profile: displayName })
})

const isOverwrite = computed(() => saveFolders.value.some(save => matchesName(save.name)))
const saveButtonLabel = computed(() =>
  $translate.instant(isOverwrite.value ? "ui.career.profiles.saves.overwrite" : "ui.common.save"))
const canSave = computed(() => isSaveMode.value && !isBusy.value && !!saveName.value.trim() && !getSaveNameError(saveName.value))

const exitBreadcrumbLabel = computed(() => $translate.instant(isCareerActive.value ? "ui.environment.pause" : "ui.common.menu"))
const breadcrumbItems = computed(() => {
  if (isSaveMode.value) {
    return [
      { label: exitBreadcrumbLabel.value, isBackButton: true },
      { label: $translate.instant("ui.common.save") },
    ]
  }
  return [
    { label: exitBreadcrumbLabel.value, isBackButton: true },
    { label: $translate.instant("ui.career.profiles.title"), route: "career.profiles" },
    { label: $translate.instant("ui.career.profiles.saves.title") },
  ]
})

function matchesName(name) {
  return !!saveName.value && saveName.value.trim().toLowerCase() === String(name).toLowerCase()
}

function getSaveNameError(name) {
  const trimmed = (name || "").trim()
  if (!trimmed) return $translate.instant("ui.career.profile.saveNameEmpty")
  if (trimmed.length > SAVE_NAME_MAX_LENGTH) return $translate.instant("ui.career.profile.saveNameTooLong")
  if (INVALID_SAVE_NAME_CHARS.test(trimmed)) return $translate.instant("ui.career.profile.saveNameInvalidChars")
  return null
}

function validateSaveNameInput(name) {
  nameError.value = getSaveNameError(name)
  return !nameError.value
}

function lastPlayed(save) {
  return save.date ? timeSpan(save.date, null, 1, true) : $translate.instant("ui.common.unknown")
}

function refreshCareerBackTarget() {
  lua.career_career.isActive().then(active => {
    isCareerActive.value = !!active
  })
}

async function resolveSaveModeProfile() {
  const current = await lua.career_career.sendCurrentProfileData()
  resolvedProfileId.value = current?.id || ""
  profileDisplayName.value = current?.displayName || current?.id || ""
}

async function loadSaveFolders() {
  isLoadingSaves.value = true
  try {
    saveFolders.value = await getSaveFolders(resolvedProfileId.value)
    if (!isSaveMode.value && saveFolders.value[0]?.displayName) {
      profileDisplayName.value = saveFolders.value[0].displayName
    }
  } finally {
    isLoadingSaves.value = false
  }
}

function goToProfiles() {
  lua.extensions.ui_router.navigate("career.profiles", null, null)
}

function goToExitTarget() {
  lua.extensions.ui_router.navigate(isCareerActive.value ? "pause" : "menu", null, null)
}

async function refreshExitTargetThenGo() {
  const active = await lua.career_career.isActive()
  isCareerActive.value = !!active
  goToExitTarget()
}

function onBreadcrumbClick(item) {
  if (item?.isBackButton) {
    refreshExitTargetThenGo()
    return
  }
  if (item?.route === "career.profiles") goToProfiles()
}

function onBack(event) {
  if (event?.preventDefault) event.preventDefault()
  if (event?.stopPropagation) event.stopPropagation()
  if (isSaveMode.value) refreshExitTargetThenGo()
  else goToProfiles()
  return false
}

async function onChooseSave(save) {
  if (!save) return
  if (isSaveMode.value) {
    if (isBusy.value) return
    saveName.value = save.name
    nameError.value = null
    return
  }
  if (save.incompatibleVersion || save.corrupted || isBusy.value) return
  await loadProfileSave(resolvedProfileId.value, save.name)
}

async function onDeleteSave(save) {
  if (!save || isDeleteDisabled(save)) return
  const title = $translate.instant("ui.career.profiles.saves.deleteTitle", { save: save.name })
  const message = `${$translate.instant("ui.career.profiles.saves.deletePrompt")}\n\n${$translate.instant("ui.career.deleteCannotUndo")}`
  const confirmed = await openConfirmation(title, message)
  if (!confirmed) return

  isDeleting.value = true
  try {
    await removeSaveFolder(resolvedProfileId.value, save.name)
    if (matchesName(save.name)) {
      saveName.value = ""
      nameError.value = null
    }
    await loadSaveFolders()
  } finally {
    isDeleting.value = false
  }
}

async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    await saveCurrentAs(saveName.value.trim())
  } finally {
    isSaving.value = false
  }
  refreshExitTargetThenGo()
}

onBeforeMount(() => {
  refreshCareerBackTarget()
  lua.simTimeAuthority.pushPauseRequest("profiles")
})

onMounted(async () => {
  if (isSaveMode.value) await resolveSaveModeProfile()
  await loadSaveFolders()
})

onBeforeUnmount(() => {
  lua.simTimeAuthority.popPauseRequest("profiles")
})

onUnmounted(() => {})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.career-profile-saves {
  --content-max-width: calc-ui-rem(72);
  --content-h-position: center;
  --content-v-position: center;

  :deep(.layout-content) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    flex: 1 1 auto;
  }

  :deep(.menu-content-main) {
    align-items: center;
    justify-content: center;
  }
}

.saves-screen-panel {
  width: calc-ui-rem(70);
  height: calc-ui-rem(47);
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  min-height: 0;
}

.profiles-info-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  --bng-heading-background: none;
  color: var(--bng-off-white);
}

.profiles-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc-ui-rem(0.5);
}

.profiles-info-box :deep(.bng-screen-heading) {
  padding: 0.6em 0.75em;
  margin-top: 0;
}

.save-bar {
  display: flex;
  align-items: flex-start;
  gap: calc-ui-rem(0.75);
  padding: 0 calc-ui-rem(0.75) calc-ui-rem(0.5);
}

.save-error {
  padding: 0 calc-ui-rem(0.75) calc-ui-rem(0.6);
  color: rgba(var(--bng-add-red-300-rgb), 0.95);
  font-size: calc-ui-rem(0.9);
  font-weight: 600;
  line-height: 1.2;
}

.save-name-input {
  flex: 1 1 auto;
  min-width: 0;
}

.save-confirm-button {
  --bng-button-margin: 0;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: calc-ui-rem(0.3);
}

.saves-panel {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.72);
  color: var(--bng-off-white);
  padding: calc-ui-rem(0.5);

  &.disabled {
    pointer-events: none;
  }
}

.saves-state-text {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  font-size: calc-ui-rem(1.3);
  font-weight: 700;
}

.saves-list {
  flex: 1 1 auto;
  min-height: 0;
}

.save-item {
  @include modify-focus(var(--bng-corners-1), 0px);
  width: 100%;
  min-height: calc-ui-rem(5.4);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: calc-ui-rem(0.75);
  padding: calc-ui-rem(0.5) calc-ui-rem(0.75);
  border: 0;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.72);
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus,
  &.focus-visible {
    background-color: rgba(var(--bng-cool-gray-700-rgb), 0.85);
  }

  &.selected {
    background-image: linear-gradient(90deg, rgba(var(--bng-orange-600-rgb), 0.48), rgba(var(--bng-cool-gray-800-rgb), 0.78));
    box-shadow: inset calc-ui-rem(0.25) 0 0 var(--bng-orange-300);
  }

  &.incompatible,
  &.corrupted {
    filter: grayscale(1);
    opacity: 0.72;
  }
}

.save-main,
.save-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.25);
  :deep(.icon) {
    color: rgba(var(--bng-off-white-rgb), 0.72);
  }
}

.save-name {
  font-weight: 800;
  font-size: calc-ui-rem(1.05);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-subtitle,
.save-side {
  color: rgba(var(--bng-off-white-rgb), 0.72);
  font-size: calc-ui-rem(0.85);
}

.save-side {
  align-items: flex-end;
  text-align: right;
}

.save-actions {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc-ui-rem(0.2);
  visibility: hidden;
  width: 0;

  .save-item:hover &,
  .save-item:focus &,
  .save-item.focus-visible &,
  .save-item:focus-within & {
    visibility: visible;
    width: auto;
  }
}

.save-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc-ui-rem(0.2);
  min-width: calc-ui-rem(2.2);
  height: calc-ui-rem(2.2);
  padding: 0 0.5rem;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.68);
  color: var(--bng-off-white);
  cursor: pointer;
  font-size: calc-ui-rem(0.8);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;

  .save-item:hover &,
  .save-item:focus &,
  .save-item.focus-visible &,
  .save-item:focus-within & {
    opacity: 1;
    pointer-events: auto;
  }

  .save-item:hover &:disabled,
  .save-item:focus &:disabled,
  .save-item.focus-visible &:disabled,
  .save-item:focus-within &:disabled {
    opacity: 0.42;
    pointer-events: none;
  }

  &:hover:not(:disabled) {
    background: rgba(var(--bng-cool-gray-600-rgb), 0.8);
  }

  &:disabled {
    cursor: default;
    opacity: 0.42;
    pointer-events: none;
    background: rgba(var(--bng-cool-gray-800-rgb), 0.55);
    color: rgba(var(--bng-off-white-rgb), 0.45);
  }
}

.save-action--danger:hover:not(:disabled) {
  background: rgba(var(--bng-add-red-700-rgb), 0.62);
}

.save-action-icon {
  --bng-icon-size: 1.25em;
}

.save-action-binding {
  display: inline-flex;
}
</style>
