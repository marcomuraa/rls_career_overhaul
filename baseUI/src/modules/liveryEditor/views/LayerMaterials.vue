<template>
  <LayoutMenu
    class="layer-materials-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    heading="Materials"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack">
    <div
      class="main-view-content"
      v-bng-ui-nav-label:context="'Apply'"
      v-bng-ui-nav-label:action_2="'[Hold]Precise'"
      v-bng-ui-nav-label:back,menu="'Back'"
      v-bng-on-ui-nav:action_2.up="handleAction2"
      v-bng-on-ui-nav:action_2.down="handleAction2"
      v-bng-on-ui-nav:back,menu="goBack"
      v-bng-on-ui-nav:context="saveChanges">
      <div class="inspector-container">
        <LayerInspectorBase v-bng-blur :heading="'Materials'" class="">
          <div class="materials-inspector">
            <div class="materials-setting-item">
              <div class="setting-item-name">Color</div>
              <BngColorPicker v-bng-ui-nav-focus="0" v-model="color" :step="colorPickerStep" @change="onColorChanged" />
              <div class="color-values-container" bng-no-child-nav>
                <BngInput bng-no-child-nav="true" bng-no-nav="true" prefix="h" v-model="inputHue" type="number" no-spinners :show-external-button="false" no-scope  />
                <BngInput bng-no-child-nav="true" bng-no-nav="true" prefix="s" v-model="inputSat" type="number" no-spinners :show-external-button="false" no-scope  />
                <BngInput bng-no-child-nav="true" bng-no-nav="true" prefix="b" v-model="inputLum" type="number" no-spinners :show-external-button="false" no-scope />
              </div>
            </div>
            <BngDivider />
            <div class="materials-setting-item">
              <div class="setting-item-name">Metallic Intensity</div>
              <BngSlider v-model="metallicIntensity" :min="0" :max="100" :step="slidersStep" with-input />
            </div>
            <BngDivider />
            <div class="materials-setting-item">
              <div class="setting-item-name">Roughness Intensity</div>
              <BngSlider v-model="roughnessIntensity" :min="0" :max="100" :step="slidersStep" with-input />
            </div>
          </div>
        </LayerInspectorBase>
      </div>
    </div>
  </LayoutMenu>
</template>

<script>
const BLOCKED_UI_EVENTS = ["tab_l", "tab_r", "action_2", "rotate_h_cam", "rotate_v_cam", "focus_lr", "focus_ud"]
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useInfoBar } from "@/services/infoBar"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { vBngOnUiNav, vBngUiNavLabel, vBngBlur, vBngUiNavFocus } from "@/common/directives"
import { BngColorPicker, BngDivider, BngInput, BngSlider } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { lua, useBridge } from "@/bridge"
import { openConfirmation } from "@/services/popup"
import Paint from "@/utils/paint"
import LayerInspectorBase from "../components/layerSettings/LayerInspectorBase.vue"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const infobar = useInfoBar()
const uiNavBlocker = useUINavBlocker()

const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation({
  handleBack: () => {
    goBack()
    return true
  },
  handleNavigate: async item => {
    if (!item?.routeName || item.abstract || item.decorator) return true
    if (await confirmLeave()) await lua.extensions.ui_router.navigate(item.routeName, item.params)
    return true
  },
})

const { events } = useBridge()

const screenState = reactive({
  openedDialog: null,
})

const color = ref({
  hue: 0.5,
  saturation: 1.0,
  luminosity: 0.5,
})
const inputHue = computed({
  get: () => color.value.hue.toFixed(3),
  set: newValue => {
    color.value.hue = typeof newValue === "string" ? +newValue : newValue
    onColorChanged()
  },
})
const inputSat = computed({
  get: () => color.value.saturation.toFixed(3),
  set: newValue => {
    color.value.saturation = typeof newValue === "string" ? +newValue : newValue
    onColorChanged()
  },
})
const inputLum = computed({
  get: () => color.value.luminosity.toFixed(3),
  set: newValue => {
    color.value.luminosity = typeof newValue === "string" ? +newValue : newValue
    onColorChanged()
  },
})
const metallicIntensity = ref(0)
const roughnessIntensity = ref(0)
const stateData = ref()
const colorInitialized = ref(false)
const isPreciseActive = ref(false)

