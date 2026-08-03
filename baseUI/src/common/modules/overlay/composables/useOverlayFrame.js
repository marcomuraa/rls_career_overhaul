import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"

export default function useOverlayFrame(source) {
  const el = ref(null)
  const width  = ref(0)
  const height = ref(0)

  const frame = computed(() => ({ width: width.value, height: height.value, element: el.value }))

  let observer = null

  function resolveElement() {
    if (!source) return null
    if (typeof source === "function") return source()
    if (typeof source === "object" && "value" in source) return source.value ?? null
    return source
  }

  function applyRect(rect) {
    if (!rect) {
      width.value  = 0
      height.value = 0
      return
    }
    const w = Math.max(0, Math.round(rect.width))
    const h = Math.max(0, Math.round(rect.height))
    if (w !== width.value)  width.value  = w
    if (h !== height.value) height.value = h
  }

  function attach(target) {
    detach()
    el.value = target ?? null
    if (!target) {
      applyRect(null)
      return
    }
    applyRect(target.getBoundingClientRect())
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          applyRect(entry.contentRect)
        }
      })
      observer.observe(target)
    }
  }

  function detach() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    el.value = null
  }

  onMounted(() => {
    attach(resolveElement())
  })

  if (source && typeof source === "object" && "value" in source) {
    watch(() => source.value, next => {
      attach(next ?? null)
    })
  }

  onBeforeUnmount(detach)

  function refresh() {
    if (el.value) applyRect(el.value.getBoundingClientRect())
  }

  return {
    el,
    width,
    height,
    frame,
    refresh,
    attach,
  }
}
