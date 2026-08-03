<template>
  <LayoutMenu
    class="pause-layout pause-photomode-shell"
    v-show="!isPhotomodeUiHidden"
    nav-scope="pause-root"
    :nav-active="false"
    :nav-auto-focus="false"
    :tabs="menuTabs"
    :breadcrumbs="breadcrumbItems"
    v-model:selectedTab="selectedTabIndex"
    :heading="pauseHeadingText"
    v-bng-ui-nav-label:tab_l="tabLeftHintLabel"
    v-bng-ui-nav-label:tab_r="tabRightHintLabel"
    v-bng-ui-nav-label:action_3="hideUiHintLabel"
    v-bng-on-ui-nav:action_3.down="onHideUiHoldStart"
    v-bng-on-ui-nav:action_3.up="onHideUiHoldEnd"
    @before-navigate="onBeforeNavigate"
    @tab-change="onTabChange"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
  >
      <template #topbar-right>
        <div class="system-info">
          <Background />
          <PauseButton inline />
          <div class="system-time">{{ currentTime }}</div>
          <BngServiceProvidersUser
            class="username"
            v-bng-blur
            :service-providers="SysInfo.serviceProviders.value"
            :service-providers-online="SysInfo.serviceProvidersOnline.value"
          />
        </div>
      </template>

      <template #buttons-left v-if="pauseRailHasActions">
        <div class="pause-left-rails" v-bng-blur>
          <PauseRail :groups="layoutRail" />
        </div>
      </template>
      <PhotomodeCore ref="photomodeCore" />
  </LayoutMenu>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { $translate } from "@/services/translation"
import { useRoute } from "vue-router"
import { vBngBlur, vBngUiNavLabel, vBngOnUiNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { BngServiceProvidersUser } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import SysInfo from "@/services/sysInfo"
import { useRouteDataStore } from "@/services/routeData"
import PauseButton from "@/common/modules/pause/components/pauseButton.vue"
import PauseRail from "../../components/PauseRail.vue"
import PhotomodeCore from "./PhotomodeCore.vue"

defineOptions({ name: "PausePhotomodeShell" })

const route = useRoute()
const routeDataStore = useRouteDataStore()
const bngVue = window.bngVue || { gotoGameState() {} }

const photomodeCore = ref(null)
const currentTime = ref("")
const selectedTabIndex = ref(0)
let currentTimeIntervalId

const isPhotomodeUiHidden = computed(() => photomodeCore.value?.isPhotomodeUiHidden ?? false)
const panelOpen = computed(() => photomodeCore.value?.panelOpen ?? false)
const isPreviewSurface = computed(() => photomodeCore.value?.isPreviewSurface ?? false)
const isGallerySurface = computed(() => photomodeCore.value?.isGallerySurface ?? false)
const isSettingsSurface = computed(() => photomodeCore.value?.isSettingsSurface ?? false)

const layoutMenuData = computed(() => routeDataStore.data?.layoutMenu || {})
const layoutHeader = computed(() => layoutMenuData.value.header || {})
const layoutTopbar = computed(() => layoutMenuData.value.topbar || {})
const layoutRail = computed(() => Array.isArray(layoutMenuData.value.content?.rail) ? layoutMenuData.value.content.rail : [])
const pauseRailHasActions = computed(() => layoutRail.value.some(group => Array.isArray(group?.actions) && group.actions.some(action => action?.visible !== false)))

const menuTabs = computed(() => (layoutTopbar.value.tabs || [])
  .filter(tab => tab?.visible !== false)
  .map((tab, index) => ({
    ...tab,
    index,
    heading: tab.label || tab.heading || tab.routeName || `Tab ${index + 1}`,
  })))
const routeBreadcrumbItems = computed(() => Array.isArray(layoutHeader.value.breadcrumbs) ? layoutHeader.value.breadcrumbs : [])
const normalizedBreadcrumbItems = computed(() => {
  const items = routeBreadcrumbItems.value.map(item => ({ ...item }))
  while (items.length > 1 && isSameBreadcrumbItem(items.at(-1), items.at(-2))) {
    items.pop()
  }
  return items
})
const photomodeHeadingBase = computed(() =>
  layoutHeader.value.heading || normalizedBreadcrumbItems.value.at(-1)?.label || $translate.instant("ui.photomode.title")
)
const visibleSurfaceLabel = computed(() => {
  if (isGallerySurface.value) return $translate.instant("ui.photomode.gallery.title")
  if (isPreviewSurface.value) return $translate.instant("ui.photomode.surfacePreview")
  if (isSettingsSurface.value) return $translate.instant("ui.photomode.surfaceSettings")
  return ""
})
const activeTabHeading = computed(() => photomodeCore.value?.activeTabHeading || "")
const breadcrumbItems = computed(() => {
  const items = normalizedBreadcrumbItems.value.map((item, index, allItems) => ({
    ...item,
    breadcrumbSource: "route",
    surfaceBackAction: panelOpen.value === true && allItems.length > 1 && index === allItems.length - 1
      ? (isGallerySurface.value ? "close-gallery" : (isPreviewSurface.value ? "close-preview" : "close-settings"))
      : null,
  }))

  if (visibleSurfaceLabel.value) {
    items.push({
      label: visibleSurfaceLabel.value,
      breadcrumbSource: "synthetic-panel-leaf",
    })
  }

  return items
})
const pauseHeadingText = computed(() => {
  if (isGallerySurface.value) return visibleSurfaceLabel.value
  if (!panelOpen.value || !activeTabHeading.value) return photomodeHeadingBase.value
  return `${photomodeHeadingBase.value} - ${activeTabHeading.value}`
})
const tabLeftHintLabel = computed(() =>
  layoutTopbar.value.hints?.tabLeft || $translate.instant("ui.pause.hints.previousTab")
)
const tabRightHintLabel = computed(() =>
  layoutTopbar.value.hints?.tabRight || $translate.instant("ui.pause.hints.nextTab")
)
const hideUiHintLabel = computed(() =>
  isGallerySurface.value ? null : $translate.instant("ui.photomode.holdHideUi")
)

watch(
  () => layoutTopbar.value.selectedTab,
  selected => {
    if (typeof selected === "number") {
      selectedTabIndex.value = selected
    }
  },
  { immediate: true }
)

function onBeforeNavigate(event) {
  if (!event || event.type !== "tab-change") return
  const nextIndex = event.tab?.index
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || nextTab.enabled === false) {
    event.preventDefault()
  }
}

