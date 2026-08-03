<template>
  <div class="pause-photomode-root">
    <div class="photomode-layer-stack">
      <div
        class="photomode-camera-surface"
        data-photomode-mount="camera"
      />
      <Teleport to="#photomode-composition-grid-host">
        <div
          v-show="isGallerySurface"
          class="photomode-gallery-scrim"
          aria-hidden="true"
        />
        <PhotomodeCompositionGrid
          v-show="isCompositionGridVisible"
          class="photomode-composition-grid-layer"
          :mode="gridMode"
        />
      </Teleport>
      <div class="photomode-ui-layer">
        <div v-show="!isGallerySurface" class="photomode-focus-stack">
          <div
            class="photomode-panel-mount"
            data-photomode-mount="panel"
            :inert="isSettingsSurface ? null : ''"
            :aria-hidden="isSettingsSurface ? null : 'true'"
            v-bng-scoped-nav="panelScopeBinding"
            v-bng-on-ui-nav:back="onPanelBackNav"
            v-bng-on-ui-nav:context.down="onPanelContextHoldStart"
            v-bng-on-ui-nav:context.up="onPanelContextHoldEnd"
            v-bng-on-ui-nav:action_2="onPanelTakePhotoNav"
          >
            <div v-show="isSettingsSurface" class="photomode-panel-layout">
              <div class="photomode-panel-frame">
                <PausePhotomode
                  ref="pausePhotomode"
                  :payload="photomodePayload"
                  :panel-active="isSettingsSurface"
                  :capture-state="captureState"
                  :capture-enabled="captureAvailable"
                  :grid-mode="gridMode"
                  @select-resolution-preset="setResolutionPresetFromPanel"
                  @advanced-enabled="onAdvancedRenderEnabled"
                  @request-capture="requestCaptureFromPanel"
                  @request-upload-capture="requestUploadCaptureFromPanel"
                  @request-steam-capture="requestSteamCaptureFromPanel"
                  @request-motion-capture="requestMotionCaptureFromPanel"
                  @grid-mode-change="setGridMode"
                  @open-preview="openPreviewFromRecent"
                  @open-gallery="openGalleryFromRecent"
                />
              </div>
            </div>
          </div>
          <div
            class="photomode-hidden-layer"
            v-bng-scoped-nav="hiddenScopeBinding"
            v-bng-on-ui-nav:context.down="onHiddenContextHoldStart"
            v-bng-on-ui-nav:context.up="onHiddenContextHoldEnd"
            v-bng-on-ui-nav:action_2="onTakePhotoNav"
            v-bng-on-ui-nav:action_3.down="onHideUiHoldStart"
            v-bng-on-ui-nav:action_3.up="onHideUiHoldEnd"
            v-bng-on-ui-nav:action_4="onResetCameraNav"
            v-bng-on-ui-nav:back="onHiddenBackNav"
            v-bng-ui-nav-label:action_3="$t('ui.photomode.holdHideUi')"
            v-bng-ui-nav-label:action_4="$t('ui.photomode.resetCamera')"
            @activate="onHiddenScopeActivate"
          >

            <div
              v-show="isHiddenSurface"
              class="photomode-hidden-panel-frame thin"
            >
              <Background class="photomode-hidden-panel-background" />
              <div class="photomode-hidden-prompt">
                <Button
                  class="photomode-hidden-prompt__button"
                  bng-no-nav="true"
                  :nav-item="false"
                  :tab-index="-1"
                  @click="onOpenPanelClick"
                >
                  <BngIcon
                    v-if="!showControllerOpenUiHint"
                    class="photomode-hidden-prompt__arrow"
                    :type="icons.arrowLargeDown"
                  />
                  <BngBinding
                    v-if="showControllerOpenUiHint"
                    class="photomode-hidden-prompt__bindings"
                    ui-event="context"
                    controller
                    track-ignore
                  />
                  <span class="photomode-hidden-prompt__label">{{ $t("ui.photomode.openUi") }}</span>
                </Button>
                <Button
                  class="photomode-hidden-prompt__button photomode-hidden-prompt__take-photo"
                  bng-no-nav="true"
                  :nav-item="false"
                  :tab-index="-1"
                  :disabled="captureActionDisabled"
                  :aria-label="takePhotoLabel"
                  @click="onTakePhotoNav"
                >
                  <BngIcon v-if="!showControllerOpenUiHint" :type="icons.photo" />
                  <BngBinding
                    class="photomode-hidden-prompt__bindings"
                    ui-event="action_2"
                    controller
                    track-ignore
                  />
                  <span class="photomode-hidden-prompt__label">{{ takePhotoLabel }}</span>
                </Button>
                <div
                  v-if="showControllerOpenUiHint"
                  class="photomode-hidden-prompt__camera-bindings"
                  aria-hidden="true"
                >
                  <div class="photomode-hidden-prompt__camera-binding-row">
                    <BngBinding
                      class="photomode-hidden-prompt__camera-binding"
                      ui-event="context"
                      :viewer-obj="PHOTOMODE_CAMERA_MOVE_VIEWER_OBJ"
                      controller
                      track-ignore
                    />
                    <span class="photomode-hidden-prompt__camera-binding-label">{{ $t("ui.photomode.moveCamera") }}</span>
                  </div>
                  <div class="photomode-hidden-prompt__camera-binding-row">
                    <BngBinding
                      class="photomode-hidden-prompt__camera-binding"
                      ui-event="context"
                      :viewer-obj="PHOTOMODE_CAMERA_ROTATION_VIEWER_OBJ"
                      controller
                      track-ignore
                    />
                    <span class="photomode-hidden-prompt__camera-binding-label">{{ $t("ui.photomode.cameraRotation") }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PhotomodeGalleryShortcut
          v-if="showMainGalleryShortcut"
          :items="recentItems"
          :controller="showControllerOpenUiHint"
          :expanded="isSettingsSurface"
          :context-hold-active="contextGalleryHoldActive"
          @open-gallery="openGalleryFromShortcut"
          @open-preview="openPreviewFromShortcut"
        />
        <PhotomodeGallery
          v-show="isGallerySurface"
          :active="isGallerySurface"
          :item="previewTarget"
          :items="galleryDisplayItems"
          :preview-index="previewIndex"
          :total-count="galleryDisplayItems.length"
          :share-url-action="previewShareUrlAction"
          :controller="showControllerOpenUiHint"
          :preset-toast="galleryPresetToast"
          :loaded-preset-types="galleryLoadedPresetTypes"
          scope-id="photomode-gallery"
          :filmstrip-interactive="true"
          @close="closeActiveGallery"
          @show-older="showOlderPreview"
          @show-newer="showNewerPreview"
          @show-in-explorer="showPreviewInExplorer"
          @open-share-url="openPreviewShareUrl"
          @load-presets-from-metadata="loadPresetsFromMetadata"
          @select-preview="setPreviewTarget"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue"
import { $translate } from "@/services/translation"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { vBngScopedNav, vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { BngBinding, BngIcon, icons } from "@/common/components/base"
import { Background, Button } from "@/common/components/utility"
import { useRouteDataStore } from "@/services/routeData"
import { useInfoBar } from "@/services/infoBar"
import { useEvents } from "@/services/events"
import { useHoldAction } from "@/services/holdAction"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import useControls from "@/services/controls"
import { lua } from "@/bridge"
const logPhotomodeDebug = () => {}
import PausePhotomode from "./PausePhotomode.vue"
import PhotomodeCompositionGrid from "./components/PhotomodeCompositionGrid.vue"
import PhotomodeGallery from "./components/PhotomodeGallery.vue"
import PhotomodeGalleryShortcut from "./components/PhotomodeGalleryShortcut.vue"
import { PHOTOMODE_SURFACE_MODES, usePhotomodeInput } from "./usePhotomodeInput"
import { usePhotomodeMediaState } from "./usePhotomodeMediaState"

defineOptions({ name: "PhotomodeCore" })

defineProps({
  metadataPlaybackExitRouteName: { type: String, default: "play" },
})

const route = useRoute()
const routeDataStore = useRouteDataStore()
const infoBar = useInfoBar()
const events = useEvents()
const { showIfController } = storeToRefs(useControls())
const PHOTOMODE_PANEL_BACK_HINT_ID = "photomode-panel-back"
const PHOTOMODE_HIDDEN_CAMERA_HINT_IDS = Object.freeze([
  "photomode-hidden-reset-camera",
  "photomode-hidden-field-of-view",
  "photomode-hidden-camera-roll",
  "photomode-hidden-move-up-down",
])
const PHOTOMODE_SUPPRESSED_INFO_BAR_HINT_IDS = Object.freeze([
  "__auto_binding_context",
  "__auto_binding_action_2",
  "__auto_binding_action_4",
])
const PHOTOMODE_CAMERA_MOVE_VIEWER_OBJ = Object.freeze({
  special: true,
  ownIcon: "xboxThumbL",
})
const PHOTOMODE_CAMERA_ROTATION_VIEWER_OBJ = Object.freeze({
  special: true,
  ownIcon: "xboxThumbR",
})
const CAPTURE_ROOT_CLASS = "photomode-capture-active"
const CAPTURE_STATE = Object.freeze({
  idle: "idle",
  preparing: "preparing",
  success: "success",
  error: "error",
})
const CAPTURE_JOB_WATCHDOG_BASE_TIMEOUT_MS = 45000
const CAPTURE_JOB_WATCHDOG_SUPERSAMPLING_STEP_MS = 10000
const CAPTURE_JOB_WATCHDOG_ARTIFACT_JOB_STEP_MS = 20000
const CAPTURE_JOB_WATCHDOG_MOTION_EXTRA_MS = 15000
const CAPTURE_JOB_WATCHDOG_MAX_TIMEOUT_MS = 10 * 60 * 1000
const CAPTURE_JOB_WATCHDOG_REFRESH_MS = 2000
const CAPTURE_UI_HIDE_CHECK_ATTEMPTS = 8
const CAPTURE_TRACE_DEBUG = false
const CONTEXT_GALLERY_HOLD_MS = 650

const lastMountedAckRouteName = ref("")
let mountedAckRequestId = 0
const pausePhotomode = ref(null)
const captureState = ref(CAPTURE_STATE.idle)
const captureStatusReason = ref("")
const isCaptureHidingUi = ref(false)
const isManualHidingUi = ref(false)
const isPhotomodeUiHidden = computed(() => isCaptureHidingUi.value || isManualHidingUi.value)
const activeTabHeading = computed(() => pausePhotomode.value?.activeTabHeading || "")
const overriddenBackHint = ref(null)
let isShellUnmounted = false
let contextGalleryHoldTriggered = false
let contextGalleryHoldMode = null

const PHOTOMODE_GRID_STORAGE_KEY = "photomode.compositionGrid.mode.v1"
const PHOTOMODE_GRID_MODES = Object.freeze(["off", "thirds", "golden", "vertical", "horizontal", "dev-loading", "dev-mainmenu"])
const gridMode = ref(readStoredGridMode())
const isCompositionGridVisible = computed(() => gridMode.value !== "off" && !isCaptureHidingUi.value)

function readStoredGridMode() {
  if (typeof window === "undefined") return "off"
  const stored = window.localStorage.getItem(PHOTOMODE_GRID_STORAGE_KEY)
  return PHOTOMODE_GRID_MODES.includes(stored) ? stored : "off"
}

function setGridMode(mode) {
  if (!PHOTOMODE_GRID_MODES.includes(mode)) return
  gridMode.value = mode
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PHOTOMODE_GRID_STORAGE_KEY, gridMode.value)
  }
}

