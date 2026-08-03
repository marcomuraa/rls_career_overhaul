<template>
  <div
    ref="rootRef"
    class="pause-parts"
  >
    <BngTabs
      ref="tabbedPanelRef"
      class="pause-parts-tabbed-panel"
      v-model="activeTabIndex"
      use-bindings
      icon-only
      tabindex="-1"
      bng-scoped-nav-autofocus
      v-bng-scoped-nav="{ scopeId: 'pause-parts-content', type: 'normal', preferAutoFocus: true, bubbleWhitelistEvents: ['menu', 'tab_l', 'tab_r', 'context'], canDeactivate: canDeactivatePartsScope }"
      v-bng-on-ui-nav:context="onContextInput"
      @mouseleave="deselectPart"
      @deactivate="deselectPart"
      @change="focusCurrentTabEntrySoon"
    >
      <div
        ref="treeTabRef"
        class="pause-parts-content"
        :tab-heading="$t('ui.vehicleconfig.tab.tree')"
        :tab-icon="icons.listIndented"
        :tab-tooltip="$t('ui.vehicleconfig.tab.tree')"
        v-bng-scoped-nav="{ scopeId: 'pause-parts-tree-tab', type: 'container', open: activeTabIndex === 0, bubbleWhitelistEvents: TAB_ACTION_BUBBLE_EVENTS, canDeactivate: canDeactivatePartsScope }"
        @activate="focusTreeTabEntrySoon"
      >
        <PartsBranch
          v-if="currentConfig?.children && Object.keys(currentConfig.children).length > 0"
          root-slot
          :children="currentConfig.children"
          :info="richPartInfo"
          :tree-state="treeState"
          :display-names="opts.showNames"
          :show-auxiliary="opts.showAux"
          :separate-sort="opts.separateSort"
          :always-sort="opts.alwaysSort"
          :show-empty="opts.showEmpty"
          @select="selectPart"
          @deselect="deselectPart"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />
      </div>

      <div
        ref="searchTabRef"
        class="pause-parts-content pause-parts-search-content"
        :tab-heading="$t('ui.common.search')"
        :tab-icon="icons.search"
        :tab-tooltip="$t('ui.common.search')"
        v-bng-scoped-nav="{ scopeId: 'pause-parts-search-tab', type: 'container', open: activeTabIndex === 1, bubbleWhitelistEvents: TAB_ACTION_BUBBLE_EVENTS, canDeactivate: canDeactivatePartsScope }"
        @activate="focusSearchTabEntrySoon"
      >
        <div class="pause-parts-search">
          <BngInput
            v-model.trim="search.text"
            :leading-icon="icons.search"
            :floating-label="$t('ui.common.search')"
            bng-scoped-nav-autofocus
            @click="search.start()"
            @valueChanged="search.onChange()"
            @keydown="search.history.onKeyDown($event)"
          />
          <BngButton
            :icon="icons.mathMultiply"
            :style="'font-size: 0.75rem'"
            :accent="ACCENTS.text"
            v-bng-disabled="!search.active"
            @click="search.stop()"
          />
        </div>

        <PartsBranch
          v-if="search.active"
          :children="search.result"
          :info="richPartInfo"
          :tree-state="treeState"
          flat-entry
          :display-names="opts.showNames"
          :show-auxiliary="opts.showAux"
          :separate-sort="opts.separateSort"
          :always-sort="opts.alwaysSort"
          :show-empty="opts.showEmpty"
          :highlighter="search.highlight"
          @select="selectPart"
          @deselect="deselectPart"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />

        <PartsBranch
          v-else-if="currentConfig?.children && Object.keys(currentConfig.children).length > 0"
          root-slot
          :children="currentConfig.children"
          :info="richPartInfo"
          :tree-state="treeState"
          :display-names="opts.showNames"
          :show-auxiliary="opts.showAux"
          :separate-sort="opts.separateSort"
          :always-sort="opts.alwaysSort"
          :show-empty="opts.showEmpty"
          @select="selectPart"
          @deselect="deselectPart"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />

        <div v-show="search.message !== ''" class="pause-parts-search-message">
          <BngIcon :type="icons.danger" color="#d60" />
          <span>{{ search.message }}</span>
        </div>

        <div v-show="search.active && Object.keys(search.result).length === 0" class="pause-parts-search-help">
          <hr />
          {{ $t("ui.vehicleconfig.searchHelp.examples") }}
          <ul>
            <li>
              <span class="search-example">left</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example1") }}
            </li>
            <li>
              <span class="search-example">slot:_fr</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example2") }}
            </li>
            <li>
              <span class="search-example">name:frame</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example3") }}
            </li>
            <li>
              <span class="search-example">slot:_fr name:signal</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example4") }}
            </li>
            <li>
              <span class="search-example">partname:pickup_fr</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example5") }}
            </li>
            <li>
              <span class="search-example">author:bob</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example6") }}
            </li>
            <li>
              <span class="search-example">mod:super</span><br />
              {{ $t("ui.vehicleconfig.searchHelp.example7") }}
            </li>
          </ul>
          <hr />
          {{ $t("ui.vehicleconfig.searchHelp.notes") }}:
          <ul>
            <li>{{ $t("ui.vehicleconfig.searchHelp.notes1") }}</li>
            <li>{{ $t("ui.vehicleconfig.searchHelp.notes3") }}</li>
          </ul>
        </div>

        <div v-if="search.history.browsing && search.history.list.length > 0" class="pause-parts-search-history">
          <hr />
          {{ $t("ui.vehicleconfig.searchHelp.history") }}:
          <br />
          <br />
          <span
            v-for="(historyEntry, idx) in search.history.list"
            :key="idx"
            :class="{
              'history-entry': true,
              'history-indicator': idx === search.history.index,
            }"
          >{{ historyEntry }}</span>
          <br />
          {{ $t("ui.vehicleconfig.searchHelp.historyClear") }}
        </div>
      </div>

      <div
        ref="optionsTabRef"
        class="pause-parts-content pause-parts-options-content"
        :tab-heading="$t('ui.vehicleconfig.tab.options')"
        :tab-icon="icons.adjust"
        :tab-tooltip="$t('ui.vehicleconfig.tab.options')"
        v-bng-scoped-nav="{ scopeId: 'pause-parts-options-tab', type: 'container', open: activeTabIndex === 2, bubbleWhitelistEvents: TAB_ACTION_BUBBLE_EVENTS, canDeactivate: canDeactivatePartsScope }"
        @activate="focusOptionsTabEntrySoon"
      >
        <BngRow class="pause-parts-option" bng-scoped-nav-autofocus>
          <template #label>{{ $t("ui.showAuxiliary") }}</template>
          <BngSwitch
            v-model="opts.showAux"
            @valueChanged="saveOption('showAux', opts.showAux)"
          />
        </BngRow>
        <BngRow class="pause-parts-option">
          <template #label>{{ $t("ui.vehicleconfig.displayNames") }}</template>
          <BngSwitch
            v-model="opts.showNames"
            @valueChanged="saveOption('showNames', opts.showNames)"
          />
        </BngRow>
        <BngRow class="pause-parts-option">
          <template #label>{{ $t("ui.vehicleconfig.subparts") }}</template>
          <BngSwitch
            v-model="opts.selectSubParts"
            @valueChanged="saveOption('selectSubParts', opts.selectSubParts)"
          />
        </BngRow>
        <BngRow class="pause-parts-option">
          <template #label>{{ $t("ui.vehicleconfig.sortSubListsSeparately") }}</template>
          <BngSwitch
            v-model="opts.separateSort"
            @valueChanged="saveOption('separateSort', opts.separateSort)"
          />
        </BngRow>
        <BngRow class="pause-parts-option">
          <template #label>{{ $t("ui.vehicleconfig.alwaysSortByName") }}</template>
          <BngSwitch
            v-model="opts.alwaysSort"
            @valueChanged="saveOption('alwaysSort', opts.alwaysSort)"
          />
        </BngRow>
        <BngRow
          v-if="isDev"
          class="pause-parts-option"
        >
          <template #label>{{ $t("ui.vehicleconfig.showEmptySlots") }}</template>
          <BngSwitch
            v-model="opts.showEmpty"
          />
        </BngRow>
      </div>
    </BngTabs>

    <div
      ref="bottomBarRef"
      class="pause-parts-bottom"
      :bng-no-nav="!bottomBarOpen || undefined"
      tabindex="-1"
      v-bng-scoped-nav="{ scopeId: 'pause-parts-bottom', type: 'container', open: bottomBarOpen, canIgnoreEvent: isNavDirection, bubbleWhitelistEvents: ['menu', 'tab_l', 'tab_r', 'context'] }"
      v-bng-on-ui-nav:back="onBottomBack"
      @focusin="onBottomFocusIn"
      @deactivate="onBottomDeactivate"
      @click="onBottomBarClick"
    >
      <BngSwitch
        class="pause-parts-live-switch"
        :disabled="partsChanged || waitingForData"
        v-model="opts.applyPartChangesAutomatically"
        bng-scoped-nav-autofocus
        @valueChanged="saveOption('applyPartChangesAutomatically', opts.applyPartChangesAutomatically)"
      >
        {{ $t("ui.garage.liveUpdates") }}
      </BngSwitch>

      <div class="pause-parts-bottom-actions">
        <BngButton
          show-hold
          :icon="icons.undo"
          :accent="ACCENTS.ghost"
          v-bng-click="{ holdCallback: resetAllToLoadedConfig, holdDelay: 1000, repeatInterval: 0 }"
          v-bng-tooltip:top="$t('ui.vehicleconfig.revertToOriginalConfig')"
          :disabled="waitingForData"
        />
        <BngButton
          v-if="!opts.applyPartChangesAutomatically"
          class="pause-parts-apply-button"
          :icon="icons.checkmark"
          @click="write()"
          :disabled="!partsChanged || waitingForData"
        >{{ $t("ui.common.apply") }}</BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue"
