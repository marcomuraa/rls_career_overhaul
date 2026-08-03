import { uniqueId } from "../../../../services/uniqueId.js"

// key used to store dev id in a placeholder in place of the original item
export const devKey = "__dev"
// runtime-only key used to keep stable ids for dev items between saves
export const devItemIdKey = "__devId"

export const clone = obj => JSON.parse(JSON.stringify(obj))

export const genRevision = () => {
  const now = new Date()
  return now.getUTCFullYear() * 1e4 + (now.getUTCMonth() + 1) * 1e2 + now.getUTCDate()
}
export const genEmptyLayout = schemaRev => ({ revision: genRevision(), schema: schemaRev, items: [], search: {} })

export function mergeDevLayoutItems(items, devData) {
  if (!Array.isArray(items)) return []
  if (!devData || typeof devData !== "object") devData = {}

  const result = []

  for (const item of items) {
    if (!item || typeof item !== "object") continue
    if (devKey in item) {
      const id = item[devKey]
      if (id && id in devData && devData[id] && typeof devData[id] === "object") {
        const resolved = clone(devData[id])
        resolved[devItemIdKey] = id
        if (Array.isArray(resolved.items)) {
          resolved.items = mergeDevLayoutItems(resolved.items, devData)
        }
        result.push(resolved)
      }
      continue
    }

    const next = clone(item)
    if (Array.isArray(next.items)) {
      next.items = mergeDevLayoutItems(next.items, devData)
    }
    result.push(next)
  }

  return result
}

export function normaliseLayoutData(sourceData, { schemaRev, createCategory, createItem, genEmptyLayout }) {
  const source = sourceData && typeof sourceData === "object" ? clone(sourceData) : genEmptyLayout(schemaRev)
  let restored = false
  const normalised = {
    ...source,
    schema: schemaRev,
    items: [],
  }

  if (!Array.isArray(source.items)) restored = true

  const dive = (src, dest, isCategories = false) => {
    if (!Array.isArray(src)) return
    for (const sourceItem of src) {
      let item = sourceItem
      const devId = sourceItem?.[devItemIdKey]
      const sourceChildren = Array.isArray(sourceItem?.items) ? sourceItem.items : null
      item = isCategories ? createCategory(item, true) : createItem(item, true)
      if (devId) item[devItemIdKey] = devId
      if (Array.isArray(item.items)) {
        // createItem/createCategory can preserve array references from source data.
        // Snapshot children first, otherwise splice(0) may clear the source array too.
        const childSource = sourceChildren === item.items ? sourceChildren.slice() : sourceChildren
        item.items.splice(0)
        dive(childSource, item.items)
      }
      dest.push(item)
      if (!restored && JSON.stringify(sourceItem) !== JSON.stringify(item)) restored = true
    }
  }

  dive(source.items, normalised.items, true)
  if (source.schema !== schemaRev) restored = true

  return { layout: normalised, restored }
}

export function splitLayoutData(layout) {
  const layoutDev = {}
  const usedDevIds = new Set()

  function split(items) {
    if (!Array.isArray(items)) return []
    const result = []
    for (const item of items) {
      if (!item || typeof item !== "object") continue

      if (item.condition_always_off || item.condition_not_shipping) {
        let id = typeof item[devItemIdKey] === "string" ? item[devItemIdKey] : ""
        if (!id || usedDevIds.has(id)) {
          id = uniqueId()
        }
        usedDevIds.add(id)

        const devItem = clone(item)
        delete devItem[devItemIdKey]
        if (Array.isArray(devItem.items)) {
          devItem.items = split(devItem.items)
        }
        layoutDev[id] = devItem
        result.push({ [devKey]: id })
        continue
      }

      const next = clone(item)
      delete next[devItemIdKey]
      if (Array.isArray(next.items)) {
        next.items = split(next.items)
      }
      result.push(next)
    }
    return result
  }

  const layoutMain = {
    ...clone(layout),
    items: split(layout?.items),
  }

  return { layout: layoutMain, layoutDev }
}

