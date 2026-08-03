<template>
  <div v-if="cmp.error" class="error">
    {{ cmp.error }}
    <a v-if="!reloadStatus" href="#" @click.prevent="manualReload()">Reload</a>
    <span v-else>{{ reloadStatus }}</span>
  </div>
  <div v-else-if="!cmp.compiled" class="loading">Loading...</div>
  <template v-else>
    <component :is="cmp.component" v-bind="attrs" />
  </template>
</template>

<script setup>
import { watch, ref, useAttrs, onErrorCaptured, onUnmounted } from "vue"
import logger from "@/services/logger"
import { getComponent } from "@/services/modManager/compiler"
import { useModManager } from "@/services/modManager/manager"
import { useUiHealth } from "@/services/uiHealth"
import { uniqueId } from "@/services/uniqueId"

const attrs = useAttrs()
const props = defineProps({
  file: String,
  fileRefresh: Boolean,
  data: Object,
  dataGetter: Function,
})

const modManager = useModManager()
const uiHealth = useUiHealth()

const reload = async (refresh = false) => {
  if (props.dataGetter) {
    cmp.value = {}
    let data = await props.dataGetter(refresh)
    if (!data?.compiled && data?.compile) {
      data = await data.compile()
    }
    if (data?.error) {
      console.error("[MOD] Compile error in", props.file, data.error, data.errorObj)
    }
    cmp.value = data
    return
  }
  if (props.file) {
    await load(props.file, refresh)
  }
}

const reloadStatus = ref("")
const manualReload = async () => {
  reloadStatus.value = "Wait..."
  await reload(true)
  reloadStatus.value = "Reloaded!"
  setTimeout(() => {
    reloadStatus.value = ""
  }, 500)
}

defineExpose({ reload })

const cmp = ref({})

const styleOwnerId = uniqueId("modStyleOwner")

const collectStyleEntries = data => {
  if (!data || typeof data !== "object") return []
  const entries = []
  const seen = new Set()
  const add = style => {
    if (!style?.id || !style.styles || seen.has(style.id)) return
    seen.add(style.id)
    entries.push({ id: style.id, filepath: style.filepath, styles: style.styles })
  }
  add({ id: data.meta?.dataid, filepath: props.file, styles: data.styles })
  for (const style of data.substyles || []) add(style)
  return entries
}

watch(cmp, data => modManager.registerMod(styleOwnerId, {
  root: props.file || "",
  styles: collectStyleEntries(data),
  files: data?.files || [],
}), { immediate: true })
onUnmounted(() => modManager.unregisterMod(styleOwnerId))

// Hand crashes to uiHealth, which decides whether to reload this mod or, if it
// keeps crashing, leave the error overlay (and its manual reload) in place.
watch(cmp, data => {
  if (!data?.error) return
  if (!props.file && !props.dataGetter) return
  uiHealth.reportModCrash({
    file: props.file,
    instanceId: styleOwnerId,
    reload: () => reload(true),
    message: data.error,
  })
})

async function performLoad(refresh = false) {
  try {
    cmp.value = {}
    let data = {}
    if (props.dataGetter) {
      data = await props.dataGetter(refresh || props.fileRefresh)
    } else if (props.file) {
      await load(props.file, refresh || props.fileRefresh)
      return
    } else if (props.data) {
      data = props.data
    }
    if (!data?.compiled && data?.compile) {
      data = await data.compile()
    }
    if (data?.error) {
      logger.error("[MOD] Compile error in", props.file, data.error, data.errorObj)
    }
    cmp.value = data
  } catch (err) {
    logger.error("[MOD] Failed to load mod component", props.file, err)
    cmp.value = { error: err.message, errorObj: err }
  }
}

watch([
  () => props.file,
  () => props.data,
  () => props.dataGetter,
], () => performLoad(false), { immediate: true })

watch(() => modManager.refreshToken, () => performLoad(true))

async function load(file, refresh = false) {
  // file = getURL(file)
  // logger.log("Loading file:", file)
  const data = await getComponent(file, refresh, true)
  if (data.error) {
    logger.error("[MOD]", data.error + "!\n", data.errorObj)
    cmp.value = data
    return
  }
  cmp.value = data
}

onErrorCaptured((err, instance, info) => {
  logger.error("[MOD] Component error in", props.file, info, err)
  cmp.value = { error: err.message }
  return false
})
</script>

<style lang="css" scoped>
.error {
  padding: 0.3em 0.5em;
  color: #f88;
  border: 1px dashed #f44;
  background-color: #311a;
}
.loading {
  display: inline-block;
  width: auto !important;
  height: auto !important;
  padding: 0.3em 0.5em;
  font-style: italic;
  color: var(--bng-off-white);
  background-color: var(--bng-black-o6);
  opacity: 0.4;
}
</style>
