<template>
  <LayoutMenu
    class="pause-career-logbook"
    nav-scope="pause-root"
    :nav-active="false"
    :nav-auto-focus="layoutNavAutoFocus"
    :nav-options="pauseRootNavOptions"
    :tabs="menuTabs"
    :breadcrumbs="breadcrumbItems"
    v-model:selectedTab="selectedTabIndex"
    :heading="pauseHeadingText"
    v-bng-ui-nav-label:tab_l="tabLeftHintLabel"
    v-bng-ui-nav-label:tab_r="tabRightHintLabel"
    @before-navigate="onBeforeNavigate"
    @tab-change="onTabChange"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadBack"
  >
    <template #topbar-right>
      <div class="system-info">
        <Background />
        <PauseButton inline />
        <div class="system-time">{{ currentTime }}</div>
        <BngServiceProvidersUser
          class="username"
          v-bng-blur
          :service-providers="SysInfo.serviceProviders.value"
          :service-providers-online="SysInfo.serviceProvidersOnline.value"
        />
      </div>
    </template>

    <section
      class="pause-logbook"
      v-bng-scoped-nav="logbookScopeBinding"
      v-bng-on-ui-nav:back,menu="onBreadBack"
    >
      <aside class="pause-logbook-list-panel">
        <Background class="pause-logbook-panel-bg" />
        <div class="pause-logbook-list" v-bng-ui-nav-scroll>
          <button
            v-for="(entry, index) in logbookEntries"
            :key="entry.entryId"
            bng-nav-item
            v-bng-ui-nav-focus="logbookEntries.length - index"
            v-bng-sound-class="'bng_click_generic_small'"
            class="pause-logbook-item"
            :class="{ selected: selectedEntry && selectedEntry.entryId === entry.entryId }"
            :bng-scoped-nav-autofocus="index === 0 ? 'true' : null"
            @focusin="selectEntry(entry)"
            @click="selectEntry(entry)"
          >
            <span class="pause-logbook-meta">
              <span>{{ $ctx_t(entry.cardTypeLabel) }}</span>
              <BngDivider class="vertical-divider" />
              <span v-bng-relative-time="entry.time"></span>
              <span v-show="entry.isNew" class="pause-logbook-newmark"></span>
            </span>
            <span class="pause-logbook-item-label">{{ $ctx_t(entry.title) }}</span>
          </button>
        </div>
      </aside>

      <main class="pause-logbook-detail-panel pause-logbook-panel" bng-no-child-nav="true">
        <Background class="pause-logbook-panel-bg" />
        <template v-if="selectedEntry">
          <BngCardHeading class="pause-logbook-detail-heading" type="ribbon">
            {{ $ctx_t(selectedEntry.title) }}
            <span v-show="selectedEntry.isNew" class="pause-logbook-title-newmark"></span>
          </BngCardHeading>

          <div class="pause-logbook-meta pause-logbook-detail-meta">
            <span>{{ $ctx_t(selectedEntry.cardTypeLabel) }}</span>
            <BngDivider class="vertical-divider" />
            <span v-bng-relative-time="selectedEntry.time"></span>
          </div>

          <div class="pause-logbook-detail-body" :class="{ 'with-rewards': selectedEntry.type === 'quest' && selectedEntry.rewards?.length }">
            <div
              v-if="selectedEntry.cover"
              class="pause-logbook-cover-image"
              :style="{ backgroundImage: `url(${selectedEntry.cover})` }"
            >
              <h1 v-if="selectedEntry.coverText">{{ selectedEntry.coverText }}</h1>
            </div>

            <div class="pause-logbook-description">
              <DynamicComponent v-if="selectedEntry._ready" :template="$ctx_t(selectedEntry.text)" />
            </div>

            <div v-if="selectedEntry.tables" class="pause-logbook-description pause-logbook-table">
              <table v-for="(table, tableIndex) in selectedEntry.tables" :key="tableIndex">
                <tbody>
                  <tr>
                    <th v-for="(header, headerIndex) in table.headers" :key="headerIndex">
                      {{ header }}
                    </th>
                  </tr>
                  <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex">
                    <td v-for="(data, dataIndex) in row" :key="dataIndex">
                      <RewardsPills
                        v-if="typeof data === 'object' && data !== null && data.type === 'rewards'"
                        :rewards="data.rewards"
                        :hide-numbers="false"
                      />
                      <DynamicComponent v-else :template="$ctx_t(data)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <template v-if="selectedEntry.type === 'quest'">
              <hr />
              <div class="pause-logbook-description quest-status">
                <h4>{{ $t("ui.career.logbook.milestoneStatus") }}</h4>
                <div v-for="prog in selectedEntry.progress" :key="prog.label?.txt || prog.label">
                  <div class="quest-stats-wrapper">
                    <div class="quest-labels">
                      <BngIcon
                        v-if="prog.done"
                        class="check-icon"
                        :type="prog.failed ? icons.missionCheckboxCross : icons.checkboxOn"
                      />
                      <div class="progress-label">{{ $ctx_t(prog.label) }}</div>
                    </div>
                    <div v-if="prog.type === 'progressBar'" class="progressbar-background">
                      <div
                        class="progressbar-fill"
                        :style="{ width: getProgressWidth(prog) }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div v-if="selectedEntry.type === 'quest' && selectedEntry.rewards?.length" class="pause-logbook-detail-footer">
            <div class="pause-logbook-rewards">
              <div class="pause-logbook-rewards-label">{{ $t("ui.career.logbook.rewards") }}:</div>
              <RewardsPills :rewards="selectedEntry.rewards" :hide-numbers="false" />
              <BngButton
                v-show="!selectedEntry.claimed"
                v-bng-sound-class="'bng_click_generic'"
                :disabled="!selectedEntry.claimable"
                @click="claimRewards(selectedEntry)"
              >
                {{ $t("ui.career.logbook.claimRewards") }}
              </BngButton>
              <BngButton v-show="selectedEntry.claimed" disabled>
                {{ $t("ui.career.logbook.rewardsClaimed") }}
              </BngButton>
            </div>
          </div>
        </template>

        <div v-else class="pause-logbook-empty">
          {{ $t("ui.career.logbook.noEntries") }}
        </div>
      </main>
    </section>
  </LayoutMenu>
