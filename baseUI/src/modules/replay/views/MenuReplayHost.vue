<template>
  <LayoutMenu
    class="menu-replay-host"
    nav-scope="menu-replay-assembly"
    :nav-active="false"
    :nav-options="navOptions"
    :breadcrumbs="breadcrumbItems"
    :heading="$t('ui.apps.replay.name')"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="lua.extensions.ui_router.back()"
  >
    <ReplayFileBrowser
      class="menu-replay-browser"
      browser-scope-id="menu-replay-browser"
      :browser-scope-options="browserScopeOptions"
      navigate-after-play-route="pause.replay"
      autoplay
      pause-when-ready
    >
      <Background class="menu-replay-browser__background" />
    </ReplayFileBrowser>
  </LayoutMenu>
</template>

<script setup>
import { computed } from "vue"
import { LayoutMenu } from "@/common/layouts"
import Background from "@/common/components/utility/background.vue"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import ReplayFileBrowser from "../components/ReplayFileBrowser.vue"

defineOptions({ name: "MenuReplayHost" })

const navOptions = Object.freeze({
  type: SCOPE_TYPES.CONTAINER,
  bubbleWhitelistEvents: ["menu"],
})
const browserScopeOptions = Object.freeze({
  bubbleWhitelistEvents: ["menu"],
})

const routeDataStore = useRouteDataStore()
const fallbackBreadcrumbItems = Object.freeze([
  { label: "ui.common.menu", routeName: "menu" },
  { label: "ui.apps.replay.name", routeName: "menu.replay" },
])

const breadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) && routeDataStore.breadcrumbs.length > 0
  ? routeDataStore.breadcrumbs
  : fallbackBreadcrumbItems)

async function onBreadcrumbClick(item) {
  if (!item?.routeName || item.routeName === "menu.replay") return
  await lua.extensions.ui_router.navigate(item.routeName, item.params || null, null)
}
</script>

<style scoped lang="scss">
.menu-replay-host {
  --content-max-width: unset;
}

.menu-replay-browser {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-enabled: transparent;
  --bng-bg-border-width: 0.125em;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: relative;
  flex: 0 1 min(50%, 48em);
  align-self: stretch;
  display: flex;
  flex-direction: column;
  width: min(50%, 48em);
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  padding: 0;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  isolation: isolate;
}

.menu-replay-browser__background {
  border-radius: var(--bng-corners-2);
}

</style>