const photomodePayload = computed(() => {
  const d = routeDataStore.data
  if (!d || typeof d !== "object") return {}
  const p = d.photomode
  return p && typeof p === "object" ? p : {}
})
const captureSectionCapable = computed(() => photomodePayload.value?.capabilities?.sections?.capture === true)

const {
  isHiddenSurface,
  isSettingsSurface,
  isGallerySurface,
  panelOpen,
  hiddenScopeBinding,
  panelScopeBinding,
  openSettings,
  closeSettings,
  openGallery,
  closeGallery,
  isPreviewSurface,
  closePreview,
  openPanelFromNav,
  closePanelFromNav,
  activateHiddenScope,
} = usePhotomodeInput()
const mediaState = usePhotomodeMediaState()
const jobs = mediaState.jobs
const recentReady = mediaState.recentReady
const recentRefreshing = mediaState.recentRefreshing
const recentItems = mediaState.recentItems
const galleryItems = mediaState.galleryItems
const galleryDisplayItems = computed(() => galleryItems.value.length > 0 ? galleryItems.value : recentItems.value)
const previewTarget = mediaState.previewTarget
const previewIndex = mediaState.previewIndex
const setPreviewTarget = mediaState.setPreviewTarget
const refreshGalleryItems = mediaState.refreshGalleryItems
const galleryReturnSurface = ref(PHOTOMODE_SURFACE_MODES.hidden)
const galleryPresetToast = ref(null)
const galleryLoadedPresetTypes = ref({})
const contextGalleryHoldActive = ref(false)
const GALLERY_PRESET_TOAST_DURATION_MS = 7000
const GALLERY_PRESET_TAB_LABEL_KEYS = Object.freeze({
  camera: "ui.photomode.tabCamera",
  scene: "ui.photomode.tabScene",
  effects: "ui.photomode.tabEffects",
})
const GALLERY_PRESET_TYPES = Object.freeze(["camera", "scene", "effects"])
let galleryPresetToastTimerId = null
let galleryPresetLookupRequestId = 0
const showMainGalleryShortcut = computed(() =>
  (isHiddenSurface.value || isSettingsSurface.value) && recentItems.value.length > 0
)
const contextGalleryHold = useHoldAction(openGalleryFromContextHold, {
  interval: 150,
  debounceDuration: CONTEXT_GALLERY_HOLD_MS,
  startOnConditionFn: value => value === PHOTOMODE_SURFACE_MODES.hidden || value === PHOTOMODE_SURFACE_MODES.settings,
  stopOnConditionFn: value => !value,
})

