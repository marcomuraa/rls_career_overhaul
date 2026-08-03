<template>
  <div v-show="visible" class="routes-rollup">
    <div class="panel">
      <div class="toolbar">
        <button class="toolbar-title" bng-no-nav="true" tabindex="-1" type="button" @click.stop="onToolbarRouteClick">
          <span class="toolbar-route">{{ sharedRouteName || "-" }}</span>
          <span class="toolbar-scope">{{ activeScopeId || "-" }}</span>
        </button>
        <div class="filters">
          <button class="filter-dev" bng-no-nav="true" tabindex="-1" type="button" @click.stop="emitToggleFilter('dev')">{{ routeFilter.dev ? "✓" : "☐" }} Dev</button>
          <button class="filter-lua" bng-no-nav="true" tabindex="-1" type="button" @click.stop="emitToggleFilter('lua')">{{ routeFilter.lua ? "✓" : "☐" }} Lua</button>
          <button class="filter-vue" bng-no-nav="true" tabindex="-1" type="button" @click.stop="emitToggleFilter('vue')">{{ routeFilter.vue ? "✓" : "☐" }} Vue</button>
          <button class="filter-ng" bng-no-nav="true" tabindex="-1" type="button" @click.stop="emitToggleFilter('ng')">{{ routeFilter.ng ? "✓" : "☐" }} Ng</button>
          <button class="filter-auto-scroll" bng-no-nav="true" tabindex="-1" type="button" @click.stop="toggleAutoScroll">{{ autoScrollEnabled ? "✓" : "☐" }} Auto-scroll</button>
        </div>
        <!-- <button class="close-btn" bng-no-nav="true" tabindex="-1" type="button" @click.stop="closeNavigator">x</button> -->
      </div>

      <div v-if="routeLetterShortcuts.length" class="letter-shortcuts">
        <button
          v-for="item in routeLetterShortcuts"
          :key="item.letter"
          class="letter-shortcut"
          bng-no-nav="true"
          tabindex="-1"
          type="button"
          :title="`Scroll to ${item.routeName}`"
          @click.stop="scrollToRouteLetter(item)"
        >{{ item.letter }}</button>
      </div>

      <div class="tree">
        <div ref="treeViewport" class="tree-viewport" @scroll="onTreeScroll">
          <table class="tree-table">
            <thead>
              <tr>
                <th class="th-route">Route/Scope</th>
                <th class="th-flags">Flags</th>
              </tr>
            </thead>
            <tbody>
              <IEPanelRoutesBranch
                :nodes="filteredRouteTree"
                :active-route-name="sharedRouteName"
                :active-scope-id="activeScopeId"
                :multiline-scope-row-id="multilineScopeRowId"
                :expanded-routes="expandedRoutes"
                :expanded-scopes="expandedScopes"
                @toggle-node="onToggleNode"
                @go-route="goToRoute"
                @scope-row-clicked="onScopeRowClicked"
                @hover-scope="onScopeHover"
                @leave-scope="onScopeLeave"
                @register-route-row="registerRouteRow"
                @register-scope-row="registerScopeRow"
                @active-route-mounted="onActiveRouteMounted"
                @active-scope-mounted="onActiveScopeMounted"
              />
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        Flat {{ flatRoutes.length }} | Tree {{ filteredRouteTree.length }} | Scopes {{ scopeTreeFlat.length }}
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="scopeOverlay.visible"
      class="scope-overlay"
      :style="scopeOverlayStyle"
    ></div>
  </Teleport>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useEvents } from "@/services/events"
