import { icons } from "@/common/components/base"

const DEFAULT_SIZE = 450
const RADIAL_ICON_PATH = "/ui/modules/apps/RadialMenu/mods_icons/"
const MAX_IMAGE_CACHE_ENTRIES = 32
const MAX_CACHEABLE_DATA_IMAGE_LENGTH = 128 * 1024

const defaultState = Object.freeze({
  icon: "beamNG",
  label: "Select an option",
  price: "",
  hotkey: "",
  focused: false,
  color: null,
})

const defaultConfig = Object.freeze({
  iconSize: 0.15,
  labelSize: 0.05,
  hotkeySize: 0.04,
  lineSize: 0.0025,
  blockWidth: 0.5,
  blockHeight: 0.4,
  colors: {
    icon: "var(--bng-cool-gray-500)",
    label: "var(--bng-off-white)",
    line: "var(--bng-cool-gray-700)",
    hotkey: "#aaa",
    unfocusedColor: "var(--bng-cool-gray-500)",
    focusedColor: "var(--bng-off-white)",
  },
  fonts: {
    text: "var(--fnt-defs)",
    mono: "\"Noto Sans Mono\", var(--fnt-defs)",
    icon: "bngIcons",
  },
})

const imageExtensions = /\.(svg|png|jpe?g|webp)$/i

const mergeConfig = config => ({
  ...defaultConfig,
  ...config,
  colors: {
    ...defaultConfig.colors,
    ...(config && config.colors),
  },
  fonts: {
    ...defaultConfig.fonts,
    ...(config && config.fonts),
  },
})

const normalizeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback
  return String(value)
}

const normalizeState = state => {
  const src = state && typeof state === "object" ? state : {}
  return {
    icon: typeof src.icon === "string" && src.icon ? src.icon : defaultState.icon,
    label: normalizeText(src.label, defaultState.label),
    price: normalizeText(src.price, defaultState.price),
    hotkey: normalizeText(src.hotkey, defaultState.hotkey),
    focused: !!src.focused,
    color: typeof src.color === "string" && src.color ? src.color : null,
  }
}

const getIconGlyph = iconName => (iconName && icons[iconName] ? icons[iconName] : icons.beamNG).glyph

const isImageIcon = icon => {
  if (!icon || typeof icon !== "string") return false
  return icon.startsWith("/") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("data:image/") ||
    icon.startsWith("blob:") ||
    imageExtensions.test(icon)
}

const getImageSource = icon => {
  if (!isImageIcon(icon)) return null
  if (
    icon.startsWith("/") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("data:image/") ||
    icon.startsWith("blob:")
  ) {
    return icon
  }
  return RADIAL_ICON_PATH + icon
}

const shouldRetainImage = source =>
  !source.startsWith("blob:") &&
  !(source.startsWith("data:image/") && source.length > MAX_CACHEABLE_DATA_IMAGE_LENGTH)

const resolveCssValue = (element, value, fallback) => {
  if (!value || typeof value !== "string") return fallback
  if (!value.includes("var(")) return value
  if (!element || typeof window === "undefined" || typeof window.getComputedStyle !== "function") return fallback

  const style = window.getComputedStyle(element)
  let resolved = value
  for (let i = 0; i < 3 && resolved.includes("var("); i++) {
    resolved = resolved.replace(/var\((--[-\w]+)(?:,\s*([^)]+))?\)/g, (_match, name, cssFallback) => {
      const cssValue = style.getPropertyValue(name).trim()
      return cssValue || (cssFallback ? cssFallback.trim() : fallback)
    })
  }
  return resolved.trim() || fallback
}

const setFillStyle = (ctx, element, value, fallback) => {
  ctx.fillStyle = fallback
  ctx.fillStyle = resolveCssValue(element, value, fallback)
}

const setStrokeStyle = (ctx, element, value, fallback) => {
  ctx.strokeStyle = fallback
  ctx.strokeStyle = resolveCssValue(element, value, fallback)
}

const getFontFamily = (element, value, fallback) => resolveCssValue(element, value, fallback)

const ellipsizeText = (ctx, text, maxWidth) => {
  if (!text || ctx.measureText(text).width <= maxWidth) return text

  const ellipsis = "..."
  if (ctx.measureText(ellipsis).width > maxWidth) return ""

  let low = 0
  let high = text.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = text.slice(0, mid).trimEnd() + ellipsis
    if (ctx.measureText(candidate).width <= maxWidth) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return text.slice(0, low).trimEnd() + ellipsis
}

