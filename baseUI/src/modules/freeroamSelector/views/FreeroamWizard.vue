<template>
  <LayoutMenu
    class="freeroam-configurator"
    :nav-scope="WIZARD_SCOPE_ID"
    :nav-active="false"
    :nav-options="wizardNavOptions"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="goBack"
  >
    <div
      class="configurator-content"
      v-bng-click.controller="{
        holdCallback: () => onStartButtonClick(button?.meta?.buttonId),
        holdDelay: 1200,
        repeatInterval: 0,
      }"
      v-bng-on-ui-nav:action_2.asMouse
      v-bng-ui-nav-label:action_2="button?.meta?.label"
      v-bng-on-ui-nav:menu="onMenuUiNav"
    >
      <div class="configurator-body">
        <component
          :is="activePanelComponent"
          :ref="activePanelRef"
          v-bind="activePanelProps"
          v-on="activePanelListeners"
        />
      </div>
      <div class="configurator-heading">
        <!-- Error State -->
        <div v-if="error" class="error-state">
          <BlurBackground />
          <div class="error-content">
            <BngIcon type="warning" class="error-icon" />
            <p>Failed to load configuration</p>
            <BngButton @click="initialize" :accent="ACCENTS.secondary">Retry</BngButton>
          </div>
        </div>
        <!-- Main Content - Always show layout -->
        <FreeroamConfigurator
          v-else
          :step="step"
          :step-completed="stepCompleted"
          :config-data="configData"
          :vehicle-paint-data="vehiclePaintData"
          :is-multiplayer-enabled="isMultiplayerEnabled"
          :is-multiplayer-available="isMultiplayerAvailable"
          :button="button"
          @spawn-point-click="onSpawnPointTileClick"
          @vehicle-click="onVehicleTileClick"
          @options-click="onOptionsTileClick"
          @multiplayer-click="onMultiplayerTileClick"
          @start-button-click="onStartButtonClick"
        />
      </div>
    </div>
  </LayoutMenu>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, inject, unref } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from "pinia"
import { LayoutMenu } from "@/common/layouts"
import { BngButton, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavLabel, vBngClick } from "@/common/directives"
import { useBridge } from "@/bridge"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import useFreeroamConfigurator from "../composables/useFreeroamConfigurator"
import Paint from "@/utils/paint"
import FreeroamConfigurator from "../components/FreeroamConfigurator.vue"
import FreeroamLevelGridSelector from "../components/FreeroamLevelGridSelector.vue"
import FreeroamVehicleGridSelector from "../components/FreeroamVehicleGridSelector.vue"
import FreeroamOptionsSummaryPanel from "../components/FreeroamOptionsSummaryPanel.vue"
import FreeroamMultiplayerSummaryPanel from "../components/FreeroamMultiplayerSummaryPanel.vue"
import { useScopedNav } from "@/services/scopedNav/api"
import useControls from "@/services/controls"
import { startLoading } from "@/services"
import { waitForLoadingScreenFadeIn } from "@/services/screenCover"
import { useRouteDataStore } from "@/services/routeData"
import logger from "@/services/logger"
import { tasklist } from "@/modules/apps"
import { useTasksStore } from "@/services/tasklistStore"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav"

const { lua, events } = useBridge()
const scopedNav = useScopedNav()
const controlsStore = useControls()
const { isControllerUsed } = storeToRefs(controlsStore)
const route = useRoute()
const routeDataStore = useRouteDataStore()
const tasklistStore = useTasksStore()
const { breadcrumbs: routeBreadcrumbs } = storeToRefs(routeDataStore)

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))

const WIZARD_SCOPE_ID = "root"
const wizardNavOptions = Object.freeze({
  canDeactivate: () => false,
  bubbleBlacklistEvents: ["back", "menu"],
  // we want to always trap events so that triggering 'menu' event in keyboard
  // will not bypass this scope but let the wizard handle what to do with menu/escape
  trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS,
})

const WIZARD_ROUTE_FAMILY_DEFAULT = "menu"
const WIZARD_ROUTE_FAMILIES = Object.freeze(["menu", "pause"])
const WIZARD_ROUTE_SCREEN_PREFIX = "freeroamLevels"
const MINOR_ROUTE_DIVIDER_TYPE = icons.arrowSmallRight

const WIZARD_STEP_CONFIG_BY_STATE = Object.freeze({
  locations: Object.freeze({
    step: "level",
    stepNavigatePriority: 1,
    routeName: "freeroamLevels",
    routeSuffixes: Object.freeze([".freeroamLevels"]),
    previousState: null,
  }),
  location: Object.freeze({
    step: "level",
    stepNavigatePriority: 0,
    routeName: "freeroamLevels.level",
    routeSuffixes: Object.freeze([".freeroamLevels.level"]),
    previousState: "locations",
  }),
  vehicles: Object.freeze({
    step: "vehicle",
    stepNavigatePriority: 1,
    routeName: "freeroamLevels.vehicles",
    routeSuffixes: Object.freeze([".freeroamLevels.vehicles"]),
    previousState: "locations",
  }),
  vehicle: Object.freeze({
    step: "vehicle",
    stepNavigatePriority: 0,
    routeName: "freeroamLevels.vehicles.vehicle",
    routeSuffixes: Object.freeze([".freeroamLevels.vehicles.vehicle"]),
    previousState: "vehicles",
  }),
  options: Object.freeze({
    step: "options",
    stepNavigatePriority: 0,
    routeName: "freeroamLevels.vehicles.options",
    routeSuffixes: Object.freeze([".freeroamLevels.vehicles.options"]),
    previousState: "vehicles",
  }),
  multiplayer: Object.freeze({
    step: "multiplayer",
    stepNavigatePriority: 0,
    routeName: "freeroamLevels.vehicles.options.multiplayer",
    routeSuffixes: Object.freeze([".freeroamLevels.vehicles.options.multiplayer"]),
    previousState: "options",
  }),
})

