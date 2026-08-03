import { optionsConfig } from "../../../../config.js" // don't import from virtual module, since this file is used before that

const { bundleLayout: BUNDLE_LAYOUT, bundleDevLayout: INCLUDE_DEV_LAYOUT, versions: VERSIONS } = optionsConfig
export { BUNDLE_LAYOUT, INCLUDE_DEV_LAYOUT, VERSIONS }

// when running in vuedev mode, set this to false to roughly mimic compiled mode
export const ALLOW_EDITOR = true

const layoutVuePath = "/ui/ui-vue" // full path from the root of the game (no trailing slash)
const layoutPath = "/src/modules/options/runtime/" // full path relative to the vue project
const layoutFileName = "layout.json"
const layoutDevFileName = "layout.dev.json"
export const LAYOUT_FILE = layoutPath + layoutFileName
export const LAYOUT_DEV_FILE = layoutPath + layoutDevFileName
export const LAYOUT_URL = layoutVuePath + layoutPath + layoutFileName
export const LAYOUT_DEV_URL = layoutVuePath + layoutPath + layoutDevFileName
