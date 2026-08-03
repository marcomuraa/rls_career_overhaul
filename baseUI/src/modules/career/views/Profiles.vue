<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'root' }"
    v-bng-on-ui-nav:menu="toggleMenu"
    :class="['profiles-container', { 'profiles-container--disabled': buttonsDisabled }]"
    @deactivate="onDeactivate"
  >
    <BngScreenHeading class="profiles-title" :preheadings="[$ctx_t('ui.playmodes.career')]">{{ $ctx_t("ui.career.savedProgress") }}</BngScreenHeading>
    <!-- <BackAside v-bng-on-ui-nav:back,menu="navigateToMainMenu" class="profiles-back" @click="navigateToMainMenu" /> -->
    <BackAside class="profiles-back" @click="navigateToMainMenu" />
    <BngList :layout="LIST_LAYOUTS.RIBBON" :target-width="22" :target-height="28" :target-margin="1" no-background >
      <div class="profile-create-entry profile-card">
        <MenuButton size="big" icon-id="plus" class="profile-create-entry-button" :disabled="buttonsDisabled" @click="openCreatePopup" bg-img="images/career/start_fresh.jpg">{{ `${$ctx_t("ui.common.new")} ${$ctx_t("ui.career.profile")}` }}</MenuButton>
      </div>
      <ProfileCard
        v-for="(profile, index) of profiles"
        :key="index"
        v-bng-popover:top="profile.incompatibleVersion ? 'tooltip-outdated-message' : null"
        :id="profile.id"
        :display-name="profile.displayName"
        :date="profile.date"
        :creationDate="profile.creationDate"
        :incompatibleVersion="profile.incompatibleVersion"
        :outdatedVersion="profile.outdatedVersion"
        :preview="profile.preview"
        :beamXP="profile.beamXP"
        :vouchers="profile.vouchers"
        :vehicleCount="profile.vehicleCount"
        :money="profile.money"
        :insuranceScore="profile.insuranceScore"
        :branches="profile.branches"
        :active="activeProfileId === profile.id"
        :disabled="buttonsDisabled || (selectedCard !== null && selectedCard !== index)"
        class="profile-card"
        @card:activate="value => onCardActivated(value, index)"
        @load="onLoad"
        @rename="newName => onRename(profile, newName)" />
    </BngList>
  </div>
  <BngPopoverContent name="tooltip-outdated-message">
    <div class="tooltip-outdated-message">{{ $translate.instant("ui.career.profile.outdatedTooltip") }}</div>
  </BngPopoverContent>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, onBeforeMount, onUnmounted, provide, ref, watch } from "vue"
