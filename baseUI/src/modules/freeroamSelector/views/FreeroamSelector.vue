<template>
  <LayoutMenu
    :nav-scope="'root'"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hideBreadcrumbLastItem="false"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
  >
    <GridSelector
      ref="gridSelectorRef"
      class="grid-selector-screen-content"
      v-bind="{ ...attrs, ...gridSelectorProps }"
      v-on="gridSelectorListeners"
    >
      <template #item-details="{ activeItem, activeItemDetails, executeButton, toggleFavourite, exploreFolder, goToMod }">
        <GameplayDetails
          :activeItem="activeItem"
          :activeItemDetails="activeItemDetails"
          :executeButton="executeButton"
          :toggleFavourite="toggleFavourite"
          :exploreFolder="exploreFolder"
          :goToMod="goToMod"
        />
      </template>
    </GridSelector>
  </LayoutMenu>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, useAttrs } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import GridSelector from "@/common/modules/gridSelector/GridSelector.vue"
import useGridSelectorController from "@/common/modules/gridSelector/composables/useGridSelectorController"
import GameplayDetails from "@/modules/gameplaySelector/components/GameplayDetails.vue"
import { useRouteDataStore } from "@/services/routeData"
import { useBridge } from "@/bridge"
import { addPopup } from "@/services/popup"
import LevelConfigurationModal from "../components/LevelConfigurationModal.vue"

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const { events, lua } = useBridge()
const route = useRoute()
const routeDataStore = useRouteDataStore()
const gridSelectorRef = ref(null)
const defaultPath = Object.freeze({ keys: ["allFreeroam"] })
const hiddenTabs = Object.freeze(["filter"])
const gridScrollableContentElement = computed(() => gridSelectorRef.value?.$el?.querySelector(".grid-content") ?? null)
const defaultPathSegments = Object.freeze([...(Array.isArray(defaultPath.keys) ? defaultPath.keys : [])])

function resolveRoutePathSegments() {
  if (routeDataStore.routeName !== route.name) {
    return [...defaultPathSegments]
  }

  const routePathSegments = routeDataStore.route?.params?.path?.keys
  return Array.isArray(routePathSegments) ? [...routePathSegments] : [...defaultPathSegments]
}

const {
  gridSelectorProps,
  gridSelectorListeners,
  onBreadBack,
} = useGridSelectorController({
  backendName: "freeroamSelector",
  defaultPath,
  defaultDetailsMode: "detail",
  hiddenTabs,
  gridScrollableContentElement,
  requestNavigation: onGridNavigateRequest,
  getCurrentPathSegments: resolveRoutePathSegments,
})

const breadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])

const onBreadcrumbClick = async item => {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

function onGridNavigateRequest(navigationRequest) {
  const gotoPath = Array.isArray(navigationRequest?.gotoPath)
    ? navigationRequest.gotoPath
    : (Array.isArray(navigationRequest?.item?.gotoPath) ? navigationRequest.item.gotoPath : null)
  const routeName = typeof route.name === "string" ? route.name : ""
  if (!Array.isArray(gotoPath) || gotoPath.length === 0 || !routeName) return

  navigationRequest?.preventDefault?.()

  const itemParams = navigationRequest?.item?.params
  const targetParams = {
    ...(itemParams && typeof itemParams === "object" ? itemParams : {}),
    path: { keys: [...gotoPath] },
  }

  void lua.extensions.ui_router.navigate(routeName, targetParams, null)
}

const handleOpenLevelConfigPopup = data => {
  addPopup(LevelConfigurationModal, {
    levelData: data,
  }).promise
}

onMounted(() => {
  events.on("openLevelConfigurationPopup", handleOpenLevelConfigPopup)
})

onUnmounted(() => {
  events.off("openLevelConfigurationPopup", handleOpenLevelConfigPopup)
})
</script>

<style lang="scss">
.grid-selector-screen-content {
  height: 100%;
}
</style>
