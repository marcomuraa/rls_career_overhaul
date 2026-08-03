<template>
  <div
    ref="rootRef"
    class="pause-tab-combined"
    v-bng-on-ui-nav:action_3="applyCurrentTabChanges"
    v-bng-ui-nav-label:action_3="floatingApplyDisabled ? '' : floatingApplyNavLabel"
    @mouseleave="deselectPart"
  >
    <BngTabs
      ref="tabbedPanelRef"
      class="pause-tab-combined-tabs"
      v-model="activeTabIndex"
      use-bindings
      icon-only
      tabindex="-1"
      @change="onTabChange"
    >
      <template #after-tab-list>
        <div
          v-if="activeTabIndex === TAB_INDEX.PARTS"
          ref="searchScopeRef"
          class="pause-tab-combined-search"
          v-bng-scoped-nav="{
            scopeId: 'pause-tab-combined-search',
            type: 'normal',
            preferAutoFocus: true,
            bubbleWhitelistEvents: SEARCH_BUBBLE_EVENTS
          }"
          @click="focusSearch"
        >
          <BngBinding
            class="pause-tab-combined-search-binding"
            ui-event="context"
            controller
            bng-no-nav
          />
          <BngInput
            class="pause-tab-combined-search-input"
            v-model="search.text"
            :leading-icon="icons.search"
            :external-button-fn="clearSearch"
            :floating-label="$t('ui.common.search')"
            @click="focusSearch"
            @valueChanged="onSearchInputChanged"
            @keydown="search.history.onKeyDown($event)"
            @blur="onSearchBlur"
            @enter="returnToPartsTabScope"
          />
        </div>
      </template>

      <div
        ref="partsTabRef"
        class="pause-tab-combined-tab pause-tab-combined-parts"
        :tab-heading="$t('ui.vehicleconfig.parts')"
        :tab-icon="icons.engine"
        :tab-tooltip="$t('ui.vehicleconfig.parts')"
        v-bng-scoped-nav="{
          scopeId: 'pause-tab-combined-parts',
          type: 'container',
          open: activeTabIndex === TAB_INDEX.PARTS,
          preferAutoFocus: true,
          bubbleWhitelistEvents: TAB_BUBBLE_EVENTS,
          preventNavigationEscape: TAB_PREVENT_NAV_ESCAPE
        }"
        v-bng-on-ui-nav:context="onPartsContextInput"
        v-bng-ui-nav-label:context="$t('ui.common.search')"
        @activate="onPartsScopeActivate"
        @deactivate="deselectPart"
      >
        <PartsBranch
          v-if="showSearchResults"
          class="pause-tab-combined-parts-branch"
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
          bubble-highlight-action
          @select="onPartSelected"
          @deselect="onPartDeselected"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />

        <PartsBranch
          v-else-if="hasPartsTree"
          class="pause-tab-combined-parts-branch"
          root-slot
          :children="currentConfig.children"
          :info="richPartInfo"
          :tree-state="treeState"
          :display-names="opts.showNames"
          :show-auxiliary="opts.showAux"
          :separate-sort="opts.separateSort"
          :always-sort="opts.alwaysSort"
          :show-empty="opts.showEmpty"
          bubble-highlight-action
          @select="onPartSelected"
          @deselect="onPartDeselected"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />

        <div
          v-show="showSearchResults && search.message !== ''"
          class="pause-tab-combined-search-message"
        >
          <BngIcon :type="icons.danger" color="#d60" />
          <span>{{ search.message }}</span>
        </div>

        <div
          v-show="showSearchResults && Object.keys(search.result).length === 0"
          class="pause-tab-combined-search-help"
        >
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

        <div
          v-if="showSearchResults && search.history.browsing && search.history.list.length > 0"
          class="pause-tab-combined-search-history"
        >
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

        <div
          class="pause-tab-combined-overlay-spacer"
          aria-hidden="true"
        />
      </div>

      <div
        ref="tuningTabRef"
        class="pause-tab-combined-tab pause-tab-combined-tuning"
        :tab-heading="$t('ui.vehicleconfig.tuning')"
        :tab-icon="icons.powerGauge03"
        :tab-tooltip="$t('ui.vehicleconfig.tuning')"
        v-bng-scoped-nav="{
          scopeId: 'pause-tab-combined-tuning',
          type: 'container',
          open: activeTabIndex === TAB_INDEX.TUNING,
          preferAutoFocus: true,
          bubbleWhitelistEvents: TAB_BUBBLE_EVENTS,
          preventNavigationEscape: TAB_PREVENT_NAV_ESCAPE
        }"
        @activate="focusCurrentTabEntrySoon"
      >
        <Tuning
          v-if="activeTabIndex === TAB_INDEX.TUNING"
          ref="tuningRef"
          :show-controls="false"
          :auto-apply="opts.applyPartChangesAutomatically"
          mirrors-route="pause.vehicle.configurationcombined.mirrors"
          bottom-spacer
          show-tuning-apps
        />
      </div>

      <div
        ref="paintTabRef"
        class="pause-tab-combined-tab pause-tab-combined-paint"
        :tab-heading="$t('ui.vehicleconfig.paint')"
        :tab-icon="icons.sprayCan"
        :tab-tooltip="$t('ui.vehicleconfig.paint')"
        v-bng-scoped-nav="{
          scopeId: 'pause-tab-combined-paint',
          type: 'container',
          open: activeTabIndex === TAB_INDEX.PAINT,
          preferAutoFocus: true,
          bubbleWhitelistEvents: TAB_BUBBLE_EVENTS,
          preventNavigationEscape: TAB_PREVENT_NAV_ESCAPE
        }"
        @activate="focusCurrentTabEntrySoon"
      >
        <Paint v-if="activeTabIndex === TAB_INDEX.PAINT" ref="paintRef" bottom-spacer />
      </div>

      <div
        ref="optionsRef"
        class="pause-tab-combined-tab pause-tab-combined-options"
        :tab-heading="$t('ui.vehicleconfig.tab.other')"
        :tab-icon="icons.playlist"
        :tab-tooltip="$t('ui.vehicleconfig.tab.other')"
        v-bng-scoped-nav="{
          scopeId: 'pause-tab-combined-options',
          type: 'container',
          open: activeTabIndex === TAB_INDEX.OPTIONS,
          preferAutoFocus: true,
          bubbleWhitelistEvents: TAB_BUBBLE_EVENTS,
          preventNavigationEscape: TAB_PREVENT_NAV_ESCAPE
        }"
        @activate="focusCurrentTabEntrySoon"
      >
        <div class="pause-tab-combined-options-content">
          <section
            ref="bottomBarRef"
            class="pause-tab-combined-options-controls"
          >
            <BngRow
              class="pause-tab-combined-option pause-tab-combined-live-row"
              bng-scoped-nav-autofocus
              :label="$t('ui.garage.liveUpdates')"
              @activate="onToggleOption('applyPartChangesAutomatically')"
            >
              <SwitchToggle
                class="pause-tab-combined-live-switch"
                :disabled="partsChanged || waitingForData"
                :checked="opts.applyPartChangesAutomatically"
              />
            </BngRow>

            <BngButton
              class="pause-tab-combined-options-button pause-tab-combined-revert-button"
              :icon="icons.undo"
              :accent="ACCENTS.outlined"
              @click="confirmResetAllToLoadedConfig"
              :disabled="waitingForData"
            >
              {{ $t("ui.vehicleconfig.revertToOriginalConfig") }}
            </BngButton>
            <BngButton
              class="pause-tab-combined-options-button"
              :icon="icons.saveAs1"
              :accent="ACCENTS.outlined"
              :disabled="waitingForData"
              @click="openSaveAsNewConfig"
            >
              {{ $t("ui.vehicleconfig.saveConfigEllipsis") }}
            </BngButton>
            <BngButton
              class="pause-tab-combined-options-button"
              :icon="icons.listBig"
              :accent="ACCENTS.outlined"
              :disabled="waitingForData"
              @click="openConfigListManage"
            >
              {{ $t("ui.vehicleconfig.manageSavedConfigsEllipsis") }}
            </BngButton>
          </section>

          <section class="pause-tab-combined-options-section">
            <h3>{{ $t("ui.vehicleconfig.licensePlate") }}</h3>
            <div class="pause-tab-combined-license-plate" v-bng-disabled="waitingForData">
              <BngInput
                class="pause-tab-combined-license-plate-input"
                v-model="licensePlate"
                maxlength="50"
                :validate="isLicensePlateTextValid"
                @change="applyLicensePlateDebounced()"
                @blur="applyLicensePlate"
                @enter="applyLicensePlate"
              />
              <BngButton
                :accent="ACCENTS.outlined"
                :icon="icons.sync"
                @click="applyRandomLicensePlate()"
                v-bng-tooltip:top="$t('ui.vehicleconfig.licensePlateGen')"
              />
            </div>
          </section>

          <section class="pause-tab-combined-options-section">
            <h3>{{ $t("ui.vehicleconfig.partsDisplay") }}</h3>
            <BngRow
              v-if="!$simplemenu"
              class="pause-tab-combined-option"
              :label="$t('ui.showAuxiliary')"
              @activate="onToggleOption('showAux')"
            >
              <SwitchToggle :checked="opts.showAux" />
            </BngRow>
            <BngRow
              v-if="!$simplemenu"
              class="pause-tab-combined-option"
              :label="$t('ui.vehicleconfig.displayNames')"
              @activate="onToggleOption('showNames')"
            >
              <SwitchToggle :checked="opts.showNames" />
            </BngRow>
            <BngRow
              class="pause-tab-combined-option"
              :label="$t('ui.vehicleconfig.subparts')"
              @activate="onToggleOption('selectSubParts')"
            >
              <SwitchToggle :checked="opts.selectSubParts" />
            </BngRow>
            <BngRow
              class="pause-tab-combined-option"
              :label="$t('ui.vehicleconfig.sortSubListsSeparately')"
              @activate="onToggleOption('separateSort')"
            >
              <SwitchToggle :checked="opts.separateSort" />
            </BngRow>
            <BngRow
              class="pause-tab-combined-option"
              :label="$t('ui.vehicleconfig.alwaysSortByName')"
              @activate="onToggleOption('alwaysSort')"
            >
              <SwitchToggle :checked="opts.alwaysSort" />
            </BngRow>
            <BngRow
              v-if="isDev && !$simplemenu"
              class="pause-tab-combined-option"
              :label="$t('ui.vehicleconfig.showEmptySlotsDev')"
              @activate="onToggleOption('showEmpty')"
            >
              <SwitchToggle :checked="opts.showEmpty" />
            </BngRow>
            <BngRow
              class="pause-tab-combined-option"
              :label="'Show Debug tab'"
              @activate="onToggleOption('showDebugTab')"
            >
              <SwitchToggle :checked="opts.showDebugTab" />
            </BngRow>
          </section>
        </div>
      </div>

      <div
        v-if="opts.showDebugTab"
        ref="debugTabRef"
        class="pause-tab-combined-tab pause-tab-combined-debug"
        :tab-heading="$t('ui.debug.vehicle')"
        :tab-icon="icons.bug"
        :tab-tooltip="$t('ui.debug.vehicle')"
        v-bng-scoped-nav="{
          scopeId: 'pause-tab-combined-debug',
          type: 'container',
          open: activeTabIndex === TAB_INDEX.DEBUG,
          preferAutoFocus: true,
          bubbleWhitelistEvents: TAB_BUBBLE_EVENTS,
          preventNavigationEscape: TAB_PREVENT_NAV_ESCAPE
        }"
        @activate="focusCurrentTabEntrySoon"
      >
        <Debug v-if="activeTabIndex === TAB_INDEX.DEBUG" />
      </div>
    </BngTabs>
    <div
      v-if="showFloatingChangesOverlay"
      :class="{
        'pause-tab-combined-floating-overlays': true,
        'pause-tab-combined-floating-overlays--has-changes': hasFloatingApplyChanges,
      }"
    >
      <div
        v-if="showFloatingPartsActions || showFloatingApplyButton"
        class="pause-tab-combined-floating-apply-overlay"
      >
        <BngButton
          v-if="showFloatingPartsActions"
          show-hold
          :class="{
            'pause-tab-combined-floating-unhide': true,
            'hold-start': partsActionHoldActive,
            'hold-active': partsActionHoldActive,
          }"
          :style="partsActionHoldStyle"
          :accent="ACCENTS.ghost"
          :disabled="unhideAllPartsDisabled"
          v-bng-click="{
            holdCallback: unhideAllParts,
            holdDelay: 1000,
            repeatInterval: 0,
          }"
        >
          <BngBinding ui-event="action_2" controller />
          {{ $t('ui.vehicleconfig.unhideAll') }}
        </BngButton>
        <BngButton
          v-if="showFloatingApplyButton"
          class="pause-tab-combined-floating-apply"
          :disabled="floatingApplyDisabled"
          @click="applyCurrentTabChanges"
        >
          <BngBinding ui-event="action_3" controller />
          {{ floatingApplyButtonLabel }}
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, inject } from "vue"
import { lua } from "@/bridge"
import { debounce } from "@/utils/rateLimit"
import { BngRow, BngButton, BngInput, BngIcon, BngTabs, BngBinding, ACCENTS, icons } from "@/common/components/base"
import { SwitchToggle } from "@/common/components/utility"
import { timeSpan } from "@/utils/datetime"
import { vBngDisabled, vBngScopedNav, vBngOnUiNav, vBngTooltip, vBngUiNavLabel, vBngClick } from "@/common/directives"
import PartsBranch from "@/modules/vehicleConfig/components/PartsBranch.vue"
import Tuning from "@/modules/vehicleConfig/components/Tuning.vue"
import Paint from "@/modules/vehicleConfig/components/Paint.vue"
import Debug from "@/modules/vehicleConfig/components/Debug.vue"
import { getUINavHandlers } from "@/services/uiNav"
import { setFocus } from "@/services/uiNavFocus"
import { focusOnElement } from "@/services/crossfire"
import { useScopedNav } from "@/services/scopedNav/api"
import { openConfirmation, confirmCancelButtons } from "@/services/popup"
import { $translate } from "@/services/translation"
import { usePartsManager } from "../composables/usePartsManager"

