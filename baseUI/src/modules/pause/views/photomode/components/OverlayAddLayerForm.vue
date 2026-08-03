<template>
  <div class="overlay-add-layer-form">
    <BngDropdownContainer
      v-model:opened="dropdownOpen"
      class="overlay-add-layer-form__dropdown"
    >
      <template #display>
        <span class="overlay-add-layer-form__dropdown-display">
          <img
            v-if="displayPreviewUrl"
            class="overlay-add-layer-form__dropdown-thumb"
            :src="displayPreviewUrl"
            alt=""
          />
          <span class="overlay-add-layer-form__dropdown-name">
            {{ displayLabel || placeholderLabel }}
          </span>
        </span>
      </template>

      <div class="overlay-add-layer-form__dropdown-panel">
        <template v-if="isImage">
          <BngList
            class="overlay-add-layer-form__tiles"
            :tile-width="6.5"
            :tile-margin="0.3"
          >
            <template v-if="model.images?.length">
              <BngCardHeading v-if="hasLiveries" bng-list-title>{{ $t("ui.photomode.overlay.folderImagesGroup") }}</BngCardHeading>
              <BngImageTile
                v-for="img in model.images"
                :key="img"
                class="overlay-add-layer-form__tile"
                :class="{ 'overlay-add-layer-form__tile--active': model.selectedType !== 'livery' && model.selected === img }"
                :label="img"
                :external-image="imageUrlFor(img)"
                @click="pick(img, 'image')"
              />
            </template>
            <template v-for="cat in liveryCategories" :key="cat.value">
              <BngCardHeading bng-list-title>{{ cat.label }}</BngCardHeading>
              <BngImageTile
                v-for="tex in cat.items"
                :key="tex.path"
                class="overlay-add-layer-form__tile"
                :class="{ 'overlay-add-layer-form__tile--active': model.selectedType === 'livery' && model.selected === tex.path }"
                :label="tex.label || tex.name"
                :external-image="tex.path"
                @click="pick(tex.path, 'livery')"
              />
            </template>
          </BngList>
          <p v-if="!model.images?.length && !hasLiveries" class="overlay-add-layer-form__empty">
            {{ $t("ui.photomode.overlay.noImagesInDir") }}
          </p>
        </template>

        <template v-else>
          <BngList
            class="overlay-add-layer-form__tiles"
            :tile-width="8"
            :tile-margin="0.3"
          >
            <template v-if="showAppGroups">
              <BngCardHeading bng-list-title>{{ $t("ui.photomode.title") }}</BngCardHeading>
              <BngImageTile
                v-for="app in photomodeApps"
                :key="app.appName"
                class="overlay-add-layer-form__tile"
                :class="{ 'overlay-add-layer-form__tile--active': model.selected === app.appName }"
                :label="app.displayName || app.appName"
                :external-image="appPreviewUrl(app)"
                :icon="app.preview ? undefined : icons.square"
                @click="pick(app.appName)"
              />
              <BngCardHeading bng-list-title>{{ $t("ui.photomode.overlay.otherAppsGroup") }}</BngCardHeading>
              <BngImageTile
                v-for="app in otherApps"
                :key="app.appName"
                class="overlay-add-layer-form__tile"
                :class="{ 'overlay-add-layer-form__tile--active': model.selected === app.appName }"
                :label="app.displayName || app.appName"
                :external-image="appPreviewUrl(app)"
                :icon="app.preview ? undefined : icons.square"
                @click="pick(app.appName)"
              />
            </template>
            <template v-else>
              <BngImageTile
                v-for="app in model.uiApps"
                :key="app.appName"
                class="overlay-add-layer-form__tile"
                :class="{ 'overlay-add-layer-form__tile--active': model.selected === app.appName }"
                :label="app.displayName || app.appName"
                :external-image="appPreviewUrl(app)"
                :icon="app.preview ? undefined : icons.square"
                @click="pick(app.appName)"
              />
            </template>
          </BngList>
          <p v-if="!model.uiApps?.length" class="overlay-add-layer-form__empty">
            {{ $t("ui.photomode.overlay.noUiApps") }}
          </p>
        </template>
      </div>
    </BngDropdownContainer>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { $translate } from "@/services/translation"
