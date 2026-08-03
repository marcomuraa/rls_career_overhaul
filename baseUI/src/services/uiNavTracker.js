import { ref, reactive, computed, onUnmounted, onDeactivated, nextTick } from "vue"
import { defineStore } from "pinia"
import { useBridge } from "@/bridge"
// import { ACTIONS_BY_UI_EVENT, UI_EVENTS, eventFirer } from "@/bridge/libs/UINavEvents"
import { ACTIONS_BY_UI_EVENT, UI_EVENTS, BASE_UI_NAV_EVENTS, getUINavServiceInstance, getUINavScopeRegistry, eventFirer } from "@/services/uiNav"
import { NO_CHILD_NAV_ATTR } from "@/services/crossfire"
import { getScopeCoordinatorInstance, SCOPED_NAV_OBSERVER_EVENTS } from "@/services/scopedNav"
// import useControls from "@/services/controls"
import Logger from "@/services/logger"
import { uniqueId } from "@/services/uniqueId"
import { ExecQueue } from "@/services/queue"
import { hasReportedPopupState } from "@/services/stateReporter"
// import { isVisible } from "@/utils/DOM"
import { isShipping } from "bng:config"

// make those events always active by default
const ALWAYS_ACTIVE = ["ok", "menu", "back"]

const BLOCKER = Symbol("uiNavBlocker")
const NO_CHILD_NAV_SELECTOR = `[${NO_CHILD_NAV_ATTR}="1"], [${NO_CHILD_NAV_ATTR}="true"]`

