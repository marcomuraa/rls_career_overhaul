// Stream Coordinator
// stateless defer-only helpers that ensure Angular/Vue/JS
// deferred work completes before signaling the game engine

import { now } from "../utils.js"

export function createCoordinatorState() {
  return {
    // continuous signaling (not recommended)
    continuous: false,
    continuousDelay: 20,

    processing: false,
    pending: 0,
    finishCallback: null,

    angularRootScope: window.globalAngularRootScope,
    angularTimeout: null,
    angularTimeoutRetry: null, // one-time retry timer (do not empty it)
    angularTimeoutWarned: false,

    safetyTimeout: 2000, // ms, prevents deadlocks
    safetyTimer: null,

    warned: false,

    lastStartedAt: 0,
    lastCompletedAt: 0,
    forceCompleteCount: 0,
    resetCount: 0,
  }
}

// called from angular's main.js; clears the cached $timeout so it re-resolves after angular (re)loads on F5
export function setAngularRootScope(state, rootScope) {
  state.angularRootScope = rootScope
  state.angularTimeout = null
  if (state.angularTimeoutRetry) {
    clearTimeout(state.angularTimeoutRetry)
    state.angularTimeoutRetry = null
  }
}

export function resolveAngularTimeout(state) {
  if (state.angularTimeout !== null) {
    return typeof state.angularTimeout === "function" ? state.angularTimeout : null
  }

  let code

  if (state.angularTimeoutRetry) {
    code = "retry"
    clearTimeout(state.angularTimeoutRetry)
  }

  try {
    if (typeof window.angular !== "undefined" && window.angular.element) {
      const rootElement = document.getElementById("angular-root") || document
      const injector = window.angular.element(rootElement).injector()
      if (injector) {
        state.angularTimeout = injector.get("$timeout")
        if (state.angularTimeoutWarned) console.log("Stream Coordinator: Angular $timeout service resolved after retry")
        return state.angularTimeout
      } else {
        code = "no-injector"
      }
    } else {
      code = "no-angular"
    }
  } catch (error) {
    code = "error"
  }

  // normally, we never reach this point

  state.angularTimeout = false // mark unavailable to avoid repeated attempts

  // one-time retry; if this was an F5, the timer is cancelled within a few ticks as angular catches up
  if (!state.angularTimeoutRetry) {
    state.angularTimeoutRetry = setTimeout(() => {
      if (!state.angularTimeout) state.angularTimeout = null
    }, 5000)
  }

  // may appear up to 3x (early streams / angular-ready / retry), hence the code suffix
  console.warn(`Stream Coordinator: Angular $timeout service not available (${code})`)
  state.angularTimeoutWarned = true
  return null
}

// returns false if a cycle is already running
export function beginCycle(state) {
  if (state.processing) return false
  state.processing = true
  state.finishCallback = null
  state.pending = 0
  state.lastStartedAt = now()

  if (state.safetyTimer) clearTimeout(state.safetyTimer)
  state.safetyTimer = setTimeout(() => {
    if (state.processing) forceComplete(state)
  }, state.safetyTimeout)
  return true
}

export function runDeferredWork(state, onComplete) {
  state.pending = 0

  if (!window.bngUiBootstrap?.status.done) {
    onComplete()
    return
  }

  // $timeout(0), not $evalAsync(): only $timeout guarantees the angular DOM is updated
  const angularTimeout = resolveAngularTimeout(state)
  if (angularTimeout) {
    if (!state.angularRootScope) state.angularRootScope = window.globalAngularRootScope
    if (state.angularRootScope) {
      state.pending++
      angularTimeout(() => operationComplete(state, onComplete), 0)
    }
  }

  if (window.Vue?.nextTick) {
    state.pending++
    window.Vue.nextTick(() => operationComplete(state, onComplete))
  }

  if (state.pending === 0) {
    if (!state.warned) {
      state.warned = true
      console.warn("Stream Coordinator: No Angular $timeout() nor Vue.nextTick() detected, using only Promise microtask instead")
    }
    onComplete()
  }
}

function operationComplete(state, onComplete) {
  if (!state.processing) return
  state.pending--
  if (state.pending <= 0) {
    onComplete()
  }
}

export function completeCycle(state) {
  if (!state.processing) return

  if (state.safetyTimer) {
    clearTimeout(state.safetyTimer)
    state.safetyTimer = null
  }

  Promise.resolve().then(() => {
    state.processing = false
    state.lastCompletedAt = now()

    // [job's_done.wav] :)
    window.beamng?.uiFrameCallback?.()

    if (state.finishCallback) {
      state.finishCallback()
      if (state.continuous) Promise.resolve().then(() => startContinuous(state))
    } else if (state.continuous) {
      startContinuous(state)
    }
  })
}

export function forceComplete(state) {
  state.forceCompleteCount++
  completeCycle(state)
}

export function startContinuous(state) {
  if (!state.continuous) return
  setTimeout(() => {
    if (state.processing) return
    state.processing = true
    state.pending = 0
    runDeferredWork(state, () => completeCycle(state))
  }, state.continuousDelay)
}

export function resetTransientState(state, reason = "manual") {
  if (state.safetyTimer) {
    clearTimeout(state.safetyTimer)
    state.safetyTimer = null
  }
  state.processing = false
  state.pending = 0
  state.finishCallback = null
  state.lastCompletedAt = now()
  state.resetCount++
  window.beamng?.uiFrameCallback?.()
  return { reason, resetCount: state.resetCount }
}

export function healthSnapshot(state) {
  const t = now()
  return {
    processing: state.processing,
    pending: state.pending,
    processingFor: state.processing && state.lastStartedAt ? t - state.lastStartedAt : 0,
    hasSafetyTimer: !!state.safetyTimer,
    lastStartedAt: state.lastStartedAt,
    lastCompletedAt: state.lastCompletedAt,
    forceCompleteCount: state.forceCompleteCount,
    resetCount: state.resetCount,
  }
}
