<template>
  <BngGroupPanel
    class="photomode-preset-browser"
    :title-id="titleId"
  >
    <template #header>
      <div class="photomode-preset-browser__copy">
        <BngCardHeading
          type="ribbon"
          outline
         :id="titleId" class="photomode-preset-browser__title">
          <BngIcon
            :type="icons.folder"
            class="photomode-preset-browser__title-icon"
          />
          {{ title }}
        </BngCardHeading>
        <p v-if="statusText" class="photomode-preset-browser__status">{{ statusText }}</p>
      </div>
    </template>

    <template #actions>
      <div
        class="photomode-preset-browser__create-actions"
        v-bng-scoped-nav="{ type: 'container', preventNavigationEscape: ['left', 'right'] }"
        bng-nav-priority-container
      >
        <BngButton
          v-for="action in createActions"
          :key="action.key"
          :accent="action.accent"
          :aria-label="action.label"
          :disabled="disabled || loading"
          v-bng-tooltip:top="action.tooltip"
          @click="onCreatePreset(action.key)"
        >
          <template v-if="action.icons">
            <BngIcon
              v-for="icon in action.icons"
              :key="icon"
              :type="icon"
            />
            <span v-if="action.text" class="photomode-preset-browser__action-text">{{ action.text }}</span>
          </template>
          <template v-else>{{ action.label }}</template>
        </BngButton>
        <BngButton
          v-if="canDiscoverCameraBookmarks"
          :accent="ACCENTS.outlined"
          :aria-label="$t('ui.photomode.presets.discoverCameraBookmarks')"
          :disabled="disabled || loading"
          v-bng-tooltip:top="$t('ui.photomode.presets.discoverCameraBookmarks')"
          @click="onDiscoverCameraBookmarks"
        >
          <BngIcon :type="icons.bookmark" />
        </BngButton>
      </div>
    </template>

    <FlatFileBrowser
      ref="browserRef"
      class="photomode-preset-browser__list"
      :items="items"
      :loading="loading"
      :empty-label="$t('ui.photomode.presets.empty')"
      :empty-message="$t('ui.photomode.presets.emptyHint')"
      :autofocus-first-item="false"
      :active-key="selectedPresetId"
      @focus-item="onSelectPreset"
      @hover-item="onSelectPreset"
      @default-action="onOpenAction"
      @action="onPresetAction"
    />
    <BngPopoverContent
      ref="openActionPopoverRef"
      :name="openActionPopoverName"
      placement="right-start"
      @hide="onOpenActionPopoverHide"
    >
      <template #default="{ hide }">
        <div class="photomode-preset-browser__open-menu">
          <BngButton
            :accent="ACCENTS.menu"
            v-bng-on-ui-nav:ok.focusRequired.asMouse
            @click="onOpenPopoverApplyAll(hide)"
          >
            {{ $t("ui.photomode.presets.applyAll") }}
          </BngButton>
          <BngButton
            v-for="part in partialApplyParts"
            :key="part.key"
            :accent="ACCENTS.menu"
            v-bng-on-ui-nav:ok.focusRequired.asMouse
            @click="onOpenPopoverApplyPart(part.key, hide)"
          >
            {{ part.label }}
          </BngButton>
        </div>
      </template>
    </BngPopoverContent>
  </BngGroupPanel>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { $translate } from "@/services/translation"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { openPrompt } from "@/services/popup"
import { vBngOnUiNav, vBngScopedNav, vBngTooltip } from "@/common/directives"
import { ACCENTS, BngButton, BngGroupPanel, BngIcon, BngPopoverContent, BngCardHeading, icons } from "@/common/components/base"

import FlatFileBrowser from "@/common/modules/fileBrowser/FlatFileBrowser.vue"
import { uniqueId } from "@/services/uniqueId"

defineOptions({ name: "PhotomodePresetBrowser" })

