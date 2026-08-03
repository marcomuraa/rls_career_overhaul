import { reactive, shallowRef, ref, toValue } from "vue"
import {
  HandleDir,
  Op,
  NavMode,
  STEP_PX,
  STEP_PX_LARGE,
  STICK_SPEED_PX,
  STICK_SPEED_PX_LARGE,
  STICK_DEADZONE,
} from "../types"

/**
 * Pointer + uinav state machine for a single active move/resize interaction.
 *
 * uinav adjust mode has no preview/commit split - each discrete step lands as a
 * real commit (unlike pointer drag, which previews until pointerup). The controller
 * owns no DOM listeners itself; the component wires `beginMove`/`beginResize` to
 * pointerdown and `handleUiNav` to the overlay's root `ui_nav` listener.
 *
 * @param {Object} opts
 * @param {import("vue").ComputedRef<import("../types").Frame>} opts.frame
 * @param {import("vue").MaybeRefOrGetter<import("../types").Item[]>} opts.itemsSource
 * @param {import("../types").ResolveFn} opts.resolve
 * @param {ReturnType<typeof import("./useOverlayGeometry").default>} opts.geometry
 * @param {ReturnType<typeof import("./useOverlaySnapping").default>} opts.snapping
 * @param {ReturnType<typeof import("./useOverlaySelection").default>} opts.selection
 * @param {(item: import("../types").Item, rectPx: import("../types").RectPx, frame: import("../types").Frame) => void} opts.onCommitted
 */
