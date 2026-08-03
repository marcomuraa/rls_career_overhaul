import { $translate, $content } from "@/services"

const bug = "🐞" // bug! :)
const air = " " // narrow space

function parseLabelText(rawText) {
  let text = $translate.instant(rawText)
  let dynamic = false
  if (text.includes("[") && text.includes("]")) {
    text = $content.bbcode.parse(text)
    if (text.includes("<") && text.includes(">")) dynamic = true
  }
  return { text, dynamic }
}

export function computeItemLabel(itemData, { debugSetting = false } = {}) {
  if (!itemData?.label) {
    const captionExists = !!itemData?.caption
    const forceSpace = !captionExists && (itemData?.itemType === "heading" || itemData?.itemType === "text")
    return { text: forceSpace ? air : "", dynamic: false, present: false }
  }
  let { text, dynamic } = parseLabelText(itemData.label)
  if (debugSetting) text = bug + (text || "")
  if (text && /^\s*$/.test(text)) text = air
  return { text, dynamic, present: true }
}

export function buildRenderTooltip(itemData, disabled) {
  if (!itemData?.tooltip) {
    return { info: undefined, tooltip: undefined }
  }

  const info = $translate.instant(itemData.tooltip)
  return {
    info,
    tooltip: disabled ? undefined : {
      text: info,
      isBBCode: true,
      style: { "max-width": "30em" },
    },
  }
}

export function finalizeRenderData(itemData, debugSetting = false) {
  let dynamicLabel = false
  if (itemData.label) {
    itemData.label = $translate.instant(itemData.label)
    if (itemData.label.includes("[") && itemData.label.includes("]")) {
      itemData.label = $content.bbcode.parse(itemData.label)
      if (itemData.label.includes("<") && itemData.label.includes(">")) {
        dynamicLabel = true
      }
    }
  }

  let dynamicCaption = false
  if (itemData.caption) {
    itemData.caption = $translate.instant(itemData.caption)
    if (itemData.caption.includes("[") && itemData.caption.includes("]")) {
      itemData.caption = $content.bbcode.parse(itemData.caption)
      if (itemData.caption.includes("<") && itemData.caption.includes(">")) {
        dynamicCaption = true
      }
    }
  }

  if (debugSetting) {
    if (itemData.label) {
      itemData.label = bug + itemData.label
    } else {
      itemData.caption = bug + itemData.caption
    }
  }

  // force narrow space for elements that could shrink to zero when empty
  // note: don't trim, because it will take away some of the control over the label/caption
  if (!itemData.label && !itemData.caption) {
    if (itemData.itemType === "heading" || itemData.itemType === "text") {
      itemData.label = air
    }
  } else {
    // force narrow space if label/caption has only spaces
    if (itemData.label && /^\s*$/.test(itemData.label)) {
      itemData.label = air
    }
    if (itemData.caption && /^\s*$/.test(itemData.caption)) {
      itemData.caption = air
    }
  }

  return { dynamicLabel, dynamicCaption }
}

