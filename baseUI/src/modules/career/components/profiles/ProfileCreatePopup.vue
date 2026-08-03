<template>
  <div
    class="create-profile-popup"
    :class="{ 'controller-hold-enabled': isControllerUsed }"
    v-bng-scoped-nav="{ activateOnMount: true, canDeactivate: () => false }"
    v-bng-on-ui-nav:back,menu="close"
    v-bng-blur="1"
  >
    <div class="popup-panel">
      <div class="popup-main-content">
        <div class="popup-title">
          <BngScreenHeadingV2 type="2">{{ `${$ctx_t("ui.common.new")} ${$ctx_t("ui.career.profile")}` }}</BngScreenHeadingV2>
        </div>

        <div class="popup-body">
          <div class="popup-intro-text">
            <div>Head to the West Coast, USA, and launch your career with Apex Performance Metrics.</div>
            <div>Choose your entry point below. New players are strongly encouraged to select APM Onboarding.</div>
          </div>
          <BngCardHeading type="ribbon" class="popup-section-heading">
            Profile Name
          </BngCardHeading>
          <BngInput
            class="profile-name-input"
            v-model="profileName"
            :maxlength="PROFILE_NAME_MAX_LENGTH"
            :validate="validateCreateName"
            :errorMessage="nameError" />

          <BngCardHeading type="ribbon" class="popup-section-heading">
            Start Mode
          </BngCardHeading>
          <div class="start-mode-list">
            <BngButton
              v-for="(mode, index) in startModeOptions"
              :key="mode.id"
              :class="['start-mode-card', 'start-mode-card--major' ]"
              :accent="ACCENTS.ghost"
              :data-tag="mode.tag || null"
              v-bind="index === 0 ? { 'bng-scoped-nav-autofocus': true } : {}"
              v-bng-click.controller="{
                holdCallback: () => start(mode.id),
                holdDelay: 1200,
                repeatInterval: 0,
              }"
              v-bng-on-ui-nav:ok.asMouse
              bng-nav-item
              tabindex="1"
            >
              <div
                v-if="mode.image"
                class="start-mode-card-image"
                :style="{ '--start-mode-bg-image': `url(${mode.image})` }"
              />
              <div class="start-mode-card-body">
                <span class="start-mode-card-title">{{ mode.title }}</span>
                <p class="start-mode-card-desc">{{ mode.description }}</p>
                <div class="start-mode-start-button">
                  <BngButton
                    class="start-mode-start-action"
                    no-nav-item
                    accent="outlined"
                    show-hold
                    @click="start(mode.id)">
                    Start
                  </BngButton>
                </div>
              </div>
            </BngButton>
          </div>
        </div>
        <div class="popup-action-spacer">
          <BngButton
            class="popup-back-button"
            accent="outlined"
            bng-no-nav="true"
            @click="close">
            <BngBinding ui-event="back" controller />
            {{ $ctx_t("ui.common.back") }}
          </BngButton>
        </div>
      </div>
    </div>

    <div class="popup-buttons" v-bng-blur>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeMount, ref } from "vue"
import { storeToRefs } from "pinia"
import { vBngClick, vBngOnUiNav, vBngScopedNav, vBngBlur } from "@/common/directives"
import { ACCENTS, BngBinding, BngButton, BngInput, BngScreenHeadingV2, BngCardHeading } from "@/common/components/base"
import useControls from "@/services/controls"
import { getAssetURL } from "@/utils"
import { PROFILE_NAME_MAX_LENGTH } from "../../stores/profilesStore"

defineOptions({ name: "ProfileCreatePopup" })

const emit = defineEmits(["return"])

const props = defineProps({
  defaultProfileName: {
    type: String,
    default: "",
  },
  validateName: {
    type: Function,
    required: true,
  },
  startModes: {
    type: Array,
    required: true,
  },
})

