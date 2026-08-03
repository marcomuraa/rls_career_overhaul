import { parse, NodeTypes, ElementTypes } from "@vue/compiler-dom"

const builtInDirectives = new Set([
  "text", "html", "show", "if", "else", "else-if", "for",
  "on", "bind", "model", "slot", "pre", "cloak", "once", "memo", "is",
])

const rgxAbs = /^(\/|local:\/\/|https?:\/\/)/

/**
 * Processes the template source text.
 * - Injects the data-bngmod-* attribute on root elements
 * - Rewrites relative src/href to be prefixed with `${path}/`
 * - Collects custom (non-built-in) directive names referenced by the template
 *
 * @param {string} templateText The raw template source (innerHTML of <template>)
 * @param {string} dataid Assigned data ID for the component (e.g. "data-bngmod-xxx")
 * @param {string} path Component file path (directory part of file URL)
 * @returns {[string, string[]]} Transformed template text and a list of custom directive names
 */
export function procTemplate(templateText, dataid, path) {
  templateText = templateText || ""
  if (!templateText.trim()) return [templateText, []]

  const ast = parse(templateText, {})
  const edits = []
  const customDirectives = []

  function processElement(node, isScopeRoot) {
    const isTemplate = node.tagType === ElementTypes.TEMPLATE
    const isTeleport = node.tagType === ElementTypes.COMPONENT && node.tag.toLowerCase() === "teleport"

    // inject the data id attribute on rendered scope roots. <template> and
    // <Teleport> are not rendered where the scoped styles need to match, so their
    // rendered children become scope roots instead
    if (isScopeRoot && !isTemplate && !isTeleport && !hasAttribute(node, dataid)) {
      const insertAt = findOpeningTagInsertPoint(templateText, node.loc.start.offset)
      if (insertAt !== -1) {
        edits.push({ start: insertAt, end: insertAt, replacement: ` ${dataid}` })
      }
    }

    for (const prop of node.props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        const name = prop.name
        if ((name === "src" || name === "href") && prop.value && !rgxAbs.test(prop.value.content)) {
          const valLoc = prop.value.loc
          const orig = valLoc.source
          const inner = prop.value.content
          let replacement
          if (orig.length > 0 && (orig[0] === "\"" || orig[0] === "'")) {
            replacement = `${orig[0]}${path}/${inner}${orig[0]}`
          } else {
            replacement = `"${path}/${inner}"`
          }
          edits.push({ start: valLoc.start.offset, end: valLoc.end.offset, replacement })
        }
      } else if (prop.type === NodeTypes.DIRECTIVE) {
        const dirName = prop.name
        if (builtInDirectives.has(dirName)) continue
        const camel = "v" + dirName
          .charAt(0).toUpperCase() + dirName.slice(1)
          .replace(/-([a-z\d])/g, (_, m) => m.toUpperCase())
        if (!customDirectives.includes(camel)) customDirectives.push(camel)
      }
    }
  }

  function walk(node, isScopeRoot) {
    if (!node) return
    if (node.type === NodeTypes.ELEMENT) {
      processElement(node, isScopeRoot)
      const childScopeRoot = isTeleportNode(node) || (isScopeRoot && node.tagType === ElementTypes.TEMPLATE)
      for (const child of node.children || []) walk(child, childScopeRoot)
    } else if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, isScopeRoot)
    }
  }

  for (const child of ast.children || []) {
    walk(child, true)
  }

  // apply text edits from right to left to keep offsets valid
  edits.sort((a, b) => b.start - a.start)
  let result = templateText
  for (const edit of edits) {
    result = result.substring(0, edit.start) + (edit.replacement || "") + result.substring(edit.end)
  }

  return [result, customDirectives]
}

function hasAttribute(node, name) {
  return (node.props || []).some(prop => prop.type === NodeTypes.ATTRIBUTE && prop.name === name)
}

function isTeleportNode(node) {
  return node?.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.COMPONENT &&
    node.tag.toLowerCase() === "teleport"
}

/**
 * Finds the offset right before the closing `>` of an opening tag, so we can
 * splice in an extra attribute. Accounts for self-closing tags (returns the
 * offset before the trailing `/`) and quoted attribute values.
 */
function findOpeningTagInsertPoint(source, startOffset) {
  let inQuote = null
  for (let i = startOffset; i < source.length; i++) {
    const ch = source[i]
    if (inQuote) {
      if (ch === inQuote) inQuote = null
      continue
    }
    if (ch === "\"" || ch === "'") {
      inQuote = ch
      continue
    }
    if (ch === ">") {
      if (source[i - 1] === "/") return i - 1
      return i
    }
  }
  return -1
}
