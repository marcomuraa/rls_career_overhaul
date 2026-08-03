<template>
  <component
    v-if="shown.wrapper"
    :is="type === 'default' ? 'dialog' : 'div'"
    ref="wrapper"
    :class="['popup-wrapper', `popup-type-${type}`]"
    v-bng-blur="popupsWrapper.blur"
    v-bng-ui-nav="type === 'default'"
    v-on="onInputEvents"
  >
    <Transition name="popup-background">
      <div v-if="shown.popups" :class="['popup-background', ...popupsWrapper.style.map(name => 'background-style-' + name)]"></div>
    </Transition>
    <TransitionGroup name="popup-fade">
      <template v-if="shown.popups">
        <div
          v-for="popup in popups"
          :key="popup.id"
          :class="[
            'popup-container',
            ...popup.position.map(name => 'content-position-' + name),
            popup.animated ? 'popup-animated' : 'popup-notanimated',
            popup.active ? 'popup-active' : 'popup-inactive',
          ]"
        >
          <component
            :is="popup.component.ref"
            v-bind="popup.props"
            :popupActive="popup.active"
            :class="['popup-content', popup.active ? 'popup-active' : 'popup-inactive']"
            @return="popup.return"
          />
        </div>
      </template>
    </TransitionGroup>
    <div ref="innerWrapper"></div>
  </component>
  <Teleport :to="innerWrapper" :disabled="!innerWrapper">
    <slot></slot>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted, onUnmounted } from "vue"
import { popupsView } from "@/services/popup"
import { vBngBlur, vBngUiNav } from "@/common/directives"
import { priorityFocus } from "@/services/uiNavFocus"
import { useScopedNav } from "@/services/scopedNav/api"
import { playCancelSound, resolveOutsideCancelButton } from "../buttonRoles.js"

const props = defineProps({
  type: {
    type: String,
    default: "default",
    validator: val => ["default", "activity"].includes(val),
  },
})

const popups = computed(() => popupsView[props.type === "default" ? "popups" : "activities"])
const popupsWrapper = computed(() => popupsView[props.type === "default" ? "popupsWrapper" : "activitiesWrapper"])

const { beginActivationBarrier, endActivationBarrier, current: currentScope, isActiveScope } = useScopedNav()
const ACTIVATION_BARRIER_ID = "default-popup-wrapper"
let barrierActive = false

const wrapper = ref()
const innerWrapper = ref()
const shown = reactive({
  wrapper: false,
  popups: false,
})
let tmr
const capturedInputEvents = [
  "wheel",
  "scroll",
  "keydown",
  "keyup",
  "keypress",
  "beforeinput",
  "input",
  "change",
  "pointerdown",
  "pointerup",
  "pointermove",
  "pointercancel",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "auxclick",
  "contextmenu",
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
]
const capturedInputEventsAll = [
  "ui_nav",
  ...capturedInputEvents,
]

const stopDefaultPopupInput = event => {
  if (props.type === "default") event.stopPropagation()
}

const onInputEvents = Object.fromEntries(capturedInputEvents.map(name => [name, stopDefaultPopupInput]))

const activePopup = () => popups.value && popups.value.find(popup => popup.active)

const getOutsideCancelResult = (popup, cancelButton) => {
  if (popup.componentName === "FormDialog") return { value: cancelButton.value }
  return cancelButton.value
}

const cancelActivePopupFromOutsideClick = () => {
  const popup = activePopup()
  const cancelButton = resolveOutsideCancelButton(popup && popup.props && popup.props.buttons)
  if (!popup || !cancelButton) return false
  playCancelSound(cancelButton)
  popup.return(getOutsideCancelResult(popup, cancelButton))
  return true
}

const captureDefaultPopupInput = event => {
  if (props.type !== "default" || !shown.wrapper || !wrapper.value) return
  const activePopupContent = wrapper.value.querySelector(".popup-container.popup-active > .popup-content")
  const popupPopoverContainer = wrapper.value.querySelector(".popover-container")
  const isInsideActivePopup = activePopupContent && event.target instanceof Node && activePopupContent.contains(event.target)
  const isInsidePopupPopover = popupPopoverContainer && event.target instanceof Node && popupPopoverContainer.contains(event.target)
  if (isInsideActivePopup || isInsidePopupPopover) return
  if (event.type === "click" && cancelActivePopupFromOutsideClick()) {
    event.preventDefault()
  }
  event.stopPropagation()
}

