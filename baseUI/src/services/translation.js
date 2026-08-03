import { watch } from "vue"
import { createI18n } from "petite-vue-i18n"
import { lua, useBridge } from "@/bridge"
import { useSettingsAsync } from "@/services/settings"

/*
  Warning: petite-vue-i18n supports only composable mode.
  This means that we should keep an eye on global usage of its properties, such as:
  - vueI18n.global.locale
  - vueI18n.global.messages
  These must have .value on them.
*/

// this lists angular translation keys for all loaded locales (for fallback translations)
const ANGULAR_TRANSLATE = []

let _angularTranslateFunc
let _i18n

const i18nVariant = "petite"
const defaultLocale = "en-US"

const localeCheckId = "ui.common.okay"
const checkLocale = () => _i18n && _i18n.global.t(localeCheckId) !== localeCheckId // if locale is okay, this will not be equal

let translate = val => val

function loadTranslationDebugFlags() {
  const { api } = useBridge()
  api.engineLua("(core_locales and core_locales.getScrambleTranslationDebugEnabled and core_locales.getScrambleTranslationDebugEnabled()) or false", enabled => {
    scrambleTranslationDebugEnabled = !!enabled
  })
}

export const initTranslation = () => {
  loadTranslationDebugFlags()
  if (window.vueI18n?.__bng_i18n_variant !== i18nVariant) {
    if (window.vueI18n) {
      console.warn("Localisation library is already initialized, but its variant was not validated. Reloading...")
    }
    let creationArguments = {
      locale: defaultLocale,
      fallbackLocale: defaultLocale,
      silentTranslationWarn: true,
      fallbackWarn: false,
      missingWarn: false,
      warnHtmlMessage: false,
      // note: do NOT enable flatJson, as i18n still unwraps certain messages into objects and we lose some translations
      //       only petite variant with flatJson disabled does the job correctly
    }
    window.vueI18n = createI18n(creationArguments)
    window.vueI18n.__bng_i18n_variant = i18nVariant
  }
  _i18n = window.vueI18n
  return {
    i18n: _i18n,
    plugin: translationPlugin,
  }
}

export const loadLocale = async (locale, force = false) => {
  if (_i18n.global.availableLocales.includes(locale) && !force) return
  try {
    let res
    try {
      res = await lua.extensions.core_locales.getLocale(locale)
    } catch (err) {
      if (err.message !== "Timeout") throw err
      console.warn(`Locale ${locale} load timed out, retrying...`)
      res = await lua.extensions.core_locales.getLocale(locale)
    }
    _i18n.global.setLocaleMessage(locale, preprocessLocaleJSON(res || {}))
  } catch (err) {
    console.error(`Failed to load ${locale} locale`, err)
  }
}

const setupUserLanguage = async () => {
  // load settings
  const settings = await useSettingsAsync()
  // watch for language change with immediate effect (it'll load user language right away)
  watch(() => settings.values.uiLanguage, async lang => {
    if (lang && lang !== defaultLocale) await loadLocale(lang)
    _i18n.global.locale.value = _i18n.global.availableLocales.includes(lang) ? lang : defaultLocale
    if (lang !== defaultLocale && !checkLocale()) console.warn(`Locale ${lang} is not behaving properly`)
  }, { immediate: true })
}

const reloadAllLocales = async () => {
  loadTranslationDebugFlags()
  const locales = _i18n.global.availableLocales.filter(l => l !== defaultLocale)
  await loadLocale(defaultLocale, true)
  for (const locale of locales) {
    await loadLocale(locale, true)
  }
}

export const translationPlugin = () => ({
  install(app, options) {
    // load default language, then setup user language
    _i18n.global.locale.value = defaultLocale
    loadLocale(defaultLocale, true).then(async () => {
      if (!checkLocale()) {
        console.warn("Failed to load default locale, retrying...")
        await loadLocale(defaultLocale, true)
        if (!checkLocale()) {
          console.error(`Failed to load default locale!`)
        }
      }
      await setupUserLanguage()
    })

    window.bridge?.events?.on("onTranslationsReloaded", reloadAllLocales)

    return contextTranslatePlugin().install(app, options)
  }
})

export const contextTranslatePlugin = () => ({
  install(app, options) {
    translate = _wrapTranslate(_i18n.global.t)
    app.config.globalProperties.$t = translate
    app.config.globalProperties.$ctx_t = (val, translateContext = true) => contextTranslate(val, translateContext)
    app.config.globalProperties.$mctx_t = multiContextTranslate
    // also make the wrapped clash handling version available in case it is needed
    app.config.globalProperties.$tt = translate
  }
})

const contextTranslate = (val, translateContext = false) => {
  const type = typeof val
  if (type === "undefined" || val === null) {
    return ""
  }
  if (type === "object") {
    if (val.txt && val.context) {
      let context = val.context
      if (translateContext) {
        context = { ...context }
        for (const key in context) {
          context[key] = contextTranslate(context[key], true)
        }
      }
      return getTranslation(val.txt, context)
    } else {
      val = val.txt || ""
    }
  }
  return getTranslation("" + val)
}

