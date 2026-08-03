<template>
  <div v-show="visible" class="uinav-rollup">
    <div class="uinav-row">
      <span class="uinav-label">Last event</span>
      <span class="uinav-value">{{ lastEventText }}</span>
    </div>
    <div class="uinav-row">
      <span class="uinav-label">Actions</span>
      <span class="uinav-value">
        <template v-if="items.length">
          <span
            v-for="item in items"
            :key="item.name"
            :class="['uinav-event-chip', `status-${item.status}`, { blocked: item.blocked }]"
            @mouseenter="onChipHover($event, item)"
            @mouseleave="onChipLeave"
            @click.stop="onChipClick(item)"
          >
            {{ item.name }}
          </span>
        </template>
        <template v-else>-</template>
      </span>
    </div>
    <div class="uinav-row uinav-legend-row">
      <span class="uinav-label">Legend</span>
      <span class="uinav-value uinav-legend">
        <span class="uinav-event-chip status-synced">synced</span>
        <span class="uinav-event-chip status-pending">pending</span>
        <span class="uinav-event-chip status-stale">stale</span>
        <span class="uinav-event-chip status-syncing">syncing</span>
        <span class="uinav-event-chip status-unused">unused</span>
        <span class="uinav-event-chip status-idle blocked">blocked</span>
        <span class="uinav-event-chip status-idle">idle</span>
      </span>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="overlay.visible"
      class="uinav-listener-overlay"
      :style="overlayStyle"
    >
      <div v-if="overlay.label" class="uinav-listener-overlay-label">
        <div class="uinav-listener-overlay-component">{{ overlay.label }}</div>
        <div v-if="overlay.definition" class="uinav-listener-overlay-definition">
          {{ overlay.definition }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, provide, ref } from "vue"
import { useEvents } from "@/services/events"
import { useInfoBar } from "@/services/infoBar"
import { useUINavTracker } from "@/services/uiNavTracker"
import { ACTIONS_BY_UI_EVENT, getUINavScopeRegistry } from "@/services/uiNav"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const IE_TOOLTIP = "IEPanelTooltip"
const events = useEvents()
const infoBar = useInfoBar()
const uiNavTracker = useUINavTracker()
const tooltip = inject(IE_TOOLTIP, { showTooltip() {}, updateTooltip() {}, hideTooltip() {} })
const visible = ref(false)
const panelHoverDelay = 2000
const hoverLogDelay = 2000
const tooltipOwnerLimit = 20
const panelHoverProgress = ref({
  pending: false,
  progressKey: 0,
})
const overlay = ref({
  visible: false,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  label: "",
  definition: "",
})
const hoveredElement = ref(null)
const lastEventText = ref("-")
let panelHoverTimer = null
let hoverTimer = null
let overlayRaf = 0
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)

const formatOwnerGroup = (label, ownerIds = []) => {
  const visibleIds = ownerIds.slice(0, tooltipOwnerLimit)
  const remainingCount = ownerIds.length - visibleIds.length
  const suffix = remainingCount > 0 ? `, ... +${remainingCount} more` : ""
  const ids = visibleIds.length > 0 ? `${visibleIds.join(", ")}${suffix}` : "-"
  return `${label}: ${ids}`
}

const items = computed(() => {
  const listening = new Set((uiNavTracker.activeEvents || []).map(item => item.name).filter(Boolean))
  const blocking = new Set((uiNavTracker.blockedEvents || []).filter(Boolean))
  const unblocking = new Set((uiNavTracker.unblockedEvents || []).filter(Boolean))
  const allNames = Object.keys(ACTIONS_BY_UI_EVENT)

  return allNames.map(name => {
    const ownerDebug = uiNavTracker.getEventOwnerDebugInfo?.(name) || {
      tracked: [],
      trackedDetails: [],
      blocked: [],
      unblocked: [],
      ignored: [],
    }
    const explicitlyUnblocked = unblocking.has(name) || (Array.isArray(ownerDebug.unblocked) && ownerDebug.unblocked.length > 0)
    const desired = !!uiNavTracker.actionStates?.desired?.[name]
    const applied = !!uiNavTracker.actionStates?.applied?.[name]
    const syncing = !!uiNavTracker.actionStates?.syncInFlight?.[name] || !!uiNavTracker.actionStates?.syncQueued?.[name]
    const blocked = blocking.has(name) && !explicitlyUnblocked
    const listened = listening.has(name)
    const referenced = listened || blocked || desired || applied || syncing
    let status = "unused"
    if (syncing) status = "syncing"
    else if (desired && applied) status = "synced"
    else if (desired && !applied) status = "pending"
    else if (applied && !desired) status = "stale"
    else if (referenced) status = "idle"
    return {
      name,
      status,
      blocked,
      ownerDebug,
      ownersLines: [
        formatOwnerGroup("Tracked", ownerDebug.tracked),
        formatOwnerGroup("Blocked", ownerDebug.blocked),
        formatOwnerGroup("Unblocked", ownerDebug.unblocked),
        formatOwnerGroup("Ignored", ownerDebug.ignored),
      ],
    }
  })
})
const activeCount = computed(() => items.value.filter(item => item.status !== "unused").length)
const blockedCount = computed(() => items.value.filter(item => item.blocked).length)
const overlayStyle = computed(() => ({
  top: `${overlay.value.top}px`,
  left: `${overlay.value.left}px`,
  width: `${overlay.value.width}px`,
  height: `${overlay.value.height}px`,
}))

