<template>
  <div
    class="optional-challenge-popup"
    :class="{ 'controller-hold-enabled': isControllerUsed }"
    v-bng-scoped-nav="{ activateOnMount: true, canDeactivate: () => false }"
    v-bng-blur="1"
  >
    <div class="popup-panel">
      <div class="popup-main-content">
        <div class="popup-title">
          <BngScreenHeadingV2 type="2">{{ $tt("ui.career.tutorial.popup.optionalChallenge.title") }}</BngScreenHeadingV2>
        </div>

        <div class="popup-body">
          <div class="popup-intro-text">
            <div>{{ $tt("ui.career.tutorial.popup.optionalChallenge.intro") }}</div>
          </div>

          <div class="start-mode-list">
            <BngButton
              v-for="(option, index) in challengeOptions"
              :key="option.id"
              class="start-mode-card start-mode-card--major"
              :accent="ACCENTS.ghost"
              v-bind="option.autofocus ? { 'bng-scoped-nav-autofocus': true } : {}"
              v-bng-click.controller="{
                holdCallback: () => choose(option.id),
                holdDelay: 1200,
                repeatInterval: 0,
              }"
              v-bng-on-ui-nav:ok.asMouse
              bng-nav-item
              tabindex="1"
            >
              <div
                v-if="option.image"
                class="start-mode-card-image"
                :style="{ '--start-mode-bg-image': `url(${option.image})` }"
              />
              <div class="start-mode-card-body">
                <span class="start-mode-card-title">{{ $tt(option.title) }}</span>
                <p class="start-mode-card-desc">{{ $tt(option.description) }}</p>
                <div class="start-mode-start-button">
                  <BngButton
                    class="start-mode-start-action"
                    no-nav-item
                    accent="outlined"
                    show-hold
                    @click="choose(option.id)">
                    {{ $tt(option.startLabel) }}
                  </BngButton>
                </div>
              </div>
            </BngButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia"
import { vBngBlur, vBngClick, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { BngScreenHeadingV2, BngButton, ACCENTS, BngCardHeading } from "@/common/components/base"
import { lua } from "@/bridge"
import useControls from "@/services/controls"

defineOptions({ name: "OptionalChallengeSelect" })

const emit = defineEmits(["return"])

const challengeOptions = [
  {
    id: "advancedTimeTrial",
    image: "/gameplay/missions/west_coast_usa/timeTrial/tutorialAdvanced/preview.jpg",
    title: "ui.career.tutorial.popup.optionalChallenge.advancedTimeTrial.title",
    description: "ui.career.tutorial.popup.optionalChallenge.advancedTimeTrial.description",
    startLabel: "ui.career.tutorial.popup.optionalChallenge.playAgain",
    autofocus: true,
  },
  {
    id: "dragStrip",
    image: "/gameplay/missions/west_coast_usa/dragStripAPM/007-advanced001/preview.jpg",
    title: "ui.career.tutorial.popup.optionalChallenge.dragStrip.title",
    description: "ui.career.tutorial.popup.optionalChallenge.dragStrip.description",
    startLabel: "ui.career.tutorial.popup.optionalChallenge.continue",
  },
]

const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)

async function choose(choice) {
  const bngVue = window.bngVue || {}
  if (typeof bngVue.gotoGameState === "function") {
    await bngVue.gotoGameState("play")
  }
  lua.extensions.hook("onCareerTutorialAdvancedOrDragSelection", choice)
  emit("return", true)
}

// No back behavior: this blocks closing via popup-close path.
defineExpose({
  onPopupClose: () => false,
})
</script>

<script>
import { popupPosition, popupContainer } from "@/services/popup"

export default {
  wrapper: {
    fade: true,
    blur: true,
    style: popupContainer.default,
  },
  position: [popupPosition.center, popupPosition.center],
}
</script>

<style lang="scss" scoped>
@use "sass:color";
@use "sass:map";
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");

.optional-challenge-popup {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
}

.popup-panel {
  border-radius: calc-ui-rem(0.5);
  overflow: hidden;
}

.popup-main-content {
  background: color.change($off-black, $alpha: 0.8);
  color: $off-white;
  display: flex;
  flex-direction: column;
}

.popup-title {
  width: 100%;
  background: color.change($off-black, $alpha: 0.9);
  --bng-heading-background-opacity: 0;
  padding: calc-ui-rem(0.5);
  border-bottom: 1px solid color.change($off-white, $alpha: 0.15);
}

