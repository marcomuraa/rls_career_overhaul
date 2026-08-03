<template>
  <BngButton
    ref="elButton"
    class="bbcode-link"
    :accent="ACCENTS.text"
    :disabled="!normalizedHref"
    @click="activate"
  >
    <slot>{{ normalizedHref }}</slot>
  </BngButton>
</template>

<script setup>
import { computed, inject, markRaw, ref } from "vue"
import { useBridge } from "@/bridge"
import { ACCENTS, BngButton } from "@/common/components/base"
import BbcodeLinkQrCode from "@/common/components/utility/bbcodeLinkQrCode.vue"
import { openMessage } from "@/services/popup"

const EXTERNAL_URL_PREFIX = "http-external://"

const props = defineProps({
  href: {
    type: String,
    default: "",
  },
})

const { api } = useBridge()
const elButton = ref()
const $simplemenu = inject("$simplemenu", ref(false))

const normalizedHref = computed(() => {
  const href = String(props.href || "").trim()
  if (!href) return ""
  if (!href.startsWith(EXTERNAL_URL_PREFIX)) return href
  return `https://${href.slice(EXTERNAL_URL_PREFIX.length)}`
})

function activate(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()

  const url = normalizedHref.value
  if (!url) return

  if ($simplemenu.value) {
    openMessage(normalizedHref.value, {
      component: markRaw(BbcodeLinkQrCode),
      props: { url },
    })
    return
  }

  api.engineLua(`openWebBrowser(${JSON.stringify(url)})`)
}

defineExpose({
  activate,
  getElement: () => elButton.value?.getElement?.(),
})
</script>