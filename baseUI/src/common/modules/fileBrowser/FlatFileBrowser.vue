<template>
  <div
    ref="rootRef"
    v-bng-scoped-nav="scopeBinding"
    class="flat-file-browser"
    :class="{
      'is-loading': loading,
      'is-empty': !loading && !resolvedItems.length,
    }"
    @activate="focusDefaultRowSoon()"
    @focusout="onFocusOut"
    @mouseleave="emit('clear-focus')"
  >
    <slot></slot>

    <slot v-if="loading" name="loading">
      <div class="flat-file-browser__state">
        {{ loadingLabel }}
      </div>
    </slot>

    <slot v-else-if="!resolvedItems.length" name="empty">
      <div class="flat-file-browser__state">
        <span class="flat-file-browser__state-label">{{ emptyLabel }}</span>
        <span v-if="emptyMessage" class="flat-file-browser__state-message">{{ emptyMessage }}</span>
      </div>
    </slot>

    <div
      v-else-if="navigationEnabled"
      class="flat-file-browser__rows"
      v-bng-ui-nav-scroll.force
      v-bng-on-ui-nav:focus_u,focus_d,focus_l,focus_r,focus_ud,focus_lr.focusRequired="unscopedNavigationHandler"
      bng-nav-scroll
    >
      <FlatFileBrowserRow
        v-for="item in resolvedItems"
        :key="item.key"
        :item="item"
        :autofocus="item.key === autofocusRowKey"
        :selected="item.key === selectedKey"
        :active="item.key === interactionKey"
        :focused="item.key === focusedKey"
        :navigation-enabled="navigationEnabled"
        :use-hold="useHold"
        :use-double-click="useDoubleClick"
        @focus="onRowFocus"
        @blur="onRowBlur"
        @hover="onRowHover"
        @leave="onRowLeave"
        @default-action="emit('default-action', $event)"
        @action="emit('action', $event)"
        @hold-press="emit('hold-press', $event)"
        @hold-release="emit('hold-release', $event)"
        @doubleclick="emit('doubleclick', $event)"
      />
      <slot name="after-rows"></slot>
    </div>
    <div
      v-else
      class="flat-file-browser__rows"
      bng-nav-scroll
    >
      <FlatFileBrowserRow
        v-for="item in resolvedItems"
        :key="item.key"
        :item="item"
        :autofocus="item.key === autofocusRowKey"
        :selected="item.key === selectedKey"
        :active="item.key === interactionKey"
        :focused="item.key === focusedKey"
        :navigation-enabled="false"
        @focus="onRowFocus"
        @blur="onRowBlur"
        @hover="onRowHover"
        @leave="onRowLeave"
        @default-action="emit('default-action', $event)"
        @action="emit('action', $event)"
      />
      <slot name="after-rows"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { vBngOnUiNav, vBngScopedNav, vBngUiNavScroll } from "@/common/directives"
import useControls from "@/services/controls"
import { useScopedNav } from "@/services/scopedNav/api"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import { popupsView } from "@/services/popup"
import { handleUINavEvent as sendToCrossfire } from "@/services/crossfire"
import FlatFileBrowserRow from "./FlatFileBrowserRow.vue"

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  loadingLabel: {
    type: String,
    default: "Loading files...",
  },
  emptyLabel: {
    type: String,
    default: "No files found",
  },
  emptyMessage: {
    type: String,
    default: "",
  },
  modelValue: {
    type: [String, Number],
    default: undefined,
  },
  activeKey: {
    type: [String, Number],
    default: undefined,
  },
  scopeId: {
    type: String,
    default: "",
  },
  scopeOptions: {
    type: Object,
    default: () => ({}),
  },
  autofocusFirstItem: {
    type: Boolean,
    default: true,
  },
  // do autofocus (and scroll to) the row with this key instead of the first item
  autofocusKey: {
    type: [String, Number],
    default: undefined,
  },
  navigationEnabled: {
    type: Boolean,
    default: true,
  },
  useHold: { // see FlatFileBrowserRow.vue for details
    type: Boolean,
    default: false,
  },
  useDoubleClick: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "focus-item", "hover-item", "clear-focus", "default-action", "action", "hold-press", "hold-release", "doubleclick"])