export const useUINavTracker = defineStore("uiNavTracker", () => {
  const { lua, events } = useBridge()

  const DEBUG = false
  const showErrors = !isShipping()

  let initialised = false
  const trackedEvents = ref([])
  const trackedInstances = {}
  const ignoredEvents = ref([])
  const ignoredInstances = {}
  const blockedEvents = ref([])
  const blockedInstances = {}
  const unblockedEvents = ref([])
  const unblockedInstances = {}
  const activeEvents = ref([])
  const labelRegistry = useUiNavLabel()

  const actionStates = reactive({
    desired: {},
    applied: {},
    syncInFlight: {},
    syncQueued: {},
  })
  const actionSyncQueue = new ExecQueue(0, 1)
  const liveRetryKeys = new Set()
  let menuActionMapRecoveryInFlight = false
  let menuActionMapRecoveryTimer = null
  let menuActionMapEnabled = true
  // TODO: create exclusive context for scopes

  const setActionFlag = (group, eventName, enabled) => {
    if (enabled) {
      actionStates[group][eventName] = true
    } else {
      delete actionStates[group][eventName]
    }
  }

  const isPlayRouteActive = () => typeof window !== "undefined" && window.bngVue?.getCurrentRoute?.().name === "play"
  const canRecoverMenuActionMap = () => hasRealUiOwner() && (hasReportedPopupState() || !isPlayRouteActive())

  function updateBlocklist() {
    const uiNavService = getUINavServiceInstance()
    const unblocked = new Set(unblockedEvents.value)
    const eventsToBlock = blockedEvents.value.filter(name => !unblocked.has(name))
    uiNavService.setBlockedEvents(eventsToBlock)
    // UINAV_BLOCKLIST.splice(0, UINAV_BLOCKLIST.length, ...blockedEvents.value.filter(name => !unblockedEvents.value.includes(name)))
  }

  const isLiveUiElement = element => {
    if (!element || element === BLOCKER || !element.isConnected) return false
    if (element === window.document.body) return true
    // if (element.parentElement?.closest(NO_CHILD_NAV_SELECTOR)) return false
    const noChildNavParent = element.parentElement?.closest(NO_CHILD_NAV_SELECTOR)
    if (noChildNavParent && !element.contains(document.activeElement)) return false
    if (typeof element.getClientRects !== "function") return false
    if (element.getClientRects().length === 0) return false
    const style = window.getComputedStyle(element)
    return style.display !== "none" && style.visibility !== "hidden"
    // return isVisible(element) // doesn't quite work for us
  }

  const hasRealUiOwner = () => {
    if (blockedEvents.value.length > 0) return true
    for (const instances of Object.values(trackedInstances)) {
      if (instances.some(instance =>
        instance.element !== BLOCKER
        && isLiveUiElement(instance.element)
      )) {
        return true
      }
    }
    return false
  }
  const isConnectedInstance = instance => {
    if (!instance) return false
    if (instance.element === BLOCKER) return true
    return !!instance.element?.isConnected
  }
  const removeTrackedEventEntry = eventName => {
    delete trackedInstances[eventName]
    const eventIdx = trackedEvents.value.findIndex(h => h.name === eventName)
    if (eventIdx > -1) {
      trackedEvents.value.splice(eventIdx, 1)
    }
    actionSwitch(false, eventName)
  }

  const pruneHelperState = (eventList, instanceList) => {
    let changed = false
    for (const eventName of Object.keys(instanceList)) {
      if (instanceList[eventName]?.length > 0) {
        if (!eventList.value.includes(eventName)) {
          eventList.value.push(eventName)
          changed = true
        }
        continue
      }
      delete instanceList[eventName]
      changed = true
    }
    for (const eventName of [...eventList.value]) {
      if (instanceList[eventName]?.length > 0) continue
      const eventIdx = eventList.value.indexOf(eventName)
      if (eventIdx > -1) {
        eventList.value.splice(eventIdx, 1)
        changed = true
      }
    }
    return changed
  }

  const pruneTrackerState = () => {
    let changed = false
    let blocklistChanged = false
    if (pruneHelperState(blockedEvents, blockedInstances)) blocklistChanged = true
    if (pruneHelperState(unblockedEvents, unblockedInstances)) blocklistChanged = true
    if (pruneHelperState(ignoredEvents, ignoredInstances)) changed = true

    for (const [eventName, instances] of Object.entries(trackedInstances)) {
      const blockedOwners = new Set(blockedInstances[eventName] || [])
      const nextInstances = instances.filter(instance =>
        isConnectedInstance(instance)
        && (instance.element !== BLOCKER || blockedOwners.has(instance.ownerId))
      )
      if (nextInstances.length === instances.length) continue
      changed = true
      if (nextInstances.length === 0) {
        removeTrackedEventEntry(eventName)
      } else {
        trackedInstances[eventName] = nextInstances
      }
    }

    for (const [eventName, ownerIds] of Object.entries(blockedInstances)) {
      for (const ownerId of ownerIds) {
        const instances = trackedInstances[eventName] || []
        const hasBlockerInstance = instances.some(instance => instance.ownerId === ownerId && instance.element === BLOCKER)
        if (hasBlockerInstance) continue
        addEvent(eventName, ownerId, BLOCKER)
        changed = true
      }
    }

    if (blocklistChanged) updateBlocklist()
    return changed || blocklistChanged
  }

  const cleanupStaleTrackerState = () => {
    const changed = pruneTrackerState()
    if (changed) {
      update()
    }
  }
  const hasControllingInstance = eventName => {
    const instances = trackedInstances[eventName]
    if (!instances || instances.length === 0) return false
    const hasBlockedOwners = (blockedInstances[eventName]?.length || 0) > 0
    return instances.some(instance =>
      (instance.element === BLOCKER && hasBlockedOwners)
      || isLiveUiElement(instance.element)
    )
  }

  const recoverActionMap = async () => {
    if (menuActionMapRecoveryInFlight || menuActionMapEnabled || !canRecoverMenuActionMap()) return
    menuActionMapRecoveryInFlight = true
    try {
      await lua.extensions.core_input_bindings.setMenuActionMapEnabled(true)
      // Lua map was disabled, so applied states are no longer reliable.
      // TODO: see if we need to clear *all* action states or only the ones associated with the main MenuActionMap (see bindings.lua:setMenuActionMapEnabled()
      for (const key of Object.keys(actionStates.applied)) {
        delete actionStates.applied[key]
      }
      for (const key of Object.keys(actionStates.syncQueued)) delete actionStates.syncQueued[key]
      cleanupStaleTrackerState()
      scheduleActionMapRecovery()

      menuActionMapEnabled = true
    } finally {
      menuActionMapRecoveryInFlight = false
    }
  }
  const scheduleActionMapRecovery = () => {
    if (menuActionMapRecoveryTimer) {
      clearTimeout(menuActionMapRecoveryTimer)
    }
    menuActionMapRecoveryTimer = setTimeout(() => {
      menuActionMapRecoveryTimer = null
      recoverActionMap()
    }, 50)
  }

  let updateQueued = false
  function update() {
    if (updateQueued) return
    updateQueued = true
    Promise.resolve().then(() => {
      pruneTrackerState()
      const ignored = new Set(ignoredEvents.value)
      const blocked = new Set(blockedEvents.value)
      const unblocked = new Set(unblockedEvents.value)
      activeEvents.value = trackedEvents.value.reduce((res, e) => {
        if (
          ignored.has(e.name)
          || (!unblocked.has(e.name) && blocked.has(e.name))
        ) {
          return res
        }

        const recentInstance = getRecentInstance(e.name)
        res.push({
          ...e,
          element: recentInstance?.element || null,
          nogroup: !!recentInstance?.nogroup,
        })
        return res
      }, [])
      updateQueued = false
    })
  }

  const ownerIdCheck = ownerId => {
    if (typeof ownerId !== "string" || !ownerId) {
      throw new Error("ownerId is required and must be a string")
    }
  }
  // TODO: upgrade to error
  const eventNameCheck = (eventName, quiet = false) => {
    let ok = true
    if (typeof eventName !== "string" || !eventName) {
      showErrors && Logger.error("eventName is required")
      ok = false
    } else if (!(eventName in ACTIONS_BY_UI_EVENT)) {
      showErrors && !quiet && Logger.error(`eventName ${eventName} does not exist`)
      ok = false
    }
    return ok
  }

  // when several owners bind an event, prefer the live one; else the last owner
  // scans owners with isLiveUiElement (layout reads); cache per update() if an event ever gets many owners
  const getRecentInstance = eventName => {
    const instances = trackedInstances[eventName]
    if (!instances) return undefined
    return instances.findLast(inst => inst.element !== BLOCKER && isLiveUiElement(inst.element))
      ?? instances.findLast(inst => inst.element !== BLOCKER)
  }
  const parseActive = (active, eventName) => typeof active === "boolean" ? active : ALWAYS_ACTIVE.includes(eventName)
  const getLiveRetryKey = (eventName, ownerId) => `${eventName}:${ownerId}`
  const scheduleLiveRetry = (eventName, ownerId, element) => {
    if (!element || element === BLOCKER || isLiveUiElement(element)) return
    const retryKey = getLiveRetryKey(eventName, ownerId)
    if (liveRetryKeys.has(retryKey)) return
    liveRetryKeys.add(retryKey)
    nextTick(() => {
      window.requestAnimationFrame(() => {
        liveRetryKeys.delete(retryKey)
        const instance = trackedInstances[eventName]?.find(instance => instance.ownerId === ownerId)
        if (!instance || !isLiveUiElement(instance.element)) return
        actionSwitch(true, eventName)
        update(eventName)
        recoverActionMap()
      })
    })
  }

  function addEvent(eventName, ownerId, element = null, options = {}) {
    // it is here because on first UI open MenuActionMapEnabled happens after addEvent calls
    // this is normal behaviour but we need to address this, so here it is
    if (!initialised) rebind()

    if (!eventNameCheck(eventName)) return

    ownerIdCheck(ownerId)

    if (!trackedInstances[eventName]) trackedInstances[eventName] = []
    if (!element) element = window.document.body
    // if (instances[eventName].includes(element)) return // might be useful to ignore .up/.down modifier bindings
    const instance = trackedInstances[eventName].find(instance => instance.ownerId === ownerId)
    if (instance) {
      // DEBUG && Logger.log("already exists", eventName, ownerId, element)
      // here we're still updating the element despite not being called from updateEvent
      const nogroup = !!options?.nogroup
      const active = parseActive(options?.active, eventName)
      const source = options?.source || ""
      const changed = instance.element !== element
        || instance.nogroup !== nogroup
        || instance.active !== active
        || instance.source !== source
      instance.element = element
      instance.nogroup = nogroup
      instance.active = active
      instance.source = source
      actionSwitch(true, eventName)
      if (changed) update(eventName)
      if (isLiveUiElement(instance.element)) {
        recoverActionMap()
      } else {
        scheduleLiveRetry(eventName, ownerId, instance.element)
      }
      return
    }
    trackedInstances[eventName].push({
      ownerId,
      element,
      nogroup: !!options?.nogroup,
      active: parseActive(options?.active, eventName),
      source: options?.source || "",
    })
    DEBUG && Logger.log("added event", eventName, trackedInstances[eventName].length, element)
    if (trackedInstances[eventName].length === 1) {
      const event = {
        name: eventName,
        label: computed(() => {
          const instance = getRecentInstance(eventName)
          return labelRegistry.getLabel(eventName, instance?.element) || null
        }),
        action: computed(() => {
          const instance = getRecentInstance(eventName)
          // note: don't forget that eventFirer returns a function that expects either a PointerEvent or a value
          return instance?.active ? eventFirer(eventName) : null
        }),
      }
      trackedEvents.value.push(event)
      DEBUG && Logger.log("ACTIVATED event", eventName)
    }
    actionSwitch(true, eventName)
    update(eventName)
    if (isLiveUiElement(element)) {
      recoverActionMap()
    } else {
      scheduleLiveRetry(eventName, ownerId, element)
    }
  }

  // this supposed to be called for focusRequired only
  function updateEvent(eventName, ownerId, element, options = {}) {
    ownerIdCheck(ownerId)
    if (!eventNameCheck(eventName)) return
    if (!element) element = window.document.body
    const instanceIndex = trackedInstances[eventName]?.findIndex(instance => instance.ownerId === ownerId) ?? -1
    const instance = instanceIndex > -1 ? trackedInstances[eventName][instanceIndex] : null
    if (!instance) {
      addEvent(eventName, ownerId, element, options)
      return
    }
    const nogroup = !!options?.nogroup
    const active = parseActive(options?.active, eventName)
    const source = options?.source || ""
    const isMostRecent = trackedInstances[eventName][trackedInstances[eventName].length - 1] === instance
    const changed = instance.element !== element
      || instance.nogroup !== nogroup
      || instance.active !== active
      || instance.source !== source
      || !isMostRecent
    actionSwitch(true, eventName)
    scheduleLiveRetry(eventName, ownerId, element)
    if (!changed) return
    instance.element = element
    instance.nogroup = nogroup
    instance.active = active
    instance.source = source
    // focus-driven updates should become the most recent real UI owner
    // otherwise getRecentInstance() will read outdated labels
    trackedInstances[eventName].splice(instanceIndex, 1)
    trackedInstances[eventName].push(instance)

    update(eventName)
  }

  function removeEvent(eventName, ownerId, element = null) {
    ownerIdCheck(ownerId)
    if (!eventNameCheck(eventName)) return
    if (!trackedInstances[eventName]) return
    const hasExplicitElement = arguments.length >= 3
    if (!element) element = window.document.body

    // Prefer exact owner+element removal, but fall back to owner-only.
    // Some focus/update flows move the tracked element before stale blur/unmount
    // callbacks fire, so strict matching can leave orphaned instances behind.
    let idx = trackedInstances[eventName].findIndex(instance =>
      instance.ownerId === ownerId
      && (!hasExplicitElement || instance.element === element)
    )
    if (idx === -1) {
      idx = trackedInstances[eventName].findIndex(instance => instance.ownerId === ownerId)
    }
    if (idx === -1) return

    trackedInstances[eventName].splice(idx, 1)
    DEBUG && Logger.log("removed event", eventName, trackedInstances[eventName].length, element)
    update(eventName)

    if (trackedInstances[eventName].length === 0) {
      delete trackedInstances[eventName]
      const idx = trackedEvents.value.findIndex(h => h.name === eventName)
      if (idx > -1) {
        trackedEvents.value.splice(idx, 1)
        DEBUG && Logger.log("DEACTIVATED event", eventName)
      }
      actionSwitch(false, eventName)
    }
  }

  function addHelper(eventList, instanceList, eventName, ownerId, quiet = false) {
    ownerIdCheck(ownerId)
    if (!eventNameCheck(eventName, quiet)) return false
    if (!instanceList[eventName]) instanceList[eventName] = []
    // avoiding duplicates
    if (instanceList[eventName].includes(ownerId)) return false
    instanceList[eventName].push(ownerId)
    if (!eventList.value.includes(eventName)) {
      eventList.value.push(eventName)
    }
    return true
  }

  function removeHelper(eventList, instanceList, eventName, ownerId, quiet = false) {
    ownerIdCheck(ownerId)
    if (!eventNameCheck(eventName, quiet)) return false
    if (!(eventName in instanceList)) return false
    const instIdx = instanceList[eventName].indexOf(ownerId)
    if (instIdx === -1) return false

    instanceList[eventName].splice(instIdx, 1)

    if (instanceList[eventName].length === 0) {
      const idx = eventList.value.indexOf(eventName)
      if (idx > -1) {
        eventList.value.splice(idx, 1)
      }
      delete instanceList[eventName]
    }
    return true
  }

  function addIgnore(eventName, ownerId) {
    if (!addHelper(ignoredEvents, ignoredInstances, eventName, ownerId, true)) return
    update(eventName)
    DEBUG && Logger.log("added ignore", eventName)
  }

  function removeIgnore(eventName, ownerId) {
    if (!removeHelper(ignoredEvents, ignoredInstances, eventName, ownerId, true)) return
    update(eventName)
    DEBUG && Logger.log("removed ignore", eventName)
  }

  function addBlocker(eventName, ownerId) {
    if (!addHelper(blockedEvents, blockedInstances, eventName, ownerId)) return
    addEvent(eventName, ownerId, BLOCKER)
    updateBlocklist() // must go after addEvent
    DEBUG && Logger.log("added blocker", eventName)
  }

  function removeBlocker(eventName, ownerId) {
    if (!removeHelper(blockedEvents, blockedInstances, eventName, ownerId)) return
    removeEvent(eventName, ownerId, BLOCKER)
    updateBlocklist()
    DEBUG && Logger.log("removed blocker", eventName)
  }

  function addForceUnblock(eventName, ownerId) {
    if (!addHelper(unblockedEvents, unblockedInstances, eventName, ownerId)) return
    update(eventName)
    updateBlocklist()
    DEBUG && Logger.log("added unblocker", eventName)
  }

  function removeForceUnblock(eventName, ownerId) {
    if (!removeHelper(unblockedEvents, unblockedInstances, eventName, ownerId)) return
    update(eventName)
    updateBlocklist()
    DEBUG && Logger.log("removed unblocker", eventName)
  }

  const getEventOwnerDebugInfo = eventName => {
    pruneTrackerState()
    const toTrackedOwnerDebug = instance => {
      const ownerId = instance?.ownerId || ""
      const element = instance?.element
      const isBlocker = element === BLOCKER
      const connected = !!element?.isConnected
      const live = __BNG_DEV__ ? (isBlocker ? true : isLiveUiElement(element)) : connected
      const label = __BNG_DEV__ && !isBlocker ? labelRegistry.getElementLabel(eventName, element) : null
      return {
        ownerId,
        isBlocker,
        connected,
        live,
        label,
        element: __BNG_DEV__ ? element : null,
        source: instance?.source || "",
      }
    }
    if (!eventNameCheck(eventName, true)) {
      return {
        actionLabel: null,
        tracked: [],
        trackedDetails: [],
        blocked: [],
        unblocked: [],
        ignored: [],
      }
    }
    const tracked = trackedInstances[eventName] || []
    const recentInstance = __BNG_DEV__ ? getRecentInstance(eventName) : null
    return {
      actionLabel: __BNG_DEV__ ? labelRegistry.getLabel(eventName, recentInstance?.element) || null : null,
      tracked: tracked.map(instance => instance.ownerId),
      trackedDetails: tracked.map(toTrackedOwnerDebug),
      blocked: [...(blockedInstances[eventName] || [])],
      unblocked: [...(unblockedInstances[eventName] || [])],
      ignored: [...(ignoredInstances[eventName] || [])],
    }
  }

  const syncEventState = async eventName => {
    if (eventName === "menu") return
    if (!eventNameCheck(eventName, true)) return
    if (actionStates.syncInFlight[eventName]) {
      setActionFlag("syncQueued", eventName, true)
      return
    }
    const hasTrackedInstances = hasControllingInstance(eventName)
    const shouldEnableFromState = hasTrackedInstances || blockedEvents.value.includes(eventName)
    const canEnableNow = menuActionMapEnabled || hasRealUiOwner()
    const shouldEnable = shouldEnableFromState && canEnableNow
    setActionFlag("desired", eventName, shouldEnable)
    if (actionStates.applied[eventName] === shouldEnable) return
    setActionFlag("syncInFlight", eventName, true)
    try {
      await lua.extensions.core_input_bindings.setMenuActionEnabled(shouldEnable, ACTIONS_BY_UI_EVENT[eventName])
      actionStates.applied[eventName] = shouldEnable
    } catch (err) {
      actionStates.applied[eventName] = !shouldEnable
      throw err
    } finally {
      setActionFlag("syncInFlight", eventName, false)
      const queued = !!actionStates.syncQueued[eventName]
      setActionFlag("syncQueued", eventName, false)
      const hasLatestTrackedInstances = hasControllingInstance(eventName)
      const latestDesiredFromState = hasLatestTrackedInstances || blockedEvents.value.includes(eventName)
      const latestCanEnableNow = menuActionMapEnabled || hasRealUiOwner()
      const latestDesired = latestDesiredFromState && latestCanEnableNow
      setActionFlag("desired", eventName, latestDesired)
      if (queued || actionStates.applied[eventName] !== latestDesired) {
        syncEventState(eventName)
      }
    }
  }

  const actionSwitch = (enabled, eventName) => {
    // "menu" and "gameplay_interact" are not on MenuIndependent action maps,
    // so they cannot be toggled via setMenuActionEnabled
    if (eventName === "menu" || eventName === "gameplay_interact") return
    if (!eventNameCheck(eventName, true)) return
    const desired = !!actionStates.desired[eventName]
    const needsSync = actionStates.applied[eventName] !== enabled
      || !!actionStates.syncInFlight[eventName]
      || !!actionStates.syncQueued[eventName]
    if (desired === enabled && !needsSync) return
    setActionFlag("desired", eventName, enabled)
    const syncKey = `action-sync:${eventName}`
    actionSyncQueue.enqueue(
      syncKey,
      () => syncEventState(eventName),
      [],
      {
        [syncKey]: actionSyncQueue.resolution.replaceWithResolve,
      },
      null,
      err => {
        showErrors && Logger.error(`Failed to sync action state for ${eventName}`, err)
      }
    )
  }

  function rebind() {
    if (!initialised) {
      initialised = true
      // UINAV_BLOCKLIST.splice(0) // just in case
      const uiNavService = getUINavServiceInstance()
      uiNavService.clearBlockedEvents()
    }
    // re-register tracked things
    const trackedNames = new Set(trackedEvents.value.map(({ name }) => name))
    trackedNames.forEach(name => actionSwitch(true, name))
    // force unbind all untracked events // FIXME: this thing should be in lua
    const otherEvents = Object.keys(ACTIONS_BY_UI_EVENT)
      .filter(name => !trackedNames.has(name))
    otherEvents.forEach(name => actionSwitch(false, name))
  }
  const handleMenuActionMapEnabled = enabled => {
    menuActionMapEnabled = enabled
    if (enabled && menuActionMapRecoveryTimer) {
      clearTimeout(menuActionMapRecoveryTimer)
      menuActionMapRecoveryTimer = null
    }
    if (!enabled) {
      // Lua map was disabled, so applied states are no longer reliable.
      for (const key of Object.keys(actionStates.applied)) {
        delete actionStates.applied[key]
      }
      for (const key of Object.keys(actionStates.syncQueued)) delete actionStates.syncQueued[key]
      cleanupStaleTrackerState()
      scheduleActionMapRecovery()
      return
    }
    // pair with setMenuActionMapEnabled behaviour in bindings.lua
    // for (const name of Object.keys(ACTIONS_BY_UI_EVENT)) {
    //   if (name === "menu" || name === "gameplay_interact") continue
    //   actionStates.applied[name] = true
    // }
    rebind()
  }

  lua.extensions.core_input_bindings.getMenuActionMapEnabled().then(handleMenuActionMapEnabled)
  events.on("MenuActionMapEnabled", handleMenuActionMapEnabled)

  // enable any event whose owner has since become live
  const reevaluatePendingEvents = () => {
    let anyRecovered = false
    for (const { name } of trackedEvents.value) {
      if (actionStates.desired[name]) continue
      // match syncEventState: enable when any owner instance is live, not just the representative one
      if (!hasControllingInstance(name)) continue
      actionSwitch(true, name)
      anyRecovered = true
    }
    if (anyRecovered) {
      update()
      recoverActionMap()
    }
  }
  const hasPendingEnable = () => trackedEvents.value.some(({ name }) => !actionStates.desired[name])

  getScopeCoordinatorInstance().addObserver(eventName => {
    if (eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeNavigationStateApplied) {
      if (hasPendingEnable()) reevaluatePendingEvents()
      return
    }

    // when scope activates, its focus is placed a few async steps later, so defer past nextTick + rAF
    if (eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeActivated) {
      nextTick(() => window.requestAnimationFrame(reevaluatePendingEvents))
    }
  })

  // when focus moves into an already-active scope, which scope activation trigger doesn't cover
  document.addEventListener("uinav-focus", () => hasPendingEnable() && reevaluatePendingEvents())

  return {
    /** All active events. */
    activeEvents,
    /** All blocked events. */
    blockedEvents,
    /** All unblocked events. */
    unblockedEvents,
    /** Adds an event to the tracker. */
    addEvent,
    /** Updates an event in the tracker. */
    updateEvent,
    /** Removes an event from the tracker. */
    removeEvent,
    /** Do not use as is! It is made for BngBinding. */
    addIgnore,
    /** Do not use as is! It is made for BngBinding. */
    removeIgnore,
    /** Do not use as is! Use useUINavBlocker composable instead. */
    addBlocker,
    /** Do not use as is! Use useUINavBlocker composable instead. */
    removeBlocker,
    /** Prevents the event from being blocked. */
    addForceUnblock,
    /** Removes the event from being unblocked. */
    removeForceUnblock,
    /** Debug only: desired/applied/sync state by action. */
    actionStates,
    /** Debug only: owner IDs associated with a given event. */
    getEventOwnerDebugInfo,
    /** Health hook: re-enable pending events and recover the menu action map. */
    recoverActionState: () => {
      reevaluatePendingEvents()
      recoverActionMap()
    },
    /** Health hook: re-apply the computed blocklist onto the UINav service. */
    resyncBlocklist: updateBlocklist,
    /** Health hook: whether the menu action map is currently enabled. */
    isMenuActionMapEnabled: () => menuActionMapEnabled,
  }
})

