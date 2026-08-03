<template>
  <LayoutMenu
    class="livery-manager-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    heading="Saved Liveries"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="main-view-content">
      <BngList
        v-if="files.length > 0"
        v-bng-blur
        :layout="LIST_LAYOUTS.LIST"
        :target-width="14"
        :target-height="6"
        :target-margin="0.25"
        :big="true"
        class="files-list">
        <FileListItem
          v-for="(file, index) in files"
          :key="file.location"
          :name="file.name"
          :location="file.location"
          :modifiedFormatted="file.modifiedFormatted"
          :fileSizeFormatted="file.fileSizeFormatted"
          v-bng-scoped-nav="{ scopeId: 'livery-save-' + index }"
          @load="load(file)"
          @rename="rename(file)"
          @delete="deleteSave(file)" />
      </BngList>
      <div v-else class="empty-save-container">
        <div v-bng-blur class="empty-save-message">No saved liveries</div>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, nextTick, ref } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { vBngBlur, vBngScopedNav } from "@/common/directives"
import { BngList, LIST_LAYOUTS } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { openConfirmation, openFormDialog } from "@/services/popup"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import FileEditForm from "@/modules/liveryEditor/components/fileManager/FileEditForm.vue"
import FileListItem from "@/modules/liveryEditor/components/fileManager/FileListItem.vue"
import { useLiveryMainStore } from "@/modules/liveryEditor/stores/liveryMainStore"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const route = useRoute()
const mainStore = useLiveryMainStore()
const dataFiles = ref([])
const sortKey = ref("modified")
const sortDesc = ref(true)

const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation()

const files = computed(() => {
  if (!Array.isArray(dataFiles.value) || dataFiles.value.length === 0) return []

  const sortOrder = sortDesc.value ? -1 : 1
  return [...dataFiles.value].sort((fileA, fileB) => {
    if (fileA[sortKey.value] < fileB[sortKey.value]) return -1 * sortOrder
    if (fileA[sortKey.value] > fileB[sortKey.value]) return 1 * sortOrder
    return 0
  })
})

// handlesOwnReady flow: load the save files first, then ack the mount and
// activate the route target scope so focus only lands once the list is ready.
async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  await refreshFiles()
  await nextTick()

  if (route.name !== routeName) return

  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  if (!result?.success) return

  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null
  if (route.name !== routeName) return

  activateRouteTargetScope()
}

notifyRouteMountedWhenReady()

const load = (file) => {
  mainStore.load(file)
  lua.extensions.ui_router.navigate("livery.editor", null, null)
}

const rename = async (file) => {
  const model = { name: file.name }

  const response = await openFormDialog(
    FileEditForm,
    model,
    dialogModel => {
      return dialogModel.name !== null && dialogModel.name !== undefined && dialogModel.name !== ""
    },
    "Rename file",
    "Enter new name"
  )

  if (response.value) {
    await lua.extensions.ui_liveryEditor_userData.renameFile(file.name, response.formData.name)
    await refreshFiles()
  }
}

const deleteSave = async (file) => {
  const confirmed = await openConfirmation("Delete", `Are you sure you want to delete ${file.name}`)
  if (confirmed) {
    await lua.extensions.ui_liveryEditor_userData.deleteSaveFile(file.name)
    await refreshFiles()
    return
  }
}

async function refreshFiles() {
  const queriedFiles = await lua.extensions.ui_liveryEditor_userData.getSaveFiles()
  if (!Array.isArray(queriedFiles) || queriedFiles.length === 0) {
    dataFiles.value = []
    return
  }

  dataFiles.value = queriedFiles.map(file => ({
    ...file,
    modifiedFormatted: formatDateTime(file.modified),
    fileSizeFormatted: formatSize(file.fileSize),
  }))
}

function formatDateTime(unixTime) {
  const datetime = new Date(unixTime * 1000)
  return `${datetime.toLocaleDateString()} ${datetime.toLocaleTimeString()}`
}

function formatSize(bytes) {
  const kbs = (bytes / 1024).toFixed(2)
  return `${kbs} KB`
}
</script>

<style lang="scss" scoped>
.livery-manager-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.main-view-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  width: 100%;
  height: 100%;
}

.main-view-content > .files-list {
  align-self: flex-start;
  height: 100%;
  max-width: 64rem;
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
