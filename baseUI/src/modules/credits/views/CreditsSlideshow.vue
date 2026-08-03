<template>
  <div
    v-bng-scoped-nav="{ scopeId: CREDITS_SCOPE_ID }"
    ref="wrapper"
    class="wrapper"
    tabindex="0"
    v-bng-on-ui-nav:focus_l,focus_u="prevSlide"
    v-bng-on-ui-nav:focus_r,focus_d,ok="nextSlide"
    v-bng-on-ui-nav:menu="exit"
    @keydown.left="prevSlide"
    @keydown.right="nextSlide"
    @keydown.esc.prevent="exit"
    @click="nextSlide"
  >
    <div class="content">
      <img class="logo" :src="logoURL" alt="" />

      <Transition name="fade" mode="out-in" appear>
        <div v-if="contentVisible" :key="headerTransitionKey" class="header">
          <div v-if="headerTitle" class="group-title">{{ $t(headerTitle) }}</div>
          <div v-if="headerSubtitle" class="group-subtitle">{{ $t(headerSubtitle) }}</div>
          <div v-if="headerTertiaryTitle" class="group-tertiary-title">{{ $t(headerTertiaryTitle) }}</div>
        </div>
      </Transition>

      <Transition name="fade" mode="out-in" appear>
        <div v-if="contentVisible" :key="contentTransitionKey" class="groups">
          <div v-for="(group, idx) in currentSlide" :key="`${currentSlideIndex}-${idx}-${group.groupTitle}`" class="group">
            <div v-if="idx > 0" class="group-title">{{ $t(group.groupTitle) }}</div>
            <div v-if="idx > 0 && group.groupSubtitle" class="group-subtitle">{{ $t(group.groupSubtitle) }}</div>
            <div v-if="idx > 0 && group.groupTertiaryTitle" class="group-tertiary-title">{{ $t(group.groupTertiaryTitle) }}</div>
            <div v-if="group.tryTwoColumns" class="members-two-columns">
              <div
                v-for="(member, mIndex) in group.members"
                :key="`twocol-${idx}-${mIndex}`"
                class="member-two-column-item"
                :class="{ 'member-two-column-full': member._isTwoColumnFull, 'member-divider-item': member._isDivider }">
                <template v-if="member._isDivider">
                  <span class="member-divider-line"></span>
                </template>
                <template v-else>
                  {{ member.first }}
                  <span v-if="member.aka" class="member-aka">&lt;{{ member.aka }}&gt;</span>
                  {{ member.last }}
                </template>
              </div>
            </div>
            <div v-else class="members-table">
              <div v-for="(member, mIndex) in group.members" :key="`${idx}-${mIndex}`" class="member-row">
                <template v-if="member._isDivider">
                  <span class="member-divider-wrap"><span class="member-divider-line"></span></span>
                </template>
                <template v-else-if="member._isContent">
                  <span class="member-cell member-name" :class="{ 'member-full': !member.role }">
                    {{ member.first }}
                    <span v-if="member.aka" class="member-aka">&lt;{{ member.aka }}&gt;</span>
                    {{ member.last }}
                  </span>
                  <span class="member-cell member-role" v-if="member.role">.{{ $t(member.role) }}</span>
                </template>
                <template v-else>&nbsp;</template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <div class="progress-line">
      <div class="progress-line-fill" :style="progressFillStyle"></div>
    </div>
  </div>
</template>