import { BngRow, BngSwitch, BngButton, BngInput, BngIcon, BngTabs, ACCENTS, icons } from "@/common/components/base"
import { vBngDisabled, vBngScopedNav, vBngOnUiNav, vBngClick, vBngTooltip } from "@/common/directives"
import PartsBranch from "@/modules/vehicleConfig/components/PartsBranch.vue"
import { handleUINavEvent as sendToCrossfire } from "@/services/crossfire"
import { setFocus } from "@/services/uiNavFocus"
import { useScopedNav } from "@/services/scopedNav/api"
import { usePartsManager } from "../composables/usePartsManager"
import { lua } from "@/bridge"

defineOptions({ name: "PauseParts" })

const {
  isDev,
  currentConfig,
  richPartInfo,
  treeState,
  opts,
  waitingForData,
  partsChanged,
  search,
  selectPart,
  deselectPart,
  highlightPart,
  partConfigChanged,
  dropdownOpened,
  write,
  resetAllToLoadedConfig,
  saveOption,
} = usePartsManager()

const tabbedPanelRef = ref(null)
const activeTabIndex = ref(0)
const rootRef = ref(null)
const contentRef = computed(() => tabbedPanelRef.value?.$el?.querySelector(".tab-content") || null)
const treeTabRef = ref(null)
const searchTabRef = ref(null)
const optionsTabRef = ref(null)
const bottomBarRef = ref(null)
const bottomBarOpen = ref(false)
const bottomBarReturnTarget = ref(null)
const isBottomBarExitPending = ref(false)
const isPartsRouteBackPending = ref(false)
const scopedNav = useScopedNav()

