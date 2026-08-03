<template>
  <div
    :class="{
      saveload: true,
      'with-background': withBackground,
      'saveload--busy': saveInProgress,
    }"
    v-bng-blur="withBackground"
    v-bng-disabled="saveInProgress"
  >
    <div class="saveload-static saveload-section">
      <div class="saveload-row saveload-row--full saveload-filename">
        <BngInput
          v-model="saveName"
          :label="$t('ui.vehicleconfig.filename')"
          :maxlength="30"
          :disabled="saveControlsDisabled"
          floating-label
          bng-scoped-nav-autofocus
        />
      </div>
    </div>

    <div class="saveload-static saveload-section">
      <div class="saveload-preview-image-wrap">
        <img class="saveload-preview-image" :src="previewDisplayImageUrl" alt="Configuration preview" />
      </div>
      <BngRow v-show="!hasPreviewThumbnail" class="saveload-option">
        <template #label>Generate thumbnail on save</template>
        <BngSwitch v-model="saveSettings.generateThumbnail" :disabled="saveControlsDisabled" />
      </BngRow>
      <div class="saveload-row saveload-row--full saveload-preview-row">
        <div class="saveload-thumbnail-controls">
          <div class="saveload-row saveload-row--full saveload-preview-actions">
            <BngButton class="saveload-preview-button" :accent="ACCENTS.main" v-bng-disabled="previewControlsDisabled" @click="takePreview">
              {{ previewActionLabel }}
            </BngButton>
            <BngButton class="saveload-preview-button" :accent="ACCENTS.main" v-bng-disabled="previewControlsDisabled" @click="clearPreview">
              Clear thumbnail
            </BngButton>
          </div>
          <div class="saveload-thumbnail-status" :class="{ 'saveload-thumbnail-status--warning': isNoThumbnailWarning }">
            {{ thumbnailStatusText }}
          </div>
        </div>
      </div>
    </div>

    <div class="saveload-static saveload-section">
      <Accordion class="saveload-metadata-accordion">
        <AccordionItem
          navigable
          arrow-big
          expand-hint-inline
          :expand-on-context="false"
          :expanded="metadataExpanded"
          @expanded="metadataExpanded = $event"
          v-bng-on-ui-nav:focus_r.focusRequired="onMetadataExpandRight"
          v-bng-on-ui-nav:focus_l.focusRequired="onMetadataCollapseLeft"
        >
          <template #caption>
            <div class="saveload-metadata-caption">
              Metadata
            </div>
          </template>
          <div class="saveload-metadata-content">
            <BngInput
              v-model="metadataDescription"
              label="Description"
              :maxlength="120"
              :disabled="saveControlsDisabled"
              floating-label
            />
          </div>
          (More Metadata coming soon maybe, thats why its collapsible)
        </AccordionItem>
      </Accordion>
    </div>

    <div class="saveload-static saveload-section">
      <div class="saveload-row saveload-row--full saveload-settings">
        <BngRow class="saveload-option">
          <template #label>Include explicit license plate</template>
          <BngSwitch v-model="saveSettings.saveLicenseplate" :disabled="saveControlsDisabled" />
        </BngRow>
        <div class="saveload-setting-description">
          {{ licensePlateDescription }}
        </div>
        <BngRow class="saveload-option">
          <template #label>Save paints</template>
          <BngSwitch v-model="saveSettings.savePaints" :disabled="saveControlsDisabled" />
        </BngRow>
      </div>
      <div class="saveload-paint-validation">
        <div class="saveload-paint-validation-row">
          {{ paintSpawnBehaviorText }}
        </div>
      </div>
    </div>

    <div class="saveload-static">
      <div class="saveload-row saveload-row--full saveload-save-row">
        <BngButton class="saveload-save-button" :accent="ACCENTS.main" v-bng-disabled="saveDisabled" @click="save">
          {{ $t("ui.common.save") }}
        </BngButton>
      </div>
      <div v-if="matchingOverwriteConfigs.length" class="saveload-overwrite-list">
        <BngButton
          v-for="config in matchingOverwriteConfigs"
          :key="config.name"
          class="saveload-overwrite-button"
          :accent="ACCENTS.secondary"
          v-bng-disabled="saveDisabled"
          @click="overwriteConfig(config)"
        >
          Overwrite {{ config.fileName || `${config.name}.pc` }}
        </BngButton>
      </div>
      <div v-if="saveStatusText" class="saveload-save-status" :class="{ 'saveload-save-status--warning': saveStatusIsWarning }">
        {{ saveStatusText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from "vue"
import { BngButton, ACCENTS, BngInput, BngSwitch, BngRow } from "@/common/components/base"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { vBngBlur, vBngDisabled, vBngOnUiNav } from "@/common/directives"
import { lua } from "@/bridge"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useEvents } from "@/services/events"
import { openConfirmation } from "@/services/popup"
import { getAssetURL } from "@/utils"

const navBlocker = useUINavBlocker()
navBlocker.blockOnly(["context"])

const events = useEvents()

const emit = defineEmits(["saved"])

const props = defineProps({
  withBackground: Boolean,
  onSaveSuccess: Function,
})

const saveSettings = reactive({
  generateThumbnail: true,
  saveLicenseplate: false,
  savePaints: true,
})

const paintValidation = ref({
  paints: [],
  multiPaintSetup: { found: false },
  modelDefaultColors: [],
  modelDefaultMultiPaintSetup: { found: false },
  defaultStorageMode: "individualPaints",
})

const invalidJsonValueChars = /[\u0000-\u001F"\\]/
const saveName = ref("")
const metadataDescription = ref("")
const metadataExpanded = ref(false)
const previewInProgress = ref(false)
const previewThumbnailPath = ref("")
const previewVersion = ref(0)
const currentLicensePlate = ref("")
const saveInProgress = ref(false)
const saveCooldownActive = ref(false)
const saveCooldownTimeout = ref(null)
const lastSavedName = ref("")
const lastSavedPayload = ref(null)
const existingConfigs = ref([])
const saveAvailability = ref({ canSave: false, reason: "loading" })
const canSaveConfig = computed(() => !!saveAvailability.value?.canSave)
const saveControlsDisabled = computed(() => !canSaveConfig.value || saveInProgress.value)
const previewControlsDisabled = computed(() => saveControlsDisabled.value || previewInProgress.value)
const trimmedSaveName = computed(() => saveName.value.trim())
const saveDisabled = computed(() => {
  return saveControlsDisabled.value
    || saveCooldownActive.value
    || !trimmedSaveName.value
    || invalidJsonValueChars.test(trimmedSaveName.value)
})
const paintValidationRows = computed(() => paintValidation.value?.paints || [])
const hasPreviewThumbnail = computed(() => !!normalizePath(previewThumbnailPath.value))
const isNoThumbnailWarning = computed(() => !hasPreviewThumbnail.value && !saveSettings.generateThumbnail)
const thumbnailStatusText = computed(() => {
  if (hasPreviewThumbnail.value) {
    return "The saved config will use this preview thumbnail."
  }
  if (isNoThumbnailWarning.value) {
    return "No thumbnail will be saved with the config."
  }
  return "A thumbnail will be generated when saving."
})
const previewActionLabel = computed(() => {
  if (previewInProgress.value) {
    return hasPreviewThumbnail.value ? "Retaking thumbnail..." : "Taking thumbnail..."
  }
  return hasPreviewThumbnail.value ? "Retake thumbnail" : "Take thumbnail"
})
const previewImageUrl = computed(() => {
  const normalizedPath = normalizePath(previewThumbnailPath.value)
  if (!normalizedPath) {
    return ""
  }
  return `${normalizedPath}?v=${previewVersion.value}`
})
const previewDisplayImageUrl = computed(() => previewImageUrl.value || "/ui/images/appDefault.png")
const licensePlateDescription = computed(() => {
  if (saveSettings.saveLicenseplate) {
    const plateText = currentLicensePlate.value && currentLicensePlate.value.trim()
      ? currentLicensePlate.value.trim()
      : "Unknown"
    return `This vehicle will spawn with the license plate [${plateText}].`
  }
  return "This vehicle will spawn with the users license plate."
})
const paintSummaryText = computed(() => {
  const multiPaintSetup = paintValidation.value?.multiPaintSetup
  if (multiPaintSetup?.found && multiPaintSetup.name) {
    return multiPaintSetup.name
  }

  const labels = paintValidationRows.value.map((paint, index) => {
    if (paint?.modelPaintName) return paint.modelPaintName
    if (paint?.libraryPaintName) return paint.libraryPaintName
    if (paint?.libraryPaintId) return paint.libraryPaintId
    return "Custom Paint"
  }).filter(Boolean)

  return labels.length ? labels.join(", ") : "Custom Paint"
})
const modelDefaultPaintSummaryText = computed(() => {
  const defaultSetup = paintValidation.value?.modelDefaultMultiPaintSetup
  if (defaultSetup?.found && defaultSetup?.name) {
    return defaultSetup.name
  }

  const names = Array.isArray(paintValidation.value?.modelDefaultColors)
    ? paintValidation.value.modelDefaultColors.filter(name => typeof name === "string" && name.length)
    : []
  return names.length ? names.join(", ") : "Custom Paint"
})
const paintSpawnBehaviorText = computed(() => {
  if (!saveSettings.savePaints) {
    return `The vehicle will spawn with the models default colors: [${modelDefaultPaintSummaryText.value}]`
  }
  return `The vehicle will spawn with these colors: [${paintSummaryText.value}]`
})
const saveUnavailableText = computed(() => {
  if (canSaveConfig.value) return ""
  if (saveAvailability.value?.reason === "walking") {
    return "Saving is unavailable while walking."
  }
  if (saveAvailability.value?.reason === "loading") {
    return "Checking vehicle state..."
  }
  return "Saving is unavailable because there is no active vehicle."
})
const saveNameRequiredText = computed(() => {
  if (!canSaveConfig.value) return ""
  if (trimmedSaveName.value) return ""
  return "Please enter a config name."
})
const saveStatusText = computed(() => {
  if (saveInProgress.value) {
    return lastSavedName.value ? `Saved as "${lastSavedName.value}"!` : "Saving..."
  }
  if (saveUnavailableText.value) return saveUnavailableText.value
  if (saveNameRequiredText.value) return saveNameRequiredText.value
  return lastSavedName.value ? `Saved as "${lastSavedName.value}"!` : ""
})
const saveStatusIsWarning = computed(() => !!saveUnavailableText.value || !!saveNameRequiredText.value)
const matchingOverwriteConfigs = computed(() => {
  const targetName = trimmedSaveName.value.toLowerCase()
  if (!targetName) return []
  return existingConfigs.value
    .filter(config => !!config?.player)
    .filter(config => getConfigLabel(config).toLowerCase() === targetName)
    .sort((a, b) => String(a?.fileName || "").localeCompare(String(b?.fileName || "")))
})

function getConfigLabel(config) {
  return String(config?.displayName || config?.Configuration || config?.name || "").trim()
}

function buildSavePayload() {
  const displayName = trimmedSaveName.value
  const useThumbnailFile = hasPreviewThumbnail.value
  const shouldGenerateThumbnail = hasPreviewThumbnail.value || saveSettings.generateThumbnail
  const description = metadataDescription.value.trim()
  return {
    displayName,
    settings: {
      generateThumbnail: shouldGenerateThumbnail,
      saveLicenseplate: saveSettings.saveLicenseplate,
      savePaints: saveSettings.savePaints,
      useThumbnailFile,
      thumbnailFile: useThumbnailFile ? previewThumbnailPath.value : null,
    },
    metadata: description ? { Description: description } : {},
  }
}

function notifySaveSuccess(payload) {
  lastSavedPayload.value = payload
  emit("saved", payload)
  return props.onSaveSuccess?.(payload)
}

function getLastSavedPayload() {
  return lastSavedPayload.value
}

async function runSaveRequest(saveHandler) {
  const { displayName, settings, metadata } = buildSavePayload()
  if (saveInProgress.value
    || saveCooldownActive.value
    || !canSaveConfig.value
    || !displayName
    || invalidJsonValueChars.test(displayName)
  ) {
    return
  }
  saveInProgress.value = true
  lastSavedName.value = ""
  try {
    await refreshSaveAvailability()
    if (!canSaveConfig.value) return

    const result = await saveHandler(displayName, settings, metadata)
    if (result?.success) {
      const savedDisplayName = result.displayName || result.fileName || displayName
      lastSavedName.value = savedDisplayName
      await notifySaveSuccess({
        displayName: savedDisplayName,
        fileName: result.fileName || savedDisplayName,
      })
    }
  } finally {
    saveInProgress.value = false
    startSaveCooldown()
  }
}

async function save() {
  await runSaveRequest((displayName, settings, metadata) =>
    lua.extensions.core_vehicle_partmgmt.saveNewLocalConfig(displayName, settings, metadata)
  )
}

async function overwriteConfig(config) {
  if (!config?.name || saveDisabled.value) return
  const targetFileName = config.fileName || `${config.name}.pc`
  let confirmed = false
  try {
    confirmed = await openConfirmation(
      "Overwrite configuration",
      `Overwrite "${targetFileName}" with the current vehicle setup?`
    )
  } catch {
    return
  }
  if (!confirmed) return
  await runSaveRequest((displayName, settings, metadata) =>
    lua.extensions.core_vehicle_partmgmt.saveExistingLocalConfig(config.name, displayName, settings, metadata)
  )
}

function startSaveCooldown() {
  saveCooldownActive.value = true
  if (saveCooldownTimeout.value) {
    window.clearTimeout(saveCooldownTimeout.value)
  }
  saveCooldownTimeout.value = window.setTimeout(() => {
    saveCooldownActive.value = false
    saveCooldownTimeout.value = null
  }, 2000)
}

function normalizePath(path) {
  return typeof path === "string"
    ? path.replace(/\\/g, "/").trim()
    : ""
}

function setPreviewPath(path) {
  previewThumbnailPath.value = typeof path === "string" ? path : ""
  previewVersion.value = Date.now()
}

async function refreshPreviewThumbnail() {
  const thumbnail = await lua.extensions.core_vehicle_thumbnail.getTemporaryThumbnail()
  if (!thumbnail?.path && previewInProgress.value && hasPreviewThumbnail.value) {
    return
  }
  setPreviewPath(thumbnail?.path || "")
}

async function waitForPreviewFile(maxAttempts = 20, delayMs = 150) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const thumbnail = await lua.extensions.core_vehicle_thumbnail.getTemporaryThumbnail()
    if (thumbnail?.path) {
      setPreviewPath(thumbnail.path)
      return true
    }
    await new Promise(resolve => window.setTimeout(resolve, delayMs))
  }
  return false
}

