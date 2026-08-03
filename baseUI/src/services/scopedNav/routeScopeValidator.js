import { nextTick } from "vue"
import logger from "@/services/logger"
import { getScopeCoordinatorInstance } from "./coordinator"

const PREFIX = "[RouteScopeValidator]"
const SCOPE_ATTR = "bng-ui-scope"
const RUNTIME_SFC = window.bngUiMode?.runtime
const RETRY_DELAYS = RUNTIME_SFC ? [100, 250, 500, 1000, 2000] : [100, 250]
const TARGET_GRACE_MS = 2500
const ROUTE_SCOPE_VALIDATOR_INSTANCE_KEY = "__bngRouteScopeValidatorInstance"
const getStoredRouteScopeValidatorInstance = () => window[ROUTE_SCOPE_VALIDATOR_INSTANCE_KEY] || null

export function setRouteScopeValidatorInstance(inst) {
  if (inst === null || inst === undefined) {
    delete window[ROUTE_SCOPE_VALIDATOR_INSTANCE_KEY]
    return
  }
  window[ROUTE_SCOPE_VALIDATOR_INSTANCE_KEY] = inst
}
export function getRouteScopeValidatorInstance() {
  return getStoredRouteScopeValidatorInstance()
}

export function createRouteScopeValidator() {
  let currentRouteKey = null
  let currentRouteName = null
  let currentNamespace = null
  let currentTargetScope = null
  let expectedScopes = null
  let validationToken = 0
  let pendingTimeoutIds = []
  const seenRegisteredIds = new Set()
  const warnedIssueKeys = new Set()
  let lastReport = null

  function issueKey(kind, scopeId) {
    return `${currentRouteName}|${scopeId}|${kind}`
  }

  function warnOnce(kind, scopeId, detail) {
    const key = issueKey(kind, scopeId)
    if (warnedIssueKeys.has(key)) return
    warnedIssueKeys.add(key)
    logger.warn(PREFIX, `Route "${currentRouteName}": ${detail}`)
  }

  function cancelPending() {
    for (const id of pendingTimeoutIds) clearTimeout(id)
    pendingTimeoutIds = []
  }

  function queryRenderedScopes() {
    const rendered = new Map()
    const duplicates = new Set()
    const els = document.querySelectorAll(`[${SCOPE_ATTR}]`)
    for (const el of els) {
      const id = el.getAttribute(SCOPE_ATTR)
      if (rendered.has(id)) {
        duplicates.add(id)
      } else {
        rendered.set(id, el)
      }
    }
    return { rendered, duplicates }
  }

  function findDomParentScope(el) {
    let parent = el.parentElement
    while (parent) {
      const parentId = parent.getAttribute(SCOPE_ATTR)
      if (parentId) return parentId
      parent = parent.parentElement
    }
    return false
  }

  function collectIssues() {
    const { rendered, duplicates } = queryRenderedScopes()
    const coordinator = getScopeCoordinatorInstance()
    const registered = coordinator ? coordinator.getRegisteredScopes() : new Map()
    const issues = []

    for (const id of duplicates) {
      if (!(id in expectedScopes)) continue
      issues.push({ kind: "duplicate_scope_id", scopeId: id, rendered: true, registered: registered.has(id) })
    }

    for (const [scopeId, meta] of Object.entries(expectedScopes)) {
      const isRendered = rendered.has(scopeId)
      const isRegistered = registered.has(scopeId) || seenRegisteredIds.has(scopeId)

      if (!isRendered) {
        if (meta.optional === true && scopeId !== currentTargetScope) continue
        const kind = scopeId === currentTargetScope ? "missing_target_scope" : "declared_but_not_rendered"
        issues.push({ kind, scopeId, rendered: false, registered: isRegistered })
        continue
      }

      if (!isRegistered) {
        issues.push({ kind: "declared_but_not_registered", scopeId, rendered: true, registered: false })
      }

      const actualParent = findDomParentScope(rendered.get(scopeId))
      const expectedParent = meta.parentScopeId
      if (expectedParent !== undefined && actualParent !== expectedParent) {
        issues.push({
          kind: "wrong_parent_scope",
          scopeId,
          expectedParentScopeId: expectedParent,
          actualParentScopeId: actualParent,
          rendered: true,
          registered: isRegistered,
        })
      }

      if (meta.backTargetType === "scope" && meta.backTarget && !(meta.backTarget in expectedScopes)) {
        issues.push({ kind: "invalid_back_target_scope", scopeId, rendered: true, registered: isRegistered })
      }

      if (meta.escapeTargets && typeof meta.escapeTargets === "object") {
        for (const targetScopeId of Object.values(meta.escapeTargets)) {
          if (typeof targetScopeId === "string" && targetScopeId && !(targetScopeId in expectedScopes)) {
            issues.push({ kind: "invalid_escape_target_scope", scopeId, rendered: true, registered: isRegistered })
            break
          }
        }
      }
    }

    if (currentTargetScope && !rendered.has(currentTargetScope) && !(currentTargetScope in (expectedScopes || {}))) {
      issues.push({ kind: "missing_target_scope", scopeId: currentTargetScope, rendered: false, registered: false })
    }

    return issues
  }

  function reconcile(token, attempt, previousIssueKeys) {
    if (token !== validationToken || !expectedScopes) return

    const issues = collectIssues()
    const currentIssueKeys = new Set(issues.map(i => issueKey(i.kind, i.scopeId)))

    if (previousIssueKeys) {
      for (const key of previousIssueKeys) {
        if (!currentIssueKeys.has(key) && !warnedIssueKeys.has(key)) {
          logger.debug(PREFIX, `Route "${currentRouteName}": resolved after retry — ${key.split("|")[1]} (${key.split("|")[2]})`)
        }
      }
    }

    const unresolved = issues.filter(i => !warnedIssueKeys.has(issueKey(i.kind, i.scopeId)))
    const isFinalAttempt = attempt >= RETRY_DELAYS.length

    if (unresolved.length === 0 || isFinalAttempt) {
      for (const issue of unresolved) {
        warnOnce(issue.kind, issue.scopeId, formatIssueMessage(issue))
      }
      lastReport = { route: currentRouteName, namespace: currentNamespace, issues, attempt, timestamp: Date.now() }
      return
    }

    const tid = setTimeout(() => reconcile(token, attempt + 1, currentIssueKeys), RETRY_DELAYS[attempt])
    pendingTimeoutIds.push(tid)
  }

  function formatIssueMessage(issue) {
    switch (issue.kind) {
      case "missing_target_scope":
        return `targetScope "${issue.scopeId}" not found after mount`
      case "declared_but_not_rendered":
        return `scope "${issue.scopeId}" declared but not rendered after mount`
      case "declared_but_not_registered":
        return `scope "${issue.scopeId}" declared but not registered after mount`
      case "wrong_parent_scope":
        return `scope "${issue.scopeId}" rendered under unexpected parent (expected: ${JSON.stringify(issue.expectedParentScopeId)}, actual: ${JSON.stringify(issue.actualParentScopeId)})`
      case "duplicate_scope_id":
        return `scope "${issue.scopeId}" has duplicate DOM elements`
      case "invalid_back_target_scope":
        return `scope "${issue.scopeId}" has backTarget pointing to unknown scope`
      case "invalid_escape_target_scope":
        return `scope "${issue.scopeId}" has escapeTargets pointing to unknown scope`
      case "activation_target_missing":
        return `scope "${issue.scopeId}" targeted for activation but not available`
      default:
        return `scope "${issue.scopeId}" has issue: ${issue.kind}`
    }
  }

  function scheduleReconciliation() {
    cancelPending()
    validationToken++
    const token = validationToken

    nextTick(() => {
      if (token !== validationToken) return
      requestAnimationFrame(() => {
        if (token !== validationToken) return
        reconcile(token, 0, null)
      })
    })
  }

  function onRouteData(payload) {
    if (!payload || typeof payload !== "object") return

    const routeKey = payload.route?.name || ""
    if (routeKey !== currentRouteKey) {
      cancelPending()
      warnedIssueKeys.clear()
      seenRegisteredIds.clear()
      lastReport = null
      validationToken++
      currentRouteKey = routeKey
    }

    currentRouteName = routeKey
    currentNamespace = payload.namespace || ""
    currentTargetScope = payload.targetScope || null

    if (payload.status !== "mounted-ready") {
      expectedScopes = payload.scopeParentMap || null
      return
    }

    expectedScopes = payload.scopeParentMap || null
    if (!expectedScopes || Object.keys(expectedScopes).length === 0) return

    scheduleReconciliation()
  }

  function onScopeRegistered(scopeId) {
    seenRegisteredIds.add(scopeId)
    if (RUNTIME_SFC && expectedScopes && scopeId in expectedScopes) scheduleReconciliation()
  }

  function onScopeUnregistered(scopeId) {
    seenRegisteredIds.delete(scopeId)
  }

  function validateScopeTarget(scopeId, context) {
    if (!scopeId || !expectedScopes) return
    if (!(scopeId in expectedScopes)) return

    const isAvailable = () => {
      const coordinator = getScopeCoordinatorInstance()
      const registered = coordinator ? coordinator.getRegisteredScopes() : new Map()
      return registered.has(scopeId) || seenRegisteredIds.has(scopeId)
    }
    if (isAvailable()) return

    const trigger = context?.trigger || "unknown"
    const warn = () => logger.warn(PREFIX, `Route "${currentRouteName}": scope "${scopeId}" targeted for activation (${trigger}) but not available`)

    if (!RUNTIME_SFC) {
      warn()
      return
    }

    const token = validationToken
    setTimeout(() => {
      if (token !== validationToken) return
      if (!isAvailable()) warn()
    }, TARGET_GRACE_MS)
  }

  function reset() {
    cancelPending()
    currentRouteKey = null
    currentRouteName = null
    currentNamespace = null
    currentTargetScope = null
    expectedScopes = null
    validationToken++
    seenRegisteredIds.clear()
    warnedIssueKeys.clear()
    pendingTimeoutIds = []
    lastReport = null
  }

  function getLastReport() {
    return lastReport
  }

  return { onRouteData, onScopeRegistered, onScopeUnregistered, validateScopeTarget, reset, getLastReport }
}
