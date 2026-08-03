<template>
  <LayoutMenu
    class="pause-tab-combined-layout"
    nav-scope="pause-root"
    :nav-active="false"
    :nav-auto-focus="layoutNavAutoFocus"
    :nav-options="pauseRootNavOptions"
    :tabs="menuTabs"
    :breadcrumbs="breadcrumbItems"
    v-model:selectedTab="selectedTabIndex"
    :heading="pauseHeadingText"
    v-bng-ui-nav-label:tab_l="tabLeftHintLabel"
    v-bng-ui-nav-label:tab_r="tabRightHintLabel"
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

    <BngCard
      v-bng-scoped-nav="{
        scopeId: 'menu-content-card-1',
        type: SCOPE_TYPES.CONTAINER,
        activateBehavior: ACTIVATE_BEHAVIORS.containsNavigable,
        bubbleWhitelistEvents: PAUSE_BUBBLE_EVENTS,
      }"
      bng-scoped-nav-autofocus
      layered-background
      :class="['pause-tab-combined-main-card', mainCardClass]"
      v-bng-blur
    >
      <div class="pause-tab-combined-main-panel">
        <div
          v-for="element in mainPanelResolvedContent"
          :key="element.key"
          class="pause-content-item"
        >
          <BngCardHeading v-if="element.type === 'title'" type="ribbon">
            {{ $tt(element.text || element.title || element.id) }}
          </BngCardHeading>
          <div v-else-if="element.type === 'text'" class="pause-content-text">
            {{ $tt(element.text || element.description || "") }}
          </div>
          <component
            v-else-if="element.type === 'component' && element.resolvedComponent"
            :is="element.resolvedComponent"
            ref="mainComponentRefs"
            v-bind="element.resolvedProps"
            class="pause-content-component"
            @tab-heading-change="onConfigurationTabHeadingChange"
          />
        </div>
        <div v-if="!mainPanelResolvedContent.length" class="pause-empty-content">
          <span v-if="routeDataStore.status === 'error'">
            Error occured while loading the route.<br />
            {{ routeDataStore.error }}
          </span>
          <span v-else-if="routeDataStore.status === 'mounted-ready'">
            No layout data was received from the router.
          </span>
          <span v-else>
            {{ $t("ui.common.loading.short") }}
          </span>
        </div>
      </div>
    </BngCard>

    <template #side-tasklist v-if="tasklistStore.hasItems && tasklistStore.visibleIn.vehicleConfiguration">
      <div class="pause-tasklist">
        <component :is="tasklist" class="pause-tasklist-content" />
      </div>
    </template>
  </LayoutMenu>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, ref, unref, watch } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import { BngCard, BngCardHeading, BngServiceProvidersUser } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { vBngBlur, vBngScopedNav, vBngUiNavLabel } from "@/common/directives"
import SysInfo from "@/services/sysInfo"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { ACTIVATE_BEHAVIORS } from "@/services/scopedNav"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import { lua } from "@/bridge"
import PauseButton from "@/common/modules/pause/components/pauseButton.vue"
import { tasklist } from "@/modules/apps"
import { useTasksStore } from "@/services/tasklistStore"
import * as pauseContent from "../pauseContent.js"

defineOptions({ name: "PauseVehicleConfigurationShell" })

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))
const route = useRoute()
const routeDataStore = useRouteDataStore()
const tasklistStore = useTasksStore()
const bngVue = window.bngVue || { gotoGameState() {} }

const PAUSE_BUBBLE_EVENTS = Object.freeze(["tab_l", "tab_r", "menu"])

const currentTime = ref("")
const selectedTabIndex = ref(0)
const mainComponentRefs = ref([])
const configurationTabHeading = ref("Parts")
const lastMountedAckRouteName = ref("")
let currentTimeIntervalId
let mountedAckRequestId = 0

const layoutMenuData = computed(() => routeDataStore.data?.layoutMenu || {})
const layoutHeader = computed(() => layoutMenuData.value.header || {})
const layoutTopbar = computed(() => layoutMenuData.value.topbar || {})
const layoutContent = computed(() => layoutMenuData.value.content || {})
const layoutNav = computed(() => layoutMenuData.value.nav || {})
const mainPanelContent = computed(() => layoutContent.value.main || [])
const routeMainCardClasses = computed(() => {
  const classValue = layoutContent.value.data?.mainCardClass
  if (!classValue) return []
  if (Array.isArray(classValue)) return classValue.filter(Boolean)
  return [classValue]
})
const breadcrumbItems = computed(() => layoutHeader.value.breadcrumbs || [])
const pauseHeadingText = computed(() => {
  const heading = layoutHeader.value.heading || "Vehicle Configuration"
  if (!configurationTabHeading.value) return heading
  return `${heading} - ${configurationTabHeading.value}`
})
const tabLeftHintLabel = computed(() => layoutTopbar.value.hints?.tabLeft || "Previous Tab")
const tabRightHintLabel = computed(() => layoutTopbar.value.hints?.tabRight || "Next Tab")
const layoutNavAutoFocus = computed(() => layoutNav.value.autoFocus !== false)
const pauseRootNavOptions = computed(() => ({
  bubbleWhitelistEvents: PAUSE_BUBBLE_EVENTS,
}))
const mainCardClass = computed(() => ({
  "menu-content-card-1--vehicle-configuration-combined": true,
  ...Object.fromEntries(routeMainCardClasses.value.map(className => [className, true])),
}))

