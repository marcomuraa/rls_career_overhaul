// this directive translates the view frustum a bit to make up for lost space behind side menu and alike
// use it like this: <div bng-frustum-mover="left">
// note: it does not take into account position nor parent size, so use this on containers only

import { debounce } from "@/utils/rateLimit"

const elems = new WeakMap()

let curHorizontal = 0,
  curVertical = 0

let smoothingFrame = null,
  smoothingToken = 0

function setGE(horizontal = 0, vertical = 0) {
  curHorizontal = horizontal
  curVertical = vertical
  bngApi.engineLua(`scenetree.OnlyGui:setFrustumCameraCenterOffset(Point2F(${horizontal}, ${vertical}))`)
}

function cancelSmoothUpdate() {
  smoothingToken += 1
  if (!smoothingFrame) return
  window.cancelAnimationFrame(smoothingFrame)
  smoothingFrame = null
}

function updateGE(horizontal = 0, vertical = 0) {
  cancelSmoothUpdate()
  setGE(horizontal, vertical)
}

const smoothDuration = 180

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function updateGEsmooth(horizontal = 0, vertical = 0) {
  if (curHorizontal === horizontal && curVertical === vertical) return

  if (smoothingFrame) window.cancelAnimationFrame(smoothingFrame)

  const token = ++smoothingToken
  const startHorizontal = curHorizontal
  const startVertical = curVertical
  const horizontalDistance = horizontal - startHorizontal
  const verticalDistance = vertical - startVertical
  let startTime = null

  function step(ms) {
    if (token !== smoothingToken) return
    if (startTime === null) startTime = ms

    const progress = Math.min((ms - startTime) / smoothDuration, 1)
    const easedProgress = easeOutCubic(progress)

    setGE(
      startHorizontal + horizontalDistance * easedProgress,
      startVertical + verticalDistance * easedProgress
    )

    if (progress < 1) {
      smoothingFrame = window.requestAnimationFrame(step)
      return
    }

    smoothingFrame = null
    setGE(horizontal, vertical)
  }

  smoothingFrame = window.requestAnimationFrame(step)
}

// multiplier for the resulting offset
const power = 0.65

export default {
  mounted: (el, binding) => {
    const updateDebounce = debounce(updateFrustum, 50),
      updateWrapper = () => updateDebounce(),
      resizeObserver = new ResizeObserver(updateWrapper)
    resizeObserver.observe(el)

    elems.set(el, {
      updateFrustum: updateDebounce,
      destroy: () => {
        resizeObserver.disconnect()
        window.removeEventListener("resize", updateWrapper)
        elems.delete(el)
        updateDebounce.cancel?.()
        updateFrustum(curDirection, false, curSmooth)
      },
    })

    window.addEventListener("resize", updateWrapper)

    let curDirection = binding.arg || "left"
    let curSmooth = binding.modifiers.smooth
    let curState = typeof binding.value === "undefined" ? true : !!binding.value

    function updateFrustum(direction, enabled, smooth) {
      if (!direction) direction = curDirection
      if (!["left", "right", "up", "down"].includes(direction)) {
        console.error("Frustum mover only supports left/right/up/down directions")
        enabled = false
      } else {
        curDirection = direction
      }

      if (typeof enabled !== "boolean") enabled = curState
      curState = enabled

      if (typeof smooth !== "boolean") smooth = curSmooth
      curSmooth = smooth

      const updater = smooth ? updateGEsmooth : updateGE

      if (!enabled) {
        updater()
        return
      }

      const side = direction === "left" || direction === "right" ? "width" : "height"
      const screenSize = window.screen[side]
      const elSize = el.getBoundingClientRect()[side]
      let movePower = (elSize / screenSize) * power

      if (movePower < 0.001) movePower = 0
      else if (direction === "left" || direction === "down") movePower = -movePower

      // console.log(`Adjusting frustum side offset to ${direction} side: ${screenSize}, ${elSize}, ${movePower}`);
      updater(direction === "left" || direction === "right" ? movePower : 0, direction === "up" || direction === "down" ? movePower : 0)
    }

    updateFrustum(curDirection, curState, curSmooth)
  },

  updated: (el, binding) => {
    const itm = elems.get(el)
    itm && itm.updateFrustum(binding.arg, !!binding.value, !!binding.modifiers.smooth)
  },

  unmounted: el => {
    const itm = elems.get(el)
    itm && itm.destroy()
  },
}
