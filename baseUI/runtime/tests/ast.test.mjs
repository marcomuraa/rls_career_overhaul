import { test } from "node:test"
import assert from "node:assert"
import { parse, walk, applyEdits, collectPatternNames, nodeStart, nodeEnd } from "../core/ast.js"

test("walk visits nested nodes and finds every import declaration", () => {
  const ast = parse('import a from "x"\nimport { b } from "y"\nconst z = 1')
  const sources = []
  walk(ast, n => { if (n.type === "ImportDeclaration") sources.push(n.source.value) })
  assert.deepStrictEqual(sources, ["x", "y"])
})

test("applyEdits splices multiple edits without drift (order-independent input)", () => {
  // edits intentionally out of order - applyEdits must sort descending to avoid offset drift
  const out = applyEdits("abcdef", [
    { start: 3, end: 4, text: "Y" },
    { start: 0, end: 1, text: "X" },
  ])
  assert.strictEqual(out, "XbcYef")
})

test("applyEdits can replace a range with a longer string", () => {
  const out = applyEdits("hello world", [{ start: 6, end: 11, text: "there!" }])
  assert.strictEqual(out, "hello there!")
})

test("collectPatternNames pulls names out of object/array/default/rest patterns", () => {
  const ast = parse("const { a, b: c, d = 1, ...rest } = obj\nconst [e, f = 2, ...g] = arr")
  const names = new Set()
  walk(ast, n => { if (n.type === "VariableDeclarator") collectPatternNames(n.id, names) })
  assert.deepStrictEqual([...names].sort(), ["a", "c", "d", "e", "f", "g", "rest"])
})

test("collectPatternNames on a plain identifier collects just that name", () => {
  const names = new Set()
  collectPatternNames({ type: "Identifier", name: "solo" }, names)
  assert.deepStrictEqual([...names], ["solo"])
})

test("nodeStart/nodeEnd return the source range of a parsed node", () => {
  const src = 'const x = 1'
  const ast = parse(src)
  let decl
  walk(ast, n => { if (n.type === "VariableDeclaration") decl = n })
  assert.strictEqual(src.slice(nodeStart(decl), nodeEnd(decl)), "const x = 1")
})
