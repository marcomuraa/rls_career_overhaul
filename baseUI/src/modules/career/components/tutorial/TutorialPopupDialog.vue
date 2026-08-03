<template>
  <div
    class="popup tutorial-popup-dialog"
    v-bng-scoped-nav="popupScopeBinding"
    v-bng-on-ui-nav:tab_l="goPrevPopup"
    v-bng-on-ui-nav:tab_r="goNextPopup"
    v-bng-on-ui-nav:back,menu="() => {}"
  >
    <div class="popup-content">
      <div class="popup-title">
        <BngScreenHeadingV2 type="2">{{ $t(popupTitle) }}</BngScreenHeadingV2>
      </div>

      <component
        v-if="resolvedPopupComponent"
        ref="customPopupRef"
        :is="resolvedPopupComponent"
        :popup="currentPopup"
        :popups="popupList"
        @popup-primary-button-state="onEmbeddedPrimaryButtonState"
        @return="onEmbeddedComponentReturn"
      />
      <AspectRatio
        v-else
        class="tutorial-popup-media"
        ratio="1.46:1"
        slot-v-align="top"
        :slot-scroll="false"
        :external-image="popupImage || null"
        image-mode="cover"
      >
        <div v-if="hasContentText" class="tutorial-popup-overlay">
          <div class="tutorial-popup-spacer" />
          <div class="tutorial-popup-text-block" v-html="contentTextHtml" />
        </div>
      </AspectRatio>

      <div v-if="showPagination" class="tutorial-popup-pagination">
        <div class="tutorial-popup-pagination-indicator" bng-no-nav="true">
          <div
            v-for="idx in popupList.length"
            :key="idx"
            :class="{ active: idx - 1 === popupIndex }"
          />
        </div>
      </div>
      <div class="popup-buttons" v-if="showContinueButtons">
        <BngButton
          v-if="hasMultiplePopups"
          class="popup-button popup-button-prev"
          :accent="ACCENTS.outlined"
          @click="goPrevPopup"
        >
          {{ $tt("ui.career.tutorial.popup.button.previous") }}
        </BngButton>
        <BngButton
          class="popup-button popup-button-primary"
          bng-scoped-nav-autofocus
          v-bng-ui-nav-focus="popupActive ? 1000 : undefined"
          v-bng-focus-if="popupActive"
          v-bng-on-ui-nav:ok.asMouse.focusRequired
          :accent="ACCENTS.primary"
          :disabled="primaryButtonDisabled"
          @click="onPrimaryButtonClick"
        >
          {{ $tt(primaryButtonLabel) }}
        </BngButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeMount, onUnmounted, useAttrs } from "vue"
import { lua } from "@/bridge"
import { BngButton, BngScreenHeadingV2, ACCENTS } from "@/common/components/base"
import { AspectRatio } from "@/common/components/utility"
import { vBngFocusIf, vBngOnUiNav, vBngScopedNav, vBngUiNavFocus } from "@/common/directives"
import { $content, $translate } from "@/services"
import { useScopedNav, useScopedNavObserver } from "@/services/scopedNav/api"
import { SCOPED_NAV_OBSERVER_EVENTS } from "@/services/scopedNav/constants"

import GearboxSelect from "@/modules/career/components/tutorial/GearboxSelect.vue"
import OptionalChallengeSelect from "@/modules/career/components/tutorial/OptionalChallengeSelect.vue"
import DragTimeslipTutorialPopup from "@/modules/career/components/tutorial/DragTimeslipTutorialPopup.vue"
import DragTreeStagesTutorialPopup from "@/modules/career/components/tutorial/DragTreeStagesTutorialPopup.vue"
import ContractSign from "@/modules/career/components/tutorial/ContractSign.vue"
import ApmOnboardingPopup from "@/modules/career/components/tutorial/ApmOnboardingPopup.vue"

defineOptions({ name: "TutorialPopupDialog" })

const emit = defineEmits(["return"])

const props = defineProps({
  popups: {
    type: [Array, Object, String],
    default: undefined,
  },
  popupActive: {
    type: Boolean,
    default: false,
  },
  showContinueButtons: {
    type: Boolean,
    default: true,
  },
})

