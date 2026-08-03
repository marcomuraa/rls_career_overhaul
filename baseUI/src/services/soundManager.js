import { lua } from "@/bridge"

const REGISTRY = new WeakMap()
const EVENTS_FILTER = new WeakMap()
const EVENT_MUTES = new WeakMap()
const OWNER_CACHE = new WeakMap()

const STOPPED = "__bngSoundStopped"
const HOVER_SOUND_MOVE_WINDOW = 180

const events = {
  // dom_event: "event_in_sound_class"
  click: "click",
  // mousedown: "click",
  dblclick: "dblclick",
  focus: "focus",
  mouseenter: "mouseenter",
}
const SUPPORTED_EVENTS = new Set(Object.values(events))
const DOM_EVENTS = Object.keys(events)
// let the owner listener handle playback for these events to avoid duplicates
const DEFER_TO_OWNER_LISTENER = ["click", "dblclick", "mouseenter"]

let hasMouseTracker = false
let lastMouseMoveAt = 0
let ownerCacheGeneration = 0

function onMouseMove() {
  lastMouseMoveAt = Date.now()
}

function ensureMouseTracker() {
  if (hasMouseTracker || typeof window === "undefined") return
  lastMouseMoveAt = Date.now()
  window.addEventListener("mousemove", onMouseMove, { capture: true, passive: true })
  hasMouseTracker = true
}

function invalidateOwnerCache() {
  ownerCacheGeneration += 1
}

function isRegistered(el) {
  return REGISTRY.has(el) && !el[STOPPED]
}

function isEventEnabled(el, eventName) {
  const filteredEvents = EVENTS_FILTER.get(el)
  if (!filteredEvents) return true
  return filteredEvents.has(eventName)
}

function getOwnerCacheEntry(el) {
  let entry = OWNER_CACHE.get(el)
  if (!entry || entry.generation !== ownerCacheGeneration) {
    entry = { generation: ownerCacheGeneration, byEvent: new Map() }
    OWNER_CACHE.set(el, entry)
  }
  return entry
}

function computeOwnerForEvent(el, eventName) {
  let ancestor = el.parentElement
  while (ancestor) {
    if (isRegistered(ancestor) && isEventEnabled(ancestor, eventName)) {
      return ancestor
    }
    ancestor = ancestor.parentElement
  }
  if (isRegistered(el) && isEventEnabled(el, eventName)) return el
  return null
}

function resolveOwnerForEvent(el, eventName) {
  const entry = getOwnerCacheEntry(el)
  if (entry.byEvent.has(eventName)) return entry.byEvent.get(eventName)
  const owner = computeOwnerForEvent(el, eventName)
  entry.byEvent.set(eventName, owner)
  return owner
}

function shouldSkipEventForOwner(owner, eventName, options = {}) {
  if (!owner) return true
  if (isEventMuted(owner, eventName) && !options.ignoreMute) return true
  return false
}

function isEventMuted(el, eventName) {
  const mutedEvents = EVENT_MUTES.get(el)
  return mutedEvents && mutedEvents.has(eventName)
}

function getEnabledEventsFromModifiers(modifiers = {}) {
  const activeModifiers = Object.keys(modifiers).filter(key => modifiers[key])
  if (activeModifiers.length === 0) return null
  const filteredEvents = activeModifiers.filter(eventName => eventName in events)
  if (filteredEvents.length === 0) return null
  return new Set(filteredEvents)
}

// ---------- Public API ----------

export const SOUND_DOM_EVENTS = DOM_EVENTS
export const SOUND_EVENT_LISTENER_OPTIONS = {
  click: { capture: true },
  dblclick: { capture: true },
}

export function registerSoundClass(el, soundClass) {
  ensureMouseTracker()
  if (!el) return
  delete el[STOPPED]
  if (soundClass) {
    REGISTRY.set(el, soundClass)
  } else {
    REGISTRY.delete(el)
  }
  invalidateOwnerCache()
}

export function unregisterSoundClass(el) {
  if (!el) return
  REGISTRY.delete(el)
  EVENTS_FILTER.delete(el)
  EVENT_MUTES.delete(el)
  el[STOPPED] = true
  invalidateOwnerCache()
}

export function setEnabledEvents(el, modifiers) {
  if (!el) return
  EVENTS_FILTER.set(el, getEnabledEventsFromModifiers(modifiers))
  invalidateOwnerCache()
}

export function getEnabledDOMEvents(el) {
  const filteredEvents = EVENTS_FILTER.get(el)
  if (!filteredEvents) return DOM_EVENTS
  return [...filteredEvents]
}

export function setEventMute(el, eventName, shouldMute) {
  if (!el || !eventName) return
  if (shouldMute) {
    const mutedEvents = EVENT_MUTES.get(el) || new Set()
    mutedEvents.add(eventName)
    EVENT_MUTES.set(el, mutedEvents)
    return
  }
  const mutedEvents = EVENT_MUTES.get(el)
  if (!mutedEvents) return
  mutedEvents.delete(eventName)
  if (mutedEvents.size === 0) {
    EVENT_MUTES.delete(el)
  }
}

export function getDomEventName(realEventName) {
  return events[realEventName] || null
}

export function isHoverSoundFromRecentMove(ev) {
  if (ev.type !== "mouseenter") return true
  return Date.now() - lastMouseMoveAt <= HOVER_SOUND_MOVE_WINDOW
}

export function shouldDeferToOwnerListener(eventName) {
  return DEFER_TO_OWNER_LISTENER.includes(eventName)
}

export function resolveSoundOwner(el, eventName) {
  if (!el || !eventName) return null
  return resolveOwnerForEvent(el, eventName)
}

export function playSoundEvent(el, eventName, options = {}) {
  if (!el || !eventName) return false
  if (!SUPPORTED_EVENTS.has(eventName)) return false
  const owner = resolveOwnerForEvent(el, eventName)
  if (!owner) return false
  if (shouldSkipEventForOwner(owner, eventName, options)) return false
  const soundClass = REGISTRY.get(owner)
  if (!soundClass) return false
  lua.ui_audio.playEventSound(soundClass, eventName)
  return true
}
