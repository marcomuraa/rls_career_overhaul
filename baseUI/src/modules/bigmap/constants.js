export const POI_LIST_DISPLAY_MODE = Object.freeze({
  HIDDEN: "hidden",
  TREE: "tree",
  SIMPLE: "simple",
})

export function isModeValid(mode) {
  return Object.values(POI_LIST_DISPLAY_MODE).includes(mode)
}
