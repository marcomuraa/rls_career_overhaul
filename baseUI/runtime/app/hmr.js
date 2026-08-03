import { HMR_ENABLED } from "../config.js"

export const hmrRecords = new Set()

// onComponent hook: register/reload the finished component definition
export function registerComponent(component, id) {
  if (!HMR_ENABLED) return
  const hmr = window.__VUE_HMR_RUNTIME__
  if (!hmr) return
  component.__hmrId = id
  component.__file = id
  if (hmrRecords.has(id)) hmr.reload(id, component)
  else { hmrRecords.add(id); hmr.createRecord(id, component) }
}
