import { computed, nextTick } from "vue"
import logger from "@/services/logger"
import { normalizePath } from "./gridSelectorHelpers"

export default function useGridSelectorRouting({
  props,
  store,
  screenHeaderPath,
  requestNavigation,
  requestBackFromGrid,
  getCurrentPathSegments = null,
}) {
  const resolveDefaultPathSegments = () => {
    if (Array.isArray(props.defaultPath?.keys)) {
      return props.defaultPath.keys
    }
    return Array.isArray(props.defaultPath) ? props.defaultPath : []
  }

  const resolveCurrentPathSegments = () => {
    if (typeof getCurrentPathSegments === "function") {
      const adapterPathSegments = getCurrentPathSegments()
      if (Array.isArray(adapterPathSegments)) {
        return [...adapterPathSegments]
      }
    }

    return resolveDefaultPathSegments()
  }

  const currentPathSegments = computed(() => {
    return resolveCurrentPathSegments()
  })

  function buildNavigationRequest(item) {
    if (!Array.isArray(item?.gotoPath) || item.gotoPath.length === 0) {
      return null
    }

    return {
      item,
      gotoPath: [...item.gotoPath],
    }
  }

  function routeNav(item) {
    const navigationRequest = buildNavigationRequest(item)
    if (!navigationRequest) {
      return null
    }

    if (typeof requestNavigation === "function") {
      try {
        requestNavigation(navigationRequest)
      } catch (error) {
        logger.error("GridSelector.routeNav.requestNavigation", error)
        return null
      }
    }

    return navigationRequest
  }

  function buildBackFromGridPayload() {
    const isAtGridRoot = !Array.isArray(screenHeaderPath.value) || screenHeaderPath.value.length <= 1
    return {
      currentPathSegments: Array.isArray(currentPathSegments.value) ? [...currentPathSegments.value] : [],
      isAtGridRoot,
    }
  }

  function onBackFromGrid() {
    logger.debug("GridSelector.onBackFromGrid", screenHeaderPath.value)
    if (typeof requestBackFromGrid === "function") {
      try {
        requestBackFromGrid(buildBackFromGridPayload())
      } catch (error) {
        logger.error("GridSelector.onBackFromGrid.requestBackFromGrid", error)
      }
    }
    return false
  }

  function onBreadBack() {
    return nextTick(onBackFromGrid)
  }

  async function setCurrentPath(path) {
    await store.setCurrentPath(normalizePath(path))
  }

  return {
    currentPathSegments,
    buildNavigationRequest,
    buildBackFromGridPayload,
    routeNav,
    onBackFromGrid,
    onBreadBack,
    setCurrentPath,
  }
}
