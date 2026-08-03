const UI_NAV_SERVICE_INSTANCE_KEY = "__bngUINavServiceInstance"

const getStoredUINavServiceInstance = () => window[UI_NAV_SERVICE_INSTANCE_KEY]

export const setUINavServiceInstance = (serviceInstance) => {
  if (serviceInstance === null || serviceInstance === undefined) {
    delete window[UI_NAV_SERVICE_INSTANCE_KEY]
    return
  }
  window[UI_NAV_SERVICE_INSTANCE_KEY] = serviceInstance
}

export const getUINavServiceInstance = () => {
  const instance = getStoredUINavServiceInstance()
  if (!instance) {
    throw new Error("UINavService not initialized.")
  }
  return instance
}

window.uiNav = window.uiNav || {}
window.uiNav.debugScopeTree = (rootElement) => {
  const instance = getStoredUINavServiceInstance()
  if (!instance) return console.warn("UINavService not initialized.")
  return instance.getScopeTree(rootElement)
}