const colorPickerStep = computed(() => (isPreciseActive.value ? 0.001 : 0.01))
const slidersStep = computed(() => (isPreciseActive.value ? 0.1 : 1))

const updateMaterialProperties = properties => lua.extensions.ui_liveryEditor_layerEdit.setLayerMaterials(properties)

function onColorChanged() {
  if (!colorInitialized.value) return
  const paint = new Paint()
  paint.hsl = [color.value.hue, color.value.saturation, color.value.luminosity]
  updateMaterialProperties({ color: paint.rgba })
}

watch(
  () => metallicIntensity.value,
  value => updateMaterialProperties({ metallicIntensity: value })
)

watch(
  () => roughnessIntensity.value,
  value => updateMaterialProperties({ roughnessIntensity: value })
)

onMounted(async () => {
  infobar.visible = true
  infobar.showSysInfo = true
  uiNavBlocker.blockOnly(BLOCKED_UI_EVENTS)
  events.on("liveryEditor_layerEdit_state", onStateData)
  events.on("liveryEditor_layerEdit_layerMaterialsData", onMaterialPropertiesData)
  await lua.extensions.ui_liveryEditor_layerEdit.requestStateData()
  await lua.extensions.ui_liveryEditor_layerEdit.requestLayerMaterials()
})

onBeforeUnmount(async () => {
  events.off("liveryEditor_layerEdit_layerMaterialsData", onMaterialPropertiesData)
  events.off("liveryEditor_layerEdit_state", onStateData)
  uiNavBlocker.clear()
})

async function onStateData(data) {
  stateData.value = data
}

function onMaterialPropertiesData(data) {
  colorInitialized.value = false
  const paint = new Paint()
  data.color[3] = 1
  const isWhite = data.color.every(num => num === 1)
  paint.rgba = data.color
  color.value.hue = paint.hue
  color.value.saturation = isWhite ? 0.5 : paint.saturation
  color.value.luminosity = paint.luminosity
  colorInitialized.value = true

  metallicIntensity.value = data.metallicIntensity
  roughnessIntensity.value = data.roughnessIntensity
}

function handleAction2(element) {
  isPreciseActive.value = element.detail.value === 1
}

// Confirm leaving the materials screen, discarding unsaved changes. Returns true
// when the caller should proceed with navigation (cleanup already performed).
async function confirmLeave() {
  if (screenState.openedDialog) return false

  screenState.openedDialog = "exit"
  const res = await openConfirmation("Exit", "Exit and lose changes?")
  screenState.openedDialog = null

  if (!res) return false
  await lua.extensions.ui_liveryEditor_layerEdit.cancelChanges()
  return true
}

function goBack(event) {
  event?.stopPropagation?.()
  confirmLeave().then(proceed => {
    if (proceed) lua.extensions.ui_router.navigate("livery.editor.decals", null, { preferredScope: "actions-drawer" })
  })
}

function saveChanges() {
  const res = lua.extensions.ui_liveryEditor_layerEdit.saveChanges()
  res.then(() => {
    lua.extensions.ui_router.navigate("livery.editor.decals", null, { preferredScope: "actions-drawer" })
  })
}
</script>

<style lang="scss" scoped>
$infobarHeight: 4rem;

.layer-materials-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;

  margin-bottom: $infobarHeight;

  > .main-view-content {
    position: relative;
    display: flex;

    > .inspector-container {
      position: absolute;
      top: 0;
      right: 0;
      max-width: 22rem;
    }
  }
}

.materials-inspector {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;

  > .materials-setting-item {
    padding: 0 0.5rem 0.5rem;

    > .setting-item-name {
      font-size: 1.125em;
      font-weight: 600;
    }
  }

  .slider-text-container {
    display: flex;
    align-items: center;
    padding-top: 0.5rem;

    > :first-child {
      width: 5rem;
      margin-right: 0.5rem;
    }
  }
}

.color-values-container {
  display: flex;
  align-items: center;
  padding-top: 0.5rem;

  > * {
    flex: 1 1 auto;

    &:not(:last-child) {
      margin-right: 0.25rem;
    }
  }
}
</style>