const ALL_NAV_DIRS = ["focus_u", "focus_d", "focus_l", "focus_r"]
const BOTTOM_BAR_TRAPPED = ["focus_l", "focus_r", "focus_d"]
const TAB_ACTION_BUBBLE_EVENTS = ["tab_l", "tab_r", "context"]

function isNavDirection(event) {
  return ALL_NAV_DIRS.includes(event.detail.name) && event.detail.value === 1
}

function requestPartsRouteBack() {
  if (isPartsRouteBackPending.value) return
  isPartsRouteBackPending.value = true
  void Promise.resolve(lua.extensions.ui_router.back())
    .finally(() => {
      isPartsRouteBackPending.value = false
    })
}

function canDeactivatePartsScope() {
  requestPartsRouteBack()
  return false
}

function onBottomFocusIn(event) {
  const el = event.currentTarget
  if (event.target !== el) return
  rememberBottomBarReturnTarget(event.relatedTarget)
  bottomBarOpen.value = true
  requestAnimationFrame(() => focusBottomBarFirstElement())
}

function onBottomDeactivate() {
  bottomBarOpen.value = false
  if (!isBottomBarExitPending.value) return
  isBottomBarExitPending.value = false
  void restoreBottomBarReturnFocus()
}

function onBottomBack() {
  if (!bottomBarOpen.value) return
  requestBottomBarExit()
  return false
}

