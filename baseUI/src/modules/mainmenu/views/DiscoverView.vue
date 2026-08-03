<template>
  <LayoutMenu
    class="discover-layout"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    @breadcrumb-back="onBack"
    @breadcrumb-click="onBreadcrumbClick"
  >
    <div class="discover-panel" v-bng-on-ui-nav:back="onBack">
      <div class="discover-content">
        <div class="discover-info-box" v-bng-blur>
          <BlurBackground />
          <div class="discover-info-header">
            <BngScreenHeadingV2 type="2">
              {{ $tt(currentHeadingTitle) }}
            </BngScreenHeadingV2>
          </div>

          <div v-if="currentPageDescriptionText" class="discover-page-description">
            <div class="discover-page-description-text">
              {{ $tt(currentPageDescriptionText) }}
            </div>
          </div>
          <div class="discover-info-tags" v-if="isDetailView && currentPageTagList.length > 0">
            <div class="discover-info-tag-item" v-for="(tag, idx) in currentPageTagList" :key="`page-tag-${idx}-${tag.label}`">
              <BngIcon v-if="tag.icon" class="discover-info-tag-item-icon" :type="tag.icon" />
              {{ $tt(tag.label) }}
            </div>
          </div>
        </div>



        <template v-if="!isDetailView">
          <div class="interaction-scope">
            <div v-if="!discover.loaded" class="discover-loading">
                {{ $tt("ui.common.loading") }}
            </div>
            <div v-else class="discover-overview-layout" :class="{ 'no-hero': !overviewHeroItem }">
              <div v-if="overviewHeroItem" class="discover-list-box discover-overview-hero-box" v-bng-blur>
                <BlurBackground />
                <DiscoverHeroCard
                  class="discover-overview-hero"
                  :ref="el => setPrimaryButtonRef(el, overviewHeroItem)"
                  :selected="activeItemKey === overviewHeroItem.key"
                  :disabled="!discover.enabled"
                  :bg-img-abs="overviewHeroItem.image"
                  :title="overviewHeroItem.title"
                  :description="overviewHeroItem.description || ''"
                  :tag-list="overviewHeroItem.tagList"
                  action-label="ui.playmodes.discover.playNow"
                  secondary-action-label="ui.playmodes.discover.viewSections"
                  @click="onItemSelect(overviewHeroItem)"
                  @dblclick="onHeroAction(overviewHeroItem)"
                  @action="onHeroAction(overviewHeroItem)"
                  @secondary-action="onHeroSecondaryAction(overviewHeroItem)"
                  v-bng-on-ui-nav:ok="() => onOverviewItemConfirm(overviewHeroItem)"
                  v-bng-on-ui-nav:action_2="() => onHeroSecondaryAction(overviewHeroItem)"
                  @focus="handleItemFocus(overviewHeroItem)"
                />
              </div>
              <div class="discover-overview-side">
                <div class="discover-list-box" v-bng-blur>
                  <BlurBackground />
                  <div class="discover-list-scroll">
                    <div class="discover-overview-buttons">
                      <DiscoverExperienceButton
                        v-for="item in overviewSideItems"
                        :key="item.key"
                        :ref="el => setPrimaryButtonRef(el, item)"
                        :selected="activeItemKey === item.key"
                        :major="item.isMajor"
                        :disabled="!discover.enabled"
                        :bg-img-abs="item.image"
                        :title="item.title"
                        :description="item.description || ''"
                        action-label="ui.playmodes.discover.view"
                        :show-tags="false"
                        :show-description="false"
                        :tag-list="item.tagList"
                        @click="onItemSelect(item)"
                        @dblclick="onItemDoubleClick(item)"
                        v-bng-on-ui-nav:ok="() => onOverviewItemConfirm(item)"
                        @focus="handleItemFocus(item)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            class="interaction-scope interaction-scope--detail"
          >
            <div class="discover-list-box" v-bng-blur>
              <BlurBackground />
              <div class="discover-list-scroll">
                <div
                  class="discover-buttons-wrap discover-buttons-wrap-major"
                  :class="{ 'discover-buttons-wrap-major--single': currentMajorItems.length === 1 }"
                >
                  <DiscoverExperienceButton
                    v-for="item in currentMajorItems"
                    :key="item.key"
                    :ref="el => setPrimaryButtonRef(el, item)"
                    :bng-scoped-nav-autofocus="item.focusKey === currentFocusKey"
                    :selected="activeItemKey === item.key"
                    major
                    :disabled="!discover.enabled"
                    :bg-img-abs="item.image"
                    :title="item.title"
                    :description="item.description || ''"
                    :tag-list="item.tagList"
                    @click="onItemSelect(item)"
                    @dblclick="onItemDoubleClick(item)"
                    v-bng-on-ui-nav:ok="() => onDetailItemConfirm(item)"
                    @mouseenter="item.onHover && item.onHover()"
                    @focus="handleItemFocus(item)"
                    @blur="item.onBlur && item.onBlur()"
                  />
                </div>

                <div v-if="currentMinorItems.length > 0" class="discover-section-divider discover-section-divider--detail"></div>

                <div v-if="currentMinorItems.length > 0" class="discover-buttons-wrap discover-buttons-wrap-minor">
                  <DiscoverExperienceButton
                    v-for="item in currentMinorItems"
                    :key="item.key"
                    :ref="el => setPrimaryButtonRef(el, item)"
                    :selected="activeItemKey === item.key"
                    :disabled="!discover.enabled"
                    :bg-img-abs="item.image"
                    :title="item.title"
                    :description="item.description || ''"
                    :tag-list="item.tagList"
                    @click="onItemSelect(item)"
                    @dblclick="onItemDoubleClick(item)"
                    v-bng-on-ui-nav:ok="() => onDetailItemConfirm(item)"
                    @mouseenter="item.onHover && item.onHover()"
                    @focus="handleItemFocus(item)"
                    @blur="item.onBlur && item.onBlur()"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { BngIcon, BngScreenHeadingV2 } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { useBridge } from "@/bridge"
