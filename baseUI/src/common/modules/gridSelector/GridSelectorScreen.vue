<template>
  <LayoutMenu
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
      :tile-images-top-aligned="props.tileImagesTopAligned"
      v-on="gridSelectorListeners"
    >
      <template #side-panel>
        <div v-if="tasklistStore.hasItems && tasklistStore.visibleIn.gridSelector" class="grid-selector-side-panel">
          <component :is="tasklist" />
        </div>
      </template>
      <template #item-details="slotProps">
        <slot name="item-details" v-bind="slotProps" />
      </template>
      <template #management-details="slotProps">
        <slot name="management-details" v-bind="slotProps" />
      </template>
    </GridSelector>
    <template #topbar-right>
      <slot name="topbar-right" />
    </template>
  </LayoutMenu>
</template>

<script setup>
import { computed, getCurrentInstance, ref, toRef, useAttrs } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import { lua } from "@/bridge"
import { tasklist } from "@/modules/apps"
import { useTasksStore } from "@/services/tasklistStore"
import { useRouteDataStore } from "@/services/routeData"
import GridSelector from "./GridSelector.vue"
import useGridSelectorController from "./composables/useGridSelectorController"

const props = defineProps({
  backendName: {
    type: String,
    default: "vehicleSelector",
  },
  routePath: {
    type: String,
    default: "/grid-selector",
  },
  defaultPath: {
    type: Object,
    default: () => ({ keys: ["allModels"] }),
  },
  defaultDetailsMode: {
    type: String,
    default: "detail",
  },
  hiddenTabs: {
    type: Array,
    default: () => [],
  },
  tileImagesTopAligned: {
    type: Boolean,
    default: false,
  },
  bubbleEvents: {
    type: Array,
    default: () => [],
  },
})

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const emit = defineEmits(["item-double-click", "back-from-grid"])
const instance = getCurrentInstance()
const route = useRoute()
const gridSelectorRef = ref(null)
const tasklistStore = useTasksStore()
const routeDataStore = useRouteDataStore()
const gridScrollableContentElement = computed(() => gridSelectorRef.value?.$el?.querySelector(".grid-content") ?? null)

function resolveDefaultPathSegments() {
  if (Array.isArray(props.defaultPath?.keys)) {
    return [...props.defaultPath.keys]
  }
  return Array.isArray(props.defaultPath) ? [...props.defaultPath] : []
}

function resolveRoutePathSegments() {
  const fallbackPathSegments = resolveDefaultPathSegments()
  if (routeDataStore.routeName !== route.name) {
    return fallbackPathSegments
  }

  const routePathSegments = routeDataStore.route?.params?.path?.keys
  return Array.isArray(routePathSegments) ? [...routePathSegments] : fallbackPathSegments
}

const breadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])
const onBreadcrumbClick = async item => {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

const hasParentListener = listenerName => {
  const listener = instance?.vnode?.props?.[listenerName]
  if (Array.isArray(listener)) {
    return listener.length > 0
  }
  return typeof listener === "function"
}

const handleBackFromGrid = backEvent => {
  emit("back-from-grid", backEvent)
}

const handleItemDoubleClick = payload => {
  emit("item-double-click", payload)
  if (hasParentListener("onItemDoubleClick")) {
    payload?.preventDefault?.()
  }
}

const {
  gridSelectorProps,
  gridSelectorListeners,
  isBootingSelector,
  isSelectorReady,
  selectorError,
  selectorRouteStatus,
  screenHeaderPath,
  clearSearch,
  clearFilters,
  setCurrentPath,
  onBreadBack,
} = useGridSelectorController({
  backendName: toRef(props, "backendName"),
  routePath: toRef(props, "routePath"),
  defaultPath: toRef(props, "defaultPath"),
  defaultDetailsMode: toRef(props, "defaultDetailsMode"),
  hiddenTabs: toRef(props, "hiddenTabs"),
  bubbleEvents: toRef(props, "bubbleEvents"),
  gridScrollableContentElement,
  requestBackFromGrid: handleBackFromGrid,
  requestItemDoubleClick: handleItemDoubleClick,
  getCurrentPathSegments: resolveRoutePathSegments,
})

defineExpose({
  isBootingSelector,
  isSelectorReady,
  selectorError,
  selectorRouteStatus,
  screenHeaderPath,
  clearSearch,
  clearFilters,
  setCurrentPath,
  onBreadBack,
  gridScrollableContentElement,
})
</script>

<style lang="scss">
.grid-selector-screen-content {
  height: 100%;
}
</style>
