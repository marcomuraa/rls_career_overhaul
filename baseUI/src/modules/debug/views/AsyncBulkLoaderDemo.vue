<template>
  <div class="async-bulk-loader-demo">
    <section class="header-panel">
      <div class="header-text">
        <h1>Async Bulk Loader Demo</h1>
        <p>
          Compare async cached loading against direct Lua calls for vehicles, missions, and levels.
        </p>
        <p class="extension-state" :class="{ error: !!extensionState.error }">
          Extension: {{ extensionStatusText }}
        </p>
      </div>

      <div class="progress-panel">
        <BngProgressBar
          :value="progress.count"
          :max="progress.total || 1"
          :min="0"
          :indeterminate="progress.inProgress && progress.total <= 0"
          :show-value-label="false"
          header-left="Async progress"
          :header-right="progressLabel" />

        <div class="animation-check" title="Continuous animation for checking UI stalls">
          <span class="spinner"></span>
          <span>Animation check</span>
        </div>
      </div>
    </section>

    <section class="resource-grid">
      <article v-for="section in sections" :key="section.id" class="resource-card">
        <div class="resource-header">
          <div>
            <h2>{{ section.title }}</h2>
            <p>{{ section.description }}</p>
          </div>
          <span class="status" :class="{ loading: section.loading, error: !!section.error }">
            {{ section.error || section.status }}
          </span>
        </div>

        <div class="actions">
          <BngButton :disabled="section.loading" @click="loadAsync(section)">
            Load async
          </BngButton>
          <BngButton :accent="ACCENTS.secondary" :disabled="section.loading" @click="loadDirect(section)">
            Load direct
          </BngButton>
        </div>

        <div class="details">
          <div>Async return: {{ section.lastAsyncReturn || "-" }}</div>
          <div>Loaded: {{ loadedLabel(section) }}</div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive } from "vue"
import { lua } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"
import { useEvents, useStreams } from "@/services/events"
import { BngButton, BngProgressBar, ACCENTS } from "@/common/components/base"

defineOptions({ name: "AsyncBulkLoaderDemo" })

const streamName = "asyncBulkLoaderProgress"

const events = useEvents()

const progress = reactive({
  count: 0,
  total: 0,
  inProgress: false,
})

const extensionState = reactive({
  ready: false,
  loading: false,
  error: "",
  promise: null,
})

const sections = reactive([
  {
    id: "vehicles",
    title: "Vehicles",
    description: "Loads core_vehicles.getModelsData().",
    completeHook: "asyncVehicleLoadComplete",
    asyncAction: () => lua.extensions.util_asyncBulkLoader.loadVehicles(),
    checkAction: () => lua.extensions.util_asyncBulkLoader.isVehiclesLoaded(),
    checkActionName: "isVehiclesLoaded",
    directLua: "util_asyncBulkLoader.loadVehiclesDirect()",
    status: "Idle",
    loading: false,
    error: "",
    loaded: null,
    lastAsyncReturn: "",
  },
  {
    id: "missions",
    title: "Missions",
    description: "Loads gameplay_missions_missions.getAllMissions().",
    completeHook: "asyncMissionLoadComplete",
    asyncAction: () => lua.extensions.util_asyncBulkLoader.loadMissions(),
    checkAction: () => lua.extensions.util_asyncBulkLoader.isMissionsLoaded(),
    checkActionName: "isMissionsLoaded",
    directLua: "util_asyncBulkLoader.loadMissionsDirect()",
    status: "Idle",
    loading: false,
    error: "",
    loaded: null,
    lastAsyncReturn: "",
  },
  {
    id: "gameplaySelector",
    title: "Gameplay Selector",
    description: "Loads core_gameplaySelector.getGameplayData().",
    completeHook: "asyncGameplaySelectorLoadComplete",
    asyncAction: () => lua.extensions.util_asyncBulkLoader.loadGameplaySelector(),
    checkAction: () => lua.extensions.util_asyncBulkLoader.isGameplaySelectorLoaded(),
    checkActionName: "isGameplaySelectorLoaded",
    directLua: "util_asyncBulkLoader.loadGameplaySelectorDirect()",
    status: "Idle",
    loading: false,
    error: "",
    loaded: null,
    lastAsyncReturn: "",
  },
  {
    id: "levels",
    title: "Levels",
    description: "Loads core_levels.getList().",
    completeHook: "asyncLevelLoadComplete",
    asyncAction: () => lua.extensions.util_asyncBulkLoader.loadLevels(),
    checkAction: () => lua.extensions.util_asyncBulkLoader.isLevelsLoaded(),
    checkActionName: "isLevelsLoaded",
    directLua: "util_asyncBulkLoader.loadLevelsDirect()",
    status: "Idle",
    loading: false,
    error: "",
    loaded: null,
    lastAsyncReturn: "",
  },
])

const progressLabel = computed(() => {
  if (!progress.inProgress) return "Idle"
  if (progress.total <= 0) return "Starting..."
  return `${progress.count} / ${progress.total}`
})

