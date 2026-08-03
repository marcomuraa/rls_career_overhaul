<template>
  <div ref="rootRef" class="pause-skin">
    <BngTabs
      v-model="activeTabIndex"
      class="pause-skin-tabbed-panel"
      use-bindings
      icon-only
      @change="focusCurrentTabEntrySoon"
    >
      <div
        ref="paintTabRef"
        class="pause-skin-tab pause-skin-paint-tab"
        :tab-heading="$t('ui.vehicleconfig.paint')"
        :tab-icon="icons.sprayCan"
        :tab-tooltip="$t('ui.vehicleconfig.paint')"
        v-bng-scoped-nav="{ scopeId: 'pause-skin-paint-tab', bubbleWhitelistEvents: TAB_BUBBLE_EVENTS }"
      >
        <Paint ref="paintRef" />
      </div>

      <div
        ref="partsTabRef"
        class="pause-skin-tab pause-skin-parts-tab"
        :tab-heading="$t('ui.vehicleconfig.tab.skinParts')"
        :tab-icon="icons.listIndented"
        :tab-tooltip="$t('ui.vehicleconfig.tab.skinParts')"
        v-bng-scoped-nav="{ scopeId: 'pause-skin-parts-tab', bubbleWhitelistEvents: TAB_BUBBLE_EVENTS }"
      >
        <PartsBranch
          v-if="Object.keys(simplifiedPartsChildren).length > 0"
          :children="simplifiedPartsChildren"
          :info="richPartInfo"
          :tree-state="treeState"
          flat-entry
          :display-names="opts.showNames"
          :show-auxiliary="opts.showAux"
          :separate-sort="opts.separateSort"
          :always-sort="opts.alwaysSort"
          :show-empty="opts.showEmpty"
          no-highlight
          @select="selectPart"
          @deselect="deselectPart"
          @highlight="highlightPart"
          @change="partConfigChanged"
          @dropdown="dropdownOpened"
        />
        <div v-else class="pause-skin-empty-message">
          No skin-related parts found.
        </div>
        <div class="pause-skin-license-plate" v-bng-disabled="waitingForData">
          <span class="license-plate-label">{{ $t('ui.vehicleconfig.licensePlate') }}</span>
          <BngInput
            v-model="licensePlate"
            maxlength="50"
            :validate="isLicensePlateTextValid"
            @blur="applyLicensePlate"
            @enter="applyLicensePlate"
          />
          <BngButton
            :accent="ACCENTS.outlined"
            :icon="icons.sync"
            @click="applyRandomLicensePlate()"
            v-bng-tooltip:top="$t('ui.vehicleconfig.licensePlateGen')"
          />
          <BngButton
            :disabled="!licensePlateTextValid"
            :icon="icons.checkmark"
            @click="applyLicensePlate()"
            v-bng-tooltip:top="$t('ui.vehicleconfig.applyLicensePlate')"
          />
        </div>
      </div>
    </BngTabs>

    <div
      v-if="activeTabIndex === 1"
      ref="bottomBarRef"
      class="pause-skin-bottom"
    >
      <BngSwitch
        class="pause-skin-live-switch"
        :disabled="partsChanged || waitingForData"
        v-model="opts.applyPartChangesAutomatically"
        bng-scoped-nav-autofocus
        @valueChanged="saveOption('applyPartChangesAutomatically', opts.applyPartChangesAutomatically)"
      >
        {{ $t("ui.garage.liveUpdates") }}
      </BngSwitch>

      <div class="pause-skin-bottom-actions">
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
          class="pause-skin-apply-button"
          :icon="icons.checkmark"
          @click="write()"
          :disabled="!partsChanged || waitingForData"
        >{{ $t("ui.common.apply") }}</BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, onMounted } from "vue"
import { lua } from "@/bridge"
import { BngTabs, BngInput, BngButton, BngSwitch, ACCENTS, icons } from "@/common/components/base"
import { vBngScopedNav, vBngDisabled, vBngTooltip, vBngClick } from "@/common/directives"
import Paint from "@/modules/vehicleConfig/components/Paint.vue"
import PartsBranch from "@/modules/vehicleConfig/components/PartsBranch.vue"
import { usePartsManager } from "../composables/usePartsManager"
import { useScopedNav } from "@/services/scopedNav/api"

defineOptions({ name: "PauseSkin" })

const TAB_BUBBLE_EVENTS = ["tab_l", "tab_r", "menu", "back", "context"]
const scopedNav = useScopedNav()
const SKIN_KEYWORDS = [
  "paint",
  "color",
  "tint",
  "skin",
  "livery",
  "decal",
  "design",
]

const {
  currentConfig,
  richPartInfo,
  treeState,
  opts,
  waitingForData,
  partsChanged,
  selectPart,
  deselectPart,
  highlightPart,
  partConfigChanged,
  dropdownOpened,
  write,
  resetAllToLoadedConfig,
  saveOption,
} = usePartsManager()

const licensePlate = ref("")
const licensePlateTextValid = ref(true)

const getLicensePlate = () => bngApi.engineLua("core_vehicles.getVehicleLicenseText(getPlayerVehicle(0))", str => (licensePlate.value = str))

function applyLicensePlate() {
  if (!licensePlateTextValid.value) return
  lua.core_vehicles.setPlateText(licensePlate.value)
}

