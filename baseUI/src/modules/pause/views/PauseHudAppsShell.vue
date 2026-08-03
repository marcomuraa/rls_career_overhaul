<template>
  <LayoutMenu
    :class="[
      'pause-layout',
      'pause-hud-apps-shell',
      {
        'pause-hud-apps-shell--transform': isTransformRoute,
        'pause-hud-apps-shell--app-adjusting': layoutContentLocked,
        'pause-hud-apps-shell--peeking': previewPeeking,
      },
    ]"
    nav-scope="pause-root"
    :nav-active="false"
    :nav-auto-focus="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="hideBreadcrumbLastItem"
    :heading="pauseHeadingText"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
  >
    <template #topbar-right>
      <div v-if="!isEditLayout" class="system-info">
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

    <component
      :is="activeContentComponent"
      v-bind="activeContentProps"
    />
  </LayoutMenu>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { LayoutMenu } from "@/common/layouts"
import { BngServiceProvidersUser } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { vBngBlur } from "@/common/directives"
import { $translate } from "@/services"
import { openConfirmation, yesNoButtons } from "@/services/popup"
import SysInfo from "@/services/sysInfo"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { lua } from "@/bridge"
import PauseButton from "@/common/modules/pause/components/pauseButton.vue"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore.js"
import PauseHudAppsLayoutBrowser from "./content/PauseHudAppsLayoutBrowser.vue"
import PauseHudAppsEditLayout from "./content/PauseHudAppsEditLayout.vue"

defineOptions({ name: "PauseHudAppsShell" })

const routeContentComponents = Object.freeze({
  "pause.hudApps": PauseHudAppsLayoutBrowser,
  "pause.hudApps.editlayout": PauseHudAppsEditLayout,
  "pause.hudApps.editlayout.transform": PauseHudAppsEditLayout,
})
const editFlowRoutes = new Set([
  "pause.hudApps.editlayout",
  "pause.hudApps.editlayout.transform",
  "pause.hudApps.selector",
])

const route = useRoute()
const routeDataStore = useRouteDataStore()
const appLayoutsStore = useAppLayoutsStore()
const { apps, currentLayout, dirty, layouts, selectedAppId, previewPeeking } = storeToRefs(appLayoutsStore)
const currentTime = ref("")
const lastMountedAckRouteName = ref("")
let currentTimeIntervalId
let mountedAckRequestId = 0
let guardedNavigationInProgress = false

const canonicalBreadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])
const currentLayoutTitle = computed(() => currentLayout.value?.title
  || currentLayout.value?.type
  || currentLayout.value?.filename
  || $translate.instant("ui.hudApps.unnamedLayout"))
const selectedApp = computed(() => apps.value.find(app => app.id === selectedAppId.value) || null)
const layoutCount = computed(() => Array.isArray(layouts.value) ? layouts.value.length : 0)
const layoutsHeadingLabel = computed(() => `${$translate.instant("ui.hudApps.layouts")} (${layoutCount.value})`)
const selectedAppDisplayName = computed(() => {
  const app = selectedApp.value
  const token = app?.app?.name
  if (token) return $translate.instant(token)
  return app?.app?.appName || app?.appName || $translate.instant("ui.apps.selector.fallbackAppName")
})
const editLayoutDisplayLabel = computed(() => `${$translate.instant("ui.hudApps.editLayout")} - ${currentLayoutTitle.value}`)
const adjustAppDisplayLabel = computed(() => `${$translate.instant("ui.hudApps.adjustApp")} — ${selectedAppDisplayName.value}`)
const breadcrumbItems = computed(() => canonicalBreadcrumbItems.value.map(item => ({
  ...item,
  label: breadcrumbLabelForRoute(item),
})))
const pauseHeadingText = computed(() => headingLabelForRoute(route.name) || breadcrumbItems.value.at(-1)?.label || route.name || "")
const activeContentComponent = computed(() => routeContentComponents[route.name] || PauseHudAppsLayoutBrowser)
const activeContentProps = computed(() => isEditLayout.value ? { requestBack: requestGuardedBack } : {})
const hideBreadcrumbLastItem = computed(() => typeof route.name === "string" && route.name.startsWith("pause.hudApps"))
const isTransformRoute = computed(() => route.name === "pause.hudApps.editlayout.transform")
const isEditLayout = computed(() => route.name === "pause.hudApps.editlayout" || isTransformRoute.value)
const layoutContentLocked = computed(() => isTransformRoute.value)

function breadcrumbLabelForRoute(item) {
  if (item?.routeName === "pause.hudApps") return $translate.instant("ui.hudApps.layouts")
  if (item?.routeName === "pause.hudApps.editlayout") return $translate.instant("ui.hudApps.editLayout")
  if (item?.routeName === "pause.hudApps.editlayout.transform") return $translate.instant("ui.hudApps.adjustApp")
  return item?.label
}

function headingLabelForRoute(routeName) {
  if (routeName === "pause.hudApps") return layoutsHeadingLabel.value
  if (routeName === "pause.hudApps.editlayout") return editLayoutDisplayLabel.value
  if (routeName === "pause.hudApps.editlayout.transform") return adjustAppDisplayLabel.value
  return null
}

