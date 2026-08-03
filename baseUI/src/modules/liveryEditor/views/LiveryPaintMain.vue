<template>
  <LayoutMenu
    class="paint-main-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    heading="Paint">
    <div
      class="paint-content-container"
      v-bng-on-ui-nav:back,menu="cancelChanges"
      v-bng-ui-nav-label:back,menu="'Back'">
      <div class="paint-content">
        <MaterialSettings v-bng-blur :initial-color="initialColor" @change="onMaterialValueChanged" />
        <BngButton v-bng-on-ui-nav:context.asMouse @click="saveChanges">
          <BngBinding controller ui-event="context" />
          <span>Apply</span>
        </BngButton>
        <BngButton v-bng-on-ui-nav:action_3.asMouse accent="secondary" @click="restoreDefault">
          <BngBinding controller ui-event="action_3" />
          <span>Restore Default</span>
        </BngButton>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { BngBinding, BngButton } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { vBngOnUiNav, vBngUiNavLabel, vBngBlur } from "@/common/directives"
import { lua, useBridge } from "@/bridge"
import { useInfoBar } from "@/services/infoBar"
import { useRouteDataStore } from "@/services/routeData"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { openConfirmation } from "@/services/popup"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores"
import MaterialSettings from "../components/layerSettings/MaterialSettings.vue"

const store = useLiveryMainStore()
const infobar = useInfoBar()
const uiNavBlocker = useUINavBlocker()
const routeDataStore = useRouteDataStore()
const { events } = useBridge()

const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

const initialColor = ref(null)

const blockedEvents = ["tab_r", "tab_l"]

onMounted(() => {
  store.setup()

  infobar.visible = true
  infobar.showSysInfo = true

  uiNavBlocker.blockOnly(blockedEvents)

  events.on("liveryEditor_fill_layerData", onLayerData)
  lua.extensions.ui_liveryEditor_layers_fill.requestLayerData()
})

onUnmounted(() => {
  uiNavBlocker.clear()
  events.off("liveryEditor_fill_layerData")
})

function onLayerData(data) {
  console.log("layer data changed", data)
  initialColor.value = data.color
}

function saveChanges() {
  const res = lua.extensions.ui_liveryEditor_layers_fill.saveChanges()
  res.then(() => {
    lua.extensions.ui_router.navigate("livery.editor", null, null)
  })
}

function restoreDefault() {
  lua.extensions.ui_liveryEditor_layers_fill.restoreDefault()
}

function cancelChanges() {
  openConfirmation("Undo Changes", "Lose unsaved changes?").then(res => {
    if (res) {
      lua.extensions.ui_liveryEditor_layers_fill.restoreLayer()
      lua.extensions.ui_router.navigate("livery.editor", null, null)
    }
  })
}

function onMaterialValueChanged(data) {
  lua.extensions.ui_liveryEditor_layers_fill.updateLayer({ color: data.colorRgb })
}
</script>

<style lang="scss" scoped>
$infobarHeight: 4rem;

.paint-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;

  margin-bottom: $infobarHeight;
}

.paint-content-container {
  display: flex;
  justify-content: flex-end;
  flex-grow: 1;
}

.paint-content {
  display: flex;
  flex-direction: column;
}

.paint-content > .bng-button {
  max-width: unset;
}
</style>
