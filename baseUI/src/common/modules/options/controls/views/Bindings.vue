<template>
  <div class="bindings-container">
    <BngInput class="search-input" v-model="searchText" :leading-icon="icons.search" :label="$tt('ui.controls.searchAllBindings')" floating-label />

    <div class="bindings-list">
      <template v-if="categories.length > 0">
        <Accordion class="bindings-accordion">
          <AccordionItem
            v-for="category in categories"
            :key="category.key"
            :expanded="isCategoryExpanded(category.key)"
            navigable
            expand-hint-inline
            :primary-action="() => categoryToggleCollapse(category.key)"
            :expand-on-context="false"
            @expanded="expanded => setCategoryExpanded(category.key, expanded)"
          >
            <template #caption>
              <div class="category-caption">
                <div class="category-caption-main">
                  <BngIcon :type="category.icon" />
                  <span>{{ $tt(category.title) }}</span>
                  <span v-if="searchQuery">({{ $tt("ui.controls.searchMatches", { number: category.actions.length }) }})</span>
                </div>
              </div>
            </template>
            <template #controls>
              <div v-if="showIfController" class="category-caption-hint">
                <BngBinding controller ui-event="ok" />
              </div>
            </template>
            <div class="category-items">
              <template v-for="(item, itemIndex) in category.actions" :key="item.key">
                <BindingItem
                  :ref="component => setBindingItemRef(item.key, component)"
                  :action-key="item.key"
                  :active-row-key="activeRowKey"
                  :title="item.title"
                  :bindings="item.bindings"
                  :visible="itemIndex < getVisibleCount(category.key)"
                  @focusin="onHover(item)"
                  @focusout="onHover(null)"
                  @mouseenter="onHover(item)"
                  @mouseleave="onHover(null)"
                  @add-click="addBinding(item)"
                  @engage="onRowEngage"
                  @disengage="onRowDisengage"
                  @binding-click="binding => onBindingClicked(binding, item.key)"
                />
              </template>
            </div>
          </AccordionItem>
        </Accordion>

      </template>
      <div v-else class="no-results">
        <span class="no-results-text">No bindings found</span>
      </div>
    </div>

    <BngButton :icon-left="icons.undo" class="reset-button" @click="resetAllBindings()">{{ $tt("ui.controls.bindings.resetAll") }}</BngButton>
    <BngButton
      v-for="(ctrl, index) in controls.controllers"
      :key="index"
      :icon-left="icons.undo"
      class="reset-button"
      accent="secondary"
      @click="resetAllBindings(ctrl)"
    >
      {{ $tt("ui.controls.bindings.resetDevice", { productName: $tt(ctrl.productName) }) }}
    </BngButton>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onUnmounted, inject } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngButton, BngInput, BngIcon, icons } from "@/common/components/base"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { openConfirmation, addPopup } from "@/services/popup"
import { $content, $translate } from "@/services"
import { useScopedNav } from "@/services/scopedNav/api"
import { debounce } from "@/utils/rateLimit"
import { useBridge } from "@/bridge"
import { useOptionsControlsStore } from "@/common/modules/options/controls/optionsControls"
import useControls from "@/services/controls"
import EditBinding from "@/common/modules/options/controls/components/EditBinding.vue"
import BindingItem from "@/common/modules/options/controls/components/BindingItem.vue"
import MultistepBindingWizard from "@/common/modules/options/controls/components/editBinding/MultistepBindingWizard.vue"

const BINDINGS_INFO_ID = -1000

const INITIAL_VISIBLE_ACTIONS = 20
const VISIBLE_ACTIONS_CHUNK = 10

const categoriesExtras = {
  vehicle: {
    originalIcon: "directions_car",
    icon: icons.deliveryTruck,
  },
  general: {
    originalIcon: "language",
    icon: icons.language,
  },
  gameplay: {
    originalIcon: "extension",
    icon: icons.gearTuningOutline,
  },
  camera: {
    originalIcon: "videocam",
    icon: icons.cameraSideLeft,
  },
  menu: {
    originalIcon: "web",
    icon: icons.globe,
  },
  slowmotion: {
    originalIcon: "timer",
    icon: icons.timer,
  },
  replay: {
    originalIcon: "local_movies",
    icon: icons.movieCamera,
  },
  editor: {
    originalIcon: "editor",
    icon: icons.edit,
  },
  flowgraph: {
    originalIcon: "editor",
    icon: icons.edit,
  },
  debug: {
    originalIcon: "bug_report",
    icon: icons.bug,
  },
  vehicle_debug: {
    originalIcon: "settings",
    icon: icons.gearTuningOutline,
  },
}

