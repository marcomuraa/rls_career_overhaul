<template>
  <LayoutMenu
    class="editor"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    heading="Livery Editor">
    <template #topbar-right>
      <CameraViewButton />
    </template>
    <div
      class="editor-content"
      v-bng-on-ui-nav:menu,back,ok="() => {}"
      :class="{
        'layers-collapse': minimizedMode,
      }">
      <component :is="currentView"></component>
    </div>
  </LayoutMenu>
</template>

<script>
import { EDITOR_VIEWS } from "@/modules/liveryEditor/stores"
const EDITOR_VIEWS_COMPONENT = {
  [EDITOR_VIEWS.decalSelector]: DecalSelector,
  [EDITOR_VIEWS.editMode]: EditModeLayout,
  [EDITOR_VIEWS.default]: DefaultLayout,
}
</script>

<script setup>
import { computed, ref, onBeforeMount, watch } from "vue"
import { storeToRefs } from "pinia"
import { vBngOnUiNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { useInfoBar } from "@/services/infoBar"
import { useRouteDataStore } from "@/services/routeData"
import useControls from "@/services/controls"
import { useLiveryEditorStore } from "@/modules/liveryEditor/stores"
import DecalSelector from "@/modules/liveryEditor/components/DecalSelector.vue"
import EditModeLayout from "@/modules/liveryEditor/layouts/EditModeLayout.vue"
import DefaultLayout from "@/modules/liveryEditor/layouts/DefaultLayout.vue"
import { CameraViewButton } from "@/modules/liveryEditor/components"

const store = useLiveryEditorStore()
const infobar = useInfoBar()
const routeDataStore = useRouteDataStore()
const Controls = useControls()
const { showIfController } = storeToRefs(Controls)

infobar.visible = true

const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

const currentView = computed(() => EDITOR_VIEWS_COMPONENT[store.editorView])

const minimizedMode = ref(false)

watch(showIfController, value => {
  store.setUseMousePos(!value)
})

onBeforeMount(async () => {
  await store.startEditor()
  store.setUseMousePos(!showIfController.value)
})
</script>

<style lang="scss" scoped>
$infoBarHeight: 3rem;
$headerHeight: 6rem;

.editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;

  > .editor-header-wrapper {
    width: 100%;
    height: $headerHeight;
  }

  > .editor-content {
    width: 100%;
    height: calc(100% - (#{$headerHeight} + #{$infoBarHeight}));
    padding: 0.5rem 0;

    > .layers-manager-wrapper {
      width: 26rem;
      min-width: 26rem;
      height: 100%;

      &.hidden {
        width: 0;
      }
    }

    > .layer-actions-wrapper {
      width: calc(100% - 26rem);
      align-self: flex-end;
    }

    > .layer-settings-wrapper {
      position: absolute;
      right: 0;
    }
  }

  > .editor-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.5rem;
  }
}

.add-button :deep() {
  display: inline-block;
  width: 100%;
  padding: 0.75rem;
  margin: 0;
  max-width: unset !important;
}
</style>