const $simplemenu = inject("$simplemenu")

defineOptions({ name: "PauseVehicleConfigurationCombined" })

const emit = defineEmits(["tab-heading-change"])

const scopedNav = useScopedNav()

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
  toggleFocusedPartVisibility,
  unhideAllParts,
  partConfigChanged,
  dropdownOpened,
  write,
  resetAllToLoadedConfig,
  saveOption,
} = usePartsManager()

const TAB_BUBBLE_EVENTS = ["tab_l", "tab_r", "menu", "context", "action_2", "action_3"]
const SEARCH_BUBBLE_EVENTS = ["menu"]
const TAB_PREVENT_NAV_ESCAPE = ["left", "right", "top", "bottom"]
const PARTS_ACTION_HOLD_DELAY = 1000
const TAB_INDEX = Object.freeze({
  PARTS: 0,
  TUNING: 1,
  PAINT: 2,
  OPTIONS: 3,
  DEBUG: 4,
})

const rootRef = ref(null)
const tabbedPanelRef = ref(null)
const partsTabRef = ref(null)
const searchScopeRef = ref(null)
const tuningTabRef = ref(null)
const paintTabRef = ref(null)
const tuningRef = ref(null)
const paintRef = ref(null)
const debugTabRef = ref(null)
const optionsRef = ref(null)
const bottomBarRef = ref(null)
const activeTabIndex = ref(TAB_INDEX.PARTS)
const floatingApplyPending = ref(false)
const partsActionHoldActive = ref(false)
const licensePlate = ref("")
const licensePlateTextValid = ref(true)
const menuOpenedAt = ref(null)
const tabIds = Object.freeze(["parts", "tuning", "appearance", "other", "debug"])
const tabHeadingKeys = Object.freeze([
  "ui.vehicleconfig.parts",
  "ui.vehicleconfig.tuning",
  "ui.vehicleconfig.paint",
  "ui.vehicleconfig.tab.other",
  "ui.debug.vehicle",
])
const activeTabHeadingLabel = computed(() =>
  $translate.instant(tabHeadingKeys[activeTabIndex.value] || tabHeadingKeys[0]),
)
const activeTabId = computed(() => tabIds[activeTabIndex.value] || tabIds[0])
const normalizedSearchText = computed(() => String(search.text || "").trim())
const hasSearchInputMinLength = computed(() => normalizedSearchText.value.length >= search.minText)
const hasValidSearchInput = computed(() => hasSearchInputMinLength.value && search.parseQuery(normalizedSearchText.value).good)
const showSearchResults = computed(() => hasValidSearchInput.value)
const hasPartsTree = computed(() => currentConfig.value?.children && Object.keys(currentConfig.value.children).length > 0)
const showFloatingChangesOverlay = computed(() => activeTabIndex.value !== TAB_INDEX.OPTIONS && activeTabIndex.value !== TAB_INDEX.DEBUG)
const showFloatingPartsActions = computed(() => activeTabIndex.value === TAB_INDEX.PARTS)
const showFloatingApplyButton = computed(() =>
  !opts.applyPartChangesAutomatically && (activeTabIndex.value === TAB_INDEX.PARTS || activeTabIndex.value === TAB_INDEX.TUNING)
)
const pendingPartsChangeCount = computed(() => {
  let count = 0
  const walk = node => {
    if (!node) return
    if (node.changed) count += 1
    if (node.children) Object.values(node.children).forEach(walk)
  }
  walk(currentConfig.value)
  return count
})
const hasHiddenParts = computed(() => {
  let hidden = false
  const walk = node => {
    if (!node || hidden) return
    if (node.highlight === false) {
      hidden = true
      return
    }
    if (node.children) Object.values(node.children).forEach(walk)
  }
  walk(currentConfig.value)
  return hidden
})
const pendingTuningChangeCount = computed(() => Number(tuningRef.value?.changedCount || 0))
const hasFloatingApplyChanges = computed(() => {
  if (activeTabIndex.value === TAB_INDEX.TUNING) return pendingTuningChangeCount.value > 0
  if (activeTabIndex.value === TAB_INDEX.PAINT) return false
  if (activeTabIndex.value === TAB_INDEX.DEBUG) return false
  return pendingPartsChangeCount.value > 0 || partsChanged.value
})
const floatingApplyDisabled = computed(() => opts.applyPartChangesAutomatically || !hasFloatingApplyChanges.value || waitingForData.value)
const floatingApplyButtonLabel = computed(() => {
  if (floatingApplyPending.value) return $translate.instant("ui.common.loading.short")
  const count = activeTabIndex.value === TAB_INDEX.TUNING ? pendingTuningChangeCount.value : pendingPartsChangeCount.value
  return $translate.instant("ui.vehicleconfig.applyChanges", { count })
})
const floatingApplyNavLabel = computed(() => {
  if (floatingApplyPending.value) return $translate.instant("ui.common.loading.short")
  return $translate.instant("ui.common.apply")
})
const unhideAllPartsDisabled = computed(() => !hasHiddenParts.value || waitingForData.value)
const partsActionHoldStyle = computed(() => ({
  "--hold-time": `${PARTS_ACTION_HOLD_DELAY}ms`,
}))

