<template>
  <div
    ref="elContainer"
    class="bng-text-scroller"
    :class="[{ 'is-scrolling': isScrolling }, ...overrideClasses]"
  >
    <div
      ref="elText"
      class="scroller-text"
      :style="scrollStyles"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick, useSlots } from "vue"
import { NAVIGABLE_ELEMENTS_SELECTOR } from "@/services/crossfire.js"

const props = defineProps({
  scrollSpeed: {
    type: Number,
    default: 3, // em per second
  },
  initialPause: {
    type: Number,
    default: 1.0, // seconds
  },
  endingPause: {
    type: Number,
    default: 1.0, // seconds
  },
  minCycleTime: {
    type: Number,
    default: 1, // seconds - minimum duration for the scroll travel
  },
  fadeDuration: {
    type: Number,
    default: 0.2, // seconds
  },
  watchContent: {
    type: Boolean,
    default: false, // enable reactive content watching (expensive, use only when needed)
  },
  alwaysScroll: {
    type: Boolean,
    default: false, // always scroll the text, even if no focus/hover or other command to trigger it was fired
  },
})

const slots = useSlots()

const events = {
  start: ["uinav-focus", "focus", "mouseenter"],
  stop: ["uinav-blur", "blur", "mouseleave"],
}

const elContainer = ref(null)
const elText = ref(null)
const scrollDistance = ref(0)
const translateX = ref(0)
const opacity = ref(1)
const isActive = ref(false)
const isScrolling = ref(false)
const locked = ref(false)

// incompatible element selectors for style overrides
const styleOverrides = {
  // "our-class-name": "selectors",
  "button-icon": ".bng-button.l-icon, .bng-button.r-icon",
}

const overrideClasses = ref([])

let parentElement = null
const fontSize = ref(16)
const scrollSpeed = computed(() => props.scrollSpeed * fontSize.value)
// travel time, clamped so a full cycle never scrolls faster than minCycleTime
const scrollDuration = computed(() => Math.max(scrollDistance.value / scrollSpeed.value, props.minCycleTime))

let tmrAutoStart = null

let animTimer = null
const animTimeout = (func, ms) => {
  if (animTimer) {
    clearTimeout(animTimer)
    animTimer = null
  }
  if (typeof func !== "function") return null
  animTimer = setTimeout(() => {
    animTimer = null
    if (isScrolling.value) func()
  }, ms)
  return animTimer
}

const scrollStyles = computed(() => ({
  transform: `translateX(${translateX.value}px)`,
  opacity: opacity.value,
  transition: `opacity ${props.fadeDuration}s linear` +
    (isScrolling.value && opacity.value > 0 ? `, transform ${scrollDuration.value}s linear` : ""),
}))

function animLoop() {
  if (!isScrollable()) return

  scrollDistance.value = getSize()
  if (scrollDistance.value <= 0) return

  // check if travel time is clamped to minCycleTime (short text)
  // this is needed to avoid annoying flickering of text just barely fitting the container
  const clamped = scrollDistance.value / scrollSpeed.value < props.minCycleTime

  /// sequence:
  // fade in - immediate
  // initial pause - initialPause or fadeDuration
  // scroll - calculated by size + endingPause
  // when clamped: animate back to start (no fade)
  // otherwise: fade out - fadeDuration
  // and then restart

  // fade in
  opacity.value = 1

  // initial pause
  animTimeout(() => {
    // scroll
    translateX.value = -scrollDistance.value

    // end pause
    animTimeout(() => {
      if (clamped) {
        // animate back without fade
        translateX.value = 0
        animTimeout(animLoop, scrollDuration.value * 1000)
      } else {
        // fade out
        opacity.value = 0
        // wait for fade out
        animTimeout(() => {
          translateX.value = 0 // reset position
          nextTick(animLoop) // start next cycle
        }, props.fadeDuration * 1000)
      }

    }, scrollDuration.value * 1000 + props.endingPause * 1000)

  }, Math.max(props.initialPause, props.fadeDuration) * 1000)
}

