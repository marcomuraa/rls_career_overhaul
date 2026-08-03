import { ref, nextTick } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import { reportState } from "@/services/stateReporter.js"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore.js"
import { useInfoBar } from "@/services/infoBar.js"
import { lua } from "@/bridge"
import { activateRouteTargetScope } from "@/services/scopedNav/api"

import NotFoundView from "@/views/NotFound.vue"

const RUNTIME_SFC = window.bngUiMode?.runtime

const normaliseRoutes = (routes, isDev) => routes.flatMap(route => {
  if (!route) return []
  const children = route.children ? normaliseRoutes(route.children, isDev) : undefined
  const names = Array.isArray(route.name) ? route.name : [route.name]
  return names.map(name => ({ ...route, children, name, meta: { ...route.meta, isDev } }))
})

// IMPORTANT: when changing the path, make sure to update it in vite.config.js as well
const routes = Object.entries(import.meta.glob("@/modules/*/routes(.dev)?.js", { eager: true, import: "default" }))
  .flatMap(([path, routes]) => normaliseRoutes(routes, path.includes(".dev.js")))

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...routes,
    {
      path: "/:catchAll(.*)*",
      name: "unknown",
      component: NotFoundView,
      meta: { ignoreRouteSync: true },
    },
  ],
})

const moduleRouteNames = new Map()

function addRoutes(entries) {
  for (const entry of entries) {
    if (!entry || !entry.routes) continue
    // current re-registration behaviour:
    // - drops the previously tracked routes first so the table reconciles in place
    // - removeRoute here does not navigate, so a currently displayed view stays mounted and just picks up the new definition on the next navigation
    const prev = moduleRouteNames.get(entry.path)
    if (prev) for (const name of prev) if (router.hasRoute(name)) router.removeRoute(name)
    const added = []
    for (const r of normaliseRoutes(entry.routes, entry.path.includes(".dev.js"))) {
      router.addRoute(r)
      added.push(r.name)
    }
    moduleRouteNames.set(entry.path, added)
  }
  if (typeof window !== "undefined") window.__bngResolveRoutes?.()
}

function removeRoutes(paths = []) {
  const names = []
  for (const path of paths) {
    const tracked = moduleRouteNames.get(path)
    if (!tracked) continue
    names.push(...tracked)
    moduleRouteNames.delete(path)
  }
  if (!names.length) return
  const current = router.currentRoute.value
  const leavingActive = current?.matched?.some(m => names.includes(m.name))
  for (const name of names) if (router.hasRoute(name)) router.removeRoute(name)
  if (leavingActive) router.replace("/").catch(() => {})
}

if (typeof window !== "undefined") window.bngRoutes = { add: addRoutes, remove: removeRoutes }

// holds the first unmatched navigation until routes are ready
router.beforeEach(async to => {
  // Diagnostic ack: the Vue Router pipeline has started for a Lua-triggered navigation.
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || to.name
  if (window.__luaRouter__?.luaTriggeredNavigation && window.__luaRouter__?.luaTriggeredNavigationBy === "vue" && canonicalRoute) {
    lua.extensions.ui_router.routeNavigationStarted("vue", canonicalRoute, window.__luaRouter__?.getPendingTransitionId?.())
  }

  const ready = typeof window !== "undefined" && window.__bngRoutesReady
  if (ready && !window.__bngRoutesGateDone && to.matched.some(m => m.name === "unknown")) {
    await ready
    window.__bngRoutesGateDone = true
    return to.fullPath
  }
})

router.bngUpdateMeta = to => {
  if (!to.meta) return
  if (to.meta.uiApps) handelUIAppsSettings(to.meta.uiApps)
  handleInfoBarSettings(to.meta.infoBar || {})
}

router.bngLuaRoutes = ref([])
router.bngRuntimeRoutes = ref([])

