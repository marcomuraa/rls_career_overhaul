<template>
  <AspectRatio
    class="tutorial-popup-media"
    ratio="1.46:1"
    slot-v-align="top"
    :slot-scroll="false"
    :external-image="popupImage || null"
    image-mode="cover"
  >
    <div class="tutorial-popup-overlay">
      <div class="money-display">
        <div class="money-panel">
          <BngCardHeading class="money-heading" type="ribbon">{{ $tt("ui.career.tutorial.popup.apmOnboarding.balance") }}</BngCardHeading>
          <div class="money-amount" :class="{ complete: animationComplete }">
            <BngUnit :money="displayMoney" />
          </div>
        </div>
      </div>
      <div class="tutorial-popup-spacer" />
      <div v-if="hasContentText" class="tutorial-popup-text-block" v-html="contentTextHtml" />
    </div>
  </AspectRatio>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { BngCardHeading, BngUnit } from "@/common/components/base"
import { AspectRatio } from "@/common/components/utility"
import { $content, $translate } from "@/services"

defineOptions({ name: "ApmOnboardingPopup" })

const props = defineProps({
  popup: {
    type: Object,
    default: () => ({}),
  },
})

const ANIMATION_DURATION_MS = 2500
const ANIMATION_DELAY_MS = 450
const num = value => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const easeFun = t => Math.sqrt(1 - Math.pow(t - 1, 2))

const popupImage = computed(() => props.popup?.image || "")
const startMoney = computed(() => num(props.popup?.startingMoney))
const endMoney = computed(() => num(props.popup?.endMoney))
const contentText = computed(() => props.popup?.text || " ")
const contentTextHtml = computed(() => $content.bbcode.parse($translate.instant(contentText.value)))
const hasContentText = computed(() => typeof props.popup?.text === "string" && props.popup.text.trim().length > 0)

const displayMoney = ref(startMoney.value)
const animationComplete = ref(false)
let rafId = null
let delayId = null

function animateMoney() {
  const start = startMoney.value
  const end = endMoney.value
  const startedAt = performance.now()
  animationComplete.value = false
  displayMoney.value = start

  function tick() {
    const t = Math.min((performance.now() - startedAt) / ANIMATION_DURATION_MS, 1)
    displayMoney.value = Math.ceil(start + (end - start) * easeFun(t))
    if (t < 1) {
      rafId = requestAnimationFrame(tick)
      return
    }
    displayMoney.value = end
    animationComplete.value = true
    rafId = null
  }

  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  delayId = setTimeout(() => {
    delayId = null
    animateMoney()
  }, ANIMATION_DELAY_MS)
})

onUnmounted(() => {
  if (delayId != null) clearTimeout(delayId)
  if (rafId != null) cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
@use "sass:map";
@use "sass:color";
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");

.tutorial-popup-media {
  height: 66vh;
  max-height: calc(100vh - 14rem);
}

.tutorial-popup-overlay {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  color: $off-white;
  text-shadow: color.change($off-black, $alpha: 0.6) 0 0 1em;
  padding: 2rem;
}

.money-display {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.money-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 32rem;
  background: rgba(var(--bng-off-black-rgb), 0.8);
  border-radius: 0.5rem;
  color: var(--bng-off-white);
  padding-bottom: 0.75rem;
}

.money-heading {
  width: 100%;
  --bng-heading-background-opacity: 0;
  margin-bottom: 0.0rem;
}

.money-amount {
  font-size: 4.25rem;
  font-style: italic;
  font-weight: 800;
  line-height: 1;
  transition: transform 120ms ease;

  --font-weight-value: 800;
  --icon-size: 5rem;

  &.complete {
    animation: moneyCompleteBounce 0.75s cubic-bezier(0.25, 1.45, 0.5, 1);
  }
}

.tutorial-popup-spacer {
  flex: 0 0 auto;
}

.tutorial-popup-text-block {
  background: rgba(var(--bng-off-black-rgb), 0.8);
  border-left: 2px solid rgba(var(--bng-off-white-rgb), 1);
  width: 100%;
  border-radius: 0.5rem;
  box-sizing: border-box;
  font-size: 1.8em;
  font-weight: 350;
  line-height: 1.5;
  padding: 1.0rem 1.5rem;
}

@keyframes moneyCompleteBounce {
  0% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.10);
  }


  100% {
    transform: scale(1);
  }
}
</style>
