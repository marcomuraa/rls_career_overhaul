<template>
  <BngButton
    v-bng-blur
    v-bng-route-target.id="routeTarget"
    class="pause-tile-button"
    :accent="ACCENTS.custom_old"
    :disabled="disabled"
    @click="emit('click', $event)"
    >
    <AspectRatio
      v-if="imageSrc"
      class="pause-tile-button-image"
      ratio="16:9"
      :image-mode="imageMode"
      :external-image="imageSrc"
      :slot-v-align="imageLabelVAlign"
      :slot-scroll="false"
    >
      <div v-if="showImageLabel && label" class="pause-tile-button-image-label">{{ label }}</div>
    </AspectRatio>
    <BngIcon
      v-else-if="icon"
      class="pause-tile-button-icon"
      :type="icon"
    />
    <span v-if="!imageSrc && label" class="pause-tile-button-label">{{ label }}</span>
  </BngButton>
</template>

<script setup lang="js">
import { computed } from "vue"
import { BngButton, BngIcon, icons, ACCENTS } from "@/common/components/base"
import { vBngBlur, vBngRouteTarget } from "@/common/directives"
import { AspectRatio } from "@/common/components/utility"
import { getAssetURL } from "@/utils"

const props = defineProps({
  label: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  // Asset-relative path (resolved via getAssetURL)
  image: {
    type: String,
    default: "",
  },
  // Fully qualified or root-relative URL (used as-is)
  externalImage: {
    type: String,
    default: "",
  },
  showImageLabel: {
    type: Boolean,
    default: false,
  },
  imageLabelVAlign: {
    type: String,
    default: "bottom",
  },
  imageMode: {
    type: String,
    default: "cover",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  routeTarget: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["click"])

const imageSrc = computed(() => props.externalImage || (props.image ? getAssetURL(props.image) : ""))
</script>

<style lang="scss" scoped>
  @use "@/styles/modules/mixins" as *;
  @use "@/styles/modules/density" as *;

  .pause-tile-button {
    font-size: var(--ui-rem, 1rem);
    --bng-icon-size: 2.5em;
    --bng-content-flow: column;
    --bng-content-align: center;
    --bng-content-justify: center;
    --bng-button-padding: 0.5em;
    --bng-button-padding-top: 1em;
    --bng-button-padding-bottom: 1em;
    --bng-button-min-width: 10em;
    --bng-button-max-width: 10em;

    --bng-button-custom-margin: 0;

    --bng-button-custom-enabled: var(--bng-off-black);
    --bng-button-custom-active: var(--bng-cool-gray-800);
    --bng-button-custom-hover: var(--bng-cool-gray-700);
    --bng-button-custom-disabled: var(--bng-off-black);

    --bng-button-custom-enabled-opacity: 0.8;
    --bng-button-custom-hover-opacity: 0.8;
    --bng-button-custom-active-opacity: 1;
    --bng-button-custom-disabled-opacity: 0.5;
    --bng-button-custom-border-enabled: var(--bng-off-black);
    --bng-button-custom-border-hover: var(--bng-cool-gray-800);
    --bng-button-custom-border-active: var(--bng-off-black);
    --bng-button-custom-border-disabled: var(--bng-off-black);

    .pause-tile-button-image {
      --bng-image-mode: cover;
      border-radius: $rad;
      width: var(--tile-image-width, unset);
      height: var(--tile-image-height, unset);
    }

    .pause-tile-button-image-label {
      max-width: 100%;
      padding: 0.25em 0.5em;
      color: #fff;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);

      line-height: 1.15;
      max-height: calc(1.15em * 3);
      overflow: hidden;

      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;

      background: transparent;
    }

    &:hover {
      .pause-tile-button-image-label {
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.5));
      }
    }
    &:focus {
      --bng-button-custom-border-enabled: var(--bng-cool-gray-700);
      --bng-button-custom-enabled: var(--bng-cool-gray-800);
      .pause-tile-button-image-label {
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.9));
      }
    }
    &:active {
      .pause-tile-button-image-label {
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.9));
      }
    }
    &:disabled {
      .pause-tile-button-image-label {
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.2));
      }
    }
  }
</style>