function isRouteDataForCurrentScreen(routeName) {
  if (!routeName) return false
  if (routeName === route.name) return true
  return routeDataStore.route?.screenId === route.name
}

async function onBreadcrumbClick(item) {
  if (!item?.routeName) return
  await requestGuardedNavigation(
    () => lua.extensions.ui_router.navigate(item.routeName, item.params),
    item.routeName
  )
}

async function onBreadBack() {
  await requestGuardedBack()
}

function shouldConfirmDirtyExit(targetRouteName = "") {
  if (!dirty.value) return false

  const currentRouteName = route.name
  if (!editFlowRoutes.has(currentRouteName)) return false

  if (targetRouteName) {
    return !editFlowRoutes.has(targetRouteName)
  }

  // Route BACK from editlayout leaves the editor. Other edit-flow subroutes
  // first return to editlayout and should not prompt yet.
  return currentRouteName === "pause.hudApps.editlayout"
}

function saveChangesButtons() {
  return [
    {
      label: $translate.instant("ui.hudApps.saveChanges.save"),
      value: "save",
      extras: { confirm: true, default: true },
    },
    {
      label: $translate.instant("ui.hudApps.saveChanges.discard"),
      value: "discard",
      extras: { destructive: true },
    },
    {
      label: $translate.instant("ui.common.cancel"),
      value: "cancel",
      extras: { cancel: true, outsideCancel: true },
    },
  ]
}

async function confirmDirtyEditExit(targetRouteName = "") {
  if (!shouldConfirmDirtyExit(targetRouteName)) return true
  if (guardedNavigationInProgress) return false
  guardedNavigationInProgress = true
  try {
    const choice = await openConfirmation(
      $translate.instant("ui.hudApps.saveChanges.title"),
      $translate.instant("ui.hudApps.saveChanges.message"),
      saveChangesButtons(),
    ).catch(() => "cancel")

    if (choice === "save") {
      const savedFilename = currentLayout.value?.filename || ""
      const savedType = currentLayout.value?.type || ""
      const saved = await appLayoutsStore.save()
      if (!saved) return false
      await promptUseAsCurrentIfNeeded(savedFilename, savedType)
      return true
    }

    if (choice === "discard") {
      return appLayoutsStore.discardDraft()
    }

    return false
  } finally {
    guardedNavigationInProgress = false
  }
}

async function promptUseAsCurrentIfNeeded(filename, type) {
  const api = lua.extensions.ui_appLayouts
  if (!api?.getCurrentLayout) return

  const current = await api.getCurrentLayout().catch(() => null)
  if (!current || typeof current !== "object") return
  const isCurrent = (filename && current.filename === filename) || (!filename && type && current.type === type)
  if (isCurrent) return

  const useAsCurrent = await openConfirmation(
    $translate.instant("ui.hudApps.useAsCurrent.title"),
    $translate.instant("ui.hudApps.useAsCurrent.message"),
    yesNoButtons({ defaultButton: "yes" }),
  ).catch(() => false)

  if (useAsCurrent) {
    await appLayoutsStore.setCurrentLayout(filename || type)
  }
}

async function requestGuardedNavigation(navigate, targetRouteName = "") {
  if (!await confirmDirtyEditExit(targetRouteName)) return false
  await navigate()
  return true
}

async function requestGuardedBack() {
  return requestGuardedNavigation(() => lua.extensions.ui_router.back())
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

  const luaRouter = window.__luaRouter__
  const canonicalRoute = luaRouter?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  if (!result?.success) return

  lastMountedAckRouteName.value = canonicalRoute
  if (luaRouter && luaRouter._pendingCanonicalRoute === canonicalRoute) {
    luaRouter._pendingCanonicalRoute = null
  }
  activateRouteTargetScope()
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
    if (!isRouteDataForCurrentScreen(routeName)) return
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
.pause-hud-apps-shell {
  transition: opacity 0.1s ease;

  :deep(.menu-header),
  :deep(.menu-heading),
  :deep(.layout-info-bar) {
    transition: opacity 0.12s ease;
  }

  &--transform {
    :deep(.menu-header),
    :deep(.menu-heading),
    :deep(.layout-info-bar) {
      opacity: 0.42;
    }

    :deep([data-breadcrumb-item]),
    :deep([data-info-bar-hint]) {
      pointer-events: none;
    }

    :deep(.menu-breadcrumbs) {
      pointer-events: none;
    }

    :deep([data-breadcrumb-back]),
    :deep(.menu-breadcrumbs [data-breadcrumb-back]),
    :deep([data-info-bar-hint][data-info-bar-hint-event="back"]) {
      pointer-events: auto;
    }
  }

  &--app-adjusting {
    :deep(.menu-screen),
    :deep(.menu-content),
    :deep(.menu-content > *) {
      pointer-events: none !important;
    }
  }

  &--peeking {
    opacity: 0.2;
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
