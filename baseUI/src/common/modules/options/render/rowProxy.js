import { computed } from "vue"

const ROW_PROXY_ITEM_TYPES = Object.freeze({
  checkbox: true,
  options: true,
  link: true,
  input: true,
  slider: true,
})

export function useOptionRowProxy(dataRef, controlRef, disabledRef) {
  const rowProxyEnabled = computed(() => !!dataRef.value?.itemType && !!ROW_PROXY_ITEM_TYPES[dataRef.value.itemType])

  function getControlInstance() {
    return controlRef.value
  }

  function getControlElement() {
    const control = getControlInstance()
    return control?.$el || control || null
  }

  function isClickInsideControl(event) {
    const controlElement = getControlElement()
    return !!(controlElement && event?.target instanceof Node && controlElement.contains(event.target))
  }

  function onRowActivate() {
    const control = getControlInstance()
    switch (dataRef.value?.itemType) {
      case "checkbox":
        control?.toggle?.()
        return false
      case "link":
        control?.activate?.()
        return false
      case "options":
        if (control?.hasDropdown?.()) control?.openDropdown?.()
        return false
      case "input":
        control?.activateInput?.()
        return false
      case "slider":
        control?.activateSlider?.()
        return false
      default:
        return true
    }
  }

  function onLabelClick(event) {
    if (!rowProxyEnabled.value || disabledRef.value) return
    event.preventDefault()
    event.stopPropagation()
    onRowActivate()
  }

  function onRowClick(event) {
    if (!rowProxyEnabled.value || disabledRef.value) return
    if (isClickInsideControl(event)) return
    onRowActivate()
  }

  function onRowFocusLeft() {
    if (disabledRef.value) return true
    const control = getControlInstance()
    switch (dataRef.value?.itemType) {
      case "options":
        if (!control?.hasDropdown?.()) {
          control?.stepPrev?.()
          return false
        }
        return true
      default:
        return true
    }
  }

  function onRowFocusRight() {
    if (disabledRef.value) return true
    const control = getControlInstance()
    switch (dataRef.value?.itemType) {
      case "options":
        if (!control?.hasDropdown?.()) {
          control?.stepNext?.()
          return false
        }
        return true
      default:
        return true
    }
  }

  return {
    rowProxyEnabled,
    onLabelClick,
    onRowClick,
    onRowFocusLeft,
    onRowFocusRight,
  }
}

