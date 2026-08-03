<template>
  <div class="apps-test">
    <header class="apps-test-header">
      <h2>UI Apps Performance Test</h2>
      <div class="controls">
        <BngButton :disabled="isRunning" :accent="ACCENTS.text" :icon-left="icons.xmark" @click="resetFilters" />
        <BngInput
          v-model="filterText"
          placeholder="Filter by name..."
          :disabled="isRunning"
          :show-external-button="false"
        />
        <BngDropdown
          v-model="typeFilter"
          :disabled="isRunning"
          :items="typeFilterItems"
          class="type-select"
        />
        <BngInput
          v-model="settleTimeSec"
          v-bng-tooltip:top="'The amount of time in milliseconds to let the app(s) run before destroying and proceeding to the next app to test.'"
          type="number"
          :min="CONFIG.settleTime.min"
          :max="CONFIG.settleTime.max"
          :step="CONFIG.settleTime.step"
          :disabled="isRunning"
          :show-external-button="false"
          label="Settle (s)"
        />
        <BngInput
          v-model="instanceCount"
          v-bng-tooltip:top="'The amount of instances to spawn when testing the app.'"
          type="number"
          :min="CONFIG.instances.min"
          :max="CONFIG.instances.max"
          :step="CONFIG.instances.step"
          :disabled="isRunning"
          :show-external-button="false"
          label="Instances"
        />
        <BngButton v-if="!isRunning" :disabled="hasInvalidInputs" :accent="ACCENTS.main" @click="handleRunAll">Run All</BngButton>
        <BngButton v-else :accent="ACCENTS.attention" @click="handleStop">Stop</BngButton>
      </div>
    </header>

    <div class="progress-bar-container">
      <div class="progress-label">
        <template v-if="isRunning">
          Testing {{ progress.current }} / {{ progress.total }}
          <span v-if="instanceCount > 1">(x{{ instanceCount }})</span>
          &mdash; {{ progress.currentApp }}
          <span v-if="progress.settleTotal > 0" class="settle-countdown">
            &mdash; settling {{ (progress.settleElapsed / 1000).toFixed(1) }}s / {{ (progress.settleTotal / 1000).toFixed(1) }}s
          </span>
          <span v-if="progress.mockDataName" class="mock-data-label">
            &mdash; mock: {{ progress.mockDataName }}
          </span>
        </template>
        <template v-else>&nbsp;</template>
      </div>
      <div v-if="isRunning" class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div v-else class="progress-track-placeholder"></div>
    </div>

    <div ref="spawnContainer" class="spawn-container"></div>

    <div v-if="results.length > 0" class="results-section">
      <div class="summary">
        <span>Total: {{ results.length }}</span>
        <span>OK: {{ countByStatus("ok") }}</span>
        <span class="slow">Slow: {{ countByStatus("slow") }}</span>
        <span class="warnings">Warn: {{ appsWithWarnings }}</span>
        <span class="errors">Errors: {{ appsWithErrors }}</span>
        <span>Avg spawn: {{ avgSpawnTime }} ms</span>
      </div>
      <div class="table-scroll">
        <table class="results-table">
          <thead>
            <tr>
              <th class="expand-col"></th>
              <th>App Name</th>
              <th>Type</th>
              <th>Instances</th>
              <th>Spawn (ms)</th>
              <!-- <th>Paint (ms)</th> -->
              <th>Settle Perf</th>
              <th>Destroy (ms)</th>
              <th>Errors</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in results" :key="r.appName">
              <tr :class="'row-' + r.status">
                <td class="expand-cell" @click="isRowExpandable(r) && toggleRow(r.appName)">
                  <BngIcon
                    v-if="isRowExpandable(r)"
                    :type="icons.arrowSmallRight"
                    class="expand-arrow"
                    :class="{ expanded: expandedRows.has(r.appName) }"
                  />
                </td>
                <td>{{ r.appName }}</td>
                <td>{{ r.isVue ? "vue" : "angular" }}</td>
                <td>{{ r.instanceCount }}</td>
                <td>{{ r.instances ? `${r.spawnTime} (avg ${r.avgSpawnTime}, min ${r.minSpawnTime}, max ${r.maxSpawnTime})` : r.spawnTime }}</td>
                <!-- <td>{{ r.paintTime }}</td> -->
                <td>{{ settlePerfSummary(r.settlePerf) }}</td>
                <td>{{ r.instances ? `${r.destroyTime} (avg ${r.avgDestroyTime}, min ${r.minDestroyTime}, max ${r.maxDestroyTime})` : r.destroyTime }}</td>
                <td>{{ r.errors.length > 0 ? errorSummary(r.errors) : "-" }}</td>
                <td class="status-cell">{{ r.status }}</td>
                <td>
                  <BngButton :disabled="isRunning || hasInvalidInputs" :accent="ACCENTS.secondary" @click="handleRetest(r.appName)">Retest</BngButton>
                </td>
              </tr>
              <!-- Single-instance: expand shows error messages directly -->
              <tr v-if="!r.instances && expandedRows.has(r.appName)" class="detail-row" :class="'row-' + r.status">
                <td :colspan="10">
                  <ul class="msg-list">
                    <li v-for="(e, i) in r.errors" :key="i" :class="isErrorSource(e.source) ? 'error-entry' : 'warn-entry'">
                      <span class="msg-source">[{{ e.source }}]</span> {{ e.message }}
                    </li>
                  </ul>
                </td>
              </tr>
              <!-- Multi-instance: expand shows per-instance sub-rows + shared errors at the bottom -->
              <template v-if="r.instances && expandedRows.has(r.appName)">
                <tr v-for="inst in r.instances" :key="`${r.appName}-${inst.index}`" class="instance-row">
                  <td></td>
                  <td class="instance-label">#{{ inst.index + 1 }}</td>
                  <td></td>
                  <td></td>
                  <td>{{ inst.spawnTime }}</td>
                  <td></td>
                  <td>{{ inst.destroyTime }}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr v-if="r.errors.length > 0" class="detail-row" :class="'row-' + r.status">
                  <td :colspan="10">
                    <ul class="msg-list">
                      <li v-for="(e, ei) in r.errors" :key="ei" :class="isErrorSource(e.source) ? 'error-entry' : 'warn-entry'">
                        <span class="msg-source">[{{ e.source }}]</span> {{ e.message }}
                      </li>
                    </ul>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue"
