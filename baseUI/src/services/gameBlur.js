import { lua } from "@/bridge"
import { uniqueId } from "@/services/uniqueId"

const EXT_STATE = {
  unloaded: 0,
  loading: 1,
  loaded: 2,
}
let extState = EXT_STATE.unloaded
let applyBlurQueued = false

const blurRegionList = {}

const sendBlurListToLua = () => lua.extensions.ui_gameBlur.replaceGroup("uiBlur", blurRegionList)

function applyBlur() {
  if (!window.beamng?.ingame) return

  // we're loading blur extension
  if (extState === EXT_STATE.loading) return

  const isEmpty = !Object.keys(blurRegionList).length

  if (extState === EXT_STATE.unloaded) {
    if (!isEmpty) {
      // not loaded, and not empty - load and then apply
      extState = EXT_STATE.loading
      lua.extensions.load("ui_gameBlur").then(() => {
        extState = EXT_STATE.loaded
        // regions may have been added/removed while loading - re-evaluate (unloads if now empty)
        applyBlur()
      })
    }
  } else {
    if (isEmpty) {
      // unload if it's loaded and empty
      // might be thread unsafe if load gets called right away
      lua.extensions.unload("ui_gameBlur")
      extState = EXT_STATE.unloaded
    } else {
      // send blur areas if loaded and not empty
      sendBlurListToLua()
    }
  }
}

function queueApplyBlur() {
  if (applyBlurQueued) return
  applyBlurQueued = true
  requestAnimationFrame(() => {
    applyBlurQueued = false
    applyBlur()
  })
}

export default {
  register(coord) {
    if (coord === null || !Array.isArray(coord)) throw new Error(`Cannot register blur with coordinates: ${coord}`)
    const id = uniqueId("blur")
    blurRegionList[id] = coord
    queueApplyBlur()
    return id
  },
  unregister(id) {
    if (id in blurRegionList) {
      delete blurRegionList[id]
      queueApplyBlur()
    }
  },
  update(id, coord) {
    if (!(id in blurRegionList)) throw new Error(`Trying to update blur with an ID that is not registered: ${id} (of ${Object.keys(blurRegionList)})`)
    blurRegionList[id] = coord
    queueApplyBlur()
  }
}
