import { ref, computed, watch, toValue } from "vue"

export default function useOverlaySelection(itemsSource) {
  const selectedId = ref(null)

  const items = computed(() => toValue(itemsSource) ?? [])

  const selectedItem = computed(() => {
    if (selectedId.value == null) return null
    return items.value.find(it => it?.id === selectedId.value) ?? null
  })

  const selection = computed(() => (selectedItem.value ? [selectedItem.value] : []))

  watch(items, list => {
    if (selectedId.value == null) return
    const stillExists = list.some(it => it?.id === selectedId.value)
    if (!stillExists) selectedId.value = null
  }, { deep: false })

  function select(id) {
    const next = id == null ? null : String(id)
    if (selectedId.value === next) return
    selectedId.value = next
  }

  function clear() {
    select(null)
  }

  function isSelected(id) {
    return selectedId.value != null && selectedId.value === id
  }

  function onFrameBackgroundClick(event) {
    if (!event || event.target !== event.currentTarget) return
    clear()
  }

  return {
    selectedId,
    selectedItem,
    selection,
    select,
    clear,
    isSelected,
    onFrameBackgroundClick,
  }
}
