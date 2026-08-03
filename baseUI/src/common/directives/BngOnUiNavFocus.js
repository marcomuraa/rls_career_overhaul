// import { UI_EVENTS } from "@/bridge/libs/UINavEvents"
import { UI_EVENTS, getUINavHandlers } from "@/services/uiNav"

const DIRECTIONS = {
  horizontal: {
    [UI_EVENTS.focus_l]: -1,
    [UI_EVENTS.focus_r]: 1,
  },
  vertical: {
    [UI_EVENTS.focus_d]: -1,
    [UI_EVENTS.focus_u]: 1,
  },
}

// analog thumbstick axis that mirrors each discrete direction
const AXIS_EVENTS = {
  horizontal: UI_EVENTS.focus_lr,
  vertical: UI_EVENTS.focus_ud,
}

const HOLD_DELAY = 400
const REPEAT_INTERVAL = 100
const AXIS_THRESHOLD = 0.5

// hold to accelerate
const ACCEL_DELAY = 500 // grace period before acceleration kicks in
const ACCEL_DOUBLE = 500 // step doubles every this many ms past the delay
const ACCEL_MAX_RANGE_FRACTION = 0.05 // cap accelerated step at this fraction of (max - min)

const ELEMENT_FLAG = "__BNG_ONUINAVFOCUS"

function formatDirectiveDebugName(binding) {
  if (!__BNG_DEV__) return ""
  const direction = binding.arg ? `:${binding.arg}` : ""
  const modifiers = Object.keys(binding.modifiers || {})
    .filter(name => binding.modifiers[name])
    .sort()
    .map(name => `.${name}`)
    .join("")
  return `v-bng-on-ui-nav-focus${direction}${modifiers}`
}

/**
 * Convenience directive to bind on navigation focus move (discrete) events sent.
 *
 * Arguments:
 *  "horizontal" (default) - will bind to focus_l/focus_r and the focus_lr axis
 *  "vertical"             - will bind to focus_d/focus_u and the focus_ud axis
 *
 * Modifiers:
 *  "repeat"               - will repeat the callback after a short delay
 *
 * Value (function):
 *  callback(direction)    - callback with one integer argument (-1 or 1)
 *
 * Value (object):
 *  {
 *   direction             - binding direction (same as Argument; ignored if `events` are specified)
 *   events                - object with events to bind to, for example { focus_l: -1, focus_r: 1, }
 *   repeat                - callback repeat
 *   holdDelay             - delay before repeating will start
 *   repeatInterval        - how often repeat will occur
 *   min                   - minimum value (default: -Infinity)
 *   max                   - maximum value (default: Infinity)
 *   step                  - step (default: 1)
 *   value                 - function that will fetch the current value - this will enable calculation
 *   callback(dir, val)    - callback with one integer argument (-1 or 1) and resulting value
 *  }
 *
 * @example
 *  // the most basic use case
 *  <input v-bng-on-ui-nav-focus="dir => num += dir" v-model.number="num" ... />
 *
 *  const num = ref(0)
 *
 * @example
 *  // handle all step and range calculations
 *  <input v-bng-on-ui-nav-focus="{ callback: (dir, val) => num = val, value: () => num, min: -10, max: 10, step: 1 }" v-model.number="num" ... />
 *
 *  const num = ref(0)
 *
 * @example
 *  <input v-bng-on-ui-nav-focus:horizontal.repeat="change" v-model.number="num" ... />
 *
 *  const num = ref(0)
 *  function change(dir) {
 *    num.value += dir
 *  }
 *
 * @example
 *  // Without using this directive it will be like this
 *  // and will require to parse the event sent to `change` function
 *  <input
 *   v-bng-on-ui-nav:focus_l,focus_r.focusRequired.asMouse
 *   v-bng-click="{ clickCallback: change, holdCallback: change, holdDelay: 400, repeatInterval: 100 }"
 *   ...
 *  />
 */