onMounted(async () => {
  await refreshSaveAvailability()
  if (!canSaveConfig.value) return
  await takePreview(true)
  await refreshPreviewThumbnail()
})

async function takePreview(waitForFile = false) {
  if (previewControlsDisabled.value) return false
  previewInProgress.value = true
  const thumbnail = await lua.extensions.core_vehicle_thumbnail.captureTemporaryThumbnail()
  if (!thumbnail?.path) {
    previewInProgress.value = false
    return false
  }
  if (waitForFile) {
    const found = await waitForPreviewFile()
    previewInProgress.value = false
    if (!found) return false
  }
  return true
}

async function clearPreview() {
  if (previewControlsDisabled.value) return
  if (!hasPreviewThumbnail.value) return
  await lua.extensions.core_vehicle_thumbnail.clearTemporaryThumbnail()
  setPreviewPath("")
}

function onMetadataExpandRight() {
  if (!metadataExpanded.value) {
    metadataExpanded.value = true
    return false
  }
  return true
}

function onMetadataCollapseLeft() {
  if (metadataExpanded.value) {
    metadataExpanded.value = false
    return false
  }
  return true
}

function onPreviewReady(payload) {
  const thumbnailPath = payload?.thumbnailPath || payload?.path || previewThumbnailPath.value
  setPreviewPath(thumbnailPath)
  previewInProgress.value = false
}

