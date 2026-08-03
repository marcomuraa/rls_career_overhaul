<template>
  <div
    ref="btnRef"
    class="discover-hero-card"
    :class="{
      'is-disabled': disabled,
      'is-selected': selected,
    }"
    bng-nav-item
    tabindex="0"
    v-bng-disabled="disabled"
    v-bng-sound-class="!disabled && 'bng_click_hover_generic'"
    v-bng-double-click="!disabled ? () => emit('dblclick') : null"
  >
    <div class="background-image" :style="backgroundStyle"></div>
    <div class="overlay"></div>

    <div class="content">
      <div class="hero-text-block">
        <div class="title">{{ $tt(title) }}</div>
      </div>

      <div v-if="tagList.length > 0" class="hero-tags-row">
        <div class="hero-tag-item" v-for="(tag, idx) in tagList" :key="`${idx}-${tag.label}`">
          <BngIcon v-if="tag.icon" class="hero-tag-icon" :type="tag.icon" />
          <span>{{ $tt(tag.label) }}</span>
        </div>
      </div>

      <div class="actions">
        <BngButton class="hero-action-button hero-action-button--secondary" accent="outlined" no-nav-item @click="onSecondaryActionClick">
          <BngBinding v-if="isControllerUsed && selected" class="binding" ui-event="action_2" controller />
          <span>{{ $tt(secondaryActionLabel) }}</span>
        </BngButton>
        <BngButton class="hero-action-button hero-action-button--primary" accent="outlined" no-nav-item @click="onActionClick" v-bng-sound-class="'bng_click_generic'">
          <BngBinding v-if="isControllerUsed && selected" class="binding" ui-event="ok" controller />
          <BngIcon v-else type="play" />
          <span>{{ $tt(actionLabel) }}</span>
        </BngButton>
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
  selected: Boolean,
  tagList: {
    type: Array,
    default: () => [],
  },
  actionLabel: {
    type: String,
    default: "ui.playmodes.discover.playNow",
  },
  secondaryActionLabel: {
    type: String,
    default: "ui.playmodes.discover.viewSections",
  },
})

const emit = defineEmits(["dblclick", "action", "secondary-action"])

const btnRef = ref(null)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)

const bgImageUrl = computed(() => (props.bgImgAbs ? props.bgImgAbs : getAssetURL(props.bgImg)))
const backgroundStyle = computed(() => ({
  backgroundImage: bgImageUrl.value ? `url('${bgImageUrl.value}')` : "none",
}))

function onActionClick() {
  if (props.disabled) return
  emit("action")
}

function onSecondaryActionClick() {
  if (props.disabled) return
  emit("secondary-action")
}

defineExpose({
  getElement() {
    return btnRef.value
  },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.discover-hero-card {
  position: relative;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  min-height: 100%;
  display: flex;
  cursor: pointer;
  isolation: isolate;
  @include modify-focus(var(--bng-corners-2), 0px);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.15);

  &.is-disabled {
    opacity: 0.55;
    cursor: default;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
  }
}

.discover-hero-card.is-selected,
.discover-hero-card:focus,
.discover-hero-card.focus-visible,
.discover-hero-card:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(var(--bng-orange-300-rgb), 0.6);

  &::after {
    border-color: rgba(var(--bng-orange-300-rgb), 0.95);
  }
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
  transition: transform 180ms ease-out, filter 180ms ease-out;
}

.discover-hero-card:not(.is-selected) .background-image {
  filter: grayscale(0.1) saturate(0.95) contrast(0.95);
}

.discover-hero-card.is-selected .background-image {
  transform: scale(1.02);
  filter: saturate(1.08) contrast(1.04);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(var(--bng-off-black-rgb), 0.9) 0%,
    rgba(var(--bng-off-black-rgb), 0.5) 45%,
    rgba(var(--bng-off-black-rgb), 0.3) 100%
  );
  transition: opacity 120ms ease-out;
}

.discover-hero-card.is-selected .overlay,
.discover-hero-card:focus .overlay,
.discover-hero-card.focus-visible .overlay,
.discover-hero-card:focus-visible .overlay {
  opacity: 0.8
}

.content {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1.15em;
  padding-right: 1.8em;
  padding-bottom: 1.8em;
  padding-top: 1.8em;
}

.hero-text-block {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: 0.35em;
  max-width: min(78%, 30rem);
  padding: 0.55em 1.4em 0.6em 0.8em;

  background: linear-gradient(
    90deg,
    rgba(var(--bng-orange-500-rgb), 1) 0%,
    rgba(var(--bng-orange-600-rgb), 0.85) 100%
  );
  clip-path: polygon(
    0% 0%,
    calc(100% - 1.4em) 0%,
    100% 00%,
    calc(100% - 1.4em) 100%,
    0% 100%
  );
  transition: padding-right 120ms ease-out, max-width 120ms ease-out;
  transition: padding-left 120ms ease-out, max-width 120ms ease-out;
}

.discover-hero-card.is-selected .hero-text-block,
.discover-hero-card:focus .hero-text-block,
.discover-hero-card.focus-visible .hero-text-block,
.discover-hero-card:focus-visible .hero-text-block {
  max-width: min(86%, 31rem);
  padding-left: 1.55em;
}

.hero-tags-row {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  padding-left: 0.8em;
  font-size: calc-ui-rem(1.2);
  filter: drop-shadow(0 0 0.2em rgba(var(--bng-off-black-rgb), 2.5));
}

.hero-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  line-height: 1.25;
  font-weight: 100;
  color: rgba(var(--bng-off-white-rgb), 0.97);
}

.hero-tag-icon {
  font-size: 1.6em;
  color: rgba(var(--bng-off-white-rgb), 0.95);
}

.title {
  font-size: calc-ui-rem(2.1);
  line-height: 1.2;
  color: var(--bng-off-white);
  font-weight: 800;
  font-style: italic;
  text-wrap: balance;
}

.description {
  font-size: calc-ui-rem(1.14);
  line-height: 1.3;
  font-weight: 400;
  color: rgba(var(--bng-off-white-rgb), 0.90);
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  gap: 0.5em;
  padding-left: 1.8em;

}

.hero-action-button {
  --bng-button-margin: 0;
  --bng-button-min-width: 11em;
  --bng-button-padding: 1.5em 2.5em;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-size: 2.0em;
}

.hero-action-button--secondary {
  --bng-button-min-width: 10em;
  --bng-button-padding: 1.1em 1.7em;
  min-height: 2.5em;
  font-size: 1.05em;
  margin-right: auto;
  align-self: flex-end;
}

.binding {
  margin-top: 0.0em;
  margin-right: 0.1em;
  padding-right: 0;
}

.discover-hero-card.is-selected :deep(.hero-action-button--primary .bng-background) {
  --bng-bg-enabled: var(--bng-orange-600);
  --bng-bg-border-enabled: var(--bng-orange-400);
}

</style>
