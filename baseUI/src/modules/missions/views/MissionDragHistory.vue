<!-- Drag History -->
<template>
  <LayoutSingle
    class="drag-history-layout"
    v-bng-blur
    v-bng-scoped-nav="{ activateOnMount: true, canDeactivate: () => false, bubbleWhitelistEvents: ['menu'] }"
    v-bng-on-ui-nav:menu="exit"
    v-bng-on-ui-nav:back="handleBack"
    v-bng-on-ui-nav:tab_l="() => navigatePage(-1)"
    v-bng-on-ui-nav:tab_r="() => navigatePage(1)"
  >
    <BngButton v-if="historyData === undefined" bng-nav-item :accent="ACCENTS.outlined" class="drag-history-back-btn" @click="exit">{{ $t("ui.common.back") }}</BngButton>
    <div v-if="historyData !== undefined" class="drag-history-wrapper">
      <BngScreenHeading :preheadings="[$t(level)]">{{ $t("ui.drag.history.title", [$t(name)]) }}</BngScreenHeading>
      <div class="drag-history-container">
          <div class="drag-history-list">
            <div
              ref="listAreaRef"
              class="drag-history-tab-wrapper"

              bng-nav-scroll-force
              v-bng-on-ui-nav:focus_r.focusRequired="focusFilters">
              <BngScreenHeadingV2 class="drag-history-col-heading" type="2">{{ $t("ui.drag.history.columnHistory") }}</BngScreenHeadingV2>
              <template v-if="hasHistory && filteredHistory.length > 0">
                <div
                  bng-nav-item
                  tabindex="-1"
                  v-bng-sound-class="'bng_click_generic_small'"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  class="drag-history-item"
                  v-for="entry in paginatedHistory"
                  :key="entry.stripInfo?.dateTime + entry.stripInfo?.stripName"
                  @click="toggleExpand(entry)"
                  :class="{ selected: selectedEntry !== undefined && selectedEntry === entry }">
                  <div class="drag-history-item-content">
                    <div class="drag-history-meta">
                      <div v-bng-relative-time="entry.stripInfo.dateTime"></div>
                    </div>
                    <div class="drag-history-item-label">{{ entry.stripInfo.dateTime }}</div>
                  </div>
                </div>
                <div class="drag-history-pagination" v-if="totalPages > 1">
                  <BngButton bng-nav-item size="small" :disabled="currentPage <= 1" @click="currentPage = Math.max(1, currentPage - 1)">{{ $t("ui.common.back") }}</BngButton>
                  <span class="drag-history-page-indicator">{{ currentPage }} / {{ totalPages }}</span>
                  <BngButton bng-nav-item size="small" :disabled="currentPage >= totalPages" @click="currentPage = Math.min(totalPages, currentPage + 1)">{{ $t("ui.common.next") }}</BngButton>
                </div>
              </template>
              <template v-else-if="hasHistory">
                <div class="drag-history-empty-message">{{ $t("ui.drag.history.noMatchesForFilters") }}</div>
              </template>
              <template v-else>
                <div class="drag-history-empty-message">{{ $t("ui.drag.history.noHistoryAvailable") }}</div>
              </template>
            </div>
          </div>

          <div class="drag-history-details">
            <BngCard class="drag-history-content-card">
              <BngScreenHeadingV2 class="drag-history-col-heading" type="2">{{ $t("ui.drag.history.columnTimeslip") }}</BngScreenHeadingV2>
              <template v-if="hasHistory && filteredHistory.length > 0 && selectedEntry">
                <div class="drag-history-slip-wrap">
                  <Timeslip class="drag-history-slip-item" :slip="selectedEntry" />
                </div>
              </template>
              <div v-else class="drag-history-empty-message">
                {{ hasHistory ? $t('ui.drag.history.noTimeslipMatch') : $t('ui.drag.history.noTimeslipData') }}
              </div>
            </BngCard>
          </div>

          <div class="drag-history-filters-col">
            <div ref="filtersPanelRef" class="drag-history-filters" v-bng-on-ui-nav:focus_l.focusRequired="focusList">
              <BngScreenHeadingV2 class="drag-history-col-heading" type="2">{{ $t("ui.common.filters") }}</BngScreenHeadingV2>
              <template v-if="hasHistory">
                <div class="drag-history-sort">
                  <span class="filter-section-label">{{ $t("ui.common.sortBy") }}</span>
                  <BngPillFilters
                    v-model="sortOrder"
                    :options="SORT_OPTIONS"
                    :selectMany="false"
                    @valueChanged="onSortChanged"
                  />
                </div>
                <Accordion class="drag-history-filter-accordion">
                  <AccordionItem
                    v-for="filter in visibleFilterDefinitions"
                    :key="filter.key"
                    navigable
                    arrow-big
                    :class="{ 'has-active-filter': selectedFilters[filter.key]?.length > 0 }"
                  >
                    <template #caption>{{ $t(filter.labelKey) }}</template>
                    <BngPillFilters
                      :modelValue="getPillSelection(filter.key)"
                      :options="getPillOptions(filter.key)"
                      :selectMany="true"
                      @update:modelValue="(val) => setPillSelection(filter.key, val)"
                    />
                  </AccordionItem>
                </Accordion>
              </template>
              <div v-else class="drag-history-empty-message">{{ $t("ui.drag.history.noFilterData") }}</div>
              <BngButton bng-nav-item :accent="ACCENTS.outlined" class="drag-history-back-btn" @click="exit">{{ $t("ui.common.back") }}</BngButton>
            </div>
          </div>
        </div>
      </div>
  </LayoutSingle>
