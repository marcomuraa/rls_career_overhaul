<template>
  <div class="generic-gamemode-settings">
    <div v-if="!settings" class="no-settings">
      {{ $t("ui.multiplayer.noSettingsAvailable") }}
    </div>
    <div v-else v-bng-scoped-nav="{ type: 'container' }" class="settings-list">
      <template v-for="[key, setting] in visibleSettings" :key="key">
        <DragRaceSettings
          v-if="setting.type === 'dragRaceSettings'"
          ref="dragRaceSettingsRef"
        />
        <div
          v-else
          class="setting-item"
          @mouseenter="setActiveTooltip(setting)"
          @mouseleave="clearActiveTooltip(setting)"
          @focusin="setActiveTooltip(setting)"
          @focusout="clearActiveTooltip(setting)"
        >
          <label class="setting-label">{{ $t(setting.displayName || key) }}<template v-if="getUnitKey(setting)"> {{" " + $t(getUnitKey(setting)) }}</template></label>

          <BngSelect
            v-if="setting.type === 'select'"
            v-model="settingValues[key]"
            :options="setting.options"
            :config="{
              value: opt => opt,
              label: opt => {
                const k = (setting.displayName || key).replace('.settings.', '.') + '.' + opt
                const r = $t(k)
                return r !== k ? r : opt
              }
            }"
            :disabled="!setting.changeable"
          />

          <BngSwitch
            v-else-if="setting.type === 'switch'"
            v-model="settingValues[key]"
            :disabled="!setting.changeable"
          />

          <BngSlider
            v-else-if="setting.type === 'slider'"
            v-model="settingValues[key]"
            :min="setting.min"
            :max="setting.max"
            :step="setting.step || 1"
            :disabled="!setting.changeable"
            with-input
          />

          <TagHunterPicker
            v-else-if="setting.type === 'tagHunterPicker'"
            v-model="settingValues[key]"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { BngSlider, BngSelect, BngSwitch } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { useSettings } from "@/services/settings"
import TagHunterPicker from "./gamemodeSettings/TagHunterPicker.vue"
import DragRaceSettings from "./gamemodeSettings/DragRaceSettings.vue"

const props = defineProps({
  settings: {
    type: Object,
    default: null
  }
})

const userSettings = useSettings()
const settingValues = ref({})
const dragRaceSettingsRef = ref(null)

const UNIT_TYPE_KEYS = {
  distance: {
    metric: "ui.multiplayer.gamemodes.km",
    imperial: "ui.multiplayer.gamemodes.mi",
  }
}

const getUnitKey = (setting) => {
  const unitConfig = UNIT_TYPE_KEYS[setting.translationUnitType]
  if (!unitConfig) return null
  return unitConfig[userSettings.values.uiUnitLength] || unitConfig.metric
}

// Initialize setting values from defaults
watch(() => props.settings, (newSettings) => {
  if (!newSettings) {
    settingValues.value = {}
    return
  }

  const values = {}
  for (const [key, setting] of Object.entries(newSettings)) {
    if (setting.type === "dragRaceSettings") continue
    values[key] = key in settingValues.value ? settingValues.value[key] : setting.default
  }
  settingValues.value = values
}, { immediate: true })

// Filter and sort settings based on showIf conditions and order
const visibleSettings = computed(() => {
  if (!props.settings) return []

  const visible = []
  for (const [key, setting] of Object.entries(props.settings)) {
    if (!setting.changeable && setting.changeable !== undefined) continue

    if (setting.showIf) {
      let shouldShow = true
      for (const [conditionKey, conditionValue] of Object.entries(setting.showIf)) {
        if (settingValues.value[conditionKey] !== conditionValue) {
          shouldShow = false
          break
        }
      }
      if (!shouldShow) continue
    }

    visible.push([key, setting])
  }

  // Sort by order (settings without order go to the end)
  visible.sort((a, b) => (a[1].order ?? Infinity) - (b[1].order ?? Infinity))

  return visible
})

const activeTooltip = ref(null)

const setActiveTooltip = (setting) => {
  if (setting.tooltip) activeTooltip.value = setting.tooltip
}

const clearActiveTooltip = (setting) => {
  if (activeTooltip.value === setting.tooltip) activeTooltip.value = null
}

const mergedSettingValues = computed(() => {
  const base = { ...settingValues.value }
  if (dragRaceSettingsRef.value?.settingValues) {
    Object.assign(base, dragRaceSettingsRef.value.settingValues)
  }
  return base
})

defineExpose({
  settingValues: mergedSettingValues,
  activeTooltip,
})
</script>

<style scoped lang="scss">
.generic-gamemode-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-settings {
  padding: 1rem;
  text-align: center;
  color: var(--bng-cool-gray-400);
  font-style: italic;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--bng-corners-1);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.setting-label {
  min-width: 150px;
  color: var(--bng-cool-gray-200);
}
</style>
