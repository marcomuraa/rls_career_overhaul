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
      <div class="task-list">
        <div v-for="task in tasks" :key="task.label" class="task-row" :class="{ complete: task.complete, animate: task.animating }">
          <span class="task-fill" />
          <BngIcon class="task-icon" :type="task.icon" />
          <span class="task-label">{{ $tt(task.label) }}</span>
          <span class="task-checkbox" :class="{ checked: task.checked }" :style="checkboxSvgs" />
        </div>
        <div class="task-divider" />
        <div class="eligibility-row" :class="{ complete: isEligible, animate: eligibilityAnimating }">
          <span class="eligibility-fill" />
          <span class="eligibility-label">{{ $tt(eligibilityText) }}</span>
        </div>
      </div>
    </div>
  </AspectRatio>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onUnmounted } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { AspectRatio } from "@/common/components/utility"
import { getAssetURL } from "@/utils"

defineOptions({ name: "ContractSign" })
const emit = defineEmits(["popup-primary-button-state"])

const props = defineProps({
  popup: {
    type: Object,
    default: () => ({}),
  },
})

const popupImage = computed(() => props.popup?.image || "")

const tasks = reactive([
  { label: "ui.career.tutorial.popup.contractSign.task.basicDrivingCourse", icon: icons.steeringWheelSporty, complete: false, checked: false, animating: false },
  { label: "ui.career.tutorial.popup.contractSign.task.dragRacingTest", icon: icons.drag01, complete: false, checked: false, animating: false },
  { label: "ui.career.tutorial.popup.contractSign.task.mapNavigation", icon: icons.mapPoint, complete: false, checked: false, animating: false },
])
const isEligible = ref(false)
const eligibilityAnimating = ref(false)
let cancelled = false

const popupPrimaryButtonState = computed(() => {
  return { label: "ui.career.tutorial.popup.contractSign.button.joinTeam", disabled: !isEligible.value }
})
const eligibilityText = computed(() => {
  return isEligible.value ? "ui.career.tutorial.popup.contractSign.eligible" : "ui.career.tutorial.popup.contractSign.validating"
})
const checkboxSvgs = computed(() => ({
  "--checkbox-empty": `url(${getAssetURL("icons/general/checkbox-empty.svg")})`,
  "--checkbox-ok": `url(${getAssetURL("icons/general/checkbox-ok.svg")})`,
}))

watch(
  popupPrimaryButtonState,
  state => emit("popup-primary-button-state", state),
  { immediate: true }
)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function animateTasks() {
  tasks.forEach(task => {
    task.complete = false
    task.checked = false
    task.animating = false
  })
  isEligible.value = false
  eligibilityAnimating.value = false
  await sleep(650)
  for (const task of tasks) {
    if (cancelled) return
    task.complete = true
    task.animating = true
    await sleep(850)
    task.checked = true
    await sleep(450)
    task.animating = false
    await sleep(250)
  }
  if (cancelled) return
  eligibilityAnimating.value = true
  await sleep(750)
  if (cancelled) return
  await sleep(250)
  if (cancelled) return
  isEligible.value = true
  eligibilityAnimating.value = false
}

async function onPopupPrimaryAction() {
  return isEligible.value
}

function onPopupClose() {
  return isEligible.value
}

onMounted(() => {
  animateTasks()
})

onUnmounted(() => {
  cancelled = true
})

defineExpose({
  onPopupPrimaryAction,
  onPopupClose,
})
</script>

<style lang="scss" scoped>
@use "sass:map";
@use "sass:color";
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");
$eligible-green: map.get(colors.$colors, "bng-add-green-500");

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
  justify-content: center;
  align-items: flex-start;
  color: $off-white;
  text-shadow: color.change($off-black, $alpha: 0.6) 0 0 1em;
  padding: 2rem;
}

