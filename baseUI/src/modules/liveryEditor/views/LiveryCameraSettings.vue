<template>
  <LayoutMenu
    class="camera-settings-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    heading="Camera Settings"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack">
    <div class="main-view-content" v-bng-on-ui-nav:back="goBack" v-bng-on-ui-nav:menu="done">
      <div class="menu-container">
        <BngImageTile
          v-for="item in MENU_ITEMS"
          v-bng-blur
          bng-nav-item
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          @click="onMenuItemClicked(item)" />
      </div>
    </div>
  </LayoutMenu>
</template>

<script>
const MENU_ITEMS = [
  {
    label: "Right",
    icon: icons.cameraSideRight,
    value: "right",
  },
  {
    label: "Front",
    icon: icons.cameraFront1,
    value: "front",
  },
  {
    label: "Left",
    icon: icons.cameraSideLeft,
    value: "left",
  },
  {
    label: "Back",
    icon: icons.cameraBack1,
    value: "back",
  },
  {
    label: "Top Right",
    icon: icons.cameraTop1,
    value: "topright",
  },
  {
    label: "Top Left",
    icon: icons.cameraTop1,
    value: "topleft",
  },
  {
    label: "Top Front",
    icon: icons.cameraTop1,
    value: "topfront",
  },
  {
    label: "Top Back",
    icon: icons.cameraTop1,
    value: "topback",
  },
]
</script>

<script setup>
import { onBeforeMount, onMounted, ref } from "vue"
import { lua } from "@/bridge"
import { useInfoBar } from "@/services/infoBar"
import { vBngOnUiNav, vBngBlur } from "@/common/directives"
import { BngButton, BngCardHeading, BngIcon, BngImageTile, BngList, icons, ACCENTS, LIST_LAYOUTS } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { useDecalSelectorStore } from "@/modules/liveryEditor/stores"
import DecalSelectorItem from "@/modules/liveryEditor/components/DecalSelectorItem.vue"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const CAMERA_LUA = lua.extensions.ui_liveryEditor_camera

const store = useDecalSelectorStore()
const infobar = useInfoBar()

const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    goBack()
    return true
  },
})

function onMenuItemClicked(item) {
  CAMERA_LUA.setOrthographicView(item.value)
}

function goBack() {
  lua.extensions.ui_router.navigate("livery.editor.decals", null, null)
}

function done() {
  lua.extensions.ui_router.navigate("livery.editor.decals.selector", null, null)
}

onBeforeMount(() => {
  infobar.clearHints()
  infobar.addHints(NAV_HINTS)
})

onMounted(() => {
  infobar.visible = true
  infobar.showSysInfo = true
})

const NAV_HINTS = [
  { id: "apply", content: { type: "binding", props: { uiEvent: "menu" }, label: "Done" } },
  { id: "back", content: { type: "binding", props: { uiEvent: "back" }, label: "Back" }, action: goBack },
]
</script>

<style lang="scss" scoped>
$infobarHeight: 4rem;

.camera-settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;

  margin-bottom: $infobarHeight;

  > .main-view-content {
    display: flex;
    justify-content: flex-start;
    flex-grow: 1;

    > .menu-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }
}
</style>
