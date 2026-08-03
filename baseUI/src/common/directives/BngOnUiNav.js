import { getUINavHandlers, UI_EVENT_ATTR, isOnOffEvent, checkOn } from "@/services/uiNav"
import { eventDispatcherForElement } from "@/utils/DOM"
// import { default as UINavHandlers, _isOnOffEvent, _checkOn } from "@/services/uiNavHandlers"
import { useUINavTracker } from "@/services/uiNavTracker"
import { useScopedNav } from "@/services/scopedNav/api"

const UINAV_PROP = "__BngOnUiNav"

const dataMatchesUpdate = (data, signature, handler) =>
  data.signature === signature &&
  data.originalHandler === handler

/** determine which element should carry the Nav event handler */
// const _getHandlerElement = element => element.closest(`[${UI_SCOPE_ATTR}]`) || element

/** Attempt to convert a handler to a handler element **/
const _handlerToElement = handler => {
  let element
  switch (typeof handler) {
    case "string":
      element = document.querySelectorAll(handler)[0]
      break
    case "object":
      element = handler
      break
  }
  return element instanceof HTMLElement && element
}

/**
 * Generate a signature for the directive.
 * Do not simplify the verbosity, it is a conflict safeguard for uiNavTracker.
 */
const _generateSignature = (vnode, eventNames, modifiers) =>
  `${UINAV_PROP}[${vnode.ctx.uid}]:` +
  (typeof eventNames === "string" ? eventNames.split(",") : eventNames).sort().join(",") +
  ["", ...Object.keys(modifiers)].sort().join(".")

const _normalizedEvents = eventNames => eventNames === "*" ? [] : eventNames.split(",")

/** Retrieves existing directive data for the element */
const _getDirData = (element, signature) => element[UINAV_PROP]?.find(dir => dir.signature === signature)
const _uniqueEvents = events => [...new Set((events || []).filter(Boolean))]
const _formatDirectiveDebugName = (eventNames, modifiers) => {
  if (!__BNG_DEV__) return ""
  const events = eventNames ? `:${eventNames}` : ""
  const modifierText = Object.keys(modifiers || {})
    .filter(name => modifiers[name])
    .sort()
    .map(name => `.${name}`)
    .join("")
  return `v-bng-on-ui-nav${events}${modifierText}`
}

/** Resolve the scoped nav scope for an element */
let scopedNav
function _resolveScope(element) {
  if (!scopedNav) scopedNav = useScopedNav()
  const scope = scopedNav.getScopeForElement(element)
  return {
    scopeId: scope?.scopeId || null,
    scopeHierarchy: scopedNav.getScopeHierarchy(element),
  }
}

/**
 * Sets up the directive.
 */
function setup(data, element, vnode) {
  if (data.modifiers.asMouse) {
    // get and check for 'fireEvent' and make sure we have an on/off event
    // if (data.eventNames.find(name => !_isOnOffEvent(name))) {
    if (data.eventNames.find(name => !isOnOffEvent(name))) {
      window.BNG_Logger && window.BNG_Logger.error("UINav directive asMouse modifier is only supported for on/off type events", element)
      return
    }
    setupAsMouse(data, vnode)
  }

  // set the handler if it's a function
  // if handler is not a function, the handler will be removed
  if (typeof data.handler === "function") {
    applyUiNav(data, element)
    applyTracker(data, element)
  }
}

/**
 * 'asMouse' modifier handling - will emulate click, mouseup and mousedown if component supports it and event is on/off type
 */
function setupAsMouse(data, vnode) {
  // check if we've been given a 'handler' element/selector
  let handlerElement = _handlerToElement(data.handler)
  if (handlerElement) vnode = { el: handlerElement }

  // retrieve or create an eventFirer
  const eventFirer = vnode.ctx?.exposed?.fireEvent || eventDispatcherForElement(vnode.el)
  // retrieve or create a disabled checker
  const checkElementDisabled = vnode.ctx?.exposed?.getDisabledState || (() => vnode.el.hasAttribute("disabled"))

  // up and down modifiers not applicable with .asMouse
  // FIXME: ^ that's not entirely true, and we can use mouseup/mousedown for this (test on radial menu when implemented)
  delete data.modifiers.down
  delete data.modifiers.up

  data.mousedownActive = false

  data.handler = ({ detail }) => {
    if (checkElementDisabled()) return
    const fromControllerMarker = {
      fromController: detail,
      holdStartedAt: data.holdStartedAt || Date.now(),
    }
    if (detail.value) {
      data.holdStartedAt = fromControllerMarker.holdStartedAt
      eventFirer("mousedown", fromControllerMarker)
      data.mousedownActive = true
    } else {
      eventFirer("mouseup", fromControllerMarker)
      if (data.mousedownActive) {
        data.mousedownActive = false
        eventFirer("click", fromControllerMarker)
      }
      data.holdStartedAt = null
    }
    return !!data.modifiers.bubble
  }
}

