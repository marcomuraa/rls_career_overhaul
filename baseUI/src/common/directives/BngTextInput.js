import { useBridge } from "@/bridge"
import { setupOnScreenKeyboard } from "@/services/onScreenKeyboard"
import { uniqueId } from "@/services/uniqueId"

let bridge
let focused = false
const elms = {}
const elmid = "__BNG_TEXT_INPUT" // see also beamng-core.js

const focus = id => async () => {
  elms[id].active = true
  if (!focused) {
    await bridge.lua.setCEFTyping(true)
    focused = true
  }
  elms[id]?.onFocusForScreenKeyboard?.(elms[id].el)
}
const blur = id => async () => {
  elms[id].active = false
  if (focused) {
    focused = Object.values(elms).some(e => e.active)
    if (!focused) await bridge.lua.setCEFTyping(false)
  }
  elms[id]?.onBlurForScreenKeyboard?.(elms[id].el)
}

export default {
  mounted(el) {
    if (!bridge) {
      bridge = useBridge()
      bridge.events.on("CEFTypingLostFocus", () => focused && document.activeElement.blur())
    }
    const id = el[elmid] || (el[elmid] = uniqueId())
    elms[id] = {
      el,
      active: false,
      onFocus: focus(id),
      onBlur: blur(id),
    }
    el.addEventListener("focus", elms[id].onFocus)
    el.addEventListener("blur", elms[id].onBlur)
    setupOnScreenKeyboard(el).then(([screenKbd]) => {
      if (!elms[id] || !screenKbd) return
      elms[id].onFocusForScreenKeyboard = screenKbd.onFocus
      // elms[id].onBlurForScreenKeyboard = screenKbd.onBlur
    })
  },
  beforeUnmount(el) {
    const id = el[elmid]
    if (elms[id]) {
      el.removeEventListener("focus", elms[id].onFocus)
      el.removeEventListener("blur", elms[id].onBlur)
      elms[id].onBlur()
      delete elms[id]
    }
  },
}
