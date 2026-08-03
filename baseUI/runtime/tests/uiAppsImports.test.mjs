import { test } from "node:test"
import assert from "node:assert"
import { transformSource } from "../app/appTransforms.js"

const FILE = "/ui/ui-vue/src/foo.js" // not a routes.js, so lazifyRoutes is skipped

test("named @/modules/apps import -> getUiAppComponent lookup + injected runtime import", () => {
  const out = transformSource('import { AppHost } from "@/modules/apps"\nexport const x = AppHost', FILE)
  assert.ok(out.includes('const AppHost = __bngGetUiAppComponent("AppHost");'), "named -> component lookup")
  assert.ok(out.includes('getUiAppComponent as __bngGetUiAppComponent } from "@/modules/apps/runtime"'), "runtime import injected")
  assert.ok(!/import\s+\{\s*AppHost\s*\}\s+from\s+"@\/modules\/apps"/.test(out), "original apps import removed")
})

test("aliased named import keeps the original app name as the lookup key", () => {
  const out = transformSource('import { AppHost as Host } from "@/modules/apps"', FILE)
  assert.ok(out.includes('const Host = __bngGetUiAppComponent("AppHost");'), "alias binds local, looks up original")
})

test("namespace @/modules/apps import -> getUiApps()", () => {
  const out = transformSource('import * as apps from "@/modules/apps"', FILE)
  assert.ok(out.includes("const apps = __bngGetUiApps();"), "namespace -> getUiApps()")
  assert.ok(out.includes('getUiApps as __bngGetUiApps } from "@/modules/apps/runtime"'), "getUiApps runtime import injected")
})

test("DEV_ONLY blocks are stripped in prod", () => {
  const code = [
    "export const keep = 1",
    "// DEV_ONLY >>",
    "export const devThing = 2",
    "// << DEV_ONLY",
    "export const alsoKeep = 3",
  ].join("\n")
  const out = transformSource(code, FILE)
  assert.ok(out.includes("keep"), "non-dev code kept")
  assert.ok(out.includes("alsoKeep"), "code after the block kept")
  assert.ok(!out.includes("devThing"), "DEV_ONLY body stripped in prod")
})

test("import.meta collapses to the prod stand-in", () => {
  const out = transformSource("export const dev = import.meta.env.DEV", FILE)
  assert.ok(!/import\.meta\b/.test(out), "no raw import.meta left")
  assert.ok(out.includes("DEV: false") && out.includes("PROD: true"), "prod env stand-in")
  assert.ok(out.includes("hot: false"), "hot disabled in prod")
})

test("unrelated imports are left untouched", () => {
  const code = 'import { ref } from "vue"\nimport Foo from "./Foo.js"'
  assert.strictEqual(transformSource(code, FILE), code)
})
