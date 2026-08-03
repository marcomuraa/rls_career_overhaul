import { defineStore } from "pinia"
import { lua } from "@/bridge"
import { $translate } from "@/services"
import { showToast } from "@/services/toast"

export const PROFILE_NAME_MAX_LENGTH = 100
export const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9_]+$/
export const INVALID_JSON_VALUE_CHARS = /[\u0000-\u001F"\\]/

export const useProfilesStore = defineStore("profiles", () => {
  async function loadProfile(profileName, startMode, isAdd = false) {
    console.log("profileStore.loadProfile", profileName, startMode, isAdd)
    if (!profileName) {
      console.warn("profileStore.loadProfile: profileName is required. Not loading profile.")
      return false
    }

    if (profileName.length > PROFILE_NAME_MAX_LENGTH && isAdd) {
      console.warn("profileStore.loadProfile: profileName is too long. Not loading profile.")
      return false
    }

    console.log("profileStore.loadProfile: creating or loading career and starting", profileName)
    if (/^ +| +$/.test(profileName)) profileName = profileName.replace(/^ +| +$/g, "")
    const createOrLoadCareerAndStartResult = await lua.career_career.createOrLoadCareerAndStart(profileName, null, { startMode })
    console.log("profileStore.loadProfile: createOrLoadCareerAndStartResult", createOrLoadCareerAndStartResult)

    // TODO: The event should be done on lua side and add a listener here to broadcast this event
    const toastrMessage = isAdd ? "added" : "loaded"
    showToast({
      type: "info",
      message: $translate.contextTranslate(`ui.career.notification.${toastrMessage}`),
      timeout: 5,
    })
  }

  return { loadProfile }
})
