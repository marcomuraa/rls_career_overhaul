<template>
  <section
    v-bng-scoped-nav="{
      scopeId: 'hudapps-layout-browser',
      type: 'container',
      preferAutoFocus: true,
      bubbleWhitelistEvents: ['menu'],
    }"
    class="pause-hud-apps-layout-browser"
    tabindex="-1"
  >
    <section class="pause-hud-apps-card pause-hud-apps-layout-browser__catalog">
      <Background />
      <p class="pause-hud-apps-layout-browser__help">{{ $t("ui.hudApps.help.layouts") }}</p>
      <div class="pause-hud-apps-layout-browser__catalog-scroll" v-bng-ui-nav-scroll.force>
        <div class="pause-hud-apps-layout-browser__catalog-content">
          <FlatFileBrowser
            class="pause-hud-apps-layout-browser__browser"
            :items="browserItems"
            :loading="loading"
            :model-value="selectedLayoutKey"
            :autofocus-key="openAutofocusKey"
            use-hold
            use-double-click
            :loading-label="$t('ui.common.loading')"
            :empty-label="$t('ui.common.noData')"
            :empty-message="$t('ui.dashboard.appedit')"
            @focus-item="onPreviewItem"
            @hover-item="onPreviewItem"
            @clear-focus="clearPreviewItem"
            @hold-press="onHoldPress"
            @hold-release="onHoldRelease"
            @doubleclick="onDoubleClickUse"
            @action="onBrowserAction"
          />
        </div>
      </div>
      <HudAppsLayoutActionsMenu ref="layoutActionsMenu" />
    </section>

    <aside class="pause-hud-apps-card pause-hud-apps-layout-browser__preview-card">
      <Background />
      <HudAppsLayoutMinimap
        class="pause-hud-apps-layout-browser__preview"
        :title="previewTitle"
        :status="previewStatus"
        :models="minimapModels"
        :frame="viewportFrame"
      />

      <section class="pause-hud-apps-layout-browser__preview-list">
        <header class="pause-hud-apps-layout-browser__preview-list-header">
          <h3>{{ $t("ui.hudApps.appsInLayout") }}</h3>
          <span>{{ $t("ui.hudApps.appCount", { count: previewRows.length }) }}</span>
        </header>
        <p v-if="previewRows.length === 0" class="pause-hud-apps-layout-browser__preview-empty">
          {{ $t("ui.hudApps.noAppsInLayout") }}
        </p>
        <div v-else class="pause-hud-apps-layout-browser__preview-pills">
          <span
            v-for="row in previewRows"
            :key="row.key || row.id"
            class="pause-hud-apps-layout-browser__preview-pill"
          >
            {{ $tt(row.displayNameToken || row.displayNameFallback || row.appName || "ui.apps.selector.fallbackAppName") }}
          </span>
        </div>
      </section>
    </aside>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { FlatFileBrowser } from "@/common/modules/fileBrowser"
import Background from "@/common/components/utility/background.vue"
import { vBngScopedNav, vBngUiNavScroll } from "@/common/directives"
import { lua } from "@/bridge"
import { $translate } from "@/services"
import { debounce } from "@/utils/rateLimit"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore.js"
import { buildLayoutBrowserItems, buildLayerRowModels, buildLayoutMinimapModels } from "@/modules/apps/hudAppsViewModels.js"
import HudAppsLayoutMinimap from "./HudAppsLayoutMinimap.vue"
import HudAppsLayoutActionsMenu from "./HudAppsLayoutActionsMenu.vue"

defineOptions({ name: "PauseHudAppsLayoutBrowser" })

const appLayoutsStore = useAppLayoutsStore()
const { layouts, usedLayoutKey, dataAvailable, loading, uiAppList } = storeToRefs(appLayoutsStore)
const previewKey = ref("")
const viewportFrame = ref(null)
const openAutofocusKey = ref("") // open-time reveal target; stays fixed while "use" only mutates selectedLayoutKey
const layoutActionsMenu = ref(null)
let isEnteringEditFlow = false // keeps the chosen layout current on unmount instead of reverting the preview
const defaultActionLabel = $translate.instant("ui.hudApps.previewLayout")

// committed "used" layout, marked as Current (currentLayout diverges while previewing)
const usedLayout = computed(() =>
  layouts.value.find(l => l.filename === usedLayoutKey.value)
  || layouts.value.find(l => l.type === usedLayoutKey.value)
  || null
)

