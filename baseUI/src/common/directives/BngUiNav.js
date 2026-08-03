import { BASE_UI_NAV_EVENTS } from "@/services/uiNav"
import { useUINavTracker } from "@/services/uiNavTracker"
import { uniqueId } from "@/services/uniqueId"

const UINAV_PROP = "__BngUiNav"

function formatDirectiveDebugName() {
  if (!__BNG_DEV__) return ""
  return "v-bng-ui-nav"
}

function isEnabled(value) {
  if (value && typeof value === "object") return value.enabled !== false
  return value !== false
}

function enable(dir, element) {
  const tracker = useUINavTracker()
  BASE_UI_NAV_EVENTS.forEach(name => tracker.addEvent(name, dir.id, element, { source: dir.source }))
}

function disable(dir, element) {
  const tracker = useUINavTracker()
  BASE_UI_NAV_EVENTS.forEach(name => tracker.removeEvent(name, dir.id, element))
}

function setup(element, binding) {
  const enabled = isEnabled(binding.value)
  let dir = element[UINAV_PROP]

  if (!dir) {
    dir = {
      id: uniqueId(UINAV_PROP),
      enabled: false,
      source: formatDirectiveDebugName(),
    }
    element[UINAV_PROP] = dir
  }

  if (dir.enabled === enabled) return

  dir.enabled = enabled
  if (enabled) {
    enable(dir, element)
  } else {
    disable(dir, element)
  }
}

function dispose(element) {
  const dir = element[UINAV_PROP]
  if (!dir) return
  if (dir.enabled) disable(dir, element)
  delete element[UINAV_PROP]
}

export default {
  mounted: setup,
  updated: setup,
  beforeUnmount: dispose,
}
