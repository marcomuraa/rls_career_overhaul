import { reactive, markRaw, defineComponent } from "vue"
import * as BASE from "@/common/components/base"
import * as UTILITY from "@/common/components/utility"
import * as APPUTILS from "@/common/components/appsUtilities"
import * as DIRECTIVES from "@/common/directives"
import { sleep } from "@/utils"
import { stableId } from "@/services/uniqueId"
import Logger from "@/services/logger"

import { procMeta } from "./meta"
import { procTemplate } from "./compilers/template"
import { procScript } from "./compilers/script"
import { procStyle, compileStyleSource, stripStyleComments } from "./compilers/styles"
import { brokenComponentPlaceholder } from "./errorBoundary"
import { getSource } from "./source"

import { bundledImporters } from "/generated/mod-compiler-imports.js"

const DEBUG = false

const EXCLUDE = {
  components: ["DEMOS", "ModComponent", "ModSlot", "ModStyles"],
  directives: ["DEMOS"],
}

/**
 * @typedef {Object} UiMod
 * @property {Object}   meta        Meta information. `dataid` will always be present.
 * @property {Object}   component   Vue component.
 * @property {String}   styles      CSS source if any.
 * @property {Array}    substyles   Styles for nested components. `{ id, filepath, styles }`
 * @property {Object}   script      Script source.
 * @property {String}   [error]     Short error reason.
 * @property {Error}    [errorObj]  Error object.
 * @property {Number}   timestamp   Time when the component last accessed.
 * @property {Boolean}  [working]   Only appears internally, when the component is compiling.
 * @property {Function} compile     Compile function.
 * @property {Boolean}  compiled    Only appears internally, when the component is compiled.
 */

// limit how many cached components are allowed in cache (will remove older ones)
const cacheLimit = 50
// should we cache errors or let them retry compiling
const cacheErrors = false

/** @type {Object<String, UiMod>} */
const cache = {}

async function resetOne(fileUrl) {
  const comp = cache[fileUrl]
  while (comp.working) await sleep(10)
  delete cache[fileUrl]
}

async function checkCache() {
  const urls = Object.keys(cache)
  if (urls.length < cacheLimit) return
  urls.sort((a, b) => a.timestamp - b.timestamp)
  for (let i = 0; i < urls.length - cacheLimit; i++) {
    await resetOne(urls[i])
  }
  // TODO: make it delete old ones, but by usage
}

/**
 * Resets cache for the component.
 * @param {String} [fileUrl] Full file URL to download the component from. If undefined, will reset whole cache.
 */
export async function resetComponentCache(fileUrl = undefined) {
  if (fileUrl) {
    if (fileUrl in cache) {
      await resetOne(fileUrl)
    }
  } else {
    for (const fileUrl in cache) {
      await resetOne(fileUrl)
    }
  }
}

export async function resetAllCaches() {
  for (const fileUrl in cache) {
    await resetOne(fileUrl)
  }
  for (const fileUrl in moduleCache) {
    await resetOneModule(fileUrl)
  }
  for (const key in bundledModuleCache) {
    delete bundledModuleCache[key]
  }
}

const now = () => ~~(new Date().getTime() / 1000)

const stripVPrefix = name => /^v[A-Z]/.test(name) ? name.substring(1) : name

// bundled module resolver
const bundledModuleCache = {}

function isBundledModulePath(modulePath) {
  return modulePath.startsWith("@/") || modulePath.startsWith("/src/")
}

function bundledCandidates(modulePath) {
  if (!isBundledModulePath(modulePath)) return []
  const bases = []
  if (modulePath.startsWith("@/")) {
    bases.push(modulePath)
    bases.push(`/src/${modulePath.substring(2)}`)
  } else {
    bases.push(modulePath)
    bases.push(`@/${modulePath.substring(5)}`)
  }
  const res = []
  for (const base of bases) {
    if (base.endsWith(".js")) {
      res.push(base)
      continue
    }
    res.push(
      base,
      `${base}.js`,
      `${base}/index-mod.js`, // mod-facing barrel
      `${base}/index.js`, // default barrel
    )
  }
  return res
}

