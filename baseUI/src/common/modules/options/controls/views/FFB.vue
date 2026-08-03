<template>
  <div class="ffb-container">
    <div class="ffb-main">
      <BngCard>
        <BngCardHeading>{{ $translate.instant("ui.controls.configuration") }}</BngCardHeading>
        <div class="ffb-bindings">
          <BindingItem
            ref="bindingItemRef"
            :action-key="steeringActionKey"
            :title="steeringAction?.title || 'ui.controls.ffbConfigMissing'"
            :bindings="bindings"
            hide-add-button
            @binding-click="editBinding" />

          <BngButton
            v-if="bindings.length === 0"
            :icon="icons.plus"
            accent="secondary"
            class="ffb-add-button"
            :bng-scoped-nav-autofocus="'true'"
            @click="editBinding({ action: steeringActionKey, title: steeringAction?.title, description: steeringAction?.desc }, true)"
            v-bng-on-ui-nav:ok.focusRequired.asMouse>
            {{ $translate.instant("ui.controls.addBinding") }}
          </BngButton>
        </div>
      </BngCard>

      <BngCard v-bng-scoped-nav>
        <BngCardHeading>{{ $translate.instant("ui.controls.ffbTips") }}</BngCardHeading>

        <div class="ffb-tips-content">
          <div v-if="padLogitechIncorrect">
            <BngIcon :type="icons.lockClosed" />
            {{ $translate.instant("ui.controls.padLogitechIncorrect") }}
          </div>

          <div v-if="proLogitechFound">
            <BngIcon :type="icons.info" />
            {{ $translate.instant("ui.controls.proLogitechPaddles") }}
          </div>

          <div>
            <DynamicComponent
              translate-id="ui.controls.steering_wiki"
              bbcode
            />
          </div>

          <div v-if="ffbEnabled">
            <DynamicComponent
              translate-id="ui.controls.ffbGenericWarningFps"
              bbcode
            />
          </div>

          <div v-if="ffbEnabled" class="ffb-safety-warning">
            <DynamicComponent
              translate-id="ui.controls.ffbGenericWarningSafety"
              bbcode
            />
          </div>
        </div>
      </BngCard>

      <BngCard>
        <BngCardHeading>{{ $translate.instant("ui.controls.availableHardware") }}</BngCardHeading>
        <div class="ffb-available-hardware">
          <template v-if="availableHardware.length">
            <BngPropVal v-for="axis in availableHardware" :key="axis.name" :key-label="axis.name" :value-label="axis.description" />
          </template>
          <div v-else>{{ $translate.instant("ui.controls.ffbHardwareMissing") }}</div>
          <!-- <FFBInputTestsCard :is-available="availableHardware.length > 0 && ffbEnabled" /> -->
          <!-- TODO: Hiding this for now -->
          <!-- <FFBInputTestsCard :is-available="true" /> -->
        </div>
      </BngCard>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, nextTick, ref } from "vue"
