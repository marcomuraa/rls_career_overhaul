<template>
  <div v-show="visible" class="rt-rollup">
    <div class="rt-row rt-head">
      <span class="rt-title">
        Runtime <span class="green">{{ count }}</span>
        <span
          v-if="hits"
          class="amber"
          @mouseenter="tooltip.showTooltip($event.currentTarget, `${hits} modules served from the cache`)"
          @mouseleave="tooltip.hideTooltip"
        >+{{ hits }}c</span>
        <span
          class="muted"
          @mouseenter="tooltip.showTooltip($event.currentTarget, `Total cache build time (cumulative compile of ${built} modules)`)"
          @mouseleave="tooltip.hideTooltip"
        >&nbsp;{{ Math.round(buildMs) }}ms</span>
      </span>
      <button
        class="rt-vue-mode"
        :class="dev ? 'green' : 'amber'"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        @mouseenter="tooltip.showTooltip($event.currentTarget, dev ? 'Vue dev build with full hot reload (HMR). Click to switch to prod and reload.' : 'Vue prod build, full reload on change most of the time. Click to switch to dev/HMR and reload.')"
        @mouseleave="tooltip.hideTooltip"
        @click.stop="toggleVueMode"
      >Vue: {{ dev ? "Dev" : "Prod" }}</button>
      <label
        class="rt-chk"
        @mouseenter="tooltip.showTooltip($event.currentTarget, 'When off, a change that needs a full reload won\'t reload; the UI freezes and asks you to press F5 instead.')"
        @mouseleave="tooltip.hideTooltip"
      >
        <input
          type="checkbox"
          :checked="allowReload"
          bng-no-nav="true"
          tabindex="-1"
          @change.stop="setAllowReload($event.target.checked)"
        >
        allow full reload
      </label>
      <button
        v-if="cacheEnabled"
        class="rt-drop"
        :disabled="!cacheCount"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        @mouseenter="tooltip.showTooltip($event.currentTarget, cacheCount ? `Wipe the compile cache (${cacheCount} entries). Next change/boot recompiles from source.` : 'Cache is empty')"
        @mouseleave="tooltip.hideTooltip"
        @click.stop="dropCache"
      >drop cache</button>
      <span class="rt-foot-note" :class="done ? 'green' : 'amber'">{{ done ? "done" : "loading" }}</span>
    </div>

    <div
      v-if="!done || stage"
      class="rt-stage"
      @mouseenter="stage && tooltip.showTooltip($event.currentTarget, stage)"
      @mouseleave="tooltip.hideTooltip"
    >{{ stage || "idle" }}</div>

    <div class="rt-row rt-now">
      <span class="rt-now-label">now</span>
      <span v-if="inflight.length" class="rt-now-list">
        <span
          v-for="f in inflight"
          :key="f.path"
          class="rt-now-item"
          @mouseenter="tooltip.showTooltip($event.currentTarget, f.path)"
          @mouseleave="tooltip.hideTooltip"
        >{{ basename(f.path) }}</span>
      </span>
      <span v-else class="rt-empty">idle</span>
    </div>

    <div class="rt-split">
      <div class="rt-col">
        <div class="rt-row rt-col-head">
          <span class="rt-col-title">files</span>
          <button
            class="rt-sort"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            @mouseenter="tooltip.showTooltip($event.currentTarget, `Sort: ${sortMode}`)"
            @mouseleave="tooltip.hideTooltip"
            @click.stop="toggleSort"
          >{{ sortMode }}</button>
        </div>
        <div class="rt-list">
          <div v-if="!displayedFiles.length" class="rt-empty">No files loaded</div>
          <div
            v-for="f in displayedFiles"
            :key="f.path + ':' + f.n"
            class="rt-item"
            @mouseenter="tooltip.showTooltip($event.currentTarget, f.path)"
            @mouseleave="tooltip.hideTooltip"
          >
            <span class="rt-idx">{{ f.n }}</span>
            <span class="rt-name" :class="{ red: !f.ok }">{{ basename(f.path) }}</span>
            <span class="rt-ms" :class="msClass(f.ms)">{{ Math.round(f.ms) }}</span>
            <button
              class="rt-reload"
              bng-no-nav="true"
              tabindex="-1"
              type="button"
              @mouseenter="tooltip.showTooltip($event.currentTarget, 'Bump this file\'s revision and reloading it (Might trigger full UI reload)')"
              @mouseleave="tooltip.hideTooltip"
              @click.stop="reloadOne(f.path)"
            >⟳</button>
          </div>
        </div>
      </div>

      <div class="rt-col">
        <div class="rt-row rt-col-head">
          <span class="rt-col-title">dirs</span>
        </div>
        <div class="rt-list">
          <div v-if="!dirStats.length" class="rt-empty">No files loaded</div>
          <div
            v-for="d in dirStats"
            :key="d.dir"
            class="rt-item"
            @mouseenter="tooltip.showTooltip($event.currentTarget, d.dir)"
            @mouseleave="tooltip.hideTooltip"
          >
            <span class="rt-name">{{ d.dir }}</span>
            <span class="rt-cnt">{{ d.count }}</span>
            <span class="rt-ms" :class="msClass(d.ms / d.count)">{{ Math.round(d.ms) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, provide, ref } from "vue"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const IE_TOOLTIP = "IEPanelTooltip"
const SORT_MODES = ["recent", "slowest"]

const visible = ref(false)
const sortMode = ref("recent")
const count = ref(0)
const hits = ref(0)
const built = ref(0)
const buildMs = ref(0)
const loadingCount = ref(0)
const done = ref(false)
const stage = ref("")
const inflight = ref([])
const files = ref([])
let seenFiles = 0
let timer = 0

const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)
const tooltip = inject(IE_TOOLTIP, { showTooltip() {}, hideTooltip() {} })