/**
 * Builds the per-element controller that owns the navigation handlers and repeat timers.
 * Returns an object carrying the bound `value` (for update diffing) and a `cleanup` function.
 */
function createInstance(element, binding) {
  const opts = {
    direction: binding.arg || "horizontal",
    repeat: !!binding.modifiers.repeat,
    holdDelay: HOLD_DELAY,
    repeatInterval: REPEAT_INTERVAL,
    min: -Infinity,
    max: Infinity,
    step: 1,
    value: null,
    callback: null,
    ...(typeof binding.value === "object" ? binding.value : typeof binding.value === "function" ? { callback: binding.value } : {}),
  }
  !opts.events && (opts.events = DIRECTIONS[opts.direction])

  const axisEvent = AXIS_EVENTS[opts.direction] || null
  const debugSource = formatDirectiveDebugName(binding)

  function accelerateStep(baseStep, elapsedMs) {
    if (!opts.repeat || !(elapsedMs > ACCEL_DELAY)) return baseStep
    const multiplier = Math.max(1, Math.round(2 ** ((elapsedMs - ACCEL_DELAY) / ACCEL_DOUBLE)))
    let accelerated = baseStep * multiplier
    const range = opts.max - opts.min
    // cap to a fraction of the range when bounds are known, but never below the base step
    if (Number.isFinite(range) && range > 0) {
      accelerated = Math.min(accelerated, Math.max(baseStep, range * ACCEL_MAX_RANGE_FRACTION))
    }
    return accelerated
  }

  function applyStep(dir, elapsedMs, evt, detail) {
    if (!dir) return
    let val = undefined
    const context = { dir, elapsedMs, event: evt, detail }

    if (typeof opts.value === "function") {
      const cur = opts.value()
      const baseStep = typeof opts.step === "function" ? opts.step(context) : opts.step
      const step = accelerateStep(baseStep, elapsedMs)

      // apply
      let res = cur + step * dir
      // bounds
      if (dir < 0 && res < opts.min) {
        res = opts.min
      } else if (dir > 0 && res > opts.max) {
        res = opts.max
      }
      // floating point error fix
      const precision = 10 ** (step + ".").split(/[.,]/)[1].length
      if (precision > 0) {
        res = Math.round(res * precision) / precision
      } else {
        res = Math.round(res)
      }
      // check and finalise
      if (cur !== res) {
        val = res
      } else {
        dir = 0
      }
    }

    dir && opts.callback && opts.callback(dir, val, context)
  }

  // discrete dpad handling (focus_l/focus_r or focus_u/focus_d).
  // Both the press (value=1) and release (value=0) edges are received so the
  // repeat can be started on press and stopped on release of the held direction.
  let pressedDir = 0
  let discreteHoldStartedAt = 0
  let discreteHoldDelayTimer = null
  let discreteRepeatTimer = null
  let discreteEventRef = null
  let discreteDetailRef = null

  function clearDiscreteTimers() {
    if (discreteHoldDelayTimer) {
      clearTimeout(discreteHoldDelayTimer)
      discreteHoldDelayTimer = null
    }
    if (discreteRepeatTimer) {
      clearInterval(discreteRepeatTimer)
      discreteRepeatTimer = null
    }
  }

  function stopDiscreteRepeat() {
    clearDiscreteTimers()
    pressedDir = 0
  }

  function discreteStep() {
    applyStep(pressedDir, Date.now() - discreteHoldStartedAt, discreteEventRef, discreteDetailRef)
  }

  function processDiscrete(evt) {
    const detail = evt.fromController || evt.detail
    if (!detail || !(detail.name in opts.events)) return true
    const dir = opts.events[detail.name]
    const pressed = !!detail.value
    if (pressed) {
      pressedDir = dir
      discreteHoldStartedAt = Date.now()
      discreteEventRef = evt
      discreteDetailRef = detail
      applyStep(dir, 0, evt, detail)
      if (opts.repeat) {
        clearDiscreteTimers()
        discreteHoldDelayTimer = setTimeout(() => {
          discreteHoldDelayTimer = null
          discreteRepeatTimer = setInterval(discreteStep, opts.repeatInterval)
        }, opts.holdDelay)
      }
    } else if (dir === pressedDir) {
      stopDiscreteRepeat()
    }
    return false
  }

  // analog thumbstick handling
  let axisPressed = false
  let axisDir = 0
  let axisHoldStartedAt = 0
  let axisHoldDelayTimer = null
  let axisRepeatTimer = null
  let axisEventRef = null
  let axisDetailRef = null

  function stopAxisRepeat() {
    if (axisHoldDelayTimer) {
      clearTimeout(axisHoldDelayTimer)
      axisHoldDelayTimer = null
    }
    if (axisRepeatTimer) {
      clearInterval(axisRepeatTimer)
      axisRepeatTimer = null
    }
    axisPressed = false
    axisDir = 0
  }

  function axisStep() {
    applyStep(axisDir, Date.now() - axisHoldStartedAt, axisEventRef, axisDetailRef)
  }

  function processAxis(evt) {
    const detail = evt.fromController || evt.detail
    if (!detail || detail.name !== axisEvent) return true
    const raw = Number(detail.value) || 0
    const pressed = Math.abs(raw) >= AXIS_THRESHOLD
    if (pressed === axisPressed) return false
    if (pressed) {
      axisPressed = true
      axisDir = raw >= 0 ? 1 : -1
      axisHoldStartedAt = Date.now()
      axisEventRef = evt
      axisDetailRef = detail
      axisStep()
      if (opts.repeat) {
        axisHoldDelayTimer = setTimeout(() => {
          axisHoldDelayTimer = null
          axisRepeatTimer = setInterval(axisStep, opts.repeatInterval)
        }, opts.holdDelay)
      }
    } else {
      stopAxisRepeat()
    }
    return false
  }

  // a held button/stick that loses focus never sends a release event, so stop on blur
  const onBlur = () => {
    stopDiscreteRepeat()
    stopAxisRepeat()
  }

  const discreteHandler = getUINavHandlers().add(
    element,
    {
      name: name => name in opts.events,
      value: undefined, // match both press and release edges
      focusRequired: element,
      eventNames: Object.keys(opts.events),
      source: debugSource,
    },
    processDiscrete
  )

  let axisHandler = null
  if (axisEvent) {
    axisHandler = getUINavHandlers().add(
      element,
      {
        name: axisEvent,
        value: undefined,
        focusRequired: element,
        eventNames: [axisEvent],
        source: debugSource,
      },
      processAxis
    )
  }

  element.addEventListener("blur", onBlur)

  return {
    value: binding.value,
    cleanup() {
      onBlur()
      element.removeEventListener("blur", onBlur)
      if (discreteHandler) getUINavHandlers().remove(element, discreteHandler)
      if (axisHandler) getUINavHandlers().remove(element, axisHandler)
    },
  }
}

function setup(element, binding) {
  if (!binding.value) {
    // keep an inert record so `updated` can detect a later transition to a truthy value
    element[ELEMENT_FLAG] = { value: binding.value, cleanup() {} }
    return
  }
  element[ELEMENT_FLAG] = createInstance(element, binding)
}

export default {
  mounted: (element, binding) => {
    setup(element, binding)
  },

  updated: (element, binding) => {
    const instance = element[ELEMENT_FLAG]
    // nothing changed - keep the live timers/handlers intact (important during an active repeat)
    if (instance && instance.value === binding.value) return
    instance?.cleanup?.()
    setup(element, binding)
  },

  beforeUnmount: element => {
    element[ELEMENT_FLAG]?.cleanup?.()
    delete element[ELEMENT_FLAG]
  },
}
