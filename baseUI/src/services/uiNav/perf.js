/**
 * Dev-only sequential performance tracker for directional UINav focus movement.
 *
 * For hot paths, always wrap the following examples with DEV_ONLY
 *
 * @example
 * // starts tracking only for focus_l/r/u/d/lr/ud
 * const perfId = perfLog(name, "eventBus:UINavigation", { value })
 * // closes the previous mark and starts this segment
 * perfMark(perfId, "dispatchDOMEvent:start")
 * // closes the current segment and records total time
 * perfEndEvent(perfId, { defaultPrevented: event.defaultPrevented })
 *
 * @example
 * // uses the current event set by perfSetCurrentEvent()
 * const token = perfStart(null, "crossfire.collectRects")
 * // splits the function into phases
 * perfMark(null, "crossfire.collectRects.measureCandidates", { candidates: ns.length })
 * // closes the active segment for this function
 * perfEnd(token, { cacheHit: false, available: links.up.length })
 *
 * @example
 * // lets nested Crossfire helpers use perfStart(null, ...)
 * perfSetCurrentEvent(event.detail.perfId)
 * // clears the implicit event after the path finishes
 * perfClearCurrentEvent(event.detail.perfId)
 *
 * @example
 * // clear collected samples before testing a screen
 * window.uiNav.perf.reset()
 * // print mark-name stats sorted by total time
 * window.uiNav.perf.dump()
 * // tune console noise and summary cadence
 * window.uiNav.perf.configure({ slowMeasureThresholdMs: 2, slowEventThresholdMs: 10, summaryEvery: 25 })
 */

const EVENTS = new Set(["focus_l", "focus_r", "focus_u", "focus_d", "focus_lr", "focus_ud"])

const MAX_HISTORY = 120

let slowMeasureThresholdMs = 4
let slowEventThresholdMs = 12
let summaryEvery = 50

let sequence = 0
let currentPerfId = null
let completedEvents = 0
let markSequence = 0

const activeEvents = new Map()
const stats = new Map()
const history = []

const now = () => performance?.now ? performance.now() : Date.now()
const round = value => Math.round(value * 100) / 100

function getEventRecord(eventRef) {
  const perfId = typeof eventRef === "string" && activeEvents.has(eventRef) ? eventRef : currentPerfId
  return perfId ? activeEvents.get(perfId) : null
}

function updateStats(markName, duration, data = null) {
  const key = markName
  let entry = stats.get(key)
  if (!entry) {
    entry = {
      markName,
      count: 0,
      totalMs: 0,
      averageMs: 0,
      maxMs: 0,
      lastMs: 0,
      lastData: null,
    }
    stats.set(key, entry)
  }

  entry.count += 1
  entry.totalMs += duration
  entry.averageMs = entry.totalMs / entry.count
  entry.maxMs = Math.max(entry.maxMs, duration)
  entry.lastMs = duration
  entry.lastData = data
  return entry
}

function getLogData(data, extra = {}) {
  return data && typeof data === "object" ? { ...data, ...extra } : extra
}

function closeCurrentMark(record, endTime = now(), data = undefined) {
  const mark = record.currentMark
  if (!mark) return null

  const duration = endTime - mark.time
  const resolvedData = data === undefined ? mark.data : data
  const entry = updateStats(mark.markName, duration, resolvedData)
  const completedMark = {
    markName: mark.markName,
    time: mark.time,
    duration,
    sinceStart: mark.time - record.startedAt,
    endSinceStart: endTime - record.startedAt,
    data: resolvedData,
  }

  record.marks.push(completedMark)
  record.currentMark = null
  printSlowMeasure(mark.markName, duration, getLogData(resolvedData, {
    averageMs: round(entry.averageMs),
    maxMs: round(entry.maxMs),
  }))
  return completedMark
}

function startMark(record, markName, data = null, markId = null) {
  const time = now()
  closeCurrentMark(record, time)
  const mark = {
    id: markId,
    markName,
    time,
    data,
  }

  record.currentMark = mark
  return mark
}

function printSlowMeasure(markName, duration, data) {
  if (duration < slowMeasureThresholdMs) return
  console.debug(`[UINavPerf] ${markName}: ${round(duration)}ms`, data || "")
}

function printSlowEvent(record, duration, data) {
  if (duration < slowEventThresholdMs) return
  console.warn(`[UINavPerf] slow focus movement: ${round(duration)}ms`, {
    id: record.id,
    value: record.value,
    marks: record.marks.map(mark => ({
      mark: mark.markName,
      durationMs: round(mark.duration),
      startMs: round(mark.sinceStart),
      endMs: round(mark.endSinceStart),
      data: mark.data,
    })),
    data,
  })
}

function printSummary() {
  if (!summaryEvery || completedEvents % summaryEvery !== 0) return
  dumpUINavPerfStats(12)
}