function clearPanelHoverTimer() {
  if (panelHoverTimer) {
    clearTimeout(panelHoverTimer)
    panelHoverTimer = null
  }
  panelHoverProgress.value.pending = false
}

function setVisible(state) {
  const nextVisible = !!state
  clearPanelHoverTimer()
  if (nextVisible) panelButtonRegistry?.closePanels("uinav")
  visible.value = nextVisible
}

function togglePanel() {
  setVisible(!visible.value)
}

function onPanelHover() {
  if (visible.value || panelHoverTimer) return
  panelHoverProgress.value.pending = true
  panelHoverProgress.value.progressKey += 1
  panelHoverTimer = setTimeout(() => {
    panelHoverTimer = null
    panelHoverProgress.value.pending = false
    setVisible(true)
  }, panelHoverDelay)
}

function clearHoverTimer() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

function getVueInstanceName(instance) {
  return instance?.type?.__name
    || instance?.type?.name
    || instance?.type?.displayName
    || instance?.proxy?.$options?.name
    || ""
}

function getVueComponentName(element) {
  let instance = element?.__vueParentComponent || null
  while (instance) {
    const name = getVueInstanceName(instance)
    if (name) return name
    instance = instance.parent
  }
  return ""
}

function getElementOverlayRect(element) {
  if (element === document.body || element === document.documentElement) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  return element.getBoundingClientRect()
}

function shouldShowOverlay(item) {
  return item?.status === "synced" && !item?.blocked
}

function getTrackedReceiverInfo(item) {
  const ownerDebug = uiNavTracker.getEventOwnerDebugInfo?.(item?.name) || item?.ownerDebug || {}
  const trackedDetails = Array.isArray(ownerDebug.trackedDetails) ? ownerDebug.trackedDetails : []
  const detail = trackedDetails.findLast(detail =>
    detail?.source
    && detail.live
    && !detail.isBlocker
    && detail.element?.isConnected
  )
  if (!detail) return null
  return {
    element: detail.element,
    definition: detail.source,
  }
}

function getPassiveHandlerReceiverInfo(item) {
  const element = getUINavScopeRegistry()?.getFirstReceiverElement?.(item.name) || null
  if (!element) return null
  const ownerDebug = uiNavTracker.getEventOwnerDebugInfo?.(item?.name) || item?.ownerDebug || {}
  const trackedDetails = Array.isArray(ownerDebug.trackedDetails) ? ownerDebug.trackedDetails : []
  const detail = trackedDetails.findLast(detail =>
    detail?.source
    && detail.element === element
  )
  return {
    element,
    definition: detail?.source || "",
  }
}

function getReceiverInfo(item) {
  if (!shouldShowOverlay(item)) return null
  return getPassiveHandlerReceiverInfo(item)
    || getTrackedReceiverInfo(item)
    || null
}

function updateOverlay() {
  if (!hoveredElement.value || !hoveredElement.value.isConnected) {
    overlay.value = { ...overlay.value, visible: false }
    overlayRaf = 0
    return
  }
  const rect = getElementOverlayRect(hoveredElement.value)
  overlay.value = {
    visible: rect.width > 0 && rect.height > 0,
    top: rect.top - 1,
    left: rect.left - 1,
    width: rect.width + 2,
    height: rect.height + 2,
    label: overlay.value.label,
    definition: overlay.value.definition,
  }
  overlayRaf = requestAnimationFrame(updateOverlay)
}

function showOverlay(item) {
  const receiver = getReceiverInfo(item)
  hoveredElement.value = receiver?.element || null
  overlay.value = {
    ...overlay.value,
    label: getVueComponentName(hoveredElement.value),
    definition: receiver?.definition || "",
  }
  if (overlayRaf) cancelAnimationFrame(overlayRaf)
  updateOverlay()
}