import { $translate } from "@/services/translation"
import { useDiscover } from "../discover.js"
import DiscoverExperienceButton from "../components/DiscoverExperienceButton.vue"
import DiscoverHeroCard from "../components/DiscoverHeroCard.vue"
import { setFocus } from "@/services/uiNavFocus"
import logger from "@/services/logger"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"

const { lua } = useBridge()
const discover = useDiscover()
const isDetailView = computed(() => discover.viewMode === "detail")

const majorPages = computed(() => {
  if (discover.majorPages.length > 0) return discover.majorPages
  if (discover.pages.length > 0) return [discover.pages[0]]
  return []
})

const minorPages = computed(() => {
  if (discover.majorPages.length > 0) return discover.minorPages
  return discover.pages.slice(1)
})

const majorSection = computed(() => discover.sections.find(section => section.sectionKind === "major"))
const minorSection = computed(() => discover.sections.find(section => section.sectionKind === "minor"))

const detailFocusId = computed(() => {
  const allCards = discover.sections.flatMap(section => section.cards)
  let card = allCards.find(entry => discover.lastStartedDiscoverId && discover.lastStartedDiscoverId === entry.discoverId)
  if (!card) card = allCards[0]
  return card?.discoverId
})

const defaultOverviewFocusPageIndex = computed(() => {
  if (majorPages.value.length > 0) return majorPages.value[0].index
  if (discover.pages.length > 0) return discover.pages[0].index
  return -1
})

const currentHeadingTitle = computed(() => {
  if (discover.viewMode === "detail") return discover.currentPageTitle
  return "ui.playmodes.quickStartExperiences"
})

const currentPageDescriptionText = computed(() => {
  if (discover.viewMode !== "detail") return null
  return discover.currentPageDescription || null
})

const currentPageTagList = computed(() => {
  const page = discover.pages.find(p => p.index === discover.currentPage)
  if (!page || !Array.isArray(page.tagList)) return []
  return page.tagList
})



const currentMajorItems = computed(() => {
  return (majorSection.value?.cards || []).map(card => ({
    key: `discover:${card.discoverId}`,
    focusKey: `discover:${card.discoverId}`,
    title: card.title,
    image: card.image,
    tagList: card.tagList || [],
    description: card.description,
    onClick: card.onClick,
    onHover: card.onHover,
    onFocus: card.onFocus,
    onBlur: card.onBlur,
  }))
})

const currentMinorItems = computed(() => {
  return (minorSection.value?.cards || []).map(card => ({
    key: `discover:${card.discoverId}`,
    focusKey: `discover:${card.discoverId}`,
    title: card.title,
    image: card.image,
    tagList: card.tagList || [],
    description: card.description,
    onClick: card.onClick,
    onHover: card.onHover,
    onFocus: card.onFocus,
    onBlur: card.onBlur,
  }))
})

