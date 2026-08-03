// NOTE: The overlay deals exclusively in pixels internally.
//       Any coordinate-system translation is the consumer's responsibility (via `resolve` function)

/**
 * @typedef {Object} Item
 * @property {string} id Stable unique identifier; the only required field.
 *   All other fields are opaque to the overlay and forwarded to `resolve`
 *   and to the default slot as `item`.
 */

/**
 * @typedef {Object} RectPx
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} Frame
 * @property {number} width
 * @property {number} height
 * @property {HTMLElement | null} [element]
 */

/**
 * @typedef {RectPx & { op: "move" | "resize" }} Proposed
 */

/**
 * @callback ResolveFn
 * @param {Item} item
 * @param {Proposed | undefined} proposed
 *   Undefined means "initial derivation" (first mount, items array change, frame resize).
 *   When present, the consumer should clamp/constrain the proposed px rect and return the final px.
 * @param {Frame} frame
 *   The overlay's current frame size in pixels, plus the frame element when available.
 * @returns {RectPx}
 */

/**
 * @typedef {Object} Guide
 * @property {"x" | "y"} axis
 * @property {number} at        Pixel coordinate on the axis where the guide line sits.
 * @property {number} from      Start of the guide line on the perpendicular axis.
 * @property {number} to        End of the guide line on the perpendicular axis.
 * @property {string} [label]   Optional distance/name label painted next to the guide.
 * @property {string} [kind]    Optional tag used by OverlayGuides for styling (edge/centre/sibling/grid).
 */

/**
 * @typedef {Object} SnapConfig
 * @property {boolean} [edges]       Snap to frame edges (default true).
 * @property {boolean} [centre]      Snap to frame centre (default true).
 * @property {number | null} [grid]  Grid step in pixels, or null to disable (default null).
 * @property {number} [threshold]    Snap threshold in pixels (default 8).
 */

/**
 * Handle directions used by the controller when a resize begins.
 * @readonly
 * @enum {string}
 */
export const HandleDir = Object.freeze({
  N:  "n",
  S:  "s",
  E:  "e",
  W:  "w",
  NE: "ne",
  NW: "nw",
  SE: "se",
  SW: "sw",
})

/**
 * Controller op tags (matches Proposed.op).
 * @readonly
 * @enum {string}
 */
export const Op = Object.freeze({
  Move:   "move",
  Resize: "resize",
})

/**
 * Default snap configuration.
 * @type {Required<SnapConfig>}
 */
export const DEFAULT_SNAP = Object.freeze({
  edges: true,
  centre: true,
  grid: null,
  threshold: 8,
})

/**
 * Adjust mode sub-mode for uinav-driven editing.
 * @readonly
 * @enum {string}
 */
export const NavMode = Object.freeze({
  Move:   "move",
  Resize: "resize",
})

/**
 * @typedef {Object} AdjustState
 * @property {boolean} active        Whether the controller is currently in Adjust mode.
 * @property {string|null} itemId    Id of the item being adjusted, if any.
 * @property {"move"|"resize"} mode  Active sub-mode (focus_* moves vs. resizes).
 */

/**
 * Discrete focus_l/r/u/d step (pixels) when modifier is OFF.
 */
export const STEP_PX = 1

/**
 * Discrete focus_l/r/u/d step (pixels) when modifier is HELD.
 */
export const STEP_PX_LARGE = 10

/**
 * Continuous scalar-stick speed (pixels per second) when modifier is OFF.
 * Applied to focus_lr / focus_ud while the stick is deflected.
 */
export const STICK_SPEED_PX = 240

/**
 * Continuous scalar-stick speed (pixels per second) when modifier is HELD.
 */
export const STICK_SPEED_PX_LARGE = 960

/**
 * Stick deadzone applied to scalar focus_lr / focus_ud values before they
 * contribute to motion. Anything below this magnitude is treated as zero.
 */
export const STICK_DEADZONE = 0.15
