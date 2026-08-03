// Shared route-target / route-entry focus integration helpers
//
// Centralizes the route-target attribute name, route-entry focus payload
// shape, and read-only lookups against the route data store so directives,
// the public API, and the coordinator do not each reimplement the same
// route/scoped-nav contract.

export const ROUTE_TARGET_ATTR = "bng-route-target"
export const ROUTE_ENTRY_FOCUS_SOURCE = "route-entry"

/**
 * @typedef {object} ParsedRouteTarget
 * @property {string | null} name Route name used for the DOM attribute and
 *   origin-route matching, or null when the binding has no usable target.
 * @property {object | null} params Optional params payload to forward to the
 *   router on click navigation. Always null for string bindings.
 * @property {string | null} routeScopeId Optional inline scope id extracted
 *   from `routeName:scopeId` syntax.
 */

/**
 * Parse inline scoped route notation (`routeName:scopeId`) while preserving
 * malformed values as-is.
 *
 * Mirrors Lua router behavior:
 * - no delimiter => unchanged route name
 * - empty route name or scope id => unchanged route name
 *
 * @param {string} routeName
 * @returns {{ name: string, routeScopeId: string | null }}
 */
function parseInlineScopedRoute(routeName) {
  const delimiterIndex = routeName.indexOf(":")
  if (delimiterIndex === -1) {
    return { name: routeName, routeScopeId: null }
  }

  const baseRouteName = routeName.slice(0, delimiterIndex)
  const routeScopeId = routeName.slice(delimiterIndex + 1)
  if (!baseRouteName || !routeScopeId) {
    return { name: routeName, routeScopeId: null }
  }

  return { name: baseRouteName, routeScopeId }
}

/**
 * Parse a raw bng-route-target binding value into its route name and
 * optional params payload.
 *
 * Accepts either:
 *   - a string route name like `"menu.discover"`
 *   - an object of the form `{ route: "menu.foo", params: { ... } }`
 *
 * Route names may use inline scoped syntax (`"menu.foo:scope-id"`), in which
 * case the returned `name` is canonicalized to `"menu.foo"` and
 * `routeScopeId` contains `"scope-id"`.
 *
 * The route name is the only thing that drives DOM attribute sync and
 * origin-route matching; params are only consumed by callers that own
 * click navigation (currently the BngRouteTarget directive).
 *
 * @param {unknown} value
 * @returns {ParsedRouteTarget}
 */
export function parseRouteTarget(value) {
  if (value === null || value === undefined || value === "") {
    return { name: null, params: null, routeScopeId: null }
  }
  if (typeof value === "object") {
    const rawRoute = value.route
    if (rawRoute === null || rawRoute === undefined || rawRoute === "") {
      return { name: null, params: null, routeScopeId: null }
    }
    const parsedRoute = parseInlineScopedRoute(String(rawRoute))
    return { name: parsedRoute.name, params: value.params ?? null, routeScopeId: parsedRoute.routeScopeId }
  }
  const parsedRoute = parseInlineScopedRoute(String(value))
  return { name: parsedRoute.name, params: null, routeScopeId: parsedRoute.routeScopeId }
}

/**
 * Extract just the route name from a binding value, for DOM attribute
 * sync and origin-route matching. Returns null when the binding has no
 * usable target.
 * @param {unknown} value
 * @returns {string | null}
 */
export function getRouteTargetName(value) {
  return parseRouteTarget(value).name
}

/**
 * Read the originating route name from the route data store.
 * @param {{ fromRoute?: { name?: string } | null } | null | undefined} store
 * @returns {string | null}
 */
export function getFromRouteName(store) {
  return store?.fromRoute?.name || null
}

/**
 * Build a one-shot route-entry focus payload to seed scope activation focus.
 * @param {string | null | undefined} fromRouteName
 * @returns {{ focusSource: string, fromRouteName: string | null }}
 */
export function buildRouteEntryFocus(fromRouteName) {
  return {
    focusSource: ROUTE_ENTRY_FOCUS_SOURCE,
    fromRouteName: fromRouteName || null,
  }
}

