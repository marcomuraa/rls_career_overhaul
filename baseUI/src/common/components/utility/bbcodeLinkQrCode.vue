<template>
  <div class="bbcode-link-qr">
    <div ref="qrCodeEl" class="bbcode-link-qr__image" />
    <div v-if="hasError" class="bbcode-link-qr__error">Unable to generate QR code.</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue"

const QR_CODE_SIZE = 180

const props = defineProps({
  url: {
    type: String,
    default: "",
  },
})

const qrCodeEl = ref(null)
const hasError = ref(false)

let qrCodeInstance = null

function clearQrCode() {
  if (qrCodeInstance?.clear) qrCodeInstance.clear()
  qrCodeInstance = null
  if (qrCodeEl.value) qrCodeEl.value.innerHTML = ""
}

function renderQrCode(url) {
  clearQrCode()
  hasError.value = false

  const QRCodeConstructor = window.QRCode
  if (!qrCodeEl.value || !url || typeof QRCodeConstructor !== "function") {
    hasError.value = true
    return
  }

  try {
    qrCodeInstance = new QRCodeConstructor(qrCodeEl.value, {
      text: url,
      correctLevel: QRCodeConstructor.CorrectLevel.L,
      width: QR_CODE_SIZE,
      height: QR_CODE_SIZE,
    })
  } catch {
    hasError.value = true
  }
}

onMounted(() => {
  renderQrCode(props.url)
})

watch(
  () => props.url,
  url => {
    if (!qrCodeEl.value) return
    renderQrCode(url)
  }
)

onUnmounted(() => {
  clearQrCode()
})
</script>

<style lang="scss" scoped>
.bbcode-link-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bbcode-link-qr__image {
  width: 180px;
  height: 180px;
}

.bbcode-link-qr__error {
  font-size: 0.9rem;
}
</style>
