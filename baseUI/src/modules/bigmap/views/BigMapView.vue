<template>
  <LayoutMenu
    class="bigmap-view"
    :show-topbar="breadcrumbItems.length > 0"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    :nav-scope="BIGMAP_LAYOUT_SCOPE_ID"
    :nav-active="false"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <BigMap :instant="instant" :isMenuBigmap="true" />
  </LayoutMenu>
</template>

<script setup>
import { computed } from "vue"
import { lua } from "@/bridge"
import { LayoutMenu } from "@/common/layouts"
import { useRouteDataStore } from "@/services/routeData"
import { $translate } from "@/services/translation"
import BigMap from "../components/BigMap.vue"
import { BIGMAP_LAYOUT_SCOPE_ID } from "../composables/useBigMapHints"

defineProps({
  instant: {
    type: Boolean,
    default: false,
  },
})

const routeDataStore = useRouteDataStore()
const isCareerBranchBigmapRoute = computed(() => routeDataStore.route?.name === "career.branchPage.bigmap")
const isPauseCareerBranchBigmapRoute = computed(() => routeDataStore.route?.name === "pause.career.branch.bigmap")
const isPauseBigmapRoute = computed(() => routeDataStore.route?.name === "pause.bigmap")
const branchPageParams = computed(() => {
  const params = routeDataStore.route?.params || {}
  return {
    pathId: params.pathId,
    returnRoute: params.returnRoute,
  }
})
const breadcrumbItems = computed(() => {
  if (!isCareerBranchBigmapRoute.value && !isPauseCareerBranchBigmapRoute.value) {
    return routeDataStore.breadcrumbs || []
  }

  const branchRouteName = isPauseCareerBranchBigmapRoute.value ? "pause.career.branch" : "career.branchPage"
  const bigmapRouteName = isPauseCareerBranchBigmapRoute.value ? "pause.career.branch.bigmap" : "career.branchPage.bigmap"
  return [
    {
      label: $translate.instant("ui.career.landingPage.name"),
      routeName: branchRouteName,
      params: branchPageParams.value,
    },
    {
      label: "Map",
      routeName: bigmapRouteName,
      params: routeDataStore.route?.params || {},
    },
  ]
})

async function onBreadcrumbBack() {
  if (isPauseCareerBranchBigmapRoute.value) {
    await lua.extensions.ui_router.navigate("pause.career.branch", branchPageParams.value)
    return true
  }
  if (isPauseBigmapRoute.value || isCareerBranchBigmapRoute.value || isPauseCareerBranchBigmapRoute.value) {
    await lua.extensions.ui_router.back()
    return true
  }
  lua.freeroam_bigMapMode.toggleBigMap()
}

async function onBreadcrumbClick(item) {
  if (!item?.routeName) return
  if (item.routeName === routeDataStore.route?.name) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}
</script>

<style lang="scss" scoped>
.bigmap-view {
  width: 100%;
  height: 100%;
  :deep(.bigmap-view) {
    gap: 0;
  }
}
</style>