watch(
  () => !!popups.value,
  cur => {
    if (cur === shown.wrapper) return
    const body = document.body
    if (cur && popupsWrapper.value.fade) {
      body.classList.add("popup-all-hide")
    } else {
      body.classList.remove("popup-all-hide")
    }
    // to handle animation
    tmr && clearTimeout(tmr)
    if (cur) {
      shown.wrapper = true
      if (props.type === "default" && !barrierActive) {
        barrierActive = true
        beginActivationBarrier(ACTIVATION_BARRIER_ID)
      }
      // sadly, this has to go in two ticks
      nextTick(() => {
        if (props.type === "default" && wrapper.value && typeof wrapper.value.showModal === "function") {
          wrapper.value.showModal()
        }
        nextTick(() => {
          shown.popups = true
        })
      })
      popupsWrapper.value.fade && body.classList.add("popup-show-hide")
    } else {
      tmr = setTimeout(() => {
        tmr = null
        if (popups.value) return
        body.classList.remove("popup-show-hide")
        shown.popups = false
        shown.wrapper = false
        nextTick(() => {
          // Release the barrier only now that the dialog/wrapper is gone from the
          // DOM, which flushes any deferred normal-scope resume.
          let scopedNavResumed = false
          if (barrierActive) {
            barrierActive = false
            endActivationBarrier(ACTIVATION_BARRIER_ID)
            const resumed = currentScope.value
            scopedNavResumed = !!resumed && isActiveScope(resumed.id)
          }
          if (!scopedNavResumed) priorityFocus()
        })
      }, 200) // sleep for animation length
    }
  }
)

// Escape key interceptor for modal dialogs intercept at keydown level
// because vue is late to intercept with the event handler
const escapeHandler = (event) => {
  if (event.key === "Escape" && props.type === "default" && shown.wrapper) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
}

onMounted(() => {
  // Use capturing phase (true) to intercept before dialog's internal handler
  document.addEventListener("keydown", escapeHandler, true)
  capturedInputEventsAll.forEach(name => document.addEventListener(name, captureDefaultPopupInput, true))
})

onUnmounted(() => {
  document.removeEventListener("keydown", escapeHandler, true)
  capturedInputEventsAll.forEach(name => document.removeEventListener(name, captureDefaultPopupInput, true))
  if (barrierActive) {
    barrierActive = false
    endActivationBarrier(ACTIVATION_BARRIER_ID)
  }
})
</script>

<style lang="scss">
@use "@/styles/modules/variables/z-index" as *;

.popup-show-hide {
  > *:not(#vue-app),
  > #vue-app > *:not(.popup-wrapper):not(.vue-app-main),
  > #vue-app > .vue-app-main > *:not(.mainmenu-container),
  > #vue-app > .vue-app-main > .mainmenu-container > *:not(.background-image) {
    transition-property: opacity, filter;
    transition-duration: 200ms;
  }
}
.popup-all-hide {
  > *:not(#vue-app),
  > #vue-app > *:not(.popup-wrapper):not(.vue-app-main),
  > #vue-app > .vue-app-main > *:not(.mainmenu-container),
  > #vue-app > .vue-app-main > .mainmenu-container > *:not(.background-image) {
    opacity: 0.5;
    filter: grayscale(50%);
    pointer-events: none !important;
  }
}

// The modal dialog is rendered in the browser top layer, so shared
// ancestor-scoped focus styles may not match popup descendants reliably.
.popup-wrapper .focus-visible {
  &::before {
    content: "";
    display: block;
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: -4px;
    right: -4px;
    border-radius: 6px;
    border: 2px solid var(--bng-orange-b400);
    pointer-events: none;
    z-index: $focus !important;
  }

  &.no-focus-frame,
  &.no-focus-visible {
    &::before {
      display: none !important;
    }
  }
}

// Disable native browser focus ring in popup content.
.popup-wrapper *:focus {
  outline: none;
  box-shadow: none;
}
</style>

