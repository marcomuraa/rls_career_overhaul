import { createApp, h } from "vue"
import { getActivePinia } from "pinia"
import AppHost from "@/modules/apps/components/AppHost.vue"

let nextTestId = 9000

function getNextId() {
  return String(nextTestId++)
}

export function getAppList() {
  const available = window.UIAppStorage?.availableApps
  if (!available) return []

  return Object.entries(available)
    .map(([key, data]) => ({
      appName: data.appName || key,
      directive: data.directive,
      domElement: data.domElement,
      jsSource: data.jsSource,
      // ui_uiMods.getUiApps() exposes hasAppVue/hasAppJs, not the legacy `vue` flag.
      // Keep legacy fallback for compatibility with older payloads.
      isVue: data.hasAppVue === true || data.vue === true,
      name: data.name || key,
    }))
    .sort((a, b) => a.appName.localeCompare(b.appName))
}

export async function spawnApp(appData, hostElement) {
  const testId = getNextId()
  const target = document.createElement("div")
  target.id = `bng-app-test_${appData.directive || appData.appName}_${testId}`
  target.style.cssText = "width:100%;height:100%;"
  hostElement.appendChild(target)

  // Render an isolated mini Vue app whose root is AppHost. We share the active
  // pinia so AppHost can resolve the app via the modManager store.
  const app = createApp({
    name: "AppHostTestRoot",
    render: () => h(AppHost, { item: appData.appName, embedded: true }),
  })
  const pinia = getActivePinia()
  if (pinia) app.use(pinia)
  app.mount(target)

  // Let Vue flush the initial render before returning.
  await new Promise(r => requestAnimationFrame(r))

  return {
    appName: appData.appName,
    directive: appData.directive,
    testId,
    targetElement: target,
    destroy() {
      app.unmount()
      if (target.parentNode) target.parentNode.removeChild(target)
    },
  }
}

export function destroyApp(handle) {
  if (handle && typeof handle.destroy === "function") {
    handle.destroy()
  }
}
