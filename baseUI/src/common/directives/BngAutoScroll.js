/**
 * @brief   automatically scrolls a list to the specified position
 * @argument   **top** automatically scrolls list to the top
 * @argument   **bottom** automatically scrolls list to the bottom
 * @tutorial   usage1   `v-bng-auto-scroll:top`
 * @tutorial   usage2   `v-bng-auto-scroll:bottom`
 *
 * Controlled usage:
 *   `v-bng-auto-scroll:top="{ enabled: true, trigger: someValue }"`
 *   - `enabled` (default true): when false, scrolling is skipped.
 *   - `trigger`: when it changes (or the directive becomes enabled), the list scrolls.
 *     Without a controlled binding, the list scrolls after every update (legacy behavior).
 */

const isControlled = value => value !== null && typeof value === "object"

function doScroll(el, direction) {
  // check if the element has anything to scroll
  if (el.scrollHeight <= el.clientHeight) return

  if (direction === "top") {
    if (el.scrollTop > 0) el.scrollTop = 0
  } else if (direction === "bottom") {
    if (el.scrollTop < el.scrollHeight) el.scrollTop = el.scrollHeight
  }
}

function mounted(el, binding) {
  if (isControlled(binding.value)) {
    const { enabled = true, trigger } = binding.value
    el._bngAutoScroll = { trigger, enabled }
    if (enabled === false) return
  }
  doScroll(el, binding.arg)
}

function updated(el, binding) {
  if (isControlled(binding.value)) {
    const { enabled = true, trigger } = binding.value
    const previousTrigger = el._bngAutoScroll.trigger
    const previousEnabled = el._bngAutoScroll.enabled
    el._bngAutoScroll.trigger = trigger
    el._bngAutoScroll.enabled = enabled

    if (enabled === false) return
    // Only scroll when the directive just became enabled or the trigger changed.
    const becameEnabled = previousEnabled === false && enabled !== false
    if (!becameEnabled && trigger === previousTrigger) return
  }
  doScroll(el, binding.arg)
}

export default {
  mounted,
  updated,
}