</template>

<script setup>
import { LayoutSingle } from "@/common/layouts"
import { BngButton, BngScreenHeading, BngScreenHeadingV2, BngPillFilters, BngCard, ACCENTS } from "@/common/components/base"
import { Accordion, AccordionItem } from "@/common/components/utility"
import { vBngRelativeTime, vBngBlur, vBngSoundClass, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { Timeslip } from "@/modules/apps"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import { ref, computed, onMounted, watch, nextTick } from "vue"
import { setFocus } from "@/services/uiNavFocus"
import { focusOnElement } from "@/services/crossfire"

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  level: { type: String, required: true }
})

const entryId = computed(() => props.id ? String(props.id).replace(/%/g, "/") : undefined)

const historyData = ref(undefined)

const filterDefinitions = [
  { key: 'brand', labelKey: 'vehicle.info.Brand' },
  { key: 'country', labelKey: 'vehicle.info.Country' },
  { key: 'drivetrain', labelKey: 'vehicle.info.Drivetrain' },
  { key: 'fuelType', labelKey: 'vehicle.info.Fuel Type' },
  { key: 'transmission', labelKey: 'vehicle.info.Transmission' },
  { key: 'configType', labelKey: 'vehicle.info.Config Type' },
  { key: 'inductionType', labelKey: 'vehicle.info.Induction Type' },
  { key: 'tree', labelKey: 'ui.drag.label.treeType' }
]

const PAGE_SIZE = 10
const SORT_OPTIONS = computed(() => [
  { value: 'desc', label: $translate.instant('ui.drag.history.sortNewest') },
  { value: 'asc', label: $translate.instant('ui.drag.history.sortOldest') }
])

const hasHistory = computed(() => historyData.value?.history?.length > 0)

const currentPage = ref(1)
const sortOrder = ref(['desc'])
const selectedFilters = ref({})
const activeFilters = ref([])

const availableFilterOptions = computed(() => {
  if (!historyData.value?.history) return {}

  const options = {}

  filterDefinitions.forEach(filter => {
    options[filter.key] = new Set()
  })

  historyData.value.history.forEach(entry => {
    const vehicleInfo = entry.racerInfos?.[0]
    filterDefinitions.forEach(filter => {
      if (filter.key === 'tree') {
        if (entry.tree) {
          options[filter.key].add(entry.tree)
        }
      } else if (vehicleInfo?.[filter.key]) {
        options[filter.key].add(vehicleInfo[filter.key])
      }
    })
  })
  return Object.fromEntries(
    Object.entries(options).map(([key, values]) => [
      key,
      [...values].sort().map(value => ({
        label: value,
        value: value
      }))
    ])
  )
})

const visibleFilterDefinitions = computed(() =>
  filterDefinitions.filter(f => (availableFilterOptions.value[f.key] || []).length > 0)
)

const filteredHistory = computed(() => {
  if (!historyData.value?.history) return []

  const filtersByKey = {}
  for (const f of activeFilters.value) {
    if (!filtersByKey[f.type]) filtersByKey[f.type] = []
    filtersByKey[f.type].push(f.value)
  }

  const keys = Object.keys(filtersByKey)
  if (keys.length === 0) return historyData.value.history

  return historyData.value.history.filter(entry => {
    const vehicleInfo = entry.racerInfos?.[0]
    return keys.every(key => {
      const values = filtersByKey[key]
      if (key === 'tree') return values.includes(entry.tree)
      return values.includes(vehicleInfo?.[key])
    })
  })
})

