import { computed, reactive, ref } from "vue"
import router from "@/router"

const EMPTY_FLAGS = Object.freeze({
  dev: false,
  vue: false,
  ng: false,
  lua: false,
})

const copyFlags = flags => ({
  dev: !!flags.dev,
  vue: !!flags.vue,
  ng: !!flags.ng,
  lua: !!flags.lua,
})

const mergeFlags = (target, source) => {
  target.dev = !!target.dev || !!source.dev
  target.vue = !!target.vue || !!source.vue
  target.ng = !!target.ng || !!source.ng
  target.lua = !!target.lua || !!source.lua
}

const makeBadge = flags => {
  const keys = Object.entries(flags)
    .filter(([key, value]) => key !== "none" && key !== "badge" && !!value)
    .map(([key]) => key.toUpperCase())
  return keys.length ? `[${keys.join("+")}]` : ""
}

const sortLocale = (a, b) => String(a || "").localeCompare(String(b || ""))

export const resolveRouteName = (eventData, fallbackRouteName = "") =>
  eventData?.request?.name || eventData?.toRoute?.name || fallbackRouteName || ""

function buildRouteTree(allRoutes, routeInfo) {
  const roots = []
  const nodeMap = new Map()

  const getOrCreateNode = (fullName, label) => {
    if (nodeMap.has(fullName)) return nodeMap.get(fullName)
    const node = {
      id: fullName,
      fullName,
      label,
      isRoute: false,
      routeInfo: null,
      flags: copyFlags(EMPTY_FLAGS),
      badge: "",
      children: [],
    }
    nodeMap.set(fullName, node)
    return node
  }

  const routeNames = [...allRoutes].sort(sortLocale)
  for (const routeName of routeNames) {
    const parts = String(routeName || "").split(".").filter(Boolean)
    if (!parts.length) continue
    let parentChildren = roots
    let parentPath = ""
    for (let idx = 0; idx < parts.length; idx++) {
      const part = parts[idx]
      const fullName = parentPath ? `${parentPath}.${part}` : part
      const node = getOrCreateNode(fullName, part)
      if (!parentChildren.includes(node)) {
        parentChildren.push(node)
      }
      if (idx === parts.length - 1) {
        const info = routeInfo[routeName] || { ...EMPTY_FLAGS, none: true, badge: "" }
        node.isRoute = true
        node.routeInfo = info
      }
      parentPath = fullName
      parentChildren = node.children
    }
  }

  const resolveFlags = node => {
    const flags = copyFlags(EMPTY_FLAGS)
    if (node.routeInfo) mergeFlags(flags, node.routeInfo)
    for (const child of node.children) {
      const childFlags = resolveFlags(child)
      mergeFlags(flags, childFlags)
    }
    node.flags = flags
    node.badge = makeBadge(flags)
    node.children.sort((a, b) => sortLocale(a.label, b.label))
    return flags
  }

  roots.sort((a, b) => sortLocale(a.label, b.label))
  roots.forEach(resolveFlags)
  return roots
}

export function useNavRoutes() {
  const isDev = __BNG_DEV__
  const ngRoutes = ref([])
  let readAngularRoutesRetryTimer = null
  let readAngularRoutesRetryCount = 0
  const READ_ANGULAR_ROUTES_RETRY_MS = 250
  const READ_ANGULAR_ROUTES_RETRY_MAX = 40
  const routeFilter = reactive({
    dev: true,
    vue: true,
    ng: true,
    lua: true,
  })

  const routes = computed(() => router.getRoutes())
  const realRoutes = computed(() => routes.value.map(route => route.name).filter(Boolean))
  const devRoutes = computed(() => routes.value.filter(route => route.meta?.isDev).map(route => route.name).filter(Boolean))
  const vueRoutes = computed(() => router.bngRuntimeRoutes.value || [])
  const luaRoutes = computed(() => router.bngLuaRoutes.value || [])

  const allRoutes = computed(() => [...realRoutes.value, ...ngRoutes.value, ...luaRoutes.value]
    .filter(Boolean)
    .reduce((result, routeName) => (result.includes(routeName) ? result : [...result, routeName]), []))

  const routeInfo = computed(() => {
    const result = {}
    for (const routeName of allRoutes.value) {
      const item = {
        dev: devRoutes.value.includes(routeName),
        vue: realRoutes.value.includes(routeName),
        ng: ngRoutes.value.includes(routeName),
        lua: luaRoutes.value.includes(routeName),
      }
      item.none = !Object.values(item).some(Boolean)
      item.badge = makeBadge(item)
      result[routeName] = item
    }
    return result
  })

  const showRoute = routeName => {
    if (!routeName || !(routeName in routeInfo.value) || routeInfo.value[routeName].none) return true
    return Object.entries(routeFilter).some(([key, enabled]) => !!enabled && routeInfo.value[routeName][key])
  }

  const flatRoutes = computed(() => allRoutes.value
    .slice()
    .sort(sortLocale)
    .map(routeName => ({
      route: routeName,
      ...routeInfo.value[routeName],
    })))

  const routeTree = computed(() => buildRouteTree(allRoutes.value, routeInfo.value))

  function stopAngularRoutesRetry() {
    if (!readAngularRoutesRetryTimer) return
    clearTimeout(readAngularRoutesRetryTimer)
    readAngularRoutesRetryTimer = null
  }

  function scheduleAngularRoutesRetry() {
    if (readAngularRoutesRetryTimer) return
    if (readAngularRoutesRetryCount >= READ_ANGULAR_ROUTES_RETRY_MAX) return
    readAngularRoutesRetryTimer = setTimeout(() => {
      readAngularRoutesRetryTimer = null
      readAngularRoutesRetryCount += 1
      readAngularRoutes()
    }, READ_ANGULAR_ROUTES_RETRY_MS)
  }

  function readAngularRoutes() {
    const angularRouter = window.angularRouter
    if (!angularRouter?.get) {
      scheduleAngularRoutesRetry()
      return
    }

    let rawRoutes = []
    try {
      rawRoutes = angularRouter.get()
    } catch (_) {
      rawRoutes = []
    }

    const routeList = (Array.isArray(rawRoutes) ? rawRoutes : Object.values(rawRoutes || {}))
      .filter(route => !route?.abstract)
      .map(route => route?.name)
      .filter(Boolean)
    ngRoutes.value = routeList

    if (routeList.length > 0) {
      readAngularRoutesRetryCount = 0
      stopAngularRoutesRetry()
      return
    }

    scheduleAngularRoutesRetry()
  }

  return {
    isDev,
    routes,
    realRoutes,
    devRoutes,
    vueRoutes,
    ngRoutes,
    luaRoutes,
    allRoutes,
    routeInfo,
    routeFilter,
    showRoute,
    flatRoutes,
    routeTree,
    readAngularRoutes,
    stopAngularRoutesRetry,
  }
}
