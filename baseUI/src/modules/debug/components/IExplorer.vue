<!-- Interface Explorer -->

<template>
  <div
    ref="navigatorRoot"
    id="route-navigator"
    :class="{ 'top-aligned': alignTop }"
    bng-no-nav="true"
    bng-no-child-nav="true"
    @mousedown.capture="captureMouseFocus"
    @click.capture="restoreMouseFocus"
  >
    <div class="panels">
      <IEPanelQuick />
      <IEPanelScreenCovers />
      <IEPanelRuntime v-if="isRuntime" />
      <IEPanelRoutes ref="routesPanel" />
      <IEPanelMods />
      <IEPanelUINav />
      <IEPanelHealth />
    </div>

    <div class="handle">
      <span
        class="handle-label"
        @mouseenter="showTooltip($event.currentTarget, 'Interface Explorer')"
        @mouseleave="hideTooltip"
      >UI</span>
      <button
        v-for="button in panelButtons"
        :key="button.id"
        class="panel-toggle-button"
        :class="{ active: button.active }"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        @mouseenter="onButtonMouseenter($event, button)"
        @mouseleave="onButtonMouseleave($event, button)"
        @click.stop="button.onClick?.($event)"
      >
        <span class="panel-toggle-label">
          <span>{{ getPanelArrow(button.expanded) }}</span>
          <span> </span>
          <template v-if="button.parts.length">
            <span
              v-for="(part, index) in button.parts"
              :key="index"
              :class="part.class"
            >{{ part.text }}</span>
          </template>
          <template v-else>{{ button.label }}</template>
        </span>
        <span
          v-if="button.progress?.pending"
          :key="button.progress.progressKey"
          class="panel-toggle-progress"
          :style="{ '--panel-hover-delay': `${button.progressDelay}ms` }"
        ></span>
      </button>
      <button class="align-toggle" bng-no-nav="true" tabindex="-1" type="button" @click.stop="toggleAlign">{{ alignTop ? "To bottom" : "To top" }}</button>
    </div>

    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="ie-tooltip"
        :class="{ below: tooltipBelow }"
        :style="tooltipStyle"
      >
        <div v-if="tooltip.title" class="ie-tooltip-title">{{ tooltip.title }}</div>
        <div v-for="(line, index) in tooltip.lines" :key="index" class="ie-tooltip-line">{{ line }}</div>
        <div
          v-if="tooltip.progress"
          :key="tooltip.progressKey"
          class="ie-tooltip-progress"
          :style="{ '--ie-tooltip-progress-delay': `${tooltip.progress.delay}ms` }"
        >
          <div v-if="tooltip.progress.label" class="ie-tooltip-progress-label">{{ tooltip.progress.label }}</div>
          <div class="ie-tooltip-progress-track">
            <div class="ie-tooltip-progress-fill"></div>
          </div>
        </div>
        <div v-if="tooltip.note" class="ie-tooltip-note">{{ tooltip.note }}</div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, provide, onUnmounted, unref } from "vue"
import IEPanelQuick from "@/modules/debug/components/IEPanels/IEPanelQuick.vue"
import IEPanelScreenCovers from "@/modules/debug/components/IEPanels/IEPanelScreenCovers.vue"
import IEPanelRoutes from "@/modules/debug/components/IEPanels/IEPanelRoutes.vue"
import IEPanelMods from "@/modules/debug/components/IEPanels/IEPanelMods.vue"
import IEPanelUINav from "@/modules/debug/components/IEPanels/IEPanelUINav.vue"
import IEPanelHealth from "@/modules/debug/components/IEPanels/IEPanelHealth.vue"
import IEPanelRuntime from "@/modules/debug/components/IEPanels/IEPanelRuntime.vue"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const IE_TOOLTIP = "IEPanelTooltip"
const isRuntime = __BNG_RT__

const alignTop = ref(!!window._NavigatorAtTop)
const navigatorRoot = ref(null)
const routesPanel = ref(null)
const panelButtonEntries = ref([])
const tooltip = ref({
  visible: false,
  title: "",
  lines: [],
  progress: null,
  progressKey: 0,
  note: "",
  x: 0,
  y: 0,
})
const tooltipBelow = ref(false)
let mouseFocusReturnTarget = null
let mouseFocusRestoreRaf = 0

const tooltipStyle = computed(() => ({
  left: `${tooltip.value.x}px`,
  top: `${tooltip.value.y}px`,
}))

