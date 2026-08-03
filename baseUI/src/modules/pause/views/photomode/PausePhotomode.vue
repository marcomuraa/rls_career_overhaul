<template>
  <div
    class="pause-photomode-main"
    tabindex="-1"
  >
    <p v-if="panelHintText" class="pause-photomode-main__hint">
      {{ panelHintText }}
    </p>
    <div class="pause-photomode-main__content">
      <div class="pause-photomode-main__content-tabs">
        <Background class="pause-photomode-background" />
        <BngTabs
          v-if="availableTabKeys.length > 0"
          class="bng-tabs pause-photomode-main__tabs"
          v-model="activeTabIndex"
          use-bindings
          icon-only
          tabindex="-1"
          @change="onTabChange"
        >
          <div
            v-if="cameraAvailable"
            ref="cameraTabRef"
            class="pause-photomode-main__tab-panel"
            :tab-heading="LEGACY_TAB_META.camera.heading"
            :tab-icon="LEGACY_TAB_META.camera.icon"
            :tab-tooltip="LEGACY_TAB_META.camera.tooltip"
            v-bng-ui-nav-scroll
          >
            <PhotomodeCameraSection
              :session-active="sessionActive"
              :panel-active="panelActive"
              :camera-enabled="cameraAvailable"
              :grid-mode="gridMode"
              @grid-mode-change="emit('grid-mode-change', $event)"
            />
          </div>

          <div
            v-if="sceneTabAvailable"
            ref="sceneTabRef"
            class="pause-photomode-main__tab-panel"
            :tab-heading="LEGACY_TAB_META.scene.heading"
            :tab-icon="LEGACY_TAB_META.scene.icon"
            :tab-tooltip="LEGACY_TAB_META.scene.tooltip"
            v-bng-ui-nav-scroll
          >
            <PhotomodeSceneSection
              v-if="sceneAvailable || advancedRenderAvailable || advancedRenderUnlockVisible"
              :session-active="sessionActive"
              :panel-active="panelActive"
              :scene-enabled="sceneAvailable"
              :developer-enabled="advancedRenderEnabled"
              :advanced-unlock-visible="advancedRenderUnlockVisible"
              :advanced-render-enabled="advancedRenderAvailable"
              :hidden-controls="sceneHiddenControls"
              :advanced-render-hidden-controls="advancedRenderHiddenControls"
              @advanced-enabled="onAdvancedRenderEnabled"
            />
          </div>

          <div
            v-if="effectsAvailable"
            ref="effectsTabRef"
            class="pause-photomode-main__tab-panel"
            :tab-heading="LEGACY_TAB_META.effects.heading"
            :tab-icon="LEGACY_TAB_META.effects.icon"
            :tab-tooltip="LEGACY_TAB_META.effects.tooltip"
            v-bng-ui-nav-scroll
          >
            <PhotomodeEffectsBasicSection
              :payload="payload"
              :session-active="sessionActive"
              :panel-active="panelActive"
              :effects-enabled="effectsAvailable"
              :hidden-controls="effectsHiddenControls"
            />
          </div>

          <div
            v-if="overlaysAvailable"
            ref="overlaysTabRef"
            class="pause-photomode-main__tab-panel"
            :tab-heading="LEGACY_TAB_META.overlays.heading"
            :tab-icon="LEGACY_TAB_META.overlays.icon"
            :tab-tooltip="LEGACY_TAB_META.overlays.tooltip"
            v-bng-ui-nav-scroll
          >
            <PhotomodeOverlaysSection
              :panel-active="panelActive"
              hide-buttons
            />
          </div>

          <div
            v-if="captureSectionAvailable"
            ref="captureTabRef"
            class="pause-photomode-main__tab-panel"
            :tab-heading="LEGACY_TAB_META.capture.heading"
            :tab-icon="LEGACY_TAB_META.capture.icon"
            :tab-tooltip="LEGACY_TAB_META.capture.tooltip"
            v-bng-ui-nav-scroll
          >
            <PhotomodeCaptureSection
              :payload="payload"
              :session-active="sessionActive"
              :panel-active="panelActive"
              :capture-enabled="captureEnabled"
              :capture-state="captureState"
              @select-resolution-preset="emit('select-resolution-preset', $event)"
              @capture-options-change="onCaptureOptionsChange"
              @open-preview="emit('open-preview', $event)"
              @open-gallery="emit('open-gallery')"
            />
          </div>
        </BngTabs>
        <div class="pause-photomode-main__capture-actions">
          <BngButton
            class="pause-photomode-main__capture-button"
            bng-no-nav="true"
            tabindex="-1"
            :disabled="captureActionDisabled"
            :aria-label="takePhotoLabel"
            @click="onTakePhoto"
          >
            <BngIcon v-if="!showControllerBinding" :type="icons.photo" />
            <BngBinding
              class="pause-photomode-main__capture-binding"
              ui-event="action_2"
              controller
              track-ignore
            />
            {{ takePhotoLabel }}
          </BngButton>
        </div>
      </div>

      <div
        v-if="availableTabKeys.length === 0"
        class="pause-photomode-main__empty-section"
      >
        <p class="pause-photomode-main__empty-title">{{ $t("ui.photomode.publicBaselineUnavailable") }}</p>
        <p class="pause-photomode-main__empty-hint">
          {{ $t("ui.photomode.publicBaselineUnavailableHint") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, ref, unref, watch } from "vue"
import { storeToRefs } from "pinia"
import { $translate } from "@/services/translation"
import { BngBinding, BngButton, BngIcon, BngTabs, icons } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { vBngUiNavScroll } from "@/common/directives"
import useControls from "@/services/controls"
import PhotomodeCameraSection from "./components/PhotomodeCameraSection.vue"
import PhotomodeCaptureSection from "./components/PhotomodeCaptureSection.vue"
import PhotomodeEffectsBasicSection from "./components/PhotomodeEffectsBasicSection.vue"
import PhotomodeSceneSection from "./components/PhotomodeSceneSection.vue"
import PhotomodeOverlaysSection from "./components/PhotomodeOverlaysSection.vue"

defineOptions({ name: "PausePhotomode" })

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))
const { showIfController: showControllerBinding } = storeToRefs(useControls())

