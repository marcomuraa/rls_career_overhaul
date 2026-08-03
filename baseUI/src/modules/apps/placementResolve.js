// legacy app format example:
//   "placement": {
//     "position": "absolute",
//     "left":   "" | "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "right":  "" | "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "top":    "" | "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "bottom": "" | "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "width":  "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "height": "Npx" | "N%" | "Nem" | "Nrem" | number,
//     "margin": "auto"   // optional, used for centred axes
//   }
//
// per-axis anchor from populated edge:
//   - left filled, right="" or absent  -> anchored to start (left/top)
//   - right filled, left="" or absent  -> anchored to end (right/bottom)
//   - both sides numeric (0/0) plus margin:"auto" -> centred on that axis
// edit as px rects; rectPxToPlacement needs prevPlacement to preserve anchors

const TOLERANCE = 0.001
const DEFAULT_FONT_SIZE = 16

// demote centred axes after off-centre drags so saves stick
const CENTER_TOLERANCE = 8

const DEFAULT_MIN_WIDTH = 40
const DEFAULT_MIN_HEIGHT = 40

// always center newly added apps
export const IGNORE_APP_START_POSITION = false

// center only when starting position is missing or zero (left/right/top/bottom fields)
export const CENTER_APP_WITHOUT_START_POSITION = true

// parses legacy placement
//   number -> { value, unit: "px" }
//   "Npx"  -> { value: N, unit: "px" }
//   "N%"   -> { value: N, unit: "%" }
//   "Nem"  -> { value: N, unit: "em" }
//   "Nrem" -> { value: N, unit: "rem" }
//   bare digits string "12" -> { value: 12, unit: "px" }
//   "" / null / undefined / non-finite -> null
export function parsePlacementValue(raw) {
  if (raw == null) return null
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null
    return { value: raw, unit: "px" }
  }
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const match = trimmed.match(/^(-?\d*\.?\d+)\s*(px|%|em|rem)?$/i)
  if (!match) return null
  const value = parseFloat(match[1])
  if (!Number.isFinite(value)) return null
  const unit = (match[2] || "px").toLowerCase()
  return { value, unit }
}

// always emit px strings for write ops
export function formatPlacementValue(parsed, targetUnit = null) {
  if (!parsed) return ""
  void targetUnit
  return `${Math.round(parsed.value)}px`
}

function readComputedFontSize(element) {
  if (!element || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return DEFAULT_FONT_SIZE
  }
  const size = window.getComputedStyle(element, null).fontSize
  return parseFloat(size) || DEFAULT_FONT_SIZE
}

function getRootElement() {
  if (typeof document === "undefined") return null
  return document.documentElement || document.body || null
}

function getFrameElement(frame) {
  return frame?.element || frame?.el || null
}

function getEmFontSize(frame) {
  return readComputedFontSize(getFrameElement(frame) || getRootElement())
}

function getRemFontSize() {
  return readComputedFontSize(getRootElement())
}

function fontPxForUnit(unit, frame) {
  return unit === "em" ? getEmFontSize(frame) : getRemFontSize()
}

// %/em/rem against frame size or computed font-size (16px fallback)
function toPx(parsed, framePx, frame = null) {
  if (!parsed) return 0
  if (parsed.unit === "%") return (parsed.value * framePx) / 100
  if (parsed.unit === "em" || parsed.unit === "rem") return parsed.value * fontPxForUnit(parsed.unit, frame)
  return parsed.value
}

function isZeroPlacementValue(parsed) {
  return parsed !== null && Math.abs(parsed.value) < TOLERANCE
}

// decode one axis into start/end/center anchor mode
// returns { mode: "start" | "end" | "center", originalKey, originalValue }
function decodeAxis(placement, axis) {
  const startKey = axis === "x" ? "left" : "top"
  const endKey = axis === "x" ? "right" : "bottom"

  const startParsed = parsePlacementValue(placement?.[startKey])
  const endParsed = parsePlacementValue(placement?.[endKey])
  const margin = typeof placement?.margin === "string" ? placement.margin.trim().toLowerCase() : ""

  if (margin === "auto" && isZeroPlacementValue(startParsed) && isZeroPlacementValue(endParsed)) return { mode: "center" }

  // start side wins when both edges are set
  if (startParsed !== null) return { mode: "start", originalValue: startParsed }
  if (endParsed !== null) return { mode: "end", originalValue: endParsed }

  return { mode: "start", originalValue: { value: 0, unit: "px" } }
}