const basename = path => String(path || "").split("/").pop() || path
const msClass = ms => (ms >= 200 ? "red" : ms >= 50 ? "amber" : "muted")

// reflects which runtime bundle is actually live, not just the stored preference
const dev = !!window.bngRuntime?.dev
// const hmr = !!window.bngRuntime?.hmr

// warm cache is only on in dev (RT_DEV); hide the drop-cache button when there's nothing to drop
const cacheEnabled = !!window.bngRuntime?.cacheEnabled
const cacheCount = ref(0)
const allowReload = ref(window.bngRuntime?.allowReload !== false)

function dropCache() {
  window.bngRuntime?.dropCache?.()
  cacheCount.value = 0 // clear() empties mem synchronously; reflect it now instead of next tick
}

function setAllowReload(value) {
  allowReload.value = value
  window.bngRuntime && (window.bngRuntime.allowReload = value)
  // re-enabling while a reload was already deferred: honour it now and clear the banner
  if (value && window.bngRuntime?.reloadNeeded) location.reload()
}

// flip the session flag and reload so resourceLoader picks runtime.dev.js / runtime.js.
// requires the matching bundle to be built (npm run build:runtime / build:runtime:dev).
function toggleVueMode() {
  try {
    sessionStorage.setItem("bngRtVueMode", dev ? "prod" : "hmr")
  } catch {}
  location.reload()
}

// group by the first 3 segments from "src" (e.g. src/modules/career), so it's obvious
// which folders dominate load time and might be worth bundling into the runtime.
function dirKey(path) {
  const segs = String(path || "").split("/").filter(Boolean)
  segs.pop()
  const si = segs.indexOf("src")
  const rel = si >= 0 ? segs.slice(si) : segs.slice(-2)
  return rel.slice(0, 3).join("/") || "(root)"
}

const displayedFiles = computed(() => {
  const list = files.value
  if (sortMode.value === "slowest") return [...list].sort((a, b) => b.ms - a.ms)
  return [...list].reverse()
})

const dirStats = computed(() => {
  const byDir = new Map()
  for (const f of files.value) {
    const key = dirKey(f.path)
    let entry = byDir.get(key)
    if (!entry) byDir.set(key, (entry = { dir: key, count: 0, ms: 0 }))
    entry.count++
    entry.ms += f.ms
  }
  return [...byDir.values()].sort((a, b) => b.ms - a.ms)
})

function tick() {
  const s = window.bngRuntimeStats
  if (!s) return
  count.value = s.count
  hits.value = s.hits || 0
  built.value = s.built || 0
  buildMs.value = s.buildMs || 0
  done.value = s.done
  loadingCount.value = s.inflight.length
  if (!visible.value) return
  if (cacheEnabled) cacheCount.value = window.bngRuntime?.cacheSize?.() || 0
  stage.value = s.stage || ""
  inflight.value = s.inflight.slice(0, 8)
  // keep file/dir derivations cheap: only re-copy when the loader added entries
  if (s.files.length !== seenFiles) {
    seenFiles = s.files.length
    files.value = s.files.map((f, n) => ({ ...f, n: n + 1 }))
  }
}