<script setup>
import { lua } from "@/bridge"
import { computed, ref, onMounted, onUnmounted, watch } from "vue"
import { getAssetURL } from "@/utils"
import { vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { luaRouterScopedNavBack } from "@/services/scopedNav/api"
import data from "@/modules/credits/data"
import { buildCreditSlides } from "@/modules/credits/slides"
import { clamp } from "@/utils/maths"

const CREDITS_SCOPE_ID = "mainmenu-extras-credits"
const logoURL = getAssetURL("images/logos.svg#bng-drive-white")
const wrapper = ref()
const slides = ref(buildCreditSlides(data))
const currentSlideIndex = ref(0)
const headerTransitionKey = ref(0)
const lastHeaderSignature = ref("")
const AUTO_ADVANCE_MS = 4500
const START_DELAY_MS = 200
const LAST_SLIDE_TIME_MS = 4500 * 2
const MANUAL_PROGRESS_ADJUST_MS = 220
let cleanedUp = false
let autoAdvanceTimer = null
let progressAdjustTimer = null
let startDelayTimer = null
let exiting = false
let lastSlideChangeWasManual = false
const contentVisible = ref(false)

const currentSlide = computed(() => slides.value[currentSlideIndex.value] || [])
const headerTitle = computed(() => currentSlide.value[0]?.groupTitle || "")
const headerSubtitle = computed(() => currentSlide.value[0]?.groupSubtitle || "")
const headerTertiaryTitle = computed(() => currentSlide.value[0]?.groupTertiaryTitle || "")
const contentTransitionKey = computed(() => `slide-${currentSlideIndex.value}`)
const progressScale = ref(0)
const progressTransitionMs = ref(0)
const progressTimingFunction = ref("linear")
const progressFillStyle = computed(() => {
  return {
    transform: `scaleX(${progressScale.value})`,
    transitionDuration: `${progressTransitionMs.value}ms`,
    transitionTimingFunction: progressTimingFunction.value,
  }
})

watch(() => `${headerTitle.value}|||${headerSubtitle.value}|||${headerTertiaryTitle.value}`, signature => {
  if (!lastHeaderSignature.value) {
    lastHeaderSignature.value = signature
    return
  }
  if (signature !== lastHeaderSignature.value) headerTransitionKey.value += 1
  lastHeaderSignature.value = signature
}, { immediate: true })

function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
  if (progressAdjustTimer) {
    clearTimeout(progressAdjustTimer)
    progressAdjustTimer = null
  }
  if (startDelayTimer) {
    clearTimeout(startDelayTimer)
    startDelayTimer = null
  }
  lua.scenetree["maincef:setMaxFPSLimit"](30)
}

const exit = () => {
  if (exiting) return
  exiting = true
  cleanup()
  luaRouterScopedNavBack(CREDITS_SCOPE_ID)
}

function nextSlide(isManual = true) {
  if (cleanedUp) return

  if (!slides.value.length) {
    exit()
    return
  }

  if (currentSlideIndex.value >= slides.value.length - 1) {
    exit()
    return
  }

  lastSlideChangeWasManual = isManual
  currentSlideIndex.value += 1
  scheduleAutoAdvance(false)
}

function prevSlide() {
  if (cleanedUp) return
  if (currentSlideIndex.value <= 0) return
  lastSlideChangeWasManual = true
  currentSlideIndex.value -= 1
  scheduleAutoAdvance(false)
}

function getTotalProgressDuration(slideCount) {
  if (slideCount <= 0) return 0
  if (slideCount === 1) return LAST_SLIDE_TIME_MS
  return (slideCount - 1) * AUTO_ADVANCE_MS + LAST_SLIDE_TIME_MS
}

function getElapsedProgressForIndex(index, slideCount) {
  if (slideCount <= 0) return 0
  if (slideCount === 1) return 0
  const clampedIndex = clamp(index, 0, slideCount - 1)
  return clampedIndex * AUTO_ADVANCE_MS
}

function restartProgressAnimation(isManual = false) {
  const slideCount = slides.value.length
  const totalDuration = getTotalProgressDuration(slideCount)
  if (!totalDuration) {
    progressTransitionMs.value = 0
    progressScale.value = 0
    return
  }

  const elapsed = getElapsedProgressForIndex(currentSlideIndex.value, slideCount)
  const baseScale = Math.max(0, Math.min(1, elapsed / totalDuration))
  const remaining = Math.max(0, totalDuration - elapsed)

  if (progressAdjustTimer) {
    clearTimeout(progressAdjustTimer)
    progressAdjustTimer = null
  }

  if (isManual) {
    progressTransitionMs.value = MANUAL_PROGRESS_ADJUST_MS
    progressTimingFunction.value = "ease"
    progressScale.value = baseScale
    progressAdjustTimer = setTimeout(() => {
      if (cleanedUp) return
      progressTransitionMs.value = remaining
      progressTimingFunction.value = "linear"
      progressScale.value = 1
      progressAdjustTimer = null
    }, MANUAL_PROGRESS_ADJUST_MS)
    return
  }

  progressTransitionMs.value = 0
  progressTimingFunction.value = "linear"
  progressScale.value = baseScale
  window.requestAnimationFrame(() => {
    if (cleanedUp) return
    progressTransitionMs.value = remaining
    progressScale.value = 1
  })
}

watch(currentSlideIndex, () => {
  restartProgressAnimation(lastSlideChangeWasManual)
  lastSlideChangeWasManual = false
})

function scheduleAutoAdvance(includeStartDelay = false) {
  if (cleanedUp) return
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
  const slideDelay = currentSlideIndex.value < slides.value.length - 1 ? AUTO_ADVANCE_MS : LAST_SLIDE_TIME_MS
  const delay = slideDelay + (includeStartDelay ? START_DELAY_MS : 0)
  autoAdvanceTimer = setTimeout(() => {
    nextSlide(false)
  }, delay)
}

