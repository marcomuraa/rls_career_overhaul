<template>
  <LayoutMenu
    class="decals-main-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    :nav-options="{ canDeactivate: canDeactivateDecalsScope }"
    heading="Decals"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
    >
    <div
      class="main-view-content"
      v-bng-ui-nav-label:context="contextUIEventLabel"
      v-bng-ui-nav-label:action_2="action2UIEventLabel"
      v-bng-ui-nav-label:menu,back="'Back'"
      v-bng-on-ui-nav:menu,back="onBack"
      v-bng-on-ui-nav:context="handleContext"
      v-bng-on-ui-nav:action_2="handleAction2">
      <LayersManager
        v-model:selectedKeys="selectedLayerKeys"
        :layers="layers"
        :view-mode="VIEW_MODES.COMPACT"
        v-bng-scoped-nav="{
          scopeId: LAYERS_MANAGER_SCOPE,
          preferAutoFocus: true,
          bubbleWhitelistEvents: ['context', 'action_2']
        }"
        v-bng-blur
        class="layers-manager"
        @focus-layer="onFocusedLayer"
        @select="onSelect"
        @open-actions="onOpenActions"
        @multi-select="onMultiSelect">
        <template #header>
          <BngCardHeading type="ribbon">Layers</BngCardHeading>
          <BngButton
            bng-no-nav="true"
            v-bng-disabled="isReprojectActive"
            tabindex="-1"
            :accent="ACCENTS.outlined"
            @click="addDecal">
            <span class="add-content-wrapper">
              <BngBinding :track-ignore="true" ui-event="context" controller />
              <!-- <BngIcon :type="icons.plus" /> -->
              <span class="add-label">Add Decal</span>
            </span>
          </BngButton>
        </template>
      </LayersManager>
      <BngActionDrawer
        v-if="actionsDrawerData && allowActionsDrawerShow"
        ref="actionDrawer"
        blur
        v-bng-scoped-nav="{
          scopeId: ACTIONS_DRAWER_SCOPE,
          preferAutoFocus: true,
          bubbleWhitelistEvents: ['context', 'action_2'],
          canDeactivate: canDeactivateActionsDrawerScope,
        }"
        bng-no-nav="true"
        :alwaysShowBack="false"
        :actions="actionsDrawerData"
        :item-width="10"
        :item-margin="1"
        class="actions-drawer"
        @select="onActionTriggered">
        <template #controls>
          <BngButton
            tabindex="-1"
            :accent="ACCENTS.outlined"
            :icon="icons.exit"
            bng-no-nav="true"
            v-bng-on-ui-nav:ok.asMouse.focusRequired
            @click="closeActionDrawer"
            />
        </template>
        <template #action="{ item, select }">
          <div class="action-tile">
            <BngTile
              v-if="item.isSwitch"
              bng-nav-item
              v-bng-disabled="item.disabled"
              v-bng-on-ui-nav:ok.asMouse.focusRequired
              :label="item.label"
              @click="onActionSwitchClicked(item)">
              <BngSwitch v-model="item.switchValue" />
            </BngTile>
            <BngImageTile
              v-else
              bng-nav-item
              v-bng-on-ui-nav:ok.asMouse.focusRequired
              :label="item.label"
              :icon="item.icon ? item.icon : ACTION_ITEM_ICON[item.value]"
              class="action-tile"
              @click="select(item)">
            </BngImageTile>
          </div>
        </template>
      </BngActionDrawer>
      <div v-if="popupSettings" class="popup-settings">
        <component :is="popupSettings" @back="restoreActionsDrawer"></component>
      </div>
    </div>
  </LayoutMenu>
</template>

<script>
const CAMERA_BUTTONS = [
  {
    label: "Right",
    icon: icons.cameraSideRight,
    value: "right",
  },
  {
    label: "Front",
    icon: icons.cameraFront1,
    value: "front",
  },
  {
    label: "Left",
    icon: icons.cameraSideLeft,
    value: "left",
  },
  {
    label: "Back",
    icon: icons.cameraBack1,
    value: "back",
  },
  {
    label: "Top Right",
    icon: icons.cameraTop1,
    value: "topright",
  },
  {
    label: "Top Left",
    icon: icons.cameraTop1,
    value: "topleft",
  },
  {
    label: "Top Front",
    icon: icons.cameraTop1,
    value: "topfront",
  },
  {
    label: "Top Back",
    icon: icons.cameraTop1,
    value: "topback",
  },
]