</template>

<script setup>
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { lua } from "@/bridge"
import { LayoutMenu } from "@/common/layouts"
import {
  BngButton,
  BngCardHeading,
  BngDivider,
  BngIcon,
  BngServiceProvidersUser,
  icons,
} from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { DynamicComponent } from "@/common/components/utility"
import { vBngBlur, vBngOnUiNav, vBngRelativeTime, vBngScopedNav, vBngSoundClass, vBngUiNavFocus, vBngUiNavLabel, vBngUiNavScroll } from "@/common/directives"
import { $content, $translate } from "@/services"
import SysInfo from "@/services/sysInfo"
import { useRouteDataStore } from "@/services/routeData"
import { activateRouteTargetScope } from "@/services/scopedNav/api"
import { SCOPE_TYPES } from "@/services/scopedNav/types"
import PauseButton from "@/common/modules/pause/components/pauseButton.vue"
import RewardsPills from "@/modules/career/components/progress/RewardsPills.vue"

defineOptions({ name: "PauseCareerLogbook" })

const props = defineProps({
  id: String,
})

const route = useRoute()
const routeDataStore = useRouteDataStore()
const bngVue = window.bngVue || { gotoGameState() {} }

const PAUSE_BUBBLE_EVENTS = Object.freeze(["tab_l", "tab_r", "menu"])
const LOGBOOK_SCOPE_ID = "pause-history-logbook"

const currentTime = ref("")
const selectedTabIndex = ref(0)
const logbookEntries = ref([])
const selectedEntry = ref(null)
const selectedEntryId = computed(() => (props.id !== undefined ? `${props.id}`.replace(/%/g, "/") : undefined))
let currentTimeIntervalId
let mountedAckRequestId = 0
const lastMountedAckRouteName = ref("")
let readTimer

