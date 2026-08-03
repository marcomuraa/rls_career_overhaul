<template>
  <LayoutMenu
    class="garage-photomode-shell pause-photomode-shell"
    v-show="!isPhotomodeUiHidden"
    nav-scope="pause-root"
    :nav-active="false"
    :nav-auto-focus="false"
    :show-topbar="breadcrumbItems.length > 0"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="showBreadcrumbBackButton"
    :heading="photomodeHeadingText"
    v-bng-on-ui-nav:action_4.down="onHideUiHoldStart"
    v-bng-on-ui-nav:action_4.up="onHideUiHoldEnd"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
  >
    <PhotomodeCore ref="photomodeCore" metadata-playback-exit-route-name="garage" />
  </LayoutMenu>
</template>

<script setup>
import { ref, computed } from "vue"
import { $translate } from "@/services/translation"
import { vBngOnUiNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { useRouteDataStore } from "@/services/routeData"
import { lua } from "@/bridge"
import PhotomodeCore from "@/modules/pause/views/photomode/PhotomodeCore.vue"

defineOptions({ name: "GaragePhotomodeShell" })

const routeDataStore = useRouteDataStore()

const photomodeCore = ref(null)

const isPhotomodeUiHidden = computed(() => photomodeCore.value?.isPhotomodeUiHidden ?? false)
const panelOpen = computed(() => photomodeCore.value?.panelOpen ?? false)
const isPreviewSurface = computed(() => photomodeCore.value?.isPreviewSurface ?? false)
const isSettingsSurface = computed(() => photomodeCore.value?.isSettingsSurface ?? false)

const routeBreadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])

const visibleSurfaceLabel = computed(() => {
  if (isPreviewSurface.value) return $translate.instant("ui.photomode.surfacePreview")
  if (isSettingsSurface.value) return $translate.instant("ui.photomode.surfaceSettings")
  return ""
})

const breadcrumbItems = computed(() => {
  const items = routeBreadcrumbItems.value.map((item, index, allItems) => ({
    ...item,
    breadcrumbSource: "route",
    surfaceBackAction: panelOpen.value === true && allItems.length > 1 && index === allItems.length - 1
      ? (isPreviewSurface.value ? "close-preview" : "close-settings")
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

const showBreadcrumbBackButton = computed(() => breadcrumbItems.value.length > 1)

function translateLabel(label) {
  return label ? $translate.instant(label) : ""
}

const photomodeHeadingBase = computed(() =>
  translateLabel(routeBreadcrumbItems.value.at(-1)?.label) || $translate.instant("ui.photomode.title")
)
const photomodeHeadingText = computed(() => visibleSurfaceLabel.value
  ? `${photomodeHeadingBase.value}: ${visibleSurfaceLabel.value}`
  : photomodeHeadingBase.value)

async function onBreadcrumbClick(item) {
  if (!item) return
  if (item.surfaceBackAction === "close-preview") {
    photomodeCore.value?.closePreview("breadcrumb")
    return
  }
  if (item.surfaceBackAction === "close-settings") {
    photomodeCore.value?.closeSettings("breadcrumb")
    return
  }
  if (!item.routeName || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
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
</script>

<style lang="scss" scoped>
.garage-photomode-shell {
  --layout-menu-buttons-bottom-justify: flex-start;
}
</style>
