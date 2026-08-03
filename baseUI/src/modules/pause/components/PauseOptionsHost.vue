<template>
  <div class="pause-options-host">
    <Options
    class="pause-options-interactive"
    ref="optionsRef"
    :category="routeCategory"
    :manage-pause-request="false"
    :sync-route="false"
    :info-hidden="false"
    embedded
    @update:category="onCategoryChange"
    @back="onBack"
    />

    <BngCard v-bng-blur v-show="showInfoPanel" layered-background class="pause-panel pause-options-info">
      <InfoPanel :items="infoView" :class="{ 'info-hidden': !!infoHidden }">
        <div v-if="fpsShown" class="options-info-fps">{{ $t("ui.common.fps") }} <span>{{ fps }}</span></div>
      </InfoPanel>
    </BngCard>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import { vBngBlur } from "@/common/directives"
import { BngCard } from "@/common/components/base"
import Options from "@/common/modules/options/views/Options.vue"
import InfoPanel from "@/common/modules/options/components/InfoPanel.vue"

defineOptions({ name: "PauseOptionsHost" })

const route = useRoute()
const bngVue = window.bngVue || { gotoGameState() {} }
const optionsRef = ref(null)

const routeCategory = computed(() => {
  const category = route.params?.category
  return typeof category === "string" && category.length > 0 ? category : undefined
})

const infoView = computed(() => optionsRef.value?.infoView ?? [])
const infoHidden = computed(() => optionsRef.value?.infoHidden ?? false)
const fps = computed(() => optionsRef.value?.fps ?? "?")
const fpsShown = computed(() => optionsRef.value?.fpsShown ?? false)
const showInfoPanel = computed(() => !infoHidden.value && (infoView.value.length > 0 || fpsShown.value))

async function onCategoryChange(category) {
  const normalizedCategory = typeof category === "string" && category.length > 0 ? category : undefined
  if (normalizedCategory === routeCategory.value) return
  if (normalizedCategory) {
    await bngVue.gotoGameState("pause.options.category", { params: { category: normalizedCategory } })
    return
  }
  await bngVue.gotoGameState("pause.options")
}

async function onBack() {
  await bngVue.gotoGameState("pause")
}

function focusEntry() {
  return !!optionsRef.value?.focusEntry?.()
}

defineExpose({
  focusEntry,
})
</script>

<style scoped lang="scss">
.pause-options-host {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.75rem;
  min-height: 0;
  flex: 1 1 auto;
}

.pause-panel {
  --bng-card-height: unset;
  color: var(--bng-off-white);
  min-height: 18rem;
  max-height: 100%;
}

.pause-options-interactive {
  --bng-card-height: 100%;
  --bng-card-content-bg-opacity: 0;
  color: var(--bng-off-white);
  flex: 0 1 auto;
  width: clamp(36rem, 55vw, 52rem);
  min-width: 30rem;
  min-height: 0;

  :deep(.card-cnt) {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}

.pause-options-info {
  --bng-card-height: unset;
  --bng-card-content-bg: var(--bng-off-black);
  --bng-card-content-bg-opacity: 0.8;
  flex: 0 0 auto;
  width: clamp(14rem, 20vw, 20rem);
  min-width: 12rem;
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
</style>
