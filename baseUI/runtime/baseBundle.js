import { ROOT_PATH } from "./config.js"

const reg = import.meta.glob(
  [
    "/src/**/*.{js,mjs,ts,vue,json}",
    "/generated/**/*.{js,mjs,ts,vue,json}",
    "!/src/modules/**",
    "!/src/embed/**",
    "!/src/tests/**",
    "!/src/**/demos/**",
    "!/src/**/*.dev.*",
    "!/src/**/*.{spec,test}.{js,mjs,ts}",
    "!/src/**/* copy.*",
    "!/src/**/vite-plugin.js",
    "!/src/**/layout/editor-server.js",
    "!/src/**/layout/build-validator.js",
  ],
  { eager: true },
)

const base = {}
for (const [k, m] of Object.entries(reg)) {
  // glob keys are "/src/x"; loader keys under "/ui/ui-vue". __esModule tag is needed for the loader's CJS default-interop
  base[ROOT_PATH + k.replace(/^\//, "")] = { ...m, __esModule: true }
}

window.__bngBase = base
