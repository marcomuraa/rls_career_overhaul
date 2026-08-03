import LiveryMain from "@/modules/liveryEditor/views/LiveryMain.vue"
import LiveryPaint from "./views/LiveryPaint.vue"
import LiveryDecals from "./views/LiveryDecals.vue"
import LiveryDecalSelector from "./views/LiveryDecalSelector.vue"
import LiveryLayerEdit from "./views/LiveryLayerEdit.vue"
import LiveryCameraSettings from "./views/LiveryCameraSettings.vue"
import LayerTransform from "./views/LayerTransform.vue"
import LayerMaterials from "./views/LayerMaterials.vue"
import LayerProjection from "./views/LayerProjection.vue"
import LiverySettings from "./views/LiverySettings.vue"
import LiveryHome from "./views/LiveryHome.vue"
import LiverySaves from "./views/LiverySaves.vue"

const metadata = {
  infoBar: {
    visible: true,
    showSysInfo: true,
  },
}

export default [
  {
    path: "/livery",
    name: "livery",
    component: LiveryHome,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main",
    name: "livery.editor",
    component: LiveryMain,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/paint",
    name: "livery.editor.paint",
    component: LiveryPaint,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/decals",
    name: "livery.editor.decals",
    component: LiveryDecals,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/settings",
    name: "livery.editor.settings",
    component: LiverySettings,
    meta: metadata,
  },
  {
    path: "/liveryeditor/camera-settings",
    name: "livery.cameraSettings",
    component: LiveryCameraSettings,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/decals/selector",
    name: "livery.editor.decals.selector",
    component: LiveryDecalSelector,
    meta: metadata,
  },
  {
    path: "/liveryeditor/layer-edit",
    name: "livery.layerEdit",
    component: LiveryLayerEdit,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/decals/transform",
    name: "livery.editor.decals.transform",
    component: LayerTransform,
    meta: metadata,
  },
  {
    path: "/liveryeditor/main/decals/materials",
    name: "livery.editor.decals.materials",
    component: LayerMaterials,
    meta: metadata,
  },
  {
    path: "/liveryeditor/layer-projection",
    name: "livery.layerProjection",
    component: LayerProjection,
    meta: metadata,
  },
  {
    path: "/livery/saves",
    name: "livery.saves",
    component: LiverySaves,
    meta: { ...metadata, handlesOwnReady: true },
  },
]
