import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { LAYOUT_FILE, LAYOUT_DEV_FILE, INCLUDE_DEV_LAYOUT } from "../config.js"
import { SCHEMA_REV, createCategory, createItem } from "./schema.js"
import { mergeDevLayoutItems, normaliseLayoutData, splitLayoutData, genRevision, genEmptyLayout } from "./layout-core.js"

// from src/common/modules/options/layout up to the ui-vue project root (LAYOUT_FILE is project-relative)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..")
const layoutPath = path.resolve(rootDir, "." + LAYOUT_FILE)
const layoutDevPath = path.resolve(rootDir, "." + LAYOUT_DEV_FILE)

const readJSON = filePath => JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }))
const writeJSON = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: "utf8" })

export function validateOptionsLayoutOnBuild() {
  const main = readJSON(layoutPath)
  const devData = fs.existsSync(layoutDevPath) ? readJSON(layoutDevPath) : {}

  const mergedLayout = {
    ...main,
    items: mergeDevLayoutItems(main.items, devData),
  }

  const normalised = normaliseLayoutData(mergedLayout, {
    schemaRev: SCHEMA_REV,
    createCategory,
    createItem,
    genEmptyLayout,
  })

  const { layout: layoutMain, layoutDev } = splitLayoutData(normalised.layout)

  const changed = normalised.restored
    || JSON.stringify(main) !== JSON.stringify(layoutMain)
    || JSON.stringify(devData) !== JSON.stringify(layoutDev)

  if (changed) {
    layoutMain.revision = genRevision()
    writeJSON(layoutPath, layoutMain)
    writeJSON(layoutDevPath, layoutDev)
    console.log("\x1b[33m×\x1b[0m Options layout required normalisation and has been fixed.")
  } else {
    console.log("\x1b[32m✓\x1b[0m Options layout matches the current schema.")
  }

  if (INCLUDE_DEV_LAYOUT) {
    return {
      ...layoutMain,
      items: mergeDevLayoutItems(layoutMain.items, layoutDev),
    }
  } else {
    return layoutMain
  }
}
