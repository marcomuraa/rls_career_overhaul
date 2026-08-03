import { findRouteTargetMatch, isRouteEntryFocus } from "./routeIntegration"

export const SCOPED_NAV_FOCUS_SOURCES = {
  requested: "requested",
  routeTarget: "route-target",
  lastActive: "last-active",
  autofocus: "autofocus",
  first: "first",
}

function normalizeNavItems(navItems) {
  return Array.from(navItems || [])
}

function getValidNavItem(navItems, item) {
  if (!item) return null
  return navItems.includes(item) ? item : null
}

function getRouteEntryFallbackSequence() {
  return [SCOPED_NAV_FOCUS_SOURCES.autofocus, SCOPED_NAV_FOCUS_SOURCES.first]
}

function getStandardSequence(preferAutoFocus) {
  return preferAutoFocus
    ? [
        SCOPED_NAV_FOCUS_SOURCES.autofocus,
        SCOPED_NAV_FOCUS_SOURCES.routeTarget,
        SCOPED_NAV_FOCUS_SOURCES.lastActive,
        SCOPED_NAV_FOCUS_SOURCES.first,
      ]
    : [
        SCOPED_NAV_FOCUS_SOURCES.routeTarget,
        SCOPED_NAV_FOCUS_SOURCES.lastActive,
        SCOPED_NAV_FOCUS_SOURCES.autofocus,
        SCOPED_NAV_FOCUS_SOURCES.first,
      ]
}

export function selectScopedNavFocusTarget({
  navItems,
  requestedElement = null,
  lastActiveElement = null,
  autoFocusItem = null,
  detail = null,
  preferAutoFocus = false,
}) {
  const normalizedNavItems = normalizeNavItems(navItems)
  const routeTargetMatch = findRouteTargetMatch(normalizedNavItems, detail)
  const isRouteEntry = isRouteEntryFocus(detail)

  const candidates = {
    [SCOPED_NAV_FOCUS_SOURCES.requested]: getValidNavItem(normalizedNavItems, requestedElement),
    [SCOPED_NAV_FOCUS_SOURCES.routeTarget]: routeTargetMatch,
    [SCOPED_NAV_FOCUS_SOURCES.lastActive]: getValidNavItem(normalizedNavItems, lastActiveElement),
    [SCOPED_NAV_FOCUS_SOURCES.autofocus]: getValidNavItem(normalizedNavItems, autoFocusItem),
    [SCOPED_NAV_FOCUS_SOURCES.first]: normalizedNavItems[0] || null,
  }

  const baseSequence = isRouteEntry && !routeTargetMatch
    ? getRouteEntryFallbackSequence()
    : getStandardSequence(preferAutoFocus)
  const sequence = candidates[SCOPED_NAV_FOCUS_SOURCES.requested]
    ? [SCOPED_NAV_FOCUS_SOURCES.requested, ...baseSequence]
    : baseSequence

  const focusSource = sequence.find(source => !!candidates[source]) || null
  const focusItem = focusSource ? candidates[focusSource] : null

  return {
    focusItem,
    focusSource,
    isAutoFocusItem: focusSource === SCOPED_NAV_FOCUS_SOURCES.autofocus,
    isRouteTargetMatch: focusSource === SCOPED_NAV_FOCUS_SOURCES.routeTarget,
  }
}
