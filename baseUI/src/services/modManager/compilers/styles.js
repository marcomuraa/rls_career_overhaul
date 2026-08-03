/**
 * Processes the style element.
 * It applies isolation to limit the styles to the component and its nested elements/components.
 * @param {HTMLElement} style Style element reference
 * @param {string} dataid Assigned data ID for the component
 * @param {string} path Component file path
 * @returns {string} Isolated source
 */
export function procStyle(style, dataid, path) {
  if (!style?.sheet) return ""

  const rgxAbs = /^(\/|local:\/\/|https?:\/\/)/
  const kfRenames = {}

  function procRules(rules) {
    let res = ""
    for (const rule of rules) {
      let sels = ""
      if (rule.selectorText) {
        const selectors = rule.selectorText.split(", ")
        let tmp
        for (const sel of selectors) {
          if (sel.toLowerCase().includes(":root")) {
            console.warn(":root selector is not supported for mods")
            continue
          }
          switch (sel.substring(0, 1)) {
            case "*":
              sels += `, [${dataid}]${sel.substring(1)}`
              break
            case ".":
            case ":":
              sels += `, [${dataid}]${sel}`
              break
            default: // we do it only here for a small performance gain
              tmp = sel.match(/^[a-z]+/i)[0]
              sels += `, ${tmp}[${dataid}]${sel.substring(tmp.length)}`
              break
          }
          sels += `, [${dataid}] ${sel}`
        }
        sels = sels.substring(2)
      } else if (rule.keyText) {
        // no need to change @keyframes frame definition
        sels = rule.keyText
      } else {
        // console.log(!!rule.cssRules, rule)
        if (rule.cssRules) {
          let sel = rule.cssText.substring(0, rule.cssText.indexOf("{")).trim()
          if (sel.startsWith("@keyframes")) {
            const sels = sel.split(/[,\s]+/)
            for (let i = 1; i < sels.length; i++) {
              kfRenames[sels[i]] = sels[i] + "-" + dataid
              sels[i] = kfRenames[sels[i]]
            }
            sel = sels.shift() + " " + sels.join(", ")
          }
          res += sel
            + " {\n"
            + procRules([...rule.cssRules])
            + "}\n"
        }
        continue
      }

      let content = rule.cssText.substring(rule.cssText.indexOf("{"))
      // fix url references in content
      content = content.replace(/url\(([^)]+)\)/g, (_, url) => {
        if (url.startsWith("'") || url.startsWith('"')) url = url.substring(1, url.length - 1)
        if (!url.startsWith("#") && !rgxAbs.test(url)) url = `${path}/${url}`
        return `url("${url}")`
      })

      res += sels + " " + content + "\n"
    }
    return res
  }

  let res = procRules([...style.sheet.cssRules])

  for (const [name, rename] of Object.entries(kfRenames)) {
    const rgx = new RegExp(`(animation(?:-name)?)\\s*(:(?:[^;]*?,?)?\\s*)${name}([,;\\s])`, "mig")
    let tmp
    while (tmp !== res) {
      tmp = res
      res = res.replace(rgx, `$1$2${rename}$3`)
    }
  }

  return res
}

/**
 * Strips CSS/SCSS comments from a raw source while preserving string literals.
 *
 * @param {string} source Raw style source
 * @returns {string} Source with comments removed
 */
export function stripStyleComments(source) {
  if (!source) return ""
  let out = ""
  let pos = 0
  const len = source.length
  while (pos < len) {
    const ch = source[pos]

    // string literal - copy verbatim, including escape sequences
    if (ch === "\"" || ch === "'") {
      const quote = ch
      out += ch
      pos++
      while (pos < len && source[pos] !== quote) {
        if (source[pos] === "\\" && pos + 1 < len) {
          out += source[pos] + source[pos + 1]
          pos += 2
        } else {
          out += source[pos]
          pos++
        }
      }
      if (pos < len) {
        out += source[pos]
        pos++
      }
      continue
    }

    // block comment `/* ... */`
    if (ch === "/" && source[pos + 1] === "*") {
      pos += 2
      while (pos < len && !(source[pos] === "*" && source[pos + 1] === "/")) pos++
      if (pos < len) pos += 2
      continue
    }

    // SCSS line comment `// ...` - only when not preceded by a non-whitespace
    // token, so unquoted `http://...` style URLs survive
    if (ch === "/" && source[pos + 1] === "/") {
      const prev = out.length > 0 ? out[out.length - 1] : ""
      if (prev === "" || /\s/.test(prev)) {
        while (pos < len && source[pos] !== "\n") pos++
        continue
      }
    }

    out += ch
    pos++
  }
  return out
}