.tutorial-popup-overlay > .task-list {
  align-self: center;
  width: min(44rem, 86%);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.task-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.95rem 1.25rem;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.9);
  color: var(--bng-off-white);
  overflow: hidden;
  transform-origin: center;
  transition: background-color 250ms ease, transform 250ms ease;

  > * {
    position: relative;
    z-index: 1;
  }

  &.complete {
    background: rgba(var(--bng-cool-gray-700-rgb), 0.9);

    > .task-fill {
      opacity: 0.34;
      transform: scaleX(1);
    }
  }

  &.complete.animate {
    > .task-fill {
      animation: completeTaskFill 1.05s cubic-bezier(0.65, 0, 0.35, 1) forwards;

      &::after {
        animation: completeTaskFillShine 1.05s cubic-bezier(0.65, 0, 0.35, 1) forwards;
      }
    }

    > .task-checkbox {
      mask-image: var(--checkbox-empty);
      -webkit-mask-image: var(--checkbox-empty);
      animation: completeTaskCheckbox 0.35s cubic-bezier(0.25, 1.3, 0.5, 1) 1.05s both;
    }
  }
}

.task-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(90deg, rgba(var(--bng-orange-rgb), 1), rgba(var(--bng-orange-rgb), 0.72));
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left center;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: -2rem;
    bottom: 0;
    width: 4rem;
    background: linear-gradient(90deg, transparent, rgba(var(--bng-off-white-rgb), 0.55), transparent);
    opacity: 0;
  }
}

.task-checkbox,
.task-icon {
  flex: 0 0 auto;
}

.task-checkbox {
  display: inline-block;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: auto;
  background: var(--bng-off-white);
  mask-image: var(--checkbox-empty);
  -webkit-mask-image: var(--checkbox-empty);
  mask-size: 100% 100%;
  -webkit-mask-size: 100% 100%;
  mask-position: center;
  -webkit-mask-position: center;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;

  &.checked {
    mask-image: var(--checkbox-ok);
    -webkit-mask-image: var(--checkbox-ok);
  }
}

.task-icon {
  --bng-icon-size: 2rem;
  --bng-icon-color: var(--bng-off-white);
}

.task-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1.55rem;
  font-weight: 600;
  line-height: 1.2;
}

.task-divider {
  width: 100%;
  height: 0.125rem;
  background: rgba(var(--bng-off-white-rgb), 0.8);
}

.eligibility-row {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 0.95rem 1.25rem;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.9);
  color: var(--bng-cool-gray-400);
  text-align: center;
  overflow: hidden;
  transition: background-color 250ms ease;

  > * {
    position: relative;
    z-index: 1;
  }

  &.complete {
    background: rgba(var(--bng-cool-gray-700-rgb), 0.9);
    color: var(--bng-off-white);


    > .eligibility-fill {
      opacity: 0.42;
      transform: scaleX(1);
    }
  }

  &.animate {
    > .eligibility-fill {
      animation: completeEligibilityFill 0.75s cubic-bezier(0.65, 0, 0.35, 1) forwards;
    }
  }
}

.eligibility-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(90deg, color.change($eligible-green, $alpha: 0.95), color.change($eligible-green, $alpha: 0.62));
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left center;
  pointer-events: none;
}

.eligibility-label {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.25;
}

@keyframes completeTaskFill {
  0% {
    opacity: 1;
    transform: scaleX(0);
  }

  82% {
    opacity: 1;
    transform: scaleX(1);
  }

  100% {
    opacity: 0.34;
    transform: scaleX(1);
  }
}

@keyframes completeTaskFillShine {
  0% {
    opacity: 0;
    transform: translateX(-44rem);
  }

  18% {
    opacity: 1;
  }

  82% {
    opacity: 1;
    transform: translateX(0);
  }

  100% {
    opacity: 0;
    transform: translateX(0);
  }
}

@keyframes completeTaskCheckbox {
  0% {
    mask-image: var(--checkbox-empty);
    -webkit-mask-image: var(--checkbox-empty);
    transform: scale(1);
  }

  1% {
    mask-image: var(--checkbox-ok);
    -webkit-mask-image: var(--checkbox-ok);
  }

  55% {
    mask-image: var(--checkbox-ok);
    -webkit-mask-image: var(--checkbox-ok);
    transform: scale(1.22);
  }

  100% {
    mask-image: var(--checkbox-ok);
    -webkit-mask-image: var(--checkbox-ok);
    transform: scale(1);
  }
}

@keyframes completeEligibilityFill {
  0% {
    opacity: 1;
    transform: scaleX(0);
  }

  100% {
    opacity: 0.42;
    transform: scaleX(1);
  }
}

</style>
