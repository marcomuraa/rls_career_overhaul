<template>
  <div
    v-bng-scoped-nav="{ scopeId: EDIT_BINDING_SCOPE_ID, activateOnMount: true, trapPolicy: 'always', canDeactivate: () => false }"
    v-bng-on-ui-nav:menu="closeLastPopups"
    v-bng-on-ui-nav:back="cancelChanges"
    v-bng-on-ui-nav:tab_l="handlePrevSectionInput"
    v-bng-on-ui-nav:tab_r="handleNextSectionInput"
    class="binding-detail-shell"
    :class="{ 'is-listening': editMode, 'is-ffb': !editMode && activeSection === 'ffb' }">
    <div class="binding-detail-container">
      <header class="detail-header">
        <div class="detail-header-title">{{ $tt(bindingData.title) }}</div>
        <div class="detail-header-description">{{ $tt(bindingData.desc) }}</div>
      </header>

      <template v-if="editMode">
        <section class="detail-panel detail-panel-listening">
          <div class="detail-panel-title">{{ $tt("ui.controls.detectingBinding") }}</div>
          <div class="listening-data-container">
            <InputControlBar
              v-for="(axis, index) in listeningData"
              :key="index"
              :devname="axis.device"
              :control="axis.control"
              :value="axis.accumulated" />
          </div>
        </section>
      </template>

      <template v-else>
        <div
          v-if="sectionOptions.length > 1"
          class="section-tabs"
          bng-no-child-nav="true"
          @focusin="blurSectionTabsFocus">
          <BngButton accent="ghost" class="section-tabs-arrow" bng-no-nav tabindex="-1" @click.stop="goPrevTab">
            <BngIcon :type="icons.arrowLargeLeft" />
            <BngBinding class="section-tabs-binding" ui-event="tab_l" controller />
          </BngButton>

          <Tabs
            ref="tabsRef"
            class="bng-tabs section-tabs-control"
            :selectedIndex="activeSectionIndex"
            bng-no-nav
            @change="onTabChange">
            <TabList />
            <div
              v-for="option in sectionOptions"
              :key="option.value"
              class="section-tabs-panel"
              :tab-heading="option.label"
              :tab-tooltip="option.label" />
          </Tabs>

          <BngButton accent="ghost" class="section-tabs-arrow" bng-no-nav tabindex="-1" @click.stop="goNextTab">
            <BngBinding class="section-tabs-binding" ui-event="tab_r" controller />
            <BngIcon :type="icons.arrowLargeRight" />
          </BngButton>
        </div>

        <div v-bng-ui-nav-scroll.force class="detail-content-scroll">
          <EditBindingBasicInfo
            v-if="activeSection === 'basic'"
            v-model="bindingData"
            :is-new-binding="isNewBinding"
            @editBinding="editBinding"
            @deleteBinding="deleteBinding"
            @toggleResolveConflict="toggleResolveConflict" />

          <AxisOptions v-if="activeSection === 'axis' && bindingData.isAxis" v-model="bindingData" />

          <FFBOptions
            v-if="activeSection === 'ffb' && bindingData.action === 'steering' && bindingData.ffb"
            v-model="bindingData" />
        </div>

        <div class="detail-actions">
          <BngButton accent="attention" class="action-button" @click.stop="cancelChanges" v-bng-on-ui-nav:back,menu.asMouse>{{
            $tt("ui.common.cancel") }}</BngButton>
          <BngButton accent="secondary" class="action-button" @click.stop="applyChanges"
            v-bng-on-ui-nav:ok.focusRequired.asMouse>{{
              $tt("ui.common.apply") }}</BngButton>
        </div>
      </template>
    </div>

    <aside v-if="!editMode" class="binding-info-card" :class="{ 'is-hidden': !showInfoPanel }">
      <InfoPanel :items="infoView" />
    </aside>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, provide } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngButton, BngIcon, icons } from "@/common/components/base"
import { Tabs, TabList } from "@/common/components/utility"
import { vBngScopedNav, vBngOnUiNav, vBngUiNavScroll } from "@/common/directives"
import { useOptionsControlsStore } from "@/common/modules/options/controls/optionsControls"
import { closeLastPopups } from "@/services/popup"
import useControls from "@/services/controls"
import AxisOptions from "./editBinding/EditAxisOptions.vue"
import FFBOptions from "./editBinding/EditFFBOptions.vue"
import InputControlBar from "./hardware/InputControlBar.vue"
import EditBindingBasicInfo from "./editBinding/EditBindingBasicInfo.vue"
import InfoPanel from "@/common/modules/options/components/InfoPanel.vue"
import { useInfoView } from "@/common/modules/options/useInfoView"

const props = defineProps({
  initialSection: {
    type: String,
    default: null,
  },
})

