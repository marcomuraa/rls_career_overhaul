<template>
  <LayoutMenu
    class="menu-extras-host"
    nav-scope="mainmenu-extras"
    :nav-active="false"
    :nav-options="navOptions"
    :breadcrumbs="breadcrumbItems"
    :heading="currentPage.label"
    hide-breadcrumb-last-item
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <BngBinding class="menu-extras-tracker-ignore" ui-event="tab_l" always-show-unassigned aria-hidden="true" />
    <BngBinding class="menu-extras-tracker-ignore" ui-event="tab_r" always-show-unassigned aria-hidden="true" />
    <template v-if="!currentContentComponent">
      <BngBinding v-for="event in IGNORED_SCROLL_EVENTS" :key="event" class="menu-extras-tracker-ignore" :ui-event="event" always-show-unassigned aria-hidden="true" />
    </template>

    <div class="menu-extras-body">
      <MenuExtrasOverview v-if="isOverviewRoute" />
      <BngCard v-else v-bng-blur layered-background class="menu-extras-card">
        <div class="menu-extras-content-scroll" v-bng-ui-nav-scroll.force>
          <component
            v-if="currentContentComponent"
            :is="currentContentComponent"
            class="menu-extras-content"
          />
          <p v-else-if="isDev" class="menu-extras-placeholder-text">This Extras page is registered in the Lua router. Content is not ported in this package.</p>
        </div>
      </BngCard>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, inject, ref } from "vue"
import { useRoute } from "vue-router"
import { LayoutMenu } from "@/common/layouts"
import { BngBinding, BngCard } from "@/common/components/base"
import { vBngBlur, vBngUiNavScroll } from "@/common/directives"
import { lua } from "@/bridge"
import { $translate } from "@/services"
import { useRouteDataStore } from "@/services/routeData"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import Licenses from "@/common/modules/options/components/subpages/Licenses.vue"
import StatsView from "@/modules/stats/views/Stats.vue"
import MenuExtrasHelp from "./MenuExtrasHelp.vue"
import MenuExtrasOverview from "./MenuExtrasOverview.vue"
import MenuExtrasPerformance from "./MenuExtrasPerformance.vue"

defineOptions({ name: "MenuExtrasHost" })

const IGNORED_SCROLL_EVENTS = Object.freeze(["rotate_h_cam", "rotate_v_cam"])

const OVERVIEW_ROUTE = "menu.extras"
const LICENSES_ROUTE = "menu.extras.licenses"
const PERFORMANCE_ROUTE = "menu.extras.performance"
const STATS_ROUTE = "menu.extras.stats"

const PAGE_BY_ROUTE = Object.freeze({
  [OVERVIEW_ROUTE]: { label: $translate.instant("ui.mainmenu.extras") },
  [LICENSES_ROUTE]: { label: $translate.instant("ui.options.licenses"), component: Licenses },
  "menu.extras.help": { label: $translate.instant("ui.mainmenu.help"), component: MenuExtrasHelp },
  "menu.extras.performance": { label: $translate.instant("ui.dashboard.performance"), component: MenuExtrasPerformance },
  [STATS_ROUTE]: { label: $translate.instant("ui.statspage.title"), component: StatsView },
})

const navOptions = Object.freeze({
  type: SCOPE_TYPES.CONTAINER,
  bubbleWhitelistEvents: ["menu"],
})

const route = useRoute()
const routeDataStore = useRouteDataStore()
const $simplemenu = inject("$simplemenu", ref(false))

const currentRouteName = computed(() => {
  const canonicalRouteName = String(routeDataStore.routeName || "")
  if (canonicalRouteName.startsWith(OVERVIEW_ROUTE)) return canonicalRouteName
  return typeof route.name === "string" ? route.name : OVERVIEW_ROUTE
})
const effectiveRouteName = computed(() => {
  if ($simplemenu.value && currentRouteName.value === PERFORMANCE_ROUTE) return OVERVIEW_ROUTE
  return currentRouteName.value
})
const currentPage = computed(() => PAGE_BY_ROUTE[effectiveRouteName.value] || PAGE_BY_ROUTE[OVERVIEW_ROUTE])
const isOverviewRoute = computed(() => effectiveRouteName.value === OVERVIEW_ROUTE)
const currentContentComponent = computed(() => currentPage.value.component || null)

const routeLabels = Object.freeze({
  menu: "ui.common.menu",
  ...Object.fromEntries(Object.entries(PAGE_BY_ROUTE).map(([routeName, page]) => [routeName, page.label])),
})

const routeBreadcrumbItems = computed(() => {
  if (!Array.isArray(routeDataStore.breadcrumbs)) return []

  return routeDataStore.breadcrumbs
    .map(item => ({
      ...item,
      label: translateLabel(routeLabels[item.routeName] || item.label),
    }))
    .filter((item, index, items) => item.label && (index === 0 || item.label !== items[index - 1].label))
})

const fallbackBreadcrumbItems = computed(() => {
  const items = [
    { label: translateLabel("ui.common.menu"), routeName: "menu" },
    { label: translateLabel(PAGE_BY_ROUTE[OVERVIEW_ROUTE].label), routeName: OVERVIEW_ROUTE },
  ]

  if (!isOverviewRoute.value) {
    items.push({
      label: translateLabel(currentPage.value.label),
      routeName: effectiveRouteName.value,
    })
  }

  return items
})

const breadcrumbItems = computed(() => routeBreadcrumbItems.value.length > 0 ? routeBreadcrumbItems.value : fallbackBreadcrumbItems.value)
const isDev = __BNG_DEV__

function translateLabel(label) {
  if (typeof label !== "string" || !label.startsWith("ui.")) return label
  return $translate.instant(label)
}

async function onBreadcrumbClick(item) {
  if (!item?.routeName || item.routeName === currentRouteName.value) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params || null, null)
}

async function onBreadcrumbBack() {
  await lua.extensions.ui_router.back()
}
</script>

<style lang="scss" scoped>
.menu-extras-tracker-ignore {
  display: none;
}

.menu-extras-body {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.menu-extras-card {
  --bng-card-height: 100%;

  min-height: 0;
  width: 100%;
  height: 100%;
  color: var(--bng-off-white);
}

.menu-extras-content-scroll {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.menu-extras-content {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding: 1em;
}

.menu-extras-placeholder-text {
  padding: 0 1em 1em;
}
</style>