async function getBundledModule(modulePath) {
  if (!isBundledModulePath(modulePath)) return null
  if (modulePath in bundledModuleCache) return await bundledModuleCache[modulePath]

  bundledModuleCache[modulePath] = (async () => {
    for (const key of bundledCandidates(modulePath)) {
      const loader = bundledImporters[key]
      if (!loader) continue
      return await loader()
    }
    throw new Error(`Bundled import not found: ${modulePath}`)
  })()

  return await bundledModuleCache[modulePath]
}

// cache for non-vue script includes (.js, .mjs)
const moduleCacheLimit = 100
const moduleCache = {}

async function resetOneModule(fileUrl) {
  const mod = moduleCache[fileUrl]
  while (mod.working) await sleep(10)
  delete moduleCache[fileUrl]
}

async function checkModuleCache() {
  const urls = Object.keys(moduleCache)
  if (urls.length < moduleCacheLimit) return
  urls.sort((a, b) => moduleCache[a].timestamp - moduleCache[b].timestamp)
  for (let i = 0; i < urls.length - moduleCacheLimit; i++) {
    await resetOneModule(urls[i])
  }
}

const scriptModuleCandidates = fileUrl =>
  /\.[a-zA-Z0-9]+$/.test(fileUrl) ?
  [fileUrl] : [`${fileUrl}.js`, `${fileUrl}/index.js`]

const canTryNextScriptModuleCandidate = err => /Failed with code 404/.test(String(err?.message || ""))

async function getModuleExportsResolved(fileUrl, refresh = false, stack = undefined) {
  let lastErr
  for (const candidate of scriptModuleCandidates(fileUrl)) {
    try {
      return await getModuleExports(candidate, refresh, stack)
    } catch (err) {
      lastErr = err
      if (!canTryNextScriptModuleCandidate(err)) throw err
    }
  }
  throw lastErr
}

/**
 * Loads a plain (non-SFC) local module
 * @param {String} fileUrl Full file URL to the module.
 * @param {Boolean} [refresh] If true, drops the module from the cache before loading.
 * @returns {Promise<Object>} The module's namespace exports.
 */
export async function loadModule(fileUrl, refresh = false) {
  return await getModuleExportsResolved(fileUrl, refresh)
}

/**
 * Recompiles several mod components, resetting each file's cache entry.
 * @param {String[]} filepaths
 * @param {Boolean} [returnCompiled]
 * @returns {Promise<Map<String, Object>>}
 */
export async function refreshComponents(filepaths, returnCompiled = true) {
  const unique = [...new Set((filepaths || []).filter(Boolean))]
  const compiled = new Map()
  for (const filepath of unique) {
    compiled.set(filepath, await getComponent(filepath, true, returnCompiled))
  }
  return compiled
}

