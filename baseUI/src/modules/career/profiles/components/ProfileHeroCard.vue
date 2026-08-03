<template>
  <div
    ref="heroRef"
    class="profile-hero-card"
    :class="{ 'is-loading': isLoading, 'is-active': isActive, 'is-empty': isEmpty }"
    bng-nav-item
    tabindex="0"
    v-bng-on-ui-nav:ok.focusRequired="onPrimaryAction"
    v-bng-on-ui-nav:context.focusRequired="onBrowseSaves"
    v-bng-ui-nav-label:context="isEmpty ? '' : $translate.instant('ui.career.profiles.saves.button')"
    v-bng-sound-class="!isLoading && 'bng_click_hover_generic'"
    @click="onCardClick"
    @focusin.self="isFocused = true"
    @focusout.self="isFocused = false"
  >
    <div class="background-image" :style="{ backgroundImage: heroBackgroundImage }"></div>
    <div class="overlay"></div>

    <div class="content">
      <div class="hero-title-block">
        <div class="hero-kicker">{{ heroKicker }}</div>
        <h2>{{ heroTitle }}</h2>
        <div v-if="isActive" class="active-badge">{{ $ctx_t("ui.career.nowplaying") }}</div>
      </div>
      <template v-if="!isEmpty">
        <ProfileStatus
          v-if="profile.boughtStarterVehicle || profile.startingOptions.startMode !== 'apmOnboarding'"
          class="hero-status"
          :branches="profile.branches"
          :beamXP="profile.beamXP"
          :vouchers="profile.vouchers"
          :vehicle-count="profile.vehicleCount"
          :money="profile.money"
          :insurance-score="profile.insuranceScore"
          :expanded="true"
        />
        <div
          v-if="!profile.boughtStarterVehicle && profile.startingOptions.startMode === 'apmOnboarding'"
          class="onboarding-status">
          <AspectRatio
            class="onboarding-status-image"
            ratio="2:1"
            :external-image="onboardingBackgroundImage"
            :slot-scroll="false"
          />
          <div class="onboarding-status-label">{{ $t("ui.career.profile.onboardingInProgress") }}</div>
        </div>
      </template>
      <p v-if="isEmpty && !showLoadingState" class="hero-empty-description">{{ $t("ui.career.profiles.emptyDescription") }}</p>

      <div v-if="!showLoadingState" class="hero-actions">
        <div
          v-if="profileWarningMessage"
          class="hero-warning"
          :class="{ 'hero-warning--notice': !profile.incompatibleVersion }"
        >
          {{ profileWarningMessage }}
        </div>
        <BngButton
          v-if="!isEmpty"
          class="hero-action-button hero-action-button--secondary"
          accent="outlined"
          bng-no-nav="true"
          tabindex="-1"
          :disabled="isLoading"
          v-bng-sound-class="'bng_click_generic'"
          @click="onBrowseSaves"
        >
          <BngBinding v-if="isControllerUsed && isFocused" class="binding" ui-event="context" controller />
          <BngIcon v-else type="folder" />
          <span>{{ $t("ui.career.profiles.saves.button") }}</span>
        </BngButton>
        <BngButton
          class="hero-action-button hero-action-button--primary"
          accent="outlined"
          bng-no-nav="true"
          tabindex="-1"
          :disabled="primaryActionDisabled"
          v-bng-sound-class="'bng_click_generic'"
          @click="onPrimaryAction"
        >
          <BngBinding v-if="isControllerUsed && isFocused" class="binding" ui-event="ok" controller />
          <span v-else-if="isEmpty" class="hero-create-icon">+</span>
          <BngIcon v-else type="play" />
          <span>{{ primaryActionLabel }}</span>
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngButton, BngIcon } from "@/common/components/base"
import AspectRatio from "@/common/components/utility/aspectRatio.vue"
import { vBngOnUiNav, vBngSoundClass, vBngUiNavLabel } from "@/common/directives"
import useControls from "@/services/controls"
import { $translate } from "@/services/translation"
import { getAssetURL } from "@/utils"
import { timeSpan } from "@/utils/datetime"
import ProfileStatus from "../../components/profiles/ProfileStatus.vue"

const onboardingBackgroundImage = getAssetURL("images/career/start_apm.jpg")

const props = defineProps({
  profile: {
    type: Object,
    default: null,
  },
  isActive: Boolean,
  isLoading: Boolean,
})

