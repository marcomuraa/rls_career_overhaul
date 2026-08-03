import { computed, markRaw, reactive } from "vue"
import { useBridge } from "@/bridge"
import { $translate } from "@/services/translation"

const DEFAULT_TIMEOUT = 5
const HOVER_RESUME_TIMEOUT_MS = 1000
const MAX_TIMEOUT_SECONDS = 300
const MAX_TIMEOUT_MS = MAX_TIMEOUT_SECONDS * 1000
const MAX_VISIBLE = 5
const toastItems = reactive([])
const timers = new Map()

let nextId = 0
let listenerRegistered = false

const asText = value => value == null ? "" : String(value)
const getToastId = target => target?.toastId ?? target?.id ?? target
const getToastKey = options => asText(options.id ?? options.label ?? options.title ?? options.message)

function normalizeTimeout(value) {
  const num = Math.max(0, Number(value) || 0)
  if (num === 0) return 0
  // values above max seconds are treated as milliseconds
  const ms = num > MAX_TIMEOUT_SECONDS ? num : num * 1000
  return Math.min(ms, MAX_TIMEOUT_MS)
}

function getTimeoutOption(options) {
  if ("timeout" in options) return options.timeout
  if ("timeOut" in options) return options.timeOut
  return undefined
}

function makeHandle(toast) {
  const scope = {}
  Object.defineProperties(scope, {
    message: {
      get: () => toast.message,
      set(message) {
        updateToast(toast.id, { message })
      },
    },
    title: {
      get: () => toast.title,
      set(title) {
        updateToast(toast.id, { title })
      },
    },
  })

  return {
    toastId: toast.id,
    id: toast.id,
    scope,
    dismiss: () => dismissToast(toast.id),
    update: values => updateToast(toast.id, values),
  }
}

function clearTimer(id) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
}

function scheduleDismiss(toast, duration = toast.timeout) {
  clearTimer(toast.id)
  if (!toast.active || duration <= 0) return
  const now = Date.now()
  toast.startedAt = now
  toast.duration = duration
  toast.remaining = duration
  toast.paused = false
  toast.timerEndsAt = now + duration
  toast.progressKey = (toast.progressKey ?? 0) + 1
  timers.set(toast.id, setTimeout(() => dismissToast(toast.id), duration))
}

function resumeTimer(toast, duration) {
  clearTimer(toast.id)
  if (!toast.active || duration <= 0) {
    if (duration <= 0) dismissToast(toast.id)
    return
  }
  const now = Date.now()
  toast.paused = false
  toast.remaining = duration
  toast.timerEndsAt = now + duration
  timers.set(toast.id, setTimeout(() => dismissToast(toast.id), duration))
}

function activatePending() {
  let activeCount = toastItems.filter(toast => toast.active).length
  for (const toast of toastItems) {
    if (activeCount >= MAX_VISIBLE) break
    if (toast.active) continue
    toast.active = true
    activeCount++
    scheduleDismiss(toast)
    toast.onShown?.(toast.handle)
  }
}

export const toastsView = reactive({
  items: computed(() => toastItems.filter(toast => toast.active).slice().reverse()),
  queued: computed(() => toastItems.length),
})

export function updateToast(target, values = {}) {
  const id = getToastId(target)
  const toast = toastItems.find(item => item.id === id)
  if (!toast) return null

  if ("title" in values) toast.title = asText(values.title)
  if ("message" in values || "msg" in values) toast.message = asText(values.message ?? values.msg)
  if ("type" in values) toast.type = values.type
  if ("timeout" in values || "timeOut" in values) {
    toast.timeout = normalizeTimeout(getTimeoutOption(values))
    scheduleDismiss(toast)
  }
  return toast.handle
}

export function dismissToast(target, clicked = false) {
  const id = getToastId(target)
  const index = toastItems.findIndex(toast => toast.id === id || toast.key === id || toast.title === id)
  if (index < 0) return false

  const [toast] = toastItems.splice(index, 1)
  clearTimer(toast.id)
  toast.onHidden?.(clicked, toast.handle)
  activatePending()
  return true
}

export function clearToasts(target) {
  if (target != null) return dismissToast(target)
  const removed = toastItems.splice(0)
  for (const toast of removed) {
    clearTimer(toast.id)
    toast.onHidden?.(false, toast.handle)
  }
  return true
}

