import { optionsRuntimePlugin } from "./runtime/vite-plugin.js"
import { validateOptionsLayoutOnBuild } from "./layout/build-validator.js"
import { BUNDLE_LAYOUT } from "./config.js"

const VIRTUAL_LAYOUT_ID = "bng:options-layout"
const RESOLVED_VIRTUAL_LAYOUT_ID = `\0${VIRTUAL_LAYOUT_ID}`

export default function (isProd) {
  const runtimePlugin = optionsRuntimePlugin(isProd)
  let bundledLayoutSource = "export default null"

  return {
    name: "bng-options-plugin",
    configResolved(config) {
      runtimePlugin.configResolved(config)
    },
    buildStart() {
      if (isProd) {
        const layout = validateOptionsLayoutOnBuild()
        if (BUNDLE_LAYOUT) bundledLayoutSource = `export default ${JSON.stringify(layout)}`
      }
      runtimePlugin.buildStart()
    },
    configureServer(server) {
      runtimePlugin.configureServer(server)
    },
    resolveId(source) {
      if (source === VIRTUAL_LAYOUT_ID) return RESOLVED_VIRTUAL_LAYOUT_ID
      return runtimePlugin.resolveId(source)
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_LAYOUT_ID) return bundledLayoutSource
      return runtimePlugin.load(id)
    },
    handleHotUpdate(ctx) {
      runtimePlugin.handleHotUpdate(ctx)
    },
  }
}
