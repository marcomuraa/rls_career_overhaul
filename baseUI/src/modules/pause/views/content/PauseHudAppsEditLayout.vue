<template>
  <section
    ref="rootRef"
    v-bng-scoped-nav="scopeConfig"
    v-bng-on-ui-nav:menu="menuNavHandler"
    v-bng-on-ui-nav:action_3="cockpitToggleHandler"
    v-bng-on-ui-nav:action_3.up="cockpitToggleReleaseHandler"
    class="pause-hud-apps-edit-layout"
    tabindex="-1"
  >
    <div
      v-if="!transformMode"
      class="pause-hud-apps-edit-layout__edit-catcher"
      @click="enterEditFromCatcher"
    ></div>

    <section v-if="!transformMode" class="pause-hud-apps-card pause-hud-apps-edit-layout__main-card">
      <Background />
      <div class="pause-hud-apps-edit-layout__main-scroll">
        <div class="pause-hud-apps-edit-layout__main-content">
          <HudAppsLayerList
            class="pause-hud-apps-edit-layout__list"
            :rows="layerRows"
            :loading="loading"
            :autofocus-id="selectedAppId"
            @select="enterTransformMode"
            @delete="confirmDeleteRow"
            @hover="onLayerHover"
          >
            <template #before-rows>
              <Button
                class="pause-hud-apps-edit-layout__add-row"
                :bng-scoped-nav-autofocus="autofocusAddButton ? 'true' : null"
                @click="openSelector"
              >
                <template #prefix>
                  <BngIcon :type="icons.plus" />
                </template>
                {{ $t("ui.appselect.add") }}
              </Button>
            </template>
          </HudAppsLayerList>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { BngIcon, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import Background from "@/common/components/utility/background.vue"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { UI_EVENT_GROUPS } from "@/services/uiNav"
import { SCROLL_EVENT_H, SCROLL_EVENT_V } from "@/services/crossfire"
import { luaRouterScopedNavBack } from "@/services/scopedNav/api"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"
import { lua } from "@/bridge"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore.js"
import { buildLayerRowModels, buildLayoutBrowserItems } from "@/modules/apps/hudAppsViewModels.js"
import HudAppsLayerList from "./HudAppsLayerList.vue"

defineOptions({ name: "PauseHudAppsEditLayout" })

const props = defineProps({
  requestBack: {
    type: Function,
    default: null,
  },
})

const route = useRoute()
const appLayoutsStore = useAppLayoutsStore()
const { apps, currentLayout, currentType, layouts, dataAvailable, dirty, loading, selectedAppId, hoveredAppId } = storeToRefs(appLayoutsStore)
const transformMode = computed(() => route.name === "pause.hudApps.editlayout.transform")
const layoutActionsMenu = ref(null)
const rootRef = ref(null)

const scopeConfig = {
  scopeId: "hudapps-edit-layout",
  type: "container",
  preferAutoFocus: true,
  trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS,
  canBubbleEvent: canBubbleScopeEvent,
  canDeactivate: onBeforeScopeDeactivate,
}

const menuNavHandler = computed(() => (transformMode.value ? onTransformMenu : onLayerListMenu))
const cockpitToggleHandler = computed(() => (transformMode.value ? onCockpitToggleNav : null))
const cockpitToggleReleaseHandler = computed(() => (transformMode.value ? onCockpitToggleRelease : null))

let cockpitTogglePressed = false

function onLayerListMenu() {
  if (props.requestBack) {
    void props.requestBack()
  }
  return false
}

function canBubbleScopeEvent(event) {
  const name = event?.detail?.name
  if (name === "menu") return false
  if (name === SCROLL_EVENT_H || name === SCROLL_EVENT_V) return true
  return UI_EVENT_GROUPS.navigation.includes(name)
}

function onTransformMenu() {
  void luaRouterScopedNavBack("hudapps-edit-layout")
  return false
}

function onCockpitToggleNav() {
  if (cockpitTogglePressed) return false
  cockpitTogglePressed = true
  const id = selectedAppId.value
  if (!id) return false
  const item = apps.value.find(a => a.id === id)
  if (!item) return false
  appLayoutsStore.setAppSettings(id, { noCockpit: !item?.settings?.noCockpit })
  return false
}

function onCockpitToggleRelease() {
  cockpitTogglePressed = false
  return false
}

const currentLayoutItem = computed(() => {
  const layout = currentLayout.value
  if (!layout) return null
  const rows = buildLayoutBrowserItems(layouts.value, {
    currentLayoutFilename: layout.filename || null,
    currentLayoutType: currentType.value || null,
    selectedLayoutFilename: layout.filename || null,
  })
  if (layout.filename) return rows.find(row => row.filename === layout.filename) || null
  if (currentType.value) return rows.find(row => row.type === currentType.value) || null
  return null
})

const layerRows = computed(() => buildLayerRowModels(apps.value).map(row => ({
  ...row,
  hovered: row.id === hoveredAppId.value,
})))

const autofocusAddButton = computed(() => !selectedAppId.value || !apps.value.some(a => a.id === selectedAppId.value))

function leaveTransformState() {
  appLayoutsStore.setDimUnselectedApps(false)
  appLayoutsStore.hoverApp(null)
  appLayoutsStore.setOverlayEditingEnabled(false)
}

async function openSelector() {
  leaveTransformState()
  await appLayoutsStore.setEditing(false, { preserveSnapshot: true })
  await lua.extensions.ui_router.navigate("pause.hudApps.selector")
}

function openLayoutActions(event) {
  leaveTransformState()
  const item = currentLayoutItem.value
  if (!item) return
  layoutActionsMenu.value?.open(item, event?.currentTarget || document.activeElement)
}

async function enterTransformMode(row) {
  if (!row?.id) return
  appLayoutsStore.selectApp(row.id)
  await lua.extensions.ui_router.navigate("pause.hudApps.editlayout.transform")
}

async function enterEditFromCatcher() {
  const targetId = selectedAppId.value || apps.value[0]?.id
  if (!targetId) return
  await enterTransformMode({ id: targetId })
}

function onBeforeScopeDeactivate() {
  if (!dirty.value || transformMode.value) return true
  if (props.requestBack) {
    void props.requestBack()
  }
  return false
}

function onLayerHover(row) {
  appLayoutsStore.hoverApp(row?.id || null)
}

function rowDeleteName(row) {
  const token = row?.displayNameToken
  if (token) {
    const translated = $translate.instant(token)
    if (translated && translated !== token) return translated
  }
  return row?.displayNameFallback || row?.appName || $translate.instant("ui.apps.selector.fallbackAppName")
}

async function confirmDeleteRow(row) {
  if (!row?.id) return
  const deletedIndex = apps.value.findIndex(a => a.id === row.id)
  const confirmed = await openConfirmation(
    $translate.instant("ui.hudApps.removeAppTitle"),
    $translate.instant("ui.hudApps.removeAppMessage", { name: rowDeleteName(row) })
  ).catch(() => false)
  if (!confirmed) return
  await appLayoutsStore.removeApp(row.id)
  await nextTick()
  focusAfterDelete(deletedIndex)
}

function focusAfterDelete(deletedIndex) {
  const list = apps.value
  if (list.length > 0) {
    const targetIndex = Math.min(Math.max(deletedIndex, 0), list.length - 1)
    const targetId = list[targetIndex]?.id
    if (targetId && focusRowById(targetId)) return
  }
  focusAddButton()
}

function focusRowById(id) {
  const root = rootRef.value
  if (!root) return false
  const el = Array.from(root.querySelectorAll(".hud-apps-layer-row")).find(r => r.dataset.appId === String(id))
  if (!el) return false
  el.focus()
  el.scrollIntoView({ block: "center", inline: "nearest" })
  return true
}

function focusAddButton() {
  const el = rootRef.value?.querySelector(".pause-hud-apps-edit-layout__add-row")
  if (!el) return
  el.focus()
  el.scrollIntoView({ block: "center", inline: "nearest" })
}

watch(transformMode, active => {
  appLayoutsStore.setOverlayEditingEnabled(active)
  appLayoutsStore.setDimUnselectedApps(active)
  if (!active) appLayoutsStore.hoverApp(null)
}, { immediate: true })

onMounted(async () => {
  if (!dataAvailable.value) {
    await appLayoutsStore.loadInitialData()
  }
  await appLayoutsStore.setEditing(true)
})

onBeforeUnmount(() => {
  leaveTransformState()
  appLayoutsStore.setEditing(false)
})
</script>

<style scoped lang="scss">
.pause-hud-apps-edit-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  min-width: 22em;
  min-height: 0;
  height: 100%;
  color: var(--bng-off-white);
}

