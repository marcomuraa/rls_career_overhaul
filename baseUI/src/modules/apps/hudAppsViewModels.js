import { parsePlacementValue, placementToRectPx } from "./placementResolve"

const CONTAINER_PROTOTYPES = Object.freeze({
  topleftapps: { appName: "topLeftApps", containerSlot: "topLeft" },
  topcenterapps: { appName: "topCenterApps", containerSlot: "topCenter" },
  toprightapps: { appName: "topRightApps", containerSlot: "topRight" },
})

const PLACEMENT_KEYS = Object.freeze(["left", "right", "top", "bottom", "width", "height"])

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function normaliseId(value) {
  return String(value || "").toLowerCase()
}

function instanceIdFor(appName, index) {
  return `${String(appName || "unknown")}-${index}`
}

function isUserLayout(layout) {
  if (!layout || typeof layout !== "object") return false
  if (layout.resettable === true) return false
  if (layout.userFileExists === true) return true
  return typeof layout.filename === "string" && layout.filename.startsWith("/settings/ui_apps/layouts/") && layout.type === "custom"
}

function isOfficialLayout(layout) {
  return !!layout && !isUserLayout(layout)
}

function isResettableLayout(layout) {
  if (!layout || typeof layout !== "object") return false
  if (layout.resettable === true) return true
  if (layout.resettable === false) return false
  if (layout.type && layout.type !== "custom") return true
  return isUserLayout(layout) && layout.type !== "custom"
}

function getCatalogueApp(uiAppList, appNameOrAlias) {
  const cat = uiAppList && typeof uiAppList === "object" ? uiAppList : {}
  if (!appNameOrAlias) return null
  if (cat[appNameOrAlias]) return cat[appNameOrAlias]

  const requested = normaliseId(appNameOrAlias)
  for (const app of Object.values(cat)) {
    if (!app || typeof app !== "object") continue
    if (normaliseId(app.appName) === requested) return app
    if (normaliseId(app.directive) === requested) return app
    if (normaliseId(app.folder) === requested) return app
  }
  return null
}

function hasFrame(frame) {
  const width = Number(frame?.width)
  const height = Number(frame?.height)
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
}

function toPlacementSnapshot(placement) {
  if (!placement || typeof placement !== "object") return null
  const out = {}
  for (const key of PLACEMENT_KEYS) {
    const raw = placement[key]
    out[key] = {
      raw,
      parsed: parsePlacementValue(raw),
    }
  }
  return out
}