const multiContextTranslate = val => {
  if (val.txt) return contextTranslate(val)
  let description = ''
  for (const i of val) description += contextTranslate(i)
  return description
}

const getAngularTranslationFunc = () => {
  if (_angularTranslateFunc) return _angularTranslateFunc
  if (window.angular$translate) {
    _angularTranslateFunc = window.angular$translate.instant.bind(window.angular$translate)
  }
  return _angularTranslateFunc || translate
}

const getTranslation = (...vals) => {
  if (!ANGULAR_TRANSLATE.includes(vals[0])) return translate(...vals)
  const angularTranslate = getAngularTranslationFunc()
  const value = angularTranslate(...vals)
  return angularTranslate === translate ? value : _applyTranslationDebugScramble(value)
}


export const $translate = {
  instant: (val, args = undefined) => typeof val !== "undefined" ? translate(val, args) : "",
  contextTranslate,
  multiContextTranslate,
}

const rgxAngular = /{{.+}}/
const rgxAngularTranslation = /([^ ]?){{ *(?::: *)?'([^ |}]+)' *\| *translate *}}([^\w]?)/gi
// const rgxAngularTranslation = /([^ ]?){{ *(?::: *)?'([^ |}]+)' *\| *(?:translate|contextTranslate) *}}([^\w]?)/gi
function translateAngularToVue(text) {
  // replace linked translations
  let vueText = text.replace(
    rgxAngularTranslation,
    // this function is to deal with adjacent quotes that mess up the translation.
    // covering the string in curly braces doesn't work. so we're just going to add whitespaces.
    // TODO: find a better solution
    (_, q1, s, q2) => (q1 ? `${q1} ` : "") + `@:${s}` + (q2 ? ` ${q2}` : ""),
  )

  // replace context translations
  vueText = vueText.replace(/{{ *([a-z\d_.]+) *}}/gi, "{$1}")

  if (vueText === text || rgxAngular.test(vueText)) return null
  return vueText
}

export const preprocessLocaleJSON = obj => {
  const messages = {}
  for (const key in obj) {
    if (ANGULAR_TRANSLATE.includes(key)) continue
    let text = obj[key]
    const angularRequired = rgxAngular.test(text)
    if (angularRequired) {
      const vueText = translateAngularToVue(text)
      if (vueText) {
        messages[key] = vueText
      } else if (!ANGULAR_TRANSLATE.includes(key)) {
        ANGULAR_TRANSLATE.push(key)
      }
    } else {
      messages[key] = text
    }
  }
  return messages
}

const rgxLinkedTranslation = /@:([a-zA-Z0-9_][a-zA-Z0-9_.-]+[a-zA-Z0-9_])/g
const MESSAGE_LINK_PREFIX = "__linked_custom"
const MESSAGE_OVERRIDE_PREFIX = "__message_override"
const translationOverrides = new Map()
let translationOverrideCounter = 0
let scrambleTranslationDebugEnabled = false
const scrambleTranslationDebugSuffix = "✓"

function _randomLetterLike(char) {
  const code = char.charCodeAt(0)
  if (code >= 65 && code <= 90) return String.fromCharCode(65 + Math.floor(Math.random() * 26))
  if (code >= 97 && code <= 122) return String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return char
}

function _scrambleTranslationWordStarts(text) {
  const segments = []
  const protectPattern = (input, pattern) => input.replace(pattern, segment => {
    segments.push(segment)
    return `\u0001${segments.length}\u0002`
  })

  let result = protectPattern(text, /{{[^]*?}}/g)
  result = protectPattern(result, /\[[^\]]*]/g)

  result = result.replace(/([A-Za-z])([A-Za-z0-9_]*)/g, (_, firstLetter, rest) => _randomLetterLike(firstLetter) + rest)
  result = result.replace(/\u0001(\d+)\u0002/g, (_, index) => segments[Number(index) - 1] || "")

  return result
}

function _applyTranslationDebugScramble(value) {
  if (!scrambleTranslationDebugEnabled || typeof value !== "string") return value
  return _scrambleTranslationWordStarts(value) + scrambleTranslationDebugSuffix
}

function _linkedTranslation(msg) {
  if (!msg.includes("@:") || !rgxLinkedTranslation.test(msg)) return msg

  const locale = _i18n.global.locale.value
  const messages = _i18n.global.messages.value[locale]

  msg = msg.replace(rgxLinkedTranslation, (_, id) => "@:" + id)

  let uniqueId = ""
  let match
  rgxLinkedTranslation.lastIndex = 0
  while ((match = rgxLinkedTranslation.exec(msg)) !== null) {
    uniqueId += match[1].replace(/\./g, "_") + "__"
  }

  let fullId, messageId
  let counter = 0
  while (counter < 100) {
    messageId = uniqueId + ++counter
    fullId = MESSAGE_LINK_PREFIX + "." + messageId
    let existingMessage = messages[fullId]
    // create new
    if (!existingMessage) {
      _i18n.global.mergeLocaleMessage(locale, { [fullId]: msg })
      break
    }
    // matching source of existing message
    if (existingMessage === msg) break
  }

  return fullId
}