async function getModuleExports(fileUrl, refresh = false, stack = undefined) {
  if (!stack) stack = new Set()
  if (refresh && fileUrl in moduleCache) {
    await resetOneModule(fileUrl)
  }

  if (fileUrl in moduleCache) {
    const cached = moduleCache[fileUrl]
    if (cached.working) {
      // circular dependency, return partially-built exports
      if (stack.has(fileUrl)) return cached.exports
      while (cached.working) await sleep(10)
    }
    cached.timestamp = now()
    if (cached.errorObj) throw cached.errorObj
    return cached.exports
  }

  const entry = moduleCache[fileUrl] = {
    working: true,
    timestamp: now(),
    exports: {}, // this should help with circular dependencies
    errorObj: null,
  }
  stack.add(fileUrl)
  try {
    DEBUG && Logger.log("Loading subscript...", fileUrl)
    const source = await getSource(fileUrl, true)
    const path = fileUrl.substring(0, fileUrl.lastIndexOf("/"))
    const script = procScript(source, "data-bngmod-sub", path, false, [], fileUrl)()

    const subimports = {}
    if (script.includes?.app) {
      for (const info of Object.values(script.includes.app)) {
        if (!info?.module) continue
        subimports[info.module] = await getBundledModule(info.module)
      }
    }
    if (script.includes?.js) {
      for (const depUrl of Object.values(script.includes.js)) {
        subimports[depUrl] = await getModuleExportsResolved(depUrl, refresh, stack)
      }
    }

    // TODO: there also should be a check if script is already running
    //       to avoid situations where it returns a "run" function as well
    //       ...but this might break subimports for those scripts
    const run = await script.run(subimports)
    const exports = run()
    if (exports && typeof exports === "object") {
      Object.assign(entry.exports, exports)
    }
  } catch (err) {
    entry.errorObj = err
    throw err
  } finally {
    stack.delete(fileUrl)
    entry.working = false
    await checkModuleCache()
  }

  if (entry.errorObj) {
    throw entry.errorObj
  }
  return entry.exports
}

/**
 * Extracts the top-level <template>, <script>, <script setup> and <style>.
 *
 * @param {string} source SFC source text
 * @returns {{ template: string, script: string, scriptSetup: string, style: string, styleAttrs: string }}
 */
function extractSfcBlocks(source) {
  const blocks = { template: "", script: "", scriptSetup: "", style: "", styleAttrs: "" }
  if (!source) return blocks

  const tplOpenMatch = source.match(/<template(\s[^>]*)?>/i)
  if (tplOpenMatch) {
    const innerStart = tplOpenMatch.index + tplOpenMatch[0].length
    const closeIdx = findMatchingClose(source, innerStart, "template")
    if (closeIdx !== -1) blocks.template = source.substring(innerStart, closeIdx)
  }

  const scriptRegex = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi
  let scrMatch
  while ((scrMatch = scriptRegex.exec(source)) !== null) {
    const attrs = scrMatch[1] || ""
    const inner = scrMatch[2] || ""
    if (/\bsetup\b/.test(attrs)) {
      if (!blocks.scriptSetup) blocks.scriptSetup = inner
    } else {
      if (!blocks.script) blocks.script = inner
    }
  }

  const styleMatch = source.match(/<style(\s[^>]*)?>([\s\S]*?)<\/style\s*>/i)
  if (styleMatch) {
    blocks.styleAttrs = styleMatch[1] || ""
    blocks.style = styleMatch[2] || ""
  }

  return blocks
}

function getBlockAttr(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null
}

function getStyleLang(attrs) {
  return getBlockAttr(attrs, "lang") || ""
}

function findMatchingClose(source, fromIdx, tagName) {
  const openRe = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "gi")
  const closeRe = new RegExp(`</${tagName}\\s*>`, "gi")
  let depth = 1
  let pos = fromIdx
  while (depth > 0) {
    openRe.lastIndex = pos
    closeRe.lastIndex = pos
    const o = openRe.exec(source)
    const c = closeRe.exec(source)
    if (!c) return -1
    if (o && o.index < c.index) {
      depth++
      pos = o.index + o[0].length
    } else {
      depth--
      if (depth === 0) return c.index
      pos = c.index + c[0].length
    }
  }
  return -1
}

/**
 * CSSOM wrapper.
 *
 * @param {string} cssText
 * @returns {{ sheet: CSSStyleSheet }|null}
 */
function buildStyleProxy(cssText) {
  if (!cssText) return null
  try {
    const sheet = new window.CSSStyleSheet()
    sheet.replaceSync(cssText)
    return { sheet }
  } catch (err) {
    Logger.warn("[MOD] Failed to parse style block", err)
    return null
  }
}

