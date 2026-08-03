export const PATH_SEPARATOR_REGEX = /[\\/]/;

export function getBasename(path) {
  return String(path || "").split(PATH_SEPARATOR_REGEX).pop() || ""
}