import { ref, reactive, watch, nextTick } from "vue"
import { defineStore } from "pinia"
import { useBridge } from "@/bridge"
import { getUINavServiceInstance } from "@/services/uiNav"
import { getScopeCoordinatorInstance, SCOPE_TYPES } from "@/services/scopedNav"
import { getNavItems } from "@/services/scopedNav/utils"
import { useUINavTracker } from "@/services/uiNavTracker"
import { useRouteDataStore } from "@/services/routeData"
import useControlsStore from "@/services/controls"
import { SCROLL_EVENT_H, SCROLL_EVENT_V } from "@/services/crossfire"
import {
  CANARY_KINDS,
  RECOVERY_KINDS,
  HEALTH_STATUS,
  EVENT_NAMES,
  RECENT_NAV_WINDOW_MS,
  DEFERRED_DIAGNOSIS_MS,
  CANARY_THROTTLE_MS,
  RECOVERY_COOLDOWN_MS,
  INCIDENT_LIMIT,
  RECOVERY_LIMIT,
  EDITABLE_TAGS,
  MOD_CRASH_WINDOW_MS,
  MOD_CRASH_BUDGET_SCOPE,
  MOD_CRASH_BUDGET_SCOPES,
} from "./config"
import { SETTLED_EVALUATORS, DEFERRED_EVALUATORS, decideModRecovery, MOD_ACTIONS } from "./policy"

const DEV = __BNG_DEV__
const NAV_CANARIES = new Set([CANARY_KINDS.focus, CANARY_KINDS.uinav, CANARY_KINDS.scope])

// rotate_*_cam scroll actions are driven by the scroll subsystem's own rapid
// push/pop lifecycle (crossfire scrollCatch + the v-bng-ui-nav-scroll directive)
const DRIFT_IGNORED_EVENTS = new Set([SCROLL_EVENT_H, SCROLL_EVENT_V])

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())

const isVisibleElement = element => {
  if (!element || typeof element.getClientRects !== "function") return false
  if (element.getClientRects().length === 0) return false
  const style = window.getComputedStyle(element)
  return style.display !== "none" && style.visibility !== "hidden"
}

const isEditable = element => !!element
  && (EDITABLE_TAGS.includes(element.tagName) || element.isContentEditable)

