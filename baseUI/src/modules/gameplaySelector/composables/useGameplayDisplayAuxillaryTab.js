import { computed, unref } from "vue"

function noop() {}

export function useGameplayDisplayAuxillaryTab(options = {}) {
  const props = computed(() => ({
    displayData: unref(options.displayData) ?? [],
    detailsMode: unref(options.detailsMode) ?? "displayControls",
  }))

  const listeners = {
    "display-data-update": options.updateDisplayData || noop,
    "display-data-reset": options.resetDisplayDataToDefaults || noop,
    "toggle-details-mode": options.setDetailsMode || noop,
  }

  return {
    props,
    listeners,
  }
}
