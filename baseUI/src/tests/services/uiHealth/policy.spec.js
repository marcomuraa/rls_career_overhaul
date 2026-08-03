import { describe, it, expect } from "vitest"
import { evaluateFocus, evaluateScope, evaluateActionMap, evaluateBlocklist, evaluateBridgeStreams, decideModRecovery, MOD_ACTIONS } from "@/services/uiHealth/policy"
import { MOD_CRASH_LIMIT, BRIDGE_STREAM_STUCK_MS } from "@/services/uiHealth/config"

const healthyState = () => ({
  now: 0,
  ingame: true,
  controllerActive: true,
  inEditable: false,
  hasActivationBarrier: false,
  coordinatorEnabled: true,
  recentNav: true,

  activeIsBody: false,
  activeConnected: true,
  activeVisible: true,
  activeInCurrentScope: true,

  scopeCount: 1,
  currentScopeId: "scopeA",
  currentScopeHasElement: true,
  currentScopeHandlesOwnFocus: false,
  currentScopeHasFocusCandidate: true,
  uiNavActiveScopeId: "scopeA",

  actionDrift: [],
  menuActionMapEnabled: true,

  blocklistExpected: [],
  blocklistActual: [],
})

describe("uiHealth policy", () => {
  it("treats a settled controller scope as healthy", () => {
    const focus = evaluateFocus(healthyState())
    expect(focus.suspicious).toBe(false)
    expect(focus.recoverable).toBe(false)
  })

  it("recovers focus that fell back to body during recent navigation", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true })
    expect(focus.suspicious).toBe(true)
    expect(focus.recoverable).toBe(true)
    expect(focus.reason).toMatch(/body/)
  })

  it("does not touch focus while typing in an editable element", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true, inEditable: true })
    expect(focus.suspicious).toBe(false)
    expect(focus.recoverable).toBe(false)
  })

  it("does not force focus when no controller-driven nav happened recently", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true, recentNav: false })
    expect(focus.suspicious).toBe(false)
    expect(focus.recoverable).toBe(false)
  })

  it("holds back focus recovery when the scope element is gone", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true, currentScopeHasElement: false })
    expect(focus.suspicious).toBe(true)
    expect(focus.recoverable).toBe(false)
  })

  it("leaves body focus alone for a scope that owns its own focus", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true, currentScopeHandlesOwnFocus: true })
    expect(focus.suspicious).toBe(false)
    expect(focus.recoverable).toBe(false)
  })

  it("reports but cannot recover focus when the scope has no focus candidate", () => {
    const focus = evaluateFocus({ ...healthyState(), activeIsBody: true, currentScopeHasFocusCandidate: false })
    expect(focus.suspicious).toBe(true)
    expect(focus.recoverable).toBe(false)
    expect(focus.reason).toMatch(/no focus candidate/)
  })

  it("resyncs the active scope when coordinator and UINav disagree", () => {
    const scope = evaluateScope({ ...healthyState(), uiNavActiveScopeId: "scopeB" })
    expect(scope.suspicious).toBe(true)
    expect(scope.recoverable).toBe(true)
  })

  it("reports but does not auto-recover an orphaned scope stack", () => {
    const scope = evaluateScope({ ...healthyState(), currentScopeId: null, scopeCount: 2 })
    expect(scope.suspicious).toBe(true)
    expect(scope.recoverable).toBe(false)
  })

  it("recovers action map drift outside of an in-flight sync", () => {
    const actionMap = evaluateActionMap({ ...healthyState(), actionDrift: [{ name: "ok", desired: true, applied: false }] })
    expect(actionMap.suspicious).toBe(true)
    expect(actionMap.recoverable).toBe(true)
    expect(actionMap.reason).toMatch(/ok/)
  })

  it("re-applies the blocklist when applied state diverges", () => {
    const blocklist = evaluateBlocklist({ ...healthyState(), blocklistExpected: ["menu_focus"], blocklistActual: [] })
    expect(blocklist.suspicious).toBe(true)
    expect(blocklist.recoverable).toBe(true)
  })

  it("leaves a converged blocklist alone", () => {
    const blocklist = evaluateBlocklist({ ...healthyState(), blocklistExpected: ["a"], blocklistActual: ["a"] })
    expect(blocklist.suspicious).toBe(false)
  })

  it("leaves fresh bridge stream readings alone", () => {
    const bridge = evaluateBridgeStreams({
      ...healthyState(),
      bridgeStreamHealth: {
        coordinator: { processing: true, processingFor: BRIDGE_STREAM_STUCK_MS - 1 },
        hasSkippedStreamUpdate: true,
        skippedFor: BRIDGE_STREAM_STUCK_MS - 1,
      },
    })
    expect(bridge.suspicious).toBe(false)
  })

  it("recovers a stuck bridge stream coordinator", () => {
    const bridge = evaluateBridgeStreams({
      ...healthyState(),
      bridgeStreamHealth: {
        coordinator: { processing: true, processingFor: BRIDGE_STREAM_STUCK_MS },
        hasSkippedStreamUpdate: false,
        skippedFor: 0,
      },
    })
    expect(bridge.suspicious).toBe(true)
    expect(bridge.recoverable).toBe(true)
  })

  it("recovers stale skipped bridge stream readings", () => {
    const bridge = evaluateBridgeStreams({
      ...healthyState(),
      bridgeStreamHealth: {
        coordinator: { processing: false, processingFor: 0 },
        hasSkippedStreamUpdate: true,
        skippedFor: BRIDGE_STREAM_STUCK_MS,
      },
    })
    expect(bridge.suspicious).toBe(true)
    expect(bridge.recoverable).toBe(true)
  })

  it("reloads a freshly crashed mod within budget and cooldown", () => {
    expect(decideModRecovery({ crashCount: 1, givenUp: false, sinceLastReload: 99999 })).toBe(MOD_ACTIONS.reload)
  })

  it("holds off reloading a mod still within its cooldown", () => {
    expect(decideModRecovery({ crashCount: 2, givenUp: false, sinceLastReload: 100 })).toBe(MOD_ACTIONS.cooldown)
  })

  it("gives up once a mod crashes past its budget", () => {
    expect(decideModRecovery({ crashCount: MOD_CRASH_LIMIT + 1, givenUp: false, sinceLastReload: 99999 })).toBe(MOD_ACTIONS.giveUp)
  })

  it("stays given up once abandoned", () => {
    expect(decideModRecovery({ crashCount: 1, givenUp: true, sinceLastReload: 99999 })).toBe(MOD_ACTIONS.alreadyGivenUp)
  })
})