import { popupsView } from "@/services/popup"
import IEPanelRoutesBranch from "@/modules/debug/components/IEPanels/IEPanelRoutesBranch.vue"
import { useNavRoutes, resolveRouteName } from "@/modules/debug/navRoutes"
import { useNavScopes } from "@/modules/debug/navScopes"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const bngVue = window.bngVue || {}
const events = useEvents()
const route = useRoute()
const routeName = computed(() => route.name)
const treeViewport = ref(null)
const visible = ref(window._NavigatorOpen ?? false)
const autoScrollEnabled = ref(window._NavigatorAutoScroll !== false)
const sharedRouteName = ref(routeName.value)
const expandedRoutes = ref({})
const expandedScopes = ref({})
const pendingScrollToActive = ref(false)
const pendingScrollToActiveScope = ref(false)
const multilineScopeRowId = ref("")
const routeRowRefs = {}
const scopeRowRefs = {}
const hoveredScopeElement = ref(null)
const savedScrollTop = ref(0)
let isRestoringScroll = false
let restoreScrollInterval = null
let scopeOverlayRaf = 0
const scopeOverlay = ref({
  visible: false,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
})
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)

const {
  routeFilter,
  showRoute,
  routeTree,
  flatRoutes,
  ngRoutes,
  readAngularRoutes,
  stopAngularRoutesRetry,
} = useNavRoutes()

const {
  scopeTree,
  scopeTreeFlat,
  hasActivePopupScope,
  activeScopeId,
} = useNavScopes()

provide("navigatorScopeTree", scopeTree)

const hasPopup = computed(() => !!popupsView.popups)
const filterTree = nodes => nodes.reduce((result, node) => {
  const filteredChildren = filterTree(node.children || [])
  const selfVisible = !node.isRoute || showRoute(node.fullName)
  if (selfVisible || filteredChildren.length > 0) {
    result.push({
      ...node,
      children: filteredChildren,
    })
  }
  return result
}, [])

const filteredRouteTree = computed(() => filterTree(routeTree.value || []))
const routeLetterShortcuts = computed(() => {
  const byLetter = new Map()
  const routeNames = flatRoutes.value
    .map(item => item.route)
    .filter(name => name && showRoute(name))
    .sort((a, b) => a.localeCompare(b))

  for (const routeName of routeNames) {
    const letter = routeName.charAt(0).toUpperCase()
    if (!/^[A-Z]$/.test(letter) || byLetter.has(letter)) continue
    byLetter.set(letter, routeName)
  }
  return [...byLetter.entries()].map(([letter, routeName]) => ({ letter, routeName }))
})
const scopeOverlayStyle = computed(() => ({
  top: `${scopeOverlay.value.top}px`,
  left: `${scopeOverlay.value.left}px`,
  width: `${scopeOverlay.value.width}px`,
  height: `${scopeOverlay.value.height}px`,
}))

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("routes")
  if (visible.value === nextVisible) return
  visible.value = nextVisible
  window._NavigatorOpen = nextVisible
  if (nextVisible) {
    requestActiveRouteScroll()
    requestActiveScopeScroll()
  } else {
    pendingScrollToActive.value = false
    pendingScrollToActiveScope.value = false
    onScopeLeave()
  }
}

