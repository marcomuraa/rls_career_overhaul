<template>
  <div :class="{ 'options-container': true, embedded }">
    <div
      class="options-subcategories"
      :class="{ 'controller-nav-active': showIfController }"
      v-bng-scoped-nav="{
        scopeId: 'options-subcategories',
        preferAutoFocus: true,
        bubbleWhitelistEvents: ['context', 'tab_l', 'tab_r', 'menu'],
      }"
      v-bng-on-ui-nav:ok.focusRequired="() => scopedNav.switchScope('options-content-wrapper')"
      v-bng-on-ui-nav:back="back"
    >
      <BlurBackground />
      <Background class="bg" v-bng-blur />
      <!-- <div class="background" v-bng-blur></div> -->
      <template v-for="cat in subcategoriesView" :key="'cat-' + cat.categoryId">
        <div v-if="cat.divider" class="categories-divider"></div>
        <div v-else-if="cat.spacer" class="categories-spacer"></div>
        <CategorySide
          v-else
          :id="'options-cat-' + cat.categoryIndex"
          :class="{ 'no-focus-frame': !showIfController }"
          :bng-scoped-nav-autofocus="cat.categoryIndex === categoryIndex ? 'true' : null"
          :index="cat.categoryIndex"
          :has-subcategories="cat.hasSubcategories"
          :selected="cat.categoryIndex === categoryIndex"
          :subcategory="cat.subcategoryMode"
          :icon="cat.icon"
          :hidden-by-condition="cat.hiddenByCondition"
          :debug-settings="cat.debugSettings"
          @click="catNavigate(cat)"
          @focus="catNavigate(cat, false)"
        >{{ $tt(cat.label) }}</CategorySide>
      </template>

      <CategorySide
        v-if="subcategoriesView.length === 0 && allCategories[categoryIndex]?.persistent"
        :class="{ 'no-focus-frame': !showIfController }"
        :bng-scoped-nav-autofocus="'true'"
        :icon="allCategories[categoryIndex].icon"
        selected
      >{{ $tt(allCategories[categoryIndex].label) }}</CategorySide>

      <CategorySide
        v-if="searchActive"
        :class="{ 'no-focus-frame': !showIfController }"
        icon="search"
        selected
      >{{ $tt("ui.common.search") }}</CategorySide>
      <CategorySide
        v-else-if="special === 'categories-edit'"
        :class="{ 'no-focus-frame': !showIfController }"
        icon="listIndented"
        selected
      >Edit categories</CategorySide>

      <div class="options-editor-slot">
        <slot name="editor" />
      </div>

      <template v-if="persistentView.length > 0">
        <div class="categories-spacer"></div>
        <template v-if="editable && special === 'categories-edit'">
          <CategorySide
            v-for="cat in persistentView"
            :key="'cat-' + cat.categoryId"
            :id="'options-cat-' + cat.categoryIndex"
            :class="{ 'no-focus-frame': !showIfController }"
            :has-subcategories="cat.hasSubcategories"
            :subcategory="cat.subcategoryMode"
            :icon="cat.icon"
            :index="cat.categoryIndex"
            :hidden-by-condition="cat.hiddenByCondition"
            :debug-settings="cat.debugSettings"
            editable
            @click="categoryEdit('edit', cat.categoryIndex)"
            @edit-cmd="categoryEdit"
          >{{ cat.spacer || cat.divider ? "---" : $tt(cat.label) }}</CategorySide>
          <CategorySide
            :class="{ 'no-focus-frame': !showIfController }"
            icon="plus"
            @click="categoryEdit('add', true)"
            :style="!editable ? { opacity: 0, pointerEvents: 'none' } : {}"
          >New category</CategorySide>
        </template>
        <template v-else>
          <template v-for="cat in persistentView" :key="'cat-' + cat.categoryId">
            <div v-if="cat.spacer" class="categories-spacer"></div>
            <div v-else-if="cat.divider" class="categories-divider"></div>
            <CategorySide
              v-else
              :id="'options-cat-' + cat.categoryIndex"
              :class="{ 'no-focus-frame': !showIfController }"
              :bng-scoped-nav-autofocus="cat.categoryIndex === categoryIndex ? 'true' : null"
              :has-subcategories="cat.hasSubcategories"
              :selected="cat.categoryIndex === categoryIndex"
              :subcategory="cat.subcategoryMode"
              :icon="cat.icon"
              :index="cat.categoryIndex"
              :hidden-by-condition="cat.hiddenByCondition"
              :debug-settings="cat.debugSettings"
              @click="catNavigate(cat)"
            >{{ $tt(cat.label) }}</CategorySide>
          </template>
        </template>
      </template>
    </div>

    <div
      class="options-content-wrapper"
      :class="{ 'controller-nav-active': showIfController }"
      v-bng-scoped-nav="{
        scopeId: 'options-content-wrapper',
        canDeactivate: () => false,
        bubbleWhitelistEvents: ['context', 'tab_l', 'tab_r', 'menu'],
        canBubbleEvent: canBubbleContentEvent,
      }"
      v-bng-on-ui-nav:back="fromContent"
      @activate="setContentScopeActive(true)"
      @deactivate="setContentScopeActive(false)"
      @suspend="setContentScopeActive(false)"
    >
      <BlurBackground class="background" :class="{ 'background-no-info': infoHidden || !showInfoPanel }" />
      <Background class="bg" v-bng-blur />
      <!-- <div class="background" :class="{ 'background-no-info': infoHidden || !showInfoPanel }" v-bng-blur></div> -->
      <div
        v-if="categoryIndex > -1"
        ref="localItemsContainer"
        class="options-content"
        :class="{ 'full-width': !showInfoPanel }"
        v-bng-ui-nav-scroll.force
      >
        <Item
          v-for="(item, index) in itemsView"
          :key="getOptionItemKey(item)"
          :parent="categories[categoryIndex]"
          :index="index"
          :level="0"
          :data="item"
          @click="onClick"
          @change="onChange"
          @edit-cmd="itemEdit"
        />
        <div v-if="editable" class="options-add-item">
          <BngButton
            :accent="ACCENTS.outlined"
            :icon="icons.plus"
            @click="options.editor.itemAdd(categories[categoryIndex])"
          >Add new item</BngButton>
          <BngButton
            :accent="ACCENTS.outlined"
            :icon="icons.addListItem"
            :disabled="!options.editor.clipItems.value.length"
            @click="catItemsPaste()"
          >Paste {{ options.editor.clipTitle.value }}</BngButton>
          <BngButton
            :accent="ACCENTS.outlined"
            :icon="options.editor.selectedItems.value.size > 0 ? icons.checkboxOn : icons.checkboxOff"
            @click="options.editor.itemSelectAll(categories[categoryIndex])"
          >{{ options.editor.selectedItems.value.size > 0 ? "Deselect all" : "Select all" }}</BngButton>
        </div>
      </div>

      <div
        v-else-if="searchActive"
        class="options-content options-content-search"
        :class="{ 'full-width': !showInfoPanel }"
      >
        <div class="options-search-input options-search-input-in-content" :class="{ 'search-active': searchActive }">
          <BngInput
            ref="localSearch"
            class="search-input"
            v-model.trim="options.searchText.value"
            :scope-id="searchScopeId"
            :leading-icon="icons.search"
            :label="$tt('ui.common.search')"
            floating-label
            show-external-button
            @focus="setSearchFocused(true)"
            @blur="setSearchFocused(false)"
          />
        </div>
        <div class="options-search-results" bng-ui-scope="options-content" v-bng-ui-nav-scroll.force>
          <Item
            v-for="(item, index) in options.searchResults.value"
            :key="'search-' + index"
            :index="index"
            :level="0"
            :data="item"
            @click="onClick"
            @change="onChange"
          />
        </div>
      </div>

      <div
        v-else-if="special === 'categories-edit'"
        class="options-content"
        :class="{ 'full-width': !showInfoPanel }"
        bng-ui-scope="options-content"
      >
        <template v-for="cat in allCategories" :key="'cat-' + cat.categoryId">
          <CategorySide
            v-if="!cat.persistent"
            :id="'options-cat-' + cat.categoryIndex"
            :has-subcategories="cat.hasSubcategories"
            :subcategory="cat.subcategoryMode"
            :icon="cat.icon"
            :index="cat.categoryIndex"
            :hidden-by-condition="cat.hiddenByCondition"
            :debug-settings="cat.debugSettings"
            :editable="editable"
            @click="categoryEdit('edit', cat.categoryIndex)"
            @edit-cmd="categoryEdit"
          >{{ cat.spacer || cat.divider ? "---" : $tt(cat.label) }}</CategorySide>
        </template>
        <CategorySide
          v-if="editable"
          icon="plus"
          @click="categoryEdit('add')"
          :style="!editable ? { opacity: 0, pointerEvents: 'none' } : {}"
        >New category</CategorySide>
      </div>

      <div v-if="showInfoPanel" ref="localInfoPanel" class="options-info" :class="{ 'info-hidden': !!special }">
        <BlurBackground />
        <div class="background" v-bng-blur></div>
        <span v-for="tip in infoView" :key="tip.id" v-html="tip.text"></span>
        <div class="options-spacer"></div>
        <div v-if="fpsShown" class="options-info-fps">FPS: <span>{{ fps }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from "vue"
import { storeToRefs } from "pinia"
import { BngInput, BngButton, ACCENTS, icons } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { Background } from "@/common/components/utility"
import useControls from "@/services/controls"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import CategorySide from "./CategorySide.vue"
import Item from "./Item.vue"
import { getOptionItemKey } from "../options"

const props = defineProps({
  options: {
    type: Object,
    required: true,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  categoryIndex: {
    type: Number,
    default: -1,
  },
  subcategoriesView: {
    type: Array,
    default: () => [],
  },
  allCategories: {
    type: Array,
    default: () => [],
  },
  persistentView: {
    type: Array,
    default: () => [],
  },
  searchActive: Boolean,
  special: String,
  editable: Boolean,
  itemsView: {
    type: Array,
    default: () => [],
  },
  showInfoPanel: {
    type: Boolean,
    default: true,
  },
  infoHidden: Boolean,
  infoView: {
    type: Array,
    default: () => [],
  },
  fpsShown: Boolean,
  fps: {
    type: [String, Number],
    default: "?",
  },
  searchScopeId: {
    type: String,
    required: true,
  },
  scopedNav: {
    type: Object,
    required: true,
  },
  catNavigate: {
    type: Function,
    required: true,
  },
  categoryEdit: {
    type: Function,
    required: true,
  },
  fromContent: {
    type: Function,
    required: true,
  },
  back: {
    type: Function,
    required: true,
  },
  onClick: {
    type: Function,
    required: true,
  },
  onChange: {
    type: Function,
    required: true,
  },
  itemEdit: {
    type: Function,
    required: true,
  },
  catItemsPaste: {
    type: Function,
    required: true,
  },
  setSearchFocused: {
    type: Function,
    required: true,
  },
  itemsContainerRef: {
    type: Object,
    default: null,
  },
  searchRef: {
    type: Object,
    default: null,
  },
  infoPanelRef: {
    type: Object,
    default: null,
  },
  embedded: Boolean,
})

const localItemsContainer = ref(null)
const localSearch = ref(null)
const localInfoPanel = ref(null)
const contentScopeActive = ref(false)
const { showIfController } = storeToRefs(useControls())

const setContentScopeActive = active => {
  contentScopeActive.value = active
}

const canBubbleContentEvent = event =>
  contentScopeActive.value && (event.detail.name === "rotate_h_cam" || event.detail.name === "rotate_v_cam")

watchEffect(() => {
  if (props.itemsContainerRef) props.itemsContainerRef.value = localItemsContainer.value
})

watchEffect(() => {
  if (props.searchRef) props.searchRef.value = localSearch.value
})

watchEffect(() => {
  if (props.infoPanelRef) props.infoPanelRef.value = localInfoPanel.value
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
$z-index-base: var(--z-index-override, 1);

$options-width: 55rem;
$info-width: 20rem;
$categories-width: 12em;
$content-width: calc($options-width - $categories-width);

.options-subcategories {
  flex: 0 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  width: $categories-width;
  padding: 1em 0.25em 1em 0.25em;
  @include calculate-z-index($z-index-base, 1);
  overflow: hidden;
  border-right: 0.125em solid var(--bng-orange-550);

  .bg {
    // --bng-bg-enabled: var(--bng-ter-blue-gray-800);
    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-enabled-opacity: 0.9;
    --bng-bg-border-radius: 0;
    --bng-bg-border-width: 0;
  }

  &.controller-nav-active {
    .bg {
      // --bng-bg-enabled: var(--bng-off-black);
      --bng-bg-enabled: var(--bng-ter-blue-gray-800);
      --bng-bg-enabled-opacity: 0.8;
    }
  }

  > * {
    flex: 0 0 auto;
  }

  &.controller-nav-active[data-bng-scoped-nav-state="active"] {
    .bg {
      // --bng-bg-enabled: var(--bng-ter-blue-gray-800);
      --bng-bg-enabled: var(--bng-off-black);
      --bng-bg-enabled-opacity: 0.9;
      --bng-bg-border-radius: 0;
      --bng-bg-border-width: 0;
    }
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


  .bg {
    // --bng-bg-enabled: var(--bng-cool-gray-800);
    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-enabled-opacity: 0.9;
    --bng-bg-border-radius: 0;
    --bng-bg-border-width: 0;
  }

  &.controller-nav-active {
    .bg {
      // --bng-bg-enabled: var(--bng-off-black);
      --bng-bg-enabled: var(--bng-cool-gray-800);
      --bng-bg-enabled-opacity: 0.8;
    }
  }

  > * {
    flex: 0 0 auto;
  }

  &.controller-nav-active[data-bng-scoped-nav-state="active"] {
    .bg {
      // --bng-bg-enabled: var(--bng-cool-gray-800);
      --bng-bg-enabled: var(--bng-off-black);
      --bng-bg-enabled-opacity: 0.9;
      --bng-bg-border-radius: 0;
      --bng-bg-border-width: 0;
    }
  }
}
.options-search-input {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-items: center;
  gap: 0.5em;
  min-width: calc-ui-rem(10);

  .search-input {
    flex: 1 1 auto;
  }
}

.options-search-input-in-content {
  padding: 0.5em 0.75em 0.25em;
}


.categories-spacer {
  flex: 1 1 auto;
}

.options-editor-slot {
  width: 100%;
  padding: 0 0.25em;

  :deep(.options-editor-buttons) {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.2em;
  }

  :deep(.options-editor-buttons > .bng-button) {
    width: 100%;
    max-width: none;
    --bng-button-max-width: none;
    --bng-button-margin: 0.1rem 0;
  }
}

.categories-divider {
  flex: 0 0 auto;
  margin: 0 0.75em;
  width: 100%;
  height: 1px;
  background-color: #ff6600;
  opacity: 0.6;
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
  .background {
    background-color: var(--bng-options-bg-categories);
    opacity: var(--bng-options-bg-categories-opacity);
  }
}

.options-content {
  position: relative;
  width: calc($content-width);
  height: 100%;
  will-change: scroll-position;
  overflow: auto;
  padding: 0.5em 0.75em 2em;

  &.full-width {
    width: 100%;
  }
}

.options-content-search {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.options-search-results {
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: scroll-position;
}

.options-info {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: stretch;
  width: $info-width;

  @media (max-width: calc($options-width + $info-width)) {
    display: none;
  }
  &.info-hidden {
    opacity: 0;
    pointer-events: none;
  }

  > span {
    position: relative;
    display: block;
    margin: 0.25em 0.5em;
    font-size: 1.2em;
    font-weight: 300;
    @include calculate-z-index($z-index-base, 1);
    &:not(:last-of-type) {
      padding-bottom: 0.25em;
      border-bottom: 1px solid var(--bng-off-white);
      opacity: 0.6;
    }
  }

  .options-spacer {
    flex: 1 1 auto;
  }

  .options-info-fps {
    position: relative;
    display: block;
    margin: 0.5em 0;
    font-size: 1.5em;
    font-weight: 200;
    text-align: center;
    color: var(--bng-off-white);
    @include calculate-z-index($z-index-base, 1);
    > span {
      font-weight: 400;
    }
  }

  .background {
    background-color: var(--bng-options-bg-info);
    opacity: var(--bng-options-bg-info-opacity);
  }
}

.options-add-item {
  display: block;
  text-align: center;
}

.options-container.embedded {
  min-height: 0;

  .options-content-wrapper {
    min-height: 0;
  }

  .options-content {
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
  }
}
</style>
