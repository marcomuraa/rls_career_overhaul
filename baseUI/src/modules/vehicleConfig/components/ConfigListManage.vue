<template>
  <div
    ref="rootRef"
    class="config-list-manage"
    v-bng-on-ui-nav:ok.focusRequired="onNavLoad"
    @focusin="onListFocusIn"
    @focusout="onListFocusOut"
  >
    <div class="config-list-manage-controls" v-if="!isSimplemenu">
      <div class="config-list-manage-row config-list-manage-row--full" >
        <BngButton class="config-list-manage-folder-button" :accent="ACCENTS.main" :disabled="isSimplemenu" @click="openConfigFolderInExplorer">
          {{ $t("ui.vehicleconfig.openConfigFolder") }}
        </BngButton>
      </div>
    </div>

    <div class="config-list-manage-list">
      <Button
        v-for="config in configFiltered"
        :key="config.name"
        class="config-list-manage-item"
        :data-config-name="config.name"
        @click="load(config.name)"
      >
        <div class="config-list-manage-item-main">
          <BngIcon
            v-if="config.official"
            :type="icons.beamNG"
            v-bng-tooltip:top="$t('ui.vehicleconfig.sourceOfficial')"
          />
          <BngIcon
            v-else-if="config.player"
            :type="icons.personSolid"
            v-bng-tooltip:top="$t('ui.vehicleconfig.sourceUser')"
          />
          <BngIcon
            v-else
            :type="icons.puzzleModule"
            v-bng-tooltip:top="$t('ui.vehicleconfig.sourceMod')"
          />
          <div class="config-list-manage-item-label">{{ getConfigLabel(config) }}</div>
        </div>

        <div class="config-list-manage-item-actions">
          <!--
          <button
            class="config-list-manage-action-button"
            bng-no-nav="true"
            tabindex="-1"
            @click.stop="openManage(config)"
          >
            <BngBinding ui-event="ok" controller />
            <BngIcon :type="icons.listBig" />
          </button>
          -->
          <button
            class="config-list-manage-action-button"
            bng-no-nav="true"
            tabindex="-1"
            @click.stop="load(config.name)"
          >
            <BngBinding ui-event="ok" controller />
            <BngIcon :type="icons.loadMesh" />
          </button>
        </div>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from "vue"
import { lua } from "@/bridge"
import { BngBinding, BngButton, ACCENTS, BngIcon, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngOnUiNav, vBngTooltip } from "@/common/directives"
import { useEvents } from "@/services/events"
import { openMessage } from "@/services/popup"
import { useUINavBlocker } from "@/services/uiNavTracker"

const navBlocker = useUINavBlocker()
navBlocker.blockOnly(["context"])

const events = useEvents()
const $simplemenu = inject("$simplemenu", ref(false))
const isSimplemenu = computed(() => $simplemenu.value)

const configList = ref([])
const focusedConfigName = ref(null)
const rootRef = ref(null)

const configFiltered = computed(() => {
  let res = configList.value
  res = res.slice().sort((a, b) => {
    if (a.player && !b.player) return -1
    if (!a.player && b.player) return 1
    return a.name.localeCompare(b.name)
  })
  return res
})

function getConfigLabel(config) {
  return config?.displayName || config?.Configuration || config?.name || ""
}

async function openConfigFolderInExplorer() {
  await lua.extensions.core_vehicle_partmgmt.openConfigFolderInExplorer()
}

async function load(configName) {
  await lua.extensions.core_vehicle_partmgmt.loadLocal(configName + ".pc")
}

function openManage(config) {
  openMessage("", `Manage Placeholder: ${getConfigLabel(config)}`)
}

function getConfigFromElement(element) {
  const configName = element?.closest?.("[data-config-name]")?.dataset?.configName
  if (!configName) return null
  return configFiltered.value.find(config => String(config.name) === String(configName)) || null
}

function getFocusedConfig() {
  return getConfigFromElement(document.activeElement) || configFiltered.value.find(config => String(config.name) === String(focusedConfigName.value)) || null
}

function onListFocusIn(event) {
  const focusedConfig = getConfigFromElement(event.target)
  if (!focusedConfig) return
  focusedConfigName.value = focusedConfig.name
}

function onListFocusOut(event) {
  if (event.currentTarget instanceof Node && event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
  focusedConfigName.value = null
}

function onNavLoad() {
  const focusedConfig = getFocusedConfig()
  if (!focusedConfig) return false
  load(focusedConfig.name)
  return false
}

function onNavManage() {
  const focusedConfig = getFocusedConfig()
  if (!focusedConfig) return false
  openManage(focusedConfig)
  return false
}

async function getConfigList() {
  const configs = await lua.extensions.core_vehicle_partmgmt.getConfigList()
  configList.value = Array.isArray(configs) ? configs : []
}

function focusEntry() {
  const rootElement = rootRef.value
  if (!rootElement) return false
  const target = rootElement.querySelector(".config-list-manage-item")
    || rootElement.querySelector(".config-list-manage-folder-button")
    || rootElement.querySelector("button:not([disabled])")
  if (!target || typeof target.focus !== "function") return false
  target.focus()
  return true
}

events.on("VehicleChange", getConfigList)
events.on("VehicleFocusChanged", getConfigList)
events.on("VehicleconfigSaved", getConfigList)

getConfigList()

defineExpose({
  focusEntry,
})
</script>

<style lang="scss" scoped>
.config-list-manage {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 0.5rem;
  height: 100%;
}

.config-list-manage-controls {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--bng-orange);
  padding-bottom: 0.5rem;
}

.config-list-manage-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
}

.config-list-manage-row--full {
  width: 100%;

  > * {
    flex: 1 1 auto;
  }
}

.config-list-manage-folder-button {
  width: 100%;
  --bng-button-max-width: 100%;
}

.config-list-manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden auto;
}

.config-list-manage-item {
  --bng-button-min-width: auto;
  --bng-button-max-width: 100%;
  --bng-button-margin: 0;
  --bng-button-padding: 0.5rem;
  --bng-content-justify: stretch;

  width: 100%;
  min-height: 2.9rem;
  margin: 0;
  text-align: left;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.config-list-manage-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 auto;
}

.config-list-manage-item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}

.config-list-manage-item-actions {
  display: none;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.25rem;
}

.config-list-manage-item:hover .config-list-manage-item-actions,
.config-list-manage-item:focus .config-list-manage-item-actions,
.config-list-manage-item:focus-within .config-list-manage-item-actions,
.config-list-manage-item.focus-visible .config-list-manage-item-actions {
  display: inline-flex;
}

.config-list-manage-action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.45);
  color: var(--bng-off-white);
  padding: 0.25rem 0.5rem;
  cursor: pointer;

  &:hover {
    background: rgba(var(--bng-cool-gray-700-rgb), 0.75);
  }

  :deep([ui-event]) {
    padding-right: 0;
  }
}
</style>
