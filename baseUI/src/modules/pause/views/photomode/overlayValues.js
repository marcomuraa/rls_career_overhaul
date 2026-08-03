// Photomode overlay value helpers.
// All conversions between the FORMAT.md-style string units ("N%", "-20px",
// etc.) and pixel geometry live here so the resolver, the renderer and any
// future editor share identical semantics.
//
// Position-axis rules (x/y) follow CSS background-position:
//   "N%"   -> the layer's N% point aligns with the frame's N% point.
//   "-N%"  -> equivalent to "(100 - N)%".
//   "Npx"  -> absolute inset from the frame's top/left edge.
//   "-Npx" -> anchors to the frame's right/bottom edge with that magnitude.
//
// Size-axis rules (width/height):
//   "N%"   -> N% of the corresponding frame dimension.
//   "Npx"  -> absolute pixels.
//   Sign is ignored on size values.

import { clamp } from "@/utils/maths"
import { RGBToHSL, HSLToHex } from "@/utils/color"
import { hexToRgb } from "@/utils/colorUtils"

const UNIT_PERCENT = "%"
const UNIT_PX = "px"
const SAFE_UNITS = new Set([UNIT_PERCENT, UNIT_PX])

const POSITION_AXES = ["x", "y"]
const POSITION_KEYS = Object.freeze({ x: "x", y: "y" })
const SIZE_KEYS = Object.freeze({ width: "width", height: "height" })

const DEFAULTS = Object.freeze({
  x: "0%",
  y: "0%",
  width: "100%",
  height: "100%",
  imagePosition: "50% 50%",
})

// Parses a string like "50%", "-20px" into its component parts.
// Returns null when the input is missing or unintelligible so callers can
// fall back to their own defaults without ambiguous zero values.
export function parseValue(raw) {
  if (raw == null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { sign: raw < 0 ? -1 : 1, unit: UNIT_PX, magnitude: Math.abs(raw) }
  }
  if (typeof raw !== "string") return null

  const trimmed = raw.trim()
  if (trimmed === "") return null

  const sign = trimmed.startsWith("-") ? -1 : 1
  const magnitudeSource = sign < 0 ? trimmed.slice(1).trim() : trimmed
  const match = magnitudeSource.match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z%]+)?$/)
  if (!match) return null

  const magnitude = parseFloat(match[1])
  if (!Number.isFinite(magnitude)) return null

  const unit = (match[2] || UNIT_PX).toLowerCase()
  if (!SAFE_UNITS.has(unit)) return null

  return { sign, unit, magnitude }
}

// Converts a parsed position value to pixels along one axis.
// `frameDim` is the photo frame dimension on that axis; `elementSize` is
// the layer's already-resolved size on the same axis (needed for the
// background-position percent semantics and the negative-px anchor flip).
export function positionToPx(parsed, frameDim, elementSize) {
  if (!parsed) return 0
  const frame = Number(frameDim) || 0
  const size = Number(elementSize) || 0

  if (parsed.unit === UNIT_PERCENT) {
    const pct = parsed.sign < 0 ? 100 - parsed.magnitude : parsed.magnitude
    return (pct * (frame - size)) / 100
  }

  if (parsed.unit === UNIT_PX) {
    return parsed.sign < 0 ? frame - size - parsed.magnitude : parsed.magnitude
  }

  return 0
}

// Converts a parsed size value to pixels. Sign is ignored per FORMAT.md.
export function sizeToPx(parsed, frameDim) {
  if (!parsed) return 0
  const frame = Number(frameDim) || 0
  const magnitude = Math.abs(parsed.magnitude)

  if (parsed.unit === UNIT_PERCENT) return (magnitude * frame) / 100
  if (parsed.unit === UNIT_PX) return magnitude
  return 0
}

// Public facade that picks the right conversion based on which axis we are
// resolving. Defaults to size semantics when the caller can't be more
// specific (the resolver never actually hits that branch).
export function toPx(parsed, frameDim, elementSize, axisKind = "size") {
  if (axisKind === "position") return positionToPx(parsed, frameDim, elementSize)
  return sizeToPx(parsed, frameDim)
}