const nextFrame = () => {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return Promise.resolve()
  }
  return new Promise(resolve => window.requestAnimationFrame(resolve))
}

const getLicensePlate = () => bngApi.engineLua("core_vehicles.getVehicleLicenseText(getPlayerVehicle(0))", str => (licensePlate.value = str))

function applyLicensePlate() {
  applyLicensePlateDebounced.cancel()
  if (!licensePlateTextValid.value) return
  lua.core_vehicles.setPlateText(licensePlate.value)
}

// plate text applies automatically as you type (no manual apply button)
const applyLicensePlateDebounced = debounce(() => applyLicensePlate(), 20)

function applyRandomLicensePlate() {
  bngApi.engineLua("core_vehicles.setPlateText(core_vehicles.regenerateVehicleLicenseText(getPlayerVehicle(0)),nil,nil,nil)")
  getLicensePlate()
}

const isLicensePlateTextValid = text => {
  lua.core_vehicles.isLicensePlateValid(text).then(valid => {
    licensePlateTextValid.value = valid
  })
  return licensePlateTextValid.value
}

function isVisibleAndFocusable(target) {
  if (!target || typeof target.focus !== "function") return false
  if (target.matches?.("[disabled]")) return false
  return target.getClientRects().length > 0
}

function focusElement(target) {
  if (!isVisibleAndFocusable(target)) return false
  if (setFocus(target)) return true
  target.focus()
  return document.activeElement === target
}

