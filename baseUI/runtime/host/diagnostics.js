// runtime-loader telemetry
//   window.bngRuntimeStats - runtime stats
//   window.__rt - opt-in debug aids for ui_eval inspection (dev/HMR only)

const noop = () => {}
const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())
const baseName = p => String(p || "").split("/").pop() || p

const root = typeof window !== "undefined" ? window : globalThis

// build-time flag, read typeof-guarded so node self-checks (no vite define) don't throw
const RT_DEV = typeof __BNG_RT_DEV__ !== "undefined" && __BNG_RT_DEV__
const RT_PROD = !RT_DEV

// session caps so diag arrays never grow without bound
const MAX_FILES = 500
const MAX_ERRORS = 200
const MAX_TX_PER_ID = 5

const pushCapped = (arr, item, max) => { arr.push(item); if (arr.length > max) arr.shift() }

// notify the loading overlay on inflight 0<->n transitions
const emitInflight = active => { try { root.vueEventBus?.emit?.("UiRuntimeInflight", active) } catch { } }

export const stats = root.bngRuntimeStats || (root.bngRuntimeStats = {
  count: 0, last: "", stage: "", done: false, files: [], inflight: [],

  // warm-cache accounting (dev only)
  hits: 0, // served from the persistent cache
  built: 0, // (re)compiled this session
  buildMs: 0, // cumulative time spent building them

  // cumulative phase breakdown (ms) - sums concurrent work time (dev only)
  phases: { fetch: 0, scss: 0, sfc: 0, cjs: 0, idb: 0 },
})

export const recordHit = RT_PROD ? noop :
  () => { stats.hits++ }
export const recordBuild = RT_PROD ? noop :
  ms => { stats.built++; stats.buildMs += ms }
export const recordPhase = RT_PROD ? noop :
  (name, ms) => { stats.phases[name] = (stats.phases[name] || 0) + ms }

// live phase for runtime debug visualisation (e.g. "compiling style: x.vue")
export const setStage = RT_PROD ? noop :
  (phase, path) => { stats.stage = path ? `${phase}: ${baseName(path)}` : phase }
export const setDone = () => { stats.done = true; stats.stage = "" }

// per-file timing: a fetch+transform+compile span, with ok/fail flag
export function startFile(clean) {
  stats.count++
  stats.last = clean
  const startedAt = nowMs()
  stats.inflight.push({ path: clean, startedAt })
  if (stats.inflight.length === 1) emitInflight(true)
  return startedAt
}
export function endFile(clean, startedAt, ok) {
  const i = stats.inflight.findIndex(e => e.path === clean)
  if (i >= 0) {
    stats.inflight.splice(i, 1)
    if (stats.inflight.length === 0) emitInflight(false)
  }
  pushCapped(stats.files, { path: clean, ms: nowMs() - startedAt, ok }, MAX_FILES)
}

// debug aids grouped here so a single `window.__rt` is inspectable from ui_eval
const dbg = root.__rt || (root.__rt = {
  tx: {}, lastFetch: "", fetchErr: [], cjsThrow: null, exec: "", vueErrors: [],
})

export const recordTransform = RT_PROD ? noop :
  (id, code) => pushCapped(dbg.tx[id] || (dbg.tx[id] = []), code, MAX_TX_PER_ID)
export const noteLastFetch = RT_PROD ? noop :
  url => { dbg.lastFetch = url }
export const recordFetchError = RT_PROD ? noop :
  (url, e) => pushCapped(dbg.fetchErr, { url, msg: String(e && e.message || e) }, MAX_ERRORS)
export const recordExec = RT_PROD ? noop :
  id => { dbg.exec = id }

// fatal-error capture stays on in prod too - a broken boot needs diagnosing either way
export const recordCjsThrow = (id, err) => {
  if (dbg.cjsThrow) return
  dbg.cjsThrow = { path: id, message: String(err && err.message || err), stack: String(err && err.stack || "").slice(0, 700) }
}
export const setBootError = err => {
  root.__rtBootError = { message: String(err && err.message || err), stack: String(err && err.stack || "") }
}

// vue routes runtime errors to `console.error`, not to our boot globals.
// mirror them into `window.__rt.vueErrors` for inspection after the fact
export const tapConsoleErrors = RT_PROD ? noop : () => {
  if (root.__rtErrTapped) return
  root.__rtErrTapped = true
  const orig = console.error.bind(console)
  console.error = (...args) => {
    try {
      pushCapped(dbg.vueErrors, args.map(a => (a && a.stack) ? String(a.stack) : String(a)).join(" "), MAX_ERRORS)
    } catch { }
    orig(...args)
  }
}
