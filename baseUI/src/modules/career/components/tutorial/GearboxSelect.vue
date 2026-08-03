<template>
  <div class="gearbox-select-panel"
  :style="panelStyle"
  >
    <div class="gearbox-select-top">

      <Button
        ref="modeSelectorRef"
        class="gearbox-model-slider-container"
        :tab-index="0"
        :nav-item="true"
        bng-no-child-nav="true"
        v-bng-on-ui-nav:ok.focusRequired="onModeSelectorOk"
        v-bng-on-ui-nav:focus_l.focusRequired="onModeSelectorLeft"
        v-bng-on-ui-nav:focus_r.focusRequired="onModeSelectorRight"
        @click.prevent="onModeSelectorOk"
      >
        <template #background />
        <div
          class="gearbox-mode-slider-track"
          :data-selected-mode="selectedMode"
          role="radiogroup"
          :aria-label="$tt('ui.options.shiftMode.gearboxModeRowHeader', { mode: selectedModeTitle })"
        >
          <div class="gearbox-mode-slider-thumb" />
          <div
            class="gearbox-mode-option"
            role="button"
            :style="{ color: selectedMode === 'arcade' ? 'rgba(var(--bng-off-black-rgb), 0.96)' : 'rgba(var(--bng-off-white-rgb), 0.96)' }"
            :aria-pressed="selectedMode === 'arcade'"
            @click.stop="selectMode('arcade')"
          >
            {{ $tt("ui.options.shiftMode.arcadeTitle") }}
          </div>
          <div
            class="gearbox-mode-option"
            role="button"
            :style="{ color: selectedMode === 'realistic' ? 'rgba(var(--bng-off-black-rgb), 0.96)' : 'rgba(var(--bng-off-white-rgb), 0.96)' }"
            :aria-pressed="selectedMode === 'realistic'"
            @click.stop="selectMode('realistic')"
          >
            {{ $tt("ui.options.shiftMode.realisticTitle") }}
          </div>
        </div>
      </Button>
    </div>

    <div class="gearbox-select-bottom">
      <section class="gearbox-bottom-col gearbox-description-col">

        <div class="gearbox-description-scroll">

          <p class="gearbox-paragraph">
            <template v-for="(part, i) in selectedModeDescParts" :key="`mode-${i}`">
              <span v-if="part.t === 'text'" class="gearbox-inline-text" v-html="part.v" />
              <BngBinding v-else :action="part.action" show-unassigned />
            </template>
          </p>

          <BngButton
            ref="clutchAssistToggleRef"
            v-show="selectedMode === 'realistic'"
            class="gearbox-assist-toggle-row"
            :style="{ '--assist-enabled': autoClutch ? 1 : 0 }"
            :accent="ACCENTS.custom_old"
            @click="onToggleAutoClutch"
          >
            <div class="gearbox-assist-title-wrap">
              <span class="gearbox-assist-title">{{ clutchAssistantTitle }}</span>
              <div class="gearbox-assist-switch-wrap" @click.stop>
                <BngSwitch v-model="autoClutch" bng-no-nav="true" tabindex="-1" />
              </div>
            </div>
            <p v-if="selectedMode === 'realistic'" class="gearbox-paragraph assist-desc">
              <template v-for="(part, i) in clutchAssistantDescParts" :key="`clutch-${i}`">
                <span v-if="part.t === 'text'" class="gearbox-inline-text" v-html="part.v" />
                <BngBinding v-else :action="part.action" show-unassigned />
              </template>
            </p>

          </BngButton>

          <BngButton
            v-show="selectedMode === 'realistic'"
            class="gearbox-assist-toggle-row"
            :style="{ '--assist-enabled': autoThrottle ? 1 : 0 }"
            :accent="ACCENTS.custom_old"
            @click="onToggleAutoThrottle"
          >
            <div class="gearbox-assist-title-wrap">
              <span class="gearbox-assist-title">{{ throttleAssistantTitle }}</span>
              <div class="gearbox-assist-switch-wrap" @click.stop>
                <BngSwitch v-model="autoThrottle" bng-no-nav="true" tabindex="-1" />
              </div>
            </div>
            <p class="gearbox-paragraph assist-desc">
              <template v-for="(part, i) in throttleAssistantDescParts" :key="`throttle-${i}`">
                <span v-if="part.t === 'text'" class="gearbox-inline-text" v-html="part.v" />
                <BngBinding v-else :action="part.action" show-unassigned />
              </template>
            </p>
          </BngButton>



          <p class="gearbox-paragraph bottom">
            <template v-for="(part, i) in additionalAssistsTextParts" :key="`assist-${i}`">
              <span v-if="part.t === 'text'" class="gearbox-inline-text" v-html="part.v" />
              <BngBinding v-else :action="part.action" show-unassigned />
            </template>
          </p>
        </div>
      </section>

      <section class="gearbox-bottom-col gearbox-bindings-col">
        <ul v-if="keybindRows.length > 0" class="gearbox-keybind-list">
          <li
            v-for="row in keybindRows"
            :key="row.action"
            class="gearbox-keybind-row"
            :class="{ 'is-unused': row.unused }"
          >
            <span class="gearbox-keybind-label">{{ row.label }}</span>
            <BngBinding :action="row.action" show-unassigned />
          </li>
        </ul>
        <p v-else class="gearbox-keybind-empty">{{ $tt("ui.career.tutorial.popup.gearbox.noRelevantKeybinds") }}</p>
      </section>
    </div>

    <div class="gearbox-select-buttons">
      <BngButton
        class="gearbox-select-button-confirm"
        accent="ghost"
        @click="onConfirmSelection"
      >
        {{ $tt("ui.actions.confirm") }}
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngSwitch, BngButton, ACCENTS } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { useSettingsAsync } from "@/services/settings"
import useControls from "@/services/controls"
import { playSoundEvent } from "@/services/soundManager"
import { $translate, $content } from "@/services"
import { getAssetURL } from "@/utils"
import { lua } from "@/bridge"
import { vBngOnUiNav } from "@/common/directives"


