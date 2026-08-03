import { nextTick, onUnmounted, ref, watch } from "vue"

function getSegmentsKey(segments) {
  return Array.isArray(segments) ? segments.join("/") : ""
}

export default function useGridSelectorScroll({ currentPathSegments, gridScrollableContentElement }) {
  const scrollPositions = ref(new Map())
  let scrollTimeout = null
  let attachedElement = null
  let attachedScrollHandler = null

  function saveScrollPositionForSegments(segments) {
    if (!gridScrollableContentElement.value) return
    const pathKey = getSegmentsKey(segments)
    scrollPositions.value.set(pathKey, gridScrollableContentElement.value.scrollTop)
 }

  function saveScrollPositionForCurrentPath() {
    saveScrollPositionForSegments(currentPathSegments.value)
  }

  function debouncedSaveScrollPosition() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = setTimeout(() => {
      saveScrollPositionForCurrentPath()
    }, 100)
  }

  function restoreScrollPosition() {
    if (!gridScrollableContentElement.value) return
    const pathKey = getSegmentsKey(currentPathSegments.value)
    const savedPosition = scrollPositions.value.get(pathKey)
    if (savedPosition === undefined) return

    nextTick(() => {
      if (!gridScrollableContentElement.value) return
      gridScrollableContentElement.value.scrollTop = savedPosition
    })
  }

  function detachScrollListener() {
    if (!attachedElement || !attachedScrollHandler) {
      return
    }
    attachedElement.removeEventListener("scroll", attachedScrollHandler)
    attachedElement = null
    attachedScrollHandler = null
  }

  function attachScrollListener(element) {
    attachedElement = element
    attachedScrollHandler = () => {
      debouncedSaveScrollPosition()
    }
    element.addEventListener("scroll", attachedScrollHandler)
  }

  watch(
    gridScrollableContentElement,
    element => {
      detachScrollListener()
      if (element) {
        attachScrollListener(element)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    detachScrollListener()
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  return {
    restoreScrollPosition,
    saveScrollPositionForSegments,
  }
}