const { api: bngApi } = useBridge()

const controlsStore = useOptionsControlsStore()
const { selectedBinding, isNewBinding, updateBindingDetails } = storeToRefs(controlsStore)

const controls = useControls()
const { categories: categoriesData, showIfController } = storeToRefs(controls)
const showInfo = inject("showInfo", null)
const $simplemenu = inject("$simplemenu", ref(false))
const scopedNav = useScopedNav()

const EDIT_BINDING_SCOPE_ID = "options-edit-binding-popup"
const POPUP_CLOSE_FOCUS_DELAY_MS = 240
const FOCUS_RESTORE_TIMEOUT_MS = 3000

const bindingItemRefs = new Map()
const activeRowKey = ref(null)

function setBindingItemRef(actionKey, component) {
  if (component) bindingItemRefs.set(actionKey, component)
  else bindingItemRefs.delete(actionKey)
}

function onRowEngage(actionKey) {
  activeRowKey.value = actionKey || null
}

function onRowDisengage(actionKey) {
  if (activeRowKey.value === actionKey) activeRowKey.value = null
}

function bindingKey(b) {
  return b ? `${b.devname}|${b.control}` : ""
}

function snapshotBindingKeys(actionKey) {
  const set = new Set()
  for (const b of controls.getAllBindingsForAction(actionKey) || []) set.add(bindingKey(b))
  return set
}

function findNewBinding(actionKey, beforeKeys) {
  for (const b of controls.getAllBindingsForAction(actionKey) || []) {
    if (!beforeKeys.has(bindingKey(b))) return b
  }
  return null
}

async function activateEditBindingPopupSoon() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 1000) {
    await nextTick()
    if (scopedNav.getScopeById(EDIT_BINDING_SCOPE_ID)) {
      await Promise.resolve(scopedNav.activateScope(EDIT_BINDING_SCOPE_ID, { force: true, reason: "bindings-edit" }))
      scopedNav.requestScopeFocus(EDIT_BINDING_SCOPE_ID, { force: true, activeOnly: false, reason: "bindings-edit" })
      return
    }
    await new Promise(r => window.requestAnimationFrame(r))
  }
}

async function waitForBindingItem(actionKey) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < FOCUS_RESTORE_TIMEOUT_MS) {
    await nextTick()
    const item = bindingItemRefs.get(actionKey)
    if (item) return item
    await new Promise(r => window.requestAnimationFrame(r))
  }
  return null
}

async function restoreBindingFocusAfterPopup(actionKey, target) {
  await new Promise(r => window.setTimeout(r, POPUP_CLOSE_FOCUS_DELAY_MS))
  const item = await waitForBindingItem(actionKey)
  if (!item) return
  if (target?.binding && item.focusBinding(target.binding)) return
  if (target?.beforeKeys) {
    const newBinding = findNewBinding(actionKey, target.beforeKeys)
    if (newBinding && item.focusBinding(newBinding)) return
    if (item.focusLastBinding?.()) return
  }
  item.focusRow?.()
}

const expandedCategories = ref({})
const visibleActionsByCategory = ref({})
let sharedRenderRafId = null

async function runEditBindingPopup(actionKey, target) {
  const popup = addPopup(EditBinding)
  activateEditBindingPopupSoon()
  try {
    const res = await popup.promise
    if (res) selectedBinding.value = res
  } catch (_) {
    // popup was closed/cancelled
  } finally {
    restoreBindingFocusAfterPopup(actionKey, target)
  }
}

async function runMultistepBindingWizard(actionKey, target) {
  const popup = addPopup(MultistepBindingWizard)
  try {
    const res = await popup.promise
    if (res?.success) controlsStore.setSelectedBinding(null)
  } catch (_) {
    // popup was closed/cancelled
  } finally {
    restoreBindingFocusAfterPopup(actionKey, target)
  }
}