const resolutionPresetFeatureEnabled = computed(() => photomodePayload.value?.capabilities?.features?.resolutionPresets === true)
const previewShareUrlAction = computed(() => photomodePayload.value?.mediaActions?.preview?.openShareUrl || {})

const showControllerOpenUiHint = computed(() => showIfController.value === true)
const panelBackInfoHint = computed(() => {
  if (isHiddenSurface.value) return null

  return {
    id: PHOTOMODE_PANEL_BACK_HINT_ID,
    content: {
      type: "binding",
      props: {
        uiEvent: "back",
      },
      label: $translate.instant("ui.common.back"),
    },
    action: onPanelBackHintClick,
  }
})
const hiddenCameraInfoHints = computed(() => {
  if (!isHiddenSurface.value || !showControllerOpenUiHint.value) return []

  return [
    {
      id: "photomode-hidden-reset-camera",
      content: {
        type: "binding",
        props: {
          uiEvent: "action_4",
        },
        label: $translate.instant("ui.photomode.resetCamera"),
      },
    },
    {
      id: "photomode-hidden-field-of-view",
      content: [
        {
          type: "binding",
          props: {
            action: "photomodeDecreaseFov",
            controller: true,
          },
        },
        {
          type: "binding",
          props: {
            action: "photomodeIncreaseFov",
            controller: true,
          },
          label: $translate.instant("ui.photomode.fieldOfView"),
        },
      ],
    },
    {
      id: "photomode-hidden-move-up-down",
      content: [
        {
          type: "binding",
          props: {
            action: "photomodeMoveDown",
            controller: true,
          },
        },
        {
          type: "binding",
          props: {
            action: "photomodeMoveUp",
            controller: true,
          },
          label: $translate.instant("ui.photomode.moveCameraUpDown"),
        },
      ],
    },
    {
      id: "photomode-hidden-camera-roll",
      content: [
        {
          type: "binding",
          props: {
            action: "photomodeRollCameraLeft",
            controller: true,
          },
        },
        {
          type: "binding",
          props: {
            action: "photomodeRollCameraRight",
            controller: true,
          },
          label: $translate.instant("ui.photomode.cameraRoll"),
        },
      ],
    },
  ]
})
const sessionActive = computed(() => photomodePayload.value?.sessionActive === true)
const captureSurfaceActive = computed(() => isSettingsSurface.value || isHiddenSurface.value)
const captureAvailable = computed(() => {
  if (!captureSurfaceActive.value) return false
  if (!sessionActive.value) return false
  return captureSectionCapable.value
})
const captureActionDisabled = computed(() =>
  !captureSectionCapable.value || !captureAvailable.value || captureState.value === CAPTURE_STATE.preparing
)
const takePhotoLabel = computed(() =>
  captureState.value === CAPTURE_STATE.preparing ? $translate.instant("ui.photomode.preparing") : $translate.instant("ui.photomode.takePhoto")
)

function updatePhotomodePayload(nextPayload) {
  if (!nextPayload || !routeDataStore.data) return

  if (!routeDataStore.data.photomode || typeof routeDataStore.data.photomode !== "object") {
    routeDataStore.data.photomode = {}
  }

  routeDataStore.data.photomode = {
    ...routeDataStore.data.photomode,
    ...nextPayload,
  }
}

async function refreshPhotomodePayload() {
  const payload = await lua.extensions.ui_pause_photomode.getRoutePayload()
  updatePhotomodePayload(payload)
}

async function setHiddenCameraInputEnabled(active) {
  try {
    await lua.extensions.ui_pause_photomode.setHiddenCameraInputEnabled(active === true)
  } catch (err) {
    console.warn("[Photomode] setHiddenCameraInputEnabled failed", err)
  }
}

async function onAdvancedRenderEnabled(result) {
  if (result?.capabilities) {
    updatePhotomodePayload({
      capabilities: result.capabilities,
    })
  }

  await refreshPhotomodePayload()
}

async function onBreadBack() {
  if (isGallerySurface.value) {
    closeActiveGallery("breadcrumb-back")
    return
  }
  if (isSettingsSurface.value) {
    closeSettings("breadcrumb-back")
    return
  }
  await lua.extensions.ui_router.back()
}

function onHiddenBackNav() {
  void onBreadBack()
  return false
}

function onHiddenScopeActivate() {
  if (!panelOpen.value) return
  closeSettings("hidden-scope-activated")
}

function onOpenPanelClick() {
  openSettings("mouse-prompt")
}

function openGalleryFromContextHold(surfaceMode) {
  if (contextGalleryHoldTriggered) return
  contextGalleryHoldTriggered = true
  contextGalleryHoldActive.value = false
  contextGalleryHold.stopHold()
  if (
    (surfaceMode === PHOTOMODE_SURFACE_MODES.hidden && isHiddenSurface.value)
    || (surfaceMode === PHOTOMODE_SURFACE_MODES.settings && isSettingsSurface.value)
  ) {
    openGalleryFromShortcut()
  }
}

function startContextGalleryHold(surfaceMode) {
  contextGalleryHoldTriggered = false
  contextGalleryHoldMode = surfaceMode
  contextGalleryHoldActive.value = true
  contextGalleryHold.updateActionValue(surfaceMode)
  return false
}

function finishContextGalleryHold(tapAction) {
  const didTriggerHold = contextGalleryHoldTriggered
  contextGalleryHold.updateActionValue(null)
  contextGalleryHoldTriggered = false
  contextGalleryHoldActive.value = false
  contextGalleryHoldMode = null

  if (!didTriggerHold && typeof tapAction === "function") {
    tapAction()
  }
  return false
}