defineOptions({ name: "GearboxSelect" })
const emit = defineEmits(["return"])

const props = defineProps({
  popup: {
    type: Object,
    default: null,
  },
})

const ARCADE_IMAGE = getAssetURL("images/tutorial/arcade.jpg")
const REALISTIC_IMAGE = getAssetURL("images/tutorial/realistic.jpg")

const selectedMode = ref("arcade")
const autoClutch = ref(false)
const autoThrottle = ref(false)
const modeSelectorRef = ref(null)
const clutchAssistToggleRef = ref(null)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const preloadedModeImages = []

function preloadModeImages() {
  if (typeof Image === "undefined") return
  ;[ARCADE_IMAGE, REALISTIC_IMAGE].forEach(src => {
    const img = new Image()
    img.src = src
    preloadedModeImages.push(img)
  })
}

function partsFromText(text) {
  const raw = text != null ? String(text) : ""
  const parts = []
  const rgx = /\[action=([^\]]+)\]/gi
  let lastIndex = 0
  let match
  while ((match = rgx.exec(raw)) !== null) {
    const head = raw.slice(lastIndex, match.index)
    if (head) parts.push({ t: "text", v: $content.bbcode.parse(head) })
    parts.push({ t: "binding", action: match[1].trim() })
    lastIndex = match.index + match[0].length
  }
  const tail = raw.slice(lastIndex)
  if (tail) parts.push({ t: "text", v: $content.bbcode.parse(tail) })
  return parts.length ? parts : [{ t: "text", v: $content.bbcode.parse(raw) }]
}

