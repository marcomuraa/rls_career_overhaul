<template>
  <div
    :class="{
      'mainmenu-container': true,
      'mainmenu-fadein': firstTime,
    }"
    v-bng-scoped-nav="{ scopeId: 'root', trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS, canDeactivate: canDeactivateScope, canBubbleEvent}"
    v-bng-on-ui-nav:menu="handleMenu"
  >
    <div class="main-view">
      <ModSlot class="mods-top" :name="MODSLOTS.mainmenu.top" />

      <div class="mainmenu-title">
        <Logo />
      </div>

      <router-view
        :first-time="firstTime"
        :addons="addons"
      />

      <div v-if="!viewName" class="bottom-buttons">
        <MenuButtonSimple
          v-if="repoEnabled && !isSimpleMenu"
          sound-class="bng_main_secondary"
          v-bng-route-target="'menu.mods.repository'"
        >
          {{ $tt("ui.mainmenu.repo") }}
          <template #subtext v-if="modCounts.total > 0">&nbsp;({{ modCounts.active }} / {{ modCounts.total }})</template>
        </MenuButtonSimple>
        <MenuButtonSimple
          v-else-if="!isSimpleMenu"
          :accent="modsAfterUpdate ? 'danger' : undefined"
          :icon="modsAfterUpdate ? icons.danger : undefined"
          icon-color="#ff2d00"
          sound-class="bng_main_secondary"
          v-bng-route-target="'menu.mods.local'"
        >
          {{ $tt("ui.mainmenu.mods") }}
          <template #subtext v-if="modCounts.total > 0">&nbsp;({{ modCounts.active }} / {{ modCounts.total }})</template>
        </MenuButtonSimple>
        <MenuButtonSimple
          sound-class="bng_main_secondary"
          v-bng-route-target="'menu.extras'"
        >
          {{ $tt("ui.mainmenu.extras") }}
        </MenuButtonSimple>
        <MenuButtonSimple
          v-if="newOptionsEnabled"
          sound-class="bng_main_secondary"
          v-bng-route-target="'options'"
        >
          {{ $tt("ui.mainmenu.options") }}
        </MenuButtonSimple>
        <MenuButtonSimple
          v-if="!isSimpleMenu"
          accent="red"
          sound-class="bng_main_secondary"
          @click="quitGame()"
        >
          {{ $tt("ui.inputActions.general.quit.title") }}
        </MenuButtonSimple>
        <MenuButtonSimple
          v-if="devEnv.env && !isSimpleMenu"
          :icon="icons.bug"
          sound-class="bng_main_secondary"
          v-bng-route-target="'menu.release-info'"
        >
          Release Info
        </MenuButtonSimple>
        <MenuButtonSimple
          v-if="devEnv.env && !isSimpleMenu"
          :icon="icons.aperture"
          sound-class="bng_main_secondary"
          v-bng-route-target="'menu.uiSounds'"
        >
          UI Sounds
        </MenuButtonSimple>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick, inject, unref } from "vue"
import { useRoute } from "vue-router"
import router from "@/router"
import { ModSlot, MODSLOTS } from "@/common/components/utility"
import { icons } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav, vBngRouteTarget } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"
import { lua } from "@/bridge"
import { runRaw } from "@/bridge/libs/Lua.js"
import { useEvents } from "@/services/events"
import { $translate, SysInfo } from "@/services"
import { showToast } from "@/services/toast"
import Logo from "../components/Logo.vue"
import MenuButtonSimple from "../components/MenuButtonSimple.vue"
import { isShipping, isDev } from "bng:config"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"
import { activateRouteTargetScope } from "@/services/scopedNav/api"

const events = useEvents()
const infoBar = useInfoBar()

const $simplemenu = inject("$simplemenu", ref(window.beamng?.simplemenu === true))
const isSimpleMenu = computed(() => unref($simplemenu))

const newOptionsEnabled = computed(() => router.hasRoute("options")) // devEnv.env &&

const firstTime = ref(SysInfo.mainMenuFirstTime.value)

const parentImageCarousel = inject("mainBackground")

const modCounts = SysInfo.modCounts

const isInGame = computed(() => !!SysInfo.gameState.value)


/// dev thingy

const devEnv = reactive({
  env: !isShipping(),
  vue: isDev(),
  videoApi: null,
  UIEngine: null,
})

/// /dev thingy


/// addons

const addons = ref({})

const MAINMENU_MULTIPLAYER_TARGET_ALIASES = new Set([
  "menu.multiplayer",
  "menu.multiplayerSessions",
])

