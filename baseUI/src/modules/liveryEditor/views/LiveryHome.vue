<template>
  <LayoutMenu
    class="livery-manager-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    heading="Livery Editor"
    :nav-options="{ canDeactivate: canDeactivateHomeScope }"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div
      class="main-view-content"
      v-bng-on-ui-nav:menu="confirmExitToGarage"
      v-bng-ui-nav-label:menu,back="'Exit'">
      <div class="menu-container">
        <BngImageTile
          v-for="item in MENU_ITEMS"
          v-bng-blur
          v-bng-route-target.id="item.routeTarget"
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          @click="item.action" />
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { ref } from "vue"
import { lua } from "@/bridge"
import { vBngBlur, vBngRouteTarget, vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { BngImageTile, icons } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { openConfirmation } from "@/services/popup"
import { $translate } from "@/services/translation"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"
const mainStore = useLiveryMainStore()

// Leaving the livery editor (back or menu) must go through a confirmation so the
// player does not exit to the garage by accident.
const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    confirmExitToGarage()
    return true
  },
})

const isExitConfirmOpen = ref(false)

const MENU_ITEMS = [
  {
    label: "New Livery",
    value: "new",
    icon: icons.plus,
    action: onCreateNew,
  },
  {
    label: "Open Liveries",
    value: "load",
    icon: icons.decal,
    action: onOpenLiveries,
    routeTarget: "livery.saves",
  },
]

function onCreateNew() {
  mainStore.isSetupDone = false
  lua.extensions.ui_router.navigate("livery.editor", null, null)
}

function onOpenLiveries() {
  lua.extensions.ui_router.navigate("livery.saves", null, null)
}

function canDeactivateHomeScope() {
  confirmExitToGarage()
  return false
}

function confirmExitToGarage(event) {
  event?.stopPropagation?.()
  if (isExitConfirmOpen.value) return

  isExitConfirmOpen.value = true
  openConfirmation($translate.instant("ui.common.exit")).then(confirmed => {
    isExitConfirmOpen.value = false
    if (confirmed) lua.extensions.ui_router.navigate("garage", null, null)
  })
}
</script>

<style lang="scss" scoped>
.livery-manager-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
}

.main-view-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex-grow: 1;
  width: 100%;
  height: 100%;
  margin: 0.25em;
  max-height: calc(100% - 6rem);
}

.main-view-content > .menu-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  > *:not(:last-child) {
    margin-bottom: 0.5rem;
  }
}
</style>
