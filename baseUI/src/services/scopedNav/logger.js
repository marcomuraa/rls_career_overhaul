/**
 * Scoped Navigation Logger
 *
 * A wrapper around the existing logger service with its own enable/disable toggle
 * and independent log level control.
 * Disabled by default to avoid console noise.
 *
 * Usage:
 *   import { scopedNavLogger } from "@/services/scopedNav"
 *   scopedNavLogger.debug('Coordinator', 'Scope activated:', scopeId)
 *   // Output: [ScopedNav][Coordinator] Scope activated: xyz
 *
 * Runtime control (browser console):
 *   window.__SCOPED_NAV_LOG__.enable()
 *   window.__SCOPED_NAV_LOG__.disable()
 *   window.__SCOPED_NAV_LOG__.enabled
 *
 * Log level control:
 *   window.__SCOPED_NAV_LOG__.setLevel('info')  // only info, warn, error
 *   window.__SCOPED_NAV_LOG__.setLevel('warn')  // only warn, error
 *   window.__SCOPED_NAV_LOG__.setLevel('debug') // all levels (default)
 *   window.__SCOPED_NAV_LOG__.level             // current level bitmask
 */

import logger from "@/services/logger"

const config = { enabled: false, logLevel: logger.INFO }
const PREFIX = "[ScopedNav]"
const LEVEL_MAP = {
  debug: logger.DEBUG,
  info: logger.INFO,
  warn: logger.WARN,
  error: logger.ERROR,
}

function _log(method, source, ...msgs) {
  if (!config.enabled || LEVEL_MAP[method] < config.logLevel) return
  const subprefix = source ? `[${source}]` : ""
  logger[method](PREFIX + subprefix, ...msgs)
}

const scopedNavLogger = {
  get enabled() { return config.enabled },
  get logLevel() { return config.logLevel },

  enable() {
    config.enabled = true
    console.log(`${PREFIX} Logging enabled`)
  },

  disable() {
    config.enabled = false
    console.log(`${PREFIX} Logging disabled`)
  },

  setLevel(level) {
    config.logLevel = LEVEL_MAP[level] || logger.DEBUG
    console.log(`${PREFIX} Log level set to: ${level}`)
  },

  // Usage: scopedNavLogger.debug('Coordinator', 'message', data)
  debug: (source, ...msgs) => _log('debug', source, ...msgs),
  info: (source, ...msgs) => _log('info', source, ...msgs),
  warn: (source, ...msgs) => _log('warn', source, ...msgs),
  error: (source, ...msgs) => _log('error', source, ...msgs),
}

// Expose for runtime control
if (typeof window !== 'undefined') {
  window.__SCOPED_NAV_LOG__ = scopedNavLogger
}

export { scopedNavLogger }
export default scopedNavLogger