const profileName = ref("")
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const DEFAULT_START_MODE_ID = "apmOnboarding"
const selectedStartMode = ref(DEFAULT_START_MODE_ID)
const startModeOptions = computed(() =>
  (Array.isArray(props.startModes) ? props.startModes : [])
    .filter(mode => mode && mode.id)
    .map(mode => ({
      ...mode,
      image: typeof mode.image === "string" && mode.image.length ? getAssetURL(mode.image) : mode.image,
    }))
)
const nameError = ref(null)

function validateCreateName(name) {
  const error = props.validateName(name)
  nameError.value = error
  return !error
}

function close() {
  emit("return", false)
}

function start(mode) {
  selectedStartMode.value = mode
  const error = props.validateName(profileName.value)
  nameError.value = error
  if (error) return
  if (!selectedStartMode.value) return

  emit("return", {
    profileName: profileName.value,
    startMode: selectedStartMode.value,
  })
}

onBeforeMount(() => {
  const availableModes = startModeOptions.value
  const defaultMode =
    availableModes.find(mode => mode.id === DEFAULT_START_MODE_ID) ||
    availableModes.find(mode => mode.tier === "major") ||
    availableModes[0]
  selectedStartMode.value = defaultMode?.id || null
  profileName.value = props.defaultProfileName
  nameError.value = props.validateName(profileName.value)
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

.create-profile-popup {
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
  width: 70rem;
  height: 45rem;
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
}

.popup-section-heading {
  margin: 0;
  margin-top: calc-ui-rem(0.5);
  font-size: calc-ui-rem(1.2);
}

.profile-name-input {
  margin: 0 calc-ui-rem(0.5);
}

.popup-intro-text {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  font-size: calc-ui-rem(1.0);
  padding: 0 calc-ui-rem(0.75);
  text-align: center;
}

.start-mode-list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: calc-ui-rem(0.5);
  overflow-y: auto;
  padding: 0 calc-ui-rem(0.75);
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

.start-mode-card[data-tag]::after {
  content: attr(data-tag);
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  padding: 0 calc-ui-rem(0.5) calc-ui-rem(0.1) calc-ui-rem(0.5);
  font-weight: 500;
  font-style: italic;
  font-size: calc-ui-rem(0.8);
  line-height: 1.2;
  color: var(--bng-add-indigoblue-50);
  background-color: var(--bng-add-blue-650);
  border-top-right-radius: var(--bng-corners-2);
  border-bottom-left-radius: var(--bng-corners-2);
  pointer-events: none;
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

.start-mode-card[aria-pressed="true"] .start-mode-card-body,
.start-mode-card:focus .start-mode-card-body,
.start-mode-card.focus-visible .start-mode-card-body {
  background-image: linear-gradient(
    135deg,
    rgba(var(--bng-orange-700-rgb), 0.42) 0%,
    rgba(var(--bng-orange-500-rgb), 0.32) 10rem,
    rgba(var(--bng-cool-gray-700-rgb), 0.2) 100%
  );
}

.start-mode-card[aria-pressed="true"] .start-mode-card-image,
.start-mode-card:focus .start-mode-card-image,
.start-mode-card.focus-visible .start-mode-card-image {
  box-shadow: inset 0 0 0 2px rgba(var(--bng-orange-300-rgb), 0.95);
}

.start-mode-card--major {
  min-height: calc-ui-rem(10.5);
}

.start-mode-card--minor {
  min-height: calc-ui-rem(6.5);


  .start-mode-card-title {
    font-size: calc-ui-rem(1.0);
  }

  .start-mode-card-desc {
    font-size: calc-ui-rem(0.72);
    line-height: 1.3;
  }
}

.popup-buttons {
  position: relative;
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.5em;
}

.popup-action-spacer {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  gap: 0.6em;
  padding: 0.0em 0.5em;
  border-top: 1px solid color.change($off-white, $alpha: 0.15);
  background-color: rgba(var(--bng-off-black-rgb), 0.8);
}

.popup-back-button {
  flex: 0 0 auto;
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
