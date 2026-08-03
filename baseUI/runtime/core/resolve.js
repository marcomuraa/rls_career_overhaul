// path resolution against lua file index

const SRC_BASE = "/ui/ui-vue/src"
const UIVUE_BASE = "/ui/ui-vue"

export const splitQuery = spec => {
  const i = spec.indexOf("?")
  return i === -1 ? [spec, ""] : [spec.slice(0, i), spec.slice(i)]
}
export const isBare = p => p[0] !== "." && p[0] !== "/"
export const extOf = p => { const m = /\.[a-z0-9]+$/i.exec(p); return m ? m[0].toLowerCase() : "" }
export const dirOf = p => p.slice(0, p.lastIndexOf("/"))
export const baseOf = p => p.slice(p.lastIndexOf("/") + 1)
export const normalizeAbs = abs => new URL(abs, "https://_").pathname

function mapAlias(p) {
  if (p.startsWith("@/")) return SRC_BASE + "/" + p.slice(2)
  if (p.startsWith("/src/") || p.startsWith("/generated/")) return UIVUE_BASE + p
  return p
}

export function createResolver({ hasFile, indexReady }) {
  const resolvedReal = new Map()
  const cache = new Map()

  // extension/index variants to try for an extensionless import
  const extCandidates = p => [
    `${p}.js`, `${p}/index.js`, `${p}.vue`, `${p}.mjs`, `${p}.json`,
    `${p}.scss`, `${dirOf(p)}/_${baseOf(p)}.scss`,
  ]

  // resolve abs path to the real file
  function resolveExisting(abs) {
    if (!indexReady()) return null
    if (hasFile(abs)) return abs
    const ext = extOf(abs)
    if (ext) {
      if (ext === ".scss") {
        const partial = `${dirOf(abs)}/_${baseOf(abs)}`
        if (hasFile(partial)) return partial
      }
      return null
    }
    for (const c of extCandidates(abs)) if (hasFile(c)) return c
    return null
  }

  // importer = resolved id of the requiring module (or undefined for the entry)
  function resolve(importer, spec) {
    const key = (importer || "") + "\0" + spec
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const [bare, query] = splitQuery(spec)
    const mapped = mapAlias(bare)
    let id
    if (isBare(mapped)) {
      id = spec // bare specifier -> served from the module cache (vendor)
    } else {
      let abs
      if (mapped[0] === "/") {
        abs = normalizeAbs(mapped)
      } else {
        const ref = importer ? resolvedReal.get(importer) || importer : SRC_BASE + "/x"
        abs = new URL(mapped, "https://_" + dirOf(ref) + "/").pathname
      }
      // remove trailing slash ("@/utils/") for the index lookup
      if (abs.length > 1 && abs.endsWith("/")) abs = abs.slice(0, -1)
      id = (resolveExisting(abs) || abs) + query
    }
    cache.set(key, id)
    return id
  }

  // fetch candidates for an already-resolved id (the index normally collapses this to one)
  function fetchCandidates(id) {
    const resolved = resolveExisting(id)
    if (resolved) return [resolved]
    if (indexReady()) return [id]
    const ext = extOf(id)
    if (ext) return ext === ".scss" ? [id, `${dirOf(id)}/_${baseOf(id)}`] : [id]
    return [...extCandidates(id), id]
  }

  // scss imports resolve to .scss/partials only - never to .js/.vue/etc
  function scssCandidates(abs) {
    const ext = extOf(abs)
    const list = (ext === ".scss" || ext === ".css")
      ? [abs, `${dirOf(abs)}/_${baseOf(abs)}`]
      : [`${abs}.scss`, `${dirOf(abs)}/_${baseOf(abs)}.scss`, `${abs}/index.scss`, `${abs}/_index.scss`]
    if (!indexReady()) return list
    const existing = list.filter(hasFile)
    return existing.length ? existing : list
  }

  const noteResolved = (id, realPath) => resolvedReal.set(id, realPath)

  return { resolve, fetchCandidates, scssCandidates, noteResolved }
}
