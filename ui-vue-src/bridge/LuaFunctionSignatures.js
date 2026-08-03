import { Any, Integer, Optional } from "./libs/luaTypes.js"

// Define Lua function signatures, and normal functions here
//
// Signatures are transformed to proper 'run' calls at runtime, other functions are left untouched -
// this allows for the addition of more complex functions should they be needed
//
// If an arrow function is used, it is expected to return a signature:
//    undefined/falsey - all parameter types will be as passed in arguments
//    String/Number/etc. - all params will be converted to correct type
//    [String, Number, ...] - params will convert according that specified for each one
//    Optional(String) - marks a trailing argument as optional
//
// If a normal function is used, it will not be transformed.
//
// The run & runRaw functions both return Promises, so that you may utilise any return value from the Lua call,
// this is much the same to passing a callback to engineLua in the Angular code
//
// If you want an alternative function to be used if the bngAPI is unavailable, you can build such using 'withMocked'.
// Simply pass your normal function/signature as the first parameter, and the mock function as the second one. The
// mock function will always be treated as a mock function - regardless of whether it is an arrow function. It should
// accept the same paramaeters as the non-mock version. If a mock function does not return a promise, its return value
// will automatically be wrapped in one
//

export default {
  getVehicleColor: () => {},
  getVehicleColorPalette: index => Integer,
  resetGameplay: playerID => Integer,
  quit: () => {},
  checkFSErrors: () => {},
  returnToMainMenu: () => {},
  getClipboard: () => {},

  ui_uiStateManager: {
    uiReady: uiType => String,
  },

  simTimeAuthority: {
    togglePause: () => {},
    getPause: () => {},
    pause: (state) => Boolean,
    pushPauseRequest: (id) => String,
    popPauseRequest: (id) => String,
    requestValue: () => {},
    get: () => {},
    set: value => Number,
  },

  screenshot: {
    getPhotomodeRollEntriesJson: limit => Number,
    getScreenshotJobsSnapshotJson: () => {},
    openScreenshotsFolderInExplorer: () => {},
    openScreenshotFileInExplorer: filePath => String,
  },

  commands: {
    toggleCamera: () => {},
  },

  multiplayer_multiplayer: {

  },

  multiplayer_uiBackend_sessionListProvider: {
    requestLocalSessionsDataForUI: () => {},
  },

  multiplayer_sessionManager: {
    getSessionPlayersForUI: () => {},
    getSessionInviteInfoForUI: () => {},
    openInviteDialogForCurrentSession: () => {},
    setSettingsDataFromUI: (sessionSettings, extraOptions) => [Object, Object],
    getSettingsDataForUI: () => {},
    createSessionFromUI: (useCurrentLevel, sessionSettings, extraOptions) => [Boolean, Object, Object],
    leaveCurrentSession: () => {},
    cancelJoiningSession: () => {},
    joinSessionThruLAN: sessionId => String,
    joinSessionThruSessionsServer: sessionId => String,
    requestSessionInfoForUI: sessionId => String,
    findSessionByConnectionForUI: (connection) => [String],
    getSessionHistory: (shouldSort) => [Object],
    getCurrentSession: () => {},
    downloadMissingMods: () => {},
  },

  multiplayer_uiBackend_multiplayerUIManager: {
    requestMultiplayerTabData: () => {},
    applyPauseSessionExtraOptions: extraOptions => Object,
    startGamemode: (gamemodeName, settings) => [String, Object],
    stopGamemode: () => {},
    startReadyUp: (gamemodeInfo) => Object,
    stopReadyUp: () => {},
    respondToReadyUp: (role) => String,
    requestSetOwnGamemodeRole: (role) => String,
    selectGamemodeForOwner: (name) => String,
    deselectGamemodeForOwner: () => {},
    setOwnerPreReadyRole: (role) => String,
  },

  multiplayer_uiBackend_playerListProvider: {
    requestMultiplayerPlayerListData: () => {},
    executePlayerAction: (buttonId, payload) => [Integer, Any],
  },

  ui_pause_providers_nearbyActivities: {
    executeNearbyActivityAction: (buttonId, payload) => [Integer, Any],
  },
  ui_pause_providers_routeData_environment: {
    requestEnvironmentTrafficPayload: payload => Any,
  },
  ui_pause_providers_trafficControls: {
    executeTrafficControlAction: (buttonId, payload) => [Integer, Any],
  },
  ui_pause_providers_vehicleTabInteractions: {
    executeVehicleTabInteractionAction: (buttonId, payload) => [Integer, Any],
    requestSpawnedVehiclesPayload: payload => Any,
    requestSpawnedSelectedVehiclePayload: payload => Any,
    setAsyncHydrationDebugDelay: delaySec => Number,
    getAsyncHydrationDebugDelay: () => Number,
    onVehicleHoverStart: (vehicleId) => Any,
    onVehicleHoverEnd: (vehicleId) => Any,
  },

  multiplayer_uiBackend_notificationManager: {
    acceptInvite: lobbyId => Integer,
    ignoreInvite: lobbyId => Integer,
  },

  multiplayer_gamemodes_tag_tag: {
    onRoundStart: () => {},
  },

  multiplayer_gamemodes_utils_spectator: {
    getSpectatorViewData: () => {},
    cyclePlayer: direction => Integer,
    setCameraMode: modeName => String,
  },

  ui_audio: {
    playEventSound: (soundClass, eventName, instanceId) => [String, String, Optional(Any)],
    startHoldActivateSound: instanceId => Optional(Any),
    completeHoldActivateSound: instanceId => Optional(Any),
    cancelHoldActivateSound: instanceId => Optional(Any),
  },

  career_career: {
    closeAllMenus: () => {},
    isActive: () => {},
    sendAllCareerProfilesData: () => {},
    sendCurrentProfileData: () => {},
    createOrLoadCareerAndStart: (id, specificAutosave, startingOptions) => [String, Any, Object],
    getStartingModeOptions: () => {},
    getSaveFoldersForProfile: id => String,

    // --- RLS Career Overhaul additions ---
    sendAllCareerSaveSlotsData: () => {},
    sendCurrentSaveSlotData: () => {},
  },

  career_saveSystem: {
    saveCurrent: (vehiclesThumbnailUpdate, playSuccessSound, saveName) => [Any, Any, Optional(String)],
    removeProfile: id => String,
    removeSaveFolder: (profile, saveFolderName) => [String, String],
    renameProfile: (name, newName) => [String, String],

    // --- RLS Career Overhaul additions ---
    removeSaveSlot: id => String,
    renameSaveSlot: (name, newName) => [String, String],
    duplicateSaveSlot: (sourceName, newName) => [String, String],
  },

  career_modules_uiUtils: {
    getCareerStatusData: () => {},
    getCareerSimpleStats: () => {},
    getCareerPauseContextButtons: () => {},
    callCareerPauseContextButtons: id => Number,
    getCareerCurrentLevelName: () => {},
  },

  career_modules_fuel: {
    requestRefuelingTransactionData: () => {},
    sendUpdateDataToUI: () => {},
    uiButtonStartFueling: energyType => String,
    uiButtonStopFueling: energyType => String,
    onChangeFlowRate: flowRate => Number,
    payPrice: () => {},
    uiCancelTransaction: () => {},
  },

  career_modules_logbook: {
    getLogbook: () => {},
    setLogbookEntryRead: (id, state) => [String, Boolean],
  },

  career_modules_milestones_milestones: {
    getMilestones: () => {},
    claim: id => Number,
    claimAllUnclaimed: () => {},
    unclaimedMilestonesCount: () => {},
  },

  career_modules_branches_landing: {
    openBigMapWithMissionSelected: id => String,
    getBranchSkillCardData: id => String,
    getBranchPageData: id => String,
    getLandingPageData: domain => String,
    getSuggestedMissionsForDomain: domain => String,
    getCargoProgressForUI: () => {},
  },

  career_modules_partShopping: {
    cancelShopping: () => {},
    applyShopping: () => {},
    installPartByPartShopId: id => Number,
    removePartBySlot: slot => String,
    sendShoppingDataToUI: () => {},
  },

  career_modules_vehicleShopping: {
    showVehicle: id => Number,
    navigateToPos: pos => Object,
    openShop: (seller, computerId) => [Any, Any], // i think this needs to be Any instead of String to also allow nil
    cancelShopping: () => {},
    quickTravelToVehicle: id => Number,
    openPurchaseMenu: (purchaseType, shopId) => [String, Number],
    updateInsuranceSelection: insuranceId => Number,
    openInventoryMenuForTradeIn: () => {},
    buyFromPurchaseMenu: (purchaseType, options) => [String, Any],
    cancelPurchase: purchaseType => String,
    sendShoppingDataToUI: () => {},
    sendPurchaseDataToUi: () => {},
    removeTradeInVehicle: () => {},
    onShoppingMenuClosed: () => {},
    selectSeller: sellerId => String,

    // --- RLS Career Overhaul additions ---
    getShoppingData: () => {},
    updateVehicleList: fromScratch => Boolean,
    navigateToDealership: dealershipId => String,
    taxiToDealership: dealershipId => String,
    getTaxiPriceToDealership: dealershipId => String,
    setShoppingUiOpen: open => Boolean,
  },

  career_modules_marketplace: {
    getListings: () => {},
    menuOpened: open => Boolean,
    acceptOffer: (inventoryId, offerIndex) => [Number, Number],
    declineOffer: (inventoryId, offerIndex) => [Number, Number],
    listVehicles: (inventoryIds) => [Array],
    openMenu: () => {},
    removeVehicleListing: inventoryId => Number,
    startNegotiateBuyingOffer: (inventoryId, offerIndex) => [Number, Number],
    startNegotiateSellingOffer: (shopId) => [Number],
    getNegotiationState: () => {},
    makeNegotiationOffer: price => Number,
    takeTheirOffer: () => {},
    cancelNegotiation: () => {},
  },

  career_modules_testDrive: {
    stop: () => {},
  },

  career_modules_inspectVehicle: {
    startTestDrive: () => {},
    onInspectScreenChanged: enabled => Boolean,
    onPurchaseMenuClosed: () => {},
    repairVehicle: () => {},
  },

  career_modules_loanerVehicles: {
    markForSpawning: loanInfo => Object,
    spawnAndLoanVehicle: (vehicleInfo, loanInfo) => [Object, Object],
    getLoanedVehiclesByOrg: orgId => String,
    returnVehicle: inventoryId => Number,
  },

  career_modules_inventory: {
    sellVehicle: id => Number,
    sellVehicleFromInventory: id => Number,
    returnLoanedVehicleFromInventory: id => Number,
    expediteRepairFromInventory: (inventoryId, price) => [Number, Number],
    enterVehicle: id => Number,
    openMenuFromComputer: computerId => String,
    closeMenu: () => {},
    chooseVehicleFromMenu: (vehId, buttonId, repairPrevVeh) => [Number, Number, Boolean],
    setFavoriteVehicle: id => Number,
    sendDataToUi: () => {},
    removeVehicleObject: id => Number,
    getVehicle: id => Number,
    getVehicleUiData: id => Number,
    isEmpty: () => {},
    setLicensePlateText: (inventoryId, text) => [Number, String],
    purchaseLicensePlateText: (inventoryId, text, money) => [Number, String, Number],
    isLicensePlateValid: text => String,
    isVehicleNameValid: text => String,
    renameVehicle: (inventoryId, name) => [Number, String],
    openInventoryMenuForChoosingListing: () => {},

    // --- RLS Career Overhaul additions ---
    instantSellVehicle: id => Number,
    getVehicles: () => {},
    getVehiclesForSale: () => {},
    removeVehicleFromSale: id => Number,
    removeVehicle: id => Number,
    deliverVehicle: (id, money) => [Number, Number],
    storeVehicle: id => Number,
    storeVehicleAtClosestGarage: id => Number,
    isVehicleListedForAuction: id => Number,
    getListedVehicleId: () => {},
    setVehicleListedForAuction: (inventoryId, listed) => [Number, Boolean],
    clearVehicleAuctionListing: id => Number,
  },

  career_modules_vehiclePerformance: {
    startDragTest: id => Number,
    cancelTest: () => {},
  },

  career_modules_partInventory: {
    openMenu: computerId => Any,
    closeMenu: () => {},
    sellParts: ids => Array,
    partInventoryClosed: () => {},

    // --- RLS Career Overhaul additions ---
    sendUIData: () => {},
  },

  career_modules_insurance_insurance: {
    getProposablePoliciesForVehInv: invVehId => Number,
    payInsuranceScoreReset: policyId => Number,
    purchaseInsurance: id => Number,
    calculateRenewalPriceDetails: (policyId, tempPerks) => [Number, Any],
    changeInvVehInsuranceCoverageOptions: (policyId, changedPerks) => [Number, Object],
    changeInvVehInsurance: (invVehId, newInsuranceId) => [Number, Number],
    startRepairInGarage: (vehicleInfo, repairOptionData) => [Object, Object],
    openRepairMenu: (vehicleInfo, originComputerId) => [Object, Any],
    closeMenu: () => {},
    sendUIData: () => {},
    inventoryVehNeedsRepair: inventoryId => Number,
    getInvVehHaveFuelDiscount: invVehId => Object,
    openChooseInsuranceScreen: () => {},
    calculateInsurancePremium: (insuranceId, potentialCoverageOptions, potentialVehiclesCoverageOptions) => [Number, Object, Object],
    saveNewInsuranceCoverageOptions: (insuranceId, newCoverageOptions) => [Number, Object],
    calculateVehiclePremium: (vehicleId, nonInvVehInfo, potentialCoverageOptions) => [Number, Object, Object],
    saveNewVehicleCoverageOptions: (vehicleId, newCoverageOptions) => [Number, Object],
    sendChooseInsuranceDataToTheUI: (purchaseType, shopId, defaultInsuranceId) => [String, Number, Number],
    sendChangeInsuranceDataToTheUI: (vehicleId) => [Number],
    resetDriverScore: () => {},

    // --- RLS Career Overhaul additions ---
    getTestDriveClaimPrice: () => {},
    getTestDriveDamagePlayerShare: () => {},
  },

  career_modules_insurance_repairScreen: {
    getRepairData: () => {},
    closeMenu: () => {},
    startRepairInGarage: (invVehId, repairOptionData) => [Number, Object],
    openRepairMenu: (vehicleInfo, originComputerId) => [Object, Any],
  },

  career_modules_playerAbstract: {
    getPlayerAbstractData: () => {},
    closePlayerAbstractMenu: () => {},
  },

  career_modules_tuning: {
    apply: tuningValues => Object,
    start: (vehId, origin) => [Any, Any],
    getTuningData: () => {},
    close: () => {},
    applyShopping: () => {},
    cancelShopping: () => {},
    removeVarFromShoppingCart: varName => String,
  },

  career_modules_painting: {
    apply: () => {},
    start: (vehId, origin) => [Any, Any],
    getPaintData: () => {},
    close: () => {},
    setPaints: paint => Object,
    getFactoryPaint: () => {},
    onUIOpened: () => {},
    sendPaintingDataToUI: () => {},
    cleanup: () => {},
  },

  career_modules_questManager: {
    setQuestAsNotNew: id => String,
    claimRewardsById: id => String,
  },

  career_modules_computer: {
    onMenuClosed: () => {},
    getComputerUIData: () => {},
    computerButtonCallback: (buttonId, inventoryId) => [String, Any],
    openComputerMenuById: computerId => String,
    closeAllMenus: () => {},
  },

  career_modules_delivery_general: {
    setAutomaticRoute: enabled => Boolean,
    setDetailedDropOff: enabled => Boolean,
    setSetting: (key, value) => [String, Any],
    getSettings: () => {},
    setDeliveryTimePaused: paused => Boolean,
  },

  career_modules_delivery_cargoScreen: {
    requestCargoDataForUi: (facilityId, parkingSpotPath, updateMaxTimeStamp) => [Any, Any, Any],
    moveCargoFromUi: (cargoId, targetLocation) => [Number, Object],
    commitDeliveryConfiguration: () => {},
    cancelDeliveryConfiguration: () => {},
    exitDeliveryMode: () => {},
    exitCargoOverviewScreen: () => {},
    showCargoRoutePreview: cargoId => Any,
    showVehicleOfferRoutePreview: offerId => Any,
    setCargoRoute: (cargoId, origin) => [Number, Boolean],
    showLocationRoutePreview: (location, asProvider) => [Any, Boolean],
    showCargoContainerHelpPopup: () => {},
    setBestRoute: () => {},
    spawnOffer: (offerId, fadeToBlack) => [Number, Any],
    abandonAcceptedOffer: vehId => Number,
    setCargoScreenTab: tab => String,
    unloadCargoPopupClosed: () => {},
    moveMaterialFromUi: () => {},
    requestDropOffData: () => {},
    confirmDropOffData: (data, facId, psPath) => [Any, Any, Any],
    dropOffPopupClosed: mode => String,
    clearTransientMoveForCargo: cargoId => Number,
    clearTransientMovesForStorage: materialType => String,
    applyTransientMoves: () => {},
    toggleOfferForSpawning: id => Number,
    tryLoadAll: cargoIds => Array,
    showRoutePreview: route => Object,
    deliveryScreenExternalButtonPressed: id => Any,
  },

  career_modules_delivery_progress: {
    activateSound: (soundLabel, active) => [String, Boolean],
  },

  career_modules_tutorialPopups: {
    introPopup: (key, force) => [String, Boolean],
    wasIntroPopupsSeen: pages => Array,
  },

  gameplay_drag_dragBridge: {
    getHistory: (id) => Object,
    screenshotTimeslip: () => {},
    openRulesScreen: facility => Object,
    getRulesScreenData: (facilityIdOrStripId) => Object,
    applyRulesSave: (levelId, stripId, rules) => [String, String, Object],
    applyRulesRestore: (levelId, stripId) => Object,
    getDragInfoData: () => {},
    getDragDialData: () => {},
    getTreeLightUIState: () => {},
    setLocalPlayerDial: (value) => [Number],
    showDialControl: () => {},
    getStripLaneInfo: () => {},
  },

  gameplay_crashTest_scenarioManager: {
    nextStepFromUI: () => {},
  },

  gameplay_discover: {
    getDiscoverPages: () => {},
    startDiscover: discoverId => String,
  },

  freeroam_organizations: {
    getUIData: () => {},
    getUIDataForOrg: orgId => String,
  },

  core_replay: {
    onInit: () => {},
    loadFile: (filename, autoplay, options) => [String, Boolean, Optional(Any)],
    getPlaybackContext: filename => String,
    logUiAction: (scope, data) => [String, Optional(Any)],
    stop: () => {},
    openReplayFolderInExplorer: () => {},
    getRecordings: () => {},
    removeRecording: filename => String,
    togglePlay: () => {},
    toggleRecording: () => {},
    startRecording: () => {},
    stopRecording: options => Optional(Any),
    cancelRecording: () => {},
    stopAndUnload: () => {},
    toggleSpeed: speed => Number,
    pause: state => Optional(Boolean),
    seek: positionPercent => Number,
    jumpTime: seconds => Number,
    acceptRename: (oldFilename, newFilename) => [String, String],
    saveMissionReplay: filename => String,
    removeMissionSavedReplay: filename => String,
    openMissionReplayFolder: filename => String,
  },


  core_gamestate: {
    requestGameState: () => {},
    getGameState: () => {},
    loading: () => {},
    loadingScreenActive: () => {},
    loadingScreenInactive: state => String,
  },

  core_environment: {
    getTimeOfDay: () => {},
    setTimeOfDay: state => Object,
    getState: () => {},
    getInitState: () => {},
    setState: (state, lerpSeconds) => [Object, Optional(Number)],
    requestState: () => {},
    getTimeOfDayOptions: levelIdentifier => Optional(String),
    getGravityPresets: () => {},
    getSimSpeedPresets: () => {},
    syncTimeToRealClock: lerpSeconds => Optional(Number),
    syncTimeToRealClockUtc: lerpSeconds => Optional(Number),
    getCloudWeatherOffsetKm: () => {},
    setCloudWeatherOffsetKm: offsetKm => Object,
    resetCloudWeatherOffsetKm: () => {},
    regenerateWeatherMap: seed => Optional(Number),
    resetTireMarks: () => {},
    saveTireMarks: filename => Optional(String),
    loadTireMarks: filename => Optional(String),
  },

  core_celestial: {
    getState: () => {},
    setNorthOffset: deg => Number,
    setMeteorRatePreset: preset => String,
    setDisplayOption: (key, value) => [String, Boolean],
  },

  core_gameContext: {
    getGameContext: () => {}, // has params in lua but they don't do anything
  },

  core_online: {
    requestState: () => {},
  },

  core_hardwareinfo: {
    requestState: () => {},
    requestInfo: () => {},
    getInfo: () => {},
    runPhysicsBenchmark: () => {},
    latestBenchmarkExists: () => {},
    latestBananbench: () => {},
    acknowledgeWarning: warning => String,
    runDiskUsage: () => {},
  },

  gameplay_statistic: {
    sendGUIState: () => {},
  },

  core_quickAccess: {
    getUiData: () => {},
    selectItem: (id, buttonDown, actionIndex) => [Number, Boolean, Number],
    contextAction: (id, buttonDown, actionIndex) => [Number, Boolean, Number],
    back: () => {},
    setEnabled: (enabled, level, force) => [Boolean, String, Boolean],
    openDynamicSlotConfigurator: index => Number,
    getDynamicSlotConfigurationData: () => {},
    setDynamicSlotConfiguration: (key, data) => [String, Object],
    toggle: () => [],
    tryAction: action => String,

  },

  ui_bindingsLegend: {
    sendDataToUI: (forceResetFade) => Boolean,
    triggerInputAction: (action, value) => [String, Number],
    toggleShowApp: () => {},
    toggleShowVehicleSpecificActions: () => {},
  },

  freeroam_bigMapMode: {
    enterBigMap: (instant) => Object,
    enterBigMapWithCustomPOIs: (poiIds, callback, options) => [Array, Any, Object],
    exitBigMap: (force) => Boolean,
    setBigmapScreenBounds: (windowBounds, mapBounds) => [Object, Object],
    navigateToMission: (poiId) => String,
    selectPoi: (poiId) => String,
    poiHovered: (poiId, active) => [String, Boolean],
    teleportToPoi: (poiId) => String,
    setOnlyIdsVisible: (poiIds) => Array,
    deselect: () => {},
    toggleBigMap: () => {},
    setUiFocus: (focus) => Boolean,
    enableBigMapControls: (enable) => Boolean,
    setUiNavigationActive: (active) => Boolean,
    bigMapActive: () => {},
    isTransitionActive: () => {},

    // --- RLS Career Overhaul additions ---
    openPopupCallback: () => {},
  },

  freeroam_bigMapPoiProvider: {
    sendMissionLocationsToMinimap: () => {},
    sendCurrentLevelMissionsToBigmap: () => {},
    toggleGroupVisibility: groupKey => String,
  },

  freeroam_freeroamConfigurator: {
    getConfiguration: () => {},
    getButtons: () => {},
    triggerButton: (buttonId) => Number,
    updateOption: (key, value) => [String, Any],
    onSpawnPointTileClick: () => {},
    onVehicleTileClick: () => {},
    getCurrentSpawnPointTile: () => {},
    getCurrentVehicleTile: () => {},
    setSpawnPoint: (levelName, spawnPointName, key) => [String, String, String],
    setVehicle: (model, config, additionalData, key) => [String, String, Object, String],
    setWizardBrowseLevel: levelName => String,
    clearWizardBrowseLevel: () => {},
    setWizardBrowseVehicle: (model, subModel, brand, config) => [String, String, String, String],
    clearWizardBrowseVehicle: () => {},
    getWizardBrowseState: () => {},
    setWizardSearchForStep: (step, searchText) => [String, String],
    getWizardSearchForStep: step => String,
    clearWizardSearchForStep: step => String,
    setWizardFiltersForStep: (step, filtersPayload) => [String, Object],
    getWizardFiltersForStep: step => String,
    clearWizardFiltersForStep: step => String,

    // --- RLS Career Overhaul additions ---
    doubleClickOverride: (item) => [Object],
  },

  gameplay_taxi: {
    startTaxiWithCurrentRoute: () => {},
    confirmTaxiDestination: () => {},
    getTaxiViewData: () => {},
    onHurryUpCalled: () => {},
    onSlowDownCalled: () => {},
    onSkipCalled: () => {},
    onChangeDestinationCalled: () => {},
    onStopTaxiCalled: () => {},
    setIdleCameraEnabled: (enabled) => Boolean,

    // --- RLS Career Overhaul additions ---
    prepareTaxiJob: () => {},
    acceptJob: () => {},
    rejectJob: () => {},
    setAvailable: () => {},
    stopTaxiJob: () => {},
    getTaxiJob: () => {},
    requestTaxiState: () => {}
  },

  freeroam_vueBigMap: {
    enterBigMap: (options) => [Object],
    exitBigMap: () => {},

    getPoiData: () => {},
    getFilters: () => {},
    getGroups: () => {},
    toggleFiltersByIds: (filterIds) => Object,
    toggleFilterSectionById: (sectionId) => Object,
    getGameStateInfo: () => {},

    selectPoiFromList: (poiId, isCollapsedMode) => [String, Boolean],
    panToPoi: (poiId) => String,
    hoverPoiFromList: (poiId, active) => [String, Boolean],
    executePoiAction: (actionId) => Number,
    setPoiListDisplayMode: (mode) => String,
    getAndClearPendingAutoSelectPoiId: () => Optional(String),

  },

  freeroam_freeroam: {
    startTrackBuilder: mapName => String,
  },

  gameplay_discover_freeroamTutorial_pauseDataProvider: {
    executePauseAction: (buttonId, payload) => [Integer, Any],
  },

  extensions: {
    isExtensionLoaded: extensionName => String,
    load: extensionName => String,
    unload: extensionName => String,
    hook: (hookName, payload) => [String, Optional(Any)],
    ui_messagesDebugger: {
      show: () => {},
      hide: () => {},
      toggle: () => {},
    },

    tech_license: {
      requestState: () => {},
      isValid: () => {},
    },

    core_input_actionFilter: {
      addAction: (filter, actionName, filtered) => [Number, String, Boolean],
      setGroup: (name, actioNames) => [String, Any],
    },

    core_input_bindings: {
      FFBSafetyDataRequest: () => {},
      resetBindings: () => {},
      resetBindingsForDevice: deviceName => String,
      setMenuActionMapEnabled: state => Boolean,
      getMenuActionMapEnabled: () => {},
      setMenuActionEnabled: (enabled, actionName) => [Boolean, String],
      notifyUI: reason => String,
      saveBindingsToDisk: deviceContents => Object,
      getRecentDevices: () => {},
    },

    core_input_tests: {
      startTests: testIds => Object,
      updateUI: () => {},
    },

    core_locales: {
      getLocale: locale => String,
      getScrambleTranslationDebugEnabled: () => {},
      setScrambleTranslationDebugEnabled: enabled => Boolean,
    },

    core_vehicle_partmgmt: {
      getConfigList: () => {},
      validatePaints: () => {},
      getCurrentLicensePlate: () => {},
      highlightParts: (parts, vehID) => [Object, Number],
      loadLocal: filename => String,
      resetPartsToLoadedConfig: () => {},
      resetVarsToLoadedConfig: () => {},
      resetAllToLoadedConfig: () => {},
      openConfigFolderInExplorer: () => {},
      removeLocal: configName => String,
      savedefault: () => {},
      getSaveAvailability: () => {},
      saveNewLocalConfig: (configurationName, settings, metadata) => [String, Object, Optional(Object)],
      saveExistingLocalConfig: (fileName, configurationName, settings, metadata) => [String, String, Object, Optional(Object)],
      sendDataToUI: () => {},
      selectPart: (part, subparts) => [String, Boolean],
      selectParts: (parts, vehID) => [Object, Number],
      selectReset: () => {},
      setConfigVars: vars => Object,
      setPartsConfig: config => Object, // deprecated
      setPartsTreeConfig: (config, respawn, part) => [Object, Boolean, Any],
      showHighlightedParts: vehID => Number,
      setDynamicTextureMaterials: () => {},
      partsSelectorChanged: parts => Object,
      sendPartsSelectorStateToUI: () => {},
    },

    core_vehicle_thumbnail: {
      captureTemporaryThumbnail: () => {},
      getTemporaryThumbnail: () => {},
      clearTemporaryThumbnail: () => {},
    },

    core_vehicle_mirror: {
      getAnglesOffset: () => {},
      focusOnMirror: mirror_name => Any, //optional String
      setAngleOffset: (mirrorName, x, z, v, save) => [String, Number, Number, Boolean, Boolean],
    },

    gameplay_drift_general: {
      onDriftAppMounted: () => {},
      onDriftAppUnmounted: () => {},
    },

    gameplay_missions_missionScreen: {
      getMissionScreenData: () => {},
      startMissionById: (missionId, userSettings, startingOptions) => [String, Object, Object],
      stopMissionById: id => [String],
      changeUserSettings: (missionId, userSettings) => [String, Object],
      startFromWithinMission: (id, userSettings) => [String, Object],
      getActiveStarsForUserSettings: (id, userSettings) => [String, Object],
      requestStartingOptionsForUserSettings: (id, userSettings) => [String, Object],
      isAnyMissionActive: () => {},
      isMissionStartOrEndScreenActive: () => {},
      openAPMChallenges: (branch, skill, routeTarget, routeParams) => [String, String, Optional(String), Optional(Object)],
      navigateToMission: (id, routeTarget, routeParams) => [String, Optional(String), Optional(Object)],
      setPreselectedMissionId: id => [String],
      showMissionRules: id => [String],
      getMissionTiles: () => {},
      activateSound: (soundLabel, active, frequency) => [String, Boolean, Number],
      activateSoundBlur: active => {
        Boolean
      },
      openVehicleSelectorForMissionBySetting: (mId, settingKey) => [String, String],
    },

    gameplay_missions_missionManager: {
      getCurrentTaskdataTypeOrNil: () => {},
    },

    gameplay_garageMode: {
      start: () => {},
      isActive: () => {},
      setCamera: view => String,
      setLighting: lights => Array,
      getLighting: () => {},
      setGarageMenuState: state => String,
      stop: () => {},
      testVehicle: () => {},
    },

    ui_dynamicDecals: {
      initialize: () => {},
      exit: () => {},
      requestUpdatedData: () => {},
      setupEditor: () => {},
      loadSaveFile: path => String,
      createSaveFile: () => {},
      saveChanges: filename => String,
      cancelChanges: () => {},
      exportSkin: skinName => String,
      moveSelectedLayer: order => Number,
      setDecalTexture: filePath => String,
      setDecalColor: colorData => Object,
      setDecalScale: decalData => Object,
      setDecalRotation: decalRotation => Number,
      setDecalSkew: decalSkew => Object,
      setDecalApplyMultiple: applyMultiple => Boolean,
      setDecalResetOnApply: resetOnApply => Boolean,
      setDecalPositionX: positionX => Number,
      setDecalPositionY: positionY => Number,
      updateDecalPosition: (positionX, positionY) => [Number, Number],
      toggleApplyingDecal: enable => Boolean,
      toggleActionMap: enable => Boolean,
      toggleDecalVisibility: enable => Boolean,
      redo: () => {},
      undo: () => {},
      createLayer: layerData => Object,
      createFillLayer: fillLayerData => Object,
      createGroupLayer: layerData => Object,
      updateLayer: layerData => Object,
      deleteSelectedLayer: () => {},
      selectLayer: layerUid => String,
      toggleStampActionMap: enable => Boolean,
      toggleLayerHighlight: uid => String,
      toggleLayerVisibility: uid => String,
    },

    ui_liveryEditor: {
      save: filename => String,
      setup: () => {},
      deactivate: () => {},
      setDecalTexture: texturePath => String,
      useMousePosition: enable => Boolean,
      useSurfaceNormal: enable => Boolean,
      requestSettingsData: () => {},
    },

    ui_liveryEditor_colorPresets: {
      getPresets: () => {},
      addPreset: () => {},
    },

    ui_liveryEditor_editor: {
      setup: () => {},
      startEditor: () => {},
      exitEditor: () => {},
      startSession: () => {},
      applyDecal: () => {},
      applySkin: () => {},
      createNew: () => {},
      loadFile: path => String,
      save: filename => String,
      applyChanges: () => {},
    },

    ui_liveryEditor_editMode: {
      reapply: () => {},
      requestReapply: () => {},
      cancelReapply: () => {},
      setActiveLayer: layerUid => String,
      setActiveLayerDirection: direction => Number,
      removeAppliedLayer: layerUid => String,
      resetCursorProperties: properties => Array,
      toggleHighlightActive: () => {},
      activate: () => {},
      deactivate: () => {},
      apply: () => {},
      requestApply: () => {},
      cancelRequestApply: () => {},
      toggleRequestApply: () => {},
      saveChanges: params => Object,
      cancelChanges: () => {},
      duplicateActiveLayer: () => {},
    },

    ui_liveryEditor_camera: {
      setOrthographicView: view => String,
      switchOrthographicViewByDirection: (x, y) => [Number, Number],
    },

    ui_liveryEditor_controls: {
      toggleUseMousePos: () => {},
    },

    ui_vehicleRadarApp: {
      updateSetting: (key, value) => [String, Any],
    },

    ui_liveryEditor_history: {
      redo: () => {},
      undo: () => {},
    },

    ui_liveryEditor_layerAction: {
      performAction: action => String,
      toggleEnabledByLayerUid: uid => String,
    },

    ui_liveryEditor_layerEdit: {
      setup: () => {},
      setLayer: layerUid => String,
      editNewDecal: params => Object,
      translateLayer: (x, y) => [Number, Number],
      holdTranslate: (axis, value) => [String, Number],
      holdTranslateScalar: (axis, value) => [String, Number],
      holdScale: (axis, value) => [String, Number],
      holdSkew: (axis, value) => [String, Number],
      holdPrecise: enable => Boolean,
      scaleLayer: (x, y) => [Number, Number],
      skewLayer: (x, y) => [Number, Number],
      rotateLayer: (steps, counterClockwise) => [Number, Boolean],
      setPosition: (x, y) => [Number, Number],
      setScale: (x, y) => [Number, Number],
      setRotation: degrees => Number,
      setSkew: (x, y) => [Number, Number],
      setMirrored: settings => [Boolean, Boolean, Number],
      setLayerMaterials: properties => Object,
      activateStampReapply: () => {},
      cancelStampReapply: () => {},
      requestLayerMaterials: () => {},
      saveChanges: () => {},
      cancelChanges: () => {},
      requestStateData: () => {},
      requestInitialLayerData: () => {},
      requestTransform: () => {},
      endTransform: () => {},
      showCursorOrLayer: show => Boolean,
      requestReposition: () => {},
      cancelReposition: () => {},
      applyReposition: () => {},
      toggleUseMouseOrCursor: () => {},
      setIsRotationPrecise: value => Boolean,
      setAllowRotationAction: value => Boolean,
    },

    ui_liveryEditor_layers: {
      requestInitialData: () => {},
    },

    ui_liveryEditor_layers_cursor: {
      requestData: () => {},
    },

    ui_liveryEditor_layers_decals: {
      addLayer: params => Object,
      setLayer: uid => String,
    },

    ui_liveryEditor_layers_decal: {
      addLayerCentered: params => Object,
    },

    ui_liveryEditor_layers_fill: {
      updateLayer: params => Object,
      saveChanges: () => {},
      restoreLayer: () => {},
      restoreDefault: () => {},
      requestLayerData: () => {},
    },

    ui_liveryEditor_resources: {
      requestData: () => {},
      getDecalTextures: () => {},
      getTextureCategories: () => {},
      getTexturesByCategory: category => String,
    },

    ui_liveryEditor_selection: {
      duplicateSelectedLayer: () => {},
      getSelectedLayersData: () => {},
      setSelected: layerUid => String,
      setMultipleSelected: layerUids => Array,
      clearSelection: () => {},
      toggleSelection: layerIds => Array,
      select: (layerIds, highlight) => [Array, Boolean],
      toggleHighlightSelectedLayer: () => {},
      requestInitialData: () => {},
    },

    ui_liveryEditor_tools: {
      useTool: tool => String,
      closeCurrentTool: () => {},
    },

    ui_liveryEditor_tools_material: {
      setColor: rgbaArray => Array,
      setMetallicIntensity: metallicIntensity => Number,
      setNormalIntensity: normalIntensity => Number,
      setRoughnessIntensity: roughnessIntensity => Number,
      setDecal: decalTexture => String,
    },

    ui_liveryEditor_tools_misc: {
      duplicate: () => {},
    },

    ui_liveryEditor_tools_group: {
      moveOrderUp: () => {},
      moveOrderDown: () => {},
      changeOrderToTop: () => {},
      changeOrderToBottom: () => {},
      moveOrderUpById: layerUid => [String],
      moveOrderDownById: layerUid => [String],
      setOrder: order => Number,
      changeOrder: (oldOrder, oldParent, newOrder, newParent) => [Number, String, Number, String],
      groupLayers: () => {},
      ungroupLayer: () => {},
    },

    ui_liveryEditor_tools_transform: {
      translate: (x, y) => [Number, Number],
      setPosition: (x, y) => [Number, Number],
      rotate: degrees => Number,
      scale: (stepsX, stepsY) => [Number, Number],
      setScale: (scaleX, scaleY) => [Number, Number],
      setRotation: degrees => Number,
      skew: (skewX, skewY) => [Number, Number],
      setSkew: (skewX, skewY) => [Number, Number],
      useStamp: () => {},
      cancelStamp: () => {},
    },

    ui_liveryEditor_tools_settings: {
      deleteLayer: () => {},
      setMirrored: (mirrored, flip) => [Boolean, Boolean],
      setVisibility: show => Boolean,
      toggleVisibility: () => {},
      toggleVisibilityById: layerUid => String,
      toggleLock: () => {},
      toggleLockById: layerUid => String,
      setMirrorOffset: offset => Number,
      setUseMousePos: value => Boolean,
      setProjectSurfaceNormal: value => Boolean,
      rename: name => String,
    },

    ui_liveryEditor_userData: {
      requestUpdatedData: () => {},
      getSaveFiles: () => {},
      createSaveFile: filename => String,
      renameFile: (filename, newFilename) => [String, String],
      deleteSaveFile: filename => String,
    },

    ui_menuManager: {
      toggleMenu: () => {},
    },

    ui_gameBlur: {
      replaceGroup: (groupName, list) => [String, Object],
    },

    ui_fadeScreen: {
      onScreenFadeStateDelayed: state => Integer,
    },

    util_asyncBulkLoader: {
      loadVehiclesDirect: () => {},
      loadMissionsDirect: () => {},
      loadGameplaySelectorDirect: () => {},
      loadLevelsDirect: () => {},
      loadVehicles: () => {},
      loadMissions: () => {},
      loadGameplaySelector: () => {},
      loadLevels: () => {},
      sendAllCareerSaveSlotsDataAsync: () => {},
      isVehiclesLoaded: () => {},
      isMissionsLoaded: () => {},
      isGameplaySelectorLoaded: () => {},
      isLevelsLoaded: () => {},
    },


    ui_router: {
      addOrUpdateRoute: (route, config, options) => [String, Object, Object],
      navigate: (routeName, params, options) => [String, Object, Object],
      push: (routeName, params) => [String, Object],
      replace: (routeName, params) => [String, Object],
      back: () => {},
      forward: () => {},
      loadComplete: uiType => String,
      routeChangeComplete: (frameworkId, routeName, transitionId) => [String, String, Optional(String)],
      routeChangeReceived: (frameworkId, routeName, transitionId) => [String, String, Optional(String)],
      routeNavigationStarted: (frameworkId, routeName, transitionId) => [String, String, Optional(String)],
      routeMounted: (routeName, transitionId) => [String, Optional(String)],
      reload: (routeName, params, options) => [String, Object, Object],
      getCurrent: () => {},
      getState: () => {},
      resetStates: () => {},
      getBreadcrumbs: () => {},
      reportActiveScope: payload => Object,
    },

    ui_router_routeManager: {
      addVueRoutes: routes => Array,
      removeRuntimeRoutes: () => {},
      registerModRoutes: (sourceId, routes, options) => [String, Array, Optional(Object)],
      unregisterModRoutes: (sourceId, options) => [String, Optional(Object)],
      getAllRoutes: () => {},
      getRoute: route => Object,
    },
    ui_pause_actions: {
      executeAction: (buttonId, payload) => [Integer, Object],
      registerModTab: tab => Object,
      unregisterModTab: id => String,
      registerModButton: button => Object,
      unregisterModButton: id => String,
      getVisibleModTabs: () => {},
    },
    ui_pause_photomode: {
      getAdvancedRenderState: () => {},
      getCameraState: () => {},
      getCaptureState: () => {},
      getEffectsState: () => {},
      listPresets: presetType => Object,
      discoverTemporaryPresets: presetType => Object,
      getResolutionPresetState: () => {},
      getSceneState: () => {},
      isDebugEnabled: () => {},
      loadAdvancedRenderBookmark: () => {},
      loadEnvironmentBookmark: () => {},
      requestScreenshot: options => Object,
      openPreviewShareUrl: shareUrl => String,
      playPreviewFromMetadata: openMap => Object,
      applyPreset: (presetType, presetId) => [String, String],
      applyPresetPayload: (presetType, payload) => [String, Object],
      deletePreset: (presetType, presetId) => [String, String],
      resetAdvancedRenderToDefaults: () => {},
      resetEffectsToDefaults: () => {},
      resetCameraDefaults: () => {},
      restoreCameraBookmark: bookmark => Object,
      restoreSavedFreeCameraBookmark: () => {},
      restoreSavedRelativeCameraBookmark: () => {},
      restoreSessionCameraTransformState: () => {},
      saveAdvancedRenderBookmark: () => {},
      saveCurrentCameraBookmark: () => {},
      saveCurrentPreset: (presetType, name, options) => [String, String, Object],
      saveEnvironmentBookmark: () => {},
      savePresetPayload: (presetType, name, payload, origin) => [String, String, Object, Object],
      savePresetBundle: (bundle, namePrefix, origin) => [Object, String, Object],
      setDebugEnabled: value => Boolean,
      setHiddenCameraInputEnabled: value => Boolean,
      setCameraSmoothMovement: value => Boolean,
      setNodeGrabberVisible: value => Boolean,
      setAdvancedRenderTuningEnabled: value => Boolean,
      setAdvancedRenderState: state => Object,
      setCameraFov: value => Number,
      setCameraExposureState: state => Object,
      setCameraSpeed: value => Number,
      setCameraRoll: value => Number,
      setCaptureState: partialState => Object,
      setResolutionPreset: presetId => String,
      traceCaptureDebug: (scope, payload) => [String, Object],
      renamePreset: (presetType, presetId, name) => [String, String, String],
      setEffectsState: state => Object,
      setSceneState: state => Object,
      getRoutePayload: () => {},
    },
    ui_photomode_overlays: {
      getOverlays: () => {},
      listUiApps: () => {},
      listLiveryGraphics: () => {},
      createOverlay: (destId, payload) => [String, Object],
      saveOverlay: (id, payload) => [String, Object],
      cloneOverlay: (sourceId, destId) => [String, String],
      renameOverlay: (sourceId, destId, newName) => [String, String, String],
      deleteOverlay: id => String,
    },

    ui_uiMods: {
      getVueMods: () => {},
      getUiApps: () => {},
      getImageList: path => String,
    },

    ui_options: {
      // dev-only: persists the options layout editor JSON (into the user folder; sandboxed)
      saveLayout: (key, data) => [String, String],
      // dev-only: which layout files currently resolve to the user folder (local, unsubmitted edits)
      getUserFolderLayouts: () => {},
    },

    ui_apps: {
      getUIAppsData: () => {},
      notifyLayoutsChanged: () => {},
    },

    ui_appLayouts: {
      getAvailableLayouts: () => {},
      saveLayout: data => Object,
      deleteLayout: filename => String,
      resetLayout: (filename, layoutType) => [String, String],
      getCurrentLayout: () => {},
      setCurrentLayout: layoutOrFilename => Any,
      setUsedLayout: idOrType => Any,
      resetUsedLayout: () => {},
      createLayout: data => Object,
      renameLayout: (filename, title) => [String, String],
      duplicateLayout: (filename, title) => [String, String],
      addApp: (layoutId, appName, placement) => [String, String, Object],
      removeApp: (layoutId, appInstanceIdOrIndex) => [String, Any],
      applyPlacementPatch: (layoutId, appInstanceIdOrIndex, placement) => [String, Any, Object],
      setEditing: enabled => Boolean,
      isEditing: () => {},
    },
  },

  ActionMap: {
    enableBindingCapturing: state => Boolean,
  },

  gameplay_markerInteraction: {
    startMissionById: (missionId, userSettings) => [Any, Object],
    closeViewDetailPrompt: force => Boolean,
    changeUserSettings: (missionId, userSettings) => [String, Object],
  },

  ui_missionInfo: {
    performActivityAction: id => Integer,
    setActivityIndexVisible: index => Integer,
    closeDialogue: () => {},
  },

  ui_apps_genericMissionData: {
    sendAllData: () => {},
    setData: args => Object,
    clearData: () => {},
  },
  ui_apps_missionControls: {
    sendAllData: () => {},
    setControl: args => Object,
    setControls: list => Array,
    clearControls: () => {},
  },
  ui_apps_pointsBar: {
    requestAllData: () => {},
  },
  ui_appContainers: {
    getVisibleApps: (containerId) => String,
    getAvailableApps: (containerId) => String,
    setAppVisibility: (containerId, appId, visible) => [String, String, Boolean],
    getAppVisibility: (containerId, appId) => [String, String],
    showApp: (containerId, appId) => [String, String],
    hideApp: (containerId, appId) => [String, String],
    toggleApp: (containerId, appId) => [String, String],
    hideAllApps: (containerId) => String,
  },
  ui_appContainers_topCenter: {
    getVisibleApps: (containerId) => String,
    getAvailableApps: (containerId) => String,
    setAppVisibility: (containerId, appId, visible) => [String, String, Boolean],
    getAppVisibility: (containerId, appId) => [String, String],
    showApp: (containerId, appId) => [String, String],
    hideApp: (containerId, appId) => [String, String],
    toggleApp: (containerId, appId) => [String, String],
    hideAllApps: (containerId) => String,

    getContainerContext: (containerId) => String,
    setContainerContext: (containerId, context) => [String, String],
    resetContainerContext: (containerId) => String,
    getAvailableContexts: (containerId) => String,
    clearMessagesFromSource: source => String,
    clearAllFlashMessages: () => {},
    getCenterBannerContent: () => {},
  },

  scenetree: {
    "maincef:setMaxFPSLimit": fps => Integer, // This name is problematic and need to use [] syntax to call - intellisense should pick it up
  },

  settings: {
    notifyUI: () => {},
    setState: state => Object,
    getValue: value => String,
    setValue: (settingName, value) => [String, Any],
  },

  core_camera: {
    notifyUI: () => {},
    setFOV: (playerId, fovDeg) => [Integer, Number],
    setByName: (playerId, name) => [Integer, String],
    changeOrder: (oneBasedIndex, direction) => [Integer, Integer],
    toggleEnabledById: (oneBasedIndex) => Integer,
    rotate_yaw: (value, filterType) => [Number, Integer],
    rotate_pitch: (value, filterType) => [Number, Integer],
  },

  core_modmanager: {
    requestState: () => {},
  },

  core_onScreenKeyboard: {
    openOnScreenKeyboard: (title, placeholder, initialText, maxLength, inputType, textBoxLeft, textBoxTop, textBoxWidth, textBoxHeight) => [String, Any, Any, Any, Any, Number, Number, Number, Number],
    isOnScreenKeyboardAvailable: () => { },
  },

  core_vehicles: {
    cloneCurrent: () => {},
    getModel: model => String,
    getCurrentVehicleDetails: () => {},
    getVehicleLicenseText: id => Number, // TODO - not sure if this will be used - may need to send some Lua code directly - consider how to do this
    removeAll: () => {},
    removeAllExceptCurrent: () => {},
    removeCurrent: () => {},
    requestList: () => {},
    requestListEnd: () => {},
    setPlateText: plateText => String,
    setMeshVisibility: state => Number,
    spawnDefault: () => {},
    spawnNewVehicle: (model, args) => [String, Object],
    replaceVehicle: (model, args) => [String, Object],
    isLicensePlateValid: text => Any,
    getModelList: () => {},

    // --- RLS Career Overhaul additions ---
    loadDefault: () => {},
  },


  ui_gridSelector: {
    //Tiles
    getTiles: (backendName, currentPath, pathChanged) => [String, Object, Boolean],
    requestClusterTiles: (backendName, path, requestId) => [String, Object, Number],
    getSelectorSnapshot: (backendName, path) => [String, String],
    getFilters: (backendName) => String,

    //Filters
    getActiveFilters: (backendName) => String,
    toggleFilter: (backendName, propName, option) => [String, String],
    updateRangeFilter: (backendName, propName, min, max) => [String, String, Number, Number],
    resetRangeFilter: (backendName, propName) => [String, String],
    resetSetFilter: (backendName, propName) => [String, String],
    getSearchText: (backendName) => String,
    setSearchText: (backendName, searchText) => [String, String],

    //Display Data
    getDisplayDataOptions: (backendName) => String,
    setDisplayDataOption: (backendName, key, value) => [String, String, Any],
    resetDisplayDataToDefaults: (backendName) => String,

    //General
    getScreenHeaderTitleAndPath: (backendName, path) => [String, Object],
    profilerFinish: (backendName, tag) => [String, String],
    closedFromUI: (backendName) => String,
    onOpenedSelectorWithItemDetails: (backendName, itemDetails) => [String, Object],

    //Details
    getDetails: (backendName, itemDetails) => [String, Object],
    requestDetails: (backendName, itemDetails, requestId) => [String, Object, Number],
    executeButton: (backendName, buttonId, additionalData) => [String, Number, Object],
    getManagementDetails: (backendName) => String,
    exitCallback: () => {},
    executeDoubleClick: (backendName, itemDetails) => [String, Object],
    exploreFolder: (backendName, path) => [String, String],
    goToMod: (backendName, modId) => [String, String],
    toggleFavourite: (backendName, itemDetails) => [String, Object],

  },

  ui_appSelector_general: {
    requestDetails: (item, requestId) => [Object, Integer],
    setDisplayDataOption: (key, value, requestId) => [String, Any, Integer],
    resetDisplayDataToDefaults: requestId => Integer,
  },

  ui_gameplaySelector_general: {
    openGameplaySelector: () => {},
    openRallySelector: () => {},
    navigateToCluster: (clusterTitle) => Object,
    setDisplayDataOption: (key, value, requestId) => [String, Any, Integer],
    resetDisplayDataToDefaults: requestId => Integer,

    // --- RLS Career Overhaul additions ---
    openChallengesSelector: () => {},
    openCampaignsSelector: () => {},
    openScenariosSelector: () => {},
  },

  ui_gameplaySelector_tileGenerators_levelTiles: {
    getSpawningOptions: (levelName, backendName) => [String, String],
    changeSpawningOption: (key, value) => [String, Any],
    setAlwaysShowDialogue: (backendName, newValue) => [String, Boolean],
  },
  ui_vehicleSelector_general: {
    openVehicleSelectorForFreeroamModal: () => {},
    openVehicleSelectorForGarage: showOwnedOnly => Boolean,
    openFromPause: () => {},
    isOpenedFromGarage: () => {},
    navigateToVehicle: tile => Object,
    requestDetails: (item, requestId) => [Object, Integer],
    setDisplayDataOption: (key, value, requestId) => [String, Any, Integer],
    emitDisplayDataSnapshot: requestId => Integer,
    setVehicleRestrictionMode: restrictionMode => Optional(String),
  },
  ui_vehicleSelector_vehicleMetadataEditor: {
    getVehicleMetadataDetails: (data) => Object,
  },
  ui_freeroamSelector_general: {
    openFromPause: () => {},
    setCustomDetailsButtons: (buttons) => Array,
    getCustomDetailsButtons: () => {},
    setManagementButtonsEnabled: (enabled) => Boolean,
    getManagementButtonsEnabled: () => {},
    openFreeroamSelectorWithCustomButtons: (buttons, callback) => [Array, Function],
    setExitCallback: (callback) => Function,
    emitDisplayDataSnapshot: (requestId) => Integer,
  },
  ui_pause_camera: {
    beginPauseSession: () => {},
    endPauseSession: () => {},
    start: () => {},
    stop: () => {},
  },
  /*

    //getVehicleTiles: () => {},
    getTiles: (currentPath, pathChanged) => [Object, Boolean],
    getFilters: () => {},
    getActiveFilters: () => {},
    toggleFilter: (propName, option) => [String, String],
    updateRangeFilter: (propName, min, max) => [String, Number, Number],
    resetRangeFilter: propName => String,
    resetSetFilter: propName => String,
    getDisplayDataOptions: () => {},
    setDisplayDataOption: (key, value) => [String, Any],
    resetDisplayDataToDefaults: () => {},
    toggleFavourite: (model, config) => [String, String],
    getSearchText: () => {},
    setSearchText: (searchText) => {},
    getScreenHeaderTitleAndPath: (path) => Object,

    profilerFinish: (tag) => String,
    closedFromUI: () => {},
  },
  ui_vehicleSelector_detailsInteraction: {
    getDetails: itemDetails => Object,
    executeButton: (buttonId, additionalData) => [Number, Object],
    getManagementDetails: () => {},
    exitCallback: () => {},
    executeDoubleClick: itemDetails => Object,
    exploreFolder: path => String,
    goToMod: modId => String,
  },
  */
  core_vehicle_manager: {
    reloadAllVehicles: () => {},
    toggleDebug: () => {},
    getDebug: () => {},
  },

  core_vehicle_colors: {
    setVehicleColor: (index, value) => [Integer, Object],
  },

  core_recoveryPrompt: {
    getUIData: () => {},
    buttonPressed: id => [String],
    uiPopupButtonPressed: index => [Integer],
    uiPopupCancelPressed: () => {},
    onPopupClosed: () => {},
  },

  core_remoteController: {
    devicesConnected: () => Boolean,
    getQRCode: () => {},
  },

  core_levels: {
    startLevel: () => {},
  },

  debug_vehicleDebug: {
    toggleDebugEnabled: () => {},
    getDebugEnabled: () => {},
    setDebugEnabled: (value) => [Boolean],
  },

  util_screenshotCreator: {
    startWork: workOptions => Any,
  },

  util_groundModelDebug: {
    openWindow: () => {},
  },

  scenario_scenariosLoader: {
    getList: () => {},
    start: scenario => Object,
  },

  scenario_busdriver: {
    requestState: () => {},
  },

  scenario_quickRaceLoader: {
    uiHotlappingAppDestroyed: () => {},
  },

  quickrace_quickraceConfigurator: {
    getConfiguration: () => {},
    selectLevel: levelName => String,
    selectMiddle: (levelName, middleName) => [String, String],
    selectVehicle: (model, config, additionalData) => [String, Optional(String), Optional(Any)],
    updateSetting: (key, value) => [String, Any],
    toggleShowLapRecords: () => {},
    start: () => {},
  },

  lightrunner_lightrunnerConfigurator: {
    getConfiguration: () => {},
    selectLevel: levelName => String,
    selectMiddle: (levelName, middleName) => [String, String],
    selectVehicle: (model, config, additionalData) => [String, Optional(String), Optional(Any)],
    updateSetting: (key, value) => [String, Any],
    toggleShowLapRecords: () => {},
    start: () => {},
  },

  busroute_busrouteConfigurator: {
    getConfiguration: () => {},
    selectLevel: levelName => String,
    selectMiddle: (levelName, middleName) => [String, String],
    selectVehicle: (model, config, additionalData) => [String, Optional(String), Optional(Any)],
    updateSetting: (key, value) => [String, Any],
    toggleShowLapRecords: () => {},
    start: () => {},
  },

  core_hotlapping: {
    changeSize: (amount, instant) => [Number, Boolean],
    stopHotlapping: () => {},
    addCheckPoint: () => {},
    stopTimer: () => {},
    refreshTracklist: () => {},
    rename: (oldName, newName) => [String, String],
    load: filename => String,
    save: () => {},
    skipLap: () => {},
  },

  ui_apps_minimap_minimap: {
    setDrawTransform: (x, y, width, height) => [Number, Number, Number, Number],
    hide: () => {},
    toggleOptions: () => {},
    getMode: () => {},
    setOcclusionTransform: (id, x, y, width, height) => [String, Number, Number, Number, Number],
    resetOcclusionTransform: (id) => [String],
  },

  ui_apps_minimap_additionalInfo: {
    requestAdditionalInfo: () => {},
  },

  ui_policeInfo: {
    isPursuit: () => Boolean,
    onPursuitStatsEnded: () => {}
  },

  Input: {
    setForwardRawEvents: state => Boolean,
    setForwardFilteredEvents: state => Boolean,
  },

  Engine: {
    Audio: {
      playOnce: (channel, sound) => [String, String],
    },
    Render: {
      getAdapterType: () => {},
    },
    UI: {
      getUIEngine: () => {},
    },
    Platform: {
      getFSInfo: () => {},
    },
  },

  OnlineServiceProvider: {
    openFriendsListDialog: () => {},
    openInviteDialog: (args) => String,
  },

  Steam: {
    showFloatingGamepadTextInput: (type, left, top, width, height) => [Number, Number, Number, Number, Number]
  },

  setCEFTyping: state => Boolean,

}