async function onTabChange(tab) {
  const nextIndex = tab?.index ?? selectedTabIndex.value
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || !nextTab.enabled || !nextTab.routeName) return
  if (route.name === nextTab.routeName) return
  // await bngVue.gotoGameState(nextTab.routeName)
}

async function onBreadcrumbClick(item) {
  if (!item) return
  if (item.surfaceBackAction === "close-preview") {
    photomodeCore.value?.closePreview("breadcrumb")
    return
  }
  if (item.surfaceBackAction === "close-gallery") {
    photomodeCore.value?.closeGallery("breadcrumb")
    return
  }
  if (item.surfaceBackAction === "close-settings") {
    photomodeCore.value?.closeSettings("breadcrumb")
    return
  }
  if (!item.routeName) return
  if (item.params) {
    await bngVue.gotoGameState(item.routeName, { params: item.params })
    return
  }
  await bngVue.gotoGameState(item.routeName)
}

function onBreadBack() {
  return photomodeCore.value?.onBreadBack()
}

function onHideUiHoldStart() {
  return photomodeCore.value?.onHideUiHoldStart()
}

function onHideUiHoldEnd() {
  return photomodeCore.value?.onHideUiHoldEnd()
}

function isSameBreadcrumbItem(leftItem, rightItem) {
  if (!leftItem || !rightItem) return false
  return leftItem.label === rightItem.label && leftItem.routeName === rightItem.routeName
}

function updateCurrentTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

onMounted(() => {
  updateCurrentTime()
  currentTimeIntervalId = window.setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (currentTimeIntervalId) window.clearInterval(currentTimeIntervalId)
})
</script>

<style lang="scss" scoped>
.pause-photomode-shell {
  .pause-left-rails,
  .pause-right-rails {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pause-left-rails {
    border-radius: var(--bng-corners-2);
    background-color: var(--bng-black-6);
  }

  .system-info {
    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-enabled-opacity: 0.6;
    --bng-bg-border-radius: var(--bng-corners-2);
    --bng-bg-border-width: 0;

    display: inline-flex;
    align-items: center;
    gap: 1em;
    color: var(--bng-off-white);
    pointer-events: auto;
    user-select: none;
    align-self: flex-start;
    font-size: 1em;
    height: 2.5em;
    padding: 0 1em 0 0;
    position: relative;
    isolation: isolate;
    z-index: 2;

    .system-time {
      font-family: var(--fnt-mono);
      font-size: 1.25em;
      font-weight: 200;
      padding-top: 0.2em;
    }

    .username {
      display: inline-flex;
      align-items: center;
      gap: 0.25em;
    }
  }
}
</style>
