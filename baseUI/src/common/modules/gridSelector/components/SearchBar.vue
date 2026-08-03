<template>
  <div class="search-container" :class="{ 'full-width': fullWidth }">
    <BngInput
      class="search-input"
      v-model="localSearchText"
      :placeholder="placeholder"
      @valueChanged="onSearchChanged"
      @keydown.enter="commitSearch"
      @blur="commitSearch"
      @focus="emit('focus-item', 'search')"
    />
    <div class="search-icon-container" @click="clearSearch"
    :class="{ 'active': localSearchText }">
      <BngIcon
        :type="icons.search"
        class="search-icon show-unhovered"
      />
      <BngIcon
        :type="icons.trashBin2"
        class="search-icon show-hovered"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from "vue"
import { BngIcon, BngInput, icons } from "@/common/components/base"
import { debounce } from "@/utils/rateLimit"

const props = defineProps({
  searchText: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: 'ui.menu.gridSelector.searchPlaceholder'
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  showClearAllButton: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  "focus-item",
  "clear-all",
  "search-text-change",
])

// searchText is now passed as a prop
const localSearchText = ref(props.searchText)

const debouncedSearchTextChange = debounce((value) => {
  emit("search-text-change", value)
}, 500)

// Sync localSearchText when searchText changes externally (e.g. clearing from outside)
watch(() => props.searchText, (newVal) => {
  localSearchText.value = newVal
})

// Search functionality
const clearSearch = () => {
  localSearchText.value = ""
  debouncedSearchTextChange.cancel()
  emit("search-text-change", "")
  emit("focus-item", "search")
}

const commitSearch = () => {
  debouncedSearchTextChange.cancel()
  emit("search-text-change", localSearchText.value)
}

const onSearchChanged = (value) => {
  localSearchText.value = value
  debouncedSearchTextChange(value)
  emit("focus-item", "search")
}

onUnmounted(() => {
  debouncedSearchTextChange.cancel()
})
</script>

<style scoped lang="scss">
.search-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  width: 100%;

  &.full-width {
    width: 100%;
  }

  .search-input {
    flex: 1;
    --input-height: 2.25rem;
  }
  :deep(.bng-input-container) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .search-icon {
    cursor: pointer;
    padding: 0.33rem;
    height: 2.25rem;
  }
  .search-icon-container {
    position: relative;
    width: 2.25rem;
    height: 2.25rem;
    margin-left: -0.5rem;
    background-color: rgba(255, 255, 255, 0.1);
    border-top-right-radius: var(--bng-corners-2);
    border-bottom-right-radius: var(--bng-corners-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-left: none;
    &.active {
      background-color: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-left: none;
    }
    &:hover {
      .show-unhovered {
        opacity: 0;
      }
      .show-hovered {
        opacity: 1;
      }
    }
  }
  .show-unhovered {
    position:absolute;
    top: 0;
    left: 0;
    opacity: 1;
  }
  .show-hovered {
    position:absolute;
    top: 0;
    left: 0;
    opacity: 0;
  }
}

.filter-toggle-icon {
  flex: 0 0 2.5rem;
  cursor: pointer;
  align-self: flex-start;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 2.5rem !important;
  width: 2.5rem !important;
  border-radius: var(--bng-corners-2);

  &.trash-icon {
    margin-left: auto;
  }
}
</style>
