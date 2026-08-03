<!-- Drag Rules & Setup: opened from Rules POI. Replaces IMGUI rules menu. -->
<template>
  <LayoutSingle
    class="drag-rules-layout"
    v-bng-blur
    v-bng-scoped-nav="{ activateOnMount: true, canDeactivate: () => false, bubbleWhitelistEvents: ['menu'] }"
    v-bng-on-ui-nav:menu,back="exit"
  >
    <BngButton v-if="!screenData" bng-nav-item :accent="ACCENTS.outlined" class="drag-rules-close-btn" @click="exit">{{ $t("ui.common.back") }}</BngButton>
    <div
      v-if="screenData"
      class="drag-rules-wrapper"
    >
      <div class="drag-rules-header">
        <BngScreenHeading :preheadings="[$t(screenData.location)]">{{ screenData.stripName }} {{ $t("ui.drag.rules.headingSuffix") }}</BngScreenHeading>
      </div>

      <div class="drag-rules-main">
        <div ref="contentRef" class="drag-rules-container" bng-nav-scroll-force>
          <BngCard class="drag-rules-card">
            <div class="drag-rules-card-body">
              <div class="drag-rules-section">
                <BngScreenHeadingV2 class="drag-rules-col-heading" type="2">{{ $t("ui.drag.label.dragType") }}</BngScreenHeadingV2>
                <BngPillFilters
                  :modelValue="pillValue('dragType')"
                  :options="localizedDragTypeOptions"
                  :selectMany="false"
                  required
                  @update:modelValue="(v) => setLocalRule('dragType', v)"
                />
              </div>
              <div class="drag-rules-section">
                <BngScreenHeadingV2 class="drag-rules-col-heading" type="2">{{ $t("ui.drag.label.treeType") }}</BngScreenHeadingV2>
                <BngPillFilters
                  :modelValue="pillValue('treeType')"
                  :options="localizedTreeTypeOptions"
                  :selectMany="false"
                  required
                  @update:modelValue="(v) => setLocalRule('treeType', v)"
                />
              </div>
              <div v-if="winnerByTableRows.length > 0" class="drag-rules-section">
                <BngScreenHeadingV2 class="drag-rules-col-heading" type="2">{{ $t("ui.drag.label.winnerBy") }}</BngScreenHeadingV2>
                <div class="drag-rules-winner-table-wrap">
                  <table class="drag-rules-winner-table">
                    <thead>
                      <tr>
                        <th>{{ $t("ui.drag.rules.winnerTimer") }}</th>
                        <th>{{ $t("ui.options.motionSim.velocity") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in winnerByTableRows" :key="row.distance">
                        <td>
                          <button
                            v-if="row.timer"
                            type="button"
                            class="drag-rules-winner-pill"
                            :class="{ selected: localRules.importantTimerId === row.timer.id }"
                            bng-nav-item
                            v-bng-on-ui-nav:ok.asMouse.focusRequired
                            @click="setLocalRule('importantTimerId', row.timer.id)">
                            {{ row.timer.label }}
                          </button>
                          <span v-else class="drag-rules-winner-empty">-</span>
                        </td>
                        <td>
                          <button
                            v-if="row.velocity"
                            type="button"
                            class="drag-rules-winner-pill"
                            :class="{ selected: localRules.importantTimerId === row.velocity.id }"
                            bng-nav-item
                            v-bng-on-ui-nav:ok.asMouse.focusRequired
                            @click="setLocalRule('importantTimerId', row.velocity.id)">
                            {{ row.velocity.label }}
                          </button>
                          <span v-else class="drag-rules-winner-empty">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-else class="drag-rules-section">
                <BngScreenHeadingV2 class="drag-rules-col-heading" type="2">{{ $t("ui.drag.label.winnerBy") }}</BngScreenHeadingV2>
                <span class="drag-rules-muted">{{ $t("ui.drag.rules.noTimers") }}</span>
              </div>
            </div>
          </BngCard>
        </div>
        <div class="drag-rules-slip-preview">
          <BngCard class="drag-rules-slip-card">
            <BngScreenHeadingV2 class="drag-rules-col-heading" type="2">{{ $t("ui.drag.rules.timeslipExample") }}</BngScreenHeadingV2>
            <div class="drag-rules-slip-wrap">
              <Timeslip class="drag-rules-slip-item" :slip="previewSlip" />
            </div>
            <div class="drag-rules-actions">
              <BngButton
                bng-nav-item
                bng-scoped-nav-autofocus
                :disabled="!canSave"
                :class="{ 'drag-rules-save-dirty': isDirty }"
                @click="onSave">
                {{ $t("ui.common.save") }}
              </BngButton>
              <BngButton
                bng-nav-item
                :disabled="!canRestore"
                @click="onRestore">
                {{ $t("ui.drag.rules.restoreDefaults") }}
              </BngButton>
              <BngButton
                bng-nav-item
                :accent="ACCENTS.outlined"
                @click="exit">
                {{ $t("ui.common.back") }}
              </BngButton>
            </div>
          </BngCard>
        </div>
      </div>
    </div>
    <div v-else class="drag-rules-wrapper">
      <BngScreenHeading>{{ $t("ui.drag.rules.heading") }}</BngScreenHeading>
      <div class="drag-rules-container">
        <p class="drag-rules-message">{{ $t("ui.drag.rules.noStripData") }}</p>
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { LayoutSingle } from "@/common/layouts"
import { BngButton, BngScreenHeading, BngScreenHeadingV2, BngPillFilters, BngCard, ACCENTS } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { Timeslip } from "@/modules/apps"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import { ref, computed, onMounted } from "vue"

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  level: { type: String, default: "" }
})