.pause-hud-apps-card {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--bng-corners-2);

  > :not(.bng-background) {
    position: relative;
    z-index: 1;
  }
}

.pause-hud-apps-edit-layout__edit-catcher {
  position: fixed;
  top: 5em;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  pointer-events: auto;
}

.pause-hud-apps-edit-layout__main-card {
  position: relative;
  z-index: 1;
  width: clamp(24rem, 26vw, 36rem);
  max-height: 100%;
}

.pause-hud-apps-edit-layout__main-scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.pause-hud-apps-edit-layout__main-content {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  min-width: 0;
  min-height: 100%;
  padding: 0.25em;
}

.pause-hud-apps-edit-layout__layout-actions {
  --pause-rail-button-gap: 0.4em;
  --pause-rail-button-label-opacity: 1;

  align-self: flex-start;
  font-size: 0.85em;
}

.pause-hud-apps-edit-layout__list {
  min-height: 0;
}

.pause-hud-apps-edit-layout__add-row {
  --bng-content-align: center;
  --bng-content-justify: center;
  --bng-button-min-width: 0;
  --bng-button-max-width: none;
  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-900);
  --bng-bg-focus: var(--bng-orange-550);
  --bng-bg-border-enabled: var(--bng-cool-gray-400);
  --bng-bg-border-hover: var(--bng-cool-gray-200);
  --bng-bg-border-active: var(--bng-cool-gray-600);
  --bng-bg-border-focus: var(--bng-orange-550);
  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.125em;
  --bng-bg-focus-opacity: 1;
  --bng-bg-enabled-opacity: 0.25;
  --bng-bg-hover-opacity: 1;
  --bng-bg-active-opacity: 1;
  gap: 0.25em;
}

</style>
