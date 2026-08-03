import { storeToRefs } from "pinia"
import useControls from "@/services/controls"

export function useControllerActionItems() {
  const controls = useControls()
  const { isControllerUsed } = storeToRefs(controls)

  const showForController = showIfControllerFlag => {
    if (typeof showIfControllerFlag !== "boolean") return true
    return showIfControllerFlag === isControllerUsed.value
  }
  const hasBindingForAction = action => {
    if (typeof action !== "string" || action.length === 0) return false
    return !!controls.makeViewerObj({ action, useLastDevice: true })
  }
  const normalizeActionItems = (actionItems, defValue = undefined) => {
    if (!Array.isArray(actionItems)) return defValue
    return actionItems
      .filter(item => (
        item &&
        typeof item === "object" &&
        typeof item.action === "string" &&
        item.missing !== true &&
        hasBindingForAction(item.action)
      ))
      .map(item => ({
        action: item.action,
        label: item.label,
        missing: !!item.missing,
        showIfController: typeof item.showIfController === "boolean" ? item.showIfController : undefined,
      }))
  }
  const filterActionItemsForController = item => {
    if (!Array.isArray(item.actionItems)) return item
    const actionItems = item.actionItems.filter(actionItem => showForController(actionItem?.showIfController))
    return { ...item, actionItems }
  }

  return {
    showForController,
    normalizeActionItems,
    filterActionItemsForController,
  }
}