const props = defineProps({
  presetType: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["applied", "changed"])
const events = useEvents()

const presets = ref([])
const selectedPresetId = ref("")
const loading = ref(false)
const statusText = ref("")
const browserRef = ref(null)
const openActionPopoverRef = ref(null)
const titleId = uniqueId("photomode-preset-browser-title")
const openActionPopoverName = uniqueId("photomode-preset-open-action")
const openActionEvent = ref(null)
const openActionPreset = ref(null)

const items = computed(() => presets.value.map(preset => ({
  key: preset.id,
  label: preset.name || preset.id,
  subtitle: formatPresetSubtitle(preset),
  icon: getPresetIcon(preset),
  preset,
  defaultAction: { label: $translate.instant("ui.common.apply") },
  actions: [
    {
      key: "apply",
      label: "ui.common.apply",
      uiEvent: "ok",
    },
    {
      key: "delete",
      label: "ui.common.delete",
      uiEvent: "context",
      icon: "trashBin2",
      showLabel: false,
      danger: true,
    },
    {
      key: "rename",
      label: "ui.photomode.presets.rename",
      uiEvent: "action_2",
      icon: "edit",
      showLabel: false,
      disabled: preset.temporary === true,
    },
  ],
})))
const createActions = computed(() => getCreateActions(props.presetType))
const canDiscoverCameraBookmarks = computed(() => props.presetType === "camera")
const partialApplyParts = computed(() => getPartialApplyParts(props.presetType))
const hasPartialApplyParts = computed(() => partialApplyParts.value.length > 0)

onMounted(refreshPresets)
events.on("PhotomodePresetsChanged", refreshPresets)

watch(
  () => props.presetType,
  () => {
    selectedPresetId.value = ""
    void refreshPresets()
  }
)

async function refreshPresets() {
  loading.value = true
  try {
    const result = await lua.extensions.ui_pause_photomode.listPresets(props.presetType)
    presets.value = Array.isArray(result?.presets) ? result.presets : []
    syncSelectedPreset()
    statusText.value = ""
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.loadFailed")
  } finally {
    loading.value = false
  }
}

async function onCreatePreset(cameraPresetType = "") {
  if (props.disabled || loading.value) return
  loading.value = true
  try {
    const options = props.presetType === "camera" ? { cameraPresetType } : {}
    const result = await lua.extensions.ui_pause_photomode.saveCurrentPreset(props.presetType, buildGeneratedPresetName(cameraPresetType), options)
    if (result?.ok === false) {
      statusText.value = result.reason || $translate.instant("ui.photomode.presets.saveFailed")
      return
    }

    presets.value = Array.isArray(result?.presets) ? result.presets : presets.value
    selectedPresetId.value = result?.preset?.id || selectedPresetId.value
    statusText.value = result?.preset?.name
      ? $translate.instant("ui.photomode.presets.created", { name: result.preset.name })
      : ""
    emit("changed", result)
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.saveFailed")
  } finally {
    loading.value = false
  }
}

async function onDiscoverCameraBookmarks() {
  if (!canDiscoverCameraBookmarks.value || props.disabled || loading.value) return

  loading.value = true
  try {
    const result = await lua.extensions.ui_pause_photomode.discoverTemporaryPresets(props.presetType)
    if (result?.ok === false) {
      statusText.value = result.reason || $translate.instant("ui.photomode.presets.discoverFailed")
      return
    }

    presets.value = Array.isArray(result?.presets) ? result.presets : presets.value
    syncSelectedPreset()
    statusText.value = $translate.instant("ui.photomode.presets.discoveredCameraBookmarks")
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.discoverFailed")
  } finally {
    loading.value = false
  }
}

async function onApplyPreset(event, partKey = "") {
  onSelectPreset(event?.item)
  const presetId = event?.item?.key || selectedPresetId.value
  if (!presetId || props.disabled || loading.value) return
  loading.value = true
  try {
    const result = partKey
      ? await lua.extensions.ui_pause_photomode.applyPreset(props.presetType, presetId, { part: partKey })
      : await lua.extensions.ui_pause_photomode.applyPreset(props.presetType, presetId)
    if (result?.ok === false) {
      statusText.value = result.reason || $translate.instant("ui.photomode.presets.applyFailed")
      return
    }

    statusText.value = result?.preset?.name
      ? $translate.instant("ui.photomode.presets.applied", { name: result.preset.name })
      : ""
    emit("applied", result)
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.applyFailed")
  } finally {
    loading.value = false
  }
}

function onSelectPreset(item) {
  if (item?.key) {
    selectedPresetId.value = item.key
  }
}

function onPresetAction(event) {
  onSelectPreset(event?.item)
  if (event?.action?.key === "apply") {
    void onOpenAction(event)
    return
  }
  if (event?.action?.key === "delete") {
    void onDeletePreset(event?.item)
    return
  }
  if (event?.action?.key === "rename") {
    void onRenamePreset(event?.item)
  }
}

async function onOpenAction(event) {
  if (!hasPartialApplyParts.value) {
    await onApplyPreset(event)
    return
  }

  openActionEvent.value = event
  openActionPreset.value = event?.item?.preset || presets.value.find(candidate => candidate.id === event?.item?.key) || null
  await nextTick()
  openActionPopoverRef.value?.show?.(getOpenActionPopoverTarget())
}

function onOpenPopoverApplyAll(hide) {
  const event = openActionEvent.value
  closeOpenActionPopover(hide)
  void onApplyPreset(event)
}

function onOpenPopoverApplyPart(partKey, hide) {
  const event = openActionEvent.value
  closeOpenActionPopover(hide)
  void onApplyPreset(event, partKey)
}

function closeOpenActionPopover(hide) {
  if (typeof hide === "function") {
    hide()
    return
  }

  openActionPopoverRef.value?.hide?.()
}

function onOpenActionPopoverHide() {
  openActionEvent.value = null
  openActionPreset.value = null
}

function getOpenActionPopoverTarget() {
  const root = browserRef.value?.$el
  const activeElement = document.activeElement
  if (root && activeElement instanceof HTMLElement && root.contains(activeElement)) {
    return activeElement.closest(".flat-file-browser-row") || activeElement
  }

  return root?.querySelector(".flat-file-browser-row.is-focused")
    || root?.querySelector(".flat-file-browser-row.is-selected")
    || root
}

async function onDeletePreset(item) {
  const preset = item?.preset || presets.value.find(candidate => candidate.id === item?.key)
  const presetId = preset?.id
  if (!presetId || props.disabled || loading.value) return

  loading.value = true
  try {
    const result = await lua.extensions.ui_pause_photomode.deletePreset(props.presetType, presetId)
    if (result?.ok === false) {
      statusText.value = result.reason || $translate.instant("ui.photomode.presets.deleteFailed")
      return
    }

    presets.value = Array.isArray(result?.presets) ? result.presets : presets.value.filter(preset => preset.id !== presetId)
    syncSelectedPreset()
    statusText.value = $translate.instant("ui.photomode.presets.deleted")
    emit("changed", result)
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.deleteFailed")
  } finally {
    loading.value = false
  }
}

async function onRenamePreset(item) {
  const preset = item?.preset || presets.value.find(candidate => candidate.id === item?.key)
  const presetId = preset?.id
  if (!presetId || props.disabled || loading.value || preset?.temporary === true) return

  const nextName = await openPrompt(
    $translate.instant("ui.photomode.presets.renameHint"),
    $translate.instant("ui.photomode.presets.renameTitle"),
    {
      defaultValue: preset.name || "",
      validate: value => String(value || "").trim().length > 0,
      errorMessage: $translate.instant("ui.photomode.presets.renameError"),
      disableWhenInvalid: true,
      unordered: false,
      buttons: [
        { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true, accent: ACCENTS.text } },
        { label: $translate.instant("ui.photomode.presets.rename"), value: text => text, extras: { confirm: true } },
      ],
    }
  ).catch(() => null)

  if (typeof nextName !== "string" || nextName.trim() === "") return

  loading.value = true
  try {
    const result = await lua.extensions.ui_pause_photomode.renamePreset(props.presetType, presetId, nextName.trim())
    if (result?.ok === false) {
      statusText.value = result.reason || $translate.instant("ui.photomode.presets.renameFailed")
      return
    }

    presets.value = Array.isArray(result?.presets) ? result.presets : presets.value
    selectedPresetId.value = result?.preset?.id || selectedPresetId.value
    statusText.value = result?.preset?.name
      ? $translate.instant("ui.photomode.presets.renamed", { name: result.preset.name })
      : ""
    emit("changed", result)
  } catch (error) {
    statusText.value = error?.message || $translate.instant("ui.photomode.presets.renameFailed")
  } finally {
    loading.value = false
  }
}