function hideOverlay() {
  hoveredElement.value = null
  if (overlayRaf) {
    cancelAnimationFrame(overlayRaf)
    overlayRaf = 0
  }
  overlay.value = { ...overlay.value, visible: false }
}

function onChipHover(evt, item) {
  tooltip.showTooltip(evt.currentTarget, {
    title: item.name,
    lines: item.ownersLines,
    progress: { label: "Hold to log details", delay: hoverLogDelay },
  })
  showOverlay(item)
  clearHoverTimer()
  hoverTimer = setTimeout(() => {
    hoverTimer = null
    tooltip.updateTooltip({
      title: item.name,
      lines: item.ownersLines,
      note: "See details in console",
    })
    logEventDetails(item)
  }, hoverLogDelay)
}

function onChipLeave() {
  tooltip.hideTooltip()
  hideOverlay()
  clearHoverTimer()
}

function onChipClick(item) {
  clearHoverTimer()
  logEventDetails(item)
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function hintContainsUiEvent(hint, eventName) {
  return asArray(hint?.content).some(content => content?.props?.uiEvent === eventName)
}

function getInfoBarHintDebug(eventName, ownerDebug, trackedDetails) {
  const activeEvents = uiNavTracker.activeEvents || []
  const activeEvent = activeEvents.find(event => event.name === eventName)
  const trackedCount = trackedDetails.length
  const liveCount = trackedDetails.filter(detail => detail.live).length
  const blocked = !!ownerDebug.blocked?.length && !ownerDebug.unblocked?.length
  const ignored = !!ownerDebug.ignored?.length
  const sourceHint = (infoBar.hintsList || []).find(hint => hintContainsUiEvent(hint, eventName))
  const groupedHint = (infoBar.hints || []).find(hint => hintContainsUiEvent(hint, eventName))
  let reason = "Hint should be available in the InfoBar output."

  if (!infoBar.visible) {
    reason = "InfoBar is hidden by the current route UI settings."
  } else if (!activeEvent) {
    if (blocked) reason = "Event is blocked and not force-unblocked, so uiNavTracker.activeEvents filters it out."
    else if (ignored) reason = "Event is ignored, so uiNavTracker.activeEvents filters it out."
    else if (trackedCount === 0) reason = "No registered tracker listener exists for this event."
    else if (liveCount === 0) reason = "Registered tracker listeners exist, but none are live/visible UI elements."
    else reason = "Event is tracked but not present in uiNavTracker.activeEvents."
  } else if (!sourceHint) {
    reason = "Event is active, but the InfoBar has not added its tracked hint yet."
  } else if (!groupedHint) {
    reason = "Hint exists before grouping, but is not present after InfoBar grouping/device filtering."
  }

  return {
    visible: !!infoBar.visible,
    active: !!activeEvent,
    inHintsList: !!sourceHint,
    inGroupedHints: !!groupedHint,
    status: infoBar.visible && sourceHint && groupedHint ? "shown" : "NOT shown",
    reason,
  }
}

const formatCheck = val => val ? "✅" : "❌"

function logInfoBarHintDebug(infoBarHintDebug) {
  console.log(`InfoBar hint: ${infoBarHintDebug.status}. Reason: ${infoBarHintDebug.reason}`)
  console.log([
    `InfoBar visible ${formatCheck(infoBarHintDebug.visible)}`,
    `Active UINav event ${formatCheck(infoBarHintDebug.active)}`,
    `Added to hintsList ${formatCheck(infoBarHintDebug.inHintsList)}`,
    `Present after grouping ${formatCheck(infoBarHintDebug.inGroupedHints)}`,
  ].join(" | "))
}

function logEventDetails(item) {
  if (!item) return
  const ownerDebug = item.ownerDebug || uiNavTracker.getEventOwnerDebugInfo?.(item.name) || {}
  const trackedDetails = Array.isArray(ownerDebug.trackedDetails) ? ownerDebug.trackedDetails : []
  const infoBarHintDebug = getInfoBarHintDebug(item.name, ownerDebug, trackedDetails)
  console.groupCollapsed(`[Navigator][UINav] ${item.name}`)
  console.log("State", {
    name: item.name,
    status: item.status,
    blocked: item.blocked,
    label: ownerDebug.actionLabel || null,
  })
  logInfoBarHintDebug(infoBarHintDebug)
  console.log("Owner IDs", {
    tracked: ownerDebug.tracked || [],
    blocked: ownerDebug.blocked || [],
    unblocked: ownerDebug.unblocked || [],
    ignored: ownerDebug.ignored || [],
  })
  if (trackedDetails.length > 0) {
    console.table(trackedDetails.map(detail => ({
      ownerId: detail.ownerId,
      isBlocker: detail.isBlocker,
      connected: detail.connected,
      live: detail.live,
      label: detail.label || null,
    })))
    trackedDetails.forEach((detail, index) => {
      console.log(`Tracked element #${index + 1} (${detail.ownerId})`, detail.element || null)
    })
  } else {
    console.log("No tracked owner details.")
  }
  console.groupEnd()
}

const onGameUiNavEvent = (name, value) => {
  if (typeof name !== "string") {
    lastEventText.value = "-"
    return
  }
  const suffix = typeof value === "number" ? ` ${value}` : ""
  lastEventText.value = `${name}${suffix}`
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "uinav",
  order: 30,
  tooltip: "Toggle UINav panel",
  label: computed(() => `UINav ${activeCount.value} / ${blockedCount.value}`),
  parts: computed(() => [
    { text: "UINav " },
    { text: activeCount.value, class: "green" },
    { text: " / " },
    { text: blockedCount.value, class: "red" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || activeCount.value > 0 || blockedCount.value > 0),
  progress: computed(() => panelHoverProgress.value),
  progressDelay: panelHoverDelay,
  onClick: togglePanel,
  onMouseenter: onPanelHover,
  onMouseleave: clearPanelHoverTimer,
  close: () => setVisible(false),
})

onMounted(() => {
  events.on("UINavigation", onGameUiNavEvent)
})

onUnmounted(() => {
  clearPanelHoverTimer()
  clearHoverTimer()
  hideOverlay()
  unregisterPanelButton?.()
})
</script>

<style lang="scss" scoped>
.uinav-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.uinav-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

.uinav-label {
  flex: 0 0 auto;
  width: 4.2rem;
  color: var(--bng-cool-gray-300);
  font-size: 0.78rem;
}

.uinav-value {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--bng-off-white);
  font-size: 0.78rem;
  overflow: hidden;
}

.uinav-event-chip {
  display: inline-block;
  position: relative;
  margin: 0 0.2rem 0.15rem 0;
  padding: 0 0.28rem;
  border: 1px solid var(--bng-cool-gray-500);
  border-radius: var(--bng-corners-1);
  font-size: 0.72rem;
  line-height: 1.15rem;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  cursor: pointer;
}

.status-pending {
  color: var(--bng-add-blue-300);
  border-color: var(--bng-add-blue-500);
  background: rgba(58, 128, 211, 0.14);
}

.status-synced {
  color: var(--bng-add-green-300);
  border-color: var(--bng-add-green-500);
  background: rgba(46, 178, 97, 0.14);
}

.status-stale {
  color: var(--bng-add-red-300);
  border-color: var(--bng-add-red-500);
  background: rgba(201, 69, 69, 0.14);
}

.status-syncing {
  color: var(--bng-ter-yellow-50);
  border-color: var(--bng-ter-yellow-400);
  background: rgba(229, 180, 31, 0.16);
}

.status-idle {
  color: var(--bng-off-white);
}

.status-unused {
  color: var(--bng-cool-gray-300);
  border-color: var(--bng-cool-gray-400);
  background: rgba(120, 126, 138, 0.28);
  opacity: 0.8;
}

.blocked {
  opacity: 0.8;
}

.blocked::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -8%;
  width: 116%;
  height: 3px;
  background: rgba(201, 69, 69, 0.65);
  transform: rotate(-20deg);
  transform-origin: center;
  pointer-events: none;
}

.uinav-legend-row {
  margin-top: -0.05rem;
}

.uinav-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
}

.uinav-listener-overlay {
  position: fixed;
  pointer-events: none;
  border: 2px solid var(--bng-add-magenta-400);
  box-sizing: border-box;
  z-index: 20001;
}

.uinav-listener-overlay-label {
  position: absolute;
  top: 0;
  left: 0;
  max-width: 100%;
  padding: 0.05rem 0.25rem;
  overflow: hidden;
  color: var(--bng-off-black);
  background: var(--bng-add-magenta-400);
  font-family: var(--fnt-defs);
  font-weight: 700;
  line-height: 1.15;
  pointer-events: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uinav-listener-overlay-component {
  overflow: hidden;
  font-size: 0.95rem;
  text-overflow: ellipsis;
}

.uinav-listener-overlay-definition {
  overflow: hidden;
  font-family: var(--fnt-mono);
  font-size: 0.68rem;
  font-weight: 600;
  opacity: 0.86;
  text-overflow: ellipsis;
}
</style>
