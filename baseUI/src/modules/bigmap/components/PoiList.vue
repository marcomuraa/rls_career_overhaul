<template>
  <div
    v-if="displayMode !== POI_LIST_DISPLAY_MODE.HIDDEN"
    class="poi-list"
    v-bng-blur="true"
  >
    <div v-if="displayMode === POI_LIST_DISPLAY_MODE.SIMPLE" class="poi-list-content" ref="poiListContainer">
      <div class="poi-list-simple">
        <template v-for="section in props.groupData" :key="section.key">
          <template v-for="group in section.groups" :key="group.key">
            <div v-if="visibleGroups.has(group.key) && group.elementIds?.length" class="simple-group">
              <div class="simple-group-header">
                <BngCardHeading class="header-label">{{ $tt(group.label) }}</BngCardHeading>
                <div class="header-line"></div>
              </div>
              <div class="poi-list-items">
                <template v-for="poiId in group.elementIds" :key="poiId">
                  <PoiCard
                    v-if="processedPoiData[poiId]"
                    v-show="!props.selectedPoiIds || props.selectedPoiIds.length <= 1 || props.selectedPoiIds.includes(poiId)"
                    :data-poi-id="poiId"
                    :shown="shownCards.has(poiId)"
                    :poi="processedPoiData[poiId]"
                    @select="onSelectPoi"
                    @hover="onHover"
                  />
                </template>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <div v-else-if="displayMode === POI_LIST_DISPLAY_MODE.TREE" class="poi-list-content" ref="poiListContainer">
      <Accordion class="sections-accordion">
        <AccordionItem
          v-for="section in props.groupData"
          :key="section.key"
          class="filter-section"
          navigable
          arrow-big
          expand-hint-inline
          :expand-on-context="false"
          :expanded="sectionsToExpand.has(section.key)"
          @expanded="(expanded) => setSectionExpanded(section.key, expanded)"
        >
          <template #caption>
            <div class="accordion-header" :class="{ expanded: sectionsToExpand.has(section.key) }">
              <BngIcon :type="section.icon" />
              <span>{{ section.title ? $tt(section.title) : '' }}</span>
            </div>
          </template>

          <Accordion class="groups-accordion">
            <AccordionItem
              v-for="group in section.groups"
              v-show="visibleGroups.has(group.key)"
              :key="group.key"
              class="mission-group"
              navigable
              arrow-big
              expand-hint-inline
              :expand-on-context="false"
              :expanded="groupsToExpand.has(group.key)"
              @expanded="(expanded) => setGroupExpanded(group.key, expanded)"
            >
              <template #caption>
                <div class="accordion-header" :class="{ expanded: groupsToExpand.has(group.key) }">
                  <BngIcon :type="group.icon || 'info'" />
                  <span>{{ $tt(group.label) }}</span>
                </div>
              </template>

              <div class="poi-list-items">
                <template v-for="poiId in group.elementIds" :key="poiId">
                  <PoiCard
                    v-if="processedPoiData[poiId]"
                    v-show="!props.selectedPoiIds || props.selectedPoiIds.length <= 1 || props.selectedPoiIds.includes(poiId)"
                    :data-poi-id="poiId"
                    :shown="shownCards.has(poiId)"
                    :poi="processedPoiData[poiId]"
                    @select="onSelectPoi"
                    @hover="onHover"
                  />
                </template>
              </div>
            </AccordionItem>
          </Accordion>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from "vue"
import { vBngBlur } from "@/common/directives"
import { BngIcon, icons } from "@/common/components/base"
import BngCardHeading from "@/common/components/base/bngCardHeading.vue"
import { Accordion, AccordionItem } from "@/common/components/utility"
import PoiCard from "./PoiCard.vue"
import { $translate } from "@/services/translation"
import { POI_LIST_DISPLAY_MODE } from "../constants"

const props = defineProps({
  groupData: {
    type: Array,
    default: () => []
  },
  poiData: {
    type: Object,
    default: () => ({})
  },
  selectedPoi: {
    type: Object,
    default: null
  },
  selectedPoiIds: {
    type: Array,
    default: () => []
  },
  poiListDisplayMode: {
    type: String,
    default: POI_LIST_DISPLAY_MODE.TREE
  }
})

const emit = defineEmits(["selectPoi", "hoverPoi"])