function onHiddenContextHoldStart() {
  return startContextGalleryHold(PHOTOMODE_SURFACE_MODES.hidden)
}

function onHiddenContextHoldEnd() {
  return finishContextGalleryHold(() => openSettings("context"))
}

function onPanelBackNav() {
  if (isGallerySurface.value) {
    closeActiveGallery("back")
    return false
  }
  return closePanelFromNav()
}

function focusedChildHandlesUiNavEvent(eventName) {
  if (typeof document === "undefined") return false
  const panelElement = document.querySelector(".photomode-panel-mount")
  const activeElement = document.activeElement
  if (!panelElement || !activeElement || activeElement === panelElement || !panelElement.contains(activeElement)) return false

  let element = activeElement
  while (element && element !== panelElement) {
    const uiNavBindings = element.__BngOnUiNav
    if (Array.isArray(uiNavBindings) && uiNavBindings.some(binding =>
      typeof binding?.handler === "function" && Array.isArray(binding.eventNames) && binding.eventNames.includes(eventName)
    )) {
      return true
    }
    element = element.parentElement
  }

  return false
}

function onPanelContextHoldStart() {
  if (!isSettingsSurface.value) return false
  if (focusedChildHandlesUiNavEvent("context")) return true
  return startContextGalleryHold(PHOTOMODE_SURFACE_MODES.settings)
}

function onPanelContextHoldEnd() {
  if (focusedChildHandlesUiNavEvent("context")) return true
  if (contextGalleryHoldMode !== PHOTOMODE_SURFACE_MODES.settings) {
    return finishContextGalleryHold()
  }
  return finishContextGalleryHold(() => closeSettings("context"))
}

function onPanelBackHintClick() {
  if (isGallerySurface.value) {
    closeActiveGallery("infobar-back")
    return
  }
  closeSettings("infobar-back")
}

function onPanelTakePhotoNav() {
  if (focusedChildHandlesUiNavEvent("action_2")) return true
  return onTakePhotoNav()
}

function onTakePhotoNav() {
  pausePhotomode.value?.takePhoto()
  return false
}

function installPanelBackHintOverride() {
  const currentHints = Array.isArray(infoBar.hintsList) ? infoBar.hintsList : []
  const existingBackHintIndex = currentHints.findIndex(hint => hint?.content?.type === "binding" && hint?.content?.props?.uiEvent === "back")

  if (existingBackHintIndex < 0) {
    overriddenBackHint.value = null
    if (panelBackInfoHint.value) infoBar.addHints(panelBackInfoHint.value)
    return
  }

  const existingBackHint = currentHints[existingBackHintIndex]
  if (overriddenBackHint.value?.id !== existingBackHint.id) {
    overriddenBackHint.value = {
      id: existingBackHint.id,
      hint: existingBackHint,
    }
  }

  infoBar.updateHint(existingBackHintIndex, {
    ...existingBackHint,
    content: {
      ...(existingBackHint.content || {}),
      label: existingBackHint.content?.label || $translate.instant("ui.common.back"),
      props: {
        ...(existingBackHint.content?.props || {}),
        uiEvent: "back",
      },
    },
    action: onPanelBackHintClick,
  })
}

function restorePanelBackHintOverride() {
  infoBar.removeHints(PHOTOMODE_PANEL_BACK_HINT_ID)

  if (!overriddenBackHint.value) return

  const { id, hint } = overriddenBackHint.value
  overriddenBackHint.value = null
  const currentHints = Array.isArray(infoBar.hintsList) ? infoBar.hintsList : []
  const currentIndex = currentHints.findIndex(candidate => candidate?.id === id)
  if (currentIndex > -1) {
    infoBar.updateHint(currentIndex, hint)
  }
}

function suppressPhotomodeInfoBarHints() {
  infoBar.removeHints(...PHOTOMODE_SUPPRESSED_INFO_BAR_HINT_IDS)
}

function removeHiddenCameraInfoHints() {
  infoBar.removeHints(...PHOTOMODE_HIDDEN_CAMERA_HINT_IDS)
}

function installHiddenCameraInfoHints() {
  removeHiddenCameraInfoHints()
  const hints = hiddenCameraInfoHints.value
  if (hints.length > 0) infoBar.addHints(hints)
}

function updatePhotomodeInfoHints() {
  suppressPhotomodeInfoBarHints()
  removeHiddenCameraInfoHints()
  if (!isHiddenSurface.value && panelBackInfoHint.value) {
    installPanelBackHintOverride()
    return
  }
  restorePanelBackHintOverride()
  installHiddenCameraInfoHints()
  suppressPhotomodeInfoBarHints()
}

function applyPhotomodeUiHiddenState() {
  if (typeof document === "undefined" || !document.documentElement) return
  document.documentElement.classList.toggle(CAPTURE_ROOT_CLASS, isPhotomodeUiHidden.value)
}

function setCaptureDomHidden(active) {
  isCaptureHidingUi.value = active
  applyPhotomodeUiHiddenState()
}

function setManualUiHidden(active) {
  isManualHidingUi.value = active
  applyPhotomodeUiHiddenState()
}

function onHideUiHoldStart() {
  setManualUiHidden(true)
  return false
}

function onHideUiHoldEnd() {
  setManualUiHidden(false)
  return false
}

async function onResetCameraNav() {
  if (!isHiddenSurface.value) return false
  try {
    await lua.extensions.ui_pause_photomode.restoreSessionCameraTransformState()
  } catch (err) {
    console.warn("[Photomode] restoreSessionCameraTransformState failed", err)
  }
  return false
}

async function setCaptureTraceEnabled(active) {
  if (!CAPTURE_TRACE_DEBUG) return
  try {
    await lua.extensions.ui_pause_photomode.setDebugEnabled(active === true)
  } catch {}
}

async function traceCaptureStep(scope, payload = {}) {
  if (!CAPTURE_TRACE_DEBUG) return
  try {
    await lua.extensions.ui_pause_photomode.traceCaptureDebug(scope, payload)
  } catch {}
}

function getLatestCaptureRunId() {
  return jobs.value.reduce((maxRunId, job) => {
    const runId = Number(job?.runId)
    return Number.isFinite(runId) ? Math.max(maxRunId, runId) : maxRunId
  }, 0)
}

