/**
 * Model ↔ view value mapping (same idea as Utils.mapUI in ui/lib/int/utilities.js).
 * Use resolveModel as () => props.modelValue so getters/setters always see the current binding.
 *
 * @param {object|function(): object} resolveModel - backing model or getter
 * @param {object} view - object that receives the defined property (e.g. reactive uidata)
 * @param {string} path - dot path on the model, e.g. "ffb.softlockForce"
 * @param {function(any): any} modelToView
 * @param {function(any): any} viewToModel
 * @param {function(): void} [onWrite] - called after the model is updated (e.g. emit v-model)
 */
export function mapUI(resolveModel, view, path, modelToView, viewToModel, onWrite) {
  const getModel = typeof resolveModel === "function" ? resolveModel : () => resolveModel

  const subpaths = path.split(".")
  let viewWalk = view
  for (let i = 0; i < subpaths.length; i++) {
    const subpath = subpaths[i]
    if (i === subpaths.length - 1) break
    if (viewWalk[subpath] === undefined) viewWalk[subpath] = {}
    viewWalk = viewWalk[subpath]
  }
  const leaf = subpaths[subpaths.length - 1]
  Object.defineProperty(viewWalk, leaf, {
    get() {
      return modelToView(refPath(getModel(), path))
    },
    set(v) {
      refPath(getModel(), path, viewToModel(v))
      onWrite?.()
    },
  })
}

export function refPath(obj, route, value) {
  if (typeof route === "string") route = route.split(".")
  if (route.length === 1 && value !== undefined) return (obj[route[0]] = value)
  if (route.length === 0) return obj
  return refPath(obj[route[0]], route.slice(1), value)
}
