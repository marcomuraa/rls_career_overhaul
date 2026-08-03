// enabled HMR in normal runtime bundle
export const RT_HMR_IN_PROD = true

// must start with exactly "data-v-"
export const SFC_SCOPE_PREFIX = "data-v-bng-"

export const ROOT_PATH = "/ui/ui-vue/"
export const GENERATED_PATH = "/ui/ui-vue/generated/"
export const SRC_PATH = "/ui/ui-vue/src/"
export const MODULES_PATH = "/ui/ui-vue/src/modules/"

// for lua FS discovery and watch
export const BUNDLE_INCLUDE = ["/ui/ui-vue/src/", "/ui/ui-vue/generated/"]
export const BUNDLE_EXCLUDE = ["/ui/ui-vue/src/modules/"]
export const STAT_EXTS = ["js", "mjs", "cjs", "vue", "scss", "css"]

// runtime constants that are evaluated at build time
export const RT_DEV = typeof __BNG_RT_DEV__ !== "undefined" && __BNG_RT_DEV__
export const SFC_IS_PROD = !RT_DEV
export const LOGS_ENABLED = RT_DEV
export const HMR_ENABLED = RT_DEV || RT_HMR_IN_PROD

// this setting controls the precompilation cache mode, which saves from a couple to tens of seconds of loading time
// "disabled"  - no persistence, every boot recompiles
// "indexeddb" - browser IndexedDB (recommended)
// "lua"       - util_datastore, one getEntry per module on demand
// "lua-all"   - util_datastore, one getAll bulk read primed on load (recommended)
// "lua-chain" - util_datastore, pulls a module's required-dep closure on demand via getChain (not recommended)
export const CACHE_MODE = "lua-all"
// export const CACHE_MODE = RT_DEV ? "indexeddb" : "disabled"

// to disable lua stat files because mtime is needed for cache only
export const CACHE_ENABLED = CACHE_MODE !== "disabled"
export const CACHE_ALL = CACHE_MODE === "lua-all"
export const CACHE_CHAIN = CACHE_MODE === "lua-chain"
