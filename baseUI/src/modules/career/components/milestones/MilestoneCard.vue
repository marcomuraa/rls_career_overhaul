<template>
  <Button
    class="milestone-card condensed"
    :style="milestoneStyle"
    :sound-class="milestone.claimable ? 'bng_click_hover_generic' : 'bng_hover_generic'"
    v-bng-on-ui-nav:ok.focusRequired.asMouse
    @click="claimMilestone">
    <div v-if="milestone.completed" class="complete"></div>
    <div class="media">
      <AspectRatio class="image" :ratio="'1:1'">
        <div v-if="milestone.completed" class="complete"></div>
        <div v-if="milestone.completed" class="complete-badge"><BngIcon class="glyph small" :type="icons.checkmark" /></div>
        <BngIcon class="glyph" :type="icons[milestone.icon]" />
        <div v-if="milestone.step !== undefined && milestone.maxStep !== undefined" class="step">{{ milestone.step }}/{{ milestone.maxStep }}</div>
        <div v-if="milestone.step !== undefined && milestone.maxStep === undefined" class="step">{{ milestone.step }}</div>
        <div class="image-rewards" v-if="milestone.rewards">
          <template v-for="reward in milestone.rewards">
            <RewardPill  class="reward-pill" :icon="reward.icon" :attributeKey="reward.attributeKey" :rewardAmount="reward.rewardAmount" :highlight="reward.highlight" :hideNumbers="true" />
          </template>
        </div>
      </AspectRatio>
    </div>
    <div class="content">
      <div class="heading">
        {{ $ctx_t(milestone.label) }}
      </div>
      <div v-if="milestone.description" class="middle-content description">
        {{ $ctx_t(milestone.description) }}
      </div>

      <BngProgressBar v-if="milestone.completed"  :value="1" :max="1" :min="0" :valueLabelFormat="$translate.instant('ui.career.milestones.status.complete')" class="progress" :valueColor="'rgba(var(--bng-orange-400-rgb),0.6)'" />

      <div v-if="milestone.progress" class="progress">
        <div v-if="claimable" class="animated-border claimable"></div>
        <template v-for="prog in milestone.progress">
          <BngProgressBar :class="{'claimProgressBar':claimable}" :value="prog.currValue" :max="prog.maxValue" :min="prog.minValue" :valueLabelFormat="claimable? $translate.instant('ui.career.milestones.status.clickToClaim') : $ctx_t(prog.label)"/>
        </template>
      </div>
    </div>
  </Button>
</template>

<script>
const tileSize = {
  width: 36,
  height: 8.25,
  margin: 0.5,
}

const getSizeCalc = () => () => tileSize

export default {
  getSizeCalc,
}
</script>

<script setup>
import { AspectRatio, Button } from "@/common/components/utility"
import { BngIcon, icons, BngProgressBar } from "@/common/components/base"
import { vBngOnUiNav } from "@/common/directives"
import { $translate } from "@/services/translation"

import RewardsPills from "../progress/RewardsPills.vue"
import RewardPill from "../progress/RewardPill.vue"

import { computed } from "vue"

const props = defineProps({
  milestone: Object,
  isCondensed: Boolean,
})
const emit = defineEmits(["claim"])
const claimMilestone = () => {
  console.log("claimMilestone", props.milestone)
  if (!props.milestone.claimable) return

  emit("claim", props.milestone)
  console.log(props.milestone)
}

const claimable = computed(() => {
  return !!props.milestone.claimable
})
const rewardUnitTypes = {
  money: "beambucks",
  beamXP: "xp",
}

const milestoneImageBackground = computed(() => {
  const color = props.milestone.color
  if (!color) return "transparent"
  if (color.startsWith("#")) {
    return `rgb(${hexToRgb(color)})`
  } else if (color.startsWith("var(--")) {
    return `rgb(${color})`
  } else {
    return "transparent"
  }
})