const overviewPageItems = computed(() => {
  const major = majorPages.value.map(page => ({
    key: `page:${page.index}`,
    focusKey: `page:${page.index}`,
    title: page.title,
    description: page.description,
    tagList: page.tagList || [],
    isMajor: true,
    isHero: !!page.isHero,
    startDiscoverId: page.startDiscoverId,
    image: page.image,
    onClick: () => openPage(page.index),
  }))
  const minor = minorPages.value.map(page => ({
    key: `page:${page.index}`,
    focusKey: `page:${page.index}`,
    title: page.title,
    description: page.description,
    tagList: page.tagList || [],
    isMajor: false,
    isHero: !!page.isHero,
    startDiscoverId: page.startDiscoverId,
    image: page.image,
    onClick: () => openPage(page.index),
  }))
  return [...major, ...minor]
})
const overviewHeroItem = computed(() => overviewPageItems.value.find(item => item.isHero) || null)
const overviewSideItems = computed(() => overviewPageItems.value.filter(item => item.key !== overviewHeroItem.value?.key))

const currentFocusKey = computed(() => {
  if (isDetailView.value) return `discover:${detailFocusId.value}`
  const currentPageFocusKey = `page:${discover.currentPage}`
  if (overviewPageItems.value.some(item => item.focusKey === currentPageFocusKey)) return currentPageFocusKey
  if (overviewPageItems.value.length > 0) return overviewPageItems.value[0].focusKey
  return `page:${defaultOverviewFocusPageIndex.value}`
})

const primaryButtonRef = ref(null)
const activeItemKey = ref(null)
const setPrimaryButtonRef = (el, item) => {
  if (!item || !item.focusKey) return
  if (item.focusKey === currentFocusKey.value) primaryButtonRef.value = el
}

const allCurrentItems = computed(() => [...currentMajorItems.value, ...currentMinorItems.value])
const allSelectableItems = computed(() => (isDetailView.value ? allCurrentItems.value : overviewPageItems.value))
const selectedItem = computed(() => {
  const selected = allSelectableItems.value.find(item => item.key === activeItemKey.value)
  if (selected) return selected
  return allSelectableItems.value[0] || null
})

function getPreferredSelectableKey() {
  return allSelectableItems.value.find(item => item.focusKey === currentFocusKey.value)?.key || allSelectableItems.value[0]?.key || null
}

function focusActiveView() {
  const elementToFocus = primaryButtonRef.value?.getElement?.()
  if (elementToFocus) setFocus(elementToFocus)
}

function handleItemFocus(item) {
  if (!item || !item.key) return
  activeItemKey.value = item.key
  if (item.onFocus) item.onFocus()
}

function onItemSelect(item) {
  if (!item || !item.key) return
  activeItemKey.value = item.key
  if (item.onFocus) item.onFocus()
}

function onOverviewItemConfirm(item) {
  if (item.isHero) {
    onHeroAction(item)
    return
  }
  if (isDetailView.value) return
  logger.debug("DiscoverView: overview A-press open page", {
    itemKey: item.key,
    pageIndex: String(item.key).replace("page:", ""),
  })
  onItemSelect(item)
  if (item.onClick) item.onClick()
}

function onHeroAction(item) {
  if (!item || !discover.enabled) return
  logger.debug("DiscoverView: hero action (Play Now)", {
    itemKey: item.key,
  })
  if (item.startDiscoverId) {
    discover.startDiscover(item.startDiscoverId)
    return
  }
  onOverviewItemConfirm(item)
}

function onHeroSecondaryAction(item) {
  onItemSelect(item)
  if (item.onClick) item.onClick()
}

function onDetailItemConfirm(item) {
  if (!isDetailView.value || !discover.enabled || !item) return
  logger.debug("DiscoverView: detail A-press start", {
    itemKey: item.key,
  })
  onItemSelect(item)
  if (item.onClick) item.onClick()
}

function onItemDoubleClick(item) {
  if (!discover.enabled || !item) return
  if (!isDetailView.value) {
    onOverviewItemConfirm(item)
    return
  }
  logger.debug("DiscoverView: detail double click", {
    itemKey: item.key,
  })
  onItemSelect(item)
  if (item.onClick) item.onClick()
}

function openPage(pageIndex) {
  discover.openPage(pageIndex)
}

const breadcrumbItems = computed(() => (
  isDetailView.value
    ? [
        { label: $translate.instant("ui.common.menu"), isBackButton: true },
        { label: $translate.instant("ui.playmodes.quickStartExperiences") },
      ]
    : [{ label: $translate.instant("ui.common.menu"), isBackButton: true }]
))

async function onBreadcrumbClick(item) {
  logger.debug("DiscoverView: breadcrumb click", {
    item: item,
  })
  if (item?.isBackButton) {
    lua.extensions.ui_router.navigate("menu", null, null)
    return
  }
  discover.backToOverview()
}