const props = defineProps({
  payload: {
    type: Object,
    default: () => ({}),
  },
  panelActive: {
    type: Boolean,
    default: false,
  },
  captureState: {
    type: String,
    default: "idle",
  },
  captureEnabled: {
    type: Boolean,
    default: false,
  },
  gridMode: {
    type: String,
    default: "off",
  },
})

const emit = defineEmits([
  "select-resolution-preset",
  "advanced-enabled",
  "request-capture",
  "request-motion-capture",
  "request-upload-capture",
  "request-steam-capture",
  "grid-mode-change",
  "open-preview",
  "open-gallery",
])

const TAB_KEYS = Object.freeze({
  camera: "camera",
  scene: "scene",
  effects: "effects",
  overlays: "overlays",
  capture: "capture",
})
const LEGACY_TAB_HEADING_KEYS = Object.freeze({
  [TAB_KEYS.camera]: "ui.photomode.tabCamera",
  [TAB_KEYS.scene]: "ui.photomode.tabScene",
  [TAB_KEYS.effects]: "ui.photomode.tabEffects",
  [TAB_KEYS.overlays]: "ui.photomode.tabOverlays",
  [TAB_KEYS.capture]: "ui.photomode.tabCapture",
})
const TAB_SUMMARY_LABEL_KEYS = Object.freeze({
  [TAB_KEYS.camera]: "ui.photomode.tabSummary.camera",
  [TAB_KEYS.effects]: "ui.photomode.tabSummary.effects",
  [TAB_KEYS.overlays]: "ui.photomode.tabSummary.overlays",
  [TAB_KEYS.capture]: "ui.photomode.tabSummary.capture",
})
const LEGACY_TAB_META = computed(() => {
  const buildTabMeta = (tabKey, icon) => {
    const heading = $translate.instant(LEGACY_TAB_HEADING_KEYS[tabKey])
    return { heading, icon, tooltip: heading }
  }
  return {
    [TAB_KEYS.camera]: buildTabMeta(TAB_KEYS.camera, icons.camera3Fourth1),
    [TAB_KEYS.scene]: buildTabMeta(TAB_KEYS.scene, icons.weather),
    [TAB_KEYS.effects]: buildTabMeta(TAB_KEYS.effects, icons.adjust),
    [TAB_KEYS.overlays]: buildTabMeta(TAB_KEYS.overlays, icons.picture),
    [TAB_KEYS.capture]: buildTabMeta(TAB_KEYS.capture, icons.photo),
  }
})
const advancedRenderEnabled = computed(() =>
  !isSimpleMenu.value
  && props.payload?.capabilities?.features?.advancedRenderTuning === true
)

const advancedRenderUnlockVisible = computed(() =>
  !isSimpleMenu.value
  && advancedRenderEnabled.value !== true
  && props.payload?.capabilities?.features?.advancedRenderTuningUnlock === true
)

