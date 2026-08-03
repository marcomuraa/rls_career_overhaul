// Registry describing the three "oneshot race" modes (quickrace, lightRunner,
// busRoute) that all share the OneshotRaceWizard core. Each mode wires the
// shared UI to its own Lua configurator bridge module and grid selector backend;
// the modes differ mostly in their per-track/route settings schema and some l10n keys.

const laps = value => ({ label: String(value), value })

const LAP_OPTIONS = [{ label: "\u221e", value: 0 }, ...Array.from({ length: 15 }, (_, i) => laps(i + 1))]

const TOD_KEYS = ["night", "sunrise", "morning", "earlyNoon", "noon", "lateNoon", "afternoon", "evening", "sunset"]
const TOD_OPTIONS = TOD_KEYS.map((key, value) => ({ labelKey: `ui.quickrace.tod.${key}`, value }))

// Settings schema shared by quickrace and lightRunner: both drive the same
// per-track fields (reverse/rollingStart/lapCount/tod) off scenario_quickRaceLoader tracks.
const TRACK_SETTINGS_SCHEMA = [
  {
    key: "reverse",
    type: "switch",
    labelKey: "ui.quickrace.reverse",
    visible: middle => !!middle?.reversible,
  },
  {
    key: "rollingStart",
    type: "switch",
    labelKey: "ui.quickrace.rollingStart",
    visible: middle => !!middle?.allowRollingStart,
  },
  {
    key: "lapCount",
    type: "lapCount",
    labelKey: "ui.quickrace.laps",
    options: LAP_OPTIONS,
    visible: () => true,
  },
  {
    key: "tod",
    type: "tod",
    labelKey: "ui.quickrace.tod.time",
    options: TOD_OPTIONS,
    visible: () => true,
  },
]

const BUS_ROUTE_SETTINGS_SCHEMA = [
  {
    key: "strictStop",
    type: "switch",
    labelKey: "ui.mainMenu.bus.strictStops",
    descriptionKey: "ui.busRoute.strictMode",
    visible: () => true,
  },
  {
    key: "traffic",
    type: "switch",
    labelKey: "ui.mainMenu.bus.traffic",
    descriptionKey: "ui.busRoute.traffic",
    visible: () => true,
  },
]

export const MODES = {
  quickrace: {
    id: "quickrace",
    routeName: "quickraceWizard",
    bridgeModule: "quickrace_quickraceConfigurator",
    backendName: "quickraceSelector",
    middlePathKey: "tracks",
    selectLevelLabelKey: "ui.quickrace.selectLevel",
    selectMiddleLabelKey: "ui.quickrace.selectTrack",
    selectVehicleLabelKey: "ui.quickrace.selectVehicle",
    selectConfirmLabelKey: "ui.quickrace.select",
    playLabelKey: "ui.quickrace.play",
    settingsSchema: TRACK_SETTINGS_SCHEMA,
    showHighscores: true,
  },
  lightrunner: {
    id: "lightrunner",
    routeName: "lightrunnerWizard",
    bridgeModule: "lightrunner_lightrunnerConfigurator",
    backendName: "lightRunnerSelector",
    middlePathKey: "tracks",
    selectLevelLabelKey: "ui.quickrace.selectLevel",
    selectMiddleLabelKey: "ui.quickrace.selectTrack",
    selectVehicleLabelKey: "ui.quickrace.selectVehicle",
    selectConfirmLabelKey: "ui.quickrace.select",
    playLabelKey: "ui.quickrace.play",
    settingsSchema: TRACK_SETTINGS_SCHEMA,
    showHighscores: true,
    // Only powerglow-equipped cars/trucks, see ui_vehicleSelector_general.setVehicleRestrictionMode.
    vehicleRestrictionMode: "lightRunner",
  },
  busroute: {
    id: "busroute",
    routeName: "busRouteWizard",
    bridgeModule: "busroute_busrouteConfigurator",
    backendName: "busRouteSelector",
    middlePathKey: "routes",
    selectLevelLabelKey: "ui.busRoute.levelSelect",
    selectMiddleLabelKey: "ui.busRoute.routeSelect",
    selectVehicleLabelKey: "ui.quickrace.selectVehicle",
    selectConfirmLabelKey: "ui.quickrace.select",
    playLabelKey: "ui.quickrace.play",
    settingsSchema: BUS_ROUTE_SETTINGS_SCHEMA,
    showHighscores: true,
    // Only transit buses, see ui_vehicleSelector_general.setVehicleRestrictionMode.
    vehicleRestrictionMode: "busRoute",
  },
}

export function getModeConfig(modeId) {
  const mode = MODES[modeId]
  if (!mode) throw new Error(`Unknown oneshot race mode: ${modeId}`)
  return mode
}