function getCaptureRunCompletionAfterRunId(previousRunId) {
  const newerJobs = jobs.value.filter(job => {
    const runId = Number(job?.runId)
    return Number.isFinite(runId) && runId > previousRunId
  })

  if (newerJobs.length === 0) return null

  const targetRunId = newerJobs.reduce((minRunId, job) => Math.min(minRunId, Number(job.runId)), Number.POSITIVE_INFINITY)
  const targetRunJobs = newerJobs.filter(job => Number(job?.runId) === targetRunId)
  if (targetRunJobs.length === 0) return null
  if (targetRunJobs.some(job => job.isActive || (!job.isDone && !job.hasError))) return null

  return {
    runId: targetRunId,
    jobs: targetRunJobs,
    failedJob: targetRunJobs.find(job => job.hasError) || null,
  }
}

function getCapturedRunAfterRunId(previousRunId, expectedJobCount) {
  const newerJobs = jobs.value.filter(job => {
    const runId = Number(job?.runId)
    return Number.isFinite(runId) && runId > previousRunId
  })

  if (newerJobs.length === 0) return null

  const targetRunId = newerJobs.reduce((minRunId, job) => Math.min(minRunId, Number(job.runId)), Number.POSITIVE_INFINITY)
  const targetRunJobs = newerJobs.filter(job => Number(job?.runId) === targetRunId)
  if (targetRunJobs.length < expectedJobCount) return null
  if (targetRunJobs.some(job => job.phase === "queue" || job.phase === "in_progress" || job.phase === "unknown")) return null

  return {
    runId: targetRunId,
    jobs: targetRunJobs,
  }
}

function getCaptureArtifactJobCount(capture = photomodePayload.value?.capture) {
  const artifacts = capture?.artifacts || {}
  let jobCount = 1
  if (artifacts.splitSceneVehicle === true) jobCount += 3
  if (artifacts.saveNormalDepth === true) jobCount += artifacts.splitSceneVehicle === true ? 6 : 2
  return jobCount
}

function getCaptureRunWatchdogTimeoutMs(result = {}) {
  const capture = photomodePayload.value?.capture || {}
  const superSampling = Number(capture.superSampling)
  const normalizedSuperSampling = Number.isFinite(superSampling) && superSampling > 0 ? superSampling : 1
  const artifactJobCount = getCaptureArtifactJobCount(capture)
  const motionExtra = result?.mode === "motion" ? CAPTURE_JOB_WATCHDOG_MOTION_EXTRA_MS : 0
  const timeoutMs = CAPTURE_JOB_WATCHDOG_BASE_TIMEOUT_MS
    + Math.max(0, normalizedSuperSampling - 1) * CAPTURE_JOB_WATCHDOG_SUPERSAMPLING_STEP_MS
    + Math.max(0, artifactJobCount - 1) * CAPTURE_JOB_WATCHDOG_ARTIFACT_JOB_STEP_MS
    + motionExtra

  return Math.min(CAPTURE_JOB_WATCHDOG_MAX_TIMEOUT_MS, timeoutMs)
}

async function waitForCaptureDomSettle() {
  await traceCaptureStep("vue.waitForCaptureDomSettle.begin")
  await nextTick()
  await waitForAnimationFrames(2)
  await traceCaptureStep("vue.waitForCaptureDomSettle.end")
}

function isElementHidden(element) {
  if (!(element instanceof Element)) return true
  const style = window.getComputedStyle(element)
  if (style.display === "none") return true
  if (style.visibility === "hidden") return true
  if (Number(style.opacity) === 0) return true
  if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) return true
  return false
}

function isCaptureUiHiddenNow() {
  if (typeof document === "undefined") return true
  const shellElement = document.querySelector(".pause-photomode-shell")
  const infoBarElement = document.querySelector(".layout-info-bar")
  const shellHidden = isElementHidden(shellElement)
  const infoBarHidden = isElementHidden(infoBarElement)
  return shellHidden && infoBarHidden
}

async function ensureCaptureUiHidden() {
  for (let attempt = 0; attempt < CAPTURE_UI_HIDE_CHECK_ATTEMPTS; attempt += 1) {
    if (isCaptureUiHiddenNow()) {
      await traceCaptureStep("vue.ensureCaptureUiHidden.ack", { attempt: attempt + 1 })
      return {
        ok: true,
      }
    }
    await nextTick()
    await waitForAnimationFrames(1)
  }

  await traceCaptureStep("vue.ensureCaptureUiHidden.timeout", { attempts: CAPTURE_UI_HIDE_CHECK_ATTEMPTS })
  return {
    ok: false,
    reason: "capture_ui_not_hidden",
  }
}

async function waitForAnimationFrames(frameCount) {
  const frames = Number(frameCount)
  if (!Number.isFinite(frames) || frames <= 0) return
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return
  for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }
}

async function requestCaptureWithHiddenUi(requestFn) {
  await traceCaptureStep("vue.requestCaptureWithHiddenUi.begin")
  setCaptureDomHidden(true)
  await traceCaptureStep("vue.setCaptureDomHidden", { active: true })
  await waitForCaptureDomSettle()
  const hiddenCheck = await ensureCaptureUiHidden()
  if (hiddenCheck.ok !== true) {
    return {
      ok: false,
      reason: hiddenCheck.reason || "capture_ui_not_hidden",
    }
  }
  if (isShellUnmounted) return null
  await traceCaptureStep("vue.requestCaptureWithHiddenUi.beforeLuaRequest")
  const result = await requestFn()
  await traceCaptureStep("vue.requestCaptureWithHiddenUi.afterLuaRequest", result || {})
  const captureUiHoldFrames = Number(result?.captureUiHoldFrames)
  if (captureUiHoldFrames > 0) {
    await traceCaptureStep("vue.requestCaptureWithHiddenUi.holdFrames", { captureUiHoldFrames })
    await waitForAnimationFrames(captureUiHoldFrames)
  }
  return result
}

