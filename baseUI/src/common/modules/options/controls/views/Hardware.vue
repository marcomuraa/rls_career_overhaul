<template>
  <div class="hardware-container">
    <BngCard>
      <BngCardHeading>
        Available Devices
      </BngCardHeading>

      <div class="device-actions">
        <BngButton class="test-devices-button" :disabled="!hasDevices" @click="openDeviceTest">
          Test devices
        </BngButton>
      </div>

      <!-- TODO: Fix this condition; this is a band-aid. -->
      <DeviceInfoCard v-for="ctrl in devicesList" :key="ctrl.name" :name="ctrl.productName"
        :icon="$simplemenu && ctrl.icon === 'dsGamepad' ? null : ctrl.icon"
        :info="ctrl.info" class="device-item" />
    </BngCard>

    <BngCard v-if="!$simplemenu">
      <BngCardHeading>
        <div>
          <BngIcon :type="icons.smartphone1" />
          <span class="title-text">{{ $tt("ui.controls.remotControlApp") }}</span>
        </div>
      </BngCardHeading>
      <RemoteControl />
    </BngCard>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue"
import { BngButton, BngCard, BngCardHeading, BngIcon, icons } from "@/common/components/base"
import { storeToRefs } from "pinia"
import useControls from "@/services/controls"
import { addPopup } from "@/services/popup"
import { $translate } from "@/services"
import RemoteControl from "@/common/modules/options/controls/components/hardware/RemoteControl.vue"
import DeviceInfoCard from "@/common/modules/options/controls/components/hardware/DeviceInfoCard.vue"
import DeviceControls from "@/common/modules/options/controls/components/hardware/DeviceControls.vue"

const controls = useControls()
const { controllers: controllersData, players } = storeToRefs(controls)
const $simplemenu = inject("$simplemenu", ref(false))

const controllers = ref({})
const devicesList = computed(() => Object.values(controllers.value))
const hasDevices = computed(() => devicesList.value.length > 0)
const deviceTestPopup = ref(null)

watch(
  () => controllersData.value,
  newValue => {
    controllers.value = Object.values(newValue).reduce((acc, ctrl) => {
      acc[ctrl.name] = {
        name: ctrl.name,
        icon: controls.deviceIcon(ctrl.name, ctrl.vidpid),
        productName: $translate.instant(ctrl.productName),
        info: $translate.instant("options.player") + " " + (players.value[ctrl.name] + 1),
        notes: ctrl.notes,
        controls: ctrl.controls,
        isKey: ctrl.name.slice(0, 3) === "key",
      }
      return acc
    }, {})
  },
  { immediate: true }
)

async function openDeviceTest() {
  if (!hasDevices.value) return
  const popup = addPopup(DeviceControls, { devices: devicesList.value })
  deviceTestPopup.value = popup
  try {
    await popup.promise.catch(() => undefined)
  } finally {
    if (deviceTestPopup.value?.id === popup.id) {
      deviceTestPopup.value = null
    }
  }
}

watch(
  devicesList,
  async () => {
    if (!deviceTestPopup.value) return

    deviceTestPopup.value.return()
    if (!hasDevices.value) return
    await openDeviceTest()
  }
)
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.hardware-container {
  display: flex;
  flex-direction: column;
  padding: 1em 0;
  color: white;
  gap: 1rem;
}

.device-actions {
  padding: calc-ui-rem(0.5);
}

.test-devices-button {
  width: 100%;
}

.device-item {
  margin: 0 calc-ui-rem(0.5) calc-ui-rem(0.5) calc-ui-rem(0.5);
}
</style>
