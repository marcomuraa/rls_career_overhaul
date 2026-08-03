// pure health decisions. each takes a plain world snapshot and returns a descriptor:
// { kind, suspicious, recoverable, reason }

import { RECOVERY_KINDS, MOD_CRASH_LIMIT, MOD_RELOAD_COOLDOWN_MS, BRIDGE_STREAM_STUCK_MS, BRIDGE_STREAM_ORPHAN_MS } from "./config"

export const MOD_ACTIONS = {
  reload: "reload",
  giveUp: "give-up",
  cooldown: "cooldown",
  alreadyGivenUp: "already-given-up",
}

const decision = (kind, suspicious, recoverable, reason, terminal = false) => ({ kind, suspicious, recoverable, reason, terminal })

// focus landed somewhere unusable while a controller-driven scope should own it
export function evaluateFocus(state) {
  const blocked = !state.ingame
    || !state.controllerActive
    || state.inEditable
    || state.hasActivationBarrier
    || !state.coordinatorEnabled
    || !state.currentScopeId
    || state.currentScopeHandlesOwnFocus
  if (blocked) return decision(RECOVERY_KINDS.focus, false, false, "focus ownership not expected")

  const broken = state.activeIsBody
    || !state.activeConnected
    || !state.activeVisible
    || !state.activeInCurrentScope
  const suspicious = broken && state.recentNav
  const recoverable = suspicious && state.currentScopeHasElement && state.currentScopeHasFocusCandidate

  let reason = "focus healthy"
  if (broken && !state.recentNav) reason = "focus off-scope but no recent nav"
  else if (suspicious) {
    if (!state.currentScopeHasFocusCandidate) reason = "no focus candidate in active scope"
    else if (state.activeIsBody) reason = "focus fell back to body"
    else if (!state.activeConnected) reason = "focused element detached"
    else if (!state.activeVisible) reason = "focused element hidden"
    else reason = "focus outside active scope"
  }
  return decision(RECOVERY_KINDS.focus, suspicious, recoverable, reason)
}

// scopednav coordinator current scope and UINav active scope disagree,
// or scopes exist with none active during recent navigation
// report-only
export function evaluateScope(state) {
  if (!state.ingame) return decision(RECOVERY_KINDS.scope, false, false, "not ingame")

  const mismatch = !!state.currentScopeId && state.uiNavActiveScopeId !== state.currentScopeId
  if (mismatch) {
    return decision(RECOVERY_KINDS.scope, true, true, "UINav active scope out of sync with coordinator")
  }

  const orphan = state.scopeCount > 0 && !state.currentScopeId && state.recentNav && state.controllerActive
  if (orphan) {
    return decision(RECOVERY_KINDS.scope, true, false, "scopes present but none active during navigation")
  }

  return decision(RECOVERY_KINDS.scope, false, false, "scope healthy")
}

// desired vs applied action state diverges outside of an in-flight sync
export function evaluateActionMap(state) {
  const drift = state.actionDrift.length > 0
  if (!drift) return decision(RECOVERY_KINDS.actionMap, false, false, "action map converged")

  const names = state.actionDrift.map(d => d.name).join(", ")
  return decision(RECOVERY_KINDS.actionMap, true, state.ingame, `action map drift: ${names}`)
}

// applied UINav blocklist no longer matches the tracker's intent
export function evaluateBlocklist(state) {
  const expected = new Set(state.blocklistExpected)
  const actual = new Set(state.blocklistActual)
  const differs = expected.size !== actual.size
    || [...expected].some(name => !actual.has(name))
  if (!differs) return decision(RECOVERY_KINDS.blocklist, false, false, "blocklist in sync")

  return decision(RECOVERY_KINDS.blocklist, true, true, "applied blocklist diverged from tracker")
}

export function evaluateBridgeStreams(state) {
  const health = state.bridgeStreamHealth
  if (!health) return decision(RECOVERY_KINDS.bridge, false, false, "bridge stream health unavailable")

  const coordinator = health.coordinator || {}

  // when stream frames are flowing but the coordinator is never being driven, this means a wiring fault, not a stall.
  // it cannot be recovered by resetting transient state, so mark it as a terminal failure.
  const framesFlowing = (health.streamFramesReceived || 0) > 0
    && health.streamFramesFor != null && health.streamFramesFor <= BRIDGE_STREAM_ORPHAN_MS
  const ackLag = (health.lastStreamFrameAt || 0) - (coordinator.lastStartedAt || 0)
  const orphaned = framesFlowing && (!coordinator.lastStartedAt || ackLag >= BRIDGE_STREAM_ORPHAN_MS)
  if (orphaned) {
    return decision(RECOVERY_KINDS.bridge, true, false, "stream frames flowing but coordinator never driven (orphaned)", true)
  }

  const coordinatorStuck = !!coordinator.processing && coordinator.processingFor >= BRIDGE_STREAM_STUCK_MS
  const skippedStuck = !!health.hasSkippedStreamUpdate && health.skippedFor >= BRIDGE_STREAM_STUCK_MS
  if (!coordinatorStuck && !skippedStuck) {
    return decision(RECOVERY_KINDS.bridge, false, false, "bridge streams healthy")
  }

  const reason = coordinatorStuck
    ? `stream coordinator stuck for ${Math.round(coordinator.processingFor)}ms`
    : `skipped stream reading stale for ${Math.round(health.skippedFor)}ms`
  return decision(RECOVERY_KINDS.bridge, true, true, reason)
}

// what to do with a freshly crashed mod
export function decideModRecovery({ crashCount, givenUp, sinceLastReload }) {
  if (givenUp) return MOD_ACTIONS.alreadyGivenUp
  if (crashCount > MOD_CRASH_LIMIT) return MOD_ACTIONS.giveUp
  if (sinceLastReload < MOD_RELOAD_COOLDOWN_MS) return MOD_ACTIONS.cooldown
  return MOD_ACTIONS.reload
}

export const SETTLED_EVALUATORS = [evaluateFocus, evaluateScope]
export const DEFERRED_EVALUATORS = [evaluateFocus, evaluateScope, evaluateActionMap, evaluateBlocklist, evaluateBridgeStreams]