async function waitForCaptureRunCompletion(previousRunId, result = {}, onCaptured = null) {
  const existingCompletion = getCaptureRunCompletionAfterRunId(previousRunId)
  if (existingCompletion) return existingCompletion
  if (typeof window === "undefined") return null

  return await new Promise(resolve => {
    const expectedJobCount = getCaptureArtifactJobCount()
    const watchdogTimeoutMs = getCaptureRunWatchdogTimeoutMs(result)
    let watchdogTimeoutId = null
    let refreshIntervalId = null
    let stopWatch = null
    let refreshInFlight = false
    let finished = false
    let captureUiRestored = false

    const cleanup = () => {
      if (stopWatch) {
        stopWatch()
        stopWatch = null
      }
      if (watchdogTimeoutId) {
        window.clearTimeout(watchdogTimeoutId)
        watchdogTimeoutId = null
      }
      if (refreshIntervalId) {
        window.clearInterval(refreshIntervalId)
        refreshIntervalId = null
      }
    }

    const finish = job => {
      if (finished) return
      finished = true
      cleanup()
      resolve(job)
    }

    const restoreCaptureUiIfCaptured = source => {
      if (captureUiRestored) return
      const capturedRun = getCapturedRunAfterRunId(previousRunId, expectedJobCount)
      if (!capturedRun) return
      captureUiRestored = true
      setCaptureDomHidden(false)
      if (typeof onCaptured === "function") {
        onCaptured(capturedRun)
      }
      void traceCaptureStep("vue.waitForCaptureRunCompletion.captured", {
        previousRunId,
        capturedRunId: capturedRun.runId,
        jobIds: capturedRun.jobs.map(job => job.id),
        phases: capturedRun.jobs.map(job => job.phase),
        source,
      })
    }

    const checkForSettledJob = source => {
      if (isShellUnmounted) {
        finish(null)
        return
      }

      restoreCaptureUiIfCaptured(source)
      const targetRunCompletion = getCaptureRunCompletionAfterRunId(previousRunId)
      if (targetRunCompletion) {
        void traceCaptureStep("vue.waitForCaptureRunCompletion.completed", {
          previousRunId,
          completedRunId: targetRunCompletion.runId,
          jobIds: targetRunCompletion.jobs.map(job => job.id),
          phases: targetRunCompletion.jobs.map(job => job.phase),
          source,
        })
        finish(targetRunCompletion)
      }
    }

    const refreshJobsSnapshot = async source => {
      if (refreshInFlight || finished) return
      refreshInFlight = true
      try {
        await mediaState.refreshJobs()
      } finally {
        refreshInFlight = false
        checkForSettledJob(source)
      }
    }

    void traceCaptureStep("vue.waitForCaptureRunCompletion.begin", {
      previousRunId,
      watchdogTimeoutMs,
      mode: result?.mode || "basic",
    })
    stopWatch = watch(jobs, () => {
      checkForSettledJob("event")
    }, { deep: true })

    refreshIntervalId = window.setInterval(() => {
      void refreshJobsSnapshot("watchdog-refresh")
    }, CAPTURE_JOB_WATCHDOG_REFRESH_MS)

    watchdogTimeoutId = window.setTimeout(() => {
      void (async () => {
        await refreshJobsSnapshot("watchdog-final-refresh")
        if (finished) return
        void traceCaptureStep("vue.waitForCaptureRunCompletion.timeout", {
          previousRunId,
          watchdogTimeoutMs,
        })
        finish(null)
      })()
    }, watchdogTimeoutMs)

    checkForSettledJob("initial")
  })
}

async function requestCaptureFromPanel(requestFn = () => lua.extensions.ui_pause_photomode.requestScreenshot({ motion: false, upload: false, steam: false })) {
  if (captureState.value === CAPTURE_STATE.preparing) return
  if (!captureSurfaceActive.value) return
  if (!captureAvailable.value) {
    captureState.value = CAPTURE_STATE.error
    captureStatusReason.value = "capture_unavailable"
    return
  }

  captureState.value = CAPTURE_STATE.preparing
  captureStatusReason.value = ""
  const previousRunId = getLatestCaptureRunId()
  await traceCaptureStep("vue.requestCaptureFromPanel.begin", {
    previousRunId,
    panelOpen: panelOpen.value,
    captureAvailable: captureAvailable.value,
  })

  try {
    const result = await requestCaptureWithHiddenUi(requestFn)
    if (isShellUnmounted || result == null) return
    if (result?.ok === true) {
      const acceptedMode = result?.mode || "basic"
      await traceCaptureStep("vue.requestCaptureFromPanel.requestAccepted", {
        previousRunId,
        mode: acceptedMode,
      })
      if (acceptedMode === "steam" || acceptedMode === "motion_steam") {
        captureState.value = CAPTURE_STATE.success
        captureStatusReason.value = acceptedMode
        return
      }
      await mediaState.refreshJobs()
      await traceCaptureStep("vue.requestCaptureFromPanel.afterRefreshJobs", {
        previousRunId,
        latestRunId: getLatestCaptureRunId(),
        jobCount: jobs.value.length,
      })
      const completedRun = await waitForCaptureRunCompletion(previousRunId, result, () => {
        captureState.value = CAPTURE_STATE.success
        captureStatusReason.value = acceptedMode
      })
      if (!completedRun) {
        captureState.value = CAPTURE_STATE.error
        captureStatusReason.value = "capture_completion_timeout"
        await traceCaptureStep("vue.requestCaptureFromPanel.timeout", { previousRunId })
        return
      }
      if (completedRun.failedJob) {
        captureState.value = CAPTURE_STATE.error
        captureStatusReason.value = completedRun.failedJob.message || "capture_failed"
        await traceCaptureStep("vue.requestCaptureFromPanel.failed", {
          runId: completedRun.runId,
          failedJobId: completedRun.failedJob.id,
          message: completedRun.failedJob.message || "",
        })
        return
      }
      captureState.value = CAPTURE_STATE.success
      captureStatusReason.value = acceptedMode
      await traceCaptureStep("vue.requestCaptureFromPanel.success", {
        runId: completedRun.runId,
        jobIds: completedRun.jobs.map(job => job.id),
      })
      return
    }

    captureState.value = CAPTURE_STATE.error
    captureStatusReason.value = result?.reason || "capture_failed"
    await traceCaptureStep("vue.requestCaptureFromPanel.rejected", result || {})
  } catch (error) {
    captureState.value = CAPTURE_STATE.error
    captureStatusReason.value = error?.message || "capture_request_error"
    await traceCaptureStep("vue.requestCaptureFromPanel.exception", {
      message: error?.message || "capture_request_error",
    })
  } finally {
    setCaptureDomHidden(false)
    await traceCaptureStep("vue.setCaptureDomHidden", { active: false })
    if (isHiddenSurface.value) {
      activateHiddenScope("photomode-hidden-after-capture")
    }
  }
}

function requestMotionCaptureFromPanel(modeOrOptions = "basic") {
  const outputMode = typeof modeOrOptions === "string"
    ? modeOrOptions
    : typeof modeOrOptions?.outputMode === "string"
      ? modeOrOptions.outputMode
      : "basic"
  return requestCaptureFromPanel(() => lua.extensions.ui_pause_photomode.requestScreenshot({
    motion: true,
    upload: outputMode === "upload",
    steam: outputMode === "steam",
  }))
}

function requestUploadCaptureFromPanel() {
  return requestCaptureFromPanel(() => lua.extensions.ui_pause_photomode.requestScreenshot({
    motion: false,
    upload: true,
    steam: false,
  }))
}

function updateResolutionPresetPayload(nextState) {
  if (!nextState || !routeDataStore.data?.photomode) return
  routeDataStore.data.photomode.resolutionPresets = nextState
}

