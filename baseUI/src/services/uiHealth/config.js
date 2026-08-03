export const CANARY_KINDS = {
  focus: "focus",
  blur: "blur",
  uinav: "uinav",
  scope: "scope",
  actionMap: "actionMap",
  route: "route",
  controls: "controls",
  bridge: "bridge",
}

export const RECOVERY_KINDS = {
  focus: "focus",
  scope: "scope",
  actionMap: "actionMap",
  blocklist: "blocklist",
  mod: "mod",
  bridge: "bridge",
}

export const HEALTH_STATUS = {
  healthy: "healthy",
  suspicious: "suspicious",
  recovering: "recovering",
  failed: "failed", // terminal, unrecoverable (e.g. stream bridge not wired)
}

// source event names we listen to
export const EVENT_NAMES = {
  uinavFocus: "uinav-focus",
  uinavBlur: "uinav-blur",
  gameUiNavigation: "UINavigation",
  menuActionMapEnabled: "MenuActionMapEnabled",
  scopeChanged: "uiNav_scopeChanged",
  bridgeStreamSkipped: "BridgeStreamSkipped",
}

// a canary nav counts as "recent" while UI ownership is expected
export const RECENT_NAV_WINDOW_MS = 1500

// deferred diagnosis runs this long after the last canary in a burst
export const DEFERRED_DIAGNOSIS_MS = 850

// analog/stick input can fire canaries every frame; arm the schedulers at most
// this often so a continuous flood samples health instead of re-arming each tick
export const CANARY_THROTTLE_MS = 120

// per-kind recovery cooldowns; cheap repairs may run often; heavier ones rarely
export const RECOVERY_COOLDOWN_MS = {
  [RECOVERY_KINDS.focus]: 400,
  [RECOVERY_KINDS.scope]: 400,
  [RECOVERY_KINDS.actionMap]: 1000,
  [RECOVERY_KINDS.blocklist]: 1000,
  [RECOVERY_KINDS.bridge]: 2000,
}

// stream coordinator / hook readings are live sensor snapshots
// if they wedge, it is better to drop stale data and wait for the next reading
export const BRIDGE_STREAM_STUCK_MS = 2500

// stream frames are flowing but the coordinator has not been driven within this
// window -> the coordinator is orphaned (unrecoverable wiring fault, the poltergeist)
export const BRIDGE_STREAM_ORPHAN_MS = 2500

// dev-only ring buffer sizes
export const INCIDENT_LIMIT = 50
export const RECOVERY_LIMIT = 50

// mod crash recovery: mod is reloaded, but only while it stays under the crash budget within the rolling window
export const MOD_CRASH_WINDOW_MS = 10000
export const MOD_CRASH_LIMIT = 3
export const MOD_RELOAD_COOLDOWN_MS = 1000

// how crash budgets are grouped
export const MOD_CRASH_BUDGET_SCOPES = {
  file: "file", // one shared budget across all instances of the same mod file
  instance: "instance", // each mounted mod component tracked separately
}
export const MOD_CRASH_BUDGET_SCOPE = MOD_CRASH_BUDGET_SCOPES.file

// editable elements where forcing focus would interrupt typing
export const EDITABLE_TAGS = ["INPUT", "TEXTAREA", "SELECT"]
