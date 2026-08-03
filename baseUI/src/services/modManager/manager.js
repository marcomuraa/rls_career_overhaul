import { ref, reactive, computed, watch } from "vue"
import { defineStore } from "pinia"
import { useBridge } from "@/bridge"
import { uniqueId } from "@/services/uniqueId"
import { MODSLOTS_LIST } from "./slots"
import { getComponent, resetAllCaches, loadModule, resetComponentCache } from "./compiler"
import logger from "@/services/logger"

export const useModManager = defineStore("modManager", () => {
  // const { api } = useBridge()
  // const runLua = code => new Promise(resolve => api.engineLua(code, resolve))
  const { lua, events } = useBridge()

  /** Raw list of all mods. */
  const modList = ref([])

  /** Raw list of all UI apps. */
  const uiAppList = ref({})

  const refreshToken = ref(0)
  const angularRefreshToken = ref(0)
  const uiAppRefresh = ref({ token: 0, apps: [], files: [], targeted: false })

  /** List of all UI slots, tracking their instances and display status. */
  const uiSlots = MODSLOTS_LIST.reduce(
    (res, name) => ({ ...res, [name]: {
      instances: [],
      shown: ref(false),
      mods: computed(() => modList.value.filter(mod => mod.uiSlots?.includes(name))),
    }}), {})

  // ownerId -> { root, styles, files } for each mounted ModComponent instance
  const mountedMods = reactive({})

  function registerMod(ownerId, record) {
    if (!ownerId) return
    mountedMods[ownerId] = {
      root: record?.root || "",
      styles: Array.isArray(record?.styles) ? record.styles : [],
      files: Array.isArray(record?.files) ? record.files : [],
    }
  }

  function unregisterMod(ownerId) {
    if (ownerId in mountedMods) delete mountedMods[ownerId]
  }

  /** Union of all component files loaded by mounted instances of the given root file. */
  function filesForFile(root) {
    if (!root) return []
    const files = new Set()
    for (const rec of Object.values(mountedMods)) {
      if (rec.root !== root) continue
      for (const file of rec.files) files.add(file)
    }
    return [...files]
  }

  /** Styles for all actually shown mods and their subcomponents, without duplicates. */
  const styles = computed(() => {
    const res = {}
    const addStyle = style => {
      if (!style || !style.id || !style.styles || style.id in res) return
      res[style.id] = {
        filepath: style.filepath,
        styles: style.styles,
      }
    }
    for (const slot of Object.values(uiSlots)) {
      if (!slot.shown.value) continue
      const mods = slot.mods.value.filter(mod => mod.data?.styles || mod.data?.substyles?.length > 0)
      for (const mod of mods) {
        addStyle({ id: mod.data.meta.dataid, filepath: mod.filepath, styles: mod.data.styles })
        for (const style of mod.data.substyles || []) addStyle(style)
      }
    }
    for (const rec of Object.values(mountedMods)) {
      for (const style of rec.styles) addStyle(style)
    }
    return res
  })

  // keeps track of the last-run `index.js` for each mod, so `onUnload` can be called before a re-run/removal.
  const modEntryPoints = {}

  async function unloadModEntryPoint(name) {
    const entry = modEntryPoints[name]
    if (!entry) return
    delete modEntryPoints[name]
    if (typeof entry.onUnload !== "function") return
    try {
      await entry.onUnload()
    } catch (err) {
      logger.error(`[MOD] Failed to unload entry point for "${name}"`, err)
    }
  }

  async function reloadModEntryPoint(name, modPath, refresh = true) {
    if (!modPath) return
    try {
      await unloadModEntryPoint(name)
      const entry = await loadModule(modPath + "/index.js", refresh) || {}
      modEntryPoints[name] = entry
      if (typeof entry.onLoad === "function") await entry.onLoad()
    } catch (err) {
      logger.error(`[MOD] Failed to run entry point for "${name}"`, err)
    }
  }

  /**
   * Runs `index.js` as an entry point.
   * `onLoad`/`onUnload` exports expected (both optional, may be async).
   */
  async function runModEntryPoints(mods, refresh) {
    const currentNames = new Set(Object.entries(mods)
      .filter(([, mod]) => Array.isArray(mod.files) && mod.files.some(file => file.toLowerCase() === "/index.js"))
      .map(([name]) => name))

    for (const name of Object.keys(modEntryPoints)) {
      if (!currentNames.has(name)) await unloadModEntryPoint(name)
    }

    for (const name of currentNames) {
      if (modEntryPoints[name] && !refresh) continue // already loaded, nothing changed
      await reloadModEntryPoint(name, mods[name]?.path, refresh)
    }
  }

  /**
   * Re-reads one mod folder from disk: all its `.vue` files plus `index.js` (`onUnload` > re-eval > `onLoad`).
   */
  async function reloadModByName(modName) {
    const mods = await lua.extensions.ui_uiMods.getVueMods()
    const mod = mods?.[modName]
    if (!mod) return false

    const vueEntries = modList.value.filter(m => m.mod === modName && m.filepath.toLowerCase().endsWith(".vue"))
    await refreshVueModEntries(vueEntries)

    const hasEntryPoint = Array.isArray(mod.files) && mod.files.some(file => file.toLowerCase() === "/index.js")
    if (hasEntryPoint) await reloadModEntryPoint(modName, mod.path, true)

    refreshToken.value++
    return true
  }

  function assignModEntryData(mod, data) {
    mod.data = data
    if (data.meta) {
      if (data.meta.dataid) mod.id = data.meta.dataid
      if (Array.isArray(data.meta.uiSlots)) mod.uiSlots = data.meta.uiSlots
    }
  }

  async function refreshVueModEntries(vueEntries) {
    if (!vueEntries.length) return
    const byDir = new Map()
    for (const mod of vueEntries) {
      const dir = mod.filepath.slice(0, mod.filepath.lastIndexOf("/") + 1)
      if (!byDir.has(dir)) byDir.set(dir, [])
      byDir.get(dir).push(mod)
    }
    for (const entries of byDir.values()) {
      await resetComponentCache(entries[0].filepath)
      for (const mod of entries) {
        assignModEntryData(mod, await getComponent(mod.filepath, false, false))
      }
    }
  }

  async function loadMods(refresh = false) {
    // https://documentation.beamng.com/modding/programming/extensions/
    // extensions/myMod.lua > myMod
    // extensions/myMod/myExtension.lua > myMod_myExtension
    // const files = await runLua("extensions.vuemod and extensions.vuemod.listMods() or {}") // not recommended
    // await runLua("not vuemod and extensions.load('vuemod')") // recommended
    // const files = await runLua("vuemod.listMods()")
    const mods = await lua.extensions.ui_uiMods.getVueMods()
    logger.debug("UI mods found:", mods)
    modList.value = Object.entries(mods).reduce((res, [name, mod]) => [
      ...res,
      ...mod.files.map(file => ({
        id: uniqueId(),
        filepath: mod.path + file,
        mod: name,
        name: `${name}: ${file.substring(1)}`,
      })),
    ], [])
    const vueEntries = modList.value.filter(mod => mod.filepath.toLowerCase().endsWith(".vue"))
    if (refresh) {
      await refreshVueModEntries(vueEntries)
    } else {
      for (const mod of vueEntries) {
        assignModEntryData(mod, await getComponent(mod.filepath, false, false))
      }
    }
    await runModEntryPoints(mods, refresh)
    // await runLua("vuemod and extensions.unload('vuemod')")
  }

  /** Reloads a single mod from source, updating its entry in place. */
  async function refreshMod(filepath) {
    if (!filepath.toLowerCase().endsWith(".vue")) return
    const mod = modList.value.find(m => m.filepath === filepath)
    if (!mod) return
    const data = await getComponent(filepath, true, false)
    mod.data = data
    if (data.meta) {
      if (data.meta.dataid) mod.id = data.meta.dataid
      if (Array.isArray(data.meta.uiSlots)) mod.uiSlots = data.meta.uiSlots
    }
  }

  function addUiSlot(name, id) {
    if (!MODSLOTS_LIST.includes(name)) {
      throw new Error(`Invalid mod mounting point: ${name}`)
    }

    const idx = uiSlots[name].instances.indexOf(id)
    if (idx > -1) return uiSlots[name].mods

    uiSlots[name].instances.push(id)
    uiSlots[name].shown.value = true
    return uiSlots[name].mods
  }

  function removeUiSlot(name, id) {
    if (!MODSLOTS_LIST.includes(name)) return
    const idx = uiSlots[name].instances.indexOf(id)
    if (idx === -1) return
    uiSlots[name].instances.splice(idx, 1)
    uiSlots[name].shown.value = uiSlots[name].instances.length > 0
  }

  async function loadUiApps(refresh = false) {
    if (refresh) await resetAllCaches()
    if (!lua.extensions.ui_uiMods?.getUiApps) {
      uiAppList.value = {}
      return
    }
    const apps = await lua.extensions.ui_uiMods.getUiApps()
    uiAppList.value = apps && typeof apps === "object" ? apps : {}
  }

  /** Triggers a targeted reload of a single UI app's mounted instances (AppHost watches uiAppRefresh). */
  function refreshUiApp(app) {
    if (!app) return
    uiAppRefresh.value = {
      token: uiAppRefresh.value.token + 1,
      apps: [{
        appName: app.appName,
        directive: app.directive,
        folder: app.folder,
        vueFile: app.vueFile,
        jsSource: app.jsSource,
        appJsonPath: app.appJsonPath,
        hasAppVue: app.hasAppVue === true,
        hasAppJs: app.hasAppJs === true,
      }],
      files: [],
      targeted: true,
    }
  }

  async function refreshAll() {
    await loadUiApps(true) // must go first - calls resetAllCaches()
    await loadMods(true)
    refreshToken.value++
    bumpAngularRefreshToken()
    uiAppRefresh.value = { token: uiAppRefresh.value.token + 1, apps: [], files: [], targeted: false }
  }

  function getUiApp(appNameOrDirective) {
    if (!appNameOrDirective) return null
    const direct = uiAppList.value[appNameOrDirective]
    if (direct) return direct
    for (const app of Object.values(uiAppList.value)) {
      if (app.directive === appNameOrDirective) return app
    }
    return null
  }

  function normaliseChangePayload(payload) {
    const apps = Array.isArray(payload?.apps) ? payload.apps.filter(Boolean) : []
    const files = Array.isArray(payload?.files) ? payload.files.filter(Boolean) : []
    return {
      apps,
      files,
      targeted: apps.length > 0,
    }
  }

  const hasAngularApp = apps => apps.some(app => app?.hasAppJs === true || !!app?.jsSource)

  const setAngularRefreshToken = value => {
    angularRefreshToken.value = value
    window.__bngUiAppsRefreshToken = value
  }

  const bumpAngularRefreshToken = () => setAngularRefreshToken(angularRefreshToken.value + 1)

  async function handleUiAppsChanged(payload) {
    const change = normaliseChangePayload(payload)
    await loadUiApps(!change.targeted)

    const refreshesAngular = !change.targeted || hasAngularApp(change.apps)
    if (refreshesAngular) {
      bumpAngularRefreshToken()
    }

    uiAppRefresh.value = {
      token: uiAppRefresh.value.token + 1,
      apps: change.apps,
      files: change.files,
      targeted: change.targeted,
    }

    if (!change.targeted) {
      refreshToken.value++
      return
    }
  }

  watch(angularRefreshToken, value => { window.__bngUiAppsRefreshToken = value }, { immediate: true })

  events.on("UiModsChanged", async () => {
    await loadMods(true)
    refreshToken.value++
  })
  events.on("UiAppsChanged", async payload => {
    await handleUiAppsChanged(payload)
  })

  return {
    // ui mods
    modList,
    uiSlots,
    styles,
    registerMod,
    unregisterMod,
    filesForFile,
    loadMods: async () => await loadMods(),
    reloadMods: async () => await loadMods(false),
    refreshMods: async () => await loadMods(true),
    refreshMod,
    reloadModByName,
    addUiSlot,
    removeUiSlot,

    // ui apps
    uiAppList,
    loadUiApps: async () => await loadUiApps(),
    reloadUiApps: async () => await loadUiApps(false),
    refreshUiApps: async () => await loadUiApps(true),
    refreshUiApp,
    getUiApp,

    // refreshments
    refreshToken,
    angularRefreshToken,
    uiAppRefresh,
    refreshAll,
  }
})