function applyRandomLicensePlate() {
  bngApi.engineLua(`core_vehicles.setPlateText(core_vehicles.regenerateVehicleLicenseText(getPlayerVehicle(0)),nil,nil,nil)`)
  getLicensePlate()
}

const isLicensePlateTextValid = (text) => {
  lua.core_vehicles.isLicensePlateValid(text).then(valid => {
    licensePlateTextValid.value = valid
  })
  return licensePlateTextValid.value
}

onMounted(() => {
  getLicensePlate()
})

const rootRef = ref(null)
const paintRef = ref(null)
const paintTabRef = ref(null)
const partsTabRef = ref(null)
const bottomBarRef = ref(null)
const activeTabIndex = ref(0)

function normalizeText(value) {
  return String(value || "").toLowerCase()
}

function includesKeyword(value) {
  const text = normalizeText(value)
  if (!text) return false
  return SKIN_KEYWORDS.some(keyword => text.includes(keyword))
}

function matchesSkinKeywords(slot, info) {
  if (!slot) return false
  if (includesKeyword(slot.slotName) || includesKeyword(slot.chosenPartName)) return true

  const slotInfo = info?.[slot.parentSlotName]?.slotInfoUi?.[slot.slotName]
  if (includesKeyword(slotInfo?.description)) return true

  const chosenInfo = info?.[slot.chosenPartName]
  if (includesKeyword(chosenInfo?.description) || includesKeyword(chosenInfo?.authors)) return true

  // const partNames = [
  //   ...(slot.suitablePartNames || []),
  //   ...((slot.unsuitablePartNames || []).map(item => item.partName)),
  // ]
  // for (const partName of partNames) {
  //   if (includesKeyword(partName) || includesKeyword(info?.[partName]?.description)) return true
  // }

  return false
}

const simplifiedPartsChildren = computed(() => {
  const rootNode = currentConfig.value
  const info = richPartInfo.value || {}
  if (!rootNode?.children) return {}

  const result = {}
  let count = 0

  const walk = node => {
    if (!node?.children) return
    for (const child of Object.values(node.children)) {
      if (matchesSkinKeywords(child, info)) {
        result[`${child.slotName}?${++count}`] = child
      }
      walk(child)
    }
  }

  walk(rootNode)
  return result
})

function focusPaintEntry() {
  // const paintFocus = paintRef.value?.focusEntry?.()
  // if (paintFocus) return true

  // const paintRoot = paintRef.value?.$el || paintTabRef.value
  // if (!paintRoot) return false

  // const target = paintRoot.querySelector(".paint-preview-container [bng-nav-item]:not([disabled])")
  //   || paintRoot.querySelector(".paint-acc-container .bng-accitem-caption")
  //   || paintRoot.querySelector(".paint-picker [bng-nav-item]:not([disabled])")
  //   || paintRoot.querySelector(".paint-picker input:not([disabled])")
  //   || paintRoot.querySelector("button:not([disabled])")
  //   || paintRoot.querySelector("input:not([disabled])")
  // if (!target || typeof target.focus !== "function") return false
  // target.focus()
  scopedNav.activateScope("pause-skin-paint-tab")
  return true
}

function focusPartsEntry() {
  // const partsRoot = partsTabRef.value
  // if (!partsRoot) return false
  // const target = partsRoot.querySelector(".bng-accitem-caption")
  //   || partsRoot.querySelector("button:not([disabled])")
  // if (!target || typeof target.focus !== "function") return false
  // target.focus()
  scopedNav.activateScope("pause-skin-parts-tab")
  return true
}

function focusCurrentTabEntry() {
  if (activeTabIndex.value === 1) return focusPartsEntry()
  return focusPaintEntry()
}

async function focusCurrentTabEntrySoon() {
  await nextTick()
  focusCurrentTabEntry()
}

function focusEntry() {
  return focusCurrentTabEntry()
}

function focusBottomBarFirstElement() {
  const el = bottomBarRef.value
  if (!el) return false
  const target = el.querySelector(".pause-skin-live-switch input:not([disabled])")
    || el.querySelector(".pause-skin-live-switch .bng-switch:not([disabled])")
    || el.querySelector(".pause-skin-live-switch")
    || el.querySelector("button:not([disabled])")
  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

async function activateBottomBar() {
  if (activeTabIndex.value === 0) {
    return !!(await paintRef.value?.activateBottomBar?.())
  }
  if (activeTabIndex.value === 1) {
    return focusBottomBarFirstElement()
  }
  return false
}

defineExpose({
  focusEntry,
  activateBottomBar,
})
</script>

<style scoped lang="scss">
.pause-skin {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.pause-skin-tabbed-panel {
  flex: 1 1 auto;
  min-height: 0;
}

.pause-skin-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid rgba(var(--bng-orange-500-rgb), 0.75);
  padding: 0.5em;
}

.pause-skin-bottom-actions {
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.pause-skin-tab {
  width: 100%;
  height: 100%;
  --tab-content-overflow: hidden auto;
}

.pause-skin-parts-tab {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem 0.125rem;
}

.pause-skin-empty-message {
  color: rgba(var(--bng-off-white-rgb), 0.8);
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

.pause-skin-license-plate {
  padding: 1rem 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

.license-plate-label {
  font-weight: 600;
}
</style>
