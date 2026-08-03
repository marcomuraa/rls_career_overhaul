<template>
  <div
    v-if="selectedPoi"
    class="poi-details"
    v-bng-blur="true"
  >
    <template v-if="selectedPoisList.length > 1">
      <div class="poi-icons-wrapper">
        <BngBinding
          class="poi-icon-binding"
          ui-event="tab_l"
          controller
        />
        <div class="poi-icons">
          <div
            v-for="(poi, index) in selectedPoisList"
            :key="poi.id || index"
            class="poi-icon"
            :class="{ 'active': index === currentPoiIndex }"
            @click="selectPoi(index)"
          >
            <BngSpriteIcon :src="'map_' + poi.spriteIcon" style="width: 100%; height: 100%" />
          </div>
        </div>
        <BngBinding
          class="poi-icon-binding"
          ui-event="tab_r"
          controller
        />
      </div>
    </template>
    <div class="poi-details-header-wrapper">
      <BngScreenHeadingV2 type="3" class="poi-details-header">
        {{ safeTranslate(selectedPoi.name) }}
      </BngScreenHeadingV2>
    </div>
    <div class="poi-content-section">
      <div class="poi-scrollable">
        <AspectRatio
          v-if="preview"
          class="poi-thumbnail"
          ratio="16:9"
          :external-image="preview"
          image-mode="cover"
        >
          <div class="poi-aggregate-display" v-if="aggregatePrimary || selectedPoi.formattedProgress">
            <div class="poi-stars" v-if="selectedPoi.formattedProgress">
              <div class="stars">
                <BngMainStars
                  v-if="defaultStars"
                  :individual-stars="defaultStars"
                  class="main-stars"
                  :scale="0.8"
                  reverse
                />
                <BngMainStars
                  v-if="bonusStars && unlockedStars?.totalBonusStarCount"
                  :individual-stars="bonusStars"
                  class="bonus-stars"
                  :scale="0.8"
                />
              </div>
            </div>
            <div v-else-if="aggregatePrimary" class="aggregate-primary">
              <span class="label">{{ $t(aggregatePrimary.label) }}:</span>
              <span class="value">{{ $t(aggregatePrimary.value) }}</span>
            </div>
          </div>
        </AspectRatio>

        <div class="poi-description" v-if="selectedPoi.description">
          <template v-for="(part, i) in descriptionParts" :key="`desc-${i}`">
            <span v-if="part.t === 'text'" class="poi-inline-text" v-html="part.v" />
            <BngBinding v-else :action="part.action" show-unassigned />
          </template>
        </div>

        <VehicleClassRequirementPanel
          :required-vehicle-class="selectedPoi.requiredVehicleClass"
          :current-vehicle-class="selectedPoi.defaultVehicleClass"
          :state="selectedPoi.requirementState || 'auto'"
          variant="overlay"
          sticker-size="md"
          badge-size="2.5rem"
        />
      </div>
    </div>
    <div class="poi-actions">
      <BngButton
        v-for="action in visibleActions"
        :key="action.id"
        :icon-left="action.icon"
        :accent="ACCENTS.secondary"
        :sound-class="action.soundClass"
        @click="onAction(action)"
      >
        {{ $tt(action.label) }}
        <BngBinding
          v-if="actionBindingEvent[action.id]"
          :ui-event="actionBindingEvent[action.id]"
          controller
        />
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { vBngBlur } from "@/common/directives"
import { computed } from "vue"
import { $translate } from "@/services/translation"
import { $content } from "@/services"
import { BngButton, BngBinding, ACCENTS, BngSpriteIcon, BngMainStars, BngScreenHeadingV2 } from "@/common/components/base"
import AspectRatio from "@/common/components/utility/aspectRatio.vue"
import VehicleClassRequirementPanel from "@/modules/career/components/vehiclePerformance/VehicleClassRequirementPanel.vue"

