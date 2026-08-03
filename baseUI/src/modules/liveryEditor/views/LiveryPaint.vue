<template>
  <LayoutMenu
    class="paint-main-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    :nav-options="{ canDeactivate: canDeactivatePaintScope }"
    heading="Paint"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="paint-content-container">
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
import { onMounted, onUnmounted, ref } from "vue"
import { BngBinding, BngButton } from "@/common/components/base"
import { vBngOnUiNav, vBngBlur } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { lua, useBridge } from "@/bridge"
import { openConfirmation } from "@/services/popup"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores"
import MaterialSettings from "../components/layerSettings/MaterialSettings.vue"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const store = useLiveryMainStore()
const { events } = useBridge()

// Paint changes are unsaved until applied, so breadcrumb navigation away must
// go through the discard confirmation.
const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    cancelChanges()
    return true
  },
  handleNavigate: () => {
    cancelChanges()
    return true
  },
})

const initialColor = ref(null)

onMounted(() => {
  store.setup()
  events.on("liveryEditor_fill_layerData", onLayerData)
  lua.extensions.ui_liveryEditor_layers_fill.requestLayerData()
})

onUnmounted(() => {
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

function canDeactivatePaintScope() {
  cancelChanges()
  return false
}

function cancelChanges(event) {
  event?.stopPropagation?.()
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
.paint-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;
}

.paint-content-container {
  display: flex;
  justify-content: flex-start;
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