.popup-body {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.75);
  padding: calc-ui-rem(0.75) 0;
  flex: 1 1 auto;
  min-height: 0;
  justify-content: flex-start;
  align-items: center;
  justify-content: center;
}

.popup-intro-text {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  font-size: calc-ui-rem(1.0);
  padding: 0 calc-ui-rem(0.75);
}

.popup-section-heading {
  margin: 0;
  font-size: calc-ui-rem(1.2);
}

.start-mode-list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: calc-ui-rem(0.5);
  overflow-y: auto;
  padding: 0 calc-ui-rem(0.75);
  overflow:visible;
}

.start-mode-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  position: relative;
  min-height: calc-ui-rem(8.5);
  padding: 0;
  border: none;
  border-radius: var(--bng-corners-2);
  background: rgba(var(--bng-off-white-rgb), 0.06);
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  color: var(--bng-off-white-brighter);
  --bng-button-max-width: 100%;
  box-shadow: 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.08);

  &:focus,
  &.focus-visible {
    color: var(--bng-off-white-brighter);
    overflow: visible;
  }
}

.start-mode-card-image {
  flex: 0 0 30%;
  width: 42%;
  min-width: 0;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  border-radius: var(--bng-corners-2) 0 0 var(--bng-corners-2);
  background-image: var(--start-mode-bg-image);
  background-size: cover;
  background-position: center;
}

.start-mode-card-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: calc-ui-rem(0.4) calc-ui-rem(0.75) calc-ui-rem(0.6);
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  justify-content: flex-start;
  border-radius: 0 var(--bng-corners-2) var(--bng-corners-2) 0;
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.5);
  background-image: linear-gradient(
    135deg,
    rgba(var(--bng-cool-gray-700-rgb), 0.18) 0%,
    rgba(var(--bng-cool-gray-800-rgb), 0.09) 50%,
    rgba(var(--bng-cool-gray-850-rgb), 0.13) 100%
  );
}

.start-mode-card-title {
  display: block;
  margin-top: calc-ui-rem(0.1);
  font-size: calc-ui-rem(1.4);
  line-height: 1.25;
  font-weight: 800;
  font-style: italic;
  color: var(--bng-off-white-brighter);
  text-wrap: balance;
}

.start-mode-card-desc {
  margin: 0;
  font-size: calc-ui-rem(1.0);
  line-height: 1.3;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.start-mode-start-button {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: flex-end;
  justify-content: flex-end;
}

.start-mode-card.hold-start :deep(.start-mode-start-action.bng-button.show-hold) {
  > .bng-background,
  &::after {
    background-position: 80% 50%;
    transition: none;
  }
}

.start-mode-card.hold-active :deep(.start-mode-start-action.bng-button.show-hold) {
  > .bng-background,
  &::after {
    background-position: 0% 50%;
    transition: background-position var(--hold-time, 1s);
  }
}

.start-mode-card:focus .start-mode-card-body,
.start-mode-card.focus-visible .start-mode-card-body {
  background-image: linear-gradient(
    135deg,
    rgba(var(--bng-orange-700-rgb), 0.42) 0%,
    rgba(var(--bng-orange-500-rgb), 0.32) 10rem,
    rgba(var(--bng-cool-gray-700-rgb), 0.2) 100%
  );
}

.start-mode-card:focus .start-mode-card-image,
.start-mode-card.focus-visible .start-mode-card-image {
  box-shadow: inset 0 0 0 2px rgba(var(--bng-orange-300-rgb), 0.95);
}

.start-mode-card--major {
  min-height: calc-ui-rem(10.5);
}

:deep(.start-mode-start-action.bng-button.show-hold .hold-arrow) {
  opacity: 0;
  transition: opacity 120ms;
}

.controller-hold-enabled .start-mode-card:focus :deep(.start-mode-start-action.bng-button.show-hold .hold-arrow),
.controller-hold-enabled .start-mode-card.focus-visible :deep(.start-mode-start-action.bng-button.show-hold .hold-arrow) {
  opacity: 1;
}

:not(.controller-hold-enabled) :deep(.start-mode-start-action.bng-button.show-hold) {
  .hold-arrow,
  &::after {
    opacity: 0;
  }

  > .bng-background,
  &::after {
    transition: none;
    background-position: 100% 50%;
  }
}
</style>