const poiListContainer = ref(null)
const shownCards = ref(new Set())
const expandedSections = ref(new Set())
const expandedGroups = ref(new Set())

// Persistent storage for expanded state (survives data changes)
const persistentSectionState = ref(new Map())
const persistentGroupState = ref(new Map())

// Storage for state before POI selection (to restore when deselected)
const savedSectionStateBeforeSelection = ref(new Map())
const savedGroupStateBeforeSelection = ref(new Map())

const displayMode = computed(() => props.poiListDisplayMode || POI_LIST_DISPLAY_MODE.TREE)

function getGroupData() {
  return Array.isArray(props.groupData) ? props.groupData : []
}

function getPoiData() {
  return props.poiData || {}
}

function getSelectedPoiIds() {
  return Array.isArray(props.selectedPoiIds) ? props.selectedPoiIds : []
}

// groups that should be visible (contain selected POIs)
const visibleGroups = computed(() => {
  const visible = new Set()
  const selectedPoiIds = getSelectedPoiIds()

  if (selectedPoiIds.length <= 1) {
    for (const section of getGroupData()) {
      if (section?.groups) {
        for (const group of section.groups) {
          if (group?.key) {
            visible.add(group.key)
          }
        }
      }
    }
    return visible
  }

  for (const section of getGroupData()) {
    if (section?.groups) {
      for (const group of section.groups) {
        if (group?.elementIds && Array.isArray(group.elementIds)) {
          const hasSelectedPoi = group.elementIds.some((poiId) => selectedPoiIds.includes(poiId))
          if (hasSelectedPoi) {
            visible.add(group.key)
          }
        }
      }
    }
  }
  return visible
})

// groups that should be expanded (contain selected POIs)
const groupsToExpand = computed(() => {
  const toExpand = new Set()
  const selectedPoiIds = getSelectedPoiIds()

  if (selectedPoiIds.length <= 1) {
    return expandedGroups.value
  }

  for (const section of getGroupData()) {
    if (section?.groups) {
      for (const group of section.groups) {
        if (group?.elementIds && Array.isArray(group.elementIds)) {
          const hasSelectedPoi = group.elementIds.some((poiId) => selectedPoiIds.includes(poiId))
          if (hasSelectedPoi) {
            toExpand.add(group.key)
          }
        }
      }
    }
  }
  return toExpand
})

// sections that should be expanded (contain groups with selected POIs)
const sectionsToExpand = computed(() => {
  const toExpand = new Set()
  const selectedPoiIds = getSelectedPoiIds()

  if (selectedPoiIds.length <= 1) {
    return expandedSections.value
  }

  for (const section of getGroupData()) {
    if (section?.groups) {
      const hasVisibleGroup = section.groups.some((group) => visibleGroups.value.has(group.key))
      if (hasVisibleGroup) {
        toExpand.add(section.key)
      }
    }
  }
  return toExpand
})

const onSelectPoi = (poiId) => {
  emit("selectPoi", poiId)
}

const onHover = (poiId, active) => {
  emit("hoverPoi", poiId, active)
}

const setSectionExpanded = (key, expanded) => {
  persistentSectionState.value.set(key, expanded)

  if (expanded) {
    expandedSections.value.add(key)
  } else {
    expandedSections.value.delete(key)
  }
  // Re-run observer when accordion expands to catch newly visible cards
  if (expanded) {
    nextTick(() => {
      observer.disconnect()
      setupObserver()
    })
  }
}

const setGroupExpanded = (key, expanded) => {
  persistentGroupState.value.set(key, expanded)

  if (expanded) {
    expandedGroups.value.add(key)
  } else {
    expandedGroups.value.delete(key)
  }
  // Re-run observer when accordion expands to catch newly visible cards
  if (expanded) {
    nextTick(() => {
      observer.disconnect()
      setupObserver()
    })
  }
}

// Restore expanded state when data changes
watch(() => props.groupData, (newData) => {
  if (newData && Array.isArray(newData)) {
    for (const section of newData) {
      if (section && section.key) {
        const storedState = persistentSectionState.value.has(section.key)
          ? persistentSectionState.value.get(section.key)
          : true

        if (storedState) {
          expandedSections.value.add(section.key)
        } else {
          expandedSections.value.delete(section.key)
        }

        if (section.groups && Array.isArray(section.groups)) {
          for (const group of section.groups) {
            if (group && group.key) {
              const groupStoredState = persistentGroupState.value.has(group.key)
                ? persistentGroupState.value.get(group.key)
                : (group.openByDefault === true ? true : undefined)

              if (groupStoredState === true) {
                expandedGroups.value.add(group.key)
              } else if (groupStoredState === false) {
                expandedGroups.value.delete(group.key)
              }
            }
          }
        }
      }
    }
  }
}, { immediate: true })