async function onHover(binding) {
  if (!binding || !binding.desc || $translate.instant(binding.desc).trim() === "" || selectedBinding.value == binding) {
    showInfo?.(BINDINGS_INFO_ID)
  } else {
    showInfo?.(BINDINGS_INFO_ID, $content.bbcode.parse($translate.instant(binding.desc)))
  }
}

onUnmounted(() => showInfo?.(BINDINGS_INFO_ID))

function isCategoryExpanded(categoryKey) {
  return !!expandedCategories.value[categoryKey]
}

function setCategoryExpanded(categoryKey, expanded) {
  expandedCategories.value = {
    ...expandedCategories.value,
    [categoryKey]: expanded,
  }

  if (expanded) {
    startSharedRenderLoop()
  } else {
    visibleActionsByCategory.value[categoryKey] = INITIAL_VISIBLE_ACTIONS
  }
}

function onCategoryExpandRight(categoryKey) {
  if (!isCategoryExpanded(categoryKey)) {
    setCategoryExpanded(categoryKey, true)
    return false
  }
  return true
}

function onCategoryCollapseLeft(categoryKey) {
  if (isCategoryExpanded(categoryKey)) {
    setCategoryExpanded(categoryKey, false)
    return false
  }
  return true
}

function categoryToggleCollapse(categoryKey) {
  if (isCategoryExpanded(categoryKey)) {
    return onCategoryCollapseLeft(categoryKey)
  }

  return onCategoryExpandRight(categoryKey)
}

const searchText = ref("")
const searchQuery = ref(null)
let searchDebounce
watch(searchText, value => {
  if (searchDebounce) searchDebounce.cancel()
  const trimmed = value ? value.trim() : null
  if (!trimmed) {
    searchQuery.value = null
  } else {
    searchDebounce = debounce(() => (searchQuery.value = trimmed), 200)
    searchDebounce()
  }
})

const allowInSimplemenu = item => !$simplemenu.value || item.simplemenu !== false

const categories = computed(() => {
  const actionFilter = action => !searchQuery.value || $translate.instant(action.title).toLowerCase().includes(searchQuery.value.toLowerCase())
  const matchesActionFilters = action => allowInSimplemenu(action) && actionFilter(action)
  return Object.entries(categoriesData.value)
    .map(([key, category]) => ({
      ...category,
      key,
      icon: categoriesExtras[key]?.icon || icons.beamNG,
      actions: (category.actions || [])
        .filter(matchesActionFilters)
        .map(action => ({
          ...action,
          bindings: controls.getAllBindingsForAction(action.key),
        }))
        .sort((a, b) => a.order - b.order),
    }))
    .filter(category => allowInSimplemenu(category) && category.actions.length > 0)
    .sort((a, b) => a.order - b.order)
})

const getVisibleCount = categoryKey => visibleActionsByCategory.value[categoryKey] ?? INITIAL_VISIBLE_ACTIONS

const hasPendingVisibleRender = () => categories.value.some(category => {
  if (!isCategoryExpanded(category.key)) return false
  return getVisibleCount(category.key) < category.actions.length
})

function growVisibleCounters() {
  categories.value.forEach(category => {
    if (!isCategoryExpanded(category.key)) return

    const currentVisible = getVisibleCount(category.key)
    if (currentVisible >= category.actions.length) return

    visibleActionsByCategory.value[category.key] = Math.min(currentVisible + VISIBLE_ACTIONS_CHUNK, category.actions.length)
  })
}

function startSharedRenderLoop() {
  if (sharedRenderRafId !== null || !hasPendingVisibleRender()) return

  const tick = () => {
    sharedRenderRafId = null
    growVisibleCounters()
    if (hasPendingVisibleRender()) {
      sharedRenderRafId = window.requestAnimationFrame(tick)
    }
  }

  sharedRenderRafId = window.requestAnimationFrame(tick)
}

watch(categories, newCategories => {
  const availableCategoryKeys = new Set(newCategories.map(category => category.key))

  Object.keys(visibleActionsByCategory.value).forEach(categoryKey => {
    if (!availableCategoryKeys.has(categoryKey)) {
      delete visibleActionsByCategory.value[categoryKey]
    }
  })

  newCategories.forEach(category => {
    const currentVisible = getVisibleCount(category.key)
    if (isCategoryExpanded(category.key)) {
      visibleActionsByCategory.value[category.key] = Math.min(currentVisible, category.actions.length)
    } else {
      visibleActionsByCategory.value[category.key] = INITIAL_VISIBLE_ACTIONS
    }
  })

  startSharedRenderLoop()
}, { immediate: true })

