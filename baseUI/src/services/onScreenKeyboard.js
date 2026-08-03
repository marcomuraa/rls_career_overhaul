import { isRef, watch, nextTick } from "vue"
import { useBridge } from "@/bridge"

const marker = "__BNG_SD_INPUT"

let inited = false
let isAvailable = undefined
let lua

const inpFocussed = new Set()

async function init() {
  const bridge = useBridge()
  lua = bridge.lua
  isAvailable = await lua.core_onScreenKeyboard.isOnScreenKeyboardAvailable()
  if (isAvailable) {
    const events = bridge.events
    events.on("onScreenKeyboardClosed", (applied, text) => {
      if (!inpFocussed.size) return
      if (applied) {
        for (const input of inpFocussed) {
          input.value = text
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.dispatchEvent(new window.KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            bubbles: true,
            cancelable: true,
          }))
        }
      }
      inpFocussed.clear()
    })
  }
  inited = true
}

function onFocus(input) {
  const type = input[marker]
  if (!type) return
  if (!inpFocussed.has(input)) inpFocussed.add(input)
  const rect = input.getBoundingClientRect()
  lua.core_onScreenKeyboard.openOnScreenKeyboard(
    "", input.placeholder, input.value, input.maxLength, type,
    rect.left, rect.top, rect.width, rect.height
  )
}

async function bindToInputs(elements) {
  const inputs = Array.isArray(elements) ? elements : [elements]
  for (const input of inputs) {
    if (marker in input) continue // note: if we need to support dynamically-changed types, comment-out this check
    let type
    const inpTag = input.tagName.toLowerCase()
    const inpType = input.type.toLowerCase()
    if (inpTag === "textarea") {
      type = "multiLine"
    } else if (inpTag === "input" && inpType === "number") {
      type = "number"
    } else if (inpTag === "input" && ["text", "password", "search"].includes(inpType)) {
      type = "singleLine"
    }
    input[marker] = type || null
  }
}

export function getScreenKeyboardCallbacks(elements) {
  const inputs = Array.isArray(elements) ? elements : [elements]
  const callbacks = []
  for (const input of inputs) {
    if (!(marker in input)) continue
    callbacks.push({
      onFocus: () => onFocus(input),
      // onBlur: () => onBlur(input),
    })
  }
  return callbacks
}

export async function setupOnScreenKeyboard(inputs) {
  if (!inputs) throw new Error("inputs must be specified (ref, refs, element, elements)")
  if (!inited) await init()
  if (!isAvailable) return []
  if (isRef(inputs)) {
    watch(inputs, bindToInputs, { immediate: true })
    await nextTick()
    inputs = inputs.value
  } else {
    await bindToInputs(inputs)
  }
  return getScreenKeyboardCallbacks(inputs)
}