const previousSelectedPoiIds = ref([])

watch(() => props.selectedPoiIds, (newPoiIdsRaw, oldPoiIdsRaw) => {
  const newPoiIds = Array.isArray(newPoiIdsRaw) ? newPoiIdsRaw : []
  const oldPoiIds = Array.isArray(oldPoiIdsRaw) ? oldPoiIdsRaw : []

  const hadMultipleSelection = oldPoiIds.length > 1
  const hasMultipleSelection = newPoiIds.length > 1

  // Transitioning from 0-1 selection to multiple selection - save current state
  if (!hadMultipleSelection && hasMultipleSelection) {
    for (const section of getGroupData()) {
      if (section?.key) {
        savedSectionStateBeforeSelection.value.set(
          section.key,
          expandedSections.value.has(section.key)
        )
      }

      if (section?.groups) {
        for (const group of section.groups) {
          if (group?.key) {
            savedGroupStateBeforeSelection.value.set(
              group.key,
              expandedGroups.value.has(group.key)
            )
          }
        }
      }
    }
  }

  if (newPoiIds.length === 1) {
    const selectedPoiId = newPoiIds[0]
    for (const section of getGroupData()) {
      if (section?.groups) {
        for (const group of section.groups) {
          if (group?.elementIds && Array.isArray(group.elementIds) && group.elementIds.includes(selectedPoiId)) {
            if (!expandedGroups.value.has(group.key)) {
              expandedGroups.value.add(group.key)
            }
            if (section?.key && !expandedSections.value.has(section.key)) {
              expandedSections.value.add(section.key)
            }
            break
          }
        }
      }
    }
  } else if (hasMultipleSelection) {
    for (const section of getGroupData()) {
      if (section?.key) {
        const shouldExpand = sectionsToExpand.value.has(section.key)
        if (shouldExpand) {
          expandedSections.value.add(section.key)
        } else {
          expandedSections.value.delete(section.key)
        }
      }
    }

    for (const section of getGroupData()) {
      if (section?.groups) {
        for (const group of section.groups) {
          if (group?.key) {
            const shouldExpand = groupsToExpand.value.has(group.key)
            if (shouldExpand) {
              expandedGroups.value.add(group.key)
            }
            // groups without a selected POI keep their current expand state (never collapsed here)
          }
        }
      }
    }
  }

  previousSelectedPoiIds.value = [...newPoiIds]
}, { immediate: true })

const processedPoiData = computed(() => {
  const processed = {}
  const poiData = getPoiData()

  for (const [poiId, poi] of Object.entries(poiData)) {
    if (!poi) continue

    processed[poiId] = {
      id: poi.id || poiId,
      name: poi.name ? $translate.instant(poi.name) : "",
      icon: poi.icon ? icons[poi.icon] : null,
      thumbnail: poi.thumbnailFile || poi.thumbnail,
      formattedProgress: poi.formattedProgress,
      aggregatePrimary: poi.aggregatePrimary?.label && poi.aggregatePrimary?.value
        ? {
            label: $translate.instant(poi.aggregatePrimary.label),
            value: $translate.instant(poi.aggregatePrimary.value)
          }
        : null,
      isSelected: props.selectedPoi?.id === poi.id
    }
  }

  return processed
})

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const poiId = entry.target.getAttribute("data-poi-id")
    if (poiId && entry.isIntersecting) {
      shownCards.value.add(poiId)
    } else {
      shownCards.value.delete(poiId)
    }
  }
}, {
  threshold: 0.1,
  rootMargin: "10px"
})

const setupObserver = () => {
  if (!poiListContainer.value) return
  const elms = poiListContainer.value.querySelectorAll("[data-poi-id]")
  const ids = []
  for (const elm of elms) {
    const poiId = elm.getAttribute("data-poi-id")
    if (poiId) {
      ids.push(poiId)
      observer.observe(elm)
      // Check if element is already visible (in case observer hasn't fired yet)
      const rect = elm.getBoundingClientRect()
      const containerRect = poiListContainer.value.getBoundingClientRect()
      if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
        shownCards.value.add(poiId)
      }
    }
  }
  for (const id of shownCards.value) {
    if (!ids.includes(id)) {
      shownCards.value.delete(id)
    }
  }
}

