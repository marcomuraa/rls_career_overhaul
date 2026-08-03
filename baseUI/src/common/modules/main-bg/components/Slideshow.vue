<template>
  <div :class="{ anim }"></div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from "vue"
import { getAssetURL } from "@/utils"

const props = defineProps({
  images: Array, // array of images
  transition: {
    type: [Boolean, Number],
    default: false,
    validator: v => typeof v === "boolean" || (typeof v === "number" && v > 0),
  }, // enables fade transition effect. If number, it sets the FPS of the transition
  delay: { // delay between images
    type: Number,
    default: 10000,
  },
  parent: Object, // parent slideshow
  shuffle: Boolean, // shuffle the images
})

const anim = ref(false)
const imgPrev = ref("")
const imgNext = ref("")
const imgIndex = ref(-1)
let sequence = [], sequenceIndex = -1
let tmrMain, tmrAnim
let wImages, wParent
let paused = false

const transitionTiming = computed(() => {
  if (typeof props.transition === "number") {
    return `steps(${Math.round(props.transition)})`
  }
  return "ease"
})

defineExpose({
  imgIndex,
  nextImage,
  pause,
  play,
  resume: play,
  carousel: {showNext: nextImage}, // for compat with carousel
})

onUnmounted(stopTimers)

function stopTimers() {
  if (tmrMain) {
    clearTimeout(tmrMain)
    tmrMain = null
  }
  if (tmrAnim) {
    clearTimeout(tmrAnim)
    tmrAnim = null
  }
}

function pause() {
  paused = true
  stopTimers()
}

function play() {
  if (!paused) return
  paused = false
  if (!props.parent && props.images?.length > 1) {
    tmrMain = setTimeout(nextImage, props.delay)
  }
}

watch(() => props.parent, parent => {
  // disable old watchers
  if (wImages) {
    wImages()
    wImages = null
  }
  if (wParent) {
    wParent()
    wParent = null
  }
  if (!parent) {
    // without parent, watch for images to restart the slideshow if needed
    wImages = watch([() => props.images, () => props.shuffle], ([images, shuffle]) => {
      if (!images) return
      imgIndex.value = -1
      if (images.length > 0) {
        if (shuffle) {
          sequenceIndex = -1
          sequence = Array.from(images)
            .map((_, i) => i)
            .sort(() => Math.random() - 0.5)
        }
        nextTick(nextImage)
      }
    }, { immediate: true })
  } else {
    // with parent, watch for the image index change on a parent
    wParent = watch([() => props.images, () => parent.imgIndex], ([images, index]) => {
      if (!images) return
      imgIndex.value = index
      if (images.length > 0) nextTick(nextImage)
    }, { immediate: true })
  }
}, { immediate: true })

function nextImage() {
  if (paused) return
  stopTimers()
  if (!props.images?.length) return
  // without parent, switch to the next image
  if (!props.parent) {
    if (props.shuffle && sequence.length > 0) {
      sequenceIndex = ++sequenceIndex % props.images.length
      imgIndex.value = sequence[sequenceIndex]
    } else {
      imgIndex.value = ++imgIndex.value % props.images.length
    }
  }
  if (imgIndex.value < 0 || imgIndex.value >= props.images.length) return
  const img = `url("${getAssetURL(props.images[imgIndex.value])}")`
  if (props.transition) {
    // with transition, set class and start animation timer
    // (we can't listen for transition end on pseudo elements)
    imgNext.value = img
    anim.value = true
    tmrAnim = setTimeout(() => {
      tmrAnim = null
      anim.value = false
      imgPrev.value = imgNext.value
      imgNext.value = ""
    }, 1000) // transition time
  } else {
    // without transition
    imgPrev.value = img
  }
  if (!paused && !props.parent && props.images.length > 1) {
    // without parent, start timer for the next image if there is more than one image
    tmrMain = setTimeout(nextImage, props.delay)
  }
}
</script>

<style scoped>
div {
  position: relative;
  background-image: v-bind(imgPrev);
}

div::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: v-bind(imgNext);
  opacity: 0;
}

.anim::after {
  opacity: 1;
  transition: opacity 1000ms v-bind(transitionTiming);
}

div,
div::after {
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-size: cover;
}
</style>
