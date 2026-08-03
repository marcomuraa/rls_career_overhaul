import { computed, toValue } from "vue"
import { DEFAULT_SNAP, HandleDir } from "../types"

const EPS = 0.5 // px tolerance for post-resolve guide liveness check

/**
 * @typedef {Object} SnapTarget
 * @property {"x" | "y"} axis
 * @property {number} at
 * @property {"frame-edge" | "frame-centre" | "sibling-edge" | "sibling-centre" | "grid"} source
 * @property {{ x:number, y:number, width:number, height:number }} [sourceRect]
 * @property {string} [label]
 */

/**
 * Snap engine: given a raw proposed rect, returns an adjusted rect + candidate guides.
 * Guides are filtered against the final post-resolve rect separately, via
 * `filterActiveGuides`, so the controller can run it after `resolve`.
 *
 * Move ops snap all three edges per axis (min/centre/max); resize ops only snap the
 * edges actually moving for that handle direction.
 *
 * @param {import("vue").MaybeRefOrGetter<import("../types").Item[]>} itemsSource
 * @param {import("vue").ComputedRef<import("../types").Frame>} frame
 * @param {import("vue").MaybeRefOrGetter<import("../types").SnapConfig | undefined>} configSource
 * @param {(id:string) => import("../types").RectPx | undefined} getGeometry
 *   Reads sibling rects from the geometry cache so snapping reflects what's on screen.
 */
