import * as Vue from "vue/dist/vue.esm-bundler.js"

// Polyfills for newer JS stuff in case of CEF reversion
// import "@/utils/polyfills.js"

import { createApp, ref, reactive, watch, computed } from "vue"
import { createPinia } from "pinia"
import Emitter from "eventemitter3"

import { useBridge, setBridgeDependencies, lua } from "@/bridge"
import logger from "@/services/logger"
import { initTranslation } from "@/services/translation"
import { UINavService, setUINavServiceInstance } from "@/services/uiNav"
import { useUINavTracker } from "@/services/uiNavTracker"
import { useUiHealth } from "@/services/uiHealth"
import { SysInfo } from "@/services"
import useControlsStore from "@/services/controls"
import { useRouteDataStore } from "@/services/routeData"
import { icons } from "@/common/components/base"
import { getFile } from "@/utils"

import { init as watchdogInit } from "@/services/watchdog"

import "@/styles/base.scss" // global styles

import App from "@/App.vue"

import router from "@/router"

import { useGameContextStore } from "@/services/gameContextStore"
import { init as initReadyUpScreen } from "@/services/readyUpScreenService.js"
import { initWorkbenchInspector } from "@/services/workbenchInspector"
import { customDisposePlugin } from "@/utils/storePlugins"
// TODO: remove this when no more references to global crossfire functions
import * as crossfire from "@/services/crossfire"
import { initFocusVisible } from "@/services/uiNavFocus"
import { useTasksStore } from "@/services/tasklistStore"
import { useMessagesStore } from "@/services/messagesStore"
import { useReplayHudMessage } from "@/modules/replay/composables/useReplayHudMessage"
import { useModManager } from "@/services/modManager"
import { registerListener as registerPopupListener } from "@/services/popup"
import { registerToastListener, toastr } from "@/services/toast"
import { initRoutePreloader, runInGamePreloads, markPreloadRequested } from "@/services/routePreloader"
import { loadingScreen } from "@/services/screenCover"
import gameBlurrer from "@/services/gameBlur"

import { initializeScopedNavHooks, ScopeCoordinator, setScopeCoordinatorInstance, installGlobalRouterHook, createRouteScopeValidator, setRouteScopeValidatorInstance } from "@/services/scopedNav"

window.watchdogInit = watchdogInit

// make sure Vue available globally for legacy stuff depending on it
window.Vue = Vue

// this is a low level initialisation for vue things, just a preparation. no mounts, no anything. vue is idle at this stage.
// note: if you want to add something to init(), you most likely want to add it to start() instead (just scroll down)
function init() {
  // TODO: remove this when no more references to global crossfire functions
  Object.assign(window, crossfire)

  // set up the bridge with the game, and store it globally (vueService will need it - at least until we eventually retire that)
  const deps = {
    Emitter,
    beamng: window.beamng,
  }

  // set an override if an API is already set up
  if (window.bngApi) deps["overrideAPI"] = window.bngApi
  setBridgeDependencies(deps)
  let bridge = useBridge()
  window.bridge = bridge

  // initialise systemInfo service
  SysInfo.init()

  // initialise our focus visible polyfill
  initFocusVisible()

  // switch on the UI Nav events & hook up a global handler (involving crossfire) to use them
  // bridge.uiNavEvents.activate()
  // bridge.uiNavEvents.hookGlobalEvents(true)
  bridge.uiNavService = new UINavService(bridge.events)
  setUINavServiceInstance(bridge.uiNavService)
  bridge.uiNavService.initialize()

  bridge.scopeCoordinator = new ScopeCoordinator()
  setScopeCoordinatorInstance(bridge.scopeCoordinator)
  bridge.routeScopeValidator = createRouteScopeValidator()
  setRouteScopeValidatorInstance(bridge.routeScopeValidator)
  initializeScopedNavHooks()
  installGlobalRouterHook()

  const pinia = createPinia()
    .use(customDisposePlugin)

  const app = createApp(App)
    .use(router)
    .use(pinia)

  window.bngVue.app = app

  window.bngVue.controlsStore = useControlsStore()

  bridge.scopeCoordinator.setDependencies({
    controls: window.bngVue.controlsStore,
    routeDataStore: useRouteDataStore(),
  })
  bridge.scopeCoordinator.initialize()
}

async function reloadCurrentLuaRoute() {
  try {
    const currentVueRouteName = router.currentRoute?.value?.name
    if (currentVueRouteName === "unknown" || currentVueRouteName === "__legacyAngular") return

    const currentLuaRoute = await lua.extensions.ui_router.getCurrent()
    if (!currentLuaRoute) return

    const currentRoute = router.currentRoute?.value
    const routeName = currentRoute?.name || null
    const params = currentRoute?.params || null

    await lua.extensions.ui_router.reload(routeName, params, { force: true })
  } catch {}
}

