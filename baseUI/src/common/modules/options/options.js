import { ref, computed, watch, provide } from "vue"
import { useEvents } from "@/services/events.js"
import { useBridge } from "@/bridge"
import { useSettings } from "@/services/settings"
import logger from "@/services/logger"
import { VERSIONS, ALLOW_EDITOR } from "./config.js"
import { isShipping } from "bng:config"
import { loadLayout, genEmptyLayout } from "./layout/layout.js"
import useLayoutEditor from "./layout/editor.js"
import { setupSearch, searchText, searchResults, searchTemplates, disposeSearch } from "./layout/search.js"
import runtime from "@/modules/options/runtime"

const optionItemKeys = new WeakMap()
let optionItemKeyCounter = 0

export const getOptionItemKey = item => {
  if (!item || typeof item !== "object") return String(item)
  let key = optionItemKeys.get(item)
  if (!key) {
    key = `option-item-${++optionItemKeyCounter}`
    optionItemKeys.set(item, key)
  }
  return key
}

export default function useOptions() {
  let active = true
  const isProd = !import.meta.hot
  const settings = useSettings()
  const settingsTimestamp = ref(0)
  const settingsList = ref({}) // track if the settings are used and where
  const events = useEvents()
  const { api } = useBridge()
  const initialValues = {}
  const watchers = []

  const buildItemId = (level, index, parentId = "") =>
    parentId ? `${parentId}_${level}x${index}` : `${level}x${index}`

  async function init() {
    active = true

    await runtime.init()

    if (!editor) {
      // without editor, load the layout from file(s)
      layout.value = await loadLayout()
      if (!layout.value) {
        layout.value = genEmptyLayout()
      }
    }

    // update settings list when settings or layout change
    if (!isShipping() || editor) {
      // TODO: this isn't optimal, needs to be improved
      watchers.push(watch(() => settingsValues.value, updateSettingsList))
      watchers.push(watch(() => layout.value, async () => {
        await settings.waitForData()
        updateSettingsList()
      }))
    }

    // setup listeners for custom values
    events.on("SettingsChanged", () => settingsTimestamp.value = Date.now())

    // custom values
    watchers.push(watch(runtime.extensions.customValues, () => settingsTimestamp.value = Date.now(), { deep: true }))
    runtime.extensions.initCustom(events)
    runtime.extensions.updateCustomByApi(api)

    // (from old options) if this isnt called the gamestate in menu doesnt update correctly...
    // api.engineLua("core_gamestate.requestGameState()")

    // wait for settings to be loaded
    await settings.waitForData()

    // set initial values
    for (const key in settings.values) {
      initialValues[key] = settings.values[key]
    }
    runtime.conditions.setInitialValues(initialValues)

    runtime.extensions.updateCustomByValues(initialValues, "initial")

    // timestamp for reactivity
    settingsTimestamp.value = Date.now()

    // setup search watcher
    // search init will be called on-demand
    setupSearch(layout, settingsValues, settingsOptions, settingsTimestamp, runtime.conditions.conditions)
  }

  // mostly used to add additional values to the settings
  const settingsValues = computed(() => {
    if (!active || !settings.values) return {}
    const res = { ...settings.values }
    for (const key in runtime.formatters.valueFormatters) {
      res[key] = runtime.formatters.valueFormatters[key](res[key], settings.values, runtime.extensions.customValues)
    }
    for (const key in runtime.extensions.valueExtensions) {
      res[key] = runtime.extensions.valueExtensions[key](settings.values, runtime.extensions.customValues)
    }
    return res
  })

  // builds options using optionFormatters and optionExtensions
  const settingsOptions = computed(() => {
    const res = {}
    if (!active || !settings.options || !settings.values) return res
    for (const key in settings.options) {
      if (key in runtime.formatters.optionFormatters) {
        res[key] = runtime.formatters.optionFormatters[key](settings.options[key], settings.options, settings.values)
      } else {
        res[key] = runtime.formatters.guessOptionFormat(settings.options[key]) ?? settings.options[key]
      }
    }
    for (const key in runtime.extensions.optionExtensions) {
      res[key] = runtime.extensions.optionExtensions[key](settings.options, settings.values)
    }
    return res
  })

  function updateSettingsList() {
    if (!active) return
    runtime.extensions.updateCustomByValues(settingsValues.value, "update")
    settingsList.value = Object.keys(settingsValues.value).reduce((res, name) => ({
      ...res,
      [name]: {
        assigned: false,
        assignedIn: [],
        value: settingsValues.value[name],
        options: settingsOptions.value[name],
        elementId: name.split("."),
      },
    }), {})
    function dive(items, cat, catIndex, level = 0, parentId = "") {
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.setting) {
          if (item.setting in settingsList.value) {
            const itm = settingsList.value[item.setting]
            itm.assigned = true
            itm.assignedIn.push([
              cat.label,
              catIndex,
              `cat${catIndex}_${buildItemId(level, i, parentId)}`,
            ])
          } else {
            logger.warn("Unknown setting: " + item.setting)
          }
        }
        if (item.items) {
          const currentId = buildItemId(level, i, parentId)
          dive(item.items, cat, catIndex, level + 1, currentId)
        }
      }
    }
    for (let i = 0; i < layout.value.items.length; i++) {
      const cat = layout.value.items[i]
      dive(cat.items, cat, i)
    }
  }

  const applySetting = (name, value) => {
    if (!name) return

    // apply format if it needs to
    const values = name in runtime.formatters.applyValueFormatters
      ? runtime.formatters.applyValueFormatters[name](value)
      : { [name]: value }

    // set internal debug values
    if (name.startsWith("debug_")) {
      runtime.extensions.customValues.debug[name.substring(6)] = value
      if (name === "debug_visualization") {
        if (runtime.extensions.customValues.debug.visualization_prev) {
          api.engineLua(runtime.extensions.customValues.debug.visualization_prev)
        }
        runtime.extensions.customValues.debug.visualization_prev = value
        api.engineLua(value)
      }
      if (name === "debug_materialsVisualization") {
        if (runtime.extensions.customValues.debug.materialsVisualization_prev) {
          api.engineLua(runtime.extensions.customValues.debug.materialsVisualization_prev)
        }
        runtime.extensions.customValues.debug.materialsVisualization_prev = value
        api.engineLua(value)
      }
    }

    // remove extended values, still allowing unknown
    for (const key in values) {
      // not checking formatters, as they replace the payload and might have the same-named settings
      const isCustom = key in runtime.extensions.valueExtensions
      const isUnknown = !(key in settings.values)
      if (isCustom && isUnknown) {
        delete values[key]
      }
    }

    if (Object.keys(values).length > 0) {
      // logger.debug("Applying:", values)
      logger.debug("Applying: " + JSON.stringify(values))
      const applied = settings.apply(values)
      runtime.extensions.updateCustomByApi(api)
      runtime.extensions.updateCustomByValues(values, "local")
      // return the setState promise so callers can await the engine finishing (used for the busy indicator)
      return applied
    }
  }

  function dispose() {
    active = false
    settingsList.value = {}
    for (const unwatch of watchers) {
      unwatch()
    }
    watchers.splice(0)
    settingsTimestamp.value = 0
    disposeSearch()
    editor?.dispose()
  }

  const editorArgs = {
    versions: VERSIONS,
    settings,
    settingsValues,
    settingsOptions,
    settingsList,
    conditions: runtime.conditions.conditions,
    buildItemId,
  }
  const editor = !isProd && ALLOW_EDITOR ? useLayoutEditor(editorArgs) : null
  // with editor, we'll use the editor's layout
  const layout = editor ? editor.layout : ref(genEmptyLayout())

  provide("settingsValues", settingsValues)
  provide("settingsOptions", settingsOptions)
  provide("settingsTimestamp", settingsTimestamp)
  provide("settingsList", settingsList)
  provide("conditions", runtime.conditions.conditions)
  provide("buildItemId", buildItemId)

  return {
    init,
    dispose,
    versions: VERSIONS,
    version: VERSIONS[0],
    settings,
    settingsList,
    settingsValues,
    settingsOptions,
    settingsTimestamp,
    applySetting,
    buildItemId,
    layout,
    conditions: runtime.conditions.conditions,
    editable: !!editor,
    editor,
    searchText,
    searchResults,
    searchTemplates: {
      message: (...args) => searchTemplates.message(layout, ...args),
      headers: (...args) => searchTemplates.headers(layout, ...args),
      group: (...args) => searchTemplates.group(layout, ...args),
    },
  }
}
