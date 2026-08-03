<template>
  <LayoutMenu
    class="settings-main-view"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    heading="Settings">
    <div class="main-view-content" v-bng-on-ui-nav:back,menu="goBack">
      <BngCard v-bng-blur>
        <BngCardHeading>Settings</BngCardHeading>
        <div class="settings-container">
          <div class="settings-item">
            <div class="settings-item-name">Use Surface Normal</div>
            <BngSwitch v-bng-ui-nav-focus="0" v-bng-focus-if="true" v-model="useSurfaceNormal" :label="useSurfaceNormal ? 'Yes' : 'No'" />
          </div>
        </div>
      </BngCard>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, ref, onBeforeMount, onMounted, onBeforeUnmount, watch } from "vue"
import { useInfoBar } from "@/services/infoBar"
import { useRouteDataStore } from "@/services/routeData"
import { vBngOnUiNav, vBngBlur, vBngUiNavFocus, vBngFocusIf } from "@/common/directives"
import { lua, useBridge } from "@/bridge"
import { LayoutMenu } from "@/common/layouts"
import { BngCard, BngCardHeading, BngSwitch } from "@/common/components/base"

const infobar = useInfoBar()
const routeDataStore = useRouteDataStore()
const { events } = useBridge()
const stateData = ref(null)

const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

const useSurfaceNormal = ref(false)

watch(
  () => useSurfaceNormal.value,
  async value => {
    await lua.extensions.ui_liveryEditor.useSurfaceNormal(value)
  }
)

const NAV_HINTS = [{ id: "back", content: { type: "binding", props: { uiEvent: "back" }, label: "Back" }, action: goBack }]

onBeforeMount(() => {
  infobar.clearHints()
  infobar.addHints(NAV_HINTS)
})

onMounted(async () => {
  infobar.visible = true
  infobar.showSysInfo = true
  events.on("liveryEditor_settingsData", onSettingsData)
  await lua.extensions.ui_liveryEditor.requestSettingsData()
})

onBeforeUnmount(() => {
  events.off("liveryEditor_settingsData", onSettingsData)
})

function onSettingsData(data) {
  console.log("onSettingsData", data)
  stateData.value = data
  useSurfaceNormal.value = data.useSurfaceNormal
}

function goBack(event) {
  lua.extensions.ui_router.navigate("livery.editor", null, null)
  event.stopPropagation()
}
</script>

<style lang="scss" scoped>
$infobarHeight: 4rem;

.settings-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  color: white;

  margin-bottom: $infobarHeight;

  > .main-view-content {
    display: flex;
    justify-content: flex-end;
    flex-grow: 1;
  }
}

.settings-container {
  display: flex;
  flex-direction: column;
  padding: 0 1rem 1rem;

  > .settings-item {
    display: flex;
    flex-direction: column;

    > .settings-item-name {
      font-size: 1.125em;
      font-weight: 600;
    }

    > .settings-item-description {
      padding: 0.25rem 0.75rem;
    }

    > * {
      padding-top: 0.5rem;
    }
  }
}
</style>
