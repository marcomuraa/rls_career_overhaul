export default function (deps) {
  const { $translate, bridge, customValues } = deps || {}

  const uiUnits = bridge.units

  const normalizeOpenXRInputSources = inputSources => {
    if (Array.isArray(inputSources)) return inputSources
    if (inputSources && typeof inputSources === "object") return Object.values(inputSources)
    return []
  }
  const normalizeOpenXRState = data => {
    const state = data && typeof data === "object" ? { ...data } : {}
    state.inputSources = normalizeOpenXRInputSources(state.inputSources)
    return state
  }
  const getOpenXRLabelContext = () => {
    const state = customValues.openXRstate || {}
    const fps = Math.round(state.targetRefreshRate || 0)
    return {
      ...state,
      openXRrenderedWidth: state.renderedWidth ?? "?",
      openXRrenderedHeight: state.renderedHeight ?? "?",
      openXRrefresh: !isNaN(fps) && isFinite(fps) && fps > 0 ? fps : "?",
    }
  }

  const fpsLimitStateOptions = [
    { value: "disabled", label: "No limit" },
    { value: 30, label: "30 FPS" },
    { value: 60, label: "60 FPS" },
    { value: 90, label: "90 FPS" },
    { value: 120, label: "120 FPS" },
    { value: 144, label: "144 FPS" },
    { value: 240, label: "240 FPS" },
    { value: "custom", label: "Custom" },
  ]

  const fpsLimitBackgroundStateOptions = [
    { value: "disabled", label: "Same as foreground limit" },
    { value: 30, label: "30 FPS" },
    { value: 60, label: "60 FPS" },
    { value: 90, label: "90 FPS" },
    { value: 120, label: "120 FPS" },
    { value: 144, label: "144 FPS" },
    { value: 240, label: "240 FPS" },
    { value: "custom", label: "Custom" },
  ]

  Object.assign(customValues, {
    externalUIURL: "",
    openXRstate: {},
    cameraConfigList: [],
    cameraConfigFocused: "",
    debug: {
      boundingboxes: false,
      disableShadows: false,
      wireframe: false,
      visualization: "",
      visualization_prev: "",
      materialsVisualization: "",
      materialsVisualization_prev: "",
    },
    fpsLimitCustom: false,
    fpsLimitBackgroundCustom: false,
  })

  function initCustom(events) {
    events.on("externalUIURL", data => customValues.externalUIURL = data || "")
    events.on("OpenXRStateChanged", data => customValues.openXRstate = normalizeOpenXRState(data))
    events.on("CameraConfigChanged", data => {
      customValues.cameraConfigList = Array.isArray(data.cameraConfig) ? data.cameraConfig : []
      customValues.cameraConfigFocused = data.focusedCamName
    })
  }

  function updateCustomByApi(api) {
    return api.engineLua(`
      if ui_extApp then ui_extApp.requestUIData() end        -- externalUIURL
      if render_openxr then render_openxr.updateUI(true) end -- openXRstate
      if core_camera then core_camera.requestConfig() end    -- cameraConfig
    `)
  }

  // context:
  //   "initial" - initial values
  //   "update" - update settings list
  //   "local" - local apply (before updated settings are received)
  function updateCustomByValues(values, context) {
    if (context !== "update") {
      customValues.fpsLimitCustom = !!(values.fpsLimitEnabled && !fpsLimitStateOptions.some(opt => opt.value === values.fpsLimit))
      customValues.fpsLimitBackgroundCustom = !!(values.fpsLimitBackgroundEnabled && !fpsLimitBackgroundStateOptions.some(opt => opt.value === values.fpsLimitBackground))
    }
  }


  // those extensions are used to add additional values to the settings
  const valueExtensions = {
    externalUIURL() {
      return customValues.externalUIURL
    },
    openXRenabled() {
      return !!customValues.openXRstate?.enabled
    },
    openXRenabledLabel() {
      return customValues.openXRstate?.enabled ? "ui.options.graphics.openXRdevice.active" : "ui.options.graphics.openXRdevice.inactive"
    },
    openXRtoggleLabel() {
      return customValues.openXRstate?.enabled ? "ui.options.graphics.openXRtoggleOff" : "ui.options.graphics.openXRtoggleOn"
    },
    openXRheadsetActive() {
      return !!customValues.openXRstate?.headsetActive
    },
    openXRheadsetActiveLabel() {
      return customValues.openXRstate?.headsetActive ? "ui.options.graphics.openXRdevice.active" : "ui.options.graphics.openXRdevice.inactive"
    },
    openXRrenderedWidth(values) {
      if (!customValues.openXRstate?.recommendedWidth || !values.openXRresolutionScale) return "?"
      return ~~(customValues.openXRstate.recommendedWidth * values.openXRresolutionScale)
    },
    openXRrenderedHeight(values) {
      if (!customValues.openXRstate?.recommendedHeight || !values.openXRresolutionScale) return "?"
      return ~~(customValues.openXRstate.recommendedHeight * values.openXRresolutionScale)
    },
    openXRrefreshRate() {
      if (!customValues.openXRstate?.targetRefreshRate) return "?"
      return customValues.openXRstate.targetRefreshRate
    },
    openXRfullhdEquivalent(values) {
      // doing this in case when extensions were evaluated out of order (which happens to objects)
      const ext = {
        openXRrenderedWidth: values.openXRrenderedWidth || valueExtensions.openXRrenderedWidth(values),
        openXRrenderedHeight: values.openXRrenderedHeight || valueExtensions.openXRrenderedHeight(values),
        openXRrefreshRate: values.openXRrefreshRate || valueExtensions.openXRrefreshRate(values),
      }
      if (ext.openXRrenderedWidth === "?" || ext.openXRrenderedHeight === "?" || ext.openXRrefreshRate === "?") return "?"
      return ~~((2 * ext.openXRrenderedWidth * ext.openXRrenderedHeight * ext.openXRrefreshRate) / (1920 * 1080 * 60))
    },
    openXRresolutionScaleChanged(values) {
      const openXRrenderedWidth = values.openXRrenderedWidth || valueExtensions.openXRrenderedWidth(values)
      return openXRrenderedWidth !== customValues.openXRstate.renderedWidth
    },
    openXRsourceCountLabel() {
      return `${customValues.openXRstate?.sourceCount || 0} total`
    },
    openXRactiveSourceCountLabel() {
      return `${customValues.openXRstate?.activeSourceCount || 0} active`
    },
    openXRposeValidSourceCountLabel() {
      return `${customValues.openXRstate?.poseValidSourceCount || 0} pose-valid`
    },
    openXRprofileSummaryLabel() {
      const profiles = [...new Set((customValues.openXRstate?.inputSources || []).map(source => source?.interactionProfile).filter(Boolean))]
      return profiles.length ? profiles.join(", ") : "none"
    },
    openXRsystemName() {
      return customValues.openXRstate?.systemName || "?"
    },
    openXRresolutionTarget() {
      return customValues.openXRstate?.resolutionTarget
    },
    openXRresolutionTargetLabel() {
      const enabled = !!customValues.openXRstate?.enabled
      return $translate.instant(`ui.options.graphics.${enabled ? "openXRresolutionTarget" : "openXRresolutionTargetUnknown"}`, getOpenXRLabelContext())
    },
    openXRresolutionEquivalentLabel() {
      const enabled = !!customValues.openXRstate?.enabled
      return $translate.instant(`ui.options.graphics.${enabled ? "openXRresolutionEquivalent" : "openXRresolutionEquivalentUnknown"}`, getOpenXRLabelContext())
    },
    debug_boundingboxes() {
      return customValues.debug.boundingboxes
    },
    debug_disableShadows() {
      return customValues.debug.disableShadows
    },
    debug_wireframe() {
      return customValues.debug.wireframe
    },
    debug_visualization() {
      return customValues.debug.visualization
    },
    debug_materialsVisualization() {
      return customValues.debug.materialsVisualization
    },
    cameraConfigList() {
      return customValues.cameraConfigList
    },
    cameraConfigFocused() {
      return customValues.cameraConfigFocused
    },
    cameraFanVsTVLabel(values) {
      const val = values.cameraFanVsTV
      if (val === 0.0)                return "ui.options.camera.alwaysFan"
      if (val >   0.0 && val <   0.2) return "ui.options.camera.mostlyFan"
      if (val >=  0.2 && val <   0.5) return "ui.options.camera.frequentlyFan"
      if (val === 0.5)                return "ui.options.camera.evenlySplit"
      if (val >   0.5 && val <=  0.8) return "ui.options.camera.frequentlyTV"
      if (val >   0.8 && val <   1.0) return "ui.options.camera.mostlyTV"
      if (val === 1.0)                return "ui.options.camera.alwaysTV"
    },
    steeringStabilizationGraph(values) {
      // strength
      const [minX, minY, maxX, maxY] = [0, 0, 100, 1]
      return [
        [0, 0, minX, minY],
        [values.steeringStabilizationEndSpeed, values.steeringStabilizationMultiplier],
        [100, values.steeringStabilizationMultiplier, maxX, maxY],
      ]
    },
    steeringStabilizationEndSpeedComputed(values) {
      // temp fix for BngSlider issue, see components.js for details
      return Math.round(uiUnits.speed(values.steeringStabilizationEndSpeed).val)
    },
    steeringLimitGraph(values) {
      // max angle
      const [minX, minY, maxX, maxY] = [0, 0, 100, 1]
      return [
        [0, 1, minX, minY],
        [values.steeringLimitStartSpeed, 1],
        [values.steeringLimitEndSpeed, values.steeringLimitMultiplier],
        [100, values.steeringLimitMultiplier, maxX, maxY],
      ]
    },
    steeringLimitStartSpeedComputed(values) {
      return Math.round(uiUnits.speed(values.steeringLimitStartSpeed).val)
    },
    steeringLimitEndSpeedComputed(values) {
      return Math.round(uiUnits.speed(values.steeringLimitEndSpeed).val)
    },
    steeringSlowdownGraph(values) {
      // steer speed
      const [minX, minY, maxX, maxY] = [0, 0, 100, 1]
      return [
        [0, 1, minX, minY],
        [values.steeringSlowdownStartSpeed, 1],
        [values.steeringSlowdownEndSpeed, values.steeringSlowdownMultiplier],
        [100, values.steeringSlowdownMultiplier, maxX, maxY],
      ]
    },
    steeringSlowdownStartSpeedComputed(values) {
      return Math.round(uiUnits.speed(values.steeringSlowdownStartSpeed).val)
    },
    steeringSlowdownEndSpeedComputed(values) {
      return Math.round(uiUnits.speed(values.steeringSlowdownEndSpeed).val)
    },
    fpsLimitState(values) {
      if (!values.fpsLimitEnabled) return "disabled"
      if (customValues.fpsLimitCustom) return "custom"
      const match = fpsLimitStateOptions.find(o => o.value === values.fpsLimit)
      if (match) return values.fpsLimit
      return "custom"
    },
    fpsLimitBackgroundState(values) {
      if (!values.fpsLimitBackgroundEnabled) return "disabled"
      if (customValues.fpsLimitBackgroundCustom) return "custom"
      const match = fpsLimitBackgroundStateOptions.find(o => o.value === values.fpsLimitBackground)
      if (match) return values.fpsLimitBackground
      return "custom"
    },
    uiLayoutContentWidthMatch(values) {
      return values.uiLayoutContentWidth === 0
    },
    uiLayoutSafeZone(values) {
      return 0.5 - Number(values.uiLayoutSafeArea || 0.98) / 2
    },
  }


  // those extensions are used to add additional options to the settings
  const optionExtensions = {
    userLanguagesOfficial(options) {
      return (options.userLanguagesAvailable || [])
        .filter(lang => lang.isOfficial && lang.key)
        .sort()
        .map(lang => ({ label: lang.name, value: lang.key }))
    },
    userLanguagesUnofficial(options) {
      return (options.userLanguagesAvailable || [])
        .filter(lang => !lang.isOfficial)
        .sort()
        .map(lang => ({ label: lang.name, value: lang.key }))
    },
    fpsLimitState() {
      return fpsLimitStateOptions
    },
    fpsLimitBackgroundState() {
      return fpsLimitBackgroundStateOptions
    },
  }

  return { initCustom, updateCustomByApi, updateCustomByValues, valueExtensions, optionExtensions }
}