// Produces a string value in the same unit+sign shape as `shape`, solving
// for the magnitude that reproduces `px` on the given frame axis. Used by
// the future editor's @item-changed handler so user-edited values keep the
// unit the author originally typed instead of silently collapsing to px.
export function fromPx(px, frameDim, elementSize, shape) {
  const base = shape && typeof shape === "object"
    ? shape
    : parseValue(shape) || { unit: UNIT_PERCENT, sign: 1 }
  const frame = Number(frameDim) || 0
  const size = Number(elementSize) || 0
  const unit = base.unit === UNIT_PX ? UNIT_PX : UNIT_PERCENT

  if (unit === UNIT_PX) {
    if (base.sign < 0) {
      const magnitude = frame - size - px
      return `${magnitude < 0 ? 0 : magnitude}px`.replace(/^-/, "-")
    }
    return `${Math.round(px)}px`
  }

  const range = frame - size
  if (base.sign < 0) {
    const pct = range > 0 ? 100 - (px * 100) / range : 0
    return `-${formatPct(pct)}%`
  }
  const pct = range > 0 ? (px * 100) / range : 0
  return `${formatPct(pct)}%`
}

function formatPct(value) {
  const rounded = Math.round(value * 100) / 100
  return Number.isFinite(rounded) ? String(rounded) : "0"
}

// -----------------------------------------------------------------------
// Resolver wiring for <Overlay>.

function resolveInitial(item, frame) {
  const widthParsed = parseValue(item.width ?? DEFAULTS.width)
    || parseValue(DEFAULTS.width)
  const heightParsed = parseValue(item.height ?? DEFAULTS.height)
    || parseValue(DEFAULTS.height)

  const width = sizeToPx(widthParsed, frame.width)
  const height = sizeToPx(heightParsed, frame.height)

  const xParsed = parseValue(item.x ?? DEFAULTS.x) || parseValue(DEFAULTS.x)
  const yParsed = parseValue(item.y ?? DEFAULTS.y) || parseValue(DEFAULTS.y)

  const x = positionToPx(xParsed, frame.width, width)
  const y = positionToPx(yParsed, frame.height, height)

  return { x, y, width, height }
}

function clampToFrame(g, frame) {
  const clamped = { ...g }
  clamped.width = clamp(g.width, 0, frame.width)
  clamped.height = clamp(g.height, 0, frame.height)
  clamped.x = clamp(g.x, 0, frame.width - clamped.width)
  clamped.y = clamp(g.y, 0, frame.height - clamped.height)
  return clamped
}

// resolve(item, proposed, frame) contract for the <Overlay> component.
// Initial derivation uses the FORMAT.md unit rules; active edits clamp the
// proposed rect inside the frame but otherwise trust the overlay to have
// already honoured the snapping + keyboard step.
export function resolveLayer(item, proposed, frame) {
  if (!proposed) return resolveInitial(item, frame)
  return clampToFrame(proposed, frame)
}

// -----------------------------------------------------------------------
// Livery-tint colour helpers.
//
// Livery layers persist their tint as a `#rrggbb` hex string in the JSON
// (readable + hand-editable). BngColorPicker works in HSL space with each
// channel normalised to 0..1, so we bridge the two via the shared colour
// utils rather than re-implementing the maths here.

// "#rgb" / "#rrggbb" -> { hue, saturation, luminosity } (0..1) for
// BngColorPicker. Returns null for empty/invalid input so callers can fall
// back to a default. Shorthand is expanded before parsing because hexToRgb
// treats the whole string as one integer (so "f00" would misparse as 0xf00).
export function hexToPickerColor(hex) {
  if (typeof hex !== "string") return null
  const match = hex.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return null
  const digits = match[1].length === 3
    ? match[1].replace(/./g, c => c + c)
    : match[1]
  const [r, g, b] = hexToRgb(digits).split(",").map(v => Number(v) / 255)
  const [hue, saturation, luminosity] = RGBToHSL(r, g, b)
  return { hue, saturation, luminosity }
}

// { hue, saturation, luminosity } (0..1) -> "#rgb"/"#rrggbb" (HSLToHex emits
// shorthand where it can; hexToPickerColor reads both, so the round-trip holds).
export function pickerColorToHex(color) {
  return HSLToHex({
    hue: Number(color?.hue) || 0,
    saturation: Number(color?.saturation) || 0,
    luminosity: Number(color?.luminosity) || 0,
  })
}

export const OVERLAY_VALUE_DEFAULTS = DEFAULTS
export const OVERLAY_POSITION_KEYS = POSITION_KEYS
export const OVERLAY_SIZE_KEYS = SIZE_KEYS
export const OVERLAY_POSITION_AXES = POSITION_AXES