import { BngInput, BngDropdown, BngButton, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"
import { runAllTests, runSingleTest } from "../testRunner"
import { getAppList } from "../appSpawner"

const CONFIG = {
  settleTime: { min: 0, max: 1000, step: 0.1, default: 1.0 },
  instances: { min: 1, max: 1000, step: 1, default: 1 },
}

const spawnContainer = ref(null)
const results = ref([])
const isRunning = ref(false)
const abortController = ref(null)
const filterText = ref("")
const typeFilter = ref("all")
const settleTimeSec = ref(CONFIG.settleTime.default)
const instanceCount = ref(CONFIG.instances.default)
const typeFilterItems = [
  { label: "All", value: "all" },
  { label: "Vue only", value: "vue" },
  { label: "Angular only", value: "angular" },
]

const hasInvalidInputs = computed(() =>
  settleTimeSec.value < CONFIG.settleTime.min || settleTimeSec.value > CONFIG.settleTime.max ||
  instanceCount.value < CONFIG.instances.min || instanceCount.value > CONFIG.instances.max
)

const expandedRows = ref(new Set())

function toggleRow(appName) {
  const next = new Set(expandedRows.value)
  if (next.has(appName)) next.delete(appName)
  else next.add(appName)
  expandedRows.value = next
}

function isRowExpandable(r) {
  return r.instances ? true : r.errors.length > 0
}

function resetFilters() {
  filterText.value = ""
  typeFilter.value = "all"
  settleTimeSec.value = CONFIG.settleTime.default
  instanceCount.value = CONFIG.instances.default
}

const progress = reactive({
  current: 0,
  total: 0,
  currentApp: "",
  settleElapsed: 0,
  settleTotal: 0,
  mockDataName: "",
})

const progressPercent = computed(() => {
  if (progress.total === 0) return 0
  return Math.round((progress.current / progress.total) * 100)
})

const avgSpawnTime = computed(() => {
  if (results.value.length === 0) return 0
  const sum = results.value.reduce((s, r) => s + r.spawnTime, 0)
  return Math.round((sum / results.value.length) * 100) / 100
})

function countByStatus(status) {
  return results.value.filter(r => r.status === status).length
}

const ERROR_SOURCES = ["console.error", "window.error", "unhandledrejection"]

const appsWithErrors = computed(() =>
  results.value.filter(r => r.errors.some(e => ERROR_SOURCES.includes(e.source))).length
)

const appsWithWarnings = computed(() =>
  results.value.filter(r => r.errors.some(e => e.source === "console.warn")).length
)

function isErrorSource(source) {
  return ERROR_SOURCES.includes(source)
}

function errorSummary(entries) {
  const errCount = entries.filter(e => isErrorSource(e.source)).length
  const warnCount = entries.length - errCount
  const parts = []
  if (errCount > 0) parts.push(`${errCount} error${errCount > 1 ? "s" : ""}`)
  if (warnCount > 0) parts.push(`${warnCount} warning${warnCount > 1 ? "s" : ""}`)
  return parts.join(", ")
}

function settlePerfSummary(sp) {
  if (!sp || sp.frameCount === 0) return "-"
  return `${sp.frameCount}f, avg ${sp.avgFrameTime}ms, max ${sp.maxFrameTime}ms`
}

function buildFilter() {
  const parts = []
  if (filterText.value) parts.push(filterText.value)
  return parts.length > 0 ? parts.join(" ") : undefined
}

function handleStop() {
  abortController.value?.abort()
}

async function handleRunAll() {
  if (!spawnContainer.value) return
  isRunning.value = true
  results.value = []
  abortController.value = new AbortController()

  let appList = getAppList()
  const tf = typeFilter.value
  if (tf === "vue") appList = appList.filter(a => a.isVue)
  else if (tf === "angular") appList = appList.filter(a => !a.isVue)

  try {
    const res = await runAllTests({
      hostElement: spawnContainer.value,
      filter: buildFilter(),
      settleTimeMs: Math.round(settleTimeSec.value * 1000),
      instanceCount: instanceCount.value,
      appList,
      abortSignal: abortController.value.signal,
      onProgress(p) {
        progress.current = p.current
        progress.total = p.total
        progress.currentApp = p.currentApp
        if (p.phase === "spawning") {
          progress.settleElapsed = 0
          progress.settleTotal = 0
          progress.mockDataName = ""
        }
        if (p.lastResult) {
          results.value = [...results.value, p.lastResult]
        }
      },
      onSettle({ elapsed, total, mockDataName }) {
        progress.settleElapsed = elapsed
        progress.settleTotal = total
        progress.mockDataName = mockDataName || ""
      },
    })
    results.value = res
  } finally {
    abortController.value = null
    progress.current = 0
    progress.total = 0
    progress.currentApp = ""
    progress.settleElapsed = 0
    progress.settleTotal = 0
    progress.mockDataName = ""
    isRunning.value = false
  }
}

async function handleRetest(appName) {
  if (!spawnContainer.value) return
  const apps = getAppList()
  const appData = apps.find(a => a.appName === appName)
  if (!appData) return

  isRunning.value = true
  progress.current = 1
  progress.total = 1
  progress.currentApp = appName
  progress.settleElapsed = 0
  progress.settleTotal = 0
  progress.mockDataName = ""

  try {
    const result = await runSingleTest(
      appData,
      spawnContainer.value,
      Math.round(settleTimeSec.value * 1000),
      ({ elapsed, total, mockDataName }) => {
        progress.settleElapsed = elapsed
        progress.settleTotal = total
        progress.mockDataName = mockDataName || ""
      },
      null,
      instanceCount.value
    )
    const idx = results.value.findIndex(r => r.appName === appName)
    if (idx >= 0) {
      const updated = [...results.value]
      updated[idx] = result
      results.value = updated
    }
  } finally {
    progress.current = 0
    progress.total = 0
    progress.currentApp = ""
    progress.settleElapsed = 0
    progress.settleTotal = 0
    progress.mockDataName = ""
    isRunning.value = false
  }
}
</script>

<style lang="scss" scoped>
.apps-test {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bng-cool-gray-900);
  color: var(--bng-off-white);
  padding: 1.5rem;
  overflow: hidden;
  font-family: var(--fnt-defs);
}

