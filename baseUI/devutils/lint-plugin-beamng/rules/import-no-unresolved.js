const fs = require("fs")
const path = require("path")
const resolver = require("../resolveImport.js")

function stripQuery(specifier) {
  if (typeof specifier !== "string") return specifier
  return specifier.replace(/[?#].*$/, "")
}

function compileIgnorePatterns(ignore = []) {
  return (Array.isArray(ignore) ? ignore : [])
    .filter(pattern => typeof pattern === "string" && pattern.length > 0)
    .map(pattern => new RegExp(pattern))
}

function shouldIgnore(importPath, ignorePatterns) {
  return ignorePatterns.some(pattern => pattern.test(importPath))
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

function getResolverConfig(context) {
  const resolverSettings = context.settings?.["bng-import-resolver"]
  return typeof resolverSettings === "object" ? resolverSettings : {}
}

function getAliasMap(resolverConfig) {
  const aliasConfig = resolverConfig?.alias || resolverConfig
  return Array.isArray(aliasConfig?.map) ? aliasConfig.map : []
}

function getResolverExtensions(resolverConfig) {
  const aliasConfig = resolverConfig?.alias || resolverConfig
  const extensions = aliasConfig?.extensions
  return Array.isArray(extensions) && extensions.length ? extensions : [".js", ".json", ".node"]
}

function resolveRequestedAbsolute(importPath, sourceFile, aliasMap) {
  const normalisedImportPath = stripQuery(importPath)
  const cleanSourceFile = stripQuery(sourceFile)
  const { specifier, mapped } = applyAliasMapping(normalisedImportPath, aliasMap)

  if (specifier.startsWith("/")) {
    return path.resolve(process.cwd(), specifier.slice(1))
  }
  if (mapped && (specifier.startsWith("./") || specifier.startsWith("../"))) {
    return path.resolve(process.cwd(), specifier)
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return path.resolve(path.dirname(cleanSourceFile), specifier)
  }

  return null
}

function hasExplicitExtension(specifier) {
  const cleanSpecifier = stripQuery(specifier)
  const lastSegment = cleanSpecifier.split("/").pop() || ""
  return /\.[^/\\]+$/.test(lastSegment)
}

function existsWithExactCase(targetPath) {
  const absolutePath = path.resolve(targetPath)
  const parsed = path.parse(absolutePath)
  const relativeParts = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean)
  let currentPath = parsed.root

  for (const part of relativeParts) {
    let entries
    try {
      entries = fs.readdirSync(currentPath)
    } catch {
      return false
    }

    if (!entries.includes(part)) return false
    currentPath = path.join(currentPath, part)
  }

  return true
}

function hasCaseMismatchForExtensionless(requestedAbsolutePath, extensions) {
  const parentDir = path.dirname(requestedAbsolutePath)
  const requestedName = path.basename(requestedAbsolutePath)

  // A mismatch in any parent segment should fail case validation.
  if (!existsWithExactCase(parentDir)) return true

  let entries
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true })
  } catch {
    return false
  }

  const exactDir = entries.find(entry => entry.isDirectory() && entry.name === requestedName)
  if (exactDir) return false

  const ciDir = entries.find(entry => entry.isDirectory() && entry.name.toLowerCase() === requestedName.toLowerCase())
  if (ciDir) {
    const indexExists = extensions.some(extension => {
      const indexFile = path.join(parentDir, ciDir.name, `index${extension}`)
      return fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()
    })
    if (indexExists) return true
  }

  const exactFileStem = entries.find(entry => {
    if (!entry.isFile()) return false
    const extension = path.extname(entry.name)
    if (!extensions.includes(extension)) return false
    return path.basename(entry.name, extension) === requestedName
  })
  if (exactFileStem) return false

  const ciFileStem = entries.find(entry => {
    if (!entry.isFile()) return false
    const extension = path.extname(entry.name)
    if (!extensions.includes(extension)) return false
    return path.basename(entry.name, extension).toLowerCase() === requestedName.toLowerCase()
  })

  return !!ciFileStem
}

function isStringLiteralSource(node) {
  return node && node.type === "Literal" && typeof node.value === "string"
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure imports can be resolved with BeamNG resolver",
    },
    schema: [{
      type: "object",
      properties: {
        caseSensitive: { type: "boolean" },
        caseSensitiveStrict: { type: "boolean" },
        ignore: {
          type: "array",
          items: { type: "string" },
        },
      },
      additionalProperties: false,
    }],
  },
  create(context) {
    const options = context.options?.[0] || {}
    const caseSensitive = options.caseSensitive !== false
    const caseSensitiveStrict = !!options.caseSensitiveStrict
    const ignorePatterns = compileIgnorePatterns(options.ignore)
    const resolverConfig = getResolverConfig(context)
    const aliasMap = getAliasMap(resolverConfig)
    const resolverExtensions = getResolverExtensions(resolverConfig)
    const sourceFile = context.filename

    function reportUnresolved(node, importPath) {
      context.report({
        node,
        message: `Unable to resolve path to module "${importPath}"`,
      })
    }

    function reportCasing(node, importPath) {
      context.report({
        node,
        message: `Casing of ${importPath} does not match the underlying filesystem`,
      })
    }

    function checkImportNode(sourceNode) {
      if (!isStringLiteralSource(sourceNode)) return

      const importPath = sourceNode.value
      if (shouldIgnore(importPath, ignorePatterns)) return

      const resolved = resolver.resolve(importPath, sourceFile, resolverConfig)
      if (!resolved || !resolved.found) {
        reportUnresolved(sourceNode, importPath)
        return
      }

      if (!caseSensitive) return

      const requestedAbsolutePath = resolveRequestedAbsolute(importPath, sourceFile, aliasMap)
      if (!requestedAbsolutePath) return

      const skipCwdCheck = !caseSensitiveStrict
        && requestedAbsolutePath.toLowerCase().startsWith(path.resolve(process.cwd()).toLowerCase())
      if (skipCwdCheck) return

      const hasMismatch = hasExplicitExtension(importPath)
        ? !existsWithExactCase(requestedAbsolutePath)
        : hasCaseMismatchForExtensionless(requestedAbsolutePath, resolverExtensions)

      if (hasMismatch) {
        reportCasing(sourceNode, importPath)
      }
    }

    return {
      ImportDeclaration(node) {
        checkImportNode(node.source)
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkImportNode(node.source)
      },
      ExportAllDeclaration(node) {
        if (node.source) checkImportNode(node.source)
      },
      ImportExpression(node) {
        checkImportNode(node.source)
      },
    }
  },
}
