<template>
  <span>{{ $t("ui.options.graphics.keepDisplay.message", { seconds: remaining }) }}</span>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"

const props = defineProps({
  expiration: { type: Number, default: 15 },
  expireCallback: { type: Function },
})

const remaining = ref(props.expiration)

let timer = null
let expired = false

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  const endTime = Date.now() + props.expiration * 1000
  timer = setInterval(() => {
    remaining.value = Math.ceil((endTime - Date.now()) / 1000)
    if (remaining.value <= 0 && !expired) {
      expired = true
      stop()
      props.expireCallback()
    }
  }, 250)
})

onUnmounted(stop)
</script>