.apps-test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.4rem;
  }
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.settle-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--bng-cool-gray-200);
  white-space: nowrap;
}

.settle-input {
  width: 3.5rem;
  background: var(--bng-cool-gray-800);
  color: var(--bng-off-white);
  border: 1px solid var(--bng-cool-gray-600);
  border-radius: 4px;
  padding: 0.35rem 0.4rem;
  font-size: 0.85rem;
  text-align: center;
}

.btn-run {
  background: var(--bng-orange-b400);
  color: var(--bng-cool-gray-900);
  border: none;
  border-radius: 4px;
  padding: 0.4rem 1rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0;
}

.progress-label {
  font-size: 0.85rem;
  color: var(--bng-cool-gray-200);

  .settle-countdown {
    color: var(--bng-cool-gray-400);
  }

  .mock-data-label {
    color: var(--bng-add-green-400);
  }
}

.progress-track {
  height: 6px;
  background: var(--bng-cool-gray-700);
  border-radius: 3px;
  overflow: hidden;
}

.progress-track-placeholder {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: var(--bng-orange-b400);
  transition: width 0.15s ease;
}

.spawn-container {
  width: 320px;
  height: 320px;
  position: relative;
  overflow: hidden;
  background: var(--bng-cool-gray-700);
  border: 1px dashed var(--bng-cool-gray-600);
  border-radius: 4px;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 9999;
    pointer-events: all;
  }
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.summary {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  padding: 0.5rem 0;

  .slow {
    color: var(--bng-add-yellow-400);
  }
  .warnings {
    color: var(--bng-orange-b400);
  }
  .errors {
    color: var(--bng-add-red-400);
  }
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th, td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--bng-cool-gray-800);
  }

  th {
    color: var(--bng-cool-gray-300);
    font-weight: 600;
    position: sticky;
    top: 0;
    background: var(--bng-cool-gray-900);
  }

  .row-ok {
    .status-cell { color: var(--bng-add-green-400); }
  }
  .row-slow {
    background: var(--bng-add-yellow-900);
    .status-cell { color: var(--bng-add-yellow-400); }
  }
  .row-warn {
    background: var(--bng-orange-900);
    .status-cell { color: var(--bng-orange-b400); }
  }
  .row-error {
    background: var(--bng-add-red-900);
    .status-cell { color: var(--bng-add-red-400); }
  }
}

.expand-col {
  width: 2rem;
}

.expand-cell {
  width: 2rem;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.expand-arrow {
  display: inline-block;
  font-size: 1rem;
  transition: transform 0.2s ease;

  &.expanded {
    transform: rotate(90deg);
  }
}

.detail-row td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--bng-cool-gray-700);
}

.instance-row {
  .instance-label {
    padding-left: 2rem;
    font-weight: 600;
    opacity: 0.8;
  }
}

.msg-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  font-size: 0.75rem;
  max-height: 10rem;
  overflow-y: auto;

  li {
    padding: 0.15rem 0;
    word-break: break-word;
  }
}

.msg-source {
  opacity: 0.6;
  font-size: 0.7rem;
}

.error-entry {
  color: var(--bng-add-red-b400);
}

.warn-entry {
  color: var(--bng-orange-b400);
}

.btn-retest {
  background: var(--bng-cool-gray-700);
  color: var(--bng-off-white);
  border: none;
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