const sessionActive = computed(() => props.payload?.sessionActive === true)
const sectionCapabilities = computed(() => props.payload?.capabilities?.sections || {})
const hiddenControls = computed(() => props.payload?.capabilities?.hiddenControls || {})
const sceneHiddenControls = computed(() => hiddenControls.value.scene || {})
const effectsHiddenControls = computed(() => hiddenControls.value.effects || {})
const advancedRenderHiddenControls = computed(() => hiddenControls.value.advancedRender || {})
const cameraAvailable = computed(() => sectionCapabilities.value?.camera === true)
const sceneAvailable = computed(() => sectionCapabilities.value?.scene === true)
const effectsAvailable = computed(() => sectionCapabilities.value?.effects === true)
const captureSectionAvailable = computed(() => sectionCapabilities.value?.capture === true)
const overlaysAvailable = computed(() => props.payload?.capabilities?.features?.overlays === true)
const advancedRenderAvailable = computed(() => advancedRenderEnabled.value)
const sceneTabAvailable = computed(() =>
  sceneAvailable.value || advancedRenderAvailable.value || advancedRenderUnlockVisible.value
)
const availableTabKeys = computed(() => {
  const orderedKeys = []
  if (cameraAvailable.value) orderedKeys.push(TAB_KEYS.camera)
  if (sceneTabAvailable.value) orderedKeys.push(TAB_KEYS.scene)
  if (effectsAvailable.value) orderedKeys.push(TAB_KEYS.effects)
  if (overlaysAvailable.value) orderedKeys.push(TAB_KEYS.overlays)
  if (captureSectionAvailable.value) orderedKeys.push(TAB_KEYS.capture)
  return orderedKeys
})

const activeTabIndex = ref(0)
const cameraTabRef = ref(null)
const sceneTabRef = ref(null)
const effectsTabRef = ref(null)
const overlaysTabRef = ref(null)
const captureTabRef = ref(null)
const captureOptions = ref({
  motion: false,
  upload: false,
  steam: false,
  motionDisabled: true,
  uploadDisabled: true,
  steamDisabled: true,
})
const captureActionDisabled = computed(() =>
  !captureSectionAvailable.value || !props.captureEnabled || props.captureState === "preparing"
)
const takePhotoLabel = computed(() =>
  props.captureState === "preparing" ? $translate.instant("ui.photomode.preparing") : $translate.instant("ui.photomode.takePhoto")
)
const activeTabHeading = computed(() => {
  const tabKey = availableTabKeys.value[activeTabIndex.value]
  return tabKey ? LEGACY_TAB_META.value[tabKey]?.heading || "" : ""
})
const tabIndexByKey = computed(() => {
  const indexByKey = {}
  availableTabKeys.value.forEach((key, index) => {
    indexByKey[key] = index
  })
  return indexByKey
})
watch(
  availableTabKeys,
  keys => {
    const n = keys.length
    if (n === 0) {
      activeTabIndex.value = 0
      return
    }
    if (activeTabIndex.value > n - 1) {
      activeTabIndex.value = n - 1
    }
  },
  { deep: true }
)
watch(
  activeTabIndex,
  () => {
    if (props.panelActive) void focusCurrentTabEntrySoon()
  },
  { immediate: true }
)

watch(
  () => props.panelActive,
  panelActive => {
    if (panelActive) void focusCurrentTabEntrySoon()
  }
)

const sectionLabels = computed(() =>
  availableTabKeys.value
    .map(tabKey => getTabSummaryLabel(tabKey))
    .filter(Boolean)
)
const panelHintText = computed(() => {
  if (sectionLabels.value.length === 0) {
    return $translate.instant("ui.photomode.noPublicBlocks")
  }

  const sectionSummary = formatList(sectionLabels.value)
  if (!props.panelActive) {
    return $translate.instant("ui.photomode.openPanelToAdjust", { section: sectionSummary })
  }
  return ""
})

function getTabSummaryLabel(tabKey) {
  if (tabKey !== TAB_KEYS.scene) {
    const key = TAB_SUMMARY_LABEL_KEYS[tabKey]
    return key ? $translate.instant(key) : ""
  }
  if (sceneAvailable.value && advancedRenderAvailable.value) {
    return $translate.instant("ui.photomode.tabSummary.sceneAndRender")
  }
  if (advancedRenderAvailable.value) return $translate.instant("ui.photomode.tabSummary.renderTuning")
  return $translate.instant("ui.photomode.tabSummary.scene")
}

function onTabChange(tab) {
  if (typeof tab?.index === "number") {
    activeTabIndex.value = tab.index
  }
  if (props.panelActive) void focusCurrentTabEntrySoon()
}

function onAdvancedRenderEnabled(result) {
  emit("advanced-enabled", result)
}

function onCaptureOptionsChange(options) {
  captureOptions.value = {
    ...captureOptions.value,
    ...(options || {}),
  }
}