/**
 * Normalises a raw style block source to plain CSS based on the language hint.
 * Currently supports plain CSS (passthrough) and a tiny SCSS subset.
 *
 * The SCSS subset covers nested selectors (with `&`, descendant and combinator
 * forms), comma-separated selector lists, and basic `$variable` declarations
 * and references.
 *
 * @param {string} cssText Raw style source (already past the v-bind pass)
 * @param {string} [lang] Optional language hint from the `<style lang="...">` attribute
 * @param {string} [sourceUrl] Source URL, used in warnings for context
 * @returns {string} Plain CSS source, ready for the CSSOM-based scoping pass
 */
export function compileStyleSource(cssText, lang, sourceUrl) {
  if (!cssText) return ""
  const normalised = String(lang || "").toLowerCase()
  if (!normalised || normalised === "css") return cssText
  if (normalised === "scss") return compileScssSubset(cssText, sourceUrl)
  console.warn(`[MOD] Unsupported style language "${lang}" in ${sourceUrl}. Mod styles are parsed as plain CSS only.`)
  return cssText
}

function compileScssSubset(source, sourceUrl) {
  const variables = {}
  const unknownVars = new Set()
  let css
  try {
    const ast = parseScssBlocks(source)
    css = emitCss(ast, [], variables, unknownVars)
  } catch (err) {
    console.warn(`[MOD] SCSS parse error in ${sourceUrl}, falling back to raw source:`, err)
    return source
  }
  for (const name of unknownVars) {
    console.warn(`[MOD] Unknown SCSS variable $${name} in ${sourceUrl}`)
  }
  return css
}

function parseScssBlocks(source) {
  const root = []
  const stack = [root]
  let buffer = ""
  let pos = 0

  function flushTrailing() {
    const text = buffer.trim()
    buffer = ""
    if (!text) return
    pushStatement(text)
  }

  function pushStatement(rawText) {
    const stripped = rawText.replace(/;\s*$/, "").trim()
    if (!stripped) return
    if (stripped.startsWith("$")) {
      const m = stripped.match(/^\$([a-zA-Z_-][\w-]*)\s*:\s*([\s\S]*)$/)
      if (m) {
        const value = m[2].replace(/\s*!(default|global)\s*$/i, "").trim()
        stack[stack.length - 1].push({ type: "varDecl", name: m[1], value })
        return
      }
    }
    if (stripped.startsWith("@")) {
      stack[stack.length - 1].push({ type: "atRule", text: stripped, children: null, hasBlock: false })
      return
    }
    stack[stack.length - 1].push({ type: "decl", text: rawText.trim() })
  }

  while (pos < source.length) {
    const ch = source[pos]

    if (ch === "\"" || ch === "'") {
      const quote = ch
      buffer += ch
      pos++
      while (pos < source.length && source[pos] !== quote) {
        if (source[pos] === "\\" && pos + 1 < source.length) {
          buffer += source[pos] + source[pos + 1]
          pos += 2
        } else {
          buffer += source[pos]
          pos++
        }
      }
      if (pos < source.length) {
        buffer += source[pos]
        pos++
      }
      continue
    }

    if (ch === "/" && source[pos + 1] === "*") {
      buffer += "/*"
      pos += 2
      while (pos < source.length && !(source[pos] === "*" && source[pos + 1] === "/")) {
        buffer += source[pos]
        pos++
      }
      if (pos < source.length) {
        buffer += "*/"
        pos += 2
      }
      continue
    }

    // line comments only when not preceded by a non-whitespace token (avoids
    // chopping protocol-style URLs like `http://...` written without quotes)
    if (ch === "/" && source[pos + 1] === "/") {
      const prev = pos > 0 ? source[pos - 1] : ""
      if (prev === "" || /\s/.test(prev)) {
        while (pos < source.length && source[pos] !== "\n") pos++
        continue
      }
    }

    if (ch === "{") {
      const head = buffer.trim()
      buffer = ""
      pos++
      const node = head.startsWith("@")
        ? { type: "atRule", text: head, children: [], hasBlock: true }
        : { type: "rule", selector: head, children: [] }
      stack[stack.length - 1].push(node)
      stack.push(node.children)
      continue
    }

    if (ch === "}") {
      flushTrailing()
      pos++
      if (stack.length > 1) stack.pop()
      continue
    }

    if (ch === ";") {
      buffer += ch
      pos++
      const text = buffer.trim()
      buffer = ""
      if (text === ";") continue
      pushStatement(text)
      continue
    }

    buffer += ch
    pos++
  }

  flushTrailing()
  return root
}