function focusFirstMatching(rootElement, selectors) {
  if (!rootElement) return false
  for (const selector of selectors) {
    if (focusElement(rootElement.querySelector(selector))) return true
  }
  return false
}

function getActiveTabScopeId() {
  if (activeTabIndex.value === TAB_INDEX.OPTIONS) return "pause-tab-combined-options"
  if (activeTabIndex.value === TAB_INDEX.TUNING) return "pause-tab-combined-tuning"
  if (activeTabIndex.value === TAB_INDEX.PAINT) return "pause-tab-combined-paint"
  if (activeTabIndex.value === TAB_INDEX.DEBUG) return "pause-tab-combined-debug"
  return "pause-tab-combined-parts"
}

function focusPartsEntry() {
  return focusFirstMatching(partsTabRef.value, [
    ".bng-accitem-caption[bng-nav-item]",
    ".bng-accitem-caption",
  ])
}

function hasFocusedPartsEntry() {
  const activeElement = document.activeElement
  return !!(
    activeElement &&
    activeElement !== document.body &&
    partsTabRef.value?.contains(activeElement) &&
    activeElement.matches?.(".bng-accitem-caption")
  )
}

function focusSearchEntry() {
  return focusFirstMatching(searchScopeRef.value, [
    ".pause-tab-combined-search input",
    ".pause-tab-combined-search button:not([disabled])",
  ])
}