async function refreshLicensePlate() {
  const plate = await lua.extensions.core_vehicle_partmgmt.getCurrentLicensePlate()
  currentLicensePlate.value = typeof plate === "string" ? plate : ""
}

async function refreshPaintValidation() {
  const validation = await lua.extensions.core_vehicle_partmgmt.validatePaints()
  paintValidation.value = validation && typeof validation === "object"
    ? validation
    : {
      paints: [],
      multiPaintSetup: { found: false },
      modelDefaultColors: [],
      modelDefaultMultiPaintSetup: { found: false },
      defaultStorageMode: "individualPaints",
    }
}

async function refreshExistingConfigs() {
  const configs = await lua.extensions.core_vehicle_partmgmt.getConfigList()
  existingConfigs.value = Array.isArray(configs) ? configs : []
}

async function refreshSaveScreenData() {
  await refreshSaveAvailability()
  if (!canSaveConfig.value) {
    existingConfigs.value = []
    setPreviewPath("")
    currentLicensePlate.value = ""
    paintValidation.value = {
      paints: [],
      multiPaintSetup: { found: false },
      modelDefaultColors: [],
      modelDefaultMultiPaintSetup: { found: false },
      defaultStorageMode: "individualPaints",
    }
    return
  }
  await refreshExistingConfigs()
  await refreshPaintValidation()
  await refreshPreviewThumbnail()
  await refreshLicensePlate()
}