const start = () => {
  lua.scenetree["maincef:setMaxFPSLimit"](60)
  window.requestAnimationFrame(() => wrapper.value?.focus())
  progressTransitionMs.value = 0
  progressScale.value = 0
  startDelayTimer = setTimeout(() => {
    if (cleanedUp) return
    contentVisible.value = true
    restartProgressAnimation()
    scheduleAutoAdvance(false)
    startDelayTimer = null
  }, START_DELAY_MS)
}

onMounted(start)
onUnmounted(cleanup)
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.wrapper {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: calc-ui-rem(1);
  background: radial-gradient(ellipse at top left, #334455 0%, #000 100%);
  text-align: center;
  overflow: hidden;
  cursor: pointer;
  &:focus {
    outline: none !important;
    box-shadow: none !important;
    &::before {
      content: "" !important;
      border: none;
    }
  }
}

.content {
  --member-row-height: 1.5em;
  width: min(90vw, calc(74vh * 16 / 9));
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  font-family: "Overpass", var(--fnt-defs);
  /* font-family: "Roboto Condensed"; - if something breaks there */
  text-transform: uppercase;
  color: #fff;

  .logo {
    display: block;
    width: min(28em, 60%);
    height: 3em;
    align-self: center;
    object-fit: contain;
    object-position: 50% 50%;
  }

  .header {
    min-height: 5em;
    margin-top: 2.2em;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.2em;
    * {
      white-space: nowrap;
    }
  }

  .groups {
    display: flex;
    flex-direction: column;
    gap: 2.5em;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .group-title {
    display: block;
    font-size: 2em;
    font-weight: 600;
  }

  .group-subtitle {
    display: block;
    font-size: 1.5em;
    font-weight: 600;
    font-style: italic;
    color: #fff;
    text-transform: uppercase;
  }

  .group-tertiary-title {
    display: block;
    font-size: 1.2em;
    font-weight: 600;
    color: #fff;
  }

  .members-table {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .members-two-columns {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: 0.2em 1em;
    width: 100%;
  }

  .member-two-column-item {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 calc(50% - 0.5em);
    width: calc(50% - 0.5em);
    text-align: center;
    font-size: 1.4em;
    font-style: normal;
    color: #fff;
    text-transform: capitalize;
    padding: 0.05em;
    min-height: var(--member-row-height);
  }

  .member-two-column-item:last-child:nth-child(odd),
  .member-two-column-item.member-two-column-full {
    flex-basis: 100%;
    width: 100%;
  }

  .member-row {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: 0.1em;
    width: 100%;
    min-height: var(--member-row-height);
  }

  .member-divider-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: calc(var(--member-row-height) * 2);
    padding: 0;
  }
  .member-divider-line {
    display: block;
    width: 15em;
    max-width: 55%;
    height: 1px;
    margin-bottom: 2px; // position fix
    background-color: var(--bng-ter-blue-gray-600);
  }

  .member-cell {
    font-size: 1.4em;
    font-style: normal;
    padding: 0.1em 0;
  }

  .member-divider-item {
    min-height: calc(var(--member-row-height) * 2);
  }

  .member-name,
  .member-role {
    // $size: calc(50% - 1em);
    $size: 50%;
    flex: 0 0 $size;
    width: $size;
  }

  .member-name {
    text-align: right;
    color: #fff;
    text-transform: capitalize;

    &.member-full {
      flex: 0 0 100%;
      width: 100%;
      text-align: center;
    }
  }

  .member-role {
    text-align: left;
    color: var(--bng-orange-b400);
    font-style: italic;
    text-transform: none;
  }

  .member-aka {
    text-transform: none;
    font-family: var(--fnt-mono), monospace;
    text-shadow: 0 0 3px #0f0;
    font-weight: 50;
    font-size: 0.8em;
    -webkit-font-smoothing: none;
    margin: 0 0.3em;
  }
}

.progress-line {
  position: absolute;
  left: 1em;
  right: 1em;
  bottom: 1em;
  height: 2px;
}

.progress-line-fill {
  width: 100%;
  height: 100%;
  background: var(--bng-orange);
  transform-origin: left center;
  transform: scaleX(0);
  transition-property: transform;
  transition-timing-function: linear;
  transition-duration: 0ms;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 250ms ease;
}
.fade-enter-from,
.fade-leave-to,
.fade-appear-from {
  opacity: 0;
}
</style>