/**
 * Returns true when the supplied event detail represents a route-entry
 * focus payload.
 * @param {{ focusSource?: string } | null | undefined} detail
 * @returns {boolean}
 */
export function isRouteEntryFocus(detail) {
  return !!detail && detail.focusSource === ROUTE_ENTRY_FOCUS_SOURCE
}

/**
 * Build the effective focus detail for a scope by combining an incoming
 * event detail with any pending route-entry payload registered on the
 * coordinator. The pending payload is only peeked here; consumption is the
 * caller's responsibility once it resolves a focus target from that one-shot
 * route-entry intent, whether that ends up being a matching route-target or a
 * scope-default fallback.
 *
 * @param {string | null | undefined} scopeId
 * @param {{ focusSource?: string, fromRouteName?: string | null } | null | undefined} eventDetail
 * @param {(scopeId: string) => ({ focusSource?: string, fromRouteName?: string | null } | null) | undefined} peekPendingRouteEntryFocus
 * @returns {{ focusSource?: string, fromRouteName?: string | null } | null}
 */
export function resolveRouteEntryDetail(scopeId, eventDetail, peekPendingRouteEntryFocus) {
  if (isRouteEntryFocus(eventDetail)) return eventDetail
  if (!scopeId) return eventDetail || null

  const pending = peekPendingRouteEntryFocus?.(scopeId)
  if (!pending) return eventDetail || null

  return { ...(eventDetail || {}), ...pending }
}

/**
 * Find the navigable item whose bng-route-target matches the route-entry
 * payload's fromRouteName, if any.
 * @param {Iterable<HTMLElement>} navItems
 * @param {{ focusSource?: string, fromRouteName?: string | null } | null | undefined} detail
 * @returns {HTMLElement | null}
 */
export function findRouteTargetMatch(navItems, detail) {
  if (!isRouteEntryFocus(detail)) return null
  if (!detail.fromRouteName) return null

  for (const item of navItems) {
    if (item.getAttribute(ROUTE_TARGET_ATTR) === detail.fromRouteName) return item
  }
  return null
}

/**
 * Returns true when the supplied bng-route-target value matches the
 * originating route currently recorded on the route data store. Only
 * the route name is compared; params are ignored.
 * @param {{ fromRoute?: { name?: string } | null } | null | undefined} store
 * @param {unknown} value
 * @returns {boolean}
 */
export function matchesOriginRoute(store, value) {
  const name = getRouteTargetName(value)
  if (name === null) return false
  return getFromRouteName(store) === name
}

/**
 * Look up the route-defined parent metadata for a scope id.
 * @param {{ scopeParentMap?: Record<string, object> | null } | null | undefined} store
 * @param {string | null | undefined} scopeId
 * @returns {object | null}
 */
export function getRouteScopeMeta(store, scopeId) {
  if (!scopeId) return null
  return store?.scopeParentMap?.[scopeId] || null
}

/**
 * Returns true when the supplied scope id is part of the current route's
 * declared scope tree.
 * @param {{ scopeParentMap?: Record<string, object> | null } | null | undefined} store
 * @param {string | null | undefined} scopeId
 * @returns {boolean}
 */
export function isRouteManagedScope(store, scopeId) {
  if (!scopeId) return false
  const map = store?.scopeParentMap
  return !!map && Object.hasOwn(map, scopeId)
}

/**
 * Returns the screen-root scope id declared by the current route, if any.
 * @param {{ scopeTree?: Record<string, unknown> | null } | null | undefined} store
 * @returns {string | null}
 */
export function getScreenRootScopeId(store) {
  const scopeTree = store?.scopeTree
  if (!scopeTree) return null
  const keys = Object.keys(scopeTree)
  return keys.length > 0 ? keys[0] : null
}

/**
 * Returns the route-declared target scope id, if any.
 * @param {{ targetScope?: string | null } | null | undefined} store
 * @returns {string | null}
 */
export function getTargetScopeId(store) {
  return store?.targetScope || null
}
