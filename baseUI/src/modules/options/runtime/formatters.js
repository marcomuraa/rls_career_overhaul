export default function (deps) {
  const { bridge, optionExtensions, customValues } = deps || {}

  const uiUnits = bridge.units

  const guessOptionFormat = option => {
    // try to guess if it's a dropdown options and format it as such
    if (typeof option.modes === "object" && Array.isArray(option.modes.values) && Array.isArray(option.modes.keys)) {
      return option.modes.values.map((key, i) => ({ label: key, value: option.modes.keys[i] }))
    }
  }


  // those formatters prepare the data for our UI components
  const optionFormatters = {
    userLanguagesAvailable(option, options, values) {
      const official = optionExtensions.userLanguagesOfficial(options, true)
      const auto = option.find(lang => lang.isOfficial && !lang.key)
      official.unshift({ label: auto.name, value: auto.key }) // add auto language
      const unofficial = values.communityTranslations === "enable" ? optionExtensions.userLanguagesUnofficial(options) : []
      if (unofficial.length === 0) {
        return official
      } else {
        return [
          { label: "ui.options.officialTranslations", value: Symbol("group"), group: true },
          ...official.map(lang => ({ ...lang, grouped: true })),
          { label: "ui.options.communityTranslations", value: Symbol("group"), group: true },
          ...unofficial.map(lang => ({ ...lang, grouped: true })),
        ]
      }
    },
    GraphicAnisotropic(option) {
      // keys here are strings for some reason while value is number, so we convert keys to numbers to make dropdown happy
      return option.modes.values.map((key, i) => ({ label: key, value: +option.modes.keys[i] }))
    },
  }


  // those formatters are used to format the value of a setting for UI
  const valueFormatters = {
    // cameraConfig(value, values, custom) {
    //   if (typeof value === "string") {
    //     try {
    //       value = JSON.parse(value)
    //       if (value.version === 1) {
    //         value = value.data
    //       } else {
    //         logger.warn("Unknown camera config version:", value.version)
    //       }
    //     } catch (err) {
    //       logger.warn("Failed to parse camera config:", err)
    //       value = []
    //     }
    //   }
    //   return value
    // },
  }


  // those formatters are used to format the value of a setting that will be passed to apply()
  const applyValueFormatters = {
    uiUnits(value) {
      const res = { uiUnits: value }
      // reset to defaults
      switch (value) {
        case "imperial":
          res.uiUnitLength = "imperial"
          res.uiUnitTemperature = "f"
          res.uiUnitWeight = "lb"
          res.uiUnitVolume = "gal"
          res.uiUnitPower = "bhp"
          res.uiUnitTorque = "imperial"
          res.uiUnitEnergy = "imperial"
          res.uiUnitPressure = "psi"
          res.uiUnitDate = "us"
          break
        case "metric":
          res.uiUnitLength = "metric"
          res.uiUnitTemperature = "c"
          res.uiUnitWeight = "kg"
          res.uiUnitVolume = "l"
          res.uiUnitPower = "hp"
          res.uiUnitTorque = "metric"
          res.uiUnitEnergy = "metric"
          res.uiUnitPressure = "bar"
          res.uiUnitDate = "ger"
          break
        case "british":
          res.uiUnitLength = "imperial"
          res.uiUnitTemperature = "c"
          res.uiUnitWeight = "kg"
          res.uiUnitVolume = "l"
          res.uiUnitPower = "bhp"
          res.uiUnitTorque = "imperial"
          res.uiUnitEnergy = "imperial"
          res.uiUnitPressure = "inHg"
          res.uiUnitDate = "uk"
          break
      }
      return res
    },

    // temp fix for BngSlider issue, see components.js for details
    steeringStabilizationEndSpeedComputed(value) {
      const mult = uiUnits.speed(1).val
      return { steeringStabilizationEndSpeed: value / mult }
    },
    steeringLimitStartSpeedComputed(value) {
      const mult = uiUnits.speed(1).val
      return { steeringLimitStartSpeed: value / mult }
    },
    steeringLimitEndSpeedComputed(value) {
      const mult = uiUnits.speed(1).val
      return { steeringLimitEndSpeed: value / mult }
    },
    steeringSlowdownStartSpeedComputed(value) {
      const mult = uiUnits.speed(1).val
      return { steeringSlowdownStartSpeed: value / mult }
    },
    steeringSlowdownEndSpeedComputed(value) {
      const mult = uiUnits.speed(1).val
      return { steeringSlowdownEndSpeed: value / mult }
    },

    fpsLimitState(value) {
      customValues.fpsLimitCustom = value === "custom"
      const res = { fpsLimitEnabled: value !== "disabled" }
      if (res.fpsLimitEnabled && value !== "custom") {
        res.fpsLimit = value
      }
      return res
    },
    fpsLimitBackgroundState(value) {
      customValues.fpsLimitBackgroundCustom = value === "custom"
      const res = { fpsLimitBackgroundEnabled: value !== "disabled" }
      if (res.fpsLimitBackgroundEnabled && value !== "custom") {
        res.fpsLimitBackground = value
      }
      return res
    },

    uiLayoutContentWidthMatch(value) {
      return { uiLayoutContentWidth: value ? 0 : 1920 }
    },
    uiLayoutSafeZone(value) {
      return { uiLayoutSafeArea: 1 - value * 2 }
    },
  }

  return { guessOptionFormat, optionFormatters, valueFormatters, applyValueFormatters }
}