const contentRef = ref(null)
const screenData = ref(null)
const localRules = ref({ dragType: "", treeType: "", importantTimerId: "" })

// Round distance so timer and velocity with same distance land in the same row.
function roundDistance(d) {
  return Math.round(Number(d) * 1000) / 1000
}

// Winner By table: two columns (Timer, Velocity). One row per unique distance.
const winnerByTableRows = computed(() => {
  const raw = screenData.value?.timers
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : [])
  if (!list.length) return []
  const valid = list.filter((t) => t && typeof t === "object" && (t.type === "distanceTimer" || t.type === "velocity"))
  const distances = [...new Set(valid.map((t) => roundDistance(t.distance != null ? t.distance : 0)))].sort((a, b) => a - b)
  return distances.map((dist) => {
    const timer = valid.find((t) => roundDistance(t.distance != null ? t.distance : 0) === dist && t.type === "distanceTimer")
    const velocity = valid.find((t) => roundDistance(t.distance != null ? t.distance : 0) === dist && t.type === "velocity")
    const timerLabel = timer ? (timer.labelKey ? $translate.instant(timer.labelKey) : (timer.label || timer.id)) : null
    const velocityLabel = velocity ? (velocity.labelKey ? $translate.instant(velocity.labelKey) : (velocity.label || velocity.id)) : null
    return {
      distance: dist,
      timer: timer ? { id: timer.id, label: timerLabel } : null,
      velocity: velocity ? { id: velocity.id, label: velocityLabel } : null
    }
  })
})

// Rules defaults: only from Lua (single source of truth).
const defaultRules = computed(() => {
  const d = screenData.value?.defaults
  return d ? { ...d } : null
})

const isDirty = computed(() => {
  const s = screenData.value?.saved
  if (!s) return false
  return localRules.value.dragType !== s.dragType ||
    localRules.value.treeType !== s.treeType ||
    localRules.value.importantTimerId !== s.importantTimerId
})