const hasRouteParamValue = value => value !== undefined && value !== null && value !== ""
const getWizardRouteData = () => routeDataStore.data?.freeroamWizard || {}
const getWizardSelectionContext = () => getWizardRouteData().selection || {}
const getWizardUiState = () => getWizardRouteData().uiState || {}
const getWizardPathByStepContext = () => getWizardUiState().pathByStep || {}
const getWizardSearchByStepContext = () => getWizardUiState().searchByStep || {}
const getWizardFiltersByStepContext = () => getWizardUiState().filtersByStep || {}
const getWizardNavigationContext = () => ({
  selection: getWizardSelectionContext(),
})

const normalizeWizardPathSegment = segment => {
  if (segment === undefined || segment === null || segment === "undefined") {
    return null
  }
  if (typeof segment === "string") {
    return segment
  }
  if (typeof segment === "number" || typeof segment === "boolean") {
    return String(segment)
  }
  return null
}

const normalizeWizardPath = (pathValue, fallbackPath = { keys: [] }) => {
  const fallbackKeys = Array.isArray(fallbackPath?.keys) ? [...fallbackPath.keys] : []
  if (!pathValue || typeof pathValue !== "object") {
    return { keys: fallbackKeys }
  }

  const sourceKeys = Array.isArray(pathValue.keys)
    ? pathValue.keys
    : (Array.isArray(pathValue) ? pathValue : null)
  if (!sourceKeys) {
    return { keys: fallbackKeys }
  }

  const normalizedKeys = sourceKeys
    .map(normalizeWizardPathSegment)
    .filter(segment => segment !== null)
  return normalizedKeys.length > 0 ? { keys: normalizedKeys } : { keys: fallbackKeys }
}

const normalizeWizardSearchText = searchText => {
  if (searchText === null || searchText === undefined || searchText === "undefined") {
    return ""
  }
  if (typeof searchText === "string") {
    return searchText
  }
  if (typeof searchText === "number" || typeof searchText === "boolean") {
    return String(searchText)
  }
  return ""
}