watch(poiListContainer, (cont) => cont && nextTick(setupObserver), { immediate: true })

watch([() => props.groupData, processedPoiData, displayMode], () => {
  nextTick(() => {
    observer.disconnect()
    if (displayMode.value !== POI_LIST_DISPLAY_MODE.HIDDEN) {
      setupObserver()
    }
  })
}, { immediate: false })

// Scroll to selected POI card when it changes
watch(() => props.selectedPoi, (newPoi) => {
  if (newPoi && newPoi.id && poiListContainer.value) {
    nextTick(() => {
      const poiElement = poiListContainer.value.querySelector(`[data-poi-id="${newPoi.id}"]`)
      if (poiElement) {
        const containerRect = poiListContainer.value.getBoundingClientRect()
        const elementRect = poiElement.getBoundingClientRect()
        const isVisible = (
          elementRect.top >= containerRect.top &&
          elementRect.bottom <= containerRect.bottom
        )

        if (!isVisible) {
          poiElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
          })
        }
      }
    })
  }
}, { immediate: false })

onUnmounted(() => {
  shownCards.value.clear()
  observer.disconnect()
})
</script>

<style lang="scss" scoped>
.poi-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0 0.5rem 0.5rem 0;
  color: var(--bng-off-white);
  overflow: hidden;
}

.poi-list-content {
  flex: 1;
  overflow-y: scroll;
  text-overflow: ellipsis;
  direction: rtl;
}

.poi-list-simple {
  width: 100%;
  direction: ltr;
  padding: 0 0.5rem;
}

.sections-accordion {
  width: 100%;
  direction: ltr;

  :deep(.bng-accordion-container) {
    padding: 0 0.65rem;
  }

  :deep(.bng-accitem-content) {
    padding-left: 0.65rem;
  }

  :deep(.bng-accitem-body) {
    padding: 0;
  }

  :deep(.bng-accitem-caption) {
    border-radius: 0 !important;
    background-color: var(--bng-cool-gray-800);
  }

  :deep(.bng-accitem-expanded > .bng-accitem-caption) {
    background: linear-gradient(to right, var(--bng-orange-600) 0%, var(--bng-cool-gray-700) 10.5rem, var(--bng-cool-gray-700) 100%);
  }
}

.filter-section {
  margin-bottom: 0.5rem;
}

.accordion-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem;
  color: var(--bng-cool-gray-300);
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.9rem;

  :deep(.bng-icon) {
    font-size: 1.2em;
    color: var(--bng-cool-gray-300);
  }
  --bng-icon-color: var(--bng-cool-gray-300);

  &.expanded {
    color: var(--bng-off-white);

    :deep(.bng-icon) {
      color: var(--bng-off-white);
    }
    --bng-icon-color: var(--bng-off-white);
  }
}



.groups-accordion {
  width: 100%;

  :deep(.bng-accordion-container) {
    padding: 0 0.15rem;
  }

  :deep(.bng-accitem-content) {
    padding-left: 0.15rem;
  }

  :deep(.bng-accitem-body) {
    padding: 0;
  }

  :deep(.bng-accitem-caption) {
    padding-left: 0.5rem;
    border-top-left-radius: 0.45em !important;
    border-bottom-left-radius: 0.45em !important;
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    background-color: var(--bng-cool-gray-800);
  }

  :deep(.bng-accitem-expanded > .bng-accitem-caption) {
    background: linear-gradient(to right, var(--bng-orange-600) 0%, var(--bng-cool-gray-700) 10rem, var(--bng-cool-gray-700) 100%);
  }

  .poi-list-items {
    padding-top: 0.25rem;
  }
}


.poi-list-items {
  gap: 0.25rem;
  display: flex;
  flex-direction: column;
}

.simple-group {
  margin-bottom: 0rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.simple-group-header {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 0.0rem;
}

.simple-group-header .header-label {
  flex: 0 0 auto;
  margin-left: -0.4rem;
  margin-top: 0.4rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  letter-spacing: 0.02em;
}

.simple-group-header .header-line {
  flex: 1 1 auto;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}
</style>