const isSavedDefault = computed(() => {
  const s = screenData.value?.saved
  const d = defaultRules.value
  if (!s || !d) return true
  return s.dragType === d.dragType && s.treeType === d.treeType && s.importantTimerId === d.importantTimerId
})

const canSave = computed(() => isDirty.value)
const canRestore = computed(() => (defaultRules.value ? (isDirty.value || !isSavedDefault.value) : isDirty.value))

const localizedOptions = (opts) =>
  (opts || []).map(opt => ({ ...opt, label: opt.labelKey ? $translate.instant(opt.labelKey) : opt.label }))

const localizedDragTypeOptions = computed(() => localizedOptions(screenData.value?.dragTypeOptions))
const localizedTreeTypeOptions = computed(() => localizedOptions(screenData.value?.treeTypeOptions))

const labelFromOptions = (opts, id) => {
  const opt = (opts || []).find(o => o.value === id)
  return opt ? (opt.labelKey ? $translate.instant(opt.labelKey) : opt.label) : id
}
const dragTypeLabel = (id) => labelFromOptions(screenData.value?.dragTypeOptions, id)
const treeTypeLabel = (id) => labelFromOptions(screenData.value?.treeTypeOptions, id)

// Current date/time and env for slip preview (no live race data).
const slipDateTime = computed(() => {
  const d = new Date()
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
})

// Default env for preview slip (temperature °C, gravity). Timeslip shows these when slip.env is set.
const slipEnv = computed(() => ({
  tempC: 20,
  tempF: 68,
  customGrav: true,
  gravity: "-9.81"
}))

// Slip for preview: stripInfo (incl. date/time, drag type, tree), racerInfos, env; no times.
// timerConfig is needed so the Timeslip can highlight all rows at the same distance as importantTimerId.
const previewSlip = computed(() => {
  const data = screenData.value
  const rules = localRules.value
  if (!data) return null
  const raw = data.timers
  const timerConfig = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : [])
  return {
    stripInfo: {
      stripName: data.stripName,
      location: data.location,
      dateTime: slipDateTime.value,
      dragType: dragTypeLabel(rules.dragType),
      tree: treeTypeLabel(rules.treeType)
    },
    racerInfos: [
      { laneNum: 1, lane: "Right", name: "—", licenseText: "" },
      { laneNum: 2, lane: "Left", name: "—", licenseText: "" }
    ],
    env: slipEnv.value,
    dragType: rules.dragType,
    importantTimerId: rules.importantTimerId,
    timerConfig: timerConfig
  }
})

function pillValue(key) {
  const v = localRules.value[key]
  return v != null && v !== "" ? [v] : []
}

function setLocalRule(key, value) {
  const v = Array.isArray(value) && value.length ? value[0] : value
  if (v != null) localRules.value[key] = v
}

function applyScreenData(data) {
  screenData.value = data
  localRules.value = {
    dragType: data.saved.dragType,
    treeType: data.saved.treeType,
    importantTimerId: data.saved.importantTimerId
  }
}

function onSave() {
  if (!screenData.value) return
  lua.gameplay_drag_dragBridge.applyRulesSave(
    screenData.value.levelId,
    screenData.value.stripId,
    { ...localRules.value }
  )
  screenData.value.saved = { ...localRules.value }
}

function onRestore() {
  const def = defaultRules.value
  if (!screenData.value || !def) return
  localRules.value = { ...def }
  lua.gameplay_drag_dragBridge.applyRulesSave(screenData.value.levelId, screenData.value.stripId, def)
  screenData.value.saved = { ...def }
}

function exit() {
  window.bngVue.gotoGameState("play")
}

function start() {
  lua.gameplay_drag_dragBridge.getRulesScreenData(props.id).then((data) => {
    if (data) {
      applyScreenData(data)
    } else {
      screenData.value = null
    }
  })
}

onMounted(() => {
  start()
})
</script>

<style lang="scss" scoped>
.drag-rules-layout {
  --content-flow: column;
  color: var(--bng-off-white);
  font-size: 1rem;

  :deep(.layout-content) {
    align-items: center;
  }
}

