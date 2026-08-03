import { defineConfig } from "vite"
import path from "path"
import fs from "fs"
import vue from "@vitejs/plugin-vue"
import envCompatible from "vite-plugin-env-compatible"
import { viteCommonjs } from "@originjs/vite-plugin-commonjs"
import { setAutoExportHelpers, autoExport, modCompilerImports } from "./vite-auto-export.js"
import optionsPlugin from "./src/common/modules/options/vite-plugin.js"
import { makeBaseTransforms } from "./runtime/baseTransforms.js"
import { RT_HMR_IN_PROD } from "./runtime/config.js"
import { visualizer } from "rollup-plugin-visualizer" // uncomment visualizer() in plugins below

let isProd = true

// vendor deps the runtime bundle already provides on window.__rtModules
// this is needed because a second vue/pinia/router might break reactivity, stores and routing
const BASE_VENDOR_EXTERNALS = [
  "vue", "vue/dist/vue.esm-bundler.js", "vue-router", "@vue/compiler-dom", "sass", "meriyah",
  "pinia", "petite-vue-i18n", "@floating-ui/vue", "@popperjs/core", "eventemitter3", "json5", "yaml",
]

const GAMEFILE_DIRS = [
  "/locales/",
  "/ui/",
  "/gameplay/",
  "/levels/",
]
const GAMEFILE_FILES = [
  "/licenses.txt",
]
const GAMEFILE_RGX = /^\/((locales|ui|gameplay|levels)\/|licenses\.txt$)/

const genPath = path.resolve(__dirname, "generated")
function resolvePath(filePath = undefined) {
  return filePath ? path.resolve(genPath, filePath) : genPath
}
function writeFile(filePath, content) {
  filePath = resolvePath(filePath)
  const dirPath = path.dirname(filePath)
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
  fs.writeFileSync(filePath, content)
}

function serveGameFiles() {
  function register(server) {
    server.middlewares.use((req, res, next) => {
      let filePath = decodeURI(req.url)
      // reject unknown
      if (!filePath || !GAMEFILE_DIRS.some(path => filePath.startsWith(path)) && !GAMEFILE_FILES.some(file => filePath === file)) return next()
      filePath = path.resolve(__dirname, "../.." + filePath)
      // reject non-existent
      if (!fs.existsSync(filePath)) return next()
      // add CORS headers
      res.setHeader("Access-Control-Allow-Origin", "local://local")
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
      res.setHeader("Access-Control-Allow-Credentials", "true")
      // return file contents
      res.writeHead(200)
      fs.createReadStream(filePath).pipe(res)
    })
  }
  return {
    name: "serve-game-files",
    configureServer: register,
    configurePreviewServer: register,
  }
}

function replaceCode(replacements) {
  replacements = replacements.map(r => {
    const func = isProd ?
      "toProd" in r ? r.toProd : r :
      "toDev" in r ? r.toDev : r
    return typeof func === "function" ? func : code => code.replace(r.from, func)
  })
  return {
    name: "replace-code",
    enforce: "pre",
    transform(code) {
      let out = replacements.reduce((code, replacement) => replacement(code), code)
      return out === code ? null : { code: out, map: null }
    },
    transformIndexHtml(html) {
      return replacements.reduce((html, replacement) => replacement(html), html)
    },
  }
}

function bngAppsImportRules() {
  return {
    name: "bng-uiapp-import-rules",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null
      const resolution = await this.resolve(source, importer, { skipSelf: true, ...options })
      if (!resolution) return null
      const appsPrefix = "/src/modules/apps/"
      const ignoreDirs = ["components", "views"]
      const posixId = resolution.id.replace(/\\/g, "/")
      const cleanId = posixId.split("?")[0] // for queries like ?raw
      const idx = cleanId.indexOf(appsPrefix)
      if (idx === -1) return null
      const parts = cleanId.substring(idx + appsPrefix.length).split("/")
      if (parts.length <= 1) return null
      const dir = parts[0]
      if (ignoreDirs.includes(dir)) return null
      const posixImporter = importer.replace(/\\/g, "/")
      if (posixImporter.endsWith("/src/modules/uiAppsTests/mockDataLoader.js") && cleanId.endsWith(".json")) {
        // allow json mock data loader
        return null
      }
      throw new Error(
        `Unexpected import from UI app directory: ${cleanId.substring(idx)}\n` +
        `Imported by: ${importer}\n` +
        "UI apps should not be imported statically. Use this instead:\n" +
        'import { getUiAppComponent } from "@/modules/apps/runtime";\n' +
        'const myApp = getUiAppComponent("myApp");'
      )
    }
  }
}