function isPauseMultiplayerRouteName(routeName) {
  return typeof routeName === "string" && routeName.startsWith("pause.multiplayer")
}

function shouldHidePauseTab(tab) {
  if (!isSimpleMenu.value) return false
  const routeName = tab?.screenId || tab?.routeName
  return isPauseMultiplayerRouteName(routeName)
}

function onConfigurationTabHeadingChange(heading) {
  configurationTabHeading.value = heading || ""
}

const menuTabs = computed(() => (layoutTopbar.value.tabs || [])
  .filter(tab => tab?.visible !== false)
  .filter(tab => !shouldHidePauseTab(tab))
  .map((tab, index) => {
    const vueRouteName = tab.screenId || tab.routeName
    return {
      ...tab,
      routeName: vueRouteName,
      luaRouteName: tab.routeName,
      index,
      heading: tab.label || tab.heading || tab.routeName || `Tab ${index + 1}`,
    }
  }))

watch(
  () => layoutTopbar.value.selectedTab,
  selected => {
    if (typeof selected === "number") {
      selectedTabIndex.value = selected
    }
  },
  { immediate: true }
)

watch(
  () => [isSimpleMenu.value, route.name],
  ([simpleMenuEnabled, routeName]) => {
    if (!simpleMenuEnabled) return
    if (!isPauseMultiplayerRouteName(routeName)) return
    void bngVue.gotoGameState("pause")
  },
  { immediate: true }
)

function buildResolvedPauseElementTree(panelName, elements) {
  return (Array.isArray(elements) ? elements : []).map((element, index) => {
    const type = element?.type
    const componentName = String(element?.componentName || "")
    const resolvedComponent = type === "component" ? (pauseContent[componentName] || null) : null
    const resolvedProps = element?.props && typeof element.props === "object" ? { ...element.props } : {}
    return {
      ...element,
      resolvedComponent,
      resolvedProps,
      key: element?.id || `${panelName}-${index}-${type || "unknown"}-${componentName || element?.text || ""}`,
    }
  })
}

const mainPanelResolvedContent = computed(() => buildResolvedPauseElementTree("main", mainPanelContent.value))

function onBeforeNavigate(event) {
  if (!event || event.type !== "tab-change") return
  if (event.sync === true) return
  const nextIndex = event.tab?.index
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || nextTab.enabled === false) {
    event.preventDefault()
  }
}

async function onTabChange(tab, prevTab, meta) {
  if (meta?.sync === true) return
  const nextIndex = tab?.index ?? selectedTabIndex.value
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || !nextTab.enabled || !nextTab.routeName) return
  if (route.name === nextTab.routeName) return
  await bngVue.gotoGameState(nextTab.luaRouteName)
}

async function onBreadcrumbClick(item) {
  if (!item || !item.routeName) return
  if (item.params) {
    await bngVue.gotoGameState(item.routeName, { params: item.params })
    return
  }
  await bngVue.gotoGameState(item.routeName)
}

async function onBreadBack() {
  await lua.extensions.ui_router.back()
}

function updateCurrentTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (result?.success) {
    window.__luaRouter__._pendingCanonicalRoute = null
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
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "enter-ready") return
    if (!routeName || routeName !== route.name) return
    lastMountedAckRouteName.value = ""
    await notifyRouteMountedWhenReady()
  }
)

onMounted(() => {
  updateCurrentTime()
  currentTimeIntervalId = window.setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  mountedAckRequestId += 1
  if (currentTimeIntervalId) window.clearInterval(currentTimeIntervalId)
})
</script>

<style scoped lang="scss">
.pause-tab-combined-layout {
  .pause-tab-combined-main-card {
    --bng-bg-border-radius: var(--bng-corners-2);
    --bng-bg-border-width: 0;
    --bng-card-content-bg: var(--bng-cool-gray-900);
    --bng-card-content-bg-opacity: 0.9;

    flex: 0 0 auto;
    min-height: 0;
  }

  .pause-tab-combined-main-card {
    height: 100%;

    :deep(.card-cnt) {
      flex: 1 1 auto;
      height: 100%;
      min-height: 100%;
    }

    &.menu-content-card-1--wide {
      width: clamp(24rem, 28vw, 38rem);
    }
  }
}

.pause-tab-combined-main-panel {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

.pause-content-item,
.pause-content-component {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.pause-tasklist {
  flex: 0 0 30rem;
  width: 30rem;
  min-width: 0;
}

.pause-tasklist-content {
  min-height: 0;
}

.pause-content-text {
  font-size: 0.9rem;
  color: rgba(var(--bng-off-white-rgb), 0.85);
}

.pause-empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 100%;
  opacity: 0.75;
  padding: 0.5rem 0;
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
</style>
