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
      :loading="isBootingSelector"
      v-on="gridSelectorListeners"
    >
      <template #item-details="{ activeItem, activeItemDetails, executeButton, toggleFavourite, exploreFolder, goToMod }">
        <VehicleDetails
          :activeItem="activeItem"
          :activeItemDetails="activeItemDetails"
          :toggleFavourite="toggleFavourite"
          :exploreFolder="exploreFolder"
          :goToMod="goToMod"
          :showHeaderTitle="true"
          @execute-button="({ buttonId, additionalData }) => executeButton(buttonId, additionalData)"
          @override-click="({ activeItem: overrideActiveItem, buttonOverride, additionalData }) => buttonOverride?.click?.(overrideActiveItem, additionalData)"
        />
      </template>
      <template #management-details="{ managementDetails, executeButton }">
        <ManagementDetails
          :managementDetails="managementDetails"
          :executeButton="executeButton"
        />
      </template>
    </GridSelector>
  </LayoutMenu>
</template>

<script setup>
import { computed, onMounted, ref, useAttrs, watch } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import GridSelector from "@/common/modules/gridSelector/GridSelector.vue"
import useGridSelectorController from "@/common/modules/gridSelector/composables/useGridSelectorController"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"
import VehicleDetails from "../components/VehicleDetails.vue"
import ManagementDetails from "../components/ManagementDetails.vue"

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const route = useRoute()
const routeDataStore = useRouteDataStore()
const gridSelectorRef = ref(null)
const defaultPath = Object.freeze({ keys: ["allModels"] })
const gridScrollableContentElement = computed(() => gridSelectorRef.value?.$el?.querySelector(".grid-content") ?? null)
const defaultPathSegments = Object.freeze([...(Array.isArray(defaultPath.keys) ? defaultPath.keys : [])])
const openedFromGarage = ref(false)

function resolveRoutePathSegments() {
  if (routeDataStore.routeName !== route.name) {
    return [...defaultPathSegments]
  }

  const routePathSegments = routeDataStore.route?.params?.path?.keys
  return Array.isArray(routePathSegments) ? [...routePathSegments] : [...defaultPathSegments]
}

function onBackFromGrid(backEvent = {}) {
  if (!openedFromGarage.value || !backEvent?.isAtGridRoot) return
  if (typeof backEvent.preventDefault === "function") {
    backEvent.preventDefault()
  }
  lua.extensions.ui_router.navigate("garage", null, null)
}

const {
  gridSelectorProps,
  gridSelectorListeners,
  onBreadBack,
  isBootingSelector,
} = useGridSelectorController({
  backendName: "vehicleSelector",
  defaultPath,
  defaultDetailsMode: "advanced",
  gridScrollableContentElement,
  requestNavigation: onGridNavigateRequest,
  requestBackFromGrid: onBackFromGrid,
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

const syncGarageContext = async () => {
  openedFromGarage.value = !!(await lua.ui_vehicleSelector_general.isOpenedFromGarage())
}

onMounted(syncGarageContext)
watch(() => route.name, syncGarageContext)
</script>

<style lang="scss">
.grid-selector-screen-content {
  height: 100%;
}
</style>