function focusTuningEntry() {
  // No-op: let scoped-nav own tuning entry focus. activateCurrentTabScope()
  // activates "pause-tab-combined-tuning" and BngScopedNav selects the first
  // valid navigable item (e.g. the mirrors button, then the first tuning row).
  // Returning false avoids creating a competing focus request that would race
  // with scoped-nav's activation pass and cause a visible focus jump.
  return false
}

function focusPaintEntry() {
  return focusFirstMatching(paintTabRef.value, [
    ".paint-preview-container [bng-nav-item]:not([disabled])",
    ".paint-acc-container .bng-accitem-caption",
    ".paint-picker [bng-nav-item]:not([disabled])",
    ".paint-picker input:not([disabled])",
    "button:not([disabled])",
    "input:not([disabled])",
  ])
}

function focusOptionsEntry() {
  return focusFirstMatching(optionsRef.value, [
    ".pause-tab-combined-option[bng-scoped-nav-autofocus][bng-nav-item]:not([disabled])",
    ".pause-tab-combined-option[bng-nav-item]:not([disabled])",
    ".pause-tab-combined-options-actions button:not([disabled])",
    "button:not([disabled]):not([bng-no-nav='true'])",
    "input:not([disabled]):not([bng-no-nav='true'])",
  ])
}

