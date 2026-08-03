// source fetcher

import { revisionOf } from "../host/revisions.js"
import { mtimeOf } from "../host/files.js"
import { noteLastFetch, recordFetchError } from "../host/diagnostics.js"

const cutQS = url => {
  const idx = url.indexOf("?")
  return idx === -1 ? url : url.slice(0, idx)
}

const bootTime = Date.now()
const bust = path => revisionOf(path) + ":" + (mtimeOf(path) ?? bootTime)

export const sourceProviders = [
  {
    match: () => true,
    async fetch(url) {
      const sep = url.includes("?") ? "&" : "?"
      const full = url + sep + "r=" + bust(cutQS(url))
      noteLastFetch(full)
      let res
      try {
        res = await fetch(full)
      } catch (e) {
        recordFetchError(full, e)
        throw e
      }
      if (!res.ok) throw new Error(res.status + " " + url)
      return res.text()
    },
  },
]

export async function fetchFirst(urls) {
  let lastErr
  for (const url of urls) {
    const provider = sourceProviders.find(p => p.match(url))
    if (!provider) continue
    try { return { url, text: await provider.fetch(url) } }
    catch (err) { lastErr = err }
  }
  throw lastErr || new Error("no source for " + urls[0])
}
