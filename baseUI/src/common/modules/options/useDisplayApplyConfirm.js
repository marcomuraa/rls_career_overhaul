import { addPopup } from "@/services/popup"
import { ACCENTS } from "@/common/components/base"
import { $translate } from "@/services/translation"
import DisplayRevertCountdown from "./components/DisplayRevertCountdown.vue"

const DISPLAY_KEYS = ["GraphicDisplayModes", "GraphicDisplayResolutions", "GraphicDisplayRefreshRates", "GraphicDisplayDriver"]
const COUNTDOWN_SECONDS = 15

/**
 * Adds a "Keep these display settings?" countdown dialog after the user applies new display settings.
 * If the countdown expires (or the user declines), the last confirmed settings are restored and re-applied.
 *
 * @param {ReturnType<typeof useOptions>} options same as return value of `useOptions()`
 * @param {(code, value?) => void} runLua executes an engine Lua snippet (same as `runLua` in `./useOptionsView`)
 */
export function useDisplayApplyConfirm(options, runLua) {
  // the values to revert to
  let baseline = null
  // engine takes time applying the settings, so we need to debounce
  let pending = false

  function readDisplayValues() {
    const values = options.settings.values || {}
    const res = {}
    for (const key of DISPLAY_KEYS) {
      if (key in values) res[key] = values[key]
    }
    return res
  }

  function captureBaseline() {
    baseline = readDisplayValues()
  }

  function isSameAsBaseline(current) {
    if (!baseline) return false
    return DISPLAY_KEYS.every(key => String(baseline[key]) === String(current[key]))
  }

  function restore(values) {
    // persist to settings so the dropdowns reflect the reverted values
    for (const key of DISPLAY_KEYS) {
      if (key in values) options.applySetting(key, values[key])
    }
    // re-apply immediately
    runLua("core_settings_graphic.refreshGraphicsState(%VALUE%)", values)
    runLua("core_settings_graphic.applyGraphicsState()")
  }

  async function applyWithConfirmation() {
    // commit the pending settings
    runLua("core_settings_graphic.applyGraphicsState()")

    const current = readDisplayValues()
    // no changes, or another confirmation is already pending
    if (pending || isSameAsBaseline(current)) {
      baseline = current
      return
    }

    pending = true

    let closePopup
    const onExpire = () => closePopup?.(false)

    const popup = addPopup("Confirmation", {
      title: $translate.instant("ui.options.graphics.keepDisplay.title"),
      message: {
        component: DisplayRevertCountdown,
        props: { expiration: COUNTDOWN_SECONDS, expireCallback: onExpire },
      },
      buttons: [
        { label: $translate.instant("ui.options.graphics.keepDisplay.keep"), value: true, extras: { confirm: true, default: true } },
        { label: $translate.instant("ui.options.graphics.keepDisplay.revertNow"), value: false, extras: { cancel: true, outsideCancel: true, accent: ACCENTS.text } },
      ],
      unordered: false,
    })
    closePopup = popup.return

    let keep = false
    try {
      keep = await popup.promise
    } catch {
      keep = false
    }

    if (keep) {
      baseline = readDisplayValues()
    } else if (baseline) {
      restore(baseline)
    }

    pending = false
  }

  return {
    captureBaseline,
    applyWithConfirmation,
  }
}