function normalizeMainmenuRouteTarget(targetState) {
  if (typeof targetState !== "string") return targetState
  if (MAINMENU_MULTIPLAYER_TARGET_ALIASES.has(targetState)) return "menu.multiplayer"
  return targetState
}

function isMainmenuMultiplayerRouteName(routeName) {
  if (typeof routeName !== "string") return false

  return (
    routeName === "menu.multiplayer" ||
    routeName.startsWith("menu.multiplayer") ||
    MAINMENU_MULTIPLAYER_TARGET_ALIASES.has(routeName)
  )
}

const addButton = ({ translateid, icon, targetState, title, iconId, action }) => {
  let newButton
  if (translateid || icon || targetState) {
    // Angular style
    newButton = {
      title: $translate.instant(translateid),
      icon,
      action: normalizeMainmenuRouteTarget(targetState),
    }
  } else {
    // Vue style
    newButton = {
      title,
      iconId,
      action,
    }
  }
  addons.value[newButton.title] = newButton
}

/// /addons


const viewName = ref()
watch(
  () => viewName.value,
  val => {
    !!val && infoBar.flashHints("back")
    parentImageCarousel.value && nextTick(parentImageCarousel.value.carousel.showNext)
  }
)

const route = useRoute()
watch(
  () => route.name,
  name => {
    if (typeof name !== "string") {
      viewName.value = null
      return
    }
    if (name !== "menu" && name !== "menu.others") return
    viewName.value = name === "menu" ? null : name.slice("menu.".length)
  },
  { immediate: true }
)

watch(
  () => [isSimpleMenu.value, route.name],
  ([simpleMenuEnabled, routeName]) => {
    if (!simpleMenuEnabled) return
    if (!isMainmenuMultiplayerRouteName(routeName)) return

    void lua.extensions.ui_router.navigate("menu")
  },
  { immediate: true }
)

/// initial focus readiness
// The `menu` route declares `handlesOwnReady`, so we must report routeMounted
// ourselves only once `MainView` is mounted (and the first-launch fade has
// finished) so the autofocus item can actually be selected.
const MAINMENU_FADE_DURATION_MS = 1500
const MAINMENU_FADE_FALLBACK_BUFFER_MS = 100
// Exposed to the scoped <style> via v-bind so the CSS animation stays in sync with the JS duration.
const mainmenuFadeDuration = `${MAINMENU_FADE_DURATION_MS}ms`

let menuReadyCanonicalRoute = null

function waitForMainViewFadeIn() {
  return new Promise(resolve => {
    const mainView = window.document.querySelector(".mainmenu-fadein .main-view")
    if (!mainView) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      mainView.removeEventListener("animationend", finish)
      resolve()
    }
    // Fallback close to the CSS animation duration in case `animationend` never fires.
    const timeoutId = setTimeout(finish, MAINMENU_FADE_DURATION_MS + MAINMENU_FADE_FALLBACK_BUFFER_MS)
    mainView.addEventListener("animationend", finish)
  })
}

async function signalMenuReady() {
  if (route.name !== "menu") return

  // Wait for child buttons from MainView to be mounted.
  await nextTick()
  if (route.name !== "menu") return

  if (firstTime.value) {
    await waitForMainViewFadeIn()
    if (route.name !== "menu") return
  }

  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || route.name
  // Guard against repeated reactive updates calling routeMounted twice for the same transition.
  if (menuReadyCanonicalRoute === canonicalRoute) return
  menuReadyCanonicalRoute = canonicalRoute

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  if (!result?.success) {
    menuReadyCanonicalRoute = null
    return
  }
  if (window.__luaRouter__) window.__luaRouter__._pendingCanonicalRoute = null
  if (route.name !== "menu") return
  activateRouteTargetScope()
}

watch(
  () => route.name,
  name => {
    if (name === "menu") {
      signalMenuReady()
    } else {
      // Reset the guard so returning to `menu` re-activates the root scope.
      menuReadyCanonicalRoute = null
    }
  },
  { immediate: true }
)

function quitGame() {
  lua.quit()
  runRaw("TorqueScript.eval('quit();')", false)
}

const handleMenu = () => lua.extensions.ui_menuManager.toggleMenu()

const canDeactivateScope = () => !viewName.value
const canBubbleEvent = (event) => {
  if (event.detail.value !== 1) return false

  const eventName = event.detail.name
  return eventName === "tab_l" || eventName === "tab_r" ? !viewName.value : false
}

