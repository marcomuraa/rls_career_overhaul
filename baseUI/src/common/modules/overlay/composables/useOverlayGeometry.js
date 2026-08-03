import { reactive, computed, watch, toValue } from "vue"

// reference identity prevents stale geometry after id-reusing reorders
export default function useOverlayGeometry(itemsSource, resolve, frame) {
  const committed = reactive({})
  const preview = reactive({})

  const items = computed(() => toValue(itemsSource) ?? [])

  function safeResolve(item, proposed) {
    const f = frame.value
    if (!f || !f.width || !f.height) {
      // not measured yet - keep last committed rather than return bogus px
      if (committed[item.id]) return committed[item.id]
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    const rect = resolve(item, proposed, f)
    if (!rect || typeof rect !== "object") {
      return committed[item.id] ?? { x: 0, y: 0, width: 0, height: 0 }
    }
    return {
      x: +rect.x || 0,
      y: +rect.y || 0,
      width:  Math.max(0, +rect.width  || 0),
      height: Math.max(0, +rect.height || 0),
    }
  }

  function rederive(item) {
    committed[item.id] = safeResolve(item, undefined)
    delete preview[item.id]
  }

  function rederiveAll() {
    const list = items.value
    const seen = new Set()
    for (const it of list) {
      if (!it || it.id == null) continue
      seen.add(it.id)
      rederive(it)
    }
    for (const k of Object.keys(committed)) {
      if (!seen.has(k)) delete committed[k]
    }
    for (const k of Object.keys(preview)) {
      if (!seen.has(k)) delete preview[k]
    }
  }

  watch(items, (next, prev) => {
    const prevById = new Map()
    if (Array.isArray(prev)) {
      for (const it of prev) if (it && it.id != null) prevById.set(it.id, it)
    }
    const seen = new Set()
    for (const it of next ?? []) {
      if (!it || it.id == null) continue
      seen.add(it.id)
      const before = prevById.get(it.id)
      if (before !== it) rederive(it)
    }
    for (const k of Object.keys(committed)) {
      if (!seen.has(k)) delete committed[k]
    }
    for (const k of Object.keys(preview)) {
      if (!seen.has(k)) delete preview[k]
    }
  }, { immediate: true, deep: false })

  watch(frame, () => {
    // during a drag the controller overwrites via setPreview() on the next tick anyway
    for (const it of items.value) rederive(it)
  })

  function clearPreview(id) {
    delete preview[id]
  }

  function setPreview(id, rectPx) {
    preview[id] = {
      x: +rectPx.x || 0,
      y: +rectPx.y || 0,
      width:  Math.max(0, +rectPx.width  || 0),
      height: Math.max(0, +rectPx.height || 0),
    }
  }

  function commit(id, rectPx) {
    committed[id] = {
      x: +rectPx.x || 0,
      y: +rectPx.y || 0,
      width:  Math.max(0, +rectPx.width  || 0),
      height: Math.max(0, +rectPx.height || 0),
    }
    delete preview[id]
  }

  function getGeometry(id) {
    return preview[id] ?? committed[id]
  }

  return {
    committed,
    preview,
    getGeometry,
    setPreview,
    clearPreview,
    commit,
    rederive,
    rederiveAll,
  }
}