<style lang="scss" scoped>
// z-index by popup collection type
.popup-wrapper,
.popup-type-default {
  // should be very high because we're aiming to block the screen
  --popup-zindex: 10000;
  --popup-background-zindex: calc(var(--popup-zindex) + 2);
  --popup-inactive-zindex: calc(var(--popup-zindex) + 1); // must be below background
  --popup-active-zindex: calc(var(--popup-zindex) + 3); // must be above background
}
.popup-type-activity {
  // it's a non-blocking activity invitation, so it should be at least above UI apps (--zorder_apps_default) but below menu (--zorder_index_menucontent)
  --popup-zindex: calc(var(--zorder_apps_default) + 1);
  // currently, UI apps and menu have z-index 1 and 2 respectively so we cannot use this atm. here's an alternative
}

.popup-wrapper,
.popup-background,
.popup-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  &:focus {
    box-shadow: none;
    &::before {
      content: none;
    }
  }
}

.popup-wrapper {
  max-width: unset;
  max-height: unset;
  background: transparent;
  border: none;
  pointer-events: none;
  z-index: var(--popup-zindex);
  &::backdrop {
    display: none;
  }
}
.popup-background {
  z-index: var(--popup-background-zindex);
}
.popup-container {
  // display: none !important;
  display: flex;
  pointer-events: none;
  overflow: hidden;
  &.popup-inactive {
    z-index: var(--popup-inactive-zindex);
  }
  &.popup-active {
    z-index: var(--popup-active-zindex);
  }
}

// background styles
// note: pointer events should be defined for each of them
.background-style-default {
  background-color: rgba(#555, 0.5);
  pointer-events: all;
}
.background-style-transparent {
  background-color: transparent;
  pointer-events: all;
}
.background-style-clickthrough {
  background-color: transparent;
  pointer-events: none;
}

.popup-content {
  flex: 0 0 auto;
  max-height: calc(100vh - 4rem);
  &.popup-active {
    pointer-events: all;
  }
  &.popup-inactive {
    pointer-events: none;
  }
}

// content positions
.content-position-fullscreen {
  align-items: stretch;
  justify-content: stretch;
  > .popup-content {
    width: 100%;
    height: 100%;
  }
}
.content-position-center {
  align-items: center;
  justify-content: center;
}
.content-position-top {
  align-items: flex-start;
}
.content-position-bottom {
  align-items: flex-end;
}
.content-position-top,
.content-position-bottom {
  &:not(.content-position-left):not(.content-position-right) {
    justify-content: center;
  }
}
.content-position-left {
  justify-content: flex-start;
}
.content-position-right {
  justify-content: flex-end;
}
.content-position-left,
.content-position-right {
  &:not(.content-position-top):not(.content-position-bottom) {
    align-items: center;
  }
}

// animated reveal/dismiss
.popup-background-enter-active,
.popup-background-leave-active {
  transition: opacity 200ms;
}
.popup-background-leave-active {
  transition-delay: 100ms;
}
.popup-background-enter-from,
.popup-background-leave-to {
  opacity: 0;
}

.popup-animated {
  // container fade
  &.popup-fade-enter-active,
  &.popup-fade-leave-active {
    transition-property: opacity;
    > .popup-content {
      transition-property: transform;
    }
    &,
    > .popup-content {
      transition-duration: 300ms;
    }
    // content position for zoom
    &.content-position-center > .popup-content {
      transform-origin: 50% 50%;
    }
    &.content-position-left > .popup-content {
      transform-origin: 0% 50%;
    }
    &.content-position-right > .popup-content {
      transform-origin: 100% 50%;
    }
    &.content-position-top {
      > .popup-content {
        transform-origin: 50% 0%;
      }
      &.content-position-left > .popup-content {
        transform-origin: 0% 0%;
      }
      &.content-position-right > .popup-content {
        transform-origin: 100% 0%;
      }
    }
    &.content-position-bottom {
      > .popup-content {
        transform-origin: 50% 100%;
      }
      &.content-position-left > .popup-content {
        transform-origin: 0% 100%;
      }
      &.content-position-right > .popup-content {
        transform-origin: 100% 100%;
      }
    }
  }
  &.popup-fade-enter-from,
  &.popup-fade-leave-to {
    opacity: 0;
  }
  // content zoom
  &.popup-fade-enter-from:not(.content-position-fullscreen) > .popup-content {
    transform: scale(1.1);
  }
  &.popup-fade-leave-to:not(.content-position-fullscreen) > .popup-content {
    transform: scale(0.9);
  }
}
</style>
