<template>
  <div ref="rootRef" class="bng-tabs-root" :class="{ 'with-background': background }">
    <Tabs
      ref="tabsRef"
      class="bng-tabs"
      :selectedIndex="activeIndex"
      bng-no-nav
      @change="onTabChange"
    >
      <template #after-tab-list>
        <slot name="after-tab-list" />
      </template>
      <TabList :icon-only="iconOnly" :show-tooltips="showTooltips || iconOnly" :disabled="disabled">
        <template #before>
          <div v-if="showArrows" class="bng-tabs-side bng-tabs-side-start" bng-no-child-nav="true">
            <BngButton
              class="bng-tabs-arrow"
              :accent="ACCENTS.ghost"
              :disabled="disabled"
              bng-no-nav
              tabindex="-1"
              @click="goPrev"
            >
              <BngIcon :type="icons.arrowLargeLeft" />
              <BngBinding
                v-if="showBindings && useBindings"
                class="bng-tabs-binding"
                :ui-event="focusNav[0]"
                controller
              />
            </BngButton>
          </div>
        </template>
        <template #after>
          <div v-if="showArrows" class="bng-tabs-side bng-tabs-side-end" bng-no-child-nav="true">
            <BngButton
              class="bng-tabs-arrow"
              :accent="ACCENTS.ghost"
              :disabled="disabled"
              bng-no-nav
              tabindex="-1"
              @click="goNext"
            >
              <BngBinding
                v-if="showBindings && useBindings"
                class="bng-tabs-binding"
                :ui-event="focusNav[1]"
                controller
              />
              <BngIcon :type="icons.arrowLargeRight" />
            </BngButton>
          </div>
        </template>
      </TabList>
      <slot />
    </Tabs>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from "vue"
import { BngBinding, BngButton, ACCENTS, BngIcon, icons } from "@/common/components/base"
import { TabList, Tabs } from "@/common/components/utility"
import { vBngOnUiNav } from "@/common/directives"

defineOptions({ name: "BngTabs" })

const emit = defineEmits(["update:modelValue", "change"])
const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  iconOnly: {
    type: Boolean,
    default: false,
  },
  showTooltips: {
    type: Boolean,
    default: false,
  },
  showArrows: {
    type: Boolean,
    default: true,
  },
  background: {
    type: Boolean,
    default: false,
  },
  useBindings: [Boolean, Array],
  showBindings: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const tabsRef = ref(null)
const rootRef = ref(null)
const activeIndex = ref(props.modelValue)

const focusNav = computed(() =>
  Array.isArray(props.useBindings) ? props.useBindings : ["tab_l", "tab_r"]
)

watch(
  () => props.modelValue,
  value => {
    activeIndex.value = value
  }
)

watch(
  () => props.useBindings,
  () => console.warn("useBindings can only be set at component mount time")
)

function onTabChange(tab, prevTab) {
  const nextIndex = tab?.index ?? 0
  if (activeIndex.value !== nextIndex) {
    activeIndex.value = nextIndex
    emit("update:modelValue", nextIndex)
  }
  emit("change", tab, prevTab)
}

function goNext() {
  if (props.disabled) return false
  tabsRef.value?.goNext?.()
  return false
}

function goPrev() {
  if (props.disabled) return false
  tabsRef.value?.goPrev?.()
  return false
}

function selectTab(index) {
  if (props.disabled) return
  tabsRef.value?.selectTab?.(index)
}

let uinavBound = false
const useBindings = !!props.useBindings

if (useBindings) {
  const instance = getCurrentInstance()
  const rootUnwatch = watch(
    () => rootRef.value,
    element => {
      if (!element) return
      rootUnwatch()
      const vnode = { ctx: instance, el: element }
      vBngOnUiNav.mounted(element, {
        arg: focusNav.value[0],
        modifiers: {},
        value: goPrev,
      }, vnode)
      vBngOnUiNav.mounted(element, {
        arg: focusNav.value[1],
        modifiers: {},
        value: goNext,
      }, vnode)
      uinavBound = true
    },
    { immediate: true }
  )
}

onBeforeUnmount(() => {
  if (!uinavBound || !rootRef.value) return
  vBngOnUiNav.beforeUnmount(rootRef.value)
})

defineExpose({
  goNext,
  goPrev,
  selectTab,
})
</script>

<style scoped lang="scss">
.bng-tabs-root {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 0;
  border-radius: var(--bng-corners-2);
  isolation: isolate;
  overflow: hidden;
}

.bng-tabs-root.with-background {
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--bng-tabs-bg, var(--bng-off-black));
    opacity: var(--bng-tabs-bg-opacity, 0.6);
    box-shadow: var(--bng-tabs-bg-shadow, none);
    pointer-events: none;
    z-index: -1;
  }
}

.bng-tabs {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  --tab-list-padding: 0.25em 0.5em 0;
  --tab-list-margin: 0;
  --tab-list-bottom-border: 0.125rem solid var(--bng-orange-500);
  --tab-list-corners: var(--bng-tabs-list-corners, 0);
  --tab-list-justify: center;
  --tab-bg: transparent;
  --tab-content-bg: transparent;
  --tab-content-overflow: var(--bng-tabs-content-overflow, hidden);
}

.bng-tabs-side {
  display: flex;
  align-items: center;
  flex: 1 1 0;
}

.bng-tabs-side-start {
  justify-content: flex-start;
}

.bng-tabs-side-end {
  justify-content: flex-end;
}

.bng-tabs-arrow {
  --bng-button-margin: 0;
  --bng-button-min-width: 2.5em;
  --bng-button-padding: 0.35em;
  --bng-icon-size: 1.25em;
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.bng-tabs-binding {
  pointer-events: none;
  --bng-icon-size: 1.5em;
}
</style>
