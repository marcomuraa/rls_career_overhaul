import { computed } from "vue"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"

// Shared breadcrumb click/back wiring for livery editor screens.
// By default it mirrors the Garage pattern: click navigates by the breadcrumb's
// route name and back defers to the Lua router. Edit screens can pass `handleBack`
// and/or `handleNavigate` to run their own save/cancel/cleanup flow first; those
// hooks return a truthy value when they have fully handled the interaction so the
// generic router navigation is skipped.
export function useLiveryBreadcrumbNavigation({ handleBack, handleNavigate } = {}) {
  const routeDataStore = useRouteDataStore()

  const breadcrumbItems = computed(() => (Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : []))

  function isNavigableBreadcrumb(item) {
    if (!item || !item.routeName || item.abstract || item.decorator) return false
    return item.routeName !== routeDataStore.route?.name
  }

  async function navigateToBreadcrumb(item) {
    if (!isNavigableBreadcrumb(item)) return
    await lua.extensions.ui_router.navigate(item.routeName, item.params)
  }

  async function onBreadcrumbClick(item) {
    if (!item) return
    if (typeof handleNavigate === "function" && (await handleNavigate(item))) return
    await navigateToBreadcrumb(item)
  }

  async function onBreadcrumbBack() {
    if (typeof handleBack === "function" && (await handleBack())) return
    await lua.extensions.ui_router.back()
  }

  return {
    breadcrumbItems,
    isNavigableBreadcrumb,
    navigateToBreadcrumb,
    onBreadcrumbClick,
    onBreadcrumbBack,
  }
}