const popupIndex = ref(0)
const customPopupRef = ref(null)
const embeddedPrimaryButtonState = ref(null)

const attrs = useAttrs()
const scopeId = `tutorialPopupDialog__${attrs.__id}`
const popupScopeBinding = computed(() => ({
  scopeId,
  activated: props.popupActive,
  activateOnMount: props.popupActive,
  trapPolicy: "always",
  preferAutoFocus: true,
  canDeactivate: () => false,
}))

const { requestScopeFocus } = useScopedNav()

// When this popup's scope is (re)activated, forcibly pull focus back to the
// primary button so controller input lands here even if a late BigMap camera
// event tried to blur/steal focus during the popup's appearance.
function focusPrimaryButton(reason) {
  requestScopeFocus(scopeId, "[bng-scoped-nav-autofocus]", {
    force: true,
    activeOnly: false,
    reason,
  })
}

useScopedNavObserver((eventName, payload) => {
  if (payload?.scope?.id !== scopeId) return
  if (eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeActivated) {
    focusPrimaryButton("tutorial-popup-activated")
  } else if (eventName === SCOPED_NAV_OBSERVER_EVENTS.onScopeResumed) {
    focusPrimaryButton("tutorial-popup-resumed")
  }
})

onBeforeMount(() => {
  lua.simTimeAuthority.pushPauseRequest("tutorialPopupDialog")
})
onUnmounted(() => {
  lua.simTimeAuthority.popPauseRequest("tutorialPopupDialog")
})


const close = () => emit("return", true)

function parsePopups(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "object") return [raw]
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === "object") return [parsed]
    } catch {
      return []
    }
  }
  return []
}

function normalizePopup(entry) {
  if (!entry || typeof entry !== "object") return null
  return {
    ...entry,
    id: entry.id ?? null,
    title: entry.title ? String(entry.title) : "ui.career.tutorial.common.title",
    text: entry.text ? String(entry.text) : "",
    image: entry.image ? String(entry.image) : "",
    vueComponent: entry.vueComponent ? String(entry.vueComponent) : "",
  }
}

const popupList = computed(() => {
  const normalized = parsePopups(props.popups).map(normalizePopup).filter(Boolean)
  if (normalized.length > 0) return normalized
  return [
    {
      id: null,
      title: "ui.career.tutorial.common.title",
      text: "ui.career.tutorial.popup.missingData",
      image: "",
    },
  ]
})

watch(popupList, () => {
  popupIndex.value = 0
})

const currentPopup = computed(() => {
  const list = popupList.value
  return list[Math.min(popupIndex.value, list.length - 1)] || list[0]
})
watch(currentPopup, () => {
  embeddedPrimaryButtonState.value = null
})

const popupTitle = computed(() => currentPopup.value?.title || "ui.career.tutorial.common.title")
const popupImage = computed(() => currentPopup.value?.image || "")
const popupVueComponent = computed(() => currentPopup.value?.vueComponent || "")
const popupComponents = {
  ShiftModeSelect: GearboxSelect,
  GearboxSelect,
  OptionalChallengeSelect,
  DragTimeslipTutorialPopup,
  DragTreeStagesTutorialPopup,
  ContractSign,
  ApmOnboardingPopup,
}
const resolvedPopupComponent = computed(() => popupComponents[popupVueComponent.value] || null)
const contentText = computed(() => currentPopup.value?.text || " ")
const contentTextHtml = computed(() => $content.bbcode.parse($translate.instant(contentText.value)))
const hasContentText = computed(() => {
  const t = currentPopup.value?.text
  return typeof t === "string" && t.trim().length > 0
})
const showPagination = computed(() => popupList.value.length > 1)
const hasMultiplePopups = computed(() => popupList.value.length > 1)
const hasNext = computed(() => popupIndex.value < popupList.value.length - 1)
const closeLabel = computed(() => (hasNext.value ? "ui.career.tutorial.popup.button.next" : "ui.career.tutorial.popup.button.continue"))
const primaryButtonLabel = computed(() => embeddedPrimaryButtonState.value?.label || closeLabel.value)
const primaryButtonDisabled = computed(() => !!embeddedPrimaryButtonState.value?.disabled)