const normalizeWizardFilterValue = (value, depth = 0) => {
  if (depth > 12) {
    return null
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (!value || typeof value !== "object") {
    return null
  }

  if (Array.isArray(value)) {
    return value
      .map(childValue => normalizeWizardFilterValue(childValue, depth + 1))
      .filter(childValue => childValue !== null)
  }

  const normalizedObject = {}
  for (const [key, childValue] of Object.entries(value)) {
    const normalizedChild = normalizeWizardFilterValue(childValue, depth + 1)
    if (normalizedChild !== null) {
      normalizedObject[key] = normalizedChild
    }
  }
  return normalizedObject
}

const normalizeWizardFiltersPayload = filtersPayload => {
  if (!filtersPayload || typeof filtersPayload !== "object") {
    return {}
  }
  const normalized = normalizeWizardFilterValue(filtersPayload)
  return normalized && typeof normalized === "object" ? normalized : {}
}

const getWizardSearchForStep = stepName => {
  return normalizeWizardSearchText(getWizardSearchByStepContext()[stepName])
}

const getWizardFiltersForStep = stepName => {
  return normalizeWizardFiltersPayload(getWizardFiltersByStepContext()[stepName])
}

const getSelectionPathSegment = value => normalizeWizardPathSegment(value)

const buildWizardPathForActiveRouteStep = stepName => {
  const fallbackPath = { keys: [] }
  const routeName = getCurrentWizardRouteName()
  const routePathByStep = getWizardPathByStepContext()
  const selectionContext = getWizardSelectionContext()
  const restoredPath = normalizeWizardPath(routePathByStep[stepName], fallbackPath)

  // logger.debug("FreeroamWizard.restore.routeDataPath", {
  //   routeName,
  //   step: stepName,
  //   restoredPath,
  //   pathSource: "routeData.freeroamWizard.uiState.pathByStep",
  //   selection: {
  //     levelName: selectionContext.levelName || null,
  //     vehicleModel: selectionContext?.vehicle?.model || null,
  //   },
  //   activeSearchText: getWizardSearchForStep(stepName),
  //   activeFilters: getWizardFiltersForStep(stepName),
  // })

  return restoredPath
}

const hasWizardLevelContext = () => {
  const selectionContext = getWizardSelectionContext()
  return hasRouteParamValue(selectionContext.levelName)
}

const hasWizardVehicleSelectionContext = () => {
  const selectionContext = getWizardSelectionContext()
  return hasRouteParamValue(selectionContext?.vehicle?.model)
}

const getWizardFallbackSelectorState = selectorState => {
  if (selectorState === "location" && !hasWizardLevelContext()) {
    return "locations"
  }
  if (selectorState === "vehicle" && !hasWizardVehicleSelectionContext()) {
    return "vehicles"
  }
  return null
}

const hasRequiredWizardContextForSelectorState = selectorState => {
  return !getWizardFallbackSelectorState(selectorState)
}

const getWizardStepConfig = selectorState => WIZARD_STEP_CONFIG_BY_STATE[selectorState] || null

const getCandidateSelectorStatesForWizardStep = targetStep => {
  return Object.entries(WIZARD_STEP_CONFIG_BY_STATE)
    .filter(([, config]) => config.step === targetStep)
    .sort((a, b) => (a[1].stepNavigatePriority ?? 0) - (b[1].stepNavigatePriority ?? 0))
    .map(([selectorState]) => selectorState)
}

const getWizardSelectorStateByRouteSuffix = routeName => {
  if (typeof routeName !== "string" || routeName.length === 0) return null

  let bestMatchState = null
  let bestMatchLength = -1

  for (const [selectorState, selectorConfig] of Object.entries(WIZARD_STEP_CONFIG_BY_STATE)) {
    for (const suffix of selectorConfig.routeSuffixes || []) {
      if (routeName.endsWith(suffix) && suffix.length > bestMatchLength) {
        bestMatchState = selectorState
        bestMatchLength = suffix.length
      }
    }
  }

  return bestMatchState
}
const resolvePreviousWizardSelectorState = (selectorState, navigationContext = getWizardNavigationContext()) => {
  const previousStateResolver = getWizardStepConfig(selectorState)?.previousState
  if (typeof previousStateResolver === "function") {
    return previousStateResolver(navigationContext)
  }
  return previousStateResolver || null
}

function isRecentConcreteVehicleTile(item) {
  const hasRecentGotoPath = Array.isArray(item?.gotoPath)
    && item.gotoPath.some(pathSegment => typeof pathSegment === "string" && pathSegment.includes("Recent"))

  if (!hasRecentGotoPath) {
    return false
  }

  const details = item?.doubleClickDetails
  return Boolean(details?.model && details?.config)
}

const getCurrentWizardRouteName = () => {
  const routeNameFromStore = routeDataStore.routeName
  return typeof routeNameFromStore === "string" ? routeNameFromStore : ""
}

const getWizardRouteFamilyFromRouteName = routeName => {
  if (typeof routeName !== "string" || routeName.length === 0) {
    return WIZARD_ROUTE_FAMILY_DEFAULT
  }
  for (const family of WIZARD_ROUTE_FAMILIES) {
    const familyRootRouteName = `${family}.${WIZARD_ROUTE_SCREEN_PREFIX}`
    if (routeName === familyRootRouteName || routeName.startsWith(`${familyRootRouteName}.`)) {
      return family
    }
  }
  return WIZARD_ROUTE_FAMILY_DEFAULT
}

const getCurrentWizardRouteFamily = () => getWizardRouteFamilyFromRouteName(getCurrentWizardRouteName())

const resolveWizardSelectorState = routeName => {
  const normalizedRouteName = typeof routeName === "string" ? routeName : ""
  return getWizardSelectorStateByRouteSuffix(normalizedRouteName)
}

const currentWizardRouteName = computed(() => getCurrentWizardRouteName())
const wizardSelectorState = computed(() => resolveWizardSelectorState(currentWizardRouteName.value))
const wizardStepConfig = computed(() => getWizardStepConfig(wizardSelectorState.value))
const step = computed(() => wizardStepConfig.value?.step || "level")

const getWizardRouteNameForState = selectorState => {
  const baseRouteName = getWizardStepConfig(selectorState)?.routeName
  if (!baseRouteName) return null
  const family = getCurrentWizardRouteFamily()
  return `${family}.${baseRouteName}`
}

const getPreferredSelectorStateForStep = targetStep => {
  const candidateSelectorStates = getCandidateSelectorStatesForWizardStep(targetStep)
  for (const selectorState of candidateSelectorStates) {
    if (hasRequiredWizardContextForSelectorState(selectorState)) {
      return selectorState
    }
  }

  return candidateSelectorStates[candidateSelectorStates.length - 1] ?? null
}

const navigateToWizardSelectorState = async (selectorState, navigateOptions = null, routeParams = null) => {
  const routeName = getWizardRouteNameForState(selectorState)
  if (!routeName) {
    logger.warn(`navigateToWizardSelectorState: Unknown selector state "${selectorState}"`)
    return
  }

  await lua.extensions.ui_router.navigate(routeName, routeParams, navigateOptions)
}

const navigateToWizardStep = async targetStep => {
  if (targetStep === "multiplayer" && (isSimpleMenu.value || !isMultiplayerAvailable.value)) {
    await navigateToWizardSelectorState("options")
    return
  }

  const selectorState = getPreferredSelectorStateForStep(targetStep)
  const selectionContext = getWizardSelectionContext()
  // logger.debug("FreeroamWizard.navigation.step", {
  //   routeName: getCurrentWizardRouteName(),
  //   step: targetStep,
  //   selectorState,
  //   selection: {
  //     levelName: selectionContext.levelName || null,
  //     vehicleModel: selectionContext?.vehicle?.model || null,
  //   },
  //   activeSearchText: getWizardSearchForStep(targetStep),
  //   activeFilters: getWizardFiltersForStep(targetStep),
  // })
  await navigateToWizardSelectorState(selectorState)
}

const stepCompleted = computed(() => {
  return {
    level: ["vehicle", "options", "multiplayer"].includes(step.value),
    vehicle: ["options", "multiplayer"].includes(step.value),
    options: !isSimpleMenu.value && step.value === "multiplayer",
    multiplayer: false,
  }
})

const wizardRouteContextSignature = computed(() => {
  const selectionContext = getWizardSelectionContext()
  const selectedVehicleModel = getSelectionPathSegment(selectionContext?.vehicle?.model) || ""
  return [
    selectionContext.levelName || "",
    selectedVehicleModel,
  ].join("|")
})

watch([currentWizardRouteName, wizardRouteContextSignature], ([routeName]) => {
  const selectorState = resolveWizardSelectorState(routeName)
  if ((selectorState === "location" || selectorState === "vehicle") && !routeDataStore.data?.freeroamWizard) {
    return
  }
  const fallbackSelectorState = getWizardFallbackSelectorState(selectorState)
  if (fallbackSelectorState && fallbackSelectorState !== selectorState) {
    navigateToWizardSelectorState(fallbackSelectorState)
  }
}, { immediate: true })

const vehicleGridSelectorRef = ref(null)
const levelGridSelectorRef = ref(null)
const isLoading = ref(false)
const PANEL_COMPONENTS_BY_STEP = Object.freeze({
  level: FreeroamLevelGridSelector,
  vehicle: FreeroamVehicleGridSelector,
  options: FreeroamOptionsSummaryPanel,
  multiplayer: FreeroamMultiplayerSummaryPanel,
})
const EMPTY_PANEL_PROPS = Object.freeze({})
const EMPTY_PANEL_LISTENERS = Object.freeze({})
const multiplayerOptionGroup = computed(() => {
  return configData.value?.options?.find(group => group.enable_step === "multiplayer") || null
})
const isMultiplayerEnabled = computed(() => !!multiplayerOptionGroup.value?.value)
const isMultiplayerAvailable = computed(() => !!multiplayerOptionGroup.value)

const breadcrumbItems = computed(() => {
  const items = Array.isArray(routeBreadcrumbs.value) ? routeBreadcrumbs.value : []
  return items.map((item, index) => ({
    ...item,
    dividerType: items[index + 1]?.isMinorRoute ? MINOR_ROUTE_DIVIDER_TYPE : item.dividerType,
  }))
})

const isNavigableRouteBreadcrumb = item => {
  return typeof item?.routeName === "string"
    && item.routeName.length > 0
    && !item.decorator
    && !item.abstract
}

const onBreadcrumbClick = async item => {
  if (!item) return

  if (!isNavigableRouteBreadcrumb(item)) return
  await lua.extensions.ui_router.navigate(item.routeName, null, null)
}

// Use the composable
const {
  configData,
  button,
  error,
  hasOptions,
  canConfigureOptions,
  initialize,
  handleButtonClick,
  selectSpawnPoint,
  selectVehicle,
  loadConfiguration,
} = useFreeroamConfigurator()

// Redirect away from the multiplayer route when multiplayer is unavailable
// (simple menu, or the multiplayer option group is not present at all).
watch(
  [isSimpleMenu, currentWizardRouteName, isMultiplayerAvailable],
  ([simpleMenuEnabled, routeName, multiplayerAvailable]) => {
    const selectorState = resolveWizardSelectorState(routeName)
    if (selectorState !== "multiplayer") return
    if (!simpleMenuEnabled && multiplayerAvailable) return

    void navigateToWizardSelectorState("options")
  },
  { immediate: true }
)

const isLevelGridActive = computed(() => step.value === "level")
const isVehicleGridActive = computed(() => step.value === "vehicle")

// True on the concrete spawn-point route (selectorState "location" ->
// "menu.freeroamLevels.level"). The level grid uses this to hide
// the Advanced details panel/tab while spawn points are displayed.
const isDisplayingSpawnPoint = computed(() => wizardSelectorState.value === "location")

// True on the concrete vehicle config route (selectorState "vehicle" ->
// "menu.freeroamLevels.vehicles.vehicle"). The vehicle grid uses this to
// preselect VehicleDetails on focus, matching the VehicleSelectorPause
// focus-to-details behavior.
const isDisplayingVehicleConfig = computed(() => wizardSelectorState.value === "vehicle")

const buildVehicleGridPanelProps = () => {
  return {
    enabled: isVehicleGridActive.value,
    showTasklistPanel: tasklistStore.hasItems && tasklistStore.visibleIn.gridSelector,
    tasklistComponent: tasklist,
    initialSnapshot: initialActiveStepSnapshot.value,
    onOverrideSelectItem: (...args) => overrideSelectItem("vehicle", ...args),
    onPreviewSelectItem: item => previewSelectItem("vehicle", item),
    requestNavigation: onGridNavigateRequest,
    requestBackFromGrid: onBackFromGrid,
    requestItemDoubleClick: onGridItemDoubleClick,
    isDisplayingVehicleConfig: isDisplayingVehicleConfig.value,
  }
}
const buildLevelGridPanelProps = () => {
  return {
    enabled: isLevelGridActive.value,
    showTasklistPanel: tasklistStore.hasItems && tasklistStore.visibleIn.gridSelector,
    tasklistComponent: tasklist,
    initialSnapshot: initialActiveStepSnapshot.value,
    onOverrideSelectItem: (...args) => overrideSelectItem("level", ...args),
    onPreviewSelectItem: item => previewSelectItem("level", item),
    requestNavigation: onGridNavigateRequest,
    requestBackFromGrid: onBackFromGrid,
    requestItemDoubleClick: onGridItemDoubleClick,
    isDisplayingSpawnPoint: isDisplayingSpawnPoint.value,
  }
}
const activePanelComponent = computed(() => {
  if (step.value === "options" && !configData.value) {
    return null
  }
  return PANEL_COMPONENTS_BY_STEP[step.value] || null
})
const activePanelRef = computed(() => {
  if (step.value === "vehicle") {
    return vehicleGridSelectorRef
  }
  if (step.value === "level") {
    return levelGridSelectorRef
  }
  return null
})
const activePanelProps = computed(() => {
  if (step.value === "level") {
    return buildLevelGridPanelProps()
  }
  if (step.value === "vehicle") {
    return buildVehicleGridPanelProps()
  }
  if (step.value === "options") {
    return {
      configData: configData.value,
      hasOptions: hasOptions.value,
      canConfigureOptions: canConfigureOptions.value,
      onBack: goBack,
    }
  }
  if (step.value === "multiplayer") {
    return {
      multiplayerGroup: multiplayerOptionGroup.value,
      onBack: goBack,
    }
  }
  return EMPTY_PANEL_PROPS
})
const activePanelListeners = computed(() => {
  if (step.value === "options") {
    return {
      "spawn-point-click": onSpawnPointTileClick,
      "vehicle-click": onVehicleTileClick,
      "navigate-step": onOptionsStepNavigate,
    }
  }
  return EMPTY_PANEL_LISTENERS
})

watch(step, currentStep => {
  // this helps to update the options depending on the selected level/vehicle
  if (["options", "multiplayer"].includes(currentStep)) {
    loadConfiguration()
    // Reactivate the wizard scope when showing options panel
    scopedNav.resumeScope(WIZARD_SCOPE_ID)
  }
})

const selectVehicleAndNavigateToOptions = async ({ model, config, additionalData = {}, key } = {}) => {
  if (!model || !config) {
    logger.error("selectVehicleAndNavigateToOptions: Missing vehicle model/config")
    return false
  }

  const success = await selectVehicle(model, config, additionalData, key)
  if (!success) {
    return false
  }

  await navigateToWizardStep("options")
  return true
}

// Resolves the leaf details payload from a wizard selection item. Tiles in the
// grid expose details via `showDetails` (focused tile) or `doubleClickDetails`
// (e.g. Recent vehicle tile). Controller paths may already pass the flat
// details payload (e.g. `{ levelName, spawnPointObjectName, key }`).
const getSelectionDetails = (item) => {
  if (!item || typeof item !== "object") return null
  if (item.showDetails && typeof item.showDetails === "object") return item.showDetails
  if (item.doubleClickDetails && typeof item.doubleClickDetails === "object") return item.doubleClickDetails
  return item
}

// Discriminates between a pre-built paint additionalData payload (flat
// `{ paint, paint2, paint3 }`) and a selectedPaint tile object (which carries
// extra metadata like `baseColor`/`paintString`).
const isPaintAdditionalData = (value) => {
  if (!value || typeof value !== "object") return false
  if (value.baseColor || value.paintString || value.paintNames) return false
  return "paint" in value || "paint2" in value || "paint3" in value
}

const previewSelectItem = async (selectedStep, item) => {
  const details = getSelectionDetails(item)
  if (selectedStep === "level") {
    if (!details?.levelName) return false
    const success = await selectSpawnPoint(
      details.levelName,
      details.spawnPointObjectName,
      item?.key ?? details.key
    )
    if (success) {
      levelGridSelectorRef.value?.markCurrentSelection?.(details)
    }
    return success
  }

  if (selectedStep === "vehicle") {
    if (!details?.model || !details?.config) return false
    const success = await selectVehicle(details.model, details.config, {}, item?.key ?? details.key)
    if (success) {
      vehicleGridSelectorRef.value?.markCurrentSelection?.(details)
    }
    return success
  }

  return false
}

const overrideSelectItem = async (_selectedStep, ...args) => {
  if (step.value === "level") {
    const item = args[0]
    const details = getSelectionDetails(item)

    if (!details?.levelName) {
      logger.error("overrideSelectItem: Invalid item data for level selection")
      return null
    }

    const success = await selectSpawnPoint(
      details.levelName,
      details.spawnPointObjectName,
      item?.key ?? details.key
    )

    if (success) {
      await navigateToWizardSelectorState("vehicles")
    }
  } else if (step.value === "vehicle") {
    const item = args[0]
    const details = getSelectionDetails(item)
    if (!details?.model || !details?.config) {
      logger.error("overrideSelectItem: Invalid item data for vehicle selection")
      return null
    }

    // Paint commits arrive in two shapes:
    //   - Next Step button: (item, selectedPaint, selectedMultiPaint)
    //   - Controller paint tile commit: (item, additionalData)
    let additionalData = {}
    const secondArg = args[1]
    if (isPaintAdditionalData(secondArg)) {
      additionalData = { ...secondArg }
    } else {
      const selectedPaint = secondArg
      const selectedMultiPaint = args[2]
      if (selectedMultiPaint?.paintNames) {
        additionalData.paint = selectedMultiPaint.paintNames[0]
        additionalData.paint2 = selectedMultiPaint.paintNames[1]
        additionalData.paint3 = selectedMultiPaint.paintNames[2]
      } else if (selectedPaint?.name) {
        additionalData.paint = selectedPaint.name
      }
    }

    await selectVehicleAndNavigateToOptions({
      model: details.model,
      config: details.config,
      additionalData,
      key: item?.key ?? details.key,
    })
  }
  return null
}

const getLevelMetaFilterFromGotoPath = gotoPath => {
  if (!Array.isArray(gotoPath)) return null
  for (let index = gotoPath.length - 1; index >= 0; index -= 1) {
    const segment = gotoPath[index]
    if (segment === "Recent" || segment === "Favourites") {
      return segment
    }
  }
  return null
}

const buildLevelDetailRoutePath = (gotoPath, itemDetails) => {
  const levelName = itemDetails?.levelName
  if (!hasRouteParamValue(levelName)) return null

  const metaMode = getLevelMetaFilterFromGotoPath(gotoPath)
  const keys = metaMode
    ? ["spawnPointsForLevel", levelName, metaMode]
    : ["spawnPointsForLevel", levelName]
  return { keys }
}

const buildVehicleDetailRoutePath = gotoPath => {
  if (!Array.isArray(gotoPath) || gotoPath.length === 0) return null
  const [pathType, modelKey] = gotoPath
  if (pathType !== "configsForBrandSubModelOrModel" && pathType !== "configsForModel") return null
  if (!hasRouteParamValue(modelKey)) return null
  const keys = gotoPath
    .map(normalizeWizardPathSegment)
    .filter(segment => segment !== null)
  return keys.length > 0 ? { keys } : null
}

const getWizardNavigationTargetFromGridRequest = navigationRequest => {
  const gotoPath = Array.isArray(navigationRequest?.gotoPath)
    ? navigationRequest.gotoPath
    : (Array.isArray(navigationRequest?.item?.gotoPath) ? navigationRequest.item.gotoPath : null)
  if (!Array.isArray(gotoPath) || gotoPath.length === 0) {
    return null
  }

  const item = navigationRequest?.item || null
  const itemDetails = getSelectionDetails(item) || {}
  const [pathType, firstArg, secondArg, thirdArg, fourthArg] = gotoPath
  if (pathType === "allFreeroam" || pathType === "allGameplay") {
    return {
      item,
      selectorState: "locations",
      selectionAction: "none",
    }
  }
  if (
    pathType === "detailGameplay"
    && firstArg === "automatic"
    && secondArg === "freeroam"
    && (
      (thirdArg === "level" && hasRouteParamValue(fourthArg))
      || hasRouteParamValue(itemDetails.levelName)
    )
  ) {
    return {
      item,
      selectorState: "location",
      selectionAction: "setLevel",
      routePath: buildLevelDetailRoutePath(gotoPath, itemDetails),
    }
  }
  if (pathType === "spawnPointsForLevel" && hasRouteParamValue(firstArg)) {
    return {
      item,
      selectorState: "location",
      selectionAction: "setLevel",
      routePath: buildLevelDetailRoutePath(gotoPath, itemDetails),
    }
  }
  if (pathType === "allModels") {
    return {
      item,
      selectorState: "vehicles",
      selectionAction: "setVehicle",
    }
  }
  if (["configsForBrandSubModelOrModel", "configsForModel"].includes(pathType) && hasRouteParamValue(firstArg)) {
    return {
      item,
      selectorState: "vehicle",
      selectionAction: "setVehicle",
      routePath: buildVehicleDetailRoutePath(gotoPath),
    }
  }

  return null
}

const syncCurrentConfigurationForGridNavigation = async navigationTarget => {
  const item = navigationTarget?.item
  const details = getSelectionDetails(item) || {}
  if (navigationTarget?.selectionAction === "setLevel") {
    if (!hasRouteParamValue(details.levelName)) {
      logger.warn("syncCurrentConfigurationForGridNavigation: Missing level metadata on selected tile", item)
      return
    }
    const spawnPointObjectName = hasRouteParamValue(details.spawnPointObjectName) ? details.spawnPointObjectName : undefined
    const success = await selectSpawnPoint(details.levelName, spawnPointObjectName, item?.key)
    if (!success) {
      logger.warn("syncCurrentConfigurationForGridNavigation: Failed to sync current level selection", details)
    }
    return
  }

  if (navigationTarget?.selectionAction === "setVehicle") {
    if (!hasRouteParamValue(details.model)) {
      logger.warn("syncCurrentConfigurationForGridNavigation: Missing vehicle model metadata on selected tile", item)
      return
    }
    const success = await selectVehicle(details.model, details.config, {}, item?.key)
    if (!success) {
      logger.warn("syncCurrentConfigurationForGridNavigation: Failed to sync current vehicle selection", details)
    }
  }
}

async function onGridNavigateRequest(navigationRequest) {
  if (typeof navigationRequest?.preventDefault === "function") {
    navigationRequest.preventDefault()
  }

  const navigationTarget = getWizardNavigationTargetFromGridRequest(navigationRequest)
  if (!navigationTarget) {
    logger.warn("onGridNavigateRequest: Unsupported wizard grid navigation request", navigationRequest)
    return
  }

  try {
    const selectionContext = getWizardSelectionContext()
    // logger.debug("FreeroamWizard.navigation.gridRequest", {
    //   routeName: getCurrentWizardRouteName(),
    //   step: step.value,
    //   restoredPath: buildWizardPathForActiveRouteStep(step.value),
    //   selection: {
    //     levelName: selectionContext.levelName || null,
    //     vehicleModel: selectionContext?.vehicle?.model || null,
    //   },
    //   activeSearchText: getWizardSearchForStep(step.value),
    //   activeFilters: getWizardFiltersForStep(step.value),
    //   targetSelectorState: navigationTarget.selectorState,
    //   selectionAction: navigationTarget.selectionAction || null,
    // })
    await syncCurrentConfigurationForGridNavigation(navigationTarget)
    const routeParams = navigationTarget.routePath ? { path: navigationTarget.routePath } : null
    await navigateToWizardSelectorState(navigationTarget.selectorState, null, routeParams)
  } catch (error) {
    logger.error("onGridNavigateRequest: Failed to navigate from grid request", error)
  }
}

async function onGridItemDoubleClick(payload) {
  if (typeof payload?.preventDefault === "function") {
    payload.preventDefault()
  }

  const item = payload?.item
  const details = payload?.details
  if (!item || !details) {
    logger.error("onGridItemDoubleClick: Invalid item data", payload)
    return
  }

  if (details.levelName) {
    const success = await selectSpawnPoint(
      details.levelName,
      details.spawnPointObjectName,
      item.key
    )

    if (success) {
      await navigateToWizardSelectorState("vehicles")
    }
  } else if (isRecentConcreteVehicleTile(item) || (details.model && details.config)) {
    await selectVehicleAndNavigateToOptions({
      model: details.model,
      config: details.config,
      additionalData: {},
      key: item.key,
    })
  }
}

function onBackFromGrid(backEvent) {
  if (typeof backEvent?.preventDefault === "function") {
    backEvent.preventDefault()
  }
  return goBack()
}

// At the wizard root route, let `menu` bubble to the global UINav handler so it
// can exit the menu. On any nested wizard step, consume it and navigate back.
function onMenuUiNav() {
  if (currentWizardRouteName.value === "pause.freeroamLevels") {
    return true
  }
  return goBack()
}

const navigateToPreviousWizardSelectorState = async (_currentSelectorState, previousSelectorState, backOptions = null) => {
  await navigateToWizardSelectorState(previousSelectorState, backOptions)
}

const goBack = () => {
  const currentSelectorState = wizardSelectorState.value
  const previousSelectorState = resolvePreviousWizardSelectorState(currentSelectorState)
  if (previousSelectorState) {
    const backOptions = getWizardStepConfig(currentSelectorState)?.backOptions || null
    navigateToPreviousWizardSelectorState(currentSelectorState, previousSelectorState, backOptions)
    return false
  }

  // Root-level fallback keeps route exit behavior delegated to Lua.
  lua.extensions.ui_router.back()
  return false
}

const onSpawnPointTileClick = async () => {
  await navigateToWizardSelectorState("locations")
}

const onVehicleTileClick = async (clearSearch = false) => {
  if (clearSearch && typeof vehicleGridSelectorRef.value?.clearSearchAndFilters === "function") {
    await vehicleGridSelectorRef.value.clearSearchAndFilters()
  }
  await navigateToWizardSelectorState("vehicles")
}

const onOptionsTileClick = async () => {
  await navigateToWizardStep("options")
}

const onMultiplayerTileClick = async () => {
  if (isSimpleMenu.value || !isMultiplayerAvailable.value) return

  await navigateToWizardStep("multiplayer")
}

const onOptionsStepNavigate = async (targetStep) => {
  await navigateToWizardStep(targetStep)
}

const onStartButtonClick = async (buttonId) => {
  isLoading.value = true
  events.emit("LoadingScreen", { active: true })
  await startLoading(async () => {
    await waitForLoadingScreenFadeIn()
    await handleButtonClick(buttonId)
  })
}

// Helper function to convert factory paint to BngPaintTile format
function convertPaintToTileFormat(paint) {
  if (!paint) return null

  // If paint already has the expected format, return as is
  if (paint.baseColor && paint.paintString) {
    return paint
  }

  // Convert to Paint object if needed
  try {
    const paintObj = new Paint()
    paintObj.paint = paint
    return paintObj.paintObject
  } catch (error) {
    console.warn("Failed to convert paint:", paint, error)
    return null
  }
}

// Get paint data for vehicle preview
const vehiclePaintData = computed(() => {
  const vehicle = configData.value?.currentVehicle
  if (!vehicle?.additionalData?.paint || !vehicle?.paints?.factoryPaints) {
    return null
  }

  const additionalData = vehicle.additionalData
  const factoryPaints = vehicle.paints.factoryPaints

  const paintNames = [
    additionalData.paint,
    additionalData.paint2,
    additionalData.paint3
  ].filter(name => name) // Remove undefined/null values

  const paints = paintNames
    .map(name => {
      const paint = factoryPaints.find(p => p.name === name)
      return paint ? convertPaintToTileFormat(paint) : null
    })
    .filter(paint => paint !== null)

  if (paints.length === 0) return null

  return {
    paint: paintNames[0], // Primary paint name
    paintNames: paintNames,
    paints: paints
  }
})

const initialStepSnapshotByStep = ref({ level: null, vehicle: null })
const lastHydratedRouteFullPath = ref("")

const initialActiveStepSnapshot = computed(() => {
  const stepName = step.value
  if (stepName !== "level" && stepName !== "vehicle") return null
  return initialStepSnapshotByStep.value[stepName] || null
})

// Reset cached snapshots when fullPath changes so a stale snapshot from a
// previous route does not bleed into the next mount.
watch(
  () => route.fullPath,
  () => {
    initialStepSnapshotByStep.value = { level: null, vehicle: null }
    lastHydratedRouteFullPath.value = ""
  },
)

watch(
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "mounted-ready") return
    if (!routeName || !route.name || !routeName.endsWith(route.name)) return
    if (lastHydratedRouteFullPath.value === route.fullPath) return

    lastHydratedRouteFullPath.value = route.fullPath
    await nextTick()

    const wizardData = routeDataStore.data?.freeroamWizard || {}
    const gridSnapshots = wizardData.gridSnapshots || {}
    initialStepSnapshotByStep.value = {
      level: gridSnapshots.level || null,
      vehicle: gridSnapshots.vehicle || null,
    }
    // logger.debug("FreeroamWizard.hydration.mountedReady", {
    //   routeName,
    //   routeFullPath: route.fullPath,
    //   step: step.value,
    //   hasLevelSnapshot: !!gridSnapshots.level,
    //   hasVehicleSnapshot: !!gridSnapshots.vehicle,
    // })

    const activeGridSelectorRef = step.value === "vehicle"
      ? vehicleGridSelectorRef
      : (step.value === "level" ? levelGridSelectorRef : null)
    if (activeGridSelectorRef) {
      const gridSelector = activeGridSelectorRef.value
      if (gridSelector) {
        await nextTick()
        // if controller i used, scroll to the autofocus tile
        // otherwise, scroll to the top
        if (isControllerUsed.value) {
          const focusKey = gridSelector.autoFocusKey?.value ?? gridSelector.autoFocusKey ?? null
          if (focusKey) {
            await gridSelector.scrollToAutoFocusTile?.()
            scopedNav.requestScopeFocus("grid", { reason: `freeroam-${step.value}-grid-route-hydrated` })
          }
        } else {
          gridSelector.scrollToTop?.()
        }
      }
    }
  },
  { immediate: true },
)

