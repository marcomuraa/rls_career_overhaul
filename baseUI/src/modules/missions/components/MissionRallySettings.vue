<template>
  <InfoCard :header="$t(panel.header)" header-type="ribbon">
    <template #content>
      <div class="setting">
        <div class="setting-label">{{ $t("missions.missions.rally.startScreen.coDriver.header") }}</div>
        <BngSelect
          class="codriver-select"
          v-model="selected"
          :options="panel.options"
          :config="selectConfig"
          textScroller
          @change="onChange">
          <template #display>
            <div class="setting-control-display">
              <span class="setting-control-label">{{ optionLabel(currentOption) }}</span>
              <span v-if="optionDetail(currentOption)" class="setting-control-detail">{{ optionDetail(currentOption) }}</span>
            </div>
          </template>
        </BngSelect>
      </div>

      <BngRow
        v-for="setting in panel.settings || []"
        :key="setting.key"
        class="setting-row"
        :label="$ctx_t(setting.label)"
      >
        <BngSelect
          class="bool-select"
          :model-value="settingValues[setting.key]"
          :options="boolOptions"
          :config="boolSelectConfig"
          @change="onSettingChange(setting.key, $event)"
        />
      </BngRow>

      <p v-if="panel.note" class="settings-note">{{ $t(panel.note) }}</p>
    </template>
  </InfoCard>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { BngRow, BngSelect } from "@/common/components/base"
import { lua } from "@/bridge"
import { $translate } from "@/services"
import InfoCard from "./InfoCard.vue"

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
})

const selected = ref(props.panel.selectedValue)
const settingValues = reactive(
  Object.fromEntries((props.panel.settings || []).map(setting => [setting.key, setting.value === true]))
)
const emit = defineEmits(["setting-change"])

const selectConfig = {
  label: option => option.label,
  value: option => option.value,
}
const boolOptions = [
  { label: "ui.common.on", value: true },
  { label: "ui.common.off", value: false },
]
const boolSelectConfig = {
  label: option => $translate.instant(option.label),
  value: option => option.value,
}

const currentOption = computed(() => (props.panel.options || []).find(o => o.value === selected.value) || null)
const optionLabel = option => option?.shortLabel || option?.label || ""
const optionDetail = option => option?.detail || undefined

function onChange(value) {
  lua.extensions.hook("onCoDriverSelectedByPanel", value)
}

function onSettingChange(key, value) {
  value = value === true
  settingValues[key] = value
  lua.extensions.hook("onRallyStartSettingChanged", { key, value })
  emit("setting-change", { key, value })
}
</script>

<style scoped lang="scss">
.setting-row {
  width: 96%;
}
.setting {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.setting-label {
  font-weight: 600;
  color: var(--bng-off-white);
  padding: 0 0.45rem;
}
.codriver-select {
  width: 100%;
}
.bool-select {
  width: 100%;
}
.setting-control-display {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0.1rem 0.25rem;
  text-align: center;
  color: white;

  .setting-control-label,
  .setting-control-detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .setting-control-detail {
    font-size: 0.8rem;
    opacity: 0.8;
  }
}
.settings-note {
  margin: 0.25rem 0.45rem 0;
  opacity: 0.8;
}
</style>
