<template>
  <LayoutMenu
    class="career-profile-select"
    nav-scope="career-profiles"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    v-bng-on-ui-nav:back="onBack"
    @breadcrumb-back="onBack"
    @breadcrumb-click="onBreadcrumbClick"
  >
    <div class="profiles-screen-panel">
      <BngBinding class="profiles-tracker-ignore" ui-event="tab_l" always-show-unassigned aria-hidden="true" />
      <BngBinding class="profiles-tracker-ignore" ui-event="tab_r" always-show-unassigned aria-hidden="true" />
      <div class="profiles-info-box" v-bng-blur>
        <BlurBackground />
        <div class="profiles-info-header">
          <BngScreenHeadingV2 type="2">{{ $t("ui.career.profiles.title") }}</BngScreenHeadingV2>
        </div>
      </div>

      <div class="profiles-shell" :class="{ disabled: isLoadingProfile }">
        <section
          v-bng-scoped-nav="{ scopeId: 'career-profiles-hero', type: 'container' }"
          class="profiles-hero-box"
          v-bng-blur
        >
          <ProfileHeroCard
            ref="heroCardRef"
            bng-scoped-nav-autofocus
            :profile="selectedProfile"
            :is-active="!!selectedProfile && activeProfileId === selectedProfile.id"
            :is-loading="isLoadingProfile || profileSaveSlotsLoading"
            v-bng-on-ui-nav:focus_r.focusRequired="focusSelectedProfileRow"
            @load="onLoad"
            @create="goToNewProfile"
            @browse-saves="goToProfileSaves"
          />
        </section>

        <aside v-if="showProfilesSide" class="profiles-side">
          <div
            v-bng-scoped-nav="{ scopeId: 'career-profiles-new', type: 'container' }"
            class="new-profile-box"
            v-bng-blur
          >
            <button
              class="new-profile-card"
              type="button"
              bng-nav-item
              tabindex="0"
              v-bng-on-ui-nav:ok.asMouse
              v-bng-sound-class="'bng_click_hover_generic'"
              @click="goToNewProfile"
            >
              <span class="new-profile-icon">+</span>
              <span>
                <strong>{{ $t("ui.career.profiles.newCareer") }}</strong>
                <small>{{ $t("ui.career.profiles.newCareerHint") }}</small>
              </span>
              <BngIcon class="new-profile-icon-arrow" :type="icons.arrowSmallRight" />
            </button>
          </div>

          <div
            v-bng-scoped-nav="{ scopeId: 'career-profiles-list', type: 'container' }"
            ref="profilesListPanelRef"
            class="profiles-list-panel"
            v-bng-blur
          >
            <div v-if="profileSaveSlotsLoading" class="profiles-loading-text">{{ $t("ui.common.loading") }}</div>
            <BngList
              v-else
              class="profiles-list"
              :layout="LIST_LAYOUTS.LIST"
              :target-width="30"
              :target-height="5.5"
              :target-margin="0.5"
              no-background
              nav-scroll-enabled
            >
              <ProfileListItem
                v-for="profile in profiles"
                :key="profile.id"
                :profile="profile"
                :selected="selectedProfileId === profile.id"
                :is-active="activeProfileId === profile.id"
                @select="onSelectProfile"
                @delete="onDeleteProfile"
              />
            </BngList>
          </div>
        </aside>
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { BngBinding, BngIcon, BngList, BngScreenHeadingV2, icons, LIST_LAYOUTS } from "@/common/components/base"
import { vBngBlur, vBngOnUiNav, vBngScopedNav, vBngSoundClass } from "@/common/directives"
import { LayoutMenu } from "@/common/layouts"
import { lua } from "@/bridge"
import { useStreams } from "@/services/events"
import { openConfirmation } from "@/services/popup"
import { ACTIONS_BY_UI_EVENT } from "@/services/uiNav/constants"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { setFocus } from "@/services/uiNavFocus"
import { luaRouterScopedNavBack, useScopedNav } from "@/services/scopedNav/api"
import { $translate } from "@/services/translation"
import { useCareerProfiles } from "../composables/useCareerProfiles"
import ProfileHeroCard from "../components/ProfileHeroCard.vue"
import ProfileListItem from "../components/ProfileListItem.vue"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"

