<template>
  <div v-show="visible" class="mods-rollup">
    <div class="mods-row mods-head">
      <span class="mods-title">Mods <span class="green">{{ activeModCount }}</span> / {{ modTree.length }} · Apps <span class="green">{{ activeAppCount }}</span></span>
      <span class="mods-foot-note">Active styles: {{ activeStyleCount }}</span>
      <button
        class="mods-reload-all"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        :disabled="modsReloadingAll"
        title="Reload all mods and UI apps"
        @click.stop="reloadAll"
      >{{ modsReloadingAll ? "Reloading…" : "⟳ Reload all" }}</button>
    </div>

    <div class="mods-section-label">Mods</div>
    <div class="mods-list">
      <div v-if="!modTree.length" class="mods-empty">No mods loaded</div>
      <div
        v-for="mod in modTree"
        :key="mod.name"
        class="mods-item-wrap"
      >
        <div class="mods-item" :class="{ active: mod.shown, error: !!mod.error }">
          <span class="mods-status" :class="{ on: mod.shown }"></span>
          <button
            class="mods-caret"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            @click.stop="toggleModFiles(mod.name)"
          >{{ expandedMods[mod.name] ? "▾" : "▸" }} {{ mod.name }}</button>
          <span class="mods-chips">
            <span class="mods-chip">slots {{ mod.slots.length }}</span>
            <span v-if="mod.error" class="mods-chip red" :title="mod.error">error</span>
          </span>
          <button
            class="mods-reload"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            :disabled="mod.reloading"
            title="Reload this mod"
            @click.stop="reloadMod(mod)"
          >{{ mod.reloading ? "…" : "⟳" }}</button>
        </div>
        <div v-if="expandedMods[mod.name]" class="mods-files">
          <div v-if="!mod.slots.length && !mod.orphanFiles.length" class="mods-file mods-file-empty">No slots</div>
          <div v-for="slot in mod.slots" :key="slot.name" class="mods-subwrap">
            <button
              class="mods-caret mods-subcaret"
              bng-no-nav="true"
              tabindex="-1"
              type="button"
              @click.stop="toggleModSlot(mod.name, slot.name)"
            >
              {{ expandedModSlots[`${mod.name}::${slot.name}`] ? "▾" : "▸" }} {{ slot.name }}
              <span class="mods-chips">
                <span class="mods-chip" :class="{ green: slot.shown }">{{ slot.shown ? "shown" : "hidden" }}</span>
                <span class="mods-chip" :class="{ green: slot.instances > 0 }">inst {{ slot.instances }}</span>
                <span class="mods-chip">files {{ slot.files.length }}</span>
              </span>
            </button>
            <div v-if="expandedModSlots[`${mod.name}::${slot.name}`]" class="mods-files">
              <div v-if="!slot.files.length" class="mods-file mods-file-empty">No files loaded</div>
              <div v-for="file in slot.files" :key="file" class="mods-file" :title="file">{{ shortFile(file) }}</div>
            </div>
          </div>
          <div v-if="mod.orphanFiles.length" class="mods-subwrap">
            <button
              class="mods-caret mods-subcaret"
              bng-no-nav="true"
              tabindex="-1"
              type="button"
              @click.stop="toggleModSlot(mod.name, '__noslot')"
            >
              {{ expandedModSlots[`${mod.name}::__noslot`] ? "▾" : "▸" }} (no slot)
              <span class="mods-chips">
                <span class="mods-chip">files {{ mod.orphanFiles.length }}</span>
              </span>
            </button>
            <div v-if="expandedModSlots[`${mod.name}::__noslot`]" class="mods-files">
              <div v-for="file in mod.orphanFiles" :key="file" class="mods-file" :title="file">{{ shortFile(file) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mods-section-label">UI Apps <span class="mods-foot-note">(active in current layout)</span></div>
    <div class="mods-list">
      <div v-if="!appList.length" class="mods-empty">No active UI apps</div>
      <div
        v-for="app in appList"
        :key="app.key"
        class="mods-item-wrap"
      >
        <div class="mods-item active">
          <span class="mods-status on"></span>
          <button
            class="mods-caret"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            :title="`${app.name}\n${app.file || app.key}`"
            @click.stop="toggleAppFiles(app.key)"
          >{{ expandedApps[app.key] ? "▾" : "▸" }} {{ app.id }}</button>
          <span class="mods-chips">
            <span class="mods-chip" :class="app.renderer === 'vue' ? 'green' : 'red'">{{ app.renderer }}</span>
            <span class="mods-chip" :class="{ green: app.instances > 0 }">inst {{ app.instances }}</span>
            <span class="mods-chip" :title="app.files.join('\n')">files {{ app.files.length }}</span>
            <span class="mods-chip" :title="app.styleIds.join(', ')">styles {{ app.styleIds.length }}</span>
          </span>
          <button
            class="mods-reload"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            :disabled="!app.reloadable"
            :title="app.reloadable ? 'Reload this app' : 'Reload not available for this renderer'"
            @click.stop="reloadApp(app)"
          >⟳</button>
        </div>
        <div v-if="expandedApps[app.key]" class="mods-files">
          <div v-if="!app.files.length" class="mods-file mods-file-empty">No files loaded</div>
          <div v-for="file in app.files" :key="file" class="mods-file" :title="file">{{ shortFile(file) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onUnmounted, provide, ref, unref } from "vue"
import { useModManager } from "@/services/modManager"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const modManager = useModManager()
const appLayouts = useAppLayoutsStore()
const visible = ref(false)
const modReloading = ref({})
const modsReloadingAll = ref(false)
const expandedMods = ref({})
const expandedModSlots = ref({})
const expandedApps = ref({})
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("mods")
  visible.value = nextVisible
}

function togglePanel() {
  setVisible(!visible.value)
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "mods",
  order: 20,
  tooltip: "Toggle mods & UI apps panel",
  label: computed(() => `Mods ${activeModCount.value} · Apps ${activeAppCount.value}`),
  parts: computed(() => [
    { text: "Mods " },
    { text: activeModCount.value, class: "green" },
    { text: " · Apps " },
    { text: activeAppCount.value, class: "green" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || activeModCount.value > 0 || activeAppCount.value > 0),
  onClick: togglePanel,
  close: () => setVisible(false),
})

// mods grouped by folder -> slots they target -> files loaded for that slot
const modTree = computed(() => {
  const byMod = new Map()
  for (const entry of modManager.modList || []) {
    const modName = entry.mod || entry.name || entry.filepath
    if (!byMod.has(modName)) byMod.set(modName, [])
    byMod.get(modName).push(entry)
  }
  const result = []
  for (const [modName, entries] of byMod) {
    const filepaths = []
    const allFiles = new Set()
    const covered = new Set()
    const slotMap = new Map()
    let error = ""
    for (const entry of entries) {
      filepaths.push(entry.filepath)
      allFiles.add(entry.filepath)
      const data = entry.data || {}
      if (data.error && !error) error = data.error
      const slots = entry.uiSlots || []
      if (!slots.length) continue
      covered.add(entry.filepath)
      for (const slotName of slots) {
        if (!slotMap.has(slotName)) slotMap.set(slotName, new Set())
        const fileSet = slotMap.get(slotName)
        for (const file of data.files || []) {
          fileSet.add(file)
          covered.add(file)
        }
      }
    }
    let shown = false
    const slots = []
    for (const [slotName, fileSet] of slotMap) {
      const slotState = modManager.uiSlots?.[slotName]
      const slotShown = !!unref(slotState?.shown)
      if (slotShown) shown = true
      slots.push({
        name: slotName,
        shown: slotShown,
        instances: slotState?.instances?.length || 0,
        files: [...fileSet],
      })
    }
    // files of the folder that aren't loaded through any slot (e.g. images, unused components)
    const orphanFiles = [...allFiles].filter(file => !covered.has(file))
    result.push({
      name: modName,
      filepaths,
      slots,
      orphanFiles,
      shown,
      error,
      reloading: !!modReloading.value[modName],
    })
  }
  return result
})
const activeModCount = computed(() => modTree.value.filter(mod => mod.shown).length)
const activeStyleCount = computed(() => Object.keys(modManager.styles || {}).length)

const normaliseModPath = value => String(value || "").replace(/\\/g, "/").toLowerCase()
const dirnameOf = value => {
  const path = normaliseModPath(value)
  const idx = path.lastIndexOf("/")
  return idx >= 0 ? path.substring(0, idx + 1) : ""
}

// active UI apps = placements in the current layout, grouped by app name
const appList = computed(() => {
  const styles = modManager.styles || {}
  const grouped = new Map()
  for (const placement of appLayouts.apps || []) {
    const name = placement.appName
    if (!name) continue
    if (!grouped.has(name)) grouped.set(name, { app: placement.app, instances: 0 })
    grouped.get(name).instances++
  }
  const result = []
  for (const [name, info] of grouped) {
    const app = info.app || modManager.getUiApp(name) || {}
    const file = app.vueFile || app.jsSource || ""
    const renderer = app.hasAppVue && app.vueFile ? "vue" : (app.hasAppJs || app.directive ? "angular" : "?")
    const filePath = normaliseModPath(file)
    const fileDir = dirnameOf(file)
    const styleIds = renderer === "vue"
      ? Object.entries(styles)
        .filter(([, entry]) => {
          const fp = normaliseModPath(entry.filepath)
          return fp === filePath || (fileDir && fp.startsWith(fileDir))
        })
        .map(([id]) => id)
      : []
    // original app id (catalogue key / directive), not the hashed data-bngmod id
    const id = app.appName || app.directive || name
    const files = renderer === "vue" ? modManager.filesForFile(file) : (file ? [file] : [])
    result.push({
      key: name,
      id,
      name: app.name || name,
      file,
      renderer,
      instances: info.instances,
      styleIds,
      files,
      reloadable: renderer !== "?",
      app,
    })
  }
  return result
})
const activeAppCount = computed(() => appList.value.length)

async function reloadAll() {
  if (modsReloadingAll.value) return
  modsReloadingAll.value = true
  try {
    await modManager.refreshAll()
  } finally {
    modsReloadingAll.value = false
  }
}

async function reloadMod(mod) {
  if (!mod?.name || modReloading.value[mod.name]) return
  modReloading.value[mod.name] = true
  try {
    await modManager.reloadModByName(mod.name)
  } finally {
    modReloading.value[mod.name] = false
  }
}

function reloadApp(appVm) {
  if (!appVm?.reloadable || !appVm.app) return
  modManager.refreshUiApp(appVm.app)
}

function toggleModFiles(name) {
  expandedMods.value[name] = !expandedMods.value[name]
}

function toggleModSlot(modName, slotName) {
  const key = `${modName}::${slotName}`
  expandedModSlots.value[key] = !expandedModSlots.value[key]
}

function toggleAppFiles(key) {
  expandedApps.value[key] = !expandedApps.value[key]
}

const shortFile = file => String(file || "").split("/").pop()

onUnmounted(() => unregisterPanelButton?.())
</script>

<style lang="scss" scoped>
.mods-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.mods-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mods-head {
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.mods-title {
  flex: 0 0 auto;
  font-weight: 700;
  font-size: 0.8rem;
}

.mods-foot-note {
  flex: 1 1 auto;
  color: var(--bng-cool-gray-300);
  font-size: 0.74rem;
}

.mods-section-label {
  margin-top: 0.1rem;
  color: var(--bng-add-indigoblue-300);
  font-size: 0.74rem;
  font-weight: 700;
}

.mods-list {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  max-height: 11rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.mods-empty {
  color: var(--bng-cool-gray-300);
  font-size: 0.78rem;
  font-style: italic;
}

.mods-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.1rem 0.2rem;
  border-radius: var(--bng-corners-1);
  background: rgba(255, 255, 255, 0.02);
}

.mods-item.active {
  background: rgba(46, 178, 97, 0.1);
}

.mods-item.error {
  background: rgba(201, 69, 69, 0.14);
}

.mods-status {
  flex: 0 0 auto;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--bng-cool-gray-500);
}

.mods-status.on {
  background: var(--bng-add-green-400);
}

.mods-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
}

.mods-chips {
  flex: 0 0 auto;
  display: flex;
  gap: 0.15rem;
}

.mods-chip {
  padding: 0 0.28rem;
  border: 1px solid var(--bng-cool-gray-500);
  border-radius: var(--bng-corners-1);
  font-size: 0.7rem;
  line-height: 1.15rem;
  background: rgba(255, 255, 255, 0.04);
  white-space: nowrap;
}

.mods-reload,
.mods-reload-all {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0.06rem 0.3rem;
  cursor: pointer;
  font-size: 0.78rem;
  white-space: nowrap;
}

.mods-reload:disabled,
.mods-reload-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.mods-item-wrap {
  display: flex;
  flex-direction: column;
}

.mods-caret {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  border: none;
  background: none;
  color: var(--bng-off-white);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0;
}

.mods-files {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  margin: 0.05rem 0 0.1rem 1.1rem;
  padding-left: 0.4rem;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}

.mods-subwrap {
  display: flex;
  flex-direction: column;
}

.mods-subcaret {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 auto;
  white-space: nowrap;
}

.mods-file {
  color: var(--bng-cool-gray-200);
  font-size: 0.72rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mods-file-empty {
  color: var(--bng-cool-gray-400);
  font-style: italic;
}

.green {
  color: var(--bng-add-green-300);
}

.red {
  color: var(--bng-add-red-300);
}
</style>