export function isUINavPerfEvent(eventName, value = 1) {
  let isPerfEvent = false
  // DEV_ONLY >>
  isPerfEvent = EVENTS.has(eventName) && Number(value) !== 0
  // << DEV_ONLY
  return isPerfEvent
}

export function perfLog(uinavEventName, markName, data = null) {
  let perfId = null
  // DEV_ONLY >>
  if (isUINavPerfEvent(uinavEventName, data?.value ?? 1)) {
    const time = now()
    perfId = `${++sequence}`
    const record = {
      id: perfId,
      eventName: uinavEventName,
      value: data?.value,
      startedAt: time,
      marks: [],
      currentMark: null,
    }

    activeEvents.set(perfId, record)
    startMark(record, markName, data)
  }
  // << DEV_ONLY
  return perfId
}

export function perfMark(eventRef, markName, data = null) {
  let mark = null
  // DEV_ONLY >>
  const record = getEventRecord(eventRef)
  if (record) mark = startMark(record, markName, data)
  // << DEV_ONLY
  return mark
}

export function perfStart(eventRef, markName, data = null) {
  let token = null
  // DEV_ONLY >>
  const record = getEventRecord(eventRef)
  if (record) {
    const markId = ++markSequence
    startMark(record, markName, data, markId)
    token = {
      id: record.id,
      markId,
      markName,
      data,
    }
  }
  // << DEV_ONLY
  return token
}

export function perfEnd(token, data = null) {
  // DEV_ONLY >>
  if (!token) return

  const record = activeEvents.get(token.id)
  if (!record) return
  closeCurrentMark(record, now(), data || token.data)
  // << DEV_ONLY
}

export function perfSetCurrentEvent(perfId) {
  // DEV_ONLY >>
  if (perfId && activeEvents.has(perfId)) currentPerfId = perfId
  // << DEV_ONLY
}

export function perfClearCurrentEvent(perfId) {
  // DEV_ONLY >>
  if (!perfId || currentPerfId === perfId) currentPerfId = null
  // << DEV_ONLY
}

export function perfEndEvent(eventRef, data = null) {
  // DEV_ONLY >>
  const record = getEventRecord(eventRef)
  if (!record) return

  const duration = now() - record.startedAt
  closeCurrentMark(record, record.startedAt + duration, data)
  updateStats("event:total", duration, data)
  completedEvents += 1
  history.push({
    id: record.id,
    value: record.value,
    totalMs: duration,
    data,
    marks: record.marks,
  })
  if (history.length > MAX_HISTORY) history.shift()

  printSlowEvent(record, duration, data)
  printSummary()
  activeEvents.delete(record.id)
  if (currentPerfId === record.id) currentPerfId = null
  // << DEV_ONLY
}

export function getUINavPerfStats() {
  let rows = []
  // DEV_ONLY >>
  rows = [...stats.values()]
    .map(entry => ({
      markName: entry.markName,
      count: entry.count,
      totalMs: round(entry.totalMs),
      averageMs: round(entry.averageMs),
      maxMs: round(entry.maxMs),
      lastMs: round(entry.lastMs),
      lastData: entry.lastData,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
  // << DEV_ONLY
  return rows
}

export function getUINavPerfHistory() {
  let rows = []
  // DEV_ONLY >>
  rows = history.map(entry => ({
    ...entry,
    totalMs: round(entry.totalMs),
    marks: entry.marks.map(mark => ({
      ...mark,
      duration: round(mark.duration),
      sinceStart: round(mark.sinceStart),
      endSinceStart: round(mark.endSinceStart),
    })),
  }))
  // << DEV_ONLY
  return rows
}

export function dumpUINavPerfStats(limit = 25) {
  let rows = []
  // DEV_ONLY >>
  rows = getUINavPerfStats().slice(0, limit)
  console.table(rows.map(({ markName, count, totalMs, averageMs, maxMs, lastMs }) => ({
    markName,
    count,
    totalMs,
    averageMs,
    maxMs,
    lastMs,
  })))
  // << DEV_ONLY
  return rows
}

export function resetUINavPerfStats() {
  // DEV_ONLY >>
  activeEvents.clear()
  stats.clear()
  history.length = 0
  currentPerfId = null
  completedEvents = 0
  markSequence = 0
  // << DEV_ONLY
}

export function configureUINavPerf(options = {}) {
  // DEV_ONLY >>
  if (typeof options.slowMeasureThresholdMs === "number") slowMeasureThresholdMs = options.slowMeasureThresholdMs
  if (typeof options.slowEventThresholdMs === "number") slowEventThresholdMs = options.slowEventThresholdMs
  if (typeof options.summaryEvery === "number") summaryEvery = options.summaryEvery
  // << DEV_ONLY
}

// DEV_ONLY >>
window.uiNav = window.uiNav || {}
window.uiNav.perf = {
  configure: configureUINavPerf,
  dump: dumpUINavPerfStats,
  history: getUINavPerfHistory,
  reset: resetUINavPerfStats,
  stats: getUINavPerfStats,
}
// << DEV_ONLY