function focusDebugEntry() {
  return focusFirstMatching(debugTabRef.value, [
    "[bng-nav-item]:not([disabled]):not([bng-no-nav='true'])",
    "button:not([disabled]):not([bng-no-nav='true'])",
    "input:not([disabled]):not([bng-no-nav='true'])",
  ])
}

function focusBottomBarFirstElement() {
  return focusFirstMatching(bottomBarRef.value, [
    ".pause-tab-combined-live-switch input:not([disabled])",
    ".pause-tab-combined-live-switch .bng-switch:not([disabled])",
    ".pause-tab-combined-live-switch",
    "button:not([disabled])",
  ])
}

function focusCurrentTabEntry() {
  if (activeTabIndex.value === TAB_INDEX.OPTIONS) return focusOptionsEntry()
  if (activeTabIndex.value === TAB_INDEX.TUNING) return focusTuningEntry()
  if (activeTabIndex.value === TAB_INDEX.PAINT) return focusPaintEntry()
  if (activeTabIndex.value === TAB_INDEX.DEBUG) return focusDebugEntry()
  return focusPartsEntry()
}

async function focusCurrentTabEntrySoon() {
  await nextTick()
  if (focusCurrentTabEntry()) return
  await nextFrame()
  focusCurrentTabEntry()
}

async function focusPartsEntrySoon() {
  await nextTick()
  if (hasFocusedPartsEntry()) return true
  if (focusPartsEntry()) return true
  await nextFrame()
  if (hasFocusedPartsEntry()) return true
  return focusPartsEntry()
}

async function restorePartsFocusOnResume() {
  await nextTick()
  if (hasFocusedPartsEntry()) return true

  const caption = partsTabRef.value?.querySelector(
    ".bng-accitem-caption[bng-scoped-nav-autofocus]"
  )
  if (!isVisibleAndFocusable(caption)) return false

  focusOnElement(caption)
  return document.activeElement === caption
}

function onPartsScopeActivate(event) {
  if (event?.detail?.reason === "pause-tab-combined-focus-search") return
  if (event?.detail?.resume) {
    void restorePartsFocusOnResume()
    return
  }
  void focusPartsEntrySoon()
}

async function activateCurrentTabScope() {
  await nextTick()
  await scopedNav.activateScope(getActiveTabScopeId(), { reason: "pause-tab-combined-tab-change", force: true })
  await focusCurrentTabEntrySoon()
}

async function focusSearch() {
  activeTabIndex.value = TAB_INDEX.PARTS
  await nextTick()
  await scopedNav.activateScope("pause-tab-combined-parts", { reason: "pause-tab-combined-focus-search", force: true })
  await scopedNav.activateScope("pause-tab-combined-search", { reason: "pause-tab-combined-focus-search", force: true })
  await nextTick()
  if (focusSearchEntry()) return true
  await nextFrame()
  return focusSearchEntry()
}