function onBack(event) {
  console.log("onBack", event)
  if (event && typeof event.stopPropagation === "function") event.stopPropagation()
  if (event && typeof event.preventDefault === "function") event.preventDefault()

  logger.debug("DiscoverView: back button click", {
    viewMode: discover.viewMode,
  })
  if (discover.viewMode === "detail") {
    logger.debug("DiscoverView: back to overview", {
      viewMode: discover.viewMode,
    })
    discover.backToOverview()
    return false
  }
  logger.debug("DiscoverView: back to mainmenu", {
    viewMode: discover.viewMode,
  })
  lua.extensions.ui_router.navigate("menu", null, null)
  return false
}

onMounted(async () => {
  await discover.loadDiscoverPages()
  await nextTick()
  activeItemKey.value = getPreferredSelectableKey()
  focusActiveView()
})

watch(
  () => [discover.viewMode, discover.currentPage, discover.sections.length, discover.pages.length, allSelectableItems.value.length],
  async () => {
    if (!allSelectableItems.value.find(item => item.key === activeItemKey.value)) {
      activeItemKey.value = getPreferredSelectableKey()
    }
    await nextTick()
    focusActiveView()
  }
)
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.discover-layout {
  --content-flow: column;
  --content-max-width: calc-ui-rem(85);
  --content-h-position: center;
  --content-v-position: center;
  overflow: visible;
  :deep(.layout-content) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    max-height: unset;
    flex: 1 1 auto;

    >* {
      min-height: unset;
      flex: 0 0 auto;
    }


  }
}

.discover-panel {
  width: 100%;
  max-width: calc-ui-rem(87);
  min-width: calc-ui-rem(87);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;


  height: calc-ui-rem(47);
}

.discover-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  gap: 0.5em;
}

.discover-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
  font-size: calc-ui-rem(3);
  width: 100%;
  height: 100%;
  color: var(--bng-off-white);
  animation: discover-loading-animation 10s ease-in-out forwards;
  opacity: 0;
}

@keyframes discover-loading-animation {
  0%   { opacity: 0.00; }
  10%  { opacity: 0.25; }
  20%  { opacity: 0.50; }
  30%  { opacity: 0.25; }
  40%  { opacity: 0.50; }
  50%  { opacity: 0.25; }
  60%  { opacity: 0.50; }
  70%  { opacity: 0.25; }
  80%  { opacity: 0.50; }
  90%  { opacity: 0.25; }
  100% { opacity: 0.00; }
}

.interaction-scope {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  gap: 0.5em;
}

.discover-info-box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  align-items: stretch;
  width: 100%;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  --bng-heading-background: none;
  color: var(--bng-off-white);
}

.discover-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5em;
}

.discover-info-box :deep(.bng-screen-heading) {
  padding: 0.6em 0.75em;
  margin-top: 0;

}

.discover-page-description {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  padding: 0.6em 0.75em;
  padding-top: 0;
  margin-top: -0.5em;
}

.discover-page-description-text {
  line-height: 1.35;
}

.discover-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  padding: 0 0.75em 0.6em 0.75em;
  justify-content: flex-end;
}

.discover-info-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  font-size: calc-ui-rem(0.75);
  line-height: 1.2;
  font-weight: 500;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.5);
  padding: 0.25em 0.5em;
  border-radius: calc-ui-rem(0.5);

}
.discover-info-tag-item-icon {
  font-size: 1.05em;
  color: rgba(var(--bng-off-white-rgb), 0.75);
}


.discover-overview-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.discover-overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
  gap: 0.5em;
  flex: 1 1 auto;
  min-height: 0;
}

.discover-overview-layout.no-hero {
  grid-template-columns: minmax(0, 1fr);
}

.discover-overview-hero {
  flex: 1 1 auto;
  min-height: 0;
}

.discover-overview-hero-box {
  padding: 0.6em;
}

.discover-overview-side {
  min-height: 0;
  display: flex;
}

.discover-list-box {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  display: flex;
  overflow: hidden;

}

.discover-list-scroll {

  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.5em;
  width: 100%;
  padding: 0.6em;
}

.discover-buttons-wrap {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 0.4em;
  width: 100%;
}

.discover-buttons-wrap-major--single {
  grid-template-columns: minmax(0, 1fr);
}

.discover-section-divider {
  width: 100%;
  height: 0.10em;
  margin: 0.15em 0;
  background: linear-gradient(90deg, transparent 0%, rgba(var(--bng-off-white-rgb), 0.45) 50%, transparent 100%);

  flex: 0 0 auto;

}


.discover-action-row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.5em;

}

.spacer {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6em;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  padding: 0.5em;
  clip-path: polygon(
        0% 0%,
        calc(100% - 0.5em) 0%,
        100% 50%,
        calc(100% - 0.5em) 100%,
        0% 100%
      );
}

