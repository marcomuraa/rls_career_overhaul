<template>
  <LayoutMenu
    class="career-profile-new"
    nav-scope="career-profiles-new"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    v-bng-on-ui-nav:back="onBack"
    @breadcrumb-back="onBack"
    @breadcrumb-click="onBreadcrumbClick"
  >
    <div class="new-profile-screen-panel">
      <div class="profiles-info-box" v-bng-blur>
        <BlurBackground />
        <div class="profiles-info-header">
          <BngScreenHeadingV2 type="2">{{ `${$ctx_t("ui.common.new")} ${$ctx_t("ui.career.profile")}` }}</BngScreenHeadingV2>
        </div>
      </div>

      <div class="new-profile-panel" :class="{ 'controller-hold-enabled': isControllerUsed }" v-bng-blur>
        <div class="new-profile-body">
          <div class="intro-text">
            <div>{{ $t("ui.career.profiles.intro1") }}</div>
            <div>{{ $t("ui.career.profiles.intro2") }}</div>
          </div>

          <BngCardHeading type="ribbon" class="section-heading">{{ $t("ui.career.profiles.profileName") }}</BngCardHeading>
          <BngInput
            class="profile-name-input"
            v-model="profileName"
            :maxlength="PROFILE_NAME_MAX_LENGTH"
            :validate="validateCreateName"
            :errorMessage="nameError"
          />

          <BngCardHeading type="ribbon" class="section-heading">{{ $t("ui.career.profiles.startMode") }}</BngCardHeading>
          <div class="start-mode-list">
            <BngButton
              v-for="(mode, index) in startModeOptions"
              :key="mode.id"
              :class="['start-mode-card', 'start-mode-card--major']"
              :accent="ACCENTS.ghost"
              :data-tag="mode.tag || null"
              v-bind="index === 0 ? { 'bng-scoped-nav-autofocus': true } : {}"
              v-bng-on-ui-nav:ok.focusRequired="() => start(mode.id)"
              bng-nav-item
              tabindex="1"
              @click="start(mode.id)"
              @focus="focusedStartMode = mode.id"
              @blur="focusedStartMode = null"
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
                    tabindex="-1"
                    :disabled="isLoadingProfile"
                    @click.stop="start(mode.id)"
                  >
                    <BngBinding v-if="isControllerUsed && focusedStartMode === mode.id" ui-event="ok" controller />
                    {{ $t("ui.career.profiles.start") }}
                  </BngButton>
                </div>
              </div>
            </BngButton>
          </div>
        </div>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, onUnmounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { ACCENTS, BngBinding, BngButton, BngCardHeading, BngInput, BngScreenHeadingV2 } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { lua } from "@/bridge"
import useControls from "@/services/controls"
import { $translate } from "@/services/translation"
import { getAssetURL } from "@/utils"
import { PROFILE_NAME_MAX_LENGTH, useCareerProfiles } from "../composables/useCareerProfiles"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"

const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const profileName = ref("")
const nameError = ref(null)
const focusedStartMode = ref(null)
const rawStartModes = ref([])
const isCareerActive = ref(false)

const {
  isLoadingProfile,
  refreshProfiles,
  stopProfilesListener,
  loadProfile,
  validateName,
  getNewName,
} = useCareerProfiles()

const exitBreadcrumbLabel = computed(() => $translate.instant(isCareerActive.value ? "ui.environment.pause" : "ui.common.menu"))
const breadcrumbItems = computed(() => [
  { label: exitBreadcrumbLabel.value, isBackButton: true },
  { label: $translate.instant("ui.career.profiles.title"), route: "career.profiles" },
])

function translateStartingModeField(modeId, field, fallback) {
  const key = `ui.career.profiles.startingModes.${modeId}.${field}`
  const translated = $translate.instant(key)
  return translated === key ? fallback : translated
}

const startModeOptions = computed(() =>
  rawStartModes.value
    .filter(mode => mode && mode.id)
    .map(mode => ({
      ...mode,
      image: typeof mode.image === "string" && mode.image.length ? getAssetURL(mode.image) : mode.image,
      title: translateStartingModeField(mode.id, "title", mode.title),
      description: translateStartingModeField(mode.id, "description", mode.description),
      tag: mode.tag ? translateStartingModeField(mode.id, "tag", mode.tag) : mode.tag,
    }))
)