onUnmounted(() => {
  if (searchDebounce) searchDebounce.cancel()
  if (sharedRenderRafId !== null) {
    window.cancelAnimationFrame(sharedRenderRafId)
    sharedRenderRafId = null
  }
})

const resetAllBindings = async ctrl => {
  const productNameDisplay = ctrl ? $translate.instant(ctrl.productName) : "All Devices"
  const message = $translate.instant("ui.controls.bindings.resetBody") + productNameDisplay
  const res = await openConfirmation($translate.instant("ui.controls.bindings.resetTitle"), message)
  if (!res) return

  const deviceNameArg = ctrl ? `"${ctrl.name}"` : ""
  bngApi.engineLua(`core_input_bindings.resetBindings(${deviceNameArg})`)

  selectedBinding.value = null
}

const onBindingClicked = async (binding, actionKey) => {
  isNewBinding.value = false
  updateBindingDetails.value = true
  controlsStore.setSelectedBinding(binding)
  const targetActionKey = actionKey || binding?.action
  runEditBindingPopup(targetActionKey, { binding })
}

const addBinding = async item => {
  isNewBinding.value = true
  updateBindingDetails.value = true
  controlsStore.setSelectedBinding({
    action: item.key,
    title: item.title,
    description: item.desc,
  })

  const hasDirection = item.direction !== undefined
    && item.direction !== null
    && item.direction !== ''

  const beforeKeys = snapshotBindingKeys(item.key)

  if (hasDirection) {
    runMultistepBindingWizard(item.key, { beforeKeys })
  } else {
    runEditBindingPopup(item.key, { beforeKeys })
  }
}

</script>

<style lang="scss" scoped>
.bindings-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  .search-input {
    margin-bottom: 0.5em;
  }
}

.bindings-list {
  flex: 1;
  overflow-y: auto;

  .bindings-accordion {

    padding: 0;

    :deep(.bng-accitem) {
      margin: 0 0 0.25rem;
    }

    :deep(.bng-accitem > .bng-accitem-caption) {
      background-color: rgba(var(--bng-cool-gray-750-rgb), 0.6);
      box-shadow: inset 0 0 0 1px rgba(var(--bng-cool-gray-600-rgb), 0);
      margin: 0;
      padding: 0.5rem 0.75rem 0.5rem 0.35rem;
      border-radius: var(--bng-corners-1);
      transition: none;
    }

    :deep(.bng-accitem:hover > .bng-accitem-caption) {
      background-color: rgba(var(--bng-cool-gray-700-rgb), 1);
    }

    :deep(.bng-accitem > .bng-accitem-caption.focus-visible:not(.no-focus-frame)) {
      background-color: var(--bng-orange-550);
    }

    :deep(.bng-accitem.bng-accitem-expanded > .bng-accitem-caption) {
      background-color: rgba(var(--bng-cool-gray-900-rgb), 1);
      box-shadow: inset 0 0 0 1px rgba(var(--bng-cool-gray-600-rgb), 0.35);
    }

    :deep(.bng-accitem > .bng-accitem-caption > .bng-accitem-caption-controls) {
      flex: 0 0 auto;
      overflow: visible;
      opacity: 0;
    }

    :deep(.bng-accitem > .bng-accitem-caption.focus-visible > .bng-accitem-caption-controls) {
      opacity: 1;
    }

    :deep(.bng-accitem > .bng-accitem-content) {
      padding-left: 0.5em;
    }
  }

  .category-caption {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .category-caption-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .category-caption-hint {
    display: inline-flex;
    align-items: center;
    padding-right: 0.2em;
    white-space: nowrap;
  }

  .category-items {
    // display: flex;
    // flex-direction: column;
    // gap: 0.25rem;
    padding: 0.25rem 0 0.5rem;
  }

  > .no-results {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    > .no-results-text {
      font-size: 1.5em;
      font-weight: 600;
    }
  }
}

.reset-button {
  max-width: unset;
}
</style>