const emit = defineEmits(["load", "create", "browse-saves"])

const heroRef = ref(null)
const isFocused = ref(false)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const newCareerBackgroundImage = getAssetURL("images/career/start_apm.jpg")
const isEmpty = computed(() => !props.profile)
const showLoadingState = computed(() => props.isLoading && isEmpty.value)
const primaryActionDisabled = computed(() => props.isLoading || (!isEmpty.value && (props.isActive || props.profile.incompatibleVersion)))
const primaryActionLabel = computed(() =>
  isEmpty.value ? $translate.instant("ui.career.profiles.newCareer") : $translate.instant("ui.career.profiles.continue"))
const heroTitle = computed(() => {
  if (showLoadingState.value) return $translate.instant("ui.common.loading")
  return isEmpty.value ? $translate.instant("ui.career.profiles.newCareer") : props.profile.displayName
})
const heroKicker = computed(() => {
  if (showLoadingState.value) return $translate.instant("ui.career.profiles.title")
  return isEmpty.value
    ? $translate.instant("ui.career.profiles.noneFound")
    : (props.profile.date ? timeSpan(props.profile.date, null, 2, true) : $translate.instant("ui.common.unknown"))
})
const heroBackgroundImage = computed(() => `url(${props.profile?.preview || newCareerBackgroundImage})`)
const profileWarningMessage = computed(() => {
  if (isEmpty.value) return ""
  if (props.profile.incompatibleVersion) {
    return $translate.instant("ui.career.profiles.warning.incompatibleVersion")
  }
  if (props.profile.outdatedVersion) {
    return $translate.instant("ui.career.profiles.warning.outdatedVersion")
  }
  return ""
})


function backgroundImageStyle(image) {
  return {
    backgroundImage: `url("${String(image).replace(/"/g, '\\"')}")`,
  }
}

function onPrimaryAction() {
  if (primaryActionDisabled.value) return
  if (isEmpty.value) {
    emit("create")
    return
  }
  emit("load", props.profile.id)
}

function onBrowseSaves() {
  if (isEmpty.value || props.isLoading) return
  emit("browse-saves", props.profile.id)
}

function onCardClick(event) {
  if (!isEmpty.value || event.target.closest?.(".hero-action-button")) return
  onPrimaryAction()
}

defineExpose({
  getElement() {
    return heroRef.value
  },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.profile-hero-card {
  position: relative;
  display: flex;
  min-height: 0;
  height: 100%;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  overflow: hidden;
  cursor: pointer;
  isolation: isolate;
  @include modify-focus(var(--bng-corners-2), 0px);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.15);
  flex: 1 1 auto;

  &.is-loading {
    opacity: 0.65;
  }

  &.is-empty {
    .background-image {
      filter: saturate(0.9) contrast(0.92) brightness(0.82);
    }

    .hero-actions {
      justify-content: flex-end;
    }
  }
}

.background-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  filter: saturate(0.95) contrast(0.95);
  transition: transform 180ms ease-out, filter 180ms ease-out;
}

.profile-hero-card:focus .background-image,
.profile-hero-card.focus-visible .background-image,
.profile-hero-card:focus-visible .background-image {
  transform: scale(1.02);
  filter: saturate(1.08) contrast(1.04);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(var(--bng-off-black-rgb), 0.9) 0%,
    rgba(var(--bng-off-black-rgb), 0.55) 50%,
    rgba(var(--bng-off-black-rgb), 0.24) 100%
  );
  z-index: 0;
}

.content {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.85);
  padding: calc-ui-rem(1.5);
}

.hero-title-block {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: calc-ui-rem(0.25);
  align-self: flex-start;
  max-width: min(86%, 32rem);
  margin-left: -1.5rem;
  min-width: max(25%, 13rem);
  padding: calc-ui-rem(0.55) calc-ui-rem(2.4) calc-ui-rem(0.65) calc-ui-rem(1.8);
  background: rgba(var(--bng-orange-600-rgb), 0.95);
  clip-path: polygon(0% 0%, calc(100% - 1.4em) 0%, 100% 0%, calc(100% - 1.4em) 100%, 0% 100%);
  transition: padding-left 120ms ease-out, max-width 120ms ease-out;

  h2 {
    margin: 0;
    font-size: calc-ui-rem(2.1);
    line-height: 1.1;
    font-weight: 900;
    font-style: italic;
  }
}

