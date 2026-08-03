<template>
  <div v-show="visible" class="quick-rollup">
    <div class="quick-head">
      <span class="quick-title">Shortcuts</span>
      <span class="quick-note">
        Useful quick links and toggles
        <span v-if="!hasDebugRoute">(Vuedev shows more)</span>
      </span>
    </div>

    <div class="quick-grid">
      <button
        class="quick-link"
        bng-no-nav="true"
        tabindex="-1"
        type="button"
        @click.stop="gotoRoute('menu')"
      >
        Main Menu
      </button>
      <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('pause')">
        Pause
      </button>
      <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('options')">
        Options
      </button>

      <template v-if="hasDebugRoute">
        <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('debug.components')">
          Component demos
        </button>
        <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('debug.components', { component: 'IconBrowser' })">
          Icon browser
        </button>
        <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('debug.components', { component: 'Colours' })">
          Colour browser
        </button>
        <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="gotoRoute('debug.scopedNav')">
          Scoped Nav
        </button>
        <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="toggleTranslationScrambleDebug">
          {{ translationScrambleDebug ? "✓" : "☐" }} Translation Scramble
        </button>
      </template>

      <button class="quick-link" bng-no-nav="true" tabindex="-1" type="button" @click.stop="$simplemenu.value = !$simplemenu.value">
        {{ $simplemenu.value ? "✓" : "☐" }} SimpleMenu
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, provide, ref } from "vue"
import router from "@/router"
import { useBridge } from "@/bridge"

const IE_PANEL_BUTTON_REGISTRY = "IEPanelButtonRegistry"
const IE_TOOLTIP = "IEPanelTooltip"
const bngVue = window.bngVue || {}
const { lua } = useBridge()
const visible = ref(false)
const translationScrambleDebug = ref(false)
const hasDebugRoute = computed(() => router.hasRoute("debug.components"))
const panelButtonRegistry = inject(IE_PANEL_BUTTON_REGISTRY, null)
if (panelButtonRegistry) provide(IE_PANEL_BUTTON_REGISTRY, panelButtonRegistry)
const tooltip = inject(IE_TOOLTIP, { showTooltip() {}, hideTooltip() {} })

function setVisible(state) {
  const nextVisible = !!state
  if (nextVisible) panelButtonRegistry?.closePanels("quick")
  visible.value = nextVisible
}

function togglePanel() {
  setVisible(!visible.value)
}

function gotoRoute(route, params) {
  bngVue.gotoGameState(route, { params })
  setVisible(false)
}

function mainmenu() {
  lua.returnToMainMenu()
  setVisible(false)
}

async function refreshTranslationScrambleDebug() {
  //translationScrambleDebug.value = !!(await lua.extensions.core_locales.getScrambleTranslationDebugEnabled())
}

async function toggleTranslationScrambleDebug() {
  const nextValue = !translationScrambleDebug.value
  translationScrambleDebug.value = !!(await lua.extensions.core_locales.setScrambleTranslationDebugEnabled(nextValue))
}

const unregisterPanelButton = panelButtonRegistry?.registerPanelButton({
  id: "quick",
  order: 0,
  tooltip: "Toggle quick links panel",
  label: "Shortcuts",
  parts: [{ text: "Shortcuts" }],
  expanded: computed(() => visible.value),
  active: computed(() => visible.value),
  onClick: togglePanel,
  close: () => setVisible(false),
})

onMounted(() => {
  refreshTranslationScrambleDebug()
})

onUnmounted(() => unregisterPanelButton?.())
</script>

<style lang="scss" scoped>
.quick-rollup {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.3rem 0.45rem;
  background: rgba(10, 12, 16, 0.92);
  border: 1px solid var(--bng-cool-gray-700);
  border-radius: var(--bng-corners-2);
  pointer-events: auto;
}

.quick-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 0.78rem;
}

.quick-title {
  flex: 0 0 auto;
  font-weight: 700;
}

.quick-note {
  flex: 1 1 auto;
  color: var(--bng-cool-gray-300);
  font-size: 0.74rem;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(7rem, 1fr));
  gap: 0.25rem;
}

.quick-link {
  border: 1px solid var(--bng-cool-gray-600);
  background: rgba(255, 255, 255, 0.06);
  color: var(--bng-off-white);
  border-radius: var(--bng-corners-1);
  padding: 0.18rem 0.35rem;
  cursor: pointer;
  font-size: 1rem;
  text-align: left;
  white-space: nowrap;

  &:hover {
    color: var(--bng-orange-b300);
    background: rgba(255, 120, 0, 0.14);
  }
}
</style>
