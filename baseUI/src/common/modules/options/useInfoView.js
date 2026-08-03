import { ref } from "vue"

const defaultSort = (a, b) => String(a[0]).localeCompare(String(b[0]))

export function useInfoView(sort = defaultSort) {
  const infos = new Map()
  const infoView = ref([])

  function showInfo(id, text = undefined) {
    if (infos.has(id)) {
      if (text) {
        if (infos.get(id) === text) return
      } else {
        infos.delete(id)
      }
    } else if (!text) {
      return
    }

    if (text) infos.set(id, text)
    infoView.value = Array.from(infos.entries())
      .sort(sort)
      .map(([id, text]) => ({ id, text }))
  }

  return { infoView, showInfo }
}