export default function useOverlayController(opts) {
  const {
    frame,
    itemsSource,
    resolve,
    geometry,
    snapping,
    selection,
    adjustBackCancels,
    lockSelection,
    onConfirm,
    onCommitted,
  } = opts

  // guides array is shallowRef so it can be swapped atomically without per-element reactivity cost.
  const state = reactive({
    op: "idle",          // "idle" | "moving" | "resizing"
    itemId: null,
    handle: null,
    startRect: null,
  })

  const activeGuides = shallowRef([])
  const isBusy = ref(false)

  // --- uinav Adjust mode state ---
  // Adjust mode toggles via `ok`. While active, focus_*/* nudge the focused
  // item, action_2 flips between move/resize sub-modes.
  const adjustMode    = ref(false)
  const navMode       = ref(NavMode.Move)
  const modifierHeld  = ref(false)
  // Scalar stick deflection (signed, -1..1 each). Updated from focus_lr/focus_ud.
  const stickX = ref(0)
  const stickY = ref(0)

  // Per-interaction book-keeping (plain locals, not reactive).
  let startClientX = 0
  let startClientY = 0
  let pointerId    = null
  let captureEl    = null
  let latestRaw    = null
  let rafHandle    = null

  // Stick integration loop bookkeeping.
  let stickRaf       = null
  let stickLastTime  = 0
  let adjustDirty    = false

  function getItem(id) {
    const list = toValue(itemsSource) ?? []
    return list.find(it => it?.id === id) ?? null
  }

  function cancelRaf() {
    if (rafHandle != null) {
      cancelAnimationFrame(rafHandle)
      rafHandle = null
    }
  }

  function scheduleTick() {
    if (rafHandle != null) return
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null
      runTick()
    })
  }

  function runTick() {
    if (state.op === "idle" || !state.itemId || !latestRaw) return
    const item = getItem(state.itemId)
    if (!item) {
      teardownInteraction(false)
      return
    }

    const op = state.op === "resizing" ? Op.Resize : Op.Move
    const { adjusted, candidateGuides } = snapping.snap(item, latestRaw, op, state.handle)
    const final = resolve(item, { ...adjusted, op }, frame.value) || adjusted

    const safeFinal = {
      x: +final.x || 0,
      y: +final.y || 0,
      width:  Math.max(0, +final.width  || 0),
      height: Math.max(0, +final.height || 0),
    }

    geometry.setPreview(state.itemId, safeFinal)
    activeGuides.value = snapping.filterActiveGuides(candidateGuides, safeFinal)
  }

  function computeRawForMove(dxPage, dyPage) {
    const r = state.startRect
    return {
      x: r.x + dxPage,
      y: r.y + dyPage,
      width:  r.width,
      height: r.height,
    }
  }

  function computeRawForResize(dxPage, dyPage) {
    const r = state.startRect
    let x = r.x
    let y = r.y
    let w = r.width
    let h = r.height
    const h_ = state.handle
    if (h_ === HandleDir.N || h_ === HandleDir.NE || h_ === HandleDir.NW) {
      y = r.y + dyPage
      h = r.height - dyPage
    }
    if (h_ === HandleDir.S || h_ === HandleDir.SE || h_ === HandleDir.SW) {
      h = r.height + dyPage
    }
    if (h_ === HandleDir.W || h_ === HandleDir.NW || h_ === HandleDir.SW) {
      x = r.x + dxPage
      w = r.width - dxPage
    }
    if (h_ === HandleDir.E || h_ === HandleDir.NE || h_ === HandleDir.SE) {
      w = r.width + dxPage
    }
    // Keep width/height non-negative going into snap/resolve; consumers are free to
    // clamp further.
    if (w < 0) { x = x + w; w = 0 }
    if (h < 0) { y = y + h; h = 0 }
    return { x, y, width: w, height: h }
  }

  function recomputeLatestRaw(event) {
    const dxPage = event.clientX - startClientX
    const dyPage = event.clientY - startClientY
    latestRaw = state.op === "resizing"
      ? computeRawForResize(dxPage, dyPage)
      : computeRawForMove(dxPage, dyPage)
  }

  function onPointerMove(event) {
    if (state.op === "idle") return
    recomputeLatestRaw(event)
    scheduleTick()
  }

  function onPointerUp(event) {
    if (state.op === "idle") return
    // Run a final synchronous tick so the commit reflects the exact release point.
    cancelRaf()
    recomputeLatestRaw(event)
    runTick()
    finaliseCommit()
  }

  function onPointerCancel() {
    if (state.op === "idle") return
    teardownInteraction(false)
  }

  function finaliseCommit() {
    commitCurrentGeometry(state.itemId)
    teardownInteraction(true)
  }

  function commitCurrentGeometry(itemId) {
    const item = getItem(itemId)
    const finalRect = geometry.getGeometry(itemId)
    if (!item || !finalRect) return false
    geometry.commit(item.id, finalRect)
    try {
      onCommitted?.(item, { ...finalRect }, { ...frame.value })
    } catch (err) {
      // Consumer's commit handler threw; don't let it corrupt our state.
      console.error("[Overlay] onCommitted handler threw:", err)
    }
    return true
  }

  function teardownInteraction(wasCommitted) {
    cancelRaf()
    if (!wasCommitted && state.itemId) {
      geometry.clearPreview(state.itemId)
    }
    if (captureEl && pointerId != null && captureEl.releasePointerCapture) {
      try { captureEl.releasePointerCapture(pointerId) } catch (_) { /* ignore */ }
    }
    if (captureEl) {
      captureEl.removeEventListener("pointermove",   onPointerMove)
      captureEl.removeEventListener("pointerup",     onPointerUp)
      captureEl.removeEventListener("pointercancel", onPointerCancel)
    }
    captureEl = null
    pointerId = null
    latestRaw = null
    activeGuides.value = []
    state.op = "idle"
    state.itemId = null
    state.handle = null
    state.startRect = null
    isBusy.value = false
  }

  function beginInteraction(kind, event, item, handle) {
    if (!item || item.id == null) return
    // A pointer drag wins over uinav adjust - exit cleanly so we don't keep
    // "moving" state.op around with a stale stick loop.
    if (adjustMode.value) exitAdjust()
    if (state.op !== "idle") teardownInteraction(false)

    const currentRect = geometry.getGeometry(item.id)
    if (!currentRect) return

    state.op = kind === "resize" ? "resizing" : "moving"
    state.itemId = item.id
    state.handle = kind === "resize" ? (handle || HandleDir.SE) : null
    state.startRect = { ...currentRect }
    startClientX = event.clientX
    startClientY = event.clientY
    pointerId = event.pointerId
    captureEl = event.currentTarget || event.target
    isBusy.value = true

    // Ensure the item is the selection anchor while editing it.
    selection.select(item.id)

    try {
      captureEl.setPointerCapture?.(pointerId)
    } catch (_) { /* ignore if capture not supported */ }

    captureEl.addEventListener("pointermove",   onPointerMove)
    captureEl.addEventListener("pointerup",     onPointerUp)
    captureEl.addEventListener("pointercancel", onPointerCancel)

    // Run an initial pipeline pass so snap targets/guides show immediately even
    // before the pointer moves - matches legacy behaviour.
    latestRaw = { ...state.startRect }
    runTick()
  }

  function beginMove(event, item) {
    beginInteraction("move", event, item)
  }

  function beginResize(event, item, handle) {
    beginInteraction("resize", event, item, handle)
  }

  function cancel() {
    if (state.op !== "idle") teardownInteraction(false)
  }

  /**
   * Force-commit any in-flight drag at its current preview value; no-op when idle.
   * Useful for a consumer-level "save now" action while a drag is still active.
   */
  function commit() {
    if (state.op === "idle") return
    finaliseCommit()
  }

  // --- Atomic step API (used by uinav handler and defineExpose) ---

  // Applies a discrete delta through snap -> resolve -> preview; adjust mode commits
  // once on exit rather than per-step, avoiding store/Lua churn.
  function applyStep(id, deltaRect, op, options = {}) {
    const item = getItem(id)
    if (!item) return false
    const base = geometry.getGeometry(id)
    if (!base) return false
    const snapPosition = options.snapPosition !== false
    const raw = {
      x: base.x + (deltaRect.x || 0),
      y: base.y + (deltaRect.y || 0),
      width:  Math.max(0, base.width  + (deltaRect.width  || 0)),
      height: Math.max(0, base.height + (deltaRect.height || 0)),
    }
    const { adjusted, candidateGuides } = snapping.snap(item, raw, op, null)
    const proposed = snapPosition ? adjusted : raw
    const final = resolve(item, { ...proposed, op }, frame.value) || proposed
    const safeFinal = {
      x: +final.x || 0,
      y: +final.y || 0,
      width:  Math.max(0, +final.width  || 0),
      height: Math.max(0, +final.height || 0),
    }
    geometry.setPreview(id, safeFinal)
    adjustDirty = true
    // When snapPosition is false (adjust move mode), the rect stays unsnapped but
    // nearby snap lines are still shown as visual hints.
    activeGuides.value = snapPosition
      ? snapping.filterActiveGuides(candidateGuides, safeFinal)
      : candidateGuides
    return true
  }

  function nudge(id, dx, dy) {
    return applyStep(id, { x: dx, y: dy }, Op.Move, { snapPosition: false })
  }

  function resizeBy(id, dw, dh) {
    return applyStep(id, { width: dw, height: dh }, Op.Resize)
  }

  // --- uinav Adjust state transitions ---

  function enterAdjust(itemId) {
    if (adjustMode.value) return false
    const id = itemId ?? selection.selectedId.value
    if (!id || !getItem(id)) return false
    // Cancel any in-flight pointer drag - adjust takes over the focus.
    if (state.op !== "idle") teardownInteraction(false)
    selection.select(id)
    adjustMode.value = true
    adjustDirty = false
    navMode.value = NavMode.Move
    // Surface a "moving" op so the editor chrome paints its active outline.
    state.op = "moving"
    state.itemId = id
    return true
  }

  function exitAdjust() {
    if (!adjustMode.value) return false
    const id = state.itemId
    adjustMode.value = false
    navMode.value = NavMode.Move
    stickX.value = 0
    stickY.value = 0
    stopStickLoop()
    activeGuides.value = []
    if (adjustDirty && id) {
      commitCurrentGeometry(id)
    }
    adjustDirty = false
    if (state.op !== "idle") {
      state.op = "idle"
      state.itemId = null
    }
    return true
  }

  function setNavMode(mode) {
    if (!adjustMode.value) return
    if (mode !== NavMode.Move && mode !== NavMode.Resize) return
    if (navMode.value === mode) return
    navMode.value = mode
    state.op = mode === NavMode.Resize ? "resizing" : "moving"
  }

  function toggleNavMode() {
    setNavMode(navMode.value === NavMode.Move ? NavMode.Resize : NavMode.Move)
  }

  // --- Scalar stick integration ---
  // focus_lr / focus_ud arrive as scalar values in [-1, 1]. We store the
  // latest deflection and integrate it via rAF while it's outside the deadzone.

  function stickSpeed() {
    return modifierHeld.value ? STICK_SPEED_PX_LARGE : STICK_SPEED_PX
  }

  function startStickLoop() {
    if (stickRaf != null) return
    // Seed with a sentinel; the first rAF callback uses its `now` to seed dt=0.
    stickLastTime = 0
    const loop = now => {
      stickRaf = null
      if (!adjustMode.value) return
      const dt = stickLastTime === 0
        ? 0
        : Math.max(0, Math.min(0.1, (now - stickLastTime) / 1000))
      stickLastTime = now
      const id = state.itemId
      const speed = stickSpeed()
      // deadzone: prevents idle stick noise from drifting the rect
      const sx = Math.abs(stickX.value) < STICK_DEADZONE ? 0 : stickX.value
      const sy = Math.abs(stickY.value) < STICK_DEADZONE ? 0 : stickY.value
      if (id && (sx !== 0 || sy !== 0)) {
        const dx = sx * speed * dt
        const dy = sy * speed * dt
        if (navMode.value === NavMode.Resize) {
          resizeBy(id, dx, dy)
        } else {
          nudge(id, dx, dy)
        }
      }
      if (sx === 0 && sy === 0) return
      stickRaf = requestAnimationFrame(loop)
    }
    stickRaf = requestAnimationFrame(loop)
  }

  function stopStickLoop() {
    if (stickRaf != null) {
      cancelAnimationFrame(stickRaf)
      stickRaf = null
    }
  }

  function setStick(axis, value) {
    const v = +value || 0
    if (axis === "x") stickX.value = v
    else stickY.value = v
    if (!adjustMode.value) return
    const active = Math.abs(stickX.value) >= STICK_DEADZONE || Math.abs(stickY.value) >= STICK_DEADZONE
    if (active) startStickLoop()
  }

  // --- Idle selection navigation ---
  // Directional UINav before adjust mode selects which overlay item should be
  // edited. Once selected, `ok` enters adjust mode and the same directions move
  // or resize the selected item.

  function getSelectableItems() {
    const list = toValue(itemsSource) ?? []
    const out = []
    for (const item of list) {
      if (!item || item.id == null) continue
      const rect = geometry.getGeometry(item.id)
      if (!rect) continue
      out.push({
        item,
        rect,
        cx: rect.x + rect.width * 0.5,
        cy: rect.y + rect.height * 0.5,
      })
    }
    return out
  }

  function selectFirstItem(entries = getSelectableItems()) {
    if (entries.length === 0) return false
    const first = [...entries].sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx))[0]
    selection.select(first.item.id)
    return true
  }

  function selectByDirection(dir) {
    const entries = getSelectableItems()
    if (entries.length === 0) return false

    const currentId = selection.selectedId.value
    const current = entries.find(entry => String(entry.item.id) === currentId)
    if (!current) return selectFirstItem(entries)

    let best = null
    for (const entry of entries) {
      if (entry === current) continue
      const dx = entry.cx - current.cx
      const dy = entry.cy - current.cy
      const major = dir === "left" ? -dx
        : dir === "right" ? dx
          : dir === "up" ? -dy
            : dy
      if (major <= 0) continue
      const cross = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx)
      const score = major + cross * 2
      if (!best || score < best.score) best = { entry, score }
    }

    if (best) {
      selection.select(best.entry.item.id)
    }
    return true
  }

  // --- uinav root event handler ---

  // Stops a uinav DOM event from bubbling further. The ScopeRegistry already
  // ran the matching handlers; we just want the scope traversal to halt here.
  function consume(event) {
    event?.stopPropagation?.()
    event?.preventDefault?.()
  }

  function isPressed(event) {
    // Discrete on/off events arrive twice (down and up). We only act on the
    // down edge so a single press = a single step.
    const v = event?.detail?.value
    return v === undefined ? true : !!v
  }

  /**
   * Routes a `ui_nav` DOM event into the controller's adjust state machine.
   * Returns true when the event was consumed (caller can rely on the standard
   * stopPropagation/preventDefault having been called).
   *
   * @param {CustomEvent} event UINav DOM event (`event.detail.name` + `.value`).
   */
  function handleUiNav(event) {
    const name = event?.detail?.name
    if (!name) return false

    // Modifier is tracked unconditionally - other widgets may still want it.
    if (name === "modifier") {
      modifierHeld.value = !!event.detail.value
      return false
    }

    // single-item mode: directional events must not hop between elements
    // and `ok` must not drop to the idle selection state
    const locked = lockSelection?.() === true

    // Idle: directional events select an item; `ok` enters Adjust for the
    // selected item, or selects the first item if nothing is selected yet.
    if (!adjustMode.value) {
      if (name === "ok" && isPressed(event)) {
        if (!selection.selectedId.value && selectFirstItem()) {
          consume(event)
          return true
        }
        if (enterAdjust()) {
          consume(event)
          return true
        }
      }
      if (locked && (name === "focus_l" || name === "focus_r" || name === "focus_u" || name === "focus_d")) {
        // single-item mode: never hop between elements, but let the event propagate
        return false
      }
      if (name === "focus_l" && isPressed(event)) { selectByDirection("left"); consume(event); return true }
      if (name === "focus_r" && isPressed(event)) { selectByDirection("right"); consume(event); return true }
      if (name === "focus_u" && isPressed(event)) { selectByDirection("up"); consume(event); return true }
      if (name === "focus_d" && isPressed(event)) { selectByDirection("down"); consume(event); return true }
      return false
    }

    // Adjust mode.
    const step = modifierHeld.value ? STEP_PX_LARGE : STEP_PX
    const id = state.itemId
    const isResize = navMode.value === NavMode.Resize

    switch (name) {
      case "ok":
        if (!isPressed(event)) return true
        if (locked) {
          if (onConfirm) {
            exitAdjust()
            onConfirm()
          }
          consume(event)
          return true
        }
        exitAdjust()
        consume(event)
        return true

      case "back":
      case "cancel":
        if (!isPressed(event)) return true
        if (adjustBackCancels?.() === false) return false
        exitAdjust()
        consume(event)
        return true

      case "action_2":
        if (!isPressed(event)) return true
        toggleNavMode()
        consume(event)
        return true

      case "focus_l":
        if (!isPressed(event) || !id) return true
        if (isResize) resizeBy(id, -step, 0); else nudge(id, -step, 0)
        consume(event)
        return true

      case "focus_r":
        if (!isPressed(event) || !id) return true
        if (isResize) resizeBy(id, step, 0); else nudge(id, step, 0)
        consume(event)
        return true

      case "focus_u":
        if (!isPressed(event) || !id) return true
        if (isResize) resizeBy(id, 0, -step); else nudge(id, 0, -step)
        consume(event)
        return true

      case "focus_d":
        if (!isPressed(event) || !id) return true
        if (isResize) resizeBy(id, 0, step); else nudge(id, 0, step)
        consume(event)
        return true

      case "focus_lr":
        setStick("x", event?.detail?.value)
        consume(event)
        return true

      case "focus_ud":
        // UINav vertical scalars are typically positive-up; the rect coords
        // are positive-down, so flip the sign for "natural" stick direction.
        setStick("y", -(+event?.detail?.value || 0))
        consume(event)
        return true

      default:
        return false
    }
  }

  return {
    state,
    activeGuides,
    isBusy,
    adjustMode,
    navMode,
    modifierHeld,
    beginMove,
    beginResize,
    cancel,
    commit,
    nudge,
    resize: resizeBy,
    enterAdjust,
    exitAdjust,
    setNavMode,
    toggleNavMode,
    handleUiNav,
  }
}