// rewrites static imports from "@/modules/apps" into ui mod system calls.
//
//   import { tasklist, myApp as MyApp } from "@/modules/apps"
// becomes:
//   import { getUiAppComponent as __bngGetUiAppComponent } from "@/modules/apps/runtime";
//   const tasklist = __bngGetUiAppComponent("tasklist");
//   const MyApp = __bngGetUiAppComponent("myApp");
//
//   import * as UiApps from "@/modules/apps"
// becomes:
//   import { getUiApps as __bngGetUiApps } from "@/modules/apps/runtime";
//   const UiApps = __bngGetUiApps();
function uiAppsImports() {
  const importRegex = /^[ \t]*import\s+(\*\s+as\s+\w+|\{[^{}]*\})\s+from\s+["']@\/modules\/apps(?:\/|\/index(?:\.js)?)?["']\s*;?/gm
  return {
    name: "bng-ui-apps-imports",
    enforce: "post",
    transform(code, id) {
      if (id.includes("/modules/apps/runtime")) return null
      if (!code.includes("@/modules/apps")) return null

      let needsGetUiApps = false
      let needsGetUiAppComponent = false

      const out = code.replace(importRegex, (full, clauseRaw) => {
        const clause = clauseRaw.trim()

        // namespace import: * as Name
        const nsMatch = /^\*\s+as\s+(\w+)$/.exec(clause)
        if (nsMatch) {
          needsGetUiApps = true
          return `const ${nsMatch[1]} = __bngGetUiApps();`
        }

        // named imports: { a, b as c, ... }
        const namedMatch = /^\{([^{}]*)\}$/.exec(clause)
        if (namedMatch) {
          needsGetUiAppComponent = true
          const parts = namedMatch[1]
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
          const lines = parts.map(part => {
            const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(part)
            const orig = asMatch ? asMatch[1] : part
            const local = asMatch ? asMatch[2] : part
            return `const ${local} = __bngGetUiAppComponent(${JSON.stringify(orig)});`
          })
          return lines.join("\n")
        }

        // unknown shape
        return full
      })

      if (out === code) return null

      const parts = []
      if (needsGetUiApps) parts.push("getUiApps as __bngGetUiApps")
      if (needsGetUiAppComponent) parts.push("getUiAppComponent as __bngGetUiAppComponent")
      const injected = `import { ${parts.join(", ")} } from "@/modules/apps/runtime";\n`

      return { code: injected + out, map: null }
    },
  }
}

function luaFunctionSignatures() {
  function mergeSignatures() {
    const rootPath = __dirname
    const srcPath = path.resolve(__dirname, "src", "bridge", "LuaFunctionSignatures.js")
    const devPath = path.resolve(__dirname, "src", "bridge", "LuaFunctionSignatures.dev.js")

    const srcRelPath = "/" + path.relative(rootPath, srcPath).replace(/\\/g, "/")
    const devRelPath = "/" + path.relative(rootPath, devPath).replace(/\\/g, "/")

    if (isProd || !fs.existsSync(devPath)) return `export { default } from "${srcRelPath}"`

    return [
      `import base from "${srcRelPath}"`,
      `import dev from "${devRelPath}"`,
      "",
      "const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v)",
      "",
      "function deepMerge(a, b) {",
      "  if (b == null) return a",
      "  if (Array.isArray(a) && Array.isArray(b)) return b.slice()",
      "  if (isPlainObject(a) && isPlainObject(b)) {",
      "    const out = { ...a }",
      "    for (const [k, v] of Object.entries(b)) {",
      "      out[k] = Object.prototype.hasOwnProperty.call(a, k) ? deepMerge(a[k], v) : v",
      "    }",
      "    return out",
      "  }",
      "  return b",
      "}",
      "",
      "export default deepMerge(base, dev)",
      "",
    ].join("\n")
  }

  return {
    name: "bng-lua-function-signatures",
    enforce: "pre",
    resolveId(source, importer) {
      // module name to hijack
      if (source !== "../LuaFunctionSignatures.js") return null

      // only hijack that exact import from Lua.js
      if (!importer) return null
      const imp = importer.split("\\").join("/")
      if (!imp.endsWith("/ui/ui-vue/src/bridge/libs/Lua.js") && !imp.endsWith("/src/bridge/libs/Lua.js")) return null

      return "\0bng:lua-function-signatures"
    },
    load(id) {
      if (id !== "\0bng:lua-function-signatures") return null
      return mergeSignatures()
    },
  }
}

function baseBuildPlugin() {
  const ct = makeBaseTransforms(fs.realpathSync(__dirname))
  return {
    name: "bng-base-build",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0].replace(/\\/g, "/")
      if (!file.includes("/ui-vue/src/") && !file.includes("/ui-vue/generated/")) return null
      const out = ct.transform(code, file)
      return out === code ? null : { code: out, map: null }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // isDev = command === "serve"
  isProd = command === "build"
  // `vite build --mode embed` builds just the workbench embed entry (embed.html ->
  // dist/embed.js) with a relative base so it serves from the game over HTTP.
  const isEmbed = mode === "embed"
  // `vite build --mode runtime` builds just the runtime SFC bootstrap (runtime/bootstrap.js
  // -> dist/runtime.js): vendor deps + the SFC loader, which then loads src/* on demand.
  // `--mode runtimedev` builds the same into dist/runtime.dev.js but with the DEV Vue build
  // (so __VUE_HMR_RUNTIME__ exists) and the SFC compiler in non-prod mode, enabling per-file
  // .vue hot reload instead of a full page reload. The RT panel toggles between the two.
  const isRuntimeDev = mode === "runtimedev"
  const isRuntime = mode === "runtime" || isRuntimeDev
  const runtimeHmr = isRuntimeDev || (isRuntime && RT_HMR_IN_PROD)
  // `vite build --mode base` builds the compiled "base" bundle (runtime/baseBundle.js ->
  // dist/base.js): everything under src + generated EXCEPT src/modules, which the runtime loader
  // fetches on demand. Loaded alongside dist/runtime.js, sharing its vendor instances.
  const isBase = mode === "base"
  // the legacy monolithic SPA build (no special mode): one self-contained index.js
  const isFull = !isEmbed && !isRuntime && !isBase
  // label used for the bundle visualiser output (stats-full.html, stats-runtime.html, stats-embed.html)
  const buildLabel = isEmbed ? "embed" :
    isRuntimeDev ? "runtimedev" :
    isRuntime ? "runtime" :
    isBase ? "base" : "full"

  setAutoExportHelpers(resolvePath, writeFile, isProd)

  return {
    root: fs.realpathSync(__dirname),
    publicDir: false,

    ...(isProd && { base: (isEmbed || isRuntime || isBase) ? "./" : "/local/ui/ui-vue/" }),

    define: {
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      __BNG_DEV__: JSON.stringify(!isProd || isRuntimeDev),
      __BNG_RT__: JSON.stringify(isRuntime || isBase),
      __BNG_RT_DEV__: JSON.stringify(isRuntimeDev), // HMR-enabled build
      // force the DEV Vue build for the HMR runtime variant, otherwise `vite build` pins NODE_ENV=production and Vue strips __VUE_HMR_RUNTIME__
      ...(runtimeHmr && { "process.env.NODE_ENV": JSON.stringify("development") }),
    },

    resolve: {
      alias: [
        {
          find: /^~/,
          replacement: "",
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "src"),
        },
        ...(isRuntime ? [
          // shim to make "path" import work in (@vue/compiler-sfc, sass)
          { find: /^(node:)?path$/, replacement: path.resolve(__dirname, "runtime/path-shim.js") },
        ] : []),
      ],
      extensions: [".mjs", ".cjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },

    plugins: [
      // ...(isProd ? [visualizer({ filename: `stats-${buildLabel}.html` })] : []),
      serveGameFiles(),
      {
        name: "bng-config",
        enforce: "pre",
        resolveId(source) {
          if (source === "bng:config") return "\0bng:config"
          return null
        },
        load(id) {
          if (id !== "\0bng:config") return null
          const src = fs.readFileSync(path.resolve(__dirname, "config.js"), "utf8")
          return src.replaceAll("__BNG_DEV__", JSON.stringify(!isProd))
        },
      },
      replaceCode([
        // JS - DEV_ONLY
        {
          from: /(\/\/\s*?DEV_ONLY\s*?>>[.\s\S]*?\/\/\s*?<<\s*?(END_)?DEV_ONLY)/gm,
          toProd: "",
          toDev: "$1",
        },
        // HTML - DEV_ONLY
        {
          from: /(<!--\s*?DEV_ONLY\s*?>>\s*?-->[.\s\S]*?<!--\s*?<<\s*?(END_)?DEV_ONLY\s*?-->)/gm,
          toProd: "",
          toDev: "$1",
        },
        // CSS - DEV_ONLY
        {
          from: /(\/\*\s*?DEV_ONLY\s*?>>\s*?\*\/[.\s\S]*?\/\*\s*?<<\s*?(END_)?DEV_ONLY\s*?\*\/)/gm,
          toProd: "",
          toDev: "$1",
        },
        // modules glob
        code => {
          const str = "@/modules/*/routes(.dev)?.js" // path as specified in the router index.js
          const glob = isProd ? "@/modules/*/routes.js" : "@/modules/*/routes(.dev)?.js"
          return code.replaceAll(str, glob)
        },
      ]),
      // base bundle: rewrite route views + dynamic module imports to on-demand loader calls
      ...(isBase ? [baseBuildPlugin()] : []),
      // app-bundling plugins, irrelevant to the vendor-only runtime bundle
      ...(isRuntime ? [] : [
        // bngSomeThing.vue > BngSomeThing
        autoExport("components-base", "common/components/base", /^bng([a-z\d]+)\.vue$/i, "Bng$1"),
        // bngSomeThing.vue in appsUtilities > BngSomeThing
        autoExport("components-appsUtilities", "common/components/appsUtilities", /^bng([a-z\d]+)\.vue$/i, "Bng$1"),
        // someThing.vue > SomeThing
        autoExport("components-utility", "common/components/utility", /^([a-z])([a-z\d]+)\.vue$/i, (_, n, ame) => n.toUpperCase() + ame),
        // BngSomeThing.js > vBngSomeThing
        autoExport("components-directives", "common/directives", /^Bng([a-z\d]+)\.(?:js|vue)$/i, "vBng$1"),
        // someThing.vue > SomeThing
        autoExport("components-layouts", "common/layouts", /^([a-z])([a-z\d]+)\.vue$/i, (_, n, ame) => n.toUpperCase() + ame),
        optionsPlugin(isProd),
        bngAppsImportRules(),
        modCompilerImports(),
        uiAppsImports(),
      ]),
      luaFunctionSignatures(),
      vue(),
      viteCommonjs(),
      envCompatible(),
    ],

    server: {
      strictPort: false,
      port: 9000,
      host: "localhost",
      https: false,
      cors: {
        origin: ["local://local", "http://localhost:8084", "http://localhost:9000"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
      },
      hmr: {
        host: "localhost",
        port: 9000,
      },
      watch: {
        // layout.json gets reloaded the other way when using HMR, and not ignoring it cause unwanted reloads
        ignored: ["**/options/runtime/layout.json", "**/options/runtime/layout.dev.json"],
      },
      // this thing allows unobstructed browser access to files
      proxy: [...GAMEFILE_DIRS, ...GAMEFILE_FILES].reduce((res, path) => ({
        ...res, [path]: { changeOrigin: true }
      }), {}),
    },

    build: {
      target: "esnext",
      sourcemap: true,
      cssMinify: "lightningcss",
      // The embed/runtime/base builds add their file to the existing dist without wiping index.js.
      ...((isEmbed || isRuntime || isBase) && { emptyOutDir: false }),
      // base ships a single css file (base.css) loaded next to base.js; no per-chunk splitting.
      ...(isBase && { cssCodeSplit: false }),
      // cssCodeSplit: false,
      rollupOptions: {
        input:
          isFull ? { index: path.resolve(__dirname, "src/main.js") } :
          path.resolve(__dirname, isEmbed ? "embed.html" : isRuntime ? "runtime/runtimeBundle.js" : isBase ? "runtime/baseBundle.js" : "<unknown>.js"),
        checks: {
          pluginTimings: false,
        },
        output: {
          codeSplitting: false,
          entryFileNames: isRuntimeDev ? `runtime.dev.js` : isRuntime ? `runtime.js` : isBase ? `base.js` : `[name].js`,
          chunkFileNames: `[name].js`,
          // deterministic base.css the page can <link>; other assets go under base-assets/.
          assetFileNames: isBase
            ? (info => ((info.names ? info.names[0] : info.name) || "").endsWith(".css") ? "base.css" : "base-assets/[name].[ext]")
            : `[name].[ext]`,
          // base is a self-contained IIFE that reads shared vendors off window.__rtModules.
          ...(isBase && {
            format: "iife",
            name: "bngBaseBundle",
            globals: id => `window.__rtModules[${JSON.stringify(id)}]`,
          }),
        },
        onwarn(warning, warn) {
          if (warning.code === "EVAL") return
          // in base, bare `import.meta` (`import.meta.hot` guards) replaced with {} -> hot === undefined
          if (isBase && warning.code === "EMPTY_IMPORT_META") return
          warn(warning)
        },
        external: isBase
          ? [GAMEFILE_RGX, ...BASE_VENDOR_EXTERNALS]
          : isRuntime && !isRuntimeDev
            ? [GAMEFILE_RGX, /^highlight\.js(\/|$)/] // keep RT_DEV-only highlight.js out by marking it external
            : [GAMEFILE_RGX],
      },
      chunkSizeWarningLimit: 100 * 1024, // in KB
    },
  }
})