function sanitizeCssVarName(expr) {
  return String(expr || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "value"
}

function prepareStyleSource(cssText, dataid) {
  const cssVars = []
  const varNames = new Map()
  const usedNames = new Set()

  function getVarName(expr) {
    if (varNames.has(expr)) return varNames.get(expr)
    const base = `${dataid}-${sanitizeCssVarName(expr)}`
    let name = base
    let idx = 1
    while (usedNames.has(name)) {
      idx++
      name = `${base}-${idx}`
    }
    usedNames.add(name)
    varNames.set(expr, name)
    cssVars.push({ name, expression: expr })
    return name
  }

  // strip comments first so commented-out `v-bind(...)` calls don't get picked up
  const cleaned = stripStyleComments(cssText || "")
  const source = cleaned.replace(/v-bind\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/g, (_, _quote, quotedExpr, rawExpr) => {
    const expr = String(quotedExpr ?? rawExpr ?? "").trim()
    if (!expr) return ""
    return `var(--${getVarName(expr)})`
  })

  return { source, cssVars }
}

function getComponents(only = undefined, exclude = []) {
  const res = {}
  const all = { ...BASE, ...UTILITY, ...APPUTILS }
  for (const name in all) {
    const cmp = all[name]
    if (typeof cmp !== "object" || typeof cmp.setup !== "function") continue
    if (exclude.includes(name) || EXCLUDE.components.includes(name)) continue
    if (only && !only.includes(name)) continue
    res[name] = cmp
  }
  return res
}

function getDirectives(only = undefined, exclude = []) {
  const res = {}
  const all = DIRECTIVES
  for (const name in all) {
    if (typeof all[name] !== "function" && typeof all[name].mounted !== "function") continue
    if (exclude.includes(name) || EXCLUDE.directives.includes(name)) continue
    if (only && !only.includes(name)) continue
    res[stripVPrefix(name)] = all[name]
  }
  return res
}

/**
 * Get compiled component from cache or compile it.
 * @param {String} fileUrl Full file URL to download the component from.
 * @param {Boolean} [refresh] If true, will refresh the component from the source.
 * @param {Boolean} [returnCompiled] If true, will return the compiled component, otherwise will only prepare it for compilation, exposing compile() function.
 * @returns {Promise<UiMod>} Object with compiled component, script and style.
 */
export async function getComponent(fileUrl, refresh = false, returnCompiled = true) {
  let comp
  refresh = refresh && fileUrl in cache && !cache[fileUrl].working
  if (refresh || !(fileUrl in cache)) {
    cache[fileUrl] = {
      working: true,
      timestamp: now(),
    }
    comp = await buildComponent(fileUrl, returnCompiled, refresh)
    comp.working = false
    if (!cacheErrors && comp.error) {
      delete cache[fileUrl]
    } else {
      Object.assign(cache[fileUrl], comp)
      await checkCache()
    }
  } else {
    comp = cache[fileUrl]
    while (comp.working) await sleep(10)
    comp.timestamp = now()
    if (returnCompiled && !comp.compiled && typeof comp.compile === "function") {
      const compiled = await comp.compile()
      Object.assign(comp, compiled)
      delete comp.compile
      comp.compiled = true
    }
  }
  return comp
}

/**
 * Get compiled component.
 * @param {String} fileUrl Full file URL to download the component from.
 * @param {Boolean} [returnCompiled] If true, will return the compiled component, otherwise will only prepare it for compilation, exposing compile() function.
 * @returns {Promise<UiMod>} Reactive object with compiled component, script and styles. If error is present, everything else will be null.
 */
export async function buildComponent(fileUrl, returnCompiled = true, refreshIncludes = false) {
  /** @type {UiMod} */
  const res = reactive({
    meta: null,
    component: null,
    script: null,
    styles: null,
    substyles: [],
    files: [fileUrl],
    compile: null,
    compiled: false,
  })
  function error(reason, err) {
    const leave = ["meta"]
    for (const key in res) {
      if (!leave.includes(key)) delete res[key]
    }
    res.error = reason
    res.errorObj = err
    return res
  }
  let source, template
  try {
    source = await getSource(fileUrl, true)
    if (!source || !source.trim()) return error("File is empty")
    if (!source.includes("<template>")) return error("File must have <template>")
  } catch (err) {
    // those two errors come from getFile (called by getSource)
    if (err.message === "Timeout") return error("File loading timeout")
    if (err.message === "Network error") return error("File loading error")
    return error("File not found", err)
  }
  try {
    /// security considerations (TODO)
    // - sanitise template and style from external resources
    // - sandbox the script (use quickjs-emscripten)
    // - Teleport component might need to be wrapped or disabled

    const dataid = stableId(fileUrl, "data-bngmod-")
    const path = fileUrl.substring(0, fileUrl.lastIndexOf("/"))

    const blocks = extractSfcBlocks(source)

    res.meta = procMeta(blocks.script, dataid)
    let vueDirectives
    [template, vueDirectives] = procTemplate(blocks.template, dataid, path)
    const styleLang = getStyleLang(blocks.styleAttrs)
    const styleSource = prepareStyleSource(blocks.style, dataid)
    res.script = procScript(blocks.scriptSetup, dataid, path, true, vueDirectives, fileUrl, styleSource.cssVars)
    const compiledStyleSource = compileStyleSource(styleSource.source, styleLang, fileUrl)
    const styleProxy = buildStyleProxy(compiledStyleSource)
    res.styles = styleProxy ? procStyle(styleProxy, dataid, path) : ""
  } catch (err) {
    return error("Parse error", err)
  }
  res.compile = async () => {
    if (res.compiled) return res
    if (res.compiling) {
      while (res.compiling) await sleep(10)
      return res
    }
    res.compiling = true
    await compileComponent(res, template, fileUrl, refreshIncludes, error)
    res.compiling = false
    res.compiled = true
    delete res.compile
    return res
  }
  return returnCompiled ? await res.compile() : res
}

/**
 * Compiles the component.
 * @param {Object} res Object with parsed component data. Will be mutated.
 * @param {String} template Parsed template.
 * @param {String} fileUrl Full file URL.
 * @param {Boolean} [refreshIncludes] If true, will refresh the includes.
 * @param {Function} [error] Error handler.
 * @returns {Promise<UiMod>} Object with compiled component, script and styles.
 */
async function compileComponent(res, template, fileUrl, refreshIncludes = false, error = () => {}) {
  const subimports = {}
  let script, setup
  const substylesIds = new Set()
  const loadedFiles = new Set([fileUrl])

  function addSubstyle(style) {
    if (!style || !style.id || !style.styles) return
    if (substylesIds.has(style.id)) return
    substylesIds.add(style.id)
    res.substyles.push(style)
  }

  // build the main script
  try {
    DEBUG && Logger.log("Building script...", fileUrl)
    script = res.script()
    DEBUG && Logger.log("Script built", script)
  } catch (err) {
    return error("Script building error", err)
  }

  // compile the subcomponents
  if (script.includes.vueC) {
    DEBUG && Logger.log("Compiling includes...", fileUrl)
    for (const name in script.includes.vueC) {
      try {
        const includeUrl = script.includes.vueC[name]
        // const cmp = markRaw(defineComponent({
        //   template: `<ModComponent v-bind="$attrs" file="${includeUrl}"${refreshIncludes ? " file-refresh" : ""} />`,
        //   components: { ModComponent: UTILITY.ModComponent },
        //   inheritAttrs: false,
        // }))
        const data = await getComponent(includeUrl, refreshIncludes)
        loadedFiles.add(includeUrl)
        let cmp
        if (data.error) {
          Logger.error(data.error, data.errorObj)
          cmp = markRaw(brokenComponentPlaceholder(data.error))
        } else {
          cmp = markRaw(data.component)
          addSubstyle({ id: data.meta.dataid, filepath: includeUrl, styles: data.styles })
          if (Array.isArray(data.substyles)) {
            for (const style of data.substyles) {
              addSubstyle(style)
            }
          }
          for (const file of data.files || []) loadedFiles.add(file)
        }
        script.includes.vueC[name] = cmp
        if (!(includeUrl in subimports)) subimports[includeUrl] = {}
        subimports[includeUrl][name] = cmp
      } catch (err) {
        return error("Subcomponent import loading error", err)
      }
    }
  }

  // compile the dependencies (subscripts and directives)
  // TODO: implement caching
  // NOTE: includes are cached via moduleCache, refreshIncludes bypasses it.
  const directives = {}
  const registerDirective = (name, dir) => {
    if (!dir || !name) return
    directives[stripVPrefix(name)] = dir
  }

  const directiveModules = new Set()
  const app = script.includes.app || {}
  const vueD = script.includes.vueD || {}
  const js = script.includes.js || {}
  const moduleUrls = new Set()
  for (const info of Object.values(app)) {
    if (!info?.module) continue
    moduleUrls.add(info.module)
  }
  for (const info of Object.values(vueD)) {
    if (!info?.module) continue
    moduleUrls.add(info.module)
    directiveModules.add(info.module)
  }
  for (const url of Object.values(js)) {
    if (!url) continue
    moduleUrls.add(url)
  }

  for (const url of moduleUrls) {
    try {
      if (isBundledModulePath(url)) {
        subimports[url] = await getBundledModule(url)
      } else {
        subimports[url] = await getModuleExportsResolved(url, refreshIncludes)
      }
    } catch (err) {
      return error((directiveModules.has(url) ? "Directive" : "Subscript") + " import loading error", err)
    }
  }

  for (const [localName, info] of Object.entries(vueD)) {
    if (!info?.module || !info.exportName) continue
    const exp = subimports[info.module]
    const dir = exp?.[info.exportName]
    if (!dir) {
      Logger.warn(`[MOD] Directive "${localName}" export "${info.exportName}" not found in ${info.module}`)
      continue
    }
    registerDirective(localName, dir)
  }

  // mod-facing barrels (e.g. `@/path/to/index-mod.js`) expose their public surface via a single `__bngUiMod` object.
  // __bngUiMod = { components: { ... }, directives: { ... }, others: { ... } } where `others` are plain scripts
  const appComponents = {}
  for (const [localName, info] of Object.entries(app)) {
    if (!info?.module || !info.exportName) continue
    const mod = subimports[info.module]
    const bng = mod?.__bngUiMod
    if (!bng || typeof bng !== "object") continue
    if (bng.components && info.exportName in bng.components) {
      const cmp = bng.components[info.exportName]
      if (cmp) appComponents[localName] = markRaw(cmp)
    }
    if (bng.directives && info.exportName in bng.directives) {
      const dir = bng.directives[info.exportName]
      if (dir) registerDirective(localName, dir)
    }
  }

  // compile the main script
  try {
    DEBUG && Logger.log("Compiling script...", fileUrl)
    setup = await script.setup(subimports)
    DEBUG && Logger.log("Script compiled", fileUrl)
  } catch (err) {
    return error("Script compilation error", err)
  }

  // compile the final component
  try {
    DEBUG && Logger.log("Compiling component...", fileUrl)
    res.component = markRaw(defineComponent({
      ...(script.options || {}),
      template,
      components: { ...getComponents(script.components), ...script.includes.vueC, ...appComponents },
      directives: { ...getDirectives(script.directives), ...directives },
      props: script.props,
      emits: script.emits,
      setup,
    }))
    DEBUG && Logger.log("Component compiled", res)
  } catch (err) {
    return error("Template compilation error", err)
  }

  res.files = [...loadedFiles]

  // Logger.log("Done with", fileUrl)
  return res
}