function togglePanel() {
  setVisible(!visible.value)
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "routes",
  order: 10,
  tooltip: "Toggle routes panel",
  label: computed(() => `Routes ${flatRoutes.value.length} · Scopes ${scopeTreeFlat.value.length}`),
  parts: computed(() => [
    { text: "Routes " },
    { text: flatRoutes.value.length, class: "green" },
    { text: " · Scopes " },
    { text: scopeTreeFlat.value.length, class: "green" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || scopeTreeFlat.value.length > 0 || hasActivePopupScope.value),
  onClick: togglePanel,
  close: () => setVisible(false),
})

function emitToggleFilter(name) {
  if (!name || !(name in routeFilter)) return
  routeFilter[name] = !routeFilter[name]
}

function toggleAutoScroll() {
  autoScrollEnabled.value = window._NavigatorAutoScroll = !autoScrollEnabled.value
}

function onTreeScroll(e) {
  if (isRestoringScroll) return
  savedScrollTop.value = e.target.scrollTop
}

function registerRouteRow({ name, el }) {
  if (!name) return
  if (el) routeRowRefs[name] = el
  else delete routeRowRefs[name]
}

function registerScopeRow({ id, el }) {
  if (!id) return
  if (el) scopeRowRefs[id] = el
  else delete scopeRowRefs[id]
}

function onActiveRouteMounted(routeName) {
  if (!routeName || routeName !== sharedRouteName.value) return
  if (!pendingScrollToActive.value) return
  nextTick(() => {
    const el = routeRowRefs[routeName]
    if (el && treeViewport.value?.clientHeight > 0) {
      if (isRouteRowVisible(el)) {
        pendingScrollToActive.value = false
        return
      }
      scrollTo(el)
      pendingScrollToActive.value = false
    }
  })
}

function onActiveScopeMounted(scopeId) {
  if (!scopeId || scopeId !== activeScopeId.value) return
  if (!pendingScrollToActiveScope.value) return
  nextTick(() => {
    const el = scopeRowRefs[scopeId]
    if (el && treeViewport.value?.clientHeight > 0) {
      if (isRouteRowVisible(el)) {
        pendingScrollToActiveScope.value = false
        return
      }
      scrollTo(el)
      pendingScrollToActiveScope.value = false
    }
  })
}

function onScopeRowClicked(scopeId) {
  if (!scopeId) return
  multilineScopeRowId.value = multilineScopeRowId.value === scopeId ? "" : scopeId
}

function findPathToRoute(nodes, targetRouteName, path = []) {
  for (const node of nodes) {
    const key = node.id || node.fullName || node.label
    const nextPath = [...path, key]
    if (node.fullName === targetRouteName) {
      return nextPath
    }
    const childPath = findPathToRoute(node.children || [], targetRouteName, nextPath)
    if (childPath) return childPath
  }
  return null
}

function autoExpandScopes() {
  let changed = false
  const visit = nodes => {
    for (const node of nodes || []) {
      if (!node?.id) continue
      if (expandedScopes.value[node.id] !== true) {
        expandedScopes.value[node.id] = true
        changed = true
      }
      if (node.children?.length) visit(node.children)
    }
  }
  visit(scopeTree.value || [])
  return changed
}

function requestActiveRouteScroll(force = false) {
  if (!force && !autoScrollEnabled.value) {
    pendingScrollToActive.value = false
    return
  }
  if (!visible.value) {
    pendingScrollToActive.value = false
    return
  }
  pendingScrollToActive.value = true
  nextTick(() => {
    if (!visible.value) return
    expandActiveRouteAndScopes()
    nextTick(() => {
      if (!visible.value || !pendingScrollToActive.value) return
      const currentEl = routeRowRefs[sharedRouteName.value]
      if (!currentEl || !treeViewport.value?.clientHeight) {
        pendingScrollToActive.value = false
        return
      }
      if (isRouteRowVisible(currentEl)) {
        pendingScrollToActive.value = false
        return
      }
      scrollTo(currentEl)
      pendingScrollToActive.value = false
    })
  })
}

function requestActiveScopeScroll(force = false) {
  if (!force && !autoScrollEnabled.value) {
    pendingScrollToActiveScope.value = false
    return
  }
  if (!visible.value) {
    pendingScrollToActiveScope.value = false
    return
  }
  if (!activeScopeId.value) {
    pendingScrollToActiveScope.value = false
    return
  }
  pendingScrollToActiveScope.value = true
  nextTick(() => {
    if (!visible.value) return
    expandActiveRouteAndScopes()
    nextTick(() => {
      if (!visible.value || !pendingScrollToActiveScope.value) return
      const currentEl = scopeRowRefs[activeScopeId.value]
      if (!currentEl || !treeViewport.value?.clientHeight) return
      if (isRouteRowVisible(currentEl)) {
        pendingScrollToActiveScope.value = false
        return
      }
      scrollTo(currentEl)
      pendingScrollToActiveScope.value = false
    })
  })
}

function setExpandedRoutesPath(path) {
  for (const key of Object.keys(expandedRoutes.value)) {
    if (!path.includes(key)) delete expandedRoutes.value[key]
  }
  for (const key of path) {
    expandedRoutes.value[key] = true
  }
}

function expandActiveRouteAndScopes() {
  const path = findPathToRoute(filteredRouteTree.value || [], sharedRouteName.value) || []
  setExpandedRoutesPath(path)
  autoExpandScopes()
}

function onToolbarRouteClick() {
  requestActiveRouteScroll(true)
  requestActiveScopeScroll(true)
}

function scrollToRouteLetter(item) {
  if (!item?.routeName) return
  const path = findPathToRoute(filteredRouteTree.value || [], item.routeName)
  if (path) setExpandedRoutesPath(path)
  nextTick(() => {
    const el = routeRowRefs[item.routeName]
    if (el) scrollTo(el)
  })
}

function scrollTo(el) {
  el?.scrollIntoView({ block: "center", behavior: "smooth" })
  // if (!el || !treeViewport.value) return
  // const container = treeViewport.value
  // const containerRect = container.getBoundingClientRect()
  // const elRect = el.getBoundingClientRect()
  // const rowTop = elRect.top - containerRect.top + container.scrollTop
  // const rowCenter = rowTop + elRect.height / 2
  // const targetAnchor = container.clientHeight / 3
  // const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
  // const targetScrollTop = Math.min(maxScrollTop, Math.max(0, rowCenter - targetAnchor))
  // container.scrollTo({ top: targetScrollTop, behavior: "smooth" })
}

function isRouteRowVisible(el) {
  if (!el || !treeViewport.value) return false
  const containerRect = treeViewport.value.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom
}

function onToggleNode({ kind, key }) {
  if (!key) return
  if (kind === "scope") {
    expandedScopes.value[key] = !expandedScopes.value[key]
    return
  }
  expandedRoutes.value[key] = !expandedRoutes.value[key]
}

function goToRoute(routeName) {
  if (!routeName) return
  bngVue.gotoGameState(routeName)
}

function updateScopeOverlay() {
  if (!hoveredScopeElement.value || !hoveredScopeElement.value.isConnected) {
    scopeOverlay.value = { ...scopeOverlay.value, visible: false }
    scopeOverlayRaf = 0
    return
  }
  const rect = hoveredScopeElement.value.getBoundingClientRect()
  scopeOverlay.value = {
    visible: rect.width > 0 && rect.height > 0,
    top: rect.top - 1,
    left: rect.left - 1,
    width: rect.width + 2,
    height: rect.height + 2,
  }
  scopeOverlayRaf = requestAnimationFrame(updateScopeOverlay)
}

function onScopeHover(scopeNode) {
  hoveredScopeElement.value = scopeNode?.element
    || document.querySelector(`[bng-ui-scope="${scopeNode?.id}"]`)
    || null
  if (scopeOverlayRaf) cancelAnimationFrame(scopeOverlayRaf)
  updateScopeOverlay()
}

function onScopeLeave() {
  hoveredScopeElement.value = null
  if (scopeOverlayRaf) {
    cancelAnimationFrame(scopeOverlayRaf)
    scopeOverlayRaf = 0
  }
  scopeOverlay.value = { ...scopeOverlay.value, visible: false }
}

const updateRoute = data => {
  sharedRouteName.value = resolveRouteName(data, routeName.value)
  if (ngRoutes.value.length === 0) readAngularRoutes()
}

watch(hasPopup, (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (savedScrollTop.value <= 0) return

  if (restoreScrollInterval) clearInterval(restoreScrollInterval)

  // Aggressively restore scroll position during the Teleport window
  // Teleport happens immediately on open, and after 200ms on close.
  const duration = newVal ? 100 : 300
  const endTime = Date.now() + duration

  restoreScrollInterval = setInterval(() => {
    if (Date.now() > endTime) {
      clearInterval(restoreScrollInterval)
      restoreScrollInterval = null
      return
    }
    if (treeViewport.value && treeViewport.value.scrollTop === 0) {
      isRestoringScroll = true
      treeViewport.value.scrollTop = savedScrollTop.value
      nextTick(() => { isRestoringScroll = false })
    }
  }, 10)
})

watch(sharedRouteName, () => {
  if (!visible.value) return
  requestActiveRouteScroll()
})

watch(activeScopeId, () => {
  if (!visible.value) return
  requestActiveScopeScroll()
})

watch(scopeTree, () => {
  if (!visible.value) return
  requestActiveRouteScroll()
  requestActiveScopeScroll()
  // autoExpandScopes()
}, { deep: true })

watch(autoScrollEnabled, enabled => {
  if (!enabled || !visible.value) return
  requestActiveRouteScroll()
  requestActiveScopeScroll()
})

onMounted(() => {
  if (ngRoutes.value.length === 0) readAngularRoutes()
  events.on("ui_router_routeChange", updateRoute)
  events.on("ui_router_routeRefresh", updateRoute)
})

onUnmounted(() => {
  if (restoreScrollInterval) clearInterval(restoreScrollInterval)
  pendingScrollToActive.value = false
  pendingScrollToActiveScope.value = false
  onScopeLeave()
  unregisterPanelButton?.()
  stopAngularRoutesRetry()
})

defineExpose({
  getTreeViewport: () => treeViewport.value,
  isVisible: () => visible.value,
  setVisible,
})
</script>

<style lang="scss" scoped>
.routes-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.35rem 0.45rem 0.45rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.toolbar-title {
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--bng-add-indigoblue-300);
}