import { storeToRefs } from "pinia"
import { BngButton, BngCard, BngCardHeading, BngIcon, BngPropVal, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { DynamicComponent } from "@/common/components/utility"
import { $translate } from "@/services"
import { addPopup } from "@/services/popup"
import { useScopedNav } from "@/services/scopedNav/api"
import { useOptionsControlsStore } from "@/common/modules/options/controls/optionsControls"
import useControls from "@/services/controls"
import EditBinding from "@/common/modules/options/controls/components/EditBinding.vue"
import FFBInputTestsCard from "@/common/modules/options/controls/components/FFBInputTestsCard.vue"
import BindingItem from "../components/BindingItem.vue"

const VID_LOGITECH = "046d"
const LOGITECH_PIDS = {
  incorrect: ["c219", "c216"],
  pro: ["c272", "c268"],
}

const controlsStore = useOptionsControlsStore()
const { selectedBinding, isNewBinding, updateBindingDetails } = storeToRefs(controlsStore)

const controls = useControls()
const { controllers } = storeToRefs(controls)
const steeringActionKey = "steering"
const steeringAction = computed(() => controls.getActionDetails(steeringActionKey))
const bindings = controls.getAllBindingsForAction(steeringActionKey, null, true)
const ffbEnabled = controls.isFFBEnabled(true)
const padLogitechIncorrect = computed(() => LOGITECH_PIDS.incorrect.some(pid => controls.isPidVidFound(VID_LOGITECH, pid)))
const proLogitechFound = computed(() => LOGITECH_PIDS.pro.some(pid => controls.isPidVidFound(VID_LOGITECH, pid)))
const availableHardware = computed(() =>
  Object.entries(controllers.value).flatMap(([devName, { ffbAxes = {}, productName }]) =>
    Object.entries(ffbAxes).map(([name, index]) => ({
      name: name.toUpperCase(),
      description: $translate.instant("ui.controls.ffb.availableHardware.deviceDescription", {
        device: $translate.instant(productName),
        index,
      }),
    }))
  )
)

onMounted(() => controlsStore.setSelectedBinding(null))

const scopedNav = useScopedNav()
const bindingItemRef = ref(null)

const EDIT_BINDING_SCOPE_ID = "options-edit-binding-popup"
const POPUP_CLOSE_FOCUS_DELAY_MS = 240
const FOCUS_RESTORE_TIMEOUT_MS = 3000

function bindingKey(b) {
  return b ? `${b.devname}|${b.control}` : ""
}

function snapshotSteeringKeys() {
  const set = new Set()
  for (const b of controls.getAllBindingsForAction(steeringActionKey) || []) set.add(bindingKey(b))
  return set
}

function findNewSteeringBinding(beforeKeys) {
  for (const b of controls.getAllBindingsForAction(steeringActionKey) || []) {
    if (!beforeKeys.has(bindingKey(b))) return b
  }
  return null
}

async function activateEditBindingPopupSoon() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 1000) {
    await nextTick()
    if (scopedNav.getScopeById(EDIT_BINDING_SCOPE_ID)) {
      await Promise.resolve(scopedNav.activateScope(EDIT_BINDING_SCOPE_ID, { force: true, reason: "ffb-edit" }))
      scopedNav.requestScopeFocus(EDIT_BINDING_SCOPE_ID, { force: true, activeOnly: false, reason: "ffb-edit" })
      return
    }
    await new Promise(r => window.requestAnimationFrame(r))
  }
}

async function waitForBindingItem() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < FOCUS_RESTORE_TIMEOUT_MS) {
    await nextTick()
    if (bindingItemRef.value) return bindingItemRef.value
    await new Promise(r => window.requestAnimationFrame(r))
  }
  return null
}

async function restoreSteeringFocusAfterPopup(target) {
  await new Promise(r => window.setTimeout(r, POPUP_CLOSE_FOCUS_DELAY_MS))
  const item = await waitForBindingItem()
  if (!item) return
  if (target?.binding && item.focusBinding(target.binding)) return
  if (target?.beforeKeys) {
    const newBinding = findNewSteeringBinding(target.beforeKeys)
    if (newBinding && item.focusBinding(newBinding)) return
    if (item.focusLastBinding?.()) return
  }
  item.focusRow?.()
}

async function editBinding(binding, isNew = false) {
  isNewBinding.value = isNew
  updateBindingDetails.value = true
  controlsStore.setSelectedBinding(binding)
  const target = isNew ? { beforeKeys: snapshotSteeringKeys() } : { binding }
  const popup = addPopup(EditBinding, { initialSection: "ffb" })
  activateEditBindingPopupSoon()
  try {
    const res = await popup.promise
    if (res) selectedBinding.value = res
  } catch (_) {
    // popup was closed/cancelled
  } finally {
    restoreSteeringFocusAfterPopup(target)
  }
}
</script>

<style lang="scss" scoped>
.ffb-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.ffb-main,
.ffb-bindings,
.ffb-available-hardware {
  display: flex;
  flex-direction: column;
}

.ffb-bindings,
.ffb-tips-content,
.ffb-available-hardware {
  padding: 1em;
}

.ffb-main {
  gap: 1em;
  height: 100%;
  flex: 1;
  padding: 1em 0;
  overflow: hidden;
}

.ffb-bindings {
  gap: 0.75rem;
}

.ffb-available-hardware {
  gap: 1rem;
}

.ffb-add-button {
  align-self: flex-start;
}

.ffb-safety-warning {
  padding-top: 1em;
}

</style>