function focusBottomBar() {
  const el = bottomBarRef.value
  if (!el) return false
  bottomBarOpen.value = true
  if (isBottomBarChildFocused(el)) return true
  if (focusBottomBarFirstElement()) return true
  el.focus()
  return document.activeElement === el
}

function onBottomBarClick(event) {
  if (event.target !== event.currentTarget) return
  rememberBottomBarReturnTarget()
  focusBottomBar()
}

function addBottomBarNavListener(el) {
  if (!el) return null
  const handler = e => {
    if (e.detail.value !== 1) return
    const name = e.detail.name
    if (!ALL_NAV_DIRS.includes(name)) return

    if (BOTTOM_BAR_TRAPPED.includes(name)) {
      sendToCrossfire(e, el)
    } else {
      requestBottomBarExit()
    }
    e.stopPropagation()
    e.preventDefault()
  }
  el.addEventListener("ui_nav", handler)
  return () => el.removeEventListener("ui_nav", handler)
}

let cleanupBottomBarNav = null

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

function isVisibleAndFocusable(target) {
  if (!target || typeof target.focus !== "function") return false
  if (target.matches?.("[disabled]")) return false
  return target.getClientRects().length > 0
}

function focusElement(target) {
  if (!isVisibleAndFocusable(target)) return false
  const focusedWithFrame = setFocus(target)
  if (focusedWithFrame) return true
  target.focus()
  return document.activeElement === target
}

function focusFirstMatching(rootElement, selectors) {
  if (!rootElement) return false
  for (const selector of selectors) {
    const target = rootElement.querySelector(selector)
    if (!focusElement(target)) continue
    return true
  }
  return false
}

function getActiveTabScopeId() {
  if (activeTabIndex.value === 1) return "pause-parts-search-tab"
  if (activeTabIndex.value === 2) return "pause-parts-options-tab"
  return "pause-parts-tree-tab"
}

function rememberBottomBarReturnTarget(candidate = document.activeElement) {
  const contentElement = contentRef.value
  if (
    candidate instanceof HTMLElement
    && contentElement
    && contentElement.contains(candidate)
    && isVisibleAndFocusable(candidate)
  ) {
    bottomBarReturnTarget.value = candidate
    return
  }
  bottomBarReturnTarget.value = null
}

async function restoreBottomBarReturnFocus() {
  const previousFocusTarget = bottomBarReturnTarget.value
  bottomBarReturnTarget.value = null

  await nextTick()
  if (focusElement(previousFocusTarget)) return true

  const activeTabScopeId = getActiveTabScopeId()
  await scopedNav.activateScope(activeTabScopeId, { silent: true })
  await nextTick()
  if (focusCurrentTabEntry()) return true
  await nextFrame()
  if (focusCurrentTabEntry()) return true

  await scopedNav.activateScope("pause-parts-content", { silent: true })
  await nextTick()
  if (focusElement(contentRef.value)) return true
  await nextFrame()
  return focusElement(contentRef.value)
}

function requestBottomBarExit() {
  if (isBottomBarExitPending.value) return
  isBottomBarExitPending.value = true
  void Promise.resolve(scopedNav.deactivateScope("pause-parts-bottom", { resumePrevious: true }))
    .then(success => {
      if (success === false) isBottomBarExitPending.value = false
    })
    .catch(() => {
      isBottomBarExitPending.value = false
    })
}

function focusTreeTabEntry() {
  return focusFirstMatching(treeTabRef.value, [
    ".bng-accitem-caption[bng-nav-item]",
    ".bng-accitem-caption",
    "button:not([disabled])",
  ])
}

function focusSearchTabEntry() {
  return focusFirstMatching(searchTabRef.value, [
    ".pause-parts-search input",
    ".pause-parts-search button:not([disabled])",
    ".bng-accitem-caption[bng-nav-item]",
    "button:not([disabled])",
  ])
}

function focusOptionsTabEntry() {
  return focusFirstMatching(optionsTabRef.value, [
    ".pause-parts-option:not([disabled])",
    ".pause-parts-option[bng-nav-item]:not([disabled])",
    ".pause-parts-option",
    "button:not([disabled])",
  ])
}

