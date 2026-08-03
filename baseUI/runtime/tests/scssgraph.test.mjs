import { test } from "node:test"
import assert from "node:assert"
import { createModuleGraph } from "../core/graph.js"

function memCache() {
  const m = new Map()
  let seq = 0
  return {
    async getData(name) { return m.get(name) },
    putData(name, fields) { m.set(name, { name, ...fields }) },
    deleteData(name) { m.delete(name) },
    async allocId() { return seq++ },
    _map: m,
  }
}

const partial = "/styles/_m.scss"
const cssId = "/a.css"
const mtimes = { [cssId]: 10, [partial]: 100 }
let builds = 0
const getFile = async () => { builds++; return { type: ".css", getContentData: () => ".x{}", scssDeps: [partial] } }

const cache = memCache()
const mk = () => createModuleGraph({
  moduleCache: {}, resolve: (i, s) => s, getFile, isProd: true,
  addStyle() {}, log() {}, cache, mtimeOf: id => mtimes[id],
})

test("cold build records the css->partial dependency", async () => {
  const g = mk()
  await g.loadModule(cssId)
  assert.strictEqual(builds, 1, "cold build should compile once, got " + builds)
  assert.deepStrictEqual(g.scssDependentsOf(partial), [cssId], "dependent should be registered")
})

test("warm boot (unchanged partial modtime) reuses + re-registers the dependent from the cache", async () => {
  builds = 0
  const g = mk()
  await g.loadModule(cssId)
  assert.strictEqual(builds, 0, "warm boot should reuse, got " + builds)
  assert.deepStrictEqual(g.scssDependentsOf(partial), [cssId], "dependent should re-register from cache hit")
})

test("changed partial modtime invalidates the dependent (its own modtime unchanged)", async () => {
  mtimes[partial] = 200
  builds = 0
  const g = mk()
  await g.loadModule(cssId)
  assert.strictEqual(builds, 1, "changed partial should rebuild its dependent, got " + builds)
})
