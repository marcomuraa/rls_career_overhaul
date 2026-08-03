import { nextTick } from "vue"
import {
  SOUND_DOM_EVENTS,
  SOUND_EVENT_LISTENER_OPTIONS,
  registerSoundClass,
  unregisterSoundClass,
  setEnabledEvents,
  getEnabledDOMEvents,
  resolveSoundOwner,
  playSoundEvent,
  getDomEventName,
  isHoverSoundFromRecentMove,
  shouldDeferToOwnerListener,
} from "@/services/soundManager"

const ID_STOP = "__bngSoundStop"
// note: nextTick and ID_STOP is here to be able to catch click event on a disappearing element
//       because vue cleans up events a bit early

function updateEventListeners(el) {
  const enabledEvents = new Set(getEnabledDOMEvents(el))
  for (const eventName of SOUND_DOM_EVENTS) {
    el.removeEventListener(eventName, handler, SOUND_EVENT_LISTENER_OPTIONS[eventName] || false)
  }
  for (const eventName of enabledEvents) {
    el.addEventListener(eventName, handler, SOUND_EVENT_LISTENER_OPTIONS[eventName] || false)
  }
}

function cleanupElement(el) {
  delete el[ID_STOP]
  unregisterSoundClass(el)
  for (const eventName of SOUND_DOM_EVENTS) {
    el.removeEventListener(eventName, handler, SOUND_EVENT_LISTENER_OPTIONS[eventName] || false)
  }
}

function handler(ev) {
  const el = ev.currentTarget
  if (!el) return
  const eventName = getDomEventName(ev.type)
  if (eventName && isHoverSoundFromRecentMove(ev)) {
    const owner = resolveSoundOwner(el, eventName)
    if (owner) {
      if (owner === el || !shouldDeferToOwnerListener(eventName)) {
        playSoundEvent(el, eventName)
      }
    }
  }
  if (el[ID_STOP]) {
    cleanupElement(el)
  }
}

function applyBinding(el, binding) {
  registerSoundClass(el, binding.value || null)
  setEnabledEvents(el, binding.modifiers)
}

export default {
  mounted: (el, binding) => {
    delete el[ID_STOP]
    applyBinding(el, binding)
    nextTick(() => {
      updateEventListeners(el)
    })
  },
  updated: (el, binding) => {
    applyBinding(el, binding)
    updateEventListeners(el)
  },
  unmounted: el => {
    unregisterSoundClass(el)
    el[ID_STOP] = true
  },
}
