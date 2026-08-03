<template>
  <div
    ref="rootRef"
    v-bng-scoped-nav="{ scopeId: 'pause-multiplayer-tab', type: 'normal', preferAutoFocus: true, bubbleWhitelistEvents: TAB_BUBBLE_EVENTS, canDeactivate: onScopeBack }"
    v-bng-on-ui-nav:tab_l,tab_r="processTabInput"
    class="content pause-multiplayer-tab-host"
  >
    <Tabs class="bng-tabs pause-mp-tabs" :selectedIndex="subTabIndex" @change="onSubTabChange">
      <TabList />
      <PauseMultiplayerSessionTab />
      <PauseMultiplayerGamemodesTab />
    </Tabs>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { Tabs, TabList } from "@/common/components/utility"
import { vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { setFocus } from "@/services/uiNavFocus"
import PauseMultiplayerGamemodesTab from "@/modules/multiplayer/components/PauseMultiplayerGamemodesTab.vue"
import PauseMultiplayerSessionTab from "@/modules/multiplayer/components/PauseMultiplayerSessionTab.vue"

defineOptions({ name: "PauseMultiplayerTab" })

const SUB_TAB_COUNT = 2

const bngVue = window.bngVue || { gotoGameState() {} }

const rootRef = ref(null)
const isBackPending = ref(false)
const subTabIndex = ref(0)
const TAB_BUBBLE_EVENTS = ["menu", "tab_l", "tab_r"]

const processTabInput = (event) => {
  if (event.detail.name === "tab_l") {
    subTabIndex.value = (subTabIndex.value - 1 + SUB_TAB_COUNT) % SUB_TAB_COUNT
  } else if (event.detail.name === "tab_r") {
    subTabIndex.value = (subTabIndex.value + 1) % SUB_TAB_COUNT
  }
}

const onSubTabChange = (tab) => {
  if (tab && typeof tab.index === "number") subTabIndex.value = tab.index
}

function isVisibleAndFocusable(target) {
  if (!target || typeof target.focus !== "function") return false
  if (target.matches?.("[disabled]")) return false
  return target.getClientRects().length > 0
}

function focusElement(target) {
  if (!isVisibleAndFocusable(target)) return false
  const focused = setFocus(target)
  if (focused) return true
  target.focus()
  return document.activeElement === target
}

function onScopeBack() {
  if (isBackPending.value) return false
  isBackPending.value = true
  void Promise.resolve(bngVue.gotoGameState("pause"))
    .finally(() => {
      isBackPending.value = false
    })
  return false
}

function focusEntry() {
  const root = rootRef.value
  if (!root) return false

  const selectors = [
    ".tab-list button:not([disabled])",
    ".search-input input:not([disabled])",
    ".gamemodes-list button:not([disabled])",
    ".gamemode-footer button:not([disabled])",
    ".preparation-notice button:not([disabled])",
    "button:not([disabled])",
    "[bng-nav-item]:not([disabled])",
    "[tabindex='0']",
  ]

  for (const selector of selectors) {
    const target = root.querySelector(selector)
    if (focusElement(target)) return true
  }
  return false
}

defineExpose({ focusEntry })
</script>

<style scoped lang="scss">
.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5em 0.75em;
}

.pause-mp-tabs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

</style>

<style lang="scss">
.pause-multiplayer-tab-host .tab-container {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pause-multiplayer-tab-host .tab-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
</style>
