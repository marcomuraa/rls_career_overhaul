// persistent history

import { ref, toRaw } from "vue"
import logger from "@/services/logger"

const MAX_SNAPSHOTS = 20
const PRESERVE_SELECTION = false
const PRESERVE_CLIPBOARD = false

let layout = null
let save = null
let selectedItems = null
let clipItems = null
let currentIndex = -1 // current history position
const snapshots = [] // { action, snapshot }
const undoAction = ref("")
const redoAction = ref("")

const updateActionNames = () => {
  if (currentIndex > 0 && snapshots[currentIndex]) {
    undoAction.value = snapshots[currentIndex].action
  } else {
    undoAction.value = ""
  }
  if (currentIndex < snapshots.length - 1 && snapshots[currentIndex + 1]) {
    redoAction.value = snapshots[currentIndex + 1].action
  } else {
    redoAction.value = ""
  }
}

const restoreState = async () => {
  const step = snapshots[currentIndex]
  if (!step) return
  layout.value = JSON.parse(JSON.stringify(step.snapshot.layout))
  if (PRESERVE_SELECTION && step.snapshot.selectedItems) {
    selectedItems.value = new Set(step.snapshot.selectedItems)
  }
  if (PRESERVE_CLIPBOARD && "clipItems" in step.snapshot) {
    clipItems.value = step.snapshot.clipItems ? JSON.parse(JSON.stringify(step.snapshot.clipItems)) : []
  }
  updateActionNames()
  await save()
}

export default {
  undoAction,
  redoAction,

  connect: (layoutRef, selectedItemsRef, clipItemsRef, saveFunc) => {
    if (layout?.value) {
      const newLayout = JSON.stringify(toRaw(layoutRef.value))
      if (JSON.stringify(toRaw(layout.value)) !== newLayout) {
        logger.warn("Layout changed during history connection.")
        // TODO: find last snapshot that matches the new layout
        //       if it wasn't found, treat it as a new layout, moving currentIndex to the end
      }
    }
    layout = layoutRef
    selectedItems = selectedItemsRef
    clipItems = clipItemsRef
    save = saveFunc
    if (snapshots.length === 0) {
      const initialSnapshot = {
        layout: JSON.parse(JSON.stringify(toRaw(layout.value)))
      }
      if (PRESERVE_SELECTION) {
        initialSnapshot.selectedItems = Array.from(selectedItems.value)
      }
      if (PRESERVE_CLIPBOARD) {
        initialSnapshot.clipItems = clipItems.value ? JSON.parse(JSON.stringify(toRaw(clipItems.value))) : []
      }
      snapshots.push({ action: "initial", snapshot: initialSnapshot })
      currentIndex = 0
      updateActionNames()
    }
  },

  record: (actionName, mergeIfSame = false) => {
    if (currentIndex < snapshots.length - 1) snapshots.splice(currentIndex + 1)

    const snapshot = {
      layout: JSON.parse(JSON.stringify(toRaw(layout.value))),
    }

    if (PRESERVE_SELECTION) {
      snapshot.selectedItems = Array.from(selectedItems.value)
    }

    if (PRESERVE_CLIPBOARD) {
      snapshot.clipItems = clipItems.value ? JSON.parse(JSON.stringify(toRaw(clipItems.value))) : []
    }

    if (mergeIfSame && snapshots.length > 0 && snapshots[snapshots.length - 1].action === actionName) {
      snapshots[snapshots.length - 1].snapshot = snapshot
    } else {
      snapshots.push({ action: actionName, snapshot })
      currentIndex = snapshots.length - 1
    }

    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.shift()
      currentIndex--
    }

    updateActionNames()
  },

  undo: async () => {
    if (currentIndex <= 0) return
    currentIndex--
    await restoreState()
  },

  redo: async () => {
    if (currentIndex >= snapshots.length - 1) return
    currentIndex++
    await restoreState()
  }
}
