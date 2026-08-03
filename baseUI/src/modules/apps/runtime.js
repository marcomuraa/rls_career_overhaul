// helper runtime for "@/modules/apps" imports
//
// examples:
//   import { tasklist, myApp as MyApp } from "@/modules/apps"
//   import * as UiApps from "@/modules/apps"

import { defineComponent, h, markRaw } from "vue"
import AppHost from "./components/AppHost.vue"

// trick against cyclic import that could hit a TDZ ReferenceError
function getCache() {
  return getCache.cache || (getCache.cache = new Map())
}

/**
 * Returns a lightweight wrapper component for AppHost with requested ui app.
 *
 * @param {string} appName
 * @returns {import("vue").Component}
 */
export function getUiAppComponent(appName) {
  const key = String(appName)
  const cached = getCache().get(key)
  if (cached) return cached
  const safeName = key.replace(/[^a-zA-Z0-9_]/g, "_") || "anon"
  const component = markRaw(defineComponent({
    name: `UiApp_${safeName}`,
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => h(AppHost, {
        ...attrs,
        item: key,
        embedded: true,
      })
    },
  }))
  getCache().set(key, component)
  return component
}

const uiAppsProxy = new Proxy({}, {
  get(_, prop) {
    if (prop === "__esModule") return true
    if (typeof prop !== "string") return undefined
    return getUiAppComponent(prop)
  },
  has(_, prop) {
    return typeof prop === "string"
  },
})

/**
 * Returns a Proxy that mimics a static "@/modules/apps" barrel.
 *
 * @returns {Record<string, import("vue").Component>}
 */
export function getUiApps() {
  return uiAppsProxy
}