const selectedLayoutKey = computed(() =>
  usedLayout.value?.filename || usedLayout.value?.type || ""
)

const browserItems = computed(() => {
  const rows = buildLayoutBrowserItems(layouts.value, {
    currentLayoutFilename: usedLayout.value?.filename || null,
    currentLayoutType: usedLayout.value?.type || null,
    selectedLayoutFilename: usedLayout.value?.filename || null,
  })

  return rows.map(row => ({
    ...row,
    label: row.title || row.type || row.filename || $translate.instant("ui.hudApps.unnamedLayout"),
    subtitle: buildLayoutSubtitle(row),
    defaultAction: { label: defaultActionLabel },
    actions: buildLayoutActions(row),
  }))
})

const previewItem = computed(() => {
  if (previewKey.value) {
    const focused = browserItems.value.find(item => item.key === previewKey.value)
    if (focused) return focused
  }
  if (selectedLayoutKey.value) {
    const selected = browserItems.value.find(item => item.key === selectedLayoutKey.value)
    if (selected) return selected
  }
  return browserItems.value[0] || null
})

const previewTitle = computed(() => previewItem.value?.label || $translate.instant("ui.hudApps.layoutPreview"))
const previewStatus = computed(() => previewItem.value?.subtitle || "")

const EMPTY_PREVIEW = Object.freeze({ rows: [], models: [] })
const minimapCache = new Map()

watch([viewportFrame, uiAppList, layouts], () => minimapCache.clear())

const previewData = computed(() => {
  const item = previewItem.value
  const catalog = uiAppList.value
  const frame = viewportFrame.value
  void layouts.value // re-run when the layout set changes
  if (!item) return EMPTY_PREVIEW
  const cached = minimapCache.get(item.key)
  if (cached) return cached
  const apps = Array.isArray(item.layout?.apps) ? item.layout.apps : []
  const rows = buildLayerRowModels(apps, { uiAppList: catalog })
  const models = buildLayoutMinimapModels(rows, frame)
  const data = { rows, models }
  minimapCache.set(item.key, data)
  return data
})

const previewRows = computed(() => previewData.value.rows)
const minimapModels = computed(() => previewData.value.models)

function buildLayoutSubtitle(row) {
  const parts = []
  if (row.isCurrent) parts.push($translate.instant("ui.hudApps.layoutState.current"))
  if (row.isCustom) parts.push($translate.instant("ui.common.custom"))
  if (row.isDevOnly) parts.push($translate.instant("ui.hudApps.layoutState.devOnly"))
  return parts.join(" • ")
}

function buildLayoutActions(row) {
  const actions = []
  if (!row.isCurrent) {
    actions.push({
      key: "useLayout",
      label: "ui.hudApps.useLayout",
      uiEvent: "action_2",
      icon: "checkmark",
      showLabel: false,
    })
  }
  actions.push({
    key: "editLayout",
    label: "ui.hudApps.editLayout",
    uiEvent: "context",
    icon: "edit",
    showLabel: false,
  })
  actions.push({
    key: "layoutActions",
    label: "ui.hudApps.layoutActions",
    uiEvent: "action_4",
    icon: "listIndented",
    showLabel: false,
  })
  return actions
}

function updateViewportFrame() {
  if (typeof window === "undefined") {
    viewportFrame.value = null
    return
  }
  const width = Number(window.innerWidth)
  const height = Number(window.innerHeight)
  viewportFrame.value = width > 0 && height > 0
    ? { width, height }
    : null
}

// settle the preview target only after the cursor/focus lands
const applyPreviewKey = debounce(key => { previewKey.value = key }, 100)

function onPreviewItem(item) {
  applyPreviewKey(item?.key || "")
}

function clearPreviewItem() {
  applyPreviewKey.cancel()
  previewKey.value = ""
}

function layoutIdFor(item) {
  return item?.filename || item?.type || item?.layout || null
}

async function setCurrentLayoutFromItem(item) {
  const identifier = layoutIdFor(item)
  if (!identifier) return null
  return appLayoutsStore.setCurrentLayout(identifier)
}

// hold-to-peek
let peekHeld = false
const schedulePeek = debounce(() => { peekHeld && appLayoutsStore.setPreviewPeeking(true) }, 150)

function attachMouseRelease() {
  window.addEventListener("pointerup", onWindowRelease, true)
}

function detachMouseRelease() {
  window.removeEventListener("pointerup", onWindowRelease, true)
}