export function useUINavBlocker() {
  const id = uniqueId("uiNavBlocker")
  const tracker = useUINavTracker()
  // const Controls = useControls()
  const allEventNames = Object.keys(ACTIONS_BY_UI_EVENT)
  const defaultEvents = Object.freeze(Object.fromEntries(BASE_UI_NAV_EVENTS.map(name => [name, name])))
  const allEvents = Object.freeze(UI_EVENTS)
  const blockedEvents = []
  const unblockedEvents = []

  const filterEvents = events => {
    if (!events) return []
    if (typeof events === "string") events = [events]
    else if (events.length === 0) return []
    return events.reduce((res, name) => allEventNames.includes(name) && !res.includes(name) ? [...res, name] : res, [])
  }

  function allowOnly(events = []) {
    events = filterEvents(events)
    // if (events.length === 0) Logger.warn("Empty events list provided, will block all events.")
    blockOnly(allEventNames.filter(name => !events.includes(name)))
  }

  function allowNavigationOnly(enforce = true) {
    if (!enforce) return blockOnly()
    const events = [...BASE_UI_NAV_EVENTS, "menu"]
    // if (!Controls.isControllerAvailable) events.push("menu")
    blockOnly(allEventNames.filter(name => !events.includes(name)))
  }

  function blockOnly(events = []) {
    events = filterEvents(events)
    blockedEvents.filter(name => !events.includes(name)).forEach(name => tracker.removeBlocker(name, id))
    blockedEvents.splice(0)
    blockedEvents.push(...events)
    blockedEvents.forEach(name => tracker.addBlocker(name, id))
  }

  function ensureNoBlock(events = []) {
    events = filterEvents(events)
    unblockedEvents.filter(name => !events.includes(name)).forEach(name => tracker.removeForceUnblock(name, id))
    unblockedEvents.splice(0)
    unblockedEvents.push(...events)
    events.forEach(name => tracker.addForceUnblock(name, id))
  }

  function isBlocked(eventName) {
    if (tracker.unblockedEvents.includes(eventName)) return false
    return tracker.blockedEvents.includes(eventName)
  }

  const clear = () => {
    blockOnly()
    ensureNoBlock()
  }

  onDeactivated(clear)
  onUnmounted(clear)

  return {
    allEvents,
    /** Navigation events that are bound by default. */
    defaultEvents,
    /** Allows only listed events. Will override blockOnly. */
    allowOnly,
    /** Allows only default navigation events. Will override blockOnly. Use boolean argument to enable or disable. Default: true. */
    allowNavigationOnly,
    /** Block only listed events. Will override allowOnly. */
    blockOnly,
    /** Clears all the blocks on this instance. Usually you don't need to call this, because blocks are cleared on unmount. */
    clear,
    /** Prevent blocking listed events. Overrides all blocks. */
    ensureNoBlock,
    /** Returns true if the event is blocked. Not limited to this instance. */
    isBlocked,
  }
}

