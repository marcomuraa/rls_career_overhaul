import { getAppList, spawnApp, destroyApp } from "./appSpawner"
import { createErrorTrap, measureNextFrame, createFrameSampler } from "./perfCollector"
import { getMockData, createMockDataEmitter } from "./mockDataLoader"

const DEFAULT_SETTLE_MS = 300
const SETTLE_TICK_MS = 1000

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function settleWithTicks(totalMs, onSettle, abortSignal) {
  let elapsed = 0
  while (elapsed < totalMs) {
    if (abortSignal?.aborted) return
    const tick = Math.min(SETTLE_TICK_MS, totalMs - elapsed)
    await wait(tick)
    elapsed += tick
    if (onSettle) onSettle({ elapsed, total: totalMs })
  }
}

const ERROR_SOURCES = ["console.error", "window.error", "unhandledrejection"]

function classifyStatus(entries, spawnTime, instances = null) {
  const hasErrors = entries.some(e => ERROR_SOURCES.includes(e.source))
  const hasWarnings = entries.some(e => e.source === "console.warn")
  if (hasErrors) return "error"
  // const isSlow = instances
  //   ? instances.some(inst => inst.spawnTime > 100)
  //   : spawnTime > 100
  // if (isSlow) return "slow"
  if (hasWarnings) return "warn"
  return "ok"
}

function round2(val) {
  return Math.round(val * 100) / 100
}

export async function runSingleTest(appData, hostElement, settleTimeMs = DEFAULT_SETTLE_MS, onSettle = null, abortSignal = null, instanceCount = 1) {
  if (instanceCount <= 1) {
    return runSingleInstance(appData, hostElement, settleTimeMs, onSettle, abortSignal)
  }
  return runMultiInstance(appData, hostElement, settleTimeMs, onSettle, abortSignal, instanceCount)
}

async function runSingleInstance(appData, hostElement, settleTimeMs, onSettle, abortSignal) {
  const errorTrap = createErrorTrap()
  errorTrap.start()

  let handle = null
  let spawnTime = 0
  let paintTime = 0

  const t0 = performance.now()
  try {
    handle = await spawnApp(appData, hostElement)
  } catch { /* spawn failure */ }
  spawnTime = performance.now() - t0
  paintTime = await measureNextFrame()

  const mockDataFiles = getMockData(appData.directive)
  const emitter = mockDataFiles.length > 0 ? createMockDataEmitter(mockDataFiles) : null
  if (emitter) emitter.start()

  const frameSampler = createFrameSampler()
  frameSampler.start()
  await settleWithTicks(settleTimeMs, info => {
    if (onSettle) onSettle({ ...info, mockDataName: emitter?.currentName ?? null })
  }, abortSignal)
  const settlePerf = frameSampler.stop()
  if (emitter) emitter.stop()
  const errors = errorTrap.stop()

  const dt0 = performance.now()
  if (handle) {
    try { destroyApp(handle) } catch { /* cleanup */ }
  }
  hostElement.innerHTML = ""
  const destroyTime = round2(performance.now() - dt0)

  return {
    appName: appData.appName,
    isVue: appData.isVue,
    instanceCount: 1,
    spawnTime: round2(spawnTime),
    paintTime: round2(paintTime),
    settlePerf,
    destroyTime,
    errors,
    status: classifyStatus(errors, spawnTime),
    mockDataNames: mockDataFiles.map(f => f.name),
  }
}

async function runMultiInstance(appData, hostElement, settleTimeMs, onSettle, abortSignal, instanceCount) {
  const errorTrap = createErrorTrap()
  const handles = []
  const instances = []
  let totalSpawnTime = 0

  errorTrap.start()

  for (let n = 0; n < instanceCount; n++) {
    const t0 = performance.now()
    let handle = null
    try {
      handle = await spawnApp(appData, hostElement)
      handles.push(handle)
    } catch { /* spawn failure */ }
    const instSpawnTime = round2(performance.now() - t0)
    totalSpawnTime += instSpawnTime
    instances.push({ index: n, spawnTime: instSpawnTime, destroyTime: 0 })
  }

  const paintTime = await measureNextFrame()

  const mockDataFiles = getMockData(appData.directive)
  const emitter = mockDataFiles.length > 0 ? createMockDataEmitter(mockDataFiles) : null
  if (emitter) emitter.start()

  const frameSampler = createFrameSampler()
  frameSampler.start()
  await settleWithTicks(settleTimeMs, info => {
    if (onSettle) onSettle({ ...info, mockDataName: emitter?.currentName ?? null })
  }, abortSignal)
  const settlePerf = frameSampler.stop()
  if (emitter) emitter.stop()

  let totalDestroyTime = 0
  for (let n = 0; n < handles.length; n++) {
    const dt0 = performance.now()
    try { destroyApp(handles[n]) } catch { /* cleanup */ }
    const instDestroyTime = round2(performance.now() - dt0)
    totalDestroyTime += instDestroyTime
    instances[n].destroyTime = instDestroyTime
  }
  hostElement.innerHTML = ""

  const allErrors = errorTrap.stop()

  const spawnTime = round2(totalSpawnTime)
  const destroyTime = round2(totalDestroyTime)
  const spawnTimes = instances.map(i => i.spawnTime)
  const destroyTimes = instances.map(i => i.destroyTime)

  return {
    appName: appData.appName,
    isVue: appData.isVue,
    instanceCount,
    spawnTime,
    avgSpawnTime: round2(spawnTime / instanceCount),
    minSpawnTime: Math.min(...spawnTimes),
    maxSpawnTime: Math.max(...spawnTimes),
    paintTime: round2(paintTime),
    settlePerf,
    destroyTime,
    avgDestroyTime: round2(destroyTime / instanceCount),
    minDestroyTime: Math.min(...destroyTimes),
    maxDestroyTime: Math.max(...destroyTimes),
    errors: allErrors,
    instances,
    status: classifyStatus(allErrors, spawnTime, instances),
    mockDataNames: mockDataFiles.map(f => f.name),
  }
}

export async function runAllTests(options = {}) {
  const { hostElement, onProgress, onSettle, settleTimeMs = DEFAULT_SETTLE_MS, filter, appList, abortSignal, instanceCount = 1 } = options

  if (!hostElement) throw new Error("hostElement is required")

  let apps = appList || getAppList()

  if (filter) {
    const lc = filter.toLowerCase()
    apps = apps.filter(a => a.appName.toLowerCase().includes(lc))
  }

  const results = []
  const total = apps.length

  for (let i = 0; i < apps.length; i++) {
    if (abortSignal?.aborted) break

    const appData = apps[i]
    if (onProgress) onProgress({ current: i + 1, total, currentApp: appData.appName, phase: "spawning" })

    const result = await runSingleTest(appData, hostElement, settleTimeMs, onSettle, abortSignal, instanceCount)
    results.push(result)

    if (onProgress) onProgress({ current: i + 1, total, currentApp: appData.appName, phase: "done", lastResult: result })
  }

  return results
}