function isScrollable() {
  if (!elContainer.value || !elText.value) return false
  const containerWidth = elContainer.value.clientWidth
  const textWidth = elText.value.scrollWidth
  return textWidth > containerWidth
}

function getSize() {
  if (!elContainer.value || !elText.value) return 0
  const containerWidth = elContainer.value.clientWidth
  const textWidth = elText.value.scrollWidth
  return Math.max(0, textWidth - containerWidth)
}

function animStart() {
  if (isScrolling.value) return
  isActive.value = true
  if (!isScrollable()) return
  isScrolling.value = true
  translateX.value = 0
  opacity.value = 1
  animLoop()
}

function animStop(restartAnim = false) {
  if (locked.value) return
  isActive.value = false
  isScrolling.value = false
  animTimeout() // will clear the timer
  nextTick(() => {
    translateX.value = 0
    opacity.value = 1
    if (typeof restartAnim === "boolean" && restartAnim) {
      nextTick(animStart)
    }
  })
}

// watch for slot content changes if needed
if (props.watchContent) {
  watch(
    () => slots.default?.(),
    () => animStop(isActive.value),
    { deep: true }
  )
}

watch(
  [
    () => scrollSpeed.value,
    () => props.initialPause,
    () => props.endingPause,
    () => props.minCycleTime,
    () => props.fadeDuration,
  ],
  () => animStop(isActive.value)
)

watch(() => elContainer.value, () => {
  if (!elContainer.value) return

  const fSize = window.getComputedStyle(elContainer.value, null).fontSize
  fontSize.value = +fSize.substring(0, fSize.length - 2)

  // this prop makes text scroller to always be active
  if (props.alwaysScroll) {
    locked.value = true
    tmrAutoStart = setTimeout(() => {
      tmrAutoStart = null
      animStart()
    }, 500)
  }

  // find closest navigable parent element
  parentElement = elContainer.value.parentElement
  while (parentElement) {
    if (parentElement.matches(NAVIGABLE_ELEMENTS_SELECTOR)) break // found
    parentElement = parentElement.parentElement
    if (parentElement === document.body) { // not found
      parentElement = null
      break
    }
  }

  if (!parentElement) return

  // detect if parent element isn't fully compatible and add override styles
  overrideClasses.value = []
  for (const [key, selectors] of Object.entries(styleOverrides)) {
    if (parentElement.matches(selectors)) {
      overrideClasses.value.push(`bng-text-override--${key}`)
    }
  }

  events.start.forEach(event => parentElement.addEventListener(event, animStart))
  events.stop.forEach(event => parentElement.addEventListener(event, animStop))
}, { immediate: true })

watch(() => props.alwaysScroll, () => {
  if (props.alwaysScroll) {
    locked.value = true
    nextTick(animStart)
  } else {
    if (tmrAutoStart) {
      clearTimeout(tmrAutoStart)
      tmrAutoStart = null
    }
    locked.value = false
    animStop()
  }
})

defineExpose({
  start() {
    if (props.alwaysScroll) return
    locked.value = true
    animStart()
  },
  stop() {
    if (props.alwaysScroll) return
    locked.value = false
    animStop()
  },
})

onUnmounted(() => {
  animTimeout() // will clear the timer
  if (parentElement) {
    events.start.forEach(event => parentElement.removeEventListener(event, animStart))
    events.stop.forEach(event => parentElement.removeEventListener(event, animStop))
  }
})
</script>

<style lang="scss" scoped>
.bng-text-scroller {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  width: auto;
  max-width: 100%;
  height: auto;
  overflow: hidden;
  flex: 0 1 auto; // for better inline support

  .scroller-text {
    display: inline-block;
    width: max-content;
    height: auto;
    white-space: nowrap;
  }
  &:not(.is-scrolling) .scroller-text {
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  // specific style overrides
  &.bng-text-override {
    // button with icon
    &--button-icon {
      // icon size + icon padding (wrong) + button padding
      // max-width: calc(var(--bng-icon-size, 1.5em) + 0.2em + 0.5em);
      flex: 0 1 100%;
    }
  }
}
</style>