.toolbar-route {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-scope {
  flex: 0 0 auto;
  color: var(--bng-add-magenta-200);
  white-space: nowrap;
}

.filters {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.filters > button {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--bng-cool-gray-100);
  border-radius: var(--bng-corners-1);
  padding: 0.08rem 0.3rem;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.filter-dev {
  color: var(--bng-orange-400) !important;
}

.filter-lua {
  color: var(--bng-add-blue-500) !important;
}

.filter-vue {
  color: var(--bng-add-green-400) !important;
}

.filter-ng {
  color: var(--bng-add-red-600) !important;
}

.letter-shortcuts {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
  padding: 0.15rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.letter-shortcut {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--bng-cool-gray-100);
  border-radius: var(--bng-corners-1);
  padding: 0.05rem 0.25rem;
  cursor: pointer;
  font-size: 0.74rem;
  line-height: 1rem;

  &:hover {
    color: var(--bng-orange-b300);
    background: rgba(255, 120, 0, 0.14);
  }
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--bng-white);
  border-radius: var(--bng-corners-1);
  cursor: pointer;
  width: 1.3rem;
  height: 1.3rem;
}

.tree {
  max-height: 17rem;
  overflow-x: hidden;
}

.tree-viewport {
  max-height: 17rem;
  overflow-y: auto;
  overflow-x: hidden;
  overflow-anchor: none;
}

.tree-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tree-table :deep(.tree-row:hover) {
  background: #fff1;
}

.tree-table thead {
  position: sticky;
  top: 0;
  background: rgba(20, 24, 30, 0.95);
  z-index: 2;
}

.tree-table th {
  text-align: left;
  padding: 0.12rem 0.2rem;
  color: var(--bng-cool-gray-300);
  font-size: 0.82rem;
  font-weight: 600;
}

.th-route {
  width: 70%;
}

.th-flags {
  width: 30%;
}

.footer {
  color: var(--bng-cool-gray-300);
  font-size: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 0.2rem;
}

.scope-overlay {
  position: fixed;
  pointer-events: none;
  border: 2px dashed var(--bng-add-magenta-400);
  box-sizing: border-box;
  z-index: 20000;
}
</style>
