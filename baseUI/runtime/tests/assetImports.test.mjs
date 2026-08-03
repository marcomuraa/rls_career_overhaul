import { test } from "node:test"
import assert from "node:assert"
import { createModuleGraph } from "../core/graph.js"

// stub window so the lua backend degrades to in-memory rather than throwing under node
globalThis.window ??= {}

const relResolve = (importer, spec) =>
  spec[0] === "/" ? spec
    : new URL(spec, "https://_" + importer.slice(0, importer.lastIndexOf("/")) + "/").pathname

// mirrors pipeline.js's getFile: known asset extensions become ".asset" (url, no js/vue transform)
const ASSET_EXT = new Set([".png", ".svg"])
const files = {
  "/mods/foo/comp.js": `import icon from "/mods/foo/icon.png"; export const iconUrl = icon`,
}
function getFile(id) {
  const ext = id.slice(id.lastIndexOf("."))
  if (ASSET_EXT.has(ext)) return Promise.resolve({ type: ".asset", getContentData: () => id })
  return Promise.resolve({ type: ".mjs", getContentData: () => {
    if (!(id in files)) throw new Error("404 " + id)
    return files[id]
  } })
}

function mk() {
  return createModuleGraph({
    moduleCache: {},
    resolve: relResolve,
    getFile,
    isProd: true,
    addStyle() {},
    log() {},
    cache: { getData: async () => null, putData() {}, deleteData() {}, allocId: async () => 0 },
  })
}

test("an image import resolves to its served URL instead of failing to compile", async () => {
  const mod = await mk().loadModule("/mods/foo/comp.js")
  assert.strictEqual(mod.iconUrl, "/mods/foo/icon.png")
})

test("loading an asset module directly returns an __esModule-flagged default URL", async () => {
  const mod = await mk().loadModule("/mods/foo/icon.png")
  assert.strictEqual(mod.default, "/mods/foo/icon.png")
  assert.strictEqual(mod.__esModule, true)
})
