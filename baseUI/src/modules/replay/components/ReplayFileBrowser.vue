<template>
  <FlatFileBrowser
    v-if="shouldRenderBrowser"
    v-model="selectedKey"
    class="replay-file-browser"
    :items="visibleItems"
    :loading="loading"
    :loading-label="$t('ui.replay.loading')"
    :scope-id="browserScopeId"
    :scope-options="browserScopeOptions"
    :empty-label="''"
    :empty-message="error || $t('ui.replay.noReplaysYet')"
    :autofocus-first-item="autofocusFirstItem"
    @default-action="onDefaultAction"
    @action="onBrowserAction"
  >
    <slot />

    {{ showAllRow ? $t('ui.replay.recentReplays') : allLabel }}

    <template v-if="showAllRow && visibleItems.length" #after-rows>
      <BngRow class="replay-file-browser__all-row" :label="allLabel" @activate="emit('all')" />
    </template>
  </FlatFileBrowser>
</template>

<script setup>
import { computed, inject, ref, unref } from "vue"
import { lua } from "@/bridge"
import { BngRow, ACCENTS } from "@/common/components/base"
import { FlatFileBrowser } from "@/common/modules/fileBrowser"
import { confirmCancelButtons, openConfirmation, openPrompt } from "@/services/popup"
import { useReplayCatalog } from "../composables/useReplayCatalog"
import { $translate } from "@/services"

defineOptions({ name: "ReplayFileBrowser" })

const $simplemenu = inject("$simplemenu", ref(false))

const props = defineProps({
  browserScopeId: {
    type: String,
    default: "",
  },
  browserScopeOptions: {
    type: Object,
    default: () => ({}),
  },
  itemLimit: {
    type: Number,
    default: 0,
  },
  navigateAfterPlayRoute: {
    type: String,
    default: "",
  },
  navigateAfterPlayScope: {
    type: String,
    default: "",
  },
  allLabel: {
    type: String,
    default: "",
  },
  autoplay: Boolean,
  pauseWhenReady: Boolean,
  autofocusFirstItem: {
    type: Boolean,
    default: true,
  },
  hideWhenEmpty: Boolean,
  showAllRow: Boolean,
})

const emit = defineEmits(["all", "loaded"])

const {
  items,
  loading,
  error,
  selectedKey,
  playRecording,
  renameRecording,
  deleteRecording,
} = useReplayCatalog()

const isSimpleMenu = computed(() => !!unref($simplemenu))
const visibleItems = computed(() => {
  const limitedItems = props.itemLimit > 0 ? items.value.slice(0, props.itemLimit) : items.value
  if (!isSimpleMenu.value) return limitedItems
  return limitedItems.map(item => ({
    ...item,
    actions: Array.isArray(item.actions) ? item.actions.filter(action => action?.key !== "rename") : item.actions,
  }))
})
const shouldRenderBrowser = computed(() => loading.value || !props.hideWhenEmpty || visibleItems.value.length > 0)

function getRecording(item) {
  return item?.recording || item || null
}

function getRecordingName(recording, fallback = "", keys = ["displayName", "basename"]) {
  return keys.map(key => recording?.[key]).find(Boolean) || fallback
}

function isValidBasename(value) {
  const basename = String(value || "").trim()
  return basename.length > 0 && !/[<>:"/\\|?*]/.test(basename)
}

async function confirmLevelChange(levelKnown) {
  const messageKey = levelKnown
    ? "ui.replay.loadLevel.message"
    : "ui.replay.loadLevel.messageUnknown"
  return openConfirmation(
    $translate.instant("ui.replay.loadLevel.title"),
    $translate.instant(messageKey),
    confirmCancelButtons({
      confirmLabel: $translate.instant("ui.replay.loadLevel.button"),
    }),
    "",
    false
  ).catch(() => false)
}

async function onDefaultAction(payload) {
  const recording = getRecording(payload?.item)
  if (!recording) return
  const loaded = await playRecording(recording, {
    autoplay: props.autoplay,
    pauseWhenReady: props.pauseWhenReady,
    confirmLevelChange,
  }).catch(err => {
    console.warn("[Replay] Failed to play recording", err)
    return false
  })
  if (!loaded) return
  if (props.navigateAfterPlayRoute) {
    const options = props.navigateAfterPlayScope ? { preferredScope: props.navigateAfterPlayScope } : null
    await lua.extensions.ui_router.navigate(props.navigateAfterPlayRoute, null, options)
  }
  emit("loaded", recording)
}

async function onBrowserAction(payload) {
  if (payload?.action?.key === "rename" && !isSimpleMenu.value) return promptRename(payload?.item)
  if (payload?.action?.key === "delete") return confirmDelete(payload?.item)
}

async function promptRename(item) {
  const recording = getRecording(item)
  if (!recording) return

  const newBasename = await openPrompt(
    $translate.instant("ui.replay.rename.hint"),
    $translate.instant("ui.replay.rename"),
    {
      defaultValue: getRecordingName(recording).replace(/\.rpl$/i, ""),
      validate: isValidBasename,
      errorMessage: $translate.instant("ui.replay.rename.error"),
      disableWhenInvalid: true,
      unordered: false,
      buttons: [
        { label: $translate.instant("ui.common.cancel"), value: false, extras: { cancel: true, accent: ACCENTS.text } },
        { label: $translate.instant("ui.replay.rename.button"), value: text => text, extras: { confirm: true } },
      ],
    }
  ).catch(() => null)

  if (typeof newBasename !== "string" || !isValidBasename(newBasename)) return
  await renameRecording(recording, newBasename.trim()).catch(() => false)
}

async function confirmDelete(item) {
  const recording = getRecording(item)
  if (!recording) return

  const name = getRecordingName(recording, "", ["displayName", "label", "basename", "path"])
  const message = name
    ? $translate.instant("ui.replay.remove.message", { name })
    : $translate.instant("ui.replay.remove.messageUnnamed")

  const confirmed = await openConfirmation(
    $translate.instant("ui.replay.remove"),
    message,
    confirmCancelButtons({
      confirmLabel: $translate.instant("ui.replay.remove.button"),
      destructive: true
    }),
    "",
    false
  ).catch(() => false)

  if (confirmed) await deleteRecording(recording).catch(() => false)
}
</script>

<style scoped lang="scss">
.replay-file-browser {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