function goPrevPopup() {
  if (!showPagination.value || popupIndex.value <= 0) return
  popupIndex.value -= 1
}

function goNextPopup() {
  if (!showPagination.value || popupIndex.value >= popupList.value.length - 1) return
  popupIndex.value += 1
}

function finalizeClose() {
  const popup = currentPopup.value
  if (popup?.id != null) lua.extensions.hook("onIntroPopupCareerClosed", popup.id)

  if (hasNext.value) {
    popupIndex.value += 1
    return
  }

  emit("return", true)
}

function onEmbeddedComponentReturn() {
  finalizeClose()
}

function onEmbeddedPrimaryButtonState(state) {
  embeddedPrimaryButtonState.value = state && typeof state === "object" ? state : null
}

async function onPrimaryButtonClick() {
  const componentApi = customPopupRef.value
  if (componentApi && typeof componentApi.onPopupPrimaryAction === "function") {
    const shouldClose = await componentApi.onPopupPrimaryAction()
    if (shouldClose !== true) return
    await onClose(true)
    return
  }
  await onClose()
}

async function onClose(skipComponentClose) {
  const componentApi = customPopupRef.value
  if (!skipComponentClose && componentApi && typeof componentApi.onPopupClose === "function") {
    const shouldContinue = await componentApi.onPopupClose()
    if (shouldContinue === false) return
  }
  finalizeClose()
}


</script>

<script>
import { popupPosition, popupContainer } from "@/services/popup"

export default {
  wrapper: {
    fade: true,
    blur: true,
    style: popupContainer.default,
  },
  position: [popupPosition.center, popupPosition.center],
}
</script>

<style lang="scss" scoped>
@use "sass:map";
@use "sass:color";
@use "@/styles/modules/colors" as colors;

$off-black: map.get(colors.$colors, "bng-off-black");
$off-white: map.get(colors.$colors, "bng-off-white");

.popup {
  border-radius: 0.5rem;
  overflow: hidden;
  position: relative;
}

.popup-content {
  background: $off-black;
}

.popup-title {
  width: 100%;
  background: color.change($off-black, $alpha: 0.6);
  --bng-heading-background-opacity: 0;
  padding: 0.5rem;
  border-bottom: 1px solid color.change($off-white, $alpha: 0.15);
}

.tutorial-popup-pagination {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: center;
  align-items: center;
  background: color.change($off-black, $alpha: 0.55);
}

.tutorial-popup-pagination-indicator {
  --ind-size: 3px;
  --ind-pad: 2.75em;

  width: 100%;
  height: var(--ind-size);
  padding: 0 var(--ind-pad);
  display: flex;
  gap: var(--ind-size);
  box-sizing: border-box;
  pointer-events: none;

  > * {
    flex: 1 1 auto;
    height: var(--ind-size);
    background-color: rgba(var(--bng-off-white-rgb), 0.27);
    transition: background-color 200ms;
  }

  > .active {
    background-color: var(--bng-orange);
  }
}

.tutorial-popup-media {
  height: 66vh;
  max-height: calc(100vh - 14rem);
}

.tutorial-popup-overlay {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  color: $off-white;
  text-shadow: color.change($off-black, $alpha: 0.6) 0 0 1em;

  padding: 2rem;
}

.tutorial-popup-spacer {
  flex: 1 1 auto;
}

.tutorial-popup-text-block {
  background: rgba(var(--bng-off-black-rgb), 0.8);
  border-left: 2px solid rgba(var(--bng-off-white-rgb), 1);
  width: 100%;
  border-radius: 0.5rem;
  box-sizing: border-box;
  font-size: 1.8em;
  font-weight: 350;
  line-height: 1.5;

  padding: 1.0rem 1.5rem;
}

.popup-buttons {
  margin: 0;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .popup-button {
    --bng-button-margin: 0;
  }

}

.popup-button-prev,
.popup-button-primary {
  width: calc(50% - 0.25rem);
}

.popup-button-primary {
  margin-left: auto;
}
</style>