// content can be a plain string (simple one-line tooltip) or a rich object:
// { title, lines: string[], progress: { label, delay }, note }
function normalizeContent(content) {
  if (content == null || content === "") return null
  if (typeof content === "string") return { title: "", lines: [content], progress: null, note: "" }
  return {
    title: content.title || "",
    lines: Array.isArray(content.lines) ? content.lines : content.lines ? [content.lines] : [],
    progress: content.progress || null,
    note: content.note || "",
  }
}

function applyContent(normalized) {
  tooltip.value = {
    ...tooltip.value,
    title: normalized.title,
    lines: normalized.lines,
    progress: normalized.progress,
    progressKey: normalized.progress ? tooltip.value.progressKey + 1 : tooltip.value.progressKey,
    note: normalized.note,
  }
}

function showTooltip(element, content) {
  const normalized = normalizeContent(content)
  if (!element || !normalized) return
  const rect = element.getBoundingClientRect()
  tooltipBelow.value = alignTop.value
  applyContent(normalized)
  tooltip.value.visible = true
  tooltip.value.x = rect.left + rect.width / 2
  tooltip.value.y = alignTop.value ? rect.bottom + 6 : rect.top - 6
}

// update content of an already visible tooltip without repositioning it
function updateTooltip(content) {
  const normalized = normalizeContent(content)
  if (!tooltip.value.visible || !normalized) return
  applyContent(normalized)
}

function hideTooltip() {
  tooltip.value.visible = false
}

function onButtonMouseenter(evt, button) {
  button.onMouseenter?.(evt)
  showTooltip(evt.currentTarget, button.tooltip)
}

function onButtonMouseleave(evt, button) {
  button.onMouseleave?.(evt)
  hideTooltip()
}

function registerPanelButton(config) {
  if (!config?.id) return () => {}
  const entry = { ...config, order: config.order ?? 0 }
  panelButtonEntries.value = [
    ...panelButtonEntries.value.filter(item => item.id !== entry.id),
    entry,
  ]
  return () => {
    panelButtonEntries.value = panelButtonEntries.value.filter(item => item !== entry)
  }
}

function closePanels(exceptId = "") {
  for (const entry of panelButtonEntries.value) {
    if (entry.id !== exceptId) entry.close?.()
  }
}

const panelButtons = computed(() => panelButtonEntries.value
  .map(entry => ({
    id: entry.id,
    order: entry.order,
    tooltip: unref(entry.tooltip) || "",
    label: unref(entry.label) || "",
    parts: unref(entry.parts) || [],
    expanded: !!unref(entry.expanded),
    active: !!unref(entry.active),
    progress: unref(entry.progress) || null,
    progressDelay: unref(entry.progressDelay) || 0,
    onClick: entry.onClick,
    onMouseenter: entry.onMouseenter,
    onMouseleave: entry.onMouseleave,
  }))
  .sort((a, b) => a.order - b.order))

provide(IE_PANEL_BUTTON_REGISTRY, { registerPanelButton, closePanels })
provide(IE_TOOLTIP, { showTooltip, updateTooltip, hideTooltip })

function toggleAlign() {
  alignTop.value = window._NavigatorAtTop = !alignTop.value
}

function getPanelArrow(expanded) {
  if (alignTop.value) return expanded ? "▲" : "▼"
  return expanded ? "▼" : "▲"
}

function isInsideNavigator(element) {
  return element instanceof Node && !!navigatorRoot.value?.contains(element)
}

function focusElement(element) {
  try {
    element.focus({ preventScroll: true })
  } catch {
    element.focus()
  }
}

function captureMouseFocus() {
  const activeElement = document.activeElement
  if (!activeElement || activeElement === document.body || isInsideNavigator(activeElement)) return
  if (typeof activeElement.focus !== "function") return
  mouseFocusReturnTarget = activeElement
}

function restoreMouseFocus() {
  if (mouseFocusRestoreRaf) cancelAnimationFrame(mouseFocusRestoreRaf)
  mouseFocusRestoreRaf = requestAnimationFrame(() => {
    mouseFocusRestoreRaf = 0
    const activeElement = document.activeElement
    if (!isInsideNavigator(activeElement)) return
    if (mouseFocusReturnTarget?.isConnected) {
      focusElement(mouseFocusReturnTarget)
      return
    }
    activeElement?.blur?.()
  })
}