const props = defineProps({
  selectedPoi: {
    type: Object,
    default: null
  },
  selectedPoiIds: {
    type: Array,
    default: () => []
  },
  poiData: {
    type: Object,
    default: () => ({})
  },
  isTaxiMode: {
    type: Boolean,
    default: false
  },
  taxiDestinationPreviewed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(["selectPoi", "executePoiAction"])

const actionBindingEvent = {
  setRoute: "ok",
  quickTravel: "action_2",
}

const selectedPoi = computed(() => props.selectedPoi || null)
const selectedPoiIds = computed(() => (Array.isArray(props.selectedPoiIds) ? props.selectedPoiIds : []))
const poiData = computed(() => props.poiData || {})

// Computed list of currently selected POIs
const selectedPoisList = computed(() => {
  if (!selectedPoiIds.value?.length) {
    return selectedPoi.value ? [selectedPoi.value] : []
  }

  // Get POIs from the selectedPoiIds list
  const pois = []
  for (const poiId of selectedPoiIds.value) {
    const poi = poiData.value[poiId]
    if (poi) {
      pois.push(poi)
    }
  }

  return pois
})

const currentPoiIndex = computed(() => {
  if (selectedPoisList.value.length <= 1) return 0

  // Find the index of the currently selected POI in the selectedPoisList
  const index = selectedPoisList.value.findIndex(poi =>
    poi.id === selectedPoi.value?.id
  )

  // return the first item if the index not found
  return Math.max(index, 0)
})

function selectPoi(index) {
  if (index >= 0 && index < selectedPoisList.value.length) {
    const newSelectedPoi = selectedPoisList.value[index]
    if (newSelectedPoi?.id) {
      emit("selectPoi", newSelectedPoi.id)
    }
  }
}

const preview = computed(() => {
  if (selectedPoi.value?.previewFiles?.length) {
    return selectedPoi.value.previewFiles[0]
  }
  return selectedPoi.value?.thumbnailFile || null
})

/**
 * translates the argument as a string or uses the $translate.contextTranslate method if it's an object
 * @param {string | {txt?: string, context?: string}} key The key to translate
 * @returns {string} empty string if the translation fails
 */
function safeTranslate(key) {
  if (!key) return ""
  try {
    if (typeof key === "string") {
      return $translate.instant(key)
    } else if (typeof key === "object" && key.txt) {
      return $translate.contextTranslate(key)
    } else {
      return $translate.contextTranslate(key)
    }
  } catch (e) {
    console.warn("Translation failed for key:", key, e)
    return typeof key === "string" ? key : (key?.txt || "")
  }
}

const localRegex = /\[action=([^\]]+)\]/gi

function partsFromText(text) {
  const raw = text != null ? String(text) : ""
  const parts = []
  localRegex.lastIndex = 0
  let lastIndex = 0
  let match

  while ((match = localRegex.exec(raw)) !== null) {
    const head = raw.slice(lastIndex, match.index)
    if (head) parts.push({ t: "text", v: $content.bbcode.parse(head) })
    parts.push({ t: "binding", action: match[1].trim() })
    lastIndex = match.index + match[0].length
  }

  const tail = raw.slice(lastIndex)
  if (tail) parts.push({ t: "text", v: $content.bbcode.parse(tail) })

  return parts.length ? parts : [{ t: "text", v: $content.bbcode.parse(raw) }]
}

const descriptionParts = computed(() => partsFromText(safeTranslate(selectedPoi.value?.description)))

const aggregatePrimary = computed(() => {
  const poi = selectedPoi.value
  return poi?.aggregatePrimary?.label && poi?.aggregatePrimary?.value ? poi.aggregatePrimary : null
})

/**
 * @param {unknown[] | object} value The value to ensure is an array
 * @returns {unknown[] | null} the input value or its Object.values or null
 */
function ensureArray(value) {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === "object") {
    return Object.values(value)
  }
  return null
}

const unlockedStars = computed(() => {
  return selectedPoi.value?.formattedProgress?.unlockedStars
})

