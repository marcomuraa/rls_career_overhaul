// ESM-to-CJS transform
// this is necessary because each thing must be ran in a function AND have synchronous imports, which is impossible in ESM
//
// single meriyah parse drives everything: dependency collection, dynamic-import rewrite, and the multi-decl export split
// sucrase then does the actual ESM->CJS rewrite (its "imports" transform emits live-binding getters for `export ... from` / `export *`, which the cyclic barrels in this codebase rely on)
// `disableESTransforms` leaves modern syntax (class fields etc.) native

import { transform as sucraseTransform } from "sucrase"
import { parse, walk, nodeStart, nodeEnd, applyEdits } from "./ast.js"
import { recordTransform } from "../host/diagnostics.js"

function scan(ast, source, wantSplits) {
  const deps = []
  const dynEdits = []
  const splitEdits = []
  walk(ast, node => {
    switch (node.type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
      case "ExportNamedDeclaration":
        if (node.source && typeof node.source.value === "string") {
          deps.push(node.source.value)
        }
        // sucrase bug:
        //   it keeps only the FIRST declarator of `export const a = 1, b = 2`
        //   so we rewrite them to their own export statements
        if (
          wantSplits && node.type === "ExportNamedDeclaration" && node.declaration
          && node.declaration.type === "VariableDeclaration" && node.declaration.declarations.length > 1
        ) {
          const kind = node.declaration.kind
          const text = node.declaration.declarations
            .map(d => `export ${kind} ${source.slice(nodeStart(d), nodeEnd(d))}`).join(";\n") + ";"
          splitEdits.push({ start: nodeStart(node), end: nodeEnd(node), text })
        }
        break
      case "ImportExpression": {
        // route import() through the loader cache (__rtImport) rather than native (document-relative import)
        // preserveDynamicImport keeps sucrase from touching it
        const s = nodeStart(node)
        if (s != null) dynEdits.push({ start: s, end: s + 6, text: "__rtImport" })
        break
      }
      case "CallExpression":
        if (
          node.callee && node.callee.type === "Identifier" && node.callee.name === "require"
          && node.arguments.length === 1 && node.arguments[0].type === "Literal"
          && typeof node.arguments[0].value === "string"
        ) {
          deps.push(node.arguments[0].value)
        }
        break
    }
  })
  return { deps, dynEdits, splitEdits }
}

function analyze(source) {
  let ast
  try { ast = parse(source) } catch { return { deps: [], code: source } }
  let { deps, dynEdits, splitEdits } = scan(ast, source, true)
  // splitting shifts offsets; re-parse only in the (rare) multi-declarator-export case, so a
  // dynamic import inside a split declarator is still rewritten correctly
  if (splitEdits.length) {
    source = applyEdits(source, splitEdits)
    try { ast = parse(source) } catch { return { deps: [], code: source } }
    ;({ deps, dynEdits } = scan(ast, source, false))
  }
  return { deps, code: applyEdits(source, dynEdits) }
}

// returns [deps, cjsCode]
export function transformModule(source, id) {
  const { deps, code } = analyze(source)
  const out = sucraseTransform(code, {
    transforms: ["imports"],
    disableESTransforms: true,
    preserveDynamicImport: true,
    filePath: id,
  })
  const withUrl = out.code + `\n//# sourceURL=${id}\n`
  recordTransform(id, withUrl)
  return [deps, withUrl]
}