onUnmounted(() => {
  if (mouseFocusRestoreRaf) cancelAnimationFrame(mouseFocusRestoreRaf)
  closePanels()
})
</script>

<style lang="scss" scoped>
#route-navigator {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  overflow: visible;
  width: max-content;
  max-width: calc(100vw - 1rem);
  z-index: 15000;
  color: var(--bng-off-white);
  font-family: var(--fnt-defs);
  background: rgba(0, 0, 0, 0.82);
  border: 1px solid var(--bng-cool-gray-700);
  border-bottom: none;
  border-top-left-radius: var(--bng-corners-2);
  border-top-right-radius: var(--bng-corners-2);
  pointer-events: all !important;
}

#route-navigator.top-aligned {
  top: 0;
  bottom: auto;
  flex-direction: column-reverse;
  border-top: none;
  border-bottom: 1px solid var(--bng-cool-gray-700);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: var(--bng-corners-2);
  border-bottom-right-radius: var(--bng-corners-2);
}

.panels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 0.2rem);
  pointer-events: none;
}

#route-navigator.top-aligned .panels {
  top: calc(100% + 0.2rem);
  bottom: auto;
}

.handle {
  min-height: 1.6rem;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.35rem;
  cursor: default;
  background: rgba(18, 22, 28, 0.9);
}

.ie-tooltip {
  position: fixed;
  z-index: 16000;
  max-width: min(28rem, 90vw);
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--bng-cool-gray-500);
  border-radius: var(--bng-corners-1);
  background: rgba(8, 10, 14, 0.97);
  color: var(--bng-off-white);
  font-size: 0.74rem;
  line-height: 1.2;
  box-shadow: 0 0.25rem 0.6rem rgba(0, 0, 0, 0.45);
  pointer-events: none;
  transform: translate(-50%, -100%);
}

.ie-tooltip.below {
  transform: translate(-50%, 0%);
}

.ie-tooltip-title {
  font-weight: 700;
  color: var(--bng-add-blue-300);
  margin-bottom: 0.12rem;
}

.ie-tooltip-line {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ie-tooltip-progress {
  margin-top: 0.28rem;
}

.ie-tooltip-progress-label {
  margin-bottom: 0.12rem;
  color: var(--bng-cool-gray-300);
  font-size: 0.68rem;
}

.ie-tooltip-progress-track {
  overflow: hidden;
  height: 0.18rem;
  border-radius: var(--bng-corners-1);
  background: rgba(255, 255, 255, 0.12);
}

.ie-tooltip-progress-fill {
  width: 100%;
  height: 100%;
  background: var(--bng-orange-b400);
  transform: scaleX(0);
  transform-origin: left center;
  animation: ie-tooltip-progress var(--ie-tooltip-progress-delay, 2000ms) linear forwards;
}

@keyframes ie-tooltip-progress {
  to {
    transform: scaleX(1);
  }
}

.ie-tooltip-note {
  margin-top: 0.28rem;
  color: var(--bng-cool-gray-200);
  font-size: 0.7rem;
  font-style: italic;
}

.handle-label {
  flex: 0 0 auto;
  font-weight: 700;
  white-space: nowrap;
}

.panel-toggle-button,
.align-toggle {
  flex: 0 0 auto;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--bng-cool-gray-100);
  border-radius: var(--bng-corners-1);
  padding: 0.08rem 0.3rem;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;

  &.active {
    color: var(--bng-orange-b300);
    background: rgba(255, 120, 0, 0.14);
  }
}

.align-toggle {
  margin-left: 0;
}

.panel-toggle-button {
  color: var(--bng-off-white) !important;
  position: relative;
  overflow: hidden;
}

.panel-toggle-label {
  position: relative;
  z-index: 1;
}

.panel-toggle-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 0.15rem;
  background: var(--bng-orange-b400);
  transform: scaleX(0);
  transform-origin: left center;
  animation: panel-hover-progress var(--panel-hover-delay, 2000ms) linear forwards;
  pointer-events: none;
}

.green {
  color: var(--bng-add-green-300);
}

.red {
  color: var(--bng-add-red-300);
}

.muted {
  color: var(--bng-cool-gray-300);
}

.status-healthy {
  color: var(--bng-add-green-300);
}

.status-unhealthy {
  color: var(--bng-add-red-300);
}

@keyframes panel-hover-progress {
  to {
    transform: scaleX(1);
  }
}
</style>