async function refreshResolutionPresetState() {
  if (!resolutionPresetFeatureEnabled.value) return
  const result = await lua.extensions.ui_pause_photomode.getResolutionPresetState()
  updateResolutionPresetPayload(result?.state)
}

async function setResolutionPresetFromPanel(presetId) {
  const normalizedPresetId = typeof presetId === "string" && presetId.length > 0 ? presetId : "current"
  const result = await lua.extensions.ui_pause_photomode.setResolutionPreset(normalizedPresetId)
  updateResolutionPresetPayload(result?.state)
  if (result?.ok !== true) return
}

async function requestSteamCaptureFromPanel() {
  return requestCaptureFromPanel(() => lua.extensions.ui_pause_photomode.requestScreenshot({
    motion: false,
    upload: false,
    steam: true,
  }))
}

function openGallerySurface(item, reason = "gallery") {
  const targetItem = item?.id ? item : recentItems.value[0]
  if (!targetItem?.id) return
  setPreviewTarget(targetItem)
  void refreshGalleryItems()
  galleryReturnSurface.value = isSettingsSurface.value
    ? PHOTOMODE_SURFACE_MODES.settings
    : PHOTOMODE_SURFACE_MODES.hidden
  openGallery(reason)
  logPhotomodeDebug("Gallery surface open", { reason, itemId: targetItem.id })
}

function openPreviewFromRecent(item) {
  openGallerySurface(item, "recent-shot")
}

function openGalleryFromRecent() {
  openGallerySurface(previewTarget.value || recentItems.value[0], "recent-shots")
}

function openGalleryFromShortcut() {
  openGallerySurface(previewTarget.value || recentItems.value[0], "main-shortcut")
}

function openPreviewFromShortcut(item) {
  openGallerySurface(item, "main-shortcut-shot")
}

function closeActiveGallery(reason = "gallery-close") {
  clearGalleryPresetToast()
  closeGallery(reason, galleryReturnSurface.value)
}

function normalizeGamePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim()
}

function presetMatchesScreenshot(preset, screenshotPath) {
  if (!preset || !screenshotPath) return false
  const origin = preset.origin
  if (!origin || typeof origin !== "object" || origin.type !== "screenshot") return false
  return normalizeGamePath(origin.screenshotPath) === screenshotPath
}

async function refreshGalleryLoadedPresetTypes() {
  const screenshotPath = normalizeGamePath(previewTarget.value?.gamePath)
  const requestId = ++galleryPresetLookupRequestId
  if (!screenshotPath) {
    galleryLoadedPresetTypes.value = {}
    return
  }

  const nextLoadedPresetTypes = {}
  await Promise.all(GALLERY_PRESET_TYPES.map(async presetType => {
    try {
      const result = await lua.extensions.ui_pause_photomode.listPresets(presetType)
      const presets = Array.isArray(result?.presets) ? result.presets : []
      if (presets.some(preset => presetMatchesScreenshot(preset, screenshotPath))) {
        nextLoadedPresetTypes[presetType] = true
      }
    } catch {
      // Missing preset state should only hide the indicator.
    }
  }))

  if (requestId !== galleryPresetLookupRequestId) return
  galleryLoadedPresetTypes.value = nextLoadedPresetTypes
}

function markGalleryPresetLoaded(presetType) {
  if (!GALLERY_PRESET_TYPES.includes(presetType)) return
  galleryLoadedPresetTypes.value = {
    ...galleryLoadedPresetTypes.value,
    [presetType]: true,
  }
}

async function findGalleryPresetForScreenshot(presetType, screenshotPath) {
  if (!GALLERY_PRESET_TYPES.includes(presetType) || !screenshotPath) return null
  try {
    const result = await lua.extensions.ui_pause_photomode.listPresets(presetType)
    const presets = Array.isArray(result?.presets) ? result.presets : []
    return presets.find(preset => presetMatchesScreenshot(preset, screenshotPath)) || null
  } catch {
    return null
  }
}

function stepPreview(direction) {
  const items = galleryDisplayItems.value
  if (!items.length) return

  const currentIndex = previewIndex.value >= 0 ? previewIndex.value : 0
  const nextIndex = (currentIndex + direction + items.length) % items.length
  const nextItem = items[nextIndex]
  if (!nextItem?.id) return
  setPreviewTarget(nextItem)
}

function showOlderPreview() {
  stepPreview(1)
}

function showNewerPreview() {
  stepPreview(-1)
}

async function showPreviewInExplorer() {
  const gamePath = previewTarget.value?.gamePath
  if (!gamePath) return
  await lua.screenshot.openScreenshotFileInExplorer(gamePath)
}

async function openPreviewShareUrl() {
  const shareUrl = previewTarget.value?.shareUrl
  if (!shareUrl) return
  await lua.extensions.ui_pause_photomode.openPreviewShareUrl(shareUrl)
}

function clearGalleryPresetToast() {
  if (galleryPresetToastTimerId != null && typeof window !== "undefined") {
    window.clearTimeout(galleryPresetToastTimerId)
  }
  galleryPresetToastTimerId = null
  galleryPresetToast.value = null
}

function showGalleryPresetToast(presetType, presetName, translationKey = "ui.photomode.gallery.presetAvailable") {
  const tabLabelKey = GALLERY_PRESET_TAB_LABEL_KEYS[presetType]
  if (!tabLabelKey || !presetName) return

  clearGalleryPresetToast()
  galleryPresetToast.value = {
    id: Date.now(),
    presetName,
    tabLabelKey,
    translationKey,
  }

  if (typeof window !== "undefined") {
    galleryPresetToastTimerId = window.setTimeout(() => {
      galleryPresetToastTimerId = null
      galleryPresetToast.value = null
    }, GALLERY_PRESET_TOAST_DURATION_MS)
  }
}

