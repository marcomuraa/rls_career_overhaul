// Embedded single-UI-app entry. Boots a minimal ui-vue runtime (bridge + pinia +
// i18n) and renders one in-game UI app via the real app compiler (AppHost /
// ModComponent), driven by a host window (the workbench panel) over the embed
// bridge. Built into dist/embed.js; the workbench loads dist/embed.html in an
// iframe served by the game. Not the full app: no router/Angular/scoped-nav.

import { createApp, h, ref, reactive } from "vue"
import { createPinia } from "pinia"
import Emitter from "eventemitter3"

import { useBridge, setBridgeDependencies } from "@/bridge"
import { initTranslation } from "@/services/translation"
import logger from "@/services/logger"
import { useModManager } from "@/services/modManager/manager"
import { getUiAppComponent } from "@/modules/apps/runtime"
import { installEmbedBridge, onHostMessage, postToHost } from "./bridge"

import "@/styles/base.scss"

// Served under the game's /vfs mount: rebase ui-vue's absolute "/ui/..." HTTP
// fetches (app SFCs, assets) to where the embed actually lives, derived from our
// own URL (e.g. "/vfs/ui/ui-vue/dist/embed.html" -> base "/vfs").
window.__bngHttpBase = location.pathname.replace(/\/ui\/ui-vue\/dist\/.*$/, "")

// base.scss's @font-face URLs are static "/ui/common/..." (not rebased), so pull
// the font definitions in again with rebased URLs or apps fall back to serif.
async function injectFonts() {
  const base = window.__bngHttpBase || ""
  try {
    const res = await fetch(base + "/ui/ui-vue/src/styles/modules/legacy/_fonts_legacy.scss")
    if (!res.ok) return
    const css = (await res.text()).replace(/url\((['"]?)\s*\/ui\//g, `url($1${base}/ui/`)
    document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }))
  } catch (e) { console.warn("[embed] fonts load failed:", e.message) }
}
injectFonts()

const beamng = installEmbedBridge()
setBridgeDependencies({ Emitter, beamng })
const bridge = useBridge()
window.bridge = bridge
window.vueEventBus = bridge.events // StreamHooks emits inbound events here

const appName = ref(new URLSearchParams(location.search).get("app") || "")
const ready = ref(false)

const Root = {
  setup() {
    return () =>
      ready.value && appName.value ? h(getUiAppComponent(appName.value), { class: "embed-app" }) : null
  },
}

const app = createApp(Root).use(createPinia())
const { i18n, plugin } = initTranslation()
app.use(i18n).use(plugin())

const globals = {
  $console: logger,
  $logger: logger,
  $globalStore: (window.vueGlobalStore = reactive({})),
}
for (const [k, v] of Object.entries(globals)) {
  app.config.globalProperties[k] = v
  app.provide(k, v)
}
app.mount("#embed-app")

const modManager = useModManager()

// The host signals when the game connection is live; only then can lua round-trip
// (catalogue, translations, unit settings, app data).
onHostMessage("connected", async () => {
  bridge.events.emit("onTranslationsReloaded") // (re)load locales now lua is reachable
  await modManager.loadUiApps()
  ready.value = true
  const apps = Object.values(modManager.uiAppList || {})
    .filter(a => a && a.hasAppVue)
    .map(a => a.appName)
    .filter(Boolean)
    .sort()
  postToHost("apps", { apps })
})

onHostMessage("setApp", m => {
  appName.value = m.app || ""
})

postToHost("ready", {})
