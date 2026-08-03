const fs = require("fs")
const path = require("path")
const { builtinModules } = require("module")

exports.interfaceVersion = 2

const builtinSet = new Set(builtinModules)
const defaultExtensions = [".js", ".json", ".node"]

function stripQuery(specifier) {
  if (typeof specifier !== "string") return specifier
  return specifier.replace(/[?#].*$/, "")
}

function hasExplicitExtension(specifier) {
  const lastSegment = specifier.split("/").pop() || ""
  return /\.[^/\\]+$/.test(lastSegment)
}

function getAliasConfig(config = {}) {
  const aliasConfig = config.alias || config
  const extensions = Array.isArray(aliasConfig?.extensions) && aliasConfig.extensions.length
    ? aliasConfig.extensions
    : defaultExtensions

  const map = Array.isArray(aliasConfig?.map) ? aliasConfig.map : []
  return { map, extensions }
}

function resolveFileOrDirectory(basePath, extensions) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath

  for (const extension of extensions) {
    const withExtension = `${basePath}${extension}`
    if (fs.existsSync(withExtension) && fs.statSync(withExtension).isFile()) return withExtension
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const extension of extensions) {
      const asIndex = path.join(basePath, `index${extension}`)
      if (fs.existsSync(asIndex) && fs.statSync(asIndex).isFile()) return asIndex
    }
  }

  return null
}

function isBareModule(specifier) {
  return !specifier.startsWith("/") && !specifier.startsWith("./") && !specifier.startsWith("../")
}

function applyAliasMapping(specifier, aliasMap) {
  for (const entry of aliasMap) {
    if (!Array.isArray(entry) || entry.length < 2) continue
    const [find, replacement] = entry
    if (typeof find !== "string" || typeof replacement !== "string") continue
    const match = specifier.match(new RegExp(`^${find}($|/)`))
    if (!match) continue
    return {
      specifier: specifier.replace(match[0], `${replacement}${match[1]}`),
      mapped: true,
    }
  }

  return { specifier, mapped: false }
}

function toAbsolutePath(specifier, sourceFile, aliasMap) {
  const cleanSourceFile = stripQuery(sourceFile)
  const { specifier: aliasedSpecifier, mapped } = applyAliasMapping(specifier, aliasMap)

  if (aliasedSpecifier.startsWith("/")) {
    return path.resolve(process.cwd(), aliasedSpecifier.slice(1))
  }
  if (mapped && (aliasedSpecifier.startsWith("./") || aliasedSpecifier.startsWith("../"))) {
    return path.resolve(process.cwd(), aliasedSpecifier)
  }
  if (aliasedSpecifier.startsWith("./") || aliasedSpecifier.startsWith("../")) {
    return path.resolve(path.dirname(cleanSourceFile), aliasedSpecifier)
  }
  if (specifier.startsWith("/")) {
    return path.resolve(process.cwd(), specifier.slice(1))
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return path.resolve(path.dirname(cleanSourceFile), specifier)
  }

  return null
}

exports.resolve = (source, sourceFile, config = {}) => {
  const normalisedSource = stripQuery(source)
  const { map, extensions } = getAliasConfig(config)

  // Vite virtual modules are not real filesystem paths.
  if (/^bng:/.test(normalisedSource)) {
    return { found: true, path: null }
  }

  if (builtinSet.has(normalisedSource) || builtinSet.has(normalisedSource.replace(/^node:/, ""))) {
    return { found: true, path: null }
  }

  const absolutePath = toAbsolutePath(normalisedSource, sourceFile, map)
  if (absolutePath) {
    if (hasExplicitExtension(normalisedSource)) {
      if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return { found: false, path: null }
      // Keep requested casing in returned path so import/no-unresolved can verify it.
      return { found: true, path: absolutePath }
    }

    const extensionlessResolved = resolveFileOrDirectory(absolutePath, extensions)
    if (!extensionlessResolved) return { found: false, path: null }
    return { found: true, path: extensionlessResolved }
  }

  if (isBareModule(normalisedSource)) {
    try {
      const cleanSourceFile = stripQuery(sourceFile)
      const resolvedModule = require.resolve(normalisedSource, { paths: [path.dirname(cleanSourceFile), process.cwd()] })
      return { found: true, path: resolvedModule }
    } catch {
      return { found: false, path: null }
    }
  }

  return { found: false, path: null }
}