const wrapText = (ctx, text, maxWidth, maxLines) => {
  const normalized = normalizeText(text).replace(/\s+/g, " ").trim()
  if (!normalized) return []

  const words = normalized.split(" ")
  const lines = []
  let line = ""

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const candidate = line ? `${line} ${word}` : word

    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
      continue
    }

    if (line) {
      lines.push(line)
      line = word
    } else {
      lines.push(ellipsizeText(ctx, word, maxWidth))
      line = ""
    }

    if (lines.length === maxLines) {
      const remainder = [lines[lines.length - 1], line, ...words.slice(i + 1)].filter(Boolean).join(" ")
      lines[lines.length - 1] = ellipsizeText(ctx, remainder, maxWidth)
      return lines
    }

    if (line && ctx.measureText(line).width > maxWidth) {
      lines.push(ellipsizeText(ctx, line, maxWidth))
      line = ""
      if (lines.length === maxLines) return lines
    }
  }

  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines)
    visible[maxLines - 1] = ellipsizeText(ctx, lines.slice(maxLines - 1).join(" "), maxWidth)
    return visible
  }

  return lines
}

export default class RadialCenterCanvas {
  constructor(config = {}) {
    this.config = mergeConfig(config)
    this.state = { ...defaultState }
    this.canvas = null
    this.ctx = null
    this.width = 0
    this.height = 0
    this.dpr = 1
    this.renderVersion = 0
    this.resizeObserver = null
    this.windowResizeHandler = null
    this.imageCache = new Map()
  }

  create(canvas) {
    if (this.canvas === canvas) {
      this.resize()
      return
    }

    this.detach()
    if (!canvas || typeof canvas.getContext !== "function") return

    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.attachResizeHandlers()
    this.resize()
  }

  setState(state = {}) {
    this.state = normalizeState(state)
    this.renderVersion += 1
    this.draw()
  }

