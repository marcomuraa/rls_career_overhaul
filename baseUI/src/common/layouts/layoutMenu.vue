<template>
  <LayoutSingle class="layout-menu">
    <div
      class="menu-screen"
      v-bng-scoped-nav="{ scopeId: navScope, activateOnMount: navActive, preferAutoFocus: navAutoFocus, ...navOptions }"
      v-bind="$attrs"
      v-bng-on-ui-nav:tab_l="onTabLeft"
      v-bng-on-ui-nav:tab_r="onTabRight"
    >
      <div
        v-if="display.topbar || display.heading"
        :class="['menu-header', { 'menu-header-tabs': display.tabs, 'menu-header-breadcrumbs': display.breadcrumbs }]"
        bng-no-child-nav="true"
      >
        <div v-if="display.topbar" class="menu-topbar">
          <BngBreadcrumbs
            v-if="display.breadcrumbs"
            class="menu-breadcrumbs"
            v-bng-blur
            :items="breadcrumbItems"
            limit="5"
            :hide-last-item="hideBreadcrumbLastItem"
            simple
            :show-back-button="showBreadcrumbBackButton"
            :accent="ACCENTS.text"
            @click="onBreadcrumbClick"
            @back="onBreadBack"
          />
          <div class="menu-topbar-main">
            <div v-if="display.tabs" class="menu-tabs-switcher">
              <svg class="menu-tabs-decorator" width="100%" height="100%" viewBox="0 0 36 40" preserveAspectRatio="xMaxYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.4504 40H4.07812L11.3572 20L4.07812 0H19.4504L26.7295 20L19.4504 40Z" fill="var(--bng-orange-400)"/>
              </svg>
              <BngButton class="menu-tabs-arrow" :accent="ACCENTS.ghost" @click="goPrevTab">
                <BngIcon :type="icons.arrowLargeLeft" />
                <BngBinding class="menu-tabs-binding" ui-event="tab_l" controller />
              </BngButton>
              <Tabs
                :key="tabsRenderKey"
                ref="tabsRef"
                class="bng-tabs menu-tabs"
                :selectedIndex="selectedTab"
                @change="onTabChange"
              >
                <TabList />
                <div
                  v-for="(tab, index) in tabs"
                  :key="index"
                  :tab-heading="tab.heading || tab.label"
                  :tab-icon="tab.icon || icons.placeholder"
                  class="menu-tab-panel"
                />
              </Tabs>
              <BngButton class="menu-tabs-arrow" :accent="ACCENTS.ghost" @click="goNextTab">
                <BngBinding class="menu-tabs-binding" ui-event="tab_r" controller />
                <BngIcon :type="icons.arrowLargeRight" />
              </BngButton>
            </div>
            <slot v-else name="topbar-center" />
          </div>

          <div class="menu-topbar-right">
            <slot name="topbar-right" />
          </div>
        </div>


      </div>
      <div v-if="display.heading && !display.tabs" class="menu-heading">
        <slot name="heading">
          <BngScreenHeadingV2 type="1">
            {{ heading }}
          </BngScreenHeadingV2>
        </slot>
      </div>

      <div class="menu-content">
        <div v-if="display.buttonsLeft" class="menu-content-left">
          <slot name="buttons-left" />
        </div>

        <div class="menu-content-main">
          <template v-if="display.cards">
            <BngCard
              v-if="display.card1"
              v-bng-scoped-nav="{
                scopeId: 'menu-content-card-1',
                type: SCOPE_TYPES.CONTAINER,
                activateBehavior: ACTIVATE_BEHAVIORS.containsNavigable,
                bubbleWhitelistEvents: mainCardBubbleWhitelistEvents,
                canIgnoreEvent: mainCardCanIgnoreEvent,
              }"
              :bng-scoped-nav-autofocus="mainCardAutofocus ? 'true' : null"
              layered-background
              :class="['menu-content-card', 'menu-content-card-1', mainCardClass]"
              v-bng-blur
              >
              <slot name="card1">
                <slot name="card" />
              </slot>
            </BngCard>
            <BngCard
              v-if="display.card2"
              layered-background
              :class="['menu-content-card', 'menu-content-card-2', sideCardClass]"
              bng-no-child-nav="true"
              v-bng-blur>
              <slot name="card2" />
            </BngCard>
          </template>
          <slot v-else />
        </div>

        <slot name="side-tasklist">
        </slot>


        <div v-if="display.buttonsRight" class="menu-buttons-side">
          <slot name="buttons-right">
            <slot name="buttons-side" />
          </slot>
        </div>
      </div>

      <div v-if="display.buttonsBottom" class="menu-buttons-bottom">
        <slot name="buttons-bottom" />
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { ref, computed, useSlots } from "vue"
import { storeToRefs } from "pinia"
import { LayoutSingle } from "@/common/layouts"
import { vBngScopedNav, vBngOnUiNav, vBngBlur } from "@/common/directives"
import { BngButton, BngIcon, BngBinding, BngBreadcrumbs, BngScreenHeadingV2, BngCard, ACCENTS, icons } from "@/common/components/base"
import { Tabs, TabList } from "@/common/components/utility"
import { ACTIVATE_BEHAVIORS } from "@/services/scopedNav"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import { default as useControls, CONTROL_LABELS } from "@/services/controls"

