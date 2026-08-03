<template>
  <div v-show="visible" class="covers-rollup">
    <div class="covers-row covers-head">
      <span class="covers-title">Screen Covers</span>
      <span class="covers-foot-note">Independent UI overlays</span>
    </div>

    <div class="covers-section">
      <div class="covers-row">
        <span class="covers-label">LoadingScreen</span>
        <span class="covers-value">
          <span :class="loadingScreen.shown ? 'green' : 'muted'">{{ loadingScreen.shown ? "shown" : "hidden" }}</span>
          <span class="covers-chip" :class="{ green: loadingScreen.active }">active {{ boolText(loadingScreen.active) }}</span>
          <span class="covers-chip" :class="{ green: loadingScreen.visible }">visible {{ boolText(loadingScreen.visible) }}</span>
          <span class="covers-chip" :class="{ green: loadingScreen.fading }">fading {{ boolText(loadingScreen.fading) }}</span>
        </span>
      </div>
    </div>

    <div class="covers-section">
      <div class="covers-row">
        <span class="covers-label">Popup</span>
        <span class="covers-value">
          <span :class="popupCount > 0 ? 'green' : 'muted'">{{ popupCount }} popups</span>
          <span class="covers-chip">activities {{ activityCount }}</span>
          <span class="covers-chip" :class="{ green: popupsView.popupsWrapper.fade }">fade {{ boolText(popupsView.popupsWrapper.fade) }}</span>
          <span class="covers-chip" :class="{ green: popupsView.popupsWrapper.blur }">blur {{ boolText(popupsView.popupsWrapper.blur) }}</span>
        </span>
      </div>
      <div v-if="popupItems.length" class="covers-list">
        <div v-for="popup in popupItems" :key="popup.id" class="covers-list-item">
          <span class="covers-item-title">{{ popup.typeName }}</span>
          <span class="covers-item-value">{{ popup.componentName || "-" }}</span>
        </div>
      </div>
    </div>

    <div class="covers-section">
      <div class="covers-row">
        <span class="covers-label">Popover</span>
        <span class="covers-value">
          <span :class="popoverShownCount > 0 ? 'green' : 'muted'">{{ popoverShownCount }} shown</span>
          <span class="covers-chip">registered {{ popoverRegisteredCount }}</span>
        </span>
      </div>
      <div v-if="popoverItems.length" class="covers-list">
        <div v-for="item in popoverItems" :key="item.name" class="covers-list-item">
          <span class="covers-item-title">{{ item.name }}</span>
          <span class="covers-item-value">{{ item.placement || "-" }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onUnmounted, provide, ref } from "vue"
import { loadingScreen } from "@/services/screenCover"
import { popupsView } from "@/services/popup"
import { usePopover } from "@/services/popover"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const popover = usePopover()
const visible = ref(false)
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)

const popupItems = computed(() => popupsView.popups || [])
const activityItems = computed(() => popupsView.activities || [])
const popupCount = computed(() => popupItems.value.length)
const activityCount = computed(() => activityItems.value.length)
const popoverItems = computed(() => Object.entries(popover.popovers || {})
  .filter(([, item]) => item?.show)
  .map(([name, item]) => ({ name, ...item })))
const popoverShownCount = computed(() => popoverItems.value.length)
const popoverRegisteredCount = computed(() => Object.keys(popover.popovers || {}).length)
const activeCoverCount = computed(() =>
  (loadingScreen.shown ? 1 : 0)
  + (popupCount.value > 0 ? 1 : 0)
  + (popoverShownCount.value > 0 ? 1 : 0)
)

function boolText(value) {
  return value ? "yes" : "no"
}

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("screen-covers")
  visible.value = nextVisible
}

function togglePanel() {
  setVisible(!visible.value)
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "screen-covers",
  order: 5,
  tooltip: "Toggle screen covers panel",
  label: computed(() => `Covers ${activeCoverCount.value}`),
  parts: computed(() => [
    { text: "Covers " },
    { text: activeCoverCount.value, class: activeCoverCount.value > 0 ? "green" : "muted" },
  ]),
  expanded: computed(() => visible.value),
  active: computed(() => visible.value || activeCoverCount.value > 0),
  onClick: togglePanel,
  close: () => setVisible(false),
})

onUnmounted(() => unregisterPanelButton?.())
</script>

<style lang="scss" scoped>
.covers-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.covers-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
}

.covers-head {
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.covers-title {
  flex: 0 0 auto;
  font-weight: 700;
}

.covers-foot-note {
  flex: 1 1 auto;
  color: var(--bng-cool-gray-300);
  font-size: 0.74rem;
}

.covers-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.covers-label {
  flex: 0 0 auto;
  width: 6.5rem;
  color: var(--bng-cool-gray-300);
}

.covers-value {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  min-width: 0;
}

.covers-chip {
  padding: 0 0.28rem;
  border: 1px solid var(--bng-cool-gray-500);
  border-radius: var(--bng-corners-1);
  font-size: 0.7rem;
  line-height: 1.15rem;
  background: rgba(255, 255, 255, 0.04);
  white-space: nowrap;
}

.covers-list {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  padding-left: 6.9rem;
}

.covers-list-item {
  display: flex;
  gap: 0.35rem;
  color: var(--bng-cool-gray-200);
  font-size: 0.72rem;
}

.covers-item-title {
  flex: 0 0 auto;
  color: var(--bng-add-indigoblue-300);
}

.covers-item-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.green {
  color: var(--bng-add-green-300);
}

.muted {
  color: var(--bng-cool-gray-300);
}
</style>
