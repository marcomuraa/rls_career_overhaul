import { test } from "node:test"
import assert from "node:assert"
import { transformSource } from "../app/appTransforms.js"

const ROUTE = "/ui/ui-vue/src/modules/demo/routes.js"

test("identifier echoed in a comment + string must NOT keep the view eager", () => {
  const code = [
    'import Pause from "./views/PauseShell.vue"',
    'import Computer from "./views/ComputerMain.vue"',
    "export default [",
    "  // Pause screen",
    "  { path: '/pause', name: 'pause', component: Pause },",
    "  // Computer",
    "  { path: '/computer', name: 'computer', component: Computer, meta: { label: 'Computer' } },",
    "]",
  ].join("\n")
  const out = transformSource(code, ROUTE)
  assert.ok(!/^[ \t]*import\s+Pause\s+from/m.test(out), "Pause static import removed despite comment")
  assert.ok(!/^[ \t]*import\s+Computer\s+from/m.test(out), "Computer static import removed despite comment + 'Computer' string")
  assert.ok(out.includes('component: window.__bngRuntime.lazyView(__filename, "./views/PauseShell.vue")'), "Pause lazified")
  assert.ok(out.includes('component: window.__bngRuntime.lazyView(__filename, "./views/ComputerMain.vue")'), "Computer lazified")
})

test("CRLF import lines lazify the same as LF", () => {
  const code = [
    'import MainMenu from "./views/MainMenu.vue"',
    "export default [",
    "  { path: '/menu', name: 'menu', component: MainMenu },",
    "]",
  ].join("\r\n")
  const out = transformSource(code, ROUTE)
  assert.ok(!/import\s+MainMenu\s+from/.test(out), "CRLF static import removed")
  assert.ok(out.includes('component: window.__bngRuntime.lazyView(__filename, "./views/MainMenu.vue")'), "CRLF view lazified")
})

test("a view referenced beyond `component:` (markRaw) stays eager", () => {
  const code = [
    'import Special from "./views/Special.vue"',
    "export default [",
    "  { path: '/x', name: 'x', component: Special, meta: { raw: markRaw(Special) } },",
    "]",
  ].join("\n")
  const out = transformSource(code, ROUTE)
  assert.ok(/import\s+Special\s+from/.test(out), "genuinely-reused view kept eager")
  assert.ok(!out.includes("lazyView"), "reused view not lazified")
})

test("only on-demand (src/modules) barrel imports warn", () => {
  const warnings = []
  const origWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(" "))
  try {
    transformSource('import { LiveryMain } from "@/modules/liveryEditor/views"\nexport default []', ROUTE) // on-demand barrel
    transformSource('import * as views from "./views"\nexport default []', ROUTE) // relative on-demand barrel
    transformSource([
      'import X from "./views/X.vue"',
      'import { CONST } from "@/services/infoBar.js"',
      'import { LayoutEmpty } from "@/common/layouts"', // bundled barrel - fine
      'import { ref } from "vue"',
      '// import Old from "@/modules/foo/views"',
      "export default []",
    ].join("\n"), ROUTE)
  } finally {
    console.warn = origWarn
  }
  assert.strictEqual(warnings.length, 2, "only the two on-demand barrel files warn")
  assert.ok(warnings[0].includes("@/modules/liveryEditor/views"), "named on-demand barrel reported")
  assert.ok(warnings[1].includes("./views"), "namespace on-demand barrel reported")
  assert.ok(warnings.every(w => w.includes("barrel")), "warning mentions barrels")
})