const logbookScopeBinding = Object.freeze({
  scopeId: LOGBOOK_SCOPE_ID,
  type: SCOPE_TYPES.CONTAINER,
  preferAutoFocus: true,
  bubbleWhitelistEvents: PAUSE_BUBBLE_EVENTS,
})

const layoutMenuData = computed(() => routeDataStore.data?.layoutMenu || {})
const layoutHeader = computed(() => layoutMenuData.value.header || {})
const layoutTopbar = computed(() => layoutMenuData.value.topbar || {})
const layoutNav = computed(() => layoutMenuData.value.nav || {})
const menuTabs = computed(() => (layoutTopbar.value.tabs || [])
  .filter(tab => tab?.visible !== false)
  .map((tab, index) => {
    const vueRouteName = tab.screenId || tab.routeName
    return {
      ...tab,
      routeName: vueRouteName,
      luaRouteName: tab.routeName,
      index,
      heading: tab.label || tab.heading || tab.routeName || `Tab ${index + 1}`,
    }
  }))
const breadcrumbItems = computed(() => layoutHeader.value.breadcrumbs || [])
const pauseHeadingText = computed(() => layoutHeader.value.heading || $translate.instant("ui.career.logbook.subHeading"))
const tabLeftHintLabel = computed(() => layoutTopbar.value.hints?.tabLeft || $translate.instant("ui.pause.hints.previousTab"))
const tabRightHintLabel = computed(() => layoutTopbar.value.hints?.tabRight || $translate.instant("ui.pause.hints.nextTab"))
const layoutNavAutoFocus = computed(() => layoutNav.value.autoFocus !== false)
const pauseRootNavOptions = computed(() => ({
  bubbleWhitelistEvents: PAUSE_BUBBLE_EVENTS,
}))

watch(
  () => layoutTopbar.value.selectedTab,
  selected => {
    if (typeof selected === "number") {
      selectedTabIndex.value = selected
    }
  },
  { immediate: true }
)

function setupLogbook(data) {
  const entries = Array.isArray(data) ? data : []
  entries.forEach(entry => {
    if (Object.hasOwn(entry, "text")) {
      entry.text = $content.bbcode.parse($translate.contextTranslate(entry.text, true))
      entry._ready = true
    }
  })

  logbookEntries.value = entries

  if (selectedEntryId.value) {
    for (const entry of entries) {
      if (`${entry.entryId}` === selectedEntryId.value) {
        selectEntry(entry)
        return
      }
    }
  }

  if (entries.length) selectEntry(entries[0])
}

function selectEntry(entry) {
  if (!entry) return
  if (readTimer) window.clearTimeout(readTimer)
  selectedEntry.value = entry
  readTimer = window.setTimeout(() => {
    entry.isNew = false
    if (entry.type === "quest") {
      lua.career_modules_questManager.setQuestAsNotNew(entry.questId)
    } else {
      lua.career_modules_logbook.setLogbookEntryRead(entry.entryId, true)
    }
  }, 1000)
}

function claimRewards(entry) {
  if (!entry) return
  lua.career_modules_questManager.claimRewardsById(entry.questId)
  entry.claimable = false
  entry.claimed = true
}

function getProgressWidth(prog) {
  const min = Number(prog?.minValue) || 0
  const max = Number(prog?.maxValue) || 0
  const current = Number(prog?.currValue) || 0
  const range = max - min
  if (range <= 0) return "0%"
  return `${Math.max(0, Math.min(100, ((current - min) / range) * 100))}%`
}

function onBeforeNavigate(event) {
  if (!event || event.type !== "tab-change") return
  if (event.sync === true) return
  const nextIndex = event.tab?.index
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || nextTab.enabled === false) {
    event.preventDefault()
  }
}

