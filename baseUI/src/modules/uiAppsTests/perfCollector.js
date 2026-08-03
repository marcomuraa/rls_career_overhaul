export function createTimer() {
  let t0 = 0
  return {
    start() {
      t0 = performance.now()
    },
    stop() {
      return performance.now() - t0
    },
  }
}

export function createErrorTrap() {
  let errors = []
  let originalConsoleError = null
  let originalConsoleWarn = null
  let onError = null
  let onRejection = null

  return {
    start() {
      errors = []

      originalConsoleError = console.error
      console.error = (...args) => {
        errors.push({ source: "console.error", message: args.map(String).join(" ") })
        if (originalConsoleError) originalConsoleError.apply(console, args)
      }

      originalConsoleWarn = console.warn
      console.warn = (...args) => {
        errors.push({ source: "console.warn", message: args.map(String).join(" ") })
        if (originalConsoleWarn) originalConsoleWarn.apply(console, args)
      }

      onError = (event) => {
        errors.push({ source: "window.error", message: event.message || String(event) })
      }
      window.addEventListener("error", onError)

      onRejection = (event) => {
        errors.push({ source: "unhandledrejection", message: event.reason?.message || String(event.reason) })
      }
      window.addEventListener("unhandledrejection", onRejection)
    },
    stop() {
      if (originalConsoleError) {
        console.error = originalConsoleError
        originalConsoleError = null
      }
      if (originalConsoleWarn) {
        console.warn = originalConsoleWarn
        originalConsoleWarn = null
      }
      if (onError) {
        window.removeEventListener("error", onError)
        onError = null
      }
      if (onRejection) {
        window.removeEventListener("unhandledrejection", onRejection)
        onRejection = null
      }
      const captured = errors
      errors = []
      return captured
    },
  }
}

export function measureNextFrame() {
  return new Promise(resolve => {
    const t0 = performance.now()
    requestAnimationFrame(() => {
      resolve(performance.now() - t0)
    })
  })
}

function round2(val) {
  return Math.round(val * 100) / 100
}

export function createFrameSampler() {
  let deltas = []
  let lastTime = 0
  let rafId = null

  function tick() {
    const now = performance.now()
    deltas.push(now - lastTime)
    lastTime = now
    rafId = requestAnimationFrame(tick)
  }

  return {
    start() {
      deltas = []
      lastTime = performance.now()
      rafId = requestAnimationFrame(tick)
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      const frameCount = deltas.length
      if (frameCount === 0) {
        return { frameCount: 0, avgFrameTime: 0, maxFrameTime: 0 }
      }
      const sum = deltas.reduce((s, d) => s + d, 0)
      return {
        frameCount,
        avgFrameTime: round2(sum / frameCount),
        maxFrameTime: round2(Math.max(...deltas)),
      }
    },
  }
}