const milestoneStyle = computed(() => ({
  "--milestone-image-bg": milestoneImageBackground.value,
}))

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.milestone-card {
  @include modify-focus(var(--bng-corners-2), 0rem);

  --bng-content-flow: row;
  --bng-content-align: stretch;
  --bng-content-justify: flex-start;
  --bng-button-margin: 0;
  --bng-button-padding: 0;
  --bng-button-padding-top: 0;
  --bng-button-padding-bottom: 0;
  --bng-button-min-width: 0;
  --bng-button-max-width: 100%;
  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-border-width: 0.0625rem;
  --bng-bg-enabled: var(--bng-cool-gray-750);
  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);
  --bng-bg-focus: var(--bng-cool-gray-700);
  --bng-bg-enabled-opacity: 0.75;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;
  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);

  display: flex;
  flex-direction: row;
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  text-align: left;

  .complete {
    z-index: 15;
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0.22em;
    //background-color: rgba(0,0,0,0.4);
  }

  .media {
    flex: 0 0 10.25rem;
    min-width: 0;
    height: 100%;
    padding: 1px;
  }

  :deep(.image) {
    width: 100%;
    height: 100%;
    background-color: var(--milestone-image-bg);
    border-radius: var(--bng-corners-2) 0 0 var(--bng-corners-2);
    overflow: hidden;

    .glyph {
      font-size: 5em;
      &.small {
        font-size: 2.5em;
      }
    }

    .icon {
      width: 2rem;
      height: 2rem;
    }
    overflow-y: hidden;

    .step {
      position: absolute;
      top: 0;
      right: 0.5em;
      padding: 0.25em 0.5em;
      background-color: rgba(var(--bng-cool-gray-900-rgb), 0.9);
      border-radius: 0 0 var(--bng-corners-2) var(--bng-corners-2);
    }

    .image-rewards {
      position: absolute;
      left: 0.25rem;
      bottom: 0.25rem;
      right: 0.25rem;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      z-index: 16;
      font-size: 0.75rem;

      .rewards-pills-container {
        margin: 0;
        gap: 0.125rem;
      }
      .icon {
        height: 1.0rem;
        width: 1.0rem;
        --icon-size: 1.0rem;
      }

      .reward-pill {
        --reward-pill-container-margin: 0;
        --reward-pill-margin: 0;
        --reward-pill-padding: 0 0.2rem;
        --reward-pill-icon-padding-top: 0;
        --reward-pill-icon-padding-right: 0.1rem;
      }
    }
  }

  .content {
    flex: 1 1 auto;
    padding: 0.5rem;
    min-height: 0;
    min-width: 0;

    .heading {
      flex: 0 0 auto;
      font-weight: 800;
    }

    .middle-content {
      flex: 0 0 auto;
    }

    .description {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      font-size: 0.85rem;
      line-height: 1.15rem;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }

    color: white;
    display: flex;
    flex-direction: column;
    gap: 0.5rem 0.2rem;

    .progress {
      flex: 0 0 auto;
      position: relative;
      border-radius: var(--bng-corners-1);
      overflow: hidden;

      .claimable {
        cursor: pointer;
      }

      .animated-border {
        z-index: 3;
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 0.22em;
        border-radius: var(--bng-corners-1);
        pointer-events: none;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;

        &::before {
          position: absolute;
          content: "";
          display: block;
          width: 200%;
          aspect-ratio: 1;
          top: 50%;
          left: 50%;
          background: conic-gradient(#e6cf43, #ed3823, #e6cf43, #ff6600, #e6cf43);
          animation: rotate-gradient linear 2s infinite;
        }
      }

      :deep(.progress-bar){
        overflow: hidden;
        border-radius: var(--bng-corners-1);
      }

      :deep(.progress-fill),
      :deep(.second-progress-fill),
      :deep(.progress-fill-indeterminate) {
        z-index: 2;
      }

      :deep(.info) {
        position: relative;
        z-index: 4;
      }

      .claimProgressBar {
        :deep(.info) {
          justify-content: center;
        }
      }
    }
  }
}

.complete-badge {
  position: absolute;
  top: 0;
  left: 0em;
  padding: 0.3em 0.5em;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.6);
  border-radius: 0 0 var(--bng-corners-2);
}

@keyframes rotate-gradient {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
