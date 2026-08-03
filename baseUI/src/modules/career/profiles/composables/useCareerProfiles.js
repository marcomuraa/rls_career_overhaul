import { computed, ref } from "vue"
import { lua, useBridge } from "@/bridge"
import { $translate } from "@/services"
import { startLoading, waitForLoadingScreenFadeIn } from "@/services/screenCover"
import { showToast } from "@/services/toast"
import { PROFILE_NAME_MAX_LENGTH, INVALID_JSON_VALUE_CHARS } from "../../stores/profilesStore"

export { PROFILE_NAME_MAX_LENGTH }

const fallbackStat = { value: 0 }
const profiles = ref([])
const activeProfileId = ref(null)
const selectedProfileId = ref(null)
const isLoadingProfile = ref(false)
const profilesGeneration = ref(0)

const selectedProfile = computed(() => profiles.value.find(profile => profile.id === selectedProfileId.value) || profiles.value[0] || null)

function normalizeProfile(profile) {
  return {
    id: profile.id,
    displayName: typeof profile.displayName === "string" ? profile.displayName : profile.id,
    date: typeof profile.date === "string" ? profile.date : "",
    creationDate: typeof profile.creationDate === "string" ? profile.creationDate : "",
    incompatibleVersion: !!profile.incompatibleVersion,
    outdatedVersion: !!profile.outdatedVersion,
    preview: profile.preview || "/ui/modules/career/profilePreview_WCUSA.jpg",
    beamXP: profile.beamXP && typeof profile.beamXP === "object" ? profile.beamXP : fallbackStat,
    vouchers: profile.vouchers && typeof profile.vouchers === "object" ? profile.vouchers : fallbackStat,
    vehicleCount: Number.isFinite(profile.vehicleCount) ? profile.vehicleCount : 0,
    money: profile.money && typeof profile.money === "object" ? profile.money : fallbackStat,
    insuranceScore: profile.insuranceScore && typeof profile.insuranceScore === "object" ? profile.insuranceScore : fallbackStat,
    branches: Array.isArray(profile.branches) ? profile.branches : [],
    currentVehicle: profile.currentVehicle,
    boughtStarterVehicle: profile.boughtStarterVehicle,
    startingOptions: profile.startingOptions,
  }
}

async function onProfilesReceived(data) {
  activeProfileId.value = null

  if (!Array.isArray(data) || data.length === 0) {
    profiles.value = []
    selectedProfileId.value = null
    profilesGeneration.value += 1
    return
  }

  const currentSave = await lua.career_career.sendCurrentProfileData()
  activeProfileId.value = currentSave?.id || null

  profiles.value = data
    .map(normalizeProfile)
    .sort((a, b) => new Date(b.date || b.creationDate) - new Date(a.date || a.creationDate))

  if (!profiles.value.find(profile => profile.id === selectedProfileId.value)) {
    selectedProfileId.value = profiles.value[0]?.id || null
  }
  profilesGeneration.value += 1
}

async function runWithLoadingLock(action) {
  if (isLoadingProfile.value) return false
  isLoadingProfile.value = true

  return await startLoading(async () => {
    try {
      await waitForLoadingScreenFadeIn()
      return await action()
    } finally {
      isLoadingProfile.value = false
    }
  })
}

function showProfileToast(messageType) {
  showToast({
    type: "info",
    message: $translate.contextTranslate(`ui.career.notification.${messageType}`),
    timeout: 5,
  })
}

export function useCareerProfiles() {
  const { events } = useBridge()

  function startProfilesListener() {
    events.off("allCareerProfiles", onProfilesReceived)
    events.on("allCareerProfiles", onProfilesReceived)
  }

  function stopProfilesListener() {
    events.off("allCareerProfiles", onProfilesReceived)
  }

  async function refreshProfiles() {
    startProfilesListener()
    await lua.career_career.sendAllCareerProfilesData()
  }

  async function startCareer(profileName, { specificSave = null, startingOptions = null, toast = "loaded" } = {}) {
    if (!profileName) return false

    const trimmedName = profileName.replace(/^ +| +$/g, "")
    const result = await runWithLoadingLock(async () => {
      const loaded = await lua.career_career.createOrLoadCareerAndStart(trimmedName, specificSave, startingOptions)
      if (loaded) showProfileToast(toast)
      return loaded
    })

    return !!result
  }

  function loadProfile(profileName, startMode = null, isNew = false) {
    return startCareer(profileName, { startingOptions: { startMode }, toast: isNew ? "added" : "loaded" })
  }

  async function getSaveFolders(profileId) {
    if (!profileId) return []
    const folders = await lua.career_career.getSaveFoldersForProfile(profileId)
    return Array.isArray(folders) ? folders : []
  }

  function loadProfileSave(profileId, saveFolderName) {
    if (!saveFolderName) return false
    return startCareer(profileId, { specificSave: saveFolderName })
  }

  async function saveCurrentAs(saveFolderName) {
    const trimmed = (saveFolderName || "").trim()
    if (!trimmed) return false
    await lua.career_saveSystem.saveCurrent(false, true, trimmed)
    return true
  }

  async function removeSaveFolder(profileId, saveFolderName) {
    if (!profileId || !saveFolderName) return false
    return !!(await lua.career_saveSystem.removeSaveFolder(profileId, saveFolderName))
  }

  async function renameProfile(profileId, newName) {
    const result = await lua.career_saveSystem.renameProfile(profileId, newName)
    if (result && selectedProfileId.value === profileId) selectedProfileId.value = newName
    await refreshProfiles()
    return result
  }

  async function deleteProfile(profileId) {
    await lua.career_saveSystem.removeProfile(profileId)
    if (selectedProfileId.value === profileId) selectedProfileId.value = null
    await refreshProfiles()
  }

  function selectProfile(profileId) {
    selectedProfileId.value = profileId
  }

  function validateName(newName, currentName = null) {
    if (!newName) return $translate.instant("ui.career.profile.saveNameEmpty")
    if (newName.length > PROFILE_NAME_MAX_LENGTH) return $translate.instant("ui.career.profile.saveNameTooLong")
    if (INVALID_JSON_VALUE_CHARS.test(newName)) return $translate.instant("ui.career.profile.saveNameInvalidChars")
    if (profiles.value.find(profile => profile.id.toLowerCase() === newName.toLowerCase() && profile.id !== currentName)) {
      return $translate.instant("ui.career.profile.saveNameExists")
    }
    return null
  }

  function getNewName() {
    const prefix = $translate.contextTranslate("ui.career.profile")
    let displayName = prefix
    for (let i = 1; i < 1e3; i++) {
      displayName = `${prefix} ${i}`
      if (!profiles.value.find(profile => profile.displayName === displayName)) break
    }
    return displayName
  }

  return {
    profiles,
    activeProfileId,
    selectedProfileId,
    selectedProfile,
    isLoadingProfile,
    profilesGeneration,
    startProfilesListener,
    stopProfilesListener,
    refreshProfiles,
    loadProfile,
    loadProfileSave,
    saveCurrentAs,
    removeSaveFolder,
    getSaveFolders,
    renameProfile,
    deleteProfile,
    selectProfile,
    validateName,
    getNewName,
  }
}