async function refreshSaveAvailability() {
  const availability = await lua.extensions.core_vehicle_partmgmt.getSaveAvailability()
  saveAvailability.value = availability && typeof availability === "object"
    ? availability
    : { canSave: false, reason: "noVehicle" }
}

watch(saveName, () => {
  lastSavedName.value = ""
  lastSavedPayload.value = null
})

watch(saveInProgress, inProgress => {
  if (inProgress) {
    navBlocker.allowOnly([])
    return
  }
  navBlocker.blockOnly(["context"])
})

defineExpose({
  getLastSavedPayload,
})

onUnmounted(() => {
  if (saveCooldownTimeout.value) {
    window.clearTimeout(saveCooldownTimeout.value)
  }
})

events.on("VehicleChange", refreshSaveScreenData)
events.on("VehicleFocusChanged", refreshSaveScreenData)
events.on("VehicleconfigSaved", refreshSaveScreenData)
events.on("VehicleconfigRemoved", refreshSaveScreenData)
events.on("VehicleConfigThumbnailPreviewReady", onPreviewReady)

refreshSaveScreenData()
</script>

<style lang="scss" scoped>
.saveload {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;

  &.saveload--busy {
    pointer-events: none;
  }

  > * {
    flex: 1 1 auto;
    width: 100%;
    padding: 0.5rem;
  }
  > .saveload-static {
    flex: 0 0 auto;
  }

  &.with-background {
    background-color: rgba(0, 0, 0, 0.6);
  }
}

