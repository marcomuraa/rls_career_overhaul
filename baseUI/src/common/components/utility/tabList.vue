<!-- Tab List -->
<template>
  <div class="tab-list">
    <slot name="before" :tabs="tabs" :select-tab="selectTab" />
    <slot name="items" :tabs="tabs" :select-tab="selectTab">
      <Button
        v-for="(tab, i) in tabs"
        :key="i"
        :class="tabHeaderClasses(tab)"
        :disabled="disabled"
        bng-no-nav="true"
        v-bng-tooltip:bottom="showTooltips ? tab.tooltip || tab.heading : undefined"
        @click="handleTabSelect(tab.index, $event)"
      >
        <BngIcon v-if="tab.icon" :type="tab.icon" />
        <span v-if="!iconOnly || !tab.icon">{{ tab.heading }}</span>
      </Button>
    </slot>
    <slot name="after" :tabs="tabs" :select-tab="selectTab" />
  </div>
</template>

<script setup>
import { inject, nextTick } from "vue"
import { BngIcon } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngTooltip } from "@/common/directives"
import { setFocus } from "@/services/uiNavFocus"

const tabs = inject("tabs")
const selectTab = inject("selectTab")
const props = defineProps({
  iconOnly: Boolean,
  showTooltips: Boolean,
  disabled: Boolean,
})

const tabHeaderClasses = tab => ({
  "tab-item": true,
  "tab-active-tab": tab.active,
  "no-hover": tab.active,
  "no-focus-frame": true,
})

// Handle tab selection
function handleTabSelect(index, event) {
  if (props.disabled) return
  // Get the button element
  const buttonElement = event.currentTarget

  // Check if focus frame was visible before (has focus-visible class)
  const hasFocusVisible = document.activeElement &&
                          document.activeElement.classList.contains('focus-visible')

  // First select the tab
  selectTab(index)

  // After the DOM has updated, set focus on the selected tab only if focus was visible before
  if (hasFocusVisible) {
    nextTick(() => {
      // Use setFocus to set focus on the active tab
      setFocus(buttonElement)
    })
  }
}
</script>

<style lang="scss" scoped>
.tab-list {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: var(--tab-list-justify, flex-start);
  width: 100%;
  position: relative;
  box-sizing: border-box;
  padding: var(--tab-list-padding, 0.5em);
  background-color: var(--tab-bg);
  border-radius: var(--tab-list-corners);
  border-bottom: var(--tab-list-bottom-border, 0);
  margin: var(--tab-list-margin, 0 0 0.5em 0);
  flex: 0 0 auto;
  list-style: none;
  --bng-bg-border-radius: var(--bng-corners-1) var(--bng-corners-1) 0 0;

  .tab-item {
    text-overflow: ellipsis;
    overflow: visible;
    --bng-bg-border-width: 0;
    --bng-button-margin: 0;
    --bng-button-min-width: 4em;
    &.tab-active-tab {
      --bng-bg-image: linear-gradient(0deg, rgba(var(--tab-bg-active-line), 1) 0.25rem, rgba(var(--tab-bg-active-line), 0.3) 0.2501rem, rgba(var(--tab-bg-active-line), 0) 1rem);
    }
  }
}
</style>
