<template>
  <div
    class="ui-app-host"
    :class="{
      'ui-app-host--embedded': embedded,
      'ui-app-host--interactive': isInteractive,
    }"
    :style="hostSizeStyle"
    :data-app-name="appName"
    :data-app-instance="instanceId"
    v-bind="preventUinav ? { 'bng-no-child-nav': true } : {}"
  >
    <ModComponent
      v-if="renderer === 'vue' && vueFile"
      :key="`vue-${instanceId}-${hostReloadToken}`"
      v-bind="$attrs"
      :file="vueFile"
      :file-refresh="hostReloadToken > 0"
    />
    <AngularAppSlot
      v-else-if="renderer === 'angular' && app"
      :app="app"
      :instance-id="instanceId"
      :rect-px="rectPx"
    />
    <div v-else class="ui-app-host__missing">
      <span>Unknown app: {{ appName || "?" }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import ModComponent from "@/common/components/utility/modComponent.vue"
import { useModManager } from "@/services/modManager/manager"
import AngularAppSlot from "./AngularAppSlot.vue"

defineOptions({ name: "AppHost" })

const props = defineProps({
  // layout item produced by the app layouts store, like:
  //   { id, index, appName, app, placement, settings? }
  // where `app` is the catalogue entry (carries hasAppVue, vueFile,
  // directive, vueParams etc.).
  item: {
    type: [Object, String],
    required: true,
  },
  // forwarded from <Overlay>
  rectPx: {
    type: Object,
    default: null,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
  preventUinav: {
    type: Boolean,
    default: false,
  },
})

const modManager = useModManager()

const layoutItem = computed(() => {
  if (typeof props.item === "string") return { appName: props.item }
  return props.item || {}
})

const app = computed(() => layoutItem.value?.app || getCatalogueApp(layoutItem.value?.appName))
const appName = computed(() => layoutItem.value?.appName || app.value?.appName || "")
const instanceId = computed(() => String(layoutItem.value?.id ?? layoutItem.value?.index ?? appName.value))
const vueFile = computed(() => app.value?.vueFile || "")
const hostReloadToken = ref(0)

const renderer = computed(() => {
  const a = app.value
  if (!a) return "missing"
  if (a.hasAppVue && vueFile.value) return "vue"
  if (a.hasAppJs || a.directive) return "angular"
  return "missing"
})

const isInteractive = computed(() => {
  const value = app.value?.interactive
  if (value === undefined || value === null) return true
  return value === true || value === "yes" || value === "required"
})

const normaliseAppId = value => String(value || "").toLowerCase()
const normalisePath = value => String(value || "").replace(/\\/g, "/").toLowerCase()

function dirname(value) {
  const path = normalisePath(value)
  const idx = path.lastIndexOf("/")
  return idx >= 0 ? path.substring(0, idx + 1) : ""
}

function getCatalogueApp(appNameOrAlias) {
  const cat = modManager.uiAppList || {}
  if (!appNameOrAlias) return null
  if (cat[appNameOrAlias]) return cat[appNameOrAlias]

  const requested = normaliseAppId(appNameOrAlias)
  for (const app of Object.values(cat)) {
    if (!app || typeof app !== "object") continue
    if (normaliseAppId(app.appName) === requested) return app
    if (normaliseAppId(app.directive) === requested) return app
    if (normaliseAppId(app.folder) === requested) return app
  }
  return null
}

function appMatchesChange(change) {
  if (!change || change.targeted !== true) return false
  const changedApps = Array.isArray(change.apps) ? change.apps : []
  if (changedApps.length === 0) return false

  const current = app.value || {}
  const currentIds = [
    appName.value,
    current.appName,
    current.directive,
    current.folder,
    current.vueFile,
  ].filter(Boolean).map(normaliseAppId)

  const appMatched = changedApps.some(changedApp => {
    if (!changedApp || (changedApp.hasAppVue === false && !changedApp.vueFile)) return false
    const changedIds = [
      changedApp.appName,
      changedApp.directive,
      changedApp.folder,
      changedApp.vueFile,
    ].filter(Boolean).map(normaliseAppId)
    return changedIds.some(id => currentIds.includes(id))
  })
  if (!appMatched) return false

  const files = Array.isArray(change.files) ? change.files.map(normalisePath) : []
  if (files.length === 0) return true

  const currentVueFile = normalisePath(current.vueFile)
  const currentVueDir = dirname(current.vueFile)
  const currentJsSource = normalisePath(current.jsSource)
  return files.some(file => {
    if (currentJsSource && file === currentJsSource) return false
    return file === currentVueFile || (currentVueDir && file.startsWith(currentVueDir))
  })
}

const hostSizeStyle = computed(() => {
  const r = props.rectPx
  if (!r) return null
  const w = Number(r.width)
  const h = Number(r.height)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return { width: `${w}px`, height: `${h}px` }
})

watch(() => modManager.uiAppRefresh, change => {
  if (renderer.value !== "vue") return
  if (!appMatchesChange(change)) return
  hostReloadToken.value++
})
</script>

<style lang="scss" scoped>
.ui-app-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;

  &--interactive {
    pointer-events: auto;
  }
}

.ui-app-host--embedded {
  position: relative;
  inset: auto;
  width: 100%;
  height: auto;
  min-height: 0;
  overflow: visible;
}

.ui-app-host__missing {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #f88;
  background: rgba(0, 0, 0, 0.4);
  border: 1px dashed #f44;
}
</style>