const {
  profiles,
  activeProfileId,
  selectedProfileId,
  selectedProfile,
  isLoadingProfile,
  profilesGeneration,
  startProfilesListener,
  stopProfilesListener,
  loadProfile,
  deleteProfile,
  selectProfile,
} = useCareerProfiles()

const uiNavBlocker = useUINavBlocker()
const heroCardRef = ref(null)
const profilesListPanelRef = ref(null)
const didAutofocusHero = ref(false)
const isRefreshingProfiles = ref(true)
const requestedProfilesGeneration = ref(0)
const isCareerActive = ref(false)
let asyncBulkLoaderPromise = null

const asyncBulkLoaderStreamName = "asyncBulkLoaderProgress"
const PROFILES_SCOPE_ID = "career-profiles"
const HERO_SCOPE_ID = "career-profiles-hero"
const { activateScope } = useScopedNav()
const asyncBulkLoaderProgress = reactive({
  inProgress: false,
})

const exitBreadcrumbLabel = computed(() => $translate.instant(isCareerActive.value ? "ui.environment.pause" : "ui.common.menu"))
const breadcrumbItems = computed(() => [{ label: exitBreadcrumbLabel.value, isBackButton: true }])
const profileSaveSlotsLoading = computed(() => isRefreshingProfiles.value || asyncBulkLoaderProgress.inProgress)
const showProfilesSide = computed(() => profileSaveSlotsLoading.value || profiles.value.length > 0)

useStreams([asyncBulkLoaderStreamName], streams => {
  if (!Object.prototype.hasOwnProperty.call(streams, asyncBulkLoaderStreamName)) return
  const payload = streams[asyncBulkLoaderStreamName] || {}
  asyncBulkLoaderProgress.inProgress = !!payload.inProgress
})

function refreshCareerBackTarget() {
  lua.career_career.isActive().then(active => {
    isCareerActive.value = !!active
  })
}

function goBackThroughRouter() {
  luaRouterScopedNavBack(PROFILES_SCOPE_ID)
}

function goToNewProfile() {
  lua.extensions.ui_router.navigate("career.profiles.new", null, null)
}

function goToProfileSaves(profileId) {
  if (!profileId) return
  lua.extensions.ui_router.navigate("career.profiles.saves", { profileId }, null)
}

async function onLoad(profileId) {
  await loadProfile(profileId)
}

function onSelectProfile(profileId) {
  selectProfile(profileId)
  focusHeroCard()
}

async function onDeleteProfile(profile) {
  if (!profile?.id) return
  const message = `${$translate.contextTranslate("ui.career.deletePrompt")}\n\n${$translate.instant("ui.career.deleteCannotUndo")}`
  const title = $translate.instant("ui.career.deleteProfileTitle", { profileName: profile.displayName || profile.id })
  const confirmed = await openConfirmation(title, message)
  if (!confirmed) return
  await deleteProfile(profile.id)
}

function ensureAsyncBulkLoaderLoaded() {
  if (!asyncBulkLoaderPromise) {
    asyncBulkLoaderPromise = lua.extensions.load("util_asyncBulkLoader")
      .catch(error => {
        asyncBulkLoaderPromise = null
        throw error
      })
  }

  return asyncBulkLoaderPromise
}

async function refreshProfilesAsync() {
  isRefreshingProfiles.value = true
  requestedProfilesGeneration.value = profilesGeneration.value

  try {
    startProfilesListener()
    await ensureAsyncBulkLoaderLoaded()
    await lua.extensions.util_asyncBulkLoader.sendAllCareerSaveSlotsDataAsync()
  } catch (error) {
    isRefreshingProfiles.value = false
    throw error
  }
}

watch(profilesGeneration, generation => {
  if (isRefreshingProfiles.value && generation !== requestedProfilesGeneration.value) {
    isRefreshingProfiles.value = false
  }
})

async function focusHeroCard() {
  await nextTick()
  const element = heroCardRef.value?.getElement?.()
  if (element) setFocus(element)
}

function focusHeroCardOnce() {
  if (didAutofocusHero.value) return
  didAutofocusHero.value = true
  focusHeroCard()
}

