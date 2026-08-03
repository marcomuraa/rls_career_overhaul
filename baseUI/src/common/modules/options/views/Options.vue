<template>
  <div
    :class="{
      'options-wrapper': true,
      embedded: props.embedded,
    }"
    v-bng-on-ui-nav:tab_l,tab_r="mainCatNav"
    v-bng-on-ui-nav:back,menu="back"
  >
    <template v-if="!loaded">
      <div class="options-container options-loading">
        <BlurBackground />
        <div class="background"></div>
        <div class="options-content-wrapper">
          <div class="options-message">
            <div class="message-content">
              {{ $t("ui.repository.loading") }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <OptionsCategoryTabs
      v-if="loaded"
      ref="elCategories"
      :categories-view="categoriesView"
      :category-range="categoryRange"
      :search-active="searchActive"
      :editable="editable"
      :embedded="props.embedded"
      @category-click="catNavigate"
      @category-edit="categoryEdit"
      @search-click="activateSearchTab"
    />

    <OptionsBody
      v-if="loaded"
      :options="options"
      :categories="categories"
      :category-index="categoryIndex"
      :subcategories-view="subcategoriesView"
      :all-categories="allCategories"
      :persistent-view="persistentView"
      :search-active="searchActive"
      :special="special"
      :editable="editable"
      :items-view="itemsView"
      :show-info-panel="false"
      :search-scope-id="SEARCH_SCOPE_ID"
      :scoped-nav="scopedNav"
      :cat-navigate="catNavigate"
      :category-edit="categoryEdit"
      :from-content="fromContent"
      :back="back"
      :on-click="onClick"
      :on-change="onChange"
      :item-edit="itemEdit"
      :cat-items-paste="catItemsPaste"
      :set-search-focused="setSearchFocused"
      :items-container-ref="itemsContainer"
      :search-ref="elSearch"
      :embedded="props.embedded"
    >
      <template #editor>
        <component
          v-if="options.editor && EditUI"
          :is="EditUI.default"
          :options="options"
          :categories="categories"
          v-model:category-index="categoryIndex"
          v-model:special="special"
          v-model:editable="editable"
        />
      </template>
    </OptionsBody>
  </div>
</template>

<script>
export const optionsProps = {
  category: String,
  managePauseRequest: {
    type: Boolean,
    default: true,
  },
  syncRoute: {
    type: Boolean,
    default: true,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
  infoHidden: {
    type: Boolean,
    default: false,
  },
}
</script>

<script setup>
import { vBngOnUiNav } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import OptionsCategoryTabs from "../components/OptionsCategoryTabs.vue"
import OptionsBody from "../components/OptionsBody.vue"
import { useOptionsView } from "../useOptionsView"

const props = defineProps(optionsProps)
const emit = defineEmits(["update:category", "back"])

const {
  scopedNav,
  options,
  loaded,
  categories,
  categoryIndex,
  categoriesView,
  categoryRange,
  subcategoriesView,
  persistentView,
  allCategories,
  itemsView,
  special,
  searchActive,
  searchFocused,
  editable,
  EditUI,
  infoView,
  infoHidden: infoHiddenState,
  fps,
  fpsShown,
  frameTimeMs,
  cpuTimeMs,
  gpuTimeMs,
  waitForGpuMs,
  systemMemoryUsedMb,
  systemMemoryOtherAppsMb,
  systemMemoryTotalMb,
  gpuMemoryUsedMb,
  gpuMemoryOtherAppsMb,
  gpuMemoryTotalMb,
  SEARCH_SCOPE_ID,
  elCategories,
  elSearch,
  itemsContainer,
  activateSearchTab,
  fromContent,
  mainCatNav,
  catNavigate,
  onChange,
  onClick,
  itemEdit,
  categoryEdit,
  catItemsPaste,
  back,
  focusEntry,
} = useOptionsView(props, emit)

const setSearchFocused = focused => {
  searchFocused.value = focused
}

defineExpose({
  focusEntry,
  get categoryIndex() { return categoryIndex.value },
  get infoView() { return infoView.value },
  get infoHidden() { return infoHiddenState.value },
  get fps() { return fps.value },
  get fpsShown() { return fpsShown.value },
  get frameTimeMs() { return frameTimeMs.value },
  get cpuTimeMs() { return cpuTimeMs.value },
  get gpuTimeMs() { return gpuTimeMs.value },
  get waitForGpuMs() { return waitForGpuMs.value },
  get systemMemoryUsedMb() { return systemMemoryUsedMb.value },
  get systemMemoryOtherAppsMb() { return systemMemoryOtherAppsMb.value },
  get systemMemoryTotalMb() { return systemMemoryTotalMb.value },
  get gpuMemoryUsedMb() { return gpuMemoryUsedMb.value },
  get gpuMemoryOtherAppsMb() { return gpuMemoryOtherAppsMb.value },
  get gpuMemoryTotalMb() { return gpuMemoryTotalMb.value },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
$z-index-base: var(--z-index-override, 1);

$rem: calc-ui-rem(1);
$options-width: 40rem;
$info-width: 20rem;
$options-width-full: calc($options-width + $info-width);

.options-wrapper {
  --bng-options-color: var(--bng-off-white);
  --bng-options-bg-categories: var(--bng-cool-gray-800);
  --bng-options-bg-categories-opacity: 0.8;
  --bng-options-bg-container: var(--bng-off-black);
  --bng-options-bg-container-opacity: 0.8;
  --bng-options-bg-info: var(--bng-cool-gray-900);
  --bng-options-bg-info-opacity: 0.8;

  --category-button-bg: var(--bng-off-black);
  --category-button-hover-bg: var(--bng-ter-blue-gray-600);
  --category-button-active-bg: var(--bng-options-container);
  --category-button-disabled-bg: var(--bng-off-black);
  --category-button-bg-opacity: 0.01;
  --category-button-hover-bg-opacity: 0.5;
  --category-button-active-bg-opacity: 0.5;
  --category-button-disabled-opacity: 0.5;
  --category-button-border-radius: var(--bng-corners-1);

  --category-button-selected-bg: var(--bng-off-black);
  --category-button-selected-bg-opacity: var(--bng-options-bg-container-opacity);

  --options-width: #{$options-width-full};
  @media (max-width: $options-width-full) {
    --options-width: #{$options-width};
  }

  position: relative;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: stretch;
  gap: 0.5em;

  font-size: $rem;
  // width: 100%;
  // max-width: 100%;
  // height: calc(100% - 5rem);
  color: var(--bng-options-color);
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: var(--bng-options-bg-opacity, 0);
  @include calculate-z-index($z-index-base, 1, -1);
}

.options-container {
  flex: 1 1 auto;
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: stretch;
  width: var(--options-width);
  max-width: 100%;
  overflow: hidden;
  border-radius: 0.5em;

  .background {
    background-color: var(--bng-options-bg-categories);
    opacity: var(--bng-options-bg-categories-opacity);
  }
}

.options-content-wrapper {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
  > * {
    flex: 0 0 auto;
  }
}

.options-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  padding: 1em;
  .message-content {
    display: inline-block;
    max-width: 100%;
    font-size: 2em;
    font-style: italic;
    font-weight: 200;
    text-align: center;
    color: var(--bng-off-white);
    opacity: 0.8;
    @include calculate-z-index($z-index-base, 1);
  }
}

.options-wrapper.embedded {
  --options-width: 100%;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

:deep(.options-setting-highlight) {
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px dashed #f60;
    animation: blink 333ms infinite alternate;
    pointer-events: none;
  }
  @keyframes blink {
    from { opacity: 1; }
    to { opacity: 0.5; }
  }
}
</style>