const BLOCKED_UINAV_EVENTS = ["tab_l", "tab_r"]
const SHOW_HIDE_DECAL_EVENT = "action_2"
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, markRaw, reactive, toRef, watch, watchEffect } from "vue"
import { lua, useBridge } from "@/bridge"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useRouteDataStore } from "@/services/routeData"
import { useScopedNav, activateRouteTargetScope } from "@/services/scopedNav/api"
import { getNavItems } from "@/services/scopedNav/utils"
import { vBngOnUiNav, vBngUiNavLabel, vBngBlur, vBngDisabled, vBngScopedNav } from "@/common/directives"
import { BngActionDrawer, BngButton, BngCardHeading, BngImageTile, BngTile, icons, ACCENTS, BngSwitch, BngBinding } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import LayersManager from "@/modules/liveryEditor/components/layersManager/LayersManager.vue"
import { useLiveryEditorStore } from "@/modules/liveryEditor/stores"
import { VIEW_MODES } from "@/modules/liveryEditor/components/layersManager/LayersManager.vue"
import LayerOrder from "../components/LayerOrder.vue"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const LAYERS_MANAGER_SCOPE = "layers-manager"
const ACTIONS_DRAWER_SCOPE = "actions-drawer"
const ACTIONS_DRAWER_ACTIVATION_WAIT_FRAMES = 10

const rootStore = useLiveryEditorStore()
const routeDataStore = useRouteDataStore()
const { switchScope, isActiveScope, setPendingActivation, requestScopeFocus, getScopeById } = useScopedNav()

const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    onBack()
    return true
  },
  handleNavigate: item => {
    // While a popup/action panel is open, breadcrumb interaction should close it
    // first (same as pressing back) instead of leaving the decals screen.
    if (popupSettings.value) {
      onBack()
      return true
    }
    return false
  },
})

const ACTION_ITEM_ICON = {
  requestReproject: icons.view,
  transform: icons.transform,
  materials: icons.colorPalette,
  highlight: icons.lightGarageG11,
  requestMirror: icons.reflect,
  order: icons.sortAscDown,
  enabled: icons.eyeOutlineOpened,
  "enabled-off": icons.eyeOutlineClosed,
  delete: icons.trashBin1,
  duplicate: icons.copy,
}

const layerActionsState = reactive({
  mirrored: false,
  mirrorFlipped: false,
  highlight: true,
  enabled: true,
})

const MIRROR_ITEMS = [
  {
    label: "Mirror",
    value: "mirror",
    isSwitch: true,
    switchValue: toRef(layerActionsState, "mirrored"),
  },
  {
    label: "Flip Mirrored",
    value: "flipMirrored",
    isSwitch: true,
    switchValue: toRef(layerActionsState, "mirrorFlipped"),
    disabled: computed(() => !layerActionsState.mirrored),
  },
]

const uiNavBlocker = useUINavBlocker()
const { events } = useBridge()

const layers = ref([])
const selectedLayers = ref([])
const layerActions = ref([])
const allowActionsDrawerShow = ref(true)
const actionDrawer = ref(null)
const currentActionDrawerLevel = ref(null)
const popupSettings = ref(null)
const isReprojectActive = ref(false)
const focusedLayer = ref(null)
const pendingActionsDrawerOpen = ref(false)
let actionsDrawerActivationRequest = 0

const selectedLayerKeys = computed(() => (selectedLayers.value ? selectedLayers.value.map(x => x.uid) : null))

const actionsDrawerData = computed(() => {
  const layerName = selectedLayers.value && selectedLayers.value.length > 0 ? selectedLayers.value[0].name : null
  return layerActions.value && layerActions.value.length > 0
    ? {
        label: layerName,
        items: layerActions.value,
        allowOpenDrawer: false,
      }
    : undefined
})

const contextUIEventLabel = computed(() => (isReprojectActive.value ? "Reproject" : "Add Decal"))
const action2UIEventLabel = computed(() =>
  focusedLayer.value || (selectedLayers.value && selectedLayers.value.length > 0) ? "Enable/Disable Decal" : undefined
)

watchEffect(() => {
  const eventsToBlock = [...BLOCKED_UINAV_EVENTS]

  uiNavBlocker.clear()
  if (isReprojectActive.value || (!focusedLayer.value && (!selectedLayers.value || selectedLayers.value.length === 0)))
    eventsToBlock.push(SHOW_HIDE_DECAL_EVENT)
  uiNavBlocker.blockOnly(eventsToBlock)
})

watch(
  () => routeDataStore.targetScope === ACTIONS_DRAWER_SCOPE && !!actionsDrawerData.value && allowActionsDrawerShow.value,
  shouldActivate => {
    if (shouldActivate) activateActionsDrawerScope()
  },
  { flush: "post", immediate: true }
)

watch(
  () => pendingActionsDrawerOpen.value && !!actionsDrawerData.value && allowActionsDrawerShow.value,
  shouldActivate => {
    if (shouldActivate) activatePendingActionsDrawerOpen()
  },
  { flush: "post" }
)