function toActionLabel(action) {
  return String(action || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

const selectedModeTitle = computed(() =>
  $translate.instant(selectedMode.value === "arcade" ? "ui.options.shiftMode.arcadeTitle" : "ui.options.shiftMode.realisticTitle")
)
const selectedModeDescRaw = computed(() =>
  $translate.instant(selectedMode.value === "arcade" ? "ui.options.shiftMode.arcadeDesc" : "ui.options.shiftMode.realisticDesc")
)
const clutchAssistantTitle = computed(() =>
  $translate.instant(autoClutch.value ? "ui.options.shiftMode.clutchAssistant.titleEnabled" : "ui.options.shiftMode.clutchAssistant.titleDisabled")
)
const clutchAssistantDescRaw = computed(() =>
  $translate.instant(autoClutch.value ? "ui.options.shiftMode.clutchAssistant.descEnabled" : "ui.options.shiftMode.clutchAssistant.descDisabled")
)
const throttleAssistantTitle = computed(() =>
  $translate.instant(
    autoThrottle.value ? "ui.options.shiftMode.throttleAssistant.titleEnabled" : "ui.options.shiftMode.throttleAssistant.titleDisabled"
  )
)
const throttleAssistantDescRaw = computed(() =>
  $translate.instant(
    autoThrottle.value ? "ui.options.shiftMode.throttleAssistant.descEnabled" : "ui.options.shiftMode.throttleAssistant.descDisabled"
  )
)
const additionalAssistsRaw = computed(() =>
  $translate.instant("ui.options.shiftMode.additionalAssists.text")
)

const selectedModeDescParts = computed(() => partsFromText(selectedModeDescRaw.value))
const clutchAssistantDescParts = computed(() => partsFromText(clutchAssistantDescRaw.value))
const throttleAssistantDescParts = computed(() => partsFromText(throttleAssistantDescRaw.value))
const additionalAssistsTextParts = computed(() => partsFromText(additionalAssistsRaw.value))
const panelStyle = computed(() => ({
  backgroundImage: `url(${selectedMode.value === "arcade" ? ARCADE_IMAGE : REALISTIC_IMAGE})`,
}))

const keybindRows = computed(() => {
  const rows = [
    { action: "accelerate", unused: false },
    { action: "brake", unused: false },
  ]
  if (isControllerUsed.value) {
    rows.push({ action: "steering", unused: false })
  } else {
    rows.push(
      { action: "steer_left", unused: false },
      { action: "steer_right", unused: false }
    )
  }
  if (selectedMode.value === "realistic") {
    rows.push(
      { action: "shiftUp", unused: false },
      { action: "shiftDown", unused: false },
      { action: "clutch", unused: false }
    )
  }

  return rows.map(row => ({
    ...row,
    label: `${toActionLabel(row.action)}${row.unused ? " (Unused)" : ""}`,
  }))
})

function selectMode(mode) {
  if (mode !== "arcade" && mode !== "realistic") return
  selectedMode.value = mode
}

function playModeSelectorStepSound() {
  const el = modeSelectorRef.value?.getElement?.() || modeSelectorRef.value
  if (el) playSoundEvent(el, "click")
}
function onModeSelectorLeft() {
  playModeSelectorStepSound()
  selectMode("arcade")
}
function onModeSelectorRight() {
  playModeSelectorStepSound()
  selectMode("realistic")
}
function onModeSelectorOk() {
  selectMode(selectedMode.value === "arcade" ? "realistic" : "arcade")
  playModeSelectorStepSound()
}

function onToggleAutoClutch() {
  autoClutch.value = !autoClutch.value
}

function onToggleAutoThrottle() {
  autoThrottle.value = !autoThrottle.value
}

async function applySelectionAndNotify() {
  const settings = await useSettingsAsync()
  await settings.apply({
    defaultGearboxBehavior: selectedMode.value,
    autoClutch: autoClutch.value,
    autoThrottle: autoThrottle.value,
  })
  lua.extensions.hook("onShiftModeSelectedViaPopup", { mode: selectedMode.value })
  return true
}

async function onConfirmSelection() {
  const shouldClose = await applySelectionAndNotify()
  if (shouldClose === true) emit("return", true)
}

onMounted(async () => {
  preloadModeImages()

  const settings = await useSettingsAsync()
  const currentMode = settings.values.defaultGearboxBehavior
  if (currentMode === "arcade" || currentMode === "realistic") selectedMode.value = currentMode
  autoClutch.value = settings.values.autoClutch === true
  autoThrottle.value = settings.values.autoThrottle === true

  await nextTick()
  const focusTarget = modeSelectorRef.value?.getElement?.() || modeSelectorRef.value
  focusTarget?.focus?.()
})

defineExpose({
  onPopupClose: async () => await applySelectionAndNotify(),
})

</script>

<style lang="scss" scoped>
@use "@/styles/modules/density" as *;
@use "@/styles/modules/mixins" as *;

.gearbox-select-panel {
  width: min(70rem, calc(100vw - 2rem));
  max-width: 70rem;
  min-width: 0;
  min-height: clamp(32rem, 58vh, 44rem);
  overflow: hidden;
  box-sizing: border-box;
  background-color: rgba(var(--bng-black-rgb), 0.5);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  position: relative;
}

.gearbox-select-top {
  padding: 0.75rem;
  min-height: 13rem;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 1.0rem;
  flex: 1 0 auto;
  background: linear-gradient(180deg, rgba(var(--bng-off-black-rgb), 0) 30%, rgba(var(--bng-off-black-rgb), 0.6) 100%);

}

.gearbox-model-slider-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: stretch;
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  border: 1px solid rgba(var(--bng-off-white-rgb), 0.6);
  border-radius: 999px;
  background: var(--bng-black-o6);
  padding: 0;
  padding-left: 0.35rem;
  padding-right: 0.35rem;

  --bng-button-min-width: auto;
  --bng-button-max-width: 100%;
  --bng-button-margin: 0;
  --bng-button-padding: 0.05rem;
  --bng-button-padding-top: 0.05rem;
  --bng-button-padding-bottom: 0.05rem;

  @include modify-focus(999px, 4px);


}

.gearbox-mode-slider-track {
  flex: 1 1 auto;
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  min-height: 3.35rem;
  //padding: 0.28rem;

}

.gearbox-mode-slider-thumb {
  position: absolute;
  top: 0.28rem;
  bottom: 0.28rem;
  width: calc(50% - 0.0rem);
  border-radius: 999px;
  background: rgba(var(--bng-off-white-rgb), 0.94);
  transition: transform 0.2s ease;
}

.gearbox-mode-slider-track[data-selected-mode="realistic"] .gearbox-mode-slider-thumb {
  transform: translateX(100%);
}

.gearbox-mode-option {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--bng-off-white-rgb), 0.96);
  font-size: 1.45rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease;

}