function onWindowRelease() {
  releasePeek()
}

function releasePeek() {
  peekHeld = false
  detachMouseRelease()
  schedulePeek.cancel()
  appLayoutsStore.setPreviewPeeking(false)
}

function onHoldPress(payload) {
  const item = payload?.item
  if (!item) return
  peekHeld = true
  if (payload?.mouse) attachMouseRelease()
  const identifier = layoutIdFor(item)
  const armPeek = () => { if (peekHeld) schedulePeek() }
  if (identifier) {
    appLayoutsStore.previewLayout(identifier).then(armPeek, armPeek)
  } else {
    armPeek()
  }
}

function onHoldRelease() {
  releasePeek()
}

// mouse double-click commits ("use") the layout; drop any peek first
async function onDoubleClickUse(payload) {
  const item = payload?.item
  if (!item) return
  releasePeek()
  const identifier = layoutIdFor(item)
  if (identifier) await appLayoutsStore.useLayout(identifier)
}

async function onBrowserAction(payload) {
  const item = payload?.item
  const key = payload?.action?.key
  if (!item || !key) return
  if (key === "useLayout") {
    const identifier = layoutIdFor(item)
    if (identifier) await appLayoutsStore.useLayout(identifier)
    return
  }
  if (key === "editLayout") {
    isEnteringEditFlow = true
    releasePeek()
    await setCurrentLayoutFromItem(item)
    await lua.extensions.ui_router.navigate("pause.hudApps.editlayout")
    return
  }
  if (key === "layoutActions") {
    layoutActionsMenu.value?.open(item, payload?.anchorEl || document.activeElement)
  }
}

onMounted(async () => {
  updateViewportFrame()
  if (typeof window !== "undefined") {
    window.addEventListener("resize", updateViewportFrame)
  }
  if (!dataAvailable.value) {
    await appLayoutsStore.loadInitialData()
  }
  await appLayoutsStore.setEditing(false)
  openAutofocusKey.value = selectedLayoutKey.value
})

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateViewportFrame)
  }
  applyPreviewKey.cancel()
  releasePeek()
  // revert transient preview to the used layout, unless entering the edit flow
  if (!isEnteringEditFlow) {
    appLayoutsStore.resetUsedLayout()
  }
})
</script>

<style scoped lang="scss">
.pause-hud-apps-layout-browser {
  display: flex;
  flex-flow: row nowrap;
  gap: 0.5em;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
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

.pause-hud-apps-layout-browser__catalog {
  width: clamp(24rem, 26vw, 36rem);
}

.pause-hud-apps-layout-browser__help {
  flex: 0 0 auto;
  margin: 0;
  padding: 0.6em 0.75em 0.4em;
  color: var(--bng-cool-gray-200);
  font-size: 0.82em;
  line-height: 1.35;
}

.pause-hud-apps-layout-browser__catalog-scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.pause-hud-apps-layout-browser__catalog-content {
  display: flex;
  min-width: 0;
  min-height: 100%;
  padding: 0.25em;
}

.pause-hud-apps-layout-browser__preview-card {
  --bng-bg-enabled-opacity: 0.6;
  align-self: start;
  width: 20em;
  max-height: 100%;
  gap: 0.5em;
  padding: 0.5em;
}

.pause-hud-apps-layout-browser__browser {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;

  :deep(.flat-file-browser-row-content .text) {
    min-height: 2.25em;
    justify-content: center;
  }

  :deep(.flat-file-browser-row-content .subtitle) {
    min-height: 1em;
  }
}

.pause-hud-apps-layout-browser__preview {
  min-width: 0;
}

.pause-hud-apps-layout-browser__preview-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 0.45em;
}

.pause-hud-apps-layout-browser__preview-list-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;

  h3 {
    margin: 0;
    font-size: 0.95em;
    font-weight: 600;
  }

  span {
    color: var(--bng-cool-gray-200);
    font-size: 0.8em;
  }
}

.pause-hud-apps-layout-browser__preview-pills {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  min-height: 0;
  gap: 0.25em;
  margin: 0;
  padding: 0;
}

.pause-hud-apps-layout-browser__preview-pill {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 0.22em 0.45em;
  border-radius: 999em;
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.55);
  color: var(--bng-off-white);
  font-size: 0.78em;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pause-hud-apps-layout-browser__preview-empty {
  margin: 0;
  padding: 0.5em;
  color: var(--bng-cool-gray-200);
  font-size: 0.85em;
}
</style>
