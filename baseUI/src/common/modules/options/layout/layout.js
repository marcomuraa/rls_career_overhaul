import { getURL, getFile } from "@/utils"
import logger from "@/services/logger"
import { isShipping } from "bng:config"
import { SCHEMA_REV, createCategory, createItem } from "./schema"
import bundledLayout from "bng:options-layout"
import { LAYOUT_URL, LAYOUT_DEV_URL, BUNDLE_LAYOUT } from "../config"
import {
  devKey,
  devItemIdKey,
  clone,
  mergeDevLayoutItems,
  normaliseLayoutData as normaliseLayoutDataCore,
  splitLayoutData,
  genEmptyLayout as genEmptyLayoutBase,
  genRevision,
} from "./layout-core"

const genEmptyLayout = () => genEmptyLayoutBase(SCHEMA_REV)

export { devKey, devItemIdKey, clone, genRevision, mergeDevLayoutItems, genEmptyLayout }

export async function loadLayout(devmode = false) {
  // in production with bundled layout, use the virtual module
  if (!devmode && BUNDLE_LAYOUT) return bundledLayout

  let layout = null
  const qs = devmode ? "?nocache=" + Date.now() : ""
  try {
    const resp = await getFile(getURL(LAYOUT_URL + qs))
    layout = JSON.parse(resp)
  } catch (err) {
    logger.error(err)
    return null
  }
  // if non-vuedev non-shipping build, attempt to download dev data
  let devData = {}
  if (devmode || !isShipping()) {
    try {
      const resp = await getFile(getURL(LAYOUT_DEV_URL + qs))
      devData = JSON.parse(resp)
    } catch (err) {
      logger.warn(err)
    }
  }
  layout.items = mergeDevLayoutItems(layout.items, devData)
  return layout
}

export function normaliseLayoutData(sourceData, schemaRev = SCHEMA_REV) {
  return normaliseLayoutDataCore(sourceData, {
    schemaRev,
    createCategory,
    createItem,
    genEmptyLayout,
  })
}

export function splitLayout(layout) {
  return splitLayoutData(layout)
}
