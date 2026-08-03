<template>
  <div
    ref="btnRef"
    class="discover-experience-button"
    :class="{
      'is-major': major,
      'is-minor': !major,
      'is-disabled': disabled,
      'is-selected': selected,
    }"
    bng-nav-item
    tabindex="0"
    v-bng-disabled="disabled"
    v-bng-sound-class="!disabled && 'bng_click_hover_generic'"
    v-bng-double-click="!disabled ? () => emit('dblclick') : null"
  >
    <div class="button-content">
      <div class="preview-pane">
        <div class="background-image" :style="backgroundStyle"></div>
      </div>
      <div class="text-pane">
        <div class="always-title">
          <span class="always-title-text">{{ $tt(title) }}</span>
        </div>
        <div v-if="showDescription && description" class="always-description">{{ $tt(description) }}</div>
        <div class="bottom-row">
          <div class="tags-row" v-if="showTags && tagList.length > 0">
            <div class="tag-item" v-for="(tag, idx) in tagList" :key="`${idx}-${tag.label}`">
              <BngIcon v-if="tag.icon" class="tag-icon" :type="tag.icon" />
              <span>{{ $tt(tag.label) }}</span>
            </div>
          </div>

          <BngButton
            class="play-button play-button-action"
            accent="outlined"
            no-nav-item
            @click="onPlayAction"
          >
            <BngBinding v-if="isControllerUsed" class="binding" ui-event="ok" controller />
            <span>{{ $tt(actionLabel) }}</span>
          </BngButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { getAssetURL } from "@/utils"
import { BngBinding, BngButton, BngIcon } from "@/common/components/base"
import useControls from "@/services/controls"
import { vBngDisabled, vBngDoubleClick, vBngSoundClass } from "@/common/directives"

const props = defineProps({
  major: Boolean,
  disabled: Boolean,
  bgImg: String,
  bgImgAbs: String,
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  actionLabel: {
    type: String,
    default: "ui.playmodes.discover.play",
  },
  selected: Boolean,
  tagList: {
    type: Array,
    default: () => [],
  },
  showTags: {
    type: Boolean,
    default: true,
  },
  showDescription: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(["dblclick"])

const btnRef = ref(null)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const bgImageUrl = computed(() => (props.bgImgAbs ? props.bgImgAbs : getAssetURL(props.bgImg)))
const backgroundStyle = computed(() => ({
  backgroundImage: bgImageUrl.value ? `url('${bgImageUrl.value}')` : "none",
}))

function onPlayAction() {
  if (props.disabled) return
  emit("dblclick")
}

defineExpose({
  getElement() {
    return btnRef.value
  },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.discover-experience-button {
  position: relative;
  width: 100%;
  margin: 0;
  border-radius: calc-ui-rem(0.5);
  overflow: visible;
  cursor: pointer;
  isolation: isolate;
  display: flex;
  @include modify-focus(calc-ui-rem(0.5), 1px);

  &.is-major {
    height: 11.5em;
  }

  &.is-minor {
    height: 8.5em;
    .always-title-text {
      font-size: calc-ui-rem(1.25);
    }
    .always-description {
      font-size: calc-ui-rem(0.85);
    }
  }

  &.is-disabled {
    opacity: 0.55;
    cursor: default;
  }
}

.button-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  border-radius: inherit;
  overflow: hidden;
}

.preview-pane {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.background-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  transform: scale(1);
  filter: saturate(0.9) contrast(0.95);
  transition: transform 180ms ease-in-out, filter 180ms ease-in-out;
}

.discover-experience-button:not(.is-selected) {
  .background-image {
    filter: grayscale(0.25) saturate(0.95) contrast(0.95);
  }
}

.text-pane {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0.55em 0.65em;
  background: linear-gradient(
      135deg,
      rgba(var(--bng-cool-gray-900-rgb), 0.5) 0%,
      rgba(var(--bng-cool-gray-900-rgb), 0.82) 55%,
      rgba(var(--bng-cool-gray-900-rgb), 0.9) 100%
    );

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: linear-gradient(to bottom, var(--bng-orange-300), var(--bng-orange-500));
    transition: width 140ms ease-in-out;
  }
}

.always-title {
  margin-top: 0.15em;
}

.always-title-text {
  display: block;
  font-size: calc-ui-rem(1.5);
  line-height: 1.25;
  color: var(--bng-off-white);
  font-weight: 800;
  font-style: italic;
  text-wrap: balance;
}

.always-description {
  font-size: calc-ui-rem(0.92);
  line-height: 1.3;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.bottom-row {
  margin-top: auto;
  display: flex;
}

.play-button {
  margin-left: auto;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25em;
  --bng-button-min-width: 7em;
}

.binding {
  margin-right: 0.1em;
  padding-right: 0;
}

.tags-row {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.35em;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  font-size: calc-ui-rem(0.62);
  line-height: 1.2;
  font-weight: 500;
  color: rgba(var(--bng-off-white-rgb), 0.65);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.5);
  padding: 0.25em 0.5em;
  border-radius: calc-ui-rem(0.5);
  max-width: 100%;

}

.tag-icon {
  font-size: 1.05em;
  color: rgba(var(--bng-off-white-rgb), 0.75);
}

.discover-experience-button.is-selected {
  .text-pane {
    background: linear-gradient(
      135deg,
      rgba(var(--bng-orange-700-rgb), 0.75) 0%,
      rgba(var(--bng-cool-gray-900-rgb), 0.82) 55%,
      rgba(var(--bng-cool-gray-900-rgb), 0.9) 100%
    );
    &::before {
      width: calc-ui-rem(0.25);
    }
  }

  .background-image {
    transform: scale(1.03);
    filter: saturate(1.08) contrast(1.04);
  }

  .play-button {
    opacity: 1;
    pointer-events: auto;
  }
}

.discover-experience-button:focus,
.discover-experience-button.focus-visible,
.discover-experience-button:focus-visible {
  &::before {
    z-index: 5;
  }

  .button-content {
    box-shadow: 0 0 0 2px rgba(var(--bng-orange-300-rgb), 0.9);
  }

  .play-button {
    opacity: 1;
    pointer-events: auto;
  }
}

.discover-experience-button:hover {
  .play-button {
    opacity: 1;
    pointer-events: auto;
  }
}

</style>
