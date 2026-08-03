<template>
  <div class="remote-control-container">
    <div class="remote-control-content">
      <BngRow
        class="options-item-row remote-control-item"
        :label="$tt('ui.controls.usePhoneOrTablet')"
        @activate="toggleRemoteControl">
        <BngPillCheckbox v-model="usePhoneOrTablet" marked-icon @change="onRemoteControlChanged">
          {{ usePhoneOrTablet ? $tt("ui.common.yes") : $tt("ui.common.no") }}
        </BngPillCheckbox>
      </BngRow>

      <!-- if show android and remote blocked -->
      <div v-if="usePhoneOrTablet && remoteBlocked" class="remote-blocked-container">
        <BngIcon :type="icons.lockClosed" class="remote-blocked-icon" />
        <span>{{ $tt("ui.controls.firewallError") }}</span>
      </div>

      <!-- show qr codes-->
      <div v-if="usePhoneOrTablet" class="qr-codes-container">
        <div class="qr-code-ios">
          {{ $tt("ui.controls.iosAppUnavailable") }}
        </div>
        <div class="qr-code-android">
          <div>{{ $tt("ui.controls.androidQRCode") }}</div>
          <div ref="qrCodeEl" class="qr-code-android-image"></div>
          <a href="http-external://play.google.com/store/apps/details?id=com.beamng.remotecontrol" aria-label="google play store link" class="qr-code-link">
            <img :src="`/ui/modules/options/google-play-badge.png`" aria-label="google play badge" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted, ref } from "vue"
import { BngIcon, BngPillCheckbox, BngRow, icons } from "@/common/components/base"
import { lua } from "@/bridge"
import "@/common/modules/options/render/itemStyle.scss"

const usePhoneOrTablet = ref(false)
const remoteBlocked = ref(false)
const qrCodeEl = ref(null)
const qrData = ref(null)

let firewallPollInterval = null

function toggleRemoteControl() {
  usePhoneOrTablet.value = !usePhoneOrTablet.value
  onRemoteControlChanged(usePhoneOrTablet.value)
}

async function onRemoteControlChanged(value) {
  if (value) {
    if (firewallPollInterval) clearInterval(firewallPollInterval)
    const pollFirewall = bngApi.engineLua("be:isBlockedByFirewall()", blocked => (remoteBlocked.value = blocked))
    firewallPollInterval = setInterval(pollFirewall, 1000)

    await generateQRCode()
  } else {
    clearInterval(firewallPollInterval)
  }
}

async function generateQRCode() {
  const qrPass = await lua.core_remoteController.getQRCode()

  // TODO: Update the QR code target to the Steam Link URL for PC.
  const playUri = "https://play.google.com/store/apps/details?id=com.beamng.remotecontrol#" + qrPass
  const dimension = 180
  const data = {
    text: playUri,
    correctLevel: QRCode.CorrectLevel.L,
    width: dimension,
    height: dimension,
  }
  qrData.value = new QRCode(qrCodeEl.value, data)
}

onUnmounted(() => {
  if (firewallPollInterval) clearInterval(firewallPollInterval)
})
</script>

<style lang="scss" scoped>
.remote-control-container {
  display: flex;
  flex-direction: column;
}

.remote-control-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;

  > .remote-blocked-container {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.25rem;

    > .remote-blocked-icon {
      margin-right: 0.5rem;
    }
  }

  > .qr-codes-container {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.5rem;

    > *:not(:last-child) {
      margin-right: 1rem;
    }

    > .qr-code-ios {
      flex: 1;
    }

    > .qr-code-android {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;

      > .qr-code-link {
        display: inline-block;
        height: 70px;

        > img {
          height: 100%;
          width: auto;
        }
      }
    }
  }
}
</style>
