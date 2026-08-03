import { ensureFocus } from "@/services/uiNavFocus"
import { useRouteDataStore } from "@/services/routeData"
import { lua } from "@/bridge"
import { hasScopedNavAncestor } from "@/services/scopedNav/utils"
import { ROUTE_TARGET_ATTR, matchesOriginRoute, parseRouteTarget } from "@/services/scopedNav/routeIntegration"

const STATE_PROP = "__bngRouteTargetState"

function syncAttribute(el, parsed) {
  if (parsed.name === null) {
    el.removeAttribute(ROUTE_TARGET_ATTR)
    return
  }
  el.setAttribute(ROUTE_TARGET_ATTR, parsed.name)
}

function navigateForState(state) {
  const parsed = state.parsed
  if (!parsed || parsed.name === null) return
  const options = parsed.routeScopeId ? { routeScopeId: parsed.routeScopeId } : null
  lua.extensions.ui_router.navigate(parsed.name, parsed.params ?? null, options)
}

function isSameParsed(a, b) {
  if (!a || !b) return false
  return a.name === b.name && a.params === b.params && a.routeScopeId === b.routeScopeId
}

function syncClickHandler(el, parsed, hasIdModifier) {
  const state = el[STATE_PROP] || (el[STATE_PROP] = {})
  const sameParsed = isSameParsed(state.parsed, parsed)

  state.parsed = parsed

  if (sameParsed && state.hasIdModifier === hasIdModifier) return

  if (state.handler) {
    el.removeEventListener("click", state.handler)
    state.handler = null
  }

  state.hasIdModifier = hasIdModifier

  if (hasIdModifier) return
  if (parsed.name === null) return

  state.handler = () => navigateForState(state)
  el.addEventListener("click", state.handler)
}

function teardownClickHandler(el) {
  const state = el[STATE_PROP]
  if (!state) return
  if (state.handler) {
    el.removeEventListener("click", state.handler)
  }
  delete el[STATE_PROP]
}

export default {
  beforeMount(el, { value, modifiers }) {
    const parsed = parseRouteTarget(value)
    syncAttribute(el, parsed)
    syncClickHandler(el, parsed, !!modifiers?.id)
  },
  mounted(el, { value }) {
    const parsed = parseRouteTarget(value)
    if (parsed.name === null) return
    if (hasScopedNavAncestor(el)) return
    if (!matchesOriginRoute(useRouteDataStore(), value)) return
    ensureFocus(el)
  },
  updated(el, { value, modifiers }) {
    const parsed = parseRouteTarget(value)
    syncAttribute(el, parsed)
    syncClickHandler(el, parsed, !!modifiers?.id)
  },
  unmounted(el) {
    teardownClickHandler(el)
  },
}
