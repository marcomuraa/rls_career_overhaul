import { test } from "node:test"
import assert from "node:assert"
import { makeBaseTransforms } from "../baseTransforms.js"

const root = "/proj/ui/ui-vue"
const ct = makeBaseTransforms(root)

test("route glob collapses to {} (prod + dev spellings); unrelated globs untouched", () => {
  const prod = 'const routes = Object.entries(import.meta.glob("@/modules/*/routes.js", { eager: true, import: "default" }))'
  const dev = 'const routes = Object.entries(import.meta.glob("@/modules/*/routes(.dev)?.js", { eager: true, import: "default" }))'
  assert.ok(ct.transform(prod, root + "/src/router/index.js").includes("Object.entries({})"), "prod route glob -> {}")
  assert.ok(ct.transform(dev, root + "/src/router/index.js").includes("Object.entries({})"), "dev route glob -> {}")
  const other = 'const x = import.meta.glob("@/common/**/*.vue", { eager: true })'
  assert.strictEqual(ct.transform(other, root + "/src/foo.js"), other, "unrelated glob left untouched")
})

test("dynamic module import -> loadModule; vendor/base dynamic imports left for vite", () => {
  const file = root + "/src/services/modManager/compilers/script.js"
  const code = 'const X = defineAsyncComponent(() => import("@/modules/apps/components/AppHost.vue"))\nconst Y = () => import("@/services/foo.js")\nconst Z = () => import("vue")'
  const out = ct.transform(code, file)
  assert.ok(out.includes('window.__bngRuntime.loadModule("/ui/ui-vue/src/modules/apps/components/AppHost.vue")'), "module dynamic import -> loadModule")
  assert.ok(out.includes('import("@/services/foo.js")'), "base dynamic import left for vite")
  assert.ok(out.includes('import("vue")'), "vendor dynamic import left for vite")
})

test("static default .vue module import -> deferred async component; common/named/relative untouched", () => {
  const file = root + "/src/App.vue"
  const mod = 'import IExplorer from "@/modules/debug/components/IExplorer.vue"'
  const out = ct.transform(mod, file)
  assert.ok(
    out.includes('const IExplorer = window.__rtModules["vue"].defineAsyncComponent(() => window.__bngRuntime.loadModule("/ui/ui-vue/src/modules/debug/components/IExplorer.vue"))'),
    "static module .vue import -> deferred async component",
  )
  assert.ok(!out.includes("import IExplorer from"), "original static import removed")

  const common = 'import Popup from "@/common/modules/popup/views/Popup.vue"'
  assert.strictEqual(ct.transform(common, file), common, "base (common) .vue import left bundled")

  const named = 'import { photomodeEditing } from "@/modules/pause/views/photomode/useOverlays"'
  assert.strictEqual(ct.transform(named, file), named, "named/non-.vue module import left untouched")

  const relVue = 'import Foo from "./views/Foo.vue"'
  assert.strictEqual(ct.transform(relVue, root + "/src/common/x.js"), relVue, "relative base .vue import left bundled")
})
