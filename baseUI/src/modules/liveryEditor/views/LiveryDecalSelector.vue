<template>
  <LayoutMenu
    class="decal-selector-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack">
    <div class="main-content">
      <div class="decal-tabs-row">
        <div class="menu-tabs-switcher">
          <BngButton
            class="menu-tabs-arrow"
            :accent="ACCENTS.ghost"
            bng-no-nav="true"
            @click="goPrevTab">
            <BngIcon :type="icons.arrowLargeLeft" />
            <BngBinding class="menu-tabs-binding" ui-event="tab_l" controller />
          </BngButton>
          <Tabs
            v-if="categorizedTextures.length"
            ref="decalTabsRef"
            class="bng-tabs menu-tabs"
            :selected-index="selectedTabIndex"
            @change="onDecalTabChange">
            <TabList />
            <div
              v-for="(cat, index) in categorizedTextures"
              :key="`${cat.label}-${index}`"
              :tab-heading="cat.label"
              class="menu-tab-panel" />
          </Tabs>
          <BngButton
             :accent="ACCENTS.ghost"
             class="menu-tabs-arrow"
             bng-no-nav="true"
             @click="goNextTab">
            <BngBinding class="menu-tabs-binding" ui-event="tab_r" controller />
            <BngIcon :type="icons.arrowLargeRight" />
          </BngButton>
        </div>
      </div>
      <BngCard class="list-container">
        <div
          class="list-body"
          v-bng-on-ui-nav:tab_l="onTabNavLeft"
          v-bng-on-ui-nav:tab_r="onTabNavRight">
          <BngList
            v-if="textures"
            v-bng-blur
            :layout="LIST_LAYOUTS.TILES"
            :target-width="8"
            :target-height="8"
            :target-margin="0.5"
            :big="true"
            class="textures-list">
            <DecalSelectorItem
              v-for="(item, index) in textures"
              bng-nav-item
              :key="item.preview"
              :externalImage="item.preview"
              :data-decal-item="index"
              v-bng-on-ui-nav:ok.asMouse.focusRequired
              @click="select(item)" />
          </BngList>
        </div>
      </BngCard>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { lua, useBridge } from "@/bridge"
import { useInfoBar } from "@/services/infoBar"
import { vBngOnUiNav, vBngBlur } from "@/common/directives"
import { BngList, LIST_LAYOUTS, BngButton, BngIcon, BngBinding, ACCENTS, icons } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { Tabs, TabList } from "@/common/components/utility"
import DecalSelectorItem from "@/modules/liveryEditor/components/DecalSelectorItem.vue"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const infobar = useInfoBar()
const { events } = useBridge()
const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation()

const categorizedTextures = ref([])
const selectedTabIndex = ref(0)
const decalTabsRef = ref(null)

const textures = computed(() => {
  const cats = categorizedTextures.value
  if (!cats || cats.length === 0) return null
  const i = Math.min(Math.max(0, selectedTabIndex.value), cats.length - 1)
  return cats[i]?.items ?? null
})

function onDecalTabChange(tab) {
  selectedTabIndex.value = tab.index
}

function onTabNavLeft() {
  if (categorizedTextures.value.length <= 1) return
  decalTabsRef.value?.goPrev?.()
}

function onTabNavRight() {
  if (categorizedTextures.value.length <= 1) return
  decalTabsRef.value?.goNext?.()
}

async function select(item) {
  const layer = await lua.extensions.ui_liveryEditor_layers_decal.addLayerCentered({ texturePath: item.preview })
  await lua.extensions.ui_liveryEditor_selection.select(layer.uid, true)
  lua.extensions.ui_router.navigate("livery.editor.decals", null, { preferredScope: "actions-drawer" })
}

function onData(data) {
  categorizedTextures.value = data

  if (!data || data.length === 0) {
    selectedTabIndex.value = 0
  } else if (selectedTabIndex.value >= data.length) {
    selectedTabIndex.value = 0
  }
}

onMounted(() => {
  infobar.visible = true
  infobar.showSysInfo = true
  lua.extensions.ui_liveryEditor_resources.requestData()
  events.on("liveryEditor_resources_data", onData)
})

onBeforeUnmount(() => {
  events.off("liveryEditor_resources_data", onData)
})
</script>

<style lang="scss" scoped>
.decal-selector-view {
  padding: 0.5rem;
  color: white;

  :deep(.layout-content) {
    width: 80em;
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  height: 100%;
  width: 80em;

  .decal-tabs-row {
    display: flex;
    justify-content: center;
    width: 100%;
    flex: 0 0 auto;
  }

  .menu-tabs-switcher {
    --tab-list-padding: 0;
    --tab-list-margin: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    position: relative;
    flex: 0 0 auto;

    .menu-tabs {
      --bng-tabs-border-width: 0;
      --bng-bg-border-radius: var(--bng-corners-1) var(--bng-corners-1) 0 0;
    }

    &::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--bng-off-black);
      opacity: 0.6;
      border-radius: var(--bng-corners-1);
      z-index: -1;
    }

    .menu-tabs-arrow {
      --bng-button-margin: 0;
      --bng-button-min-width: 2.5rem;
      --bng-button-padding: 0.35rem;
      --bng-icon-size: 1.25rem;
      display: inline-flex;
      align-items: center;
      gap: 0rem;
    }

    .menu-tabs-binding {
      pointer-events: none;
    }
  }
}

.list-container {
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.8);
  width: 80em;
  height: 60em;
}

.list-body {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  box-sizing: border-box;
  min-height: 0;
  height: 100%;
}

.textures-list {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
