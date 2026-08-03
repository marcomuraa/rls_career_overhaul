import { SCROLL_ATTR, SCROLL_FORCE_ATTR, SCROLL_EVENT_H, SCROLL_EVENT_V } from "@/services/crossfire"
import { useUINavTracker, useUiNavLabel } from "@/services/uiNavTracker"
import { uniqueId } from "@/services/uniqueId"

const SCROLL_PROP = "__bngUiNavScroll"
// const SCROLL_STRING = "ui.mainmenu.navbar.scroll_label"

function formatDirectiveDebugName(modifiers) {
  if (!__BNG_DEV__) return ""
  const modifierText = Object.keys(modifiers || {})
    .filter(name => modifiers[name])
    .sort()
    .map(name => `.${name}`)
    .join("")
  return `v-bng-ui-nav-scroll${modifierText}`
}

function enableScroll(id, el, source = "") {
  const tracker = useUINavTracker()
  // const labeler = useUiNavLabel()
  tracker.addEvent(SCROLL_EVENT_H, id, el, { source })
  tracker.addEvent(SCROLL_EVENT_V, id, el, { source })
  tracker.addForceUnblock(SCROLL_EVENT_H, id)
  tracker.addForceUnblock(SCROLL_EVENT_V, id)
  // labeler.registerLabel(el, [SCROLL_EVENT_H, SCROLL_EVENT_V], SCROLL_STRING)
}
function disableScroll(id, el) {
  const tracker = useUINavTracker()
  // const labeler = useUiNavLabel()
  tracker.removeEvent(SCROLL_EVENT_H, id, el)
  tracker.removeEvent(SCROLL_EVENT_V, id, el)
  tracker.removeForceUnblock(SCROLL_EVENT_H, id)
  tracker.removeForceUnblock(SCROLL_EVENT_V, id)
  // labeler.clearLabels(el, [SCROLL_EVENT_H, SCROLL_EVENT_V])
}

function isEnabled(value) {
  if (value && typeof value === "object") {
    return value.enabled !== false
  }
  return !(typeof value === "boolean" && value === false)
}

function isForced(value, modifiers) {
  if (modifiers && modifiers.force) return true
  if (value && typeof value === "object" && value.force) return true
  return false
}

function teardown(element) {
  const dir = element[SCROLL_PROP]
  if (!dir) return
  if (dir.focusListenersAttached) {
    element.removeEventListener("focusin", dir.enable)
    element.removeEventListener("focusout", dir.disable)
    dir.focusListenersAttached = false
  }
  if (dir.forced) {
    element.removeAttribute(SCROLL_FORCE_ATTR)
  } else {
    element.removeAttribute(SCROLL_ATTR)
  }
  dir.disable()
}

function setup(element, { value, modifiers }) {
  const prev = element[SCROLL_PROP]
  const enabled = isEnabled(value)
  const forced = isForced(value, modifiers)

  if (prev && prev.enabled === enabled && prev.forced === forced) return

  if (prev) {
    teardown(element)
  }

  const dir = {
    id: prev?.id || uniqueId(SCROLL_PROP),
    enabled,
    forced,
    source: formatDirectiveDebugName(modifiers),
    focusListenersAttached: false,
    enable: null,
    disable: null,
  }
  dir.enable = () => enableScroll(dir.id, element, dir.source)
  dir.disable = () => disableScroll(dir.id, element)
  element[SCROLL_PROP] = dir

  if (!enabled) return

  if (forced) {
    element.setAttribute(SCROLL_FORCE_ATTR, "")
    dir.enable()
  } else {
    element.setAttribute(SCROLL_ATTR, "")
    element.addEventListener("focusin", dir.enable)
    element.addEventListener("focusout", dir.disable)
    dir.focusListenersAttached = true
  }
}

export default {
  mounted(element, binding) {
    setup(element, binding)
  },
  updated(element, binding) {
    setup(element, binding)
  },
  beforeUnmount(element) {
    teardown(element)
    delete element[SCROLL_PROP]
  },
}