async function loadPresetsFromMetadata(presetType) {
  const presetBundle = previewTarget.value?.metadata?.photomodePresets
  if (!presetBundle || typeof presetBundle !== "object") return
  if (!presetType || !presetBundle[presetType]) return

  const screenshotPath = normalizeGamePath(previewTarget.value?.gamePath)
  const existingPreset = await findGalleryPresetForScreenshot(presetType, screenshotPath)
  if (existingPreset) {
    markGalleryPresetLoaded(presetType)
    showGalleryPresetToast(presetType, existingPreset.name || `${previewTarget.value?.fileName || previewTarget.value?.dateLabel || "Screenshot"} ${presetType}`, "ui.photomode.gallery.presetAlreadyLoaded")
    return
  }

  const namePrefix = previewTarget.value?.fileName || previewTarget.value?.dateLabel || "Screenshot"
  const result = await lua.extensions.ui_pause_photomode.savePresetPayload(presetType, `${namePrefix} ${presetType}`, presetBundle[presetType], {
    type: "screenshot",
    screenshotPath,
  })
  if (result?.ok === false) return
  events.emit("PhotomodePresetsChanged", result)
  markGalleryPresetLoaded(presetType)
  showGalleryPresetToast(presetType, result?.preset?.name || `${namePrefix} ${presetType}`)
}

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) {
    return
  }
  if (route.name !== routeName) {
    return
  }
  const luaRouter = window.__luaRouter__
  const canonicalRoute = luaRouter?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) {
    return
  }

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (result?.success) {
    if (luaRouter && luaRouter._pendingCanonicalRoute === canonicalRoute) {
      luaRouter._pendingCanonicalRoute = null
    }
    activateRouteTargetScope()
  }
}

watch(
  () => route.fullPath,
  async () => {
    lastMountedAckRouteName.value = ""
    await notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(
  [isHiddenSurface, panelOpen, showControllerOpenUiHint],
  updatePhotomodeInfoHints,
  { immediate: true }
)

watch(
  () => infoBar.hintsList.map(hint => hint?.id).join("|"),
  () => suppressPhotomodeInfoBarHints(),
  { flush: "post" }
)

watch(
  isHiddenSurface,
  hidden => {
    void setHiddenCameraInputEnabled(hidden)
  },
  { immediate: true }
)

events.on("scopeChanged", () => {
  void nextTick(updatePhotomodeInfoHints)
})

watch(
  () => resolutionPresetFeatureEnabled.value,
  enabled => {
    if (enabled) {
      void refreshResolutionPresetState()
    }
  },
  { immediate: true }
)

watch(
  [isGallerySurface, () => previewTarget.value?.gamePath],
  ([galleryActive]) => {
    if (!galleryActive) {
      galleryLoadedPresetTypes.value = {}
      return
    }
    void refreshGalleryLoadedPresetTypes()
  },
  { immediate: true }
)

onMounted(() => {
  logPhotomodeDebug("Shell mounted", { routeName: route.name, fullPath: route.fullPath })
  isShellUnmounted = false
  void setCaptureTraceEnabled(true)
  void traceCaptureStep("vue.shellMounted", { routeName: route.name, fullPath: route.fullPath })
})

onUnmounted(() => {
  logPhotomodeDebug("Shell unmounted", { routeName: route.name, fullPath: route.fullPath })
  void traceCaptureStep("vue.shellUnmounted", { routeName: route.name, fullPath: route.fullPath })
  galleryPresetLookupRequestId++
  contextGalleryHold.stopHold()
  contextGalleryHoldActive.value = false
  clearGalleryPresetToast()
  void setHiddenCameraInputEnabled(false)
  void setCaptureTraceEnabled(false)
  isShellUnmounted = true
  setCaptureDomHidden(false)
  setManualUiHidden(false)
  suppressPhotomodeInfoBarHints()
  removeHiddenCameraInfoHints()
  restorePanelBackHintOverride()
})

defineExpose({
  isPhotomodeUiHidden,
  panelOpen,
  isPreviewSurface,
  isGallerySurface,
  isSettingsSurface,
  activeTabHeading,
  closePreview,
  closeGallery: closeActiveGallery,
  closeSettings,
  onBreadBack,
  onHideUiHoldStart,
  onHideUiHoldEnd,
  onResetCameraNav,
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.pause-photomode-root {
  align-self: stretch;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.photomode-layer-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.photomode-camera-surface {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.photomode-composition-grid-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.photomode-gallery-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(var(--bng-off-black-rgb), 0.75);
}

:global(.photomode-capture-active .photomode-gallery-scrim) {
  display: none;
}

.photomode-ui-layer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 0.5rem;
}

.photomode-focus-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.photomode-panel-mount {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.photomode-panel-layout {
  display: flex;
  align-items: stretch;
  gap: 0.75em;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.photomode-hidden-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  min-width: 1px;
  min-height: 1px;
  pointer-events: none;
  z-index: 2;
}

.photomode-hidden-panel-frame {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  flex: 0 1 32em;
  width: min(32em, 100%);
  min-width: 0;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  pointer-events: auto;
  &.thin {
    flex: 0 1 16em;
    min-height: 0;
  }
}

.photomode-hidden-panel-background {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);
}

.photomode-hidden-prompt {
  display: flex;
  flex-direction: column;
  gap: 0.0em;
  min-width: 0;
  padding: 0.25em;
}

.photomode-hidden-prompt__camera-bindings {
  display: flex;
  flex-direction: column;
  gap: 0;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  pointer-events: none;
}

.photomode-hidden-prompt__camera-binding-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0.25em;
  padding: 0.35em 0.5em;
  justify-content: flex-start;
}

.photomode-hidden-prompt__camera-binding {
  flex: 0 0 auto;
  font-size: 1.15em;
  min-width: 2.25em;
  justify-content: center;
  padding: 0.125em 0.25em;
}

.photomode-hidden-prompt__camera-binding-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photomode-hidden-prompt__button {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --bng-content-flow: row;
  --bng-content-align: center;
  --bng-content-justify: flex-start;

  --bng-button-min-width: auto;
  --bng-button-margin: 0.25em;
  --bng-button-max-width: none;
  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 0.5em;
  --bng-button-padding-bottom: 0.5em;

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);
  --bng-bg-focus: var(--bng-cool-gray-700);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);

  gap: 0.5em;
  flex: 1 1 auto;
  justify-content: flex-start;
}

.photomode-hidden-prompt__arrow {
  --bng-icon-size: 1.25em;
}

.photomode-hidden-prompt__label {
  white-space: nowrap;
}

.photomode-hidden-prompt__bindings {
  display: inline-flex;
  align-items: center;
  font-size: 1em;
  gap: 0.25em;
  margin-right: 0.2em;
}

.photomode-panel-frame {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  flex: 0 1 32em;
  min-width: 0;
  min-height: 0;
  border-radius: var(--bng-corners-2);
  overflow: hidden;

  --bng-row-breakpoint:33%;
}

:global(.photomode-capture-active .layout-info-bar) {
  visibility: hidden;
  pointer-events: none;
}

:global(.photomode-capture-active [data-bng-tooltip]) {
  display: none !important;
  visibility: hidden !important;
}

@media (max-width: 960px) {
  .photomode-panel-layout {
    flex-direction: column;
  }

  .photomode-panel-frame {
    flex: 1 1 auto;
  }
}
</style>
