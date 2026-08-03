// De-barrel named imports
//
// Rewrite `import { A, B } from "barrel"` into direct imports of the concrete leaf files the barrel re-exports.
// Load-bearing for cycle breaking: routing straight to the leaf drops the barrel edge from the consumer's cycle,
// so a top-level const reading a re-exported binding mid-cycle doesn't see it undefined.
// AST parses the barrel to map exported_name->{leaf, imported}, following `export * from` and `export { x } from` recursively.

import { parse, walk, nodeStart, nodeEnd, applyEdits, collectPatternNames } from "./ast.js"

const looksLikeBarrel = abs => abs.endsWith("/index.js") || abs.includes("/generated/")

export function createDebarrel({ resolve, readSource, splitQuery }) {
  const barrelMaps = new Map()    // abs -> Promise<Map<name,{source,imported}> | null>
  const directExports = new Map() // abs -> Promise<Set<name>>

  // names a module exports directly (export const/function/class, or `export { a, b }` without a source).
  // a parent barrel's `export * from "./leaf"` surfaces exactly these, so they map to the leaf as their own name.
  function getDirectExports(abs) {
    if (directExports.has(abs)) return directExports.get(abs)
    const p = (async () => {
      let ast
      try { ast = parse(await readSource(abs)) } catch { return new Set() }
      const names = new Set()
      walk(ast, node => {
        if (node.type !== "ExportNamedDeclaration" || node.source) return
        if (node.declaration) {
          const d = node.declaration
          if (d.type === "VariableDeclaration") for (const decl of d.declarations) collectPatternNames(decl.id, names)
          else if (d.id && d.id.name) names.add(d.id.name)
        }
        for (const spec of node.specifiers || []) names.add(spec.exported.name)
      })
      return names
    })()
    directExports.set(abs, p)
    return p
  }

  function getBarrelMap(barrelAbs) {
    if (barrelMaps.has(barrelAbs)) return barrelMaps.get(barrelAbs)
    const p = (async () => {
      let ast
      try { ast = parse(await readSource(barrelAbs)) } catch { return null }
      const map = new Map()
      let isBarrel = false
      const stars = []
      walk(ast, node => {
        if (node.type === "ExportAllDeclaration" && node.source) {
          isBarrel = true
          stars.push(splitQuery(resolve(barrelAbs, node.source.value))[0])
        } else if (node.type === "ExportNamedDeclaration" && node.source) {
          isBarrel = true
          const src = splitQuery(resolve(barrelAbs, node.source.value))[0]
          for (const spec of node.specifiers || []) map.set(spec.exported.name, { source: src, imported: spec.local.name })
        }
      })
      // `export * from "./leaf"`: inherit the leaf's own barrel map (nested re-exports), then its direct exports.
      // first-writer wins, matching ES `export *` precedence with explicit named re-exports taking priority.
      for (const childAbs of stars) {
        const child = await getBarrelMap(childAbs)
        if (child) for (const [k, v] of child) if (!map.has(k)) map.set(k, v)
        for (const name of await getDirectExports(childAbs)) if (!map.has(name)) map.set(name, { source: childAbs, imported: name })
      }
      return isBarrel ? map : null
    })()
    barrelMaps.set(barrelAbs, p)
    return p
  }

  async function debarrel(code, importerAbs) {
    if (code.indexOf("import") === -1) return code
    let ast
    try { ast = parse(code) } catch { return code }
    const importNodes = []
    walk(ast, node => { if (node.type === "ImportDeclaration" && node.source) importNodes.push(node) })

    const edits = []
    for (const node of importNodes) {
      const specs = node.specifiers || []
      if (specs.some(s => s.type === "ImportNamespaceSpecifier")) continue // namespace can't split
      const named = specs.filter(s => s.type === "ImportSpecifier")
      if (!named.length) continue
      const abs = splitQuery(resolve(importerAbs, node.source.value))[0]
      if (!looksLikeBarrel(abs)) continue
      const map = await getBarrelMap(abs)
      if (!map) continue
      const mapped = named.filter(s => map.has(s.imported.name))
      if (!mapped.length) continue

      const lines = mapped.map(s => {
        const e = map.get(s.imported.name)
        const local = s.local.name
        if (e.imported === "default") return `import ${local} from "${e.source}";`
        return e.imported === local
          ? `import { ${e.imported} } from "${e.source}";`
          : `import { ${e.imported} as ${local} } from "${e.source}";`
      })
      const defSpec = specs.find(s => s.type === "ImportDefaultSpecifier")
      const remaining = named.filter(s => !map.has(s.imported.name))
      if (defSpec || remaining.length) {
        const parts = []
        if (defSpec) parts.push(defSpec.local.name)
        if (remaining.length) parts.push(`{ ${remaining.map(s => s.imported.name === s.local.name ? s.imported.name : `${s.imported.name} as ${s.local.name}`).join(", ")} }`)
        lines.push(`import ${parts.join(", ")} from "${node.source.value}";`)
      }
      edits.push({ start: nodeStart(node), end: nodeEnd(node), text: lines.join("\n") })
    }
    return edits.length ? applyEdits(code, edits) : code
  }

  return { debarrel }
}
