export const emptyImage = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1' viewBox='0 0 1 1' fill='none' stroke='none'/>"

const ASSETS_ROOT = "/ui/ui-vue/src/assets"

// When the UI is served under a path prefix (e.g. the workbench loads the embed
// over the game's /vfs mount), `window.__bngHttpBase` rebases absolute "/..." HTTP
// fetches. Empty/unset (the normal in-game CEF case) leaves paths unchanged.
function httpBase() {
  return (typeof window !== "undefined" && window.__bngHttpBase) || ""
}

export function getURL(path) {
  if (typeof path !== "string" || !path || path.includes("://")) return path
  if (path.startsWith("/")) path = path.substring(1)
  return `${httpBase()}/${path}`
}

export function getAssetURL(assetPath) {
  if (typeof assetPath !== "string" || !assetPath || assetPath.includes("://")) return assetPath
  let p = assetPath.startsWith("/") ? assetPath : "/" + assetPath
  if (!p.startsWith(ASSETS_ROOT)) p = ASSETS_ROOT + p
  return httpBase() + p
}

/**
 * @async
 * @param {string} url The URL of the file to get
 * @param {number} timeout The timeout in seconds
 * @returns {Promise<string>} The file content in plain text
 */
export const getFile = (url, timeout = 5) => new Promise((resolve, reject) => {
  let tmr = null
  const base = httpBase()
  if (base && typeof url === "string" && url.startsWith("/") && !url.startsWith(base + "/")) url = base + url
  try {
    const xhr = new XMLHttpRequest()
    tmr = timeout > 0 ? setTimeout(() => {
      xhr.abort()
      reject(new Error("Timeout"))
    }, timeout * 1000) : null
    xhr.open("GET", url, true)
    xhr.onload = () => {
      if (tmr) clearTimeout(tmr)
      if (xhr.status === 200) {
        resolve(xhr.responseText)
      } else {
        reject(new Error(`Failed with code ${xhr.status}`))
      }
    }
    xhr.onerror = () => {
      if (tmr) clearTimeout(tmr)
      reject(new Error("Network error"))
    }
    xhr.send()
  } catch (err) {
    if (tmr) clearTimeout(tmr)
    reject(err)
  }
})

export function useAppGlobals(appContext) {
  return appContext.config.globalProperties
}

export function useAppGlobalsFromBinding(binding) {
  return useAppGlobals(binding.instance.$.appContext)
}

export const ucaseFirst = str => str[0].toUpperCase() + str.slice(1)


// Simplistic, probably crappy '$q.defer' implementation (only accepts a notify handler at the top-level 'then')
// ** TODO ** Find a better (correct) implementation if this turns out to be wrong!
export const defer = () => {

  const noop = () => {}
  let resolve, reject, _notifyHandler = noop
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })

  const _wrappedPromise = {
    then: (resolveHandler, rejectHandler=noop, notifyHandler=noop) => {
      _notifyHandler = notifyHandler
      return promise.then(resolveHandler, rejectHandler)
    }
  }

  const notify = val => _notifyHandler(val)

  return {
    promise: _wrappedPromise,
    resolve,
    reject,
    notify
  }

}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const _enum = obj => Object.freeze(Object.assign(Object.create(null), obj))

export function shuffleArray(list, lastItem = undefined) {
  if (!Array.isArray(list) || list.length < 2) return list

  const result = Array.from(list)
  const hasLastItem = lastItem !== undefined

  if (!hasLastItem || result.length > 2) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      if (j !== i) {
        const tmp = result[i]
        result[i] = result[j]
        result[j] = tmp
      }
    }
  }

  if (hasLastItem && result[0] === lastItem) {
    result.push(result.shift())
  }

  return result
}