export const useUiHealth = defineStore("uiHealth", () => {
  const status = ref(HEALTH_STATUS.healthy)
  const counters = reactive({
    canaries: 0,
    suspicions: 0,
    recoveries: 0,
    modCrashes: 0,
    modReloads: 0,
  })
  const modState = new Map()
  const incidents = ref([])
  const recoveries = ref([])
  const lastIncident = ref(null)
  const lastRecovery = ref(null)

  const observers = new Set()

  let initialised = false
  let lastNavAt = 0
  let lastArmAt = 0
  let settledScheduled = false
  let deferredTimer = null
  const lastRecoveryAt = {}

  let tracker = null
  let coordinator = null
  let uiNav = null
  let controls = null
  let bridge = null

  const isActionableContext = () => !!window.beamng?.ingame

  const notify = () => {
    if (observers.size === 0) return
    const payload = {
      status: status.value,
      counters: { ...counters },
      lastIncident: lastIncident.value,
      lastRecovery: lastRecovery.value,
    }
    for (const observer of observers) {
      try {
        observer(payload)
      } catch {}
    }
  }

  const pushBounded = (list, entry, limit) => {
    list.value.push(entry)
    if (list.value.length > limit) list.value.splice(0, list.value.length - limit)
  }

  const recordIncident = decision => {
    counters.suspicions++
    const sig = `${decision.kind}:${decision.reason}`
    const last = lastIncident.value
    if (last && last.sig === sig) {
      last.count++
      last.t = Date.now()
      return
    }
    const entry = { t: Date.now(), count: 1, sig, ...decision }
    lastIncident.value = entry
    if (DEV) pushBounded(incidents, entry, INCIDENT_LIMIT)
  }

  const recordRecovery = (kind, reason) => {
    counters.recoveries++
    const entry = { t: Date.now(), kind, reason }
    lastRecovery.value = entry
    if (DEV) pushBounded(recoveries, entry, RECOVERY_LIMIT)
  }

  const canRecover = kind => now() - (lastRecoveryAt[kind] || 0) >= (RECOVERY_COOLDOWN_MS[kind] || 0)

  const buildState = () => {
    const currentScope = coordinator.getCurrentScope()
    const activeElement = document.activeElement
    const scopeElement = currentScope?.element || null

    const handlesOwnFocus = currentScope?.config?.type === SCOPE_TYPES.NONAV || !!currentScope?.config?.handlesOwnFocus
    const hasFocusCandidate = !handlesOwnFocus && !!scopeElement && getNavItems(scopeElement, true, { availableOnly: true }).length > 0

    const drift = []
    const states = tracker.actionStates
    const seen = new Set([...Object.keys(states.desired), ...Object.keys(states.applied)])
    for (const name of seen) {
      if (DRIFT_IGNORED_EVENTS.has(name)) continue
      const syncing = !!states.syncInFlight[name] || !!states.syncQueued[name]
      if (syncing) continue
      const desired = !!states.desired[name]
      const applied = !!states.applied[name]
      if (desired !== applied) drift.push({ name, desired, applied })
    }

    const unblocked = new Set(tracker.unblockedEvents)
    const blocklistExpected = tracker.blockedEvents.filter(name => !unblocked.has(name))

    return {
      now: now(),
      ingame: isActionableContext(),
      controllerActive: !!controls.isControllerUsed,
      inEditable: isEditable(activeElement),
      hasActivationBarrier: coordinator.hasActivationBarrier(),
      coordinatorEnabled: coordinator.enabled.value,
      recentNav: now() - lastNavAt <= RECENT_NAV_WINDOW_MS,

      activeIsBody: !activeElement || activeElement === document.body,
      activeConnected: !!activeElement?.isConnected,
      activeVisible: activeElement === document.body ? true : isVisibleElement(activeElement),
      activeInCurrentScope: !!scopeElement && !!activeElement && scopeElement.contains(activeElement),

      scopeCount: coordinator.scopeStack.value.length + coordinator.popupScopeStack.value.length,
      currentScopeId: currentScope?.id || null,
      currentScopeHasElement: !!scopeElement?.isConnected,
      currentScopeHandlesOwnFocus: handlesOwnFocus,
      currentScopeHasFocusCandidate: hasFocusCandidate,
      uiNavActiveScopeId: uiNav.activeScope,

      actionDrift: drift,
      menuActionMapEnabled: tracker.isMenuActionMapEnabled?.() ?? true,

      blocklistExpected,
      blocklistActual: uiNav.getBlockedEvents(),

      bridgeStreamHealth: bridge?.streamHooks?.getStreamHealth?.() || null,
    }
  }

  const recover = (kind, state) => {
    lastRecoveryAt[kind] = now()
    switch (kind) {
      case RECOVERY_KINDS.focus:
        coordinator.requestScopeFocus(state.currentScopeId, { reason: "uiHealth", force: true })
        break
      case RECOVERY_KINDS.scope:
        uiNav.setActiveScope(state.currentScopeId)
        break
      case RECOVERY_KINDS.actionMap:
        tracker.recoverActionState?.()
        break
      case RECOVERY_KINDS.blocklist:
        tracker.resyncBlocklist?.()
        break
      case RECOVERY_KINDS.bridge:
        bridge?.streamHooks?.resetStreamState?.("uiHealth")
        break
    }
  }

  const diagnose = evaluators => {
    if (!isActionableContext()) return
    // never downgrade terminal failures back to healthy
    if (status.value === HEALTH_STATUS.failed) return
    const state = buildState()
    let suspicious = false
    let recovered = false
    let terminal = false

    for (const evaluate of evaluators) {
      const result = evaluate(state)
      if (!result.suspicious) continue
      suspicious = true
      if (result.terminal) terminal = true
      recordIncident(result)
      if (result.recoverable && canRecover(result.kind)) {
        recover(result.kind, state)
        recordRecovery(result.kind, result.reason)
        recovered = true
      }
    }

    status.value = terminal
      ? HEALTH_STATUS.failed
      : recovered
        ? HEALTH_STATUS.recovering
        : suspicious
          ? HEALTH_STATUS.suspicious
          : HEALTH_STATUS.healthy
    notify()
  }

  const scheduleSettledCheck = () => {
    if (settledScheduled) return
    settledScheduled = true
    nextTick(() => window.requestAnimationFrame(() => {
      settledScheduled = false
      diagnose(SETTLED_EVALUATORS)
    }))
  }

  // throttled to sample on a fixed cadence instead of pushing the deferred check past the end of the burst
  const scheduleDeferredDiagnosis = () => {
    if (deferredTimer) return
    deferredTimer = setTimeout(() => {
      deferredTimer = null
      diagnose(DEFERRED_EVALUATORS)
    }, DEFERRED_DIAGNOSIS_MS)
  }

  // hot-path hook: only bump counters/timestamps and arm the schedulers,
  // rate-limited so analog input does not arm every frame
  const markCanary = kind => {
    counters.canaries++
    if (NAV_CANARIES.has(kind)) lastNavAt = now()
    const t = now()
    if (t - lastArmAt < CANARY_THROTTLE_MS) return
    lastArmAt = t
    scheduleSettledCheck()
    scheduleDeferredDiagnosis()
  }

  // a crashing mod is reloaded from source as recovery
  // unless it exceeds the crash budget within the rolling window
  const reportModCrash = ({ file, instanceId, reload: reloadFn, message } = {}) => {
    const key = MOD_CRASH_BUDGET_SCOPE === MOD_CRASH_BUDGET_SCOPES.instance
      ? (instanceId || file)
      : (file || instanceId)
    if (!key || typeof reloadFn !== "function") return false

    const t = now()
    let entry = modState.get(key)
    if (!entry) {
      entry = { crashes: [], reloads: 0, givenUp: false, lastReloadAt: 0 }
      modState.set(key, entry)
    }
    entry.crashes = entry.crashes.filter(ts => t - ts <= MOD_CRASH_WINDOW_MS)
    entry.crashes.push(t)
    counters.modCrashes++

    const action = decideModRecovery({
      crashCount: entry.crashes.length,
      givenUp: entry.givenUp,
      sinceLastReload: t - entry.lastReloadAt,
    })
    recordIncident({
      kind: RECOVERY_KINDS.mod,
      suspicious: true,
      recoverable: action === MOD_ACTIONS.reload,
      reason: `mod crashed: ${key}${message ? ` (${message})` : ""}`,
    })

    if (action === MOD_ACTIONS.giveUp) {
      entry.givenUp = true
      recordIncident({
        kind: RECOVERY_KINDS.mod,
        suspicious: true,
        recoverable: false,
        reason: `mod crashing too often, stopped reloading: ${key}`,
      })
    }

    if (action !== MOD_ACTIONS.reload) {
      status.value = HEALTH_STATUS.suspicious
      notify()
      return false
    }

    entry.lastReloadAt = t
    entry.reloads++
    counters.modReloads++
    recordRecovery(RECOVERY_KINDS.mod, `reloaded mod ${key}`)
    status.value = HEALTH_STATUS.recovering
    notify()
    Promise.resolve().then(reloadFn).catch(() => {})
    return true
  }

  const addObserver = fn => {
    observers.add(fn)
    return () => observers.delete(fn)
  }
  const removeObserver = fn => observers.delete(fn)

  const snapshot = () => ({
    status: status.value,
    counters: { ...counters },
    lastIncident: lastIncident.value,
    lastRecovery: lastRecovery.value,
    incidents: DEV ? [...incidents.value] : [],
    recoveries: DEV ? [...recoveries.value] : [],
    mods: Object.fromEntries([...modState].map(([key, entry]) => [key, {
      crashes: entry.crashes.length,
      reloads: entry.reloads,
      givenUp: entry.givenUp,
    }])),
    state: initialised && isActionableContext() ? buildState() : null,
  })

  // verify the whole stream subsystem came up at bridge creation
  // wiring fault is unrecoverable (terminal), but stale globals can be self-healed first
  const checkBridgeWiring = () => {
    const sh = bridge?.streamHooks
    const structurallyOk = !!sh
      && typeof sh.getStreamHealth === "function"
      && typeof sh.hookTrigger === "function"
      && typeof sh.install === "function"
      && !!sh.getStreamHealth()?.coordinator

    // if the instance is healthy but the engine globals drifted to a stale instance,
    // reclaim them rather than declaring an unrecoverable failure
    if (structurallyOk && !sh.isInstalled()) {
      console.warn("uiHealth: stream globals not pointing at the live StreamHooks - reinstalling")
      sh.install(true)
    }

    const wired = structurallyOk && sh.isInstalled()
    if (wired) return
    status.value = HEALTH_STATUS.failed
    recordIncident({
      kind: RECOVERY_KINDS.bridge,
      suspicious: true,
      recoverable: false,
      terminal: true,
      reason: "stream bridge not fully wired at init (streamHooks / coordinator / window.streamUpdate missing)",
    })
    notify()
  }

  const init = () => {
    if (initialised) return
    initialised = true

    bridge = useBridge()
    const { events } = bridge
    tracker = useUINavTracker()
    coordinator = getScopeCoordinatorInstance()
    uiNav = getUINavServiceInstance()
    controls = useControlsStore()

    checkBridgeWiring()

    events.on(EVENT_NAMES.gameUiNavigation, () => markCanary(CANARY_KINDS.uinav))
    events.on(EVENT_NAMES.menuActionMapEnabled, value => markCanary(CANARY_KINDS.actionMap, value))
    events.on(EVENT_NAMES.scopeChanged, () => markCanary(CANARY_KINDS.scope))
    events.on(EVENT_NAMES.bridgeStreamSkipped, () => markCanary(CANARY_KINDS.bridge))

    document.addEventListener(EVENT_NAMES.uinavFocus, () => markCanary(CANARY_KINDS.focus))
    document.addEventListener(EVENT_NAMES.uinavBlur, () => markCanary(CANARY_KINDS.blur))

    coordinator.addObserver(eventName => markCanary(CANARY_KINDS.scope, eventName))

    // re-arm diagnosis on route/device/simplemenu changes
    // note: `isControllerUsed` already folds in the simplemenu kbm-rejection policy
    const routeData = useRouteDataStore()
    watch(() => routeData.routeName, () => markCanary(CANARY_KINDS.route))
    watch(() => controls.isControllerUsed, () => markCanary(CANARY_KINDS.controls))
  }

  return {
    status,
    counters,
    incidents,
    recoveries,
    lastIncident,
    lastRecovery,
    init,
    markCanary,
    reportModCrash,
    addObserver,
    removeObserver,
    snapshot,
  }
})

export default useUiHealth