async function onTabChange(tab, prevTab, meta) {
  if (meta?.sync === true) return
  const nextIndex = tab?.index ?? selectedTabIndex.value
  const nextTab = menuTabs.value[nextIndex]
  if (!nextTab || !nextTab.enabled || !nextTab.routeName) return
  if (route.name === nextTab.routeName) return
  await bngVue.gotoGameState(nextTab.luaRouteName)
}

async function onBreadcrumbClick(item) {
  if (!item || !item.routeName) return
  if (item.params) {
    await bngVue.gotoGameState(item.routeName, { params: item.params })
    return
  }
  await bngVue.gotoGameState(item.routeName)
}

async function onBreadBack() {
  await lua.extensions.ui_router.back()
}

function updateCurrentTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

async function notifyRouteMountedWhenReady() {
  const routeName = route.name
  if (!routeName || routeName === "unknown" || routeName === "__legacyAngular") return

  const requestId = ++mountedAckRequestId
  await nextTick()

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    await new Promise(resolve => window.requestAnimationFrame(() => resolve()))
  }

  if (requestId !== mountedAckRequestId) return
  if (route.name !== routeName) return
  const canonicalRoute = window.__luaRouter__?._pendingCanonicalRoute || routeName
  if (lastMountedAckRouteName.value === canonicalRoute) return

  const result = await lua.extensions.ui_router.routeMounted(canonicalRoute)
  lastMountedAckRouteName.value = canonicalRoute
  if (result?.success) {
    window.__luaRouter__._pendingCanonicalRoute = null
    activateRouteTargetScope()
  }
}

watch(
  () => route.fullPath,
  async () => {
    lastMountedAckRouteName.value = ""
    await notifyRouteMountedWhenReady()
  },
  { immediate: true }
)

watch(
  () => [routeDataStore.status, routeDataStore.routeName],
  async ([status, routeName]) => {
    if (status !== "enter-ready") return
    if (!routeName || routeName !== route.name) return
    lastMountedAckRouteName.value = ""
    await notifyRouteMountedWhenReady()
  }
)

onBeforeMount(() => {
  lua.simTimeAuthority.pushPauseRequest("logbook")
})

onMounted(() => {
  updateCurrentTime()
  currentTimeIntervalId = window.setInterval(updateCurrentTime, 1000)
  lua.career_modules_logbook.getLogbook().then(setupLogbook)
})

