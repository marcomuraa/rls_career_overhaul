import { ref } from "vue"
import { useBridge } from "@/bridge"
import { getAssetURL, shuffleArray } from "@/utils"

export const UNOFFICIAL = Object.freeze({
  normal: getAssetURL("images/mainmenu/unofficial_version.jpg"),
  blur: getAssetURL("images/mainmenu/unofficial_version_blur.jpg"),
})

const toPosix = path => typeof path === "string" ? path.replace(/\\/g, "/") : ""
const ensureTrailingSlash = path => path.endsWith("/") ? path : path + "/"

const VUE_ASSETS_ROOT = toPosix(getAssetURL("/")).replace(/\/+$/, "")
const VUE_ASSETS_PREFIX = ensureTrailingSlash(VUE_ASSETS_ROOT)

const imageListCache = new Map()
let imageListEventsInitialised = false

const isRelatedPath = (changedPath, cachedPath) => {
  if (!changedPath || !cachedPath) return false
  const changed = toPosix(changedPath).replace(/\/+$/, "")
  const cached = toPosix(cachedPath).replace(/\/+$/, "")
  return changed === cached || changed.startsWith(cached + "/") || cached.startsWith(changed + "/")
}

const toLuaImagePath = (path, fromVueAssets) => {
  const normalised = toPosix(path)
  if (!fromVueAssets || !normalised) return normalised
  if (normalised === VUE_ASSETS_ROOT || normalised.startsWith(VUE_ASSETS_PREFIX) || normalised.startsWith("/")) {
    return normalised
  }
  return toPosix(getAssetURL(normalised))
}

const resolveImagePath = (path, fromVueAssets) => {
  if (!path) return null
  if (!fromVueAssets) return toPosix(path)
  return getAssetURL(toPosix(path))
}

const normaliseEntry = (entry, fromVueAssets) => {
  if (!entry || typeof entry !== "object") return null
  const result = {}
  if (entry.normal) result.normal = resolveImagePath(entry.normal, fromVueAssets)
  if (entry.blur) result.blur = resolveImagePath(entry.blur, fromVueAssets)
  return result.normal || result.blur ? result : null
}

const ensureImageListEvents = () => {
  if (imageListEventsInitialised) return
  imageListEventsInitialised = true
  const { events } = useBridge()
  events.on("UiImageListChanged", payload => {
    const changedPaths = Array.isArray(payload?.paths) ? payload.paths : []
    if (changedPaths.length === 0) return
    for (const state of imageListCache.values()) {
      if (changedPaths.some(changedPath => isRelatedPath(changedPath, state.path))) {
        state.refresh()
      }
    }
  })
}

const createImageListState = (path, fromVueAssets) => {
  const { lua } = useBridge()
  const luaPath = toLuaImagePath(path, fromVueAssets)
  const rawImages = ref([])
  const images = ref([])
  const match = ref(true)
  const randomQueue = ref([])
  let lastRandomImage = null

  const getMatchedImages = list => {
    if (!match.value) return list

    const both = list.filter(entry => entry.normal && entry.blur)
    if (both.length > 0) return both

    const normalOnly = list.filter(entry => entry.normal)
    if (normalOnly.length > 0) return normalOnly

    return list.filter(entry => entry.blur)
  }

  const updateImages = () => {
    images.value = getMatchedImages(rawImages.value)
    randomQueue.value = []
  }

  const refresh = async () => {
    const list = await lua.extensions.ui_uiMods.getImageList(luaPath)
    if (!Array.isArray(list)) {
      rawImages.value = []
      images.value = []
      return images.value
    }
    rawImages.value = list
      .map(entry => normaliseEntry(entry, fromVueAssets))
      .filter(Boolean)
    updateImages()
    return images.value
  }

  const getRandom = () => {
    if (images.value.length === 0) return null
    if (randomQueue.value.length === 0) {
      randomQueue.value = shuffleArray(Array.from(images.value), lastRandomImage)
    }
    const nextImage = randomQueue.value.shift() || null
    if (nextImage) lastRandomImage = nextImage
    return nextImage
  }

  return {
    path: luaPath,
    fromVueAssets,
    images,
    refresh,
    getRandom,
    get match() {
      return match.value
    },
    set match(value) {
      match.value = value !== false
      updateImages()
    },
  }
}

export function useImageList(path, fromVueAssets = true) {
  ensureImageListEvents()
  const cacheKey = `${toPosix(path)}|${fromVueAssets ? "assets" : "raw"}`
  if (!imageListCache.has(cacheKey)) {
    const state = createImageListState(path, fromVueAssets)
    imageListCache.set(cacheKey, state)
    state.refresh()
  }
  return imageListCache.get(cacheKey)
}