export function activateToast(target) {
  const id = getToastId(target)
  const toast = toastItems.find(item => item.id === id)
  if (!toast || typeof toast.onClick !== "function") return false

  toast.onClick(toast.handle)
  if (toast.tapToDismiss) dismissToast(toast.id, true)
  return true
}

export function pauseToast(target) {
  const id = getToastId(target)
  const toast = toastItems.find(item => item.id === id)
  if (!toast || toast.timeout <= 0 || toast.paused) return

  const now = Date.now()
  if (toast.timerEndsAt != null) {
    toast.remaining = Math.max(0, toast.timerEndsAt - now)
  } else {
    toast.remaining = Math.max(0, toast.duration - (now - toast.startedAt))
  }
  toast.paused = true
  toast.timerEndsAt = null
  clearTimer(toast.id)
}

export function resumeToast(target) {
  const id = getToastId(target)
  const toast = toastItems.find(item => item.id === id)
  if (!toast || toast.timeout <= 0 || !toast.paused) return

  if (toast.progressBar) {
    resumeTimer(toast, toast.remaining)
  } else {
    scheduleDismiss(toast, HOVER_RESUME_TIMEOUT_MS)
  }
}

export function showToast(options = {}) {
  const message = asText(options.message ?? options.msg)
  const title = asText(options.title)
  const key = getToastKey({ ...options, message, title })
  const existing = key && toastItems.find(toast => toast.key === key)
  if (existing) {
    existing.message = message
    existing.title = title
    existing.type = options.type ?? existing.type
    existing.onClick = options.onClick ?? options.onTap ?? existing.onClick
    if ("closeButton" in options) existing.closeButton = !!options.closeButton
    if ("progressBar" in options) existing.progressBar = !!options.progressBar
    if ("timeout" in options || "timeOut" in options || options.persistent) {
      existing.timeout = options.persistent ? 0 : normalizeTimeout(getTimeoutOption(options))
      scheduleDismiss(existing)
    }
    return existing.handle
  }

  const timeoutValue = options.persistent ? 0 : normalizeTimeout(getTimeoutOption(options) ?? DEFAULT_TIMEOUT)
  const toast = reactive({
    id: ++nextId,
    key,
    active: false,
    title,
    message,
    type: ["success", "warning", "error"].includes(options.type) ? options.type : "info",
    timeout: timeoutValue,
    duration: 0,
    remaining: 0,
    paused: false,
    startedAt: 0,
    progressKey: 0,
    closeButton: !!options.closeButton,
    progressBar: !!options.progressBar,
    onClick: options.onClick ?? options.onTap,
    onHidden: options.onHidden,
    onShown: options.onShown,
    tapToDismiss: options.tapToDismiss !== false,
    handle: null,
  })
  toast.handle = markRaw(makeHandle(toast))
  toastItems.push(toast)
  activatePending()
  return toast.handle
}

function showTypedToast(type, message, title = "", config = {}) {
  return showToast({ ...config, type, message, title })
}

export const toastr = Object.freeze({
  info: (message, title, config) => showTypedToast("info", message, title, config),
  success: (message, title, config) => showTypedToast("success", message, title, config),
  warning: (message, title, config) => showTypedToast("warning", message, title, config),
  error: (message, title, config) => showTypedToast("error", message, title, config),
  clear: clearToasts,
  remove: clearToasts,
})

function translate(value, context) {
  if (value == null || value === "") return ""
  if (typeof value === "object") return $translate.contextTranslate(value, true)
  return $translate.contextTranslate({ txt: value, context: context || {} }, true)
}

function showEventToast(data) {
  if (!data || typeof data !== "object") return
  const config = data.config && typeof data.config === "object" ? data.config : {}
  showToast({
    ...config,
    id: data.label ?? data.title,
    label: data.label,
    type: data.type,
    title: translate(data.title, data.context),
    message: translate(data.msg, data.context),
  })
}

export function registerToastListener() {
  if (listenerRegistered) return
  listenerRegistered = true

  const { events } = useBridge()
  events.on("toastrMsg", showEventToast)
  events.on("toastrClose", dismissToast)
}
