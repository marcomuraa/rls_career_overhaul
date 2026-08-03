import { ref } from "vue"
import { defineStore } from "pinia"

export const useOptionsControlsStore = defineStore("optionsControls", () => {
  const selectedBinding = ref(null)
  const isNewBinding = ref(false)
  const updateBindingDetails = ref(false)

  function setSelectedBinding(binding) {
    selectedBinding.value = binding
  }

  return {
    selectedBinding,
    isNewBinding,
    updateBindingDetails,
    setSelectedBinding,
  }
})
