<template>
  <LayoutMenu
    class="livery-main-view"
    nav-scope="root"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    heading="Livery Editor"
    :nav-options="{ canDeactivate: canDeactivateMainScope }"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack">
    <div class="loading-overlay" v-if="!store.isSetupDone">
      <h1 class="text">Loading...</h1>
    </div>
    <div
      class="main-view-content"
      v-bng-on-ui-nav:menu="promptBack"
      v-bng-ui-nav-label:menu,back="'Save/Exit'">
      <div class="menu-container">
        <BngImageTile
          v-for="item in MENU_ITEMS"
          v-bng-blur
          v-bng-route-target="item.routeTarget"
          bng-nav-item
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          />
      </div>
    </div>
  </LayoutMenu>
</template>

<script>
const MENU_ITEMS = [
  {
    label: "Paint",
    value: "paint",
    icon: icons.colorPalette,
    routeTarget: "livery.editor.paint",
  },
  {
    label: "Decals",
    value: "decals",
    icon: icons.decal,
    routeTarget: "livery.editor.decals",
  },
  {
    label: "Settings",
    value: "settings",
    icon: icons.gearTuningOutline,
    routeTarget: "livery.editor.settings",
  },
]
</script>

<script setup>
import { onBeforeMount, ref } from "vue"
import { lua } from "@/bridge"
import { BngImageTile, icons, ACCENTS } from "@/common/components/base"
import { vBngBlur, vBngRouteTarget, vBngOnUiNav, vBngUiNavLabel } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores"
import { useEditorHeaderStore } from "@/modules/liveryEditor/stores"
import { openConfirmation, openPrompt, openProgress } from "@/services/popup"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const store = useLiveryMainStore()
const headerStore = useEditorHeaderStore()

// Leaving the editor (back or any breadcrumb) must go through the save/exit
// prompt so unsaved livery changes are not lost.
const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    promptBack()
    return true
  },
  handleNavigate: () => {
    promptBack()
    return true
  },
})

const openedDialog = ref(null)

onBeforeMount(async () => {
  await store.setup()
  headerStore.setHeader("Livery Editor")
  headerStore.setPreheader(null)
})

function canDeactivateMainScope() {
  promptBack()
  return false
}

function exit() {
  const exitRes = store.exit()
  exitRes.then(() => {
    lua.extensions.ui_router.navigate("garage", null, null)
  })
}

function promptSave() {
  if (openedDialog.value) return

  openedDialog.value = "save"

  const saveChangesButtons = [
    { label: "Save", value: text => ({ value: 1, text }), extras: { default: true } },
    { label: "Save and Exit", value: text => ({ value: -1, text }), extras: { accent: ACCENTS.secondary } },
    { label: "Cancel", value: text => ({ value: 0, text }), extras: { cancel: true, accent: ACCENTS.attention } },
  ]

  openPrompt("Enter save name", "Save", { buttons: saveChangesButtons, defaultValue: store.currentSave.name }).then(res => {
    const { value, text } = res

    if (value === 0) return

    store.currentSave.name = text

    store.save().then(() => {
      if (value === -1) {
        const popup = openProgress("Saving and exporting skin...", "Save", {
          cancellable: false,
          indeterminate: true,
          timeout: 1,
        })

        popup.promise.then(() => exit())
      }
    })

    openedDialog.value = null
  })
}

function promptBack(event) {
  if (openedDialog.value) {
    event?.stopPropagation?.()
    return
  }

  openedDialog.value = "back"

  const saveChangesButtons = [
    { label: "Save", value: 1, extras: { default: true } },
    { label: "Exit (discard changes)", value: -1, extras: { accent: ACCENTS.attention } },
    { label: "Cancel", value: 0, extras: { cancel: true, accent: ACCENTS.secondary } },
  ]

  openConfirmation("Save", "Save your changes", saveChangesButtons).then(res => {
    openedDialog.value = null

    if (res === 1) {
      promptSave()
    } else if (res === -1) {
      exit()
    }
  })

  event?.stopPropagation?.()
}
</script>

<style lang="scss" scoped>
.livery-main-view {
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
  height: 100%;
  margin: 0.25em;
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
</style>
