import { defineStore } from "pinia"
import { ref, computed } from "vue"

const DEFAULT_STATE = Object.freeze({
  namespace: "",
  fromRoute: null,
  route: null,
  scopeTree: null,
  scopeParentMap: null,
  targetScope: null,
  breadcrumbs: [],
  data: null,
  status: "",
  error: null,
})

export const useRouteDataStore = defineStore("routeData", () => {
  const namespace = ref(DEFAULT_STATE.namespace)
  const fromRoute = ref(DEFAULT_STATE.fromRoute)
  const route = ref(DEFAULT_STATE.route)
  const scopeTree = ref(DEFAULT_STATE.scopeTree)
  const scopeParentMap = ref(DEFAULT_STATE.scopeParentMap)
  const targetScope = ref(DEFAULT_STATE.targetScope)
  const breadcrumbs = ref(DEFAULT_STATE.breadcrumbs)
  const data = ref(DEFAULT_STATE.data)
  const status = ref(DEFAULT_STATE.status)
  const error = ref(DEFAULT_STATE.error)

  const isError = computed(() => status.value === "error")
  const routeName = computed(() => route.value?.name || "")

  function setRouteData(payload) {
    // console.log("setRouteData payload", JSON.stringify(payload, null, 2))
    if (!payload || typeof payload !== "object") {
      return
    }

    namespace.value = payload.namespace || ""
    fromRoute.value = payload.fromRoute || null
    route.value = payload.route || null
    scopeTree.value = payload.scopeTree || null
    scopeParentMap.value = payload.scopeParentMap || null
    targetScope.value = payload.targetScope || null
    breadcrumbs.value = Array.isArray(payload.breadcrumbs) ? payload.breadcrumbs : []
    data.value = payload.data
    status.value = payload.status || ""
    error.value = payload.error || null
  }

  function reset() {
    namespace.value = DEFAULT_STATE.namespace
    fromRoute.value = DEFAULT_STATE.fromRoute
    route.value = DEFAULT_STATE.route
    scopeTree.value = DEFAULT_STATE.scopeTree
    scopeParentMap.value = DEFAULT_STATE.scopeParentMap
    targetScope.value = DEFAULT_STATE.targetScope
    breadcrumbs.value = DEFAULT_STATE.breadcrumbs
    data.value = DEFAULT_STATE.data
    status.value = DEFAULT_STATE.status
    error.value = DEFAULT_STATE.error
  }

  return {
    namespace,
    fromRoute,
    route,
    scopeTree,
    scopeParentMap,
    targetScope,
    breadcrumbs,
    data,
    status,
    error,
    isError,
    routeName,
    setRouteData,
    reset,
  }
})