onMounted(() => {
  events.on("liveryEditor_OnLayersUpdated", onLayersUpdated)
  events.on("liveryEditor_selection_actionsUpdated", onActionsUpdated)
  events.on("liveryEditor_selection_selectedChanged", onSelectedChanged)

  lua.extensions.ui_liveryEditor_layers.requestInitialData()
  lua.extensions.ui_liveryEditor_selection.requestInitialData()
})

onBeforeUnmount(() => {
  actionsDrawerActivationRequest++
  events.off("liveryEditor_OnLayersUpdated", onLayersUpdated)
  events.off("liveryEditor_selection_actionsUpdated", onActionsUpdated)
  events.off("liveryEditor_selection_selectedChanged", onSelectedChanged)
})

function onBack(event) {
  if (popupSettings.value) {
    popupSettings.value = null
    allowActionsDrawerShow.value = true
  } else {
    lua.extensions.ui_router.navigate("livery.editor", null, null)
  }

  event?.stopPropagation?.()
}

function canDeactivateDecalsScope() {
  onBack()
  return false
}

// BACK from the layer order panel: hide the panel, re-render the actions drawer
// and queue its scope for activation once it mounts again on the next tick.
function restoreActionsDrawer() {
  popupSettings.value = null
  allowActionsDrawerShow.value = true
  setPendingActivation(ACTIONS_DRAWER_SCOPE)
}

// Enter the actions drawer scope with focus. `viaRoute` uses the router's
// target-scope activation (route-entry path); otherwise we switch scopes
// directly, used when OK is pressed on a focused layer in the layers manager.
async function activateActionsDrawerScope({ viaRoute = true } = {}) {
  const requestId = ++actionsDrawerActivationRequest
  const focusTarget = await waitForActionsDrawerFocusTarget(requestId)

  if (!focusTarget || requestId !== actionsDrawerActivationRequest) return false
  if (viaRoute && routeDataStore.targetScope !== ACTIONS_DRAWER_SCOPE) return false

  if (viaRoute) {
    activateRouteTargetScope()
  } else {
    await Promise.resolve(switchScope(ACTIONS_DRAWER_SCOPE, { reason: "layer-ok", force: true }))
  }
  await nextTick()
  requestScopeFocus(ACTIONS_DRAWER_SCOPE, focusTarget, { reason: "actions-drawer-entry", force: true, activeOnly: false })
  return true
}

// OK on a focused layer while the layers manager scope is active should enter
// the actions drawer scope once its data/DOM are ready.
function onOpenActions() {
  if (!isActiveScope(LAYERS_MANAGER_SCOPE)) return
  pendingActionsDrawerOpen.value = true
  activatePendingActionsDrawerOpen()
}

async function activatePendingActionsDrawerOpen() {
  if (!pendingActionsDrawerOpen.value || !actionsDrawerData.value || !allowActionsDrawerShow.value) return

  const activated = await activateActionsDrawerScope({ viaRoute: false })
  if (activated) pendingActionsDrawerOpen.value = false
}

async function waitForActionsDrawerFocusTarget(requestId) {
  for (let frame = 0; frame < ACTIONS_DRAWER_ACTIVATION_WAIT_FRAMES; frame++) {
    await nextTick()
    if (requestId !== actionsDrawerActivationRequest) return null

    const scopeElement = getActionsDrawerScopeElement()
    const focusTarget = getActionsDrawerFocusTarget(scopeElement)
    if (getScopeById(ACTIONS_DRAWER_SCOPE) && focusTarget) return focusTarget

    await waitForAnimationFrame()
  }

  return null
}

function getActionsDrawerScopeElement() {
  return document.querySelector(`[bng-scoped-nav="${ACTIONS_DRAWER_SCOPE}"]`)
}

function getActionsDrawerFocusTarget(scopeElement) {
  if (!scopeElement) return null

  const navItems = getNavItems(scopeElement, true, { ignoreOwnNoChildNav: true, availableOnly: true })
  return navItems[0] || null
}

function waitForAnimationFrame() {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(resolve)
    } else {
      setTimeout(resolve)
    }
  })
}

// BACK while the actions drawer scope is active is owned here: step back through
// the drawer's nested levels, or close the drawer and hand focus back to the
// layers manager scope. Returning false stops the directive's route-back handling.
function canDeactivateActionsDrawerScope() {
  if (!isActiveScope(ACTIONS_DRAWER_SCOPE)) return true

  if (currentActionDrawerLevel.value) {
    handleDrawerBack()
  } else {
    closeActionDrawer()
    switchScope(LAYERS_MANAGER_SCOPE)
  }

  return false
}

function addDecal() {
  lua.extensions.ui_router.navigate("livery.editor.decals.selector", null, null)
}

let isReproject

async function onActionSwitchClicked(item) {
  const res = await lua.extensions.ui_liveryEditor_layerAction.performAction(item.value)
  item.switchValue = res
}

