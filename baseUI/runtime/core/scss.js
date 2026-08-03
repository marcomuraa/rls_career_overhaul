// dart-sass compilation with a custom importer
//
// we use sync API because async yields on every @use,
// making the loading time extremely slow on waves (e.g. from 9ms sync to 400ms async)

const SRC_BASE = "/ui/ui-vue/src"
const dirOf = p => p.slice(0, p.lastIndexOf("/"))
const normalizeAbs = abs => new URL(abs, "https://_").pathname
const bngPath = u => u.href.replace(/^bngscss:/, "")

// resolveScss(abs) -> { path, text } | null : the real partial path (for the import graph) and its pre-fetched source
// compileScss returns { css, deps } where deps are the real partial paths the compile pulled in, so a changed partial can invalidate its dependents
export function createScss({ sass, resolveScss, ready }) {
  function importer(entryDir, deps) {
    return {
      canonicalize(url, ctx) {
        const raw = url.replace(/^bngscss:/, "")
        // resolve the "@/" alias to the real partial path
        const at = raw.lastIndexOf("@/")
        let abs
        if (at >= 0) abs = SRC_BASE + "/" + raw.slice(at + 2)
        else if (raw[0] === "/") abs = raw
        else {
          const dir = ctx && ctx.containingUrl ? dirOf(bngPath(ctx.containingUrl)) : entryDir
          abs = dir + "/" + raw
        }
        return new URL("bngscss:" + normalizeAbs(abs))
      },
      load(canonicalUrl) {
        const r = resolveScss(bngPath(canonicalUrl))
        if (!r) return null
        deps.push(r.path)
        return { contents: r.text, syntax: "scss" }
      },
    }
  }

  async function compileScss(src, path) {
    if (!sass) return { css: src, deps: [] }
    if (ready) await ready
    const deps = []
    try {
      const css = sass.compileString(src, { importers: [importer(dirOf(path), deps)] }).css
      return { css, deps }
    } catch (err) {
      console.warn("[runtime-sfc] scss compile failed for", path, err)
      return { css: "", deps }
    }
  }

  return { compileScss }
}
