import { parseModule } from "meriyah"
import * as vueExports from "vue"
import { useRoute, useRouter } from "vue-router"
import { icons, ACCENTS, LIST_LAYOUTS } from "@/common/components/base"
const EmbeddedAppHost = vueExports.defineAsyncComponent(() => import("@/modules/apps/components/AppHost.vue")) // avoiding a circular dependency
import * as bngConfig from "bng:config"
import Logger from "@/services/logger"
import { buildCompileError } from "./script-debug.js"

const scriptParseOptions = {
  next: true,
  module: true,
  ranges: true,
  loc: false,
}

// enable script isolation measures
const isolateScript = false
// note: this is aimed mostly for code safety (to allow safe pollution of the global scopes) and not for real security.
//       to have it secure, we will need either a dedicated JSVM (wasm) or complicated iframe sandboxing.
//       either way, mods always have a way to mess with UI through Lua.

function flattenBngUiMod(subimports) {
  if (!subimports) return
  for (const url of Object.keys(subimports)) {
    const mod = subimports[url]
    if (!mod || typeof mod !== "object") continue
    const bng = mod.__bngUiMod
    if (!bng || typeof bng !== "object") continue
    subimports[url] = {
      ...mod,
      ...(bng.components || {}),
      ...(bng.directives || {}),
      ...(bng.others || {}),
    }
  }
}

const uiAppComponentCache = {}

function getUiAppHostComponent(appName) {
  if (uiAppComponentCache[appName]) return uiAppComponentCache[appName]
  uiAppComponentCache[appName] = vueExports.markRaw(vueExports.defineComponent({
    name: `UiAppHost_${String(appName).replace(/[^a-zA-Z0-9_]/g, "_")}`,
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => vueExports.h(EmbeddedAppHost, {
        ...attrs,
        item: appName,
        embedded: true,
      })
    },
  }))
  return uiAppComponentCache[appName]
}

const uiAppsBarrel = new Proxy({}, {
  get(_, prop) {
    if (prop === "__esModule") return true
    if (prop === "__internal") return undefined
    if (typeof prop !== "string") return undefined
    return getUiAppHostComponent(prop)
  },
  has(_, prop) {
    return typeof prop === "string" && prop !== "__internal"
  },
})

// define what could be imported inside the script
const extImports = {
  vue: {
    // ref, reactive, computed, watch, watchEffect, nextTick, onMounted, onUnmounted,
    ...vueExports,
  },
  get "vue-router"() {
    return {
      // __internal: "vue-router",
      useRoute,
      useRouter,
    }
  },
  // this needs to be getter because it has a circular dependency
  get "@/common/components/base"() {
    return {
      __internal: "components",
      icons,
      ACCENTS,
      LIST_LAYOUTS,
    }
  },
  get "@/common/components/utility"() {
    return {
      __internal: "components",
    }
  },
  get "@/common/components/appsUtilities"() {
    return {
      __internal: "components",
    }
  },
  get "@/common/directives"() {
    return {
      __internal: "directives",
    }
  },
  get "@/modules/apps"() {
    return uiAppsBarrel
  },
  get "bng:config"() {
    return { ...bngConfig }
  },
}

// more permanent storage for mods
// it will provide its contents in window object if isolation is turned on
const permaScope = {}
// exposed things to the mod's root scope
const scriptExposes = Object.freeze({
  // game object
  beamng: window.beamng,
  // local storage
  storageRead: (name, val = null) => JSON.parse(localStorage.getItem("mod__" + name) || JSON.stringify(val)),
  storageWrite: (name, val) => localStorage.setItem("mod__" + name, JSON.stringify(val)),
})

let vuePrefixedWarned = false

const isSimpleIdentifier = value => /^[a-z_$][a-zA-Z0-9_$]*$/i.test(String(value || ""))

/**
 * Processes the script element.
 * It applies some (naive) isolation to it in attempt to make it safer.
 * NOTE: The best solution would be to run a JS VM such as "quickjs-emscripten" wasm solution. But at this time this seems unnecessary.
 * @param {HTMLElement} script Script element reference
 * @param {string} dataid Assigned data ID for the component
 * @param {string} path Component file path
 * @param {boolean} mainScript Whether this is the main script or an included script
 * @param {string[]} vueDirectives List of vue directives to be processed
 * @param {string} [sourceUrl] A readable name for stack traces (sourceURL)
 * @param {{name: string, expression: string}[]} [cssVars] CSS variable bindings extracted from the style block
 * @returns {Function} Function compiler that will, in turn, return an object with a list of components and directives, and a prepared function for component setup.
 */