function emitCss(nodes, parentSelectors, variables, unknownVars) {
  let result = ""
  let currentDecls = ""

  function flushDecls() {
    if (!currentDecls) return
    if (parentSelectors.length === 0) {
      // top-level orphan declarations have no selector to attach to
      currentDecls = ""
      return
    }
    result += `${parentSelectors.join(", ")} {\n${currentDecls}}\n`
    currentDecls = ""
  }

  for (const node of nodes) {
    if (node.type === "varDecl") {
      variables[node.name] = resolveVariables(node.value, variables, unknownVars)
      continue
    }
    if (node.type === "decl") {
      const text = resolveVariables(node.text, variables, unknownVars)
      currentDecls += `  ${text}\n`
      continue
    }
    if (node.type === "rule") {
      flushDecls()
      const childSelectors = splitTopLevelCommas(node.selector)
        .map(s => resolveVariables(s, variables, unknownVars))
      const combined = combineSelectors(parentSelectors, childSelectors)
      result += emitCss(node.children, combined, variables, unknownVars)
      continue
    }
    if (node.type === "atRule") {
      flushDecls()
      const headText = resolveVariables(node.text, variables, unknownVars)
      if (!node.hasBlock) {
        result += `${headText};\n`
        continue
      }
      // @keyframes children are frame selectors (e.g. `0%`, `from`), not
      // selectors we should combine with the parent scope
      const isKeyframes = /^@(?:-\w+-)?keyframes\b/i.test(node.text)
      if (isKeyframes) {
        result += `${headText} {\n`
        for (const child of node.children) {
          if (child.type === "rule") {
            const sel = resolveVariables(child.selector, variables, unknownVars)
            result += `  ${sel} {\n`
            for (const inner of child.children) {
              if (inner.type === "decl") {
                result += `    ${resolveVariables(inner.text, variables, unknownVars)}\n`
              }
            }
            result += `  }\n`
          }
        }
        result += `}\n`
        continue
      }
      result += `${headText} {\n`
      result += emitCss(node.children, parentSelectors, variables, unknownVars)
      result += `}\n`
    }
  }

  flushDecls()
  return result
}

function splitTopLevelCommas(text) {
  const result = []
  let buf = ""
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === "(" || ch === "[") depth++
    else if (ch === ")" || ch === "]") depth--
    if (ch === "," && depth === 0) {
      const t = buf.trim()
      if (t) result.push(t)
      buf = ""
    } else {
      buf += ch
    }
  }
  const t = buf.trim()
  if (t) result.push(t)
  return result
}

function combineSelectors(parent, child) {
  if (parent.length === 0) return child.slice()
  const result = []
  for (const p of parent) {
    for (const c of child) {
      if (c.includes("&")) {
        result.push(c.replace(/&/g, p))
      } else {
        result.push(`${p} ${c}`)
      }
    }
  }
  return result
}

function resolveVariables(text, variables, unknownVars) {
  return String(text).replace(/\$([a-zA-Z_-][\w-]*)/g, (m, name) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name]
    }
    unknownVars.add(name)
    return m
  })
}