export const useUiNavLabel = defineStore("uiNavLabeler", () => {
  const elementLabels = reactive(new WeakMap())
  const eventElements = reactive({})
  const labelRevision = ref(0)

  function trackLabelRevision() {
    return labelRevision.value
  }

  function registerLabel(element, eventNames, label) {
    if (!elementLabels.has(element)) {
      elementLabels.set(element, {})
    }
    const elementEvents = elementLabels.get(element)
    if (!Array.isArray(eventNames)) eventNames = [eventNames]
    let changed = false
    for (const eventName of eventNames) {
      if (elementEvents[eventName] !== label) changed = true
      elementEvents[eventName] = label
      if (!eventElements[eventName]) {
        eventElements[eventName] = new Set()
      }
      eventElements[eventName].add(element)
    }
    if (changed) labelRevision.value++
  }

  function clearLabels(element, eventNames = null) {
    if (!elementLabels.has(element)) return
    const elementEvents = elementLabels.get(element)
    let changed = false
    if (eventNames === null) {
      for (const eventName of Object.keys(elementEvents)) {
        if (eventElements[eventName]) {
          eventElements[eventName].delete(element)
        }
      }
      changed = Object.keys(elementEvents).length > 0
      elementLabels.delete(element)
    } else {
      if (!Array.isArray(eventNames)) eventNames = [eventNames]
      for (const eventName of eventNames) {
        if (eventName in elementEvents) changed = true
        delete elementEvents[eventName]
        if (eventElements[eventName]) {
          eventElements[eventName].delete(element)
        }
      }
      if (Object.keys(elementEvents).length === 0) {
        elementLabels.delete(element)
      }
    }
    if (changed) labelRevision.value++
  }

  function getLabel(eventName, element = null) {
    // read revision through a function call so bundled builds keep the reactive ref access.
    trackLabelRevision()

    //1// first, use the label closest to the element that would handle the event
    try {
      const scopeRegistry = getUINavScopeRegistry()
      const receiver = scopeRegistry?.getFirstReceiverElement?.(eventName) || null
      if (receiver) {
        let current = receiver
        while (current) {
          const label = elementLabels.get(current)?.[eventName]
          if (label) return label
          current = current.parentElement
        }
      }
    } catch { }

    //2// then try the exact element passed by the caller
    const elementLabel = getElementLabel(eventName, element, false)
    if (elementLabel) return elementLabel

    //3// finally, use a loose label only when it is the only connected candidate
    //    multiple candidates are ambiguous, so the caller can use its default
    if (eventElements[eventName]) {
      let onlyConnected = null
      let connectedCount = 0
      for (const el of eventElements[eventName]) {
        if (el?.isConnected) {
          connectedCount++
          onlyConnected = el
          if (connectedCount > 1) break
        }
      }
      if (connectedCount === 1) {
        return elementLabels.get(onlyConnected)?.[eventName] || null
      }
    }

    return null
  }

  function getElementLabel(eventName, element = null, includeAncestors = true) {
    trackLabelRevision()
    let current = element && typeof element === "object" ? element : null
    while (current) {
      const label = elementLabels.get(current)?.[eventName]
      if (label) return label
      if (!includeAncestors) break
      current = current.parentElement || null
    }
    return null
  }

  function getElementEvents(element) {
    if (!elementLabels.has(element)) return []
    return Object.keys(elementLabels.get(element))
  }

  return {
    registerLabel,
    clearLabels,
    getLabel,
    getElementLabel,
    getElementEvents,
    labelRevision,
  }
})
