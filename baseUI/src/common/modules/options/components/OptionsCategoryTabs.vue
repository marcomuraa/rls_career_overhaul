<template>
  <div :class="{ 'options-categories': true, embedded }" v-bng-blur>
    <BlurBackground />
    <BngOverflowContainer ref="overflowRef" class="categories-container" use-bindings-only>
      <template v-for="cat in categoriesView" :key="'cat-' + cat.categoryIndex">
        <div v-if="cat.divider" class="categories-divider"></div>
        <CategoryTop
          v-else
          :id="'options-cat-' + cat.categoryIndex"
          :index="cat.categoryIndex"
          :has-subcategories="cat.hasSubcategories"
          :selected="cat.categoryIndex >= categoryRange[0] && cat.categoryIndex <= categoryRange[1]"
          :icon="cat.icon"
          :hidden-by-condition="cat.hiddenByCondition"
          :debug-settings="cat.debugSettings"
          :editable="editable"
          @click="emit('category-click', cat)"
          @edit-cmd="(...args) => emit('category-edit', ...args)"
        >{{ $tt(cat.label) }}</CategoryTop>
      </template>
      <CategoryTop
        class="options-search-tab"
        :selected="searchActive"
        icon="search"
        @click="emit('search-click')"
      />
    </BngOverflowContainer>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue"
import { BngOverflowContainer } from "@/common/components/base"
import { vBngBlur } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import CategoryTop from "./CategoryTop.vue"

const props = defineProps({
  categoriesView: {
    type: Array,
    default: () => [],
  },
  categoryRange: {
    type: Array,
    default: () => [-1, -1],
  },
  searchActive: Boolean,
  editable: Boolean,
  embedded: Boolean,
})

const emit = defineEmits(["category-click", "category-edit", "search-click"])

const overflowRef = ref(null)

watch(
  [() => props.categoriesView.length, () => props.categoryRange[0], () => props.searchActive],
  () => nextTick(() => {
    const selectedIndex = props.searchActive ? -1 : props.categoryRange[0]
    const el = selectedIndex >= 0 && document.getElementById("options-cat-" + selectedIndex)
    if (el) overflowRef.value?.activate(el)
  }),
  { immediate: true }
)

defineExpose({
  activateNext: () => overflowRef.value?.activateNext?.(),
  activatePrev: () => overflowRef.value?.activatePrev?.(),
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
$z-index-base: var(--z-index-override, 1);

.options-categories {
  flex: 0 0 auto;
  align-self: flex-start;
  position: relative;
  width: auto;
  max-width: var(--options-width);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  @include calculate-z-index($z-index-base, 1);
  overflow: hidden;

  &.embedded {
    max-width: 100%;
    align-self: flex-start;
    width: auto;
  }

  .categories-container {
    flex: 0 1 auto;
    > :deep(.scroll-container) {
      gap: 0.25em;
    }
  }
}

.categories-divider {
  flex: 0 0 auto;
  margin: 0 0.75em;
  width: 1px;
  height: 2em;
  background-color: #ff6600;
  opacity: 0.6;
}

.options-search-tab {
  padding: 0.25em 0.5em 0.25em 0.5em;
  --bng-button-min-width: 2.5rem;
}
</style>