async function returnToPartsTabScope() {
  activeTabIndex.value = TAB_INDEX.PARTS
  await nextTick()
  await scopedNav.activateScope("pause-tab-combined-parts", { reason: "pause-tab-combined-search-exit", force: true })
  await nextTick()
  if (focusPartsEntry()) return true
  await nextFrame()
  return focusPartsEntry()
}

async function onSearchBlur() {
  await nextTick()
  await nextFrame()
  const activeElement = document.activeElement
  if (activeElement && searchScopeRef.value?.contains(activeElement)) return
  void returnToPartsTabScope()
}

function clearSearch() {
  search.stop()
  void focusSearch()
}

function onSearchInputChanged() {
  search.active = showSearchResults.value
}

async function confirmResetAllToLoadedConfig() {
  const openedAt = menuOpenedAt.value || Date.now()
  const formattedTime = timeSpan(openedAt / 1000, null, 2, true)
  const confirmed = await openConfirmation(
    $translate.instant("ui.vehicleconfig.revertToOriginalConfigConfirm", { time: formattedTime }),
    "",
    confirmCancelButtons(),
  ).catch(() => false)
  if (!confirmed) return
  resetAllToLoadedConfig()
}

function openSaveAsNewConfig() {
  lua.extensions.ui_router.navigate("pause.vehicle.configurationcombined.save", null, null)
}

function openConfigListManage() {
  lua.extensions.ui_router.navigate("pause.vehicle.configurationcombined.configlistmanage", null, null)
}

function applyCurrentTabChanges() {
  if (floatingApplyDisabled.value) return false
  if (activeTabIndex.value === TAB_INDEX.TUNING) {
    tuningRef.value?.apply?.()
    return false
  }
  waitingForData.value = true
  floatingApplyPending.value = true
  void write().finally(() => {
    floatingApplyPending.value = false
  })
  return false
}

function onPartSelected(part, mouse = false) {
  void selectPart(part, mouse)
}

function onPartDeselected(part, mouse = false) {
  void deselectPart(part, mouse)
}

let partsActionHoldTimer = null
let partsActionHoldCompleted = false
let removePartsActionHandler = null

function clearPartsActionHoldTimer() {
  if (!partsActionHoldTimer) return
  clearTimeout(partsActionHoldTimer)
  partsActionHoldTimer = null
}

function stopPartsActionHold() {
  clearPartsActionHoldTimer()
  partsActionHoldActive.value = false
}

function onPartsAction2Down() {
  if (waitingForData.value) return false
  stopPartsActionHold()
  partsActionHoldCompleted = false
  partsActionHoldActive.value = true
  partsActionHoldTimer = setTimeout(() => {
    partsActionHoldTimer = null
    partsActionHoldCompleted = true
    partsActionHoldActive.value = false
    void unhideAllParts()
  }, PARTS_ACTION_HOLD_DELAY)
  return false
}

function onPartsAction2Up() {
  if (waitingForData.value) return false
  stopPartsActionHold()
  if (!partsActionHoldCompleted) toggleFocusedPartVisibility()
  partsActionHoldCompleted = false
  return false
}

function onPartsAction2(event) {
  if (activeTabIndex.value !== TAB_INDEX.PARTS) return true
  if (event?.detail?.value) return onPartsAction2Down()
  return onPartsAction2Up()
}

function onPartsContextInput() {
  if (activeTabIndex.value !== TAB_INDEX.PARTS) return true
  void focusSearch()
  return false
}

function onTabChange() {
  void deselectPart()
  void activateCurrentTabScope()
}

function focusEntry() {
  void scopedNav.activateScope(getActiveTabScopeId(), { reason: "pause-tab-combined-focus-entry", force: true })
  return focusCurrentTabEntry()
}

async function activateBottomBar() {
  if (activeTabIndex.value !== TAB_INDEX.OPTIONS) return false
  await nextTick()
  return focusBottomBarFirstElement()
}

function onToggleOption(name) {
  opts[name] = !opts[name]
  saveOption(name, opts[name])
  if (name === "showDebugTab" && !opts.showDebugTab && activeTabIndex.value === TAB_INDEX.DEBUG) {
    activeTabIndex.value = TAB_INDEX.OPTIONS
  }
}

defineExpose({
  focusEntry,
  focusSearch,
  activateBottomBar,
})

