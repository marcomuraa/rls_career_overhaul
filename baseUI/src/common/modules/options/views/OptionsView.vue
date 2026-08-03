<template>
  <LayoutMenu
    class="options-view"
    :breadcrumbs="breadcrumbItems"
    :heading="$tt('ui.options.options')"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="options-view-content">
      <div
        class="options-view-main"
        v-bng-frustum-mover:left.smooth="shouldSmoothCameraOffset"
      >
        <Options
          ref="optionsRef"
          v-bind="props"
          :info-hidden="false"
          @update:category="$emit('update:category', $event)"
          @back="$emit('back')"
        />
      </div>
      <BngCard v-bng-blur v-show="showInfoPanel" layered-background class="pause-panel pause-options-info">
        <InfoPanel :items="infoView" :class="{ 'info-hidden': !!infoHidden }">
          <div v-if="showFps" class="options-info-fps">
            {{ $t("ui.common.fps") }} <span>{{ fps }}</span>

            <div class="options-info-fps-extra">
              <div class="options-info-timing">
                <div>{{ $t("ui.common.frameTime") }} <span>{{ frameTimeMs }}</span> ms</div>
                <div>{{ $t("ui.common.waitForGpu") }} <span>{{ waitForGpuMs }}</span> ms</div>
                <div>{{ $t("ui.common.cpuTime") }} <span>{{ cpuTimeMs }}</span> ms</div>
                <div>{{ $t("ui.common.gpuTime") }} <span>{{ gpuTimeMs }}</span> ms</div>
              </div>
              <div class="options-info-memory">
                {{ $t("ui.common.systemMemory") }} <span>{{ systemMemoryUsedMb }}</span>/<span>{{ systemMemoryTotalMb }}</span> MB
                <div class="options-info-memory-other">{{ $t("ui.common.otherApps") }} <span>{{ systemMemoryOtherAppsMb }}</span> MB</div>
              </div>
              <div class="options-info-memory">
                {{ $t("ui.common.gpuMemory") }} <span>{{ gpuMemoryUsedMb }}</span>/<span>{{ gpuMemoryTotalMb }}</span> MB
                <div class="options-info-memory-other">{{ $t("ui.common.otherApps") }} <span>{{ gpuMemoryOtherAppsMb }}</span> MB</div>
              </div>
            </div>
          </div>
        </InfoPanel>
      </BngCard>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, inject, ref, unref } from "vue"
import { vBngBlur, vBngFrustumMover } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { BngCard } from "@/common/components/base"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"
import Options, { optionsProps } from "./Options.vue"
import InfoPanel from "../components/InfoPanel.vue"

const props = defineProps({ ...optionsProps })
defineEmits(["update:category", "back"])

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))

const routeDataStore = useRouteDataStore()
const optionsRef = ref(null)
const currentRouteName = computed(() => routeDataStore.route?.name || routeDataStore.routeName || "")
const shouldSmoothCameraOffset = computed(() => currentRouteName.value.startsWith("pause.options"))
const breadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])
const infoView = computed(() => optionsRef.value?.infoView ?? [])
const infoHidden = computed(() => optionsRef.value?.infoHidden ?? false)
const fps = computed(() => optionsRef.value?.fps ?? "?")
const frameTimeMs = computed(() => optionsRef.value?.frameTimeMs ?? "?")
const cpuTimeMs = computed(() => optionsRef.value?.cpuTimeMs ?? "?")
const gpuTimeMs = computed(() => optionsRef.value?.gpuTimeMs ?? "?")
const waitForGpuMs = computed(() => optionsRef.value?.waitForGpuMs ?? "?")
const systemMemoryUsedMb = computed(() => optionsRef.value?.systemMemoryUsedMb ?? "?")
const systemMemoryOtherAppsMb = computed(() => optionsRef.value?.systemMemoryOtherAppsMb ?? "?")
const systemMemoryTotalMb = computed(() => optionsRef.value?.systemMemoryTotalMb ?? "?")
const gpuMemoryUsedMb = computed(() => optionsRef.value?.gpuMemoryUsedMb ?? "?")
const gpuMemoryOtherAppsMb = computed(() => optionsRef.value?.gpuMemoryOtherAppsMb ?? "?")
const gpuMemoryTotalMb = computed(() => optionsRef.value?.gpuMemoryTotalMb ?? "?")
const fpsShown = computed(() => optionsRef.value?.fpsShown ?? false)
const showFps = computed(() => fpsShown.value && !isSimpleMenu.value)
const showInfoPanel = computed(() => !infoHidden.value && (infoView.value.length > 0 || showFps.value))

async function onBreadcrumbClick(item) {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

async function onBreadcrumbBack() {
  await lua.extensions.ui_router.back()
}

defineExpose({
  get currentCategory() { return optionsRef.value?.categoryIndex },
  focusEntry: () => optionsRef.value?.focusEntry?.(),
})
</script>

<style lang="scss" scoped>
.options-view {
  --content-flow: column;
  --content-max-width: unset;
  --bng-tile-margins: 0;

  color: var(--bng-off-white);

  max-height: 100%;
}

.options-view-content {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.5em;
}

.options-view-main {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
}

.pause-options-info {
  color: var(--bng-off-white);

  --bng-card-height: unset;
  --bng-card-content-bg: var(--bng-off-black);
  --bng-card-content-bg-opacity: 0.8;

  flex: 0 0 auto;

  width: clamp(14rem, 20vw, 20rem);

  min-width: 12rem;
  min-height: 18rem;
  max-height: 100%;

  margin: 5em 0 2em 0;
}

.options-info-fps {
  display: block;
  margin: 0.5em 0;
  font-size: 1.5em;
  font-weight: 200;
  text-align: center;
  color: var(--bng-off-white);
  > span {
    font-weight: 400;
  }
}

.options-info-fps-extra {
  margin-top: 0.35em;
  font-size: 0.6em;
  line-height: 1.5;
  font-weight: 200;
  opacity: 0.75;

  > div {
    margin: 0.1em 0;
  }

  span {
    font-weight: 400;
  }
}

.options-info-timing {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  justify-content: center;
  column-gap: 0.5em;
  white-space: nowrap;
}

.options-info-memory {
  white-space: nowrap;
}

.options-info-memory-other {
  font-size: 0.8em;
}
</style>
