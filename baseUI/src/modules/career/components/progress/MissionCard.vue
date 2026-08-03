<template>
  <Button
    @click="clicked"
    :class="{ 'card-wrapper': true, 'click-startable': mission && mission.startable }"
    :sound-class="mission.startable ? 'bng_click_hover_generic' : 'bng_click_generic'"
    :no-sound="!mission?.startable"
  >
    <!--v-bng-disabled="isSkeleton"-->
    <div class="condensed">
      <AspectRatio
        v-if="!isSkeleton"
        class="image"
        :style="backgroundImageStyle">
      </AspectRatio>
      <BngIcon
        v-if="!isSkeleton && !mission.startable"
        class="locked-icon"
        :type="icons.lockClosed"
        :color="iconColor"
        />
      <template v-if="!isSkeleton && showStartableIcons">
        <BngIcon
          v-if="mission.canStartFromProgressScreen && mission.startable"
          class="locked-icon"
          :type="icons.play"
          :color="iconColor"
          />
        <BngIcon
          v-if="!mission.canStartFromProgressScreen && mission.startable"
          class="locked-icon"
          :type="icons.mapPoint"
          :color="iconColor"
          />
      </template>

      <template v-if="!isSkeleton && mission.devMission">
        <div class="dev-icon-container">
          <BngIcon
          class="dev-icon"
          :type="icons.bug"
          :color="'white'"
          />
          <div class="dev-text">
            DEV MISSION
          </div>
        </div>
      </template>

      <div class="highlight-marker"></div>

      <BngIcon
      class="mission-icon"
      :type="iconType"
      :color="iconColor" />
      <BngBinding
        v-if="showHintIcon"
        class="input-icon"
        ui-event="ok"
        controller
        />

      <div class="main-info">

        <div v-if="!isSkeleton" class="heading" :class="{'locked' : !mission.startable}">
          {{ $tt(mission.label) }}
        </div>

        <!-- mission -->
        <div v-if="!isSkeleton && mission.startable && mission.formattedProgress" class="stars" >
          <BngMainStars
            v-if="defaultStars && mission.formattedProgress.unlockedStars && mission.formattedProgress.unlockedStars.totalDefaultStarCount"
            :individualStars="defaultStars"
            class="main-stars"
            :scale="0.6"/>
          <BngMainStars
            v-if="bonusStars && mission.formattedProgress.unlockedStars && mission.formattedProgress.unlockedStars.totalBonusStarCount > 0"
            :individualStars="bonusStars"
            class="bonus-stars"
            :scale="0.6" />
        </div>

        <!-- TODO - should this whole message only be displayed if game controller is plugged in? -->
        <!--
        <div v-if="!isSkeleton && mission && mission.startable" class="go-to-bigmap-label">
          Press <BngBinding ui-event="ok" deviceMask="xinput" /> to view in Map
        </div>
        -->
      </div>
    </div>
  </Button>
</template>

<script setup>
import { computed } from "vue"
import { BngMainStars, BngIcon, icons, BngBinding } from "@/common/components/base"
import { AspectRatio, Button } from "@/common/components/utility"

const props = defineProps({
  mission: Object,
  isSkeleton: Boolean,
  showStartableIcons: Boolean,
  showHintIcon: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["clicked"])

const clicked = () => {
  if (!props.mission?.startable) return
  emit("clicked", props.mission)
}

// Computed properties for cleaner template logic
const backgroundImageStyle = computed(() => ({
  backgroundImage: `url(${props.mission.thumbnail})`,
  maskImage: `linear-gradient(to left, rgba(0, 0, 0, ${props.mission.startable ? 0.75 : 0.2}) 50%, rgba(0, 0, 0, 0.1) 100%)`,
  filter: props.mission.startable ? "none" : "grayscale(100%)"
}))

const iconType = computed(() =>
  props.isSkeleton ? icons.medal : (icons[props.mission.icon] || icons.medal)
)

const iconColor = computed(() =>
  props.isSkeleton || !props.mission.startable ? "var(--bng-cool-gray-600)" : "#fff"
)

const showStartableIcons = computed(() =>
  !props.isSkeleton && props.showStartableIcons
)

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
  const unlockedStars = props.mission?.formattedProgress?.unlockedStars
  if (!unlockedStars) return null
  return ensureArray(unlockedStars.defaults)
})

const bonusStars = computed(() => {
  const unlockedStars = props.mission?.formattedProgress?.unlockedStars
  if (!unlockedStars) return null
  return ensureArray(unlockedStars.bonus)
})
</script>