function getSortKey(entry) {
  if (entry.stripInfo?.timestamp != null) return entry.stripInfo.timestamp
  return new Date(entry.stripInfo?.dateTime || 0).getTime() / 1000
}

const sortedHistory = computed(() => {
  const list = [...(filteredHistory.value || [])]
  const asc = sortOrder.value && sortOrder.value[0] === 'asc'
  list.sort((a, b) => {
    const ka = getSortKey(a)
    const kb = getSortKey(b)
    return asc ? ka - kb : kb - ka
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil((sortedHistory.value?.length || 0) / PAGE_SIZE)))

const paginatedHistory = computed(() => {
  const list = sortedHistory.value || []
  const start = (currentPage.value - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
})

function getPillOptions(filterKey) {
  return availableFilterOptions.value[filterKey] || []
}

function getPillSelection(filterKey) {
  const v = selectedFilters.value[filterKey]
  return Array.isArray(v) && v.length > 0 ? v : []
}

function setPillSelection(filterKey, val) {
  const values = Array.isArray(val) ? val : []
  if (values.length === 0) {
    clearFilter(filterKey)
    return
  }
  selectedFilters.value[filterKey] = values
  activeFilters.value = activeFilters.value.filter(f => f.type !== filterKey)
  values.forEach(v => activeFilters.value.push({ type: filterKey, value: v }))
  currentPage.value = 1
  selectFirst()
}

function clearFilter(filterKey) {
  activeFilters.value = activeFilters.value.filter(f => f.type !== filterKey)
  selectedFilters.value[filterKey] = null
  currentPage.value = 1
  selectFirst()
}

function onSortChanged() {
  currentPage.value = 1
  selectFirst()
}

function selectFirst() {
  selectedEntry.value = sortedHistory.value.length > 0 ? sortedHistory.value[0] : undefined
}

function setup(data) {
  historyData.value = data
  currentPage.value = 1
  selectFirst()
  nextTick(() => nextTick(focusList))
}

const selectedEntry = ref(undefined)
const listAreaRef = ref(null)
const filtersPanelRef = ref(null)

const toggleExpand = entry => setTimeout(()=>{
  if (selectedEntry.value !== entry) selectedEntry.value = entry
},0)

function focusList() {
  nextTick(() => {
    const area = listAreaRef.value
    if (!area) return
    const first = area.querySelector('[bng-nav-item]') || area.querySelector('button')
    if (first) {
      focusOnElement(first)
      setFocus(first)
    }
  })
}

function focusFilters() {
  nextTick(() => {
    const panel = filtersPanelRef.value
    if (!panel) return
    const first = panel.querySelector('[bng-nav-item]') || panel.querySelector('.bng-pill') || panel.querySelector('button')
    if (first) setFocus(first)
  })
}

function navigatePage(delta) {
  const next = currentPage.value + delta
  if (next >= 1 && next <= totalPages.value) currentPage.value = next
}

function handleBack() {
  if (filtersPanelRef.value && filtersPanelRef.value.contains(document.activeElement)) {
    focusList()
  } else {
    exit()
  }
}

const exit = () => window.bngVue.gotoGameState("play")

const start = () => {
  lua.gameplay_drag_dragBridge.getHistory(entryId.value).then(setup)
  filterDefinitions.forEach(filter => {
    selectedFilters.value[filter.key] = null
  })
}

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = Math.max(1, pages)
})

onMounted(() => {
  start()
})

</script>

<style lang="scss" scoped>

.drag-history-layout {
  --content-flow: column;
  color: var(--bng-off-white);
  font-size: 1rem;
  :deep(.layout-content) {
    align-items: center;
  }
}

.drag-history-back-btn {
  flex-shrink: 0;
  align-self: center;
  margin-top: auto;
}

.drag-history-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(90rem, 95vw);
  min-height: 0;
  height: 100%;
  align-self: center;
  padding-top: 1rem;
  .drag-history-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
    gap: 0.5rem;

    .drag-history-filters-col {
      display: flex;
      flex-direction: column;
      flex: 0 0 22rem;
      width: 22rem;
      max-height: 100%;
    }

    .drag-history-filters {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      background-color: var(--bng-black-o6);
      border-radius: var(--bng-corners-2);
      overflow: hidden auto;
      padding: 0.5rem;

      .filter-section-label {
        color: var(--bng-off-white);
        font-weight: 800;
        margin-bottom: 0.25rem;
      }

      .drag-history-sort {
        margin-bottom: 0.75rem;
        color: var(--bng-off-white);
      }

      .drag-history-filter-accordion {
        padding: 0 0.8rem 0 0.8rem;
        gap: 0.25rem;

        :deep(.bng-accitem) {
          margin: 0;

          .bng-accitem-caption {
            background-color: var(--bng-black-o6);
            padding: 0.25rem 0.5rem;
            &:hover {
              background-color: var(--bng-black-o8);
            }
          }

          &.bng-accitem-expanded > .bng-accitem-caption {
            background-color: var(--bng-black-o8);
          }

          &.has-active-filter > .bng-accitem-caption {
            border-left: 0.25rem solid var(--bng-orange-500);
            color: var(--bng-orange-500);
          }

          > .bng-accitem-content {
            padding: 0.5rem 0.25rem;
          }
        }
      }

      :deep(.bng-pill-filters) {
        width: 100%;
        min-width: 0;

        .pills-wrapper {
          flex-wrap: wrap;
          overflow-x: auto;
          gap: 0.5rem;
        }

        .bng-pill.pill-marked {
          background-color: rgba(var(--bng-orange-400-rgb), 0.35);
          box-shadow: inset 0 0 0 0.125em rgba(var(--bng-orange-400-rgb), 0.5);
        }
      }
    }

    .drag-history-list {
      display: flex;
      flex-direction: column;
      flex: 0 0 22rem;
      width: 22rem;
      min-width: 22rem;
      max-width: 22rem;

      .drag-history-tab-wrapper {
        border-radius: var(--bng-corners-2);
        overflow: hidden auto;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
        background-color: var(--bng-black-o6);
        padding: 0.5rem;

        .drag-history-item {
          display: flex;
          flex: 0 0 auto;
          flex-direction: column;
          border-radius: var(--bng-corners-2);
          margin: 0.5rem 0.5rem 0;
          background-color: var(--bng-black-o6);
          position: relative;
          box-sizing: border-box;
          transition: all 0.2s ease-in-out;
          color: var(--bng-off-white);
          min-height: max-content;
          cursor: pointer;

          .drag-history-item-content {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            padding: 1em 1.5em 0.625em 1em;
            z-index: 9;

            .drag-history-meta {
              display: flex;
              flex-direction: row;
              justify-content: flex-start;
              align-items: baseline;
              color: var(--bng-cool-gray-200);
              flex: 0 0 auto;
              font-family: var(--fnt-defs) !important;
              line-height: 1.5em;
            }

            .drag-history-item-label {
              padding: 0.2em 0 0 0;
              font-size: 1.25em;
              font-weight: 800;
              line-height: 125%;
              flex: 1 0 auto;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-family: "Overpass", var(--fnt-defs);
            }
          }
        }

        .drag-history-item.selected::after {
          box-shadow: inset -0.25em 0 0 var(--bng-orange-600);
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 25%;
          background: linear-gradient(270deg, rgba(var(--bng-orange-400-rgb), 0.4) 0%, rgba(var(--bng-orange-400-rgb), 0) 100%);
          border-radius: 0 var(--bng-corners-1) var(--bng-corners-1) 0;
          z-index: 7;
        }

        .drag-history-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem 0.5rem;
          margin-top: 0.5rem;
          flex-shrink: 0;
          color: var(--bng-off-white);
        }

        .drag-history-page-indicator {
          font-weight: 600;
          min-width: 4ch;
        }
      }
    }

    .drag-history-details {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;

      .drag-history-content-card {
        display: flex;
        flex: 1 0 auto;
        overflow: hidden auto;
        background-color: var(--bng-black-o6) !important;
        height: 100%;
        --bng-card-content-padding: 0.5rem;
        & :deep(.card-cnt) {
          background-color: var(--bng-black-o6) !important;
          align-items: center;
        }

        .drag-history-slip-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2vh;
          width: 100%;
          :deep(.timeslip) {
            font-size: 1vw;
          }

          .drag-history-slip-item {
            width: 80%;
            height: 100%;
          }
        }
      }
    }
  }
}

.drag-history-col-heading {
  flex-shrink: 0;
  margin-top: 0;
  padding: 0;
  font-size: 0.85em;
  align-self: flex-start;
  justify-self: flex-start;

  :deep(.header::before) {
    display: none;
  }
}

.drag-history-empty-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: var(--bng-cool-gray-200);
  font-size: 1.2em;
  font-style: italic;
}

</style>