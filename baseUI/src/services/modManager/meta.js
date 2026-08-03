import { MODSLOTS_LIST } from "./slots"

/**
 * Processes the meta info stored in the script element.
 * @param {HTMLElement} script Script element reference
 * @param {string} dataid Assigned data ID for the component
 * @returns {HTMLElement} Meta information if any (always returns an object)
 */
export function procMeta(script, dataid) {
  script = script?.trim()
  const res = { dataid }
  if (!script || !script.includes("modInfo")) return res
  let meta = script
    .replace(/\/\*[\s\S]*?\*\//g, "") // remove comments
    .replace(/\/\/.*/g, "") // remove comments
    .match(/\s*modInfo\s*=\s*({[\s\S]*})/)?.[1]
  if (!meta) return res
  let openBraces = 0, closeBraces = 0, endIndex = 1
  for (let i = meta.indexOf("{"); i < meta.length; i++) {
    if (meta[i] === "{") openBraces++
    if (meta[i] === "}") {
      closeBraces++
      if (openBraces === closeBraces) {
        endIndex = i + 1
        break
      }
    }
  }
  meta = meta
    .substring(0, endIndex)
    .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
    .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":') // add quotes to keys

  try {
    meta = JSON.parse(meta)
    if (typeof meta !== "object") throw new Error("Metadata must be an object")
  } catch (err) {
    throw new Error("Failed to parse mod metadata (it must be simple, without variables, js templates, etc.)")
  }

  const fields = {
    uiSlots: val => Array.isArray(val) && val.every(v => typeof v === "string" /*&& UTILITY.MODSLOTS_LIST.includes(v)*/),
  }
  for (const field in fields) {
    if (field in meta) {
      if (!fields[field](meta[field])) throw new Error(`Invalid value in field ${field}`)
      res[field] = meta[field]
    }
  }
  if (res.uiSlots) {
    const unknown = res.uiSlots.filter(v => !MODSLOTS_LIST.includes(v))
    if (unknown.length > 0) {
      console.error(`Unknown UI slots: ${unknown.join(", ")}`)
    }
    res.uiSlots = res.uiSlots.filter(v => MODSLOTS_LIST.includes(v))
    if (res.uiSlots.length === 0) {
      delete res.uiSlots
    }
  }

  return res
}