/**
 * Applies the UINav tracker to the element.
 */
function applyTracker(data, element) {
  const uiNavTracker = useUINavTracker()
  if (data.modifiers.focusRequired) {
    if (data.focusListenersApplied) {
      const activeElement = document.activeElement
      if (activeElement instanceof Node && (element === activeElement || element.contains(activeElement)) && data.tracked.length < data.eventNames.length) {
        data.eventNames.forEach(name => uiNavTracker.updateEvent(name, data.signature, element, {
          active: data.modifiers.active,
          nogroup: data.modifiers.nogroup,
          source: data.source,
        }))
        data.tracked = [...data.eventNames]
      }
      return
    }
    data.focusListenersApplied = true

    // note: if you experience lost events despite successful programmatic focus, try adding nextTick in your focus code

    // focusin/focusout events are bubbled, so we need to check the relatedTarget
    element.addEventListener("focusin", evt => {
      // untrack similar events from previous element
      const prevDirs = evt.relatedTarget?.[UINAV_PROP]
      if (prevDirs) {
        for (const dir of prevDirs) {
          if (dir.modifiers.focusRequired) {
            dir.tracked.forEach(name => uiNavTracker.removeEvent(name, dir.signature, evt.relatedTarget))
            dir.tracked = []
          }
        }
      }
      const cur = _getDirData(element, data.signature)
      if (!cur) return
      // check if already tracking everything
      if (cur.tracked.length < cur.eventNames.length) {
        // check if it's the same directive scope
        if (element === evt.relatedTarget || element.contains(evt.relatedTarget)) return
      }
      cur.eventNames.forEach(name => uiNavTracker.updateEvent(name, cur.signature, element, {
        active: cur.modifiers.active,
        nogroup: cur.modifiers.nogroup,
        source: cur.source,
      }))
      cur.tracked = [...cur.eventNames]
    })

    element.addEventListener("focusout", evt => {
      // might help with transitions and other temporary focus changes
      if (evt.relatedTarget instanceof Node && element.contains(evt.relatedTarget)) return

      const cur = _getDirData(element, data.signature)
      if (!cur || cur.tracked.length === 0) return
      cur.tracked.forEach(name => uiNavTracker.removeEvent(name, cur.signature, element))
      cur.tracked = []
    })

    // in case the element is already focused (somehow)
    // if (document.activeElement === element) {
    //   data.eventNames.forEach(name => uiNavTracker.addEvent(name, element))
    // }
    const activeElement = document.activeElement
    if (activeElement instanceof Node && (element === activeElement || element.contains(activeElement))) {
      data.eventNames.forEach(name => uiNavTracker.updateEvent(name, data.signature, element, {
        active: data.modifiers.active,
        nogroup: data.modifiers.nogroup,
        source: data.source,
      }))
      data.tracked = [...data.eventNames]
    }
  } else {
    // if not focusRequired - we're listening globally. so we're going to track this right away
    // we're using updateEvent instead of addEvent to gracefully handle situations with multiple global directives on the same element
    data.eventNames.forEach(name => uiNavTracker.updateEvent(name, data.signature, element, {
      active: data.modifiers.active,
      nogroup: data.modifiers.nogroup,
      source: data.source,
    }))
    data.tracked = [...data.eventNames]
  }
}

/**
 * Applies the UINav handler to the element.
 */
