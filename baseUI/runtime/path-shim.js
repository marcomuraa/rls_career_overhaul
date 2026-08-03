export const sep = "/"
export const delimiter = ":"

export function isAbsolute(p) {
  return typeof p === "string" && p.charCodeAt(0) === 47
}

function normalizeArray(parts, allowAboveRoot) {
  const res = []
  for (const part of parts) {
    if (!part || part === ".") continue
    if (part === "..") {
      if (res.length && res[res.length - 1] !== "..") res.pop()
      else if (allowAboveRoot) res.push("..")
    } else {
      res.push(part)
    }
  }
  return res
}

export function normalize(p) {
  const abs = isAbsolute(p)
  const trailing = p.length > 0 && p.charCodeAt(p.length - 1) === 47
  let out = normalizeArray(p.split("/"), !abs).join("/")
  if (!out && !abs) out = "."
  if (out && trailing) out += "/"
  return (abs ? "/" : "") + out
}

export function join(...segments) {
  const joined = segments.filter(s => typeof s === "string" && s.length).join("/")
  return joined ? normalize(joined) : "."
}

export function resolve(...segments) {
  let resolved = ""
  let absolute = false
  for (let i = segments.length - 1; i >= 0 && !absolute; i--) {
    const seg = segments[i]
    if (typeof seg !== "string" || !seg) continue
    resolved = seg + "/" + resolved
    absolute = isAbsolute(seg)
  }
  resolved = normalizeArray(resolved.split("/"), !absolute).join("/")
  if (absolute) return "/" + resolved
  return resolved || "."
}

export function dirname(p) {
  if (!p) return "."
  const norm = p.replace(/\/+$/, "")
  const idx = norm.lastIndexOf("/")
  if (idx === -1) return "."
  if (idx === 0) return "/"
  return norm.slice(0, idx)
}

export function basename(p, ext) {
  if (!p) return ""
  const norm = p.replace(/\/+$/, "")
  let base = norm.slice(norm.lastIndexOf("/") + 1)
  if (ext && base.endsWith(ext) && base !== ext) base = base.slice(0, -ext.length)
  return base
}

export function extname(p) {
  const base = basename(p)
  const dot = base.lastIndexOf(".")
  return dot <= 0 ? "" : base.slice(dot)
}

export function relative(from, to) {
  const f = resolve(from).split("/").filter(Boolean)
  const t = resolve(to).split("/").filter(Boolean)
  let i = 0
  while (i < f.length && i < t.length && f[i] === t[i]) i++
  return [...f.slice(i).map(() => ".."), ...t.slice(i)].join("/")
}

export const posix = { sep, delimiter, isAbsolute, normalize, join, resolve, dirname, basename, extname, relative }
export const win32 = posix

export default { sep, delimiter, isAbsolute, normalize, join, resolve, dirname, basename, extname, relative, posix, win32 }