function reloadOne(path) {
  window.bngRuntime?.reload(path)
}

function toggleSort() {
  sortMode.value = SORT_MODES[(SORT_MODES.indexOf(sortMode.value) + 1) % SORT_MODES.length]
}

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("runtime")
  visible.value = nextVisible
  if (nextVisible) tick()
}

function togglePanel() {
  setVisible(!visible.value)
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "runtime",
  order: 5,
  tooltip: computed(() => `Runtime loader: ${count.value} files, ${done.value ? "done" : "loading"}`),
  parts: computed(() => [
    { text: __BNG_DEV__ ? "RT-DEV " : "RT " },
    { text: count.value, class: "green" },
    { text: " + " },
    { text: loadingCount.value, class: "red" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || !done.value),
  onClick: togglePanel,
  close: () => setVisible(false),
})

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 300)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  unregisterPanelButton?.()
})
</script>

<style lang="scss" scoped>
.rt-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.rt-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.rt-head {
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.rt-title {
  flex: 0 0 auto;
  font-weight: 700;
  font-size: 0.8rem;
}

.rt-vue-mode {
  flex: 0 0 auto;
  border: 1px solid var(--bng-cool-gray-500);
  background: rgba(255, 255, 255, 0.04);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0 0.3rem;
  cursor: pointer;
  font-size: 0.7rem;
}

.rt-foot-note {
  flex: 1 1 auto;
  text-align: right;
  font-size: 0.74rem;
}

.rt-ctrls {
  gap: 0.5rem;
  font-size: 0.72rem;
}

.rt-chk {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--bng-cool-gray-200);
  cursor: pointer;

  input {
    margin: 0;
    cursor: pointer;
  }
}

.rt-drop {
  flex: 0 0 auto;
  border: 1px solid var(--bng-cool-gray-500);
  background: rgba(255, 255, 255, 0.04);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0 0.3rem;
  cursor: pointer;
  font-size: 0.7rem;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.rt-stage {
  color: var(--bng-cool-gray-300);
  font-size: 0.72rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rt-now-label {
  flex: 0 0 auto;
  color: var(--bng-cool-gray-300);
  font-size: 0.74rem;
}

.rt-now-list {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  gap: 0.3rem;
  overflow: hidden;
  white-space: nowrap;
}

.rt-now-item {
  flex: 0 0 auto;
  color: var(--bng-orange-b300);
  font-size: 0.72rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rt-split {
  display: flex;
  gap: 0.5rem;
}

.rt-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.rt-col-head {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.rt-col-title {
  flex: 1 1 auto;
  color: var(--bng-add-indigoblue-300);
  font-size: 0.72rem;
  font-weight: 700;
}

.rt-sort {
  flex: 0 0 auto;
  border: 1px solid var(--bng-cool-gray-500);
  background: rgba(255, 255, 255, 0.04);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0 0.3rem;
  cursor: pointer;
  font-size: 0.7rem;
}

.rt-list {
  display: flex;
  flex-direction: column;
  max-height: 11rem;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: var(--fnt-mono);
}

.rt-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.02rem 0.15rem;
  border-radius: var(--bng-corners-1);
  font-size: 0.72rem;
  line-height: 1.3;
}

.rt-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.rt-idx {
  flex: 0 0 2.2rem;
  text-align: right;
  color: var(--bng-cool-gray-400);
  font-variant-numeric: tabular-nums;
}

.rt-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rt-cnt {
  flex: 0 0 2.2rem;
  text-align: right;
  color: var(--bng-cool-gray-300);
  font-variant-numeric: tabular-nums;
}

.rt-ms {
  flex: 0 0 2.6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rt-reload {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0 0.25rem;
  cursor: pointer;
  font-size: 0.72rem;
}

.rt-empty {
  color: var(--bng-cool-gray-400);
  font-size: 0.74rem;
  font-style: italic;
}

.green {
  color: var(--bng-add-green-300);
}

.red {
  color: var(--bng-add-red-300);
}

.amber {
  color: var(--bng-orange-b300);
}

.muted {
  color: var(--bng-cool-gray-300);
}
</style>