<style scoped lang="scss">
.card-wrapper {
    --bng-content-flow: row;
    --bng-content-align: stretch;
    --bng-content-justify: flex-start;
    --bng-button-min-width: 100%;
    --bng-button-max-width: 100%;
    --bng-button-margin: 0;
    --bng-button-padding: 0;
    --bng-button-padding-top: 0;
    --bng-button-padding-bottom: 0;
    --bng-bg-border-radius: 0.5rem;
    --bng-bg-border-width: 0.125rem;
    --bng-bg-enabled: rgba(var(--bng-off-black-rgb), 0.6);
    --bng-bg-hover: rgba(255, 255, 255, 0.2);
    --bng-bg-active: rgba(255, 255, 255, 0.2);
    --bng-bg-focus: rgba(255, 255, 255, 0.28);
    --bng-bg-disabled: transparent;
    --bng-bg-border-enabled: transparent;
    --bng-bg-border-hover: transparent;
    --bng-bg-border-active: transparent;
    --bng-bg-border-focus: var(--bng-orange-300);
    --bng-bg-border-disabled: transparent;
    --bng-bg-focus-opacity: 1;
    height: 100%;
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    text-align: left;
    line-height: normal;
    //outline: none;
    outline-offset: -1px;
  &[disabled] {
    pointer-events: none;
  }
  &.focus-visible::before {
    border-radius: 0.75rem;
  }
  &:not(.click-startable) {
    cursor: default;
  }
  &.click-startable {
    --bng-bg-hover: rgba(255, 255, 255, 0.4);
    --bng-bg-active: rgba(255, 255, 255, 0.4);
    --bng-bg-focus: rgba(255, 255, 255, 0.45);
    --bng-bg-border-focus: var(--bng-orange-400);
  }
  &:focus {
    .condensed .input-icon {
      opacity: 1;
    }
  }
  .condensed {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    height: 100%;
    position: relative;
    padding: 0.5rem 0.25rem;
    //padding-left: 0.75rem;
    transition: padding-left 0.25s ease-in-out;
    .image {
      position: absolute;
      top: 0; bottom: 0;
      left: 66%; right: 0%;
      z-index: 0;
    }
    .highlight-marker {
      position: absolute;
      top: 0; bottom: 0;
      left: 0; right: 0;
      background: var(--bng-orange-400);
      width: 0.0rem;
      flex: 0 0 0.5rem;
      transition: width 0.25s ease-in-out;
    }
    .mission-icon {
      flex: 0 0 2.5rem;
      display: flex;
      font-size: 2rem;
      z-index: 1;
      align-self: center;
     }
     .input-icon {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0.25rem;
      z-index: 1;
      font-size: 2rem;
      align-self: center;
      opacity: 0;
      filter: drop-shadow(1px 1px 6px rgba(0, 0, 0, 0.75));
     }

     .locked-icon {
        font-size: 2.5rem;
        z-index: 1;
        align-self: center;
        position: absolute;
        right:0.5rem;
        opacity: 0.5;

     }

     .dev-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: 0.5rem;
      bottom: 0;
      z-index: 100;
      filter: drop-shadow(1 1 5px rgba(255, 0, 0, 1));
     }

    .main-info {
      z-index: 1;
      position: relative;
      flex: 1 0 auto;

      color: white;
      display: flex;
      flex-direction: column;

      > .go-to-bigmap-label {
        display: hidden;
        padding-top: 0.5rem;
        text-align: right;
      }
      > .locked-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba($color: #000000, $alpha: 0.7);
        .glyph-locked {
          font-size: 10em;
        }
      }

      > .heading {
        font-weight: 800;
        font-size: 1.0rem;
        overflow: ellipsis;
      }

      > .locked {
        color: gray
      }

      > * {
        flex: 0 0 auto;
      }
      > .middle-main-info {
        flex: 1 0 auto;
      }

      > .stars {
        display: flex;
        flex-direction: row;
        & > * {
          margin-right: 0.25rem;
          margin-top: 0.25rem;
          min-height: fit-main-info;
          max-width: fit-main-info;
        }
        > .main-stars {
          --star-color: var(--bng-ter-yellow-50);
          padding: 0.25rem 0.5rem;
        }
        > .bonus-stars {
          --star-color: var(--bng-add-blue-400);
          padding: 0.25rem 0.5rem;
        }
      }
    }
  }
}
</style>
