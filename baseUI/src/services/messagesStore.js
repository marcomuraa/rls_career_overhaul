import { computed, reactive, ref } from "vue"
import { defineStore } from "pinia"
import { useBridge } from "@/bridge"
import { useControllerActionItems } from "@/services/actionItems"

const timerIntervalMs = 300
const LOG_INCOMING = false
/**
 * Messages with TTL set to -1 stay until cleared
 */
const INFINITE_TTL_VALUE = -1

const CATEGORY_ICONS = [
  { match: "vehicle.absBehavior", icon: "ABSIndicator" },
  { match: "vehicle.brakingdistance", icon: "carsFollow" },
  { prefix: "vehicle.compressionBrake.", icon: "engine" },
  { prefix: "vehicle.damage.exhaust", icon: "exhaustMuffler" },
  { prefix: "vehicle.damage.deflated.", icon: "tireDeflated" },
  { match: "vehicle.beamstate.tireDeflated", icon: "tireDeflated" },
  { match: "vehicle.damage.mildOverrev", icon: "powerGauge05" },
  { match: "vehicle.damage.catastrophicOverrev", icon: "powerGauge05" },
  { match: "vehicle.damage.catastrophicOverTorque", icon: "cogDamaged" },
  { match: "vehicle.damage.flood", icon: "water" },
  { match: "vehicle.engine.isStalling", icon: "powerGauge01" },
  { match: "vehicle.ignition.ignitionLevel", icon: "keys1" },
  { match: "vehicle.lightbar.mode", icon: "wigwags" },
  { match: "vehicle.linelock.status", icon: "wheelDisc" },
  { match: "vehicle.postCrashBrake.impact", icon: "hazardLights" },
  { prefix: "vehicle.powertrain.diffmode.", icon: "drivetrainGeneric" },
  { match: "vehicle.powertrain.nitrousOxideInjection", icon: "N2OHoriz" },
  { match: "vehicle.shiftLogic.cannotShift", icon: "cogsDamaged" },
  { match: "vehicle.shiftermode", icon: "transmissionM" },
  { match: "vehicle.transbrake.status", icon: "cogs" },
  { match: "vehicle.twoStep.status", icon: "signal04a" },
  { match: "vehicle.tirePressureControl.inflateDeflate", icon: "tirePressureGaugeOutlined03" },
  { prefix: "vehicle.wheels.tirePunctured.", icon: "tireAirPuff" },
  { prefix: "vehicle.damage.device.", icon: "cogDamaged" },
  { match: "vehicle.driveModes", icon: "ESC" },
  { prefix: "vehicle.driveModes.", icon: "ESC" },
  { match: "vehicle.engine.oilOverheating.true", icon: "coolantTemp" },
  { match: "vehicle.engine.blockMelted.true", icon: "coolantTemp" },
  { match: "vehicle.engine.headGasketDamaged.true", icon: "coolantTemp" },
  { match: "vehicle.engine.coolantOverheating.true", icon: "coolantTemp" },
  { match: "vehicle.engine.radiatorLeak.true", icon: "coolantTemp" },
  { prefix: "vehicle.engine.", icon: "engine" },
  { prefix: "vehicle.recovery.", icon: "tow" },
  { match: "rally", icon: "rallyHelmet" },
  { match: "fill", icon: "import" },
  { match: "align", icon: "flag" },
  { match: "delivery", icon: "boxTruckFast" },
  { match: "refueling", icon: "fuelPumpFilling" },
  { prefix: "refueling-", icon: "fuelPumpFilling" },
  { prefix: "ui.camera.", icon: "movieCamera" },
  { match: "input", icon: "gamepad" },
  { prefix: "ui.apps.damage_app_vehicle_simple.component.", icon: "cogsDamaged" },
  { match: "AI debug", icon: "AIMicrochip" },
  { match: "debug", icon: "code" },
  { match: "hydros", icon: "steeringWheelCommon" },
  { match: "GLTFexport", icon: "loadMesh" },
  { match: "bigmap.info.reachedTarget", icon: "raceFlag" },
]

