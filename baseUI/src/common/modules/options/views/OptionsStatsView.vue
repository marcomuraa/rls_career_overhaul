<template>
  <LayoutMenu
    class="options-stats-view"
    nav-scope="options-stats-subview"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :heading="heading"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <BngCard v-bng-blur layered-background class="options-stats-card">
      <Stats class="options-stats-content" />
    </BngCard>
  </LayoutMenu>
</template>

<script setup>
import { computed } from "vue"
import { vBngBlur } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { BngCard } from "@/common/components/base"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"
import Stats from "@/modules/stats/views/Stats.vue"

defineOptions({ name: "OptionsStatsView" })

const routeDataStore = useRouteDataStore()

const currentRouteName = computed(() => routeDataStore.route?.name || "")
const isPauseStatsRoute = computed(() => currentRouteName.value.startsWith("pause.options"))
const heading = computed(() => breadcrumbItems.value.at(-1)?.label || "Stats")
const routeBreadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])
const fallbackBreadcrumbItems = computed(() => {
  const statsRoute = currentRouteName.value || (isPauseStatsRoute.value ? "pause.options.stats" : "menu.options.stats")
  if (isPauseStatsRoute.value) {
    return [
      { label: "Pause", routeName: "pause" },
      { label: "Options", routeName: "pause.options" },
      { label: "Stats", routeName: statsRoute },
    ]
  }

  return [
    { label: "ui.common.menu", routeName: "menu" },
    { label: "Options", routeName: "options" },
    { label: "Stats", routeName: statsRoute },
  ]
})
const breadcrumbItems = computed(() => routeBreadcrumbItems.value.length > 0 ? routeBreadcrumbItems.value : fallbackBreadcrumbItems.value)

async function onBreadcrumbClick(item) {
  if (!item?.routeName) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

async function onBreadcrumbBack() {
  await lua.extensions.ui_router.back()
}
</script>

<style scoped lang="scss">
.options-stats-view {
  --content-flow: column;
  --content-max-width: unset;
  --bng-tile-margins: 0;

  color: var(--bng-off-white);
}

.options-stats-card {
  --bng-card-height: unset;
  --bng-card-content-bg: var(--bng-off-black);
  --bng-card-content-bg-opacity: 0.8;

  min-height: 0;
  width: 100%;
  height: 100%;
}

.options-stats-content {
  width: 100%;
  height: 100%;
}
</style>
