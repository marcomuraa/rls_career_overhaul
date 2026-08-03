// build-time source transforms for the base bundle.
// those three actions keep src/modules OUT of base bundle so it stays on demand:
// - empty the router's modules/*/routes import.meta.glob (loaded on demand at boot instead)
// - rewrite dynamic import("@/modules/...") to loadModule(path)
// - rewrite static default `import X from "@/modules/**/*.vue"` to a deferred async component
//   only default .vue imports (always components) are safe; named/value imports are used synchronously and must be decoupled by hand

import path from "path"
import { ROOT_PATH, MODULES_PATH } from "./config.js"

// rootDir = absolute ui/ui-vue dir. Loader paths are always "/ui/ui-vue/..." with forward slashes.
export function makeBaseTransforms(rootDir) {
  const SRC = path.resolve(rootDir, "src")

  // the route-discovery glob (router/index.js), collapsed to {} -> empty route table. Match the
  // string literal then the options object so we don't stop short on the ')' inside routes(.dev)?.js.
  const ROUTE_GLOB_RE = /import\.meta\.glob\(\s*["'][^"']*modules\/\*\/routes[^"']*["']\s*,\s*\{[^}]*\}\s*\)/g

  // `import Name from "<spec>.vue"` (single default binding -> Name is the component). \r? for CRLF.
  const STATIC_VUE_IMPORT_RE = /^([ \t]*)import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+\.vue)["'];?[ \t]*$/gm

  const toLoaderPath = abs => ROOT_PATH + path.relative(rootDir, abs).replace(/\\/g, "/")

  // fromFile + spec -> loader path. fromFile is a forward-slash absolute path.
  const resolveSpec = (fromFile, spec) => {
    let abs
    if (spec.startsWith("@/")) abs = path.resolve(SRC, spec.slice(2))
    else if (spec.startsWith("/src/") || spec.startsWith("/generated/")) abs = path.resolve(rootDir, spec.slice(1))
    else abs = path.resolve(path.dirname(fromFile), spec)
    return toLoaderPath(abs)
  }

  function emptyRouteGlob(code) {
    if (!code.includes("import.meta.glob") || !code.includes("modules/*/routes")) return code
    return code.replace(ROUTE_GLOB_RE, "{}")
  }

  function lazifyStaticModuleComponents(code, file) {
    if (!code.includes(".vue")) return code
    return code.replace(STATIC_VUE_IMPORT_RE, (full, indent, name, spec) => {
      const lp = resolveSpec(file, spec)
      if (!lp.startsWith(MODULES_PATH)) return full
      return `${indent}const ${name} = window.__rtModules["vue"].defineAsyncComponent(() => window.__bngRuntime.loadModule(${JSON.stringify(lp)}))`
    })
  }

  function rewriteDynamicModuleImports(code, file) {
    if (!code.includes("import(")) return code
    return code.replace(/import\(\s*["']([^"']+)["']\s*\)/g, (full, spec) => {
      if (!/^[@./]/.test(spec)) return full // bare/vendor dynamic import - leave it for vite
      const lp = resolveSpec(file, spec)
      return lp.startsWith(MODULES_PATH)
        ? `window.__bngRuntime.loadModule(${JSON.stringify(lp)})`
        : full
    })
  }

  function transform(code, file) {
    let out = rewriteDynamicModuleImports(code, file)
    out = lazifyStaticModuleComponents(out, file)
    out = emptyRouteGlob(out)
    return out
  }

  return { transform, resolveSpec, rewriteDynamicModuleImports, lazifyStaticModuleComponents, emptyRouteGlob }
}
