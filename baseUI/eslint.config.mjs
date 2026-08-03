import { defineConfig } from "eslint/config"
import js from "@eslint/js"
import vue from "eslint-plugin-vue"
import beamng from "lint-plugin-beamng"
import babelParser from "@babel/eslint-parser"
import vueParser from "vue-eslint-parser"

export default defineConfig([
  {
    ignores: [
      "node_modules",
      "dist",
    ],
  },

  js.configs.recommended,

  ...vue.configs["flat/essential"],

  {
    plugins: {
      vue,
      beamng,
    },
    settings: {
      "bng-import-resolver": {
        alias: {
          map: [["@", "./src"]],
          extensions: [".mjs", ".cjs", ".js", ".ts", ".jsx", ".tsx", ".vue", ".json"],
        },
      },
    },

    languageOptions: {
      globals: {
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        fetch: "readonly",
        XMLHttpRequest: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Document: "readonly",
        Node: "readonly",
        Element: "readonly",
        HTMLElement: "readonly",
        SVGElement: "readonly",
        Image: "readonly",
        OffscreenCanvas: "readonly",
        createImageBitmap: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        Event: "readonly",
        EventTarget: "readonly",
        CustomEvent: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        DOMParser: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        PointerEvent: "readonly",
        performance: "readonly",
        "vue/setup-compiler-macros": true,
        bngApi: "readonly",
        beamng: "readonly",
        __BNG_DEV__: "readonly",
        __BNG_RT__: "readonly",
        __BNG_RT_DEV__: "readonly",
      },
    },

    rules: {
      "vue/multi-word-component-names": "off",
      "vue/require-v-for-key": "off",
      "vue/no-mutating-props": "off",
      "vue/no-setup-props-destructure": "off",
      "vue/no-dupe-keys": "warn",
      "no-alert": "error",
      "no-unused-vars": ["warn", {
        "varsIgnorePattern": "^_$",
        "caughtErrors": "none",
      }],
      "no-fallthrough": "off",
      "no-empty": "off",
      "no-control-regex": "off",
      "no-var": "error",
      "beamng/import-no-unresolved": ["error", {
        "caseSensitive": true,
        "caseSensitiveStrict": true,
        "ignore": [
          "^bng:",
          "^rollup-plugin-visualizer$", // esm not supported
        ],
      }],
    },
  },

  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      parser: babelParser, // Default parser for JS files
      parserOptions: {
        requireConfigFile: false,
        sourceType: "module",
      },
    },
  },

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: babelParser,
        requireConfigFile: false,
        sourceType: "module",
      },
    },
    rules: {
      "beamng/vue-template-operators": "error",
    },
  },

  {
    files: ["src/bridge/LuaFunctionSignatures.js"],
    rules: {
      "beamng/lua-signatures": "error",
      "no-unused-vars": ["warn", {
        "varsIgnorePattern": "^_$",
        "caughtErrors": "none",
        "args": "none",
      }],
    },
  },
])