.saveload-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
}

.saveload-row--full {
  width: 100%;
  > * {
    flex: 1 1 auto;
  }
}

.saveload-settings {
  flex-direction: column;
  align-items: stretch;
}

.saveload-section {
  border-bottom: 1px solid var(--bng-orange);
  padding-bottom: 0.5rem;
}

.saveload-setting-description {
  font-size: 0.82rem;
  line-height: 1.2;
  color: rgba(var(--bng-off-white-rgb), 0.8);
  padding-left: 0.5rem;
}

.saveload-paint-validation {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.85rem;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  padding: 0.35rem 0 0.5rem;
  padding-left: 0.5rem;
}

.saveload-paint-validation-row {
  line-height: 1.2;
}

.saveload-filename {
  padding-bottom: 0;
}

.saveload-save-row {
  padding-top: 0.5rem;
}

.saveload-save-status {
  font-size: 0.85rem;
  line-height: 1.2;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  padding-top: 0.25rem;
  padding-left: 0.5rem;
}

.saveload-save-status--warning {
  color: rgba(var(--bng-add-red-400-rgb), 0.95);
  font-weight: 600;
}

.saveload-preview-row {
  padding-top: 0.5rem;
}

.saveload-thumbnail-controls {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.saveload-preview-actions {
  align-items: stretch;
}

.saveload-preview-button {
  width: 100%;
  --bng-button-max-width: 100%;
}

.saveload-thumbnail-status {
  font-size: 0.82rem;
  line-height: 1.2;
  color: rgba(var(--bng-off-white-rgb), 0.8);
  padding-left: 0.5rem;
}

.saveload-thumbnail-status--warning {
  color: rgba(var(--bng-add-red-400-rgb), 0.95);
  font-weight: 600;
}

.saveload-preview-image-wrap {
  padding-top: 0.5rem;
}

.saveload-preview-image {
  width: 100%;
  max-height: 12rem;
  border-radius: var(--bng-corners-1);
  object-fit: contain;
  background: rgba(var(--bng-cool-gray-700-rgb), 0.25);
}

.saveload-metadata-accordion {
  width: 100%;

  :deep(.bng-accitem-content) {
    padding: 0.5rem;
  }
}

.saveload-metadata-caption {
  width: 100%;
  font-weight: 600;
}

.saveload-metadata-content {
  width: 100%;
}

.saveload-save-button {
  width: 100%;
  --bng-button-max-width: 100%;
}

.saveload-overwrite-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.35rem;
}

.saveload-overwrite-button {
  width: 100%;
  --bng-button-max-width: 100%;
}
</style>
