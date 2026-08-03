<template>
  <a v-if="!inRow" :href="link" @click.prevent="openLink"><slot>Untitled</slot></a>
  <span v-else class="options-link"><slot>Untitled</slot></span>
</template>

<script setup>
import { inject, onMounted, onBeforeUnmount } from "vue"
import { useBridge } from "@/bridge"

const { api } = useBridge()

const props = defineProps({
  link: String,
})

const openLink = () => props.link && api.engineLua(`openWebBrowser("${props.link}")`)

const row = inject("BngRow", null)
const inRow = !!row

const rowControlApi = inRow ? { activate: openLink } : null

if (inRow) {
  onMounted(() => row.register(rowControlApi))
  onBeforeUnmount(() => row.unregister(rowControlApi))
}

defineExpose({
  activate: openLink,
})
</script>

<style lang="scss" scoped>
a:not(:first-child) {
  flex: 0 0 50%;
}
a:hover {
  color: #fa4;
}
.options-link {
  display: inline-block;
  color: var(--bng-off-white);
  user-select: none;
  -webkit-user-select: none;
}
</style>
