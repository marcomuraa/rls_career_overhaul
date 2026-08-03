<template>
  <div class="tab-container">
    <component v-if="props.showTabList && tabListStart" :is="tabListStart" />
    <slot name="after-tab-list" />
    <component v-if="tabsContent[activeIndex]" :is="tabsContent[activeIndex]" :key="tabsContent[activeIndex].key ?? activeIndex" class="tab-content" />
    <component v-if="props.showTabList && tabListEnd" :is="tabListEnd" />
  </div>
</template>

<script setup>
import { ref, shallowRef, watch, provide, useSlots, nextTick, Comment, Text, Fragment } from "vue"
import { TabList } from "@/common/components/utility"

const emit = defineEmits(["change"])
const props = defineProps({
  selectedIndex: {
    type: Number,
    default: -1,
  },
  showTabList: {
    type: Boolean,
    default: true,
  },
})

const slots = useSlots()
const tabListStart = shallowRef()
const tabListEnd = shallowRef()
const tabsList = ref([])
const tabsContent = ref([])
const activeIndex = ref(-1)

const isTabList = vnode => typeof vnode.type === "object" && vnode.type.__name === TabList.__name
const isIgnorableVNode = vnode =>
  !vnode ||
  vnode.type === Comment ||
  (vnode.type === Text && typeof vnode.children === "string" && vnode.children.trim() === "")

provide("tabs", tabsList)

watch(() => slots.default?.(), update, { immediate: true })
watch(() => props.selectedIndex, index => selectTab(index, { sync: true }))

function update(vnodes) {
  if (typeof vnodes === "undefined") vnodes = slots.default?.()
  if (!Array.isArray(vnodes)) vnodes = vnodes ? [vnodes] : []

  // find TabList
  const tabListIndex = vnodes.findIndex(vn => isTabList(vn))
  tabListStart.value = tabListIndex === 0 ? vnodes[tabListIndex] : TabList
  tabListEnd.value = tabListIndex === vnodes.length - 1 ? vnodes[tabListIndex] : null

  // filter content
  tabsContent.value = vnodes
    .filter(vn => !isTabList(vn) && !isIgnorableVNode(vn))
    .reduce((res, vnode) => {
      if (vnode?.type === Fragment && Array.isArray(vnode.children)) {
        res.push(...vnode.children.filter(vn => !isTabList(vn) && !isIgnorableVNode(vn)))
        return res
      }
      if (!isIgnorableVNode(vnode)) res.push(vnode)
      return res
    }, [])

  // create list of tabs for TabList
  tabsList.value = tabsContent.value.map((tab, index) => ({
    index,
    heading: tab.props?.["tab-heading"] || tab.props?.tabHeading || `Tab ${index + 1}`,
    icon: tab.props?.["tab-icon"] || tab.props?.tabIcon || null,
    tooltip: tab.props?.["tab-tooltip"] || tab.props?.tabTooltip || null,
    active: activeIndex.value === -1
      ? props.selectedIndex === index || !!tab.props?.["tab-selected"] || !!tab.props?.tabSelected
      : activeIndex.value === index,
  }))

  // select tab
  const nextActiveIndex = tabsList.value.findIndex(tab => tab.active)
  selectTab(nextActiveIndex > -1 ? nextActiveIndex : 0, { sync: true })
}

function selectTab(index, meta = undefined) {
  if (!Array.isArray(tabsList.value) || !tabsList.value.length) return
  if (typeof index !== "number" || index < 0 || index >= tabsList.value.length) return
  if (activeIndex.value === index) return
  let prevTab = tabsList.value[activeIndex.value]
  tabsList.value.forEach(tab => {
    tab.active = tab.index === index
  })
  activeIndex.value = index
  emit("change", tabsList.value[index], prevTab, meta)
}
provide("selectTab", selectTab)

defineExpose({
  goNext: () => selectTab((activeIndex.value + 1) % tabsList.value.length),
  goPrev: () => selectTab((activeIndex.value - 1 + tabsList.value.length) % tabsList.value.length),
  selectTab,
})

// Initialize once in case slots don't trigger a watch rerun
nextTick(update)
</script>

<style lang="scss" scoped>
.tab-container {
  display: flex;
  flex-direction: column;
  color: var(--tab-container-fg);
}

// this trick makes the styles lower priority than the styles of the tab itself, effectively making it a fallback style
:deep(.tab-content) {
  flex: 1 1 auto;
  box-sizing: border-box;
  border-radius: var(--tab-content-corners);
  background-color: var(--tab-content-bg);
  overflow: var(--tab-content-overflow, hidden);
}

.bng-tabs {

  --tab-container-fg: var(--bng-off-white);

  --tab-bg: var(--bng-black-o6);
  --tab-bg-active-line: var(--bng-orange-500-rgb);

  --tab-content-bg: var(--bng-black-o6);

  --tab-list-corners: var(--bng-corners-1);
  --tab-corners: var(--bng-corners-2);
  --tab-content-corners: var(--bng-corners-1);

  --tab-border: 0.125em solid var(--bng-cool-gray-700);

  --tab-spacing: 0.25em;
}

</style>