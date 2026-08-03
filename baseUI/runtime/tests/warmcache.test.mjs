import { test } from "node:test"
import assert from "node:assert"
import { createModuleGraph } from "../core/graph.js"

const relResolve = (importer, spec) =>
  spec[0] === "/" ? spec
    : new URL(spec, "https://_" + importer.slice(0, importer.lastIndexOf("/")) + "/").pathname

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

const files = { "/a.js": "export const x = 1" }
const mtimes = { "/a.js": 100 }
let fetches = 0
const getFile = async id => { fetches++; return { type: ".mjs", getContentData: () => files[id] } }

const cache = memCache()
const mk = () => createModuleGraph({
  moduleCache: {}, resolve: relResolve, getFile, isProd: true,
  addStyle() {}, log() {}, cache, mtimeOf: id => mtimes[id],
})

test("cold boot compiles once", async () => {
  const m = await mk().loadModule("/a.js")
  assert.strictEqual(m.x, 1)
  assert.strictEqual(fetches, 1, "cold boot should fetch+compile once, got " + fetches)
})

test("warm boot (fresh graph, same cache + modtime) skips fetch+compile", async () => {
  fetches = 0
  const m = await mk().loadModule("/a.js")
  assert.strictEqual(m.x, 1)
  assert.strictEqual(fetches, 0, "warm boot should reuse the record, got " + fetches + " fetches")
})

test("changed modtime invalidates the record and rebuilds from fresh source", async () => {
  mtimes["/a.js"] = 200
  files["/a.js"] = "export const x = 2"
  fetches = 0
  const m = await mk().loadModule("/a.js")
  assert.strictEqual(m.x, 2, "modtime change should pick up new source, got " + m.x)
  assert.strictEqual(fetches, 1, "modtime change should rebuild once, got " + fetches)
})

// HMR/manual reload can happen without the modtime moving, so invalidate must bypass the mtime gate
test("invalidate drops the persisted entry", () => {
  assert.ok(cache._map.has("/a.js"), "entry should be persisted")
  mk().invalidate("/a.js")
  assert.ok(!cache._map.has("/a.js"), "invalidate should drop the persisted entry")
})
