import { reactive } from "vue"
import { useBridge } from "@/bridge"
import { SysInfo } from "@/services"
import { $translate } from "@/services"
import logger from "@/services/logger"
import { optionsRuntimeLayerIniters } from "bng:options-runtime"

const base = {
  extensions: {
    initCustom: () => {},
    updateCustomByApi: () => {},
    updateCustomByValues: () => {},
    customValues: reactive({}),
    valueExtensions: {},
    optionExtensions: {},
  },
  formatters: {
    guessOptionFormat: o => o,
    applyValueFormatters: {},
    optionFormatters: {},
    valueFormatters: {},
  },
  conditions: {
    setInitialValues: () => {},
    conditions: {},
  },
}

const initSeq = ["extensions", "formatters", "conditions"]

async function init() {
  // init functions
  for (const values of Object.values(base)) {
    for (const [name, value] of Object.entries(values)) {
      if (typeof value === "function") {
        values[name + "_functions"] = []
        values[name] = (...args) => {
          for (const func of values[name + "_functions"]) {
            const res = func(...args)
            if (typeof res !== "undefined") return res
          }
        }
      }
    }
  }

  // dependencies that will be passed to the init functions
  const deps = {
    bridge: useBridge(),
    SysInfo,
    $translate,
    logger,
    customValues: base.extensions.customValues,
    valueExtensions: base.extensions.valueExtensions,
    optionExtensions: base.extensions.optionExtensions,
  }

  const apply = {
    function(base, name, func) {
      if (typeof base[name] !== "function" || typeof func !== "function") return
      base[name + "_functions"].push(func)
    },
    object(base, name, obj) {
      if (typeof base[name] !== "object" || typeof obj !== "object") return
      Object.assign(base[name], obj)
    },
  }

  function addLayer(baseLayer, layer) {
    if (typeof layer !== "object") return
    for (const [name, value] of Object.entries(layer)) {
      apply[typeof value]?.(baseLayer, name, value)
    }
  }

  for (const name of initSeq) {
    const layerIniters = optionsRuntimeLayerIniters?.[name] || []
    for (const initLayer of layerIniters) {
      if (typeof initLayer !== "function") continue
      try {
        addLayer(base[name], await initLayer(deps))
      } catch (err) {
        logger.debug(`Options runtime layer ${name} skipped:`, err?.message || err)
      }
    }
  }
}

export default { init, ...base }
