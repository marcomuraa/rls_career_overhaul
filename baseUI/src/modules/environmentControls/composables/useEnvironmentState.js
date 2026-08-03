import { onMounted, onUnmounted, ref } from "vue"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { clampNumber } from "@/utils/maths"

const ENV_REFRESH_INTERVAL_MS = 500
const SIMSPEED_APPLY_DEBOUNCE_MS = 80
const SOLAR_OPTION_STATE_KEYS = ["latitude", "longitude", "year", "month", "day", "utcOffset", "dstRule"]

export function useEnvironmentState(options = {}) {
  const events = useEvents()

  const state = ref({})
  const levelDefaults = ref(null)
  const canChange = ref(true)
  const simSpeedFactor = ref(1) // "bullet time" factor: 1 => realtime, 2 => 1/2x, etc.

  const timeOfDayOptions = ref([])

  let refreshTimer = null
  let simSpeedTimer = null
  let defaultsLoading = false
  let lerpSuppressUntil = 0
  let lastTimeOfDayOptionsSignature = null

  function isLerpSuppressed() {
    return Date.now() < lerpSuppressUntil
  }

  function setState(next) {
    const nextState = next || {}
    state.value = nextState
    refreshTimeOfDayOptionsForState(nextState)
  }

  function clonePlainObject(v) {
    if (!v || typeof v !== "object") return v
    try {
      if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(v)
    } catch {
      // ignore
    }
    try {
      return JSON.parse(JSON.stringify(v))
    } catch {
      return v
    }
  }

  async function ensureLevelDefaults() {
    if (levelDefaults.value) return
    if (defaultsLoading) return
    defaultsLoading = true
    try {
      const init = await lua.core_environment.getInitState()
      if (init) levelDefaults.value = clonePlainObject(init)
    } catch {
      // ignore
    } finally {
      defaultsLoading = false
    }
  }

  async function applyState(next, lerpSeconds) {
    const patch = next || {}
    try {
      const keys = Object.keys(patch)
      if (keys.length === 1 && keys[0] === "play") {
        lerpSuppressUntil = Date.now() + 150
        await lua.core_environment.setTimeOfDay({ play: patch.play === true })
        return
      }

      if (Number(lerpSeconds) > 0) {
        lerpSuppressUntil = Date.now() + Number(lerpSeconds) * 1000 + 150
        await lua.core_environment.setState(patch, lerpSeconds)
      } else {
        lerpSuppressUntil = Date.now() + 150
        await lua.core_environment.setState(patch)
      }
    } catch {
      // ignore
    }
  }

  function hasSolarOptionStateChange(partial) {
    return SOLAR_OPTION_STATE_KEYS.some(key => Object.prototype.hasOwnProperty.call(partial || {}, key))
  }

  function getTimeOfDayOptionsSignature(data) {
    if (!data || typeof data !== "object") return null
    const parts = SOLAR_OPTION_STATE_KEYS.map(key => data[key] ?? "")
    return parts.every(value => value === "") ? null : parts.join("|")
  }

  function refreshTimeOfDayOptionsForState(nextState, force = false) {
    const signature = getTimeOfDayOptionsSignature(nextState)
    if (!signature) return
    if (!force && signature === lastTimeOfDayOptionsSignature) return
    lastTimeOfDayOptionsSignature = signature
    void refreshTimeOfDayOptions()
  }

  function applyPartial(partial, lerpSeconds) {
    // Reflect the change locally, but only send the changed fields to the engine.
    // Sending the full merged state carries a stale `time` and yanks playback back
    // to it whenever play/day-scale changes (the clock visibly jumps).
    state.value = { ...(state.value || {}), ...(partial || {}) }
    const applyPromise = applyState(partial || {}, lerpSeconds)
    if (hasSolarOptionStateChange(partial)) {
      void applyPromise.finally(() => refreshTimeOfDayOptionsForState(state.value, true))
    }
  }

  function applySimSpeedFactorDebounced(factor) {
    // The UI uses discrete "divider" steps (1..100 plus special 1000).
    const f = Math.round(clampNumber(factor, 1, 1000))
    simSpeedFactor.value = f
    if (simSpeedTimer) clearTimeout(simSpeedTimer)
    simSpeedTimer = setTimeout(async () => {
      simSpeedTimer = null
      try {
        await lua.simTimeAuthority.set(1 / f)
        lua.simTimeAuthority.requestValue()
      } catch {
        // ignore
      }
    }, SIMSPEED_APPLY_DEBOUNCE_MS)
  }

  async function refresh() {
    if (isLerpSuppressed()) return
    try {
      setState(await lua.core_environment.getState())
    } catch {
      // ignore
    }
    try {
      const speed = await lua.simTimeAuthority.get()
      const v = Number(speed)
      if (Number.isFinite(v) && v > 0) simSpeedFactor.value = Math.round(1 / v)
    } catch {
      // ignore
    }
  }

  function request() {
    try {
      lua.core_environment.requestState()
      lua.simTimeAuthority.requestValue()
    } catch {
      // ignore
    }
  }

  async function refreshTimeOfDayOptions() {
    try {
      timeOfDayOptions.value = (await lua.core_environment.getTimeOfDayOptions()) || []
    } catch {
      timeOfDayOptions.value = []
    }
  }

  events.on("EnvironmentStateUpdate", data => {
    if (isLerpSuppressed()) return
    if (!levelDefaults.value) ensureLevelDefaults()
    setState(data)
  })

  events.on("EnvironmentCanUpdateChanged", value => {
    canChange.value = !!value
  })

  events.on("BullettimeValueChanged", value => {
    const v = Number(value)
    if (!Number.isFinite(v) || v <= 0) return
    simSpeedFactor.value = Math.round(1 / v)
  })

  onMounted(() => {
    if (options.initialLevelDefaults && typeof options.initialLevelDefaults === "object") {
      levelDefaults.value = clonePlainObject(options.initialLevelDefaults)
    }
    if (
      options.initialTimeOfDayOptions &&
      Array.isArray(options.initialTimeOfDayOptions) &&
      options.initialTimeOfDayOptions.length > 0
    ) {
      timeOfDayOptions.value = clonePlainObject(options.initialTimeOfDayOptions)
    }

    void refresh()

    if (!timeOfDayOptions.value || timeOfDayOptions.value.length === 0) {
      void refreshTimeOfDayOptions()
    }
    if (!levelDefaults.value) {
      void ensureLevelDefaults()
    }

    request()
    refreshTimer = setInterval(() => {
      if (isLerpSuppressed()) return
      if (simSpeedTimer) return
      request()
    }, ENV_REFRESH_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
    if (simSpeedTimer) clearTimeout(simSpeedTimer)
    simSpeedTimer = null
  })

  return {
    state,
    levelDefaults,
    canChange,
    simSpeedFactor,
    timeOfDayOptions,
    refresh,
    request,
    refreshTimeOfDayOptions,
    applyPartial,
    applySimSpeedFactorDebounced,
  }
}