function syncSelectedPreset() {
  if (presets.value.some(preset => preset.id === selectedPresetId.value)) return
  selectedPresetId.value = presets.value[0]?.id || ""
}

function getCreateActions(presetType) {
  const createLabel = $translate.instant("ui.photomode.presets.create")
  if (presetType === "camera") {
    return [
      {
        key: "scene",
        label: $translate.instant("ui.photomode.presets.createSceneCamera"),
        tooltip: $translate.instant("ui.photomode.presets.createSceneCamera"),
        icons: [icons.mathPlus, icons.cameraFocusOnPath],
        accent: ACCENTS.outlined,
      },
      {
        key: "vehicle",
        label: $translate.instant("ui.photomode.presets.createVehicleCamera"),
        tooltip: $translate.instant("ui.photomode.presets.createVehicleCamera"),
        icons: [icons.mathPlus, icons.cameraFocusOnVehicle1],
        accent: ACCENTS.outlined,
      },
    ]
  }

  if (presetType === "scene") {
    return [
      {
        key: "",
        label: createLabel,
        tooltip: createLabel,
        icons: [icons.mathPlus, icons.terrain],
        accent: ACCENTS.outlined,
      },
    ]
  }

  if (presetType === "effects") {
    return [
      {
        key: "",
        label: createLabel,
        tooltip: createLabel,
        icons: [icons.mathPlus],
        text: "FX",
        accent: ACCENTS.outlined,
      },
    ]
  }

  return [
    {
      key: "",
      label: createLabel,
      accent: ACCENTS.main,
    },
  ]
}