function _isInvalidLinkedFormatError(err) {
  return err && err.name === "SyntaxError" && `${err.message || ""}`.includes("Invalid linked format")
}

function _escapeInvalidLinkedAtSymbols(text) {
  if (typeof text !== "string" || !text.includes("@")) return text
  let result = ""
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== "@") {
      result += ch
      continue
    }
    if (text.slice(i, i + 5) === "{'@'}") {
      result += "{'@'}"
      i += 4
      continue
    }
    if (text[i + 1] === ":") {
      result += "@"
      continue
    }
    if (text[i + 1] === ".") {
      const modifierStart = i + 2
      const colonPos = text.indexOf(":", modifierStart)
      const modifier = colonPos > -1 ? text.slice(modifierStart, colonPos) : ""
      if (modifier && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(modifier)) {
        result += "@"
        continue
      }
    }
    result += "{'@'}"
  }
  return result
}

function _getLocaleMessageByKey(locale, key) {
  const localeMessages = _i18n.global.messages.value?.[locale]
  if (!localeMessages) return undefined
  if (Object.prototype.hasOwnProperty.call(localeMessages, key)) return localeMessages[key]
  const parts = key.split(".")
  let current = localeMessages
  for (const part of parts) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) return undefined
    current = current[part]
  }
  return current
}

function _setFlatLocaleMessage(locale, key, value) {
  _i18n.global.mergeLocaleMessage(locale, { [key]: value })
}

function _tryFixInvalidLinkedTranslation(key) {
  const locale = _i18n.global.locale.value
  const source = _getLocaleMessageByKey(locale, key)
  if (typeof source !== "string") return null
  const escaped = _escapeInvalidLinkedAtSymbols(source)
  if (escaped === source) return null

  const cacheKey = `${locale}|${key}|${source}|${MESSAGE_OVERRIDE_PREFIX}`
  if (translationOverrides.has(cacheKey)) return translationOverrides.get(cacheKey)

  const sanitizedBaseKey = key.replace(/[^a-zA-Z0-9]/g, "_")
  const overrideKey = `${MESSAGE_OVERRIDE_PREFIX}__${sanitizedBaseKey}__${++translationOverrideCounter}`
  _setFlatLocaleMessage(locale, overrideKey, escaped)
  translationOverrides.set(cacheKey, overrideKey)
  return overrideKey
}

function _translateUsingDefaultLocale(f, args, key, thisArg) {
  const currentLocale = _i18n.global.locale.value
  if (currentLocale === defaultLocale || typeof _getLocaleMessageByKey(defaultLocale, key) === "undefined") return null
  const [, arg2, arg3] = args
  const options = { locale: defaultLocale }
  if (typeof arg3 === "number") {
    options.plural = arg3
  } else if (typeof arg3 === "string") {
    options.default = arg3
  } else if (arg3 && typeof arg3 === "object") {
    Object.assign(options, arg3)
  }
  return f.apply(thisArg, [key, arg2, options])
}

function _wrapTranslate(f) {
  function translate(...args) {
    let key = args[0]
    if (!key) return ""
    if (typeof key !== "string") return key // not a translation key

    // FIXME: this function might need to check if the key is in ANGULAR_TRANSLATE, maybe even linked translations too

    const sourceKey = key
    key = _linkedTranslation(key)

    try {
      return _applyTranslationDebugScramble(f.apply(this, [key, ...args.slice(1)]))
    } catch (err) {
      const overrideKey = _isInvalidLinkedFormatError(err) ? _tryFixInvalidLinkedTranslation(key) : null
      if (overrideKey) {
        try {
          return _applyTranslationDebugScramble(f.apply(this, [overrideKey, ...args.slice(1)]))
        } catch (overrideErr) {
          err = overrideErr
        }
      }
      try {
        const fallback = _translateUsingDefaultLocale(f, args, sourceKey, this)
        if (fallback !== null) {
          console.warn(`Falling back to ${defaultLocale} for invalid ${_i18n.global.locale.value} translation "${sourceKey}"`, err)
          return _applyTranslationDebugScramble(fallback)
        }
      } catch (fallbackErr) {
        console.error(`Failed to fall back to ${defaultLocale} translation`, args, fallbackErr)
      }
      console.error("Error translating", args, err)
      throw err
    }
  }
  Object.defineProperty(translate, "name", { value: f.name })
  return translate
}