router.bngSyncRoutes = async () => {
  // await lua.extensions.ui_router_routeManager.addVueRoutes([{ name: "menu.pause", path: "/pause", meta: {} }])
  if (!import.meta.hot) return
  await lua.extensions.ui_router_routeManager.removeRuntimeRoutes()
  const luaRoutes = await lua.extensions.ui_router_routeManager.getAllRoutes() // flat array of route names
  router.bngLuaRoutes.value = luaRoutes
  const vueRoutes = router.getRoutes()
  const runtimeRoutes = vueRoutes
    .filter(route => !luaRoutes.includes(route.name) && !route.meta?.ignoreRouteSync)
    .map(route => ({
      name: route.name,
      path: route.path,
      meta: route.meta,
    }))
  if (runtimeRoutes.length > 0) {
    await lua.extensions.ui_router_routeManager.addVueRoutes(runtimeRoutes)
  }
  router.bngRuntimeRoutes.value = runtimeRoutes.map(r => r.name)
}

const raf = () => new Promise(r => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r)))

async function awaitMatchedComponents(to) {
  const loaders = []
  for (const record of to.matched) {
    const comps = record.components
    if (!comps) continue
    for (const comp of Object.values(comps)) {
      // an unresolved lazy route component is a bare thunk, not a resolved component object
      if (typeof comp === "function" && !comp.__vccOpts && !comp.render && !comp.setup && !comp.displayName) {
        loaders.push(Promise.resolve().then(comp).catch(() => {}))
      }
    }
  }
  if (loaders.length) await Promise.all(loaders)
}

async function ackRouteMounted(to) {
  if (RUNTIME_SFC) {
    await awaitMatchedComponents(to)
    await nextTick()
    await raf()
    // navigated elsewhere while the view was still loading - let that route ack itself
    if (router.currentRoute.value.name !== to.name) return
  } else {
    await nextTick()
  }
  const canonicalRoute = window.__luaRouter__._pendingCanonicalRoute || to.name
  const transitionId = window.__luaRouter__.getPendingTransitionId?.()
  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute, transitionId)
  if (result?.success) {
    window.__luaRouter__._pendingCanonicalRoute = null
    window.__luaRouter__._pendingTransitionId = null
    activateRouteTargetScope()
  }
}

router.afterEach((to, from) => {
  // console.log(`Router from:${from.path} to:${to.path}`)
  // console.log(to.matched[0].name)

  // report state to Lua
  reportState(to.path, true, from.path)

  // Check for refresh flag - skip routeChangeComplete if it's a refresh
  if (window.__luaRouter__.luaTriggeredRefresh) {
    // console.log("[Vue] Refresh navigation complete, skipping routeChangeComplete")
    window.__luaRouter__.luaTriggeredRefresh = false
  }
  // This check is needed so we know if the navigation was strictly triggered by lua
  // and not by a CEF reload
  else if (window.__luaRouter__.luaTriggeredNavigation && window.__luaRouter__.luaTriggeredNavigationBy === "vue" && to.name && to.name !== "unknown") {
    // console.log("routeChangeComplete vue", to.name)
    lua.extensions.ui_router.routeChangeComplete("vue", window.__luaRouter__.luaTriggeredRoute, window.__luaRouter__.luaTriggeredTransitionId)
    window.__luaRouter__.luaTriggeredNavigation = false
  }

  if (!to.meta?.handlesOwnReady && to.name && to.name !== "unknown" && to.name !== "__legacyAngular") {
    ackRouteMounted(to)
  }

  // deal with any 'meta' settings
  // router.bngUpdateMeta(to)
})

const handelUIAppsSettings = settings => {
  const appLayouts = useAppLayoutsStore()
  if (settings.layout === "blank") {
    appLayouts.clearCurrentLayout()
  } else if (settings.layout) {
    appLayouts.setLayoutByType(settings.layout)
  }
  // Only set the visibility if the property is specified (this is different to how angular behaves, but to keep all Vue states behaving as before - not touching UIApps - we need this)
  // TODO - We can switch to having `false` be default in the future
  if ("shown" in settings) appLayouts.setVisible(settings.shown)
}

const handleInfoBarSettings = settings => {
  const infoBar = useInfoBar()
  infoBar.visible = settings.visible
  infoBar.showSysInfo = settings.showSysInfo
  if (settings.hints) {
    infoBar.clearHints()
    infoBar.addHints(settings.hints)
  }
}

export default router
