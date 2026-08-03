import { test } from "node:test"
import assert from "node:assert"
import { createModuleGraph } from "../core/graph.js"
import { createDebarrel } from "../core/debarrel.js"
import { createPersistentCache } from "../core/cache.js"

// stub window so the lua backend degrades to in-memory rather than throwing under node
globalThis.window ??= {}

const splitQuery = spec => { const i = spec.indexOf("?"); return i === -1 ? [spec, ""] : [spec.slice(0, i), spec.slice(i)] }
const relResolve = (importer, spec) =>
  spec[0] === "/" ? spec
    : new URL(spec, "https://_" + importer.slice(0, importer.lastIndexOf("/")) + "/").pathname

function run(files, entry) {
  const moduleCache = {}
  const resolve = relResolve
  const graph = createModuleGraph({
    moduleCache,
    resolve,
    getFile: id => Promise.resolve({ type: ".mjs", getContentData: () => {
      if (!(id in files)) throw new Error("404 " + id)
      return files[id]
    } }),
    isProd: true,
    addStyle() {},
    log() {},
    cache: createPersistentCache(),
  })
  return graph.loadModule(entry)
}

// sucrase live-binding getters + register-before-load must carry this; the old de-barreler rewrote it
test("export* barrel <-> leaf cycle", async () => {
  const mod = await run({
    "/main.js": `import { leafVal, fromBarrel } from "/barrel.js"; export const ok = leafVal + fromBarrel`,
    "/barrel.js": `export * from "/leaf.js"; export const fromBarrel = 1`,
    "/leaf.js": `import { fromBarrel } from "/barrel.js"; export const leafVal = 10; export const usesBarrel = () => fromBarrel`,
  }, "/main.js")
  assert.strictEqual(mod.ok, 11, "export* cycle failed, got " + mod.ok)
})

test("mixed default + named cyclic import between two modules", async () => {
  const mod = await run({
    "/main.js": `import { aJoin } from "/a.js"; import { bJoin } from "/b.js"; export const ok = aJoin() + "|" + bJoin()`,
    "/a.js": `import B, { bName } from "/b.js"; export default "A"; export const aName = "a"; export const aJoin = () => B + bName`,
    "/b.js": `import A, { aName } from "/a.js"; export default "B"; export const bName = "b"; export const bJoin = () => A + aName`,
  }, "/main.js")
  assert.strictEqual(mod.ok, "Bb|Aa", "mixed default+named cycle failed, got " + mod.ok)
})

// regression: the original ACCENTS bug — export * of a constants leaf through a cyclic barrel
test("export* of constants leaf through a cyclic barrel", async () => {
  const mod = await run({
    "/main.js": `import { ACCENT, brand } from "/index.js"; export const ok = brand() + ":" + ACCENT`,
    "/index.js": `export * from "/consts.js"; export const brand = () => "bng"`,
    "/consts.js": `import { brand } from "/index.js"; export const ACCENT = "red"; export const greet = () => brand()`,
  }, "/main.js")
  assert.strictEqual(mod.ok, "bng:red", "export* of constants in cycle failed, got " + mod.ok)
})

// routing to the leaf drops the barrel edge, so an eager consumer mid-cycle doesn't see undefined
test("de-barrel routes a named import to its concrete leaf", async () => {
  const files = {
    "/svc/index.js": `export * from "/svc/events.js"\nexport { default as Focus } from "/dirs/focus.js"`,
    "/svc/events.js": `export const EVENTS = { a: 1 }`,
    "/dirs/focus.js": `export default {}`,
  }
  const { debarrel } = createDebarrel({
    resolve: relResolve,
    splitQuery,
    readSource: async abs => { if (!(abs in files)) throw new Error("404 " + abs); return files[abs] },
  })
  const out = await debarrel(`import { EVENTS } from "/svc/index.js"`, "/dirs/focus.js")
  assert.ok(/from\s*"\/svc\/events\.js"/.test(out), "de-barrel should route EVENTS to its leaf, got: " + out)
  assert.ok(!/from\s*"\/svc\/index\.js"/.test(out), "de-barrel should drop the barrel import, got: " + out)
})
