import { ref, computed } from "vue"
import { useRoute } from "vue-router"
import { useEvents } from "@/services/events"
import { $translate, $content, useRouteDataStore } from "@/services"

const DEFAULT_BUTTON_TEXT = "ui.scenarios.start.start"

function rows2cols(d) {
  if (!d || !Array.isArray(d.labels)) return []
  return d.labels.map((label, i) => [
    { label },
    ...(Array.isArray(d.rows) ? d.rows : []).map(arr => arr[i]),
  ])
}

function loadJsSource(jsSource) {
  if (!jsSource) return Promise.resolve()
  return new Promise(resolve => {
    try {
      const script = document.createElement("script")
      script.src = (jsSource.startsWith("/") ? "" : "/") + jsSource
      script.async = true
      script.onload = () => resolve()
      script.onerror = err => {
        console.error("[ScenarioStart] Failed to load jsSource", jsSource, err)
        resolve()
      }
      document.head.appendChild(script)
    } catch (err) {
      console.error("[ScenarioStart] Error loading jsSource", jsSource, err)
      resolve()
    }
  })
}

export function useScenarioStartData({ onSelectableVehicleData } = {}) {
  const route = useRoute()
  const events = useEvents()
  const routeDataStore = useRouteDataStore()

  const data = ref(null)
  const showStartButton = ref(true)

  const introType = computed(() => data.value?.introType || null)
  const buttonText = computed(() => data.value?.buttonText || DEFAULT_BUTTON_TEXT)
  const exitButtonText = computed(() => data.value?.exitButtonText)
  const name = computed(() => data.value?.name || "")
  const descriptionHtml = computed(() => data.value?.description || "")
  const portraitText = computed(() => data.value?.portraitText || data.value?.description || "")
  const portraitImg = computed(() => data.value?.portraitImg || null)
  const extraButtons = computed(() => Array.isArray(data.value?.extraButtons) ? data.value.extraButtons : [])
  const userCheckSettings = computed(() => data.value?.userCheckSettings || null)
  const formattedProgress = computed(() => data.value?.formattedProgress || null)
  const formattedStars = computed(() => data.value?.formattedStars || null)
  const progressKeyTranslations = computed(() => data.value?.progressKeyTranslations || {})
  const formattedProgressKey = computed(() => data.value?.formattedProgressKey)
  const leaderboardKey = computed(() => data.value?.leaderboardKey)
  const startHTMLHref = computed(() => {
    if (!data.value?.startHTML) return null
    const dir = data.value.directory || ""
    return (dir ? dir + "/" : "") + data.value.startHTML
  })
  const callObj = computed(() => data.value?.callObj || "scenario_scenarios")
  const readyHook = computed(() => data.value?.readyHook || null)
  const exitHook = computed(() => data.value?.exitHook || null)

  function applyData(rawData) {
    if (!rawData || typeof rawData !== "object") return
    if (rawData.buttonText === undefined) {
      rawData.buttonText = DEFAULT_BUTTON_TEXT
    }

    const next = { ...rawData }

    if (next.multiDescription) {
      next.description = $translate.multiContextTranslate(next.multiDescription)
    } else if (next.description) {
      next.description = $translate.contextTranslate(next.description)
    }

    if (next.name) {
      next.name = $translate.contextTranslate(next.name)
    }

    if (next.leaderboardKey && next.formattedProgress) {
      next.formattedProgress = { ...next.formattedProgress }
      next.formattedProgress.ownAggregateCols = rows2cols(next.formattedProgress.ownAggregate)
      next.formattedProgress.attemptsCols = rows2cols(next.formattedProgress.attempts)
    }

    if (next.description) {
      next.description = $content.bbcode.parse(next.description)
    }

    if (next.introType === "portrait" && !next.portraitText) {
      next.portraitText = next.description
    }

    data.value = next

    if (next.introType === "selectableVehicle" && next.vehicle && next.vehicle.config && next.vehicle.model) {
      onSelectableVehicleData?.(next.vehicle)
    }
  }

  async function handleScenarioChange(rawData) {
    if (!rawData || (typeof rawData === "object" && Object.keys(rawData).length === 0)) return
    if (rawData.jsSource !== undefined) {
      await loadJsSource(rawData.jsSource)
    }
    applyData(rawData)
  }

  function init() {
    const immediate = route.params?.data || routeDataStore.data
    if (immediate && immediate.showDataImmediately) {
      handleScenarioChange(immediate)
    } else {
      events.on("ScenarioChange", handleScenarioChange)
    }
  }

  function setShowStartButton(value) {
    showStartButton.value = !!value
  }
  events.on("scenarioStart:showStartButton", setShowStartButton)

  return {
    data,
    introType,
    buttonText,
    exitButtonText,
    name,
    descriptionHtml,
    portraitText,
    portraitImg,
    extraButtons,
    userCheckSettings,
    formattedProgress,
    formattedStars,
    progressKeyTranslations,
    formattedProgressKey,
    leaderboardKey,
    startHTMLHref,
    callObj,
    readyHook,
    exitHook,
    showStartButton,
    init,
    handleScenarioChange,
  }
}