const extensionStatusText = computed(() => {
  if (extensionState.error) return extensionState.error
  if (extensionState.ready) return "util_asyncBulkLoader loaded"
  if (extensionState.loading) return "Loading util_asyncBulkLoader..."
  return "Not loaded"
})

useStreams([streamName], streams => {
  if (!Object.prototype.hasOwnProperty.call(streams, streamName)) return
  const payload = streams[streamName] || {}
  progress.count = Number(payload.count) || 0
  progress.total = Number(payload.total) || 0
  progress.inProgress = !!payload.inProgress
})

for (const section of sections) {
  events.on(section.completeHook, () => onAsyncComplete(section))
}

onMounted(() => {
  ensureExtensionLoaded().then(refreshLoadedStates).catch(() => {})
})

async function ensureExtensionLoaded() {
  if (extensionState.ready) return
  if (extensionState.promise) return extensionState.promise

  extensionState.loading = true
  extensionState.error = ""
  extensionState.promise = lua.extensions.load("util_asyncBulkLoader")
    .then(() => {
      extensionState.ready = true
    })
    .catch(error => {
      extensionState.error = `Failed to load extension: ${formatError(error)}`
      throw error
    })
    .finally(() => {
      extensionState.loading = false
      extensionState.promise = null
    })

  return extensionState.promise
}

async function loadAsync(section) {
  resetSectionForLoad(section, "Requesting async load...")
  try {
    await ensureExtensionLoaded()
    const result = await section.asyncAction()
    section.lastAsyncReturn = result || "-"

    if (result === "alreadyLoaded") {
      section.status = "Already loaded"
      await updateLoadedStatus(section)
      return
    }

    section.status = "Async loading..."
  } catch (error) {
    setSectionError(section, error)
  }
}

async function onAsyncComplete(section) {
  if (!section.loading) return
  section.status = "Async complete"
  await updateLoadedStatus(section)
}

async function loadDirect(section) {
  resetSectionForLoad(section, "Direct loading...")
  section.lastAsyncReturn = "-"
  try {
    await ensureExtensionLoaded()
    const loaded = await runRaw(`(function() ${section.directLua}; return util_asyncBulkLoader.${section.checkActionName}() end)()`)
    section.loaded = !!loaded
    section.status = section.loaded ? "Loaded direct" : "Not loaded"
  } catch (error) {
    setSectionError(section, error)
  } finally {
    section.loading = false
  }
}

async function updateLoadedStatus(section) {
  try {
    await ensureExtensionLoaded()
    section.loaded = !!(await section.checkAction())
    section.status = section.loaded ? "Loaded" : "Not loaded"
  } catch (error) {
    setSectionError(section, error)
  } finally {
    section.loading = false
  }
}

function resetSectionForLoad(section, status) {
  section.loading = true
  section.error = ""
  section.status = status
}

function setSectionError(section, error) {
  section.error = formatError(error)
  section.status = "Error"
  section.loading = false
}

async function refreshLoadedStates() {
  for (const section of sections) {
    try {
      section.loaded = !!(await section.checkAction())
    } catch {
      section.loaded = null
    }
  }
}

function loadedLabel(section) {
  if (section.loaded === null) return "Unknown"
  return section.loaded ? "✓ Loaded" : "Not loaded"
}

function formatError(error) {
  return error?.message || String(error)
}
</script>

<style lang="scss" scoped>
.async-bulk-loader-demo {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  overflow: auto;
  color: var(--bng-off-white);
  background: var(--bng-cool-gray-900);
}

.header-panel,
.resource-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--bng-cool-gray-800);
}

.header-panel {
  align-items: stretch;
  justify-content: space-between;
}

.header-text,
.progress-panel,
.resource-card {
  flex-direction: column;
}

.header-text,
.progress-panel {
  display: flex;
  gap: 0.75rem;
}

.header-text {
  flex: 1 1 auto;
}

.header-text h1,
.resource-header h2 {
  padding: 0;
  margin: 0;
}

.header-text p,
.resource-header p {
  padding: 0;
  margin: 0;
  color: var(--bng-cool-gray-200);
}

.extension-state {
  font-family: var(--fnt-mono);
}

.extension-state.error,
.status.error {
  color: var(--bng-add-red-300);
}

.progress-panel {
  flex: 0 0 24rem;
}

.animation-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--fnt-mono);
  color: var(--bng-cool-gray-100);
}

.spinner {
  width: 1.8rem;
  height: 1.8rem;
  border: 0.25rem solid var(--bng-cool-gray-600);
  border-top-color: var(--bng-orange);
  border-radius: 50%;
  animation: async-bulk-loader-spin 0.8s linear infinite;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
  gap: 1rem;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.status {
  align-self: flex-start;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-family: var(--fnt-mono);
  white-space: nowrap;
  background: var(--bng-cool-gray-700);
}

.status.loading {
  color: var(--bng-orange);
}

.actions,
.details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.details {
  font-family: var(--fnt-mono);
  color: var(--bng-cool-gray-100);
}

@keyframes async-bulk-loader-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
