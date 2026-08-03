/**
 * UINav Service - Main export barrel file
 * Provides centralized access to the UINav system
 */

export * from "./constants.js"

import { getUINavServiceInstance } from "./uiNavService.js"

// Main service (singleton)
export { UINavService, setUINavServiceInstance, getUINavServiceInstance } from "./uiNavService.js"

export function getUINavHandlers() {
  return getUINavServiceInstance().handlers
}

export function getUINavScopeRegistry() {
  return getUINavServiceInstance().scopeRegistry
}

// Individual classes (for testing or advanced usage)
export { UINavEventProcessor } from "./eventProcessor.js"
export { UINavActionHandlers } from "./actionHandlers.js"

// Vue composables
export { usePopupUINavScopeName, useUINavScope, watchUINavEventChange } from "./composables.js"

// Utility functions
export { isOnOffEvent, checkOn, normalizeEventDescriptor, handlePropagation, eventMatchesDescriptor, getDescriptorEventNameText } from "./utils.js"

// Utility function for backward compatibility
export const eventFirer = uiEvent => value => {
  const service = getUINavServiceInstance()
  return service.fireEvent(uiEvent, value)
}