.drag-rules-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(90rem, 95vw);
  min-height: 0;
  height: 100%;
  align-self: center;
  padding: 2rem;
  box-sizing: border-box;
}

.drag-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 1rem;
}

.drag-rules-close-btn {
  flex-shrink: 0;
}

.drag-rules-main {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  flex: 1;
  width: 100%;
  min-height: 0;
  min-width: 0;
}

.drag-rules-slip-preview {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1;
  background-color: var(--bng-black-o6);
  border-radius: var(--bng-corners-2);

  .drag-rules-slip-card {
    --bng-card-height: 100%;
    display: flex;
    flex: 1;
    width: 100%;
    overflow: hidden;
  }
}

.drag-rules-slip-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  width: 100%;
  padding: 1rem;
  min-height: 0;
}

.drag-rules-slip-item {
  flex: 0 0 auto;
  width: 60%;
  font-size: 1rem;
}

.drag-rules-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  flex: 1 1 0;
  min-width: 0;
}

.drag-rules-card {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  height: 100%;
  border-radius: var(--bng-corners-2);
  background-color: var(--bng-black-o6);
}

.drag-rules-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  min-height: 0;
}


.drag-rules-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 0.75rem;

  .drag-rules-muted {
    color: var(--bng-cool-gray-400);
    font-size: 0.95em;
  }

  :deep(.bng-pill-filters) {
    width: fit-content;
    min-width: 1rem;
  }
}

.drag-rules-winner-table-wrap {
  display: flex;
  flex-direction: column;
  margin: 0.5rem auto 1rem;
  max-width: 24rem;
  max-height: min(35vh, auto);
  overflow: auto;
  padding: 1rem;
  background-color: var(--bng-black-o6);
  border-radius: var(--bng-corners-2);
}

.drag-rules-winner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1em;

  th, td {
    padding: 0.75rem 1rem;
    text-align: center;
    vertical-align: middle;
    border-bottom: 1px solid var(--bng-cool-gray-800);
  }

  tr:last-child td {
    border-bottom: none;
  }

  th {
    color: var(--bng-cool-gray-200);
    font-weight: 800;
    font-size: 0.85em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding-bottom: 0.5rem;
  }

  td {
    color: var(--bng-cool-gray-200);
  }
}

.drag-rules-winner-pill {
  display: inline-block;
  padding: 0.5rem 0.9rem;
  border-radius: var(--bng-corners-1);
  background-color: var(--bng-black-o4);
  color: var(--bng-cool-gray-200);
  border: 1px solid var(--bng-cool-gray-800);
  cursor: pointer;
  font-size: 0.95em;
  font-family: inherit;
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover,
  &:focus-visible {
    background-color: var(--bng-cool-gray-800);
    color: var(--bng-off-white);
    border-color: var(--bng-cool-gray-600);
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--bng-orange-400);
  }

  &.selected {
    background-color: var(--bng-orange-600);
    border-color: var(--bng-orange-500);
    color: var(--bng-off-white);
  }

  &.selected:focus-visible {
    box-shadow: 0 0 0 2px var(--bng-orange-300);
  }
}

.drag-rules-winner-empty {
  color: var(--bng-cool-gray-500);
}

.drag-rules-col-heading {
  flex-shrink: 0;
  margin-top: 0;
  padding: 1rem 0 0 0.5rem;
  font-size: 0.85em;
  align-self: flex-start;

  :deep(.header::before) {
    display: none;
  }
}

.drag-rules-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 0.75rem;
  flex-shrink: 0;
}

.drag-rules-save-dirty {
  box-shadow: 0 0 0 1px var(--bng-amber-500);
  border-radius: var(--bng-corners-1);
}

.drag-rules-message {
  color: var(--bng-cool-gray-300);
  padding: 1rem;
}
</style>