const EDIT_BINDING_SCOPE_ID = "options-edit-binding-popup"

const controls = useControls()

const emit = defineEmits(["return"])

const listeningData = ref(null)

const controlsStore = useOptionsControlsStore()
const { selectedBinding: bindingData, isNewBinding, updateBindingDetails } = storeToRefs(controlsStore)

const editMode = ref(false)
const tabsRef = ref(null)
const activeSection = ref("basic")
const pendingInitialSection = ref(props.initialSection)
const { infoView, showInfo } = useInfoView()
const showInfoPanel = computed(() => infoView.value.length > 0)

provide("showInfo", showInfo)
provide("infoHidden", ref(false))

const sectionOptions = computed(() => {
  const options = [{ value: "basic", label: "Basic Info" }]

  if (bindingData.value?.isAxis) {
    options.push({ value: "axis", label: "Axis Options" })
  }

  if (bindingData.value?.action === "steering" && bindingData.value?.ffb) {
    options.push({ value: "ffb", label: "FFB Options" })
  }

  return options
})

const activeSectionIndex = computed(() => sectionOptions.value.findIndex(option => option.value === activeSection.value))

function onTabChange(tab) {
  const nextSection = sectionOptions.value[tab?.index]?.value
  if (!nextSection || activeSection.value === nextSection) return
  activeSection.value = nextSection
}

function goPrevTab() {
  tabsRef.value?.goPrev?.()
  return false
}

function goNextTab() {
  tabsRef.value?.goNext?.()
  return false
}

function handlePrevSectionInput() {
  if (editMode.value || sectionOptions.value.length <= 1) return false
  return goPrevTab()
}

function handleNextSectionInput() {
  if (editMode.value || sectionOptions.value.length <= 1) return false
  return goNextTab()
}

function blurSectionTabsFocus(event) {
  const target = event?.target
  if (target && typeof target.blur === "function") target.blur()
}

function resolveInitialSection(clearIfInvalid = false) {
  if (!pendingInitialSection.value) return

  const validValues = sectionOptions.value.map(option => option.value)
  if (validValues.includes(pendingInitialSection.value)) {
    activeSection.value = pendingInitialSection.value
    pendingInitialSection.value = null
  } else if (clearIfInvalid) {
    pendingInitialSection.value = null
  }
}

watch(sectionOptions, (newOptions) => {
  resolveInitialSection()
  const validValues = newOptions.map(o => o.value)
  if (!validValues.includes(activeSection.value)) {
    activeSection.value = "basic"
  }
}, { deep: true })

watch(
  () => updateBindingDetails.value,
  async value => {
    if (!value) return
    editMode.value = isNewBinding.value
    if (editMode.value) {
      const actions = controls.getActionDetails(bindingData.value.action)
      bindingData.value = { ...actions }
      await captureAndSetBinding()
    } else {
      fetchBindingDetails()
    }
    updateBindingDetails.value = false
  },
  { immediate: true }
)

// Watch for changes to the selected binding's key properties (action, devname, control). This is so we only fetch details if a new binding is selected, not when the binding is just updated.
watch(
  () => bindingData.value ? `${bindingData.value.action}-${bindingData.value.devname}-${bindingData.value.control}` : null,
  (newKey, oldKey) => {
    // Only fetch details if we're not in add mode and the binding key actually changed
    if (!isNewBinding.value && newKey && newKey !== oldKey && bindingData.value) {
      fetchBindingDetails()
    }
  },
  { immediate: false }
)

function toggleResolveConflict(conflict) {
  conflict.markForDeletion = !conflict.markForDeletion
}

function editBinding() {
  bindingData.value.oldControl = bindingData.value.control
  bindingData.value.oldDevname = bindingData.value.devname
  captureAndSetBinding()
}

async function captureAndSetBinding() {
  // set edit mode to true to update BindingDetail state
  editMode.value = true

  // to ignore previous mouse clicks or events
  await nextTick()

  // toggleListenRaw(true)
  const isModifierAction = bindingData.value.action && /^customModifier\d+$/.test(bindingData.value.action)
  controls.captureBinding(!isModifierAction).then(
    result => {
      bindingData.value.control = result.control
      bindingData.value.devname = result.devName

      const isAxis = controls.isAxis(result.devName, result.control)
      bindingData.value.isAxis = isAxis

      if (isAxis) {
        bindingData.value.linearity = 1
        bindingData.value.deadzoneResting = 0
        bindingData.value.deadzoneEnd = 0
        bindingData.value.inverted = false
      }

      editMode.value = false
      listeningData.value = null

      fetchBindingDetails()
    },
    () => {},
    eventsRegister => {
      listeningData.value = Object.entries(eventsRegister)
        .filter(([, deviceData]) => deviceData.axis && Object.keys(deviceData.axis).length > 0)
        .flatMap(([deviceName, deviceData]) =>
          Object.entries(deviceData.axis)
            .filter(([, controlData]) => controlData.accumulated > 0.1)
            .map(([controlName, controlData]) => ({
              device: deviceName,
              control: controlName,
              ...controlData,
            }))
        )
    }
  )
}