// Initialize on mount
onMounted(() => {
  initialize()
})
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

// ROOT COMPONENT
.freeroam-configurator {
  pointer-events: none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: visible;
  width: 100%;
  justify-content: center;
  > * {
    pointer-events: auto;
    gap: 0.25em;
    overflow: visible;
    justify-content: center;
  }
}

// MAIN CONTENT CONTAINER
.configurator-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
}

// HEADER SECTION
.configurator-heading {
  position: relative;
  margin-top: 0;
  flex-direction: row;
  display: flex;
}

.configurator-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: visible;
  min-height: 0;
}

// ERROR STATE
.error-state {
  position: relative;
  background-color: var(--bng-black-o4);
  border-radius: var(--bng-corners-2);
  min-height: 20rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: white;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  color: var(--bng-add-red-400);
}

.configurator-content {
  &.hold-start {
    :deep(.play-button) {
      .background::after,
      &.focus-visible::before {
        background-position-x: 90%;
        transition-duration: 0s;
      }

      .hold-arrow {
        top: -0.15em;
      }
    }
  }

  &.hold-active {
    :deep(.play-button) {
      .background::before {
        background-color: var(--bng-orange-200);
        transition-delay: calc(var(--hold-time, 1s) * 0.65);
      }

      .background::after,
      &.focus-visible::before {
        background-position-x: 0%;
        transition: background-position-x var(--hold-time, 1s);
      }
    }
  }
}

</style>