onUnmounted(() => {
  mountedAckRequestId += 1
  if (readTimer) window.clearTimeout(readTimer)
  if (currentTimeIntervalId) window.clearInterval(currentTimeIntervalId)
  lua.simTimeAuthority.popPauseRequest("logbook")
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.pause-career-logbook {
  .system-info {
    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-enabled-opacity: 0.6;
    --bng-bg-border-radius: var(--bng-corners-2);
    --bng-bg-border-width: 0;

    display: inline-flex;
    align-items: center;
    gap: 1em;
    color: var(--bng-off-white);
    pointer-events: auto;
    user-select: none;
    align-self: flex-start;
    font-size: 1em;
    height: 2.5em;
    padding: 0 1em 0 0;
    position: relative;
    isolation: isolate;
    z-index: 2;
  }

  .system-time {
    font-family: var(--fnt-mono);
    font-size: 1.25em;
    font-weight: 200;
    padding-top: 0.2em;
  }

  .username {
    height: 100%;
  }
}

.pause-logbook {
  display: flex;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  gap: 0.75rem;
  color: var(--bng-off-white);
  overflow: hidden;
  pointer-events: auto;
}

.pause-logbook-list-panel,
.pause-logbook-detail-panel {
  position: relative;
  isolation: isolate;
  min-height: 0;
  min-width: 0;
  border-radius: var(--bng-corners-2);
  overflow: hidden;
  pointer-events: auto;
}

.pause-logbook-list-panel {
  flex: 0 0 clamp(18rem, 25vw, 28rem);
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.pause-logbook-detail-panel {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.pause-logbook-panel-bg {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.9;
  --bng-bg-border-width: 0;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: absolute;
  inset: 0;
  z-index: -1;
}

.pause-logbook-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 0.25rem;
}

.pause-logbook-item {
  @include modify-focus(var(--bng-corners-1), 0);

  appearance: none;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: var(--bng-black-o6);
  color: var(--bng-off-white);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0.5rem 1.5rem 0.625rem 1rem;
  position: relative;
  text-align: left;
  cursor: pointer;
}

.pause-logbook-item:hover,
.pause-logbook-item:focus {
  background: var(--bng-orange-900);
}

.pause-logbook-item.selected::after {
  content: "";
  position: absolute;
  inset: 0 0 0 auto;
  width: 25%;
  border-radius: 0 var(--bng-corners-1) var(--bng-corners-1) 0;
  box-shadow: inset -0.25rem 0 0 var(--bng-orange-600);
  background: linear-gradient(270deg, rgba(255, 102, 0, 0.4) 0%, rgba(255, 102, 0, 0) 100%);
  pointer-events: none;
}

.pause-logbook-meta {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  color: var(--bng-cool-gray-200);
  font-family: var(--fnt-defs);
  line-height: 1.5;
  position: relative;
}

.pause-logbook-meta > :last-child {
  color: var(--bng-cool-gray-500);
}

.vertical-divider {
  background: var(--bng-cool-gray-200);
}

.pause-logbook-item-label {
  padding-top: 0.125rem;
  font-family: "Overpass", var(--fnt-defs);
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1.25;
  z-index: 1;
}

@keyframes logbook-new-pulse {
  0% {
    box-shadow: 0 0 0.75rem rgba(218, 196, 52, 0.75);
  }
  100% {
    box-shadow: 0 0 1rem rgba(218, 196, 52, 1);
  }
}

.pause-logbook-newmark,
.pause-logbook-title-newmark {
  background: var(--bng-ter-yellow-100);
  box-shadow: 0 0 0.75rem var(--bng-ter-yellow-300);
  animation: logbook-new-pulse 2s cubic-bezier(0.2, 0.01, 0.12, 1) 1s infinite alternate-reverse;
  border-radius: 999px;
}

.pause-logbook-newmark {
  width: 0.8rem;
  height: 0.8rem;
  position: absolute;
  top: 0.25rem;
  right: -1rem;
}

.pause-logbook-title-newmark {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  margin-left: 0.25rem;
}

.pause-logbook-empty {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.pause-logbook-empty {
  align-items: center;
  justify-content: center;
  color: var(--bng-cool-gray-200);
}

.pause-logbook-detail-heading {
  flex: 0 0 auto;
  position: relative;
  margin: 0 0 0.75rem -0.5rem;
  padding-bottom: 0.75rem;

}

.pause-logbook-detail-meta {
  flex: 0 0 auto;
  padding: 0 1.5rem 0.75rem;
}

.pause-logbook-detail-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.pause-logbook-detail-body > * {
  padding: 0 1.5rem 1.5rem;
}

.pause-logbook-cover-image {
  box-sizing: border-box;
  min-height: 16rem;
  width: 100%;
  max-height: 50vh;
  background-position: 50% 50%;
  background-size: cover;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bng-cool-gray-800);
  border-radius: var(--bng-corners-1);
}

.pause-logbook-cover-image > h1 {
  font-family: "Overpass", var(--fnt-defs);
  font-weight: 500;
  line-height: 1.25;
  font-size: 3rem;
  text-shadow: 0 0 3rem var(--bng-black-o8);
}

.pause-logbook-description {
  font-family: var(--fnt-defs);
  line-height: 1.375;

  :deep(p) {
    margin-bottom: 1rem;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5) {
    margin: 1em 0 1rem;
    font-family: "Overpass", var(--fnt-defs);
    font-weight: 500;
    line-height: 1.25;
  }

  :deep(h1) {
    margin-top: 0;
    font-size: 3rem;
  }

  :deep(h2) {
    font-size: 2.441rem;
    font-weight: 600;
  }

  :deep(h3) {
    font-size: 1.953rem;
    font-weight: 600;
  }

  :deep(h4) {
    font-size: 1.5rem;
    font-weight: 700;
  }

  :deep(h5) {
    font-size: 1.25rem;
    font-weight: 700;
  }

  :deep(small),
  :deep(.text_small) {
    font-size: 0.8rem;
  }

  :deep(ul),
  :deep(ol) {
    padding: 0 0.5em;
    margin: 0.75em 0;
  }

  :deep(ul),
  :deep(ol),
  :deep(li) {
    position: relative;
  }

  :deep(ul > li) {
    list-style: none;
    display: list-item;
    margin-left: 1.5em;
    margin-bottom: 0.4em;
  }

  :deep(ol > li) {
    margin-left: 1.5em;
    margin-bottom: 0.25em;
  }

  :deep(ul > li::before) {
    content: "";
    display: inline-block;
    position: absolute;
    left: -1.25em;
    height: 1.2em;
    width: 1em;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 14 14' xmlns='http%3a%2f%2fwww.w3.org%2f2000%2fsvg'%3e%3cpath d='M5 0H14L9 14H0L5 0Z' fill='%23f60'%2f%3e%3c%2fsvg%3e");
    background-size: 0.6em;
    background-position: 50% 50%;
    background-repeat: no-repeat;
  }

  :deep(ul > li ul > li::before) {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 14 14' xmlns='http%3a%2f%2fwww.w3.org%2f2000%2fsvg'%3e%3cpath d='M10 0H5L0 14H5L10 0ZM14 0H12L7 14H9L14 0Z' fill='%23f60'%2f%3e%3c%2fsvg%3e");
  }

  :deep(em) {
    color: var(--bng-orange-100);
  }

  :deep(code) {
    font-family: "Noto Sans Mono", var(--fnt-mono);
    font-size: 0.875em;
    display: inline-flex;
    padding: 0.25em 0.5em;
    background-color: var(--bng-ter-blue-gray-800);
    border-radius: var(--bng-corners-1);
    border: 0.125em solid var(--bng-ter-blue-gray-700);
  }

  :deep(strong) {
    font-weight: 700;
    color: var(--bng-orange-200);
  }
}

.pause-logbook-description:not(:last-child) {
  padding-bottom: 1.5em !important;
}

.pause-logbook-table table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.pause-logbook-table th,
.pause-logbook-table td {
  padding: 0.5rem;
  border-bottom: 0.0625rem solid var(--bng-cool-gray-700);
  text-align: left;
}

hr {
  margin: 0.5rem 1.5rem 1rem;
  border: none;
  border-top: 0.0625rem solid var(--bng-cool-gray-600);
}

.quest-stats-wrapper {
  position: relative;
  padding: 0.25rem;
  display: flex;
  border-radius: var(--bng-corners-1);
  margin-bottom: 0.5rem;
  border: 0.125rem solid var(--bng-cool-gray-800);
  overflow: hidden;
}

.quest-labels {
  font-size: 1rem;
  display: flex;
  padding: 0.5rem 0.5rem 0.5rem 2.25rem;
  z-index: 2;
  position: relative;
  align-items: flex-start;
  flex: 1 1 auto;
}

.progress-label {
  flex: 1 1 auto;
  font-size: 1.1rem;
  font-weight: 400;
}

.progressbar-background {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  border-radius: var(--bng-corners-1);
}

.progressbar-fill {
  align-self: stretch;
  background-color: rgba(255, 255, 255, 0.25);
}

.check-icon {
  position: absolute;
  width: 2.75rem;
  height: 2.75rem;
  top: 0.2rem;
  left: 0.1rem;
}

.pause-logbook-detail-footer {
  flex: 0 0 auto;
  padding: 0.75rem 1.5rem 0;
}

.pause-logbook-rewards {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  width: 100%;
}

.pause-logbook-rewards-label {
  color: var(--bng-cool-gray-200);
}
</style>