async function onActionTriggered(item) {
  if (!item.value) {
    if (currentActionDrawerLevel.value === "requestReproject" && !isReproject) {
      await lua.extensions.ui_liveryEditor_layerAction.performAction("cancelReproject")
    }

    isReprojectActive.value = false
    isReproject = false
    currentActionDrawerLevel.value = null
    return
  }

  if (item.lazyLoadItems || item.items) {
    currentActionDrawerLevel.value = item.value
  }

  if (item.value === "requestReproject") {
    if (!item.items) {
      const timeoutid = setTimeout(() => {
        item.items = CAMERA_BUTTONS
        clearTimeout(timeoutid)
      }, 500)
    }

    isReprojectActive.value = true
  } else if (item.value === "requestMirror") {
    item.items = MIRROR_ITEMS
    return
  } else if (item.value === "order") {
    allowActionsDrawerShow.value = false
    popupSettings.value = markRaw(LayerOrder)
    return
  } else if (CAMERA_BUTTONS.find(x => x.value === item.value)) {
    await lua.extensions.ui_liveryEditor_camera.setOrthographicView(item.value)
    return
  } else if (item.value === "delete") {
    await lua.extensions.ui_liveryEditor_layerAction.performAction(item.value)
    switchScope(LAYERS_MANAGER_SCOPE)
    return
  }

  await lua.extensions.ui_liveryEditor_layerAction.performAction(item.value)
}

function onLayersUpdated(data) {
  layers.value = data
}

function onActionsUpdated(data) {
  layerActions.value = data

  // init layer switch actions by selected layer values
  if (data && Array.isArray(data) && data.length > 0) {
    const highlightAction = layerActions.value.find(x => x.value === "highlight")
    highlightAction.switchValue = toRef(layerActionsState, "highlight")
  }
}

function onSelectedChanged(data) {
  selectedLayers.value = data

  if (data && Array.isArray(data) && data.length > 0) {
    const first = data[0]

    layerActionsState.highlight = first.highlighted
    layerActionsState.mirrored = first.mirrored
    layerActionsState.mirrorFlipped = first.mirrorFlipped
  }
}

const closeActionDrawer = () => {
  if (currentActionDrawerLevel.value && currentActionDrawerLevel.value === "requestReproject") {
    const res = lua.extensions.ui_liveryEditor_layerAction.performAction("cancelReproject")
    res.then(() => {})
    currentActionDrawerLevel.value = null
  }

  lua.extensions.ui_liveryEditor_selection.clearSelection()
}

function handleDrawerBack() {
  if (!currentActionDrawerLevel.value) {
    closeActionDrawer()
  } else {
    actionDrawer.value.goBack()
  }
}

function onFocusedLayer(layer) {
  focusedLayer.value = layer
}

function onSelect(layer) {
  lua.extensions.ui_liveryEditor_selection.select(layer.id, true)
}

function onMultiSelect(layer) {
  if (rootStore.selectMode === "multi") return
  rootStore.selectMode = "multi"
  rootStore.toggleSelection(layer.id, false)
}

const toggleEnabled = () => {
  if (focusedLayer.value) {
    lua.extensions.ui_liveryEditor_layerAction.toggleEnabledByLayerUid(focusedLayer.value.uid)
  } else if (selectedLayers.value && selectedLayers.value.length > 0) {
    const layer = selectedLayers.value[0]
    const res = lua.extensions.ui_liveryEditor_layerAction.performAction("enabled")
    res.then(luaRes => {
      layer.enabled = luaRes
    })
  }
}

const handleContext = () => {
  console.log("handleContext")
  if (isReprojectActive.value) {
    console.log("handleContext: reproject")
    const res = lua.extensions.ui_liveryEditor_layerAction.performAction("reproject")
    res.then(() => {
      isReproject = true
      isReprojectActive.value = false
      actionDrawer.value.goBack()
    })
  } else if (!popupSettings.value) {
    console.log("handleContext: addDecal")
    addDecal()
  }
}

const handleAction2 = () => {
  if (isReprojectActive.value) return false

  toggleEnabled()
}
</script>

<style lang="scss" scoped>
$infobarHeight: 4rem;

.decals-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;
  margin-bottom: $infobarHeight;
}

.decals-content-shell {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.main-view-content {
  position: relative;
  display: flex;
  justify-content: flex-start;
  flex-grow: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layers-manager {
  max-width: 22rem;
}

.actions-drawer {
  padding: 0 0.5rem;
  align-self: flex-end;

  // Room for tile focus frame (0.25rem offset + 2px border)
  $focus-frame-inset: 0.375rem;

  :deep(.list-content.list-layout-ribbon) {
    padding-block: $focus-frame-inset;
    padding-inline-end: $focus-frame-inset;
  }

  :deep(.list-content.list-layout-ribbon > .list-items) {
    overflow: visible;
  }
}

.popup-settings {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