export const useMessagesStore = defineStore("messages", () => {
  const { events } = useBridge()
  const {
    showForController,
    normalizeActionItems,
    filterActionItemsForController,
  } = useControllerActionItems()

  const bypassTtl = ref(false)
  const messagesByCategory = reactive({})
  let started = false
  let timerId = null

  const messages = computed(() => Object.values(messagesByCategory)
    .filter(msg => showForController(msg.showIfController))
    .map(filterActionItemsForController))

  const normalizePayload = args => {
    const category = args?.category ?? "default"
    const clear = !!args?.clear
    const text = args?.text ?? args?.msg ?? args?.txt ?? ""
    const icon = typeof args?.icon === "string" ? args.icon : undefined
    const availableOptionsCount = (typeof args?.availableOptionsCount === "number" || typeof args?.availableOptionsCount === "string")
      ? args.availableOptionsCount
      : undefined
    const currentOptionIndex = (typeof args?.currentOptionIndex === "number" || typeof args?.currentOptionIndex === "string")
      ? args.currentOptionIndex
      : undefined
    const actionPrevious = typeof args?.actionPrevious === "string" ? args.actionPrevious : undefined
    const actionNext = typeof args?.actionNext === "string" ? args.actionNext : undefined
    const actionItems = normalizeActionItems(args?.actionItems)
    const showIfController = typeof args?.showIfController === "boolean" ? args.showIfController : undefined
    const infinite = args?.ttlMs === INFINITE_TTL_VALUE || args?.ttl === INFINITE_TTL_VALUE
    let ttlMs = typeof args?.ttlMs === "number"
      ? args.ttlMs
      : (typeof args?.ttl === "number" ? args.ttl * 1000 : undefined)

    if (ttlMs == null) ttlMs = 5000

    return {
      category,
      clear,
      text,
      icon,
      availableOptionsCount,
      currentOptionIndex,
      actionPrevious,
      actionNext,
      actionItems,
      showIfController,
      ttlMs,
      infinite,
      context: args?.context,
    }
  }

  const deriveIconForCategory = category => {
    if (!category) return "info"
    for (const { match, prefix, icon } of CATEGORY_ICONS) {
      if (match && category === match) return icon
      if (prefix && category.startsWith(prefix)) return icon
    }
    return "info"
  }

  const onMessage = args => {
    const {
      category,
      clear,
      text,
      icon,
      availableOptionsCount,
      currentOptionIndex,
      actionPrevious,
      actionNext,
      actionItems,
      showIfController,
      ttlMs,
      infinite,
      context,
    } = normalizePayload(args)

    if (LOG_INCOMING) {
      try {
        console.info("[messages] incoming", { category, clear, icon, ttlMs, text })
      } catch (e) {}
    }

    let matched = []
    try {
      const re = new RegExp(category)
      matched = Object.keys(messagesByCategory).filter(k => re.test(k))
    } catch {
      // invalid regex, category is treated as literal below
    }
    if (matched.length === 0) matched = [category]

    for (const cat of matched) {
      const isEmptyString = typeof text === "string" && text === "" && !actionItems?.length
      if (clear || isEmptyString) {
        delete messagesByCategory[cat]
        continue
      }

      const offset = infinite ? 0 : Object.keys(messagesByCategory).length * timerIntervalMs * 2
      messagesByCategory[cat] = {
        _key: cat,
        text,
        context,
        icon: icon || deriveIconForCategory(cat),
        availableOptionsCount,
        currentOptionIndex,
        actionPrevious,
        actionNext,
        actionItems,
        showIfController,
        infinite,
        ttl: infinite ? Infinity : ttlMs + offset,
      }
    }
  }

  const onClearAll = () => {
    if (LOG_INCOMING) {
      try {
        console.info("[messages] clear-all")
      } catch (e) {}
    }
    for (const key in messagesByCategory) delete messagesByCategory[key]
  }

  const onMessagesDebug = data => {
    if (data && typeof data.bypassTtl === "boolean") {
      bypassTtl.value = !!data.bypassTtl
    }
  }

  const tick = () => {
    for (const key in messagesByCategory) {
      const message = messagesByCategory[key]
      if (message.infinite) continue
      if (!bypassTtl.value) {
        message.ttl -= timerIntervalMs
      }
      if (message.ttl <= 0) delete messagesByCategory[key]
    }
  }

  function start() {
    if (started) return
    started = true
    events.on("Message", onMessage)
    events.on("ClearAllMessages", onClearAll)
    events.on("MessagesDebug", onMessagesDebug)
    timerId = window.setInterval(tick, timerIntervalMs)
  }

  function stop() {
    if (!started) return
    events.off("Message", onMessage)
    events.off("ClearAllMessages", onClearAll)
    events.off("MessagesDebug", onMessagesDebug)
    if (timerId) window.clearInterval(timerId)
    timerId = null
    started = false
  }

  return {
    messages,
    bypassTtl,
    start,
    stop,
  }
})