export function procScript(script, dataid, path, mainScript = true, vueDirectives = [], sourceUrl = "", cssVars = []) {
  script = script?.trim()

  if (!script) return () => mainScript ? {
    components: [],
    directives: [],
    props: {},
    emits: [],
    exposes: [],
    includes: {},
    setup: () => {},
  } : {
    includes: {},
    run: () => {},
  }

  return function () {
    const propsReturn = "__props"
    const emitsReturn = "__ctx.emit"
    // const exposeReturn = "{}"
    const defaultReturn = "__default"

    script = script.replace(/\r\n?/gm, "\n")

    const { scriptScope, scriptImports, scriptExternals, scriptExports, defineCalls, edits } = listScriptDefs(
      script,
      path,
      mainScript ? vueDirectives || [] : [],
      {
        default: defaultReturn,
        defineProps: propsReturn,
        defineEmits: emitsReturn,
        defineOptions: "undefined", // in vue it returns nothing
        // defineExpose: exposeReturn,
      }
    )

    // Logger.log({ scriptScope, scriptImports, scriptExternals })

    const props = {}
    const emits = []
    const exposes = []
    const options = {}

    if (mainScript) {
      for (const [name, code] of Object.entries(defineCalls)) {
        if (!code) continue
        try {
          const ret = (new Function(`return ${code}`))()
          switch (name) {
            case "defineProps":
              Object.assign(props, ret)
              break
            case "defineEmits":
              emits.push(...ret)
              break
            case "defineOptions":
              if (ret && typeof ret === "object") Object.assign(options, ret)
              break
            // case "defineExpose":
            //   exposes.push(...Object.keys(ret))
            //   break
          }
        } catch (err) {
          Logger.error(`Failed to parse ${name}`, err)
          Logger.log(code)
        }
      }
    } // /mainScript

    // apply script edits
    edits.sort((a, b) => b.start - a.start)
    for (const edit of edits) {
      script = script.substring(0, edit.start) + (edit.replacement || "") + script.substring(edit.end)
    }

    const scope = { ...scriptExposes}

    if (mainScript) {
      const realdoc = document
      const doc = () => realdoc.querySelector(`[${dataid}]`)
      scope.$ = selector => doc().querySelectorAll(selector)
      if (cssVars.length > 0) {
        scope.__cssVarsUse = vueExports.useCssVars
        scope.__cssVarsUnref = vueExports.unref
      }
      // vue3 compiler macros (not needed actually)
      // scope.defineProps = propsObj => {
      //   Object.assign(props, propsObj)
      //   return props
      // }
      // scope.defineEmits = emitsArr => {
      //   emits.push(...(Array.isArray(emitsArr) ? emitsArr : [emitsArr]))
      //   return (event, ...args) => Logger.log(`[MOD] Emit ${event}`, ...args)
      // }
      // scope.defineExpose = exposeObj => {
      //   exposes.push(...Object.keys(exposeObj))
      // }
      // scope.defineOptions = () => ({})
      // scope.defineSlots = () => ({})
      if (isolateScript) {
        Object.defineProperty(scope, "document", {
          get: function () {
            const document = doc()
            return {
              ...document,
              wireThroughUnitSystem: window.document.wireThroughUnitSystem.bind(window),
            }
          },
        })
        const usefulFunctions = ["requestAnimationFrame", "addEventListener", "removeEventListener", "dispatchEvent"]
        const usefulProperties = ["innerWidth", "innerHeight", "scrollX", "scrollY"]
        for (const func of usefulFunctions) {
          Object.defineProperty(scope, func, {
            get: function () { return window[func].bind(window) },
          })
        }
        for (const prop of usefulProperties) {
          Object.defineProperty(scope, prop, {
            get: function () { return window[prop] },
          })
        }
      }
    } // /mainScript

    if (isolateScript) {
      scope.globalThis = scope
      scope.self = scope
      scope.top = scope
      scope.parent = scope
      scope.console = {
        log: (...args) => console.log("[MOD]", ...args),
        info: (...args) => console.info("[MOD]", ...args),
        warn: (...args) => console.warn("[MOD]", ...args),
        error: (...args) => console.error("[MOD]", ...args),
        debug: (...args) => console.debug("[MOD]", ...args),
        trace: (...args) => console.trace("[MOD]", ...args),
      }
      // scope.window = {
      //   ...scope,
      //   ...permaScope,
      // }
      scope.window = new Proxy({}, {
        get(target, prop) {
          return permaScope[prop] || scope[prop]
        },
        set(target, prop, value) {
          permaScope[prop] = value
          return true
        }
      })
    } // /isolateScript

    const intImp = scriptImports.filter(imp => imp.internal)
    const extImp = scriptImports.filter(imp => !imp.internal)
    const modImp = scriptExternals.filter(imp => imp.mod.js || imp.mod.vueD || imp.mod.app)
    const imports = [...extImp.map(imp => imp.as), ...modImp.map(imp => imp.as)]

    const mainArgs = [propsReturn, "__ctx"]

    // build the script
    let result, debugResult
    {
      // build script parts
      let scopeDefs = ""
      const compilerScope = mainScript ? ["defineExpose"] : []
      if (isolateScript) {
        scopeDefs += Object.keys(window)
          .filter(key => !(key in scope) && !compilerScope.includes(key) && !scriptScope.includes(key) && !imports.includes(key) && !scriptExports.includes(key) && /^[a-z_$][a-zA-Z0-9_$]*$/i.test(key))
          .map(key => `const ${key} = undefined`)
          .join("\n") + "\n"
      }
      scopeDefs += [...extImp, ...modImp]
        .map(imp => `const ${imp.as} = this.__imports["${imp.module.replace(/"/g, "\\\"")}"]${imp.name === "*" ? "" : "." + imp.name}`)
        .join("\n") + "\n"
      scopeDefs += Object.keys(scope)
        .map(key => `const ${key} = this.${key}`)
        .join("\n") + "\n"
      if (mainScript) {
        scopeDefs += "const defineExpose = exposed => { __ctx.expose(exposed || {}) }\n"
      }

      const cssVarsCode = mainScript && cssVars.length > 0
        ? `\n__cssVarsUse(() => ({\n${cssVars.map(cssVar => {
          const expr = isSimpleIdentifier(cssVar.expression) && cssVar.expression in props
            ? `typeof ${cssVar.expression} !== "undefined" ? ${cssVar.expression} : ${propsReturn}[${JSON.stringify(cssVar.expression)}]`
            : cssVar.expression
          return `  ${JSON.stringify(cssVar.name)}: __cssVarsUnref(${expr}),`
        }).join("\n")}\n}))\n`
        : ""

      // setup() return property should not start with "$" or "_" which are reserved prefixes for Vue internals
      const vuePrefixed = scriptScope.filter(scope => scope.startsWith("$") || scope.startsWith("_"))
      if (vuePrefixed.length > 0 && !vuePrefixedWarned) {
        vuePrefixedWarned = true
        Logger.warn("[MOD] Script scope cannot expose variables that start with Vue-reserved prefixes ($ or _), and will be ignored. This warning will only show once.")
      }

      const scriptReturn = "{" + (mainScript ? scriptScope.filter(scope => !vuePrefixed.includes(scope)).join(", ") : scriptExports.map(exp => typeof exp === "string" ? exp : `${exp.name}: ${exp.as}`).join(", ")) + "}"

      let debugAdd = ""
      if (mainScript) {
        debugAdd = `/*** MAIN ARGS ***/\n${mainArgs.map(arg => `const ${arg} = null`).join("\n")}\n/*** /MAIN ARGS ***/\n`
      }
      debugResult = `"use strict"\n\n${debugAdd}/*** SCOPE DEFINITIONS ***/\n${scopeDefs}\n/*** /SCOPE DEFINITIONS ***/\n\n/*** SCRIPT ***/\n${script}\n${cssVarsCode}/*** /SCRIPT ***/\n\n/*** SCRIPT RETURN ***/\nvoid (${scriptReturn})\n/*** /SCRIPT RETURN ***/\n`

      result = `"use strict"\n${scopeDefs}\n\nreturn (function() {\n${script}\n${cssVarsCode}return ${scriptReturn}\n})()\n`
      if (sourceUrl) {
        result += `\n//# sourceURL=${sourceUrl.replace(/\s/g, "_")}\n`
      }

      script = ""
    }

    // exposing things for local scope (must go after the script builder)
    scope.__imports = extImp.reduce((res, imp) => {
      const mod = imp.name === "*" ? extImports[imp.module] : { [imp.name]: extImports[imp.module][imp.name] }
      res[imp.module] = { ...res[imp.module], ...mod }
      return res
    }, {})
    // Logger.log(scope.__imports)

    if (mainScript) {
      return {
        components: intImp
          .filter(imp => extImports[imp.module].__internal === "components")
          .map(imp => imp.name),
        directives: intImp
          .filter(imp => extImports[imp.module].__internal === "directives")
          .map(imp => imp.name),
        props,
        emits,
        exposes,
        options,
        includes: {
          app: scriptExternals.filter(imp => imp.mod.app).reduce((res, imp) => ({ ...res, [imp.as]: { module: imp.module, exportName: imp.name } }), {}),
          vueC: scriptExternals.filter(imp => imp.mod.vueC).reduce((res, imp) => ({ ...res, [imp.as]: imp.module }), {}),
          vueD: scriptExternals.filter(imp => imp.mod.vueD).reduce((res, imp) => ({ ...res, [imp.as]: { module: imp.module, exportName: imp.name } }), {}),
          js: scriptExternals.filter(imp => imp.mod.js && !imp.mod.vueD).reduce((res, imp) => ({ ...res, [imp.as]: imp.module }), {}),
        },
        setup: async subimports => {
          flattenBngUiMod(subimports)
          Object.assign(scope.__imports, subimports)
          // compiles and returns the function to use in vue component setup
          let fn
          try {
            fn = new Function(...mainArgs, result)
            debugResult = null
          } catch (err) {
            throw await buildCompileError(err, debugResult, sourceUrl)
          }
          return fn.bind(scope)
        },
      }
    } else {
      return {
        includes: {
          app: scriptExternals.filter(imp => imp.mod.app).reduce((res, imp) => ({ ...res, [imp.as]: { module: imp.module, exportName: imp.name } }), {}),
          js: scriptExternals.filter(imp => imp.mod.js).reduce((res, imp) => ({ ...res, [imp.as]: imp.module }), {}),
        },
        run: async subimports => {
          flattenBngUiMod(subimports)
          Object.assign(scope.__imports, subimports)
          // compiles and runs the function
          let fn
          try {
            fn = new Function(result)
            debugResult = null
          } catch (err) {
            throw await buildCompileError(err, debugResult, sourceUrl)
          }
          return fn.bind(scope)
        },
      }
    }
  }
}