// this is a higher level initialisation for vue things, when vue and its subsystems are actually starting to work.
// it is likely a place where you want things to start running. or consider another place like App.vue or higher.
function start() {
  const app = window.bngVue.app
  const bridge = window.bridge

  if (!window.vueGlobalStore) {
    window.vueGlobalStore = reactive({})
  }

  const globals = {
    $console: logger,
    $logger: logger,
    $simplemenu: ref(!!window.beamng?.simplemenu),
    $globalStore: window.vueGlobalStore,
  }
  window.bngVue.globals = globals

  const { i18n, plugin: translationPlugin } = initTranslation()

  app.use(i18n).use(translationPlugin())
  registerPopupListener()
  registerToastListener()
  window.bngVue.toastr = toastr // for angular

  for (const [key, value] of Object.entries(globals)) {
    app.config.globalProperties[key] = value
    app.provide(key, value)
  }

  const modManager = useModManager()
  modManager.loadMods() // initial mods load

  app.mount("#vue-app")

  window.vueRouter = router
  initRoutePreloader(router)

  window.setupUIRouter("vue")
  Promise.resolve(router.bngSyncRoutes())
    .catch(() => {})
    .finally(() => {
      Promise.resolve(router.isReady())
        .catch(() => {})
        .finally(() => {
          reloadCurrentLuaRoute()
          .then(() => {})
          .catch(() => {
            console.error("Failed to reload current Lua route")
          })
        })
    })

  // Idle until the workbench Vue Inspector panel connects via GE Lua.
  watch(SysInfo.workbenchFilesPresent, filesPresent => { if (filesPresent) initWorkbenchInspector() }, { immediate: true })

  window.bngVue.controlsStore.setup(globals.$simplemenu)

  // TODO: Create a wrapper function/file that aggregates all of them
  useGameContextStore()

  // Start global UI stores after controls setup so Lua events hydrate long-lived state.
  useTasksStore().start()
  useMessagesStore().start()

  // Recording can start via a global hotkey without the Replay UI ever opening,
  // so this needs to run for the whole session rather than being scoped to a route.
  const routeDataStore = useRouteDataStore()
  const isPauseView = computed(() => {
    const canonicalRouteName = String(routeDataStore.routeName || "")
    const fallbackRouteName = canonicalRouteName || String(router.currentRoute.value.name || "")
    return fallbackRouteName === "pause" || fallbackRouteName.startsWith("pause.")
  })
  useReplayHudMessage(isPauseView)

  window.bngVue.controls = exposeControlsStore()

  window.bngVue.uiNavTracker = useUINavTracker()
  useUiHealth().init()
  lua.ui_uiStateManager.uiReady("vue")

  window.bngUiBootstrap?.resolveVueRunning?.(true)

  // loading screens (entering the game / mode changes)
  watch(() => loadingScreen.active, active => {
    if (active) inGame()
  })

  // mid-game UI reload
  ;(async () => {
    try {
      if (await SysInfo.isInGame()) {
        logger.info("In-game reload detected, holding UI boot until all preloading is done")
        await inGame()
      }
    } catch {}
    markPreloadRequested()
  })()
}

// this function is fired when we're entering the game or already in the game
// it's the best place to have some delayed or mode-specific initialisations
// note: this function will be called on every loading screen or mode change, so you need to guard your things from being fired multiple times
async function inGame() {
  initReadyUpScreen()
  // warm up the runtime SFC views, better keep it last in here
  await runInGamePreloads()
}

function exposeControlsStore() {
  const controlsStore = window.bngVue.controlsStore
  return {
    // core data
    getControllers: () => controlsStore.controllers,
    getPlayers: () => controlsStore.players,
    getCategories: () => controlsStore.categories,
    getCategoriesList: () => controlsStore.categoriesList,

    // methods
    findBindingForAction: controlsStore.findBindingForAction,
    getActionDetails: controlsStore.getActionDetails,
    getBindingDetails: controlsStore.getBindingDetails,
    getAllBindingsForAction: controlsStore.getAllBindingsForAction,
    addNewBinding: controlsStore.addNewBinding,
    updateBinding: controlsStore.updateBinding,
    deleteBinding: controlsStore.deleteBinding,
    deleteBindings: controlsStore.deleteBindings,

    // utility functions
    deviceIcon: controlsStore.deviceIcon,
    isFFBBound: controlsStore.isFFBBound,
    isFFBEnabled: controlsStore.isFFBEnabled,
    isFFBCapable: controlsStore.isFFBCapable,
    isGamepadAvailable: controlsStore.isGamepadAvailable, // should not be used
    captureBinding: controlsStore.captureBinding,
    makeViewerObj: controlsStore.makeViewerObj,

    // dynamic flags
    isControllerAvailable: controlsStore.isControllerAvailable,
    isControllerUsed: controlsStore.isControllerUsed,
    showIfController: controlsStore.showIfController,
    focusIfController: controlsStore.focusIfController,

    // force refresh data from lua
    refreshData: () => lua.extensions.core_input_bindings.notifyUI("Vue exposed controls service needs the data"),
  }
}

window.bngVue = {
  init,
  start,
  inGame,
  isProd: !__BNG_DEV__,
  icons,
  gameBlurrer,
}

// connect to Vue DevTools if running in dev mode
if (import.meta.hot && getFile) {
  getFile("http://localhost:8098/").then(() => {
    import("@vue/devtools").then(({ devtools }) => devtools.connect("http://localhost", 8098))
  }).catch(() => {
    console.info("Vue DevTools are not running, proceeding without them")
  })
}