function deleteBinding() {
  controls.deleteBinding({
    devname: bindingData.value.devname,
    control: bindingData.value.control,
    action: bindingData.value.action,
  })
  emit("return", null)
}

function applyChanges() {
  if (!isNewBinding.value) {
    controls.updateBinding(bindingData.value)
    const markedConflicts = bindingData.value.conflicts.filter(c => c.markForDeletion)
    // Set the devname to the binding's devname so that deleteBindings can find the device
    // The conflicting bindings and the current binding have the same devname
    markedConflicts.forEach(c => (c.devname = bindingData.value.devname))
    if (markedConflicts.length > 0) controls.deleteBindings(markedConflicts)
  } else {
    controls.addNewBinding(bindingData.value)
  }

  controlsStore.setSelectedBinding(null)

  emit("return", bindingData.value)
}

function cancelChanges() {
  controlsStore.setSelectedBinding(null)
  emit("return", null)
}

function fetchBindingDetails() {
  const details = controls.getBindingDetails(bindingData.value.devname, bindingData.value.control, bindingData.value.action)
  bindingData.value = {
    ...details,
    ...bindingData.value,
  }
  updateBindingConflicts()
  resolveInitialSection(true)
}

function updateBindingConflicts() {
  if (isNewBinding.value && editMode.value) {
    bindingData.value.conflicts = []
  } else {
    const conflicts = controls.bindingConflicts(bindingData.value.devname, bindingData.value.control, bindingData.value.action)
    bindingData.value = {
      ...bindingData.value,
      conflicts,
    }
  }
}
</script>

<style lang="scss" scoped>
.binding-detail-shell {
  --binding-info-gap: 0.75rem;
  --binding-info-width: clamp(22rem, 28vw, 34rem);
  position: relative;
  max-width: 96vw;
  max-height: 95%;
  min-height: 24rem;
  transform: translateX(calc((var(--binding-info-width) + var(--binding-info-gap)) / -2));

  &.is-listening {
    min-height: unset;
  }
}

.binding-detail-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1 1 46em;
  width: 46em;
  max-width: min(46em, 100%);
  min-width: 30rem;
  max-height: 100%;
  min-height: 24rem;
  padding: 1.25rem;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-off-black-rgb), 0.96);
  overflow: hidden;

  .binding-detail-shell.is-listening & {
    flex-basis: 34rem;
    width: 34rem;
    min-height: unset;
  }
}

.binding-info-card {
  position: absolute;
  top: 50%;
  left: calc(100% + var(--binding-info-gap));
  width: var(--binding-info-width);
  min-width: 20rem;
  max-height: calc(100vh - 4rem);
  transform: translateY(-50%);
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-off-black-rgb), 0.92);
  overflow: hidden;

  &.is-hidden {
    visibility: hidden;
    pointer-events: none;
  }
}

@media (max-width: 80rem) {
  .binding-detail-shell {
    transform: none;
  }

  .binding-info-card {
    top: calc(100% + var(--binding-info-gap));
    left: 0;
    width: 100%;
    max-height: calc(100vh - 4rem);
    transform: none;
  }
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-header-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.detail-header-description {
  color: var(--bng-white-o6);
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.45);
}

.detail-panel-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.section-tabs {
  border-bottom: 0.125rem solid var(--bng-orange-500);
  padding: 0.25em 0.5em 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.section-tabs-arrow {
  --bng-button-margin: 0;
  --bng-button-min-width: 2.5rem;
  --bng-button-padding: 0.35rem;
  --bng-icon-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
}

.section-tabs-binding {
  pointer-events: none;
}

.section-tabs-control {
  flex: 1 1 auto;
  min-width: 0;
  --tab-list-padding: 0;
  --tab-list-margin: 0;
  --tab-bg: transparent;
  --tab-content-bg: transparent;
  --bng-button-min-width: 5em;
  --bng-button-margin: 0;
  --bng-bg-border-radius: var(--bng-corners-1) var(--bng-corners-1) 0 0;
}

.section-tabs-panel {
  display: none;
}

.detail-content-scroll {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  will-change: scroll-position;
}

.binding-detail-shell.is-ffb {
  .binding-detail-container {
    max-height: 60em;
  }

  .detail-content-scroll {
    min-height: 0;
    overflow: hidden;
  }
}

.listening-data-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-actions {
  display: flex;
  gap: 0.75rem;
  --bng-button-max-width: 50%;


  > .action-button {
    flex: 1 1 0;
  }
}
</style>