function listScriptDefs(script, path, vueDirectives, replacements = {}) {
  // parse into an abstract syntax tree
  const ast = parseModule(script, scriptParseOptions)
  // Logger.log(ast)

  const defs = [], imports = [], externals = [], exports = []

  function addDef(name) {
    if (!name || defs.includes(name)) return
    defs.push(name)
  }

  function collectBindingNames(node) {
    if (!node) return
    switch (node.type) {
      case "Identifier":
        addDef(node.name)
        break
      case "ObjectPattern":
        for (const prop of node.properties || []) {
          if (!prop) continue
          if (prop.type === "Property") {
            collectBindingNames(prop.value)
          } else if (prop.type === "RestElement") {
            collectBindingNames(prop.argument)
          }
        }
        break
      case "ArrayPattern":
        for (const el of node.elements || []) {
          collectBindingNames(el)
        }
        break
      case "AssignmentPattern":
        collectBindingNames(node.left)
        break
      case "RestElement":
        collectBindingNames(node.argument)
        break
    }
  }

  function collectBindingNamesTo(arr, node) {
    if (!node) return
    const before = defs.length
    collectBindingNames(node)
    for (let i = before; i < defs.length; i++) {
      arr.push(defs[i])
    }
  }

  const defineCalls = {
    defineProps: null,
    defineEmits: null,
    defineOptions: null,
    // defineExpose: null,
  }
  const edits = []

  for (const item of ast.body) {
    switch (item.type) {

      case "ExpressionStatement":
        if (
          item.expression.type === "CallExpression" &&
          item.expression.callee.name in defineCalls
        ) {
          const args = item.expression.arguments
          if (args.length > 0) {
            defineCalls[item.expression.callee.name] = script.substring(args[0].start, args[0].end)
          }
          edits.push({
            start: item.start,
            end: item.end,
            replacement: `/* ${item.expression.callee.name} macro removed */`
          })
        }
        break

      case "VariableDeclaration":
        for (const dec of item.declarations) {
          if (dec.id) collectBindingNames(dec.id)

          if (
            dec.init &&
            dec.init.type === "CallExpression" &&
            dec.init.callee.name in defineCalls
          ) {
            const args = dec.init.arguments
            if (args.length > 0) {
              defineCalls[dec.init.callee.name] = script.substring(args[0].start, args[0].end)
            }
            edits.push({
              start: dec.init.start,
              end: dec.init.end,
              replacement:
                (replacements[dec.init.callee.name] || "") +
                `/* ${dec.init.callee.name} macro replaced */`,
            })
          }
        }
        break

      case "FunctionDeclaration":
        addDef(item.id.name)
        break

      case "ImportDeclaration":
        if (item.specifiers) {
          const modulePath = item.source.value
          const module = extImports[modulePath]
          for (const dec of item.specifiers) {
            let name, nameAs

            switch (dec.type) {
              case "ImportDefaultSpecifier":
                // import x from "mod"
                name = "default"
                nameAs = dec.local.name
                break
              case "ImportNamespaceSpecifier":
                // import * as x from "mod"
                name = "*" // special flag
                nameAs = dec.local.name
                break
              case "ImportSpecifier":
                // import { x } from "mod" OR import { x as y } from "mod"
                name = dec.imported.name
                nameAs = dec.local.name
            }

            if (module) {
              if (name === "*") {
                imports.push({
                  internal: module.__internal,
                  mod: null,
                  module: modulePath,
                  name: "*",
                  as: nameAs,
                })
                addDef(nameAs)
              } else if (module.__internal || name in module) { // internal import
                imports.push({
                  internal: !(name in module), // do we want to handle "default" here?
                  mod: null,
                  module: modulePath,
                  name,
                  as: nameAs,
                })
                if (name in module) addDef(nameAs)
              }
            } else {
              // mod import
              const app = modulePath.startsWith("@/") || modulePath.startsWith("/src/")
              const relative = modulePath.startsWith("./") || modulePath.startsWith("../")
              const extensionlessRelativeJs = relative && !/\.[a-zA-Z0-9]+$/.test(modulePath)
              const mod = {
                vueC: modulePath.endsWith(".vue"),
                vueD: vueDirectives.includes(nameAs),
                app,
                // we won't support commonjs at this time but we probably can
                // simply add <script> tag or something to expose things through window
                // use externals for that
                js: /\.m?js$/.test(modulePath) || extensionlessRelativeJs,
                // css: modulePath.endsWith(".css"), // prefer @import in css or meta tag
              }
              const importPath = app ? modulePath : relative ? `${path}/${modulePath}` : modulePath
              if (mod.vueC || mod.vueD || mod.js || mod.app) {
                externals.push({
                  internal: false,
                  mod,
                  module: importPath,
                  name,
                  as: nameAs,
                })
                // note: we're not adding it to defs
                //if (mod.vueD || mod.js || mod.app) addDef(nameAs)
                if (mod.js || mod.app) addDef(nameAs)
              }
            }
          }
          edits.push({
            start: item.start,
            end: item.end,
            replacement: `/* import from module "${modulePath}" */`,
          })
        }
        break

      case "ExportNamedDeclaration":
        // handle "export const x = 1" or "export function x() {}"
        if (item.declaration) {
          if (item.declaration.type === "VariableDeclaration") {
            for (const dec of item.declaration.declarations) {
              collectBindingNamesTo(exports, dec.id)
            }
          } else if (item.declaration.type === "FunctionDeclaration") {
            if (item.declaration.id.name) {
              exports.push(item.declaration.id.name)
              addDef(item.declaration.id.name)
            }
          }
          // remove the "export" keyword
          edits.push({
            start: item.start,
            end: item.declaration.start,
            replacement: "",
          })
        } else {
          // handle "export { x, y }"
          edits.push({
            start: item.start,
            end: item.end,
            replacement: "",
          })
        }
        // handle "export { x, y as z }"
        for (const specifier of item.specifiers || []) {
          exports.push({
            name: specifier.exported.name,
            as: specifier.local.name,
          })
        }
        break

      case "ExportDefaultDeclaration":
        // handle "export default x" or "export default function() {}"
        exports.push({
          name: "default",
          as: replacements.default,
        });
        addDef(replacements.default)
        edits.push({
          start: item.start,
          end: item.declaration.start,
          replacement: `const ${replacements.default} = `,
        })
        break
    }
  }
  return {
    scriptScope: defs,
    scriptImports: imports,
    scriptExternals: externals,
    scriptExports: exports,
    defineCalls,
    edits,
  }
}
