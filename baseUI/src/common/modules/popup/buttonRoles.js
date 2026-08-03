import { ACCENTS } from "@/common/components/base"
import { lua } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"

const ROLE_EXTRA_KEYS = new Set(["default", "cancel", "confirm", "destructive", "outsideCancel"])
const cancelSoundClass = "bng_cancel_hover_generic"

export const isConfirm = b => !!(b && b.extras && b.extras.confirm)
export const isCancel = b => !!(b && b.extras && b.extras.cancel)
export const isDestructive = b => !!(b && b.extras && b.extras.destructive)
export const hasRoles = buttons => buttons.some(b => isConfirm(b) || isCancel(b) || isDestructive(b))
export const hasDestructive = buttons => buttons.some(isDestructive)
export const resolveOutsideCancelButton = buttons => {
  if (!Array.isArray(buttons)) return null
  return buttons.find(button => isCancel(button) && button.extras.outsideCancel !== false) || null
}

// Canonical left->right: cancel, auxiliaries (author order), confirm. Stable.
export const orderButtonsByRole = buttons => {
  const cancels = [], aux = [], confirms = []
  for (const b of buttons) {
    if (isCancel(b)) cancels.push(b)
    else if (isConfirm(b)) confirms.push(b)
    else aux.push(b)
  }
  return [...cancels, ...aux, ...confirms]
}

export const resolveFocusButton = (orderedButtons, useRoles) => {
  if (useRoles) {
    if (hasDestructive(orderedButtons)) {
      const cancel = orderedButtons.find(isCancel)
      if (cancel) return cancel
    }
    const confirm = orderedButtons.find(isConfirm)
    if (confirm) return confirm
    const cancel = orderedButtons.find(isCancel)
    if (cancel) return cancel
  }
  return orderedButtons.find(b => b.extras && b.extras.default) || orderedButtons[0]
}

export const getButtonProps = (button, useRoles, baseProps = {}) => {
  const extras = button.extras || {}
  const props = { ...baseProps }
  for (const key of Object.keys(extras)) {
    if (!ROLE_EXTRA_KEYS.has(key)) props[key] = extras[key]
  }
  if (extras.cancel && !props.soundClass && !props["sound-class"]) {
    props.soundClass = cancelSoundClass
  }
  if (useRoles) {
    if (isCancel(button) && !props.accent) props.accent = ACCENTS.text
    if (isDestructive(button)) props.accent = ACCENTS.destructive
  }
  return props
}

export const getCancelSoundClass = button => {
  const extras = button?.extras || {}
  return extras.soundClass || extras["sound-class"] || cancelSoundClass
}

export const playCancelSound = button => {
  lua.ui_audio.playEventSound(getCancelSoundClass(button), "click")
}

export const popupOrderDevWarn = label => {
  if (!__BNG_DEV__) return
  const safe = String(label || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")
  runRaw(`log("W", "popup", "fix order/roles: ${safe}")`, false)
}