function applyUiNav(data, element) {
  // put in the correct 'value' checker
  let valueChecker
  if (data.modifiers.down) {
    // button 'down'
    // valueChecker = _checkOn // anything non-zero
    valueChecker = checkOn // anything non-zero
  } else if (data.modifiers.up) {
    // button 'up'
    valueChecker = 0
  // } else if (!data.modifiers.asMouse && !data.eventNames.find(name => !_isOnOffEvent(name))) {
  } else if (!data.modifiers.asMouse && !data.eventNames.find(name => !isOnOffEvent(name))) {
    // no modifier specified, but it's an on-off event(s), so assume 'down'
    // valueChecker = _checkOn
    valueChecker = checkOn
  }

  // data.uiNavHandler = UINavHandlers.add(
  //   _getHandlerElement(element),
  //   {
  //     name: name => data.eventNames.includes(name),
  //     value: valueChecker,
  //     modified: data.modifiers.modified || false,
  //     focusRequired: data.modifiers.focusRequired ? element : undefined,
  //   },
  //   data.handler,
  //   element,
  // )

  data.uiNavHandler = getUINavHandlers().add(
    element,
    {
      name: name => data.eventNames.includes(name),
      value: valueChecker,
      modified: data.modifiers.modified || false,
      focusRequired: data.modifiers.focusRequired ? element : undefined,
      eventNames: data.eventNames,
      source: data.source || undefined,
    },
    data.handler,
  )

  // this had data.eventNames.join(",") as a value but this value was always overwritten by the next bngOnUiNav directives, so it doesn't makes sense
  element.setAttribute(UI_EVENT_ATTR, "")
}

/**
 * Mounts the directive.
 */
function mounted(element, binding, vnode) {
  const { arg: eventNames, value: handler } = binding
  let { modifiers } = binding
  if (!modifiers) modifiers = {}

  const storage = (element[UINAV_PROP] || (element[UINAV_PROP] = []))

  const signature = _generateSignature(vnode, eventNames, modifiers)

  let data = storage.find(dir => dir.signature === signature)

  if (!data) {
    data = {
      signature,
      eventNames: _normalizedEvents(eventNames),
      modifiers,
      handler,
      originalHandler: handler,
      uiNavHandler: null,
      focusListenersApplied: false,
      mousedownActive: false,
      tracked: [],
      source: binding.source || (binding.dir ? _formatDirectiveDebugName(eventNames, modifiers) : ""),
      ..._resolveScope(element),
    }
    storage.push(data)
  } else if (window.BNG_Logger) {
    window.BNG_Logger.error("Conflicting vBngOnUiNav directive on element", element)
  }

  setup(data, element, vnode)
}

/**
 * Updates the directive with new everything.
 */
function updated(element, binding, vnode) {
  const { arg: eventNames, value: handler } = binding
  let { modifiers } = binding
  if (!modifiers) modifiers = {}

  const signature = _generateSignature(vnode, eventNames, modifiers)
  const data = _getDirData(element, signature)
  if (!data) return
  if (dataMatchesUpdate(data, signature, handler)) return

  if (typeof data.uiNavHandler === "function") {
    getUINavHandlers().remove(element, data.uiNavHandler)
  }

  const normalizedEvents = _normalizedEvents(eventNames)
  const oldEvents = _uniqueEvents([...data.tracked, ...data.eventNames])
  if (oldEvents.length > 0) {
    const uiNavTracker = useUINavTracker()
    oldEvents.forEach(name => uiNavTracker.removeEvent(name, data.signature, element))
    data.tracked = []
  }

  data.eventNames = normalizedEvents
  data.modifiers = modifiers
  data.handler = handler
  data.originalHandler = handler
  data.uiNavHandler = null
  data.source = binding.source || (binding.dir ? _formatDirectiveDebugName(eventNames, modifiers) : "")
  Object.assign(data, _resolveScope(element))

  setup(data, element, vnode)
}

/**
 * Removes all UINav handlers and events from the element to not accidentally leave stale handlers and events.
 * If this behaviour is not wanted, we need to modify the directive and add safeguards against stale handlers.
 */
function dispose(element) {
  const storage = element[UINAV_PROP]
  if (!storage) return

  const uiNavTracker = useUINavTracker()
  // const handlerElement = _getHandlerElement(element)

  storage.forEach(directive => {
    const events = _uniqueEvents([...directive.tracked, ...directive.eventNames])
    if (events.length > 0) {
      events.forEach(name => uiNavTracker.removeEvent(name, directive.signature, element))
      directive.tracked = []
    }
    if (directive.uiNavHandler) {
      getUINavHandlers().remove(element, directive.uiNavHandler)
    }
  })

  element.removeAttribute(UI_EVENT_ATTR)
  delete element[UINAV_PROP]
}

export default {
  mounted,
  updated,
  beforeUnmount: dispose,
  // see also BngOnUiNavFocus.js directive that calls mounted/unmounted
}
