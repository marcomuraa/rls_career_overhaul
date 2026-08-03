// virtual `bng:` module emulation
// those are generated here so their real files will be loaded on-demand
// emulates the prod build (no .dev layers), matching __BNG_DEV__=false / DEV_ONLY stripping elsewhere.
// note: `bng:config` is pre-bundled into the runtime (registered in the module cache)

import { SRC_PATH } from "../config.js"

export function virtualSource(id) {
  const optionsRuntimeRoot = SRC_PATH + "/modules/options/runtime"
  const optionsLayoutRoot = SRC_PATH + "/common/modules/options/layout"

  if (id === "bng:options-layout") {
    // prod build might bundle normalised layout.json (BUNDLE_LAYOUT=true, !SHIPPING)
    return [
      `import main from "${optionsRuntimeRoot}/layout.json"`,
      `import devData from "${optionsRuntimeRoot}/layout.dev.json"`,
      `import { mergeDevLayoutItems } from "${optionsLayoutRoot}/layout-core.js"`,
      `export default { ...main, items: mergeDevLayoutItems(main.items, devData) }`,
    ].join("\n")
  }

  if (id === "bng:options-runtime") {
    const layers = ["extensions", "formatters", "conditions"]
    const imports = layers.map(n => `import Layer_${n} from "${optionsRuntimeRoot}/${n}.js"`)
    const entries = layers.map(n => `  ${n}: [Layer_${n}],`)
    return `${imports.join("\n")}\nexport const optionsRuntimeLayerIniters = {\n${entries.join("\n")}\n}\n`
  }

  return null
}