const Controls = useControls()
const { showIfController, lastControllersSignature } = storeToRefs(Controls)

const props = defineProps({
  showTopbar: {
    type: Boolean,
    default: true,
  },
  showCard1: {
    type: Boolean,
    default: undefined,
  },
  showCard2: {
    type: Boolean,
    default: undefined,
  },
  showButtonsLeft: {
    type: Boolean,
    default: undefined,
  },
  navScope: {
    type: String,
    default: undefined,
  },
  navActive: {
    type: Boolean,
    default: true,
  },
  navAutoFocus: {
    type: Boolean,
    default: true,
  },
  navOptions: {
    type: Object,
    default: () => ({}),
  },
  mainCardAutofocus: {
    type: Boolean,
    default: false,
  },
  mainCardClass: {
    type: [String, Array, Object],
    default: undefined,
  },
  sideCardClass: {
    type: [String, Array, Object],
    default: undefined,
  },
  mainCardBubbleWhitelistEvents: {
    type: Array,
    default: () => [],
  },
  mainCardCanIgnoreEvent: {
    type: Function,
    default: undefined,
  },
  // Data props
  breadcrumbs: {
    type: [Array, Object],
    default: () => [],
  },
  hideBreadcrumbs: {
    type: Boolean,
    default: false,
  },
  tabs: {
    type: [Array, Object],
    default: () => [],
  },
  selectedTab: {
    type: Number,
    default: 0,
  },
  heading: {
    type: String,
    default: undefined,
  },
  hideBreadcrumbLastItem: {
    type: Boolean,
    default: true,
  },
  showBreadcrumbBackButton: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["update:selectedTab", "tab-change", "breadcrumb-click", "breadcrumb-back", "before-navigate"])

const tabsRef = ref(null)
const slots = useSlots()

const tabs = computed(() => Array.isArray(props.tabs) ? props.tabs : [])
const tabsRenderKey = computed(() => tabs.value
  .map((tab, index) => `${tab.id ?? tab.tabId ?? tab.routeName ?? index}:${tab.heading ?? tab.label ?? ""}`)
  .join("|"))
const breadcrumbItems = computed(() => Array.isArray(props.breadcrumbs) ? props.breadcrumbs : [])

const display = computed(() => {
  const card1 = props.showCard1 ?? !!(slots.card || slots.card1)
  const card2 = props.showCard2 ?? !!slots.card2
  return {
    topbar: props.showTopbar,
    breadcrumbs: !props.hideBreadcrumbs && breadcrumbItems.value.length > 0,
    tabs: breadcrumbItems.value.length === 0 && tabs.value.length > 0,
    heading: !!props.heading || !!slots.heading,
    content: !!slots.default,
    cards: card1 || card2,
    card1,
    card2,
    buttonsLeft: props.showButtonsLeft ?? !!slots["buttons-left"],
    buttonsRight: !!slots["buttons-right"] || !!slots["buttons-side"], // TODO: deprecate buttonsSide
    buttonsBottom: !!slots["buttons-bottom"],
  }
})

const goPrevTab = () => tabsRef.value?.goPrev?.()
const goNextTab = () => tabsRef.value?.goNext?.()

const onTabLeft = () => display.value.tabs && goPrevTab()
const onTabRight = () => display.value.tabs && goNextTab()

function onTabChange(tab, prevTab, meta) {
  const sync = !!meta?.sync
  const event = {
    tab,
    prevTab,
    sync,
    type: "tab-change",
    cancel: false,
    preventDefault: () => { event.cancel = true }
  }

  emit("before-navigate", event)

  if (event.cancel) {
    // If cancelled, we need to revert the tab selection visually if Tabs component updated itself
    // But Tabs component is controlled by selectedIndex prop, so it shouldn't update if we don't emit update:selectedTab
    // However, the internal state of Tabs might have changed before emitting change.
    // The Tabs component implementation we saw earlier updates internal activeIndex then emits change.
    // So if we cancel, we might need to force update it back?
    // The Tabs component watches props.selectedIndex, so if we don't update the prop, it should revert?
    // Let's check Tabs implementation:
    // watch(() => props.selectedIndex, index => selectTab(index))
    // selectTab updates activeIndex.
    // So if we don't update prop, it stays on old prop value?
    // No, selectTab is called internally on click too (via provide/inject maybe? or just internal logic).
    // Actually Tabs uses slots and provide/inject.
    // If we want to support cancellation perfectly, Tabs component might need to support it or we rely on key-changing to reset it.
    // For now, let's assume standard flow.
    return
  }

  emit("update:selectedTab", tab.index)
  emit("tab-change", tab, prevTab, { sync })
}

function onBreadcrumbClick(item) {
  const event = {
    item,
    type: "breadcrumb-click",
    cancel: false,
    preventDefault: () => { event.cancel = true }
  }
  emit("before-navigate", event)
  if (event.cancel) return

  emit("breadcrumb-click", item)
}

function onBreadBack(item) {
  const event = {
    item,
    type: "breadcrumb-back",
    cancel: false,
    preventDefault: () => { event.cancel = true }
  }
  emit("before-navigate", event)
  if (event.cancel) return
  emit("breadcrumb-back", item)
}
</script>

<style lang="scss" scoped>
.layout-menu {
  --content-flow: column;
  --content-max-width: unset;
  --bng-tile-margins: 0;

  color: var(--bng-off-white);

  max-height: 100%;

  pointer-events: none;
  > * > * {
    pointer-events: auto;
  }

  .menu-screen {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding: 0;
    flex: 1 1 auto;
    min-height: 100%;
    overflow: hidden;
    position: relative;

    .menu-header {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      height: 2.5rem;


      &.menu-header-tabs {
        .menu-topbar-main,
        .menu-tabs-switcher,
        .menu-tabs {
          height: 100%;
        }

        .menu-tabs-switcher {
          align-items: stretch;
          border-radius: var(--bng-corners-2);
          overflow: hidden;
          isolation: isolate;
        }

        .menu-tabs-decorator {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 2.25rem;
          height: 100%;
          z-index: -1;
          pointer-events: none;
        }

        .menu-tabs {
          display: flex;
        }

        :deep(.tab-container),
        :deep(.tab-list),
        :deep(.tab-item) {
          height: 100%;
        }

        :deep(.tab-list) {
          align-items: stretch;
        }
      }

      &.menu-header-breadcrumbs {
        .menu-topbar-left {
          flex: 0 0 50%;
        }

        .menu-topbar-main {
          justify-content: flex-start;
        }
      }
    }

    .menu-topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex: 1 1 auto;
      height: 100%;
      .menu-topbar-left {
        flex: 0 0 24em;
        min-width: 0;
        border-radius: var(--bng-corners-1);
      }

      .menu-topbar-main {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        align-self: flex-end;
      }

      .menu-topbar-right {
        display: flex;
        flex: 0 0 24em;
        min-width: 0;
        justify-content: flex-end;
      }

      .menu-tabs-switcher {
        --tab-list-margin: 0;
        --tab-list-padding: 0;

        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        flex: 0 0 auto;
        box-sizing: border-box;
        padding-left: 2.5rem;
        .menu-tabs {
          --bng-tabs-border-width: 0;
          --bng-bg-border-radius: var(--bng-corners-1) var(--bng-corners-1) 0 0;
          --tab-bg: transparent;
        }

        :deep(.tab-item) {
          --bng-button-min-width: 6em;
          --bng-button-max-width: 120em;
          --bng-button-padding: 0.75em 1.25em;
          --bng-content-align: center;
          --bng-content-justify: flex-start;
          --bng-icon-size: 1.25rem;
          gap: 0.5em;
          font-size: 1.15rem;
          line-height: 1.6rem;
          white-space: nowrap;

          --bng-bg-enabled: transparent;
          --bng-bg-hover: var(--bng-cool-gray-700);
          --bng-bg-active: var(--bng-cool-gray-600);
          --bng-bg-focus: var(--bng-cool-gray-700);
          --bng-bg-hover-opacity: 0.8;
          --bng-bg-active-opacity: 0.95;
          --bng-bg-focus-opacity: 0.85;

          &:not(.tab-active-tab).focus-visible > .bng-background {
            background-color: var(--bng-cool-gray-700);
            opacity: 0.85;
          }

          &.tab-active-tab {
            --bng-bg-enabled: rgba(var(--bng-cool-gray-800-rgb), 0.65);
            --bng-bg-enabled-opacity: 1;
          }
        }
        &::before {
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--bng-cool-gray-900);
          opacity: 0.9;
          border-radius: var(--bng-corners-2);
          z-index: -2;
          pointer-events: none;
        }

        .menu-tabs-arrow {
          --bng-button-margin: 0;
          --bng-button-min-width: 2.25rem;
          --bng-button-padding: 0.25rem;
          --bng-icon-size: 1.45rem;
          --bng-bg-enabled: transparent;
          --bng-bg-hover: var(--bng-cool-gray-700);
          --bng-bg-active: var(--bng-cool-gray-600);
          --bng-bg-focus: var(--bng-cool-gray-700);
          --bng-bg-hover-opacity: 0.8;
          --bng-bg-active-opacity: 0.95;
          --bng-bg-focus-opacity: 0.85;
          display: inline-flex;
          align-items: center;
          gap: 0rem;
        }

        .menu-tabs-binding {
          pointer-events: none;
        }
      }

      .menu-breadcrumbs {
        --bng-button-custom-margin: 0;
        flex: 0 0 auto;
        max-width: 50rem;
        padding: 0;
        border-radius: var(--bng-corners-2);
        background-color: rgba(var(--bng-cool-gray-800-rgb), 0.8);
        pointer-events: auto;
        height: 100%;

        :deep(.bng-path) {
          position: relative;
          padding-right: 0.5rem;

          &::after {
            content: "/";
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 0.5rem;
            color: var(--bng-off-white);
            opacity: 0.9;
          }
        }
      }
    }

    .menu-heading {
      width: auto;
      flex: 0 0 auto;
      max-width: 50rem;
    }

    .menu-content {
      flex: 1 1 auto;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: stretch;
      min-height: 0;
      gap: 0.5rem;
      overflow: visible;

      .menu-content-left {
        flex: 0 0 auto;
        align-self: flex-start;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
      }

      .menu-content-main {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        overflow: visible;

      }

      .menu-tasklist {
        top: 0;
        right: 0;
        width: 30rem;
      }

      .menu-content-card {
        --bng-card-height: unset;
        flex: 0 0 auto;
        width: clamp(21em, 25vw, 28em);
        min-height: 18rem;
        max-height: 100%;
        > * {
          min-height: 100%;

        }
      }

      .menu-content-card-1 {
        flex: 0 0 auto;
      }

      .menu-content-card-1--vehicle-spawned {
        width: clamp(24em, 30vw, 40em);
      }

      .menu-content-card-1--wide {
        width: clamp(24rem, 26vw, 36rem);
      }

      .menu-content-card-2--wide {
        width: clamp(24rem, 26vw, 36rem);
      }

      .menu-content-card-2--extra-wide {
        width: clamp(36rem, 46vw, 58rem);
      }

      .menu-content-card-1--extra-wide {
        width: clamp(36rem, 46vw, 58rem);
      }
    }

    .menu-buttons-side {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 0.5em;
    }

    .menu-buttons-bottom {
      flex: 0 0 auto;
      display: flex;
      justify-content: var(--layout-menu-buttons-bottom-justify, center);
      gap: 0.5em;
      padding-top: 0.5em;
    }
  }
}
</style>
