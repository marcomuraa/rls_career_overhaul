import { test } from "node:test"
import assert from "node:assert"
import { transformModule } from "../core/transform.js"

test("collects deps from import / export-from / export* / require (in source order)", () => {
  const [deps] = transformModule([
    'import { a } from "./a.js"',
    'export { b } from "./b.js"',
    'export * from "./d.js"',
    'const c = require("./c.js")',
  ].join("\n"), "/x.js")
  assert.deepStrictEqual(deps, ["./a.js", "./b.js", "./d.js", "./c.js"])
})

test("bare require with a non-string arg is not collected as a dep", () => {
  const [deps] = transformModule('const name = "./z.js"\nconst z = require(name)', "/x.js")
  assert.deepStrictEqual(deps, [], "dynamic require(var) is not a static dep")
})

test("dynamic import() is rewritten to __rtImport() so it goes through the loader cache", () => {
  const [deps, code] = transformModule('const p = import("./lazy.js")', "/x.js")
  assert.ok(code.includes('__rtImport("./lazy.js")'), "import() -> __rtImport()")
  assert.ok(!/[^t]import\(/.test(code), "no bare native import( left, got: " + code)
  assert.deepStrictEqual(deps, [])
})

test("multi-declarator export is split so every binding is exported (sucrase-bug workaround)", () => {
  const [, code] = transformModule("export const one = 1, two = 2, three = 3", "/x.js")
  assert.ok(/exports\.one\b/.test(code), "first decl exported")
  assert.ok(/exports\.two\b/.test(code), "second decl exported (the sucrase bug)")
  assert.ok(/exports\.three\b/.test(code), "third decl exported")
})

test("a dynamic import inside a split declarator is still rewritten (re-scan after split)", () => {
  // splitting shifts offsets, so the transform re-parses to avoid missing the import() in later declarators
  const [, code] = transformModule('export const first = 1, load = () => import("./m.js")', "/x.js")
  assert.ok(/exports\.first\b/.test(code), "first still exported")
  assert.ok(/exports\.load\b/.test(code), "second still exported")
  assert.ok(code.includes('__rtImport("./m.js")'), "import() in split declarator rewritten")
})

test("output is CJS and carries a //# sourceURL of the module id", () => {
  const [, code] = transformModule('export const x = 1', "/ui/ui-vue/src/foo.js")
  assert.ok(code.includes("require") || code.includes("exports"), "emits CJS")
  assert.ok(code.trimEnd().endsWith("//# sourceURL=/ui/ui-vue/src/foo.js"), "sourceURL appended")
})
