import fs from "fs"
import path from "path"

const VIRTUAL_REGISTRY_ID = "bng:options-runtime"
const RESOLVED_VIRTUAL_REGISTRY_ID = `\0${VIRTUAL_REGISTRY_ID}`
const layerNames = ["extensions", "formatters", "conditions"]

const toPosix = pth => pth.replace(/\\/g, "/")

function buildFallbackSource() {
  return [
    "export const optionsRuntimeLayerIniters = {",
    ...layerNames.map(name => `  ${name}: [],`),
    "}",
    "",
  ].join("\n")
}

function buildRegistrySource(runtimeRoot, includeDev) {
  const imports = []
  const entries = []

  for (const layerName of layerNames) {
    const initers = []
    const mainAbs = path.resolve(runtimeRoot, `${layerName}.js`)
    const devAbs = path.resolve(runtimeRoot, `${layerName}.dev.js`)

    if (fs.existsSync(mainAbs)) {
      const importName = `Layer_${layerName}_main`
      imports.push(`import ${importName} from ${JSON.stringify(toPosix(mainAbs))}`)
      initers.push(importName)
    }

    if (includeDev && fs.existsSync(devAbs)) {
      const importName = `Layer_${layerName}_dev`
      imports.push(`import ${importName} from ${JSON.stringify(toPosix(devAbs))}`)
      initers.push(importName)
    }

    entries.push(`  ${layerName}: [${initers.join(", ")}],`)
  }

  return [
    ...imports,
    "",
    "export const optionsRuntimeLayerIniters = {",
    ...entries,
    "}",
    "",
  ].join("\n")
}

function isRuntimeLayerFile(filePath) {
  const fileName = path.basename(filePath)
  return layerNames.some(layerName => fileName === `${layerName}.js` || fileName === `${layerName}.dev.js`)
}

export function optionsRuntimePlugin(isProd) {
  const includeDev = !isProd
  let runtimeRoot = ""
  let registrySource = buildFallbackSource()

  const generate = () => {
    if (!runtimeRoot) {
      registrySource = buildFallbackSource()
      return
    }
    registrySource = buildRegistrySource(runtimeRoot, includeDev)
  }

  const invalidateRegistryModule = server => {
    const mod = server?.moduleGraph.getModuleById(RESOLVED_VIRTUAL_REGISTRY_ID)
    if (mod) {
      server.moduleGraph.invalidateModule(mod)
    }
  }

  const regenerateAndInvalidate = server => {
    generate()
    if (server) {
      invalidateRegistryModule(server)
    }
  }

  return {
    name: "bng-options-runtime-registry",
    configResolved(config) {
      runtimeRoot = path.resolve(config.root, "src/modules/options/runtime")
      generate()
    },
    buildStart() {
      generate()
    },
    configureServer(server) {
      const runtimeRootPosix = toPosix(runtimeRoot)
      server.watcher.add(`${runtimeRootPosix}/*.js`)

      const onRuntimeFileAddedOrRemoved = filePath => {
        const file = toPosix(filePath || "")
        if (!file.startsWith(runtimeRootPosix) || !isRuntimeLayerFile(file)) return
        regenerateAndInvalidate(server)
        server.ws.send({ type: "full-reload" })
      }

      server.watcher.on("add", onRuntimeFileAddedOrRemoved)
      server.watcher.on("unlink", onRuntimeFileAddedOrRemoved)
    },
    resolveId(source) {
      if (source === VIRTUAL_REGISTRY_ID) return RESOLVED_VIRTUAL_REGISTRY_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_REGISTRY_ID) return null
      return registrySource
    },
    handleHotUpdate(ctx) {
      if (!ctx?.file) return
      const file = toPosix(ctx.file)
      if (!file.startsWith(toPosix(runtimeRoot)) || !isRuntimeLayerFile(file)) return
      regenerateAndInvalidate(ctx.server)
    },
  }
}