function normaliseRect(rectPx, frame) {
  const width = Number(frame.width)
  const height = Number(frame.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return {
    x: rectPx.x / width,
    y: rectPx.y / height,
    width: rectPx.width / width,
    height: rectPx.height / height,
  }
}

function toContainerPrototypeBadge(appName) {
  const prototype = CONTAINER_PROTOTYPES[normaliseId(appName)]
  if (!prototype) return null
  return {
    isContainerPrototype: true,
    isDynamicPrototype: true,
    isGameplayRelevantPrototype: true,
    containerSlot: prototype.containerSlot,
  }
}

function isInteractive(app) {
  const value = app?.interactive
  if (value === undefined || value === null) return true
  return value === true || value === "yes" || value === "required"
}

export function buildLayoutBrowserItems(layouts, options = {}) {
  const list = toArray(layouts)
  const currentLayoutFilename = options.currentLayoutFilename || null
  const currentLayoutType = options.currentLayoutType || null
  const selectedLayoutFilename = options.selectedLayoutFilename || currentLayoutFilename

  return list.map((layout, index) => {
    const filename = typeof layout?.filename === "string" ? layout.filename : ""
    const type = typeof layout?.type === "string" ? layout.type : ""
    const key = filename || type || `layout:${index}`
    const label = layout?.title || type || filename || "unnamed layout"
    const isCurrent = !!(filename && currentLayoutFilename && filename === currentLayoutFilename)
      || (!filename && !!(type && currentLayoutType && type === currentLayoutType))
    const isSelected = !!(filename && selectedLayoutFilename && filename === selectedLayoutFilename)
    const userLayout = isUserLayout(layout)

    return {
      key,
      id: key,
      filename,
      type,
      title: layout?.title || "",
      label,
      isCurrent,
      isSelected,
      originalIndex: index,
      isDefault: layout?.default === true,
      isDevOnly: layout?.devonly === true,
      isUser: userLayout,
      isOfficial: isOfficialLayout(layout),
      isCustom: userLayout,
      isSystem: !userLayout,
      isResettable: isResettableLayout(layout),
      layout,
    }
  }).sort((a, b) => {
    const labelCompare = a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    if (labelCompare !== 0) return labelCompare
    return a.originalIndex - b.originalIndex
  })
}

export function buildLayerRowModels(apps, options = {}) {
  const list = toArray(apps)
  const uiAppList = options.uiAppList || {}
  const selectedAppId = options.selectedAppId || null
  const frame = options.frame || null

  return list.map((entry, index) => {
    const appName = entry?.appName || ""
    const app = entry?.app || getCatalogueApp(uiAppList, appName)
    const id = entry?.id || instanceIdFor(appName, Number.isFinite(entry?.index) ? entry.index : index)
    const placement = entry?.placement || app?.css || null
    const badge = toContainerPrototypeBadge(appName)
    const minimap = buildAppMinimapModel({
      id,
      appName,
      placement,
      app,
    }, frame)

    return {
      key: id,
      id,
      appInstanceId: id,
      index: Number.isFinite(entry?.index) ? entry.index : index,
      appName,
      displayNameToken: app?.name || "",
      displayNameFallback: app?.appName || appName || "?",
      selected: id === selectedAppId,
      placement,
      placementSnapshot: toPlacementSnapshot(placement),
      rectPx: minimap.rectPx,
      rectNormalized: minimap.rectNormalized,
      hasFrameResolution: minimap.hasFrameResolution,
      settings: entry?.settings || null,
      isEssential: app?.essential === true,
      isInteractive: isInteractive(app),
      containerBadge: badge,
      app,
      entry,
    }
  })
}

// note: returns placement snapshots only when there's no frame
export function buildAppMinimapModel(appRow, frame = null) {
  const placement = appRow?.placement || null
  const frameOk = hasFrame(frame)

  if (!placement) {
    return {
      id: appRow?.id || "",
      appName: appRow?.appName || "",
      hasFrameResolution: false,
      frame: frameOk ? { width: Number(frame.width), height: Number(frame.height) } : null,
      placement: null,
      placementSnapshot: null,
      rectPx: null,
      rectNormalized: null,
    }
  }

  if (!frameOk) {
    return {
      id: appRow?.id || "",
      appName: appRow?.appName || "",
      hasFrameResolution: false,
      frame: null,
      placement,
      placementSnapshot: toPlacementSnapshot(placement),
      rectPx: null,
      rectNormalized: null,
    }
  }

  const frameData = { width: Number(frame.width), height: Number(frame.height) }
  const rectPx = placementToRectPx(placement, frameData)
  return {
    id: appRow?.id || "",
    appName: appRow?.appName || "",
    hasFrameResolution: true,
    frame: frameData,
    placement,
    placementSnapshot: toPlacementSnapshot(placement),
    rectPx,
    rectNormalized: normaliseRect(rectPx, frameData),
  }
}

export function buildLayoutMinimapModels(rows, frame = null) {
  return toArray(rows).map(row => buildAppMinimapModel(row, frame))
}

export function deriveMultiappContainerBadges(rows) {
  const out = {}
  for (const prototype of Object.values(CONTAINER_PROTOTYPES)) {
    out[prototype.appName] = {
      appName: prototype.appName,
      containerSlot: prototype.containerSlot,
      isContainerPrototype: true,
      isDynamicPrototype: true,
      isGameplayRelevantPrototype: true,
      present: false,
      count: 0,
      rowIds: [],
    }
  }

  for (const row of toArray(rows)) {
    const key = normaliseId(row?.appName)
    const prototype = CONTAINER_PROTOTYPES[key]
    if (!prototype) continue
    const target = out[prototype.appName]
    target.present = true
    target.count += 1
    target.rowIds.push(row?.id || "")
  }

  return out
}

export const HUD_APPS_CONTAINER_PROTOTYPES = Object.freeze(
  Object.values(CONTAINER_PROTOTYPES).map(entry => entry.appName)
)