.gearbox-mode-option-binding {
  flex: 0 0 auto;
  padding: 0.28rem;


}

.gearbox-mode-option-binding.left {
  padding-left: 0.35rem;
}

.gearbox-mode-option-binding.right {
  padding-right: 0.35rem;
}

.gearbox-image-space {
  flex: 1;
  min-height: 8.5rem;
}

.gearbox-select-bottom {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(15rem, 3fr);
  min-height: 18rem;
  max-height: 20rem;
  border-top: 1px solid rgba(var(--bng-off-white-rgb), 0.4);
  background: linear-gradient(180deg, var(--bng-black-o8) 0%, rgba(var(--bng-off-black-rgb), 1) 90%);
}

.gearbox-bottom-col {
  min-width: 0;
  min-height: 0;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: visible;
}

.gearbox-description-col{
  padding: 1rem 1rem;
}

.gearbox-bindings-col {
  border-left: 1px solid rgba(var(--bng-off-white-rgb), 0.4);
}

.gearbox-section-title {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.1;
  font-weight: 700;
  color: rgba(var(--bng-off-white-rgb), 0.98);
}

.gearbox-description-scroll {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow: visible;
  height: 100%;
}

.gearbox-paragraph {
  margin: 0;
  color: rgba(var(--bng-off-white-rgb), 0.9);
  line-height: 1.35;
  font-size: 1rem;
  padding: 0 0.75rem ;
  &.bottom {
    margin-top: auto;
    font-weight: 300;
    opacity: 0.0;
  }

}

.gearbox-inline-text {
  color: inherit;
}

.gearbox-assist-toggle-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 2.2rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(var(--bng-off-white-rgb), 0.33);
  border-radius: $border-rad-2;
  --assist-enabled: 0;
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.35);
  background-image: linear-gradient(
    90deg,
    rgba(var(--bng-orange-600-rgb), calc(0.44 * var(--assist-enabled))) 0%,
    rgba(var(--bng-orange-600-rgb), calc(0.26 * var(--assist-enabled))) 5%,
    rgba(var(--bng-orange-700-rgb), 0.0) 90%
  );
  --bng-button-max-width: 100%;
  --bng-button-custom-margin: 0.0rem;

  :deep(.background) {
    border-radius: inherit;
    background-color: rgba(var(--bng-cool-gray-800-rgb), 0.35);

  }
  .assist-desc {
    text-align: left;
    margin-top: 0.5rem;
    padding: 0;
  }
}

.gearbox-assist-title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 0.5rem;
}

.gearbox-assist-title {
  color: rgba(var(--bng-off-white-rgb), 0.92);
  font-size: 1rem;
  font-weight: 600;
}

.gearbox-assist-switch-wrap {
  display: flex;
  align-items: center;
}

.gearbox-keybind-list {
  margin: 0;
  padding: 0;
  list-style: none;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.gearbox-keybind-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.5rem;
  padding-bottom: 0.10rem;
  border-bottom: 1px solid rgba(var(--bng-off-white-rgb), 0.15);
}

.gearbox-keybind-row.is-unused {
  opacity: 0.45;
}

.gearbox-keybind-label {
  color: rgba(var(--bng-off-white-rgb), 0.86);
  font-size: 0.95rem;
  line-height: 1.2;
}

.gearbox-keybind-empty {
  margin: 0;
  color: rgba(var(--bng-off-white-rgb), 0.75);
  font-size: 0.95rem;
}


.gearbox-select-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0.5rem;
  background: var(--bng-off-black);
  padding: 0.35rem 0.5rem;

}

.gearbox-select-button-confirm {
  width: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  --font-size: 1.85rem;
  --bng-button-max-width: 100%;


  --bng-button-min-width: auto;
  --bng-button-max-width: 100%;

  --bng-button-padding: 0.5rem;
  --bng-button-padding-top: 0.5rem;
  --bng-button-padding-bottom: 0.5rem;

  --bng-bg-border-radius: var(--bng-corners-2);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-hover: var(--bng-cool-gray-700);
  --bng-bg-active: var(--bng-cool-gray-700);
  --bng-bg-disabled: var(--bng-cool-gray-700);

  --bng-bg-enabled-opacity: 0.60;
  --bng-bg-hover-opacity: 0.75;
  --bng-bg-active-opacity: 0.9;
  --bng-bg-disabled-opacity: 0.55;
  --bng-bg-focus-opacity: 0.85;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);
}
</style>