.discover-back-button {
  flex: 0 0 auto;
}

.selected-item-indicator {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 0.5em;
  justify-content: center;
  display: none;
}

.selected-item-indicator-preview {
  width: 5.5em;
  height: 3em;
  flex: 0 0 auto;
  border-radius: var(--bng-corners-1);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: rgba(var(--bng-cool-gray-700-rgb), 0.6);
}

.selected-item-indicator-title {
  min-width: 0;
  color: var(--bng-off-white);
  font-size: calc-ui-rem(1);
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discover-play-button {
  flex: 0 0 auto;
  justify-content: center;
  align-items: center;
  display: flex;
}

.play-button {
  $hold-grad: #fffd 50%, transparent 50%;
  $hold-fill: #ddd3 0%, #eee7 45%, #fffa 50%, transparent 50%;

  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 16em;
  margin-left: 0.1em;
  padding: 0.9em 1.7em;
  font-family: "Overpass", var(--fnt-defs);
  font-weight: 800;
  font-style: italic;
  isolation: isolate;
  pointer-events: auto;
  cursor: pointer;

  --play-color: var(--bng-orange-700);
  --play-bg: var(--bng-orange-500);
  --play-bg-opacity: 1;

  &:hover {
    --play-color: var(--bng-orange-600);
    --play-bg: var(--bng-orange-400);
    --play-bg-opacity: 1;
  }

  &.disabled {
    opacity: 0.5;
    cursor: default;
  }

  .label {
    font-size: 1.4em;
    color: var(--bng-off-white);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    margin-right: 1.5em;
    min-width: 16rem;
  }

  .hold-binding {
    position: relative;
    display: inline-block;
    font-size: 0.75em;
    .hold-arrow {
      position: absolute;
      top: -0.3em;
      left: 0;
      width: 100%;
      height: 0.6em;
      transition: top 150ms;
      pointer-events: none;
      z-index: 1;
      path {
        fill: var(--bng-orange-100);
        stroke: var(--play-bg);
        stroke-width: 1px;
      }
    }
  }

  .background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: var(--play-bg-opacity, 1);
    pointer-events: none;
    z-index: 0;
    &::before {
      content: "";
      position: absolute;
      display: block;
      top: 0.5em;
      left: calc(100% - 2.5em);
      right: 0.5em;
      bottom: 0.5em;
      background-color: var(--bng-orange-900);
      opacity: 0.65;
    }
    &::after {
      content: "";
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--play-bg);
      background-image: linear-gradient(90deg, $hold-fill);
      clip-path: polygon(
        0.5em 50%,
        0% 0%,
        calc(100% - 2.5em) 0%,
        calc(100% - 2em) 50%,
        calc(100% - 1.25em) 50%,
        calc(100% - 1.75em) 0%,
        calc(100% - 1.25em) 0%,
        calc(100% - 0.75em) 50%,
        calc(100% - 0.5em) 50%,
        calc(100% - 1em) 0%,
        calc(100% - 0.5em) 0%,
        100% 50%,
        calc(100% - 0.5em) 100%,
        calc(100% - 1em) 100%,
        calc(100% - 0.5em) 50%,
        calc(100% - 0.75em) 50%,
        calc(100% - 1.25em) 100%,
        calc(100% - 1.75em) 100%,
        calc(100% - 1.25em) 50%,
        calc(100% - 2em) 50%,
        calc(100% - 2.5em) 100%,
        0% 100%
      );
    }
  }

  &.focus-visible::before {
    $off: 4px;
    $size: 2px;
    top: -$off !important;
    bottom: -$off !important;
    left: -$off !important;
    right: -$off !important;
    border: none !important;
    border-radius: 0 !important;
    background-color: var(--bng-orange-b400);
    background-image: linear-gradient(90deg, $hold-grad);
    background-repeat: no-repeat;
    clip-path: polygon(
      0.5em 50%,
      0% 0%,
      calc(100% - 0.5em) 0%,
      100% 50%,
      calc(100% - 0.5em) 100%,
      0% 100%,
      0.5em 50%,
      calc(0.5em + $size) 50%,
      $size calc(100% - $size),
      calc(100% - 0.5em - $size) calc(100% - $size),
      calc(100% - $size) 50%,
      calc(100% - 0.5em - $size) $size,
      $size $size,
      calc(0.5em + $size) 50%
    );
  }

  .background::before {
    transition: background-color 300ms;
  }

  .background::after,
  &.focus-visible::before {
    background-size: 200% 100%;
    background-position: 100% 50%;
    transition: background-position-x 300ms;
  }

}

</style>