let angularReady = false
let advertMainMenuToAngular = () => {}

function displayToast(type, title, titleContext, msg, messageContext) {
  showToast({
    id: title,
    type,
    message: $translate.contextTranslate({ txt: msg, context: messageContext}),
    title: $translate.contextTranslate({ txt: title, context: titleContext}),
    persistent: true,
    onClick: () => lua.extensions.ui_router.navigate("menu.extras.performance"),
  })
}

async function checkHardware() {
  lua.checkFSErrors()
  const info = await lua.core_hardwareinfo.getInfo()
  if (info.globalState === "ok") return // all good
  for (const key in info) {
    if (!info[key].warnings || !Array.isArray(info[key].warnings)) continue
    for (const warning of info[key].warnings) {
      if (warning.ack) continue
      displayToast(info.globalState === "warn" ? "warning" : "error",
        "ui.performance.warnings." + warning.msg, warning.context,
        "ui.mainmenu.warningdetails", null,
      )
    }
  }
}

const repoEnabled = ref(false)
const modsAfterUpdate = ref(false)

const onSettingsChanged = (data) => {
  modsAfterUpdate.value = data.values.disableModsAfterUpdate
  repoEnabled.value = data.values.onlineFeatures === "enable" && !data.values.disableModsAfterUpdate
}

onMounted(async () => {
  advertMainMenuToAngular = () => angularReady && window.globalAngularRootScope?.$broadcast?.("MainMenuButtons", addButton)
  function advertMainMenu() {
    events.emit("MainMenuButtons", addButton)
    advertMainMenuToAngular()
  }
  events.on("bngUiBootstrap", data => {
    if (!data || !data.angularRunning) return
    angularReady = true
    advertMainMenuToAngular()
  })
  advertMainMenu()
  events.on("UiModsChanged", advertMainMenu)
  events.on("BroadcastMainMenuButtons", advertMainMenu)
  window.bngUiBootstrap?.sendStatus?.()

  events.on("SettingsChanged", onSettingsChanged)
  lua.settings.notifyUI()
  // setTimeout(() => {
  //   beamng.sendEngineLua("sendUIModules()")
  // }, 3000)

  if (devEnv.env) {
    devEnv.videoApi = await lua.Engine.Render.getAdapterType()
    devEnv.UIEngine = await lua.Engine.UI.getUIEngine()
  }

  if (SysInfo.mainMenuFirstTime.value) {
    checkHardware()
  }

  SysInfo.mainMenuFirstTime.value = false // to save the flag for later
})

onUnmounted(() => {
  events.off("SettingsChanged", onSettingsChanged)
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

$rem: calc-ui-rem();

.mainmenu-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-size: $rem;

  // hide the scoped nav focus frame
  &::before {
    display: none !important;
  }


  .background-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }
  &.mainmenu-with-angular { // note: we're *assuming* that we're visually wrapped with angular
    margin-top: 2.5em;
  }
}

.mainmenu-fadein .main-view {
  animation: fadein v-bind(mainmenuFadeDuration);
  @keyframes fadein {
    0%, 50% { opacity: 0; }
    100% { opacity: 1; }
  }
}

.backgrounds-cache {
  // this must not be display:none; in order to work
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.mainmenu-title {
  margin-bottom: 3em !important;
}

.main-view {
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  width: 100%;
  height: calc(100% - 3em);
}

.bottom-items {
  display: flex;
  flex-direction: row;
  justify-content: center;
  pointer-events: all;
}

.mods-top {
  position: absolute;
  top: 1em;
  left: 1em;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 1em;
  pointer-events: all;
}

.dev-info {
  position: absolute;
  top: 1em;
  left: 1em;
  min-width: 20em;
  color: white;
  pointer-events: all;
  .dev-info-icon {
    font-size: 3em;
  }
  .dev-info-content {
    display: flex;
    align-items: center;
    padding: 5px 10px 10px 10px;
    font-weight: bold;
    font-size: 20px;
    font-family: "Overpass", var(--fnt-defs);
    border-radius: var(--bng-corners-1);
  }
  .dev-info-text {
    padding-left: 0.5em;
    > * {
      display: block;
      margin-bottom: 0.5em;
    }
  }
}

.bottom-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 $rem;
  width: calc-ui-rem(64);
  align-self: center;

  > .menu-button-simple {
    flex: 1 1 calc-ui-rem(14);
    min-width: calc-ui-rem(14);
    max-width: calc-ui-rem(16);
  }
}

</style>