.profile-hero-card:focus .hero-title-block,
.profile-hero-card.focus-visible .hero-title-block,
.profile-hero-card:focus-visible .hero-title-block {
  max-width: min(90%, 33rem);
  padding-left: calc-ui-rem(2.55);
}

.hero-kicker {
  color: rgba(var(--bng-off-white-rgb), 0.8);
  font-size: calc-ui-rem(0.85);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.active-badge {
  font-size: calc-ui-rem(0.8);
  font-weight: 700;
}

.hero-warning {
  max-width: calc-ui-rem(34);
  padding: calc-ui-rem(0.45) calc-ui-rem(0.6);
  border-radius: var(--bng-corners-1);
  border: 0.15em dashed rgba(var(--bng-add-red-600-rgb), 0.95);
  background-color: rgba(var(--bng-add-red-900-rgb), 0.95);
  color: rgba(var(--bng-add-red-50-rgb), 0.95);
  font-size: calc-ui-rem(0.85);
  font-weight: 700;
  line-height: 1.25;
  margin-right: auto;
  height: 100%;
}

.hero-warning--notice {
  border-color: rgba(var(--bng-orange-500-rgb), 0.85);
  background-color: rgba(var(--bng-orange-800-rgb), 0.85);
  color: rgba(var(--bng-orange-50-rgb), 0.85);

}

.hero-empty-description {
  max-width: calc-ui-rem(24);
  margin: 0;
  color: rgba(var(--bng-off-white-rgb), 0.82);
  font-size: calc-ui-rem(1.15);
}

.hero-status {
  max-width: calc-ui-rem(24);
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.62);
  padding: calc-ui-rem(0.25) calc-ui-rem(0.55);
  :deep(.profile-status-levels) {
    background: none;
  }
}

.onboarding-status {
  display: flex;
  flex-direction: column;
  max-width: calc-ui-rem(24);
  font-size: calc-ui-rem(1.15);
  font-weight: 700;
  color: rgba(var(--bng-off-white-rgb), 0.82);
  background: rgba(var(--bng-cool-gray-800-rgb), 0.95);
  border-radius: var(--bng-corners-1);
  border: 1px solid rgba(var(--bng-cool-gray-850-rgb), 0.5);
}

.onboarding-status-image {
  width: 100%;
  border-radius: var(--bng-corners-1);
  overflow: hidden;
}

.onboarding-status-label {
  line-height: 1.2;
  padding: calc-ui-rem(0.45) calc-ui-rem(0.95);
}


.vehicle-thumbnails {
  display: flex;
  flex-wrap: wrap;
  gap: calc-ui-rem(0.4);
  max-width: calc-ui-rem(26);
}

.vehicle-thumbnail {
  width: calc-ui-rem(8.2);
  aspect-ratio: 16 / 9;
  border-radius: var(--bng-corners-1);
  background-size: cover;
  background-position: center;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.72);
  box-shadow: inset 0 0 0 1px rgba(var(--bng-off-white-rgb), 0.16);
}

.hero-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: calc-ui-rem(0.5);
  margin-top: auto;
}

.hero-action-button {
  --bng-button-margin: 0;
  display: inline-flex;
  align-items: center;
  gap: calc-ui-rem(0.3);
}

.hero-action-button--primary {
  --bng-button-min-width: 11em;
  --bng-button-padding: 1.35em 2.35em;
  font-size: 1.8em;
}

.hero-action-button--secondary {
  --bng-button-min-width: 9em;
  --bng-button-padding: 1em 1.5em;
  align-self: flex-end;
  font-size: 1.05em;
}

.hero-create-icon {
  font-size: 1.25em;
  line-height: 0.9;
}

.profile-hero-card:hover :deep(.hero-action-button--primary .bng-background),
.profile-hero-card:focus :deep(.hero-action-button--primary .bng-background),
.profile-hero-card.focus-visible :deep(.hero-action-button--primary .bng-background),
.profile-hero-card:focus-visible :deep(.hero-action-button--primary .bng-background) {
  --bng-bg-enabled: var(--bng-orange-600);
  --bng-bg-border-enabled: var(--bng-orange-400);
}

.binding {
  margin-right: calc-ui-rem(0.1);
}
</style>