export default function useOverlaySnapping(itemsSource, frame, configSource, getGeometry) {
  const items = computed(() => toValue(itemsSource) ?? [])

  const config = computed(() => {
    const raw = toValue(configSource) || {}
    return {
      edges:     raw.edges     !== false && DEFAULT_SNAP.edges,
      centre:    raw.centre    !== false && DEFAULT_SNAP.centre,
      grid:      Number.isFinite(raw.grid) && raw.grid > 0 ? raw.grid : DEFAULT_SNAP.grid,
      threshold: Number.isFinite(raw.threshold) ? raw.threshold : DEFAULT_SNAP.threshold,
    }
  })

  function collectTargets(excludeId) {
    /** @type {SnapTarget[]} */
    const out = []
    const f = frame.value
    if (!f) return out
    const cfg = config.value

    if (cfg.edges) {
      out.push({ axis: "x", at: 0,         source: "frame-edge" })
      out.push({ axis: "x", at: f.width,   source: "frame-edge" })
      out.push({ axis: "y", at: 0,         source: "frame-edge" })
      out.push({ axis: "y", at: f.height,  source: "frame-edge" })
    }
    if (cfg.centre) {
      out.push({ axis: "x", at: f.width  / 2, source: "frame-centre" })
      out.push({ axis: "y", at: f.height / 2, source: "frame-centre" })
    }

    for (const it of items.value) {
      if (!it || it.id == null || it.id === excludeId) continue
      const r = getGeometry?.(it.id)
      if (!r) continue
      const minX = r.x
      const maxX = r.x + r.width
      const midX = r.x + r.width / 2
      const minY = r.y
      const maxY = r.y + r.height
      const midY = r.y + r.height / 2
      if (cfg.edges) {
        out.push({ axis: "x", at: minX, source: "sibling-edge",   sourceRect: r })
        out.push({ axis: "x", at: maxX, source: "sibling-edge",   sourceRect: r })
        out.push({ axis: "y", at: minY, source: "sibling-edge",   sourceRect: r })
        out.push({ axis: "y", at: maxY, source: "sibling-edge",   sourceRect: r })
      }
      if (cfg.centre) {
        out.push({ axis: "x", at: midX, source: "sibling-centre", sourceRect: r })
        out.push({ axis: "y", at: midY, source: "sibling-centre", sourceRect: r })
      }
    }

    return out
  }

  /**
   * Which edges are "moving" and eligible to snap for a given op + handle direction.
   * Returns { x: string[], y: string[] } of "min" | "centre" | "max".
   */
  function movingEdges(op, handle) {
    if (op !== "resize") {
      // Move: all edges on both axes are candidates.
      return {
        x: ["min", "centre", "max"],
        y: ["min", "centre", "max"],
      }
    }
    const x = []
    const y = []
    switch (handle) {
      case HandleDir.N:  y.push("min"); break
      case HandleDir.S:  y.push("max"); break
      case HandleDir.E:  x.push("max"); break
      case HandleDir.W:  x.push("min"); break
      case HandleDir.NE: y.push("min"); x.push("max"); break
      case HandleDir.NW: y.push("min"); x.push("min"); break
      case HandleDir.SE: y.push("max"); x.push("max"); break
      case HandleDir.SW: y.push("max"); x.push("min"); break
      default: break
    }
    return { x, y }
  }

  function edgePositions(rect, axis) {
    if (axis === "x") {
      return {
        min:    rect.x,
        centre: rect.x + rect.width / 2,
        max:    rect.x + rect.width,
      }
    }
    return {
      min:    rect.y,
      centre: rect.y + rect.height / 2,
      max:    rect.y + rect.height,
    }
  }

  /**
   * Given an original rect and a desired adjustment on an edge, return the new rect.
   * Move shifts the whole rect so the edge lands on `at`; resize moves only that edge.
   */
  function applyEdgeAdjust(rect, axis, edge, at, op) {
    const next = { ...rect }
    if (op === "resize") {
      if (axis === "x") {
        if (edge === "min") {
          const right = rect.x + rect.width
          next.x = Math.min(at, right)
          next.width = Math.max(0, right - next.x)
        } else if (edge === "max") {
          next.width = Math.max(0, at - rect.x)
        }
      } else {
        if (edge === "min") {
          const bottom = rect.y + rect.height
          next.y = Math.min(at, bottom)
          next.height = Math.max(0, bottom - next.y)
        } else if (edge === "max") {
          next.height = Math.max(0, at - rect.y)
        }
      }
      return next
    }
    if (axis === "x") {
      const edges = edgePositions(rect, "x")
      next.x = rect.x + (at - edges[edge])
    } else {
      const edges = edgePositions(rect, "y")
      next.y = rect.y + (at - edges[edge])
    }
    return next
  }

  /**
   * Snaps the proposed rect for an item. `adjusted` applies (up to) one snap per axis -
   * the smallest winning delta across all moving edges. `candidateGuides` lists every
   * target that participated, for the controller to filter against the final post-resolve rect.
   *
   * @param {import("../types").Item} item
   * @param {import("../types").RectPx} raw
   * @param {"move" | "resize"} op
   * @param {string} [handle]
   */
  function snap(item, raw, op, handle) {
    const cfg = config.value
    const threshold = cfg.threshold
    const targets = collectTargets(item?.id)

    let adjusted = { ...raw }
    /** @type {import("../types").Guide[]} */
    const candidateGuides = []

    const moving = movingEdges(op, handle)

    for (const axis of /** @type {const} */ (["x", "y"])) {
      const edges = moving[axis]
      if (!edges.length) continue

      let best = null
      // Independently evaluate every (edge, target) pair; take the smallest-delta winner.
      for (const edge of edges) {
        const myEdges = edgePositions(adjusted, axis)
        const from = myEdges[edge]
        for (const t of targets) {
          if (t.axis !== axis) continue
          const delta = t.at - from
          const abs   = Math.abs(delta)
          if (abs > threshold) continue
          if (!best || abs < best.abs) {
            best = { abs, delta, target: t, edge }
          }
        }
      }

      // Grid snap falls back when no regular target is within threshold for this axis.
      if (!best && cfg.grid && cfg.grid > 0) {
        for (const edge of edges) {
          const myEdges = edgePositions(adjusted, axis)
          const from = myEdges[edge]
          const snappedAt = Math.round(from / cfg.grid) * cfg.grid
          const delta = snappedAt - from
          const abs   = Math.abs(delta)
          if (abs > threshold) continue
          if (!best || abs < best.abs) {
            best = {
              abs,
              delta,
              target: { axis, at: snappedAt, source: "grid" },
              edge,
            }
          }
        }
      }

      if (!best) continue

      adjusted = applyEdgeAdjust(adjusted, axis, best.edge, best.target.at, op)

      // Emit a guide for the winning target (grid snaps emit no guide).
      if (best.target.source !== "grid") {
        candidateGuides.push(buildGuide(best.target, adjusted))
      }
    }

    return { adjusted, candidateGuides }
  }

  /**
   * Produce a Guide line spanning the union of the active rect and the sibling
   * rect (if any) that produced the snap. Frame-wide guides span the whole frame.
   */
  function buildGuide(target, activeRect) {
    const f = frame.value || { width: 0, height: 0 }
    if (target.axis === "x") {
      let from = 0, to = f.height
      if (target.sourceRect) {
        from = Math.min(target.sourceRect.y, activeRect.y)
        to   = Math.max(target.sourceRect.y + target.sourceRect.height, activeRect.y + activeRect.height)
      }
      return {
        axis: "x",
        at: target.at,
        from, to,
        kind: target.source,
      }
    }
    let from = 0, to = f.width
    if (target.sourceRect) {
      from = Math.min(target.sourceRect.x, activeRect.x)
      to   = Math.max(target.sourceRect.x + target.sourceRect.width, activeRect.x + activeRect.width)
    }
    return {
      axis: "y",
      at: target.at,
      from, to,
      kind: target.source,
    }
  }

  /**
   * Filter candidate guides to those still accurate against the final rect - "live" if
   * at least one edge/centre of `finalRect` lines up with `guide.at` on its axis (within EPS).
   *
   * @param {import("../types").Guide[]} guides
   * @param {import("../types").RectPx} finalRect
   * @returns {import("../types").Guide[]}
   */
  function filterActiveGuides(guides, finalRect) {
    const xs = [finalRect.x, finalRect.x + finalRect.width / 2, finalRect.x + finalRect.width]
    const ys = [finalRect.y, finalRect.y + finalRect.height / 2, finalRect.y + finalRect.height]
    const out = []
    for (const g of guides) {
      const set = g.axis === "x" ? xs : ys
      if (set.some(v => Math.abs(v - g.at) <= EPS)) out.push(g)
    }
    return out
  }

  return {
    snap,
    filterActiveGuides,
    config,
  }
}
