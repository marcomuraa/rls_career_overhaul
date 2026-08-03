import { parseModule } from "meriyah"

const parseOpts = { ranges: true, next: true, module: true }

export const parse = src => parseModule(src, parseOpts)
export const nodeStart = n => (n.start != null ? n.start : (n.range ? n.range[0] : null))
export const nodeEnd = n => (n.end != null ? n.end : (n.range ? n.range[1] : null))

export function walk(node, visit) {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) { for (const c of node) walk(c, visit); return }
  if (typeof node.type === "string") visit(node)
  for (const key in node) {
    if (key === "type") continue
    const v = node[key]
    if (v && typeof v === "object") walk(v, visit)
  }
}

// apply [{start,end,text}] edits to source, descending by start (must be non-overlapping)
export function applyEdits(source, edits) {
  edits.sort((a, b) => b.start - a.start)
  for (const e of edits) source = source.slice(0, e.start) + e.text + source.slice(e.end)
  return source
}

// collect bound names from a (possibly destructuring) declaration target
export function collectPatternNames(idNode, out) {
  if (!idNode) return
  switch (idNode.type) {
    case "Identifier": out.add(idNode.name); break
    case "ObjectPattern": for (const p of idNode.properties) collectPatternNames(p.value || p.argument, out); break
    case "ArrayPattern": for (const el of idNode.elements) el && collectPatternNames(el, out); break
    case "AssignmentPattern": collectPatternNames(idNode.left, out); break
    case "RestElement": collectPatternNames(idNode.argument, out); break
  }
}