function focusBottomBarFirstElement() {
  return focusFirstMatching(bottomBarRef.value, [
    ".pause-parts-live-switch input:not([disabled])",
    ".pause-parts-live-switch .bng-switch:not([disabled])",
    ".pause-parts-live-switch",
    ".pause-parts-bottom [bng-nav-item]:not([disabled])",
    "button:not([disabled])",
  ])
}

function isBottomBarChildFocused(el = bottomBarRef.value) {
  if (!el) return false
  const activeElement = document.activeElement
  return !!activeElement && activeElement !== el && el.contains(activeElement)
}

function focusCurrentTabEntry() {
  if (activeTabIndex.value === 1) return focusSearchTabEntry()
  if (activeTabIndex.value === 2) return focusOptionsTabEntry()
  return focusTreeTabEntry()
}

const treeChildrenCount = computed(() => Object.keys(currentConfig.value?.children || {}).length)

async function focusCurrentTabEntrySoon() {
  await nextTick()
  if (focusCurrentTabEntry()) return
  await nextFrame()
  if (focusCurrentTabEntry()) return
  if (contentRef.value && typeof contentRef.value.focus === "function") contentRef.value.focus()
}

async function focusTreeTabWhenReady() {
  if (activeTabIndex.value !== 0) return false
  if (waitingForData.value || treeChildrenCount.value === 0) return false

  for (let i = 0; i < 4; i++) {
    await nextTick()
    if (focusTreeTabEntry()) return true
    await nextFrame()
    if (focusTreeTabEntry()) return true
  }

  return false
}

async function focusTreeTabEntrySoon() {
  await nextTick()
  if (focusTreeTabEntry()) return
  await nextFrame()
  focusTreeTabEntry()
}

async function focusSearchTabEntrySoon() {
  await nextTick()
  if (focusSearchTabEntry()) return
  await nextFrame()
  focusSearchTabEntry()
}

async function focusOptionsTabEntrySoon() {
  await nextTick()
  if (focusOptionsTabEntry()) return
  await nextFrame()
  focusOptionsTabEntry()
}

async function activateBottomBar() {
  const el = bottomBarRef.value
  if (!el) return false
  rememberBottomBarReturnTarget()
  bottomBarOpen.value = true
  await nextTick()
  for (let i = 0; i < 4; i++) {
    if (focusBottomBarFirstElement() || isBottomBarChildFocused(el)) return true
    await nextTick()
    await nextFrame()
  }
  return false
}

function onContextInput() {
  void activateBottomBar()
  return false
}

function focusEntry() {
  if (focusCurrentTabEntry()) return true
  if (contentRef.value && typeof contentRef.value.focus === "function") {
    contentRef.value.focus()
    void focusTreeTabWhenReady()
    return true
  }
  void focusTreeTabWhenReady()
  return false
}

defineExpose({
  focusEntry,
  activateBottomBar,
})

onMounted(() => {
  cleanupBottomBarNav = addBottomBarNavListener(bottomBarRef.value)
  void focusTreeTabWhenReady()
})

watch(
  [() => activeTabIndex.value, () => waitingForData.value, () => treeChildrenCount.value],
  () => {
    if (activeTabIndex.value === 1 && !search.active) {
      search.start()
    }
    void focusTreeTabWhenReady()
  },
  { flush: "post" }
)

onUnmounted(() => {
  cleanupBottomBarNav?.()
  cleanupBottomBarNav = null
})
</script>

<style scoped lang="scss">
.pause-parts {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.pause-parts-tabbed-panel {
  flex: 1 1 auto;
  min-height: 0;
}

.pause-parts-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem 0.125rem;
}

.pause-parts-search-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pause-parts-search {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.pause-parts-search-message {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.pause-parts-options-content {
}

.pause-parts-option {
}

.pause-parts-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid rgba(var(--bng-orange-500-rgb), 0.75);
  padding: 0.5em;
  outline: none;
}

.pause-parts-bottom-actions {
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.pause-parts-search-help {
  li {
    margin-bottom: 0.5em;
  }

  .search-example {
    font-family: var(--fnt-mono);
    font-size: 1.1em;
    font-weight: bold;
    color: rgb(255, 102, 0);
  }
}

.pause-parts-search-history {
  .history-entry {
    display: block;
    &::before {
      content: " ";
      display: inline-block;
      width: 1.5em;
      text-align: center;
    }
    &.history-indicator::before {
      content: ">";
    }
  }
}
</style>