function axisToStartPx(axisInfo, sizePx, framePx, frame) {
  if (axisInfo.mode === "center") {
    return Math.max(0, (framePx - sizePx) / 2)
  }
  if (axisInfo.mode === "end") {
    const endPx = toPx(axisInfo.originalValue, framePx, frame)
    return framePx - sizePx - endPx
  }
  return toPx(axisInfo.originalValue, framePx, frame)
}

function encodeAxis(out, axis, prevAxisInfo, startPx, sizePx, framePx) {
  const startKey = axis === "x" ? "left" : "top"
  const endKey = axis === "x" ? "right" : "bottom"
  const px = value => formatPlacementValue({ value, unit: "px" }, "px")

  if (prevAxisInfo.mode === "center") {
    out[startKey] = px(0)
    out[endKey] = px(0)
    out.margin = "auto"
    return
  }

  if (prevAxisInfo.mode === "end") {
    const endPx = framePx - sizePx - startPx
    out[startKey] = ""
    out[endKey] = px(endPx)
    return
  }

  out[startKey] = px(startPx)
  out[endKey] = ""
}

const SIZE_CONSTRAINT_KEYS = ["min-width", "min-height", "max-width", "max-height"]

function hasDefinedStartEdge(parsed) {
  return parsed !== null && !isZeroPlacementValue(parsed)
}

function hasAppStartPosition(placement = {}) {
  if (!placement || typeof placement !== "object") return false

  const margin = typeof placement.margin === "string" ? placement.margin.trim().toLowerCase() : ""
  const left = parsePlacementValue(placement.left)
  const right = parsePlacementValue(placement.right)
  const top = parsePlacementValue(placement.top)
  const bottom = parsePlacementValue(placement.bottom)

  if (margin === "auto"
    && isZeroPlacementValue(left)
    && isZeroPlacementValue(right)
    && isZeroPlacementValue(top)
    && isZeroPlacementValue(bottom)) {
    return true
  }

  return hasDefinedStartEdge(left)
    || hasDefinedStartEdge(right)
    || hasDefinedStartEdge(top)
    || hasDefinedStartEdge(bottom)
}

export function centeredPlacementFromCss(css = {}) {
  const source = css && typeof css === "object" ? css : {}
  const placement = {
    position: typeof source.position === "string" && source.position ? source.position : "absolute",
    left: "0px",
    right: "0px",
    top: "0px",
    bottom: "0px",
    margin: "auto",
    width: source.width || "200px",
    height: source.height || "150px",
  }

  for (const key of SIZE_CONSTRAINT_KEYS) {
    if (source[key] != null) placement[key] = source[key]
  }

  return placement
}

export function initialPlacementFromCss(css = {}) {
  const source = css && typeof css === "object" ? css : {}
  const fallback = { left: "10px", top: "10px", width: "200px", height: "150px" }
  const base = Object.keys(source).length > 0 ? source : fallback

  if (IGNORE_APP_START_POSITION || (CENTER_APP_WITHOUT_START_POSITION && !hasAppStartPosition(base))) {
    return centeredPlacementFromCss(base)
  }

  return base
}

// legacy placement -> overlay px rect { x, y, width, height }
export function placementToRectPx(placement, frame) {
  const framePx = { width: Number(frame?.width) || 0, height: Number(frame?.height) || 0 }
  const widthParsed = parsePlacementValue(placement?.width)
  const heightParsed = parsePlacementValue(placement?.height)
  const width = widthParsed ? toPx(widthParsed, framePx.width, frame) : 0
  const height = heightParsed ? toPx(heightParsed, framePx.height, frame) : 0

  const xAxis = decodeAxis(placement, "x")
  const yAxis = decodeAxis(placement, "y")

  return {
    x: axisToStartPx(xAxis, width, framePx.width, frame),
    y: axisToStartPx(yAxis, height, framePx.height, frame),
    width,
    height,
  }
}

