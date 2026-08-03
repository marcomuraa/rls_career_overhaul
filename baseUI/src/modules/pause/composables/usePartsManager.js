import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { sleep } from "@/utils"
import { ExecQueue } from "@/services/queue"
import PartsSearch from "@/modules/vehicleConfig/parts/search.js"

export function usePartsManager() {
  const events = useEvents()
  const queue = new ExecQueue()

  const shippingBuild = !!window.beamng?.shipping
  const isDev = window.beamng && !shippingBuild

  let currentVehID = -1
  const currentConfig = ref({})
  const richPartInfo = ref({})
  let partsHighlighted = {}

  const treeStatePermanent = false
  const treeStateKey = "partsTreeState"
  const treeState = ref({})

  const savedOptions = [
    "applyPartChangesAutomatically",
    "selectSubParts",
    "showNames",
    "showAux",
    "separateSort",
    "alwaysSort",
    "showDebugTab",
  ]
  const sessionSavedOptions = new Set(["showAux"])

  function getOptionStorage(name) {
    return sessionSavedOptions.has(name) ? sessionStorage : localStorage
  }
  function readOption(name, val = null) {
    return JSON.parse(getOptionStorage(name).getItem(name) || JSON.stringify(val))
  }
  function saveOption(name, val) {
    return getOptionStorage(name).setItem(name, JSON.stringify(val))
  }

  const opts = reactive({
    stickyPartSelection: false,
    selectSubParts: true,
    applyPartChangesAutomatically: readOption("applyPartChangesAutomatically", true),
    simple: false,
    showNames: false,
    showAux: !shippingBuild,
    separateSort: false,
    alwaysSort: false,
    showEmpty: false,
    showDebugTab: false,
  })

  const waitingForData = ref(true)
  const waitForData = async () => {
    while (waitingForData.value) await sleep(100)
  }

  const search = reactive(new PartsSearch(currentConfig, richPartInfo, opts))
  const partsChanged = ref(false)
  const focusedPart = ref(null)

  const vehChange = () => lua.extensions.core_vehicle_partmgmt.sendDataToUI()
  events.on("VehicleFocusChanged", vehChange)
  events.on("VehicleJbeamIoChanged", vehChange)

  function iterateChildren(slot, func) {
    func(slot)
    slot.children && Object.values(slot.children).forEach(child => iterateChildren(child, func))
  }

  async function highlightPart(part) {
    if (waitingForData.value) return
    iterateChildren(part, child => typeof child.highlight === "boolean" ? (partsHighlighted[child.partPath] = child.highlight = part.highlight) : undefined)
    lua.extensions.core_vehicle_partmgmt.highlightParts(partsHighlighted, currentVehID)
  }

  function toggleFocusedPartVisibility() {
    const part = focusedPart.value
    if (waitingForData.value || typeof part?.highlight !== "boolean") return false
    part.highlight = !part.highlight
    void highlightPart(part)
    return true
  }

  let mouseUsedLast = true
  let tmrSelect

  const unhideAllParts = queue.wrap("unhideAllParts", async () => {
    tmrSelect && clearTimeout(tmrSelect)
    tmrSelect = null
    if (waitingForData.value || Object.keys(currentConfig.value).length === 0) return
    iterateChildren(currentConfig.value, child => {
      if (!child.partPath || typeof child.highlight !== "boolean") return
      partsHighlighted[child.partPath] = child.highlight = true
    })
    await lua.extensions.core_vehicle_partmgmt.highlightParts(partsHighlighted, currentVehID)
  }, {
    selectPart: queue.resolution.replaceWithResolve,
    deselectPart: queue.resolution.replaceWithResolve,
    restoreHighlight: queue.resolution.replaceWithResolve,
  })

  const selectPart = queue.wrap("selectPart", async (slot, mouse = false) => {
    mouseUsedLast = mouse
    if (!mouse) focusedPart.value = slot
    tmrSelect && clearTimeout(tmrSelect)
    if (waitingForData.value || opts.stickyPartSelection) return

    const parts = {}
    if (opts.selectSubParts) {
      iterateChildren(slot, child => child.partPath && (parts[child.partPath] = true))
    } else {
      parts[slot.partPath] = true
    }

    for (const part in parts) {
      if (!(part in partsHighlighted)) delete parts[part]
    }
    if (Object.keys(parts).length === 0) return
    await lua.extensions.core_vehicle_partmgmt.selectParts(parts, currentVehID)
  }, {
    selectPart: queue.resolution.replaceWithResolve,
    deselectPart: queue.resolution.resolveOthers,
    write: queue.resolution.resolveThis,
    reset: queue.resolution.resolveThis,
    resetAllToLoadedConfig: queue.resolution.resolveThis,
    restoreHighlight: queue.resolution.resolveThis,
  })

  const deselectPart = queue.wrap("deselectPart", (slot, mouse = false) => {
    mouseUsedLast = mouse
    if (!mouse && (!slot || focusedPart.value === slot)) focusedPart.value = null
    tmrSelect && clearTimeout(tmrSelect)
    if (waitingForData.value) return
    tmrSelect = setTimeout(async () => {
      tmrSelect = null
      if (opts.stickyPartSelection || Object.keys(currentConfig.value).length === 0) return
      await lua.extensions.core_vehicle_partmgmt.showHighlightedParts(currentVehID)
    }, 100)
  }, {
    deselectPart: queue.resolution.replaceWithResolve,
    write: queue.resolution.resolveThis,
    reset: queue.resolution.resolveThis,
    resetAllToLoadedConfig: queue.resolution.resolveThis,
    restoreHighlight: queue.resolution.resolveThis,
    restoreSelection: queue.resolution.resolveThis,
  })

  const restoreHighlight = queue.wrap("restoreHighlight", () => {
    tmrSelect && clearTimeout(tmrSelect)
    tmrSelect = setTimeout(async () => {
      tmrSelect = null
      await lua.extensions.core_vehicle_partmgmt.highlightParts(partsHighlighted, currentVehID)
    }, 100)
  }, {
    selectPart: queue.resolution.replaceWithResolve,
    deselectPart: queue.resolution.replaceWithResolve,
    restoreHighlight: queue.resolution.replaceWithResolve,
  })

  const restoreSelection = queue.wrap("restoreSelection", element => {
    element?.partSelect?.()
  }, {
    selectPart: queue.resolution.replaceWithResolve,
    deselectPart: queue.resolution.replaceWithResolve,
    restoreSelection: queue.resolution.replaceWithResolve,
  })

  const dropdownOpened = val => (opts.stickyPartSelection = val)

  let changedPart = null
  async function partConfigChanged(part) {
    changedPart = part
    if (opts.applyPartChangesAutomatically) {
      await write(part)
    } else {
      part.changed = true
      partsChanged.value = true
    }
  }

  const write = queue.wrap("write", async (part) => {
    waitingForData.value = true
    await lua.extensions.core_vehicle_partmgmt.setPartsTreeConfig(currentConfig.value, true, part)
    await waitForData()
  }, {
    write: queue.resolution.merge,
    reset: queue.resolution.resolveThis,
    resetAllToLoadedConfig: queue.resolution.resolveThis,
  })

  const reset = queue.wrap("reset", async () => {
    waitingForData.value = true
    await lua.extensions.core_vehicle_partmgmt.resetPartsToLoadedConfig()
    await waitForData()
  }, {
    write: queue.resolution.resolveThis,
    reset: queue.resolution.merge,
    resetAllToLoadedConfig: queue.resolution.resolveThis,
  })

  const resetAllToLoadedConfig = queue.wrap("resetAllToLoadedConfig", async () => {
    waitingForData.value = true
    await lua.extensions.core_vehicle_partmgmt.resetAllToLoadedConfig()
    await waitForData()
  }, {
    write: queue.resolution.resolveThis,
    reset: queue.resolution.resolveThis,
    resetAllToLoadedConfig: queue.resolution.merge,
  })

  function processConfig(config) {
    treeStateSave()

    waitingForData.value = true

    richPartInfo.value = Object.fromEntries(
      Object.entries(config.richPartInfo).map(([name, info]) => [name, info.information])
    )

    partsHighlighted = config.partsHighlighted

    const processSlot = (slot, slotName, parentSlotName = undefined) => {
      slot.slotName = slotName
      slot.parentSlotName = parentSlotName

      if (changedPart && changedPart.chosenPartName === slot.chosenPartName) changedPart = slot

      slot.highlight = config.partsHighlighted[slot.partPath]

      if (typeof slot.children === "object") {
        if (Object.keys(slot.children).length === 0) {
          delete slot.children
        } else {
          for (const childSlotName in slot.children) {
            slot.children[childSlotName] = processSlot(slot.children[childSlotName], childSlotName, slot.chosenPartName)
          }
        }
      }

      if (typeof slot.suitablePartNames !== "object" || !Array.isArray(slot.suitablePartNames)) {
        slot.suitablePartNames = []
      }
      if (typeof slot.unsuitablePartNames !== "object" || !Array.isArray(slot.unsuitablePartNames)) {
        slot.unsuitablePartNames = []
      }

      return slot
    }

    currentVehID = config.vehID
    currentConfig.value = processSlot(config.chosenPartsTree, config.chosenPartsTree.chosenPartName)
    partsChanged.value = false
    waitingForData.value = false

    nextTick(() => {
      opts.stickyPartSelection = false
      deselectPart()
      treeStateLoad()
      changedPart = null
      if (opts.applyPartChangesAutomatically && !mouseUsedLast) {
        restoreSelection(document.activeElement)
      } else {
        restoreHighlight()
      }
    })
  }

  events.on("VehicleConfigChange", processConfig)

  let liveUpdateHookReady = false
  function reportPartsManagerLiveUpdate() {
    lua.extensions.hook("onPartsManagerUseLiveUpdateReport", !!opts.applyPartChangesAutomatically)
  }

  const treeStateStorage = treeStatePermanent ? localStorage : sessionStorage
  const treeStateSave = () => currentConfig.value.chosenPartName && treeStateStorage.setItem(`${treeStateKey}_${currentConfig.value.chosenPartName}`, JSON.stringify(treeState.value))
  const treeStateLoad = () => {
    if (!currentConfig.value.chosenPartName) return
    const state = treeStateStorage.getItem(`${treeStateKey}_${currentConfig.value.chosenPartName}`)
    if (state) {
      try {
        treeState.value = JSON.parse(state)
      } catch (err) {
        treeState.value = {}
      }
    } else {
      treeState.value = {}
    }
  }

  onMounted(() => {
    lua.extensions.core_vehicle_partmgmt.sendDataToUI()
    for (const name of savedOptions) {
      opts[name] = readOption(name, opts[name])
    }
    liveUpdateHookReady = true
    reportPartsManagerLiveUpdate()
  })

  watch(
    () => opts.applyPartChangesAutomatically,
    () => {
      saveOption("applyPartChangesAutomatically", opts.applyPartChangesAutomatically)
      if (!liveUpdateHookReady) return
      reportPartsManagerLiveUpdate()
    }
  )

  onUnmounted(() => {
    treeStateSave()
    focusedPart.value = null
    deselectPart(false)
  })

  return {
    isDev,
    currentConfig,
    richPartInfo,
    treeState,
    opts,
    waitingForData,
    partsChanged,
    focusedPart,
    search,
    selectPart,
    deselectPart,
    highlightPart,
    toggleFocusedPartVisibility,
    unhideAllParts,
    partConfigChanged,
    dropdownOpened,
    write,
    reset,
    resetAllToLoadedConfig,
    saveOption,
    waitForData,
  }
}

export default usePartsManager