const rootRef = ref(null)
const focusedKey = ref(null)
const hoveredKey = ref(null)
const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)
const { requestScopeFocus } = useScopedNav()
const resolvedItems = computed(() => Array.isArray(props.items) ? props.items.filter(item => item && item.key !== undefined) : [])
const selectedKey = computed(() => props.modelValue ?? props.activeKey)
const autofocusRowKey = computed(() => {
  const items = resolvedItems.value
  if (props.autofocusKey !== undefined) {
    if (selectedKey.value !== undefined && items.some(item => item.key === selectedKey.value)) {
      return selectedKey.value
    }
    if (items.some(item => item.key === props.autofocusKey)) {
      return props.autofocusKey
    }
  }
  return props.autofocusFirstItem ? items[0]?.key : undefined
})
const interactionKey = computed(() => focusedKey.value ?? hoveredKey.value ?? null)
const scopeBinding = computed(() => props.scopeId
  ? {
      scopeId: props.scopeId,
      type: SCOPE_TYPES.NORMAL,
      preferAutoFocus: true,
      ...props.scopeOptions,
    }
  : null)

function onRowFocus(item) {
  focusedKey.value = item.key
  emit("focus-item", item)
}

function onRowBlur(item) {
  if (focusedKey.value === item.key) focusedKey.value = null
}

function onRowHover(item) {
  hoveredKey.value = item.key
  emit("hover-item", item)
}

function onRowLeave(item) {
  if (hoveredKey.value === item.key) hoveredKey.value = null
  emit("clear-focus")
}

function unscopedNavigationHandler(event) {
  if (props.scopeId) return true
  sendToCrossfire(event)
  return false
}

async function scrollAutofocusIntoView() {
  if (props.loading) return
  const key = props.autofocusKey
  if (key === undefined || key === null || key === "") return
  if (autofocusRowKey.value !== key) return
  await nextTick()
  await waitForAnimationFrame()
  const container = rootRef.value
  if (!container) return
  const el = container.querySelector("[bng-scoped-nav-autofocus=\"true\"]")
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "center", inline: "nearest" })
  }
}

watch(
  () => props.autofocusKey,
  () => scrollAutofocusIntoView(),
  { flush: "post", immediate: true }
)

function onFocusOut(event) {
  if (event.relatedTarget instanceof Node && rootRef.value?.contains(event.relatedTarget)) return
  focusedKey.value = null
  emit("clear-focus")
}

watch(
  [isControllerUsed, () => props.loading, () => resolvedItems.value.length],
  ([controllerUsed, loading, itemCount]) => {
    if (!controllerUsed || loading || itemCount === 0) return
    focusDefaultRowSoon("flat-file-browser-items-ready")
  },
  { flush: "post" }
)

function hasFocusedChild() {
  const activeElement = document.activeElement
  return activeElement instanceof Node && rootRef.value?.contains(activeElement) && activeElement !== rootRef.value
}

function hasModalPopup() {
  return !!popupsView.popups
}

async function focusDefaultRowSoon(reason = "flat-file-browser-activate") {
  if (!props.scopeId || hasModalPopup() || hasFocusedChild()) {
    return
  }
  await nextTick()
  await waitForAnimationFrame()
  if (hasModalPopup() || hasFocusedChild()) {
    return
  }
  requestScopeFocus(props.scopeId, "[bng-scoped-nav-autofocus]", { reason })
}

function waitForAnimationFrame() {
  return typeof window === "undefined" || typeof window.requestAnimationFrame !== "function"
    ? Promise.resolve()
    : new Promise(resolve => window.requestAnimationFrame(resolve))
}
</script>

<style lang="scss" scoped>
.flat-file-browser {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  gap: 0.25rem;
  overflow: visible;
}

.flat-file-browser__rows {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  padding: 0.125em;
}

.flat-file-browser__state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 1rem;
  color: var(--bng-cool-gray-100);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.35);
  border-radius: var(--bng-corners-1);
}

.flat-file-browser__state-label {
  color: var(--bng-off-white);
  font-weight: 600;
}

.flat-file-browser__state-message {
  color: var(--bng-cool-gray-200);
}
</style>
