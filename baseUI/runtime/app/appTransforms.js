// Fetch-time source transforms standing in for the vite plugins the runtime bypasses
// (raw src is compiled, so build-time rewrites never ran)

import { RT_DEV, BUNDLE_EXCLUDE } from "../config.js"

const DEV_ONLY = [
  /(\/\/\s*?DEV_ONLY\s*?>>[.\s\S]*?\/\/\s*?<<\s*?(END_)?DEV_ONLY)/gm,
  /(<!--\s*?DEV_ONLY\s*?>>\s*?-->[.\s\S]*?<!--\s*?<<\s*?(END_)?DEV_ONLY\s*?-->)/gm,
  /(\/\*\s*?DEV_ONLY\s*?>>\s*?\*\/[.\s\S]*?\/\*\s*?<<\s*?(END_)?DEV_ONLY\s*?\*\/)/gm,
]

// The app's one import.meta.glob (route discovery) -> {} so route modules load on demand (the
// loader fetches each routes.js at boot). Regex, not literal: vite already rewrote the glob string.
const ROUTE_GLOB_RE = /import\.meta\.glob\(\s*["'][^"']*modules\/\*\/routes[^"']*["']\s*,\s*\{[^}]*\}\s*\)/

function emptyRouteGlob(code) {
  if (!code.includes("import.meta.glob") || !code.includes("modules/*/routes")) return code
  return code.replace(ROUTE_GLOB_RE, "{}")
}

// Rewrite a route's static .vue view imports into lazy components so each view compiles only when
// navigated to, not eagerly at boot.
const LAZY_ROUTES = true
const isRouteModule = path => /\/modules\/[^/]+\/routes(\.dev)?\.js$/.test(path || "")

// Routes must import view files directly; a barrel (extensionless src/modules import) would pull its
// whole subtree in eagerly. Barrels into bundled code (@/common, ...) hit the base registry, so fine.
const ROUTE_FILE_EXT_RE = /\.(vue|m?js|cjs|ts|json|scss|css)$/i

// resolve a project spec to a loader path, to tell on-demand from bundled targets
function resolveRouteSpec(fromFile, spec) {
  let p
  if (spec.startsWith("@/")) p = "/ui/ui-vue/src/" + spec.slice(2)
  else if (spec.startsWith(".")) p = fromFile.slice(0, fromFile.lastIndexOf("/")) + "/" + spec
  else return null // bare/vendor
  const parts = []
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue
    if (seg === "..") parts.pop()
    else parts.push(seg)
  }
  return "/" + parts.join("/")
}

const isOnDemandPath = p => p != null && BUNDLE_EXCLUDE.some(prefix => p.startsWith(prefix))

function warnRouteBarrels(code, path) {
  // strip comments so commented-out imports don't false-positive
  const src = code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
  const re = /\bfrom\s+["']([^"']+)["']/g
  const barrels = []
  let m
  while ((m = re.exec(src))) {
    const spec = m[1]
    if (ROUTE_FILE_EXT_RE.test(spec)) continue // direct file import
    if (isOnDemandPath(resolveRouteSpec(path, spec))) barrels.push(spec) // barrel into src/modules
  }
  if (barrels.length) {
    console.warn(`[runtime-sfc] ${path}: routes should not use barrel imports - import view files directly so routes can be lazy-loaded. Offending: ${barrels.join(", ")}`)
  }
}

// import.meta stand-in: dev gets a no-op hot stub + DEV env; prod disables hot so dev-only branches never run
const IMPORT_META = RT_DEV
  ? '({ hot: { accept(){}, dispose(){}, prune(){}, invalidate(){}, decline(){}, on(){}, off(){}, send(){}, data: {} }, env: { DEV: true, PROD: false, MODE: "development", SSR: false }, url: "" })'
  : '({ hot: false, env: { DEV: false, PROD: true, MODE: "production", SSR: false }, url: "" })'

const BNG_DEV_RE = new RegExp("__BNG" + "_DEV__", "g")
const BNG_RT_RE = new RegExp("__BNG" + "_RT__", "g")
const VUE_IMPORT_RE = /^[ \t]*import\s+(\w+)\s+from\s+["']([^"']+\.vue)["'];?[ \t]*\r?$/gm
const UI_APPS_IMPORT_RE = /^[ \t]*import\s+(\*\s+as\s+\w+|\{[^{}]*\})\s+from\s+["']@\/modules\/apps(?:\/|\/index(?:\.js)?)?["']\s*;?/gm

// rewrites `import { x } from "@/modules/apps"` into getUiAppComponent() calls
function rewriteUiAppsImports(code) {
  if (!code.includes("@/modules/apps")) return code

  let needsGetUiApps = false
  let needsGetUiAppComponent = false

  const out = code.replace(UI_APPS_IMPORT_RE, (full, clauseRaw) => {
    const clause = clauseRaw.trim()

    const nsMatch = /^\*\s+as\s+(\w+)$/.exec(clause)
    if (nsMatch) {
      needsGetUiApps = true
      return `const ${nsMatch[1]} = __bngGetUiApps();`
    }

    const namedMatch = /^\{([^{}]*)\}$/.exec(clause)
    if (namedMatch) {
      needsGetUiAppComponent = true
      return namedMatch[1]
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .map(part => {
          const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(part)
          const orig = asMatch ? asMatch[1] : part
          const local = asMatch ? asMatch[2] : part
          return `const ${local} = __bngGetUiAppComponent(${JSON.stringify(orig)});`
        })
        .join("\n")
    }

    return full
  })

  if (out === code) return code

  const parts = []
  if (needsGetUiApps) parts.push("getUiApps as __bngGetUiApps")
  if (needsGetUiAppComponent) parts.push("getUiAppComponent as __bngGetUiAppComponent")
  const injection = `import { ${parts.join(", ")} } from "@/modules/apps/runtime";`

  const scriptTag = out.match(/(<script\b[^>]*\bsetup\b[^>]*>)/i) || out.match(/(<script\b[^>]*>)/i)
  if (scriptTag) return out.replace(scriptTag[0], scriptTag[0] + "\n" + injection)
  return injection + "\n" + out
}

function lazifyRoutes(code) {
  const imported = []
  let m
  while ((m = VUE_IMPORT_RE.exec(code))) imported.push({ id: m[1], spec: m[2] })
  if (!imported.length) return code
  // strip imports/comments/strings before counting usages so a name in a comment/string
  // can't inflate the count and wrongly keep a view eager
  const body = code
    .replace(VUE_IMPORT_RE, "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
  for (const { id, spec } of imported) {
    const asComponent = new RegExp(`\\bcomponent:\\s*${id}\\b`, "g")
    const compCount = (body.match(asComponent) || []).length
    // only lazify a view used solely as a route component
    // any other reference means dropping the import would break it
    const total = (body.match(new RegExp(`\\b${id}\\b`, "g")) || []).length
    if (compCount === 0 || total !== compCount) continue
    code = code.replace(new RegExp(`^[ \\t]*import\\s+${id}\\s+from\\s+["'][^"']+\\.vue["'];?[ \\t]*\\r?$`, "m"), "")
    // lazyView -> () => loadModule thunk tagged with .preloadPath for the route preloader
    code = code.replace(asComponent, `component: window.__bngRuntime.lazyView(__filename, ${JSON.stringify(spec)})`)
  }
  return code
}

export function transformSource(code, path) {
  if (!RT_DEV) for (const rgx of DEV_ONLY) code = code.replace(rgx, "")
  code = emptyRouteGlob(code)
  code = rewriteUiAppsImports(code)
  if (LAZY_ROUTES && isRouteModule(path)) {
    warnRouteBarrels(code, path)
    code = lazifyRoutes(code)
  }
  code = code.replace(BNG_DEV_RE, RT_DEV ? "true" : "false")
  code = code.replace(BNG_RT_RE, "true")
  // remaining import.meta.* (hot guards, env) -> the dev/prod stand-in
  code = code.replace(/import\.meta\b/g, IMPORT_META)
  return code
}

export function rawModule(text) {
  return `export default ${JSON.stringify(text)}`
}
