import { test } from "node:test"
import assert from "node:assert"
import { createResolver } from "../core/resolve.js"

const SRC = "/ui/ui-vue/src"

function mkResolver(paths) {
  const files = new Set(paths)
  return createResolver({ hasFile: p => files.has(p), indexReady: () => true })
}

test('"@/" alias maps onto /ui/ui-vue/src and resolves to the real file', () => {
  const r = mkResolver([`${SRC}/foo/bar.js`])
  assert.strictEqual(r.resolve(undefined, "@/foo/bar.js"), `${SRC}/foo/bar.js`)
})

test('"/src" and "/generated" roots map onto /ui/ui-vue', () => {
  const r = mkResolver([`${SRC}/main.js`, "/ui/ui-vue/generated/index.js"])
  assert.strictEqual(r.resolve(undefined, "/src/main.js"), `${SRC}/main.js`)
  assert.strictEqual(r.resolve(undefined, "/generated/index.js"), "/ui/ui-vue/generated/index.js")
})

test("bare (vendor) specifiers pass straight through", () => {
  const r = mkResolver([])
  assert.strictEqual(r.resolve(`${SRC}/x.js`, "vue"), "vue")
  assert.strictEqual(r.resolve(`${SRC}/x.js`, "@vue/compiler-sfc"), "@vue/compiler-sfc")
})

test("relative specifier resolves against the importer directory", () => {
  const r = mkResolver([`${SRC}/a/c.js`])
  assert.strictEqual(r.resolve(`${SRC}/a/b.js`, "./c.js"), `${SRC}/a/c.js`)
})

test("relative specifier resolves against the importer's noted real path", () => {
  const r = mkResolver([`${SRC}/a/c.js`])
  // the raw id has a ?query; without noteResolved the relative path would compute against the wrong dir
  r.noteResolved(`${SRC}/a/b.js?x`, `${SRC}/a/b.js`)
  assert.strictEqual(r.resolve(`${SRC}/a/b.js?x`, "./c.js"), `${SRC}/a/c.js`)
})

test("extensionless import tries .js then /index.js", () => {
  const rJs = mkResolver([`${SRC}/a/c.js`])
  assert.strictEqual(rJs.resolve(`${SRC}/a/b.js`, "./c"), `${SRC}/a/c.js`)
  const rIndex = mkResolver([`${SRC}/a/c/index.js`])
  assert.strictEqual(rIndex.resolve(`${SRC}/a/b.js`, "./c"), `${SRC}/a/c/index.js`)
})

test("?query suffix is preserved on the resolved id", () => {
  const r = mkResolver([`${SRC}/a/c.js`])
  assert.strictEqual(r.resolve(`${SRC}/a/b.js`, "./c.js?raw"), `${SRC}/a/c.js?raw`)
})

test("trailing slash on a directory alias is trimmed before lookup", () => {
  const r = mkResolver([`${SRC}/utils/index.js`])
  assert.strictEqual(r.resolve(undefined, "@/utils/"), `${SRC}/utils/index.js`)
})

test("unresolved relative import falls back to the absolute guess (+query)", () => {
  const r = mkResolver([])
  assert.strictEqual(r.resolve(`${SRC}/a/b.js`, "./missing.js"), `${SRC}/a/missing.js`)
})

test("resolve is memoised per (importer, spec)", () => {
  let calls = 0
  const files = new Set([`${SRC}/a/c.js`])
  const r = createResolver({ hasFile: p => (calls++, files.has(p)), indexReady: () => true })
  const first = r.resolve(`${SRC}/a/b.js`, "./c.js")
  const after = calls
  const second = r.resolve(`${SRC}/a/b.js`, "./c.js")
  assert.strictEqual(first, second)
  assert.strictEqual(calls, after, "second resolve served from cache, no extra hasFile probing")
})

test("scssCandidates resolves to an existing partial, .js/.vue siblings ignored", () => {
  const r = mkResolver([`${SRC}/styles/_m.scss`, `${SRC}/styles/m.js`])
  const cands = r.scssCandidates(`${SRC}/styles/m`)
  assert.deepStrictEqual(cands, [`${SRC}/styles/_m.scss`], "scss import resolves to the partial only")
})

test("scssCandidates returns the full candidate list when nothing exists", () => {
  const r = mkResolver([])
  const cands = r.scssCandidates(`${SRC}/styles/m`)
  assert.ok(cands.includes(`${SRC}/styles/m.scss`), "plain .scss candidate")
  assert.ok(cands.includes(`${SRC}/styles/_m.scss`), "partial candidate")
})

test("fetchCandidates collapses a resolvable id to the single real file", () => {
  const r = mkResolver([`${SRC}/a/c.js`])
  assert.deepStrictEqual(r.fetchCandidates(`${SRC}/a/c.js`), [`${SRC}/a/c.js`])
})
