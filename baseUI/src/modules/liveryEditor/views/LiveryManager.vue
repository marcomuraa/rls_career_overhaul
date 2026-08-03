<template>
  <LayoutMenu
    class="livery-manager-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    heading="Livery Editor">
    <div
      class="main-view-content"
      v-bng-on-ui-nav:back,menu="goBack"
      v-bng-ui-nav-label:back,menu="'Back'">
      <template v-if="screenState.isOpenLiveries">
        <BngList
          v-if="files && files.length > 0"
          v-bng-blur
          :layout="LIST_LAYOUTS.LIST"
          :target-width="14"
          :target-height="6"
          :target-margin="0.25"
          :big="true"
          class="files-list">
          <FileListItem
            v-for="(file, index) in files"
            v-bind="file"
            v-bng-focus-if="selectedSave === null && index === 0"
            :key="file.name"
            :selected="selectedSave === index"
            @focus="selectedSave = index"
            @click="selectedSave = index" />
        </BngList>
        <div v-else class="empty-save-container">
          <div v-bng-blur class="empty-save-message">No saved liveries</div>
        </div>
      </template>
      <div v-else class="menu-container">
        <BngImageTile
          v-for="(item, index) in MENU_ITEMS"
          v-bng-ui-nav-focus="MENU_ITEMS.length - index"
          v-bng-blur
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          @click="item.action" />
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onBeforeMount, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { lua } from "@/bridge"
import { storeToRefs } from "pinia"
import { vBngBlur, vBngFocusIf, vBngUiNavFocus, vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { BngImageTile, BngList, LIST_LAYOUTS, icons } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { useInfoBar } from "@/services/infoBar"
import { useRouteDataStore } from "@/services/routeData"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores"
import { useLiveryFileStore } from "@/modules/liveryEditor/stores/liveryFileStore"
import FileListItem from "@/modules/liveryEditor/components/fileManager/FileListItem.vue"

const store = useLiveryFileStore()
const mainStore = useLiveryMainStore()
const infobar = useInfoBar()
const uiNavBlocker = useUINavBlocker()
const routeDataStore = useRouteDataStore()

const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

const { files } = storeToRefs(store)

const selectedSave = ref(null)

const screenState = reactive({
  isOpenLiveries: false,
})

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
  },
]

watch(
  () => files.value,
  () => (selectedSave.value = null),
  { deep: true }
)

onBeforeMount(() => {
  store.init()
})

onMounted(() => {
  uiNavBlocker.blockOnly(["tab_l", "tab_r"])
  infobar.visible = true
})

onUnmounted(() => {
  uiNavBlocker.clear()
})

function onCreateNew() {
  mainStore.isSetupDone = false
  lua.extensions.ui_router.navigate("livery.editor", null, null)
}

function onOpenLiveries() {
  screenState.isOpenLiveries = true
}

function goBack(event) {
  if (screenState.isOpenLiveries) {
    screenState.isOpenLiveries = false
    selectedSave.value = null
  } else {
    lua.extensions.ui_router.navigate("garage", null, null)
  }

  event.stopPropagation()
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
  max-height: calc(100% - 6rem);
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.5);

  > .text {
    color: white;
  }
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

.main-view-content > .files-list {
  align-self: center;
  height: 80%;
  max-width: 64rem;
  // padding: 2rem;

  :deep(.save-selected) {
    background: rgba(#ff6600, 0.2);
  }
}

.empty-save-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  width: 100%;
  height: 100%;

  .empty-save-message {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    color: white;
    background: rgba(0, 0, 0, 0.8);
    min-width: 30rem;
    min-height: 20rem;
    border-radius: var(--bng-corners-1);
    font-size: 1.25em;
    font-weight: 600;
  }
}
</style>