// px rect -> legacy placement; prevPlacement preserves anchor sides
export function rectPxToPlacement(rectPx, prevPlacement, frame) {
  const framePx = { width: Number(frame?.width) || 0, height: Number(frame?.height) || 0 }
  const prev = prevPlacement && typeof prevPlacement === "object" ? prevPlacement : {}
  const out = { ...prev }

  // force absolute positioning if the original implied it (legacy editor always wrote it)
  if (typeof prev.position === "string" && prev.position) {
    out.position = prev.position
  } else {
    out.position = "absolute"
  }

  out.width = formatPlacementValue({ value: rectPx.width, unit: "px" }, "px")
  out.height = formatPlacementValue({ value: rectPx.height, unit: "px" }, "px")

  const prevXAxis = maybeReanchor(decodeAxis(prev, "x"), rectPx.x, rectPx.width,  framePx.width)
  const prevYAxis = maybeReanchor(decodeAxis(prev, "y"), rectPx.y, rectPx.height, framePx.height)

  // drop stale margin:"auto" once neither axis stays centred
  if (prevXAxis.mode === "center" || prevYAxis.mode === "center") {
    out.margin = "auto"
  } else if (out.margin === "auto") {
    delete out.margin
  }

  encodeAxis(out, "x", prevXAxis, rectPx.x, rectPx.width, framePx.width)
  encodeAxis(out, "y", prevYAxis, rectPx.y, rectPx.height, framePx.height)

  return out
}

function maybeReanchor(axisInfo, startPx, sizePx, framePx) {
  if (axisInfo.mode !== "center") return axisInfo
  const centredStart = Math.max(0, (framePx - sizePx) / 2)
  if (Math.abs(startPx - centredStart) <= CENTER_TOLERANCE) return axisInfo
  return {
    mode: "start",
    originalValue: { value: startPx, unit: "px" },
  }
}

function readSizeConstraint(app, key, fallback, framePx, frame) {
  const raw = app?.[key] ?? app?.placement?.[key] ?? app?.css?.[key]
  const parsed = parsePlacementValue(raw)
  if (!parsed) return fallback
  return toPx(parsed, framePx, frame)
}

function clampRect(rect, app, frame) {
  const framePx = { width: Number(frame?.width) || 0, height: Number(frame?.height) || 0 }
  const minW = Math.max(0, readSizeConstraint(app, "min-width",  DEFAULT_MIN_WIDTH,  framePx.width, frame))
  const minH = Math.max(0, readSizeConstraint(app, "min-height", DEFAULT_MIN_HEIGHT, framePx.height, frame))
  const maxW = readSizeConstraint(app, "max-width",  framePx.width  || Infinity, framePx.width, frame)
  const maxH = readSizeConstraint(app, "max-height", framePx.height || Infinity, framePx.height, frame)

  const out = { ...rect }
  out.width = Math.max(minW, Math.min(out.width, maxW, framePx.width || out.width))
  out.height = Math.max(minH, Math.min(out.height, maxH, framePx.height || out.height))

  if (app?.preserveAspectRatio === true) {
    const baseRatio = aspectRatio(app, framePx, frame)
    if (baseRatio > 0) {
      const widthFromHeight = out.height * baseRatio
      const heightFromWidth = out.width / baseRatio
      if (widthFromHeight <= out.width) {
        out.width = widthFromHeight
      } else {
        out.height = heightFromWidth
      }
    }
  }

  out.x = Math.max(0, Math.min(out.x, Math.max(0, framePx.width  - out.width)))
  out.y = Math.max(0, Math.min(out.y, Math.max(0, framePx.height - out.height)))
  return out
}

function aspectRatio(app, framePx, frame) {
  const sources = [app?.placement, app?.css, app]
  for (const src of sources) {
    const w = parsePlacementValue(src?.width)
    const h = parsePlacementValue(src?.height)
    if (w && h) {
      const wPx = toPx(w, framePx.width, frame)
      const hPx = toPx(h, framePx.height, frame)
      if (wPx > 0 && hPx > 0) return wPx / hPx
    }
  }
  return 0
}

// overlay resolver: initial placement or clamped drag/resize rect
//   item.placement   - the legacy placement object owned by the layout store
//   item.app         - the app catalogue entry (used for min/max + aspect)
export function resolveUiAppPlacement(item, proposed, frame) {
  if (!proposed) {
    const initial = placementToRectPx(item?.placement || item?.app?.css || {}, frame)
    return clampRect(initial, item?.app, frame)
  }
  return clampRect({ ...proposed }, item?.app, frame)
}
