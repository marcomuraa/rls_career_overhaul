export const GRID_SCOPE_ID = "grid-selector-grid"
export const DETAILS_SCOPE_ID = "grid-selector-details"

export function normalizePath(path) {
  if (Array.isArray(path)) {
    return { keys: [...path] }
  }

  if (path && Array.isArray(path.keys)) {
    return { keys: [...path.keys] }
  }

  return { keys: [] }
}

export function getPathKey(path) {
  return normalizePath(path).keys.join("/")
}

export function hasRenderableTiles(groups) {
  return Array.isArray(groups) && groups.some(group => Array.isArray(group?.tiles) && group.tiles.length > 0)
}
