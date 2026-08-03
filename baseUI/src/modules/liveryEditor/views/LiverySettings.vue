<template>
  <LayoutMenu
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    :show-breadcrumb-back-button="true"
    class="settings-main-view"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="main-view-content">
      <BngCard v-bng-blur>
        <BngCardHeading>Settings</BngCardHeading>
        <div class="settings-container">
          <div class="settings-item">
            <div class="settings-item-name">Use Surface Normal</div>
            <BngSwitch
              bng-scoped-nav-autofocus
              v-model="useSurfaceNormal"
              :label="useSurfaceNormal ? 'Yes' : 'No'"
            />
          </div>
        </div>
      </BngCard>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { lua, useBridge } from "@/bridge"
import { vBngBlur } from "@/common/directives"
import { BngCard, BngCardHeading, BngSwitch } from "@/common/components/base"
import { LayoutMenu } from "@/common/layouts"
import { useLiveryBreadcrumbNavigation } from "@/modules/liveryEditor/composables/useLiveryBreadcrumbNavigation"

const { events } = useBridge()
const useSurfaceNormal = ref(false)

const { breadcrumbItems, onBreadcrumbClick, onBreadcrumbBack } = useLiveryBreadcrumbNavigation()

watch(
  () => useSurfaceNormal.value,
  async value => {
    await lua.extensions.ui_liveryEditor.useSurfaceNormal(value)
  }
)

onMounted(async () => {
  events.on("liveryEditor_settingsData", onSettingsData)
  await lua.extensions.ui_liveryEditor.requestSettingsData()
})

onBeforeUnmount(() => {
  events.off("liveryEditor_settingsData", onSettingsData)
})

function onSettingsData(data) {
  console.log("onSettingsData", data)
  useSurfaceNormal.value = data.useSurfaceNormal
}
</script>

<style lang="scss" scoped>
.settings-main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0.5rem;
}

.main-view-content {
  display: flex;
  justify-content: flex-start;
  flex-grow: 1;
  width: 100%;
  height: 100%;
  max-height: calc(100% - 6rem);
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