function getPartialApplyParts(presetType) {
  if (presetType === "scene") {
    return [
      { key: "environment", label: $translate.instant("ui.environment.timeOfDay") },
      { key: "shadows", label: $translate.instant("ui.options.graphics.shadowsHeading") },
      { key: "detailTerrain", label: $translate.instant("ui.photomode.advancedRender.detailTerrain") },
      { key: "weather", label: $translate.instant("ui.environment.weather") },
      { key: "celestial", label: $translate.instant("ui.environment.celestialSettings") },
    ]
  }

  if (presetType === "effects") {
    return [
      { key: "dof", label: $translate.instant("ui.photomode.dofShort") },
      { key: "ssao", label: $translate.instant("ui.photomode.effects.ssao") },
      { key: "screenSpaceShadows", label: $translate.instant("ui.photomode.screenSpaceShadows") },
      { key: "motionBlur", label: $translate.instant("ui.photomode.motionBlur") },
      { key: "reflections", label: $translate.instant("ui.photomode.reflections") },
      { key: "flash", label: $translate.instant("ui.photomode.flash.title") },
    ]
  }

  return []
}

function buildGeneratedPresetName(cameraPresetType = "") {
  const now = new Date()
  const label = props.presetType === "camera" && cameraPresetType
    ? $translate.instant(cameraPresetType === "vehicle" ? "ui.photomode.presets.vehicleCamera" : "ui.photomode.presets.sceneCamera")
    : props.title
  return `${label} ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function getPresetIcon(preset) {
  if (props.presetType !== "camera") return null
  return preset?.data?.cameraPresetType === "vehicle"
    ? "cameraFocusOnVehicle1"
    : "terrain"
}

function formatPresetSubtitle(preset) {
  const timestamp = Number(preset.updatedAt || preset.createdAt)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ""
  return new Date(timestamp * 1000).toLocaleString()
}
</script>

<style lang="scss" scoped>
.photomode-preset-browser {
  min-height: 4rem;
}

.photomode-preset-browser__create-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.photomode-preset-browser__action-text {
  font-weight: 700;
}

.photomode-preset-browser__copy {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.photomode-preset-browser__title,
.photomode-preset-browser__status {
  margin: 0;
  margin-left: -0.15rem;
  --bng-card-heading-ribbon-color: var(--bng-cool-gray-700);
  font-size: var(--bng-group-panel-title-font-size, 1.25em);
  font-weight: 600;
  line-height: 1.625em;
}

.photomode-preset-browser__title {
  color: var(--bng-off-white);
  font-weight: 700;
}

.photomode-preset-browser__title-icon {
  --bng-icon-size: 1.25em;
}

.photomode-preset-browser__status {
  color: var(--bng-cool-gray-200);
  font-size: 0.85rem;
}

.photomode-preset-browser__open-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  width: max-content;
}
</style>