import { BngDropdownContainer, BngList, BngImageTile, BngCardHeading, icons } from "@/common/components/base"
import { withOverlayTs } from "../useOverlays"

defineOptions({ name: "OverlayAddLayerForm" })

const model = defineModel({
  type: Object,
  default: () => ({
    kind: "image",
    selected: "",
    images: [],
    uiApps: [],
    folderPath: "",
    ts: "",
  }),
})

const dropdownOpen = ref(false)

const isImage = computed(() => model.value?.kind !== "uiapp")

const photomodeApps = computed(() => (model.value?.uiApps || []).filter(app => app.photomode))
const otherApps = computed(() => (model.value?.uiApps || []).filter(app => !app.photomode))
const showAppGroups = computed(() => photomodeApps.value.length > 0 && otherApps.value.length > 0)

const liveryCategories = computed(() => (model.value?.liveryTextures || []).filter(cat => cat.items?.length))
const hasLiveries = computed(() => liveryCategories.value.length > 0)

function liveryNameFor(path) {
  for (const cat of liveryCategories.value) {
    const found = (cat.items || []).find(tex => tex.path === path)
    if (found) return found.label || found.name || path
  }
  return path
}

const placeholderLabel = computed(() =>
  isImage.value
    ? $translate.instant("ui.photomode.overlay.pickImage")
    : $translate.instant("ui.photomode.overlay.pickUiApp")
)

const displayLabel = computed(() => {
  const sel = model.value?.selected
  if (!sel) return ""
  if (isImage.value) {
    if (model.value?.selectedType === "livery") return liveryNameFor(sel)
    return sel
  }
  const app = (model.value?.uiApps || []).find(a => a.appName === sel)
  return app?.displayName || app?.appName || sel
})

const displayPreviewUrl = computed(() => {
  const sel = model.value?.selected
  if (!sel) return ""
  if (isImage.value) {
    // livery paths are already full VFS urls; folder images resolve via folderPath
    if (model.value?.selectedType === "livery") return sel
    return imageUrlFor(sel)
  }
  const app = (model.value?.uiApps || []).find(a => a.appName === sel)
  return app ? appPreviewUrl(app) : ""
})

function imageUrlFor(imageName) {
  const folder = model.value?.folderPath || ""
  if (!folder || !imageName) return ""
  return withOverlayTs(`${folder}/${imageName}`, model.value?.ts)
}

const appPreviewUrl = app => typeof app?.preview === "string" ? app.preview : ""

function pick(value, type = "image") {
  model.value = { ...model.value, selected: value, selectedType: type }
  dropdownOpen.value = false
}
</script>

<style lang="scss" scoped>
.overlay-add-layer-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 28rem;
}

.overlay-add-layer-form__dropdown {
  width: 100%;
}

.overlay-add-layer-form__dropdown-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.overlay-add-layer-form__dropdown-thumb {
  width: 1.8rem;
  height: 1.8rem;
  object-fit: cover;
  border-radius: 0.2rem;
  background: rgba(var(--bng-off-white-rgb), 0.06);
}

.overlay-add-layer-form__dropdown-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-add-layer-form__dropdown-panel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem;
}

.overlay-add-layer-form__tiles {
  width: 26em;
  max-width: 60vw;
  max-height: 45vh;
  overflow: auto;
}

.overlay-add-layer-form__tile--active {
  background: rgba(var(--bng-orange-b400-rgb), 0.18);
  box-shadow:
    inset 0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.55),
    0 0 0 1px rgba(var(--bng-orange-b400-rgb), 0.18);
  border-radius: var(--bng-corners-1);
}

.overlay-add-layer-form__empty {
  margin: 0;
  padding: 0.45rem 0.6rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-off-black-rgb), 0.4);
  font-size: 0.82rem;
  color: rgba(var(--bng-off-white-rgb), 0.82);
}
</style>