function validateCreateName(name) {
  const error = validateName(name)
  nameError.value = error
  return !error
}

function refreshCareerBackTarget() {
  lua.career_career.isActive().then(active => {
    isCareerActive.value = !!active
  })
}

async function goToProfileExitTarget() {
  const active = await lua.career_career.isActive()
  isCareerActive.value = !!active
  lua.extensions.ui_router.navigate(active ? "pause" : "menu", null, null)
}

function goToProfiles() {
  lua.extensions.ui_router.navigate("career.profiles", null, null)
}

function onBreadcrumbClick(item) {
  if (item?.isBackButton) {
    goToProfileExitTarget()
    return
  }
  goToProfiles()
}

function onBack(event) {
  if (event?.preventDefault) event.preventDefault()
  if (event?.stopPropagation) event.stopPropagation()
  goToProfiles()
  return false
}

async function start(modeId) {
  const error = validateName(profileName.value)
  nameError.value = error
  if (error || !modeId) return

  await loadProfile(profileName.value, modeId, true)
}

onBeforeMount(() => {
  refreshCareerBackTarget()
  lua.simTimeAuthority.pushPauseRequest("profiles")
})

onMounted(async () => {
  await refreshProfiles()
  rawStartModes.value = await lua.career_career.getStartingModeOptions().catch(() => [])
  focusedStartMode.value = startModeOptions.value[0]?.id || null
  profileName.value = getNewName()
  nameError.value = validateName(profileName.value)
})

onBeforeUnmount(() => {
  stopProfilesListener()
})

onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest("profiles")
})
</script>

<style lang="scss" scoped>
@use "sass:color";
@use "sass:map";
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");

.career-profile-new {
  --content-max-width: calc-ui-rem(72);
  --content-h-position: center;
  --content-v-position: center;

  :deep(.career-profile-new) {
    min-height: unset;
    flex: 0 0 auto;
  }

  :deep(.layout-content) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    flex: 1 1 auto;
  }

  :deep(.menu-content-main) {
    align-items: center;
    justify-content: center;
  }
}

.new-profile-screen-panel {
  width: calc-ui-rem(70);
  height: calc-ui-rem(47);
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  min-height: 0;
}

.profiles-info-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
  border-radius: var(--bng-corners-2);
  --bng-heading-background: none;
  color: var(--bng-off-white);
}

.profiles-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc-ui-rem(0.5);
}

.profiles-info-box :deep(.bng-screen-heading) {
  padding: 0.6em 0.75em;
  margin-top: 0;
}

.new-profile-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: calc-ui-rem(0.5);
  overflow: hidden;
  background: rgba(var(--bng-cool-gray-900-rgb), 0.72);
  color: $off-white;
}

.new-profile-body {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.75);
  padding: calc-ui-rem(0.75) 0;
  flex: 1 1 auto;
  min-height: 0;
}

.intro-text {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  font-size: calc-ui-rem(1);
  padding: 0 calc-ui-rem(0.75);
  text-align: center;
}

.section-heading {
  margin: 0;
  margin-top: calc-ui-rem(0.5);
  font-size: calc-ui-rem(1.2);
}

.profile-name-input {
  margin: 0 calc-ui-rem(0.5);
  width: calc-ui-rem(28);
  align-self: center;
}

.start-mode-list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: calc-ui-rem(0.5);
  overflow: hidden;
  padding: 0 calc-ui-rem(0.75);
}

.start-mode-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  position: relative;
  min-height: calc-ui-rem(10.5);
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
  padding: 0 calc-ui-rem(0.5) calc-ui-rem(0.1);
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
}

.start-mode-card-title {
  display: block;
  margin-top: calc-ui-rem(0.1);
  font-size: calc-ui-rem(1.4);
  line-height: 1.25;
  font-weight: 800;
  font-style: italic;
  color: var(--bng-off-white-brighter);
}

.start-mode-card-desc {
  margin: 0;
  font-size: calc-ui-rem(1);
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

</style>