function focusSelectedProfileRow() {
  nextTick(() => {
    const selectedId = selectedProfileId.value || selectedProfile.value?.id
    const panel = profilesListPanelRef.value
    const element = selectedId
      ? Array.from(panel?.querySelectorAll("[data-profile-id]") || []).find(item => item.dataset.profileId === selectedId)
      : null
    const fallback = panel?.querySelector("[bng-nav-item]")
    const target = element || fallback
    if (!target) return
    target.scrollIntoView({ block: "nearest", inline: "nearest" })
    setFocus(target)
  })
  return false
}

function onBreadcrumbClick(item) {
  if (item?.isBackButton) goBackThroughRouter()
}

function onBack(event) {
  if (event?.preventDefault) event.preventDefault()
  if (event?.stopPropagation) event.stopPropagation()
  goBackThroughRouter()
  return false
}

watch(isLoadingProfile, loading => {
  if (loading) {
    uiNavBlocker.blockOnly(Object.keys(ACTIONS_BY_UI_EVENT))
  } else {
    uiNavBlocker.clear()
  }
}, { immediate: true })

onBeforeMount(() => {
  refreshCareerBackTarget()
  lua.simTimeAuthority.pushPauseRequest("profiles")
})

onMounted(() => {
  refreshProfilesAsync()
})

watch(selectedProfile, profile => {
  if (!profile) return
  focusHeroCardOnce()
})

watch(profileSaveSlotsLoading, loading => {
  if (loading) return
  focusHeroCardOnce()
})

watch(showProfilesSide, (showSide, wasShowing) => {
  if (showSide || wasShowing === undefined) return
  nextTick(() => {
    activateScope(HERO_SCOPE_ID, { reason: "career-profiles-side-hidden", force: true })
  })
})

onBeforeUnmount(() => {
  stopProfilesListener()
})

onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest("profiles")
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.profiles-tracker-ignore {
  display: none;
}

.career-profile-select {
  --content-max-width: calc-ui-rem(86);
  --content-h-position: center;
  --content-v-position: center;
  :deep(.career-profile-select) {
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

.profiles-screen-panel {
  width: calc-ui-rem(86);
  height: calc-ui-rem(47);
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.5);
  min-height: 0;
  justify-self: center;
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

.profiles-shell {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: calc-ui-rem(1);
  min-height: 0;

  &.disabled {
    pointer-events: none;
  }
}

.profiles-hero-box,
.profiles-side {
  min-height: 0;

}

.profiles-hero-box {
  position: relative;
  display: flex;
  min-width: 0;
  padding: calc-ui-rem(0.6);
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
}

.profiles-side {
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.75);
  width: calc-ui-rem(30);
}

.new-profile-box {
  position: relative;
  padding: calc-ui-rem(0.5);
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.66);
}

.new-profile-card {
  @include modify-focus(var(--bng-corners-2), 0px);
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: calc-ui-rem(4) minmax(0, 1fr) auto;
  align-items: center;
  gap: calc-ui-rem(0.85);
  min-height: calc-ui-rem(6.5);
  padding: calc-ui-rem(0.75);
  border: 0;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.72);
  text-align: left;
  cursor: pointer;


  width: 100%;
  &:hover,
  &:focus,
  &.focus-visible {
    background-color: rgba(var(--bng-cool-gray-700-rgb), 0.85);

    .new-profile-icon {
      border-color: rgba(var(--bng-orange-300-rgb), 0.9);
    }
  }

  strong,
  small {
    display: block;
  }

  strong {
    font-size: calc-ui-rem(1.2);
  }

  small {
    color: rgba(var(--bng-off-white-rgb), 0.72);
  }
}

.new-profile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc-ui-rem(4);
  border-radius: 100%;
  border: 2px dashed rgba(var(--bng-off-white-rgb), 0.72);
  font-size: calc-ui-rem(3);
  line-height: 1;
  padding-bottom: calc-ui-rem(0.2);
  color: rgba(var(--bng-off-white-rgb), 0.85);
  background-color: rgba(var(--bng-off-white-rgb), 0.08);
}

.new-profile-icon-arrow {
  font-size: calc-ui-rem(3.2);
}

.profiles-list-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.72);
  color: var(--bng-off-white);
}

.profiles-list-panel h2 {
  margin: 0 0 calc-ui-rem(0.5);
  font-size: calc-ui-rem(1.4);
}

.profiles-loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  font-size: calc-ui-rem(1.3);
  font-weight: 700;
}

.profiles-list {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