onMounted(() => {
  menuOpenedAt.value = Date.now()
  getLicensePlate()
  const uiNavHandlers = getUINavHandlers()
  const element = partsTabRef.value
  if (!element) return
  const handler = uiNavHandlers.add(
    element,
    {
      name: "action_2",
      value: undefined,
      eventNames: ["action_2"],
    },
    onPartsAction2
  )
  removePartsActionHandler = () => uiNavHandlers.remove(element, handler)
})

onUnmounted(() => {
  removePartsActionHandler?.()
  stopPartsActionHold()
})

watch(
  showSearchResults,
  valid => {
    search.active = valid
    if (valid) return
    search.message = ""
    search.highlight = []
  },
  { immediate: true }
)

watch(activeTabHeadingLabel, label => emit("tab-heading-change", label), { immediate: true })

watch(
  activeTabId,
  tabId => {
    lua.extensions.hook("onVehicleConfigurationCombinedTabVisible", tabId)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.pause-tab-combined {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.pause-tab-combined-tabs {
  flex: 1 1 auto;
  min-height: 0;
}

.pause-tab-combined-tab {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem 0.125rem;
  --tab-content-overflow: hidden auto;
}

.pause-tab-combined-parts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pause-tab-combined-parts-branch {
  flex: 0 0 auto;
  max-height: none;
}

.pause-tab-combined-overlay-spacer {
  flex: 0 0 3rem;
}

.pause-tab-combined-search,
.pause-tab-combined-search-message,
.pause-tab-combined-license-plate,
.pause-tab-combined-options-controls,
.pause-tab-combined-options-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pause-tab-combined-search {
  position: sticky;
  top: 0;
  z-index: 2;
  flex: 0 0 auto;
  width: 100%;
  padding: 0.25rem 0.5rem;
  background-color: var(--bng-cool-gray-900);
  border-bottom: 1px solid rgba(var(--bng-orange-500-rgb), 0.75);
}

.pause-tab-combined-search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.pause-tab-combined-search-binding {
  flex: 0 0 auto;
  pointer-events: none;
}

.pause-tab-combined-options {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  outline: none;
}

.pause-tab-combined-options-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0.125rem;
}

.pause-tab-combined-options-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  h3 {
    font-size: 1rem;
    font-weight: 700;
    padding: 0;
    margin-bottom: 0;
  }
}

.pause-tab-combined-license-plate {
  flex: 1 1 auto;
  min-width: 0;
}

.pause-tab-combined-license-plate-input {
  flex: 1 1 auto;
  font-weight: 600;
}

.pause-tab-combined-options-controls {
  flex: 0 0 auto;
  align-items: stretch;
  flex-direction: column;
  border-bottom: 1px solid rgba(var(--bng-orange-500-rgb), 0.75);
  padding: 0 0 0.75rem;
  outline: none;
}

.pause-tab-combined-options-button {
  --bng-button-max-width: 100%;
}

.pause-tab-combined-floating-overlays {

  --pause-tab-combined-floating-shadow-color: rgba(var(--bng-cool-gray-900-rgb), 1);
  --pause-tab-combined-floating-status-background: rgba(var(--bng-cool-gray-900-rgb), 1);

  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  pointer-events: none;
}

.pause-tab-combined-floating-overlays--has-changes {
  --pause-tab-combined-floating-shadow-color: rgba(var(--bng-orange-500-rgb), 0.95);
  --pause-tab-combined-floating-status-background: linear-gradient(90deg, rgba(var(--bng-orange-700-rgb), 0.95) 0%, rgba(var(--bng-cool-gray-900-rgb), 1) 50%);
}

.pause-tab-combined-floating-status-overlay {
  width: 100%;
  font-size: 0.85rem;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  text-align: left;
  background: var(--pause-tab-combined-floating-status-background);
  filter: drop-shadow(0 0 0.5rem var(--pause-tab-combined-floating-shadow-color));
  padding: 0.25rem 0.75rem;
  pointer-events: auto;
}

.pause-tab-combined-floating-apply-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 1);
  filter: drop-shadow(0 0 0.5rem var(--pause-tab-combined-floating-shadow-color));
  border-radius: var(--bng-corners-3) 0 0;
  padding: 0.25rem;
  pointer-events: auto;
}

.pause-tab-combined-floating-unhide {
  --bng-button-max-width: 100%;
  --bng-button-min-width: 8rem;
}

.pause-tab-combined-floating-apply {
  --bng-button-max-width: 100%;
  --bng-button-min-width: 10rem;
}

.pause-tab-combined-search-help {
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

.pause-tab-combined-search-history {
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
