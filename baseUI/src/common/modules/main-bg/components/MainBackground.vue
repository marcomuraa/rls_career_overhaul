<template>
  <Slideshow
    class="background-image"
    ref="carousel"
    :images="backgrounds.normal"
    :delay="10000"
    :transition="transition"
    shuffle
  />
  <!-- this is to force the browser to show images right away by storing them in memory -->
  <div v-for="(list, listName) in backgroundsCache" :key="listName" class="backgrounds-cache">
    <img v-for="src in list" :key="src" :src="src" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { lua } from "@/bridge"
import { useImageList, UNOFFICIAL } from "@/services/imageList"
import Slideshow from "./Slideshow.vue"

const driveList = useImageList("images/mainmenu/drive")
const techList = useImageList("images/mainmenu/tech")

const toBackgroundPair = list => ({
  normal: list.map(entry => entry.normal || entry.blur).filter(Boolean),
  blur: list.map(entry => entry.blur || entry.normal).filter(Boolean),
})

const _backgrounds = computed(() => ({
  drive: toBackgroundPair(driveList.images.value),
  tech: toBackgroundPair(techList.images.value),
  unofficial: {
    normal: [UNOFFICIAL.normal],
    blur: [UNOFFICIAL.blur],
  },
}))

const backgroundId = ref("drive")
const backgrounds = computed(() => _backgrounds.value[backgroundId.value] || { normal: [], blur: [] })
const backgroundsCache = computed(() => backgrounds.value)

const carousel = ref()
defineExpose({
  carousel: computed(() => carousel.value),
  backgrounds: computed(() => backgrounds.value),
})

defineProps({
  transition: {
    type: [Boolean, Number],
    default: 20,
  },
})

onMounted(async () => {
  const isTech = await lua.extensions.tech_license.isValid()
  backgroundId.value = isTech ? "tech" : "drive"
  // do we really need to check for this if we already confirmed the license?
  bngApi.engineLua("sailingTheHighSeas", ahoy => {
    backgroundId.value = ahoy ? "unofficial" : isTech ? "tech" : "drive"
  })
})
</script>

<style lang="scss" scoped>
.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.backgrounds-cache {
  // this must not be display:none; in order to work
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  overflow: hidden;
  pointer-events: none;
  > img {
    width: 1px;
    height: 1px;
  }
}
</style>