  resize() {
    if (!this.canvas || !this.ctx) return

    const rect = typeof this.canvas.getBoundingClientRect === "function"
      ? this.canvas.getBoundingClientRect()
      : null
    const cssWidth = Math.max(1, Math.round(this.canvas.clientWidth || rect?.width || DEFAULT_SIZE))
    const cssHeight = Math.max(1, Math.round(this.canvas.clientHeight || rect?.height || cssWidth || DEFAULT_SIZE))
    const dpr = Math.max(1, (typeof window !== "undefined" && window.devicePixelRatio) || 1)
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))

    if (
      this.width === cssWidth &&
      this.height === cssHeight &&
      this.dpr === dpr &&
      this.canvas.width === pixelWidth &&
      this.canvas.height === pixelHeight
    ) {
      return
    }

    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight

    this.width = cssWidth
    this.height = cssHeight
    this.dpr = dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    this.renderVersion += 1
    this.draw()
  }

  dispose() {
    this.detach()
    this.imageCache.clear()
  }

  attachResizeHandlers() {
    if (!this.canvas) return

    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.canvas)
    }

    if (typeof window !== "undefined") {
      this.windowResizeHandler = () => this.resize()
      window.addEventListener("resize", this.windowResizeHandler)
    }
  }

  detach() {
    this.renderVersion += 1

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.windowResizeHandler && typeof window !== "undefined") {
      window.removeEventListener("resize", this.windowResizeHandler)
      this.windowResizeHandler = null
    }

    this.canvas = null
    this.ctx = null
    this.width = 0
    this.height = 0
  }

  draw() {
    if (!this.canvas || !this.ctx) return

    const ctx = this.ctx
    const width = this.width || DEFAULT_SIZE
    const height = this.height || DEFAULT_SIZE
    const size = Math.min(width, height)
    const blockWidth = size * this.config.blockWidth
    const blockHeight = size * this.config.blockHeight
    const centerX = width / 2
    const top = height / 2 - blockHeight / 2
    const token = this.renderVersion

    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const iconSize = size * this.config.iconSize
    const labelSize = size * this.config.labelSize
    const priceSize = labelSize * 0.8
    const hotkeySize = size * this.config.hotkeySize
    const textFont = getFontFamily(this.canvas, this.config.fonts.text, "Overpass, sans-serif")
    const monoFont = getFontFamily(this.canvas, this.config.fonts.mono, "\"Noto Sans Mono\", monospace")
    const iconFont = getFontFamily(this.canvas, this.config.fonts.icon, "bngIcons")
    const iconColor = this.state.color ||
      (this.state.focused ? this.config.colors.focusedColor : this.config.colors.unfocusedColor)
    const labelColor = this.state.focused ? this.config.colors.focusedColor : this.config.colors.unfocusedColor
    const priceColor = this.config.colors.label

    this.drawIcon({
      ctx,
      icon: this.state.icon,
      color: iconColor,
      iconFont,
      centerX,
      centerY: top + iconSize * 0.55,
      size: iconSize,
      token,
    })

    const labelTop = top + iconSize + size * 0.03
    const labelLineHeight = labelSize * 1.15
    ctx.font = `500 ${labelSize}px ${textFont}`
    ctx.textBaseline = "top"
    setFillStyle(ctx, this.canvas, labelColor, "#d8d8d8")
    const labelLines = wrapText(ctx, this.state.label, blockWidth, 2)
    labelLines.forEach((line, index) => {
      ctx.fillText(line, centerX, labelTop + index * labelLineHeight)
    })

    let nextY = labelTop + Math.max(1, labelLines.length) * labelLineHeight + size * 0.018
    ctx.textBaseline = "middle"
    if (this.state.price) {
      ctx.font = `500 ${priceSize}px ${iconFont}, ${textFont}`
      setFillStyle(ctx, this.canvas, priceColor, "#ffffff")
      ctx.fillText(ellipsizeText(ctx, this.state.price, blockWidth), centerX, nextY + priceSize * 0.5)
      nextY += priceSize * 1.15
    }

    if (this.state.hotkey) {
      const lineY = Math.max(nextY + size * 0.012, top + blockHeight - hotkeySize * 1.8)
      const lineWidth = blockWidth * 0.8
      ctx.lineWidth = Math.max(1, size * this.config.lineSize)
      setStrokeStyle(ctx, this.canvas, this.config.colors.line, "#60636a")
      ctx.beginPath()
      ctx.moveTo(centerX - lineWidth / 2, lineY)
      ctx.lineTo(centerX + lineWidth / 2, lineY)
      ctx.stroke()

      ctx.font = `500 ${hotkeySize}px ${iconFont}, ${monoFont}`
      setFillStyle(ctx, this.canvas, this.config.colors.hotkey, "#aaaaaa")
      ctx.fillText(ellipsizeText(ctx, this.state.hotkey, lineWidth), centerX, lineY + hotkeySize * 0.85)
    }

    ctx.restore()
  }

  drawIcon({ ctx, icon, color, iconFont, centerX, centerY, size, token }) {
    const imageSource = icon in icons ? null : getImageSource(icon)
    if (imageSource) {
      const image = this.getImage(imageSource, token)
      if (image) {
        if (this.drawImageIcon(ctx, image, color, centerX, centerY, size)) return
      }
    }

    ctx.font = `${size}px ${iconFont}`
    setFillStyle(ctx, this.canvas, color || this.config.colors.icon, "#87909a")
    ctx.fillText(getIconGlyph(icon), centerX, centerY + size * 0.08)
  }

  drawImageIcon(ctx, image, color, centerX, centerY, size) {
    const imageWidth = image.naturalWidth || image.width || size
    const imageHeight = image.naturalHeight || image.height || size
    const scale = Math.min(size / imageWidth, size / imageHeight)
    const width = imageWidth * scale
    const height = imageHeight * scale
    const x = centerX - width / 2
    const y = centerY - height / 2

    ctx.save()
    try {
      ctx.drawImage(image, x, y, width, height)
      ctx.globalCompositeOperation = "source-in"
      setFillStyle(ctx, this.canvas, color || this.config.colors.icon, "#87909a")
      ctx.fillRect(x, y, width, height)
    } catch (_err) {
      ctx.restore()
      return false
    }
    ctx.restore()
    return true
  }

  getImage(source, token) {
    let entry = this.imageCache.get(source)
    if (!entry) {
      const image = new Image()
      entry = {
        image,
        loaded: false,
        failed: false,
        token,
      }
      this.imageCache.set(source, entry)

      // Only the newest render request may redraw when async image loading completes.
      image.onload = () => {
        entry.loaded = true
        if (entry.token === this.renderVersion && getImageSource(this.state.icon) === source) {
          this.draw()
        }
      }
      image.onerror = () => {
        entry.failed = true
        this.imageCache.delete(source)
        if (entry.token === this.renderVersion && getImageSource(this.state.icon) === source) {
          this.draw()
        }
      }
      image.src = source
      this.pruneImageCache()
    } else {
      this.imageCache.delete(source)
      this.imageCache.set(source, entry)
      entry.token = token
    }

    if (entry.loaded && !entry.failed) {
      const image = entry.image
      if (!shouldRetainImage(source)) this.imageCache.delete(source)
      return image
    }
    return null
  }

  pruneImageCache() {
    for (const [source, entry] of this.imageCache) {
      if (entry.failed || (entry.loaded && !shouldRetainImage(source))) {
        this.imageCache.delete(source)
      }
    }

    while (this.imageCache.size > MAX_IMAGE_CACHE_ENTRIES) {
      const oldestSource = this.imageCache.keys().next().value
      this.imageCache.delete(oldestSource)
    }
  }
}
