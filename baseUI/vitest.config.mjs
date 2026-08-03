import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// stubs for bng: virtual modules provided by vite plugins that vitest doesn't run
const BNG_VIRTUALS = {
  "bng:config": () => fs.readFileSync(path.resolve(__dirname, "config.js"), "utf8").replaceAll("__BNG_DEV__", "true"),
  "bng:options-layout": () => "export default null",
  "bng:options-runtime": () => "export const optionsRuntimeLayerIniters = []",
}
function bngVirtualsPlugin() {
  return {
    name: "bng-virtuals",
    enforce: "pre",
    resolveId(source) {
      if (source in BNG_VIRTUALS) return "\0" + source
    },
    load(id) {
      const key = id.startsWith("\0") ? id.slice(1) : null
      return key && key in BNG_VIRTUALS ? BNG_VIRTUALS[key]() : null
    },
  }
}

export default defineConfig(({ mode }) => {
  const isRuntime = mode === "runtime"

  return {
    plugins: [vue(), bngVirtualsPlugin()],
    define: {
      __BNG_DEV__: JSON.stringify(false),
      __BNG_RT__: JSON.stringify(isRuntime),
      __BNG_RT_DEV__: JSON.stringify(false),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    test: {
      include: ["src/tests/**/*.spec.js"],
      environment: "jsdom",
      setupFiles: ["src/tests/setup.js"],
      coverage: {
        exclude: ["src/assets/**", "src/styles/**"],
        reporter: ["text"],
      },
      onUnhandledError(error) {
        // unrelated demo components (e.g. base component barrel) can still be mid-import when a spec's jsdom environment tears down
        // that straggler throws after the fact and would fail the whole run despite every assertion passing
        if (error.name === "EnvironmentTeardownError") return false
      },
    },
  }
})