import { lua, useBridge } from "@/bridge"
import { addPopup } from "@/services/popup"
import { $translate } from "@/services"
import { startLoading, waitForLoadingScreenFadeIn } from "@/services/screenCover"
import { ACTIONS_BY_UI_EVENT } from "@/services/uiNav/constants"
import { useUINavBlocker } from "@/services/uiNavTracker"
import { vBngPopover, vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { BngList, BngPopoverContent, BngScreenHeading, LIST_LAYOUTS } from "@/common/components/base"
import BackAside from "../../mainmenu/components/BackAside.vue"
import MenuButton from "../../mainmenu/components/MenuButton.vue"
import ProfileCard from "../components/profiles/ProfileCard.vue"
import ProfileCreatePopup from "../components/profiles/ProfileCreatePopup.vue"
import { useProfilesStore, PROFILE_NAME_MAX_LENGTH, INVALID_JSON_VALUE_CHARS } from "../stores/profilesStore"

const store = useProfilesStore()
const { events } = useBridge()

const profiles = ref([])
const activeProfileId = ref(null)
const isPopupOpen = ref(false)
const isLoadingProfile = ref(false)
const buttonsDisabled = computed(() => isPopupOpen.value || isLoadingProfile.value)
const uiNavBlocker = useUINavBlocker()

const selectedCard = ref(null)

const runWithLoadingLock = async loadAction => {
  if (isLoadingProfile.value) return
  isLoadingProfile.value = true
  await startLoading(async () => {
    try {
      await waitForLoadingScreenFadeIn()
      await loadAction()
    } finally {
      isLoadingProfile.value = false
    }
  })
}

const onLoad = async id => {
  await runWithLoadingLock(() => store.loadProfile(id))
}

const onRename = async (profile, newName) => {
  const res = await lua.career_saveSystem.renameProfile(profile.id, newName)
  if (res) profile.id = newName
}

const onCreateSave = async (profileName, startMode) => {
  await runWithLoadingLock(() => store.loadProfile(profileName, startMode, true))
}

const toggleMenu = () => {
  lua.extensions.ui_menuManager.toggleMenu()
}

function onCardActivated(active, index) {
  if (active) {
    selectedCard.value = index
  } else {
    selectedCard.value = null
  }
}

async function openCreatePopup() {
  const startModes = await lua.career_career.getStartingModeOptions().catch(() => null)
  if (!Array.isArray(startModes) || startModes.length === 0) return

  isPopupOpen.value = true
  let result = null
  try {
    result = await addPopup(ProfileCreatePopup, {
      defaultProfileName: getNewName(),
      validateName,
      startModes,
    }).promise.catch(() => null)
  } finally {
    isPopupOpen.value = false
  }

  if (!result?.profileName) return
  await onCreateSave(result.profileName, result.startMode)
}

onMounted(() => {
  events.on("allCareerProfiles", onProfilesReceived)
  lua.career_career.sendAllCareerProfilesData()
})

onBeforeUnmount(() => {
  events.off("allCareerProfiles", onProfilesReceived)
})

watch(isLoadingProfile, loading => {
  if (loading) {
    uiNavBlocker.blockOnly(Object.keys(ACTIONS_BY_UI_EVENT))
  } else {
    uiNavBlocker.clear()
  }
}, { immediate: true })

provide("validateName", validateName)

const navigateToMainMenu = e => {
  if (buttonsDisabled.value) return
  lua.extensions.ui_menuManager.toggleMenu()
}

function onDeactivate(event) {
  if (event.detail.force) return
  if (buttonsDisabled.value) return

  navigateToMainMenu()
}

async function onProfilesReceived(data) {
  // console.log("onProfilesReceived", data)
  selectedCard.value = null
  activeProfileId.value = null
  profiles.value = []

  if (!data || !Array.isArray(data) || data.length === 0) return

  const sortedWithActive = await updateActiveProfile(data)
  const fallbackStat = { value: 0 }
  profiles.value = sortedWithActive.map(p => ({
    id: p.id,
    displayName: typeof p.displayName === "string" ? p.displayName : p.id,
    date: typeof p.date === "string" ? p.date : "",
    creationDate: typeof p.creationDate === "string" ? p.creationDate : "",
    incompatibleVersion: p.incompatibleVersion,
    outdatedVersion: typeof p.outdatedVersion === "boolean" ? p.outdatedVersion : false,
    preview: p.preview,
    beamXP: p.beamXP && typeof p.beamXP === "object" ? p.beamXP : fallbackStat,
    vouchers: p.vouchers && typeof p.vouchers === "object" ? p.vouchers : fallbackStat,
    vehicleCount: p.vehicleCount,
    money: p.money && typeof p.money === "object" ? p.money : fallbackStat,
    insuranceScore: p.insuranceScore && typeof p.insuranceScore === "object" ? p.insuranceScore : fallbackStat,
    branches: Array.isArray(p.branches) ? p.branches : [],
  }))
}

async function updateActiveProfile(data) {
  const currentSave = await lua.career_career.sendCurrentProfileData()
  data.sort((a, b) => new Date(b.date) - new Date(a.date))

  if (currentSave) {
    activeProfileId.value = currentSave.id
    let current = data.find(x => x.id === currentSave.id)

    // if currentSave is not in the returned profiles data yet,
    // because it may not have been saved yet or needs manual saving
    if (!current) current = currentSave

    data = data.filter(x => x.id !== currentSave.id)
    data.splice(0, 0, current)
  }

  return data
}

function validateName(newName) {
  // empty
  if (!newName) return $translate.instant("ui.career.profile.saveNameEmpty")

  // too long
  if (newName.length > PROFILE_NAME_MAX_LENGTH) return $translate.instant("ui.career.profile.saveNameTooLong")

  // invalid characters
  if (INVALID_JSON_VALUE_CHARS.test(newName)) return $translate.instant("ui.career.profile.saveNameInvalidChars")

  // duplicate
  if (profiles.value && profiles.value.find(profile => profile.id.toLowerCase() === newName.toLowerCase())) return $translate.instant("ui.career.profile.saveNameExists")

  return null
}

function getNewName() {
  const prefix = $translate.contextTranslate("ui.career.profile")
  let id
  for (let i = 1; i < 1e3; i++) {
    id = `${prefix} ${i}`
    if (!profiles.value || !profiles.value.find(profile => profile.id === id)) break
  }
  return id
}

onBeforeMount(() => {
  lua.simTimeAuthority.pushPauseRequest('profiles')
})

onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest('profiles')
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.profiles-container {
  position: relative;
  font-size: calc-ui-rem();
  margin: auto calc-ui-rem(6);

  // Fix focus frame cut-off at bottom
  :deep(.list-content.list-item-margin > .list-items > *) {
    margin-bottom: calc-ui-rem(1) !important;
  }

  // temp
  .profiles-title {
    font-size: calc-ui-rem() !important;
    :deep(.header) {
      padding: calc-ui-rem(0.5) calc-ui-rem(0.75) calc-ui-rem(0.5) calc-ui-rem(0.5) !important;
    }
  }
}

.profiles-container--disabled {
  pointer-events: none;
}

.profiles-title {
  position: absolute;
  top: calc-ui-rem(-6);
  left: calc-ui-rem(-4);
}

.profiles-back {
  top: calc-ui-rem() !important;
  bottom: calc-ui-rem() !important;
}

.profile-card {
  height: calc-ui-rem(28);
  width: calc-ui-rem(22);
  margin: 0.25rem;
}

.profile-create-entry {
  display: flex;
  align-items: flex-end;

  .profile-create-entry-button {
    width: 100% !important;
    height: 100% !important;
    border: 1px solid blue;
    margin: 0;
  }
}

.tooltip-outdated-message {
  padding: calc-ui-rem(0.5);
  max-width: calc-ui-rem(16);
}
</style>
