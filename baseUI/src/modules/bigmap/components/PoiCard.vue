<!-- PoiCard - Component for displaying a single POI item -->
<template>
  <div
    class="poi-item"
    :class="{ highlighted: poi.isSelected }"
    v-bng-on-ui-nav:ok="onSelect"
    v-bng-ui-nav-label:ok="$t('bigMap.poiList.selectPoi')"
    v-bng-click="onSelect"
    bng-nav-item
    :bng-scoped-nav-autofocus="poi.isSelected"
    v-bng-sound-class="'bng_click_hover_generic'"
  >
    <div class="card-info">
      <div class="card-icon">
        <BngIcon :type="poi.icon || icons.placeholder" color="white" />
      </div>
      <div class="card-main">
        <div class="heading">
          {{ poi.name }}
        </div>
        <div v-if="poi.formattedProgress" class="stars">
          <BngMainStars
            v-if="defaultStars"
            :individual-stars="defaultStars"
            class="main-stars"
            :scale="0.6"
            reverse
          />
          <BngMainStars
            v-if="bonusStars && poi.formattedProgress.unlockedStars && poi.formattedProgress.unlockedStars.totalBonusStarCount > 0"
            :individual-stars="bonusStars"
            class="bonus-stars"
            :scale="0.6"
          />
        </div>
        <div v-else-if="poi.aggregatePrimary" class="aggregate-primary">
          <span class="label">{{ poi.aggregatePrimary.label }}:</span>
          <span class="value">{{ poi.aggregatePrimary.value }}</span>
        </div>
      </div>
      <div
        class="card-thumb"
        :class="{ 'thumb-show': thumbShown && !!thumb }"
        :style="{ '--poi-image': thumb }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue"
import { BngIcon, BngMainStars, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngClick, vBngSoundClass, vBngUiNavLabel } from "@/common/directives"

const props = defineProps({
  poi: {
    type: Object,
    required: false,
    default: null,
  },
  shown: {
    type: Boolean,
    default: true,
  }
})

// Helper function to ensure a value is an array
const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === 'object') {
    // Convert object to array of values
    return Object.values(value)
  }
  return null
}

// Computed properties to normalize defaults and bonus to arrays
const defaultStars = computed(() => {
  const unlockedStars = props.poi?.formattedProgress?.unlockedStars
  if (!unlockedStars) return null
  return ensureArray(unlockedStars.defaults)
})

const bonusStars = computed(() => {
  const unlockedStars = props.poi?.formattedProgress?.unlockedStars
  if (!unlockedStars) return null
  return ensureArray(unlockedStars.bonus)
})

const emit = defineEmits(["select", "hover"])

const onSelect = () => {
  if (!props.poi) return
  emit("select", props.poi.id)
}

// if shown=true at start, don't use lazy loading
let thumbLoaded = props.shown && !!props.poi?.thumbnail
const thumbShown = ref(thumbLoaded)
const thumb = ref(thumbLoaded ? `url("${props.poi?.thumbnail}")` : "none")
let lastThumb = thumbLoaded ? props.poi?.thumbnail : undefined
watch([() => props.shown, () => props.poi], () => {
  if (props.shown && props.poi?.thumbnail) {
    const url = props.poi.thumbnail
    if (lastThumb !== url) {
      lastThumb = url
      thumbLoaded = false
      const img = new Image()
      img.src = url
      img.onload = () => {
        if (lastThumb === url) {
          thumbLoaded = true
          thumb.value = `url("${url}")`
          thumbShown.value = true
        }
      }
    }
  } else if (!props.poi?.thumbnail) {
    lastThumb = undefined
    thumbLoaded = false
    thumb.value = "none"
    thumbShown.value = false
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.poi-item {
  --indicator-width: 0.5rem;
  --thumb-width: 34%;

  font-size: 1rem;
  font-family: Overpass, var(--fnt-defs);
  display: flex;
  position: relative;

  .card-info {
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 3.5rem;
    position: relative;
    background-color: var(--bng-cool-gray-900);
    border-radius: var(--bng-corners-2);
    overflow: hidden;
    color: var(--bng-off-white);

    // highlight marker
    border-left: var(--indicator-width) solid transparent;
  }

  // first column: icon, always square
  .card-icon {
    flex: 0 0 auto;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
  }

  // second column: name + stars, vertically centered
  .card-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.125rem;
    padding: 0.25rem 0.25rem;

    .heading {
      font-weight: 800;
      font-size: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }

    .stars {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      > .main-stars {
        --star-color: var(--bng-ter-yellow-50);
      }
      > .bonus-stars {
        --star-color: var(--bng-add-blue-400);
      }
    }

    .aggregate-primary {
      font-size: 0.9rem;
      color: var(--bng-cool-gray-300);

      .label {
        font-weight: 300;
        margin-right: 0.25rem;
      }
      .value {
        font-weight: 500;
      }
    }
  }

  // third column: thumbnail
  .card-thumb {
    flex: 0 0 var(--thumb-width);
    align-self: stretch;
    background-image: var(--poi-image);
    background-position: 100% 50%;
    background-repeat: no-repeat;
    background-size: cover;
    opacity: 0;
    transition: opacity 200ms;
    pointer-events: none;

    &.thumb-show {
      opacity: 1;
    }
  }

  &:focus,
  &:hover {
    .card-info {
      background-color: var(--bng-cool-gray-700);
    }
  }

  &.highlighted .card-info {
    background-color: var(--bng-orange-700);
    border-left-color: var(--bng-orange-400);
  }
}
</style>