function onTakePhoto() {
  if (captureActionDisabled.value) return

  const options = captureOptions.value
  if (options.motion && !options.motionDisabled) {
    const outputMode = options.steam && !options.steamDisabled
      ? "steam"
      : options.upload && !options.uploadDisabled
        ? "upload"
        : "basic"
    emit("request-motion-capture", outputMode)
    return
  }
  if (options.upload && !options.uploadDisabled) {
    emit("request-upload-capture")
    return
  }
  if (options.steam && !options.steamDisabled) {
    emit("request-steam-capture")
    return
  }
  emit("request-capture")
}

function getCurrentTabRef() {
  const tabKey = getCurrentTabKey()
  if (tabKey === TAB_KEYS.camera) return cameraTabRef.value
  if (tabKey === TAB_KEYS.scene) return sceneTabRef.value
  if (tabKey === TAB_KEYS.effects) return effectsTabRef.value
  if (tabKey === TAB_KEYS.overlays) return overlaysTabRef.value
  if (tabKey === TAB_KEYS.capture) return captureTabRef.value
  return null
}

function getCurrentTabKey() {
  return availableTabKeys.value[activeTabIndex.value]
}

function getPreferredTabFocusTarget(tabRoot) {
  if (getCurrentTabKey() === TAB_KEYS.scene) {
    const timeOfDayTarget = tabRoot.querySelector(".environment-weather-section__tod [bng-scoped-nav-autofocus]:not([disabled])")
      || tabRoot.querySelector(".environment-weather-section__tod [bng-nav-item]:not([disabled])")
      || tabRoot.querySelector(".environment-weather-section__tod input:not([disabled])")
    if (timeOfDayTarget) return timeOfDayTarget
  }

  return null
}

function focusCurrentTabEntry() {
  if (!props.panelActive) return false
  const tabRoot = getCurrentTabRef()
  if (!tabRoot) return false
  const target = getPreferredTabFocusTarget(tabRoot)
    || tabRoot.querySelector("[bng-nav-item]:not([disabled])")
    || tabRoot.querySelector("button:not([disabled])")
    || tabRoot.querySelector("input:not([disabled])")
    || tabRoot.querySelector("[tabindex]:not([tabindex='-1'])")
  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function focusCurrentTabEntrySoon() {
  await nextTick()
  focusCurrentTabEntry()
}

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) {
    return $translate.instant("ui.photomode.listTwoItems", {
      first: items[0],
      second: items[1],
    })
  }
  return $translate.instant("ui.photomode.listManyItems", {
    items: items.slice(0, -1).join(", "),
    last: items[items.length - 1],
  })
}

defineExpose({
  activeTabHeading,
  takePhoto: onTakePhoto,
})
</script>

<style lang="scss" scoped>
.pause-photomode-main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  min-height: 0;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: rgba(var(--bng-off-white-rgb), 0.9);
}

.pause-photomode-background {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);
}

.pause-photomode-main__hint {
  margin: 0;
  opacity: 0.65;
}

.pause-photomode-main__content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.75em;
  min-height: 0;
  overflow: hidden;
  padding-right: 0.25em;
}

.pause-photomode-main__capture-actions {
  display: flex;
  flex: 0 0 auto;
  padding: 0.25em;
}

.pause-photomode-main__capture-button {
  --bng-button-margin: 0.25em;
  --bng-button-max-width: none;
  gap: 0.5em;
  flex: 1 1 auto;
  justify-content: center;
}

.pause-photomode-main__capture-binding {
  flex: 0 0 auto;
}

.pause-photomode-main__content-tabs,
.pause-photomode-main__tabs {
  flex: 1 1 auto;
  position: relative;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.pause-photomode-main__content-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.pause-photomode-main__tabs {
  --tab-content-overflow: auto;
  --tab-list-padding: 0.2em 0.35em 0;
  --tab-list-margin: 0;
  --tab-list-justify: flex-start;
  height: auto;
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;
}

.pause-photomode-main__tab-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  box-sizing: border-box;
  padding: 0.15rem 0.1rem 0.35rem;
  overflow: auto;
  scrollbar-gutter: stable;
  backface-visibility: hidden;

}

.pause-photomode-main__tab-title {
  margin: 0;
}

.pause-photomode-main__empty-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-off-black-rgb), 0.32);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.06);
}

.pause-photomode-main__empty-title,
.pause-photomode-main__empty-hint {
  margin: 0;
}

.pause-photomode-main__empty-title {
  color: var(--bng-off-white);
}

.pause-photomode-main__empty-hint {
  font-size: 0.875em;
  color: var(--bng-cool-gray-200);
}
</style>

<style lang="scss">
.pause-photomode-main {
  --photomode-slider-input-width: 4.5em;
}

.pause-photomode-main .bng-slider-container {
  --input-width: var(--photomode-slider-input-width);
}

.pause-photomode-main .bng-slider-input {
  --fnt-defs: var(--fnt-mono);
}
</style>