const defaultStars = computed(() => {
  return ensureArray(unlockedStars.value?.defaults)
})

const bonusStars = computed(() => {
  return ensureArray(unlockedStars.value?.bonus)
})

const visibleActions = computed(() => {
  const actions = selectedPoi.value?.actions
  if (!actions) return []
  if (props.isTaxiMode) {
    return actions
      .filter(a => a.id !== "quickTravel")
      .map(a => {
        if (a.id === "setRoute" && props.taxiDestinationPreviewed)
          return { ...a, label: "ui.taxi.bigmap.confirmDestination" }
        return a
      })
  }
  return actions
})

function onAction(action) {
  emit("executePoiAction", action?.actionId)
}
</script>

<style lang="scss" scoped>
.poi-details {
  background-color: rgba(16, 16, 16, 0.5);
  border-radius: 0.5rem 0 0 0.5rem;
  color: var(--bng-off-white);
  display: flex;
  flex-direction: column;
  overflow: visible;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
}

.poi-content-section {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  flex-shrink: 0;
}

.poi-icons-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  background-color: rgba(16, 16, 16, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  min-height: fit-content;
  border-radius: 0.5rem 0 0 0;
}

.poi-icons {
  flex: 1 1 auto;
  gap: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  overflow-x: auto;
  justify-content: center;
  padding: 0.5rem;
}

.poi-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  border: 2px solid transparent;
  background-color: rgba(16, 16, 16, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--bng-cool-gray-700);
  }

  &.active {
    background-color: var(--bng-cool-gray-600);
    border-color: var(--bng-orange-500);
  }
}

.poi-icon-binding {
  align-self: center;
  justify-self: flex-start;
  flex: 0 0 auto;
  font-size: 0.9rem;
  padding: 0.5rem;
}

.poi-icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
}

.poi-icon-placeholder {
  width: 100%;
  height: 100%;
  background-color: rgba(16, 16, 16, 0.5);
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  color: var(--bng-cool-gray-300);
}

.poi-scrollable {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.poi-details-header-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
  background-color: rgba(16, 16, 16, 0.75);
  --bng-heading-background-opacity: 0;
  min-height: 3.6rem;
  flex: 0 0 auto;
  width: 100%;
  padding: 0 0.5rem;
  flex-wrap: wrap;
}

.poi-details-header {
  --bng-heading-background-opacity: 0;
  flex: 1 1 auto;
  min-width: 0;
  margin-left: -0.5rem;

  :deep(.header) {
    > h1 {
      font-weight: 1000 !important;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
  }
}

.poi-thumbnail {
  border-radius: 0.5rem;
}

.poi-description {
  flex: 0;
  background-color: rgba(16, 16, 16, 0.6);
  border-radius: 0.5rem;
  padding: 0.5rem;
  text-align: justify;
  position: relative;
  line-height: 1.5;
  color: var(--bng-off-white);
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.poi-inline-text {
  color: inherit;
}

.poi-aggregate-display {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 1;
}

.aggregate-primary {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(16, 16, 16, 0.6);
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;

  .label {
    font-weight: 300;
  }
}

.stars {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  & > * {
    min-height: fit-content;
    max-width: fit-content;
    background-color: rgba(16, 16, 16, 0.6);
    border-radius: 0.5rem;
  }
  > .main-stars {
    --star-color: var(--bng-ter-yellow-50);
  }
  > .bonus-stars {
    --star-color: var(--bng-add-blue-400);
  }
}

.poi-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(16, 16, 16, 0.6);
  border-radius: 0.25rem;
  flex-wrap: wrap;
}

.stat-label {
  font-weight: 600;
  color: var(--bng-orange-300);
  min-width: 100px;
}

.stat-value {
  color: var(--bng-off-white);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.poi-actions {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  :deep(.bng-button) {
    max-width: unset;
    width: calc(100% - 0.25rem);
  }

  :deep(.binding-wrapper) {
    margin-left: 0.25rem;
  }
}
</style>